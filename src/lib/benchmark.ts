import { prisma } from '@/lib/prisma';

/**
 * Benchmark-Vergleich: Wald vs. ähnliche Wälder plattformweit.
 * Gruppierung nach Hauptbaumart + Altersklasse.
 * Berechnet Perzentile für NDVI, Holzvorrat, Zuwachs, Bestockungsgrad, Totholz.
 */

export interface BenchmarkMetric {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  groupAvg: number | null;
  groupMin: number | null;
  groupMax: number | null;
  percentile: number | null; // 0–100
}

export interface BenchmarkResult {
  forestId: string;
  forestName: string;
  groupDescription: string;
  groupSize: number;
  dominantSpecies: string | null;
  ageClass: string | null;
  metrics: BenchmarkMetric[];
}

const AGE_CLASSES = [
  { min: 0, max: 20, label: '0–20 Jahre' },
  { min: 21, max: 40, label: '21–40 Jahre' },
  { min: 41, max: 60, label: '41–60 Jahre' },
  { min: 61, max: 80, label: '61–80 Jahre' },
  { min: 81, max: 100, label: '81–100 Jahre' },
  { min: 101, max: 9999, label: '>100 Jahre' },
];

function getAgeClass(age: number | null): typeof AGE_CLASSES[number] | null {
  if (age == null) return null;
  return AGE_CLASSES.find(c => age >= c.min && age <= c.max) ?? null;
}

/** Dominante Baumart aus mainSpecies JSON bestimmen */
function getDominantSpecies(mainSpecies: any): string | null {
  if (!mainSpecies || !Array.isArray(mainSpecies) || mainSpecies.length === 0) return null;
  const sorted = [...mainSpecies].sort((a: any, b: any) => (b.percent ?? 0) - (a.percent ?? 0));
  return sorted[0]?.species ?? null;
}

/** Perzentil berechnen: Wie viel Prozent der Werte liegen unter `value`? */
function percentile(values: number[], value: number): number {
  if (values.length === 0) return 50;
  const below = values.filter(v => v < value).length;
  return Math.round((below / values.length) * 100);
}

/** Gewichteter Durchschnitt der Compartments eines Waldes (nach Fläche) */
function weightedAvg(compartments: { value: number | null; areaHa: number | null }[]): number | null {
  const valid = compartments.filter(c => c.value != null && c.areaHa != null && c.areaHa > 0) as { value: number; areaHa: number }[];
  if (valid.length === 0) return null;
  const totalArea = valid.reduce((s, c) => s + c.areaHa, 0);
  return valid.reduce((s, c) => s + c.value * c.areaHa, 0) / totalArea;
}

