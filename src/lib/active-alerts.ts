/**
 * Aktive Alarme — SAR-Anomalien + Sturmereignisse der letzten Tage
 * Wird auf Übersichtsseite, Biomasse-Monitor und Karte angezeigt.
 */

import { prisma } from '@/lib/prisma';

export interface ActiveAlert {
  id:         string;
  type:       'SAR_ANOMALY' | 'STORM';
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

  const [sarRows, stormRows, forests] = await Promise.all([
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
  ];

  return alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
