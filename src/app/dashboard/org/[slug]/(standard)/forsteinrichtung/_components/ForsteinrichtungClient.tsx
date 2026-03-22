'use client';

import { useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronRight, TreePine, Pencil, Layers, BarChart2, CircleDot,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSpeciesLabel, getSpeciesColor } from '@/lib/tree-species';
import { CompartmentEditSheet } from './CompartmentEditSheet';
import {
  estimateSiteClass, getYieldTableValues, calcStockingDegree,
  isYieldTableSpecies, SITE_CLASS_LABELS,
  type Species, type SiteClass,
} from '@/lib/yield-tables';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpeciesEntry { species: string; percent: number; }
interface RejuvEntry   { species: string; heightCm: number; density: string; }

interface Tree {
  id: string;
  species: string | null;
  age: number | null;
  diameter: number | null;
  height: number | null;
  health: string | null;
  compartmentId: string | null;
}

interface PlotTree {
  id: string;
  species: string | null;
  age: number | null;
  diameter: number | null;
  height: number | null;
  health: string | null;
  poi: { lat: number; lng: number };
}

interface InventoryPlotData {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  measuredAt: string | Date;
  trees: PlotTree[];
}

interface TreePoi {
  id: string;
  name: string | null;
  tree: Tree | null;
}

interface Compartment {
  id: string;
  name: string;
  number: string | null;
  color: string | null;
  areaHa: number | null;
  note: string | null;
  soilType: string | null;
  waterBalance: string | null;
  nutrientLevel: string | null;
  exposition: string | null;
  slopeClass: string | null;
  protectionStatus: string | null;
  restrictions: string | null;
  standAge: number | null;
  developmentStage: string | null;
  mainSpecies: SpeciesEntry[] | null;
  sideSpecies: SpeciesEntry[] | null;
  mixingForm: string | null;
  structure: string | null;
  volumePerHa: number | null;
  incrementPerHa: number | null;
  stockingDegree: number | null;
  deadwoodPerHa: number | null;
  yieldClass: number | null;
  siteProductivity: string | null;
  rejuvenation: RejuvEntry[] | null;
  vitalityNote: string | null;
  damageNote: string | null;
  stabilityNote: string | null;
  lastMeasureDate: string | null;
  lastMeasureType: string | null;
  maintenanceStatus: string | null;
  accessibility: string | null;
  inventoryPlots: InventoryPlotData[];
}

interface Forest {
  id: string;
  name: string;
  compartments: Compartment[];
  pois: TreePoi[];
}

// ── Formzahlen (baumartenspezifisch) ─────────────────────────────────────────
// Quelle: Standardwerte der deutschen Forstpraxis (Assmann/Franz)
const FORM_FACTORS: Record<string, number> = {
  SPRUCE:  0.45,
  PINE:    0.45,
  FIR:     0.45,
  DOUGLAS: 0.45,
  LARCH:   0.46,
  OAK:     0.42,
  BEECH:   0.43,
  ASH:     0.42,
  MAPLE:   0.43,
  BIRCH:   0.43,
  ALDER:   0.42,
  POPLAR:  0.40,
};

// ── Inventur-Berechnungen ─────────────────────────────────────────────────────

interface InventoryStats {
  n: number;
  dg: number;                  // quadratischer Mitteldurchmesser (cm)
  meanHeight: number | null;   // mittlere Höhe (m)
  treesWithHeight: number;
  basalAreaSum: number;        // Grundfläche Σ (m²)
  volumeEstimate: number;      // Vorrat ≈ (m³)
  speciesBreakdown: { species: string; count: number; pct: number }[];
  healthBreakdown:  { health: string;  count: number; pct: number }[];
}

