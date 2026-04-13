/**
 * Aktive Alarme — SAR-Anomalien + Sturmereignisse der letzten Tage
 * Wird auf Übersichtsseite, Biomasse-Monitor und Karte angezeigt.
 */

import { prisma } from '@/lib/prisma';

export interface ActiveAlert {
  id:         string;
  type:       'SAR_ANOMALY' | 'STORM' | 'BARK_BEETLE' | 'DROUGHT_STRESS' | 'STORM_DAMAGE' | 'FROST_DAMAGE';
  forestId:   string;
  forestName: string;
  date:       string;   // ISO
  isTest:     boolean;  // Probe-Alarm vom Health-Check
  // SAR
  changeDb?:  number | null;
  vhMeanDb?:  number | null;
  // Storm
  windMaxKmh?: number | null;
  windDirDeg?: number | null;
  // Correlation
  severity?:   string | null;
  description?: string | null;
  suggestion?:  string | null;
}

export async function getActiveAlerts(
  accessibleForestIds: string[],
  currentUserId?: string,
): Promise<ActiveAlert[]> {
  if (!accessibleForestIds.length) return [];

  const sarCutoff   = new Date(Date.now() - 30 * 86400000);
  const stormCutoff = new Date(Date.now() - 7  * 86400000);

  // Bereits quittierte Alert-IDs des aktuellen Users laden
  const acknowledged = currentUserId
    ? await prisma.alertAcknowledgement.findMany({
        where:  { userId: currentUserId },
        select: { alertId: true },
      })
    : [];
  const ackedIds = new Set(acknowledged.map(a => a.alertId));

  const [sarRows, stormRows, correlationRows, forests] = await Promise.all([
    prisma.forestS1Snapshot.findMany({
      where: {
        forestId:  { in: accessibleForestIds },
        isAnomaly: true,
        date:      { gte: sarCutoff },
        source:    { not: 'TEST_ALERT' },
      },
      orderBy: { date: 'desc' },
      select:  { id: true, forestId: true, date: true, changeDb: true, vhMeanDb: true, source: true },
    }),
    prisma.forestWeatherSnapshot.findMany({
      where: {
        forestId: { in: accessibleForestIds },
        isStorm:  true,
        date:     { gte: stormCutoff },
        source:   { not: 'TEST_ALERT' },
      },
      orderBy: { date: 'desc' },
      select:  { id: true, forestId: true, date: true, windMaxKmh: true, windDirDeg: true, source: true },
    }),
    prisma.forestCorrelationAlert.findMany({
      where: {
        forestId:    { in: accessibleForestIds },
        expiresAt:   { gt: new Date() },
      },
      orderBy: { triggeredAt: 'desc' },
      select: {
        id: true, forestId: true, ruleId: true, severity: true,
        title: true, description: true, suggestion: true, triggeredAt: true,
      },
    }),
    prisma.forest.findMany({
      where:  { id: { in: accessibleForestIds } },
      select: { id: true, name: true },
    }),
  ]);

  const nameMap = Object.fromEntries(forests.map(f => [f.id, f.name]));

  const alerts: ActiveAlert[] = [
    ...sarRows
      .filter(r => !ackedIds.has(r.id))
      .map(r => ({
        id:         r.id,
        type:       'SAR_ANOMALY' as const,
        forestId:   r.forestId,
        forestName: nameMap[r.forestId] ?? '—',
        date:       r.date.toISOString(),
        isTest:     false,
        changeDb:   r.changeDb,
        vhMeanDb:   r.vhMeanDb,
      })),
    ...stormRows
      .filter(r => !ackedIds.has(r.id))
      .map(r => ({
        id:         r.id,
        type:       'STORM' as const,
        forestId:   r.forestId,
        forestName: nameMap[r.forestId] ?? '—',
        date:       r.date.toISOString(),
        isTest:     false,
        windMaxKmh: r.windMaxKmh,
        windDirDeg: r.windDirDeg,
      })),
    ...correlationRows
      .filter(r => !ackedIds.has(r.id))
      .map(r => ({
        id:          r.id,
        type:        r.ruleId as ActiveAlert['type'],
        forestId:    r.forestId,
        forestName:  nameMap[r.forestId] ?? '—',
        date:        r.triggeredAt.toISOString(),
        isTest:      false,
        severity:    r.severity,
        description: r.description,
        suggestion:  r.suggestion,
      })),
  ];

  return alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
