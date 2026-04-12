'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DataFeedEntry } from '../page';

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  weather:      { label: 'Wetter',       className: 'bg-blue-100 text-blue-700' },
  sentinel1:    { label: 'Sentinel-1',   className: 'bg-emerald-100 text-emerald-700' },
  ndvi:         { label: 'NDVI',         className: 'bg-green-100 text-green-700' },
  polygon:      { label: 'Polygon',      className: 'bg-teal-100 text-teal-700' },
  'ai-tree':    { label: 'AI Baum',      className: 'bg-violet-100 text-violet-700' },
  'ai-biomass': { label: 'AI Biomasse',  className: 'bg-purple-100 text-purple-700' },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-300">—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
  return <span className={`font-mono text-sm ${color}`}>{pct}%</span>;
}

export function DataFeedTable({ entries }: { entries: DataFeedEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center text-slate-400">
        Keine Datenpunkte im gewählten Zeitraum.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Zeitpunkt</TableHead>
            <TableHead className="w-[110px]">Quelle</TableHead>
            <TableHead className="w-[160px]">Methode</TableHead>
            <TableHead className="w-[80px] text-center">Konfidenz</TableHead>
            <TableHead className="w-[160px]">Wald</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(entry => {
            const badge = TYPE_BADGE[entry.type] ?? { label: entry.type, className: 'bg-slate-100 text-slate-600' };
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-xs text-slate-500">
                  {formatTimestamp(entry.timestamp)}
                </TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-600">
                  {entry.method ?? <span className="text-slate-300">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  <ConfidenceBadge value={entry.confidence} />
                </TableCell>
                <TableCell className="text-sm text-slate-700 truncate max-w-[160px]">
                  {entry.forestName ?? <span className="text-slate-300">—</span>}
                </TableCell>
                <TableCell className="text-xs text-slate-500 truncate max-w-[300px]" title={entry.details}>
                  {entry.details}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
