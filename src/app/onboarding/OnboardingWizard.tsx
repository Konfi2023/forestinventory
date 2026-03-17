"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TreePine,
  Building2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";
import { startTrial, completeOnboarding, type OnboardingData } from "@/actions/onboarding";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { PlanCards } from "@/components/billing/PlanCards";

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
  initialStep: number;
  plans: PlanData[];
};

export function OnboardingWizard({ userEmail, initialStep, plans }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);

  // Form state
  const [accountType, setAccountType] = useState<"PRIVATE" | "BUSINESS" | null>(null);
  const [orgName, setOrgName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [vatId, setVatId] = useState("");
  const [billingEmail, setBillingEmail] = useState(userEmail);
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Deutschland");

  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);

  const trialEndDate = format(addDays(new Date(), 30), "dd. MMMM yyyy", { locale: de });

  function getSelectedPrice() {
    if (!selectedPlan) return null;
    if (billingInterval === "monthly") return selectedPlan.monthlyPrice;
    return selectedPlan.yearlyPrice;
  }

  function getSelectedPriceId() {
    if (!selectedPlan) return null;
    if (billingInterval === "monthly") return selectedPlan.monthlyPriceId;
    return selectedPlan.yearlyPriceId;
  }

  function getMonthlyEquivalent(plan: PlanData) {
    if (billingInterval === "yearly" && plan.yearlyPrice) {
      return (plan.yearlyPrice / 12).toFixed(2);
    }
    return plan.monthlyPrice?.toFixed(2) ?? null;
  }

  async function handleStartTrial() {
    if (!accountType || !orgName.trim()) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }
    setLoading(true);
    try {
      const data: OnboardingData = {
        accountType,
        orgName: orgName.trim(),
        legalName: legalName.trim() || undefined,
        vatId: vatId.trim() || undefined,
        billingEmail: billingEmail.trim() || userEmail,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || "Deutschland",
      };
      const result = await startTrial(data);
      toast.success("Testzeitraum gestartet!");
      router.push(`/dashboard/org/${result.slug}`);
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Starten des Testzeitraums.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!accountType || !orgName.trim() || !selectedPlan) {
      toast.error("Bitte wählen Sie ein Paket aus.");
      return;
    }
    setLoading(true);
    try {
      const priceId = getSelectedPriceId();
      const data: OnboardingData = {
        accountType,
        orgName: orgName.trim(),
        legalName: legalName.trim() || undefined,
        vatId: vatId.trim() || undefined,
        billingEmail: billingEmail.trim() || userEmail,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || "Deutschland",
        planId: selectedPlan.id,
        planInterval: billingInterval,
        selectedPriceId: priceId || undefined,
      };
      const result = await completeOnboarding(data);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        toast.success("Konto erstellt!");
        router.push(`/dashboard/org/${result.slug}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Erstellen des Kontos.");
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
          <span className="font-bold text-slate-900 text-lg">Forest Inventory</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > s
                    ? "bg-green-700 text-white"
                    : step === s
                    ? "bg-green-700 text-white ring-2 ring-green-200"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 4 && <div className={`h-px w-8 ${step > s ? "bg-green-700" : "bg-slate-200"}`} />}
            </React.Fragment>
          ))}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* STEP 1: Account type */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900">Willkommen!</h1>
                <p className="mt-2 text-slate-500">Wie möchten Sie Forest Inventory nutzen?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setAccountType("PRIVATE"); setStep(2); }}
                  className={`group p-8 rounded-2xl border-2 text-left transition-all hover:border-green-600 hover:bg-green-50 ${
                    accountType === "PRIVATE" ? "border-green-600 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <TreePine className="text-green-700 mb-4" size={40} />
                  <div className="font-bold text-slate-900 text-lg">Privatperson</div>
                  <div className="text-slate-500 text-sm mt-1">Privater Waldbesitzer</div>
                  <div className="mt-4 flex items-center gap-1 text-green-700 text-sm font-medium">
                    Auswählen <ChevronRight size={16} />
                  </div>
                </button>
                <button
                  onClick={() => { setAccountType("BUSINESS"); setStep(2); }}
                  className={`group p-8 rounded-2xl border-2 text-left transition-all hover:border-green-600 hover:bg-green-50 ${
                    accountType === "BUSINESS" ? "border-green-600 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <Building2 className="text-green-700 mb-4" size={40} />
                  <div className="font-bold text-slate-900 text-lg">Unternehmen</div>
                  <div className="text-slate-500 text-sm mt-1">
                    Forstbetrieb, Dienstleister oder Verband
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-green-700 text-sm font-medium">
                    Auswählen <ChevronRight size={16} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Profile details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Ihre Angaben</h1>
                <p className="mt-2 text-slate-500">
                  {accountType === "PRIVATE"
                    ? "Bitte geben Sie Ihren Namen und optional Ihre Adresse an."
                    : "Bitte geben Sie Ihre Unternehmensdaten ein."}
                </p>
              </div>

              <div className="space-y-4">
                {/* Org name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {accountType === "PRIVATE" ? "Betriebsname / Ihr Name" : "Firmenname"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={accountType === "PRIVATE" ? "z.B. Waldbesitz Müller" : "z.B. Forstbetrieb GmbH"}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                  />
                </div>

                {/* Business: additional fields */}
                {accountType === "BUSINESS" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        USt-ID <span className="text-slate-400 text-xs">(optional)</span>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Rechnungs-E-Mail
                      </label>
                      <input
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                    </div>
                  </>
                )}

                {/* Address */}
                <div className="pt-2">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    Adresse{" "}
                    {accountType === "PRIVATE" && (
                      <span className="text-slate-400 text-xs">(optional)</span>
                    )}
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Straße und Hausnummer"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="PLZ"
                        className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ort"
                        className="col-span-2 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
                      />
                    </div>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Land"
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
                  <ChevronLeft size={16} /> Zurück
                </button>
                <button
                  onClick={() => {
                    if (!orgName.trim()) {
                      toast.error("Bitte geben Sie einen Namen ein.");
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium"
                >
                  Weiter <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Plan selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Paket wählen</h1>
                <p className="mt-2 text-slate-500">
                  Wählen Sie das passende Paket für Ihren Betrieb — oder starten Sie kostenlos.
                </p>
              </div>

              <PlanCards
                plans={plans}
                selectedPlanId={selectedPlan?.id ?? null}
                onSelect={setSelectedPlan}
                billingInterval={billingInterval}
                onIntervalChange={setBillingInterval}
                showAnnualDiscountBadge
              />

              {/* Free trial option */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-slate-400">oder ohne Zahlungsmethode starten</span>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="font-bold text-slate-900">30 Tage kostenlos testen</div>
                    <div className="text-slate-500 text-sm mt-1">
                      Keine Kreditkarte erforderlich. Zahlungsmethode kann später in den Abrechnungen hinterlegt werden.
                    </div>
                  </div>
                  <button
                    onClick={handleStartTrial}
                    disabled={loading || !orgName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 border-2 border-green-700 text-green-700 rounded-lg font-medium hover:bg-green-50 transition disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Kostenlos testen
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} /> Zurück
                </button>
                <button
                  onClick={() => {
                    if (!selectedPlan) {
                      toast.error("Bitte wählen Sie ein Paket aus.");
                      return;
                    }
                    setStep(4);
                  }}
                  disabled={!selectedPlan}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium disabled:opacity-50"
                >
                  Weiter zur Zusammenfassung <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & checkout */}
          {step === 4 && selectedPlan && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Zusammenfassung</h1>
                <p className="mt-2 text-slate-500">Überprüfen Sie Ihre Auswahl und starten Sie.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Betrieb</span>
                  <span className="font-semibold text-slate-900">{orgName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Paket</span>
                  <span className="font-semibold text-slate-900">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Abrechnung</span>
                  <span className="font-semibold text-slate-900">
                    {billingInterval === "monthly" ? "Monatlich" : "Jährlich"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Preis</span>
                  <span className="font-semibold text-slate-900">
                    {getSelectedPrice() ? `${getSelectedPrice()} € / ${billingInterval === "monthly" ? "Monat" : "Jahr"}` : "Auf Anfrage"}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Kostenlos testen bis</span>
                    <span className="font-semibold text-green-700">{trialEndDate}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Danach beginnt die Abrechnung automatisch. Sie können jederzeit kündigen.
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                <strong>30 Tage gratis testen.</strong> Sie hinterlegen jetzt Ihre Zahlungsmethode, werden aber erst nach dem Testzeitraum belastet.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} /> Zurück
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-semibold text-base disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      Jetzt starten &amp; Zahlungsmethode hinterlegen
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                Sichere Zahlung über Stripe. Keine Bindung — jederzeit kündbar.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
