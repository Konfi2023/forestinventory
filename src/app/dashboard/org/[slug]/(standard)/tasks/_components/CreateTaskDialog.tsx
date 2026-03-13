"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Plus, Loader2, Repeat, Clock, MapPin as MapPinIcon,
  Calendar, Link2, Unlink, Box, Sprout, AlertTriangle, Fence, Route, Waves, Tractor,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { createTask, createTaskSchedule, getForestObjects } from "@/actions/tasks";
import { TaskPriority, RecurrenceUnit } from "@prisma/client";
import { toast } from "sonner";

function getNextDates(startDate: string, interval: string, unit: string, count = 4): Date[] {
  if (!startDate) return [];
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [];
  const n = Math.max(1, parseInt(interval) || 1);
  const dates: Date[] = [start];
  for (let i = 1; i < count; i++) {
    const prev = dates[i - 1];
    const next = new Date(prev);
    if (unit === "DAYS") next.setDate(next.getDate() + n);
    else if (unit === "WEEKS") next.setDate(next.getDate() + n * 7);
    else if (unit === "MONTHS") next.setMonth(next.getMonth() + n);
    else if (unit === "YEARS") next.setFullYear(next.getFullYear() + n);
    dates.push(next);
  }
  return dates;
}

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "Niedrig" },
  { value: "MEDIUM", label: "Mittel" },
  { value: "HIGH",   label: "Hoch" },
  { value: "URGENT", label: "Dringend" },
];

const UNIT_OPTIONS = [
  { value: "DAYS",   label: "Tage" },
  { value: "WEEKS",  label: "Wochen" },
  { value: "MONTHS", label: "Monate" },
  { value: "YEARS",  label: "Jahre" },
];

interface Props {
  orgSlug: string;
  forests: { id: string; name: string }[];
  members?: { id: string; email: string; firstName?: string | null; lastName?: string | null }[];
  defaultOpenRecurring?: boolean;
  trigger?: React.ReactNode;
  defaultDate?: Date;
  openProp?: boolean;
  onOpenChangeProp?: (v: boolean) => void;
  defaultTitle?: string;
  defaultForestId?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultPoiId?: string;
  defaultLinkedPolygonId?: string;
  defaultLinkedPolygonType?: string;
}

