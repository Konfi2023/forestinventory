"use client";

import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import deLocale from "@fullcalendar/core/locales/de";
import { getCalendarData, getUnscheduledTasks } from "@/actions/calendar"; 
import { updateTaskScheduling, getTaskDetails, unscheduleTask } from "@/actions/tasks";
import { updateEventDate, deleteEvent } from "@/actions/events";
import { TaskDetailSheet } from "../../tasks/_components/TaskDetailSheet";
import { CreateTaskDialog } from "../../tasks/_components/CreateTaskDialog";
import { CreateEventDialog } from "./CreateEventDialog";
import { UnscheduledTasks } from "./UnscheduledTasks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ClipboardList, User } from "lucide-react";
import { toast } from "sonner";
import { getInitials, getUserColor } from "@/lib/utils";

interface Props {
  orgSlug: string;
  currentUserId: string;
  members: any[];
  forests: any[];
}

export function CalendarView({ orgSlug, currentUserId, members, forests }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  
  // --- STATE ---
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Dialoge
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  
  // Task Details
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // --- OPTIMISTIC UI STATE ---
  const [backlogTasks, setBacklogTasks] = useState<any[]>([]);
  const [isBacklogLoading, setIsBacklogLoading] = useState(true);

  // --- INIT ---
  useEffect(() => {
    loadBacklog(false);
  }, [orgSlug]);

  const loadBacklog = async (silent = false) => {
    if (!silent) setIsBacklogLoading(true);
    const data = await getUnscheduledTasks(orgSlug);
    setBacklogTasks(data);
    if (!silent) setIsBacklogLoading(false);
  };

  // --- HELPER ---
  const refreshAll = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.refetchEvents();
    loadBacklog(true);
  };

  const fetchEvents = async (info: any, successCallback: any) => {
    try {
      const data = await getCalendarData(orgSlug, info.start, info.end);
      successCallback(data);
    } catch (error) {
      toast.error("Fehler beim Laden");
      successCallback([]);
    }
  };

  // --- CUSTOM RENDER ---
  const renderEventContent = (eventInfo: any) => {
    const title = eventInfo.event.title;
    const type = eventInfo.event.extendedProps.type;
    const assignee = eventInfo.event.extendedProps.assignee;
    
    // Feiertage (haben display: background) werden nicht hier gerendert
    if (eventInfo.event.display === 'background') return null;

    return (
        <div className="flex items-center gap-1.5 w-full overflow-hidden px-1 py-0.5 h-full">
            {type === 'task' && (
                <div className="shrink-0">
                    {assignee ? (
                        <div 
                            className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border border-white/50 ${getUserColor(assignee.firstName)}`}
                            title={`${assignee.firstName} ${assignee.lastName}`}
                        >
                            {getInitials(assignee.firstName, assignee.lastName)}
                        </div>
                    ) : (
                         <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                            <User size={8} className="text-white"/>
                         </div>
                    )}
                </div>
            )}
            <span className="truncate text-xs font-semibold leading-tight">{title}</span>
        </div>
    )
  }

  // --- HANDLERS ---
  const handleDateClick = (arg: any) => { setSelectedDate(arg.date); setShowTypeSelection(true); };

  const handleEventClick = async (clickInfo: any) => {
    const type = clickInfo.event.extendedProps.type;
    const id = clickInfo.event.id;
    if (type === 'task') {
      const taskData = await getTaskDetails(orgSlug, id);
      if (taskData) { setSelectedTask(taskData); setIsSheetOpen(true); }
    } else if (type === 'event') {
      if(confirm(`Termin löschen?`)) {
         try { await deleteEvent(orgSlug, id); clickInfo.event.remove(); toast.success("Gelöscht"); } 
         catch(e) { toast.error("Fehler"); }
      }
    }
  };

  const handleEventDrop = async (info: any) => {
    const type = info.event.extendedProps.type;
    const id = info.event.id;
    try {
        if (type === 'task') await updateTaskScheduling(orgSlug, id, info.event.start, info.event.end);
        else await updateEventDate(orgSlug, id, info.event.start, info.event.end);
        toast.success("Verschoben");
    } catch (e) {
        info.revert();
        toast.error("Fehler");
    }
  };

  const handleEventReceive = async (info: any) => {
     const { event } = info;
     const id = event.id;
     event.remove(); 

     setBacklogTasks(prev => prev.filter(t => t.id !== id));

     try {
         await updateTaskScheduling(orgSlug, id, event.start as Date, event.end || null);
         toast.success("Eingeplant");
         calendarRef.current?.getApi().refetchEvents();
     } catch(e) {
         toast.error("Fehler");
         loadBacklog(true);
     }
  };

  const handleEventDragStop = async (info: any) => {
    const sidebarEl = document.getElementById("unscheduled-sidebar");
    if (info.event.extendedProps.type !== 'task' || !sidebarEl) return;

    const rect = sidebarEl.getBoundingClientRect();
    const jsEvent = info.jsEvent;
    const isOverSidebar = 
        jsEvent.clientX >= rect.left && jsEvent.clientX <= rect.right &&
        jsEvent.clientY >= rect.top && jsEvent.clientY <= rect.bottom;

    if (isOverSidebar) {
        const id = info.event.id;
        const title = info.event.title;
        info.event.remove(); 
        
        const optimisticTask = {
            id: id,
            title: title,
            forestName: info.event.extendedProps.forestName,
            priority: 'MEDIUM',
            duration: "01:00",
            assignee: info.event.extendedProps.assignee
        };
        setBacklogTasks(prev => [optimisticTask, ...prev]);

        try {
            await unscheduleTask(orgSlug, id); 
            toast.success("Zurück in Backlog");
            loadBacklog(true); 
        } catch (e) {
            toast.error("Fehler");
            refreshAll(); 
        }
    }
  };

  const handleUnscheduleFromSheet = async () => {
      if(!selectedTask) return;
      try {
          await unscheduleTask(orgSlug, selectedTask.id);
          toast.success("Zurück in Backlog");
          setIsSheetOpen(false);
          refreshAll();
      } catch(e) { toast.error("Fehler"); }
  };

  return (
    <div className="flex h-full border rounded-lg overflow-hidden shadow-sm bg-white">
      
      {/* SIDEBAR */}
      <UnscheduledTasks tasks={backlogTasks} loading={isBacklogLoading} />

      {/* KALENDER */}
      <div className="flex-1 p-4 h-full relative">
        <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' }}
            locale={deLocale}
            height="100%"
            selectable={true}
            editable={true}
            droppable={true}
            dragRevertDuration={0} 
            
            eventContent={renderEventContent}
            eventReceive={handleEventReceive}
            eventDragStop={handleEventDragStop}
            eventDrop={handleEventDrop}
            eventResize={handleEventDrop}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            events={fetchEvents}
            
            weekNumbers={true}
            slotMinTime="06:00:00" slotMaxTime="20:00:00"
            allDaySlot={true} nowIndicator={true}
            eventClassNames="cursor-pointer text-xs font-medium border-0 shadow-sm opacity-90 hover:opacity-100"
        />

        <Dialog open={showTypeSelection} onOpenChange={setShowTypeSelection}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Neuer Eintrag</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-500" onClick={() => { setShowTypeSelection(false); setShowCreateTask(true); }}>
                        <ClipboardList className="w-8 h-8 text-blue-600"/><span className="font-semibold">Aufgabe</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-green-50 hover:border-green-500" onClick={() => { setShowTypeSelection(false); setShowCreateEvent(true); }}>
                        <CalendarIcon className="w-8 h-8 text-green-600"/><span className="font-semibold">Termin</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        <CreateTaskDialog 
            orgSlug={orgSlug} forests={forests} members={members}
            defaultDate={selectedDate || undefined}
            openProp={showCreateTask}
            onOpenChangeProp={(open) => {
                setShowCreateTask(open);
                if (!open) setTimeout(refreshAll, 500);
            }}
            trigger={<span className="hidden" />} 
        />
        
        <CreateEventDialog 
            isOpen={showCreateEvent} onClose={() => setShowCreateEvent(false)}
            orgSlug={orgSlug} defaultDate={selectedDate || new Date()}
            onSuccess={refreshAll}
        />

        <TaskDetailSheet 
            task={selectedTask} open={isSheetOpen} 
            onClose={() => { setIsSheetOpen(false); setSelectedTask(null); }}
            orgSlug={orgSlug} members={members} currentUserId={currentUserId}
            onUnschedule={handleUnscheduleFromSheet}
        />
      </div>
    </div>
  );
}