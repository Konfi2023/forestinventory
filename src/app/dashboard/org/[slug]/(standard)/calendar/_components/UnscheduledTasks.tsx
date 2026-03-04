"use client";

import { useEffect, useRef } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Sparkles, Loader2, User } from "lucide-react";
import { getTaskColor, getUserColor, getInitials } from "@/lib/utils"; // <--- Import

interface Props {
  tasks: any[];
  loading: boolean;
}

export function UnscheduledTasks({ tasks, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let draggable: Draggable | null = null;
    if (containerRef.current && tasks.length > 0) {
      draggable = new Draggable(containerRef.current, {
        itemSelector: ".fc-event-external",
        eventData: function (eventEl) {
          return {
            id: eventEl.dataset.id,
            title: eventEl.innerText,
            backgroundColor: eventEl.dataset.color,
            borderColor: eventEl.dataset.color,
            duration: eventEl.dataset.duration || "01:00", 
            extendedProps: {
                type: 'task',
                originalDuration: eventEl.dataset.duration 
            }
          };
        },
      });
    }
    return () => draggable?.destroy();
  }, [tasks]);

  return (
    <div 
        id="unscheduled-sidebar" 
        className="w-72 border-r bg-slate-50 flex flex-col h-full min-h-0 shrink-0"
    >
      <div className="p-4 border-b bg-white shrink-0">
        <h3 className="font-semibold text-sm">Ungeplante Aufgaben</h3>
        <p className="text-xs text-muted-foreground">{tasks.length} offen</p>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2 h-full">
        {loading ? (
           <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-300"/></div>
        ) : tasks.map((task) => (
          <div
            key={task.id}
            data-id={task.id}
            data-duration={task.duration}
            data-color={getTaskColor(task.priority)}
            className="fc-event-external cursor-grab active:cursor-grabbing bg-white border border-slate-200 rounded-md p-3 shadow-sm hover:shadow-md transition-all flex items-start gap-2 group"
          >
            <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0 group-hover:text-slate-500" />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-slate-100 text-slate-500 font-normal truncate max-w-[80px]">
                        {task.forestName}
                    </Badge>
                    
                    {/* AVATAR IN DER SIDEBAR */}
                    {task.assignee ? (
                         <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${getUserColor(task.assignee.firstName || task.assignee.email)}`}>
                             {getInitials(task.assignee.firstName, task.assignee.lastName)}
                         </div>
                    ) : (
                         <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                             <User size={10} className="text-slate-300"/>
                         </div>
                    )}
                </div>
                <div className="text-sm font-medium leading-tight truncate text-slate-700">
                    {task.title}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                     Dauer: {task.duration}h
                </div>
            </div>
          </div>
        ))}
        
        {!loading && tasks.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground border-2 border-dashed rounded-lg h-32 flex items-center justify-center">
                Alles geplant! 🎉
            </div>
        )}
      </div>

      <div className="p-4 border-t bg-white space-y-2 shrink-0">
        <Button 
            disabled 
            className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-0 opacity-50 cursor-not-allowed"
        >
            <Sparkles className="w-4 h-4 mr-2" />
            KI-Planung (Auto)
        </Button>
        <p className="text-[10px] text-center text-slate-400 leading-tight">
            Optimiert Route & Auslastung basierend auf Geo-Daten. <br/> (Coming Soon)
        </p>
      </div>
    </div>
  );
}