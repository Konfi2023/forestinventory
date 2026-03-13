'use client';

import { useState, useMemo } from 'react';
import { Crosshair, Ruler, User, CalendarDays, Loader2, ScanLine, Check, Trash2, PlusCircle, Calendar, AlertCircle } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { updateHunting, deleteHunting } from '@/actions/polygons';
import { toast } from 'sonner';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn, getUserColor, getInitials } from '@/lib/utils';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import centroid from '@turf/centroid';

const ACCENT = '#84cc16';

function formatArea(ha?: number | null): string {
  if (!ha) return '—';
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

interface Props {
  hunting: any;
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

export function HuntingDetailView({
  hunting, forest, orgSlug, tasks, members, forests, onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);
  const selectFeature      = useMapStore(s => s.selectFeature);

  const [isEditing,      setIsEditing]      = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [deleteTasksToo, setDeleteTasksToo] = useState(false);

  const [name,    setName]    = useState(hunting.name ?? '');
  const [pachter, setPachter] = useState(hunting.pachter ?? '');
  const [endsAt,  setEndsAt]  = useState(hunting.endsAt ?? '');
  const [note,    setNote]    = useState(hunting.note ?? '');

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';

  const polygonCentroid = useMemo(() => {
    try {
      const geo = hunting.geoJson;
      const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
      const c = centroid(feature as any);
      return { lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] };
    } catch { return null; }
  }, [hunting.geoJson]);

  const linkedTasks = useMemo(() => {
    if (!tasks?.length) return [];
    return tasks.filter(t => {
      if (t.status === 'DONE') return false;
      if (t.linkedPolygonId === hunting.id && t.linkedPolygonType === 'HUNTING') return true;
      if (t.lat && t.lng) {
        try {
          const p = point([t.lng, t.lat]);
          const geo = hunting.geoJson;
          const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
          return booleanPointInPolygon(p, feature as any);
        } catch { return false; }
      }
      return false;
    });
  }, [tasks, hunting.id, hunting.geoJson]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateHunting(hunting.id, { name, pachter, endsAt, note }, orgSlug);
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Jagdfläche aktualisiert');
      setIsEditing(false);
      onRefresh();
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGeometry = () => {
    if (isGeometryEditing) {
      setInteractionMode('VIEW');
      setEditingFeature(null);
    } else {
      setInteractionMode('EDIT_GEOMETRY');
      setEditingFeature({ id: hunting.id, geoJson: hunting.geoJson, featureType: 'HUNTING', name, orgSlug });
      onClose();
      toast.info('Ziehpunkte verschieben um Fläche zu ändern');
    }
  };

  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={name || 'Jagdfläche'}
      icon={<Crosshair className="w-4 h-4" style={{ color: ACCENT }} />}
      headerColor=""
      headerStyle={{ background: `linear-gradient(to bottom right, ${ACCENT}40, rgba(0,0,0,0.8))` }}
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
          <div className="text-lg text-white font-mono font-medium">{formatArea(hunting.areaHa)}</div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <Crosshair size={12} /> Typ
          </div>
          <div className="text-sm text-white">Jagdfläche</div>
        </div>
      </div>

      {/* WALD */}
      {forest && (
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Wald:</span> {forest.name}
        </div>
      )}

      {/* PÄCHTER & LAUFZEIT */}
      {(pachter || endsAt || isEditing) && (
        <div className="space-y-3">
          {isEditing ? (
            <>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 flex items-center gap-1.5">
                  <User size={11} /> Pächter
                </label>
                <Input
                  value={pachter}
                  onChange={e => setPachter(e.target.value)}
                  className="bg-black/50 border-white/20 text-white"
                  placeholder="Name des Pächters"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 flex items-center gap-1.5">
                  <CalendarDays size={11} /> Pacht bis
                </label>
                <Input
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  className="bg-black/50 border-white/20 text-white"
                  placeholder="z. B. 31.03.2027"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              {pachter && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <User size={12} className="text-gray-600" />
                  <span className="text-gray-300">{pachter}</span>
                </div>
              )}
              {endsAt && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <CalendarDays size={12} className="text-gray-600" />
                  <span className="text-gray-300">Pacht bis: {endsAt}</span>
                </div>
              )}
            </div>
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
            placeholder="Notizen zur Jagdfläche..."
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
              title={`Jagdfläche "${name || 'Jagdfläche'}" löschen?`}
              description="Die Jagdfläche wird unwiderruflich von der Karte entfernt."
              confirmString={name || 'Jagdfläche'}
              onConfirm={async () => {
                const taskIds = deleteTasksToo ? linkedTasks.map((t: any) => t.id) : undefined;
                const res = await deleteHunting(hunting.id, orgSlug, taskIds);
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
            <Button variant="ghost" onClick={() => { setName(hunting.name ?? ''); setPachter(hunting.pachter ?? ''); setEndsAt(hunting.endsAt ?? ''); setNote(hunting.note ?? ''); setIsEditing(false); }} className="text-gray-400">
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
        defaultTitle={`Aufgabe: ${name || 'Jagdfläche'}`}
        defaultForestId={hunting.forestId}
        defaultLinkedPolygonId={hunting.id}
        defaultLinkedPolygonType="HUNTING"
        trigger={<span className="hidden" />}
      />
    </DetailPanelShell>
  );
}
