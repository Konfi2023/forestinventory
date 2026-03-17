import { getPlans } from "@/actions/admin-plans";
import { PlanLimitsEditor } from "./_components/PlanLimitsEditor";
import { requireSystemAdmin } from "@/lib/admin-auth";

export default async function AdminPlansPage() {
  await requireSystemAdmin();
  const plans = await getPlans();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pakete verwalten</h2>
        <p className="text-sm text-slate-500 mt-1">
          Passen Sie die Limits der einzelnen Pakete an. Preise und Stripe-IDs werden im Stripe
          Dashboard verwaltet.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Paket</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Max. Hektar</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Max. Benutzer</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Monatspreis</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Jahrespreis</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Orgs</th>
              <th className="text-right px-6 py-3 font-medium text-slate-600">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <PlanLimitsEditor
                key={plan.id}
                plan={{
                  id: plan.id,
                  name: plan.name,
                  maxHectares: plan.maxHectares,
                  maxUsers: plan.maxUsers,
                  monthlyPrice: plan.monthlyPrice,
                  yearlyPrice: plan.yearlyPrice,
                  orgCount: plan._count.organizations,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
