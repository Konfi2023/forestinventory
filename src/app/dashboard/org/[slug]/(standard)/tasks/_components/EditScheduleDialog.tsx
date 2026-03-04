"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTaskSchedule } from "@/actions/tasks";
import { RecurrenceUnit, TaskPriority } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface Props {
  schedule: any;
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  forests: any[]; // Wir brauchen die Listen für Dropdowns
  members: any[];
  onSuccess: () => void; // Callback um die Liste neu zu laden
}

export function EditScheduleDialog({ schedule, open, onClose, orgSlug, forests, members, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  
  // State mit Werten aus der existierenden Serie initialisieren
  const [title, setTitle] = useState(schedule.title);
  const [forestId, setForestId] = useState(schedule.forestId);
  const [assigneeId, setAssigneeId] = useState(schedule.assigneeId || "unassigned");
  const [interval, setInterval] = useState(schedule.interval.toString());
  const [unit, setUnit] = useState<RecurrenceUnit>(schedule.unit);
  const [priority, setPriority] = useState<TaskPriority>(schedule.priority);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateTaskSchedule(orgSlug, schedule.id, {
        title,
        forestId,
        assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
        interval: parseInt(interval),
        unit,
        priority
      });
      toast.success("Serie aktualisiert");
      onSuccess(); // Liste neu laden
      onClose();   // Dialog schließen
    } catch (e) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-500px">
        <DialogHeader>
          <DialogTitle>Serie bearbeiten</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Titel</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>Bestand</Label>
                <Select value={forestId} onValueChange={setForestId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {forests.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
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
          </div>

          <div className="grid gap-2">
            <Label>Wiederholung</Label>
            <div className="flex gap-2">
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

          <div className="grid gap-2">
              <Label>Standard-Bearbeiter</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Niemand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">- Offen lassen -</SelectItem>
                  {members.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName ? `${m.firstName} ${m.lastName}` : m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}