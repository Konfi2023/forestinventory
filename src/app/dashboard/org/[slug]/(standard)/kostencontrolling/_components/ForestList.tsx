"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TreePine, ChevronRight, Clock, Euro } from "lucide-react";

type ForestSummary = {
  forestId: string;
  forestName: string;
  ownerName: string | null;
  ownerId: string | null;
  billableMinutes: number;
  billableAmount: number;
  billedMinutes: number;
  billedAmount: number;
};

interface Props {
  forests: ForestSummary[];
  selectedForestId: string | null;
  orgSlug: string;
}

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtH(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ForestList({ forests, selectedForestId, orgSlug }: Props) {
  const pathname = usePathname();
  const basePath = pathname.split("?")[0];

  const billable = forests.filter((f) => f.billableMinutes > 0);
  const billed   = forests.filter((f) => f.billableMinutes === 0 && f.billedMinutes > 0);

  function forestHref(forestId: string) {
    return selectedForestId === forestId ? basePath : `${basePath}?forest=${forestId}`;
  }

  function ForestRow({ f }: { f: ForestSummary }) {
    const isSelected = selectedForestId === f.forestId;
    const pct = f.billedMinutes + f.billableMinutes > 0
      ? Math.round((f.billedMinutes / (f.billedMinutes + f.billableMinutes)) * 100)
      : 0;

    return (
      <Link
        href={forestHref(f.forestId)}
        className={`block px-4 py-3.5 border-b border-slate-100 last:border-0 transition hover:bg-slate-50 ${
          isSelected ? "bg-green-50 border-l-4 border-l-green-600" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isSelected ? "bg-green-100" : "bg-slate-100"}`}>
            <TreePine size={14} className={isSelected ? "text-green-700" : "text-slate-400"} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-semibold truncate ${isSelected ? "text-green-900" : "text-slate-800"}`}>
                {f.forestName}
              </p>
              {f.billableMinutes > 0 && (
                <span className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {fmtEur(f.billableAmount)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {f.ownerName && (
                <span className="text-xs text-slate-400 truncate">{f.ownerName}</span>
              )}
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={10} />
                {fmtH(f.billableMinutes)} offen
              </span>
              {f.billedMinutes > 0 && (
                <span className="text-xs text-slate-400">{fmtH(f.billedMinutes)} abgr.</span>
              )}
            </div>
            {/* Progress bar */}
            {(f.billableMinutes > 0 || f.billedMinutes > 0) && (
              <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
          <ChevronRight size={14} className={`shrink-0 ${isSelected ? "text-green-600" : "text-slate-300"}`} />
        </div>
      </Link>
    );
  }

  if (forests.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-400">
        <TreePine size={28} className="mx-auto mb-3 text-slate-300" />
        Keine Wälder mit Zeiteinträgen gefunden.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Wälder</h3>
          <p className="text-xs text-slate-400 mt-0.5">Klicken zum Öffnen des Abrechnungsfensters</p>
        </div>
        {selectedForestId && (
          <Link
            href={basePath}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Auswahl aufheben
          </Link>
        )}
      </div>

      {billable.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
              <Clock size={10} /> Abrechenbare Stunden vorhanden
            </p>
          </div>
          {billable.map((f) => <ForestRow key={f.forestId} f={f} />)}
        </div>
      )}

      {billed.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 border-b">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Euro size={10} /> Bereits vollständig abgerechnet
            </p>
          </div>
          {billed.map((f) => <ForestRow key={f.forestId} f={f} />)}
        </div>
      )}
    </div>
  );
}