function computeInventoryStats(trees: TreePoi[]): InventoryStats | null {
  const withBhd = trees.filter(p => p.tree?.diameter != null);
  if (withBhd.length === 0) return null;

  const n = withBhd.length;

  // Quadratischer Mitteldurchmesser Dg = sqrt(Σ BHD² / n)
  const dg = Math.sqrt(withBhd.reduce((s, p) => s + p.tree!.diameter! ** 2, 0) / n);

  // Mittlere Höhe (nur Bäume mit Höhenmessung)
  const withH = withBhd.filter(p => p.tree?.height != null);
  const meanHeight = withH.length > 0
    ? withH.reduce((s, p) => s + p.tree!.height!, 0) / withH.length
    : null;

  // Grundfläche Σ = Σ (π/4 × (BHD/100)²)
  const basalAreaSum = withBhd.reduce(
    (s, p) => s + Math.PI * (p.tree!.diameter! / 200) ** 2,
    0,
  );

  // Vorrat ≈ = Σ (g_i × h_i × f_i) — nur Bäume mit Höhe
  const volumeEstimate = withBhd.reduce((s, p) => {
    const t = p.tree!;
    if (!t.height) return s;
    const g = Math.PI * (t.diameter! / 200) ** 2;
    const f = FORM_FACTORS[t.species ?? ''] ?? 0.45;
    return s + g * t.height * f;
  }, 0);

  // Artverteilung
  const spMap = new Map<string, number>();
  withBhd.forEach(p => {
    const sp = p.tree!.species ?? 'UNKNOWN';
    spMap.set(sp, (spMap.get(sp) ?? 0) + 1);
  });
  const speciesBreakdown = [...spMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([species, count]) => ({ species, count, pct: Math.round(count / n * 100) }));

  // Vitalitätsverteilung
  const hMap = new Map<string, number>();
  trees.forEach(p => {
    const h = p.tree?.health ?? 'UNKNOWN';
    hMap.set(h, (hMap.get(h) ?? 0) + 1);
  });
  const healthBreakdown = [...hMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([health, count]) => ({ health, count, pct: Math.round(count / trees.length * 100) }));

  return { n, dg, meanHeight, treesWithHeight: withH.length, basalAreaSum, volumeEstimate, speciesBreakdown, healthBreakdown };
}

// ── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-emerald-100 rounded-lg px-3 py-2 text-center">
      <div className="text-sm font-bold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[9px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── InventoryStatsBlock ───────────────────────────────────────────────────────

const HEALTH_LABEL_MAP: Record<string, string> = {
  HEALTHY:            'Vital',
  DAMAGED:            'Geschädigt',
  DEAD:               'Abgestorben',
  MARKED_FOR_FELLING: 'Zum Fällen',
};

const HEALTH_COLOR_MAP: Record<string, string> = {
  HEALTHY:            'text-emerald-600',
  DAMAGED:            'text-amber-500',
  DEAD:               'text-red-500',
  MARKED_FOR_FELLING: 'text-orange-500',
};

