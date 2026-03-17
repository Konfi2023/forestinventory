"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

type CategoryRow = { name: string; minutes: number };
type ForestRow   = { name: string; minutes: number };
type MonthRow    = { month: string; stunden: number };

interface Props {
  categoryData: CategoryRow[];
  forestData:   ForestRow[];
  monthlyData:  MonthRow[];
}

const COLORS = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ef4444", "#f97316", "#ec4899"];

function fmtH(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4 border-b border-slate-100">
      <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Donut: Zeitaufwand nach Kategorie ────────────────────────────────────────
function CategoryDonut({ data }: { data: CategoryRow[] }) {
  if (data.length === 0) return <EmptyState />;

  const total = data.reduce((s, d) => s + d.minutes, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: CategoryRow }[] }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
        <p className="font-medium text-slate-800">{d.name}</p>
        <p className="text-slate-500">{fmtH(d.minutes)} · {total > 0 ? Math.round(d.minutes / total * 100) : 0}%</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="minutes"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Balken: Zeit nach Wald ────────────────────────────────────────────────────
function ForestBars({ data }: { data: ForestRow[] }) {
  if (data.length === 0) return <EmptyState />;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.[0]) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
        <p className="font-medium text-slate-800 mb-1">{label}</p>
        <p className="text-slate-500">{fmtH(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          tickFormatter={(v) => `${Math.round(v / 60)}h`}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + "…" : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="minutes" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Area: Monatlicher Verlauf ────────────────────────────────────────────────
function MonthlyTrend({ data }: { data: MonthRow[] }) {
  const hasData = data.some(d => d.stunden > 0);
  if (!hasData) return <EmptyState />;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs space-y-1">
        <p className="font-medium text-slate-800">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-slate-500">
            {p.name === "stunden" ? `${p.value} h` : `${p.value.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="colorStunden" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="stunden" stroke="#22c55e" strokeWidth={2} fill="url(#colorStunden)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
      Keine Daten im gewählten Zeitraum
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export function ControllingCharts({ categoryData, forestData, monthlyData }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Donut */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <CardHeader title="Zeitaufwand nach Kategorie" subtitle="Anteil der Tätigkeiten" />
        <div className="p-4">
          <CategoryDonut data={categoryData} />
        </div>
      </div>

      {/* Balken */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <CardHeader title="Zeitaufwand nach Wald" subtitle="Top 10 · Stunden gebucht" />
        <div className="p-4">
          <ForestBars data={forestData} />
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <CardHeader title="Monatlicher Verlauf" subtitle="Stunden & Kosten · letzte 12 Monate" />
        <div className="p-4">
          <MonthlyTrend data={monthlyData} />
        </div>
      </div>

    </div>
  );
}
