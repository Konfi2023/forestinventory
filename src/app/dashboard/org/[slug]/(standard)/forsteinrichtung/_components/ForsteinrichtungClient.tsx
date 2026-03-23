'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Search, TreePine, Layers, BarChart2, CircleDot, PlusCircle, X, Loader2, ChevronDown, ChevronRight, FileDown,
  Upload, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getSpeciesLabel, getSpeciesColor, TREE_SPECIES } from '@/lib/tree-species';
import { updateCompartment } from '@/actions/polygons';
import { toast } from 'sonner';
import {
  estimateSiteClass, getYieldTableValues, calcStockingDegree,
  isYieldTableSpecies, SITE_CLASS_LABELS,
  type Species, type SiteClass,
} from '@/lib/yield-tables';
import { calcPlotMetrics, averagePlotResults, validateStandMetrics, type PlotTree as MensPlotTree } from '@/lib/forest-mensuration';
import { importCompartmentsFromAI } from '@/actions/polygons';

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

// ── Formzahlen ────────────────────────────────────────────────────────────────
const FORM_FACTORS: Record<string, number> = {
  SPRUCE: 0.45, PINE: 0.45, FIR: 0.45, DOUGLAS: 0.45, LARCH: 0.46,
  OAK: 0.42, BEECH: 0.43, ASH: 0.42, MAPLE: 0.43, BIRCH: 0.43,
  ALDER: 0.42, POPLAR: 0.40,
};

// ── Form Konstanten ───────────────────────────────────────────────────────────
const EXPOSITION_OPTIONS  = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'eben'];
const SLOPE_OPTIONS       = ['eben', 'schwach (<15°)', 'mittel (15–25°)', 'steil (25–35°)', 'sehr steil (>35°)'];
const DEVELOP_OPTIONS     = ['Blöße', 'Verjüngung', 'Dickung', 'Stangenholz', 'Baumholz I', 'Baumholz II', 'Baumholz III', 'Altholz', 'Plenterwald'];
const MIXING_OPTIONS      = ['rein', 'truppweise', 'horst', 'gruppen', 'einzeln', 'gemischt'];
const STRUCTURE_OPTIONS   = ['einschichtig', 'zweischichtig', 'mehrschichtig', 'plenterartig'];
const PRODUCTIVITY_OPTIONS = ['sehr gering', 'gering', 'mittel', 'hoch', 'sehr hoch'];
const MAINTENANCE_OPTIONS = ['vernachlässigt', 'mangelhaft', 'ausreichend', 'gut', 'sehr gut'];
const ACCESSIBILITY_OPTIONS = ['nicht befahrbar', 'bedingt befahrbar', 'befahrbar', 'gut befahrbar'];
const NUTRIENT_OPTIONS    = ['sehr arm', 'arm', 'mäßig', 'mittel', 'reich', 'sehr reich'];
const WATER_OPTIONS       = ['trocken', 'mäßig trocken', 'frisch', 'mäßig feucht', 'feucht', 'nass', 'staunass'];

// ── Inventur-Berechnungen ─────────────────────────────────────────────────────

interface InventoryStats {
  n: number;
  dg: number;
  meanHeight: number | null;
  treesWithHeight: number;
  basalAreaSum: number;
  volumeEstimate: number;
  speciesBreakdown: { species: string; count: number; pct: number }[];
  healthBreakdown:  { health: string;  count: number; pct: number }[];
}

function computeInventoryStats(trees: TreePoi[]): InventoryStats | null {
  const withBhd = trees.filter(p => p.tree?.diameter != null);
  if (withBhd.length === 0) return null;
  const n = withBhd.length;
  const dg = Math.sqrt(withBhd.reduce((s, p) => s + p.tree!.diameter! ** 2, 0) / n);
  const withH = withBhd.filter(p => p.tree?.height != null);
  const meanHeight = withH.length > 0 ? withH.reduce((s, p) => s + p.tree!.height!, 0) / withH.length : null;
  const basalAreaSum = withBhd.reduce((s, p) => s + Math.PI * (p.tree!.diameter! / 200) ** 2, 0);
  const volumeEstimate = withBhd.reduce((s, p) => {
    const t = p.tree!;
    if (!t.height) return s;
    const g = Math.PI * (t.diameter! / 200) ** 2;
    return s + g * t.height * (FORM_FACTORS[t.species ?? ''] ?? 0.45);
  }, 0);
  const spMap = new Map<string, number>();
  withBhd.forEach(p => { const sp = p.tree!.species ?? 'UNKNOWN'; spMap.set(sp, (spMap.get(sp) ?? 0) + 1); });
  const speciesBreakdown = [...spMap.entries()].sort((a, b) => b[1] - a[1]).map(([species, count]) => ({ species, count, pct: Math.round(count / n * 100) }));
  const hMap = new Map<string, number>();
  trees.forEach(p => { const h = p.tree?.health ?? 'UNKNOWN'; hMap.set(h, (hMap.get(h) ?? 0) + 1); });
  const healthBreakdown = [...hMap.entries()].sort((a, b) => b[1] - a[1]).map(([health, count]) => ({ health, count, pct: Math.round(count / trees.length * 100) }));
  return { n, dg, meanHeight, treesWithHeight: withH.length, basalAreaSum, volumeEstimate, speciesBreakdown, healthBreakdown };
}

