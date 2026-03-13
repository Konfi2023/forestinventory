'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Ruler, Loader2, ScanLine, Check, Trash2, Radio, PackageOpen, ArrowRight, PlusCircle, Calendar, User, AlertCircle } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateCalamity, deleteCalamity, togglePolygonBiomass } from '@/actions/polygons';
import { createOperationFromCalamity } from '@/actions/operations';
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
import centroid from '@turf/centroid';

const ACCENT = '#f97316';

const CAUSE_LABELS: Record<string, string> = {
  WIND:       'Windwurf',
  BARK_BEETLE: 'Borkenkäfer',
  FIRE:       'Brand',
  SNOW:       'Schneebruch',
  DROUGHT:    'Trockenheit',
  OTHER:      'Sonstiges',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:   'Aktiv',
  CLEARED:  'Beräumt',
  REPLANTED:'Wiederaufgeforstet',
};

function formatArea(ha?: number | null): string {
  if (!ha) return '—';
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

interface Props {
  calamity: any;
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

export function CalamityDetailView({
  calamity, forest, orgSlug, tasks, members, forests, onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);
  const selectFeature      = useMapStore(s => s.selectFeature);

  const [isEditing,      setIsEditing]      = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [trackBiomass,   setTrackBiomass]   = useState<boolean>(calamity.trackBiomass ?? false);
  const [isTogglingBio,  setIsTogglingBio]  = useState(false);
  const [isCreatingOp,   setIsCreatingOp]   = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [deleteTasksToo, setDeleteTasksToo] = useState(false);
  const [linkedOp, setLinkedOp] = useState<{ id: string; title: string } | null>(
    calamity.operation ?? null
  );

  const [cause,       setCause]       = useState(calamity.cause ?? '');
  const [status,      setStatus]      = useState(calamity.status ?? '');
  const [amount,      setAmount]      = useState(calamity.amount?.toString() ?? '');
  const [description, setDescription] = useState(calamity.description ?? '');
  const [note,        setNote]        = useState(calamity.note ?? '');

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';

  const polygonCentroid = useMemo(() => {
    try {
      const geo = calamity.geoJson;
      const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
      const c = centroid(feature as any);
      return { lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] };
    } catch { return null; }
  }, [calamity.geoJson]);

  const linkedTasks = useMemo(() => {
    if (!tasks?.length) return [];
    return tasks.filter(t => {
      if (t.status === 'DONE') return false;
      if (t.linkedPolygonId === calamity.id && t.linkedPolygonType === 'CALAMITY') return true;
      if (t.lat && t.lng) {
        try {
          const p = point([t.lng, t.lat]);
          const geo = calamity.geoJson;
          const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
          return booleanPointInPolygon(p, feature as any);
        } catch { return false; }
      }
      return false;
    });
  }, [tasks, calamity.id, calamity.geoJson]);

  // Description ist der primäre Name — Ursache dient als Fallback
  const title = (description && description.trim())
    ? description.trim()
    : cause
      ? (CAUSE_LABELS[cause] ?? cause)
      : 'Kalamitätsfläche';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateCalamity(calamity.id, {
        cause, status,
        amount: amount ? parseFloat(amount) : undefined,
        description, note,
      }, orgSlug);
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Kalamitätsfläche aktualisiert');
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
      const res = await togglePolygonBiomass(calamity.id, 'CALAMITY', enabled, orgSlug);
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

  const handleCreateOperation = async () => {
    setIsCreatingOp(true);
    try {
      const res = await createOperationFromCalamity(orgSlug, calamity.id);
      if (!res.success) throw new Error(res.error);
      const opTitle = title; // gleicher Titel wie Kalamität
      setLinkedOp({ id: res.operationId!, title: opTitle });
      toast.success(`Maßnahme "${opTitle}" erstellt`);
      onRefresh();
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setIsCreatingOp(false);
    }
  };

  const handleToggleGeometry = () => {
    if (isGeometryEditing) {
      setInteractionMode('VIEW');
      setEditingFeature(null);
    } else {
      setInteractionMode('EDIT_GEOMETRY');
      setEditingFeature({ id: calamity.id, geoJson: calamity.geoJson, featureType: 'CALAMITY', name: title, orgSlug });
      onClose();
      toast.info('Ziehpunkte verschieben um Fläche zu ändern');
    }
  };

  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className="w-4 h-4" style={{ color: ACCENT }} />}
      headerColor=""
      headerStyle={{ background: `linear-gradient(to bottom right, ${ACCENT}40, rgba(0,0,0,0.8))` }}
      isEditing={isEditing}
      onToggleEdit={() => {
        if (!isEditing && !description) setDescription(title);
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
          <div className="text-lg text-white font-mono font-medium">{formatArea(calamity.areaHa)}</div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Status
          </div>
          <div className="text-sm text-white">{(STATUS_LABELS[status] ?? status) || '—'}</div>
        </div>
      </div>

      {/* WALD */}
      {forest && (
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Wald:</span> {forest.name}
        </div>
      )}

      {/* DETAILS */}
      {isEditing ? (
        <div className="space-y-3">
          {linkedOp && (
            <p className="text-[10px] text-orange-400/80 bg-orange-950/30 border border-orange-900/40 rounded px-2 py-1.5">
              Name wird synchron mit Maßnahme &ldquo;{linkedOp.title}&rdquo; gehalten.
            </p>
          )}
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 block">Ursache</label>
            <select
              value={cause}
              onChange={e => setCause(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
            >
              <option value="">— Ursache wählen —</option>
              {Object.entries(CAUSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 block">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
            >
              <option value="">— Status wählen —</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 block">Menge (Fm)</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-black/50 border-white/20 text-white"
              placeholder="Festmeter"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {cause && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 text-xs">Ursache:</span>
              <span className="text-orange-400 font-medium">{CAUSE_LABELS[cause] ?? cause}</span>
            </div>
          )}
          {calamity.amount && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 text-xs">Menge:</span>
              <span className="text-white">{calamity.amount} Fm</span>
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
            placeholder="Notizen zur Kalamitätsfläche..."
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
          <Radio size={13} className={trackBiomass ? 'text-orange-400' : 'text-gray-600'} />
          <div>
            <p className="text-xs text-gray-300 font-medium">SAR-Monitoring</p>
            <p className="text-[10px] text-gray-600">Sentinel-1 Tracking im Biomasse-Monitor</p>
          </div>
        </div>
        <button
          onClick={() => handleToggleBiomass(!trackBiomass)}
          disabled={isTogglingBio}
          className={`relative w-10 h-5 rounded-full transition-colors ${trackBiomass ? 'bg-orange-600' : 'bg-white/10'} ${isTogglingBio ? 'opacity-50' : ''}`}
          title={trackBiomass ? 'Tracking deaktivieren' : 'Tracking aktivieren'}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${trackBiomass ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* MASSNAHME */}
      <div className="flex items-center justify-between py-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <PackageOpen size={13} className={linkedOp ? 'text-emerald-400' : 'text-gray-600'} />
          <div>
            <p className="text-xs text-gray-300 font-medium">Maßnahme & Holzverkauf</p>
            {linkedOp ? (
              <p className="text-[10px] text-emerald-400">{linkedOp.title}</p>
            ) : (
              <p className="text-[10px] text-gray-600">Noch keine Maßnahme verknüpft</p>
            )}
          </div>
        </div>
        {linkedOp ? (
          <a
            href={`/dashboard/org/${orgSlug}/operations`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-800 rounded px-2 py-1"
          >
            Öffnen <ArrowRight size={10} />
          </a>
        ) : (
          <Button
            size="sm"
            onClick={handleCreateOperation}
            disabled={isCreatingOp}
            className="h-7 text-[11px] bg-orange-600 hover:bg-orange-700 text-white border-0"
          >
            {isCreatingOp
              ? <Loader2 size={11} className="animate-spin" />
              : <><PackageOpen size={11} className="mr-1" />Maßnahme erstellen</>
            }
          </Button>
        )}
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
              title={`Kalamitätsfläche löschen?`}
              description="Die Kalamitätsfläche wird unwiderruflich von der Karte entfernt."
              confirmString={title}
              onConfirm={async () => {
                const taskIds = deleteTasksToo ? linkedTasks.map((t: any) => t.id) : undefined;
                const res = await deleteCalamity(calamity.id, orgSlug, taskIds);
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
            <Button variant="ghost" onClick={() => { setCause(calamity.cause ?? ''); setStatus(calamity.status ?? ''); setAmount(calamity.amount?.toString() ?? ''); setDescription(calamity.description ?? ''); setNote(calamity.note ?? ''); setIsEditing(false); }} className="text-gray-400">
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
        defaultForestId={calamity.forestId}
        defaultLinkedPolygonId={calamity.id}
        defaultLinkedPolygonType="CALAMITY"
        trigger={<span className="hidden" />}
      />
    </DetailPanelShell>
  );
}
