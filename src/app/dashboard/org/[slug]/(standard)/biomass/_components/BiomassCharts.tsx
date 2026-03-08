'use client';

import { useState, useMemo } from 'react';
import { ForestAiReport } from './ForestAiReport';
import {
  LineChart, Line, BarChart, Bar, Cell,
  ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  BarChart2, GitCommitHorizontal, Grid3X3, Activity, LineChart as LineChartIcon,
  Flame, Snowflake, Zap, Info, CloudRain, Thermometer, Radio, Wind,
} from 'lucide-react';
import {
  type Snapshot, type WeatherMonth,
  buildRaceData, buildDeltaData, buildHeatmapData, buildRollingData,
  buildKlimaData, computeInsights,
} from './computeInsights';

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

const YEAR_COLORS: Record<number, string> = {
  2023: '#94a3b8',
  2024: '#60a5fa',
  2025: '#34d399',
  2026: '#f59e0b',
  2027: '#f472b6',
};
function yearColor(yr: number) { return YEAR_COLORS[yr] ?? '#64748b'; }

type ChartType = 'compare' | 'race' | 'delta' | 'heatmap' | 'rolling' | 'klima' | 'sar';

const CHART_TABS: { id: ChartType; label: string; icon: React.ElementType; title: string }[] = [
  { id: 'compare', label: 'Jahresvergleich', icon: LineChartIcon,        title: 'Gleicher Monat, verschiedene Jahre' },
  { id: 'race',    label: 'Kumuliert',       icon: Activity,             title: '"The Race" — Wer führt aktuell?' },
  { id: 'delta',   label: 'Abweichung',      icon: BarChart2,            title: 'Abweichung zum Vorjahr / 3-Jahres-Mittel' },
  { id: 'heatmap', label: 'Heatmap',         icon: Grid3X3,              title: 'Musterverschiebungen erkennen' },
  { id: 'rolling', label: 'Trendlinie',      icon: GitCommitHorizontal,  title: 'Gleitender 12-Monats-Durchschnitt' },
  { id: 'klima',   label: 'Klima',           icon: CloudRain,            title: 'NDVI-Korrelation mit Temperatur & Niederschlag' },
  { id: 'sar',     label: 'SAR (S1)',        icon: Radio,                title: 'Sentinel-1 Radarrückstreuung — wolkenunabhängig' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StormEvent {
  date:       string;
  windMaxKmh: number;
  windDirDeg: number | null;
}

export interface S1Snapshot {
  date:       string;
  vhMeanDb:   number | null;
  vvMeanDb:   number | null;
  ratio:      number | null;
  changeDb:   number | null;
  baselineDb: number | null;
  isAnomaly:  boolean;
  sceneCount: number;
}

interface ForestData {
  id: string;
  name: string;
  color: string | null;
  snapshots: Snapshot[];
  weatherMonths: WeatherMonth[];
  s1Snapshots: S1Snapshot[];
  stormEvents: StormEvent[];
}

interface Props {
  forests: ForestData[];
  initialForestId?: string;
}

// ---------------------------------------------------------------------------
// Tooltip-Formatierung
// ---------------------------------------------------------------------------

function NdviTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1.5">
      <p className="font-semibold text-slate-600 mb-2">{label}</p>
      {payload.map((p: any) => p.value != null && (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">NDVI {Number(p.value).toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights Panel
// ---------------------------------------------------------------------------

function InsightsPanel({ snapshots }: { snapshots: Snapshot[] }) {
  const ins = useMemo(() => computeInsights(snapshots), [snapshots]);
  const currentYear = new Date().getFullYear();

  if (snapshots.filter(s => s.meanNdvi != null).length < 4) {
    return <p className="text-xs text-slate-400 italic">Zu wenig Datenpunkte für Insights.</p>;
  }

  return (
    <div className="space-y-4">
      {/* KPI-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* YoY Sommer */}
        <InsightCard
          label={`Sommer-NDVI ${currentYear} vs. ${currentYear-1}`}
          value={ins.currentYearSummer != null ? ins.currentYearSummer.toFixed(3) : '–'}
          badge={<GrowthBadge pct={ins.yoySummerGrowth} />}
          sub={ins.prevYearSummer != null ? `Vorjahr: ${ins.prevYearSummer.toFixed(3)}` : undefined}
          icon={ins.yoySummerGrowth != null && ins.yoySummerGrowth < -10 ? <AlertTriangle size={14} className="text-red-500" /> : undefined}
        />

        {/* CAGR */}
        <InsightCard
          label={`Ø jährl. Veränderung (${ins.cagrYears} J.)`}
          value={ins.cagrSummer != null ? `${ins.cagrSummer > 0 ? '+' : ''}${ins.cagrSummer}%` : '–'}
          sub="CAGR Sommer-NDVI"
          valueColor={ins.cagrSummer == null ? undefined : ins.cagrSummer > 0 ? 'text-emerald-600' : 'text-red-500'}
        />

        {/* Peak-Monat */}
        <InsightCard
          label="Stärkster Vegetationsmonat"
          value={ins.peakMonth}
          sub={(() => {
            const peak = ins.seasonality.find(s => s.isBest);
            return peak ? `Ø NDVI ${peak.avgNdvi.toFixed(3)} (+${peak.deviation.toFixed(0)}% über Mittel)` : undefined;
          })()}
          icon={<Flame size={14} className="text-orange-400" />}
        />

        {/* Prognose */}
        <InsightCard
          label={`Prognose Sommer ${currentYear}`}
          value={ins.forecastCurrentYear != null ? ins.forecastCurrentYear.toFixed(3) : '–'}
          sub={ins.regressionSlope != null
            ? `Trend: ${ins.regressionSlope > 0 ? '+' : ''}${(ins.regressionSlope * 1000).toFixed(1)} NDVI/Jahr (×10⁻³)`
            : 'Zu wenig Daten'}
          valueColor={ins.forecastCurrentYear == null ? undefined
            : ins.forecastCurrentYear > 0.5 ? 'text-emerald-600'
            : ins.forecastCurrentYear > 0.3 ? 'text-yellow-600'
            : 'text-red-500'}
        />
      </div>

      {/* Saisonalität */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Info size={12} /> Saisonalitäts-Profil — Abweichung vom Jahresmittel
        </h4>
        <div className="flex gap-0.5 items-end h-16">
          {ins.seasonality.map(s => {
            const barH = Math.abs(s.deviation);
            const isPos = s.deviation >= 0;
            return (
              <div key={s.month} className="flex-1 flex flex-col items-center gap-0.5">
                {isPos ? (
                  <>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${Math.min(barH * 1.2, 52)}px`,
                        backgroundColor: s.isBest ? '#10b981' : '#86efac',
                      }}
                      title={`${s.monthLabel}: ${s.deviation > 0 ? '+' : ''}${s.deviation.toFixed(1)}%`}
                    />
                    <div className="h-px w-full bg-slate-200" />
                  </>
                ) : (
                  <>
                    <div className="h-px w-full bg-slate-200" />
                    <div
                      className="w-full rounded-b transition-all"
                      style={{
                        height: `${Math.min(barH * 1.2, 52)}px`,
                        backgroundColor: s.isWorst ? '#ef4444' : '#fca5a5',
                      }}
                      title={`${s.monthLabel}: ${s.deviation.toFixed(1)}%`}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-0.5 mt-1">
          {ins.seasonality.map(s => (
            <div key={s.month} className="flex-1 text-center text-[9px] text-slate-400">{s.monthLabel}</div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Stärkster Monat: <strong className="text-emerald-600">{ins.peakMonth}</strong> &nbsp;·&nbsp;
          Schwächster Monat: <strong className="text-slate-500">{ins.troughMonth}</strong>
        </p>
      </div>

      {/* Anomalien */}
      {ins.anomalies.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap size={12} /> Ausreißer (Abweichung &gt;20% vom hist. Monatsmittel)
          </h4>
          <div className="space-y-1.5">
            {ins.anomalies.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className={cn(
                  'flex items-center gap-1 font-semibold',
                  a.deviationPct > 0 ? 'text-emerald-600' : 'text-red-500',
                )}>
                  {a.deviationPct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {a.deviationPct > 0 ? '+' : ''}{a.deviationPct}%
                </span>
                <span className="text-slate-600">
                  {a.monthLabel} {a.year}
                </span>
                <span className="text-slate-400">
                  NDVI {a.value.toFixed(3)} (Ø {a.historicalMean.toFixed(3)})
                </span>
                {a.isCritical && (
                  <span className="ml-auto text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">
                    kritisch
                  </span>
                )}
              </div>
            ))}
            {ins.anomalies.length > 5 && (
              <p className="text-[10px] text-slate-400">+{ins.anomalies.length - 5} weitere Ausreißer</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({ label, value, sub, badge, icon, valueColor }: {
  label: string; value: string; sub?: string; badge?: React.ReactNode; icon?: React.ReactNode; valueColor?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5 leading-tight">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className={cn('text-xl font-bold text-slate-800 leading-none', valueColor)}>{value}</p>
      </div>
      {badge && <div className="mt-1">{badge}</div>}
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</p>}
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[10px] text-slate-400 flex items-center gap-1"><Minus size={10} /> kein Vergleich</span>;
  if (Math.abs(pct) < 1) return <span className="text-[10px] text-slate-400 flex items-center gap-1"><Minus size={10} /> stabil</span>;
  if (pct > 0) return <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp size={10} /> +{pct}% ggü. Vorjahr</span>;
  return <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1"><TrendingDown size={10} /> {pct}% ggü. Vorjahr</span>;
}

// ---------------------------------------------------------------------------
// Heatmap (reine CSS-Tabelle)
// ---------------------------------------------------------------------------

function HeatmapChart({ snapshots }: { snapshots: Snapshot[] }) {
  const { cells, years, vmin, vmax } = useMemo(() => buildHeatmapData(snapshots), [snapshots]);

  function ndviToColor(norm: number | null): string {
    if (norm == null) return '#f8fafc';
    // rot (0.0) → gelb (0.4) → grün (0.7) → dunkelgrün (1.0)
    if (norm < 0.4) {
      const t = norm / 0.4;
      const r = Math.round(239 + (234 - 239) * t);
      const g = Math.round(68  + (179 -  68) * t);
      const b = Math.round(68  + (8   -  68) * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (norm - 0.4) / 0.6;
      const r = Math.round(234 + (6   - 234) * t);
      const g = Math.round(179 + (95  - 179) * t);
      const b = Math.round(8   + (70  -   8) * t);
      return `rgb(${r},${g},${b})`;
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-slate-400 font-medium pb-2 pr-3 w-14">Jahr</th>
            {MONTHS.map(m => (
              <th key={m} className="text-center text-slate-400 font-medium pb-2 px-1">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map(yr => (
            <tr key={yr}>
              <td className="text-slate-500 font-semibold pr-3 py-1">{yr}</td>
              {Array.from({ length: 12 }, (_, mi) => {
                const cell = cells.find(c => c.year === yr && c.month === mi);
                return (
                  <td key={mi} className="px-0.5 py-1">
                    <div
                      className="rounded text-center font-semibold transition-all cursor-default"
                      style={{
                        backgroundColor: ndviToColor(cell?.normalized ?? null),
                        color: (cell?.normalized ?? 0) > 0.5 ? 'white' : '#374151',
                        padding: '6px 2px',
                        fontSize: '10px',
                        minWidth: '36px',
                        opacity: cell?.value == null ? 0.3 : 1,
                      }}
                      title={cell?.value != null ? `${MONTHS[mi]} ${yr}: NDVI ${cell.value}` : 'Kein Wert'}
                    >
                      {cell?.value != null ? cell.value.toFixed(2) : '–'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legende */}
      <div className="flex items-center gap-3 mt-4">
        <span className="text-[10px] text-slate-400">NDVI-Skala:</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-3 rounded" style={{ background: 'linear-gradient(to right, #ef4444, #eab308, #16a34a)' }} />
        </div>
        <span className="text-[10px] text-slate-400">{vmin.toFixed(2)} (niedrig) → {vmax.toFixed(2)} (hoch)</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Klima-Chart — NDVI × Niederschlag (oben) + Temperatur (unten)
// ---------------------------------------------------------------------------

function KlimaChart({ snapshots, weatherMonths }: { snapshots: Snapshot[]; weatherMonths: WeatherMonth[] }) {
  const data = useMemo(() => buildKlimaData(snapshots, weatherMonths), [snapshots, weatherMonths]);
  const hasWeather = data.some(d => d.temp != null || d.precip != null);

  if (!hasWeather) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
        <CloudRain size={28} className="text-slate-200" />
        <p className="text-sm">Noch keine historischen Wetterdaten vorhanden.</p>
        <p className="text-xs text-slate-300">
          Cron ausführen: <code className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500">GET /api/cron/weather?days=365</code>
        </p>
      </div>
    );
  }

  const interval = Math.max(0, Math.floor(data.length / 14));

  // Legende: manuell kompakt
  const LegendItem = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
      <svg width="20" height="8">
        <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2"
          strokeDasharray={dashed ? '4 2' : undefined} />
      </svg>
      {label}
    </div>
  );

  return (
    <div className="space-y-1">
      {/* Legende */}
      <div className="flex flex-wrap gap-4 px-1 pb-1">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <div className="w-4 h-3 rounded bg-sky-200" />
          Niederschlag (mm, re. Achse)
        </div>
        <LegendItem color="#10b981" label="NDVI (li. Achse)" />
        <LegendItem color="#f97316" label="Temperatur °C (re. Achse)" />
        <LegendItem color="#ef4444" label="Hitzetage" dashed />
        <LegendItem color="#3b82f6" label="Frosttage" dashed />
      </div>

      {/* Oberes Panel: NDVI + Niederschlag */}
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 52, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            interval={interval}
          />
          {/* NDVI Achse links */}
          <YAxis
            yAxisId="ndvi"
            domain={[0, 1]}
            tick={{ fontSize: 10, fill: '#10b981' }}
            axisLine={false} tickLine={false}
            width={36}
            tickFormatter={v => v.toFixed(1)}
          />
          {/* Niederschlag Achse rechts */}
          <YAxis
            yAxisId="precip"
            orientation="right"
            tick={{ fontSize: 10, fill: '#3b82f6' }}
            axisLine={false} tickLine={false}
            width={44}
            tickFormatter={v => `${v}mm`}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={((val: any, name: string) => {
              if (name === 'ndvi')   return [val != null ? `NDVI ${Number(val).toFixed(3)}` : '–', 'NDVI'];
              if (name === 'precip') return [val != null ? `${val} mm` : '–', 'Niederschlag'];
              return [val, name];
            }) as any}
          />
          <Bar yAxisId="precip" dataKey="precip" name="precip"
            fill="#bfdbfe" opacity={0.85} radius={[2, 2, 0, 0]} maxBarSize={16} />
          <Line yAxisId="ndvi" type="monotone" dataKey="ndvi" name="ndvi"
            stroke="#10b981" strokeWidth={2.5}
            dot={{ r: 2.5, strokeWidth: 0, fill: '#10b981' }}
            connectNulls={false} />
          {/* Hitzetage als rote Referenzlinie-Marker */}
          {data.filter(d => d.heatDays > 0).map(d => (
            <ReferenceLine key={`heat-${d.label}`} yAxisId="ndvi"
              x={d.label} stroke="#fca5a5" strokeWidth={1} strokeDasharray="2 2" />
          ))}
          {/* Frosttage als blaue Referenzlinie-Marker */}
          {data.filter(d => d.frostDays > 2).map(d => (
            <ReferenceLine key={`frost-${d.label}`} yAxisId="ndvi"
              x={d.label} stroke="#bfdbfe" strokeWidth={1} strokeDasharray="2 2" />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Unteres Panel: Temperatur */}
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} margin={{ top: 0, right: 52, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            interval={interval}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#f97316' }}
            axisLine={false} tickLine={false}
            width={36}
            tickFormatter={v => `${v}°`}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={((val: any, name: string) => {
              if (name === 'temp')         return [val != null ? `${val} °C` : '–', 'Ø Temp.'];
              if (name === 'waterBalance') return [val != null ? `${val} mm` : '–', 'Wasserbilanz'];
              return [val, name];
            }) as any}
          />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 2" />
          <Area type="monotone" dataKey="waterBalance" name="waterBalance"
            fill="#eff6ff" stroke="#93c5fd" strokeWidth={1} fillOpacity={0.6}
            connectNulls={true} dot={false} />
          <Line type="monotone" dataKey="temp" name="temp"
            stroke="#f97316" strokeWidth={2}
            dot={{ r: 2, strokeWidth: 0, fill: '#f97316' }}
            connectNulls={true} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Bark-Beetle-Warnung */}
      {data.some(d => d.beetleDays >= 5) && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mt-2">
          <Zap size={13} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Borkenkäfer-Risiko:</strong>{' '}
            {data.filter(d => d.beetleDays >= 5).map(d => d.label).join(', ')} — über 5 Risikotage im Monat (≥16,5°C + trocken).
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SAR Chart — Sentinel-1 VH Rückstreuung + Anomalien
// ---------------------------------------------------------------------------

// Interpretiert einen VH-dB-Wert in forstwirtlich lesbare Kategorie
function vhToStatus(vhDb: number): { label: string; color: string; bg: string; border: string } {
  // Typische Waldwerte: gesunder Laubwald -10 bis -8 dB, Nadelwald -12 bis -9 dB
  if (vhDb >= -9)  return { label: 'Sehr hoch',  color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' };
  if (vhDb >= -12) return { label: 'Normal',     color: 'text-green-700',   bg: 'bg-green-50',    border: 'border-green-200'   };
  if (vhDb >= -15) return { label: 'Reduziert',  color: 'text-yellow-700',  bg: 'bg-yellow-50',   border: 'border-yellow-200'  };
  return               { label: 'Kritisch',   color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200'     };
}

// Windrichtung in Himmelsrichtung
function dirLabel(deg: number | null): string {
  if (deg == null) return '';
  const dirs = ['N','NO','O','SO','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function SarChart({ s1Snapshots, snapshots, stormEvents }: {
  s1Snapshots: S1Snapshot[];
  snapshots:   Snapshot[];
  stormEvents: StormEvent[];
}) {
  const valid = s1Snapshots.filter(s => s.vhMeanDb != null);

  if (valid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
        <Radio size={28} className="text-slate-200" />
        <p className="text-sm">Noch keine SAR-Daten vorhanden.</p>
        <p className="text-xs text-slate-300 text-center max-w-sm">
          Cron ausführen:<br />
          <code className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500">GET /api/cron/sentinel1</code>
          <br />
          <span className="text-[10px] text-slate-400">Authorization: Bearer &lt;CRON_SECRET&gt;</span>
        </p>
      </div>
    );
  }

  const latest = valid[valid.length - 1];
  const latestStatus = latest.vhMeanDb != null ? vhToStatus(latest.vhMeanDb) : null;
  const latestDate = new Date(latest.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const anomalies = valid.filter(s => s.isAnomaly);

  // Zeitreihen-Daten — X-Achse: "Jan 26", "Feb 26" etc.
  const chartData = valid.map(s => {
    const d = new Date(s.date);
    const ndviSnap = snapshots.find(n => {
      const nd = new Date(n.date);
      return nd.getFullYear() === d.getFullYear() && nd.getMonth() === d.getMonth();
    });
    // Sturmereignis innerhalb ±14 Tage vor dieser SAR-Aufnahme?
    const nearbyStorm = stormEvents.find(ev => {
      const diff = (d.getTime() - new Date(ev.date).getTime()) / 86400000;
      return diff >= 0 && diff <= 14;
    });
    return {
      label:       d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
      fullDate:    d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }),
      changeDb:    s.changeDb  != null ? Number(s.changeDb.toFixed(1))  : null,
      ndvi:        ndviSnap?.meanNdvi != null ? Number(ndviSnap.meanNdvi.toFixed(3)) : null,
      isAnomaly:   s.isAnomaly,
      statusLabel: s.vhMeanDb != null ? vhToStatus(s.vhMeanDb).label : '–',
      stormBefore: nearbyStorm ? `Sturm ${Math.round(nearbyStorm.windMaxKmh)} km/h aus ${dirLabel(nearbyStorm.windDirDeg)}` : null,
    };
  });

  const hasChange  = chartData.some(d => d.changeDb != null);
  const hasCombined = chartData.some(d => d.ndvi != null) && valid.length >= 2;
  const hasTimeSeries = valid.length >= 3;

  return (
    <div className="space-y-6">

      {/* ── 1. AKTUELLER STATUS (immer sichtbar) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Bestandsstatus */}
        <div className={cn('rounded-xl border p-4', latestStatus?.bg, latestStatus?.border)}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Bestandsstatus</p>
          <p className={cn('text-2xl font-bold', latestStatus?.color)}>{latestStatus?.label ?? '–'}</p>
          <p className="text-[10px] text-slate-400 mt-1">Letzte Aufnahme: {latestDate}</p>
        </div>

        {/* Radarrückstreuung */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Radarrückstreuung</p>
          <p className="text-2xl font-bold text-violet-700">{latest.vhMeanDb?.toFixed(1)} dB</p>
          <p className="text-[10px] text-slate-400 mt-1">Normal: −12 bis −8 dB (Wald)</p>
        </div>

        {/* Änderung zur Baseline */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Änderung zur Baseline</p>
          {latest.changeDb != null ? (
            <>
              <p className={cn('text-2xl font-bold', latest.changeDb < -3 ? 'text-red-600' : latest.changeDb < 0 ? 'text-yellow-600' : 'text-emerald-600')}>
                {latest.changeDb > 0 ? '+' : ''}{latest.changeDb.toFixed(1)} dB
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Alarm bei &gt; 3 dB Abweichung</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-1">Noch keine Baseline (min. 2 Aufnahmen)</p>
          )}
        </div>

        {/* Aufnahmen */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Aufnahmen gesamt</p>
          <p className="text-2xl font-bold text-slate-800">{valid.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {anomalies.length > 0
              ? <span className="text-red-600 font-semibold">{anomalies.length} Anomalie{anomalies.length > 1 ? 'n' : ''} erkannt</span>
              : 'Keine Anomalien'}
          </p>
        </div>
      </div>

      {/* ── 2. STURMEREIGNISSE ── */}
      {stormEvents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Zap size={12} /> {stormEvents.length} Sturmereignis{stormEvents.length > 1 ? 'se' : ''} im Zeitraum (≥ Bft 8, ≥ 62 km/h)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {stormEvents.slice(0, 6).map((s, i) => {
              const d = new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
              const bft = s.windMaxKmh >= 118 ? 'Bft 12' : s.windMaxKmh >= 103 ? 'Bft 11' : s.windMaxKmh >= 89 ? 'Bft 10' : s.windMaxKmh >= 75 ? 'Bft 9' : 'Bft 8';
              return (
                <div key={i} className="flex items-center gap-3 text-xs text-amber-900 bg-white/60 rounded-lg px-3 py-2">
                  <span className="font-semibold shrink-0">{d}</span>
                  <span className="font-bold text-amber-700">{Math.round(s.windMaxKmh)} km/h ({bft})</span>
                  {s.windDirDeg != null && (
                    <span className="text-amber-600 text-[10px]">aus {dirLabel(s.windDirDeg)}</span>
                  )}
                </div>
              );
            })}
          </div>
          {stormEvents.length > 6 && (
            <p className="text-[10px] text-amber-600">+{stormEvents.length - 6} weitere Sturmereignisse</p>
          )}
          <p className="text-[10px] text-amber-700 mt-1">
            Sturmschäden im Bestand zeigen sich typisch 1–2 Wochen später als SAR-Anomalie.
          </p>
        </div>
      )}

      {/* ── 2b. ANOMALIE-MELDUNGEN ── */}
      {anomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-red-700 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle size={12} /> {anomalies.length} Anomalie{anomalies.length > 1 ? 'n' : ''} erkannt — Bestandskontrolle empfohlen
          </h4>
          {anomalies.map((s, i) => {
            const d = new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
            const delta = s.changeDb;
            return (
              <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-red-800 bg-white/60 rounded-lg px-3 py-2">
                <span className="font-semibold">{d}</span>
                <span>
                  Abweichung: <strong>{delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} dB` : '–'}</strong>
                </span>
                <span className="text-red-500 text-[10px]">
                  {delta != null && delta < 0
                    ? 'Starker Rückgang — möglicher Bestandsverlust (Kahlschlag, Windwurf, Borkenkäfer)'
                    : 'Starker Anstieg — mögliche Bodennässe oder Schneebedeckung'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. ZEITREIHE: nur ab 3 Aufnahmen sinnvoll ── */}
      {hasTimeSeries && hasChange && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Bestandsveränderung im Zeitverlauf
          </h4>
          <p className="text-[10px] text-slate-400 mb-3">
            Balken zeigen die Abweichung vom Langzeitmittel — grün = stabiler Bestand, rot = Alarm
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 16, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8))}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                width={52}
                tickFormatter={v => `${v > 0 ? '+' : ''}${v} dB`}
              />
              <ReferenceLine y={3}  stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
              <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
              <ReferenceLine y={0}  stroke="#94a3b8" strokeWidth={1.5} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(val: any, _name: any, item: any) => {
                  const db = val != null ? `${Number(val) > 0 ? '+' : ''}${Number(val).toFixed(1)} dB` : '–';
                  const status = item?.payload?.statusLabel ?? '';
                  return [`${db} (${status})`, 'Abweichung vom Mittel'];
                }}
                labelFormatter={(label, payload) => {
                  const p = payload?.[0]?.payload;
                  const date = p?.fullDate ?? label;
                  const storm = p?.stormBefore ? ` · ⚡ ${p.stormBefore} vorher` : '';
                  return date + storm;
                }}
              />
              <Bar dataKey="changeDb" maxBarSize={32} radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={
                    d.changeDb == null ? '#e2e8f0' :
                    d.isAnomaly        ? '#ef4444' :
                    d.changeDb <= -3   ? '#f97316' :
                    d.changeDb < 0     ? '#fbbf24' : '#10b981'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-1 px-1">
            {[
              { color: '#10b981', label: 'Stabil / Zunahme' },
              { color: '#fbbf24', label: 'Leichter Rückgang (< 3 dB)' },
              { color: '#f97316', label: 'Deutlicher Rückgang (> 3 dB)' },
              { color: '#ef4444', label: 'Alarm — Bestandskontrolle' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
            {stormEvents.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Wind size={10} className="text-amber-500" />
                ⚡ im Tooltip = Sturm ≤ 14 Tage zuvor
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. S1+S2 KOMBINIERT (ab 2 Aufnahmen + NDVI vorhanden) ── */}
      {hasCombined && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Radar & Vegetationsindex im Vergleich
          </h4>
          <p className="text-[10px] text-slate-400 mb-3">
            Sinkt der SAR-Wert während der NDVI stabil bleibt, deutet das auf strukturelle Schäden im Bestand hin (Borkenkäfer-Frühindikator)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 52, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8))}
              />
              <YAxis
                yAxisId="change"
                tick={{ fontSize: 10, fill: '#7c3aed' }}
                axisLine={false} tickLine={false}
                width={52}
                tickFormatter={v => `${v > 0 ? '+' : ''}${v} dB`}
              />
              <YAxis
                yAxisId="ndvi"
                orientation="right"
                domain={[0, 1]}
                tick={{ fontSize: 10, fill: '#10b981' }}
                axisLine={false} tickLine={false}
                width={44}
                tickFormatter={v => `NDVI ${v.toFixed(1)}`}
              />
              <ReferenceLine yAxisId="change" y={0} stroke="#94a3b8" strokeWidth={1} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={((val: any, name: string) => {
                  if (name === 'changeDb') return [val != null ? `${Number(val) > 0 ? '+' : ''}${Number(val).toFixed(1)} dB` : '–', 'SAR-Abweichung vom Mittel'];
                  if (name === 'ndvi')     return [val != null ? `NDVI ${Number(val).toFixed(3)}` : '–', 'Vegetationsindex (Sentinel-2)'];
                  return [val, name];
                }) as any}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate ?? label}
              />
              <Bar yAxisId="change" dataKey="changeDb" maxBarSize={24} radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isAnomaly ? '#ef4444' : d.changeDb != null && d.changeDb < 0 ? '#f97316' : '#7c3aed'} opacity={0.7} />
                ))}
              </Bar>
              <Line yAxisId="ndvi" type="monotone" dataKey="ndvi" name="ndvi"
                stroke="#10b981" strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                connectNulls={true} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 px-1 mt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-violet-600 opacity-70" /> SAR-Abweichung (linke Achse)
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#10b981" strokeWidth="2.5" /></svg>
              Vegetationsindex NDVI (rechte Achse)
            </div>
          </div>
        </div>
      )}

      {/* ── 5. HINWEIS wenn noch zu wenig Daten für Zeitreihe ── */}
      {!hasTimeSeries && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 flex items-start gap-2">
          <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
          <span>
            Der Zeitreihenchart erscheint ab <strong>3 Radar-Aufnahmen</strong>. Aktuell: {valid.length} Aufnahme{valid.length !== 1 ? 'n' : ''}.
            Sentinel-1 überfliegt Mitteleuropa alle 6 Tage — nach wenigen Wochen ist die Zeitreihe aussagekräftig.
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forest Card — enthält Chart-Tabs + Insights
// ---------------------------------------------------------------------------

function ForestCard({ forest, autoSar }: { forest: ForestData; autoSar?: boolean }) {
  const [chartType, setChartType] = useState<ChartType>(autoSar ? 'sar' : 'compare');
  const [deltaMode, setDeltaMode] = useState<'prev_year' | 'avg3'>('prev_year');
  const [showInsights, setShowInsights] = useState(true);
  const currentYear = new Date().getFullYear();

  const valid = forest.snapshots.filter(s => s.meanNdvi != null);
  const years  = [...new Set(valid.map(s => new Date(s.date).getFullYear()))].sort();

  const hasData = valid.length > 0;
  const activeTab = CHART_TABS.find(t => t.id === chartType)!;

  // Daten für die aktiven Charts vorberechnen
  const compareData = useMemo(() => {
    const data = MONTHS.map((month, mi) => {
      const row: Record<string, any> = { month };
      years.forEach(yr => {
        const snap = valid.find(s => { const d = new Date(s.date); return d.getFullYear()===yr && d.getMonth()===mi; });
        row[String(yr)] = snap?.meanNdvi != null ? Number(snap.meanNdvi.toFixed(3)) : null;
      });
      return row;
    });
    return { data, years };
  }, [forest.snapshots]);

  const raceData    = useMemo(() => buildRaceData(forest.snapshots), [forest.snapshots]);
  const deltaData   = useMemo(() => buildDeltaData(forest.snapshots, currentYear, deltaMode), [forest.snapshots, deltaMode]);
  const rollingData = useMemo(() => buildRollingData(forest.snapshots), [forest.snapshots]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: forest.color ?? '#10b981' }} />
          <h3 className="font-bold text-slate-800 text-lg">{forest.name}</h3>
          <span className="text-xs text-slate-400">{valid.length} NDVI-Punkte · {years.length} Jahre</span>
          {forest.s1Snapshots.length > 0 && (
            <span className="text-xs text-violet-400 flex items-center gap-1">
              <Radio size={10} /> {forest.s1Snapshots.length} SAR
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInsights(v => !v)}
          className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
        >
          {showInsights ? 'Insights ausblenden' : 'Insights einblenden'}
        </button>
      </div>

      {!hasData ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          Kein Polygon eingezeichnet – keine Satellitendaten verfügbar.
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Chart-Typ Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl">
            {CHART_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setChartType(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    chartType === tab.id
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Chart-Beschreibung */}
          <p className="text-xs text-slate-400 -mt-2">{activeTab.title}</p>

          {/* Delta-Modus Switcher */}
          {chartType === 'delta' && (
            <div className="flex gap-2">
              {([['prev_year', `vs. ${currentYear - 1}`], ['avg3', 'vs. Ø 3 Jahre']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setDeltaMode(mode)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                    deltaMode === mode ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-200 hover:border-slate-400',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Charts ── */}

          {chartType === 'compare' && (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={compareData.data} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<NdviTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: yearColor(Number(v)) }}>Jahr {v}</span>} />
                <ReferenceLine y={0.5} stroke="#10b981" strokeDasharray="4 2" />
                <ReferenceLine y={0.2} stroke="#ef4444" strokeDasharray="4 2" />
                {compareData.years.map(yr => (
                  <Line key={yr} type="monotone" dataKey={String(yr)} name={String(yr)}
                    stroke={yearColor(yr)} strokeWidth={yr === currentYear ? 2.5 : 1.5}
                    dot={{ r: 3, strokeWidth: 0, fill: yearColor(yr) }}
                    connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === 'race' && (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={raceData.data} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<NdviTooltip />} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: yearColor(Number(v)) }}>Jahr {v}</span>} />
                  {raceData.years.map(yr => (
                    <Line key={yr} type="monotone" dataKey={String(yr)} name={String(yr)}
                      stroke={yearColor(yr)} strokeWidth={yr === currentYear ? 2.5 : 1.5}
                      dot={{ r: 3, strokeWidth: 0, fill: yearColor(yr) }}
                      connectNulls={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400">
                Kumulierter NDVI ab Januar — eine höhere Linie bedeutet mehr Gesamtbiomasse seit Jahresbeginn.
              </p>
            </>
          )}

          {chartType === 'delta' && (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deltaData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
                  <Tooltip
                    formatter={(val: any, _: any, props: any) => [
                      val != null ? `${Number(val) > 0 ? '+' : ''}${Number(val).toFixed(1)}%` : 'keine Daten',
                      deltaMode === 'prev_year' ? `Abw. zu ${currentYear-1}` : 'Abw. zu Ø 3J.',
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="deltaPct" radius={[4, 4, 0, 0]}>
                    {deltaData.map((entry, i) => (
                      <Cell key={i} fill={entry.deltaPct == null ? '#e2e8f0' : entry.deltaPct >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400">
                Grün = besser als {deltaMode === 'prev_year' ? `${currentYear-1}` : 'Ø der letzten 3 Jahre'} · Rot = schlechter
              </p>
            </>
          )}

          {chartType === 'heatmap' && <HeatmapChart snapshots={forest.snapshots} />}

          {chartType === 'klima' && (
            <KlimaChart snapshots={forest.snapshots} weatherMonths={forest.weatherMonths} />
          )}

          {chartType === 'sar' && (
            <SarChart s1Snapshots={forest.s1Snapshots} snapshots={forest.snapshots} />
          )}

          {chartType === 'rolling' && (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={rollingData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    interval={Math.floor(rollingData.length / 12)}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      val != null ? `NDVI ${Number(val).toFixed(3)}` : 'keine Daten',
                      name === 'value' ? 'Monatswert' : '12-Monats-Ø',
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v === 'value' ? 'Monatswert' : '12-Monats-Trend'}</span>} />
                  <Line type="monotone" dataKey="value" name="value"
                    stroke="#cbd5e1" strokeWidth={1} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="rolling12" name="rolling12"
                    stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls={true}
                    strokeDasharray={undefined} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400">
                Graue Linie: tatsächlicher Monatswert · Grüne Linie: geglätteter 12-Monats-Durchschnitt (Saisonalität herausgerechnet)
              </p>
            </>
          )}

          {/* KI-Analyse */}
          <ForestAiReport forestName={forest.name} forestId={forest.id} snapshots={forest.snapshots} />

          {/* Insights */}
          {showInsights && (
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Automatische Analyse</h4>
              <InsightsPanel snapshots={forest.snapshots} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Export
// ---------------------------------------------------------------------------

export function BiomassCharts({ forests, initialForestId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialForestId ?? null);
  const displayed = selectedId && forests.some(f => f.id === selectedId)
    ? forests.filter(f => f.id === selectedId)
    : forests;

  return (
    <div className="space-y-6">
      {forests.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterBtn active={selectedId === null} onClick={() => setSelectedId(null)} label="Alle Wälder" />
          {forests.map(f => (
            <FilterBtn key={f.id} active={selectedId === f.id} onClick={() => setSelectedId(f.id)}
              label={f.name} color={f.color ?? '#10b981'} />
          ))}
        </div>
      )}
      <div className="space-y-8">
        {displayed.map(f => (
          <ForestCard key={f.id} forest={f} autoSar={!!initialForestId && f.id === initialForestId} />
        ))}
      </div>

    </div>
  );
}

function FilterBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
      )}
    >
      {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}
