"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { User, Calendar, RotateCcw } from "lucide-react";

interface Props {
  owners: { id: string; name: string }[];
  selectedOwnerId: string;
  from: string;
  to: string;
  showBilled: boolean;
}

const PRESETS = [
  { label: "Dieser Monat",    key: "thisMonth" },
  { label: "Letzter Monat",   key: "lastMonth" },
  { label: "Dieses Quartal",  key: "thisQuarter" },
  { label: "Letztes Quartal", key: "lastQuarter" },
  { label: "Dieses Jahr",     key: "thisYear" },
  { label: "Alle",            key: "all" },
];

function getPresetDates(key: string): { from: string; to: string } {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  if (key === "thisMonth")   return { from: new Date(y, m, 1).toISOString().slice(0, 10), to: new Date(y, m + 1, 0).toISOString().slice(0, 10) };
  if (key === "lastMonth")   return { from: new Date(y, m - 1, 1).toISOString().slice(0, 10), to: new Date(y, m, 0).toISOString().slice(0, 10) };
  if (key === "thisQuarter") { const q = Math.floor(m / 3); return { from: new Date(y, q * 3, 1).toISOString().slice(0, 10), to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10) }; }
  if (key === "lastQuarter") { const q = Math.floor(m / 3) - 1; const qy = q < 0 ? y - 1 : y; const qq = q < 0 ? 3 : q; return { from: new Date(qy, qq * 3, 1).toISOString().slice(0, 10), to: new Date(qy, qq * 3 + 3, 0).toISOString().slice(0, 10) }; }
  if (key === "thisYear")    return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: "", to: "" };
}

function detectActivePreset(from: string, to: string): string | null {
  for (const p of PRESETS.filter(p => p.key !== "all")) {
    const { from: pf, to: pt } = getPresetDates(p.key);
    if (pf === from && pt === to) return p.key;
  }
  return !from && !to ? "all" : null;
}

export function KostenFilters({ owners, selectedOwnerId, from, to, showBilled }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const activePreset = detectActivePreset(from, to);
  const hasFilters = selectedOwnerId || from || to;

  return (
    <div className="flex flex-col gap-3">
      {/* Zeitraum */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 w-20 shrink-0">
          <Calendar className="w-3.5 h-3.5" /> Zeitraum
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setParams(getPresetDates(p.key))}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activePreset === p.key ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              {p.label}
            </button>
          ))}
          <span className="text-slate-300 text-xs mx-1">|</span>
          <input type="date" value={from} onChange={e => setParams({ from: e.target.value })}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50" />
          <span className="text-slate-400 text-xs">–</span>
          <input type="date" value={to} onChange={e => setParams({ to: e.target.value })}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50" />
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-500 w-20 shrink-0">Filter</span>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select value={selectedOwnerId} onChange={e => setParams({ owner: e.target.value })} className="text-xs text-slate-700 bg-transparent focus:outline-none">
            <option value="">Alle Waldbesitzer</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <button onClick={() => setParams({ showBilled: showBilled ? "" : "1" })}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showBilled ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"}`}>
          Abgerechnete einblenden
        </button>

        {hasFilters && (
          <button onClick={() => setParams({ owner: "", from: "", to: "" })}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors ml-auto">
            <RotateCcw className="w-3 h-3" /> Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
