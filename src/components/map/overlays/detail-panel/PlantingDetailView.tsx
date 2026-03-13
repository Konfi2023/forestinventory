'use client';

import { useState, useMemo } from 'react';
import { Sprout, Ruler, Loader2, ScanLine, Check, Trash2, Plus, X, Search, Radio, PlusCircle, Calendar, User, AlertCircle } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updatePlanting, deletePlanting, togglePolygonBiomass } from '@/actions/polygons';
import { toast } from 'sonner';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { TREE_SPECIES, getSpeciesColor, getSpeciesLabel, getDominantSpecies } from '@/lib/tree-species';
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn, getUserColor, getInitials } from '@/lib/utils';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import centroid from '@turf/centroid';

// ---------------------------------------------------------------------------

function formatArea(ha?: number | null): string {
  if (!ha) return '—';
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

interface ContentEntry { species: string; count: number }

// ─── Species Picker ─────────────────────────────────────────────────────────
function SpeciesPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => TREE_SPECIES.filter(s => s.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );
  return (
    <div className="bg-black/60 border border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Search size={12} className="text-gray-500 shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Baumart suchen…"
          className="bg-transparent text-xs text-white placeholder-gray-600 outline-none w-full"
          autoFocus
        />
      </div>
      <div className="max-h-40 overflow-y-auto">
        {filtered.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-white/10 text-left transition-colors"
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-300">{s.label}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-600 px-3 py-2">Keine Treffer</p>
        )}
      </div>
    </div>
  );
}

