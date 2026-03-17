import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getForestBillingData } from "@/actions/reports";
import { getVatRates } from "@/actions/vat-rates";
import { ForestList } from "./_components/ForestList";
import { ForestBillingPanel } from "./_components/ForestBillingPanel";
import { InvoiceList } from "./_components/InvoiceList";
import { Euro, Clock, CheckCircle, TreePine } from "lucide-react";

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtH(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function KostencontrollingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ forest?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/api/auth/signin/keycloak");

  const { slug } = await params;
  const { forest: selectedForestId } = await searchParams;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  // Load rate category map for cost calculations
  const rateCategories = await prisma.rateCategory.findMany({
    where: { organizationId: org.id, isActive: true },
  });
  const rateCategoryMap = new Map<string, number>(
    rateCategories.map((c) => [c.key ?? c.id, Number(c.hourlyRate)])
  );

  function resolveRate(
    override: number | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rc: { key: string | null; hourlyRate: any } | null,
    category: string
  ): number | null {
    if (override !== null) return override;
    if (rc) return Number(rc.hourlyRate);
    return rateCategoryMap.get(category) ?? null;
  }

  // Load all forests with unbilled time entries (for the overview list)
  const forests = await prisma.forest.findMany({
    where: { organizationId: org.id },
    select: {
      id: true,
      name: true,
      owner: { select: { id: true, name: true } },
      tasks: {
        select: {
          timeEntries: {
            where: { durationMinutes: { gt: 0 } },
            select: {
              durationMinutes: true,
              invoiceId: true,
              hourlyRateOverride: true,
              category: true,
              rateCategory: { select: { key: true, hourlyRate: true } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Compute per-forest summaries
  const forestSummaries = forests
    .map((f) => {
      let billableMinutes = 0;
      let billableAmount  = 0;
      let billedMinutes   = 0;
      let billedAmount    = 0;

      for (const task of f.tasks) {
        for (const e of task.timeEntries) {
          const mins = e.durationMinutes ?? 0;
          const rate = resolveRate(
            e.hourlyRateOverride !== null ? Number(e.hourlyRateOverride) : null,
            e.rateCategory,
            e.category
          );
          const cost = rate ? (mins / 60) * rate : 0;

          if (e.invoiceId) {
            billedMinutes += mins;
            billedAmount  += cost;
          } else {
            billableMinutes += mins;
            billableAmount  += cost;
          }
        }
      }

      return {
        forestId: f.id,
        forestName: f.name,
        ownerName: f.owner?.name ?? null,
        ownerId: f.owner?.id ?? null,
        billableMinutes,
        billableAmount,
        billedMinutes,
        billedAmount,
      };
    })
    .filter((f) => f.billableMinutes > 0 || f.billedMinutes > 0);

  // Global KPIs
  const totalBillableMinutes = forestSummaries.reduce((s, f) => s + f.billableMinutes, 0);
  const totalBillableAmount  = forestSummaries.reduce((s, f) => s + f.billableAmount, 0);
  const totalBilledMinutes   = forestSummaries.reduce((s, f) => s + f.billedMinutes, 0);
  const totalBilledAmount    = forestSummaries.reduce((s, f) => s + f.billedAmount, 0);

  // All invoices
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id },
    include: { forestOwner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const serializedInvoices = invoices.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    forestOwnerName: i.forestOwner.name,
    status: i.status as "DRAFT" | "SENT" | "PAID" | "CANCELLED",
    totalAmount: Number(i.totalAmount),
    currency: i.currency,
    note: i.note,
    periodFrom: i.periodFrom?.toISOString() ?? null,
    periodTo: i.periodTo?.toISOString() ?? null,
    issuedAt: i.issuedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }));

  // Load VAT rates for this org
  const vatRates = await getVatRates(org.id);

  // Load forest billing detail if a forest is selected
  let forestBillingData = null;
  if (selectedForestId) {
    // Validate it belongs to this org
    const forestCheck = await prisma.forest.findFirst({
      where: { id: selectedForestId, organizationId: org.id },
    });
    if (forestCheck) {
      forestBillingData = await getForestBillingData(org.id, selectedForestId);
    }
  }

  return (
    <div className="overflow-y-auto h-full bg-slate-50">
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Kostencontrolling</h2>
          <p className="text-slate-500 mt-1 text-sm">Abrechenbare Stunden, Rechnungen & Zahlungsstatus</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-amber-500" />
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Abrechenbar</p>
            </div>
            <p className="text-2xl font-bold text-amber-800">{fmtH(totalBillableMinutes)}</p>
            <p className="text-sm text-amber-600 mt-0.5 font-medium">{fmtEur(totalBillableAmount)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={14} className="text-emerald-500" />
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Abgerechnet</p>
            </div>
            <p className="text-2xl font-bold text-emerald-800">{fmtH(totalBilledMinutes)}</p>
            <p className="text-sm text-emerald-600 mt-0.5 font-medium">{fmtEur(totalBilledAmount)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TreePine size={14} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Wälder</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {forestSummaries.filter((f) => f.billableMinutes > 0).length}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">mit offenen Stunden</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Euro size={14} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rechnungen</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{serializedInvoices.length}</p>
            <p className="text-sm text-slate-400 mt-0.5">
              {serializedInvoices.filter((i) => i.status === "PAID").length} bezahlt
            </p>
          </div>
        </div>

        {/* Main area: forest list + all invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ForestList
              forests={forestSummaries}
              selectedForestId={selectedForestId ?? null}
              orgSlug={slug}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">Alle Rechnungen</h3>
              </div>
              <InvoiceList invoices={serializedInvoices} />
            </div>
          </div>
        </div>

        {/* Forest billing panel */}
        {forestBillingData && (
          <ForestBillingPanel
            data={forestBillingData}
            orgId={org.id}
            orgSlug={slug}
            vatRates={vatRates}
          />
        )}

      </div>
    </div>
  );
}