export async function computeForestBenchmark(
  forestId: string,
): Promise<BenchmarkResult | null> {
  // 1. Eigenen Wald + Compartments laden
  const forest = await prisma.forest.findUnique({
    where: { id: forestId },
    select: {
      id: true,
      name: true,
      compartments: {
        select: {
          mainSpecies: true,
          standAge: true,
          areaHa: true,
          volumePerHa: true,
          incrementPerHa: true,
          stockingDegree: true,
          deadwoodPerHa: true,
        },
      },
    },
  });

  if (!forest || forest.compartments.length === 0) return null;

  // 2. Dominante Baumart + Altersklasse bestimmen (flächengewichtet)
  const speciesCount: Record<string, number> = {};
  let totalAge = 0;
  let ageCount = 0;
  let totalArea = 0;

  for (const c of forest.compartments) {
    const area = c.areaHa ?? 1;
    totalArea += area;
    const species = getDominantSpecies(c.mainSpecies);
    if (species) speciesCount[species] = (speciesCount[species] ?? 0) + area;
    if (c.standAge != null) { totalAge += c.standAge * area; ageCount += area; }
  }

  const dominantSpecies = Object.entries(speciesCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : null;
  const ageClass = getAgeClass(avgAge);

  if (!dominantSpecies) return null;

  // 3. Vergleichsgruppe finden: Alle Compartments plattformweit mit gleicher Baumart
  // Erst mit Altersfilter, falls zu wenige Ergebnisse dann ohne
  const allCompartments = await prisma.forestCompartment.findMany({
    select: {
      forestId: true,
      mainSpecies: true,
      standAge: true,
      areaHa: true,
      volumePerHa: true,
      incrementPerHa: true,
      stockingDegree: true,
      deadwoodPerHa: true,
    },
  });

  // Nach Baumart filtern (im Application Layer, da mainSpecies JSON ist)
  const speciesMatch = allCompartments.filter(c => {
    const species = getDominantSpecies(c.mainSpecies);
    return species === dominantSpecies;
  });

  // Erst mit Altersklasse, Fallback auf nur Baumart
  let matchingCompartments = ageClass
    ? speciesMatch.filter(c => c.standAge != null && c.standAge >= ageClass.min && c.standAge <= ageClass.max)
    : speciesMatch;

  let usedAgeClass = ageClass;
  if (matchingCompartments.length < 2 && ageClass) {
    // Fallback: nur Baumart, ohne Altersfilter
    matchingCompartments = speciesMatch;
    usedAgeClass = null;
  }

  // Pro Wald aggregieren (gewichteter Durchschnitt)
  const forestGroups = new Map<string, typeof matchingCompartments>();
  for (const c of matchingCompartments) {
    const arr = forestGroups.get(c.forestId) ?? [];
    arr.push(c);
    forestGroups.set(c.forestId, arr);
  }

  // 4. NDVI für alle Wälder in der Gruppe laden (aktuellster Monat)
  const groupForestIds = [...forestGroups.keys()];

  const latestNdvi = await prisma.forestBiomassSnapshot.findMany({
    where: { forestId: { in: groupForestIds } },
    orderBy: { date: 'desc' },
    distinct: ['forestId'],
    select: { forestId: true, meanNdvi: true },
  });
  const ndviMap = new Map(latestNdvi.map(n => [n.forestId, n.meanNdvi]));

  // 5. Metriken pro Wald in der Gruppe berechnen
  interface ForestMetrics {
    ndvi: number | null;
    volumePerHa: number | null;
    incrementPerHa: number | null;
    stockingDegree: number | null;
    deadwoodPerHa: number | null;
  }

  const groupMetrics: ForestMetrics[] = [];
  let ownMetrics: ForestMetrics | null = null;

  for (const [fId, comps] of forestGroups) {
    const m: ForestMetrics = {
      ndvi: ndviMap.get(fId) ?? null,
      volumePerHa: weightedAvg(comps.map(c => ({ value: c.volumePerHa, areaHa: c.areaHa }))),
      incrementPerHa: weightedAvg(comps.map(c => ({ value: c.incrementPerHa, areaHa: c.areaHa }))),
      stockingDegree: weightedAvg(comps.map(c => ({ value: c.stockingDegree, areaHa: c.areaHa }))),
      deadwoodPerHa: weightedAvg(comps.map(c => ({ value: c.deadwoodPerHa, areaHa: c.areaHa }))),
    };
    groupMetrics.push(m);
    if (fId === forestId) ownMetrics = m;
  }

  if (!ownMetrics) {
    // Eigene NDVI nachladen falls nicht in der Gruppe (kein Compartment mit matching Alter)
    const ownNdvi = ndviMap.get(forestId) ?? null;
    ownMetrics = {
      ndvi: ownNdvi,
      volumePerHa: weightedAvg(forest.compartments.map(c => ({ value: c.volumePerHa, areaHa: c.areaHa }))),
      incrementPerHa: weightedAvg(forest.compartments.map(c => ({ value: c.incrementPerHa, areaHa: c.areaHa }))),
      stockingDegree: weightedAvg(forest.compartments.map(c => ({ value: c.stockingDegree, areaHa: c.areaHa }))),
      deadwoodPerHa: weightedAvg(forest.compartments.map(c => ({ value: c.deadwoodPerHa, areaHa: c.areaHa }))),
    };
  }

  // 6. Perzentile berechnen
  function buildMetric(
    key: string, label: string, unit: string,
    getValue: (m: ForestMetrics) => number | null,
  ): BenchmarkMetric {
    const values = groupMetrics.map(getValue).filter((v): v is number => v != null);
    const own = getValue(ownMetrics!);

    return {
      key,
      label,
      unit,
      value: own != null ? Number(own.toFixed(3)) : null,
      groupAvg: values.length > 0 ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(3)) : null,
      groupMin: values.length > 0 ? Number(Math.min(...values).toFixed(3)) : null,
      groupMax: values.length > 0 ? Number(Math.max(...values).toFixed(3)) : null,
      percentile: own != null && values.length > 0 ? percentile(values, own) : null,
    };
  }

  const groupDesc = usedAgeClass
    ? `${dominantSpecies}, ${usedAgeClass.label}`
    : dominantSpecies;

  return {
    forestId,
    forestName: forest.name,
    groupDescription: groupDesc,
    groupSize: forestGroups.size,
    dominantSpecies,
    ageClass: ageClass?.label ?? null,
    metrics: [
      buildMetric('ndvi', 'Vitalität (NDVI)', '', m => m.ndvi),
      buildMetric('volumePerHa', 'Holzvorrat', 'm³/ha', m => m.volumePerHa),
      buildMetric('incrementPerHa', 'Zuwachs', 'm³/ha/J', m => m.incrementPerHa),
      buildMetric('stockingDegree', 'Bestockungsgrad', '', m => m.stockingDegree),
      buildMetric('deadwoodPerHa', 'Totholz', 'm³/ha', m => m.deadwoodPerHa),
    ],
  };
}
