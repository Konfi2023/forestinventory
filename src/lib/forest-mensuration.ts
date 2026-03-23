/**
 * Forest Mensuration Engine
 *
 * Zentrale Berechnungsfunktionen für die Waldinventur:
 *   - Baumartenspezifische Formzahlen (Grundfläche → Volumen)
 *   - Michailoff-Höhenkurven (BHD → Höhenschätzung)
 *   - Einzelbaumvolumen
 *   - Plot-Hochrechnung (Stammzahl/ha, G/ha, V/ha)
 *   - Soll-Stichprobengröße
 *   - Plausibilitätsprüfung
 *   - CO₂-Bindung
 */

// ─── Formzahlen ───────────────────────────────────────────────────────────────
// Quelle: Assmann & Franz (1963), Pretzsch (2009) – mittlere dimensionsunabhängige
// Schaftformzahl (form factor f) für Derbholz mit Rinde
export const FORM_FACTORS: Record<string, number> = {
  // Nadelholz
  SPRUCE:      0.45,
  PINE:        0.45,
  FIR:         0.44,
  DOUGLAS:     0.44,
  LARCH:       0.46,
  BLACK_PINE:  0.44,
  STONE_PINE:  0.44,
  CEDAR:       0.43,
  THUJA:       0.43,
  // Schweres Laubholz
  OAK:         0.42,
  SESSION_OAK: 0.42,
  RED_OAK:     0.42,
  BEECH:       0.43,
  HORNBEAM:    0.42,
  ASH:         0.42,
  SYCAMORE:    0.43,
  MAPLE:       0.43,
  ELM:         0.42,
  LIME:        0.42,
  WALNUT:      0.41,
  CHESTNUT:    0.42,
  CHERRY:      0.41,
  // Leichtes Laubholz / Pioniere
  BIRCH:       0.43,
  ALDER:       0.42,
  GREY_ALDER:  0.42,
  POPLAR:      0.40,
  ASPEN:       0.41,
  WILLOW:      0.40,
  ROWAN:       0.41,
  BLACK_LOCUST: 0.41,
  PAULOWNIA:   0.39,
};

const DEFAULT_FORM_FACTOR = 0.43;

export function getFormFactor(species: string): number {
  return FORM_FACTORS[species] ?? DEFAULT_FORM_FACTOR;
}

// ─── Holzdichten (kg/m³ Derbholz, lufttrocken) ───────────────────────────────
// Quelle: Grosser & Teetz (1986), Wagenführ (2000)
export const WOOD_DENSITIES: Record<string, number> = {
  SPRUCE:      470,
  PINE:        520,
  FIR:         450,
  DOUGLAS:     510,
  LARCH:       590,
  BLACK_PINE:  530,
  STONE_PINE:  560,
  CEDAR:       510,
  THUJA:       370,
  OAK:         690,
  SESSION_OAK: 680,
  RED_OAK:     640,
  BEECH:       720,
  HORNBEAM:    760,
  ASH:         690,
  SYCAMORE:    580,
  MAPLE:       630,
  ELM:         660,
  LIME:        530,
  WALNUT:      640,
  CHESTNUT:    560,
  CHERRY:      600,
  BIRCH:       650,
  ALDER:       530,
  GREY_ALDER:  520,
  POPLAR:      420,
  ASPEN:       430,
  WILLOW:      450,
  ROWAN:       700,
  BLACK_LOCUST: 730,
  PAULOWNIA:   310,
};

const DEFAULT_DENSITY = 550;

export function getWoodDensity(species: string): number {
  return WOOD_DENSITIES[species] ?? DEFAULT_DENSITY;
}

// ─── Michailoff-Höhenkurven ───────────────────────────────────────────────────
// Modell: h = 1.3 + exp(a - b / d)
// mit d = BHD in cm, h = Baumhöhe in m
// Quelle: Michailoff (1943), deutsche Standardkoeffizienten nach Wenk et al. (1990)
//
// Diese Koeffizienten liefern eine "mittlere" Kurve für normale deutsche Standorte.
// Bei Vor-Ort-Messung mehrerer Höhen können die Koeffizienten site-spezifisch
// kalibriert werden (→ estimateMichailoffCoeffs).

export interface MichailoffCoeffs { a: number; b: number; }

