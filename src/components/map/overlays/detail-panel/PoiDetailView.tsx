'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Tent, Home, Ban, Boxes, MapPin, Loader2, PlusCircle, Link as LinkIcon,
  Calendar, AlertCircle, User, Trash2, Move, Truck, TreePine, Camera,
  X, Wrench, Info,
} from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { updatePoi, deletePoi, upsertPoiVehicle, upsertPoiTree, upsertPoiLogPile, getOperationsForOrg, linkPoiToOperation } from '@/actions/poi';
import { toast } from 'sonner';
import { cn, getUserColor, getInitials } from '@/lib/utils';
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { format } from 'date-fns';
import { TREE_SPECIES, getSpeciesLabel } from '@/lib/tree-species';
import { de } from 'date-fns/locale';
import { useMapStore } from '@/components/map/stores/useMapStores';

// ---------------------------------------------------------------------------
// Konfiguration pro POI-Typ
// ---------------------------------------------------------------------------

const POI_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  HUNTING_STAND: { icon: Tent,     color: 'text-yellow-500', label: 'Hochsitz'   },
  LOG_PILE:      { icon: Boxes,    color: 'text-blue-500',   label: 'Polter'     },
  HUT:           { icon: Home,     color: 'text-orange-500', label: 'Hütte'      },
  BARRIER:       { icon: Ban,      color: 'text-red-500',    label: 'Schranke'   },
  VEHICLE:       { icon: Truck,    color: 'text-gray-400',   label: 'Fahrzeug'   },
  TREE:          { icon: TreePine, color: 'text-green-500',  label: 'Einzelbaum' },
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  EXCAVATOR:   'Bagger',
  HARVESTER:   'Harvester / Vollernter',
  FORWARDER:   'Forwarder / Rückefahrzeug',
  TRACTOR:     'Traktor / Schlepper',
  SKIDDER:     'Seilschlepper / Rückezug',
  CRANE_TRUCK: 'LKW mit Ladekran',
  MULCHER:     'Mulcher',
  CHAINSAW:    'Motorsäge',
  TRAILER:     'Anhänger',
  OTHER:       'Sonstiges',
};

