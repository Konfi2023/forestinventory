'use client';

import { useState, useMemo } from 'react';
import { Route, Ruler, Loader2, Waves, Palette, ScanLine, Trash2, Check, PlusCircle, AlertCircle, Calendar, User } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updatePath, deletePath } from '@/actions/paths';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { calculatePathLengthM } from '@/lib/map-helpers';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getUserColor, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ---------------------------------------------------------------------------

const PATH_CONFIG: Record<string, { label: string; defaultColor: string; bgClass: string }> = {
  ROAD:       { label: 'LKW-Weg',    defaultColor: '#94a3b8', bgClass: 'bg-slate-500/20'  },
  SKID_TRAIL: { label: 'Rückegasse', defaultColor: '#eab308', bgClass: 'bg-yellow-500/20' },
  WATER:      { label: 'Gewässer',   defaultColor: '#3b82f6', bgClass: 'bg-blue-500/20'   },
};

const PATH_COLORS = [
  '#94a3b8', '#eab308', '#3b82f6', '#10b981',
  '#f97316', '#ef4444', '#a855f7', '#ffffff',
];

function formatLength(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

// ---------------------------------------------------------------------------

interface Props {
  path: any;
  forest: any;
  orgSlug: string;
  tasks: any[];
  members: any[];
  forests: any[];
  onClose: () => void;
  onRefresh: () => void;
  onDeleteSuccess: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function PathDetailView({
  path, forest, orgSlug, tasks, members, forests, onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);
  const selectFeature      = useMapStore(s => s.selectFeature);

  const cfg     = PATH_CONFIG[path.type] ?? PATH_CONFIG.ROAD;
  const lengthM = path.lengthM ?? calculatePathLengthM(path.geoJson);

  const [isEditing,      setIsEditing]      = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const linkedTasks = useMemo(() => {
    if (!tasks?.length) return [];
    return tasks.filter(t => t.linkedPolygonId === path.id && t.status !== 'DONE');
  }, [tasks, path.id]);

  const [name,  setName]  = useState(path.name  ?? cfg.label);
  const [note,  setNote]  = useState(path.note  ?? '');
  const [color, setColor] = useState(path.color ?? cfg.defaultColor);

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updatePath(path.id, { name, note, color });
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Weg aktualisiert');
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
      setEditingFeature({
        id: path.id,
        geoJson: path.geoJson,
        featureType: 'PATH',
        pathType: path.type,
        name: path.name,
      });
      onClose();
      toast.info('Ziehpunkte verschieben um Linie zu ändern');
    }
  };

  const PathIcon = path.type === 'WATER' ? Waves : Route;

  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={name}
      icon={<PathIcon className="w-4 h-4" style={{ color }} />}
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
      {/* 1. FAKTEN */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-500 font-bold mb-1">
            <Ruler size={12} /> Länge
          </div>
          <div className="text-lg text-white font-mono font-medium">
            {formatLength(lengthM)}
          </div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-500 font-bold mb-1">
            <PathIcon size={12} /> Typ
          </div>
          <div className="text-sm text-white">{cfg.label}</div>
        </div>
      </div>

      {/* 2. WALD */}
      {forest && (
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Wald:</span> {forest.name}
        </div>
      )}

      {/* 3. FARBWAHL — nur im Edit-Modus */}
      {isEditing && (
        <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
          <label className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-2">
            <Palette size={12} /> Linienfarbe
          </label>
          <div className="flex flex-wrap gap-2">
            {PATH_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  color === c
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-transparent opacity-50 hover:opacity-100',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. NOTIZ */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notiz</h4>
        {isEditing ? (
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[80px]"
            placeholder="Notizen zum Weg..."
          />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[48px] whitespace-pre-wrap">
            {note || 'Keine Notiz.'}
          </p>
        )}
      </div>

      {/* 5. AUFGABEN */}
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

      {/* 6. GEOMETRIE BEARBEITEN — nur im Edit-Modus */}
      {isEditing && (
        <div className="pt-2 border-t border-white/10 mt-2">
          <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">
            Geometrie
          </label>
          <Button
            variant="outline"
            className={cn(
              'w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/10 h-10 font-bold',
              isGeometryEditing && 'bg-blue-900/20 border-blue-500 text-blue-400',
            )}
            onClick={handleToggleGeometry}
          >
            {isGeometryEditing
              ? <><Check className="w-4 h-4 mr-2" /> Bearbeiten beenden</>
              : <><ScanLine className="w-4 h-4 mr-2" /> Linie auf Karte ändern</>
            }
          </Button>
        </div>
      )}

      {/* FOOTER — nur im Edit-Modus, identisch zu ForestDetailView */}
      {isEditing && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">

          {/* LINKS: Löschen */}
          {canDelete ? (
            <DeleteConfirmDialog
              trigger={
                <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3">
                  <Trash2 className="w-4 h-4 mr-2" /> Löschen
                </Button>
              }
              title={`Weg "${path.name ?? cfg.label}" löschen?`}
              description="Der Weg wird unwiderruflich von der Karte entfernt."
              confirmString={path.name ?? cfg.label}
              onConfirm={async () => {
                const res = await deletePath(path.id);
                if (res.success) {
                  onDeleteSuccess(path.id);
                  onClose();
                } else {
                  throw new Error(res.error);
                }
              }}
            />
          ) : <div />}

          {/* RECHTS: Abbrechen & Speichern */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setName(path.name ?? cfg.label);
                setNote(path.note ?? '');
                setColor(path.color ?? cfg.defaultColor);
                setIsEditing(false);
              }}
              className="text-gray-400"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
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
        defaultTitle={`Aufgabe: ${name}`}
        defaultForestId={path.forestId}
        defaultLinkedPolygonId={path.id}
        defaultLinkedPolygonType={path.type}
        trigger={<span className="hidden" />}
      />
    </DetailPanelShell>
  );
}
