import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { buildReportData } from "@/lib/pdf/reportDataBuilder";
import { ActivityReportPdf } from "@/lib/pdf/ActivityReportPdf";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const orgId         = searchParams.get("orgId") ?? "";
  const forestOwnerId = searchParams.get("forestOwnerId") ?? "";
  const fromStr       = searchParams.get("from") ?? "";
  const toStr         = searchParams.get("to") ?? "";
  const type          = searchParams.get("type") ?? "ACTIVITY_REPORT"; // ACTIVITY_REPORT | INVOICE | COMBINED
  const invoiceNumber = searchParams.get("invoiceNumber") ?? undefined;
  const invoiceDate   = searchParams.get("invoiceDate") ?? undefined;
  const dueDate       = searchParams.get("dueDate") ?? undefined;

  if (!orgId || !forestOwnerId || !fromStr || !toStr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Authorisation: user must be a member of the org
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const from = new Date(fromStr);
  const to   = new Date(toStr);
  to.setHours(23, 59, 59, 999);

  const data = await buildReportData(orgId, forestOwnerId, from, to, invoiceNumber, invoiceDate, dueDate);

  let pdfBuffer: Buffer;
  let filename: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = (el: any) => renderToBuffer(el as any);

  if (type === "INVOICE") {
    pdfBuffer = await render(React.createElement(InvoicePdf, { data }));
    filename  = `Rechnung_${data.owner.name.replace(/\s+/g, "_")}_${data.periodFrom.replace(/\./g, "-")}.pdf`;
  } else if (type === "COMBINED") {
    pdfBuffer = await render(React.createElement(ActivityReportPdf, { data }));
    filename  = `Taetigkeitsnachweis_${data.owner.name.replace(/\s+/g, "_")}_${data.periodFrom.replace(/\./g, "-")}.pdf`;
  } else {
    pdfBuffer = await render(React.createElement(ActivityReportPdf, { data }));
    filename  = `Taetigkeitsnachweis_${data.owner.name.replace(/\s+/g, "_")}_${data.periodFrom.replace(/\./g, "-")}.pdf`;
  }

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
