"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Star, StarOff, Pencil, Check, X } from "lucide-react";
import { createVatRate, updateVatRate, deleteVatRate } from "@/actions/vat-rates";
import { toast } from "sonner";

type VatRate = {
  id: string;
  countryCode: string;
  countryName: string;
  rate: number;
  label: string;
  isDefault: boolean;
  isActive: boolean;
};

const COUNTRIES = [
  { code: "DE", name: "Deutschland" },
  { code: "AT", name: "Österreich" },
  { code: "CH", name: "Schweiz" },
  { code: "FR", name: "Frankreich" },
  { code: "PL", name: "Polen" },
  { code: "CZ", name: "Tschechien" },
];

function fmtRate(rate: number) {
  return rate.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " %";
}

interface Props {
  orgSlug: string;
  initialRates: VatRate[];
}

type EditState = {
  id: string;
  countryCode: string;
  countryName: string;
  rate: string;
  label: string;
  isDefault: boolean;
  isActive: boolean;
};

type NewState = {
  countryCode: string;
  rate: string;
  label: string;
  isDefault: boolean;
};

export function VatRatesClient({ orgSlug, initialRates }: Props) {
  const [rates, setRates] = useState<VatRate[]>(initialRates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRate, setNewRate] = useState<NewState>({
    countryCode: "DE",
    rate: "",
    label: "",
    isDefault: false,
  });
  const [isPending, startTransition] = useTransition();

  // Group by country
  const byCountry = rates.reduce<Record<string, VatRate[]>>((acc, r) => {
    if (!acc[r.countryCode]) acc[r.countryCode] = [];
    acc[r.countryCode].push(r);
    return acc;
  }, {});

  function startEdit(r: VatRate) {
    setEditingId(r.id);
    setEditState({
      id: r.id,
      countryCode: r.countryCode,
      countryName: r.countryName,
      rate: String(r.rate),
      label: r.label,
      isDefault: r.isDefault,
      isActive: r.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function handleSaveEdit() {
    if (!editState) return;
    const rateNum = parseFloat(editState.rate.replace(",", "."));
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error("Ungültiger Steuersatz");
      return;
    }
    startTransition(async () => {
      try {
        await updateVatRate(orgSlug, editState.id, {
          rate: rateNum,
          label: editState.label,
          isDefault: editState.isDefault,
          isActive: editState.isActive,
        });
        setRates((prev) =>
          prev.map((r) => {
            if (r.id === editState.id) {
              return { ...r, rate: rateNum, label: editState.label, isDefault: editState.isDefault, isActive: editState.isActive };
            }
            // Unset default for same country if this one became default
            if (editState.isDefault && r.countryCode === editState.countryCode && r.id !== editState.id) {
              return { ...r, isDefault: false };
            }
            return r;
          })
        );
        setEditingId(null);
        setEditState(null);
        toast.success("Gespeichert");
      } catch {
        toast.error("Fehler beim Speichern");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteVatRate(orgSlug, id);
        setRates((prev) => prev.filter((r) => r.id !== id));
        toast.success("Gelöscht");
      } catch {
        toast.error("Fehler beim Löschen");
      }
    });
  }

  function handleToggleDefault(r: VatRate) {
    startTransition(async () => {
      try {
        await updateVatRate(orgSlug, r.id, { isDefault: !r.isDefault });
        setRates((prev) =>
          prev.map((x) => {
            if (x.id === r.id) return { ...x, isDefault: !r.isDefault };
            if (!r.isDefault && x.countryCode === r.countryCode && x.id !== r.id) return { ...x, isDefault: false };
            return x;
          })
        );
      } catch {
        toast.error("Fehler");
      }
    });
  }

  function handleAdd() {
    const rateNum = parseFloat(newRate.rate.replace(",", "."));
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error("Ungültiger Steuersatz");
      return;
    }
    if (!newRate.label.trim()) {
      toast.error("Bezeichnung fehlt");
      return;
    }
    const country = COUNTRIES.find((c) => c.code === newRate.countryCode);
    startTransition(async () => {
      try {
        await createVatRate(orgSlug, {
          countryCode: newRate.countryCode,
          countryName: country?.name ?? newRate.countryCode,
          rate: rateNum,
          label: newRate.label.trim(),
          isDefault: newRate.isDefault,
        });
        // Reload via re-render — optimistic update with temp id
        const tempId = crypto.randomUUID();
        setRates((prev) => [
          ...prev.map((r) =>
            newRate.isDefault && r.countryCode === newRate.countryCode
              ? { ...r, isDefault: false }
              : r
          ),
          {
            id: tempId,
            countryCode: newRate.countryCode,
            countryName: country?.name ?? newRate.countryCode,
            rate: rateNum,
            label: newRate.label.trim(),
            isDefault: newRate.isDefault,
            isActive: true,
          },
        ]);
        setShowAdd(false);
        setNewRate({ countryCode: "DE", rate: "", label: "", isDefault: false });
        toast.success("Hinzugefügt");
      } catch {
        toast.error("Fehler beim Hinzufügen");
      }
    });
  }

  const countryKeys = Object.keys(byCountry).sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">MwSt.-Sätze</h2>
        <p className="text-sm text-slate-500 mt-1">
          Konfigurieren Sie die Mehrwertsteuersätze nach Land. Der als Standard markierte Satz wird bei neuen Rechnungen vorausgewählt.
        </p>
      </div>

      {/* Per-country groups */}
      <div className="space-y-4">
        {countryKeys.map((cc) => {
          const group = byCountry[cc];
          return (
            <div key={cc} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">
                  {group[0].countryName} <span className="text-slate-400 font-normal ml-1">({cc})</span>
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {group.map((r) =>
                  editingId === r.id && editState ? (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 bg-blue-50">
                      <input
                        className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                        value={editState.rate}
                        onChange={(e) => setEditState({ ...editState, rate: e.target.value })}
                        placeholder="19"
                      />
                      <span className="text-sm text-slate-500">%</span>
                      <input
                        className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                        value={editState.label}
                        onChange={(e) => setEditState({ ...editState, label: e.target.value })}
                        placeholder="Bezeichnung"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editState.isDefault}
                          onChange={(e) => setEditState({ ...editState, isDefault: e.target.checked })}
                        />
                        Standard
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editState.isActive}
                          onChange={(e) => setEditState({ ...editState, isActive: e.target.checked })}
                        />
                        Aktiv
                      </label>
                      <button onClick={handleSaveEdit} disabled={isPending} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition">
                        <Check size={15} />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 group">
                      <div className="w-16 text-sm font-semibold text-slate-800 tabular-nums">
                        {fmtRate(r.rate)}
                      </div>
                      <div className="flex-1 text-sm text-slate-600">{r.label}</div>
                      <div className="flex items-center gap-2">
                        {r.isDefault && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Standard
                          </span>
                        )}
                        {!r.isActive && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Inaktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleToggleDefault(r)}
                          disabled={isPending}
                          title={r.isDefault ? "Als Standard entfernen" : "Als Standard setzen"}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                        >
                          {r.isDefault ? <StarOff size={14} /> : <Star size={14} />}
                        </button>
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={isPending}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new */}
      {showAdd ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Neuer MwSt.-Satz</p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
              value={newRate.countryCode}
              onChange={(e) => setNewRate({ ...newRate, countryCode: e.target.value })}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                value={newRate.rate}
                onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                placeholder="19"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
            <input
              className="flex-1 min-w-48 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
              value={newRate.label}
              onChange={(e) => setNewRate({ ...newRate, label: e.target.value })}
              placeholder="z.B. Normalsatz (19 %)"
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newRate.isDefault}
                onChange={(e) => setNewRate({ ...newRate, isDefault: e.target.checked })}
              />
              Standard für dieses Land
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewRate({ countryCode: "DE", rate: "", label: "", isDefault: false }); }}
              className="px-3 py-1.5 text-slate-500 text-sm rounded-lg hover:bg-slate-100 transition"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
        >
          <Plus size={16} /> Neuen Satz hinzufügen
        </button>
      )}
    </div>
  );
}
