import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const C = {
  dark:        '#1e293b',
  mid:         '#475569',
  light:       '#94a3b8',
  border:      '#e2e8f0',
  accent:      '#166534',
  accentLight: '#f0fdf4',
  green:       '#15803d',
  white:       '#ffffff',
  bg:          '#f8fafc',
  violet:      '#6d28d9',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 8.5, color: C.dark,
    paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40,
  },
  // Page header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  orgName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark },
  orgSub: { fontSize: 7.5, color: C.mid, marginTop: 2 },
  docTitle: { textAlign: 'right' },
  docTitleText: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.green },
  docSub: { fontSize: 7.5, color: C.mid, textAlign: 'right', marginTop: 3 },
  // Compartment header
  compartmentHeader: { backgroundColor: C.accentLight, padding: 10, borderRadius: 4, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compartmentTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.green },
  compartmentForest: { fontSize: 8, color: C.mid, marginTop: 2 },
  areaBadge: { backgroundColor: C.green, color: C.white, fontSize: 9, fontFamily: 'Helvetica-Bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  // Section
  section: { marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLine: { flex: 1, height: 0.5, backgroundColor: C.border, marginLeft: 6 },
  // Grid rows
  row2: { flexDirection: 'row', gap: 10, marginBottom: 3 },
  row3: { flexDirection: 'row', gap: 10, marginBottom: 3 },
  cell: { flex: 1 },
  label: { fontSize: 7, color: C.light, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 1 },
  value: { fontSize: 8.5, color: C.dark, fontFamily: 'Helvetica-Bold' },
  valueMid: { fontSize: 8.5, color: C.mid },
  // Species bar
  speciesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  speciesBadge: { fontSize: 7.5, color: C.dark, backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  // Kennzahlen grid
  kpiGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  kpiBox: { flex: 1, backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, padding: 6, alignItems: 'center' },
  kpiVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark },
  kpiLbl: { fontSize: 6.5, color: C.light, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1 },
  // Note
  noteBox: { backgroundColor: C.bg, borderLeftWidth: 2, borderLeftColor: C.border, paddingHorizontal: 8, paddingVertical: 5, marginTop: 3 },
  noteText: { fontSize: 8, color: C.mid, lineHeight: 1.5 },
  // Plot stats
  plotBox: { borderWidth: 0.5, borderColor: '#ddd6fe', backgroundColor: '#faf5ff', borderRadius: 3, padding: 6, marginBottom: 5 },
  plotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  plotTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.violet },
  plotSub: { fontSize: 7, color: C.mid },
  plotGrid: { flexDirection: 'row', gap: 6 },
  plotCell: { flex: 1, alignItems: 'center' },
  plotVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },
  plotLbl: { fontSize: 6.5, color: C.light, textTransform: 'uppercase' },
  // Yield table
  ytTable: { marginTop: 4 },
  ytRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border, paddingVertical: 3 },
  ytHeader: { backgroundColor: C.bg },
  ytCell: { flex: 1, fontSize: 7.5, color: C.mid, textAlign: 'right' },
  ytCellFirst: { flex: 1.5, fontSize: 7.5, color: C.mid },
  ytValBold: { fontFamily: 'Helvetica-Bold', color: C.dark },
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 6 },
  footerText: { fontSize: 7, color: C.light },
  pageNum: { fontSize: 7, color: C.light },
  // Divider between compartments
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
});

// ─── Helper types ─────────────────────────────────────────────────────────────

export interface ReportSpeciesEntry { species: string; percent: number; label: string; }
export interface ReportRejuvEntry   { species: string; heightCm: number; density: string; label: string; }

export interface ReportInventoryPlot {
  name: string | null;
  radiusM: number;
  measuredAt: string;
  nHa: number;
  gHa: number;
  vHa: number | null;
  dg: number;
  siteClassLabel: string | null;
  stockingDegree: number | null;
}

export interface ReportCompartment {
  name: string;
  number: string | null;
  forestName: string;
  color: string | null;
  areaHa: number | null;
  // Standort
  soilType: string | null;
  waterBalance: string | null;
  nutrientLevel: string | null;
  exposition: string | null;
  slopeClass: string | null;
  protectionStatus: string | null;
  restrictions: string | null;
  // Bestand
  standAge: number | null;
  developmentStage: string | null;
  mixingForm: string | null;
  structure: string | null;
  mainSpecies: ReportSpeciesEntry[];
  sideSpecies: ReportSpeciesEntry[];
  // Kennzahlen
  volumePerHa: number | null;
  incrementPerHa: number | null;
  stockingDegree: number | null;
  deadwoodPerHa: number | null;
  yieldClass: number | null;
  siteProductivity: string | null;
  // Verjüngung
  rejuvenation: ReportRejuvEntry[];
  // Zustand
  vitalityNote: string | null;
  damageNote: string | null;
  stabilityNote: string | null;
  // Bewirtschaftung
  lastMeasureDate: string | null;
  lastMeasureType: string | null;
  maintenanceStatus: string | null;
  accessibility: string | null;
  note: string | null;
  // Inventur
  plots: ReportInventoryPlot[];
  treeCount: number;
}

