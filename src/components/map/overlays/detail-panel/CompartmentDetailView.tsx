'use client';

import { useState, useMemo } from 'react';
import {
  Grid3x3, Ruler, Loader2, ScanLine, Check, Trash2, Radio, PlusCircle,
  Calendar, User, AlertCircle, ChevronDown, ChevronRight, Trees, Mountain,
  Layers, BarChart3, Sprout, Heart, Wrench,
} from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateCompartment, deleteCompartment, togglePolygonBiomass } from '@/actions/polygons';
import { toast } from 'sonner';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn, getUserColor, getInitials } from '@/lib/utils';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

function formatArea(ha?: number | null): string {
  if (!ha) return '—';
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

function ageClass(age?: number | null): string {
  if (!age) return '—';
  if (age <= 20) return 'I (1–20 J.)';
  if (age <= 40) return 'II (21–40 J.)';
  if (age <= 60) return 'III (41–60 J.)';
  if (age <= 80) return 'IV (61–80 J.)';
  if (age <= 100) return 'V (81–100 J.)';
  if (age <= 120) return 'VI (101–120 J.)';
  return 'VII+ (>120 J.)';
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#ef4444',
  '#a855f7', '#eab308', '#ec4899', '#64748b',
];

const EXPOSITION_OPTIONS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'eben'];
const SLOPE_OPTIONS = ['eben', 'schwach (<15°)', 'mittel (15–25°)', 'steil (25–35°)', 'sehr steil (>35°)'];
const DEVELOP_OPTIONS = ['Blöße', 'Verjüngung', 'Dickung', 'Stangenholz', 'Baumholz I', 'Baumholz II', 'Baumholz III', 'Altholz', 'Plenterwald'];
const MIXING_OPTIONS = ['rein', 'truppweise', 'horst', 'gruppen', 'einzeln', 'gemischt'];
const STRUCTURE_OPTIONS = ['einschichtig', 'zweischichtig', 'mehrschichtig', 'plenterartig'];
const PRODUCTIVITY_OPTIONS = ['sehr gering', 'gering', 'mittel', 'hoch', 'sehr hoch'];
const MAINTENANCE_OPTIONS = ['vernachlässigt', 'mangelhaft', 'ausreichend', 'gut', 'sehr gut'];
const ACCESSIBILITY_OPTIONS = ['nicht befahrbar', 'bedingt befahrbar', 'befahrbar', 'gut befahrbar'];

interface SpeciesEntry { species: string; percent: number; }
interface RejuvEntry { species: string; heightCm: number; density: string; }

interface Props {
  compartment: any;
  forest: any;
  orgSlug: string;
  tasks: any[];
  members: any[];
  forests: any[];
  compartmentTrees: any[];
  onClose: () => void;
  onRefresh: () => void;
  onDeleteSuccess: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

// ─── Accordion Section ───────────────────────────────────────────────────────
function Section({ icon, title, children, defaultOpen = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 hover:bg-white/8 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
          {icon} {title}
        </span>
        {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, unit }: { label: string; value?: string | number | null; unit?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[11px] text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 text-right">
        {value !== null && value !== undefined && value !== '' ? `${value}${unit ? ' ' + unit : ''}` : '—'}
      </span>
    </div>
  );
}

// ─── Select Input ─────────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-black/50 border border-white/20 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">{placeholder ?? '– wählen –'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Number Input ─────────────────────────────────────────────────────────────
function NumberField({ label, value, onChange, unit, placeholder, step }: {
  label: string; value: string; onChange: (v: string) => void;
  unit?: string; placeholder?: string; step?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{label}{unit ? ` (${unit})` : ''}</label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step ?? '0.1'}
        placeholder={placeholder ?? ''}
        className="bg-black/50 border-white/20 text-white text-xs h-8"
      />
    </div>
  );
}

// ─── Text Input ───────────────────────────────────────────────────────────────
function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{label}</label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="bg-black/50 border-white/20 text-white text-xs h-8"
      />
    </div>
  );
}

