'use client';

import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  User, History, Calendar as CalendarIcon, Save, Loader2, RefreshCw,
  Trash2, Check, X, Timer, Eye, EyeOff,
  MapPin, ExternalLink, Crosshair, Undo2 as ArrowLeftCircle, Pencil,
  Box, Link2, Unlink, Trees, Sprout, AlertTriangle, Fence, Route, Waves, Tractor,
  Paperclip, Clock, MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TaskStatus, TaskPriority } from "@prisma/client";
import {
  updateTaskStatus, assignTask, updateTaskContent,
  addTaskComment, getTaskDetails, deleteTaskComment,
  editTaskComment, deleteTask, toggleWatcher, getForestObjects,
} from "@/actions/tasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { useMapStore } from "@/components/map/stores/useMapStores";
import { TimeTrackingSection } from "./TimeTrackingSection";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { AttachmentsSection } from "./AttachmentsSection";

// ─── Hilfskonstanten ──────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "OPEN",        label: "Offen",       color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "IN_PROGRESS", label: "In Arbeit",   color: "bg-blue-50   text-blue-700  border-blue-200"  },
  { value: "BLOCKED",     label: "Blockiert",   color: "bg-red-50    text-red-700   border-red-200"   },
  { value: "DONE",        label: "Erledigt",    color: "bg-green-50  text-green-700 border-green-200" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; dot: string }[] = [
  { value: "LOW",    label: "Niedrig",  dot: "bg-slate-400"  },
  { value: "MEDIUM", label: "Mittel",   dot: "bg-yellow-400" },
  { value: "HIGH",   label: "Hoch",     dot: "bg-orange-500" },
  { value: "URGENT", label: "Dringend", dot: "bg-red-600"    },
];

interface Props {
  task: any;
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  members: any[];
  currentUserId: string;
  onUnschedule?: () => void;
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function TaskDetailSheet({
  task, open, onClose, orgSlug, members, currentUserId, onUnschedule,
}: Props) {
  // Basis-State
  const [title, setTitle]         = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]   = useState<TaskPriority>("MEDIUM");
  const [status, setStatus]       = useState<TaskStatus>("OPEN");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [dueDate, setDueDate]     = useState<Date | undefined>(undefined);
  const [estValue, setEstValue]   = useState("");
  const [estUnit, setEstUnit]     = useState<"HOURS" | "DAYS" | "WEEKS">("HOURS");

