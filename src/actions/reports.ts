"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReportData } from "@/lib/pdf/reportDataBuilder";
import { ActivityReportPdf } from "@/lib/pdf/ActivityReportPdf";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { Resend } from "resend";
import React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER  = process.env.RESEND_FROM || "onboarding@resend.dev";

const IS_S3 = Boolean(
  process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID
);

async function storeBuffer(buffer: Buffer, key: string): Promise<void> {
  if (IS_S3) {
    const client = new S3Client({
      region: process.env.AWS_REGION ?? "eu-central-1",
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );
    return;
  }
  // Local fallback
  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(process.cwd(), "public", "uploads", key), buffer);
}

export type SendReportOptions = {
  orgId: string;
  forestOwnerId: string;
  from: string;        // ISO date string
  to: string;          // ISO date string
  sendEmail: boolean;
  includeInvoice: boolean;
  includeActivityReport: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  emailSubject?: string;
  emailMessage?: string;
};

export type SendReportResult = {
  success: boolean;
  error?: string;
  documentIds: string[];
};

export async function sendReport(opts: SendReportOptions): Promise<SendReportResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Nicht autorisiert", documentIds: [] };

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: opts.orgId },
  });
  if (!membership) return { success: false, error: "Kein Zugriff", documentIds: [] };

  const from = new Date(opts.from);
  const to   = new Date(opts.to);
  to.setHours(23, 59, 59, 999);

  try {
    const data = await buildReportData(
      opts.orgId,
      opts.forestOwnerId,
      from,
      to,
      opts.invoiceNumber,
      opts.invoiceDate,
      opts.dueDate,
    );

    if (data.forestGroups.length === 0) {
      return {
        success: false,
        error: "Keine abgeschlossenen Zeiteinträge im gewählten Zeitraum gefunden.",
        documentIds: [],
      };
    }

    // Resolve actual TimeEntry IDs (same filter as buildReportData)
    const timeEntryRecords = await prisma.timeEntry.findMany({
      where: {
        durationMinutes: { gt: 0 },
        startTime: { gte: from, lte: to },
        task: {
          forest: {
            ownerId: opts.forestOwnerId,
            organizationId: opts.orgId,
          },
        },
      },
      select: { id: true, startTime: true },
    });
    const timeEntryIds = timeEntryRecords.map((e) => e.id);

    // Get forest IDs for document records
    const forests = await prisma.forest.findMany({
      where: { organizationId: opts.orgId, ownerId: opts.forestOwnerId },
      select: { id: true, name: true },
    });
    const forestIdMap = new Map(forests.map((f) => [f.name, f.id]));
    const actualForestIds = data.forestGroups
      .map((g) => forestIdMap.get(g.forestName))
      .filter(Boolean) as string[];

    const attachments: { filename: string; content: Buffer }[] = [];
    const documentIds: string[] = [];
    const baseKey = `reports/${opts.orgId}/${opts.forestOwnerId}`;
    const timestamp = Date.now();

    // ── Tätigkeitsnachweis ─────────────────────────────────────────────────
    if (opts.includeActivityReport) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buf = await renderToBuffer(React.createElement(ActivityReportPdf, { data }) as any);
      const key = `${baseKey}/taetigkeitsnachweis_${timestamp}.pdf`;
      await storeBuffer(buf, key);

      const doc = await prisma.orgDocument.create({
        data: {
          organizationId: opts.orgId,
          forestOwnerId: opts.forestOwnerId,
          type: "ACTIVITY_REPORT",
          title: `Tätigkeitsnachweis ${data.periodFrom} – ${data.periodTo} · ${data.owner.name}`,
          storageKey: key,
          fileSize: buf.length,
          forestIds: actualForestIds,
          periodFrom: from,
          periodTo: to,
          sentAt: opts.sendEmail ? new Date() : null,
          sentTo: opts.sendEmail ? (data.owner.email ?? null) : null,
        },
      });
      documentIds.push(doc.id);

      attachments.push({
        filename: `Taetigkeitsnachweis_${data.owner.name.replace(/\s+/g, "_")}_${data.periodFrom.replace(/\./g, "-")}.pdf`,
        content: buf,
      });
    }

    // ── Rechnung ───────────────────────────────────────────────────────────
    if (opts.includeInvoice) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buf = await renderToBuffer(React.createElement(InvoicePdf, { data }) as any);
      const key = `${baseKey}/rechnung_${timestamp}.pdf`;
      await storeBuffer(buf, key);

      // Auto-generate invoice number if not provided
      const invNumber = opts.invoiceNumber || await generateInvoiceNumber(opts.orgId);

      // Create Invoice record in DB and mark time entries as billed
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invNumber,
          organizationId: opts.orgId,
          forestOwnerId: opts.forestOwnerId,
          totalAmount: data.totalCost,
          status: opts.sendEmail ? "SENT" : "DRAFT",
          periodFrom: from,
          periodTo: to,
          issuedAt: new Date(),
          sentAt: opts.sendEmail ? new Date() : null,
          note: null,
        },
      });

      // Mark included time entries as billed
      if (timeEntryIds.length > 0) {
        await prisma.timeEntry.updateMany({
          where: { id: { in: timeEntryIds } },
          data: { invoiceId: invoice.id, billedAt: new Date() },
        });
      }

      const doc = await prisma.orgDocument.create({
        data: {
          organizationId: opts.orgId,
          forestOwnerId: opts.forestOwnerId,
          invoiceId: invoice.id,
          type: "INVOICE",
          title: `Rechnung ${invNumber} · ${data.periodFrom} – ${data.periodTo} · ${data.owner.name}`,
          storageKey: key,
          fileSize: buf.length,
          forestIds: actualForestIds,
          periodFrom: from,
          periodTo: to,
          sentAt: opts.sendEmail ? new Date() : null,
          sentTo: opts.sendEmail ? (data.owner.email ?? null) : null,
        },
      });
      documentIds.push(doc.id);

      attachments.push({
        filename: `Rechnung_${data.owner.name.replace(/\s+/g, "_")}_${data.periodFrom.replace(/\./g, "-")}.pdf`,
        content: buf,
      });
    }

    // ── E-Mail versenden ───────────────────────────────────────────────────
    if (opts.sendEmail && data.owner.email && attachments.length > 0) {
      const subject =
        opts.emailSubject ||
        `Ihre Unterlagen für den Zeitraum ${data.periodFrom} – ${data.periodTo}`;

      const bodyText =
        opts.emailMessage ||
        `Sehr geehrte Damen und Herren,\n\nerbeiliegend erhalten Sie die Unterlagen für den Zeitraum ${data.periodFrom} – ${data.periodTo}.\n\nMit freundlichen Grüßen\n${data.org.legalName || data.org.name}`;

      await resend.emails.send({
        from: SENDER,
        to: [data.owner.email],
        subject,
        text: bodyText,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });
    }

    revalidatePath("/dashboard/org", "layout");
    return { success: true, documentIds };
  } catch (err) {
    console.error("[sendReport]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler",
      documentIds: [],
    };
  }
}

