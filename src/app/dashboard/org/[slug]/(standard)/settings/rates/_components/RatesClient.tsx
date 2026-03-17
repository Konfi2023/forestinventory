"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Euro } from "lucide-react";
import {
  createRateCategory,
  updateRateCategory,
  deleteRateCategory,
} from "@/actions/rate-categories";

type Category = {
  id: string;
  name: string;
  key: string | null;
  hourlyRate: number;
  color: string;
  sortOrder: number;
  isBuiltIn: boolean;
};

const COLOR_PRESETS = [
  "#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4",
  "#ef4444", "#f97316", "#ec4899", "#84cc16", "#64748b",
];

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-5 h-5 rounded-full border-2 transition-transform ${selected ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"}`}
      style={{ backgroundColor: color }}
    />
  );
}

function CategoryRow({
  cat,
  onSaved,
  onDeleted,
}: {
  cat: Category;
  onSaved: (updated: Category) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [rate, setRate] = useState(String(cat.hourlyRate));
  const [color, setColor] = useState(cat.color);
  const [isPending, startTransition] = useTransition();

  function cancel() {
    setName(cat.name);
    setRate(String(cat.hourlyRate));
    setColor(cat.color);
    setEditing(false);
  }

  function save() {
    const rateNum = parseFloat(rate.replace(",", "."));
    if (!name.trim() || isNaN(rateNum)) {
      toast.error("Bitte Name und gültigen Stundensatz angeben");
      return;
    }
    startTransition(async () => {
      try {
        await updateRateCategory(cat.id, { name: name.trim(), hourlyRate: rateNum, color });
        onSaved({ ...cat, name: name.trim(), hourlyRate: rateNum, color });
        setEditing(false);
        toast.success("Gespeichert");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    });
  }

  function remove() {
    if (!confirm(`Kategorie "${cat.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteRateCategory(cat.id);
        onDeleted(cat.id);
        toast.success("Gelöscht");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      {editing ? (
        <>
          {/* Color picker */}
          <div className="flex gap-1 flex-wrap w-36 shrink-0">
            {COLOR_PRESETS.map((c) => (
              <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
            ))}
          </div>
          {/* Name */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="Kategoriename"
            autoFocus
          />
          {/* Rate */}
          <div className="flex items-center gap-1 w-28 shrink-0">
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="0.00"
            />
            <span className="text-xs text-slate-400">€/h</span>
          </div>
          {/* Actions */}
          <button onClick={save} disabled={isPending} className="text-emerald-600 hover:text-emerald-700">
            <Check size={16} />
          </button>
          <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <span className="flex-1 text-sm font-medium text-slate-800">
            {cat.name}
            {cat.isBuiltIn && (
              <span className="ml-2 text-[10px] text-slate-400 font-normal uppercase tracking-wide">Standard</span>
            )}
          </span>
          <span className="text-sm font-mono text-slate-700 w-24 text-right">
            {cat.hourlyRate.toFixed(2)} €/h
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil size={14} />
          </button>
          {!cat.isBuiltIn && (
            <button
              onClick={remove}
              disabled={isPending}
              className="text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function AddRow({
  organizationId,
  onAdded,
}: {
  organizationId: string;
  onAdded: (cat: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [isPending, startTransition] = useTransition();

  function save() {
    const rateNum = parseFloat(rate.replace(",", "."));
    if (!name.trim() || isNaN(rateNum)) {
      toast.error("Bitte Name und gültigen Stundensatz angeben");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createRateCategory(organizationId, {
          name: name.trim(),
          hourlyRate: rateNum,
          color,
        });
        onAdded({
          id: created.id,
          name: created.name,
          key: created.key,
          hourlyRate: Number(created.hourlyRate),
          color: created.color ?? "#94a3b8",
          sortOrder: created.sortOrder,
          isBuiltIn: created.isBuiltIn,
        });
        setName("");
        setRate("");
        setColor("#94a3b8");
        setOpen(false);
        toast.success("Kategorie erstellt");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 px-4 py-3 w-full text-left transition-colors"
      >
        <Plus size={15} />
        Neue Kategorie hinzufügen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50">
      <div className="flex gap-1 flex-wrap w-36 shrink-0">
        {COLOR_PRESETS.map((c) => (
          <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
        placeholder="Kategoriename (z.B. Pflanzung)"
        autoFocus
      />
      <div className="flex items-center gap-1 w-28 shrink-0">
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="0.00"
        />
        <span className="text-xs text-slate-400">€/h</span>
      </div>
      <button onClick={save} disabled={isPending} className="text-emerald-600 hover:text-emerald-700">
        <Check size={16} />
      </button>
      <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
        <X size={16} />
      </button>
    </div>
  );
}

export function RatesClient({
  organizationId,
  initialCategories,
}: {
  organizationId: string;
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Stundensätze</h3>
        <p className="text-sm text-slate-500 mt-1">
          Lege Stundensätze pro Tätigkeitskategorie fest. Diese werden im Zeitcontrolling
          zur Kostenkalkulation verwendet. Du kannst auch eigene Kategorien erstellen.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="w-3 shrink-0" />
          <span className="flex-1 text-xs font-medium text-slate-500 uppercase tracking-wide">Kategorie</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-24 text-right">Stundensatz</span>
          <div className="w-8" />
        </div>

        {categories.map((cat) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            onSaved={(updated) =>
              setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
            }
            onDeleted={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
          />
        ))}

        <AddRow
          organizationId={organizationId}
          onAdded={(cat) => setCategories((prev) => [...prev, cat])}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <Euro size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          Die Stundensätze gelten als Standard für alle neuen Zeitbuchungen. Im Zeitcontrolling
          kannst du den Satz für einzelne Einträge punktuell überschreiben.
        </p>
      </div>
    </div>
  );
}
