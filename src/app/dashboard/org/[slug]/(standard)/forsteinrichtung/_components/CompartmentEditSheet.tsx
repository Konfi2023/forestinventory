'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Search, X } from 'lucide-react';
import { updateCompartment } from '@/actions/polygons';
import { toast } from 'sonner';
import { TREE_SPECIES, getSpeciesLabel, getSpeciesColor } from '@/lib/tree-species';
import { useTranslations } from 'next-intl';

// ─── Konstanten ───────────────────────────────────────────────────────────────
const EXPOSITION_OPTIONS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'eben'];
const SLOPE_OPTIONS = ['eben', 'schwach (<15°)', 'mittel (15–25°)', 'steil (25–35°)', 'sehr steil (>35°)'];
const DEVELOP_OPTIONS = ['Blöße', 'Verjüngung', 'Dickung', 'Stangenholz', 'Baumholz I', 'Baumholz II', 'Baumholz III', 'Altholz', 'Plenterwald'];
const MIXING_OPTIONS = ['rein', 'truppweise', 'horst', 'gruppen', 'einzeln', 'gemischt'];
const STRUCTURE_OPTIONS = ['einschichtig', 'zweischichtig', 'mehrschichtig', 'plenterartig'];
const PRODUCTIVITY_OPTIONS = ['sehr gering', 'gering', 'mittel', 'hoch', 'sehr hoch'];
const MAINTENANCE_OPTIONS = ['vernachlässigt', 'mangelhaft', 'ausreichend', 'gut', 'sehr gut'];
const ACCESSIBILITY_OPTIONS = ['nicht befahrbar', 'bedingt befahrbar', 'befahrbar', 'gut befahrbar'];
const NUTRIENT_OPTIONS = ['sehr arm', 'arm', 'mäßig', 'mittel', 'reich', 'sehr reich'];
const WATER_OPTIONS = ['trocken', 'mäßig trocken', 'frisch', 'mäßig feucht', 'feucht', 'nass', 'staunass'];
const FOREST_FUNCTION_OPTIONS = ['Nutzwald', 'Schutzwald (Boden)', 'Schutzwald (Wasser)', 'Schutzwald (Lawinen)', 'Erholungswald', 'Biotopschutzwald', 'Klimaschutzwald', 'Sonstiger Schutzwald'];
const MEASURE_TYPE_OPTIONS = ['Endnutzung', 'Vornutzung', 'Durchforstung', 'Pflanzung', 'Naturverjüngung', 'Jungbestandspflege', 'Wertästung', 'Waldschutz', 'Sonstiges'];

interface SpeciesEntry { species: string; percent: number; }
interface RejuvEntry { species: string; heightCm: number; density: string; }
interface PlannedMeasure { type: string; year: number; note: string; }

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-slate-600 mb-1 block uppercase tracking-wide">{children}</label>;
}

function SField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
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
        step={step ?? '0.1'}
        className="border-slate-200 text-slate-800 focus:ring-emerald-500 text-sm" />
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
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

// ─── Species Picker ───────────────────────────────────────────────────────────
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

