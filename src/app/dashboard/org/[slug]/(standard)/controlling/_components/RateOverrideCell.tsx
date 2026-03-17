"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { updateTimeEntryRateOverride } from "@/actions/rate-categories";

interface Props {
  entryId: string;
  currentRate: number | null;
  hasOverride: boolean;
  cost: number | null;
}

export function RateOverrideCell({ entryId, currentRate, hasOverride, cost }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentRate !== null ? String(currentRate) : "");
  const [isPending, startTransition] = useTransition();

  function save() {
    const rate = parseFloat(value.replace(",", "."));
    if (isNaN(rate) || rate < 0) {
      toast.error("Ungültiger Stundensatz");
      return;
    }
    startTransition(async () => {
      try {
        await updateTimeEntryRateOverride(entryId, rate);
        setEditing(false);
        toast.success("Stundensatz überschrieben");
      } catch {
        toast.error("Fehler beim Speichern");
      }
    });
  }

  function reset() {
    startTransition(async () => {
      try {
        await updateTimeEntryRateOverride(entryId, null);
        setEditing(false);
        toast.success("Override zurückgesetzt");
      } catch {
        toast.error("Fehler");
      }
    });
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-16 text-[11px] border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
          placeholder="€/h"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button onClick={save} disabled={isPending} className="text-emerald-600 hover:text-emerald-700">
          <Check size={11} />
        </button>
        <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
          <X size={11} />
        </button>
        {hasOverride && (
          <button onClick={reset} disabled={isPending} className="text-amber-500 hover:text-amber-700" title="Auf Standardsatz zurücksetzen">
            <RotateCcw size={11} />
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {cost !== null && (
        <span className={hasOverride ? "text-amber-600 font-medium font-mono" : "font-mono"}>
          {cost.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          {hasOverride && <span className="ml-0.5 text-[9px]">*</span>}
        </span>
      )}
      <button
        onClick={() => {
          setValue(currentRate !== null ? String(currentRate) : "");
          setEditing(true);
        }}
        className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded px-1 py-0.5 transition-colors bg-white"
        title={`Stundensatz ändern (aktuell: ${currentRate ?? "–"} €/h)`}
      >
        <Pencil size={9} />
        {currentRate !== null ? `${currentRate} €/h` : "Satz"}
      </button>
    </span>
  );
}
