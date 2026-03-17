"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { updateTaskTimeEntriesRate } from "@/actions/rate-categories";

interface Props {
  taskId: string;
  cost: number;
  hasOverride: boolean;
}

export function TaskCostCell({ taskId, cost, hasOverride }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    const rate = parseFloat(value.replace(",", "."));
    if (isNaN(rate) || rate < 0) {
      toast.error("Ungültiger Stundensatz");
      return;
    }
    startTransition(async () => {
      try {
        await updateTaskTimeEntriesRate(taskId, rate);
        setEditing(false);
        toast.success("Stundensatz aktualisiert");
      } catch {
        toast.error("Fehler beim Speichern");
      }
    });
  }

  function reset() {
    startTransition(async () => {
      try {
        await updateTaskTimeEntriesRate(taskId, null);
        setEditing(false);
        toast.success("Stundensatz zurückgesetzt");
      } catch {
        toast.error("Fehler");
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 text-xs border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
          placeholder="€/h"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button onClick={save} disabled={isPending} className="text-emerald-600 hover:text-emerald-700">
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
        {hasOverride && (
          <button onClick={reset} disabled={isPending} title="Auf Standardsatz zurücksetzen" className="text-amber-500 hover:text-amber-700">
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className={`font-mono ${hasOverride ? "text-amber-600" : "text-slate-700"}`}>
        {cost > 0
          ? cost.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
          : <span className="text-slate-300 font-sans">—</span>}
        {hasOverride && <span className="ml-0.5 text-[10px]">*</span>}
      </span>
      <button
        onClick={() => { setValue(""); setEditing(true); }}
        className="text-slate-400 hover:text-slate-700 transition-colors"
        title="Stundensatz für diese Aufgabe überschreiben"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
