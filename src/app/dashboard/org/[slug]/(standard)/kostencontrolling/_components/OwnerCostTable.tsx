"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trees } from "lucide-react";

type EntryRow = {
  id: string;
  durationMinutes: number | null;
  startTime: Date;
  category: string;
  cost: number;
  billed: boolean;
  userName: string;
};

type ForestRow = {
  forestId: string;
  forestName: string;
  entries: EntryRow[];
};

export type OwnerRow = {
  ownerId: string;
  ownerName: string;
  forests: ForestRow[];
  totalMinutes: number;
  totalCost: number;
  unbilledMinutes: number;
  unbilledCost: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  MANUAL_WORK: "Handarbeit", MACHINE_WORK: "Maschine",
  PLANNING: "Planung", TRAVEL: "Anfahrt", INSPECTION: "Begehung",
};

function fmtH(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function OwnerCostTable({ ownerRows }: { ownerRows: OwnerRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (ownerRows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
        Keine Zeiteinträge im gewählten Zeitraum
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Trees size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-800 text-sm">Kosten nach Waldbesitzer</h3>
      </div>

      {/* Spaltenköpfe */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
        <span>Waldbesitzer</span>
        <span className="text-right">Stunden</span>
        <span className="text-right">Nicht abgr.</span>
        <span className="text-right">Gesamt</span>
      </div>

      <div className="divide-y divide-slate-50">
        {ownerRows.map(row => {
          const isOpen = expanded.has(row.ownerId);
          return (
            <div key={row.ownerId}>
              {/* Owner row */}
              <button
                onClick={() => toggle(row.ownerId)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 hover:bg-slate-50 transition text-left items-center"
              >
                <span className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                  <span className="font-medium text-slate-800 text-sm">{row.ownerName}</span>
                  <span className="text-xs text-slate-400">{row.forests.length} Wald{row.forests.length !== 1 ? "·ungen" : ""}</span>
                </span>
                <span className="text-sm text-slate-600 text-right font-mono">{fmtH(row.totalMinutes)}</span>
                <span className={`text-sm font-medium text-right font-mono ${row.unbilledCost > 0 ? "text-amber-700" : "text-slate-400"}`}>
                  {fmtEur(row.unbilledCost)}
                </span>
                <span className="text-sm text-slate-700 text-right font-mono">{fmtEur(row.totalCost)}</span>
              </button>

              {/* Expanded: forests */}
              {isOpen && (
                <div className="bg-slate-50 border-t border-slate-100">
                  {row.forests.map(forest => (
                    <div key={forest.forestId} className="px-8 py-2 border-b border-slate-100 last:border-0">
                      <p className="text-xs font-medium text-slate-600 mb-1.5">{forest.forestName}</p>
                      <div className="space-y-0.5">
                        {forest.entries.map(e => (
                          <div key={e.id} className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="w-16 shrink-0">
                              {new Date(e.startTime).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                            </span>
                            <span className="font-mono w-12 text-right">{fmtH(e.durationMinutes ?? 0)}</span>
                            <span className="text-slate-400">{CATEGORY_LABELS[e.category] ?? e.category}</span>
                            <span className="text-slate-400">{e.userName}</span>
                            <span className="font-mono ml-auto">{fmtEur(e.cost)}</span>
                            {e.billed && (
                              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium">abgr.</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