interface PlotStats {
  n: number; plotAreaHa: number; nHa: number; gHa: number; vHa: number | null;
  dg: number; meanHeight: number | null; dominantSpecies: Species | null;
  siteClass: SiteClass | null; refGHa: number | null; refVHa: number | null;
  refIvHa: number | null; bestockungsgrad: number | null;
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
    return s + Math.PI * (t.diameter! / 200) ** 2 * t.height * (FORM_FACTORS[t.species ?? ''] ?? 0.45);
  }, 0);
  const vHa = withH.length > 0 ? volumeSum / plotAreaHa : null;
  const spCount = new Map<string, number>();
  withBhd.forEach(t => { if (t.species && isYieldTableSpecies(t.species)) spCount.set(t.species, (spCount.get(t.species) ?? 0) + 1); });
  const dominantSpecies = spCount.size > 0 ? ([...spCount.entries()].sort((a, b) => b[1] - a[1])[0][0] as Species) : null;
  let siteClass: SiteClass | null = null, refGHa: number | null = null, refVHa: number | null = null, refIvHa: number | null = null, bestockungsgrad: number | null = null;
  const age = compartmentAge ?? (withBhd.filter(t => t.age != null).length > 0 ? Math.round(withBhd.filter(t => t.age != null).reduce((s, t) => s + t.age!, 0) / withBhd.filter(t => t.age != null).length) : null);
  if (dominantSpecies && age && meanHeight) {
    const sorted = [...withH].sort((a, b) => b.diameter! - a.diameter!);
    const topK = Math.max(1, Math.round(sorted.length * 0.2));
    const hTop = sorted.slice(0, topK).reduce((s, t) => s + t.height!, 0) / topK;
    siteClass = estimateSiteClass(dominantSpecies, age, hTop);
    const ref = getYieldTableValues(dominantSpecies, age, siteClass);
    if (ref) { refGHa = ref.gHa; refVHa = ref.vHa; refIvHa = ref.ivHa; bestockungsgrad = calcStockingDegree(gHa, dominantSpecies, age, siteClass); }
  }
  return { n, plotAreaHa, nHa: n / plotAreaHa, gHa, vHa, dg, meanHeight, dominantSpecies, siteClass, refGHa, refVHa, refIvHa, bestockungsgrad };
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-slate-600 mb-1 block uppercase tracking-wide">{children}</label>;
}

function SField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-md text-sm px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">{placeholder ?? '– wählen –'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NField({ label, value, onChange, unit, step }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; step?: string;
}) {
  return (
    <div>
      <Label>{label}{unit ? ` (${unit})` : ''}</Label>
      <Input type="number" value={value} onChange={e => onChange(e.target.value)}
        step={step ?? '0.1'} className="border-slate-200 text-slate-800 focus:ring-emerald-500 text-sm" />
    </div>
  );
}

function TField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="border-slate-200 text-slate-800 focus:ring-emerald-500 text-sm" />
    </div>
  );
}

