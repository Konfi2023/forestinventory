"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Repeat, Loader2, Play, Pause, Trash2, CalendarClock, Pencil, Plus } from "lucide-react";
import { getTaskSchedules, toggleScheduleActive, deleteTaskSchedule } from "@/actions/tasks";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { CreateTaskDialog } from "./CreateTaskDialog"; // NEU: Importieren

interface Props {
  orgSlug: string;
  forests: { id: string; name: string }[];
  members: { id: string; email: string; firstName?: string | null; lastName?: string | null }[];
}

export function ManageSchedulesDialog({ orgSlug, forests, members }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Reload Trigger für den Create Dialog
  // Wenn im CreateDialog eine Serie erstellt wird, wollen wir diese Liste hier aktualisieren
  const refreshList = () => {
    loadData();
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTaskSchedules(orgSlug);
      setSchedules(data);
    } catch (e) {
      toast.error("Konnte Serien nicht laden");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !currentStatus } : s));
      await toggleScheduleActive(orgSlug, id, !currentStatus);
      toast.success(currentStatus ? "Serie pausiert" : "Serie aktiviert");
    } catch (e) {
      loadData();
      toast.error("Fehler beim Ändern");
    }
  };

  const handleStop = async (id: string) => {
    try {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: false } : s));
      await toggleScheduleActive(orgSlug, id, false);
      toast.success("Serie gestoppt — bestehende Aufgaben bleiben erhalten");
    } catch (e) {
      loadData();
      toast.error("Fehler");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setSchedules(prev => prev.filter(s => s.id !== id));
      await deleteTaskSchedule(orgSlug, id);
      toast.success("Serie und alle verknüpften Daten gelöscht");
    } catch (e) {
      loadData();
      toast.error("Fehler beim Löschen");
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Repeat className="w-4 h-4 mr-2" />
        Serien verwalten
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-900px">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
                <DialogTitle>Wiederkehrende Aufgaben</DialogTitle>
                <DialogDescription>
                Verwalten Sie Ihre automatischen Routinen.
                </DialogDescription>
            </div>
            
            {/* NEU: Der Button, um direkt hier eine Serie zu erstellen */}
            <div className="mr-8"> 
                <CreateTaskDialog 
                    orgSlug={orgSlug}
                    forests={forests}
                    members={members}
                    defaultOpenRecurring={true} // Direkt im Serien-Modus starten
                    trigger={
                        <Button size="sm" onClick={() => {
                            // Kleiner Hack: Wir schließen kurz das Listen-Modal nicht, 
                            // Shadcn stapelt Dialoge übereinander. Das ist okay.
                            // Nach dem Erstellen müssten wir idealerweise die Liste neu laden.
                            // Da CreateTaskDialog revalidatePath macht, passiert das serverseitig,
                            // aber wir wollen es auch hier sehen.
                            // Lösung: Wir hören auf Änderungen oder laden einfach neu wenn man zurückkommt.
                        }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Neue Serie
                        </Button>
                    }
                />
            </div>
          </DialogHeader>

          <div className="py-4 min-h-300px">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin h-8 w-8 text-slate-300" />
              </div>
            ) : (
              <div className="border rounded-md max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titel / Wald</TableHead>
                      <TableHead>Intervall</TableHead>
                      <TableHead>Nächster Lauf</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((s) => (
                      <TableRow key={s.id} className={!s.active ? "opacity-60 bg-slate-50" : ""}>
                        <TableCell>
                          <div className="font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.forest.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            Alle {s.interval} {translateUnit(s.unit)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                             <CalendarClock className="w-3 h-3 mr-2 text-slate-400" />
                             {format(new Date(s.nextRunAt), "dd.MM.yyyy", { locale: de })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Aktiv</Badge>
                          ) : (
                            <Badge variant="secondary">Pausiert</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pendingDeleteId === s.id ? (
                            <div className="flex justify-end items-center gap-1 animate-in fade-in slide-in-from-right-2">
                              <span className="text-xs text-slate-500 mr-1">Löschen?</span>
                              <Button
                                size="sm" variant="outline"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50 h-7 px-2 text-xs"
                                onClick={() => handleStop(s.id)}
                              >
                                Stoppen
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 h-7 px-2 text-xs"
                                onClick={() => handleDelete(s.id)}
                              >
                                Alles löschen
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs text-slate-400"
                                onClick={() => setPendingDeleteId(null)}
                              >
                                Abbrechen
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                  size="sm" variant="ghost"
                                  onClick={() => setEditingSchedule(s)}
                              >
                                  <Pencil className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => handleToggle(s.id, s.active)}
                              >
                                {s.active ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => setPendingDeleteId(s.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {schedules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Keine Serien eingerichtet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editingSchedule && (
        <EditScheduleDialog 
           open={!!editingSchedule}
           schedule={editingSchedule}
           onClose={() => setEditingSchedule(null)}
           orgSlug={orgSlug}
           forests={forests}
           members={members}
           onSuccess={loadData}
        />
      )}
    </>
  );
}

function translateUnit(unit: string) {
  switch(unit) {
    case 'DAYS': return 'Tage';
    case 'WEEKS': return 'Wochen';
    case 'MONTHS': return 'Monate';
    case 'YEARS': return 'Jahre';
    default: return unit;
  }
}