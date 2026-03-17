"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setOrgCustomLimits } from "@/actions/admin-plans";
import { Save, Loader2 } from "lucide-react";

type Props = {
  orgId: string;
  currentCustomAreaLimit: number | null;
  currentCustomUserLimit: number | null;
};

export function OrgCustomLimitsEditor({
  orgId,
  currentCustomAreaLimit,
  currentCustomUserLimit,
}: Props) {
  const [areaLimit, setAreaLimit] = useState(
    currentCustomAreaLimit !== null ? String(currentCustomAreaLimit) : ""
  );
  const [userLimit, setUserLimit] = useState(
    currentCustomUserLimit !== null ? String(currentCustomUserLimit) : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const area = areaLimit === "" ? null : parseFloat(areaLimit);
      const users = userLimit === "" ? null : parseInt(userLimit, 10);
      await setOrgCustomLimits(orgId, area, users);
      toast.success("Individuelle Limits gespeichert.");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Max. Hektar (individuell)
        </label>
        <input
          type="number"
          value={areaLimit}
          onChange={(e) => setAreaLimit(e.target.value)}
          placeholder="Leer = Paket-Limit gilt"
          className="w-48 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Max. Benutzer (individuell)
        </label>
        <input
          type="number"
          value={userLimit}
          onChange={(e) => setUserLimit(e.target.value)}
          placeholder="Leer = Paket-Limit gilt"
          className="w-48 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Speichern
      </button>
      {(currentCustomAreaLimit !== null || currentCustomUserLimit !== null) && (
        <p className="text-xs text-amber-600 w-full">
          Aktive individuelle Limits überschreiben das Paket-Limit dieser Organisation.
        </p>
      )}
    </div>
  );
}