export const MICHAILOFF_COEFFS: Record<string, MichailoffCoeffs> = {
  SPRUCE:      { a: 4.81, b: 20.3 },
  PINE:        { a: 4.62, b: 22.1 },
  FIR:         { a: 4.78, b: 21.5 },
  DOUGLAS:     { a: 4.99, b: 18.2 },
  LARCH:       { a: 4.70, b: 22.0 },
  BLACK_Pine:  { a: 4.58, b: 23.0 },
  OAK:         { a: 4.58, b: 28.4 },
  SESSION_OAK: { a: 4.55, b: 28.0 },
  RED_OAK:     { a: 4.60, b: 26.0 },
  BEECH:       { a: 4.72, b: 25.1 },
  HORNBEAM:    { a: 4.50, b: 26.0 },
  ASH:         { a: 4.65, b: 24.0 },
  SYCAMORE:    { a: 4.68, b: 23.5 },
  MAPLE:       { a: 4.62, b: 24.0 },
  BIRCH:       { a: 4.55, b: 21.5 },
  ALDER:       { a: 4.50, b: 22.0 },
  GREY_ALDER:  { a: 4.45, b: 22.0 },
  POPLAR:      { a: 5.10, b: 16.0 },
  ASPEN:       { a: 4.75, b: 20.0 },
};

const DEFAULT_MICHAILOFF: MichailoffCoeffs = { a: 4.65, b: 23.0 };

/**
 * Schätzt die Baumhöhe aus BHD mit Michailoff-Modell.
 * Gibt null zurück wenn BHD ≤ 0.
 */
export function estimateHeight(species: string, diameterCm: number): number | null {
  if (diameterCm <= 0) return null;
  const { a, b } = MICHAILOFF_COEFFS[species] ?? DEFAULT_MICHAILOFF;
  return Math.round((1.3 + Math.exp(a - b / diameterCm)) * 10) / 10;
}

/**
 * Kalibriert Michailoff-Koeffizienten aus Messpaaren [BHD, Höhe].
 * Mindestens 2 Messpaare nötig. Gibt Standardkoeffizienten zurück wenn zu wenig Daten.
 * Methode: Lineare Regression auf ln(h - 1.3) = a - b * (1/d)
 */
export function estimateMichailoffCoeffs(
  species: string,
  measurements: { diameter: number; height: number }[],
): MichailoffCoeffs {
  const valid = measurements.filter(m => m.diameter > 0 && m.height > 1.3 + 0.01);
  if (valid.length < 2) return MICHAILOFF_COEFFS[species] ?? DEFAULT_MICHAILOFF;

  // Transform: y = ln(h - 1.3), x = 1/d
  const n = valid.length;
  const xs = valid.map(m => 1 / m.diameter);
  const ys = valid.map(m => Math.log(m.height - 1.3));

  const sumX  = xs.reduce((s, x) => s + x, 0);
  const sumY  = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { a: Math.round(intercept * 1000) / 1000, b: Math.round(-slope * 1000) / 1000 };
}

// ─── Grundflächenberechnung ───────────────────────────────────────────────────

/** Grundfläche g eines Baums in m² aus BHD in cm */
export function calcBasalArea(diameterCm: number): number {
  return Math.PI * (diameterCm / 200) ** 2;
}

// ─── Einzelbaumvolumen ────────────────────────────────────────────────────────

/**
 * Einzelbaumvolumen nach Schaftformzahlmethode:
 *   V = g × h × f
 * Einheit: m³
 */
export function calcTreeVolume(
  species: string,
  diameterCm: number,
  heightM: number,
): number {
  const g = calcBasalArea(diameterCm);
  const f = getFormFactor(species);
  return g * heightM * f;
}

/**
 * CO₂-Bindung eines Baums in kg.
 * Formel: V × Dichte × Biomasseexpansionsfaktor × 0.5 (C-Anteil) × (44/12) (CO₂/C)
 * Biomasseexpansionsfaktor = 1.0 für Derbholz (konservativ).
 */
export function calcCo2Storage(
  species: string,
  diameterCm: number,
  heightM: number,
): number {
  const volume  = calcTreeVolume(species, diameterCm, heightM);
  const density = getWoodDensity(species);
  return Math.round(volume * density * 0.5 * (44 / 12) * 10) / 10;
}

// ─── Plot-Hochrechnung ────────────────────────────────────────────────────────

export interface PlotTree {
  species: string | null;
  diameterCm: number;
  heightM: number | null; // null = nicht gemessen
}

