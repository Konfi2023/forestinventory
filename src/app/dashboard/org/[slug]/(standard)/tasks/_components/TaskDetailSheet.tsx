'use client';

import { useState, useEffect } from "react";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  User, History, Calendar as CalendarIcon, Save, Loader2, RefreshCw, 
  Trash2, Check, X, Timer, Eye, EyeOff,
  MapPin, ExternalLink, Crosshair, Undo2 as ArrowLeftCircle, Pencil, Box
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { 
  updateTaskStatus, 
  assignTask, 
  updateTaskContent, 
  addTaskComment, 
  getTaskDetails,
  deleteTaskComment,
  editTaskComment,
  deleteTask,
  toggleWatcher
} from "@/actions/tasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation"; 
import { useMapStore } from "@/components/map/stores/useMapStores"; 

// Sub-Komponenten
import { TimeTrackingSection } from "./TimeTrackingSection";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { AttachmentsSection } from "./AttachmentsSection";

interface Props {
  task: any;
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  members: any[];
  currentUserId: string;
  onUnschedule?: () => void;
}

export function TaskDetailSheet({ task, open, onClose, orgSlug, members, currentUserId, onUnschedule }: Props) {
  // --- STATE ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("OPEN");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  
  const [estValue, setEstValue] = useState("");
  const [estUnit, setEstUnit] = useState<"HOURS" | "DAYS" | "WEEKS">("HOURS");
  
  const [linkedPoi, setLinkedPoi] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Listen-States
  const [comments, setComments] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<any[]>([]);

  const [newComment, setNewComment] = useState("");
  const [isCommentLoading, setIsCommentLoading] = useState(false);

  // Navigation
  const router = useRouter();
  const pathname = usePathname();

  // Helper Funktion
  const parseEstimatedTime = (mins: number) => {
    if (!mins || mins === 0) {
        setEstValue("");
        setEstUnit("HOURS");
        return;
    }
    if (mins % 2400 === 0) {
        setEstValue((mins / 2400).toString());
        setEstUnit("WEEKS");
    } else if (mins % 480 === 0) {
        setEstValue((mins / 480).toString());
        setEstUnit("DAYS");
    } else {
        setEstValue((mins / 60).toString());
        setEstUnit("HOURS");
    }
  };

  // --- EFFECT 1: Initiale Daten laden ---
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeId(task.assigneeId || "unassigned");
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setLinkedPoi(task.poi || null);
      
      parseEstimatedTime((task as any).estimatedTime || 0);
      
      setComments(task.comments || []);
      setTimeEntries((task as any).timeEntries || []);
      setImages((task as any).images || []);
      setDocuments((task as any).documents || []);
      setWatchers((task as any).watchers || []);
      
      setNewComment("");
      setHasUnsavedChanges(false);
    }
  }, [task]);

  // --- EFFECT 2: Live Polling ---
  const fetchLatestData = async () => {
    try {
      const freshTask = await getTaskDetails(orgSlug, task.id) as any;
      if (freshTask) {
        setComments(freshTask.comments || []);
        setTimeEntries(freshTask.timeEntries || []);
        setImages(freshTask.images || []);
        setDocuments(freshTask.documents || []);
        setWatchers(freshTask.watchers || []);
        
        setLinkedPoi(freshTask.poi || null);

        if (!hasUnsavedChanges && !isSaving) {
             setTitle(freshTask.title);
             setDescription(freshTask.description || "");
             setPriority(freshTask.priority);
             setStatus(freshTask.status);
             setAssigneeId(freshTask.assigneeId || "unassigned");
             setDueDate(freshTask.dueDate ? new Date(freshTask.dueDate) : undefined);
             parseEstimatedTime(freshTask.estimatedTime || 0);
        }
      }
    } catch (e) { console.error("Polling error", e); }
  };

  useEffect(() => {
    if (!open || !task) return;
    fetchLatestData();
    const interval = setInterval(fetchLatestData, 4000);
    return () => clearInterval(interval);
  }, [open, task, orgSlug, hasUnsavedChanges, isSaving]);


  // --- FIX: CHECK VOR DEM ZUGRIFF ---
  if (!task) return null;

  // --- KOORDINATEN LOGIK ---
  // Koordinaten kommen entweder vom verknüpften POI (neue Architektur)
  // oder direkt vom Task (alte Architektur / freie Pins)
  const effectiveLat = linkedPoi ? linkedPoi.lat : task.lat;
  const effectiveLng = linkedPoi ? linkedPoi.lng : task.lng;
  const hasCoordinates = effectiveLat && effectiveLng;


  // --- HELPER & ACTIONS ---
  const handleInputChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setHasUnsavedChanges(true);
  };

  const handleStatusChange = async (val: TaskStatus) => {
    setStatus(val);
    try { await updateTaskStatus(orgSlug, task.id, val); toast.success("Status geändert"); } 
    catch (e) { setStatus(task.status); toast.error("Fehler"); }
  };

  const handleAssigneeChange = async (val: string) => {
    setAssigneeId(val);
    try { await assignTask(orgSlug, task.id, val === "unassigned" ? null : val); toast.success("Zuweisung geändert"); } 
    catch (e) { setAssigneeId(task.assigneeId || "unassigned"); toast.error("Fehler"); }
  };

  const handleToggleWatcher = async () => {
    try {
        await toggleWatcher(orgSlug, task.id);
        fetchLatestData();
        toast.success("Beobachter-Status geändert");
    } catch (e) { toast.error("Fehler"); }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
        let minutes = null;
        if (estValue) {
            const val = parseFloat(estValue.replace(',', '.'));
            if (!isNaN(val)) {
                if (estUnit === "HOURS") minutes = Math.round(val * 60);
                if (estUnit === "DAYS") minutes = Math.round(val * 8 * 60);
                if (estUnit === "WEEKS") minutes = Math.round(val * 40 * 60);
            }
        }

        await updateTaskContent(orgSlug, task.id, {
            title,
            description,
            priority,
            dueDate: dueDate ?? null,
            estimatedTime: minutes
        });
        setHasUnsavedChanges(false);
        toast.success("Änderungen gespeichert");
    } catch (e) { toast.error("Fehler beim Speichern"); } 
    finally { setIsSaving(false); }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setIsCommentLoading(true);
    try {
      const result = await addTaskComment(orgSlug, task.id, newComment);
      if (result.comment) setComments([result.comment, ...comments]);
      setNewComment("");
      toast.success("Gesendet");
    } catch (e) { toast.error("Fehler"); } 
    finally { setIsCommentLoading(false); }
  };

  // --- STANDORT ACTIONS ---
  const handleOpenGoogleMaps = () => {
      if (!effectiveLat || !effectiveLng) return;
      const url = `https://www.google.com/maps?q=${effectiveLat},${effectiveLng}`;
      window.open(url, '_blank');
  };

  const handleShowOnMap = () => {
      if (pathname.includes('/map')) {
          // Wir sind bereits auf der Karte: Sheet schließen und direkt fliegen
          onClose();
          if (effectiveLat && effectiveLng) {
              const flyTo = useMapStore.getState().flyTo;
              flyTo([effectiveLat, effectiveLng], 19);
          }
      } else {
          // Von einer anderen Seite (z.B. Kanban): zur Karte navigieren.
          // focusTaskId übergibt die Verantwortung an MapPageClient,
          // der sowohl auf POI-Koordinaten als auch auf Wald-Bounds zoomen kann.
          // Kein onClose() hier – MapPageClient öffnet den Sheet via selectFeature neu.
          router.push(`/dashboard/org/${orgSlug}/map?focusTaskId=${task.id}`);
      }
  };

  const isWatching = watchers.some((w: any) => w.id === currentUserId);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full p-0 gap-0">
        
        {/* HEADER */}
        <div className="p-6 pb-4 border-b bg-white shrink-0">
          <SheetHeader className="mb-4">
             <SheetTitle className="sr-only">Aufgabe bearbeiten</SheetTitle>
             <SheetDescription className="sr-only">Details</SheetDescription>
             
             <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-normal">
                        {task.forest.name}
                    </Badge>
                    {task.scheduleId && <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 font-normal">Serie</Badge>}
                </div>
                
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-slate-500 hover:text-slate-900" onClick={handleToggleWatcher}>
                    {isWatching ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isWatching ? "Abonniert" : "Beobachten"}</span>
                </Button>
             </div>
          </SheetHeader>
          <Input 
             className="text-2xl font-bold border-none shadow-none px-0 h-auto rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-300 selection:bg-slate-200 selection:text-slate-900"
             value={title}
             placeholder="Aufgabentitel..."
             onChange={(e) => handleInputChange(setTitle, e.target.value)}
          />
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">
             <RefreshCw size={10} className="animate-spin opacity-20" />
             Erstellt am {format(new Date(task.createdAt), "dd. MMM yyyy")}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
            
            {/* GRID 1: Status & Prio */}
            <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</Label>
                    <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPEN">Offen</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Arbeit</SelectItem>
                            <SelectItem value="BLOCKED">Blockiert</SelectItem>
                            <SelectItem value="DONE">Erledigt</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Priorität</Label>
                    <Select value={priority} onValueChange={(v) => handleInputChange(setPriority, v)}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOW">Niedrig</SelectItem>
                            <SelectItem value="MEDIUM">Mittel</SelectItem>
                            <SelectItem value="HIGH">Hoch</SelectItem>
                            <SelectItem value="URGENT">Dringend</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>

            {/* GRID 2: Zuweisung & Datum */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1"><User size={12} /> Zuständigkeit</Label>
                    <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Niemand" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">- Nicht zugewiesen -</SelectItem>
                        {members.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1"><CalendarIcon size={12} /> Fälligkeit</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-white border-input shadow-sm", !dueDate && "text-muted-foreground")}>
                                {dueDate ? format(dueDate, "dd.MM.yyyy", { locale: de }) : <span>Kein Datum</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDate} onSelect={(d) => handleInputChange(setDueDate, d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* 3. Aufwandschätzung */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Timer size={12} /> Geplanter Aufwand
                </Label>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        step="0.5"
                        className="bg-white w-24 shadow-sm"
                        placeholder="0"
                        value={estValue}
                        onChange={(e) => handleInputChange(setEstValue, e.target.value)}
                    />
                    <Select value={estUnit} onValueChange={(v) => handleInputChange(setEstUnit, v)}>
                        <SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="HOURS">Stunden</SelectItem>
                            <SelectItem value="DAYS">Tage (8h)</SelectItem>
                            <SelectItem value="WEEKS">Wochen</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* --- STANDORT BOX --- */}
            {hasCoordinates ? (
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {linkedPoi ? (
                            <Box className="w-3 h-3 text-indigo-500" /> 
                        ) : (
                            <MapPin className="w-3 h-3 text-blue-500" />
                        )}
                        {linkedPoi ? (
                            <span className="font-semibold truncate max-w-[150px]" title={linkedPoi.name}>
                                {linkedPoi.name}
                            </span>
                        ) : (
                            `${effectiveLat?.toFixed(6)}, ${effectiveLng?.toFixed(6)}`
                        )}
                    </div>
                    
                    <div className="flex gap-1">
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            onClick={handleShowOnMap}
                            title="In Karte zeigen"
                        >
                            <Crosshair className="w-4 h-4" />
                        </Button>

                        <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-green-600 hover:bg-green-50"
                            onClick={handleOpenGoogleMaps}
                            title="Google Maps öffnen"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                // Auch ohne Koordinaten: Button anzeigen, der zur Karte navigiert (Fallback auf Wald-Zoom)
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 opacity-50" /> Keine exakten Koordinaten hinterlegt.
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-slate-500 hover:text-blue-600"
                        onClick={handleShowOnMap}
                        title="Im Wald auf der Karte zeigen"
                    >
                        <Crosshair className="w-3 h-3 mr-1" /> In Karte
                    </Button>
                </div>
            )}

            {/* Beschreibung */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Beschreibung</Label>
                <Textarea 
                    className="min-h-32 resize-none bg-white border-slate-200 focus-visible:ring-slate-400 shadow-sm"
                    placeholder="Beschreibung..."
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(setDescription, e.target.value)}
                />
            </div>

            <Separator />

            {/* 4. ANHÄNGE */}
            <AttachmentsSection 
                orgSlug={orgSlug}
                taskId={task.id}
                images={images}
                documents={documents}
                onUpdate={fetchLatestData}
            />

            <Separator />

            {/* 5. ZEITERFASSUNG */}
            <TimeTrackingSection 
                orgSlug={orgSlug}
                taskId={task.id}
                entries={timeEntries}
                onUpdate={fetchLatestData}
            />

            <Separator />

            {/* 6. KOMMENTARE */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <History size={16} /> Verlauf & Kommentare
                </div>
                <div className="flex gap-3">
                    <Avatar className="w-8 h-8 mt-1 border border-slate-200"><AvatarFallback className="bg-slate-100 text-slate-500">ICH</AvatarFallback></Avatar>
                    <div className="flex-1 gap-2 flex flex-col">
                        <Textarea placeholder="Kommentar schreiben..." className="min-h-24 text-sm bg-white shadow-sm" value={newComment} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)} />
                        <Button size="sm" className="self-end bg-slate-900 text-white hover:bg-slate-800" disabled={!newComment.trim() || isCommentLoading} onClick={handleSendComment}>Senden</Button>
                    </div>
                </div>
                <div className="space-y-6">
                    {comments.map((comment: any, index: number) => (
                        <CommentItem 
                            key={comment.id} comment={comment} orgSlug={orgSlug} 
                            canEdit={comment.userId === currentUserId && index === 0}
                            onDelete={() => { deleteTaskComment(orgSlug, comment.id).then(fetchLatestData); }}
                            onEdit={(text: string) => { editTaskComment(orgSlug, comment.id, text).then(fetchLatestData); }}
                        />
                    ))}
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <SheetFooter className="p-4 border-t bg-white shrink-0 sm:justify-between flex-row items-center gap-4">
            <div className="flex items-center gap-2">
                <DeleteConfirmDialog 
                    trigger={
                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-700" title="Aufgabe löschen">
                            <Trash2 size={18} />
                        </Button>
                    }
                    title="Aufgabe löschen?"
                    description="Dies löscht die Aufgabe unwiderruflich, inklusive aller Kommentare und gebuchter Zeiten."
                    confirmString="LÖSCHEN"
                    onConfirm={async () => {
                        await deleteTask(orgSlug, task.id);
                        onClose();
                    }}
                />

                {onUnschedule && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onUnschedule}
                        className="text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                        title="Planung entfernen (Zurück in Backlog)"
                    >
                        <ArrowLeftCircle size={18} />
                    </Button>
                )}
            </div>
            
            <div className="flex gap-2 items-center">
                <div className="text-xs text-muted-foreground italic mr-2 hidden sm:block">
                    {hasUnsavedChanges ? "Änderungen..." : "Aktuell"}
                </div>
                <Button variant="outline" onClick={onClose}>Schließen</Button>
                <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges || isSaving} className="min-w-24">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Speichern
                </Button>
            </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}

// --- SUB-COMPONENTS ---
function CommentItem({ comment, canEdit, onDelete, onEdit }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(comment.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onEdit(text);
        setIsEditing(false);
        setIsSaving(false);
    };

    return (
        <div className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Avatar className="w-8 h-8 border border-slate-200 bg-white">
                <AvatarFallback className="text-xs text-slate-500 font-medium">
                    {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
                </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                        {comment.user.firstName} {comment.user.lastName}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                            {format(new Date(comment.createdAt), "dd.MM. HH:mm")}
                        </span>
                        
                        {canEdit && !isEditing && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => setIsEditing(true)}>
                                    <Pencil size={12} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600" onClick={onDelete}>
                                    <Trash2 size={12} />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="flex gap-2 items-start mt-1">
                        <Input 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            className="h-8 text-sm bg-white" 
                            autoFocus
                        />
                        <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 shrink-0" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setIsEditing(false)}>
                            <X size={14}/>
                        </Button>
                    </div>
                ) : (
                    <p className="text-sm text-slate-600 bg-white border border-slate-100 p-3 rounded-r-lg rounded-bl-lg shadow-sm">
                        {comment.content}
                    </p>
                )}
            </div>
        </div>
    );
}