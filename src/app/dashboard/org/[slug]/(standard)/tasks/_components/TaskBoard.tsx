"use client";

import { useState, useMemo, useEffect } from "react";
import { TaskStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Filter, User, AlertCircle, ChevronRight, Trees } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { updateTaskStatus } from "@/actions/tasks";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/admin/PriorityBadge";

// DND KIT IMPORTS
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

// --- HELPER FÜR FARBEN & INITIALEN ---
function getUserColor(name?: string | null) {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-green-100 text-green-700",
    "bg-blue-100 text-blue-700",
    "bg-orange-100 text-orange-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
  ];
  if (!name) return "bg-slate-100 text-slate-700";
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getInitials(first?: string | null, last?: string | null) {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?';
}

interface Props {
  initialTasks: any[];
  orgSlug: string;
  members: any[];
  currentUserId: string;
  defaultOpenTaskId?: string;
  forests: { id: string; name: string }[];
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "OPEN", title: "Zu erledigen", color: "border-t-slate-400" },
  { id: "IN_PROGRESS", title: "In Arbeit", color: "border-t-blue-500" },
  { id: "DONE", title: "Erledigt", color: "border-t-green-500" },
];

export function TaskBoard({ initialTasks, orgSlug, members, currentUserId, defaultOpenTaskId, forests }: Props) {
  // --- STATE ---
  const [tasks, setTasks] = useState(initialTasks);
  
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // FILTERS
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [filterForest, setFilterForest] = useState("ALL");

  // DND & DETAIL STATE
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Auto-Open (Deep Linking)
  useEffect(() => {
    if (defaultOpenTaskId && initialTasks.length > 0) {
        const exists = initialTasks.find(t => t.id === defaultOpenTaskId);
        if (exists) {
            setSelectedTaskId(defaultOpenTaskId);
            setIsSheetOpen(true);
        }
    }
  }, [defaultOpenTaskId, initialTasks]);

  const selectedTask = useMemo(() => 
    tasks.find(t => t.id === selectedTaskId) || null
  , [tasks, selectedTaskId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // --- FILTER LOGIK ---
  const displayedTasks = useMemo(() => {
    return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                              task.forest.name.toLowerCase().includes(search.toLowerCase());
        
        const matchesAssignee = filterAssignee === "ALL" || task.assigneeId === filterAssignee;
        const matchesForest = filterForest === "ALL" || task.forestId === filterForest;
        
        return matchesSearch && matchesAssignee && matchesForest;
    });
  }, [tasks, search, filterAssignee, filterForest]);

  // --- DND HANDLER ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const oldStatus = task.status;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
        await updateTaskStatus(orgSlug, taskId, newStatus);
    } catch (e) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
        toast.error("Verschieben fehlgeschlagen");
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsSheetOpen(true);
  };

  const activeTask = tasks.find(t => t.id === activeDragId);

  if (!isMounted) return null; 

  return (
    <div className="space-y-4 h-full flex flex-col">
      
      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-lg border shadow-sm sticky top-0 z-10 md:static">
         {/* Suche */}
         <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Suche..." 
              className="pl-9 bg-slate-50 border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         
         {/* Wald Filter */}
         <div className="w-full md:w-[200px]">
            <Select value={filterForest} onValueChange={setFilterForest}>
               <SelectTrigger className="bg-slate-50 border-slate-200">
                  <Trees className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Alle Bestände" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="ALL">Alle Bestände</SelectItem>
                  {forests.map((f) => (
                     <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {/* Mitarbeiter Filter */}
         <div className="w-full md:w-[200px]">
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
               <SelectTrigger className="bg-slate-50 border-slate-200">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Alle Mitarbeiter" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="ALL">Alle Mitarbeiter</SelectItem>
                  <SelectItem value={currentUserId}>Nur meine Aufgaben</SelectItem>
                  {members.map((m: any) => (
                     <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>
      </div>

      {/* --- DESKTOP: KANBAN BOARD --- */}
      <div className="hidden md:flex flex-1 overflow-x-auto pb-4">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="flex gap-6 min-w-max h-full items-start w-full">
                {COLUMNS.map(col => {
                    const colTasks = displayedTasks.filter(t => {
                        if (col.id === 'OPEN') return t.status === 'OPEN' || t.status === 'BLOCKED';
                        return t.status === col.id;
                    });

                    return (
                        <DroppableColumn 
                            key={col.id} 
                            id={col.id} 
                            title={col.title} 
                            color={col.color} 
                            count={colTasks.length}
                        >
                            {colTasks.map(task => (
                                <DraggableTaskCard key={task.id} task={task} onClick={() => handleTaskClick(task.id)} />
                            ))}
                        </DroppableColumn>
                    );
                })}
            </div>
            <DragOverlay>
                {activeTask ? (
                    <div className="rotate-2 opacity-90 cursor-grabbing">
                        <TaskCardContent task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
          </DndContext>
      </div>

      {/* --- MOBILE: LIST VIEW --- */}
      <div className="md:hidden flex-1 overflow-y-auto pb-20 space-y-3">
          {displayedTasks.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                  <p>Keine Aufgaben gefunden.</p>
              </div>
          )}
          
          {displayedTasks.map(task => (
              <Card 
                key={task.id} 
                onClick={() => handleTaskClick(task.id)}
                className="active:bg-slate-50 transition-colors border-l-4"
                style={{ borderLeftColor: getStatusColor(task.status) }}
              >
                  <CardContent className="p-4 flex items-start gap-3">
                      {/* AVATAR MOBIL */}
                      <div className="mt-1">
                        {task.assignee ? (
                            <Avatar className="h-8 w-8 border border-white shadow-sm">
                                <AvatarFallback className={`text-[10px] font-bold ${getUserColor(task.assignee.firstName || task.assignee.email)}`}>
                                    {getInitials(task.assignee.firstName, task.assignee.lastName)}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <User size={14} className="text-slate-400" />
                            </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {task.forest.name}
                              </span>
                              <PriorityBadge priority={task.priority} showLabel={false} />
                          </div>
                          
                          <h4 className="font-semibold text-slate-900 truncate">{task.title}</h4>
                          
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 flex-wrap">
                              {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                      <Calendar size={12} className={new Date() > new Date(task.dueDate) ? "text-red-500" : ""} />
                                      <span className={new Date() > new Date(task.dueDate) ? "text-red-600 font-medium" : ""}>
                                        {format(new Date(task.dueDate), "dd.MM.")}
                                      </span>
                                  </div>
                              )}
                              <span>•</span>
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-slate-100">
                                {translateStatus(task.status)}
                              </Badge>
                              {task.scheduleId && (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-blue-50 text-blue-600 border border-blue-100">
                                    🔁 Serie
                                  </Badge>
                              )}
                          </div>
                      </div>

                      <ChevronRight className="self-center text-slate-300 w-5 h-5" />
                  </CardContent>
              </Card>
          ))}
      </div>

      <TaskDetailSheet 
         task={selectedTask} 
         open={isSheetOpen} 
         onClose={() => { setIsSheetOpen(false); setSelectedTaskId(null); }}
         orgSlug={orgSlug}
         members={members}
         currentUserId={currentUserId}
      />
    </div>
  );
}

// --- SUB COMPONENTS ---

function DroppableColumn({ id, title, color, count, children }: any) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className="flex-1 min-w-72 bg-slate-100/50 rounded-lg p-3 flex flex-col gap-3 h-full">
            <div className={`flex items-center justify-between border-t-4 ${color} bg-white p-3 rounded shadow-sm`}>
                <h3 className="font-semibold text-sm">{title}</h3>
                <Badge variant="secondary" className="text-xs">{count}</Badge>
            </div>
            <div className="flex flex-col gap-3 min-h-[100px]">
                {children}
            </div>
        </div>
    );
}

function DraggableTaskCard({ task, onClick }: { task: any, onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes} 
            className={`touch-none ${isDragging ? 'opacity-0' : ''}`} 
            onClick={onClick}
        >
            <TaskCardContent task={task} />
        </div>
    );
}

function TaskCardContent({ task }: { task: any }) {
    return (
        <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:border-slate-400 group bg-white">
            <CardHeader className="p-3 pb-0 space-y-1">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-slate-200 text-slate-500 font-normal">
                            {task.forest.name}
                        </Badge>
                        {task.scheduleId && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-600 border border-blue-100 font-normal gap-0.5">
                                🔁 Serie
                            </Badge>
                        )}
                    </div>
                    <PriorityBadge priority={task.priority} showLabel={false} />
                </div>
                <CardTitle className="text-sm font-medium leading-tight group-hover:text-blue-600 transition-colors pt-1">
                    {task.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        {task.dueDate && (
                            <>
                                <Calendar size={10} />
                                {format(new Date(task.dueDate), "dd.MM.")}
                            </>
                        )}
                    </div>

                    {/* AVATAR DESKTOP */}
                    {task.assignee ? (
                        <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                            <AvatarFallback className={`text-[10px] font-bold ${getUserColor(task.assignee.firstName || task.assignee.email)}`}>
                                {getInitials(task.assignee.firstName, task.assignee.lastName)}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="h-6 w-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
                            <User size={12} className="text-slate-300"/>
                        </div>
                    )}
                    </div>
            </CardContent>
        </Card>
    );
}

function getStatusColor(status: string) {
    if(status === 'DONE') return '#22c55e';
    if(status === 'IN_PROGRESS') return '#3b82f6';
    if(status === 'BLOCKED') return '#ef4444';
    return '#94a3b8';
}

function translateStatus(status: string) {
    if(status === 'OPEN') return 'Offen';
    if(status === 'IN_PROGRESS') return 'In Arbeit';
    if(status === 'DONE') return 'Erledigt';
    if(status === 'BLOCKED') return 'Blockiert';
    return status;
}