async function generateInvoiceNumber(orgId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { organizationId: orgId } });
  const year  = new Date().getFullYear();
  return `RE-${year}-${String(count + 1).padStart(4, "0")}`;
}

/** Read-only preview of the next invoice number — does NOT reserve it. */
export async function peekNextInvoiceNumber(orgId: string): Promise<string> {
  return generateInvoiceNumber(orgId);
}

// ── Forest billing data (for Kostencontrolling panel) ────────────────────────

export type BillableTask = {
  taskId: string;
  taskTitle: string;
  timeEntryIds: string[];
  totalMinutes: number;
  hourlyRate: number | null;
  totalAmount: number;
  hoursDisplay: string;
};

export type ForestBillingData = {
  forestId: string;
  forestName: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  billableTasks: BillableTask[];
  billableMinutes: number;
  billableAmount: number;
  billedMinutes: number;
  billedAmount: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
    totalAmount: number;
    periodFrom: string | null;
    periodTo: string | null;
    createdAt: string;
    documentId: string | null;
    documentStorageKey: string | null;
  }[];
};

function fmtHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function getForestBillingData(
  orgId: string,
  forestId: string
): Promise<ForestBillingData> {
  const [forest, rateCategories] = await Promise.all([
    prisma.forest.findUniqueOrThrow({
      where: { id: forestId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    }),
    prisma.rateCategory.findMany({ where: { organizationId: orgId, isActive: true } }),
  ]);

  const rateCategoryMap = new Map<string, number>(
    rateCategories.map((c) => [c.key ?? c.id, Number(c.hourlyRate)])
  );

  function resolveRate(
    override: number | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rateCategory: { key: string | null; hourlyRate: any } | null,
    category: string
  ): number | null {
    if (override !== null) return override;
    if (rateCategory) return Number(rateCategory.hourlyRate);
    return rateCategoryMap.get(category) ?? null;
  }

  // Load tasks with unbilled time entries
  const tasks = await prisma.task.findMany({
    where: {
      forestId,
      timeEntries: { some: { invoiceId: null, durationMinutes: { gt: 0 } } },
    },
    select: {
      id: true,
      title: true,
      timeEntries: {
        where: { invoiceId: null, durationMinutes: { gt: 0 } },
        select: {
          id: true,
          durationMinutes: true,
          hourlyRateOverride: true,
          category: true,
          rateCategory: { select: { key: true, hourlyRate: true } },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const billableTasks: BillableTask[] = tasks.map((task) => {
    const totalMinutes = task.timeEntries.reduce(
      (s, e) => s + (e.durationMinutes ?? 0),
      0
    );
    // Dominant rate: use the first entry's rate as representative
    const firstEntry = task.timeEntries[0];
    const hourlyRate = firstEntry
      ? resolveRate(
          firstEntry.hourlyRateOverride !== null ? Number(firstEntry.hourlyRateOverride) : null,
          firstEntry.rateCategory,
          firstEntry.category
        )
      : null;
    const totalAmount = task.timeEntries.reduce((s, e) => {
      const mins = e.durationMinutes ?? 0;
      const rate = resolveRate(
        e.hourlyRateOverride !== null ? Number(e.hourlyRateOverride) : null,
        e.rateCategory,
        e.category
      );
      return s + (rate ? (mins / 60) * rate : 0);
    }, 0);

    return {
      taskId: task.id,
      taskTitle: task.title,
      timeEntryIds: task.timeEntries.map((e) => e.id),
      totalMinutes,
      hourlyRate,
      totalAmount,
      hoursDisplay: fmtHours(totalMinutes),
    };
  });

  // Billed stats
  const billedEntries = await prisma.timeEntry.findMany({
    where: {
      invoiceId: { not: null },
      durationMinutes: { gt: 0 },
      task: { forestId },
    },
    select: {
      durationMinutes: true,
      hourlyRateOverride: true,
      category: true,
      rateCategory: { select: { key: true, hourlyRate: true } },
    },
  });

  const billedMinutes = billedEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
  const billedAmount  = billedEntries.reduce((s, e) => {
    const mins = e.durationMinutes ?? 0;
    const rate = resolveRate(
      e.hourlyRateOverride !== null ? Number(e.hourlyRateOverride) : null,
      e.rateCategory,
      e.category
    );
    return s + (rate ? (mins / 60) * rate : 0);
  }, 0);

  // Invoices that contain at least one time entry from this forest
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      timeEntries: { some: { task: { forestId } } },
    },
    include: { document: { select: { id: true, storageKey: true } } },
    orderBy: { createdAt: "desc" },
  });

  const billableMinutes = billableTasks.reduce((s, t) => s + t.totalMinutes, 0);
  const billableAmount  = billableTasks.reduce((s, t) => s + t.totalAmount, 0);

  return {
    forestId,
    forestName: forest.name,
    ownerId: forest.owner?.id ?? null,
    ownerName: forest.owner?.name ?? null,
    ownerEmail: forest.owner?.email ?? null,
    billableTasks,
    billableMinutes,
    billableAmount,
    billedMinutes,
    billedAmount,
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      status: i.status as "DRAFT" | "SENT" | "PAID" | "CANCELLED",
      totalAmount: Number(i.totalAmount),
      periodFrom: i.periodFrom?.toISOString() ?? null,
      periodTo: i.periodTo?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      documentId: i.document?.id ?? null,
      documentStorageKey: i.document?.storageKey ?? null,
    })),
  };
}