export interface ForsteinrichtungPdfData {
  orgName: string;
  generatedAt: string;
  compartments: ReportCompartment[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={s.row2}>
      <View style={s.cell}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{value}</Text>
      </View>
    </View>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <View style={s.row2}>{children}</View>;
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <View style={s.row3}>{children}</View>;
}

function Cell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text style={value ? s.value : s.valueMid}>{value ?? '–'}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function CompartmentPage({ c, orgName, generatedAt }: { c: ReportCompartment; orgName: string; generatedAt: string }) {
  const title = `${c.number ? `[${c.number}] ` : ''}${c.name}`;
  const f = (n: number | null, u?: string) => n == null ? '–' : `${n}${u ? ' ' + u : ''}`;

  return (
    <>
      {/* Compartment header */}
      <View style={s.compartmentHeader}>
        <View>
          <Text style={s.compartmentTitle}>{title}</Text>
          <Text style={s.compartmentForest}>{c.forestName}</Text>
        </View>
        {c.areaHa != null && <Text style={s.areaBadge}>{c.areaHa.toFixed(2)} ha</Text>}
      </View>

      {/* Standort */}
      <View style={s.section}>
        <SectionHeader title="Standort" />
        <Grid2>
          <Cell label="Bodentyp" value={c.soilType} />
          <Cell label="Wasserhaushalt" value={c.waterBalance} />
        </Grid2>
        <Grid3>
          <Cell label="Nährstoffstufe" value={c.nutrientLevel} />
          <Cell label="Exposition" value={c.exposition} />
          <Cell label="Hangneigung" value={c.slopeClass} />
        </Grid3>
        {(c.protectionStatus || c.restrictions) && (
          <Grid2>
            <Cell label="Schutzstatus" value={c.protectionStatus} />
            <Cell label="Restriktionen" value={c.restrictions} />
          </Grid2>
        )}
      </View>

      {/* Bestand */}
      <View style={s.section}>
        <SectionHeader title="Bestand" />
        <Grid3>
          <Cell label="Alter" value={c.standAge != null ? `${c.standAge} Jahre` : null} />
          <Cell label="Entwicklungsstufe" value={c.developmentStage} />
          <Cell label="Mischungsform" value={c.mixingForm} />
        </Grid3>
        {c.mainSpecies.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={s.label}>Hauptbaumarten</Text>
            <View style={s.speciesRow}>
              {c.mainSpecies.map((e, i) => (
                <Text key={i} style={s.speciesBadge}>{e.label}{e.percent ? ` ${e.percent}%` : ''}</Text>
              ))}
            </View>
          </View>
        )}
        {c.sideSpecies.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <Text style={s.label}>Nebenbaumarten</Text>
            <View style={s.speciesRow}>
              {c.sideSpecies.map((e, i) => (
                <Text key={i} style={s.speciesBadge}>{e.label}{e.percent ? ` ${e.percent}%` : ''}</Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Kennzahlen */}
      <View style={s.section}>
        <SectionHeader title="Kennzahlen" />
        <View style={s.kpiGrid}>
          <View style={s.kpiBox}><Text style={s.kpiVal}>{f(c.volumePerHa)}</Text><Text style={s.kpiLbl}>Vorrat m³/ha</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiVal}>{f(c.incrementPerHa)}</Text><Text style={s.kpiLbl}>Zuwachs m³/ha/a</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiVal}>{c.stockingDegree?.toFixed(2) ?? '–'}</Text><Text style={s.kpiLbl}>Bestockungsgrad</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiVal}>{f(c.deadwoodPerHa)}</Text><Text style={s.kpiLbl}>Totholz m³/ha</Text></View>
          <View style={s.kpiBox}><Text style={s.kpiVal}>{c.yieldClass != null ? `EKL ${c.yieldClass}` : '–'}</Text><Text style={s.kpiLbl}>Bonität</Text></View>
        </View>
        {c.areaHa != null && c.volumePerHa != null && (
          <Grid2>
            <Cell label="Gesamtvorrat" value={`${Math.round(c.volumePerHa * c.areaHa)} m³`} />
            {c.incrementPerHa != null && <Cell label="Gesamtzuwachs/Jahr" value={`${Math.round(c.incrementPerHa * c.areaHa)} m³`} />}
          </Grid2>
        )}
      </View>

      {/* Verjüngung */}
      {c.rejuvenation.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Verjüngung" />
          <View style={s.speciesRow}>
            {c.rejuvenation.map((r, i) => (
              <Text key={i} style={s.speciesBadge}>
                {r.label}{r.heightCm ? ` ${r.heightCm} cm` : ''}{r.density ? ` · ${r.density}` : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Probekreise */}
      {c.plots.length > 0 && (
        <View style={s.section}>
          <SectionHeader title={`Probekreise (${c.plots.length})`} />
          {c.plots.map((p, i) => (
            <View key={i} style={s.plotBox}>
              <View style={s.plotHeader}>
                <Text style={s.plotTitle}>{p.name || `Plot ${i + 1}`}</Text>
                <Text style={s.plotSub}>r = {p.radiusM} m · {new Date(p.measuredAt).toLocaleDateString('de-DE')}</Text>
              </View>
              <View style={s.plotGrid}>
                <View style={s.plotCell}><Text style={s.plotVal}>{p.nHa}</Text><Text style={s.plotLbl}>N/ha</Text></View>
                <View style={s.plotCell}><Text style={s.plotVal}>{p.gHa.toFixed(1)}</Text><Text style={s.plotLbl}>G/ha m²</Text></View>
                <View style={s.plotCell}><Text style={s.plotVal}>{p.vHa != null ? Math.round(p.vHa) : '–'}</Text><Text style={s.plotLbl}>V/ha m³</Text></View>
                <View style={s.plotCell}><Text style={s.plotVal}>{p.dg.toFixed(1)}</Text><Text style={s.plotLbl}>Dg cm</Text></View>
                {p.stockingDegree != null && <View style={s.plotCell}><Text style={s.plotVal}>{p.stockingDegree.toFixed(2)}</Text><Text style={s.plotLbl}>Bstg.</Text></View>}
                {p.siteClassLabel && <View style={s.plotCell}><Text style={s.plotVal}>{p.siteClassLabel}</Text><Text style={s.plotLbl}>Bonität</Text></View>}
              </View>
            </View>
          ))}
          {c.treeCount > 0 && <Text style={{ fontSize: 7.5, color: C.mid, marginTop: 2 }}>{c.treeCount} Einzelbäume erfasst</Text>}
        </View>
      )}

      {/* Zustand */}
      {(c.vitalityNote || c.damageNote || c.stabilityNote) && (
        <View style={s.section}>
          <SectionHeader title="Zustand" />
          {c.vitalityNote  && <Row label="Vitalität / Kronenzustand" value={c.vitalityNote} />}
          {c.damageNote    && <Row label="Schäden" value={c.damageNote} />}
          {c.stabilityNote && <Row label="Stabilität / Risiko" value={c.stabilityNote} />}
        </View>
      )}

      {/* Bewirtschaftung */}
      <View style={s.section}>
        <SectionHeader title="Bewirtschaftung" />
        <Grid3>
          <Cell label="Letzte Maßnahme" value={c.lastMeasureDate ? `${c.lastMeasureDate}${c.lastMeasureType ? ' · ' + c.lastMeasureType : ''}` : null} />
          <Cell label="Pflegezustand" value={c.maintenanceStatus} />
          <Cell label="Befahrbarkeit" value={c.accessibility} />
        </Grid3>
      </View>

      {/* Notiz */}
      {c.note && (
        <View style={s.section}>
          <SectionHeader title="Notiz" />
          <View style={s.noteBox}><Text style={s.noteText}>{c.note}</Text></View>
        </View>
      )}
    </>
  );
}

// ─── Main PDF document ────────────────────────────────────────────────────────

export function ForsteinrichtungPdf({ data }: { data: ForsteinrichtungPdfData }) {
  return (
    <Document title={`Forsteinrichtung – ${data.orgName}`} author="Forest Manager" creator="forest-manager.eu">
      {data.compartments.map((c, idx) => (
        <Page key={idx} size="A4" style={s.page}>
          {/* Page header */}
          <View style={s.pageHeader} fixed>
            <View>
              <Text style={s.orgName}>{data.orgName}</Text>
              <Text style={s.orgSub}>Forsteinrichtung · Stand {data.generatedAt}</Text>
            </View>
            <View style={s.docTitle}>
              <Text style={s.docTitleText}>FORSTEINRICHTUNG</Text>
              <Text style={s.docSub}>Forest Manager · forest-manager.eu</Text>
            </View>
          </View>

          <CompartmentPage c={c} orgName={data.orgName} generatedAt={data.generatedAt} />

          {/* Footer */}
          <View style={s.footer} fixed>
            <Text style={s.footerText}>{data.orgName} · Forsteinrichtung {data.generatedAt}</Text>
            <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
