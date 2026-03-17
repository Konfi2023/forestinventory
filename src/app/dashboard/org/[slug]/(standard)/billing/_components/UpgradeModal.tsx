'use client';

import { useState } from 'react';
import { X, Loader2, ChevronRight, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/actions/stripe-actions';
import { PlanCards, type PlanData } from '@/components/billing/PlanCards';

interface Props {
  orgId: string;
  plans: PlanData[];
  currentUsedHa: number;
  currentMemberCount: number;
}

export function UpgradeModal({ orgId, plans, currentUsedHa, currentMemberCount }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!selectedPlan) return;
    const priceId = billingInterval === 'monthly'
      ? selectedPlan.monthlyPriceId
      : selectedPlan.yearlyPriceId;
    if (!priceId) {
      toast.error('Kein Preis für dieses Paket hinterlegt.');
      return;
    }
    setLoading(true);
    try {
      const { url } = await createCheckoutSession(priceId, orgId, billingInterval);
      if (url) window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Erstellen der Checkout-Session.');
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium text-sm"
      >
        <CreditCard size={16} />
        Paket wählen &amp; bezahlen
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-900/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Paket wählen</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Wählen Sie das passende Paket und hinterlegen Sie Ihre Zahlungsmethode.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Plan cards */}
            <div className="px-8 py-6">
              <PlanCards
                plans={plans}
                selectedPlanId={selectedPlan?.id ?? null}
                onSelect={setSelectedPlan}
                billingInterval={billingInterval}
                onIntervalChange={setBillingInterval}
                currentUsedHa={currentUsedHa}
                currentMemberCount={currentMemberCount}
                showAnnualDiscountBadge
              />
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-slate-400">
                30 Tage gratis testen · Danach automatische Abrechnung · Jederzeit kündbar
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={!selectedPlan || loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Weiter zur Kasse <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