function InventoryStatsBlock({ trees }: { trees: TreePoi[] }) {
  const stats = useMemo(() => computeInventoryStats(trees), [trees]);
  if (!stats) return null;

  return (
    <div className="px-4 py-3 bg-emerald-50/60 border-t border-emerald-100">
      <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-2.5 flex items-center gap-1.5">
        <BarChart2 size={11} />
        Inventur-Auswertung · {stats.n} Bäume
      </div>

      {/* Kennzahlen-Pills */}
      <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
        <StatPill
          label="Mittl. BHD (Dg)"
          value={`${stats.dg.toFixed(1)} cm`}
        />
        <StatPill
          label="Mittl. Höhe"
          value={stats.meanHeight != null ? `${stats.meanHeight.toFixed(1)} m` : '–'}
          sub={stats.meanHeight != null && stats.treesWithHeight < stats.n
            ? `aus ${stats.treesWithHeight} Bäumen`
            : undefined}
        />
        <StatPill
          label="Grundfläche Σ"
          value={`${stats.basalAreaSum.toFixed(2)} m²`}
        />
        <StatPill
          label="Vorrat ≈"
          value={stats.volumeEstimate > 0 ? `${stats.volumeEstimate.toFixed(1)} m³` : '–'}
          sub={stats.volumeEstimate > 0 ? 'Schätzwert' : undefined}
        />
      </div>

      {/* Artverteilung */}
      {stats.speciesBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {stats.speciesBreakdown.map(s => (
            <span
              key={s.species}
              className="flex items-center gap-1 text-xs text-slate-700 bg-white border border-slate-100 rounded-full px-2 py-0.5"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: getSpeciesColor(s.species) }}
              />
              {getSpeciesLabel(s.species)} {s.pct}%
            </span>
          ))}
        </div>
      )}

      {/* Vitalität */}
      <div className="flex flex-wrap gap-3">
        {stats.healthBreakdown.map(h => (
          <span
            key={h.health}
            className={`text-xs font-medium ${HEALTH_COLOR_MAP[h.health] ?? 'text-slate-500'}`}
          >
            {HEALTH_LABEL_MAP[h.health] ?? h.health} {h.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Plot-Stats ────────────────────────────────────────────────────────────────

interface PlotStats {
  n: number;
  plotAreaHa: number;
  nHa: number;
  gHa: number;
  vHa: number | null;
  dg: number;
  meanHeight: number | null;
  dominantSpecies: Species | null;
  siteClass: SiteClass | null;
  refGHa: number | null;
  refVHa: number | null;
  refIvHa: number | null;
  bestockungsgrad: number | null;
}

function computePlotStats(plot: InventoryPlotData, compartmentAge: number | null): PlotStats | null {
  const withBhd = plot.trees.filter(t => t.diameter != null);
  if (withBhd.length === 0) return null;

  const plotAreaHa = Math.PI * plot.radiusM ** 2 / 10000;
  const n = withBhd.length;

  const dg = Math.sqrt(withBhd.reduce((s, t) => s + t.diameter! ** 2, 0) / n);

  const basalAreaSum = withBhd.reduce((s, t) => s + Math.PI * (t.diameter! / 200) ** 2, 0);
  const gHa = basalAreaSum / plotAreaHa;

  const withH = withBhd.filter(t => t.height != null);
  const meanHeight = withH.length > 0 ? withH.reduce((s, t) => s + t.height!, 0) / withH.length : null;

  const volumeSum = withBhd.reduce((s, t) => {
    if (!t.height) return s;
    const g = Math.PI * (t.diameter! / 200) ** 2;
    const f = FORM_FACTORS[t.species ?? ''] ?? 0.45;
    return s + g * t.height * f;
  }, 0);
  const vHa = withH.length > 0 ? volumeSum / plotAreaHa : null;

  // Dominant species (from YIELD_TABLE_SPECIES only)
  const spCount = new Map<string, number>();
  withBhd.forEach(t => {
    if (t.species && isYieldTableSpecies(t.species)) {
      spCount.set(t.species, (spCount.get(t.species) ?? 0) + 1);
    }
  });
  const dominantSpecies = spCount.size > 0
    ? ([...spCount.entries()].sort((a, b) => b[1] - a[1])[0][0] as Species)
    : null;

  // Oberhöhe: mean height of top-20% trees by diameter (min 1 tree)
  let siteClass: SiteClass | null = null;
  let refGHa: number | null = null;
  let refVHa: number | null = null;
  let refIvHa: number | null = null;
  let bestockungsgrad: number | null = null;

  const age = compartmentAge ??
    (withBhd.filter(t => t.age != null).length > 0
      ? Math.round(withBhd.filter(t => t.age != null).reduce((s, t) => s + t.age!, 0) / withBhd.filter(t => t.age != null).length)
      : null);

  if (dominantSpecies && age && meanHeight) {
    // Oberhöhe estimate: use top-20% BHD trees' mean height
    const sorted = [...withH].sort((a, b) => b.diameter! - a.diameter!);
    const topK = Math.max(1, Math.round(sorted.length * 0.2));
    const hTop = sorted.slice(0, topK).reduce((s, t) => s + t.height!, 0) / topK;

    siteClass = estimateSiteClass(dominantSpecies, age, hTop);
    const ref = getYieldTableValues(dominantSpecies, age, siteClass);
    if (ref) {
      refGHa  = ref.gHa;
      refVHa  = ref.vHa;
      refIvHa = ref.ivHa;
      bestockungsgrad = calcStockingDegree(gHa, dominantSpecies, age, siteClass);
    }
  }

  return {
    n, plotAreaHa, nHa: n / plotAreaHa, gHa, vHa, dg, meanHeight,
    dominantSpecies, siteClass, refGHa, refVHa, refIvHa, bestockungsgrad,
  };
}

function PlotStatsBlock({ plot, compartmentAge }: { plot: InventoryPlotData; compartmentAge: number | null }) {
  const stats = useMemo(() => computePlotStats(plot, compartmentAge), [plot, compartmentAge]);
  const dateStr = new Date(plot.measuredAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="border border-violet-100 rounded-xl bg-violet-50/40 overflow-hidden mb-3">
      {/* Plot header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b border-violet-100">
        <CircleDot size={12} className="text-violet-600 shrink-0" />
        <span className="text-xs font-semibold text-violet-700">{plot.name || 'Probekreis'}</span>
        <span className="text-[10px] text-violet-400 ml-1">r = {plot.radiusM} m · {(Math.PI * plot.radiusM ** 2).toFixed(0)} m² · {dateStr}</span>
        <span className="ml-auto text-[10px] text-violet-400">{plot.trees.length} Bäume</span>
      </div>

      {stats ? (
        <div className="p-3 space-y-3">
          {/* Kernkennzahlen */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg px-2 py-2 text-center border border-violet-100">
              <div className="text-sm font-bold text-slate-800">{Math.round(stats.nHa)}</div>
              <div className="text-[10px] text-slate-500">N/ha</div>
            </div>
            <div className="bg-white rounded-lg px-2 py-2 text-center border border-violet-100">
              <div className="text-sm font-bold text-slate-800">{stats.gHa.toFixed(1)}</div>
              <div className="text-[10px] text-slate-500">G/ha (m²)</div>
            </div>
            <div className="bg-white rounded-lg px-2 py-2 text-center border border-violet-100">
              <div className="text-sm font-bold text-slate-800">{stats.vHa != null ? Math.round(stats.vHa) : '–'}</div>
              <div className="text-[10px] text-slate-500">V/ha (m³)</div>
            </div>
          </div>

          {/* Weitere Kennzahlen */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-500">Dg (BHD quadr.) <span className="font-medium text-slate-700">{stats.dg.toFixed(1)} cm</span></div>
            <div className="text-slate-500">Mittl. Höhe <span className="font-medium text-slate-700">{stats.meanHeight != null ? `${stats.meanHeight.toFixed(1)} m` : '–'}</span></div>
          </div>

          {/* Ertragstafel-Vergleich */}
          {stats.siteClass && stats.dominantSpecies && (
            <div className="bg-white border border-emerald-100 rounded-lg p-2 text-xs space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
                Ertragstafel · {getSpeciesLabel(stats.dominantSpecies)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bonität</span>
                <span className="font-medium text-slate-700">{SITE_CLASS_LABELS[stats.siteClass]}</span>
              </div>
              {stats.bestockungsgrad != null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bestockungsgrad</span>
                  <span className={`font-bold ${
                    stats.bestockungsgrad >= 1.0 ? 'text-emerald-700' :
                    stats.bestockungsgrad >= 0.7 ? 'text-amber-600' : 'text-red-500'
                  }`}>{stats.bestockungsgrad.toFixed(2)}</span>
                </div>
              )}
              {stats.refGHa != null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tafel G/ha</span>
                  <span className="font-medium text-slate-700">{stats.refGHa.toFixed(0)} m²/ha</span>
                </div>
              )}
              {stats.refVHa != null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tafel V/ha</span>
                  <span className="font-medium text-slate-700">{stats.refVHa.toFixed(0)} m³/ha</span>
                </div>
              )}
              {stats.refIvHa != null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Zuwachs (iV)</span>
                  <span className="font-medium text-slate-700">{stats.refIvHa.toFixed(1)} m³/ha/a</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 px-3 py-2">Keine BHD-Messungen — Kennzahlen nicht berechenbar.</p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, unit?: string) {
  if (n == null) return '–';
  return `${n}${unit ? ' ' + unit : ''}`;
}

const HEALTH_LABEL: Record<string, string> = {
  HEALTHY: 'Vital', STRESSED: 'Gestresst', DAMAGED: 'Geschädigt', DEAD: 'Abgestorben',
};

// ── Small badge ───────────────────────────────────────────────────────────────

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      {label}
    </span>
  );
}

// ── SpeciesBar (view-only) ────────────────────────────────────────────────────

function SpeciesBar({ entries }: { entries: SpeciesEntry[] }) {
  if (!entries?.length) return <span className="text-slate-400 text-xs">–</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((e, i) => (
        <span key={i} className="flex items-center gap-1 text-xs text-slate-700">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getSpeciesColor(e.species) }} />
          {getSpeciesLabel(e.species)}{e.percent ? ` (${e.percent}%)` : ''}
        </span>
      ))}
    </div>
  );
}

// ── Tree Row ──────────────────────────────────────────────────────────────────

function TreeRow({ poi }: { poi: TreePoi }) {
  const t = poi.tree!;
  return (
    <div className="flex items-center gap-3 py-1.5 px-3 rounded-md hover:bg-slate-50 transition-colors">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.species ? getSpeciesColor(t.species) : '#94a3b8' }} />
      <span className="text-sm font-medium text-slate-700 flex-1 truncate">
        {poi.name || (t.species ? getSpeciesLabel(t.species) : 'Baum')}
      </span>
      <div className="flex gap-3 text-xs text-slate-500 shrink-0">
        {t.diameter != null && <span>Ø {t.diameter} cm</span>}
        {t.height   != null && <span>{t.height} m</span>}
        {t.age      != null && <span>{t.age} J</span>}
        {t.health   && <span className={`font-medium ${t.health === 'HEALTHY' ? 'text-emerald-600' : t.health === 'DEAD' ? 'text-red-500' : 'text-amber-500'}`}>{HEALTH_LABEL[t.health] ?? t.health}</span>}
      </div>
    </div>
  );
}

