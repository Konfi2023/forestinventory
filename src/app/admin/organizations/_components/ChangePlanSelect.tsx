"use client";

import { useState, useTransition } from "react";
import { updateOrgPlan } from "@/actions/admin";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
}

export function ChangePlanSelect({
  orgId,
  currentPlanId,
  plans,
}: {
  orgId: string;
  currentPlanId: string | null;
  plans: Plan[];
}) {
  const [value, setValue] = useState(currentPlanId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPlanId = e.target.value;
    if (!newPlanId || newPlanId === value) return;
    setValue(newPlanId);
    startTransition(async () => {
      try {
        await updateOrgPlan(orgId, newPlanId);
        toast.success("Paket aktualisiert");
      } catch {
        toast.error("Fehler beim Ändern des Pakets");
        setValue(currentPlanId ?? "");
      }
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
    >
      <option value="" disabled>— kein Paket —</option>
      {plans.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