  // Verknüpfung
  const [linkedPoi, setLinkedPoi]         = useState<any>(null);
  const [linkedPolygon, setLinkedPolygon] = useState<{ id: string; name: string; type: string } | null>(null);
  const [forestObjects, setForestObjects] = useState<any>(null);
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isLoadingObjects, setIsLoadingObjects]   = useState(false);

  // UI-State
  const [isSaving, setIsSaving]               = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dueDateOpen, setDueDateOpen]         = useState(false);

  // Listen
  const [comments, setComments]       = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [images, setImages]           = useState<any[]>([]);
  const [documents, setDocuments]     = useState<any[]>([]);
  const [watchers, setWatchers]       = useState<any[]>([]);
  const [newComment, setNewComment]   = useState("");
  const [isCommentLoading, setIsCommentLoading] = useState(false);

  const router   = useRouter();
  const pathname = usePathname();

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const parseEstimatedTime = (mins: number) => {
    if (!mins) { setEstValue(""); setEstUnit("HOURS"); return; }
    if (mins % 2400 === 0)      { setEstValue((mins / 2400).toString()); setEstUnit("WEEKS"); }
    else if (mins % 480 === 0)  { setEstValue((mins / 480).toString());  setEstUnit("DAYS");  }
    else                        { setEstValue((mins / 60).toString());   setEstUnit("HOURS"); }
  };

  const populateState = (t: any) => {
    setTitle(t.title);
    setDescription(t.description || "");
    setPriority(t.priority);
    setStatus(t.status);
    setAssigneeId(t.assigneeId || "unassigned");
    setDueDate(t.dueDate ? new Date(t.dueDate) : undefined);
    setLinkedPoi(t.poi || null);
    setLinkedPolygon(t.linkedPolygon || null);
    parseEstimatedTime(t.estimatedTime || 0);
    setComments(t.comments || []);
    setTimeEntries(t.timeEntries || []);
    setImages(t.images || []);
    setDocuments(t.documents || []);
    setWatchers(t.watchers || []);
    setNewComment("");
    setHasUnsavedChanges(false);
  };

  // EFFECT 1 — Task prop geändert
  useEffect(() => { if (task) populateState(task); }, [task]);

  // EFFECT 2 — Live-Polling
  const fetchLatestData = async () => {
    try {
      const fresh = await getTaskDetails(orgSlug, task.id) as any;
      if (!fresh) return;
      setComments(fresh.comments || []);
      setTimeEntries(fresh.timeEntries || []);
      setImages(fresh.images || []);
      setDocuments(fresh.documents || []);
      setWatchers(fresh.watchers || []);
      setLinkedPoi(fresh.poi || null);
      setLinkedPolygon(fresh.linkedPolygon || null);
      if (!hasUnsavedChanges && !isSaving) {
        setTitle(fresh.title);
        setDescription(fresh.description || "");
        setPriority(fresh.priority);
        setStatus(fresh.status);
        setAssigneeId(fresh.assigneeId || "unassigned");
        setDueDate(fresh.dueDate ? new Date(fresh.dueDate) : undefined);
        parseEstimatedTime(fresh.estimatedTime || 0);
      }
    } catch (e) { console.error("Polling error", e); }
  };

  useEffect(() => {
    if (!open || !task) return;
    fetchLatestData();
    const id = setInterval(fetchLatestData, 30000);
    return () => clearInterval(id);
  }, [open, task, orgSlug, hasUnsavedChanges, isSaving]);

  if (!task) return null;

  // ── Koordinaten ───────────────────────────────────────────────────────────────
  const effectiveLat  = linkedPoi ? linkedPoi.lat : task.lat;
  const effectiveLng  = linkedPoi ? linkedPoi.lng : task.lng;
  const hasCoords     = effectiveLat && effectiveLng;
  const isWatching    = watchers.some((w: any) => w.id === currentUserId);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const mark = (setter: (v: any) => void, v: any) => { setter(v); setHasUnsavedChanges(true); };

  const handleStatusChange = async (val: TaskStatus) => {
    setStatus(val);
    try { await updateTaskStatus(orgSlug, task.id, val); toast.success("Status geändert"); }
    catch { setStatus(task.status); toast.error("Fehler"); }
  };

  const handleAssigneeChange = async (val: string) => {
    setAssigneeId(val);
    try { await assignTask(orgSlug, task.id, val === "unassigned" ? null : val); toast.success("Zuweisung geändert"); }
    catch { setAssigneeId(task.assigneeId || "unassigned"); toast.error("Fehler"); }
  };

  const handleToggleWatcher = async () => {
    // Optimistic: sofort in der UI umschalten
    const nowWatching = !watchers.some((w: any) => w.id === currentUserId);
    setWatchers(nowWatching
      ? [...watchers, { id: currentUserId }]
      : watchers.filter((w: any) => w.id !== currentUserId),
    );
    try { await toggleWatcher(orgSlug, task.id); }
    catch { fetchLatestData(); toast.error("Fehler"); } // bei Fehler: Server-Stand wiederherstellen
  };

  const handleLoadObjects = async () => {
    if (forestObjects) return;
    setIsLoadingObjects(true);
    try { setForestObjects(await getForestObjects(orgSlug, task.forestId)); }
    catch { toast.error("Fehler beim Laden der Objekte"); }
    finally { setIsLoadingObjects(false); }
  };

  const handleLinkObject = async (
    type: "POI" | "PLANTING" | "CALAMITY" | "HUNTING" | "ROAD" | "SKID_TRAIL" | "WATER",
    id: string, name: string,
  ) => {
    setIsLinkPopoverOpen(false);

    // Optimistic: vorherigen Stand merken, sofort umschalten
    const prevPoi     = linkedPoi;
    const prevPolygon = linkedPolygon;
    if (type === "POI") {
      setLinkedPoi({ id, name }); setLinkedPolygon(null);
    } else {
      setLinkedPolygon({ id, name, type }); setLinkedPoi(null);
    }

    try {
      if (type === "POI") {
        await updateTaskContent(orgSlug, task.id, { poiId: id, linkedPolygonId: null, linkedPolygonType: null, lat: null, lng: null });
      } else {
        await updateTaskContent(orgSlug, task.id, { linkedPolygonId: id, linkedPolygonType: type, poiId: null, lat: null, lng: null });
      }
      toast.success("Verknüpfung gespeichert");
    } catch {
      // Revert bei Fehler
      setLinkedPoi(prevPoi); setLinkedPolygon(prevPolygon);
      toast.error("Fehler beim Verknüpfen");
    }
  };

  const handleUnlinkObject = async () => {
    // Optimistic: vorherigen Stand merken, sofort leeren
    const prevPoi     = linkedPoi;
    const prevPolygon = linkedPolygon;
    setLinkedPoi(null); setLinkedPolygon(null);

    try {
      await updateTaskContent(orgSlug, task.id, { poiId: null, linkedPolygonId: null, linkedPolygonType: null });
      toast.success("Verknüpfung entfernt");
    } catch {
      setLinkedPoi(prevPoi); setLinkedPolygon(prevPolygon);
      toast.error("Fehler");
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      let minutes: number | null = null;
      if (estValue) {
        const val = parseFloat(estValue.replace(",", "."));
        if (!isNaN(val)) {
          if (estUnit === "HOURS") minutes = Math.round(val * 60);
          if (estUnit === "DAYS")  minutes = Math.round(val * 8 * 60);
          if (estUnit === "WEEKS") minutes = Math.round(val * 40 * 60);
        }
      }
      await updateTaskContent(orgSlug, task.id, { title, description, priority, dueDate: dueDate ?? null, estimatedTime: minutes });
      setHasUnsavedChanges(false);
      toast.success("Gespeichert");
    } catch { toast.error("Fehler beim Speichern"); }
    finally { setIsSaving(false); }
  };

  const handleSendComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setIsCommentLoading(true);

    // Optimistic: Input sofort leeren, Platzhalter-Kommentar einfügen
    setNewComment("");
    const tempId = `temp-${Date.now()}`;
    const tempComment = {
      id: tempId, content: text, createdAt: new Date().toISOString(),
      userId: currentUserId,
      user: { id: currentUserId, firstName: '…', lastName: '' },
    };
    setComments(prev => [tempComment, ...prev]);

    try {
      const result = await addTaskComment(orgSlug, task.id, text);
      // Platzhalter durch echten Server-Kommentar ersetzen
      if (result.comment) setComments(prev => prev.map(c => c.id === tempId ? result.comment : c));
    } catch {
      // Revert: Platzhalter entfernen, Text wiederherstellen
      setComments(prev => prev.filter(c => c.id !== tempId));
      setNewComment(text);
      toast.error("Fehler");
    }
    finally { setIsCommentLoading(false); }
  };

  const handleShowOnMap = () => {
    if (pathname.includes("/map")) {
      onClose();
      if (effectiveLat && effectiveLng) useMapStore.getState().flyTo([effectiveLat, effectiveLng], 19);
      else router.push(`/dashboard/org/${orgSlug}/map?focusTaskId=${task.id}`);
    } else {
      router.push(`/dashboard/org/${orgSlug}/map?focusTaskId=${task.id}`);
    }
  };

  const currentPrio = PRIORITY_OPTIONS.find(p => p.value === priority);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full p-0 gap-0 bg-slate-50">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-b px-5 pt-4 pb-3">
          <SheetHeader>
            <SheetTitle className="sr-only">Aufgabe bearbeiten</SheetTitle>
            <SheetDescription className="sr-only">Details</SheetDescription>
          </SheetHeader>

          {/* Meta-Zeile */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-200 gap-1">
                <Trees size={11} /> {task.forest.name}
              </Badge>
              {task.scheduleId && (
                <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 font-normal">
                  Serie
                </Badge>
              )}
            </div>
            <button
              onClick={handleToggleWatcher}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                isWatching
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600",
              )}
            >
              {isWatching ? <Eye size={12} /> : <EyeOff size={12} />}
              {isWatching ? "Abonniert" : "Beobachten"}
            </button>
          </div>

          {/* Titel */}
          <Input
            className="text-xl font-bold border-none shadow-none px-0 h-auto rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-300 bg-transparent"
            value={title}
            placeholder="Aufgabentitel…"
            onChange={e => mark(setTitle, e.target.value)}
          />
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <RefreshCw size={9} className="opacity-40" />
            Erstellt {format(new Date(task.createdAt), "dd. MMM yyyy", { locale: de })}
          </p>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* 1 · Properties-Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">

            {/* Status + Priorität */}
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-3 space-y-1.5">
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-sm border-slate-200 bg-slate-50 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium border", o.color)}>{o.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 space-y-1.5">
                <FieldLabel>Priorität</FieldLabel>
                <Select value={priority} onValueChange={v => mark(setPriority, v)}>
                  <SelectTrigger className="h-8 text-sm border-slate-200 bg-slate-50 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", o.dot)} />
                          {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Zuständig + Fälligkeit */}
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-3 space-y-1.5">
                <FieldLabel icon={<User size={10} />}>Zuständig</FieldLabel>
                <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="h-8 text-sm border-slate-200 bg-slate-50 focus:ring-0">
                    <SelectValue placeholder="Niemand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">— Offen —</SelectItem>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 space-y-1.5">
                <FieldLabel icon={<CalendarIcon size={10} />}>Fälligkeit</FieldLabel>
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-8 w-full justify-start text-sm font-normal border-slate-200 bg-slate-50",
                        !dueDate && "text-slate-400",
                      )}
                    >
                      {dueDate ? format(dueDate, "dd. MMM yyyy", { locale: de }) : "Kein Datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single" selected={dueDate}
                      onSelect={d => { mark(setDueDate, d); setDueDateOpen(false); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Aufwand */}
            <div className="p-3 space-y-1.5">
              <FieldLabel icon={<Timer size={10} />}>Geplanter Aufwand</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="0.5" placeholder="0"
                  className="h-8 w-20 text-sm bg-slate-50 border-slate-200"
                  value={estValue}
                  onChange={e => mark(setEstValue, e.target.value)}
                />
                <Select value={estUnit} onValueChange={v => mark(setEstUnit, v)}>
                  <SelectTrigger className="h-8 w-32 text-sm border-slate-200 bg-slate-50 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOURS">Stunden</SelectItem>
                    <SelectItem value="DAYS">Tage (8h)</SelectItem>
                    <SelectItem value="WEEKS">Wochen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2 · Zuordnung */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel icon={<MapPin size={10} />}>Objekt / Standort</FieldLabel>
              <Popover
                open={isLinkPopoverOpen}
                onOpenChange={open => { setIsLinkPopoverOpen(open); if (open) handleLoadObjects(); }}
              >
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-slate-400 hover:text-slate-700">
                    <Link2 size={11} /> Verknüpfen
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 shadow-lg" align="end">
                  <div className="p-3 border-b">
                    <p className="text-xs font-semibold">Objekt wählen</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Waldobjekt mit dieser Aufgabe verknüpfen</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {isLoadingObjects ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    ) : forestObjects ? (
                      <>
                        {(linkedPoi || linkedPolygon) && (
                          <button
                            onClick={handleUnlinkObject}
                            className="w-full flex items-center gap-2 text-xs text-red-500 hover:bg-red-50 px-3 py-2 rounded-md text-left"
                          >
                            <Unlink size={12} /> Verknüpfung aufheben
                          </button>
                        )}
                        <ObjectGroup label="Objekte (POI)"   icon={<Box size={12} className="text-indigo-500 shrink-0" />}
                          items={forestObjects.pois}       getLabel={(p: any) => p.name || "POI"}
                          type="POI"      onSelect={handleLinkObject} />
                        <ObjectGroup label="Kulturflächen"   icon={<Sprout size={12} className="text-green-600 shrink-0" />}
                          items={forestObjects.plantings}  getLabel={(p: any) => p.description || p.treeSpecies}
                          type="PLANTING" onSelect={handleLinkObject} />
                        <ObjectGroup label="Kalamitäten"     icon={<AlertTriangle size={12} className="text-orange-500 shrink-0" />}
                          items={forestObjects.calamities} getLabel={(c: any) => c.description || c.cause || "Kalamität"}
                          type="CALAMITY" onSelect={handleLinkObject} />
                        <ObjectGroup label="Jagdreviere"     icon={<Fence size={12} className="text-yellow-600 shrink-0" />}
                          items={forestObjects.hunting}    getLabel={(h: any) => h.name || "Jagdrevier"}
                          type="HUNTING"  onSelect={handleLinkObject} />
                        <ObjectGroup label="LKW-Wege"       icon={<Route   size={12} className="text-slate-500  shrink-0" />}
                          items={forestObjects.roads}      getLabel={(p: any) => p.name || 'LKW-Weg'}
                          type="ROAD"       onSelect={handleLinkObject} />
                        <ObjectGroup label="Rückegassen"    icon={<Tractor size={12} className="text-yellow-500 shrink-0" />}
                          items={forestObjects.skidTrails} getLabel={(p: any) => p.name || 'Rückegasse'}
                          type="SKID_TRAIL" onSelect={handleLinkObject} />
                        <ObjectGroup label="Gewässer"       icon={<Waves   size={12} className="text-blue-500   shrink-0" />}
                          items={forestObjects.waters}     getLabel={(p: any) => p.name || 'Gewässer'}
                          type="WATER"      onSelect={handleLinkObject} />
                        {!forestObjects.pois?.length && !forestObjects.plantings?.length &&
                         !forestObjects.calamities?.length && !forestObjects.hunting?.length &&
                         !forestObjects.roads?.length && !forestObjects.skidTrails?.length &&
                         !forestObjects.waters?.length && (
                          <p className="text-xs text-slate-400 p-4 text-center">Keine Objekte vorhanden</p>
                        )}
                      </>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Verknüpfungs-Anzeige */}
            {linkedPoi ? (
              <LinkedObjectChip
                icon={<Box size={12} className="text-indigo-500" />}
                name={linkedPoi.name}
                onUnlink={handleUnlinkObject}
                onShowOnMap={handleShowOnMap}
                onGoogleMaps={hasCoords ? () => window.open(`https://www.google.com/maps?q=${effectiveLat},${effectiveLng}`, "_blank") : undefined}
              />
            ) : linkedPolygon ? (
              <LinkedObjectChip
                icon={
                  linkedPolygon.type === "PLANTING"   ? <Sprout        size={12} className="text-green-600"  /> :
                  linkedPolygon.type === "CALAMITY"   ? <AlertTriangle  size={12} className="text-orange-500" /> :
                  linkedPolygon.type === "HUNTING"    ? <Fence          size={12} className="text-yellow-600" /> :
                  linkedPolygon.type === "SKID_TRAIL" ? <Tractor        size={12} className="text-yellow-500" /> :
                  linkedPolygon.type === "WATER"      ? <Waves          size={12} className="text-blue-500"   /> :
                  <Route size={12} className="text-slate-500" />
                }
                name={linkedPolygon.name}
                onUnlink={handleUnlinkObject}
                onShowOnMap={handleShowOnMap}
              />
            ) : hasCoords ? (
              <LinkedObjectChip
                icon={<MapPin size={12} className="text-blue-500" />}
                name={`${effectiveLat?.toFixed(5)}, ${effectiveLng?.toFixed(5)}`}
                onShowOnMap={handleShowOnMap}
                onGoogleMaps={() => window.open(`https://www.google.com/maps?q=${effectiveLat},${effectiveLng}`, "_blank")}
                mono
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-3 py-2.5">
                <MapPin size={12} className="opacity-40" />
                <span>Kein Objekt verknüpft</span>
                <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs text-slate-500 hover:text-blue-600 px-2" onClick={handleShowOnMap}>
                  <Crosshair size={11} className="mr-1" /> Im Wald zeigen
                </Button>
              </div>
            )}
          </div>

          {/* 3 · Beschreibung */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            <FieldLabel>Beschreibung</FieldLabel>
            <Textarea
              className="min-h-[90px] resize-none text-sm bg-slate-50 border-slate-200 focus-visible:ring-1 placeholder:text-slate-400"
              placeholder="Details zur Aufgabe…"
              value={description}
              onChange={e => mark(setDescription, e.target.value)}
            />
          </div>

          {/* 4 · Anhänge */}
          <SectionBlock icon={<Paperclip size={13} />} label="Anhänge" count={images.length + documents.length}>
            <AttachmentsSection
              orgSlug={orgSlug} taskId={task.id}
              images={images} documents={documents}
              onUpdate={fetchLatestData}
            />
          </SectionBlock>

          {/* 5 · Zeiterfassung */}
          <SectionBlock icon={<Clock size={13} />} label="Zeiterfassung" count={timeEntries.length}>
            <TimeTrackingSection
              taskId={task.id}
              estimatedTime={task.estimatedTime ?? null}
              timeEntries={timeEntries}
              currentUserId={currentUserId}
              onRefresh={fetchLatestData}
            />
          </SectionBlock>

          {/* 6 · Kommentare */}
          <SectionBlock icon={<MessageSquare size={13} />} label="Kommentare" count={comments.length}>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-slate-200">
                  <AvatarFallback className="bg-slate-100 text-slate-500 text-[10px]">ICH</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Kommentar schreiben…"
                    className="min-h-[72px] resize-none text-sm bg-slate-50 border-slate-200 focus-visible:ring-1"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white hover:bg-slate-700"
                    disabled={!newComment.trim() || isCommentLoading}
                    onClick={handleSendComment}
                  >
                    {isCommentLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Senden
                  </Button>
                </div>
              </div>
              {comments.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-5">
                  {comments.map((c: any, i: number) => (
                    <CommentItem
                      key={c.id} comment={c} orgSlug={orgSlug}
                      canEdit={c.userId === currentUserId && i === 0}
                      onDelete={() => deleteTaskComment(orgSlug, c.id).then(fetchLatestData)}
                      onEdit={(text: string) => editTaskComment(orgSlug, c.id, text).then(fetchLatestData)}
                    />
                  ))}
                </div>
              )}
            </div>
          </SectionBlock>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <SheetFooter className="shrink-0 px-5 py-3 border-t bg-white flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <DeleteConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={16} />
                </Button>
              }
              title="Aufgabe löschen?"
              description="Die Aufgabe wird unwiderruflich gelöscht, inklusive Kommentare und Zeitbuchungen."
              confirmString="LÖSCHEN"
              onConfirm={async () => { await deleteTask(orgSlug, task.id); onClose(); }}
            />
            {onUnschedule && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:text-amber-700" onClick={onUnschedule} title="Planung entfernen">
                <ArrowLeftCircle size={16} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 hidden sm:block">Ungespeicherte Änderungen</span>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>Schließen</Button>
            <Button size="sm" onClick={handleSaveChanges} disabled={!hasUnsavedChanges || isSaving} className="min-w-[100px]">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Speichern
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function FieldLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center gap-1">
      {icon}{children}
    </p>
  );
}

function SectionBlock({ icon, label, count, children }: {
  icon: React.ReactNode; label: string; count: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {count > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
            {count}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function LinkedObjectChip({ icon, name, onUnlink, onShowOnMap, onGoogleMaps, mono = false }: {
  icon: React.ReactNode; name: string;
  onUnlink?: () => void; onShowOnMap?: () => void; onGoogleMaps?: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      {icon}
      <span className={cn("text-xs text-slate-700 truncate flex-1", mono && "font-mono")}>{name}</span>
      <div className="flex gap-0.5 shrink-0">
        {onShowOnMap && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={onShowOnMap} title="Auf Karte zeigen">
            <Crosshair size={13} />
          </Button>
        )}
        {onGoogleMaps && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-green-600 hover:bg-green-50" onClick={onGoogleMaps} title="Google Maps">
            <ExternalLink size={13} />
          </Button>
        )}
        {onUnlink && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={onUnlink} title="Aufheben">
            <Unlink size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

function ObjectGroup({ label, icon, items, getLabel, type, onSelect }: {
  label: string; icon: React.ReactNode;
  items: any[] | undefined; getLabel: (i: any) => string;
  type: string; onSelect: (type: any, id: string, name: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <>
      <p className="text-[10px] uppercase text-slate-400 px-3 py-1 font-semibold mt-1">{label}</p>
      {items.map((item: any) => {
        const name = getLabel(item);
        return (
          <button key={item.id} onClick={() => onSelect(type, item.id, name)}
            className="w-full flex items-center gap-2 text-xs hover:bg-slate-100 px-3 py-1.5 rounded-md text-left transition-colors">
            {icon}<span className="truncate">{name}</span>
          </button>
        );
      })}
    </>
  );
}

function CommentItem({ comment, canEdit, onDelete, onEdit }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText]           = useState(comment.content);
  const [isSaving, setIsSaving]   = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onEdit(text);
    setIsEditing(false); setIsSaving(false);
  };

  return (
    <div className="flex gap-3 group">
      <Avatar className="w-7 h-7 shrink-0 border border-slate-200">
        <AvatarFallback className="text-[10px] text-slate-500 font-medium bg-white">
          {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-800">
            {comment.user.firstName} {comment.user.lastName}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">
              {format(new Date(comment.createdAt), "dd.MM. HH:mm")}
            </span>
            {canEdit && !isEditing && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-blue-600" onClick={() => setIsEditing(true)}>
                  <Pencil size={11} />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-red-600" onClick={onDelete}>
                  <Trash2 size={11} />
                </Button>
              </div>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="flex gap-2 items-start">
            <Input value={text} onChange={e => setText(e.target.value)} className="h-8 text-sm" autoFocus />
            <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 shrink-0" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setIsEditing(false)}>
              <X size={13} />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-600 bg-white border border-slate-100 px-3 py-2 rounded-lg shadow-sm">
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}
