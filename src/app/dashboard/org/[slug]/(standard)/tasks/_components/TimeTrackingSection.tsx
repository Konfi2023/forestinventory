"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Loader2 } from "lucide-react";
import { logWorkTime } from "@/actions/tasks";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  orgSlug: string;
  taskId: string;
  entries: any[];
  onUpdate: () => void;
}

type Unit = "HOURS" | "DAYS";

export function TimeTrackingSection({ orgSlug, taskId, entries, onUpdate }: Props) {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<Unit>("HOURS");
  const [desc, setDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Summe in Minuten berechnen
  const totalMinutes = entries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  
  // Smarte Anzeige der Gesamtsumme
  const formatTotal = (mins: number) => {
    const hours = mins / 60;
    if (hours === 0) return "0 Std.";
    // Ab 8 Stunden zeigen wir Tage an (1 Tag = 8h)
    if (hours >= 8) {
        const days = hours / 8;
        return `${days.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tage (${hours}h)`;
    }
    return `${hours.toLocaleString('de-DE', { maximumFractionDigits: 2 })} Std.`;
  };

  const handleLogTime = async () => {
    if (!value) return;
    setIsLoading(true);
    
    // Umrechnung in Minuten für die Datenbank
    const numVal = parseFloat(value.replace(',', '.'));
    let minutes = 0;
    
    if (unit === "HOURS") minutes = Math.round(numVal * 60);
    if (unit === "DAYS") minutes = Math.round(numVal * 8 * 60); // 1 Tag = 8h

    try {
      await logWorkTime(orgSlug, taskId, minutes, desc || "Arbeitszeit");
      toast.success("Zeit gebucht");
      setValue("");
      setDesc("");
      onUpdate();
    } catch (e) {
      toast.error("Fehler beim Buchen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-bold text-slate-900">
        <div className="flex items-center gap-2">
            <Clock size={16} />
            Zeiterfassung
        </div>
        <div className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
            {formatTotal(totalMinutes)} gesamt
        </div>
      </div>

      {/* Eingabezeile */}
      <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="w-24">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Dauer</label>
            <Input 
                type="number" 
                placeholder="z.B. 1.5" 
                className="h-8 bg-white" 
                step="0.25"
                value={value}
                onChange={e => setValue(e.target.value)}
            />
        </div>
        <div className="w-24">
             <label className="text-[10px] text-muted-foreground uppercase font-bold">Einheit</label>
             <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="HOURS">Std.</SelectItem>
                    <SelectItem value="DAYS">Tage</SelectItem>
                </SelectContent>
             </Select>
        </div>
        <div className="flex-1">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Tätigkeit</label>
            <Input 
                placeholder="Was wurde gemacht?" 
                className="h-8 bg-white" 
                value={desc}
                onChange={e => setDesc(e.target.value)}
            />
        </div>
        <Button size="sm" className="h-8" onClick={handleLogTime} disabled={isLoading || !value}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
        </Button>
      </div>

      {/* Liste */}
      <div className="space-y-3 pl-1">
        {entries.map((entry) => {
            // Anzeige Logik für einzelne Einträge
            const hours = (entry.durationMinutes / 60);
            const displayDuration = hours >= 8 
                ? `${(hours / 8).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tage` 
                : `${hours.toLocaleString('de-DE', { maximumFractionDigits: 2 })} Std.`;

            return (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <Avatar className="w-6 h-6 mt-0.5 border">
                        <AvatarFallback className="text-[9px] bg-slate-200">
                            {entry.user.lastName?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex justify-between">
                            <span className="font-medium text-slate-700">
                                {entry.user.firstName} {entry.user.lastName}
                            </span>
                            <span className="font-mono text-slate-600 font-bold text-xs">
                                {displayDuration}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                            <span>{entry.description}</span>
                            <span>{format(new Date(entry.startTime), "dd.MM.")}</span>
                        </div>
                    </div>
                </div>
            );
        })}
        {entries.length === 0 && <p className="text-xs text-muted-foreground italic text-center">Noch keine Zeiten gebucht.</p>}
      </div>
    </div>
  );
}