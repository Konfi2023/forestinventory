'use client';

import { useState, useMemo } from 'react';
import { Grid3x3, Ruler, Loader2, ScanLine, Check, Trash2, Radio, PlusCircle, Calendar, User, AlertCircle } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
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

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#ef4444',
  '#a855f7', '#eab308', '#ec4899', '#64748b',
];

interface Props {
  compartment: any;
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

export function CompartmentDetailView({
  compartment, forest, orgSlug, tasks, members, forests,
  onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);
  const selectFeature      = useMapStore(s => s.selectFeature);

  const [isEditing,     setIsEditing]     = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [name,          setName]          = useState(compartment.name ?? '');
  const [note,          setNote]          = useState(compartment.note ?? '');
  const [color,         setColor]         = useState(compartment.color ?? '#3b82f6');
  const [trackBiomass,  setTrackBiomass]  = useState<boolean>(compartment.trackBiomass ?? false);
  const [isTogglingBio, setIsTogglingBio] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';
  const displayName = name.trim() || 'Abteilung';

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateCompartment(compartment.id, { name, note, color }, orgSlug);
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
    setNote(compartment.note ?? '');
    setColor(compartment.color ?? '#3b82f6');
    setIsEditing(false);
  };

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
      {/* FAKTEN */}
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

      {/* FARBE */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Farbe</h4>
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'white' : 'transparent',
                  transform: color === c ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border border-white/20 bg-transparent"
              title="Benutzerdefinierte Farbe"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400">{color}</span>
          </div>
        )}
      </div>

      {/* NOTIZ */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notiz</h4>
        {isEditing ? (
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[80px]"
            placeholder="Notizen zur Abteilung…"
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

      {/* SAR-MONITORING */}
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
              title="Abteilung löschen?"
              description="Die Abteilung wird unwiderruflich von der Karte entfernt. Verknüpfte Bäume behalten ihre Position."
              confirmString={displayName}
              onConfirm={async () => {
                const res = await deleteCompartment(compartment.id, orgSlug);
                if (res.success) { onDeleteSuccess(); onClose(); }
                else throw new Error(res.error);
              }}
            />
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