// ─── Species Row ─────────────────────────────────────────────────────────────
function SpeciesRow({
  entry, totalCount, onCountChange, onRemove,
}: { entry: ContentEntry; totalCount: number; onCountChange: (v: number) => void; onRemove: () => void }) {
  const color  = getSpeciesColor(entry.species);
  const label  = getSpeciesLabel(entry.species);
  const pct    = totalCount > 0 ? Math.round((entry.count / totalCount) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-gray-300 flex-1 truncate">{label}</span>
        <input
          type="number"
          min={0}
          value={entry.count}
          onChange={e => onCountChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 bg-black/50 border border-white/20 text-white text-xs rounded px-2 py-0.5 text-right"
          placeholder="Stk."
        />
        <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition p-0.5">
          <X size={12} />
        </button>
      </div>
      {totalCount > 0 && (
        <div className="ml-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          <span className="text-[10px] text-gray-600 w-8 text-right">{pct}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
interface Props {
  planting: any;
  forest: any;
  orgSlug: string;
  tasks: any[];
  members: any[];
  forests: any[];
  onClose: () => void;
  onRefresh: () => void;
  onDeleteSuccess: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function PlantingDetailView({
  planting, forest, orgSlug, tasks, members, forests, onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);
  const selectFeature      = useMapStore(s => s.selectFeature);

  const [isEditing,      setIsEditing]      = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [showPicker,     setShowPicker]     = useState(false);
  const [trackBiomass,   setTrackBiomass]   = useState<boolean>(planting.trackBiomass ?? false);
  const [isTogglingBio,  setIsTogglingBio]  = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [deleteTasksToo, setDeleteTasksToo] = useState(false);

  const parseContent = (raw: any): ContentEntry[] => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(e => e.species && typeof e.count === 'number');
  };

  const [description, setDescription] = useState(planting.description ?? '');
  const [note,        setNote]        = useState(planting.note ?? '');
  const [content, setContent] = useState<ContentEntry[]>(parseContent(planting.content));

  const totalCount = content.reduce((s, e) => s + e.count, 0);
  const dominant   = getDominantSpecies(content) ?? planting.treeSpecies;
  const dominantLabel = (dominant && dominant !== 'Unbekannt') ? getSpeciesLabel(dominant) : 'Pflanzfläche';
  const dominantColor = getSpeciesColor(dominant ?? '');

  const title = (description && description.trim()) ? description.trim() : dominantLabel;

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';

  const polygonCentroid = useMemo(() => {
    try {
      const geo = planting.geoJson;
      const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
      const c = centroid(feature as any);
      return { lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] };
    } catch { return null; }
  }, [planting.geoJson]);

  const linkedTasks = useMemo(() => {
    if (!tasks?.length) return [];
    return tasks.filter(t => {
      if (t.status === 'DONE') return false;
      // Neue direkte Verknüpfung via linkedPolygonId
      if (t.linkedPolygonId === planting.id && t.linkedPolygonType === 'PLANTING') return true;
      // Legacy: Koordinate innerhalb der Fläche
      if (t.lat && t.lng) {
        try {
          const p = point([t.lng, t.lat]);
          const geo = planting.geoJson;
          const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
          return booleanPointInPolygon(p, feature as any);
        } catch { return false; }
      }
      return false;
    });
  }, [tasks, planting.id, planting.geoJson]);

  const addSpecies = (id: string) => {
    if (content.some(e => e.species === id)) {
      toast.info('Baumart bereits vorhanden');
    } else {
      setContent(prev => [...prev, { species: id, count: 0 }]);
    }
    setShowPicker(false);
  };

  const updateCount = (idx: number, count: number) => {
    setContent(prev => prev.map((e, i) => i === idx ? { ...e, count } : e));
  };

  const removeEntry = (idx: number) => {
    setContent(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const treeSpecies = dominant ?? 'OTHER';
      const res = await updatePlanting(planting.id, { treeSpecies, description, note, content }, orgSlug);
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Pflanzfläche aktualisiert');
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
      const res = await togglePolygonBiomass(planting.id, 'PLANTING', enabled, orgSlug);
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
      setEditingFeature({ id: planting.id, geoJson: planting.geoJson, featureType: 'PLANTING', name: dominantLabel, orgSlug });
      onClose();
      toast.info('Ziehpunkte verschieben um Fläche zu ändern');
    }
  };

  const resetEditing = () => {
    setDescription(planting.description ?? '');
    setNote(planting.note ?? '');
    setContent(parseContent(planting.content));
    setShowPicker(false);
    setIsEditing(false);
  };

  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={title}
      icon={<Sprout className="w-4 h-4" style={{ color: dominantColor }} />}
      headerColor=""
      headerStyle={{ background: `linear-gradient(to bottom right, ${dominantColor}40, rgba(0,0,0,0.8))` }}
      isEditing={isEditing}
      onToggleEdit={() => {
        if (!isEditing && !description) setDescription(dominantLabel);
        setIsEditing(!isEditing);
      }}
      editNameValue={description}
      onEditNameChange={setDescription}
      canEdit={canEdit}
      canDelete={canDelete}
      onDelete={() => {}}
    >
      {/* FAKTEN */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <Ruler size={12} /> Fläche
          </div>
          <div className="text-lg text-white font-mono font-medium">{formatArea(planting.areaHa)}</div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <Sprout size={12} /> Stückzahl
          </div>
          <div className="text-lg text-white font-mono font-medium">
            {totalCount > 0 ? totalCount.toLocaleString('de-DE') : '—'}
          </div>
        </div>
      </div>

      {/* WALD */}
      {forest && (
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Wald:</span> {forest.name}
        </div>
      )}

      {/* ARTEN-MIX */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] uppercase text-gray-500 font-bold">Baumarten</h4>
          {isEditing && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition"
            >
              <Plus size={11} /> Hinzufügen
            </button>
          )}
        </div>

        {isEditing && showPicker && (
          <div className="mb-2">
            <SpeciesPicker onSelect={addSpecies} />
          </div>
        )}

        {content.length > 0 ? (
          <div className="space-y-3 bg-white/5 p-3 rounded-lg border border-white/5">
            {isEditing ? (
              content.map((entry, idx) => (
                <SpeciesRow
                  key={entry.species}
                  entry={entry}
                  totalCount={totalCount}
                  onCountChange={v => updateCount(idx, v)}
                  onRemove={() => removeEntry(idx)}
                />
              ))
            ) : (
              content.map(entry => {
                const color = getSpeciesColor(entry.species);
                const label = getSpeciesLabel(entry.species);
                const pct   = totalCount > 0 ? Math.round((entry.count / totalCount) * 100) : 0;
                return (
                  <div key={entry.species} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-300 flex-1">{label}</span>
                      <span className="text-xs text-gray-500">{entry.count.toLocaleString('de-DE')} Stk.</span>
                    </div>
                    {totalCount > 0 && (
                      <div className="ml-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[10px] text-gray-600 w-8 text-right">{pct}%</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">
            {isEditing ? 'Keine Baumarten eingetragen. Über "+ Hinzufügen" ergänzen.' : 'Keine Artdaten vorhanden.'}
          </p>
        )}
      </div>

      {/* BESCHREIBUNG */}
      {(isEditing || description) && (
        <div>
          <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Beschreibung</h4>
          {isEditing ? (
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-black/50 border-white/20 text-white"
              placeholder="z. B. Naturverjüngung Fichte 2023"
            />
          ) : (
            <p className="text-xs text-gray-400 bg-black/20 px-3 py-2 rounded-lg border border-white/5">{description}</p>
          )}
        </div>
      )}

      {/* NOTIZ */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notiz</h4>
        {isEditing ? (
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[80px]"
            placeholder="Notizen zur Pflanzfläche…"
          />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[48px] whitespace-pre-wrap">
            {note || 'Keine Notiz.'}
          </p>
        )}
      </div>

      {/* AUFGABEN */}
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

      {/* BIOMASSE-TRACKING */}
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

      {/* GEOMETRIE */}
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

      {/* FOOTER */}
      {isEditing && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          {canDelete ? (
            <DeleteConfirmDialog
              trigger={
                <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3">
                  <Trash2 className="w-4 h-4 mr-2" /> Löschen
                </Button>
              }
              title={`Pflanzfläche löschen?`}
              description="Die Pflanzfläche wird unwiderruflich von der Karte entfernt."
              confirmString={dominantLabel}
              onConfirm={async () => {
                const taskIds = deleteTasksToo ? linkedTasks.map((t: any) => t.id) : undefined;
                const res = await deletePlanting(planting.id, orgSlug, taskIds);
                if (res.success) { onDeleteSuccess(); onClose(); }
                else throw new Error(res.error);
              }}
            >
              {linkedTasks.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    Verknüpfte Aufgaben ({linkedTasks.length})
                  </p>
                  <div className="space-y-1">
                    {linkedTasks.map((t: any) => (
                      <div key={t.id} className="flex items-baseline gap-2 text-sm">
                        <span className="text-[10px] font-semibold uppercase text-amber-500 shrink-0 w-16">Aufgabe</span>
                        <span className="text-slate-700 truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200">
                    <input
                      type="checkbox"
                      checked={deleteTasksToo}
                      onChange={e => setDeleteTasksToo(e.target.checked)}
                      className="rounded border-amber-400 text-red-600 focus:ring-red-500"
                    />
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
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
        defaultTitle={`Aufgabe: ${title}`}
        defaultForestId={planting.forestId}
        defaultLinkedPolygonId={planting.id}
        defaultLinkedPolygonType="PLANTING"
        trigger={<span className="hidden" />}
      />
    </DetailPanelShell>
  );
}
