'use client';

import { useState, useMemo } from 'react';
import {
  Radio, Sprout, AlertTriangle, TrendingDown, TrendingUp, Minus,
  ChevronDown, ChevronUp, Trees,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface PolygonMeta {
  id: string;
  label: string;
  areaHa?: number | null;
  forestId: string;
  forestName: string;
}

interface PolygonSnap {
  polygonId: string;
  polygonType: string;
  date: string;
  vhMeanDb?: number | null;
  changeDb?: number | null;
  baselineDb?: number | null;
  isAnomaly: boolean;
  sceneCount: number;
}

interface Props {
  plantings: PolygonMeta[];
  calamities: PolygonMeta[];
  snapshots: PolygonSnap[];
}

function formatArea(ha?: number | null) {
  if (!ha) return null;
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

// ─── Single polygon card ─────────────────────────────────────────────────────

function PolygonCard({
  meta, type, snaps,
}: {
  meta: PolygonMeta;
  type: 'PLANTING' | 'CALAMITY';
  snaps: PolygonSnap[];
}) {
  const [open, setOpen] = useState(false);
  const color = type === 'PLANTING' ? '#22c55e' : '#f97316';

  const latest = snaps[snaps.length - 1];
  const anomalyCount = snaps.filter(s => s.isAnomaly).length;

  const chartData = snaps.map(s => ({
    date: new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    vhDb:     s.vhMeanDb  != null ? Number(s.vhMeanDb.toFixed(2))  : null,
    baseline: s.baselineDb != null ? Number(s.baselineDb.toFixed(2)) : null,
    anomaly:  s.isAnomaly,
  }));

  const trendIcon = !latest?.changeDb
    ? <Minus size={12} className="text-slate-400" />
    : latest.changeDb < -1
      ? <TrendingDown size={12} className="text-red-400" />
      : latest.changeDb > 1
        ? <TrendingUp size={12} className="text-emerald-400" />
        : <Minus size={12} className="text-slate-400" />;

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {type === 'PLANTING'
            ? <Sprout size={13} className="text-emerald-500 shrink-0" />
            : <AlertTriangle size={13} className="text-orange-500 shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{meta.label}</p>
            {formatArea(meta.areaHa) && (
              <p className="text-[10px] text-slate-400">{formatArea(meta.areaHa)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {anomalyCount > 0 && (
            <span className="text-[10px] bg-red-100 text-red-600 font-medium px-1.5 py-0.5 rounded-full">
              {anomalyCount}×
            </span>
          )}
          {latest?.vhMeanDb != null ? (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              {trendIcon}
              <span className="font-mono text-[11px]">{latest.vhMeanDb.toFixed(1)} dB</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-300 italic">keine Daten</span>
          )}
          {open
            ? <ChevronUp size={12} className="text-slate-300" />
            : <ChevronDown size={12} className="text-slate-300" />
          }
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="px-3 pb-3 border-t border-slate-100 bg-slate-50/50">
          {snaps.length === 0 ? (
            <p className="text-xs text-slate-400 italic pt-3">
              Noch keine SAR-Daten — wird beim nächsten Cron-Lauf gefetcht.
            </p>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 font-medium mt-3 mb-1.5 uppercase tracking-wide">
                VH-Rückstreuung (dB) + Baseline
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v: any, name: string | undefined) => [
                      v != null ? `${Number(v).toFixed(2)} dB` : '—',
                      name === 'vhDb' ? 'VH' : 'Baseline',
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Line
                    type="monotone" dataKey="baseline" stroke="#94a3b8"
                    strokeDasharray="4 2" dot={false} strokeWidth={1.5} name="baseline"
                  />
                  <Line
                    type="monotone" dataKey="vhDb" stroke={color} strokeWidth={2} name="vhDb"
                    dot={(props: any) =>
                      props.payload.anomaly
                        ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#ef4444" stroke="white" strokeWidth={1.5} />
                        : <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={color} stroke="white" strokeWidth={1} />
                    }
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                {[
                  { label: 'Aufnahmen', value: snaps.length, highlight: false },
                  { label: 'Anomalien', value: anomalyCount, highlight: anomalyCount > 0 },
                  {
                    label: 'Letzter VH',
                    value: latest?.vhMeanDb != null ? `${latest.vhMeanDb.toFixed(1)} dB` : '—',
                    highlight: false,
                  },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded p-1.5 border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">{item.label}</p>
                    <p className={`text-xs font-bold font-mono ${item.highlight ? 'text-red-500' : 'text-slate-700'}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Forest group ─────────────────────────────────────────────────────────────

function ForestGroup({
  forestName, forestColor, plantings, calamities, snapsByPolygon,
}: {
  forestName: string;
  forestColor?: string;
  plantings: PolygonMeta[];
  calamities: PolygonMeta[];
  snapsByPolygon: Map<string, PolygonSnap[]>;
}) {
  const [open, setOpen] = useState(true);

  const totalAnomalies = [...plantings, ...calamities]
    .flatMap(p => snapsByPolygon.get(p.id) ?? [])
    .filter(s => s.isAnomaly).length;

  const totalPolygons = plantings.length + calamities.length;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Forest header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
            style={{ backgroundColor: forestColor ?? '#10b981' }}
          />
          <Trees size={15} className="text-slate-500 shrink-0" />
          <span className="font-semibold text-sm text-slate-800">{forestName}</span>
          <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
            {totalPolygons} Fläche{totalPolygons !== 1 ? 'n' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {totalAnomalies > 0 && (
            <span className="text-[10px] bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
              {totalAnomalies} Anomalie{totalAnomalies !== 1 ? 'n' : ''}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Polygon cards */}
      {open && (
        <div className="px-3 py-2 space-y-1.5 bg-white">
          {plantings.map(p => (
            <PolygonCard
              key={p.id} meta={p} type="PLANTING"
              snaps={snapsByPolygon.get(p.id) ?? []}
            />
          ))}
          {calamities.map(c => (
            <PolygonCard
              key={c.id} meta={c} type="CALAMITY"
              snaps={snapsByPolygon.get(c.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PolygonBiomassSection({ plantings, calamities, snapshots }: Props) {
  const snapsByPolygon = useMemo(() => {
    const map = new Map<string, PolygonSnap[]>();
    for (const s of snapshots) {
      if (!map.has(s.polygonId)) map.set(s.polygonId, []);
      map.get(s.polygonId)!.push(s);
    }
    return map;
  }, [snapshots]);

  // Group by forestId, preserving insertion order (forests already sorted by name from page)
  const forestGroups = useMemo(() => {
    const groups = new Map<string, { name: string; plantings: PolygonMeta[]; calamities: PolygonMeta[] }>();

    for (const p of plantings) {
      if (!groups.has(p.forestId)) groups.set(p.forestId, { name: p.forestName, plantings: [], calamities: [] });
      groups.get(p.forestId)!.plantings.push(p);
    }
    for (const c of calamities) {
      if (!groups.has(c.forestId)) groups.set(c.forestId, { name: c.forestName, plantings: [], calamities: [] });
      groups.get(c.forestId)!.calamities.push(c);
    }

    return [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'de'));
  }, [plantings, calamities]);

  const totalAnomalies = snapshots.filter(s => s.isAnomaly).length;
  const totalTracked = plantings.length + calamities.length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Radio size={18} className="text-emerald-600" />
            Polygon SAR-Monitoring
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Sentinel-1 Zeitreihen für {totalTracked} getrackte{totalTracked !== 1 ? '' : 'n'} Fläche{totalTracked !== 1 ? 'n' : ''} in {forestGroups.length} Wald/Wäldern
          </p>
        </div>
        {totalAnomalies > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">
            {totalAnomalies} Anomalie{totalAnomalies !== 1 ? 'n' : ''} gesamt
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Sprout size={12} className="text-emerald-500" />
          <span>Pflanzfläche</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-orange-500" />
          <span>Kalamitätsfläche</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-red-400 rounded" />
          <span>Anomalie-Punkt</span>
        </div>
      </div>

      {/* Per-forest groups */}
      <div className="space-y-3">
        {forestGroups.map(([forestId, group]) => (
          <ForestGroup
            key={forestId}
            forestName={group.name}
            plantings={group.plantings}
            calamities={group.calamities}
            snapsByPolygon={snapsByPolygon}
          />
        ))}
      </div>
    </div>
  );
}