function Section({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</span>
      </div>
      <div className={`p-4 grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{children}</div>
    </div>
  );
}

function SectionFull({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

// ── Species Picker ────────────────────────────────────────────────────────────
function SpeciesPicker({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = TREE_SPECIES.filter(s => s.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <Search size={12} className="text-slate-400 shrink-0" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Baumart suchen…" autoFocus
          className="text-sm text-slate-800 outline-none flex-1" />
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.map(s => (
          <button key={s.id} onClick={() => { onSelect(s.id); onClose(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 text-left text-sm text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.label}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400 px-3 py-2">Keine Treffer</p>}
      </div>
    </div>
  );
}

function SpeciesEditor({ label, entries, onChange }: {
  label: string; entries: SpeciesEntry[]; onChange: (e: SpeciesEntry[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const updatePct = (i: number, v: string) => onChange(entries.map((e, idx) => idx === i ? { ...e, percent: Number(v) } : e));
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={i} className="flex gap-2 items-center relative">
            <div className="flex-1 relative">
              <button onClick={() => setEditIdx(editIdx === i ? null : i)}
                className="flex items-center gap-2 w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-left hover:border-slate-300">
                {e.species && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getSpeciesColor(e.species) }} />}
                <span className={e.species ? 'text-slate-800' : 'text-slate-400'}>
                  {e.species ? getSpeciesLabel(e.species) : '– Baumart wählen –'}
                </span>
              </button>
              {editIdx === i && (
                <SpeciesPicker onSelect={id => { onChange(entries.map((en, idx) => idx === i ? { ...en, species: id } : en)); setEditIdx(null); }} onClose={() => setEditIdx(null)} />
              )}
            </div>
            <Input type="number" min="0" max="100" value={e.percent || ''} onChange={ev => updatePct(i, ev.target.value)}
              placeholder="%" className="w-20 border-slate-200 text-sm" />
            <button onClick={() => remove(i)} className="text-slate-400 hover:text-red-400">×</button>
          </div>
        ))}
        <div className="relative">
          <button onClick={() => setPickerOpen(p => !p)} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <PlusCircle size={13} /> Baumart hinzufügen
          </button>
          {pickerOpen && (
            <SpeciesPicker onSelect={id => { if (!entries.some(e => e.species === id)) onChange([...entries, { species: id, percent: 0 }]); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function RejuvEditor({ entries, onChange }: { entries: RejuvEntry[]; onChange: (e: RejuvEntry[]) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const upd = (i: number, f: 'heightCm' | 'density', v: string) =>
    onChange(entries.map((e, idx) => idx === i ? { ...e, [f]: f === 'heightCm' ? Number(v) : v } : e));
  return (
    <div>
      <Label>Verjüngung (Baumart / Höhe cm / Dichte)</Label>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={i} className="flex gap-2 items-center relative">
            <div className="flex-1 relative">
              <button onClick={() => setEditIdx(editIdx === i ? null : i)}
                className="flex items-center gap-2 w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-left hover:border-slate-300">
                {e.species && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getSpeciesColor(e.species) }} />}
                <span className={e.species ? 'text-slate-800' : 'text-slate-400'}>
                  {e.species ? getSpeciesLabel(e.species) : '– Baumart –'}
                </span>
              </button>
              {editIdx === i && (
                <SpeciesPicker onSelect={id => { onChange(entries.map((en, idx) => idx === i ? { ...en, species: id } : en)); setEditIdx(null); }} onClose={() => setEditIdx(null)} />
              )}
            </div>
            <Input type="number" value={e.heightCm || ''} onChange={ev => upd(i, 'heightCm', ev.target.value)}
              placeholder="cm" className="w-20 border-slate-200 text-sm" />
            <Input value={e.density} onChange={ev => upd(i, 'density', ev.target.value)}
              placeholder="Dichte" className="w-24 border-slate-200 text-sm" />
            <button onClick={() => remove(i)} className="text-slate-400 hover:text-red-400">×</button>
          </div>
        ))}
        <div className="relative">
          <button onClick={() => setPickerOpen(p => !p)} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <PlusCircle size={13} /> Baumart hinzufügen
          </button>
          {pickerOpen && (
            <SpeciesPicker onSelect={id => { onChange([...entries, { species: id, heightCm: 0, density: '' }]); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats Blocks ──────────────────────────────────────────────────────────────

const HEALTH_LABEL_MAP: Record<string, string> = { HEALTHY: 'Vital', DAMAGED: 'Geschädigt', DEAD: 'Abgestorben', MARKED_FOR_FELLING: 'Zum Fällen' };
const HEALTH_COLOR_MAP: Record<string, string> = { HEALTHY: 'text-emerald-600', DAMAGED: 'text-amber-500', DEAD: 'text-red-500', MARKED_FOR_FELLING: 'text-orange-500' };
const HEALTH_LABEL: Record<string, string> = { HEALTHY: 'Vital', STRESSED: 'Gestresst', DAMAGED: 'Geschädigt', DEAD: 'Abgestorben' };

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-emerald-100 rounded-lg px-3 py-2 text-center">
      <div className="text-sm font-bold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[9px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function InventoryStatsBlock({ trees }: { trees: TreePoi[] }) {
  const stats = useMemo(() => computeInventoryStats(trees), [trees]);
  if (!stats) return null;
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
        <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
          <BarChart2 size={11} /> Inventur-Auswertung · {stats.n} Bäume
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <StatPill label="Mittl. BHD (Dg)" value={`${stats.dg.toFixed(1)} cm`} />
          <StatPill label="Mittl. Höhe" value={stats.meanHeight != null ? `${stats.meanHeight.toFixed(1)} m` : '–'} sub={stats.meanHeight != null && stats.treesWithHeight < stats.n ? `aus ${stats.treesWithHeight} Bäumen` : undefined} />
          <StatPill label="Grundfläche Σ" value={`${stats.basalAreaSum.toFixed(2)} m²`} />
          <StatPill label="Vorrat ≈" value={stats.volumeEstimate > 0 ? `${stats.volumeEstimate.toFixed(1)} m³` : '–'} sub={stats.volumeEstimate > 0 ? 'Schätzwert' : undefined} />
        </div>
        {stats.speciesBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stats.speciesBreakdown.map(s => (
              <span key={s.species} className="flex items-center gap-1 text-xs text-slate-700 bg-white border border-slate-100 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getSpeciesColor(s.species) }} />
                {getSpeciesLabel(s.species)} {s.pct}%
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {stats.healthBreakdown.map(h => (
            <span key={h.health} className={`text-xs font-medium ${HEALTH_COLOR_MAP[h.health] ?? 'text-slate-500'}`}>
              {HEALTH_LABEL_MAP[h.health] ?? h.health} {h.pct}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlotStatsBlock({ plot, compartmentAge }: { plot: InventoryPlotData; compartmentAge: number | null }) {
  const stats = useMemo(() => computePlotStats(plot, compartmentAge), [plot, compartmentAge]);
  const dateStr = new Date(plot.measuredAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div className="border border-violet-100 rounded-xl bg-violet-50/40 overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b border-violet-100">
        <CircleDot size={12} className="text-violet-600 shrink-0" />
        <span className="text-xs font-semibold text-violet-700">{plot.name || 'Probekreis'}</span>
        <span className="text-[10px] text-violet-400 ml-1">r = {plot.radiusM} m · {(Math.PI * plot.radiusM ** 2).toFixed(0)} m² · {dateStr}</span>
        <span className="ml-auto text-[10px] text-violet-400">{plot.trees.length} Bäume</span>
      </div>
      {stats ? (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg px-2 py-2 text-center border border-violet-100"><div className="text-sm font-bold text-slate-800">{Math.round(stats.nHa)}</div><div className="text-[10px] text-slate-500">N/ha</div></div>
            <div className="bg-white rounded-lg px-2 py-2 text-center border border-violet-100"><div className="text-sm font-bold text-slate-800">{stats.gHa.toFixed(1)}</div><div className="text-[10px] text-slate-500">G/ha (m²)</div></div>
            <div className="bg-white rounded-lg px-2 py-2 text-center border border-violet-100"><div className="text-sm font-bold text-slate-800">{stats.vHa != null ? Math.round(stats.vHa) : '–'}</div><div className="text-[10px] text-slate-500">V/ha (m³)</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-500">Dg <span className="font-medium text-slate-700">{stats.dg.toFixed(1)} cm</span></div>
            <div className="text-slate-500">Mittl. Höhe <span className="font-medium text-slate-700">{stats.meanHeight != null ? `${stats.meanHeight.toFixed(1)} m` : '–'}</span></div>
          </div>
          {stats.siteClass && stats.dominantSpecies && (
            <div className="bg-white border border-emerald-100 rounded-lg p-2 text-xs space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">Ertragstafel · {getSpeciesLabel(stats.dominantSpecies)}</div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Bonität</span><span className="font-medium text-slate-700">{SITE_CLASS_LABELS[stats.siteClass]}</span></div>
              {stats.bestockungsgrad != null && <div className="flex items-center justify-between"><span className="text-slate-500">Bestockungsgrad</span><span className={`font-bold ${stats.bestockungsgrad >= 1.0 ? 'text-emerald-700' : stats.bestockungsgrad >= 0.7 ? 'text-amber-600' : 'text-red-500'}`}>{stats.bestockungsgrad.toFixed(2)}</span></div>}
              {stats.refGHa  != null && <div className="flex items-center justify-between"><span className="text-slate-500">Tafel G/ha</span><span className="font-medium text-slate-700">{stats.refGHa.toFixed(0)} m²/ha</span></div>}
              {stats.refVHa  != null && <div className="flex items-center justify-between"><span className="text-slate-500">Tafel V/ha</span><span className="font-medium text-slate-700">{stats.refVHa.toFixed(0)} m³/ha</span></div>}
              {stats.refIvHa != null && <div className="flex items-center justify-between"><span className="text-slate-500">Zuwachs (iV)</span><span className="font-medium text-slate-700">{stats.refIvHa.toFixed(1)} m³/ha/a</span></div>}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 px-3 py-2">Keine BHD-Messungen — Kennzahlen nicht berechenbar.</p>
      )}
    </div>
  );
}

// ── Tree Row ──────────────────────────────────────────────────────────────────
function TreeRow({ poi }: { poi: TreePoi }) {
  const t = poi.tree!;
  return (
    <div className="flex items-center gap-3 py-1.5 px-3 rounded-md hover:bg-slate-50">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.species ? getSpeciesColor(t.species) : '#94a3b8' }} />
      <span className="text-sm font-medium text-slate-700 flex-1 truncate">{poi.name || (t.species ? getSpeciesLabel(t.species) : 'Baum')}</span>
      <div className="flex gap-3 text-xs text-slate-500 shrink-0">
        {t.diameter != null && <span>Ø {t.diameter} cm</span>}
        {t.height   != null && <span>{t.height} m</span>}
        {t.age      != null && <span>{t.age} J</span>}
        {t.health   && <span className={`font-medium ${t.health === 'HEALTHY' ? 'text-emerald-600' : t.health === 'DEAD' ? 'text-red-500' : 'text-amber-500'}`}>{HEALTH_LABEL[t.health] ?? t.health}</span>}
      </div>
    </div>
  );
}

// ── Compartment Editor (right panel) ─────────────────────────────────────────
function CompartmentEditor({ compartment, orgSlug, trees, onSaved }: {
  compartment: Compartment; orgSlug: string; trees: TreePoi[]; onSaved: (updated: Compartment) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/forsteinrichtung/pdf?orgSlug=${orgSlug}&compartmentId=${compartment.id}`);
      if (!res.ok) throw new Error('PDF-Fehler');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Abteilungsblatt_${compartment.number ?? compartment.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF konnte nicht erstellt werden.');
    } finally {
      setPdfLoading(false);
    }
  };

  const [name,             setName]             = useState(compartment.name ?? '');
  const [number,           setNumber]           = useState(compartment.number ?? '');
  const [note,             setNote]             = useState(compartment.note ?? '');
  const [soilType,         setSoilType]         = useState(compartment.soilType ?? '');
  const [waterBalance,     setWaterBalance]     = useState(compartment.waterBalance ?? '');
  const [nutrientLevel,    setNutrientLevel]    = useState(compartment.nutrientLevel ?? '');
  const [exposition,       setExposition]       = useState(compartment.exposition ?? '');
  const [slopeClass,       setSlopeClass]       = useState(compartment.slopeClass ?? '');
  const [protectionStatus, setProtectionStatus] = useState(compartment.protectionStatus ?? '');
  const [restrictions,     setRestrictions]     = useState(compartment.restrictions ?? '');
  const [standAge,         setStandAge]         = useState(compartment.standAge?.toString() ?? '');
  const [developmentStage, setDevelopmentStage] = useState(compartment.developmentStage ?? '');
  const [mainSpecies,      setMainSpecies]      = useState<SpeciesEntry[]>(compartment.mainSpecies ?? []);
  const [sideSpecies,      setSideSpecies]      = useState<SpeciesEntry[]>(compartment.sideSpecies ?? []);
  const [mixingForm,       setMixingForm]       = useState(compartment.mixingForm ?? '');
  const [structure,        setStructure]        = useState(compartment.structure ?? '');
  const [volumePerHa,      setVolumePerHa]      = useState(compartment.volumePerHa?.toString() ?? '');
  const [incrementPerHa,   setIncrementPerHa]   = useState(compartment.incrementPerHa?.toString() ?? '');
  const [stockingDegree,   setStockingDegree]   = useState(compartment.stockingDegree?.toString() ?? '');
  const [deadwoodPerHa,    setDeadwoodPerHa]    = useState(compartment.deadwoodPerHa?.toString() ?? '');
  const [yieldClass,       setYieldClass]       = useState(compartment.yieldClass?.toString() ?? '');
  const [siteProductivity, setSiteProductivity] = useState(compartment.siteProductivity ?? '');
  const [rejuvenation,     setRejuvenation]     = useState<RejuvEntry[]>(compartment.rejuvenation ?? []);
  const [vitalityNote,     setVitalityNote]     = useState(compartment.vitalityNote ?? '');
  const [damageNote,       setDamageNote]       = useState(compartment.damageNote ?? '');
  const [stabilityNote,    setStabilityNote]    = useState(compartment.stabilityNote ?? '');
  const [lastMeasureDate,  setLastMeasureDate]  = useState(compartment.lastMeasureDate ?? '');
  const [lastMeasureType,  setLastMeasureType]  = useState(compartment.lastMeasureType ?? '');
  const [maintenanceStatus,setMaintenanceStatus]= useState(compartment.maintenanceStatus ?? '');
  const [accessibility,    setAccessibility]    = useState(compartment.accessibility ?? '');

  const plots = compartment.inventoryPlots ?? [];

  const handleSave = async () => {
    // Plausibilitätsprüfung vor dem Speichern
    const standWarns = validateStandMetrics({
      stockingDegree: stockingDegree ? parseFloat(stockingDegree) : null,
      volumePerHa:    volumePerHa    ? parseFloat(volumePerHa)    : null,
      incrementPerHa: incrementPerHa ? parseFloat(incrementPerHa) : null,
    });
    for (const w of standWarns) {
      if (w.severity === 'error') {
        toast.error(w.message);
        return;
      }
      if (w.severity === 'warning') {
        toast.warning(w.message, { duration: 5000 });
      }
    }

    setSaving(true);
    try {
      const data = {
        name, number, note,
        soilType, waterBalance, nutrientLevel, exposition, slopeClass, protectionStatus, restrictions,
        standAge: standAge ? parseInt(standAge) : null,
        developmentStage, mainSpecies, sideSpecies, mixingForm, structure,
        volumePerHa:    volumePerHa    ? parseFloat(volumePerHa)    : null,
        incrementPerHa: incrementPerHa ? parseFloat(incrementPerHa) : null,
        stockingDegree: stockingDegree ? parseFloat(stockingDegree) : null,
        deadwoodPerHa:  deadwoodPerHa  ? parseFloat(deadwoodPerHa)  : null,
        yieldClass:     yieldClass     ? parseFloat(yieldClass)     : null,
        siteProductivity, rejuvenation,
        vitalityNote, damageNote, stabilityNote,
        lastMeasureDate, lastMeasureType, maintenanceStatus, accessibility,
      };
      const res = await updateCompartment(compartment.id, data, orgSlug);
      if (!res.success) throw new Error((res as any).error);
      toast.success('Abteilung gespeichert');
      onSaved({ ...compartment, ...data, standAge: data.standAge });
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${number ? `[${number}] ` : ''}${name || 'Abteilung'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30 shadow-sm"
          style={{ backgroundColor: compartment.color ?? '#3b82f6' }} />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-900 text-base leading-tight truncate">{displayName}</h2>
          {compartment.areaHa != null && (
            <span className="text-xs text-slate-400">{compartment.areaHa.toFixed(2)} ha</span>
          )}
        </div>
        <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading} className="shrink-0 border-slate-200 text-slate-600 hover:text-slate-900">
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Speichern
        </Button>
      </div>

      {/* Scrollable form + stats */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50">

        {/* Allgemein */}
        <Section title="Allgemein" cols={2}>
          <TField label="Abteilungsnummer" value={number} onChange={setNumber} placeholder="z. B. 101a" />
          <TField label="Name" value={name} onChange={setName} placeholder="z. B. Nordabhang" />
        </Section>

        {/* Standort */}
        <Section title="Standort" cols={2}>
          <TField label="Bodentyp" value={soilType} onChange={setSoilType} placeholder="z. B. Braunerde" />
          <SField label="Wasserhaushalt" value={waterBalance} onChange={setWaterBalance} options={WATER_OPTIONS} />
          <SField label="Nährstoffstufe" value={nutrientLevel} onChange={setNutrientLevel} options={NUTRIENT_OPTIONS} />
          <SField label="Exposition" value={exposition} onChange={setExposition} options={EXPOSITION_OPTIONS} />
          <SField label="Hangneigung" value={slopeClass} onChange={setSlopeClass} options={SLOPE_OPTIONS} />
          <TField label="Schutzstatus" value={protectionStatus} onChange={setProtectionStatus} placeholder="z. B. FFH, NSG" />
          <div className="col-span-2">
            <TField label="Restriktionen / Auflagen" value={restrictions} onChange={setRestrictions} placeholder="z. B. kein Kahlschlag" />
          </div>
        </Section>

        {/* Bestand */}
        <Section title="Bestand" cols={2}>
          <NField label="Bestandesalter" value={standAge} onChange={setStandAge} unit="Jahre" step="1" />
          <SField label="Entwicklungsstufe" value={developmentStage} onChange={setDevelopmentStage} options={DEVELOP_OPTIONS} />
          <SField label="Mischungsform" value={mixingForm} onChange={setMixingForm} options={MIXING_OPTIONS} />
          <SField label="Struktur" value={structure} onChange={setStructure} options={STRUCTURE_OPTIONS} />
          <div className="col-span-2">
            <SpeciesEditor label="Hauptbaumarten" entries={mainSpecies} onChange={setMainSpecies} />
          </div>
          <div className="col-span-2">
            <SpeciesEditor label="Nebenbaumarten" entries={sideSpecies} onChange={setSideSpecies} />
          </div>
        </Section>

        {/* Altersfeldführung: Ertragstafel-Vorschau aus Alter + Baumart */}
        {(() => {
          const age = standAge ? parseInt(standAge) : null;
          const sp = mainSpecies[0]?.species ?? null;
          if (!age || !sp || !isYieldTableSpecies(sp)) return null;
          const dominant = sp as Species;
          // Alle 5 Ertragsklassen anzeigen
          const rows = ([1, 2, 3, 4, 5] as SiteClass[]).map(ekl => {
            const r = getYieldTableValues(dominant, age, ekl);
            return r ? { ekl, ...r } : null;
          }).filter(Boolean) as (ReturnType<typeof getYieldTableValues> & { ekl: SiteClass })[];
          if (rows.length === 0) return null;
          // Aktuell hinterlegte EKL hervorheben
          const currentEkl = yieldClass ? Math.round(parseFloat(yieldClass)) as SiteClass : null;
          return (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Ertragstafel · {getSpeciesLabel(dominant)} · {age} Jahre
                </span>
                <span className="text-[10px] text-slate-400">Quelle: Wiedemann/Schober/Bergel</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-500">EKL</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-slate-500">Oberhöhe</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-slate-500">G/ha</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-slate-500">V/ha</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-slate-500">iV/ha/a</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const isActive = currentEkl === row!.ekl;
                      return (
                        <tr key={row!.ekl} className={`border-b border-slate-50 ${isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className={`px-3 py-1.5 font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {SITE_CLASS_LABELS[row!.ekl]}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row!.hTop.toFixed(1)} m</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row!.gHa.toFixed(0)} m²</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row!.vHa.toFixed(0)} m³</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row!.ivHa.toFixed(1)}</td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => {
                                setYieldClass(row!.ekl.toString());
                                setVolumePerHa(row!.vHa.toFixed(0));
                                setIncrementPerHa(row!.ivHa.toFixed(1));
                                toast.success(`EKL ${row!.ekl} übernommen`);
                              }}
                              className="text-[10px] text-emerald-600 hover:text-emerald-800 font-medium px-1.5 py-0.5 rounded hover:bg-emerald-50"
                            >
                              ↑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 px-4 py-1.5">Klick auf ↑ übernimmt EKL, V/ha und Zuwachs in die Kennzahlen.</p>
            </div>
          );
        })()}

        {/* Kennzahlen */}
        {/* Auto-Berechnung aus Probekreisen */}
        {(() => {
          const allPlots = compartment.inventoryPlots ?? [];
          if (allPlots.length === 0) return null;
          const plotResults = allPlots.map(plot => {
            const plotTrees: MensPlotTree[] = plot.trees.map(t => ({
              species: t.species,
              diameterCm: t.diameter ?? 0,
              heightM: t.height ?? null,
            })).filter(t => t.diameterCm > 0);
            return calcPlotMetrics(plotTrees, plot.radiusM, true);
          }).filter(Boolean) as NonNullable<ReturnType<typeof calcPlotMetrics>>[];
          if (plotResults.length === 0) return null;
          const avg = averagePlotResults(plotResults);
          if (!avg) return null;

          // Ertragstafel-Abgleich
          const dominantSpeciesId = (() => {
            const sp = compartment.mainSpecies?.[0]?.species ?? null;
            return sp && isYieldTableSpecies(sp) ? sp as Species : null;
          })();
          const age = compartment.standAge;
          let refIncrement: number | null = null;
          let refStocking: number | null = null;
          if (dominantSpeciesId && age && avg.meanHeight) {
            const sorted = [...allPlots.flatMap(p => p.trees.filter(t => t.height != null))].sort((a, b) => (b.diameter ?? 0) - (a.diameter ?? 0));
            const topK = Math.max(1, Math.round(sorted.length * 0.2));
            const hTop = sorted.slice(0, topK).reduce((s, t) => s + (t.height ?? 0), 0) / topK;
            const sc = estimateSiteClass(dominantSpeciesId, age, hTop || avg.meanHeight);
            const ref = getYieldTableValues(dominantSpeciesId, age, sc);
            if (ref) {
              refIncrement = ref.ivHa;
              refStocking = avg.gHa / ref.gHa;
            }
          }

          return (
            <div className="border border-emerald-200 rounded-lg bg-emerald-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
                  <BarChart2 size={11} /> Berechnete Werte aus {allPlots.length} Probekreis{allPlots.length > 1 ? 'en' : ''}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => {
                    if (avg.gHa != null)      setStockingDegree(refStocking?.toFixed(2) ?? '');
                    if (avg.vHa != null)      setVolumePerHa(avg.vHa.toString());
                    if (refIncrement != null) setIncrementPerHa(refIncrement.toFixed(1));
                    toast.success('Kennzahlen aus Inventur übernommen');
                  }}
                >
                  Übernehmen
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800">
                <div><span className="text-emerald-600">G/ha</span> <span className="font-semibold">{avg.gHa.toFixed(1)} m²</span></div>
                <div><span className="text-emerald-600">V/ha</span> <span className="font-semibold">{avg.vHa != null ? `${avg.vHa} m³` : '–'}</span></div>
                <div><span className="text-emerald-600">N/ha</span> <span className="font-semibold">{avg.nHa}</span></div>
                <div><span className="text-emerald-600">Dg</span> <span className="font-semibold">{avg.dg} cm</span></div>
                {refStocking != null && <div><span className="text-emerald-600">Bstg.</span> <span className="font-semibold">{refStocking.toFixed(2)}</span></div>}
                {refIncrement != null && <div><span className="text-emerald-600">Zuwachs</span> <span className="font-semibold">{refIncrement.toFixed(1)} m³/ha/a</span></div>}
              </div>
              {avg.heightEstimated && <p className="text-[10px] text-emerald-600 mt-1.5">* fehlende Höhen mit Michailoff-Kurve geschätzt</p>}
            </div>
          );
        })()}

        <Section title="Kennzahlen" cols={3}>
          <NField label="Vorrat" value={volumePerHa} onChange={setVolumePerHa} unit="m³/ha" />
          <NField label="Zuwachs" value={incrementPerHa} onChange={setIncrementPerHa} unit="m³/ha/a" />
          <NField label="Bestockungsgrad" value={stockingDegree} onChange={setStockingDegree} step="0.05" />
          <NField label="Totholz" value={deadwoodPerHa} onChange={setDeadwoodPerHa} unit="m³/ha" />
          <NField label="Bonität (EKL)" value={yieldClass} onChange={setYieldClass} step="0.5" />
          <SField label="Wuchsleistung" value={siteProductivity} onChange={setSiteProductivity} options={PRODUCTIVITY_OPTIONS} />
        </Section>

        {/* Verjüngung */}
        <SectionFull title="Verjüngung">
          <RejuvEditor entries={rejuvenation} onChange={setRejuvenation} />
        </SectionFull>

        {/* Zustand */}
        <SectionFull title="Zustand">
          <div>
            <Label>Vitalität / Kronenzustand</Label>
            <Textarea value={vitalityNote} onChange={e => setVitalityNote(e.target.value)}
              placeholder="Beschreibung Kronenzustand, Vitalitätsstufe..." className="text-sm min-h-[72px]" />
          </div>
          <div>
            <Label>Schäden (biotisch / abiotisch)</Label>
            <Textarea value={damageNote} onChange={e => setDamageNote(e.target.value)}
              placeholder="Art und Ausmaß der Schäden..." className="text-sm min-h-[72px]" />
          </div>
          <div>
            <Label>Stabilität / Risiko</Label>
            <Textarea value={stabilityNote} onChange={e => setStabilityNote(e.target.value)}
              placeholder="Standfestigkeit, Sturm- und Schneebruchrisiko..." className="text-sm min-h-[72px]" />
          </div>
        </SectionFull>

        {/* Bewirtschaftung */}
        <Section title="Bewirtschaftung" cols={2}>
          <TField label="Letzte Maßnahme (Datum)" value={lastMeasureDate} onChange={setLastMeasureDate} placeholder="z. B. 03/2024" />
          <TField label="Art der Maßnahme" value={lastMeasureType} onChange={setLastMeasureType} placeholder="z. B. Durchforstung" />
          <SField label="Pflegezustand" value={maintenanceStatus} onChange={setMaintenanceStatus} options={MAINTENANCE_OPTIONS} />
          <SField label="Befahrbarkeit" value={accessibility} onChange={setAccessibility} options={ACCESSIBILITY_OPTIONS} />
        </Section>

        {/* Notiz */}
        <SectionFull title="Notiz">
          <Textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Allgemeine Notizen..." className="text-sm min-h-[80px]" />
        </SectionFull>

        {/* Probekreise */}
        {plots.length > 0 && (
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wide text-violet-600 flex items-center gap-1.5">
                <CircleDot size={11} /> Probekreise ({plots.length})
              </span>
            </div>
            <div className="p-4 space-y-0">
              {plots.map(plot => (
                <PlotStatsBlock key={plot.id} plot={plot} compartmentAge={compartment.standAge} />
              ))}
            </div>
          </div>
        )}

        {/* Inventur-Auswertung */}
        {trees.length > 0 && <InventoryStatsBlock trees={trees} />}

        {/* Erfasste Bäume */}
        {trees.length > 0 && (
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <TreePine size={11} /> Erfasste Bäume ({trees.length})
              </span>
            </div>
            <div className="p-2 space-y-0.5">
              {trees.map(poi => <TreeRow key={poi.id} poi={poi} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Import Wizard ─────────────────────────────────────────────────────────────

interface ExtractedCompartment {
  number?: string; name?: string; areaHa?: number; standAge?: number;
  developmentStage?: string;
  mainSpecies: { species: string; percent: number }[];
  sideSpecies:  { species: string; percent: number }[];
  yieldClass?: number; volumePerHa?: number; incrementPerHa?: number;
  stockingDegree?: number; soilType?: string; waterBalance?: string;
  exposition?: string; slopeClass?: string; protectionStatus?: string;
  maintenanceStatus?: string; note?: string;
}

function ImportWizardDialog({ forests, orgSlug, onClose, onImported }: {
  forests: Forest[]; orgSlug: string; onClose: () => void; onImported: () => void;
}) {
  const [step, setStep]               = useState<'upload' | 'review' | 'done'>('upload');
  const [uploading, setUploading]     = useState(false);
  const [tokensUsed, setTokensUsed]   = useState(0);
  const [rows, setRows]               = useState<ExtractedCompartment[]>([]);
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [targetForestId, setTargetForestId] = useState(forests[0]?.id ?? '');
  const [importing, setImporting]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('orgSlug', orgSlug);
      const res = await fetch('/api/forsteinrichtung/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Fehler');
      const extracted: ExtractedCompartment[] = json.compartments ?? [];
      setRows(extracted);
      setSelected(new Set(extracted.map((_, i) => i)));
      setTokensUsed(json.tokensUsed ?? 0);
      setStep('review');
    } catch (e: any) {
      toast.error('KI-Analyse fehlgeschlagen: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleRow = (i: number) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const handleImport = async () => {
    if (!targetForestId) { toast.error('Bitte Wald auswählen'); return; }
    const toImport = rows.filter((_, i) => selected.has(i));
    if (toImport.length === 0) { toast.error('Keine Abteilungen ausgewählt'); return; }
    setImporting(true);
    try {
      const res = await importCompartmentsFromAI(targetForestId, orgSlug, toImport);
      if (!res.success) throw new Error((res as any).error);
      toast.success(`${toImport.length} Abteilung${toImport.length > 1 ? 'en' : ''} importiert`);
      setStep('done');
      onImported();
    } catch (e: any) {
      toast.error('Import fehlgeschlagen: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 shrink-0">
          <Upload size={16} className="text-emerald-600" />
          <h3 className="font-bold text-slate-900">Forsteinrichtung importieren (KI)</h3>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Lade ein Foto oder einen Scan einer bestehenden Forsteinrichtungstafel hoch.
                GPT-4o analysiert das Bild und extrahiert alle Abteilungsdaten automatisch.
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
              >
                {uploading
                  ? <><Loader2 size={28} className="animate-spin text-emerald-600" /><span className="text-sm text-slate-500">Analysiere Bild …</span></>
                  : <><Upload size={28} className="text-slate-400" /><span className="text-sm text-slate-500">Bild auswählen (JPEG, PNG, WebP)</span></>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>KI hat <strong>{rows.length}</strong> Abteilung{rows.length !== 1 ? 'en' : ''} erkannt
                  {tokensUsed > 0 && <span className="text-slate-400 ml-1">({tokensUsed} Tokens)</span>}
                  . Wähle die zu importierenden aus:
                </span>
              </div>

              {rows.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
                  <AlertTriangle size={14} /> Keine Abteilungen erkannt. Bitte ein deutlicheres Bild hochladen.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-2 py-2 w-8">
                          <input type="checkbox" checked={selected.size === rows.length}
                            onChange={e => setSelected(e.target.checked ? new Set(rows.map((_, i) => i)) : new Set())} />
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Nr.</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Fläche</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Alter</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Hauptart</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">V/ha</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Stufe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} onClick={() => toggleRow(i)}
                          className={`border-b border-slate-100 cursor-pointer ${selected.has(i) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-2 py-1.5 text-center">
                            <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)}
                              onClick={e => e.stopPropagation()} />
                          </td>
                          <td className="px-3 py-1.5 font-medium text-slate-700">{row.number ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-600">{row.name ?? '–'}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row.areaHa != null ? `${row.areaHa} ha` : '–'}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row.standAge != null ? `${row.standAge} J` : '–'}</td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {row.mainSpecies?.[0] ? (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getSpeciesColor(row.mainSpecies[0].species) }} />
                                {getSpeciesLabel(row.mainSpecies[0].species)} {row.mainSpecies[0].percent}%
                              </span>
                            ) : '–'}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{row.volumePerHa != null ? row.volumePerHa : '–'}</td>
                          <td className="px-3 py-1.5 text-slate-600 truncate max-w-[90px]">{row.developmentStage ?? '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide shrink-0">Importieren in:</label>
                <select value={targetForestId} onChange={e => setTargetForestId(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-md text-sm px-3 py-1.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 size={40} className="text-emerald-600" />
              <p className="text-sm text-slate-700 font-medium">Import abgeschlossen!</p>
              <p className="text-xs text-slate-500">Die Abteilungen wurden angelegt. Du kannst sie jetzt in der Liste bearbeiten.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 shrink-0">
          {step === 'review' && rows.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setStep('upload')}
              className="border-slate-200 text-slate-600">
              Neues Bild
            </Button>
          )}
          {step === 'review' && rows.length > 0 && (
            <Button size="sm" onClick={handleImport} disabled={importing || selected.size === 0}
              className="bg-emerald-700 hover:bg-emerald-800 text-white">
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {selected.size} Abteilung{selected.size !== 1 ? 'en' : ''} importieren
            </Button>
          )}
          {(step === 'done' || (step === 'review' && rows.length === 0)) && (
            <Button size="sm" onClick={onClose} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Schließen
            </Button>
          )}
          {step === 'upload' && (
            <Button size="sm" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600">
              Abbrechen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Left panel: compartment list ──────────────────────────────────────────────

function AllPdfButton({ orgSlug }: { orgSlug: string }) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forsteinrichtung/pdf?orgSlug=${orgSlug}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Forsteinrichtung_${orgSlug}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally { setLoading(false); }
  };
  return (
    <button onClick={download} disabled={loading}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-slate-200">
      {loading ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
      Forsteinrichtung exportieren
    </button>
  );
}

function CompartmentListItem({ compartment, selected, onClick }: {
  compartment: Compartment; selected: boolean; onClick: () => void;
}) {
  const title = `${compartment.number ? `[${compartment.number}] ` : ''}${compartment.name || 'Abteilung'}`;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2.5 ${
        selected
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
          : 'hover:bg-slate-50 border border-transparent text-slate-700'
      }`}
    >
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: compartment.color ?? '#3b82f6' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="flex gap-1.5 mt-0.5 flex-wrap">
          {compartment.areaHa != null && <span className="text-[10px] text-slate-400">{compartment.areaHa.toFixed(1)} ha</span>}
          {compartment.developmentStage && <span className="text-[10px] text-slate-400">{compartment.developmentStage}</span>}
        </div>
      </div>
    </button>
  );
}

function ForestGroup({ forest, selectedId, onSelect, query }: {
  forest: Forest; selectedId: string | null; onSelect: (c: Compartment) => void; query: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <div>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-50 rounded-md"
      >
        {collapsed ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
        <Layers size={13} className="text-emerald-600 shrink-0" />
        <span className="text-xs font-bold text-slate-700 flex-1 truncate">{forest.name}</span>
        <span className="text-[10px] text-slate-400 shrink-0">{filtered.length}</span>
      </button>
      {!collapsed && (
        <div className="mt-1 space-y-0.5 pl-1">
          {filtered.map(c => (
            <CompartmentListItem
              key={c.id}
              compartment={c}
              selected={selectedId === c.id}
              onClick={() => onSelect(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────

export function ForsteinrichtungClient({ forests, orgSlug }: { forests: Forest[]; orgSlug: string }) {
  const [query, setQuery] = useState('');
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(() => {
    // Default: select first compartment if exists
    return forests[0]?.compartments[0]?.id ?? null;
  });
  // Track live compartment data after saves
  const [liveCompartments, setLiveCompartments] = useState<Record<string, Compartment>>({});
  const [showImport, setShowImport] = useState(false);

  // Build a flat lookup of all compartments + their forest
  const allCompartments = useMemo(() => {
    const map = new Map<string, { compartment: Compartment; forest: Forest }>();
    forests.forEach(f => f.compartments.forEach(c => map.set(c.id, { compartment: c, forest: f })));
    return map;
  }, [forests]);

  const selectedEntry = selectedCompartmentId ? allCompartments.get(selectedCompartmentId) : null;
  const selectedCompartment = selectedEntry
    ? (liveCompartments[selectedCompartmentId!] ?? selectedEntry.compartment)
    : null;
  const selectedForest = selectedEntry?.forest ?? null;
  const selectedTrees = selectedForest && selectedCompartmentId
    ? selectedForest.pois.filter(p => p.tree?.compartmentId === selectedCompartmentId)
    : [];

  const handleSelect = (c: Compartment) => setSelectedCompartmentId(c.id);
  const handleSaved = (updated: Compartment) => {
    setLiveCompartments(prev => ({ ...prev, [updated.id]: updated }));
  };

  const totalCompartments = forests.reduce((s, f) => s + f.compartments.length, 0);
  const totalHa = forests.reduce((s, f) => s + f.compartments.reduce((a, c) => a + (c.areaHa ?? 0), 0), 0);
  const totalTrees = forests.reduce((s, f) => s + f.pois.filter(p => p.tree).length, 0);

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {showImport && (
        <ImportWizardDialog
          forests={forests}
          orgSlug={orgSlug}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); window.location.reload(); }}
        />
      )}

      {/* ── Left panel: compartment list ── */}
      <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-white overflow-hidden">

        {/* Stats summary */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="grid grid-cols-3 gap-1 text-center mb-2">
            <div><div className="text-base font-bold text-slate-900">{totalCompartments}</div><div className="text-[9px] text-slate-400 uppercase tracking-wide">Abtlg.</div></div>
            <div><div className="text-base font-bold text-slate-900">{totalHa.toFixed(0)}</div><div className="text-[9px] text-slate-400 uppercase tracking-wide">ha</div></div>
            <div><div className="text-base font-bold text-slate-900">{totalTrees}</div><div className="text-[9px] text-slate-400 uppercase tracking-wide">Bäume</div></div>
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1"><AllPdfButton orgSlug={orgSlug} /></div>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-slate-200"
              title="Forsteinrichtung per KI importieren"
            >
              <Upload size={11} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Suchen …"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Forest groups */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
          {forests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Keine Wälder gefunden.</p>
          ) : (
            forests.map(f => (
              <ForestGroup key={f.id} forest={f} selectedId={selectedCompartmentId} onSelect={handleSelect} query={query} />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: editor ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedCompartment ? (
          <CompartmentEditor
            key={selectedCompartmentId!}
            compartment={selectedCompartment}
            orgSlug={orgSlug}
            trees={selectedTrees}
            onSaved={handleSaved}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Abteilung aus der Liste auswählen
          </div>
        )}
      </div>
    </div>
  );
}
