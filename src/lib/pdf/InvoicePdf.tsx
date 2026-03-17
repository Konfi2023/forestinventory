import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportData } from "./types";

const C = {
  dark: "#1e293b", mid: "#475569", light: "#94a3b8",
  border: "#e2e8f0", accent: "#166534", accentLight: "#f0fdf4",
  white: "#ffffff", bg: "#f8fafc", red: "#dc2626",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: C.dark, backgroundColor: C.white, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 45 },
  // Header stripe
  topStripe: { backgroundColor: C.accent, height: 4, position: "absolute", top: 0, left: 0, right: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32, marginTop: 16 },
  orgBlock: {},
  orgName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 4 },
  orgDetail: { fontSize: 8, color: C.mid, lineHeight: 1.6 },
  invoiceBlock: { alignItems: "flex-end" },
  invoiceLabel: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.accent, letterSpacing: 1, marginBottom: 8 },
  invoiceMeta: { fontSize: 8.5, color: C.mid, textAlign: "right", lineHeight: 1.7 },
  invoiceMetaKey: { color: C.light },
  // Addresses side by side
  addressRow: { flexDirection: "row", gap: 40, marginBottom: 28, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  addressBlock: { flex: 1 },
  addressLabel: { fontSize: 7, color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  addressName: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 },
  addressLine: { fontSize: 8.5, color: C.mid, lineHeight: 1.6 },
  // Line items table
  tableHead: { flexDirection: "row", backgroundColor: C.dark, padding: "5 8", borderRadius: 3, marginBottom: 1 },
  thCell: { fontSize: 7, color: C.white, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", padding: "5 8", borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: C.bg },
  tdPos:   { width: "5%", fontSize: 8, color: C.light },
  tdDesc:  { width: "45%", fontSize: 8.5, color: C.dark, paddingRight: 8 },
  tdQty:   { width: "15%", textAlign: "right", fontSize: 8.5, color: C.mid },
  tdRate:  { width: "15%", textAlign: "right", fontSize: 8.5, color: C.mid },
  tdAmt:   { width: "20%", textAlign: "right", fontSize: 8.5, color: C.dark, fontFamily: "Helvetica-Bold" },
  // Totals
  totalsSection: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 0, marginBottom: 3, width: "45%" },
  totalLabel: { flex: 1, fontSize: 8.5, color: C.mid, textAlign: "right", paddingRight: 16 },
  totalValue: { width: 80, fontSize: 8.5, color: C.dark, textAlign: "right" },
  totalNetRow: { flexDirection: "row", width: "45%", paddingTop: 6, marginTop: 3, borderTopWidth: 0.5, borderTopColor: C.border },
  totalNetLabel: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "right", paddingRight: 16 },
  totalNetValue: { width: 80, fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "right" },
  grossRow: { flexDirection: "row", width: "45%", backgroundColor: C.accent, padding: "6 8", borderRadius: 3, marginTop: 4 },
  grossLabel: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: C.white, textAlign: "right", paddingRight: 16 },
  grossValue: { width: 80, fontSize: 10, fontFamily: "Helvetica-Bold", color: C.white, textAlign: "right" },
  kleinNote: { fontSize: 7.5, color: C.mid, marginTop: 8, width: "45%", textAlign: "right", lineHeight: 1.5 },
  // Payment
  paymentBox: { marginTop: 24, padding: 12, backgroundColor: C.bg, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: C.accent },
  paymentTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  paymentRow: { flexDirection: "row", gap: 0, marginBottom: 3 },
  paymentKey: { width: 80, fontSize: 8, color: C.light },
  paymentVal: { flex: 1, fontSize: 8, color: C.dark, fontFamily: "Helvetica-Bold" },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 45, right: 45 },
  footerDivider: { borderTopWidth: 0.5, borderTopColor: C.border, marginBottom: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: C.light },
});

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtH(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function InvoicePdf({ data }: { data: ReportData }) {
  // vatRate from data (percentage like 19), null/undefined = Kleinunternehmer or explicitly no VAT
  const vatRatePct = data.org.isKleinunternehmer ? null : (data.vatRate ?? null);
  const vatLabel   = data.vatLabel ?? (vatRatePct ? `${vatRatePct.toLocaleString("de-DE", { minimumFractionDigits: 1 })} % MwSt.` : null);
  const net   = data.totalCost;
  const vat   = vatRatePct !== null ? Math.round(net * (vatRatePct / 100) * 100) / 100 : 0;
  const gross = Math.round((net + vat) * 100) / 100;

  // Line items: use explicit override if provided, otherwise one per forest group
  const lineItems = data.lineItemsOverride && data.lineItemsOverride.length > 0
    ? data.lineItemsOverride
    : data.forestGroups.map((g, i) => ({
        pos: String(i + 1).padStart(2, "0"),
        desc: `Forstliche Dienstleistungen – ${g.forestName}\nLeistungszeitraum: ${data.periodFrom} – ${data.periodTo}`,
        qty: fmtH(g.totalMinutes),
        rate: "pauschal",
        amount: g.totalCost,
      }));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topStripe} fixed />

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.orgBlock}>
            <Text style={s.orgName}>{data.org.legalName || data.org.name}</Text>
            <Text style={s.orgDetail}>
              {[data.org.street, `${data.org.zip || ""} ${data.org.city || ""}`.trim(), data.org.email].filter(Boolean).join("\n")}
            </Text>
            {data.org.vatId && <Text style={[s.orgDetail, { marginTop: 4 }]}>USt-IdNr.: {data.org.vatId}</Text>}
          </View>
          <View style={s.invoiceBlock}>
            <Text style={s.invoiceLabel}>RECHNUNG</Text>
            <Text style={s.invoiceMeta}>
              <Text style={s.invoiceMetaKey}>Rechnungs-Nr.: </Text>{data.invoiceNumber || "—"}{"\n"}
              <Text style={s.invoiceMetaKey}>Rechnungsdatum: </Text>{data.invoiceDate || "—"}{"\n"}
              <Text style={s.invoiceMetaKey}>Fällig am: </Text>{data.dueDate || "—"}{"\n"}
              <Text style={s.invoiceMetaKey}>Leistungszeitraum: </Text>{data.periodFrom} – {data.periodTo}
            </Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={s.addressRow}>
          <View style={s.addressBlock}>
            <Text style={s.addressLabel}>Rechnungsempfänger</Text>
            <Text style={s.addressName}>{data.owner.name}</Text>
            <Text style={s.addressLine}>
              {[data.owner.street, `${data.owner.zip || ""} ${data.owner.city || ""}`.trim()].filter(Boolean).join("\n")}
            </Text>
          </View>
          <View style={s.addressBlock}>
            <Text style={s.addressLabel}>Rechnungssteller</Text>
            <Text style={s.addressName}>{data.org.legalName || data.org.name}</Text>
            <Text style={s.addressLine}>
              {[data.org.street, `${data.org.zip || ""} ${data.org.city || ""}`.trim(), data.org.email].filter(Boolean).join("\n")}
            </Text>
          </View>
        </View>

        {/* Table header */}
        <View style={s.tableHead}>
          <Text style={[s.thCell, s.tdPos]}>Pos.</Text>
          <Text style={[s.thCell, s.tdDesc]}>Leistungsbeschreibung</Text>
          <Text style={[s.thCell, s.tdQty]}>Aufwand</Text>
          <Text style={[s.thCell, s.tdRate]}>Art</Text>
          <Text style={[s.thCell, s.tdAmt]}>Betrag</Text>
        </View>

        {lineItems.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.tdPos}>{item.pos}</Text>
            <Text style={s.tdDesc}>{item.desc}</Text>
            <Text style={s.tdQty}>{item.qty}</Text>
            <Text style={s.tdRate}>{item.rate}</Text>
            <Text style={s.tdAmt}>{fmtEur(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Nettobetrag</Text>
            <Text style={s.totalValue}>{fmtEur(net)}</Text>
          </View>
          {vatRatePct !== null && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>zzgl. {vatLabel}</Text>
              <Text style={s.totalValue}>{fmtEur(vat)}</Text>
            </View>
          )}
          <View style={s.grossRow}>
            <Text style={s.grossLabel}>Gesamtbetrag</Text>
            <Text style={s.grossValue}>{fmtEur(gross)}</Text>
          </View>
          {data.org.isKleinunternehmer && (
            <Text style={s.kleinNote}>
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
            </Text>
          )}
          {!data.org.isKleinunternehmer && vatRatePct === null && (
            <Text style={s.kleinNote}>
              Im ausgewiesenen Betrag ist keine Umsatzsteuer enthalten.
            </Text>
          )}
        </View>

        {/* Payment info */}
        {(data.org.iban || data.org.dueDate) && (
          <View style={s.paymentBox}>
            <Text style={s.paymentTitle}>Zahlungsinformationen</Text>
            {data.dueDate && (
              <View style={s.paymentRow}>
                <Text style={s.paymentKey}>Zahlungsziel:</Text>
                <Text style={s.paymentVal}>{data.dueDate} (30 Tage netto)</Text>
              </View>
            )}
            {data.org.iban && (
              <View style={s.paymentRow}>
                <Text style={s.paymentKey}>IBAN:</Text>
                <Text style={s.paymentVal}>{data.org.iban}</Text>
              </View>
            )}
            {data.org.bic && (
              <View style={s.paymentRow}>
                <Text style={s.paymentKey}>BIC:</Text>
                <Text style={s.paymentVal}>{data.org.bic}</Text>
              </View>
            )}
            {data.org.bankName && (
              <View style={s.paymentRow}>
                <Text style={s.paymentKey}>Bank:</Text>
                <Text style={s.paymentVal}>{data.org.bankName}</Text>
              </View>
            )}
            {data.invoiceNumber && (
              <View style={s.paymentRow}>
                <Text style={s.paymentKey}>Verwendungszweck:</Text>
                <Text style={s.paymentVal}>{data.invoiceNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>{data.org.legalName || data.org.name}</Text>
            {data.org.vatId && <Text style={s.footerText}>USt-IdNr.: {data.org.vatId}</Text>}
            <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
