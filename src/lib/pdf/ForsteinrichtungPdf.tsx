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
  // Summary page styles
  summaryTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.dark, textAlign: 'center', marginBottom: 4 },
  summarySub: { fontSize: 10, color: C.mid, textAlign: 'center', marginBottom: 20 },
  summaryForestName: { fontSize: 9, color: C.mid, textAlign: 'center', marginBottom: 16 },
  kvRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border, paddingVertical: 4, paddingHorizontal: 6 },
  kvLabel: { flex: 2, fontSize: 9, color: C.mid },
  kvValue: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, textAlign: 'right' },
  tblHeader: { flexDirection: 'row', backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 4, paddingHorizontal: 4 },
  tblRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border, paddingVertical: 3, paddingHorizontal: 4 },
  tblRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border, paddingVertical: 3, paddingHorizontal: 4, backgroundColor: '#f8fafc' },
  tblRowTotal: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.dark, paddingVertical: 4, paddingHorizontal: 4, backgroundColor: C.bg },
  tblCellL: { flex: 2, fontSize: 8, color: C.mid },
  tblCellR: { flex: 1, fontSize: 8, color: C.dark, textAlign: 'right' },
  tblCellBold: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark, textAlign: 'right' },
  tblCellLBold: { flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark },
  tblHeaderCell: { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.accent, textTransform: 'uppercase', textAlign: 'right' },
  tblHeaderCellL: { flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.accent, textTransform: 'uppercase' },
  barContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  barLabel: { width: 80, fontSize: 7.5, color: C.mid },
  barTrack: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 2 },
  barFill: { height: 8, borderRadius: 2 },
  barValue: { width: 50, fontSize: 7.5, color: C.dark, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
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

export interface ReportPlannedMeasure { type: string; year: number; note: string; }

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
  altitude: number | null;
  siteUnit: string | null;
  forestFunction: string | null;
  protectionStatus: string | null;
  restrictions: string | null;
  // Bestand
  standAge: number | null;
  developmentStage: string | null;
  standTypeCode: string | null;
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
  // Planung
  plannedMeasures: ReportPlannedMeasure[];
  plannedHarvestVolume: number | null;
  note: string | null;
  // Inventur
  plots: ReportInventoryPlot[];
  treeCount: number;
}

export interface ReportForest {
  name: string;
  planningPeriodStart: number | null;
  planningPeriodEnd: number | null;
  annualHarvestTarget: number | null;
  compartments: ReportCompartment[];
}

export interface ForsteinrichtungPdfData {
  orgName: string;
  generatedAt: string;
  forests: ReportForest[];
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
        <Grid3>
          <Cell label="Bodentyp" value={c.soilType} />
          <Cell label="Höhenlage" value={c.altitude != null ? `${c.altitude} m ü. NN` : null} />
          <Cell label="Standorteinheit" value={c.siteUnit} />
        </Grid3>
        <Grid3>
          <Cell label="Wasserhaushalt" value={c.waterBalance} />
          <Cell label="Nährstoffstufe" value={c.nutrientLevel} />
          <Cell label="Exposition" value={c.exposition} />
        </Grid3>
        <Grid3>
          <Cell label="Hangneigung" value={c.slopeClass} />
          <Cell label="Waldfunktion" value={c.forestFunction} />
          <Cell label="Schutzstatus" value={c.protectionStatus} />
        </Grid3>
        {c.restrictions && (
          <Grid2>
            <Cell label="Restriktionen / Auflagen" value={c.restrictions} />
            <Cell label="" value={null} />
          </Grid2>
        )}
      </View>

      {/* Bestand */}
      <View style={s.section}>
        <SectionHeader title="Bestand" />
        <Grid3>
          <Cell label="Alter" value={c.standAge != null ? `${c.standAge} Jahre` : null} />
          <Cell label="Bestandestyp" value={c.standTypeCode} />
          <Cell label="Entwicklungsstufe" value={c.developmentStage} />
        </Grid3>
        <Grid3>
          <Cell label="Mischungsform" value={c.mixingForm} />
          <Cell label="Struktur" value={c.structure} />
          <Cell label="" value={null} />
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

