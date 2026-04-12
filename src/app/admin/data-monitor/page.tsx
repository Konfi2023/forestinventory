import { prisma } from '@/lib/prisma';
import { Database } from 'lucide-react';
import { DataMonitorStats } from './_components/DataMonitorStats';
import { DataMonitorFilter } from './_components/DataMonitorFilter';
import { DataFeedTable } from './_components/DataFeedTable';

export interface DataFeedEntry {
  id: string;
  timestamp: string;
  source: string;
  method: string | null;
  confidence: number | null;
  forestName: string | null;
  forestId: string | null;
  type: 'weather' | 'sentinel1' | 'ndvi' | 'polygon' | 'ai-tree' | 'ai-biomass';
  details: string;
}

export interface DataMonitorStatsData {
  todayCounts: Record<string, number>;
  weekCounts: Record<string, number>;
  totalCount: number;
  legacyCount: number;
}

export default async function DataMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; forestId?: string; days?: string }>;
}) {
  const params = await searchParams;
  const sourceFilter = params.source || undefined;
  const forestIdFilter = params.forestId || undefined;
  const daysBack = Number(params.days || '7');

  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Forests for filter dropdown
  const forests = await prisma.forest.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const forestMap = new Map(forests.map(f => [f.id, f.name]));

  // Build feed entries from all sources in parallel
  const entries: DataFeedEntry[] = [];

  const shouldInclude = (type: string) => !sourceFilter || sourceFilter === type;

  const [weatherRows, s1Rows, ndviRows, polyRows, aiTreeRows, aiBiomassRows] = await Promise.all([
    shouldInclude('weather') ? prisma.forestWeatherSnapshot.findMany({
      where: {
        createdAt: { gte: since },
        ...(forestIdFilter ? { forestId: forestIdFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, createdAt: true, processedAt: true, source: true, method: true, confidence: true,
        forestId: true, date: true, maxTempC: true, minTempC: true, precipMm: true,
        waterBalanceMm: true, isFrost: true, isHeatStress: true, barkBeetleRisk: true, isStorm: true,
      },
    }) : [],
    shouldInclude('sentinel1') ? prisma.forestS1Snapshot.findMany({
      where: {
        createdAt: { gte: since },
        ...(forestIdFilter ? { forestId: forestIdFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, createdAt: true, processedAt: true, source: true, method: true, confidence: true,
        forestId: true, date: true, vhMeanDb: true, vvMeanDb: true, changeDb: true, isAnomaly: true, sceneCount: true,
      },
    }) : [],
    shouldInclude('ndvi') ? prisma.forestBiomassSnapshot.findMany({
      where: {
        createdAt: { gte: since },
        ...(forestIdFilter ? { forestId: forestIdFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, createdAt: true, processedAt: true, source: true, method: true, confidence: true,
        forestId: true, date: true, meanNdvi: true, minNdvi: true, maxNdvi: true, cloudPct: true,
      },
    }) : [],
    shouldInclude('polygon') ? prisma.forestPolygonSnapshot.findMany({
      where: {
        createdAt: { gte: since },
        ...(forestIdFilter ? { forestId: forestIdFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, createdAt: true, processedAt: true, source: true, method: true, confidence: true,
        forestId: true, date: true, polygonType: true, vhMeanDb: true, changeDb: true, isAnomaly: true,
      },
    }) : [],
    shouldInclude('ai-tree') ? prisma.aiTreeAnalysis.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, createdAt: true, source: true, analysisType: true, confidence: true,
        poiId: true, scientificName: true, speciesLabel: true, diameterCm: true, heightM: true,
        health: true, crownCondition: true, crownDefoliation: true, aiModel: true,
        poi: { select: { forestId: true } },
      },
    }) : [],
    shouldInclude('ai-biomass') ? prisma.forestAiBiomassReport.findMany({
      where: {
        createdAt: { gte: since },
        ...(forestIdFilter ? { forestId: forestIdFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, createdAt: true, source: true, forestId: true, reportMonth: true,
        status: true, headline: true, aiModel: true, ndviValue: true,
      },
    }) : [],
  ]);

  // Map weather
  for (const r of weatherRows) {
    const details = [
      r.maxTempC != null ? `maxT: ${r.maxTempC}°C` : null,
      r.minTempC != null ? `minT: ${r.minTempC}°C` : null,
      r.precipMm != null ? `precip: ${r.precipMm}mm` : null,
      r.waterBalanceMm != null ? `balance: ${r.waterBalanceMm}mm` : null,
      r.isFrost ? 'FROST' : null,
      r.isHeatStress ? 'HITZE' : null,
      r.barkBeetleRisk ? 'BORKENK.' : null,
      r.isStorm ? 'STURM' : null,
    ].filter(Boolean).join(', ');

    entries.push({
      id: r.id,
      timestamp: (r.processedAt ?? r.createdAt).toISOString(),
      source: r.source,
      method: r.method,
      confidence: r.confidence,
      forestName: forestMap.get(r.forestId) ?? null,
      forestId: r.forestId,
      type: 'weather',
      details: `${r.date.toISOString().split('T')[0]}: ${details}`,
    });
  }

  // Map sentinel-1
  for (const r of s1Rows) {
    entries.push({
      id: r.id,
      timestamp: (r.processedAt ?? r.createdAt).toISOString(),
      source: r.source,
      method: r.method,
      confidence: r.confidence,
      forestName: forestMap.get(r.forestId) ?? null,
      forestId: r.forestId,
      type: 'sentinel1',
      details: [
        r.vhMeanDb != null ? `VH: ${r.vhMeanDb.toFixed(1)}dB` : null,
        r.changeDb != null ? `change: ${r.changeDb.toFixed(1)}dB` : null,
        `scenes: ${r.sceneCount}`,
        r.isAnomaly ? 'ANOMALIE' : null,
      ].filter(Boolean).join(', '),
    });
  }

  // Map NDVI
  for (const r of ndviRows) {
    entries.push({
      id: r.id,
      timestamp: (r.processedAt ?? r.createdAt).toISOString(),
      source: r.source,
      method: r.method,
      confidence: r.confidence,
      forestName: forestMap.get(r.forestId) ?? null,
      forestId: r.forestId,
      type: 'ndvi',
      details: [
        r.meanNdvi != null ? `NDVI: ${r.meanNdvi.toFixed(3)}` : null,
        r.minNdvi != null ? `min: ${r.minNdvi.toFixed(3)}` : null,
        r.maxNdvi != null ? `max: ${r.maxNdvi.toFixed(3)}` : null,
        r.cloudPct != null ? `cloud: ${r.cloudPct}%` : null,
      ].filter(Boolean).join(', '),
    });
  }

  // Map polygon snapshots
  for (const r of polyRows) {
    entries.push({
      id: r.id,
      timestamp: (r.processedAt ?? r.createdAt).toISOString(),
      source: r.source,
      method: r.method,
      confidence: r.confidence,
      forestName: forestMap.get(r.forestId) ?? null,
      forestId: r.forestId,
      type: 'polygon',
      details: [
        r.polygonType,
        r.vhMeanDb != null ? `VH: ${r.vhMeanDb.toFixed(1)}dB` : null,
        r.changeDb != null ? `change: ${r.changeDb.toFixed(1)}dB` : null,
        r.isAnomaly ? 'ANOMALIE' : null,
      ].filter(Boolean).join(', '),
    });
  }

  // Map AI tree analyses
  for (const r of aiTreeRows) {
    const isTree = r.analysisType === 'TREE_PHOTO';
    entries.push({
      id: r.id,
      timestamp: r.createdAt.toISOString(),
      source: r.source,
      method: r.analysisType,
      confidence: r.confidence,
      forestName: r.poi?.forestId ? (forestMap.get(r.poi.forestId) ?? null) : null,
      forestId: r.poi?.forestId ?? null,
      type: 'ai-tree',
      details: isTree
        ? [
            r.speciesLabel ?? r.scientificName,
            r.diameterCm != null ? `BHD: ${r.diameterCm}cm` : null,
            r.heightM != null ? `H: ${r.heightM}m` : null,
            r.health,
          ].filter(Boolean).join(', ')
        : [
            r.crownCondition != null ? `Krone: ${r.crownCondition}%` : null,
            r.crownDefoliation != null ? `Verlichtung: ${r.crownDefoliation}%` : null,
            r.health,
          ].filter(Boolean).join(', '),
    });
  }

  // Map AI biomass reports
  for (const r of aiBiomassRows) {
    entries.push({
      id: r.id,
      timestamp: r.createdAt.toISOString(),
      source: r.source,
      method: null,
      confidence: null,
      forestName: forestMap.get(r.forestId) ?? null,
      forestId: r.forestId,
      type: 'ai-biomass',
      details: [
        r.status?.toUpperCase(),
        r.headline,
        r.ndviValue != null ? `NDVI: ${r.ndviValue.toFixed(3)}` : null,
      ].filter(Boolean).join(' — '),
    });
  }

  // Sort by timestamp descending, take 50
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const feed = entries.slice(0, 50);

  // Stats: counts per source for today and this week
  const todayCounts: Record<string, number> = {};
  const weekCounts: Record<string, number> = {};
  for (const e of entries) {
    const ts = new Date(e.timestamp);
    const key = e.type;
    if (ts >= today) todayCounts[key] = (todayCounts[key] ?? 0) + 1;
    if (ts >= weekAgo) weekCounts[key] = (weekCounts[key] ?? 0) + 1;
  }

  // Legacy count (method is null) — quick counts across main tables
  const [totalSnaps, legacySnaps] = await Promise.all([
    prisma.forestWeatherSnapshot.count()
      .then(w => prisma.forestS1Snapshot.count().then(s => prisma.forestBiomassSnapshot.count().then(b => w + s + b))),
    prisma.forestWeatherSnapshot.count({ where: { method: null } })
      .then(w => prisma.forestS1Snapshot.count({ where: { method: null } }).then(s =>
        prisma.forestBiomassSnapshot.count({ where: { method: null } }).then(b => w + s + b))),
  ]);

  const stats: DataMonitorStatsData = {
    todayCounts,
    weekCounts,
    totalCount: totalSnaps,
    legacyCount: legacySnaps,
  };

  const forestOptions = forests.map(f => ({ id: f.id, name: f.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Database className="text-violet-600" size={28} />
          Data Monitor
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Datenprovenienz · Quellenqualität · Live-Feed aller eingehenden Datenpunkte
        </p>
      </div>

      <DataMonitorStats stats={stats} />

      <DataMonitorFilter
        forests={forestOptions}
        currentSource={sourceFilter}
        currentForestId={forestIdFilter}
        currentDays={daysBack}
      />

      <DataFeedTable entries={feed} />
    </div>
  );
}
