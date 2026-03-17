"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import { createCustomerPortal } from "@/actions/stripe-actions";

interface Props {
  orgId: string;
  hasStripeCustomer: boolean;
}

export function ManagePaymentButton({ orgId, hasStripeCustomer }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePortal() {
    if (!hasStripeCustomer) {
      toast.error("Noch kein Stripe-Kunde. Bitte schließen Sie zuerst ein Abonnement ab.");
      return;
    }
    setLoading(true);
    try {
      const { url } = await createCustomerPortal(orgId);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Öffnen des Kundenportals.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePortal}
      disabled={loading || !hasStripeCustomer}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <ExternalLink size={16} />
      )}
      Zahlungen &amp; Rechnungen verwalten
    </button>
  );
}
