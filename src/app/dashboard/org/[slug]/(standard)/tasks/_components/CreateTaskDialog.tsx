"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Repeat, Clock, MapPin as MapPinIcon } from "lucide-react";
import { createTask, createTaskSchedule } from "@/actions/tasks";
import { TaskPriority, RecurrenceUnit } from "@prisma/client";
import { toast } from "sonner";

interface Props {
  orgSlug: string;
  forests: { id: string; name: string }[];
  members?: { id: string; email: string; firstName?: string | null; lastName?: string | null }[];
  defaultOpenRecurring?: boolean; 
  trigger?: React.ReactNode;      
  defaultDate?: Date;             
  openProp?: boolean;             
  onOpenChangeProp?: (v: boolean) => void; 
  
  // Context-Daten
  defaultTitle?: string;
  defaultForestId?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultPoiId?: string; // NEU
}

export function CreateTaskDialog({ 
  orgSlug, 
  forests = [], 
  members = [], 
  defaultOpenRecurring = false, 
  trigger,
  defaultDate,
  openProp,
  onOpenChangeProp,
  defaultTitle,
  defaultForestId,
  defaultLat,
  defaultLng,
  defaultPoiId // NEU
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = openProp !== undefined ? openProp : internalOpen;
  const setOpen = onOpenChangeProp || setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);

  // Basis Daten
  const [title, setTitle] = useState(defaultTitle || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  
  // Wald ID setzen: Entweder übergeben oder erster in der Liste
  const [forestId, setForestId] = useState(
      defaultForestId || (forests && forests.length > 0 ? forests[0].id : "")
  );
  
  const [assigneeId, setAssigneeId] = useState("unassigned");
  
  const [isRecurring, setIsRecurring] = useState(defaultOpenRecurring);

  const [dueDate, setDueDate] = useState(""); 
  
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");

  const [startDate, setStartDate] = useState("");
  const [interval, setInterval] = useState("1");
  const [unit, setUnit] = useState<RecurrenceUnit>("WEEKS");

  // Reset bei Öffnen
  useEffect(() => {
    if (isOpen) {
        setIsRecurring(defaultOpenRecurring);
        
        if (defaultTitle) setTitle(defaultTitle);
        
        if (defaultForestId) setForestId(defaultForestId);
        else if (forests && forests.length > 0 && !forestId) setForestId(forests[0].id);

        if (defaultDate) {
            const dateStr = defaultDate.toISOString().split('T')[0];
            if (defaultOpenRecurring) setStartDate(dateStr);
        }
    }
  }, [isOpen, defaultOpenRecurring, defaultDate, defaultTitle, defaultForestId, forests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgSlug) {
        toast.error("Systemfehler: Organisations-ID fehlt.");
        return;
    }

    if (!forestId) {
        toast.error("Bitte einen Waldbestand auswählen.");
        return;
    }

    setIsLoading(true);

    try {
      if (isRecurring) {
        if (!startDate) { toast.error("Startdatum erforderlich"); setIsLoading(false); return; }
        
        await createTaskSchedule(orgSlug, {
            title,
            description,
            priority,
            forestId,
            assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
            startDate: new Date(startDate),
            interval: parseInt(interval),
            unit: unit
        });
        toast.success("Serie gestartet");

      } else {
        let scheduledStart: Date | undefined = undefined;
        let scheduledEnd: Date | undefined = undefined;

        if (defaultDate) {
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            
            scheduledStart = new Date(defaultDate);
            scheduledStart.setHours(sh, sm);
            
            scheduledEnd = new Date(defaultDate);
            scheduledEnd.setHours(eh, em);
        } else if (defaultDate) {
            scheduledStart = defaultDate;
            scheduledEnd = defaultDate;
        }

        // Action aufrufen
        await createTask(orgSlug, {
            title,
            description,
            priority,
            forestId,
            assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            scheduledDate: scheduledStart,
            scheduledEndDate: scheduledEnd,
            
            // NEU: Logik für POI vs. Koordinaten
            poiId: defaultPoiId,
            lat: defaultPoiId ? undefined : defaultLat, // Wenn POI verknüpft, brauchen wir keine fixen Koords
            lng: defaultPoiId ? undefined : defaultLng
        });
        toast.success("Aufgabe erstellt");
      }
      
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast.error("Fehler: " + (error.message || "Unbekannt"));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
      setTitle(""); setDescription(""); setPriority("MEDIUM");
      setDueDate(""); setStartDate(""); setIsRecurring(defaultOpenRecurring);
      setStartTime("08:00"); setEndTime("12:00");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neue Aufgabe
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
                {defaultDate ? "Aufgabe planen" : isRecurring ? "Neue Serie" : "Arbeitsauftrag erstellen"}
            </DialogTitle>
            <DialogDescription>
              {isRecurring ? "Automatische Aufgaben." : "Eine einmalige Aufgabe für einen Waldbestand."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Was ist zu tun?" />
            </div>

            {!defaultDate && (
                <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border">
                    <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                    <div className="flex-1">
                        <Label htmlFor="recurring" className="font-semibold cursor-pointer">Wiederkehrende Aufgabe?</Label>
                        <p className="text-xs text-muted-foreground">Erstellt automatisch neue Aufgaben nach einem Zeitplan.</p>
                    </div>
                    <Repeat className={`h-5 w-5 ${isRecurring ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
            )}

            {isRecurring ? (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid gap-2">
                        <Label>Priorität</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LOW">Niedrig</SelectItem>
                                <SelectItem value="MEDIUM">Mittel</SelectItem>
                                <SelectItem value="HIGH">Hoch</SelectItem>
                                <SelectItem value="URGENT">Dringend</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Startdatum</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    </div>

                    <div className="grid gap-2 col-span-2">
                        <Label>Wiederholung</Label>
                        <div className="flex gap-2">
                            <div className="flex items-center px-3 border rounded-md bg-slate-50 text-sm text-slate-500">Alle</div>
                            <Input type="number" min="1" className="w-20" value={interval} onChange={e => setInterval(e.target.value)} />
                            <Select value={unit} onValueChange={(v) => setUnit(v as RecurrenceUnit)}>
                                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAYS">Tage</SelectItem>
                                    <SelectItem value="WEEKS">Wochen</SelectItem>
                                    <SelectItem value="MONTHS">Monate</SelectItem>
                                    <SelectItem value="YEARS">Jahre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Priorität</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Niedrig</SelectItem>
                                    <SelectItem value="MEDIUM">Mittel</SelectItem>
                                    <SelectItem value="HIGH">Hoch</SelectItem>
                                    <SelectItem value="URGENT">Dringend</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label>Frist (Due Date)</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    {defaultDate && (
                        <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                             <div className="grid gap-2">
                                <Label className="text-blue-900 flex items-center gap-1"><Clock size={12}/> Startzeit</Label>
                                <Input type="time" className="bg-white" value={startTime} onChange={e => setStartTime(e.target.value)} />
                             </div>
                             <div className="grid gap-2">
                                <Label className="text-blue-900 flex items-center gap-1"><Clock size={12}/> Endzeit</Label>
                                <Input type="time" className="bg-white" value={endTime} onChange={e => setEndTime(e.target.value)} />
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Gemeinsame Felder */}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Bestand / Waldstück</Label>
                    {/* Fallback falls keine Wälder da sind */}
                    {forests && forests.length > 0 ? (
                        <Select value={forestId} onValueChange={setForestId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                            {forests.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="text-xs text-red-500 border border-red-200 bg-red-50 p-2 rounded">
                            Keine Wälder gefunden.
                        </div>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label>Zuweisung</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger><SelectValue placeholder="Niemand" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="unassigned">- Offen lassen -</SelectItem>
                        {members?.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                            {m.firstName ? `${m.firstName} ${m.lastName}` : m.email}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Beschreibung</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." />
            </div>
            
            {/* Hinweis bei Standort-Verknüpfung */}
            {(defaultLat || defaultPoiId) && (
                <div className="text-[10px] text-blue-500 bg-blue-50 p-2 rounded flex items-center gap-2">
                     <MapPinIcon className="w-3 h-3"/> 
                     {defaultPoiId ? "Wird mit Objekt verknüpft" : "Standort wird gespeichert"}
                </div>
            )}

          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button type="submit" disabled={isLoading || (forests.length === 0 && !forestId)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRecurring ? "Serie starten" : "Planen & Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}