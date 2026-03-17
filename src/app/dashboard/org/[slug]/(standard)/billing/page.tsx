import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SubscriptionStatus } from "@prisma/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Package,
  Users,
  TreePine,
} from "lucide-react";
import { ManagePaymentButton } from "./_components/BillingClient";
import { UpgradeModal } from "./_components/UpgradeModal";

export const metadata = { title: "Abrechnungen" };

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  FREE: {
    label: "Kostenlos",
    color: "bg-slate-100 text-slate-700",
    icon: <Package size={14} />,
  },
  TRIAL: {
    label: "Testzeitraum",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock size={14} />,
  },
  ACTIVE: {
    label: "Aktiv",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 size={14} />,
  },
  PAST_DUE: {
    label: "Zahlung ausstehend",
    color: "bg-orange-100 text-orange-700",
    icon: <AlertTriangle size={14} />,
  },
  CANCELED: {
    label: "Gekündigt",
    color: "bg-red-100 text-red-700",
    icon: <XCircle size={14} />,
  },
};

export default async function BillingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return notFound();

  const [org, plans, memberCount, areaAgg] = await Promise.all([
    prisma.organization.findUnique({
      where: { slug },
      include: { plan: true },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.membership.count({ where: { organization: { slug } } }),
    prisma.forest.aggregate({
      where: { organization: { slug } },
      _sum: { areaHa: true },
    }),
  ]);

  if (!org) return notFound();

  const statusCfg = STATUS_CONFIG[org.subscriptionStatus];
  const effectiveMaxHa = org.customAreaLimit ?? org.plan?.maxHectares ?? null;
  const effectiveMaxUsers = org.customUserLimit ?? org.plan?.maxUsers ?? null;
  const usedAreaHa = areaAgg._sum.areaHa ?? 0;

  // Banner anzeigen wenn TRIAL ohne hinterlegte Zahlungsmethode
  const showUpgradeBanner =
    org.subscriptionStatus === "TRIAL" && !org.stripeSubscriptionId;

  const planDataForModal = plans.map((p) => ({
    id: p.id,
    name: p.name,
    maxHectares: p.maxHectares,
    maxUsers: p.maxUsers,
    monthlyPrice: p.monthlyPrice,
    yearlyPrice: p.yearlyPrice,
    monthlyPriceId: p.monthlyPriceId,
    yearlyPriceId: p.yearlyPriceId,
    displayOrder: p.displayOrder,
  }));

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Abrechnungen</h2>
        <p className="text-muted-foreground mt-1">
          Verwalten Sie Ihr Abonnement, Zahlungsmethoden und Rechnungen.
        </p>
      </div>

      {/* Upgrade-Banner: Trial ohne Zahlungsmethode */}
      {showUpgradeBanner && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Noch keine Zahlungsmethode hinterlegt</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Sie befinden sich im kostenlosen Testzeitraum ohne hinterlegte Zahlungsmethode.
                Wählen Sie jetzt ein Paket, um nach dem Test nahtlos weiterzumachen.
              </p>
            </div>
          </div>
          <UpgradeModal
            orgId={org.id}
            plans={planDataForModal}
            currentUsedHa={usedAreaHa}
            currentMemberCount={memberCount}
          />
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Aktuelles Abonnement</h3>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.color}`}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow
            icon={<Package size={16} className="text-slate-400" />}
            label="Paket"
            value={org.plan?.name ?? "Kein Paket"}
          />
          {org.planInterval && (
            <InfoRow
              icon={<Calendar size={16} className="text-slate-400" />}
              label="Abrechnung"
              value={org.planInterval === "yearly" ? "Jährlich" : "Monatlich"}
            />
          )}
          {org.subscriptionStatus === "TRIAL" && org.trialEndsAt && (
            <InfoRow
              icon={<Clock size={16} className="text-blue-400" />}
              label="Testzeitraum endet"
              value={format(org.trialEndsAt, "dd. MMMM yyyy", { locale: de })}
              highlight
            />
          )}
          {org.currentPeriodEnd && org.subscriptionStatus === "ACTIVE" && (
            <InfoRow
              icon={<Calendar size={16} className="text-slate-400" />}
              label="Nächste Abrechnung"
              value={format(org.currentPeriodEnd, "dd. MMMM yyyy", { locale: de })}
            />
          )}
          {org.cancelAtPeriodEnd && org.currentPeriodEnd && (
            <div className="col-span-full bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Ihr Abonnement läuft am{" "}
                <strong>
                  {format(org.currentPeriodEnd, "dd. MMMM yyyy", { locale: de })}
                </strong>{" "}
                aus und wird nicht verlängert.
              </span>
            </div>
          )}
          <InfoRow
            icon={<TreePine size={16} className="text-slate-400" />}
            label="Waldpolygonfläche"
            value={effectiveMaxHa ? `bis ${effectiveMaxHa} ha` : "Unbegrenzt"}
          />
          <InfoRow
            icon={<Users size={16} className="text-slate-400" />}
            label="Benutzer"
            value={effectiveMaxUsers ? `bis ${effectiveMaxUsers} Nutzer` : "Unbegrenzt"}
          />
        </div>
      </div>

      {/* Stripe Portal section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Zahlungsverwaltung</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            Im sicheren Stripe-Kundenportal können Sie:
          </p>
          <ul className="text-sm text-slate-600 space-y-1.5">
            {[
              "Zahlungsmethode ändern (Kreditkarte, SEPA-Lastschrift)",
              "Rechnungen einsehen und herunterladen",
              "Abonnement kündigen",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <ManagePaymentButton
            orgId={org.id}
            hasStripeCustomer={!!org.stripeCustomerId}
          />
          {!org.stripeCustomerId && (
            <p className="text-xs text-slate-400">
              Nach dem Abschluss eines Pakets ist das Portal verfügbar.
            </p>
          )}
        </div>
      </div>

      {/* Paket wechseln — immer sichtbar wenn aktiv oder trial mit subscription */}
      {!showUpgradeBanner && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Paket wechseln</h3>
          </div>
          <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-600">
              Upgraden oder downgraden Sie Ihr aktuelles Paket.
            </p>
            <UpgradeModal
              orgId={org.id}
              plans={planDataForModal}
              currentUsedHa={usedAreaHa}
              currentMemberCount={memberCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-blue-700" : "text-slate-900"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
