import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { ReportData } from "./types";

const COLORS = {
  dark: "#1e293b",
  mid: "#475569",
  light: "#94a3b8",
  border: "#e2e8f0",
  accent: "#166534",
  accentLight: "#f0fdf4",
  white: "#ffffff",
  bg: "#f8fafc",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: COLORS.dark, backgroundColor: COLORS.white, paddingTop: 40, paddingBottom: 50, paddingHorizontal: 45 },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.dark, marginBottom: 3 },
  orgAddress: { fontSize: 8, color: COLORS.mid, lineHeight: 1.5 },
  docTitle: { textAlign: "right" },
  docTitleText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.accent, letterSpacing: 1 },
  docSubtitle: { fontSize: 8, color: COLORS.mid, marginTop: 4, textAlign: "right" },
  // Recipient block
  recipientBlock: { marginBottom: 24 },
  recipientLabel: { fontSize: 7, color: COLORS.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  recipientName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.dark },
  recipientAddress: { fontSize: 8.5, color: COLORS.mid, lineHeight: 1.5, marginTop: 2 },
  // Meta row
  metaRow: { flexDirection: "row", gap: 32, marginBottom: 24, backgroundColor: COLORS.bg, padding: 10, borderRadius: 4 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 7, color: COLORS.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 9, color: COLORS.dark, fontFamily: "Helvetica-Bold" },
  // Section
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, marginTop: 14 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.accent },
  sectionLine: { flex: 1, height: 0.5, backgroundColor: COLORS.border, marginLeft: 8 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: COLORS.dark, padding: "5 8", borderRadius: 3, marginBottom: 2 },
  tableHeaderCell: { fontSize: 7, color: COLORS.white, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", padding: "4 8", borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tableRowAlt: { backgroundColor: COLORS.bg },
  cell: { fontSize: 8, color: COLORS.mid },
  cellDark: { fontSize: 8, color: COLORS.dark },
  // Columns
  colDate:     { width: "10%" },
  colTask:     { width: "25%", paddingRight: 4 },
  colCat:      { width: "15%" },
  colUser:     { width: "15%" },
  colHours:    { width: "10%", textAlign: "right" },
  colRate:     { width: "12%", textAlign: "right" },
  colAmount:   { width: "13%", textAlign: "right" },
  // Subtotal
  subtotalRow: { flexDirection: "row", backgroundColor: COLORS.accentLight, padding: "5 8", marginTop: 2, borderRadius: 2 },
  subtotalLabel: { flex: 1, fontSize: 8, color: COLORS.accent, fontFamily: "Helvetica-Bold" },
  subtotalValue: { fontSize: 8, color: COLORS.accent, fontFamily: "Helvetica-Bold", textAlign: "right" },
  // Total
  totalBox: { marginTop: 20, borderTopWidth: 1.5, borderTopColor: COLORS.dark, paddingTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 40 },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.dark },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.accent, minWidth: 80, textAlign: "right" },
  // Signature
  signatureArea: { flexDirection: "row", gap: 40, marginTop: 36 },
  signatureBox: { flex: 1 },
  signatureLine: { borderBottomWidth: 0.5, borderBottomColor: COLORS.dark, marginBottom: 4 },
  signatureLabel: { fontSize: 7, color: COLORS.light },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 45, right: 45, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 6 },
  footerText: { fontSize: 7, color: COLORS.light },
  pageNum: { fontSize: 7, color: COLORS.light },
});

