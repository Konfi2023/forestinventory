'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const SOURCE_OPTIONS = [
  { value: '', label: 'Alle Quellen' },
  { value: 'weather', label: 'Wetter' },
  { value: 'sentinel1', label: 'Sentinel-1' },
  { value: 'ndvi', label: 'NDVI' },
  { value: 'polygon', label: 'Polygon-Tracking' },
  { value: 'ai-tree', label: 'AI Baum/Krone' },
  { value: 'ai-biomass', label: 'AI Biomasse' },
];

const DAYS_OPTIONS = [
  { value: '1', label: 'Heute' },
  { value: '7', label: 'Letzte 7 Tage' },
  { value: '30', label: 'Letzte 30 Tage' },
  { value: '90', label: 'Letzte 90 Tage' },
];

interface Props {
  forests: { id: string; name: string }[];
  currentSource?: string;
  currentForestId?: string;
  currentDays: number;
}

export function DataMonitorFilter({ forests, currentSource, currentForestId, currentDays }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/data-monitor?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border p-3 shadow-sm">
      <select
        className="text-sm border rounded-md px-3 py-1.5 bg-white text-slate-700"
        value={currentSource ?? ''}
        onChange={e => updateParam('source', e.target.value)}
      >
        {SOURCE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        className="text-sm border rounded-md px-3 py-1.5 bg-white text-slate-700"
        value={currentForestId ?? ''}
        onChange={e => updateParam('forestId', e.target.value)}
      >
        <option value="">Alle Wälder</option>
        {forests.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      <select
        className="text-sm border rounded-md px-3 py-1.5 bg-white text-slate-700"
        value={String(currentDays)}
        onChange={e => updateParam('days', e.target.value)}
      >
        {DAYS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
