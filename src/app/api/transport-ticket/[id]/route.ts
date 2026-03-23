import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ticket = await prisma.transportTicket.findUnique({
    where: { id },
    include: {
      timberSale: {
        include: {
          operation: {
            include: { forest: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!ticket) {
    return new NextResponse("Lieferschein nicht gefunden", { status: 404 });
  }

  const sale      = ticket.timberSale;
  const operation = sale?.operation;
  const forest    = operation?.forest;

  const fmtDate = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const fmtAmt = (v: number | null | undefined, unit?: string | null) =>
    v != null ? `${v.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${unit ?? "fm"}` : "—";

  const diff = ticket.forestAmount
    ? (() => {
        const d = ticket.factoryAmount - ticket.forestAmount;
        const pct = ((d / ticket.forestAmount) * 100).toFixed(1);
        const sign = d >= 0 ? "+" : "";
        return { label: `${sign}${d.toFixed(3)} fm (${sign}${pct} %)`, isNeg: d < 0 && Math.abs(d / ticket.forestAmount) > 0.03 };
      })()
    : null;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lieferschein ${ticket.ticketNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: #fff;
      padding: 12mm 15mm;
    }
    @page { size: A4 portrait; margin: 12mm 15mm; }
    @media print { body { padding: 0; } .no-print { display: none; } }

    h1 { font-size: 18pt; font-weight: bold; letter-spacing: 0.5px; }
    h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #444; margin-bottom: 4px; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 14px; }
    .header-left h1 { margin-bottom: 2px; }
    .header-left .sub { font-size: 9pt; color: #666; }
    .ticket-nr { font-size: 22pt; font-weight: bold; font-family: monospace; color: #166534; text-align: right; }
    .ticket-date { font-size: 9pt; color: #555; text-align: right; }

    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .box { border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 10px; }
    .box-label { font-size: 8pt; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 2px; }
    .box-value { font-size: 11pt; font-weight: bold; }
    .box-value.mono { font-family: monospace; }
    .box-value.large { font-size: 14pt; }
    .box-sub { font-size: 8.5pt; color: #666; margin-top: 1px; }

    .meas-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .meas-table th { background: #f3f4f6; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; color: #555; padding: 5px 10px; text-align: left; border: 1px solid #e5e7eb; }
    .meas-table td { padding: 7px 10px; border: 1px solid #e5e7eb; font-size: 11pt; }
    .meas-table .mono { font-family: monospace; font-weight: bold; }
    .meas-table .important { background: #eff6ff; font-weight: bold; color: #1d4ed8; }
    .meas-table .diff-neg { color: #dc2626; }
    .meas-table .diff-ok  { color: #6b7280; }

    .eudr-box { border: 2px solid #16a34a; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; background: #f0fdf4; }
    .eudr-box .eudr-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; margin-bottom: 4px; }
    .eudr-box .eudr-ref   { font-family: monospace; font-size: 13pt; font-weight: bold; color: #15803d; letter-spacing: 1px; }
    .eudr-box .eudr-law   { font-size: 8pt; color: #4ade80; color: #166534; margin-top: 3px; }
    .eudr-missing { border: 2px solid #f59e0b; background: #fffbeb; }
    .eudr-missing .eudr-title { color: #92400e; }
    .eudr-missing .eudr-ref   { color: #b45309; font-size: 11pt; }

    .note-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; margin-bottom: 14px; background: #fafafa; }
    .note-box .note-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }

    .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .sig-box { border-top: 1px solid #9ca3af; padding-top: 4px; }
    .sig-label { font-size: 8.5pt; color: #666; }

    .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 8pt; color: #9ca3af; display: flex; justify-content: space-between; }

    .print-btn {
      position: fixed; bottom: 20px; right: 20px;
      background: #166534; color: white; border: none; border-radius: 6px;
      padding: 10px 20px; font-size: 13pt; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-btn:hover { background: #15803d; }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>Holz-Lieferschein</h1>
      <div class="sub">
        ${forest?.name ? `Waldbesitz: <strong>${forest.name}</strong>` : ""}
        ${operation?.title ? ` &middot; Maßnahme: ${operation.title} (${operation.year ?? ""})` : ""}
      </div>
    </div>
    <div>
      <div class="ticket-nr">${ticket.ticketNumber}</div>
      <div class="ticket-date">Abfuhrdatum: ${fmtDate(ticket.pickupDate)}</div>
      ${sale?.contractNumber ? `<div class="ticket-date">Vertrag: ${sale.contractNumber}</div>` : ""}
    </div>
  </div>

  <!-- Käufer & Fahrzeug -->
  <div class="grid2">
    <div class="box">
      <div class="box-label">Empfänger / Käufer</div>
      <div class="box-value large">${sale?.buyerName ?? "—"}</div>
    </div>
    <div class="box">
      <div class="box-label">Fahrzeug / Spediteur</div>
      <div class="box-value mono">${ticket.plateNumber ?? "—"}</div>
      ${ticket.driverName  ? `<div class="box-sub">Fahrer: ${ticket.driverName}</div>` : ""}
      ${ticket.carrierName ? `<div class="box-sub">Spediteur: ${ticket.carrierName}</div>` : ""}
    </div>
  </div>

  <!-- Mengen -->
  <h2>Mengennachweis</h2>
  <table class="meas-table">
    <thead>
      <tr>
        <th>Messung</th>
        <th>Menge</th>
        <th>Einheit</th>
        <th>Bemerkung</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Waldmaß (Forstmaß)</td>
        <td class="mono">${ticket.forestAmount != null ? ticket.forestAmount.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—"}</td>
        <td>${ticket.forestUnit ?? "fm"}</td>
        <td style="font-size:8.5pt;color:#666">Ermittelt im Wald durch Forstpersonal</td>
      </tr>
      <tr class="important">
        <td><strong>Werksmaß (maßgeblich)</strong></td>
        <td class="mono">${ticket.factoryAmount.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
        <td>${ticket.factoryUnit ?? "fm"}</td>
        <td style="font-size:8.5pt">Grundlage der Abrechnung</td>
      </tr>
      ${diff ? `<tr>
        <td colspan="2" style="font-size:9pt;color:#555">Differenz Werksmaß − Waldmaß</td>
        <td colspan="2" class="mono ${diff.isNeg ? "diff-neg" : "diff-ok"}">${diff.label}</td>
      </tr>` : ""}
    </tbody>
  </table>

  <!-- EUDR -->
  <div class="eudr-box${sale?.eudrReference ? "" : " eudr-missing"}">
    <div class="eudr-title">EUDR-Sorgfaltserklärung (Verordnung EU 2023/1115)</div>
    <div class="eudr-ref">${sale?.eudrReference ?? "Referenznummer nicht eingetragen"}</div>
    <div class="eudr-law">
      ${sale?.eudrReference
        ? "Referenznummer der eingereichten Due-Diligence-Erklärung (DDS) gemäß Art. 4 VO (EU) 2023/1115."
        : "Hinweis: Die EUDR-Referenznummer fehlt. Bitte vor Weitergabe des Lieferscheins ergänzen."}
    </div>
  </div>

  <!-- Notiz -->
  ${ticket.note ? `
  <div class="note-box">
    <div class="note-label">Bemerkungen</div>
    <div>${ticket.note}</div>
  </div>` : ""}

  <!-- Unterschriften -->
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Auslieferung bestätigt (Waldbesitzer / Förster)</div>
      <br /><br />
      <div style="font-size:8.5pt;color:#aaa">Datum &amp; Unterschrift</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Empfang bestätigt (Fahrer / Käufer)</div>
      <br /><br />
      <div style="font-size:8.5pt;color:#aaa">Datum &amp; Unterschrift</div>
    </div>
  </div>

  <div class="footer">
    <span>Erstellt: ${fmtDate(ticket.createdAt)}</span>
    <span>Forest Manager &middot; Lieferschein ${ticket.ticketNumber}</span>
  </div>

  <button class="print-btn no-print" onclick="window.print()">&#128438; Drucken / PDF</button>

  <script>
    // Auto-print when opened via toolbar button
    // Comment out the line below if you prefer manual print:
    // window.onload = () => window.print();
  </script>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
