"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import { createCustomerPortal } from "@/actions/stripe-actions";

interface Props {
  orgId: string;
  hasStripeCustomer: boolean;
}

export function ManagePaymentButton({ orgId, hasStripeCustomer }: Props) {
  const t = useTranslations("Billing");
  const [loading, setLoading] = useState(false);

  async function handlePortal() {
    if (!hasStripeCustomer) {
      toast.error(t("noStripeCustomer"));
      return;
    }
    setLoading(true);
    try {
      const { url } = await createCustomerPortal(orgId);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || t("portalError"));
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
      {t("managePayments")}
    </button>
  );
}
