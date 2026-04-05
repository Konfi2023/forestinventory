"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, CalendarClock } from "lucide-react";
import { createEvent } from "@/actions/events";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

interface Props {
  orgSlug: string;
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  onSuccess: () => void; // <--- WICHTIG: Damit der Kalender neu lädt
}

export function CreateEventDialog({ orgSlug, isOpen, onClose, defaultDate, onSuccess }: Props) {
  const t = useTranslations("Calendar");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [allDay, setAllDay] = useState(false);

  // Datum & Zeit getrennt für einfachere Eingabe
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");

  // Reset beim Öffnen
  useEffect(() => {
    if (isOpen && defaultDate) {
      const dateStr = format(defaultDate, "yyyy-MM-dd");
      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
      setTitle("");
      setDesc("");
    }
  }, [isOpen, defaultDate]);

  const handleSave = async () => {
    if (!title || !startDate) return toast.error(t("titleAndDateMissing"));
    
    setIsLoading(true);
    try {
      // Datum und Zeit zusammenbauen
      let startIso = new Date(startDate);
      let endIso = endDate ? new Date(endDate) : new Date(startDate);

      if (!allDay) {
        // Zeit hinzufügen
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        
        startIso.setHours(sh, sm);
        endIso.setHours(eh, em);
      } else {
        // Bei Ganztägig ist Ende oft optional oder Ende des Tages
        // Wir lassen das Ende hier flexibel, Prisma/FullCalendar regeln das
      }

      await createEvent(orgSlug, {
        title,
        description: desc,
        start: startIso,
        end: endIso, // Wenn allDay, ist das Datum wichtig, Uhrzeit egal
        allDay
      });

      toast.success(t("eventCreated"));
      onSuccess(); // Kalender aktualisieren!
      onClose();
    } catch (e) {
      toast.error(t("errorCreating"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("newEvent")}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Titel */}
          <div className="grid gap-2">
             <Label>{t("titleLabel")}</Label>
             <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                autoFocus 
             />
          </div>

          {/* Ganztägig Switch */}
          <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50">
             <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
             <Label htmlFor="all-day" className="cursor-pointer flex-1 font-medium">{t("allDayEvent")}</Label>
             <CalendarClock size={16} className="text-slate-400"/>
          </div>

          {/* Start */}
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>{t("startDate")}</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
             </div>
             {!allDay && (
                 <div className="grid gap-2">
                    <Label>{t("time")}</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                 </div>
             )}
          </div>

          {/* Ende */}
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>{t("endDate")}</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
             {!allDay && (
                 <div className="grid gap-2">
                    <Label>{t("time")}</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                 </div>
             )}
          </div>

          {/* Beschreibung */}
          <div className="grid gap-2">
             <Label>{t("descriptionLabel")}</Label>
             <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("descriptionPlaceholder")} />
          </div>
        </div>

        <DialogFooter>
            <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t("saveLabel")}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}