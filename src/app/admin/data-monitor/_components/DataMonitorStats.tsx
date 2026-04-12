'use client';

import type { DataMonitorStatsData } from '../page';

const TYPE_LABELS: Record<string, string> = {
  weather: 'Wetter',
  sentinel1: 'Sentinel-1',
  ndvi: 'NDVI',
  polygon: 'Polygon',
  'ai-tree': 'AI Baum/Krone',
  'ai-biomass': 'AI Biomasse',
};

const TYPE_COLORS: Record<string, string> = {
  weather: 'bg-blue-500',
  sentinel1: 'bg-emerald-500',
  ndvi: 'bg-green-500',
  polygon: 'bg-teal-500',
  'ai-tree': 'bg-violet-500',
  'ai-biomass': 'bg-purple-500',
};

export function DataMonitorStats({ stats }: { stats: DataMonitorStatsData }) {
  const { todayCounts, weekCounts, totalCount, legacyCount } = stats;
  const provenanceCount = totalCount - legacyCount;
  const provenancePct = totalCount > 0 ? Math.round((provenanceCount / totalCount) * 100) : 0;

  const allTypes = ['weather', 'sentinel1', 'ndvi', 'polygon', 'ai-tree', 'ai-biomass'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {allTypes.map(type => (
        <div key={type} className="bg-white rounded-lg border p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[type]}`} />
            <span className="text-xs font-medium text-slate-500">{TYPE_LABELS[type]}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{todayCounts[type] ?? 0}</div>
          <div className="text-xs text-slate-400">heute · {weekCounts[type] ?? 0} /Woche</div>
        </div>
      ))}

      {/* Provenienz-Abdeckung */}
      <div className="bg-white rounded-lg border p-3 shadow-sm col-span-2">
        <span className="text-xs font-medium text-slate-500">Provenienz-Abdeckung</span>
        <div className="text-2xl font-bold text-slate-900 mt-1">{provenancePct}%</div>
        <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${provenancePct}%` }}
          />
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {provenanceCount.toLocaleString('de')} mit · {legacyCount.toLocaleString('de')} Legacy
        </div>
      </div>
    </div>
  );
}
