import { prisma } from '@/lib/prisma';

/**
 * Multi-Source-Korrelations-Engine
 * Verschneidet Wetter-, Sentinel-1- und NDVI-Daten zu handlungsrelevanten Alerts.
 */

interface PendingAlert {
  ruleId: string;
  severity: 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  suggestion: string;
  sources: Record<string, any>;
}

const ALERT_EXPIRY_DAYS = 14;

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ALERT_EXPIRY_DAYS);
  return d;
}

/** Heute 00:00 UTC */
function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgo(n: number): Date {
  const d = todayUtc();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Regel 1: Borkenkäfer-Warnung ────────────────────────────────────────────

async function checkBarkBeetle(forestId: string, forestName: string): Promise<PendingAlert | null> {
  // Wetter: barkBeetleRisk an 3+ der letzten 7 Tage
  const beetleDays = await prisma.forestWeatherSnapshot.count({
    where: {
      forestId,
      date: { gte: daysAgo(7) },
      barkBeetleRisk: true,
    },
  });

  if (beetleDays < 3) return null;

  // NDVI: aktueller Monat vs. Vormonat
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [currentNdvi, prevNdvi] = await Promise.all([
    prisma.forestBiomassSnapshot.findFirst({
      where: { forestId, date: currentMonth },
      select: { meanNdvi: true },
    }),
    prisma.forestBiomassSnapshot.findFirst({
      where: { forestId, date: prevMonth },
      select: { meanNdvi: true },
    }),
  ]);

  if (!currentNdvi?.meanNdvi || !prevNdvi?.meanNdvi) return null;

  const dropPct = ((prevNdvi.meanNdvi - currentNdvi.meanNdvi) / prevNdvi.meanNdvi) * 100;
  if (dropPct < 5) return null;

  const severity = dropPct > 10 ? 'HIGH' : 'MEDIUM' as const;

  return {
    ruleId: 'BARK_BEETLE',
    severity,
    title: `Borkenkäfer-Warnung: ${forestName}`,
    description:
      `${beetleDays} Borkenkäfer-Risikotage in der letzten Woche (Temp ≥ 16,5°C, Niederschlag < 2mm). ` +
      `Gleichzeitig NDVI-Rückgang um ${dropPct.toFixed(1)}% gegenüber dem Vormonat ` +
      `(${prevNdvi.meanNdvi.toFixed(3)} → ${currentNdvi.meanNdvi.toFixed(3)}).`,
    suggestion: 'Fichtenbestände auf Bohrmehl und Brutbilder kontrollieren.',
    sources: {
      weather: { beetleDays, period: '7 Tage' },
      ndvi: { current: currentNdvi.meanNdvi, previous: prevNdvi.meanNdvi, dropPct: Number(dropPct.toFixed(1)) },
    },
  };
}

// ─── Regel 2: Trockenstress ──────────────────────────────────────────────────

async function checkDroughtStress(forestId: string, forestName: string): Promise<PendingAlert | null> {
  // Wetter: kumulierte Wasserbilanz der letzten 28 Tage
  const weatherRows = await prisma.forestWeatherSnapshot.findMany({
    where: {
      forestId,
      date: { gte: daysAgo(28) },
      waterBalanceMm: { not: null },
    },
    select: { waterBalanceMm: true },
  });

  if (weatherRows.length < 14) return null; // Nicht genug Daten

  const totalBalance = weatherRows.reduce((s, w) => s + (w.waterBalanceMm ?? 0), 0);
  if (totalBalance > -30) return null;

  // NDVI: unter saisonalem 3-Jahres-Mittel
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const currentNdvi = await prisma.forestBiomassSnapshot.findFirst({
    where: { forestId, date: currentMonth },
    select: { meanNdvi: true },
  });

  // Historischer Durchschnitt für diesen Monat (3 Vorjahre)
  const historicNdvi = await prisma.forestBiomassSnapshot.findMany({
    where: {
      forestId,
      date: {
        gte: new Date(Date.UTC(now.getUTCFullYear() - 3, now.getUTCMonth(), 1)),
        lt: currentMonth,
      },
    },
    select: { meanNdvi: true, date: true },
  });

  const sameMonthHistoric = historicNdvi.filter(
    h => h.meanNdvi != null && new Date(h.date).getUTCMonth() === now.getUTCMonth()
  );

  if (!currentNdvi?.meanNdvi || sameMonthHistoric.length === 0) return null;

  const avgHistoric = sameMonthHistoric.reduce((s, h) => s + h.meanNdvi!, 0) / sameMonthHistoric.length;
  if (currentNdvi.meanNdvi >= avgHistoric) return null;

  const severity = totalBalance < -60 ? 'HIGH' : 'MEDIUM' as const;

  return {
    ruleId: 'DROUGHT_STRESS',
    severity,
    title: `Trockenstress: ${forestName}`,
    description:
      `Kumulative Wasserbilanz der letzten 28 Tage: ${totalBalance.toFixed(1)} mm (Defizit). ` +
      `NDVI (${currentNdvi.meanNdvi.toFixed(3)}) liegt unter dem 3-Jahres-Mittel für diesen Monat (${avgHistoric.toFixed(3)}).`,
    suggestion: 'Jungbestände auf Trockenschäden prüfen, Durchforstung erwägen um Wasserkonkurrenz zu reduzieren.',
    sources: {
      weather: { waterBalanceMm: Number(totalBalance.toFixed(1)), days: weatherRows.length },
      ndvi: { current: currentNdvi.meanNdvi, historicAvg: Number(avgHistoric.toFixed(3)) },
    },
  };
}

// ─── Regel 3: Sturmschaden-Verifikation ──────────────────────────────────────

async function checkStormDamage(forestId: string, forestName: string): Promise<PendingAlert | null> {
  // Wetter: Sturm in den letzten 3 Tagen
  const stormDays = await prisma.forestWeatherSnapshot.findMany({
    where: {
      forestId,
      date: { gte: daysAgo(3) },
      isStorm: true,
    },
    select: { date: true, windMaxKmh: true },
    orderBy: { date: 'desc' },
    take: 1,
  });

  if (stormDays.length === 0) return null;

  // SAR-Anomalie innerhalb von 7 Tagen nach dem Sturm
  const stormDate = stormDays[0].date;
  const sarWindowEnd = new Date(stormDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sarAnomaly = await prisma.forestS1Snapshot.findFirst({
    where: {
      forestId,
      date: { gte: stormDate, lte: sarWindowEnd },
      isAnomaly: true,
    },
    select: { date: true, changeDb: true, vhMeanDb: true },
  });

  if (!sarAnomaly) return null;

  return {
    ruleId: 'STORM_DAMAGE',
    severity: 'HIGH',
    title: `Sturmschaden bestätigt: ${forestName}`,
    description:
      `Sturm am ${stormDate.toISOString().split('T')[0]} (Böen: ${stormDays[0].windMaxKmh?.toFixed(0)} km/h). ` +
      `Sentinel-1 SAR-Anomalie am ${sarAnomaly.date.toISOString().split('T')[0]} bestätigt ` +
      `strukturelle Veränderung (${sarAnomaly.changeDb?.toFixed(1)} dB Abweichung).`,
    suggestion: 'Sturmschaden durch Satellit bestätigt — Fläche begehen und Aufarbeitung planen.',
    sources: {
      weather: { stormDate: stormDate.toISOString(), windMaxKmh: stormDays[0].windMaxKmh },
      sentinel: { sarDate: sarAnomaly.date.toISOString(), changeDb: sarAnomaly.changeDb },
    },
  };
}

// ─── Regel 4: Frostschaden im Frühjahr ───────────────────────────────────────

async function checkFrostDamage(forestId: string, forestName: string): Promise<PendingAlert | null> {
  const now = new Date();
  const month = now.getUTCMonth(); // 0-based
  // Nur April (3) bis Juni (5)
  if (month < 3 || month > 5) return null;

  // Wetter: Frost in den letzten 7 Tagen
  const frostDays = await prisma.forestWeatherSnapshot.count({
    where: {
      forestId,
      date: { gte: daysAgo(7) },
      isFrost: true,
    },
  });

  if (frostDays === 0) return null;

  // NDVI-Rückgang > 3% gegenüber Vormonat
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [currentNdvi, prevNdvi] = await Promise.all([
    prisma.forestBiomassSnapshot.findFirst({
      where: { forestId, date: currentMonth },
      select: { meanNdvi: true },
    }),
    prisma.forestBiomassSnapshot.findFirst({
      where: { forestId, date: prevMonth },
      select: { meanNdvi: true },
    }),
  ]);

  if (!currentNdvi?.meanNdvi || !prevNdvi?.meanNdvi) return null;

  const dropPct = ((prevNdvi.meanNdvi - currentNdvi.meanNdvi) / prevNdvi.meanNdvi) * 100;
  if (dropPct < 3) return null;

  return {
    ruleId: 'FROST_DAMAGE',
    severity: 'MEDIUM',
    title: `Spätfrost-Warnung: ${forestName}`,
    description:
      `${frostDays} Frosttage in der letzten Woche (April–Juni). ` +
      `NDVI-Rückgang um ${dropPct.toFixed(1)}% gegenüber dem Vormonat ` +
      `(${prevNdvi.meanNdvi.toFixed(3)} → ${currentNdvi.meanNdvi.toFixed(3)}).`,
    suggestion: 'Spätfrost erkannt — Jungpflanzen und frische Triebe auf Frostschäden prüfen.',
    sources: {
      weather: { frostDays, period: '7 Tage' },
      ndvi: { current: currentNdvi.meanNdvi, previous: prevNdvi.meanNdvi, dropPct: Number(dropPct.toFixed(1)) },
    },
  };
}

// ─── Hauptfunktion ───────────────────────────────────────────────────────────

export async function evaluateAllRules(forestId: string, forestName: string): Promise<PendingAlert[]> {
  const results = await Promise.allSettled([
    checkBarkBeetle(forestId, forestName),
    checkDroughtStress(forestId, forestName),
    checkStormDamage(forestId, forestName),
    checkFrostDamage(forestId, forestName),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<PendingAlert | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((a): a is PendingAlert => a !== null);
}

export { type PendingAlert, expiresAt };