// ─── Species List Editor ──────────────────────────────────────────────────────
function SpeciesEditor({ label, entries, onChange }: {
  label: string; entries: SpeciesEntry[]; onChange: (e: SpeciesEntry[]) => void;
}) {
  const add = () => onChange([...entries, { species: '', percent: 0 }]);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof SpeciesEntry, val: string) => {
    const next = entries.map((e, idx) => idx === i
      ? { ...e, [field]: field === 'percent' ? Number(val) : val }
      : e);
    onChange(next);
  };
  return (
    <div>
      <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{label}</label>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input
              value={e.species}
              onChange={ev => update(i, 'species', ev.target.value)}
              placeholder="Baumart"
              className="bg-black/50 border-white/20 text-white text-xs h-7 flex-1"
            />
            <Input
              type="number" min="0" max="100"
              value={e.percent || ''}
              onChange={ev => update(i, 'percent', ev.target.value)}
              placeholder="%"
              className="bg-black/50 border-white/20 text-white text-xs h-7 w-16"
            />
            <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 text-xs px-1">×</button>
          </div>
        ))}
        <button onClick={add} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <PlusCircle size={11} /> Baumart hinzufügen
        </button>
      </div>
    </div>
  );
}

// ─── Species Bar (view mode) ──────────────────────────────────────────────────
function SpeciesBar({ entries }: { entries: SpeciesEntry[] }) {
  if (!entries?.length) return <span className="text-xs text-gray-600">—</span>;
  return (
    <div className="space-y-1.5">
      {entries.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-300 w-28 truncate">{e.species}</span>
          <div className="flex-1 bg-white/10 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(e.percent, 100)}%` }} />
          </div>
          <span className="text-[10px] text-gray-500 w-8 text-right">{e.percent}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Rejuvenation Editor ──────────────────────────────────────────────────────
function RejuvEditor({ entries, onChange }: {
  entries: RejuvEntry[]; onChange: (e: RejuvEntry[]) => void;
}) {
  const add = () => onChange([...entries, { species: '', heightCm: 0, density: '' }]);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof RejuvEntry, val: string) => {
    const next = entries.map((e, idx) => idx === i
      ? { ...e, [field]: field === 'heightCm' ? Number(val) : val }
      : e);
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {entries.map((e, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <Input value={e.species} onChange={ev => update(i, 'species', ev.target.value)}
            placeholder="Baumart" className="bg-black/50 border-white/20 text-white text-xs h-7 flex-1" />
          <Input type="number" value={e.heightCm || ''} onChange={ev => update(i, 'heightCm', ev.target.value)}
            placeholder="cm" className="bg-black/50 border-white/20 text-white text-xs h-7 w-16" />
          <Input value={e.density} onChange={ev => update(i, 'density', ev.target.value)}
            placeholder="Dichte" className="bg-black/50 border-white/20 text-white text-xs h-7 w-20" />
          <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 text-xs px-1">×</button>
        </div>
      ))}
      <button onClick={add} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
        <PlusCircle size={11} /> Baumart hinzufügen
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompartmentDetailView({
  compartment, forest, orgSlug, tasks, members, forests, compartmentTrees,
  onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);
  const selectFeature      = useMapStore(s => s.selectFeature);

  const [isEditing,     setIsEditing]     = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [trackBiomass,  setTrackBiomass]  = useState<boolean>(compartment.trackBiomass ?? false);
  const [isTogglingBio, setIsTogglingBio] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [deleteTasksToo, setDeleteTasksToo] = useState(false);

  // ── Form State ──────────────────────────────────────────────────────────────
  const [name,              setName]              = useState(compartment.name ?? '');
  const [number,            setNumber]            = useState(compartment.number ?? '');
  const [color,             setColor]             = useState(compartment.color ?? '#3b82f6');
  const [note,              setNote]              = useState(compartment.note ?? '');

  const [soilType,          setSoilType]          = useState(compartment.soilType ?? '');
  const [waterBalance,      setWaterBalance]      = useState(compartment.waterBalance ?? '');
  const [nutrientLevel,     setNutrientLevel]     = useState(compartment.nutrientLevel ?? '');
  const [exposition,        setExposition]        = useState(compartment.exposition ?? '');
  const [slopeClass,        setSlopeClass]        = useState(compartment.slopeClass ?? '');
  const [protectionStatus,  setProtectionStatus]  = useState(compartment.protectionStatus ?? '');
  const [restrictions,      setRestrictions]      = useState(compartment.restrictions ?? '');

  const [standAge,          setStandAge]          = useState(compartment.standAge?.toString() ?? '');
  const [developmentStage,  setDevelopmentStage]  = useState(compartment.developmentStage ?? '');
  const [mainSpecies,       setMainSpecies]       = useState<SpeciesEntry[]>(compartment.mainSpecies ?? []);
  const [sideSpecies,       setSideSpecies]       = useState<SpeciesEntry[]>(compartment.sideSpecies ?? []);
  const [mixingForm,        setMixingForm]        = useState(compartment.mixingForm ?? '');
  const [structure,         setStructure]         = useState(compartment.structure ?? '');

  const [volumePerHa,       setVolumePerHa]       = useState(compartment.volumePerHa?.toString() ?? '');
  const [incrementPerHa,    setIncrementPerHa]    = useState(compartment.incrementPerHa?.toString() ?? '');
  const [stockingDegree,    setStockingDegree]    = useState(compartment.stockingDegree?.toString() ?? '');
  const [deadwoodPerHa,     setDeadwoodPerHa]     = useState(compartment.deadwoodPerHa?.toString() ?? '');
  const [yieldClass,        setYieldClass]        = useState(compartment.yieldClass?.toString() ?? '');
  const [siteProductivity,  setSiteProductivity]  = useState(compartment.siteProductivity ?? '');

  const [rejuvenation,      setRejuvenation]      = useState<RejuvEntry[]>(compartment.rejuvenation ?? []);

  const [vitalityNote,      setVitalityNote]      = useState(compartment.vitalityNote ?? '');
  const [damageNote,        setDamageNote]        = useState(compartment.damageNote ?? '');
  const [stabilityNote,     setStabilityNote]     = useState(compartment.stabilityNote ?? '');

  const [lastMeasureDate,   setLastMeasureDate]   = useState(compartment.lastMeasureDate ?? '');
  const [lastMeasureType,   setLastMeasureType]   = useState(compartment.lastMeasureType ?? '');
  const [maintenanceStatus, setMaintenanceStatus] = useState(compartment.maintenanceStatus ?? '');
  const [accessibility,     setAccessibility]     = useState(compartment.accessibility ?? '');

  // ── Derived Stats from Tree POIs ─────────────────────────────────────────────
  const treeStats = useMemo(() => {
    const trees = compartmentTrees ?? [];
    if (!trees.length) return null;
    const diameters = trees.filter((t: any) => t.diameter).map((t: any) => t.diameter as number);
    const heights   = trees.filter((t: any) => t.height).map((t: any) => t.height as number);
    const avgDiameter = diameters.length ? diameters.reduce((a, b) => a + b, 0) / diameters.length : null;
    const avgHeight   = heights.length   ? heights.reduce((a, b) => a + b, 0) / heights.length     : null;
    const maxHeight   = heights.length   ? Math.max(...heights) : null;
    const stemCount   = compartment.areaHa ? Math.round(trees.length / compartment.areaHa) : null;
    const speciesMap: Record<string, number> = {};
    trees.forEach((t: any) => { if (t.species) speciesMap[t.species] = (speciesMap[t.species] || 0) + 1; });
    const total = trees.length;
    const speciesDist = Object.entries(speciesMap)
      .sort((a, b) => b[1] - a[1])
      .map(([species, count]) => ({ species, percent: Math.round((count / total) * 100) }));
    return { count: trees.length, avgDiameter, avgHeight, maxHeight, stemCount, speciesDist };
  }, [compartmentTrees, compartment.areaHa]);

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';
  const displayName = (name.trim() || number.trim()) ? `${number ? `[${number}] ` : ''}${name.trim() || 'Abteilung'}` : 'Abteilung';

  // ── Linked Tasks ─────────────────────────────────────────────────────────────
  const linkedTasks = useMemo(() => {
    if (!tasks?.length) return [];
    return tasks.filter(t => {
      if (t.status === 'DONE') return false;
      if (t.linkedPolygonId === compartment.id && t.linkedPolygonType === 'COMPARTMENT') return true;
      if (t.lat && t.lng) {
        try {
          const p = point([t.lng, t.lat]);
          const geo = compartment.geoJson;
          const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
          return booleanPointInPolygon(p, feature as any);
        } catch { return false; }
      }
      return false;
    });
  }, [tasks, compartment.id, compartment.geoJson]);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateCompartment(compartment.id, {
        name, number, color, note,
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
      }, orgSlug);
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Abteilung aktualisiert');
      setIsEditing(false);
      onRefresh();
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBiomass = async (enabled: boolean) => {
    setIsTogglingBio(true);
    try {
      const res = await togglePolygonBiomass(compartment.id, 'COMPARTMENT', enabled, orgSlug);
      if (!res.success) throw new Error(res.error);
      setTrackBiomass(enabled);
      toast.success(enabled ? 'Biomasse-Tracking aktiviert' : 'Biomasse-Tracking deaktiviert');
      onRefresh();
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setIsTogglingBio(false);
    }
  };

  const handleToggleGeometry = () => {
    if (isGeometryEditing) {
      setInteractionMode('VIEW');
      setEditingFeature(null);
    } else {
      setInteractionMode('EDIT_GEOMETRY');
      setEditingFeature({ id: compartment.id, geoJson: compartment.geoJson, featureType: 'COMPARTMENT', name: displayName, orgSlug });
      onClose();
      toast.info('Ziehpunkte verschieben um Fläche zu ändern');
    }
  };

  const resetEditing = () => {
    setName(compartment.name ?? '');
    setNumber(compartment.number ?? '');
    setColor(compartment.color ?? '#3b82f6');
    setNote(compartment.note ?? '');
    setSoilType(compartment.soilType ?? '');
    setWaterBalance(compartment.waterBalance ?? '');
    setNutrientLevel(compartment.nutrientLevel ?? '');
    setExposition(compartment.exposition ?? '');
    setSlopeClass(compartment.slopeClass ?? '');
    setProtectionStatus(compartment.protectionStatus ?? '');
    setRestrictions(compartment.restrictions ?? '');
    setStandAge(compartment.standAge?.toString() ?? '');
    setDevelopmentStage(compartment.developmentStage ?? '');
    setMainSpecies(compartment.mainSpecies ?? []);
    setSideSpecies(compartment.sideSpecies ?? []);
    setMixingForm(compartment.mixingForm ?? '');
    setStructure(compartment.structure ?? '');
    setVolumePerHa(compartment.volumePerHa?.toString() ?? '');
    setIncrementPerHa(compartment.incrementPerHa?.toString() ?? '');
    setStockingDegree(compartment.stockingDegree?.toString() ?? '');
    setDeadwoodPerHa(compartment.deadwoodPerHa?.toString() ?? '');
    setYieldClass(compartment.yieldClass?.toString() ?? '');
    setSiteProductivity(compartment.siteProductivity ?? '');
    setRejuvenation(compartment.rejuvenation ?? []);
    setVitalityNote(compartment.vitalityNote ?? '');
    setDamageNote(compartment.damageNote ?? '');
    setStabilityNote(compartment.stabilityNote ?? '');
    setLastMeasureDate(compartment.lastMeasureDate ?? '');
    setLastMeasureType(compartment.lastMeasureType ?? '');
    setMaintenanceStatus(compartment.maintenanceStatus ?? '');
    setAccessibility(compartment.accessibility ?? '');
    setIsEditing(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={displayName}
      icon={<Grid3x3 className="w-4 h-4" style={{ color }} />}
      headerColor=""
      headerStyle={{ background: `linear-gradient(to bottom right, ${color}40, rgba(0,0,0,0.8))` }}
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editNameValue={name}
      onEditNameChange={setName}
      canEdit={canEdit}
      canDelete={canDelete}
      onDelete={() => {}}
    >
      {/* ── KOPFZEILE ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <Ruler size={12} /> Fläche
          </div>
          <div className="text-lg text-white font-mono font-medium">{formatArea(compartment.areaHa)}</div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Wald</div>
          <div className="text-sm text-gray-300 truncate">{forest?.name ?? '—'}</div>
        </div>
      </div>

      {isEditing && (
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Abteilungsnummer" value={number} onChange={setNumber} placeholder="z. B. 101a" />
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Farbe</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
                />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border border-white/20 bg-transparent" />
            </div>
          </div>
        </div>
      )}

      {!isEditing && compartment.number && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-600">Nr. </span>{compartment.number}
        </div>
      )}

      {/* ── STANDORT ── */}
      <Section icon={<Mountain size={13} />} title="Standort">
        {isEditing ? (
          <>
            <TextField label="Bodentyp" value={soilType} onChange={setSoilType} placeholder="z. B. Braunerde" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Wasserhaushalt" value={waterBalance} onChange={setWaterBalance} placeholder="z. B. frisch" />
              <TextField label="Nährstoffstufe" value={nutrientLevel} onChange={setNutrientLevel} placeholder="z. B. mittel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Exposition" value={exposition} onChange={setExposition} options={EXPOSITION_OPTIONS} />
              <SelectField label="Hangneigung" value={slopeClass} onChange={setSlopeClass} options={SLOPE_OPTIONS} />
            </div>
            <TextField label="Schutzstatus" value={protectionStatus} onChange={setProtectionStatus} placeholder="z. B. FFH, NSG" />
            <TextField label="Restriktionen / Auflagen" value={restrictions} onChange={setRestrictions} placeholder="z. B. kein Kahlschlag" />
          </>
        ) : (
          <div className="space-y-1.5">
            <FieldRow label="Bodentyp" value={compartment.soilType} />
            <FieldRow label="Wasserhaushalt" value={compartment.waterBalance} />
            <FieldRow label="Nährstoffstufe" value={compartment.nutrientLevel} />
            <FieldRow label="Exposition" value={compartment.exposition} />
            <FieldRow label="Hangneigung" value={compartment.slopeClass} />
            <FieldRow label="Schutzstatus" value={compartment.protectionStatus} />
            <FieldRow label="Restriktionen" value={compartment.restrictions} />
          </div>
        )}
      </Section>

      {/* ── BESTAND ── */}
      <Section icon={<Trees size={13} />} title="Bestand" defaultOpen>
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Bestandesalter" value={standAge} onChange={setStandAge} unit="Jahre" step="1" />
              <SelectField label="Entwicklungsstufe" value={developmentStage} onChange={setDevelopmentStage} options={DEVELOP_OPTIONS} />
            </div>
            <SpeciesEditor label="Hauptbaumarten" entries={mainSpecies} onChange={setMainSpecies} />
            <SpeciesEditor label="Nebenbaumarten" entries={sideSpecies} onChange={setSideSpecies} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Mischungsform" value={mixingForm} onChange={setMixingForm} options={MIXING_OPTIONS} />
              <SelectField label="Struktur" value={structure} onChange={setStructure} options={STRUCTURE_OPTIONS} />
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldRow label="Alter" value={compartment.standAge} unit="J." />
                <FieldRow label="Altersklasse" value={ageClass(compartment.standAge)} />
              </div>
              <div>
                <FieldRow label="Entwicklungsstufe" value={compartment.developmentStage} />
                <FieldRow label="Mischungsform" value={compartment.mixingForm} />
                <FieldRow label="Struktur" value={compartment.structure} />
              </div>
            </div>
            {(compartment.mainSpecies?.length > 0) && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-1.5">Hauptbaumarten</p>
                <SpeciesBar entries={compartment.mainSpecies} />
              </div>
            )}
            {(compartment.sideSpecies?.length > 0) && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-1.5">Nebenbaumarten</p>
                <SpeciesBar entries={compartment.sideSpecies} />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── KENNZAHLEN ── */}
      <Section icon={<BarChart3 size={13} />} title="Kennzahlen">
        {treeStats && (
          <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2.5 space-y-1.5 mb-2">
            <p className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
              <Trees size={10} /> Berechnet aus {treeStats.count} Baum-POIs
            </p>
            {treeStats.avgDiameter !== null && <FieldRow label="Ø BHD" value={treeStats.avgDiameter?.toFixed(1)} unit="cm" />}
            {treeStats.avgHeight !== null && <FieldRow label="Ø Baumhöhe" value={treeStats.avgHeight?.toFixed(1)} unit="m" />}
            {treeStats.maxHeight !== null && <FieldRow label="Oberhöhe (max.)" value={treeStats.maxHeight?.toFixed(1)} unit="m" />}
            {treeStats.stemCount !== null && <FieldRow label="Stammzahl" value={treeStats.stemCount} unit="N/ha" />}
            {treeStats.speciesDist.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] text-gray-500 mb-1">Artenverteilung</p>
                <SpeciesBar entries={treeStats.speciesDist} />
              </div>
            )}
          </div>
        )}
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Vorrat" value={volumePerHa} onChange={setVolumePerHa} unit="m³/ha" />
              <NumberField label="Zuwachs" value={incrementPerHa} onChange={setIncrementPerHa} unit="m³/ha/a" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Bestockungsgrad" value={stockingDegree} onChange={setStockingDegree} placeholder="0.0–1.0" step="0.05" />
              <NumberField label="Totholz" value={deadwoodPerHa} onChange={setDeadwoodPerHa} unit="m³/ha" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Bonität (EKL)" value={yieldClass} onChange={setYieldClass} step="0.5" />
              <SelectField label="Wuchsleistung" value={siteProductivity} onChange={setSiteProductivity} options={PRODUCTIVITY_OPTIONS} />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <FieldRow label="Vorrat" value={compartment.volumePerHa} unit="m³/ha" />
            <FieldRow label="Zuwachs" value={compartment.incrementPerHa} unit="m³/ha/a" />
            <FieldRow label="Bestockungsgrad" value={compartment.stockingDegree} />
            <FieldRow label="Totholz" value={compartment.deadwoodPerHa} unit="m³/ha" />
            <FieldRow label="Bonität (EKL)" value={compartment.yieldClass} />
            <FieldRow label="Wuchsleistung" value={compartment.siteProductivity} />
          </div>
        )}
      </Section>

      {/* ── VERJÜNGUNG ── */}
      <Section icon={<Sprout size={13} />} title="Verjüngung">
        {isEditing ? (
          <>
            <p className="text-[10px] text-gray-500">Vorhandene Verjüngungsarten mit Höhe und Dichte</p>
            <RejuvEditor entries={rejuvenation} onChange={setRejuvenation} />
          </>
        ) : (
          rejuvenation?.length > 0 ? (
            <div className="space-y-1">
              <div className="grid grid-cols-3 text-[9px] uppercase text-gray-600 font-bold mb-1">
                <span>Baumart</span><span className="text-center">Höhe</span><span className="text-right">Dichte</span>
              </div>
              {rejuvenation.map((e: RejuvEntry, i: number) => (
                <div key={i} className="grid grid-cols-3 text-xs text-gray-300">
                  <span className="truncate">{e.species}</span>
                  <span className="text-center text-gray-400">{e.heightCm ? `${e.heightCm} cm` : '—'}</span>
                  <span className="text-right text-gray-400">{e.density || '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">Keine Verjüngung erfasst.</p>
          )
        )}
      </Section>

      {/* ── ZUSTAND ── */}
      <Section icon={<Heart size={13} />} title="Zustand">
        {isEditing ? (
          <>
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Vitalität</label>
              <Textarea value={vitalityNote} onChange={e => setVitalityNote(e.target.value)}
                className="bg-black/50 border-white/20 text-white min-h-[56px] text-xs" placeholder="Beschreibung..." />
            </div>
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Schäden</label>
              <Textarea value={damageNote} onChange={e => setDamageNote(e.target.value)}
                className="bg-black/50 border-white/20 text-white min-h-[56px] text-xs" placeholder="Art und Ausmaß der Schäden..." />
            </div>
            <div>
              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Stabilität</label>
              <Textarea value={stabilityNote} onChange={e => setStabilityNote(e.target.value)}
                className="bg-black/50 border-white/20 text-white min-h-[56px] text-xs" placeholder="Standfestigkeit, Sturm- und Schneebruchrisiko..." />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {compartment.vitalityNote && (
              <div>
                <p className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Vitalität</p>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{compartment.vitalityNote}</p>
              </div>
            )}
            {compartment.damageNote && (
              <div>
                <p className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Schäden</p>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{compartment.damageNote}</p>
              </div>
            )}
            {compartment.stabilityNote && (
              <div>
                <p className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Stabilität</p>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{compartment.stabilityNote}</p>
              </div>
            )}
            {!compartment.vitalityNote && !compartment.damageNote && !compartment.stabilityNote && (
              <p className="text-xs text-gray-600">Kein Zustand erfasst.</p>
            )}
          </div>
        )}
      </Section>

      {/* ── BEWIRTSCHAFTUNG ── */}
      <Section icon={<Wrench size={13} />} title="Bewirtschaftung">
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Letzte Maßnahme (Datum)" value={lastMeasureDate} onChange={setLastMeasureDate} placeholder="z. B. 03/2024" />
              <TextField label="Art der Maßnahme" value={lastMeasureType} onChange={setLastMeasureType} placeholder="z. B. Durchforstung" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Pflegezustand" value={maintenanceStatus} onChange={setMaintenanceStatus} options={MAINTENANCE_OPTIONS} />
              <SelectField label="Befahrbarkeit" value={accessibility} onChange={setAccessibility} options={ACCESSIBILITY_OPTIONS} />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <FieldRow label="Letzte Maßnahme" value={compartment.lastMeasureDate
              ? `${compartment.lastMeasureDate}${compartment.lastMeasureType ? ` – ${compartment.lastMeasureType}` : ''}` : null} />
            <FieldRow label="Pflegezustand" value={compartment.maintenanceStatus} />
            <FieldRow label="Befahrbarkeit" value={compartment.accessibility} />
          </div>
        )}
      </Section>

      {/* ── NOTIZ ── */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notiz</h4>
        {isEditing ? (
          <Textarea value={note} onChange={e => setNote(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[80px]"
            placeholder="Allgemeine Notizen zur Abteilung…" />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[48px] whitespace-pre-wrap">
            {compartment.note || 'Keine Notiz.'}
          </p>
        )}
      </div>

      {/* ── AUFGABEN ── */}
      {!isEditing && (
        <div className="space-y-3 pt-4 border-t border-white/10 mt-4">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] uppercase text-gray-500 font-bold">Aufgaben</h4>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{linkedTasks.length}</span>
          </div>
          <div className="space-y-2">
            {linkedTasks.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-600 border border-dashed border-white/10 rounded-lg">
                Alles erledigt.
              </div>
            ) : (
              linkedTasks.map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => selectFeature(task.id, 'TASK')}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-lg transition-colors group cursor-pointer flex justify-between items-start"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {task.priority === 'URGENT' && <AlertCircle size={14} className="text-red-500" />}
                      <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{task.title}</span>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} /> {format(new Date(task.dueDate), 'dd. MMM', { locale: de })}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 ml-2">
                    {task.assignee ? (
                      <Avatar className="h-6 w-6 border border-white/20">
                        <AvatarFallback className={cn('text-[9px] font-bold', getUserColor(task.assignee.firstName || task.assignee.email))}>
                          {getInitials(task.assignee.firstName, task.assignee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                        <User size={12} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <Button
              className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5 h-9 text-xs mt-2"
              variant="outline"
              onClick={() => setShowCreateTask(true)}
            >
              <PlusCircle className="w-3 h-3 mr-2" /> Neue Aufgabe hier
            </Button>
          </div>
        </div>
      )}

      {/* ── SAR-MONITORING ── */}
      <div className="flex items-center justify-between py-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Radio size={13} className={trackBiomass ? 'text-emerald-400' : 'text-gray-600'} />
          <div>
            <p className="text-xs text-gray-300 font-medium">SAR-Monitoring</p>
            <p className="text-[10px] text-gray-600">Sentinel-1 Tracking im Biomasse-Monitor</p>
          </div>
        </div>
        <button
          onClick={() => handleToggleBiomass(!trackBiomass)}
          disabled={isTogglingBio}
          className={`relative w-10 h-5 rounded-full transition-colors ${trackBiomass ? 'bg-emerald-600' : 'bg-white/10'} ${isTogglingBio ? 'opacity-50' : ''}`}
          title={trackBiomass ? 'Tracking deaktivieren' : 'Tracking aktivieren'}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${trackBiomass ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* ── GEOMETRIE ── */}
      {isEditing && (
        <div className="pt-2 border-t border-white/10 mt-2">
          <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">Geometrie</label>
          <Button
            variant="outline"
            className={`w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/10 h-10 font-bold ${isGeometryEditing ? 'bg-blue-900/20 border-blue-500 text-blue-400' : ''}`}
            onClick={handleToggleGeometry}
          >
            {isGeometryEditing
              ? <><Check className="w-4 h-4 mr-2" /> Bearbeiten beenden</>
              : <><ScanLine className="w-4 h-4 mr-2" /> Fläche auf Karte ändern</>}
          </Button>
        </div>
      )}

      {/* ── FOOTER ── */}
      {isEditing && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          {canDelete ? (
            <DeleteConfirmDialog
              trigger={
                <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3">
                  <Trash2 className="w-4 h-4 mr-2" /> Löschen
                </Button>
              }
              title="Abteilung löschen?"
              description="Die Abteilung wird unwiderruflich von der Karte entfernt. Verknüpfte Bäume behalten ihre Position."
              confirmString={displayName}
              onConfirm={async () => {
                const taskIds = deleteTasksToo ? linkedTasks.map((t: any) => t.id) : undefined;
                const res = await deleteCompartment(compartment.id, orgSlug);
                if (res.success) { onDeleteSuccess(); onClose(); }
                else throw new Error(res.error);
              }}
            >
              {linkedTasks.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">Verknüpfte Aufgaben ({linkedTasks.length})</p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input type="checkbox" checked={deleteTasksToo} onChange={e => setDeleteTasksToo(e.target.checked)}
                      className="rounded border-amber-400 text-red-600 focus:ring-red-500" />
                    <span className="text-sm text-slate-700">Aufgaben ebenfalls löschen</span>
                  </label>
                </div>
              )}
            </DeleteConfirmDialog>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetEditing} className="text-gray-400">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ backgroundColor: color }} className="text-white hover:opacity-90">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </div>
        </div>
      )}

      <CreateTaskDialog
        openProp={showCreateTask}
        onOpenChangeProp={open => { setShowCreateTask(open); if (!open) onRefresh(); }}
        orgSlug={orgSlug}
        members={members}
        forests={forests}
        defaultTitle={`Aufgabe: ${displayName}`}
        defaultForestId={compartment.forestId}
        defaultLinkedPolygonId={compartment.id}
        defaultLinkedPolygonType="COMPARTMENT"
        trigger={<span className="hidden" />}
      />
    </DetailPanelShell>
  );
}
