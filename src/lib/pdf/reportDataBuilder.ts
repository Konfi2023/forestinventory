import { prisma } from "@/lib/prisma";
import type { ReportData, OrgInfo, OwnerInfo, ForestGroup, ReportEntry } from "./types";

function formatDate(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEntryDate(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

const CATEGORY_LABELS: Record<string, string> = {
  MANUAL_WORK: "Handarbeit",
  MACHINE_WORK: "Maschinenarbeit",
  PLANNING: "Planung",
  TRAVEL: "Fahrzeit",
  INSPECTION: "Begehung",
  OTHER: "Sonstiges",
};

/**
 * Builds a ReportData object from DB for the given org + forest owner + date range.
 */
export async function buildReportData(
  organizationId: string,
  forestOwnerId: string,
  from: Date,
  to: Date,
  invoiceNumber?: string,
  invoiceDate?: string,
  dueDate?: string,
): Promise<ReportData> {
  // Load org, owner and rate categories in parallel
  const [org, owner, rateCategories] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.forestOwner.findUniqueOrThrow({ where: { id: forestOwnerId } }),
    prisma.rateCategory.findMany({
      where: { organizationId, isActive: true },
    }),
  ]);

  // Build category → rate map (same fallback logic as kostencontrolling/page.tsx)
  // Key is either the TimeCategory enum value stored in RateCategory.key, or the record id
  const rateCategoryMap = new Map<string, number>(
    rateCategories.map((c) => [c.key ?? c.id, Number(c.hourlyRate)])
  );

  // Load completed time entries for this owner's forests in the date range.
  // Only entries with an actual durationMinutes (excludes running timers).
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      durationMinutes: { gt: 0 },   // exclude running or empty timers
      startTime: { gte: from, lte: to },
      task: {
        forest: {
          ownerId: forestOwnerId,
          organizationId,
        },
      },
    },
    include: {
      task: {
        include: { forest: true },
      },
      user: true,
      rateCategory: true,
    },
    orderBy: { startTime: "asc" },
  });

  // Group by forest
  const forestMap = new Map<string, { name: string; entries: ReportEntry[] }>();

  for (const entry of timeEntries) {
    if (!entry.task?.forest) continue;
    const forest = entry.task.forest;

    if (!forestMap.has(forest.id)) {
      forestMap.set(forest.id, { name: forest.name, entries: [] });
    }

    const minutes = entry.durationMinutes!; // already filtered > 0

    // Three-tier rate resolution (mirrors kostencontrolling/page.tsx):
    //   1. hourlyRateOverride on the entry itself
    //   2. linked RateCategory record (rateCategoryId FK)
    //   3. org RateCategory looked up by TimeCategory enum key (e.g. "MANUAL_WORK")
    const hourlyRate: number | null =
      entry.hourlyRateOverride !== null
        ? Number(entry.hourlyRateOverride)
        : entry.rateCategory !== null
          ? Number(entry.rateCategory.hourlyRate)
          : (rateCategoryMap.get(entry.category) ?? null);

    const cost = hourlyRate !== null ? (minutes / 60) * hourlyRate : 0;

    const reportEntry: ReportEntry = {
      date: formatEntryDate(new Date(entry.startTime)),
      forestName: forest.name,
      taskTitle: entry.task.title,
      category:
        entry.rateCategory?.name ??
        CATEGORY_LABELS[entry.category] ??
        entry.category,
      userName:
        [entry.user.firstName, entry.user.lastName].filter(Boolean).join(" ") ||
        entry.user.email,
      minutes,
      hourlyRate,
      cost,
    };

    forestMap.get(forest.id)!.entries.push(reportEntry);
  }

  // Build forest groups
  const forestGroups: ForestGroup[] = Array.from(forestMap.values()).map((fg) => ({
    forestName: fg.name,
    entries: fg.entries,
    totalMinutes: fg.entries.reduce((s, e) => s + e.minutes, 0),
    totalCost: fg.entries.reduce((s, e) => s + e.cost, 0),
  }));

  const totalMinutes = forestGroups.reduce((s, g) => s + g.totalMinutes, 0);
  const totalCost    = forestGroups.reduce((s, g) => s + g.totalCost, 0);

  const paymentDays = org.defaultPaymentDays ?? 30;
  const dueDateFallback = (() => {
    const d = new Date();
    d.setDate(d.getDate() + paymentDays);
    return formatDate(d);
  })();

  const orgInfo: OrgInfo = {
    name: org.name,
    legalName: org.legalName,
    street: org.street,
    zip: org.zip,
    city: org.city,
    country: org.country,
    email: org.billingEmail,
    vatId: org.vatId,
    iban: org.iban,
    bic: org.bic,
    bankName: org.bankName,
    isKleinunternehmer: org.isKleinunternehmer,
    defaultPaymentDays: org.defaultPaymentDays,
  };

  const ownerInfo: OwnerInfo = {
    name: owner.name,
    street: owner.street,
    zip: owner.zip,
    city: owner.city,
    email: owner.email,
  };

  return {
    org: orgInfo,
    owner: ownerInfo,
    periodFrom: formatDate(from),
    periodTo: formatDate(to),
    forestGroups,
    totalMinutes,
    totalCost,
    invoiceNumber,
    invoiceDate: invoiceDate ?? formatDate(new Date()),
    dueDate: dueDate ?? dueDateFallback,
  };
}