export interface PlotResult {
  nHa:            number;   // Stammzahl pro Hektar
  gHa:            number;   // Grundfläche m²/ha
  vHa:            number | null; // Vorrat m³/ha (null wenn keine Höhen)
  dg:             number;   // quadratischer Mitteldurchmesser cm
  meanHeight:     number | null;
  heightsUsed:    number;   // Anzahl Bäume mit gemessener Höhe
  totalTrees:     number;
  heightEstimated: boolean;  // true wenn Michailoff für fehlende Höhen verwendet wurde
}

/**
 * Berechnet Plot-Kennzahlen aus Einzelbaumdaten.
 * Wenn heightM fehlt und fillMissingHeights=true, wird Michailoff verwendet.
 */
export function calcPlotMetrics(
  trees: PlotTree[],
  plotRadiusM: number,
  fillMissingHeights = true,
): PlotResult | null {
  if (trees.length === 0) return null;

  const plotAreaHa = Math.PI * plotRadiusM ** 2 / 10000;
  const n = trees.length;

  // Quadratischer Mitteldurchmesser
  const dg = Math.sqrt(trees.reduce((s, t) => s + t.diameterCm ** 2, 0) / n);

  // Grundfläche
  const gSum = trees.reduce((s, t) => s + calcBasalArea(t.diameterCm), 0);
  const gHa  = gSum / plotAreaHa;

  // Höhen: gemessene + ggf. geschätzte
  let heightsUsed    = 0;
  let heightEstimated = false;
  const heightsForVolume: (number | null)[] = trees.map(t => {
    if (t.heightM != null) { heightsUsed++; return t.heightM; }
    if (fillMissingHeights && t.species) {
      const est = estimateHeight(t.species, t.diameterCm);
      if (est != null) { heightEstimated = true; return est; }
    }
    return null;
  });

  // Mittlere gemessene Höhe
  const measuredHeights = trees.filter(t => t.heightM != null).map(t => t.heightM as number);
  const meanHeight = measuredHeights.length > 0
    ? measuredHeights.reduce((s, h) => s + h, 0) / measuredHeights.length
    : null;

  // Vorrat
  const volumeSum = trees.reduce((s, t, i) => {
    const h = heightsForVolume[i];
    if (h == null) return s;
    return s + calcTreeVolume(t.species ?? '', t.diameterCm, h);
  }, 0);
  const allHaveHeight = heightsForVolume.every(h => h != null);
  const vHa = allHaveHeight ? volumeSum / plotAreaHa : null;

  return {
    nHa:   Math.round(n / plotAreaHa),
    gHa:   Math.round(gHa * 100) / 100,
    vHa:   vHa != null ? Math.round(vHa) : null,
    dg:    Math.round(dg * 10) / 10,
    meanHeight: meanHeight != null ? Math.round(meanHeight * 10) / 10 : null,
    heightsUsed,
    totalTrees: n,
    heightEstimated,
  };
}

/**
 * Mittelt mehrere Plot-Ergebnisse für eine Abteilung.
 */