const TREE_HEALTH_LABELS: Record<string, { label: string; color: string }> = {
  HEALTHY:             { label: 'Gesund',               color: 'text-green-400'  },
  DAMAGED:             { label: 'Geschädigt',            color: 'text-orange-400' },
  DEAD:                { label: 'Abgestorben',           color: 'text-red-400'    },
  MARKED_FOR_FELLING:  { label: 'Zum Fällen markiert',  color: 'text-blue-400'   },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  poi: any;
  tasks: any[];
  onClose: () => void;
  onRefresh: () => void;
  canEdit: boolean;
  canDelete: boolean;
  members: any[];
  orgSlug: string;
  forests: any[];
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export function PoiDetailView({
  poi, tasks, onClose, onRefresh, canEdit, canDelete, members, orgSlug, forests,
}: Props) {
  const selectFeature       = useMapStore(s => s.selectFeature);
  const setInteractionMode  = useMapStore(s => s.setInteractionMode);
  const interactionMode     = useMapStore(s => s.interactionMode);
  const editingFeatureData  = useMapStore(s => s.editingFeatureData);
  const setEditingFeature   = useMapStore(s => s.setEditingFeature);

  const [isEditing, setIsEditing]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [deleteTasksToo, setDeleteTasksToo] = useState(false);

  // Basis-Felder
  const [name, setName] = useState<string>(poi.name ?? '');
  const [note, setNote] = useState<string>(poi.note ?? '');

  // Fahrzeug-Felder
  const [vehicleType,     setVehicleType]     = useState<string>(poi.vehicle?.vehicleType ?? 'OTHER');
  const [serialNumber,    setSerialNumber]    = useState<string>(poi.vehicle?.serialNumber ?? '');
  const [yearBuilt,       setYearBuilt]       = useState<string>(poi.vehicle?.yearBuilt?.toString() ?? '');
  const [lastInspection,  setLastInspection]  = useState<string>(poi.vehicle?.lastInspection ? format(new Date(poi.vehicle.lastInspection), 'yyyy-MM-dd') : '');
  const [nextInspection,  setNextInspection]  = useState<string>(poi.vehicle?.nextInspection ? format(new Date(poi.vehicle.nextInspection), 'yyyy-MM-dd') : '');
  const [vehicleNotes,    setVehicleNotes]    = useState<string>(poi.vehicle?.notes ?? '');
  const [imageKey,        setImageKey]        = useState<string | null>(poi.vehicle?.imageKey ?? null);
  const [imagePreview,    setImagePreview]    = useState<string | null>(
    poi.vehicle?.imageKey ? `/api/images/poi?key=${encodeURIComponent(poi.vehicle.imageKey)}` : null
  );
  const [imageUploading,  setImageUploading]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Baum-Felder
  const [treeSpecies,   setTreeSpecies]   = useState<string>(poi.tree?.species ?? '');
  const [treeAge,       setTreeAge]       = useState<string>(poi.tree?.age?.toString() ?? '');
  const [treeDiameter,  setTreeDiameter]  = useState<string>(poi.tree?.diameter?.toString() ?? '');
  const [treeHeight,    setTreeHeight]    = useState<string>(poi.tree?.height?.toString() ?? '');
  const [treeHealth,    setTreeHealth]    = useState<string>(poi.tree?.health ?? 'HEALTHY');
  const [treeNotes,     setTreeNotes]     = useState<string>(poi.tree?.notes ?? '');

  // Polter-Felder
  const [logVolumeFm,    setLogVolumeFm]    = useState<string>(poi.logPile?.volumeFm?.toString() ?? '');
  const [logLength,      setLogLength]      = useState<string>(poi.logPile?.logLength?.toString() ?? '');
  const [logSpecies,     setLogSpecies]     = useState<string>(poi.logPile?.treeSpecies ?? '');
  const [logWoodType,    setLogWoodType]    = useState<string>(poi.logPile?.woodType ?? 'LOG');
  const [logQuality,     setLogQuality]     = useState<string>(poi.logPile?.qualityClass ?? '');
  const [logNotes,       setLogNotes]       = useState<string>(poi.logPile?.notes ?? '');

  const config = POI_CONFIG[poi.type] ?? { icon: MapPin, color: 'text-gray-400', label: 'Objekt' };
  const Icon   = config.icon;

  const activeData = (interactionMode === 'MOVE_POI' && editingFeatureData?.id === poi.id)
    ? editingFeatureData
    : poi;

  const linkedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'DONE') return false;
      if (t.poiId === poi.id) return true;
      if (t.lat && t.lng) {
        const epsilon = 0.00002;
        return Math.abs(t.lat - activeData.lat) < epsilon &&
               Math.abs(t.lng - activeData.lng) < epsilon;
      }
      return false;
    });
  }, [tasks, activeData, poi.id]);

  const determinedForestId = useMemo(() => {
    try {
      if (!forests?.length) return activeData.forestId;
      const poiPoint = point([activeData.lng, activeData.lat]);
      const found    = forests.find(f => f.geoJson && booleanPointInPolygon(poiPoint, f.geoJson));
      return found ? found.id : activeData.forestId;
    } catch {
      return activeData.forestId;
    }
  }, [activeData, forests]);

  // ---------------------------------------------------------------------------
  // Bild-Upload  (presigned → direkter S3-Upload)
  // ---------------------------------------------------------------------------

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)) {
      toast.error('Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximum: 10 MB');
      return;
    }

    setImageUploading(true);
    try {
      // 1. Presigned Upload-URL holen
      const res = await fetch('/api/upload/poi-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poiId: poi.id,
          contentType: file.type,
          contentLength: file.size,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Upload-URL konnte nicht erstellt werden');
      }

      const { uploadUrl, key } = await res.json();

      // 2. Direkt zu S3 hochladen – kein Traffic durch den Server
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Upload zu S3 fehlgeschlagen');

      // 3. Key merken; URL für Vorschau generieren
      setImageKey(key);
      setImagePreview(URL.createObjectURL(file));
      toast.success('Bild hochgeladen');
    } catch (err: any) {
      toast.error(err.message ?? 'Fehler beim Upload');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // Speichern
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const results = await Promise.all([
        updatePoi(poi.id, { name, note, lat: activeData.lat, lng: activeData.lng }),

        poi.type === 'VEHICLE'
          ? upsertPoiVehicle(poi.id, {
              vehicleType,
              serialNumber: serialNumber || undefined,
              yearBuilt:       yearBuilt       ? parseInt(yearBuilt, 10)              : null,
              lastInspection:  lastInspection  ? new Date(lastInspection)             : null,
              nextInspection:  nextInspection  ? new Date(nextInspection)             : null,
              imageKey,
              notes: vehicleNotes || undefined,
            })
          : null,

        poi.type === 'TREE'
          ? upsertPoiTree(poi.id, {
              species:  treeSpecies  || undefined,
              age:      treeAge      ? parseInt(treeAge, 10)       : null,
              diameter: treeDiameter ? parseFloat(treeDiameter)    : null,
              height:   treeHeight   ? parseFloat(treeHeight)      : null,
              health:   treeHealth,
              notes:    treeNotes    || undefined,
            })
          : null,

        poi.type === 'LOG_PILE'
          ? upsertPoiLogPile(poi.id, {
              volumeFm:    logVolumeFm  ? parseFloat(logVolumeFm)  : null,
              logLength:   logLength    ? parseFloat(logLength)    : null,
              treeSpecies: logSpecies   || null,
              woodType:    logWoodType  || null,
              qualityClass:logQuality   || null,
              notes:       logNotes     || undefined,
            }, orgSlug)
          : null,
      ]);

      const failed = results.filter(r => r && !r.success);
      if (failed.length > 0) {
        const msg = (failed as any[]).map(r => r.error).filter(Boolean).join(' | ');
        throw new Error(msg || 'Speichern teilweise fehlgeschlagen');
      }

      toast.success('Objekt gespeichert');
      setInteractionMode('VIEW');
      setEditingFeature(null);
      setIsEditing(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveStart = () => {
    setInteractionMode('MOVE_POI');
    setEditingFeature({ ...poi });
    toast.info('Marker auf der Karte verschieben...');
  };

  const copyMapsLink = async () => {
    const link = `https://www.google.com/maps?q=${activeData.lat},${activeData.lng}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Maps Link kopiert!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      toast.success('Maps Link kopiert!');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DetailPanelShell
      isVisible
      onClose={() => { onClose(); setInteractionMode('VIEW'); setEditingFeature(null); }}
      title={name}
      icon={<Icon className={cn('w-5 h-5', config.color)} />}
      headerColor="bg-gradient-to-br from-[#1a1a1a] to-black"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editNameValue={name}
      onEditNameChange={setName}
      canEdit={canEdit}
      canDelete={canDelete}
      onDelete={() => {}}
    >
      {/* 1. KOORDINATEN */}
      <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <MapPin className="w-3 h-3" />
          {activeData.lat.toFixed(6)}, {activeData.lng.toFixed(6)}
        </div>
        <button onClick={copyMapsLink} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded text-white flex items-center gap-1 transition">
          <LinkIcon className="w-3 h-3" /> Maps Link
        </button>
      </div>

      {/* VERSCHIEBEN */}
      {isEditing && (
        <div className="mt-2">
          <Button
            variant="outline"
            onClick={handleMoveStart}
            className={cn(
              'w-full border-dashed border-white/20 h-9 text-xs',
              interactionMode === 'MOVE_POI'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            )}
          >
            <Move className="w-3 h-3 mr-2" />
            {interactionMode === 'MOVE_POI' ? 'Position wird angepasst...' : 'Position auf Karte verschieben'}
          </Button>
        </div>
      )}

      {/* 2a. FAHRZEUG-DETAILS */}
      {poi.type === 'VEHICLE' && (
        <VehicleSection
          isEditing={isEditing}
          vehicleType={vehicleType}       setVehicleType={setVehicleType}
          serialNumber={serialNumber}     setSerialNumber={setSerialNumber}
          yearBuilt={yearBuilt}           setYearBuilt={setYearBuilt}
          lastInspection={lastInspection} setLastInspection={setLastInspection}
          nextInspection={nextInspection} setNextInspection={setNextInspection}
          vehicleNotes={vehicleNotes}     setVehicleNotes={setVehicleNotes}
          imagePreview={imagePreview}     imageUploading={imageUploading}
          fileInputRef={fileInputRef}
          onFileSelect={handleImageSelect}
          onImageRemove={() => { setImageKey(null); setImagePreview(null); }}
          onCreateInspectionTask={() => setShowCreateTask(true)}
          poiName={name}
        />
      )}

      {/* 2b. BAUM-DETAILS */}
      {poi.type === 'TREE' && (
        <TreeSection
          isEditing={isEditing}
          treeSpecies={treeSpecies}     setTreeSpecies={setTreeSpecies}
          treeAge={treeAge}             setTreeAge={setTreeAge}
          treeDiameter={treeDiameter}   setTreeDiameter={setTreeDiameter}
          treeHeight={treeHeight}       setTreeHeight={setTreeHeight}
          treeHealth={treeHealth}       setTreeHealth={setTreeHealth}
          treeNotes={treeNotes}         setTreeNotes={setTreeNotes}
        />
      )}

      {/* 2c. POLTER-DETAILS */}
      {poi.type === 'LOG_PILE' && (
        <LogPileSection
          isEditing={isEditing}
          poi={poi}
          orgSlug={orgSlug}
          volumeFm={logVolumeFm}     setVolumeFm={setLogVolumeFm}
          logLength={logLength}      setLogLength={setLogLength}
          treeSpecies={logSpecies}   setTreeSpecies={setLogSpecies}
          woodType={logWoodType}     setWoodType={setLogWoodType}
          qualityClass={logQuality}  setQualityClass={setLogQuality}
          notes={logNotes}           setNotes={setLogNotes}
        />
      )}

      {/* 3. NOTIZEN (nur für nicht-spezifische Typen oder zusätzlich) */}
      {poi.type !== 'VEHICLE' && poi.type !== 'TREE' && (
        <div className="mt-4">
          <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notizen & Zustand</h4>
          {isEditing ? (
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="bg-black/50 border-white/20 text-white min-h-[100px]"
              placeholder="Z.B. Dach undicht..."
            />
          ) : (
            <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[60px] whitespace-pre-wrap">
              {note || 'Keine Notizen.'}
            </p>
          )}
        </div>
      )}

      {/* 4. AUFGABEN */}
      {!isEditing && (
        <div className="space-y-3 pt-4 border-t border-white/10 mt-4">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] uppercase text-gray-500 font-bold">Aufgaben am Objekt</h4>
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

      {/* 5. FOOTER */}
      {isEditing && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          {canDelete ? (() => {
            const poiTasks = tasks.filter((t: any) => t.poiId === poi.id);
            const linkedOps: any[] = poi.operationLogPiles ?? [];
            return (
              <DeleteConfirmDialog
                trigger={
                  <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3">
                    <Trash2 className="w-4 h-4 mr-2" /> Löschen
                  </Button>
                }
                title={`Objekt "${poi.name}" löschen?`}
                description="Diese Aktion ist unwiderruflich."
                confirmString={poi.name}
                onConfirm={async () => {
                  await deletePoi(poi.id, deleteTasksToo);
                  onRefresh();
                  onClose();
                }}
              >
                {poiTasks.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Verknüpfte Aufgaben ({poiTasks.length})
                    </p>
                    <div className="space-y-1">
                      {poiTasks.map((t: any) => (
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
                {linkedOps.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-800">
                      Verknüpfte Maßnahmen ({linkedOps.length})
                    </p>
                    <div className="space-y-1">
                      {linkedOps.map((lp: any) => (
                        <div key={lp.id} className="flex items-baseline gap-2 text-sm">
                          <span className="text-[10px] font-semibold uppercase text-blue-400 shrink-0 w-16">Maßnahme</span>
                          <span className="text-slate-700 truncate">{lp.operation?.title ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-blue-600 pt-1 border-t border-blue-200">
                      Die Maßnahmen bleiben erhalten — nur der Bezug zum Polter wird entfernt.
                    </p>
                  </div>
                )}
              </DeleteConfirmDialog>
            );
          })() : <div />}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => { setIsEditing(false); setInteractionMode('VIEW'); setEditingFeature(null); }}
              className="text-gray-400"
            >
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </div>
        </div>
      )}

      {/* TASK DIALOG */}
      <CreateTaskDialog
        openProp={showCreateTask}
        onOpenChangeProp={open => { setShowCreateTask(open); if (!open) onRefresh(); }}
        orgSlug={orgSlug}
        members={members}
        forests={forests}
        defaultTitle={
          poi.type === 'VEHICLE' && nextInspection
            ? `Inspektion: ${name}`
            : `Arbeit an: ${name}`
        }
        defaultForestId={determinedForestId}
        defaultPoiId={poi.id}
        trigger={<span className="hidden" />}
      />
    </DetailPanelShell>
  );
}

// ---------------------------------------------------------------------------
// Fahrzeug-Sektion
// ---------------------------------------------------------------------------

function VehicleSection({
  isEditing, vehicleType, setVehicleType, serialNumber, setSerialNumber,
  yearBuilt, setYearBuilt, lastInspection, setLastInspection,
  nextInspection, setNextInspection, vehicleNotes, setVehicleNotes,
  imagePreview, imageUploading, fileInputRef, onFileSelect, onImageRemove,
  onCreateInspectionTask, poiName,
}: any) {
  const nextInspDate = nextInspection ? new Date(nextInspection) : null;
  const daysUntilInsp = nextInspDate
    ? Math.ceil((nextInspDate.getTime() - Date.now()) / 86400000)
    : null;
  const inspectionWarning = daysUntilInsp !== null && daysUntilInsp <= 30;

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1.5">
        <Truck className="w-3 h-3" /> Fahrzeugdaten
      </h4>

      {/* Bild */}
      <div className="relative">
        {imagePreview ? (
          <div className="relative rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Fahrzeugfoto" className="w-full h-full object-cover" />
            {isEditing && (
              <button
                onClick={onImageRemove}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : isEditing ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="w-full aspect-video border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-white/40 hover:bg-white/5 transition text-gray-500 hover:text-gray-300"
          >
            {imageUploading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Camera className="w-5 h-5" /><span className="text-xs">Foto hochladen</span><span className="text-[10px] opacity-60">JPEG, PNG, WebP · max. 10 MB</span></>
            }
          </button>
        ) : null}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={onFileSelect} />
      </div>

      {/* Felder Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fahrzeugtyp */}
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Fahrzeugtyp</label>
          {isEditing ? (
            <select
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-white">{VEHICLE_TYPE_LABELS[vehicleType] ?? vehicleType}</p>
          )}
        </div>

        {/* Seriennummer */}
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Kennzeichen / Seriennr.</label>
          {isEditing ? (
            <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="z.B. MN-BY 1234" className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{serialNumber || '—'}</p>
          )}
        </div>

        {/* Baujahr */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Baujahr</label>
          {isEditing ? (
            <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} placeholder="z.B. 2018" min="1950" max={new Date().getFullYear()} className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{yearBuilt || '—'}</p>
          )}
        </div>

        {/* Letzte Inspektion */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Letzte Inspektion</label>
          {isEditing ? (
            <input type="date" value={lastInspection} onChange={e => setLastInspection(e.target.value)} className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{lastInspection ? format(new Date(lastInspection), 'dd.MM.yyyy') : '—'}</p>
          )}
        </div>

        {/* Nächste Inspektion */}
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Nächste Inspektion</label>
          <div className="flex gap-2 items-center">
            {isEditing ? (
              <input type="date" value={nextInspection} onChange={e => setNextInspection(e.target.value)} className="flex-1 bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
            ) : (
              <p className={cn('text-sm flex-1', inspectionWarning ? 'text-yellow-400 font-semibold' : 'text-gray-300')}>
                {nextInspection ? format(new Date(nextInspection), 'dd.MM.yyyy') : '—'}
                {daysUntilInsp !== null && daysUntilInsp > 0 && ` (in ${daysUntilInsp} Tagen)`}
                {daysUntilInsp !== null && daysUntilInsp <= 0 && ' (überfällig!)'}
              </p>
            )}
            {nextInspection && !isEditing && (
              <Button variant="outline" size="sm" onClick={onCreateInspectionTask} className="text-xs border-white/20 text-gray-400 hover:text-white h-7 shrink-0">
                <Wrench className="w-3 h-3 mr-1" /> Als Aufgabe
              </Button>
            )}
          </div>
          {inspectionWarning && daysUntilInsp !== null && daysUntilInsp > 0 && (
            <p className="text-[10px] text-yellow-400/80 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Inspektion in {daysUntilInsp} Tagen fällig
            </p>
          )}
        </div>
      </div>

      {/* Fahrzeug-Notizen */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Notizen</label>
        {isEditing ? (
          <Textarea value={vehicleNotes} onChange={e => setVehicleNotes(e.target.value)} className="bg-black/50 border-white/20 text-white min-h-[80px]" placeholder="z.B. Ölwechsel fällig..." />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[50px] whitespace-pre-wrap">
            {vehicleNotes || 'Keine Notizen.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Polter-Sektion
// ---------------------------------------------------------------------------

const WOOD_TYPE_LABELS_POI: Record<string, string> = {
  LOG: 'Stammholz', INDUSTRIAL: 'Industrieholz', ENERGY: 'Energieholz', PULP: 'Papierholz',
};


function AssignOperationWidget({ poi, orgSlug }: { poi: any; orgSlug: string }) {
  const [open, setOpen]             = useState(false);
  const [operations, setOps]        = useState<any[]>([]);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [selectedOp, setSelectedOp] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const { ops, error } = await getOperationsForOrg(orgSlug);
    setOps(ops);
    if (error) setLoadError(error);
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  const handleAssign = async () => {
    if (!selectedOp) return;
    setSaving(true);
    const res = await linkPoiToOperation(poi.id, selectedOp, orgSlug, {
      treeSpecies:     poi.logPile?.treeSpecies  ?? undefined,
      woodType:        poi.logPile?.woodType      ?? undefined,
      qualityClass:    poi.logPile?.qualityClass  ?? undefined,
      estimatedAmount: poi.logPile?.volumeFm      ?? undefined,
    });
    setSaving(false);
    if (res?.success) {
      toast.success('Polter der Maßnahme zugewiesen');
      setOpen(false);
    } else {
      toast.error(res?.error ?? 'Fehler beim Zuweisen');
    }
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/20 text-xs text-gray-500 hover:text-white hover:border-white/40 hover:bg-white/5 transition"
      >
        <LinkIcon className="w-3 h-3" /> Maßnahme zuweisen
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <p className="text-[10px] uppercase text-gray-500 font-bold">Maßnahme zuweisen</p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Lade Maßnahmen…
        </div>
      ) : loadError ? (
        <p className="text-xs text-red-400">{loadError}</p>
      ) : operations.length === 0 ? (
        <p className="text-xs text-gray-500">
          Keine aktiven Maßnahmen gefunden. Bitte zuerst unter{' '}
          <a href={`/dashboard/org/${orgSlug}/operations`} className="text-amber-400 hover:underline">
            Maßnahmen & Holzverkauf
          </a>{' '}
          eine Maßnahme anlegen.
        </p>
      ) : (
        <select
          value={selectedOp}
          onChange={e => setSelectedOp(e.target.value)}
          className="w-full bg-black/50 border border-white/20 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="">— Maßnahme wählen —</option>
          {operations.map((op: any) => (
            <option key={op.id} value={op.id}>
              {op.year} · {op.forest?.name} · {op.title}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white">Abbrechen</button>
        <Button
          size="sm"
          disabled={!selectedOp || saving}
          onClick={handleAssign}
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Zuweisen'}
        </Button>
      </div>
    </div>
  );
}

function LogPileSection({
  isEditing, poi, orgSlug,
  volumeFm, setVolumeFm, logLength, setLogLength,
  treeSpecies, setTreeSpecies, woodType, setWoodType,
  qualityClass, setQualityClass, notes, setNotes,
}: any) {
  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1.5">
        <Boxes className="w-3 h-3" /> Polterdaten
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Festmeter */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Festmeter (fm)</label>
          {isEditing ? (
            <input type="number" value={volumeFm} onChange={e => setVolumeFm(e.target.value)}
              min="0" step="0.1" placeholder="z.B. 12.5"
              className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{volumeFm ? `${parseFloat(volumeFm).toLocaleString('de-DE')} fm` : '—'}</p>
          )}
        </div>

        {/* Stammlänge */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Stammlänge (m)</label>
          {isEditing ? (
            <input type="number" value={logLength} onChange={e => setLogLength(e.target.value)}
              min="0" step="0.1" placeholder="z.B. 5.0"
              className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{logLength ? `${parseFloat(logLength).toLocaleString('de-DE')} m` : '—'}</p>
          )}
        </div>

        {/* Baumart */}
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Baumart</label>
          {isEditing ? (
            <select value={treeSpecies} onChange={e => setTreeSpecies(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500">
              <option value="">— wählen —</option>
              {TREE_SPECIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          ) : (
            <p className="text-sm text-gray-300">{treeSpecies ? getSpeciesLabel(treeSpecies) : '—'}</p>
          )}
        </div>

        {/* Holzart */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Holzart</label>
          {isEditing ? (
            <select value={woodType} onChange={e => setWoodType(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500">
              {Object.entries(WOOD_TYPE_LABELS_POI).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-300">{(WOOD_TYPE_LABELS_POI[woodType] ?? woodType) || '—'}</p>
          )}
        </div>

        {/* Qualitätsklasse */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Qualität</label>
          {isEditing ? (
            <select value={qualityClass} onChange={e => setQualityClass(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500">
              <option value="">—</option>
              {['A','B','C','D','IL','E'].map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          ) : (
            <p className="text-sm text-gray-300">{qualityClass || '—'}</p>
          )}
        </div>
      </div>

      {/* Notizen */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Notizen</label>
        {isEditing ? (
          <Textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[60px]"
            placeholder="Hinweise zum Polter…" />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[40px] whitespace-pre-wrap">
            {notes || 'Keine Notizen.'}
          </p>
        )}
      </div>

      {/* Maßnahme zuweisen */}
      {!isEditing && (
        <AssignOperationWidget poi={poi} orgSlug={orgSlug} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Baum-Sektion
// ---------------------------------------------------------------------------

const COMMON_SPECIES = [
  'Fichte', 'Kiefer', 'Buche', 'Eiche', 'Douglasie', 'Lärche',
  'Tanne', 'Birke', 'Erle', 'Esche', 'Ahorn', 'Pappel',
];

function TreeSection({
  isEditing, treeSpecies, setTreeSpecies, treeAge, setTreeAge,
  treeDiameter, setTreeDiameter, treeHeight, setTreeHeight,
  treeHealth, setTreeHealth, treeNotes, setTreeNotes,
}: any) {
  // CO2-Schätzung live berechnen
  const co2Estimate = useMemo(() => {
    const d = parseFloat(treeDiameter);
    const h = parseFloat(treeHeight);
    if (!d || !h) return null;

    // Einfache Schätzung (gleiche Formel wie Server): Volumen × Dichte × C-Anteil × (44/12)
    const densityMap: Record<string, number> = {
      fichte: 460, kiefer: 510, buche: 720, eiche: 730,
      douglasie: 530, lärche: 590, tanne: 450, birke: 650,
      erle: 560, esche: 690, ahorn: 640, pappel: 420,
    };
    const key = treeSpecies.toLowerCase().split(' ')[0];
    const density = densityMap[key] ?? 550;
    const vol = (Math.PI / 4) * Math.pow(d / 100, 2) * h * 0.45;
    return Math.round(vol * density * 0.5 * (44 / 12) * 10) / 10;
  }, [treeDiameter, treeHeight, treeSpecies]);

  const healthCfg = TREE_HEALTH_LABELS[treeHealth] ?? { label: treeHealth, color: 'text-gray-400' };

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1.5">
        <TreePine className="w-3 h-3" /> Baumdaten
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Baumart */}
        <div className="col-span-2">
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Baumart</label>
          {isEditing ? (
            <div className="space-y-1.5">
              <input
                value={treeSpecies}
                onChange={e => setTreeSpecies(e.target.value)}
                list="tree-species-list"
                placeholder="z.B. Fichte, Buche ..."
                className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
              <datalist id="tree-species-list">
                {COMMON_SPECIES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          ) : (
            <p className="text-sm text-white">{treeSpecies || '—'}</p>
          )}
        </div>

        {/* Alter */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Alter (Jahre)</label>
          {isEditing ? (
            <input type="number" value={treeAge} onChange={e => setTreeAge(e.target.value)} min="0" max="1000" className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{treeAge ? `${treeAge} J.` : '—'}</p>
          )}
        </div>

        {/* BHD */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">BHD (cm)</label>
          {isEditing ? (
            <input type="number" value={treeDiameter} onChange={e => setTreeDiameter(e.target.value)} min="0" step="0.1" placeholder="∅ bei 1,3m" className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{treeDiameter ? `${treeDiameter} cm` : '—'}</p>
          )}
        </div>

        {/* Höhe */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Höhe (m)</label>
          {isEditing ? (
            <input type="number" value={treeHeight} onChange={e => setTreeHeight(e.target.value)} min="0" step="0.5" className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500" />
          ) : (
            <p className="text-sm text-gray-300">{treeHeight ? `${treeHeight} m` : '—'}</p>
          )}
        </div>

        {/* Gesundheitszustand */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Zustand</label>
          {isEditing ? (
            <select value={treeHealth} onChange={e => setTreeHealth(e.target.value)} className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500">
              {Object.entries(TREE_HEALTH_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          ) : (
            <p className={cn('text-sm font-medium', healthCfg.color)}>{healthCfg.label}</p>
          )}
        </div>
      </div>

      {/* CO2-Schätzung */}
      {co2Estimate !== null && (
        <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-green-400 font-semibold">Geschätzte CO₂-Speicherleistung</p>
            <p className="text-lg font-bold text-white">{co2Estimate.toLocaleString('de-DE')} kg CO₂</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Berechnet aus BHD, Höhe und artspezifischer Holzdichte</p>
          </div>
        </div>
      )}

      {/* Baum-Notizen */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Notizen</label>
        {isEditing ? (
          <Textarea value={treeNotes} onChange={e => setTreeNotes(e.target.value)} className="bg-black/50 border-white/20 text-white min-h-[80px]" placeholder="z.B. Höhlenwildling, Horst ..." />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[50px] whitespace-pre-wrap">
            {treeNotes || 'Keine Notizen.'}
          </p>
        )}
      </div>
    </div>
  );
}
