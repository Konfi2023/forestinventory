"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  TreePine, Building2,
  ChevronRight, ChevronLeft, Check, Loader2, X,
} from "lucide-react";
import { createAdditionalOrg, type OnboardingData } from "@/actions/onboarding";
import { addDays, format, type Locale as DateFnsLocale } from "date-fns";
import { de, enUS, es, fr } from "date-fns/locale";
import { PlanCards } from "@/components/billing/PlanCards";

const dateFnsLocales: Record<string, DateFnsLocale> = { de, en: enUS, es, fr };

type PlanData = {
  id: string;
  name: string;
  maxHectares: number | null;
  maxUsers: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  displayOrder: number;
};

type Props = {
  userEmail: string;
  cancelHref: string;
  plans: PlanData[];
};

export function NewOrgWizard({ userEmail, cancelHref, plans }: Props) {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [accountType, setAccountType] = useState<"PRIVATE" | "BUSINESS" | null>(null);
  const [orgName, setOrgName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [vatId, setVatId] = useState("");
  const [billingEmail, setBillingEmail] = useState(userEmail);
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState(t("step2.defaultCountry"));
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);

  const trialEndDate = format(addDays(new Date(), 30), "dd. MMMM yyyy", {
    locale: dateFnsLocales[locale] ?? de,
  });

  function getSelectedPrice() {
    if (!selectedPlan) return null;
    return billingInterval === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;
  }

  function getSelectedPriceId() {
    if (!selectedPlan) return null;
    return billingInterval === "monthly" ? selectedPlan.monthlyPriceId : selectedPlan.yearlyPriceId;
  }

  async function handleStartTrial() {
    if (!accountType || !orgName.trim()) {
      toast.error(t("fillRequired"));
      return;
    }
    setLoading(true);
    try {
      const result = await createAdditionalOrg({
        accountType,
        orgName: orgName.trim(),
        legalName: legalName.trim() || undefined,
        vatId: vatId.trim() || undefined,
        billingEmail: billingEmail.trim() || userEmail,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || t("step2.defaultCountry"),
      });
      toast.success(t("newOrg.orgCreated"));
      router.push(`/dashboard/org/${result.slug}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("newOrg.orgError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!accountType || !orgName.trim() || !selectedPlan) {
      toast.error(t("selectPlan"));
      return;
    }
    setLoading(true);
    try {
      const priceId = getSelectedPriceId();
      const result = await createAdditionalOrg({
        accountType,
        orgName: orgName.trim(),
        legalName: legalName.trim() || undefined,
        vatId: vatId.trim() || undefined,
        billingEmail: billingEmail.trim() || userEmail,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || t("step2.defaultCountry"),
        planId: selectedPlan.id,
        planInterval: billingInterval,
        selectedPriceId: priceId || undefined,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        toast.success(t("newOrg.orgCreatedPaid"));
        router.push(`/dashboard/org/${result.slug}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("newOrg.orgError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="text-green-700" size={24} />
          <span className="font-bold text-lg tracking-tight"><span className="text-slate-900">Forest</span><span className="text-green-600">Manager</span></span>
        </div>
        <div className="flex items-center gap-6">
          {/* Step indicators */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > s ? "bg-green-700 text-white"
                  : step === s ? "bg-green-700 text-white ring-2 ring-green-200"
                  : "bg-slate-100 text-slate-400"
                }`}>
                  {step > s ? <Check size={14} /> : s}
                </div>
                {s < 4 && <div className={`h-px w-8 ${step > s ? "bg-green-700" : "bg-slate-200"}`} />}
              </React.Fragment>
            ))}
          </div>
          {/* Cancel */}
          <a
            href={cancelHref}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={15} /> {t("newOrg.cancel")}
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* STEP 1: Account type */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{t("newOrg.title")}</h1>
                <p className="mt-2 text-slate-500">{t("newOrg.subtitle")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setAccountType("PRIVATE"); setStep(2); }}
                  className={`group p-8 rounded-2xl border-2 text-left transition-all hover:border-green-600 hover:bg-green-50 ${
                    accountType === "PRIVATE" ? "border-green-600 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <TreePine className="text-green-700 mb-4" size={40} />
                  <div className="font-bold text-slate-900 text-lg">{t("step1.private")}</div>
                  <div className="text-slate-500 text-sm mt-1">{t("step1.privateDesc")}</div>
                  <div className="mt-4 flex items-center gap-1 text-green-700 text-sm font-medium">
                    {t("step1.select")} <ChevronRight size={16} />
                  </div>
                </button>
                <button
                  onClick={() => { setAccountType("BUSINESS"); setStep(2); }}
                  className={`group p-8 rounded-2xl border-2 text-left transition-all hover:border-green-600 hover:bg-green-50 ${
                    accountType === "BUSINESS" ? "border-green-600 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <Building2 className="text-green-700 mb-4" size={40} />
                  <div className="font-bold text-slate-900 text-lg">{t("step1.business")}</div>
                  <div className="text-slate-500 text-sm mt-1">{t("step1.businessDesc")}</div>
                  <div className="mt-4 flex items-center gap-1 text-green-700 text-sm font-medium">
                    {t("step1.select")} <ChevronRight size={16} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Profile details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{t("newOrg.detailsTitle")}</h1>
                <p className="mt-2 text-slate-500">
                  {accountType === "PRIVATE" ? t("step2.subtitlePrivate") : t("step2.subtitleBusiness")}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {accountType === "PRIVATE" ? t("step2.orgNamePrivate") : t("step2.orgNameBusiness")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={accountType === "PRIVATE" ? t("step2.placeholderPrivate") : t("step2.placeholderBusiness")}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                  />
                </div>
                {accountType === "BUSINESS" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("step2.vatId")} <span className="text-slate-400 text-xs">({t("step2.optional")})</span>
                      </label>
                      <input
                        type="text"
                        value={vatId}
                        onChange={(e) => setVatId(e.target.value)}
                        placeholder="DE123456789"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("step2.billingEmail")}</label>
                      <input
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                    </div>
                  </>
                )}
                <div className="pt-2">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    {t("step2.address")}{" "}
                    {accountType === "PRIVATE" && <span className="text-slate-400 text-xs">({t("step2.optional")})</span>}
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder={t("step2.street")}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder={t("step2.zip")}
                        className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t("step2.city")}
                        className="col-span-2 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                    </div>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder={t("step2.country")}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} /> {t("back")}
                </button>
                <button
                  onClick={() => {
                    if (!orgName.trim()) { toast.error(t("step2.enterName")); return; }
                    setStep(3);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium"
                >
                  {t("next")} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Plan selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{t("step3.title")}</h1>
                <p className="mt-2 text-slate-500" dangerouslySetInnerHTML={{
                  __html: t("step3.subtitleNewOrg", { orgName }),
                }} />
              </div>
              <PlanCards
                plans={plans}
                selectedPlanId={selectedPlan?.id ?? null}
                onSelect={setSelectedPlan}
                billingInterval={billingInterval}
                onIntervalChange={setBillingInterval}
                showAnnualDiscountBadge
              />
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-slate-400">{t("step3.orWithoutPayment")}</span>
                </div>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="font-bold text-slate-900">{t("step3.freeTrial")}</div>
                    <div className="text-slate-500 text-sm mt-1">
                      {t("step3.paymentLater")}
                    </div>
                  </div>
                  <button
                    onClick={handleStartTrial}
                    disabled={loading || !orgName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 border-2 border-green-700 text-green-700 rounded-lg font-medium hover:bg-green-50 transition disabled:opacity-50"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {t("step3.tryFree")}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} /> {t("back")}
                </button>
                <button
                  onClick={() => {
                    if (!selectedPlan) { toast.error(t("selectPlan")); return; }
                    setStep(4);
                  }}
                  disabled={!selectedPlan}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium disabled:opacity-50"
                >
                  {t("step3.toSummary")} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & checkout */}
          {step === 4 && selectedPlan && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{t("step4.title")}</h1>
                <p className="mt-2 text-slate-500">{t("step4.subtitle")}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t("step4.org")}</span>
                  <span className="font-semibold text-slate-900">{orgName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t("step4.plan")}</span>
                  <span className="font-semibold text-slate-900">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t("step4.billing")}</span>
                  <span className="font-semibold text-slate-900">
                    {billingInterval === "monthly" ? t("step4.monthly") : t("step4.yearly")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t("step4.price")}</span>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900">
                      {getSelectedPrice()
                        ? `${getSelectedPrice()} € / ${billingInterval === "monthly" ? t("step4.perMonth") : t("step4.perYear")}`
                        : t("step4.onRequest")}
                    </span>
                    {getSelectedPrice() && <p className="text-xs text-slate-400">{t("step4.plusVat")}</p>}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{t("step4.freeUntil")}</span>
                    <span className="font-semibold text-green-700">{trialEndDate}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {t("step4.autoCharge")}
                  </p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                <strong>{t("step4.trialInfo")}</strong> {t("step4.trialInfoDetail")}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} /> {t("back")}
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-semibold text-base disabled:opacity-50"
                >
                  {loading
                    ? <Loader2 size={18} className="animate-spin" />
                    : <><span>{t("step4.startAndPay")}</span><ChevronRight size={16} /></>
                  }
                </button>
              </div>
              <p className="text-center text-xs text-slate-400">
                {t("step4.stripeSecure")}
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