      {/* Planung */}
      {(c.plannedHarvestVolume != null || c.plannedMeasures.length > 0) && (
        <View style={s.section}>
          <SectionHeader title="Planung" />
          {c.plannedHarvestVolume != null && (
            <Grid2>
              <Cell label="Geplanter Einschlag" value={`${c.plannedHarvestVolume} Vfm`} />
              <Cell label="" value={null} />
            </Grid2>
          )}
          {c.plannedMeasures.length > 0 && (
            <View style={{ marginTop: 3 }}>
              <Text style={s.label}>Geplante Maßnahmen</Text>
              {c.plannedMeasures.map((m, i) => (
                <Text key={i} style={{ fontSize: 8, color: C.mid, marginTop: 1 }}>
                  • {m.type}{m.year ? ` (${m.year})` : ''}{m.note ? ` — ${m.note}` : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

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

// ─── Summary calculations ────────────────────────────────────────────────────

function calcSummary(comps: ReportCompartment[]) {
  const totalAreaHa = comps.reduce((a, c) => a + (c.areaHa ?? 0), 0);
  const totalVolume = comps.reduce((a, c) => a + (c.volumePerHa ?? 0) * (c.areaHa ?? 0), 0);
  const totalIncrement = comps.reduce((a, c) => a + (c.incrementPerHa ?? 0) * (c.areaHa ?? 0), 0);
  const avgVolumePerHa = totalAreaHa > 0 ? totalVolume / totalAreaHa : 0;
  const avgIncrementPerHa = totalAreaHa > 0 ? totalIncrement / totalAreaHa : 0;
  const totalPlannedHarvest = comps.reduce((a, c) => a + (c.plannedHarvestVolume ?? 0), 0);

  // Baumartenanteile
  const speciesMap = new Map<string, { area: number; label: string }>();
  comps.forEach(c => {
    const area = c.areaHa ?? 0;
    (c.mainSpecies ?? []).forEach(e => {
      const prev = speciesMap.get(e.species);
      speciesMap.set(e.species, { area: (prev?.area ?? 0) + area * (e.percent / 100), label: e.label });
    });
  });
  const speciesShares = [...speciesMap.entries()]
    .sort((a, b) => b[1].area - a[1].area)
    .map(([species, { area, label }]) => ({ species, label, area, pct: totalAreaHa > 0 ? (area / totalAreaHa) * 100 : 0 }));

  // Vorrat nach Baumart
  const speciesVolumeMap = new Map<string, { volume: number; increment: number; label: string }>();
  comps.forEach(c => {
    const area = c.areaHa ?? 0;
    const vHa = c.volumePerHa ?? 0;
    const iHa = c.incrementPerHa ?? 0;
    (c.mainSpecies ?? []).forEach(e => {
      const prev = speciesVolumeMap.get(e.species);
      const share = e.percent / 100;
      speciesVolumeMap.set(e.species, {
        volume: (prev?.volume ?? 0) + vHa * area * share,
        increment: (prev?.increment ?? 0) + iHa * area * share,
        label: e.label,
      });
    });
  });
  const speciesVolumes = [...speciesVolumeMap.entries()]
    .sort((a, b) => b[1].volume - a[1].volume)
    .map(([, { volume, increment, label }]) => ({ label, volume, increment }));

  // Altersklassen (20-Jahres-Klassen)
  const ageMap = new Map<number, { area: number; volume: number }>();
  comps.forEach(c => {
    if (c.standAge == null || !c.areaHa) return;
    const cls = Math.floor(c.standAge / 20) * 20;
    const prev = ageMap.get(cls);
    ageMap.set(cls, {
      area: (prev?.area ?? 0) + c.areaHa,
      volume: (prev?.volume ?? 0) + (c.volumePerHa ?? 0) * c.areaHa,
    });
  });
  const ageClasses = [...ageMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([cls, { area, volume }]) => ({ label: `${cls + 1}–${cls + 20}`, area, volume }));

  // Bestockungsgrad
  const withSD = comps.filter(c => c.stockingDegree != null && c.areaHa);
  const totalSDArea = withSD.reduce((a, c) => a + (c.areaHa ?? 0), 0);
  const avgStocking = totalSDArea > 0 ? withSD.reduce((a, c) => a + c.stockingDegree! * (c.areaHa ?? 0), 0) / totalSDArea : null;

  // Totholz
  const withDW = comps.filter(c => c.deadwoodPerHa != null && c.areaHa);
  const totalDWArea = withDW.reduce((a, c) => a + (c.areaHa ?? 0), 0);
  const avgDeadwood = totalDWArea > 0 ? withDW.reduce((a, c) => a + c.deadwoodPerHa! * (c.areaHa ?? 0), 0) / totalDWArea : null;

  // Waldfunktionen
  const functionMap = new Map<string, number>();
  comps.forEach(c => {
    if (!c.forestFunction || !c.areaHa) return;
    functionMap.set(c.forestFunction, (functionMap.get(c.forestFunction) ?? 0) + c.areaHa);
  });
  const functions = [...functionMap.entries()].sort((a, b) => b[1] - a[1]);

  // Entwicklungsstufen
  const devMap = new Map<string, number>();
  comps.forEach(c => {
    if (!c.developmentStage || !c.areaHa) return;
    devMap.set(c.developmentStage, (devMap.get(c.developmentStage) ?? 0) + c.areaHa);
  });
  const devStages = [...devMap.entries()].sort((a, b) => b[1] - a[1]);

  return {
    totalAreaHa, totalVolume, totalIncrement, avgVolumePerHa, avgIncrementPerHa,
    totalPlannedHarvest, speciesShares, speciesVolumes, ageClasses,
    avgStocking, avgDeadwood, functions, devStages,
  };
}

// ─── Page 1: Wirtschaftsbuch / Deckblatt ─────────────────────────────────────

function SummaryPage1({ data, forest, summary }: {
  data: ForsteinrichtungPdfData; forest: ReportForest;
  summary: ReturnType<typeof calcSummary>;
}) {
  const period = forest.planningPeriodStart && forest.planningPeriodEnd
    ? `${forest.planningPeriodStart}–${forest.planningPeriodEnd}` : null;
  const f = (n: number | null | undefined, d = 0, u = '') =>
    n == null ? '–' : `${d > 0 ? n.toFixed(d) : Math.round(n)}${u ? ' ' + u : ''}`;

  return (
    <View>
      <Text style={s.summaryTitle}>Wirtschaftsbuch</Text>
      <Text style={s.summarySub}>{data.orgName}</Text>
      <Text style={s.summaryForestName}>Forstbetrieb {forest.name}, Gesamtbetrieb</Text>

      {period && (
        <View style={[s.kvRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
          <Text style={s.kvLabel}>Planungszeitraum</Text>
          <Text style={s.kvValue}>{period}</Text>
        </View>
      )}
      <View style={s.kvRow}>
        <Text style={s.kvLabel}>Anzahl Abteilungen</Text>
        <Text style={s.kvValue}>{forest.compartments.length}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvLabel}>Gesamtwaldfläche</Text>
        <Text style={s.kvValue}>{f(summary.totalAreaHa, 2, 'ha')}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvLabel}>Gesamtvorrat</Text>
        <Text style={s.kvValue}>{f(summary.totalVolume, 0, 'Vfm')}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvLabel}>Mittlerer Vorrat je ha</Text>
        <Text style={s.kvValue}>{f(summary.avgVolumePerHa, 0, 'm³/ha')}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvLabel}>Gesamtzuwachs (lfd.)</Text>
        <Text style={s.kvValue}>{f(summary.totalIncrement, 0, 'Vfm/a')}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvLabel}>Mittlerer Zuwachs je ha</Text>
        <Text style={s.kvValue}>{f(summary.avgIncrementPerHa, 1, 'm³/ha/a')}</Text>
      </View>
      {forest.annualHarvestTarget != null && (
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Nutzungssatz (jährlich)</Text>
          <Text style={s.kvValue}>{f(forest.annualHarvestTarget, 0, 'Vfm/a')}</Text>
        </View>
      )}
      {summary.totalPlannedHarvest > 0 && (
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Geplanter Einschlag (Planungszeitraum)</Text>
          <Text style={s.kvValue}>{f(summary.totalPlannedHarvest, 0, 'Vfm')}</Text>
        </View>
      )}
      {summary.avgStocking != null && (
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Mittlerer Bestockungsgrad</Text>
          <Text style={s.kvValue}>{summary.avgStocking.toFixed(2)}</Text>
        </View>
      )}
      {summary.avgDeadwood != null && (
        <View style={s.kvRow}>
          <Text style={s.kvLabel}>Mittleres Totholz</Text>
          <Text style={s.kvValue}>{f(summary.avgDeadwood, 1, 'm³/ha')}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Page 2: Waldinventurdaten Teil 1 ────────────────────────────────────────

function SummaryPage2({ data, forest, summary }: {
  data: ForsteinrichtungPdfData; forest: ReportForest;
  summary: ReturnType<typeof calcSummary>;
}) {
  const maxSpeciesArea = Math.max(...summary.speciesShares.map(s => s.area), 1);

  return (
    <View>
      <Text style={s.summaryTitle}>Zusammenstellung wichtiger Waldinventurdaten (Teil 1)</Text>
      <Text style={s.summarySub}>Forstbetrieb {forest.name}, Gesamtbetrieb</Text>

      {/* Entwicklungsstufen */}
      {summary.devStages.length > 0 && (
        <View style={[s.section, { marginTop: 8 }]}>
          <SectionHeader title="Gliederung nach Entwicklungsstufen" />
          <View style={s.tblHeader}>
            <Text style={s.tblHeaderCellL}>Entwicklungsstufe</Text>
            <Text style={s.tblHeaderCell}>Fläche (ha)</Text>
            <Text style={s.tblHeaderCell}>Anteil (%)</Text>
          </View>
          {summary.devStages.map((d, i) => (
            <View key={i} style={i % 2 === 0 ? s.tblRow : s.tblRowAlt}>
              <Text style={s.tblCellL}>{d[0]}</Text>
              <Text style={s.tblCellR}>{d[1].toFixed(1)}</Text>
              <Text style={s.tblCellR}>{summary.totalAreaHa > 0 ? ((d[1] / summary.totalAreaHa) * 100).toFixed(1) : '–'}</Text>
            </View>
          ))}
          <View style={s.tblRowTotal}>
            <Text style={s.tblCellLBold}>Gesamt</Text>
            <Text style={s.tblCellBold}>{summary.devStages.reduce((a, d) => a + d[1], 0).toFixed(1)}</Text>
            <Text style={s.tblCellBold}>100.0</Text>
          </View>
        </View>
      )}

      {/* Baumartenanteile */}
      {summary.speciesShares.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Baumartenflächenanteile" />
          {summary.speciesShares.map((sp, i) => (
            <View key={i} style={s.barContainer}>
              <Text style={s.barLabel}>{sp.label}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${(sp.area / maxSpeciesArea) * 100}%`, backgroundColor: C.green }]} />
              </View>
              <Text style={s.barValue}>{sp.pct.toFixed(1)}%</Text>
              <Text style={[s.barValue, { width: 45 }]}>{sp.area.toFixed(1)} ha</Text>
            </View>
          ))}
        </View>
      )}

      {/* Altersklassenverteilung */}
      {summary.ageClasses.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Altersklassenverteilung" />
          <View style={s.tblHeader}>
            <Text style={s.tblHeaderCellL}>Altersklasse (Jahre)</Text>
            <Text style={s.tblHeaderCell}>Fläche (ha)</Text>
            <Text style={s.tblHeaderCell}>Anteil (%)</Text>
            <Text style={s.tblHeaderCell}>Vorrat (Vfm)</Text>
          </View>
          {summary.ageClasses.map((ac, i) => (
            <View key={i} style={i % 2 === 0 ? s.tblRow : s.tblRowAlt}>
              <Text style={s.tblCellL}>{ac.label}</Text>
              <Text style={s.tblCellR}>{ac.area.toFixed(1)}</Text>
              <Text style={s.tblCellR}>{summary.totalAreaHa > 0 ? ((ac.area / summary.totalAreaHa) * 100).toFixed(1) : '–'}</Text>
              <Text style={s.tblCellR}>{Math.round(ac.volume)}</Text>
            </View>
          ))}
          <View style={s.tblRowTotal}>
            <Text style={s.tblCellLBold}>Gesamt</Text>
            <Text style={s.tblCellBold}>{summary.ageClasses.reduce((a, ac) => a + ac.area, 0).toFixed(1)}</Text>
            <Text style={s.tblCellBold}>100.0</Text>
            <Text style={s.tblCellBold}>{Math.round(summary.ageClasses.reduce((a, ac) => a + ac.volume, 0))}</Text>
          </View>
        </View>
      )}

      {/* Waldfunktionen */}
      {summary.functions.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Waldfunktionen" />
          <View style={s.tblHeader}>
            <Text style={s.tblHeaderCellL}>Funktion</Text>
            <Text style={s.tblHeaderCell}>Fläche (ha)</Text>
            <Text style={s.tblHeaderCell}>Anteil (%)</Text>
          </View>
          {summary.functions.map((fn, i) => (
            <View key={i} style={i % 2 === 0 ? s.tblRow : s.tblRowAlt}>
              <Text style={s.tblCellL}>{fn[0]}</Text>
              <Text style={s.tblCellR}>{fn[1].toFixed(1)}</Text>
              <Text style={s.tblCellR}>{summary.totalAreaHa > 0 ? ((fn[1] / summary.totalAreaHa) * 100).toFixed(1) : '–'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Page 3: Waldinventurdaten Teil 2 (Vorräte + Nutzungsplanung) ────────────

function SummaryPage3({ data, forest, summary }: {
  data: ForsteinrichtungPdfData; forest: ReportForest;
  summary: ReturnType<typeof calcSummary>;
}) {
  const compsWithPlan = forest.compartments.filter(c => c.plannedHarvestVolume || (c.plannedMeasures && c.plannedMeasures.length > 0));

  return (
    <View>
      <Text style={s.summaryTitle}>Waldinventurdaten und Planungsdaten (Teil 2)</Text>
      <Text style={s.summarySub}>Forstbetrieb {forest.name}, Gesamtbetrieb</Text>

      {/* Vorräte nach Baumart */}
      {summary.speciesVolumes.length > 0 && (
        <View style={[s.section, { marginTop: 8 }]}>
          <SectionHeader title="Vorräte und Zuwachs nach Baumart" />
          <View style={s.tblHeader}>
            <Text style={s.tblHeaderCellL}>Baumart</Text>
            <Text style={s.tblHeaderCell}>Vorrat (Vfm)</Text>
            <Text style={s.tblHeaderCell}>Anteil (%)</Text>
            <Text style={s.tblHeaderCell}>Zuwachs (Vfm/a)</Text>
          </View>
          {summary.speciesVolumes.map((sv, i) => (
            <View key={i} style={i % 2 === 0 ? s.tblRow : s.tblRowAlt}>
              <Text style={s.tblCellL}>{sv.label}</Text>
              <Text style={s.tblCellR}>{Math.round(sv.volume)}</Text>
              <Text style={s.tblCellR}>{summary.totalVolume > 0 ? ((sv.volume / summary.totalVolume) * 100).toFixed(1) : '–'}</Text>
              <Text style={s.tblCellR}>{sv.increment.toFixed(1)}</Text>
            </View>
          ))}
          <View style={s.tblRowTotal}>
            <Text style={s.tblCellLBold}>Gesamt</Text>
            <Text style={s.tblCellBold}>{Math.round(summary.totalVolume)}</Text>
            <Text style={s.tblCellBold}>100.0</Text>
            <Text style={s.tblCellBold}>{summary.totalIncrement.toFixed(1)}</Text>
          </View>
        </View>
      )}

      {/* Nutzungsplanung */}
      {compsWithPlan.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Nutzungsplanung je Abteilung" />
          <View style={s.tblHeader}>
            <Text style={[s.tblHeaderCellL, { flex: 0.8 }]}>Nr.</Text>
            <Text style={s.tblHeaderCellL}>Name</Text>
            <Text style={s.tblHeaderCell}>Fläche (ha)</Text>
            <Text style={s.tblHeaderCell}>Einschlag (Vfm)</Text>
            <Text style={[s.tblHeaderCellL, { flex: 3 }]}>Maßnahmen</Text>
          </View>
          {compsWithPlan.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? s.tblRow : s.tblRowAlt}>
              <Text style={[s.tblCellL, { flex: 0.8, fontFamily: 'Helvetica-Bold' }]}>{c.number ?? '–'}</Text>
              <Text style={s.tblCellL}>{c.name || '–'}</Text>
              <Text style={s.tblCellR}>{c.areaHa?.toFixed(1) ?? '–'}</Text>
              <Text style={s.tblCellR}>{c.plannedHarvestVolume ?? '–'}</Text>
              <Text style={[s.tblCellL, { flex: 3 }]}>
                {(c.plannedMeasures ?? []).map(m => `${m.type}${m.year ? ` (${m.year})` : ''}`).join(', ')}
              </Text>
            </View>
          ))}
          {summary.totalPlannedHarvest > 0 && (
            <View style={s.tblRowTotal}>
              <Text style={[s.tblCellLBold, { flex: 0.8 }]} />
              <Text style={s.tblCellLBold}>Gesamt</Text>
              <Text style={s.tblCellBold} />
              <Text style={s.tblCellBold}>{Math.round(summary.totalPlannedHarvest)}</Text>
              <Text style={[s.tblCellL, { flex: 3 }]} />
            </View>
          )}
        </View>
      )}

      {/* Abteilungsübersicht */}
      <View style={s.section}>
        <SectionHeader title="Abteilungsübersicht" />
        <View style={s.tblHeader}>
          <Text style={[s.tblHeaderCellL, { flex: 0.6 }]}>Nr.</Text>
          <Text style={s.tblHeaderCellL}>Name</Text>
          <Text style={s.tblHeaderCell}>ha</Text>
          <Text style={s.tblHeaderCell}>Alter</Text>
          <Text style={s.tblHeaderCell}>V/ha</Text>
          <Text style={s.tblHeaderCell}>iV/ha</Text>
          <Text style={s.tblHeaderCell}>Bstg.</Text>
          <Text style={[s.tblHeaderCellL, { flex: 1.5 }]}>Hauptbaumart</Text>
        </View>
        {forest.compartments.map((c, i) => (
          <View key={i} style={i % 2 === 0 ? s.tblRow : s.tblRowAlt}>
            <Text style={[s.tblCellL, { flex: 0.6, fontFamily: 'Helvetica-Bold' }]}>{c.number ?? '–'}</Text>
            <Text style={s.tblCellL}>{c.name || '–'}</Text>
            <Text style={s.tblCellR}>{c.areaHa?.toFixed(1) ?? '–'}</Text>
            <Text style={s.tblCellR}>{c.standAge ?? '–'}</Text>
            <Text style={s.tblCellR}>{c.volumePerHa != null ? Math.round(c.volumePerHa) : '–'}</Text>
            <Text style={s.tblCellR}>{c.incrementPerHa?.toFixed(1) ?? '–'}</Text>
            <Text style={s.tblCellR}>{c.stockingDegree?.toFixed(2) ?? '–'}</Text>
            <Text style={[s.tblCellL, { flex: 1.5 }]}>{c.mainSpecies[0]?.label ?? '–'}{c.mainSpecies[0]?.percent ? ` ${c.mainSpecies[0].percent}%` : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Shared page wrapper ─────────────────────────────────────────────────────

function PdfPage({ children, data }: { children: React.ReactNode; data: ForsteinrichtungPdfData }) {
  return (
    <Page size="A4" style={s.page}>
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
      {children}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>{data.orgName} · Forsteinrichtung {data.generatedAt}</Text>
        <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Main PDF document ────────────────────────────────────────────────────────

export function ForsteinrichtungPdf({ data }: { data: ForsteinrichtungPdfData }) {
  return (
    <Document title={`Forsteinrichtung – ${data.orgName}`} author="Forest Manager" creator="forest-manager.eu">
      {/* Summary pages per forest */}
      {data.forests.map((forest, fi) => {
        const summary = calcSummary(forest.compartments);
        return [
          <PdfPage key={`s1-${fi}`} data={data}><SummaryPage1 data={data} forest={forest} summary={summary} /></PdfPage>,
          <PdfPage key={`s2-${fi}`} data={data}><SummaryPage2 data={data} forest={forest} summary={summary} /></PdfPage>,
          <PdfPage key={`s3-${fi}`} data={data}><SummaryPage3 data={data} forest={forest} summary={summary} /></PdfPage>,
        ];
      })}

      {/* Individual compartment pages */}
      {data.compartments.map((c, idx) => (
        <PdfPage key={`c-${idx}`} data={data}>
          <CompartmentPage c={c} orgName={data.orgName} generatedAt={data.generatedAt} />
        </PdfPage>
      ))}
    </Document>
  );
}
