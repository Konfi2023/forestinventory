"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updatePlanLimits } from "@/actions/admin-plans";
import { Pencil, Check, X, Loader2 } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  maxHectares: number | null;
  maxUsers: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  orgCount: number;
};

export function PlanLimitsEditor({ plan }: { plan: Plan }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [maxHectares, setMaxHectares] = useState(
    plan.maxHectares !== null ? String(plan.maxHectares) : ""
  );
  const [maxUsers, setMaxUsers] = useState(
    plan.maxUsers !== null ? String(plan.maxUsers) : ""
  );

  async function handleSave() {
    setLoading(true);
    try {
      const ha = maxHectares === "" ? null : parseFloat(maxHectares);
      const users = maxUsers === "" ? null : parseInt(maxUsers, 10);
      await updatePlanLimits(plan.id, ha, users);
      toast.success(`Paket "${plan.name}" aktualisiert.`);
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setMaxHectares(plan.maxHectares !== null ? String(plan.maxHectares) : "");
    setMaxUsers(plan.maxUsers !== null ? String(plan.maxUsers) : "");
    setEditing(false);
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 font-semibold text-slate-900">{plan.name}</td>
      <td className="px-6 py-4">
        {editing ? (
          <input
            type="number"
            value={maxHectares}
            onChange={(e) => setMaxHectares(e.target.value)}
            placeholder="∞ (unbegrenzt)"
            className="w-28 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        ) : (
          <span className="text-slate-700">
            {plan.maxHectares !== null ? `${plan.maxHectares} ha` : "∞"}
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {editing ? (
          <input
            type="number"
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            placeholder="∞ (unbegrenzt)"
            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        ) : (
          <span className="text-slate-700">
            {plan.maxUsers !== null ? plan.maxUsers : "∞"}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-slate-600">
        {plan.monthlyPrice !== null ? `${plan.monthlyPrice} €/Mo` : "—"}
      </td>
      <td className="px-6 py-4 text-slate-600">
        {plan.yearlyPrice !== null ? `${plan.yearlyPrice} €/Jahr` : "—"}
      </td>
      <td className="px-6 py-4 text-slate-500">{plan.orgCount}</td>
      <td className="px-6 py-4 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Speichern
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50 transition text-slate-600"
            >
              <X size={14} /> Abbrechen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50 transition text-slate-600 ml-auto"
          >
            <Pencil size={14} /> Bearbeiten
          </button>
        )}
      </td>
    </tr>
  );
}
