'use client';

import { useState, useMemo } from 'react';
import { Tent, Home, Ban, Boxes, MapPin, Loader2, PlusCircle, Link as LinkIcon, Calendar, AlertCircle, User, Trash2, Move } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { updatePoi, deletePoi } from '@/actions/poi';
import { toast } from 'sonner';
import { cn, getUserColor, getInitials } from '@/lib/utils';
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMapStore } from '@/components/map/stores/useMapStores';

const POI_CONFIG: Record<string, { icon: any, color: string, label: string }> = {
    'HUNTING_STAND': { icon: Tent, color: 'text-yellow-500', label: 'Hochsitz' },
    'LOG_PILE': { icon: Boxes, color: 'text-blue-500', label: 'Polter' },
    'HUT': { icon: Home, color: 'text-orange-500', label: 'Hütte' },
    'BARRIER': { icon: Ban, color: 'text-red-500', label: 'Schranke' },
};

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

export function PoiDetailView({ 
    poi, tasks, onClose, onRefresh, canEdit, canDelete, 
    members, orgSlug, forests 
}: Props) {
    const selectFeature = useMapStore(s => s.selectFeature);
    
    // Store Hooks für Move-Funktion
    const setInteractionMode = useMapStore(s => s.setInteractionMode);
    const interactionMode = useMapStore(s => s.interactionMode);
    const editingFeatureData = useMapStore(s => s.editingFeatureData);
    const setEditingFeature = useMapStore(s => s.setEditingFeature);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    
    const [name, setName] = useState(poi.name);
    const [note, setNote] = useState(poi.note || "");

    const config = POI_CONFIG[poi.type] || { icon: MapPin, color: 'text-gray-400', label: 'Objekt' };
    const Icon = config.icon;

    // --- LEBENDIGE DATEN ---
    // Wenn wir gerade verschieben, nutzen wir die Daten aus dem Store (editingFeatureData)
    // Wenn nicht, nutzen wir die Daten aus der Prop (poi)
    const activeData = (interactionMode === 'MOVE_POI' && editingFeatureData && editingFeatureData.id === poi.id) 
        ? editingFeatureData 
        : poi;

    // Tasks finden: Wir prüfen entweder auf poiId ODER auf Geo-Nähe (Abwärtskompatibilität)
    const linkedTasks = useMemo(() => {
        return tasks.filter(t => {
            if (t.status === 'DONE') return false;
            // 1. Priorität: Direkte Verknüpfung
            if (t.poiId === poi.id) return true;
            // 2. Fallback: Geo-Nähe (falls alte Tasks)
            if (t.lat && t.lng) {
                 const epsilon = 0.00002; 
                 return Math.abs(t.lat - activeData.lat) < epsilon && Math.abs(t.lng - activeData.lng) < epsilon;
            }
            return false;
        });
    }, [tasks, activeData, poi.id]);

    const determinedForestId = useMemo(() => {
        try {
            if (!forests || forests.length === 0) return activeData.forestId;
            const poiPoint = point([activeData.lng, activeData.lat]);
            const foundForest = forests.find(f => f.geoJson && booleanPointInPolygon(poiPoint, f.geoJson));
            return foundForest ? foundForest.id : activeData.forestId;
        } catch (e) {
            return activeData.forestId;
        }
    }, [activeData, forests]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePoi(poi.id, { 
                name, 
                note,
                // Server Action muss erweitert werden um lat/lng Updates zu erlauben!
                // @ts-ignore
                lat: activeData.lat,
                // @ts-ignore
                lng: activeData.lng
            });
            
            toast.success("Objekt gespeichert");
            setInteractionMode('VIEW'); 
            setEditingFeature(null); 
            setIsEditing(false);
            onRefresh();
        } catch (e) {
            toast.error("Fehler beim Speichern");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMoveStart = () => {
        setInteractionMode('MOVE_POI');
        setEditingFeature({ ...poi });
        toast.info("Marker auf der Karte verschieben...");
    };

    const copyMapsLink = async () => {
        const link = `https://www.google.com/maps?q=${activeData.lat},${activeData.lng}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(link); toast.success("Maps Link kopiert!"); return; } catch (e) {}
        }
        try {
            const textArea = document.createElement("textarea");
            textArea.value = link;
            textArea.style.position = "fixed"; textArea.style.left = "-9999px";
            document.body.appendChild(textArea); textArea.focus(); textArea.select();
            document.execCommand('copy'); document.body.removeChild(textArea);
            toast.success("Maps Link kopiert!");
        } catch (e) { toast.error("Copy failed"); }
    };

    const handleTaskClick = (taskId: string) => {
        selectFeature(taskId, 'TASK');
    };

    return (
        <DetailPanelShell
            isVisible={true}
            onClose={() => { 
                onClose(); 
                setInteractionMode('VIEW'); 
                setEditingFeature(null); 
            }}
            title={name}
            icon={<Icon className={cn("w-5 h-5", config.color)} />}
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
                    <LinkIcon className="w-3 h-3"/> Maps Link
                </button>
             </div>

             {/* NEU: VERSCHIEBEN BUTTON */}
             {isEditing && (
                 <div className="mt-2">
                     <Button 
                        variant="outline" 
                        onClick={handleMoveStart}
                        className={cn(
                            "w-full border-dashed border-white/20 h-9 text-xs",
                            interactionMode === 'MOVE_POI' 
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/50" 
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                     >
                        <Move className="w-3 h-3 mr-2" />
                        {interactionMode === 'MOVE_POI' ? "Position wird angepasst..." : "Position auf Karte verschieben"}
                     </Button>
                 </div>
             )}

             {/* 2. NOTIZEN */}
             <div className="mt-4">
                <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notizen & Zustand</h4>
                {isEditing ? (
                    <Textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="bg-black/50 border-white/20 text-white min-h-[100px]"
                        placeholder="Z.B. Dach undicht..."
                    />
                ) : (
                    <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[60px] whitespace-pre-wrap">
                        {note || "Keine Notizen."}
                    </p>
                )}
             </div>

             {/* 3. AUFGABEN-LISTE */}
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
                                <div key={task.id} onClick={() => handleTaskClick(task.id)} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-lg transition-colors group cursor-pointer flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {task.priority === 'URGENT' && <AlertCircle size={14} className="text-red-500" />}
                                            <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{task.title}</span>
                                        </div>
                                        {task.dueDate && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar size={12} /> {format(new Date(task.dueDate), "dd. MMM", { locale: de })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 ml-2">
                                        {task.assignee ? (
                                            <Avatar className="h-6 w-6 border border-white/20">
                                                <AvatarFallback className={cn("text-[9px] font-bold", getUserColor(task.assignee.firstName || task.assignee.email))}>
                                                    {getInitials(task.assignee.firstName, task.assignee.lastName)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                                <User size={12} className="text-gray-500"/>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <Button className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5 h-9 text-xs mt-2" variant="outline" onClick={() => setShowCreateTask(true)}>
                            <PlusCircle className="w-3 h-3 mr-2"/> Neue Aufgabe hier
                        </Button>
                     </div>
                 </div>
             )}

             {/* FOOTER ACTIONS */}
            {isEditing && (
                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                    
                    {canDelete ? (
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
                                await deletePoi(poi.id);
                                onRefresh();
                                onClose();
                            }}
                        />
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => { setIsEditing(false); setInteractionMode('VIEW'); setEditingFeature(null); }} className="text-gray-400">Abbrechen</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Speichern"}
                        </Button>
                    </div>
                </div>
            )}

            {/* TASK DIALOG */}
            <CreateTaskDialog 
                openProp={showCreateTask}
                onOpenChangeProp={(open) => {
                    setShowCreateTask(open);
                    if (!open) onRefresh(); 
                }}
                orgSlug={orgSlug}
                members={members}
                forests={forests}
                
                defaultTitle={`Arbeit an: ${name}`} 
                defaultForestId={determinedForestId}
                
                // --- NEU: POI ID ---
                defaultPoiId={poi.id}
                
                trigger={<span className="hidden" />} 
            />

        </DetailPanelShell>
    );
}