// ── Compartment Card ──────────────────────────────────────────────────────────

function CompartmentCard({
  compartment, orgSlug, trees,
}: {
  compartment: Compartment; orgSlug: string; trees: TreePoi[];
}) {
  const plots = compartment.inventoryPlots ?? [];
  const [expanded,  setExpanded]  = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [liveData,  setLiveData]  = useState<Compartment>(compartment);

  const title = `${liveData.number ? `[${liveData.number}] ` : ''}${liveData.name || 'Abteilung'}`;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">

      {/* Card Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <span className="w-3 h-3 rounded-full shrink-0 border border-white/40"
          style={{ backgroundColor: liveData.color ?? '#3b82f6' }} />
        <button onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 flex-1 text-left">
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {liveData.areaHa != null && (
            <span className="text-xs text-slate-400 ml-1">{liveData.areaHa.toFixed(2)} ha</span>
          )}
          {trees.length > 0 && (
            <span className="ml-1 flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
              <TreePine size={11} /> {trees.length}
            </span>
          )}
          {plots.length > 0 && (
            <span className="ml-1 flex items-center gap-0.5 text-xs text-violet-600 font-medium">
              <CircleDot size={11} /> {plots.length}
            </span>
          )}
          <span className="ml-auto text-slate-400">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
        <Button size="sm" variant="ghost" onClick={() => setSheetOpen(true)}
          className="h-7 px-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 shrink-0">
          <Pencil size={13} />
        </Button>
      </div>

      {/* Quick summary pills */}
      {(liveData.developmentStage || liveData.standAge != null || (liveData.mainSpecies?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {liveData.developmentStage && <Badge label={liveData.developmentStage} />}
          {liveData.standAge != null  && <Badge label={`${liveData.standAge} J`} />}
          {liveData.maintenanceStatus && <Badge label={liveData.maintenanceStatus} />}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">

          {/* Forsteinrichtungsblatt */}
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">

            {/* Standort */}
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-1">Standort</div>
            <Row label="Bodentyp"       value={liveData.soilType} />
            <Row label="Wasserhaushalt" value={liveData.waterBalance} />
            <Row label="Nährstoffstufe" value={liveData.nutrientLevel} />
            <Row label="Exposition"     value={liveData.exposition} />
            <Row label="Hangneigung"    value={liveData.slopeClass} />
            <Row label="Schutzstatus"   value={liveData.protectionStatus} />
            {liveData.restrictions && (
              <div className="col-span-2">
                <span className="text-slate-400">Restriktionen </span>
                <span className="text-slate-700">{liveData.restrictions}</span>
              </div>
            )}

            {/* Bestand */}
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-2">Bestand</div>
            <Row label="Entwicklungsstufe" value={liveData.developmentStage} />
            <Row label="Alter"             value={liveData.standAge != null ? `${liveData.standAge} J` : null} />
            <Row label="Mischungsform"     value={liveData.mixingForm} />
            <Row label="Struktur"          value={liveData.structure} />
            {(liveData.mainSpecies?.length ?? 0) > 0 && (
              <div className="col-span-2">
                <span className="text-slate-400 mr-1">Hauptbaumarten</span>
                <SpeciesBar entries={liveData.mainSpecies!} />
              </div>
            )}
            {(liveData.sideSpecies?.length ?? 0) > 0 && (
              <div className="col-span-2">
                <span className="text-slate-400 mr-1">Nebenbaumarten</span>
                <SpeciesBar entries={liveData.sideSpecies!} />
              </div>
            )}

            {/* Kennzahlen (manuell) */}
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-2">Kennzahlen (manuell)</div>
            <Row label="Vorrat"          value={fmt(liveData.volumePerHa, 'm³/ha')} />
            <Row label="Zuwachs"         value={fmt(liveData.incrementPerHa, 'm³/ha/a')} />
            <Row label="Bestockungsgrad" value={liveData.stockingDegree?.toFixed(2) ?? null} />
            <Row label="Totholz"         value={fmt(liveData.deadwoodPerHa, 'm³/ha')} />
            <Row label="Bonität (EKL)"   value={liveData.yieldClass?.toString() ?? null} />
            <Row label="Wuchsleistung"   value={liveData.siteProductivity} />

            {/* Verjüngung */}
            {(liveData.rejuvenation?.length ?? 0) > 0 && (
              <>
                <div className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-2">Verjüngung</div>
                <div className="col-span-2 flex flex-wrap gap-2">
                  {liveData.rejuvenation!.map((r, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSpeciesColor(r.species) }} />
                      {getSpeciesLabel(r.species)}
                      {r.heightCm ? ` ${r.heightCm} cm` : ''}
                      {r.density ? ` · ${r.density}` : ''}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Zustand */}
            {(liveData.vitalityNote || liveData.damageNote || liveData.stabilityNote) && (
              <>
                <div className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-2">Zustand</div>
                {liveData.vitalityNote  && <NoteRow label="Vitalität"  value={liveData.vitalityNote} />}
                {liveData.damageNote    && <NoteRow label="Schäden"    value={liveData.damageNote} />}
                {liveData.stabilityNote && <NoteRow label="Stabilität" value={liveData.stabilityNote} />}
              </>
            )}

            {/* Bewirtschaftung */}
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-2">Bewirtschaftung</div>
            <Row label="Letzte Maßnahme" value={liveData.lastMeasureDate ? `${liveData.lastMeasureDate}${liveData.lastMeasureType ? ' – ' + liveData.lastMeasureType : ''}` : null} />
            <Row label="Pflegezustand"   value={liveData.maintenanceStatus} />
            <Row label="Befahrbarkeit"   value={liveData.accessibility} />
          </div>

          {/* Probekreise (Plots) */}
          {plots.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wide text-violet-600 mb-3 flex items-center gap-1.5">
                <CircleDot size={11} /> Probekreise ({plots.length})
              </div>
              {plots.map(plot => (
                <PlotStatsBlock key={plot.id} plot={plot} compartmentAge={liveData.standAge} />
              ))}
            </div>
          )}

          {/* Inventur-Auswertung (automatisch aus Tree-POIs berechnet) */}
          {trees.length > 0 && <InventoryStatsBlock trees={trees} />}

          {/* Tree POI list */}
          {trees.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
                <TreePine size={11} /> Erfasste Bäume ({trees.length})
              </div>
              <div className="space-y-0.5">
                {trees.map(poi => <TreeRow key={poi.id} poi={poi} />)}
              </div>
            </div>
          )}

          {/* Note */}
          {liveData.note && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 italic">{liveData.note}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Sheet */}
      <CompartmentEditSheet
        compartment={liveData}
        orgSlug={orgSlug}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={() => {/* live data updated via optimistic state below */}}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-slate-400">{label} </span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2">
      <span className="text-slate-400">{label}: </span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

// ── Forest Group ──────────────────────────────────────────────────────────────

function ForestGroup({ forest, orgSlug, query }: { forest: Forest; orgSlug: string; query: string }) {
  const filtered = useMemo(() => {
    if (!query) return forest.compartments;
    const q = query.toLowerCase();
    return forest.compartments.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.number?.toLowerCase().includes(q) ||
      c.developmentStage?.toLowerCase().includes(q) ||
      c.mainSpecies?.some(e => getSpeciesLabel(e.species).toLowerCase().includes(q))
    );
  }, [forest.compartments, query]);

  if (!filtered.length) return null;

  const totalHa    = filtered.reduce((s, c) => s + (c.areaHa ?? 0), 0);
  const totalTrees = forest.pois.filter(p => p.tree).length;

  return (
    <div className="space-y-3">
      {/* Forest header */}
      <div className="flex items-center gap-3 px-1">
        <Layers size={15} className="text-emerald-600 shrink-0" />
        <span className="font-bold text-slate-800 text-sm">{forest.name}</span>
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} Abt. · {totalHa.toFixed(1)} ha
          {totalTrees > 0 && ` · ${totalTrees} Bäume`}
        </span>
      </div>
      {filtered.map(c => {
        const trees = forest.pois.filter(p => p.tree?.compartmentId === c.id);
        return (
          <CompartmentCard key={c.id} compartment={c} orgSlug={orgSlug} trees={trees} />
        );
      })}
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────

export function ForsteinrichtungClient({ forests, orgSlug }: { forests: Forest[]; orgSlug: string }) {
  const [query,        setQuery]        = useState('');
  const [forestFilter, setForestFilter] = useState('');

  const totalCompartments = forests.reduce((s, f) => s + f.compartments.length, 0);
  const totalHa           = forests.reduce((s, f) => s + f.compartments.reduce((a, c) => a + (c.areaHa ?? 0), 0), 0);
  const totalTrees        = forests.reduce((s, f) => s + f.pois.filter(p => p.tree).length, 0);

  const visibleForests = forestFilter ? forests.filter(f => f.id === forestFilter) : forests;

  return (
    <div className="flex-1 overflow-auto bg-slate-50 h-full">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Abteilungen',   value: totalCompartments },
            { label: 'Gesamtfläche',  value: `${totalHa.toFixed(1)} ha` },
            { label: 'Erfasste Bäume', value: totalTrees },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Abteilung suchen …"
              className="pl-9 bg-white border-slate-200 text-sm"
            />
          </div>
          <select
            value={forestFilter}
            onChange={e => setForestFilter(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Alle Wälder</option>
            {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Forest groups */}
        {visibleForests.length === 0 ? (
          <div className="text-center text-slate-400 py-16 text-sm">Keine Wälder gefunden.</div>
        ) : (
          <div className="space-y-8">
            {visibleForests.map(f => (
              <ForestGroup key={f.id} forest={f} orgSlug={orgSlug} query={query} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