export function averagePlotResults(results: PlotResult[]): PlotResult | null {
  const valid = results.filter(r => r != null) as PlotResult[];
  if (valid.length === 0) return null;
  const n = valid.length;
  const avg = <K extends keyof PlotResult>(key: K): number | null => {
    const vals = valid.map(r => r[key] as number | null).filter(v => v != null) as number[];
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  return {
    nHa:         Math.round((avg('nHa') ?? 0)),
    gHa:         Math.round((avg('gHa') ?? 0) * 100) / 100,
    vHa:         avg('vHa') != null ? Math.round(avg('vHa') as number) : null,
    dg:          Math.round((avg('dg') ?? 0) * 10) / 10,
    meanHeight:  avg('meanHeight') != null ? Math.round((avg('meanHeight') as number) * 10) / 10 : null,
    heightsUsed: valid.reduce((s, r) => s + r.heightsUsed, 0),
    totalTrees:  valid.reduce((s, r) => s + r.totalTrees, 0),
    heightEstimated: valid.some(r => r.heightEstimated),
  };
}

// ─── Soll-Stichprobengröße ────────────────────────────────────────────────────

/**
 * Empfohlene Mindest-Stichprobengröße (Bäume) für eine Probekreisinventur.
 * Richtwerte nach BMELV-Praxisleitfaden Waldinventur (2012):
 *   < 1 ha:   12 Bäume
 *   1–5 ha:   20 Bäume
 *   5–20 ha:  30 Bäume
 *   > 20 ha:  50 Bäume
 * Mischbestand / heterogen: +30 %
 */
export function getTargetSampleSize(
  areaHa: number,
  mixing: 'rein' | 'gemischt' | 'heterogen' | string,
): number {
  let base: number;
  if      (areaHa < 1)  base = 12;
  else if (areaHa < 5)  base = 20;
  else if (areaHa < 20) base = 30;
  else                   base = 50;

  const isHeterogeneous = mixing === 'gemischt' || mixing === 'heterogen' ||
    mixing === 'horst' || mixing === 'gruppen';
  return isHeterogeneous ? Math.round(base * 1.3) : base;
}

// ─── Plausibilitätsprüfung ────────────────────────────────────────────────────

export interface ValidationWarning {
  field: 'diameter' | 'height' | 'age' | 'stockingDegree' | 'volume';
  message: string;
  severity: 'warning' | 'error';
}

export function validateTreeMeasurement(opts: {
  diameterCm?: number | null;
  heightM?: number | null;
  age?: number | null;
  species?: string | null;
}): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { diameterCm, heightM, age, species } = opts;

  if (diameterCm != null) {
    if (diameterCm < 5)   warnings.push({ field: 'diameter', severity: 'warning', message: `BHD ${diameterCm} cm: unter Mindestkluppgrenze (7 cm). Korrekt?` });
    if (diameterCm > 120) warnings.push({ field: 'diameter', severity: 'warning', message: `BHD ${diameterCm} cm: ungewöhnlich groß. Korrekt?` });
    if (diameterCm <= 0)  warnings.push({ field: 'diameter', severity: 'error',   message: 'BHD muss größer als 0 sein.' });
  }

  if (heightM != null) {
    if (heightM < 2)  warnings.push({ field: 'height', severity: 'warning', message: `Höhe ${heightM} m: sehr niedrig. Nur für Jungbäume (< 5 cm BHD) plausibel.` });
    if (heightM > 60) warnings.push({ field: 'height', severity: 'warning', message: `Höhe ${heightM} m: über 60 m — bitte prüfen.` });
    if (heightM <= 0) warnings.push({ field: 'height', severity: 'error',   message: 'Höhe muss größer als 0 sein.' });
  }

  if (diameterCm != null && heightM != null && diameterCm > 0 && heightM > 0) {
    // Grobe h/d-Verhältnis-Prüfung: HD-Wert (h in dm / d in cm)
    const hd = (heightM * 10) / diameterCm;
    if (hd < 30) warnings.push({ field: 'height', severity: 'warning', message: `HD-Wert ${hd.toFixed(0)}: sehr gedrungen (< 30). Plausibel bei Freistand?` });
    if (hd > 130) warnings.push({ field: 'height', severity: 'warning', message: `HD-Wert ${hd.toFixed(0)}: sehr schlank (> 130). Sturmgefährdet?` });

    // Höhenkurven-Plausibilität
    if (species) {
      const expected = estimateHeight(species, diameterCm);
      if (expected != null) {
        const deviation = Math.abs(heightM - expected) / expected;
        if (deviation > 0.4) {
          warnings.push({
            field: 'height',
            severity: 'warning',
            message: `Höhe weicht um ${Math.round(deviation * 100)} % vom Richtwertkurve ab (Michailoff: ~${expected} m). Korrekt?`,
          });
        }
      }
    }
  }

  if (age != null) {
    if (age <= 0)   warnings.push({ field: 'age', severity: 'error',   message: 'Alter muss größer als 0 sein.' });
    if (age > 600)  warnings.push({ field: 'age', severity: 'warning', message: `Alter ${age} Jahre: außergewöhnlich hoch. Korrekt?` });
    if (diameterCm != null && age > 0 && diameterCm > 0) {
      const cmPerYear = diameterCm / age;
      if (cmPerYear > 2.5) warnings.push({ field: 'age', severity: 'warning', message: `BHD-Zuwachs ${cmPerYear.toFixed(1)} cm/a: sehr hoch. Alter korrekt?` });
      if (cmPerYear < 0.1) warnings.push({ field: 'age', severity: 'warning', message: `BHD-Zuwachs ${cmPerYear.toFixed(2)} cm/a: sehr gering. Alter korrekt?` });
    }
  }

  return warnings;
}

