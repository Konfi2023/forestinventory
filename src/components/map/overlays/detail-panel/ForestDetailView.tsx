'use client';

import { useState } from 'react';
import { 
  Trees, Ruler, MapPin, Loader2, Plus, Calendar, AlertCircle, 
  Palette, ScanLine, Check, Trash2 
} from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateForest, deleteForest } from '@/actions/forest';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/components/map/stores/useMapStores';

// Import des Dialogs und des Sicherheits-Modals
import { CreateTaskDialog } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/CreateTaskDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

const FOREST_COLORS = [
    "#10b981", "#3b82f6", "#ef4444", "#f59e0b", 
    "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1",
];

interface Props {
    forest: any;
    tasks: any[];
    onClose: () => void;
    onRefresh: () => void;
    onDeleteSuccess: (id: string) => void;
    canEdit: boolean;
    canDelete: boolean;
    userId: string;
    members: any[];
    orgSlug: string;
}

export function ForestDetailView({ 
    forest, tasks, onClose, onRefresh, onDeleteSuccess, 
    canEdit, canDelete, userId, members, orgSlug 
}: Props) {
    const setInteractionMode = useMapStore(s => s.setInteractionMode);
    const setEditingFeature = useMapStore(s => s.setEditingFeature);
    const interactionMode = useMapStore(s => s.interactionMode);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    
    const [name, setName] = useState(forest.name);
    const [desc, setDesc] = useState(forest.description || "");
    const [color, setColor] = useState(forest.color || "#10b981");

    const forestTasks = tasks.filter(t => t.forestId === forest.id && t.status !== 'DONE');
    const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateForest({
                id: forest.id,
                keycloakId: userId,
                name,
                description: desc,
                // @ts-ignore
                color: color 
            });
            toast.success("Wald aktualisiert");
            setIsEditing(false);
            onRefresh();
        } catch (e) {
            toast.error("Fehler beim Speichern");
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
                id: forest.id,
                geoJson: forest.geoJson,
                name: forest.name
            });
            onClose(); 
            toast.info("Ziehpunkte verschieben um Grenzen zu ändern");
        }
    };

    return (
        <DetailPanelShell
            isVisible={true}
            onClose={onClose}
            title={name}
            icon={<Trees className="w-5 h-5 text-white" />}
            headerColor={`bg-gradient-to-br from-[${color}] to-black/80 border-b border-white/10`} 
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing(!isEditing)}
            editNameValue={name}
            onEditNameChange={setName}
            canEdit={canEdit}
            canDelete={canDelete}
            // Fallback für Löschen im Header (optional, da wir es jetzt im Footer haben)
            onDelete={() => {}} 
        >
            {/* 1. FAKTEN */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-500 font-bold mb-1"><Ruler size={12} /> Fläche</div>
                    <div className="text-lg text-white font-mono font-medium">{forest.areaHa?.toFixed(2) || 0} <span className="text-sm text-gray-500 ml-1">ha</span></div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-gray-500 font-bold mb-1"><MapPin size={12} /> Ort</div>
                    <div className="text-sm text-white truncate">{forest.location || "Unbekannt"}</div>
                </div>
            </div>

            {/* 2. COLOR PICKER */}
            {isEditing && (
                <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                    <label className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-2">
                        <Palette size={12}/> Flächenfarbe
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {FOREST_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={cn(
                                    "w-6 h-6 rounded-full border-2 transition-all",
                                    color === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. BESCHREIBUNG */}
            <div>
                <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Beschreibung</h4>
                {isEditing ? (
                    <Textarea 
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="bg-black/50 border-white/20 text-white min-h-[100px]"
                        placeholder="Bestandsdaten, Baumarten..."
                    />
                ) : (
                    <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[60px] whitespace-pre-wrap">
                        {desc || "Keine Beschreibung."}
                    </p>
                )}
            </div>

            {/* 4. GEOMETRIE BEARBEITEN */}
            {isEditing && (
                <div className="pt-2 border-t border-white/10 mt-2">
                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">
                        Geometrie
                    </label>
                    <Button 
                        variant="outline" 
                        className={cn(
                            "w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/10 h-10 font-bold",
                            isGeometryEditing && "bg-blue-900/20 border-blue-500 text-blue-400"
                        )}
                        onClick={handleToggleGeometry}
                    >
                        {isGeometryEditing ? <Check className="w-4 h-4 mr-2"/> : <ScanLine className="w-4 h-4 mr-2" />}
                        {isGeometryEditing ? "Bearbeiten beenden" : "Grenzen auf Karte ändern"}
                    </Button>
                </div>
            )}

            {/* 5. AUFGABEN */}
            {!isEditing && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                         <h4 className="text-[10px] uppercase text-gray-500 font-bold">Aktive Aufgaben</h4>
                         <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{forestTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                        {forestTasks.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-600 border border-dashed border-white/10 rounded-lg">
                                Keine offenen Aufgaben.
                            </div>
                        ) : (
                            forestTasks.map((task: any) => (
                                <div key={task.id} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-lg transition-colors group cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {task.priority === 'URGENT' && <AlertCircle size={14} className="text-red-500" />}
                                            <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{task.title}</span>
                                        </div>
                                    </div>
                                    {task.dueDate && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Calendar size={12} /> {format(new Date(task.dueDate), "dd. MMM", { locale: de })}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        <Button onClick={() => setShowCreateTask(true)} variant="outline" className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5 h-9 text-xs">
                            <Plus className="w-3 h-3 mr-2"/> Aufgabe hinzufügen
                        </Button>
                    </div>
                </div>
            )}

            {/* FOOTER ACTIONS MIT SICHERHEITSFRAGE */}
            {isEditing && (
                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                    
                    {/* LINKS: Löschen Button (Öffnet Modal) */}
                    {canDelete ? (
                         <DeleteConfirmDialog 
                            trigger={
                                <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3">
                                    <Trash2 className="w-4 h-4 mr-2" /> Löschen
                                </Button>
                            }
                            title={`Wald "${forest.name}" löschen?`}
                            description="ACHTUNG: Dies löscht den gesamten Wald inklusive aller Geodaten, Aufgaben und Historie unwiderruflich."
                            confirmString={forest.name} // User muss den Namen tippen
                            onConfirm={async () => {
                                const res = await deleteForest(forest.id);
                                if (res.success) {
                                    onDeleteSuccess(forest.id);
                                    onClose();
                                } else {
                                    throw new Error(res.error);
                                }
                            }}
                         />
                    ) : <div></div>}

                    {/* RECHTS: Abbrechen & Speichern */}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-gray-400">Abbrechen</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Speichern"}
                        </Button>
                    </div>
                </div>
            )}

            {/* DIALOG */}
            <CreateTaskDialog 
                openProp={showCreateTask}
                onOpenChangeProp={(open) => { setShowCreateTask(open); if (!open) onRefresh(); }}
                orgSlug={orgSlug}
                members={members}
                forests={[{ id: forest.id, name: forest.name }]} 
                trigger={<span className="hidden" />} 
            />
        </DetailPanelShell>
    );
}