function fmtH(mins: number): string {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtEur(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function ActivityReportPdf({ data }: { data: ReportData }) {
  const orgAddr = [data.org.legalName || data.org.name, data.org.street, `${data.org.zip || ""} ${data.org.city || ""}`.trim(), data.org.email].filter(Boolean).join("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.orgName}>{data.org.legalName || data.org.name}</Text>
            <Text style={styles.orgAddress}>{[data.org.street, `${data.org.zip || ""} ${data.org.city || ""}`.trim()].filter(Boolean).join("\n")}</Text>
            {data.org.email && <Text style={[styles.orgAddress, { marginTop: 2 }]}>{data.org.email}</Text>}
          </View>
          <View style={styles.docTitle}>
            <Text style={styles.docTitleText}>TÄTIGKEITSNACHWEIS</Text>
            <Text style={styles.docSubtitle}>Leistungszeitraum: {data.periodFrom} – {data.periodTo}</Text>
            {data.invoiceNumber && <Text style={[styles.docSubtitle, { marginTop: 2 }]}>Zur Rechnung: {data.invoiceNumber}</Text>}
          </View>
        </View>

        {/* Recipient */}
        <View style={styles.recipientBlock}>
          <Text style={styles.recipientLabel}>Auftraggeber</Text>
          <Text style={styles.recipientName}>{data.owner.name}</Text>
          {(data.owner.street || data.owner.city) && (
            <Text style={styles.recipientAddress}>
              {[data.owner.street, `${data.owner.zip || ""} ${data.owner.city || ""}`.trim()].filter(Boolean).join("\n")}
            </Text>
          )}
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Zeitraum</Text><Text style={styles.metaValue}>{data.periodFrom} – {data.periodTo}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Gesamtstunden</Text><Text style={styles.metaValue}>{fmtH(data.totalMinutes)}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Gesamtbetrag</Text><Text style={[styles.metaValue, { color: COLORS.accent }]}>{fmtEur(data.totalCost)}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Wälder</Text><Text style={styles.metaValue}>{data.forestGroups.length}</Text></View>
        </View>

        {/* Forest groups */}
        {data.forestGroups.map((group) => (
          <View key={group.forestName} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🌲 {group.forestName}</Text>
              <View style={styles.sectionLine} />
            </View>

            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Datum</Text>
              <Text style={[styles.tableHeaderCell, styles.colTask]}>Tätigkeit</Text>
              <Text style={[styles.tableHeaderCell, styles.colCat]}>Kategorie</Text>
              <Text style={[styles.tableHeaderCell, styles.colUser]}>Mitarbeiter</Text>
              <Text style={[styles.tableHeaderCell, styles.colHours]}>Stunden</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>Satz</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Betrag</Text>
            </View>

            {group.entries.map((entry, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.cell, styles.colDate]}>{entry.date}</Text>
                <Text style={[styles.cellDark, styles.colTask]}>{entry.taskTitle}</Text>
                <Text style={[styles.cell, styles.colCat]}>{entry.category}</Text>
                <Text style={[styles.cell, styles.colUser]}>{entry.userName}</Text>
                <Text style={[styles.cell, styles.colHours]}>{fmtH(entry.minutes)}</Text>
                <Text style={[styles.cell, styles.colRate]}>{entry.hourlyRate ? `${entry.hourlyRate} €/h` : "—"}</Text>
                <Text style={[styles.cellDark, styles.colAmount]}>{entry.cost > 0 ? fmtEur(entry.cost) : "—"}</Text>
              </View>
            ))}

            {/* Subtotal */}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Zwischensumme {group.forestName}</Text>
              <Text style={[styles.subtotalValue, { width: "10%", textAlign: "right" }]}>{fmtH(group.totalMinutes)}</Text>
              <Text style={[styles.subtotalValue, { width: "25%", textAlign: "right" }]}>{fmtEur(group.totalCost)}</Text>
            </View>
          </View>
        ))}

        {/* Grand total */}
        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gesamtbetrag (netto)</Text>
            <Text style={styles.totalValue}>{fmtEur(data.totalCost)}</Text>
          </View>
        </View>

        {/* Signature area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Datum, Unterschrift Auftragnehmer</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Datum, Unterschrift Auftraggeber</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.org.legalName || data.org.name} · Tätigkeitsnachweis {data.periodFrom} – {data.periodTo}</Text>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