export function validateStandMetrics(opts: {
  stockingDegree?: number | null;
  volumePerHa?: number | null;
  incrementPerHa?: number | null;
}): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { stockingDegree, volumePerHa, incrementPerHa } = opts;

  if (stockingDegree != null) {
    if (stockingDegree < 0.2) warnings.push({ field: 'stockingDegree', severity: 'warning', message: `Bestockungsgrad ${stockingDegree}: sehr niedrig. Freifläche / Blöße?` });
    if (stockingDegree > 1.5) warnings.push({ field: 'stockingDegree', severity: 'warning', message: `Bestockungsgrad ${stockingDegree}: über 1,5 — ungewöhnlich hoch.` });
  }

  if (volumePerHa != null) {
    if (volumePerHa < 0)    warnings.push({ field: 'volume', severity: 'error', message: 'Vorrat kann nicht negativ sein.' });
    if (volumePerHa > 1200) warnings.push({ field: 'volume', severity: 'warning', message: `Vorrat ${volumePerHa} m³/ha: sehr hoch (>1.200). Plausibel?` });
  }

  return warnings;
}

// ─── Mischbestandslogik ───────────────────────────────────────────────────────

export interface SpeciesEntry { species: string; percent: number; }

export interface MixedStandResult {
  /** Gewichteter Bestockungsgrad über alle Baumarten */
  weightedStockingDegree: number | null;
  /** Gewichteter Zuwachs m³/ha/a */
  weightedIncrement: number | null;
  /** Gewichteter Vorrat m³/ha */
  weightedVolume: number | null;
  /** Pro-Baumart-Aufschlüsselung */
  bySpecies: {
    species: string;
    percent: number;
    refGHa: number | null;
    refVHa: number | null;
    refIvHa: number | null;
    stockingDegree: number | null;
  }[];
}

/**
 * Berechnet gewichtete Bestandeskennzahlen für Mischbestände.
 *
 * @param speciesEntries  Baumarten mit Prozentanteil (Haupt + Neben)
 * @param age             Bestandesalter in Jahren
 * @param measuredGHa     Gemessene Grundfläche m²/ha (aus Probekreis oder manuell)
 * @param yieldTableLookup Funktion zum Nachschlagen von Ertragstafelwerten
 */
export function calcMixedStandMetrics(
  speciesEntries: SpeciesEntry[],
  age: number,
  measuredGHa: number | null,
  getYieldTableValues: (species: string, age: number, siteClass: number) => { gHa: number; vHa: number; ivHa: number } | null,
  estimateSiteClass: (species: string, age: number, hTop: number) => number,
  defaultSiteClass: number,
): MixedStandResult {
  const total = speciesEntries.reduce((s, e) => s + e.percent, 0) || 100;

  const bySpecies = speciesEntries.map(entry => {
    const ref = getYieldTableValues(entry.species, age, defaultSiteClass);
    if (!ref) return { species: entry.species, percent: entry.percent, refGHa: null, refVHa: null, refIvHa: null, stockingDegree: null };
    const share = entry.percent / total;
    const partialGHa = measuredGHa != null ? measuredGHa * share : null;
    const stockingDegree = partialGHa != null && ref.gHa > 0
      ? Math.round((partialGHa / (ref.gHa * share)) * 100) / 100
      : null;
    return {
      species:       entry.species,
      percent:       entry.percent,
      refGHa:        Math.round(ref.gHa  * share * 10) / 10,
      refVHa:        Math.round(ref.vHa  * share),
      refIvHa:       Math.round(ref.ivHa * share * 10) / 10,
      stockingDegree,
    };
  });

  const validRows = bySpecies.filter(r => r.refVHa != null);
  const weightedVolume   = validRows.length > 0 ? validRows.reduce((s, r) => s + (r.refVHa ?? 0), 0) : null;
  const weightedIncrement = validRows.length > 0 ? validRows.reduce((s, r) => s + (r.refIvHa ?? 0), 0) : null;

  const stockingRows = bySpecies.filter(r => r.stockingDegree != null);
  const weightedStockingDegree = stockingRows.length > 0
    ? Math.round(stockingRows.reduce((s, r) => s + (r.stockingDegree ?? 0) * (r.percent / total), 0) * 100) / 100
    : null;

  return { weightedStockingDegree, weightedIncrement, weightedVolume, bySpecies };
}
