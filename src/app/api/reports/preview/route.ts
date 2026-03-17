import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";
import type { ReportData, OrgInfo, OwnerInfo, InvoiceLineItem } from "@/lib/pdf/types";

type PreviewBody = {
  orgId: string;
  forestOwnerId: string;
  from: string;
  to: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  lineItems: InvoiceLineItem[];
  vatRate?: number;
  vatLabel?: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: PreviewBody = await req.json();
  const { orgId, forestOwnerId, from, to, invoiceNumber, invoiceDate, dueDate, lineItems, vatRate, vatLabel } = body;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [org, owner] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
    prisma.forestOwner.findUniqueOrThrow({ where: { id: forestOwnerId } }),
  ]);

  const paymentDays = org.defaultPaymentDays ?? 30;
  const dueDateFallback = (() => {
    const d = new Date();
    d.setDate(d.getDate() + paymentDays);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  })();

  function fmt(d: Date) {
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const orgInfo: OrgInfo = {
    name: org.name, legalName: org.legalName, street: org.street,
    zip: org.zip, city: org.city, country: org.country,
    email: org.billingEmail, vatId: org.vatId, iban: org.iban,
    bic: org.bic, bankName: org.bankName,
    isKleinunternehmer: org.isKleinunternehmer,
    defaultPaymentDays: org.defaultPaymentDays,
  };
  const ownerInfo: OwnerInfo = {
    name: owner.name, street: owner.street, zip: owner.zip,
    city: owner.city, email: owner.email,
  };

  const totalCost = lineItems.reduce((s, li) => s + li.amount, 0);

  const data: ReportData = {
    org: orgInfo,
    owner: ownerInfo,
    periodFrom: fmt(new Date(from)),
    periodTo: fmt(new Date(to)),
    forestGroups: [],
    totalMinutes: 0,
    totalCost,
    invoiceNumber,
    invoiceDate: invoiceDate ?? fmt(new Date()),
    dueDate: dueDate ?? dueDateFallback,
    lineItemsOverride: lineItems,
    vatRate,
    vatLabel,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(React.createElement(InvoicePdf, { data }) as any);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung_Vorschau.pdf"`,
      "Content-Length": String(buf.length),
    },
  });
}