// ── Create invoice for a specific forest ─────────────────────────────────────

export type CreateForestInvoiceOptions = {
  orgId: string;
  forestId: string;
  forestOwnerId: string;
  from: string;
  to: string;
  timeEntryIds: string[];
  lineItems: import("@/lib/pdf/types").InvoiceLineItem[];
  totalAmount: number;
  invoiceNumber?: string;
  vatRate?: number | null;
  vatLabel?: string | null;
};

export async function createForestInvoice(
  opts: CreateForestInvoiceOptions
): Promise<{ success: boolean; error?: string; invoiceId?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Nicht autorisiert" };

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: opts.orgId },
  });
  if (!membership) return { success: false, error: "Kein Zugriff" };

  try {
    const from = new Date(opts.from);
    const to   = new Date(opts.to);
    to.setHours(23, 59, 59, 999);

    const invNumber = opts.invoiceNumber || await generateInvoiceNumber(opts.orgId);

    // Build org/owner info for PDF
    const [org, owner] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: opts.orgId } }),
      prisma.forestOwner.findUniqueOrThrow({ where: { id: opts.forestOwnerId } }),
    ]);

    function fmt(d: Date) {
      return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const paymentDays = org.defaultPaymentDays ?? 30;
    const dueDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + paymentDays);
      return fmt(d);
    })();

    const data: import("@/lib/pdf/types").ReportData = {
      org: {
        name: org.name, legalName: org.legalName, street: org.street,
        zip: org.zip, city: org.city, country: org.country,
        email: org.billingEmail, vatId: org.vatId, iban: org.iban,
        bic: org.bic, bankName: org.bankName,
        isKleinunternehmer: org.isKleinunternehmer,
        defaultPaymentDays: org.defaultPaymentDays,
      },
      owner: { name: owner.name, street: owner.street, zip: owner.zip, city: owner.city, email: owner.email },
      periodFrom: fmt(from),
      periodTo: fmt(to),
      forestGroups: [],
      totalMinutes: 0,
      totalCost: opts.totalAmount,
      invoiceNumber: invNumber,
      invoiceDate: fmt(new Date()),
      dueDate,
      lineItemsOverride: opts.lineItems,
      vatRate: opts.vatRate,
      vatLabel: opts.vatLabel,
    };

    // Render PDF
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { InvoicePdf } = await import("@/lib/pdf/InvoicePdf");
    const React = await import("react");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = await renderToBuffer(React.createElement(InvoicePdf, { data }) as any);

    // Store PDF
    const key = `reports/${opts.orgId}/${opts.forestOwnerId}/rechnung_${Date.now()}.pdf`;
    await storeBuffer(buf, key);

    // Create Invoice record
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNumber,
        organizationId: opts.orgId,
        forestOwnerId: opts.forestOwnerId,
        totalAmount: opts.totalAmount,
        status: "DRAFT",
        periodFrom: from,
        periodTo: to,
        issuedAt: new Date(),
      },
    });

    // Mark time entries as billed
    if (opts.timeEntryIds.length > 0) {
      await prisma.timeEntry.updateMany({
        where: { id: { in: opts.timeEntryIds } },
        data: { invoiceId: invoice.id, billedAt: new Date() },
      });
    }

    // Store OrgDocument linked to invoice
    await prisma.orgDocument.create({
      data: {
        organizationId: opts.orgId,
        forestOwnerId: opts.forestOwnerId,
        invoiceId: invoice.id,
        type: "INVOICE",
        title: `Rechnung ${invNumber} · ${data.periodFrom} – ${data.periodTo} · ${owner.name}`,
        storageKey: key,
        fileSize: buf.length,
        forestIds: [opts.forestId],
        periodFrom: from,
        periodTo: to,
      },
    });

    revalidatePath("/dashboard/org", "layout");
    return { success: true, invoiceId: invoice.id };
  } catch (err) {
    console.error("[createForestInvoice]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" };
  }
}

// ── Document archive ─────────────────────────────────────────────────────────

export async function getDocuments(orgId: string, forestOwnerId?: string) {
  return prisma.orgDocument.findMany({
    where: {
      organizationId: orgId,
      ...(forestOwnerId ? { forestOwnerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { forestOwner: { select: { id: true, name: true } } },
  });
}

export async function deleteDocument(docId: string, orgId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false };

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return { success: false };

  // If this document is linked to an invoice, release the invoice's time entries
  const doc = await prisma.orgDocument.findUnique({
    where: { id: docId },
    select: { invoiceId: true },
  });
  if (doc?.invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: doc.invoiceId } });
    if (invoice?.status === "DRAFT") {
      await prisma.timeEntry.updateMany({
        where: { invoiceId: doc.invoiceId },
        data: { invoiceId: null, billedAt: null },
      });
      await prisma.invoice.delete({ where: { id: doc.invoiceId } });
    }
  }

  await prisma.orgDocument.delete({ where: { id: docId } });
  revalidatePath("/dashboard/org", "layout");
  return { success: true };
}
