"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function assertMember(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht angemeldet");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId },
  });
  if (!membership) throw new Error("Kein Mitglied");
  return session.user;
}

export async function createInvoice(
  organizationId: string,
  forestOwnerId: string,
  timeEntryIds: string[],
  totalAmount: number,
  note?: string
) {
  await assertMember(organizationId);

  const count = await prisma.invoice.count({ where: { organizationId } });
  const year = new Date().getFullYear();
  const invoiceNumber = `RE-${year}-${String(count + 1).padStart(4, "0")}`;

  // Zeitraum aus den Einträgen ableiten
  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: timeEntryIds } },
    select: { startTime: true },
    orderBy: { startTime: "asc" },
  });
  const periodFrom = entries[0]?.startTime ?? null;
  const periodTo   = entries[entries.length - 1]?.startTime ?? null;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      organizationId,
      forestOwnerId,
      totalAmount,
      note: note ?? null,
      periodFrom,
      periodTo,
      issuedAt: new Date(),
    },
  });

  await prisma.timeEntry.updateMany({
    where: { id: { in: timeEntryIds } },
    data: { invoiceId: invoice.id, billedAt: new Date() },
  });

  revalidatePath("/dashboard/org", "layout");
  return invoice;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED"
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Rechnung nicht gefunden");
  await assertMember(invoice.organizationId);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "SENT" && { sentAt: new Date() }),
      ...(status === "PAID" && { paidAt: new Date() }),
    },
  });

  revalidatePath("/dashboard/org", "layout");
}

export async function deleteInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Rechnung nicht gefunden");
  if (invoice.status !== "DRAFT") throw new Error("Nur Entwürfe können gelöscht werden");
  await assertMember(invoice.organizationId);

  // Einträge freigeben
  await prisma.timeEntry.updateMany({
    where: { invoiceId },
    data: { invoiceId: null, billedAt: null },
  });
  await prisma.invoice.delete({ where: { id: invoiceId } });

  revalidatePath("/dashboard/org", "layout");
}