export function CreateTaskDialog({
  orgSlug, forests = [], members = [],
  defaultOpenRecurring = false, trigger, defaultDate,
  openProp, onOpenChangeProp,
  defaultTitle, defaultForestId, defaultLat, defaultLng,
  defaultPoiId, defaultLinkedPolygonId, defaultLinkedPolygonType,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen   = openProp !== undefined ? openProp : internalOpen;
  const setOpen  = onOpenChangeProp ?? setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(defaultOpenRecurring);

  // Basis
  const [title, setTitle]             = useState(defaultTitle || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState<TaskPriority>("MEDIUM");
  const [forestId, setForestId]       = useState(defaultForestId || (forests[0]?.id ?? ""));
  const [assigneeId, setAssigneeId]   = useState("unassigned");

  // Einmalig
  const [dueDate, setDueDate]     = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime]     = useState("12:00");

  // Wiederkehrend
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [interval, setInterval]   = useState("1");
  const [unit, setUnit]           = useState<RecurrenceUnit>("WEEKS");

  // Objekt-Verknüpfung
  const [linkedObjectId,   setLinkedObjectId]   = useState<string | null>(null);
  const [linkedObjectType, setLinkedObjectType] = useState<string | null>(null);
  const [linkedObjectName, setLinkedObjectName] = useState<string | null>(null);
  const [forestObjects,    setForestObjects]    = useState<any>(null);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [isObjectPopoverOpen, setIsObjectPopoverOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsRecurring(defaultOpenRecurring);
    if (defaultTitle)    setTitle(defaultTitle);
    if (defaultForestId) setForestId(defaultForestId);
    else if (forests.length > 0 && !forestId) setForestId(forests[0].id);
    if (defaultDate && defaultOpenRecurring) {
      setStartDate(defaultDate.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    setLinkedObjectId(null);
    setLinkedObjectType(null);
    setLinkedObjectName(null);
    setForestObjects(null);
  }, [forestId]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setPriority("MEDIUM");
    setDueDate(""); setStartDate(""); setEndDate("");
    setIsRecurring(defaultOpenRecurring);
    setStartTime("08:00"); setEndTime("12:00");
    setLinkedObjectId(null); setLinkedObjectType(null); setLinkedObjectName(null);
    setForestObjects(null);
  };

  const handleLoadObjects = async () => {
    if (!forestId || forestObjects) return;
    setIsLoadingObjects(true);
    try {
      setForestObjects(await getForestObjects(orgSlug, forestId));
    } catch { toast.error("Objekte konnten nicht geladen werden"); }
    finally   { setIsLoadingObjects(false); }
  };

  const handleSelectObject = (type: string, id: string, name: string) => {
    setLinkedObjectId(id); setLinkedObjectType(type); setLinkedObjectName(name);
    setIsObjectPopoverOpen(false);
  };

  const handleUnlinkObject = () => {
    setLinkedObjectId(null); setLinkedObjectType(null); setLinkedObjectName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgSlug) { toast.error("Systemfehler: Organisations-ID fehlt."); return; }
    if (!forestId) { toast.error("Bitte einen Waldbestand auswählen."); return; }
    setIsLoading(true);
    try {
      if (isRecurring) {
        if (!startDate) { toast.error("Startdatum erforderlich"); return; }
        await createTaskSchedule(orgSlug, {
          title, description, priority, forestId,
          assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          interval: parseInt(interval), unit,
        });
        toast.success("Serie gestartet");
      } else {
        let scheduledStart: Date | undefined;
        let scheduledEnd:   Date | undefined;
        if (defaultDate) {
          const [sh, sm] = startTime.split(":").map(Number);
          const [eh, em] = endTime.split(":").map(Number);
          scheduledStart = new Date(defaultDate); scheduledStart.setHours(sh, sm);
          scheduledEnd   = new Date(defaultDate); scheduledEnd.setHours(eh, em);
        }
        await createTask(orgSlug, {
          title, description, priority, forestId,
          assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          scheduledDate: scheduledStart,
          scheduledEndDate: scheduledEnd,
          poiId: linkedObjectType === "POI" ? linkedObjectId! : (linkedObjectId ? undefined : defaultPoiId),
          linkedPolygonId:   (linkedObjectId && linkedObjectType !== "POI") ? linkedObjectId   : (linkedObjectId ? undefined : defaultLinkedPolygonId),
          linkedPolygonType: (linkedObjectId && linkedObjectType !== "POI") ? (linkedObjectType ?? undefined) : (linkedObjectId ? undefined : defaultLinkedPolygonType),
          lat: linkedObjectId ? undefined : (defaultPoiId || defaultLinkedPolygonId) ? undefined : defaultLat,
          lng: linkedObjectId ? undefined : (defaultPoiId || defaultLinkedPolygonId) ? undefined : defaultLng,
        });
        toast.success("Aufgabe erstellt");
      }
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error("Fehler: " + (err.message || "Unbekannt"));
    } finally {
      setIsLoading(false);
    }
  };

  const typeIcon = (type: string | null, size = 13) => {
    if (type === "POI")        return <Box          size={size} className="text-indigo-500 shrink-0" />;
    if (type === "PLANTING")   return <Sprout        size={size} className="text-green-600  shrink-0" />;
    if (type === "CALAMITY")   return <AlertTriangle size={size} className="text-orange-500 shrink-0" />;
    if (type === "HUNTING")    return <Fence         size={size} className="text-yellow-600 shrink-0" />;
    if (type === "PATH" || type === "ROAD") return <Route size={size} className="text-slate-500 shrink-0" />;
    if (type === "SKID_TRAIL") return <Tractor      size={size} className="text-yellow-500 shrink-0" />;
    if (type === "WATER")      return <Waves         size={size} className="text-blue-500   shrink-0" />;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Neue Aufgabe
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">

          {/* ── Header ── */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-800">
              {defaultDate ? "Aufgabe planen" : isRecurring ? "Wiederkehrende Serie" : "Neue Aufgabe"}
            </DialogTitle>
          </div>

          {/* ── Body (scrollable) ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* 1 · Titel + Beschreibung */}
            <div className="space-y-2">
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Was ist zu tun?"
                className="h-10 text-sm font-medium placeholder:font-normal border-slate-200 focus-visible:ring-1"
              />
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Beschreibung (optional)…"
                rows={2}
                className="resize-none text-sm border-slate-200 focus-visible:ring-1 placeholder:text-slate-400"
              />
            </div>

            {/* 2 · Modus */}
            {!defaultDate && (
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsRecurring(false)}
                  className={cn(
                    "flex-1 py-1.5 text-sm rounded-md font-medium transition-all",
                    !isRecurring ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  Einmalig
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecurring(true)}
                  className={cn(
                    "flex-1 py-1.5 text-sm rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                    isRecurring ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Repeat size={13} /> Wiederkehrend
                </button>
              </div>
            )}

            {/* 3 · Zeitplanung */}
            {isRecurring ? (
              <div className="space-y-3">
                <SectionLabel>Zeitplan</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Startdatum">
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                  </Field>
                  <Field label="Priorität">
                    <PrioritySelect value={priority} onChange={v => setPriority(v as TaskPriority)} />
                  </Field>
                </div>
                <Field label="Wiederholung">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 shrink-0 w-8">Alle</span>
                    <Input
                      type="number" min="1"
                      className="w-20 shrink-0"
                      value={interval}
                      onChange={e => setInterval(e.target.value)}
                    />
                    <Select value={unit} onValueChange={v => setUnit(v as RecurrenceUnit)}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field label={<>Enddatum <span className="font-normal text-slate-400">(optional)</span></>}>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined} />
                </Field>

                {/* Preview */}
                {startDate && (() => {
                  const dates = getNextDates(startDate, interval, unit, 4);
                  return (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase text-blue-500 flex items-center gap-1.5">
                        <Calendar size={11} /> Nächste Termine
                      </p>
                      {dates.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-blue-800">
                          <span className="text-[10px] text-blue-400 w-4">{i + 1}.</span>
                          {format(d, "EEEE, dd. MMMM yyyy", { locale: de })}
                          {endDate && d > new Date(endDate) && (
                            <span className="text-[10px] text-slate-400 ml-1">(nach Enddatum)</span>
                          )}
                        </div>
                      ))}
                      <p className="text-[10px] text-blue-400">… und so weiter</p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <SectionLabel>Zeitplanung</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priorität">
                    <PrioritySelect value={priority} onChange={v => setPriority(v as TaskPriority)} />
                  </Field>
                  <Field label="Frist">
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </Field>
                </div>
                {defaultDate && (
                  <div className="grid grid-cols-2 gap-3 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <Field label={<span className="flex items-center gap-1 text-blue-800"><Clock size={11} /> Startzeit</span>}>
                      <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-white" />
                    </Field>
                    <Field label={<span className="flex items-center gap-1 text-blue-800"><Clock size={11} /> Endzeit</span>}>
                      <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-white" />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {/* 4 · Zuordnung */}
            <div className="space-y-3">
              <SectionLabel>Zuordnung</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Waldbestand">
                  {forests.length > 0 ? (
                    <Select value={forestId} onValueChange={setForestId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {forests.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-xs text-red-500 border border-red-200 bg-red-50 p-2 rounded-md">
                      Keine Wälder gefunden.
                    </div>
                  )}
                </Field>
                <Field label="Verantwortlich">
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger><SelectValue placeholder="Niemand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">— Offen lassen —</SelectItem>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName ? `${m.firstName} ${m.lastName}` : m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Objekt verknüpfen */}
              {!isRecurring && (
                <Field label={
                  <div className="flex items-center justify-between w-full">
                    <span>Objekt verknüpfen <span className="font-normal text-slate-400 text-xs">(optional)</span></span>
                    {linkedObjectId && (
                      <button type="button" onClick={handleUnlinkObject}
                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 font-normal">
                        <Unlink size={11} /> aufheben
                      </button>
                    )}
                  </div>
                }>
                  <Popover open={isObjectPopoverOpen} onOpenChange={open => { setIsObjectPopoverOpen(open); if (open) handleLoadObjects(); }}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start font-normal text-sm h-9 border-slate-200">
                        {linkedObjectId ? (
                          <span className="flex items-center gap-2">
                            {typeIcon(linkedObjectType)}
                            <span className="truncate">{linkedObjectName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-2">
                            <Link2 size={13} /> POI, Fläche oder Weg…
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0 shadow-lg" align="start">
                      <div className="p-3 border-b">
                        <p className="text-xs font-semibold text-slate-700">Objekt wählen</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Waldobjekt mit dieser Aufgabe verknüpfen</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1">
                        {isLoadingObjects ? (
                          <div className="flex justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          </div>
                        ) : forestObjects ? (
                          <>
                            <ObjectGroup label="Objekte (POI)" icon={<Box size={12} className="text-indigo-500 shrink-0" />}
                              items={forestObjects.pois} getLabel={(p: any) => p.name || "POI"}
                              type="POI" onSelect={handleSelectObject} />
                            <ObjectGroup label="Kulturflächen" icon={<Sprout size={12} className="text-green-600 shrink-0" />}
                              items={forestObjects.plantings} getLabel={(p: any) => p.description || p.treeSpecies}
                              type="PLANTING" onSelect={handleSelectObject} />
                            <ObjectGroup label="Kalamitäten" icon={<AlertTriangle size={12} className="text-orange-500 shrink-0" />}
                              items={forestObjects.calamities} getLabel={(c: any) => c.description || c.cause || "Kalamität"}
                              type="CALAMITY" onSelect={handleSelectObject} />
                            <ObjectGroup label="Jagdreviere" icon={<Fence size={12} className="text-yellow-600 shrink-0" />}
                              items={forestObjects.hunting} getLabel={(h: any) => h.name || "Jagdrevier"}
                              type="HUNTING" onSelect={handleSelectObject} />
                            <ObjectGroup label="LKW-Wege" icon={<Route size={12} className="text-slate-500 shrink-0" />}
                              items={forestObjects.roads} getLabel={(p: any) => p.name || 'LKW-Weg'}
                              type="ROAD" onSelect={handleSelectObject} />
                            <ObjectGroup label="Rückegassen" icon={<Tractor size={12} className="text-yellow-500 shrink-0" />}
                              items={forestObjects.skidTrails} getLabel={(p: any) => p.name || 'Rückegasse'}
                              type="SKID_TRAIL" onSelect={handleSelectObject} />
                            <ObjectGroup label="Gewässer" icon={<Waves size={12} className="text-blue-500 shrink-0" />}
                              items={forestObjects.waters} getLabel={(p: any) => p.name || 'Gewässer'}
                              type="WATER" onSelect={handleSelectObject} />
                            {!forestObjects.pois?.length && !forestObjects.plantings?.length &&
                             !forestObjects.calamities?.length && !forestObjects.hunting?.length &&
                             !forestObjects.roads?.length && !forestObjects.skidTrails?.length && !forestObjects.waters?.length && (
                              <p className="text-xs text-slate-400 p-4 text-center">Keine Objekte in diesem Wald</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 p-4 text-center">Waldbestand wählen, um Objekte zu laden</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </Field>
              )}

              {/* Auto-Verknüpfungs-Hinweis */}
              {!linkedObjectId && (defaultLat || defaultPoiId || defaultLinkedPolygonId) && (
                <div className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-md flex items-center gap-2">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  {defaultPoiId ? "Wird automatisch mit Objekt verknüpft" :
                   defaultLinkedPolygonId ? "Wird automatisch mit Fläche verknüpft" :
                   "Standort wird gespeichert"}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || forests.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRecurring ? "Serie starten" : "Aufgabe erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Kleine Hilfskomponenten ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">{children}</p>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-slate-500 font-medium">{label}</Label>
      {children}
    </div>
  );
}

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ObjectGroup({
  label, icon, items, getLabel, type, onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  items: any[] | undefined;
  getLabel: (item: any) => string;
  type: string;
  onSelect: (type: string, id: string, name: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <>
      <p className="text-[10px] uppercase text-slate-400 px-3 py-1 font-semibold mt-1">{label}</p>
      {items.map((item: any) => {
        const name = getLabel(item);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(type, item.id, name)}
            className="w-full flex items-center gap-2 text-xs hover:bg-slate-100 px-3 py-1.5 rounded-md text-left transition-colors"
          >
            {icon}
            <span className="truncate">{name}</span>
          </button>
        );
      })}
    </>
  );
}