// ─── Species Editor ───────────────────────────────────────────────────────────
function SpeciesEditor({ label, entries, onChange }: {
  label: string; entries: SpeciesEntry[]; onChange: (e: SpeciesEntry[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const updatePct = (i: number, v: string) =>
    onChange(entries.map((e, idx) => idx === i ? { ...e, percent: Number(v) } : e));
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

// ─── Rejuvenation Editor ──────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  compartment: any;
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CompartmentEditSheet({ compartment, orgSlug, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations('ForestSetup');
  const [saving, setSaving] = useState(false);

  const [name,              setName]              = useState(compartment.name ?? '');
  const [number,            setNumber]            = useState(compartment.number ?? '');
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
  const [altitude,          setAltitude]          = useState(compartment.altitude?.toString() ?? '');
  const [siteUnit,          setSiteUnit]          = useState(compartment.siteUnit ?? '');
  const [forestFunction,    setForestFunction]    = useState(compartment.forestFunction ?? '');
  const [plannedMeasures,   setPlannedMeasures]   = useState<PlannedMeasure[]>(compartment.plannedMeasures ?? []);
  const [plannedHarvestVolume, setPlannedHarvestVolume] = useState(compartment.plannedHarvestVolume?.toString() ?? '');
  const [standTypeCode,     setStandTypeCode]     = useState(compartment.standTypeCode ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateCompartment(compartment.id, {
        name, number, note,
        soilType, waterBalance, nutrientLevel, exposition, slopeClass, protectionStatus, restrictions,
        altitude: altitude ? parseInt(altitude) : null, siteUnit, forestFunction,
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
        plannedMeasures, plannedHarvestVolume: plannedHarvestVolume ? parseFloat(plannedHarvestVolume) : null,
        standTypeCode,
      }, orgSlug);
      if (!res.success) throw new Error(res.error);
      toast.success(t('compartmentSaved'));
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${number ? `[${number}] ` : ''}${name || t('general')}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <SheetTitle className="flex items-center gap-2 text-slate-900">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: compartment.color ?? '#3b82f6' }} />
            {displayName}
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-5 space-y-4">

          {/* Basis */}
          <Section title={t('general')}>
            <TField label={t('compartmentNumber')} value={number} onChange={setNumber} placeholder={t('compartmentNumPlaceholder')} />
            <TField label={t('name')} value={name} onChange={setName} placeholder={t('namePlaceholder')} />
          </Section>

          {/* Standort */}
          <Section title={t('site')}>
            <TField label={t('soilType')} value={soilType} onChange={setSoilType} placeholder={t('soilTypePlaceholder')} />
            <NField label={t('altitude')} value={altitude} onChange={setAltitude} unit={t('altitudeUnit')} step="1" />
            <TField label={t('siteUnit')} value={siteUnit} onChange={setSiteUnit} placeholder={t('siteUnitPlaceholder')} />
            <SField label={t('waterBalance')} value={waterBalance} onChange={setWaterBalance} options={WATER_OPTIONS} />
            <SField label={t('nutrientLevel')} value={nutrientLevel} onChange={setNutrientLevel} options={NUTRIENT_OPTIONS} />
            <SField label={t('exposition')} value={exposition} onChange={setExposition} options={EXPOSITION_OPTIONS} />
            <SField label={t('slope')} value={slopeClass} onChange={setSlopeClass} options={SLOPE_OPTIONS} />
            <SField label={t('forestFunction')} value={forestFunction} onChange={setForestFunction} options={FOREST_FUNCTION_OPTIONS} />
            <TField label={t('protectionStatus')} value={protectionStatus} onChange={setProtectionStatus} placeholder={t('protectionStatusPlaceholder')} />
            <div className="col-span-2">
              <TField label={t('restrictions')} value={restrictions} onChange={setRestrictions} placeholder={t('restrictionsPlaceholder')} />
            </div>
          </Section>

          {/* Bestand */}
          <Section title={t('stand')}>
            <NField label={t('standAge')} value={standAge} onChange={setStandAge} unit={t('standAgeUnit')} step="1" />
            <TField label={t('standTypeCode')} value={standTypeCode} onChange={setStandTypeCode} placeholder={t('standTypeCodePlaceholder')} />
            <SField label={t('developmentStage')} value={developmentStage} onChange={setDevelopmentStage} options={DEVELOP_OPTIONS} />
            <SField label={t('structure')} value={structure} onChange={setStructure} options={STRUCTURE_OPTIONS} />
            <SField label={t('mixingForm')} value={mixingForm} onChange={setMixingForm} options={MIXING_OPTIONS} />
            <div className="col-span-2">
              <SpeciesEditor label={t('mainSpecies')} entries={mainSpecies} onChange={setMainSpecies} />
            </div>
            <div className="col-span-2">
              <SpeciesEditor label={t('sideSpecies')} entries={sideSpecies} onChange={setSideSpecies} />
            </div>
          </Section>

          {/* Kennzahlen */}
          <Section title={t('metrics')}>
            <NField label={t('volume')} value={volumePerHa} onChange={setVolumePerHa} unit={t('volumeUnit')} />
            <NField label={t('increment')} value={incrementPerHa} onChange={setIncrementPerHa} unit={t('incrementUnit')} />
            <NField label={t('stockingDegree')} value={stockingDegree} onChange={setStockingDegree} step="0.05" />
            <NField label={t('deadwood')} value={deadwoodPerHa} onChange={setDeadwoodPerHa} unit={t('deadwoodUnit')} />
            <NField label={t('yieldClass')} value={yieldClass} onChange={setYieldClass} step="0.5" />
            <SField label={t('productivity')} value={siteProductivity} onChange={setSiteProductivity} options={PRODUCTIVITY_OPTIONS} />
          </Section>

          {/* Verjüngung */}
          <SectionFull title={t('rejuvenation')}>
            <RejuvEditor entries={rejuvenation} onChange={setRejuvenation} />
          </SectionFull>

          {/* Zustand */}
          <SectionFull title={t('condition')}>
            <div>
              <Label>{t('vitalityCrownLabel')}</Label>
              <Textarea value={vitalityNote} onChange={e => setVitalityNote(e.target.value)}
                placeholder={t('vitalityPlaceholder')} className="text-sm min-h-[72px]" />
            </div>
            <div>
              <Label>{t('damageLabel')}</Label>
              <Textarea value={damageNote} onChange={e => setDamageNote(e.target.value)}
                placeholder={t('damagePlaceholder')} className="text-sm min-h-[72px]" />
            </div>
            <div>
              <Label>{t('stabilityLabel')}</Label>
              <Textarea value={stabilityNote} onChange={e => setStabilityNote(e.target.value)}
                placeholder={t('stabilityPlaceholder')} className="text-sm min-h-[72px]" />
            </div>
          </SectionFull>

          {/* Bewirtschaftung */}
          <Section title={t('mgmt')}>
            <TField label={t('lastMeasureDate')} value={lastMeasureDate} onChange={setLastMeasureDate} placeholder={t('lastMeasureDatePlaceholder')} />
            <TField label={t('measureType')} value={lastMeasureType} onChange={setLastMeasureType} placeholder={t('measureTypePlaceholder')} />
            <SField label={t('maintenanceStatus')} value={maintenanceStatus} onChange={setMaintenanceStatus} options={MAINTENANCE_OPTIONS} />
            <SField label={t('accessibility')} value={accessibility} onChange={setAccessibility} options={ACCESSIBILITY_OPTIONS} />
          </Section>

          {/* Planung */}
          <SectionFull title={t('planning')}>
            <NField label={t('plannedHarvest')} value={plannedHarvestVolume} onChange={setPlannedHarvestVolume} unit={t('plannedHarvestUnit')} />
            <div>
              <Label>{t('plannedMeasures')}</Label>
              <div className="space-y-1.5">
                {plannedMeasures.map((m, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={m.type} onChange={e => setPlannedMeasures(plannedMeasures.map((pm, idx) => idx === i ? { ...pm, type: e.target.value } : pm))}
                      className="flex-1 border border-slate-200 rounded-md text-sm px-3 py-1.5 bg-white">
                      <option value="">{t('measureTypeSelect')}</option>
                      {MEASURE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <Input type="number" value={m.year || ''} onChange={e => setPlannedMeasures(plannedMeasures.map((pm, idx) => idx === i ? { ...pm, year: parseInt(e.target.value) || 0 } : pm))}
                      placeholder={t('yearLabel')} className="w-20 border-slate-200 text-sm" />
                    <Input value={m.note} onChange={e => setPlannedMeasures(plannedMeasures.map((pm, idx) => idx === i ? { ...pm, note: e.target.value } : pm))}
                      placeholder={t('remarkLabel')} className="flex-1 border-slate-200 text-sm" />
                    <button onClick={() => setPlannedMeasures(plannedMeasures.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-400">×</button>
                  </div>
                ))}
                <button onClick={() => setPlannedMeasures([...plannedMeasures, { type: '', year: 0, note: '' }])}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <PlusCircle size={13} /> {t('addMeasure')}
                </button>
              </div>
            </div>
          </SectionFull>

          {/* Notiz */}
          <SectionFull title={t('notes')}>
            <Textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder={t('notesPlaceholder')} className="text-sm min-h-[80px]" />
          </SectionFull>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
