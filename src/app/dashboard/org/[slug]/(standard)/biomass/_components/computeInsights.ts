// ---------------------------------------------------------------------------
// Reine Berechnungsfunktionen für NDVI-Analyse + Klimakorrelation
// Kein React, kein UI — nur Mathematik.
// ---------------------------------------------------------------------------

export interface Snapshot {
  date: string;       // ISO string
  meanNdvi: number | null;
  minNdvi:  number | null;
  maxNdvi:  number | null;
}

// ---------------------------------------------------------------------------
// Wetter-Monatswert (aggregiert aus täglichen ForestWeatherSnapshots)
// ---------------------------------------------------------------------------

export interface WeatherMonth {
  year: number;
  month: number;        // 0-based
  avgTemp: number | null;   // Ø Tagestemperatur in °C
  precipSum: number | null; // Monatlicher Niederschlag in mm
  waterBalance: number | null; // Niederschlag − ET₀
  frostDays: number;
  heatDays: number;
  beetleDays: number;
}

// ---------------------------------------------------------------------------
// E. Klimakorrelation (NDVI × Temperatur × Niederschlag auf Timeline)
// ---------------------------------------------------------------------------

export interface KlimaPoint {
  label: string;          // "YYYY-MM"
  ndvi: number | null;
  temp: number | null;    // °C
  precip: number | null;  // mm
  waterBalance: number | null;
  frostDays: number;
  heatDays: number;
  beetleDays: number;
}

export function buildKlimaData(snapshots: Snapshot[], weatherMonths: WeatherMonth[]): KlimaPoint[] {
  // Alle vorhandenen Jahr-Monat-Kombinationen aus beiden Datensätzen sammeln
  const allYMs = new Set<string>();
  snapshots
    .filter(s => s.meanNdvi != null)
    .forEach(s => {
      const d = new Date(s.date);
      allYMs.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
  weatherMonths.forEach(w => {
    allYMs.add(`${w.year}-${String(w.month + 1).padStart(2, '0')}`);
  });

  return [...allYMs].sort().map(label => {
    const [yr, mo] = label.split('-').map(Number);
    const month = mo - 1; // 0-based

    const snap = snapshots.find(s => {
      const d = new Date(s.date);
      return d.getFullYear() === yr && d.getMonth() === month;
    });
    const w = weatherMonths.find(w => w.year === yr && w.month === month);

    return {
      label,
      ndvi:         snap?.meanNdvi  != null ? Number(snap.meanNdvi.toFixed(3))       : null,
      temp:         w?.avgTemp      != null ? Number(w.avgTemp.toFixed(1))           : null,
      precip:       w?.precipSum    != null ? Number(w.precipSum.toFixed(1))         : null,
      waterBalance: w?.waterBalance != null ? Number(w.waterBalance.toFixed(1))      : null,
      frostDays:    w?.frostDays    ?? 0,
      heatDays:     w?.heatDays     ?? 0,
      beetleDays:   w?.beetleDays   ?? 0,
    };
  });
}

const MONTH_NAMES = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stddev(vals: number[]): number {
  const mean = avg(vals)!;
  return Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
}

function getYM(s: Snapshot) {
  const d = new Date(s.date);
  return { year: d.getFullYear(), month: d.getMonth() }; // month 0-based
}

function validSnapshots(snapshots: Snapshot[]) {
  return snapshots.filter(s => s.meanNdvi != null) as (Snapshot & { meanNdvi: number })[];
}

// ---------------------------------------------------------------------------
// A. Kumulative Daten ("The Race")
// ---------------------------------------------------------------------------

export interface RacePoint {
  month: string;
  [year: string]: number | string | null;
}

export function buildRaceData(snapshots: Snapshot[]): { data: RacePoint[]; years: number[] } {
  const valid = validSnapshots(snapshots);
  const years = [...new Set(valid.map(s => getYM(s).year))].sort();

  const data: RacePoint[] = MONTH_NAMES.map((month, mi) => {
    const row: RacePoint = { month };
    years.forEach(yr => {
      let cumul = 0;
      let hasAll = true;
      for (let m = 0; m <= mi; m++) {
        const snap = valid.find(s => { const {year,month} = getYM(s); return year===yr && month===m; });
        if (!snap) { hasAll = false; break; }
        cumul += snap.meanNdvi;
      }
      row[String(yr)] = hasAll ? Number(cumul.toFixed(3)) : null;
    });
    return row;
  });

  return { data, years };
}

// ---------------------------------------------------------------------------
// B. Delta-Daten (Abweichung zum Vorjahr oder 3-Jahres-Mittel)
// ---------------------------------------------------------------------------

export interface DeltaPoint {
  month: string;
  delta: number | null;  // absolute Abweichung
  deltaPct: number | null;
  reference: number | null;
  current: number | null;
}

export function buildDeltaData(
  snapshots: Snapshot[],
  currentYear: number,
  referenceMode: 'prev_year' | 'avg3',
): DeltaPoint[] {
  const valid = validSnapshots(snapshots);
  const prevYears = referenceMode === 'prev_year'
    ? [currentYear - 1]
    : [currentYear - 1, currentYear - 2, currentYear - 3];

  return MONTH_NAMES.map((month, mi) => {
    const cur = valid.find(s => { const {year,month:m} = getYM(s); return year===currentYear && m===mi; });
    const refs = prevYears
      .map(yr => valid.find(s => { const {year,month:m} = getYM(s); return year===yr && m===mi; })?.meanNdvi)
      .filter((v): v is number => v != null);
    const refAvg = avg(refs);

    if (!cur || refAvg == null) return { month, delta: null, deltaPct: null, reference: refAvg, current: cur?.meanNdvi ?? null };
    const delta    = cur.meanNdvi - refAvg;
    const deltaPct = (delta / refAvg) * 100;
    return { month, delta: Number(delta.toFixed(4)), deltaPct: Number(deltaPct.toFixed(1)), reference: Number(refAvg.toFixed(3)), current: Number(cur.meanNdvi.toFixed(3)) };
  });
}

// ---------------------------------------------------------------------------
// C. Heatmap-Daten
// ---------------------------------------------------------------------------

export interface HeatCell {
  year: number;
  month: number; // 0-based
  monthLabel: string;
  value: number | null;
  normalized: number | null; // 0–1 relativ zu min/max in diesem Datensatz
}

export function buildHeatmapData(snapshots: Snapshot[]): { cells: HeatCell[]; years: number[]; vmin: number; vmax: number } {
  const valid = validSnapshots(snapshots);
  const years = [...new Set(valid.map(s => getYM(s).year))].sort();
  const allVals = valid.map(s => s.meanNdvi);
  const vmin = Math.min(...allVals);
  const vmax = Math.max(...allVals);

  const cells: HeatCell[] = [];
  years.forEach(yr => {
    for (let m = 0; m < 12; m++) {
      const snap = valid.find(s => { const {year,month} = getYM(s); return year===yr && month===m; });
      const value = snap?.meanNdvi ?? null;
      cells.push({
        year: yr,
        month: m,
        monthLabel: MONTH_NAMES[m],
        value: value != null ? Number(value.toFixed(3)) : null,
        normalized: value != null && vmax > vmin ? (value - vmin) / (vmax - vmin) : null,
      });
    }
  });

  return { cells, years, vmin, vmax };
}

// ---------------------------------------------------------------------------
// D. Gleitender Durchschnitt (Rolling Average über kontinuierliche Timeline)
// ---------------------------------------------------------------------------

export interface RollingPoint {
  label: string;     // 'YYYY-MM'
  value: number | null;
  rolling12: number | null;
}

export function buildRollingData(snapshots: Snapshot[]): RollingPoint[] {
  const valid = validSnapshots(snapshots);
  const sorted = [...valid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((snap, i) => {
    const d = getYM(snap);
    const label = `${d.year}-${String(d.month + 1).padStart(2, '0')}`;

    // 12-Monats Rolling Average: aktueller + 11 vorherige
    const window = sorted.slice(Math.max(0, i - 11), i + 1);
    const rolling12 = window.length >= 6 // mindestens 6 Monate für sinnvollen Durchschnitt
      ? Number((window.reduce((s, w) => s + w.meanNdvi, 0) / window.length).toFixed(3))
      : null;

    return { label, value: Number(snap.meanNdvi.toFixed(3)), rolling12 };
  });
}

// ---------------------------------------------------------------------------
// INSIGHTS
// ---------------------------------------------------------------------------

export interface SeasonalityFactor {
  month: number;
  monthLabel: string;
  avgNdvi: number;
  deviation: number;    // % über/unter Jahresmittel
  isBest: boolean;
  isWorst: boolean;
}

export interface Anomaly {
  year: number;
  month: number;
  monthLabel: string;
  value: number;
  historicalMean: number;
  deviationPct: number; // positiv = besser als normal, negativ = schlechter
  isCritical: boolean;  // |deviation| > 25%
}

export interface Insights {
  // A. Saisonalität
  seasonality: SeasonalityFactor[];
  peakMonth: string;
  troughMonth: string;

  // B. YoY
  yoySummerGrowth: number | null;   // % Änderung Sommer vs. Vorjahr
  yoyAnnualGrowth: number | null;
  currentYearSummer: number | null;
  prevYearSummer: number | null;
  currentYearAvg: number | null;
  prevYearAvg: number | null;

  // C. Prognose (lineares Modell auf Jahres-Sommer-NDVI)
  forecastCurrentYear: number | null;
  forecastNextYear: number | null;
  regressionSlope: number | null;   // NDVI-Änderung pro Jahr

  // D. Anomalien
  anomalies: Anomaly[];

  // E. CAGR
  cagrSummer: number | null;        // auf Basis Sommer-NDVI
  cagrYears: number;
}

export function computeInsights(snapshots: Snapshot[]): Insights {
  const valid = validSnapshots(snapshots);
  const currentYear = new Date().getFullYear();
  const years = [...new Set(valid.map(s => getYM(s).year))].sort();

  // --- Saisonalität ---
  const seasonality: SeasonalityFactor[] = MONTH_NAMES.map((monthLabel, mi) => {
    const vals = valid.filter(s => getYM(s).month === mi).map(s => s.meanNdvi);
    return { month: mi, monthLabel, avgNdvi: avg(vals) ?? 0, deviation: 0, isBest: false, isWorst: false };
  });
  const overallAvg = avg(seasonality.map(s => s.avgNdvi)) ?? 1;
  seasonality.forEach(s => {
    s.deviation = overallAvg > 0 ? ((s.avgNdvi - overallAvg) / overallAvg) * 100 : 0;
  });
  const maxDev = Math.max(...seasonality.map(s => s.deviation));
  const minDev = Math.min(...seasonality.map(s => s.deviation));
  seasonality.forEach(s => {
    s.isBest  = s.deviation === maxDev;
    s.isWorst = s.deviation === minDev;
  });
  const peakMonth  = seasonality.find(s => s.isBest)?.monthLabel ?? '–';
  const troughMonth= seasonality.find(s => s.isWorst)?.monthLabel ?? '–';

  // --- Sommer-NDVI (Jul=6, Aug=7) ---
  function summerVal(yr: number) {
    const vals = [6, 7].map(m => valid.find(s => getYM(s).year===yr && getYM(s).month===m)?.meanNdvi).filter((v): v is number => v!=null);
    return avg(vals);
  }
  function annualVal(yr: number) {
    const vals = valid.filter(s => getYM(s).year===yr).map(s => s.meanNdvi);
    return avg(vals);
  }

  const curSummer  = summerVal(currentYear);
  const prevSummer = summerVal(currentYear - 1);
  const curAnnual  = annualVal(currentYear);
  const prevAnnual = annualVal(currentYear - 1);

  const yoySummerGrowth = curSummer != null && prevSummer != null
    ? Number((((curSummer - prevSummer) / prevSummer) * 100).toFixed(1)) : null;
  const yoyAnnualGrowth = curAnnual != null && prevAnnual != null
    ? Number((((curAnnual - prevAnnual) / prevAnnual) * 100).toFixed(1)) : null;

  // --- Lineare Regression auf Jahres-Sommer-NDVI ---
  const summerPairs = years.map(yr => ({ yr, val: summerVal(yr) })).filter(p => p.val != null) as { yr: number; val: number }[];
  let regressionSlope: number | null = null;
  let forecastCurrentYear: number | null = null;
  let forecastNextYear: number | null = null;

  if (summerPairs.length >= 2) {
    const n = summerPairs.length;
    const meanYr  = summerPairs.reduce((s, p) => s + p.yr, 0) / n;
    const meanVal = summerPairs.reduce((s, p) => s + p.val, 0) / n;
    const num = summerPairs.reduce((s, p) => s + (p.yr - meanYr) * (p.val - meanVal), 0);
    const den = summerPairs.reduce((s, p) => s + (p.yr - meanYr) ** 2, 0);
    regressionSlope = den > 0 ? Number((num / den).toFixed(4)) : null;
    if (regressionSlope != null) {
      const b = meanVal - regressionSlope * meanYr;
      forecastCurrentYear = Number((regressionSlope * currentYear + b).toFixed(3));
      forecastNextYear    = Number((regressionSlope * (currentYear + 1) + b).toFixed(3));
    }
  }

  // --- Anomalien (Abweichung > 20% vom historischen Monatsmittel) ---
  const anomalies: Anomaly[] = [];
  valid.forEach(snap => {
    const { year, month } = getYM(snap);
    // Historischer Mittelwert ohne das aktuelle Jahr
    const historical = valid
      .filter(s => getYM(s).month === month && getYM(s).year !== year)
      .map(s => s.meanNdvi);
    if (historical.length < 1) return;
    const histMean = avg(historical)!;
    if (histMean === 0) return;
    const devPct = ((snap.meanNdvi - histMean) / histMean) * 100;
    if (Math.abs(devPct) > 20) {
      anomalies.push({
        year, month,
        monthLabel: MONTH_NAMES[month],
        value: Number(snap.meanNdvi.toFixed(3)),
        historicalMean: Number(histMean.toFixed(3)),
        deviationPct: Number(devPct.toFixed(1)),
        isCritical: Math.abs(devPct) > 30,
      });
    }
  });
  anomalies.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));

  // --- CAGR (Sommer-NDVI) ---
  let cagrSummer: number | null = null;
  if (summerPairs.length >= 2) {
    const first = summerPairs[0];
    const last  = summerPairs[summerPairs.length - 1];
    const n = last.yr - first.yr;
    if (n > 0 && first.val > 0) {
      cagrSummer = Number(((Math.pow(last.val / first.val, 1 / n) - 1) * 100).toFixed(2));
    }
  }

  return {
    seasonality, peakMonth, troughMonth,
    yoySummerGrowth, yoyAnnualGrowth,
    currentYearSummer: curSummer != null ? Number(curSummer.toFixed(3)) : null,
    prevYearSummer:    prevSummer != null ? Number(prevSummer.toFixed(3)) : null,
    currentYearAvg:    curAnnual != null ? Number(curAnnual.toFixed(3)) : null,
    prevYearAvg:       prevAnnual != null ? Number(prevAnnual.toFixed(3)) : null,
    forecastCurrentYear, forecastNextYear, regressionSlope,
    anomalies,
    cagrSummer, cagrYears: summerPairs.length >= 2 ? summerPairs[summerPairs.length-1].yr - summerPairs[0].yr : 0,
  };
}
