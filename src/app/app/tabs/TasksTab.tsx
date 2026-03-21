'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, X, CheckCircle2, CircleDot, CircleOff, Eye, RefreshCw,
  Camera, Calendar, List, AlertTriangle, Clock, CalendarDays,
} from 'lucide-react';
import { DatePickerSheet, DateTrigger } from './DatePickerSheet';

interface Member { id: string; firstName: string | null; lastName: string | null; email: string; }
interface Forest { id: string; name: string; }
interface Task {
  id: string; title: string; status: string; priority: string;
  dueDate: string | null; assignee: Member | null; forest: { id: string; name: string };
}

type Filter = 'ALL' | 'MINE' | 'OPEN' | 'DONE';
type ViewMode = 'calendar' | 'list';

type LucideIcon = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

const STATUS_CONFIG: Record<string, { label: string; textColor: string; bgColor: string; Icon: LucideIcon }> = {
  OPEN:        { label: 'Offen',     textColor: '#94a3b8', bgColor: 'rgba(51,65,85,0.6)',   Icon: CircleDot },
  IN_PROGRESS: { label: 'In Arbeit', textColor: '#60a5fa', bgColor: 'rgba(30,58,138,0.4)',  Icon: RefreshCw },
  REVIEW:      { label: 'Review',    textColor: '#c084fc', bgColor: 'rgba(88,28,135,0.4)',  Icon: Eye },
  BLOCKED:     { label: 'Blockiert', textColor: '#f87171', bgColor: 'rgba(127,29,29,0.4)',  Icon: CircleOff },
  DONE:        { label: 'Erledigt',  textColor: '#34d399', bgColor: 'rgba(6,78,59,0.4)',    Icon: CheckCircle2 },
};

// Feste Farben als inline-style – umgeht Tailwind-Purge bei dynamischen Klassen
const PRIORITY_BORDER_COLOR: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH:   '#fb923c',
  MEDIUM: '#facc15',
  LOW:    '#475569',
};

const STATUS_CYCLE: Record<string, string> = {
  OPEN: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE', DONE: 'OPEN', BLOCKED: 'OPEN',
};

function memberName(m: Member | null) {
  if (!m) return null;
  return m.firstName ? `${m.firstName} ${m.lastName ?? ''}`.trim() : m.email;
}

interface DateGroup {
  key: string;
  label: string;
  Icon: LucideIcon;
  iconColor: string;
  tasks: Task[];
}

// Nur client-seitig aufgerufen (nach mount), kein Hydration-Problem
function groupByDate(tasks: Task[]): DateGroup[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const groups: DateGroup[] = [
    { key: 'overdue', label: 'Überfällig',  Icon: AlertTriangle, iconColor: '#f87171', tasks: [] },
    { key: 'today',   label: 'Heute',       Icon: Clock,         iconColor: '#fbbf24', tasks: [] },
    { key: 'week',    label: 'Diese Woche', Icon: Calendar,      iconColor: '#60a5fa', tasks: [] },
    { key: 'later',   label: 'Später',      Icon: CalendarDays,  iconColor: '#94a3b8', tasks: [] },
    { key: 'nodate',  label: 'Kein Datum',  Icon: CircleDot,     iconColor: '#64748b', tasks: [] },
  ];

  for (const task of tasks) {
    if (!task.dueDate) { groups[4].tasks.push(task); continue; }
    const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
    if (due < today)         groups[0].tasks.push(task);
    else if (due < tomorrow) groups[1].tasks.push(task);
    else if (due < nextWeek) groups[2].tasks.push(task);
    else                     groups[3].tasks.push(task);
  }

  return groups.filter(g => g.tasks.length > 0);
}

interface TasksTabProps {
  tasks: Task[];
  forests: Forest[];
  members: Member[];
  orgSlug: string;
  currentUserId: string;
  onTasksChange: () => Promise<void>;
}

export function TasksTab({ tasks, forests, members, orgSlug, currentUserId }: TasksTabProps) {
  const [filter, setFilter]       = useState<Filter>('ALL');
  const [viewMode, setViewMode]   = useState<ViewMode>('calendar');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cycleError, setCycleError] = useState<string | null>(null);
  // mounted verhindert Hydration-Fehler durch new Date() im SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prop-Sync über useEffect – kein State-Update im Render-Pfad (Race Condition)
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const filtered = useMemo(() => localTasks.filter(t => {
    if (filter === 'MINE') return t.assignee?.id === currentUserId;
    if (filter === 'OPEN') return t.status === 'OPEN';
    if (filter === 'DONE') return t.status === 'DONE';
    return true;
  }), [localTasks, filter, currentUserId]);

  // Gruppen nur client-seitig berechnen
  const groups = useMemo(
    () => (mounted && viewMode === 'calendar') ? groupByDate(filtered) : null,
    [mounted, viewMode, filtered],
  );

  const cycleStatus = useCallback(async (task: Task) => {
    const newStatus = STATUS_CYCLE[task.status] ?? 'OPEN';
    setCycleError(null);

    // Optimistisches Update – sofort sichtbar
    const optimistic = { ...task, status: newStatus };
    setLocalTasks(ts => ts.map(t => t.id === task.id ? optimistic : t));
    if (selectedTask?.id === task.id) setSelectedTask(optimistic);
    setUpdatingId(task.id);

    try {
      const res = await fetch(`/api/app/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const { task: updated } = await res.json();
        setLocalTasks(ts => ts.map(t => t.id === task.id ? updated : t));
        if (selectedTask?.id === task.id) setSelectedTask(updated);
      } else {
        // Rollback bei Server-Fehler
        setLocalTasks(ts => ts.map(t => t.id === task.id ? task : t));
        if (selectedTask?.id === task.id) setSelectedTask(task);
        setCycleError('Status konnte nicht gespeichert werden.');
      }
    } catch {
      // Rollback bei Netzwerkfehler
      setLocalTasks(ts => ts.map(t => t.id === task.id ? task : t));
      if (selectedTask?.id === task.id) setSelectedTask(task);
      setCycleError('Offline – Status nicht gespeichert.');
    }
    setUpdatingId(null);
  }, [selectedTask]);

  return (
    <div className="relative flex flex-col h-full w-full">

      {/* ── Toolbar ── */}
      <div className="shrink-0 w-full bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-3 space-y-3">

        {/* Filter-Chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {([
            ['ALL',  `Alle (${localTasks.length})`],
            ['MINE', 'Meine'],
            ['OPEN', 'Offen'],
            ['DONE', 'Erledigt'],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 px-5 py-3 rounded-full text-sm font-semibold transition-colors ${
                filter === key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* View-Toggle – volle Breite, große Tap-Fläche */}
        <div className="flex w-full rounded-xl bg-slate-800 p-1 gap-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === 'calendar' ? 'bg-slate-600 text-white' : 'text-slate-500 active:bg-slate-700'
            }`}
          >
            <Calendar size={17} /> Kalender
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-500 active:bg-slate-700'
            }`}
          >
            <List size={17} /> Liste
          </button>
        </div>
      </div>

      {/* Fehler-Banner (z.B. nach Status-Update) */}
      {cycleError && (
        <div className="shrink-0 mx-4 mt-2 px-4 py-3 bg-red-900/60 border border-red-700 rounded-xl flex items-center justify-between gap-3">
          <span className="text-sm text-red-300">{cycleError}</span>
          <button onClick={() => setCycleError(null)} className="text-red-400 shrink-0 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Aufgaben-Liste ── */}
      <div className="flex-1 w-full overflow-y-auto px-4 pb-28 pt-4 space-y-4">

        {filtered.length === 0 && (
          <p className="text-center text-slate-500 pt-16">Keine Aufgaben.</p>
        )}

        {/* Kalender-Ansicht: nach Datum gruppiert */}
        {viewMode === 'calendar' && mounted && groups && groups.map(group => {
          const GroupIcon = group.Icon;
          return (
            <div key={group.key} className="w-full">
              {/* Gruppen-Header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <GroupIcon size={16} style={{ color: group.iconColor }} />
                <span className="text-sm font-bold" style={{ color: group.iconColor }}>
                  {group.label}
                </span>
                <span className="text-xs text-slate-600 font-medium">{group.tasks.length}</span>
              </div>
              <div className="space-y-2 w-full">
                {group.tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    updatingId={updatingId}
                    onCycle={cycleStatus}
                    onOpen={setSelectedTask}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Listen-Ansicht: flach */}
        {viewMode === 'list' && (
          <div className="space-y-2 w-full">
            {filtered.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                updatingId={updatingId}
                onCycle={cycleStatus}
                onOpen={setSelectedTask}
              />
            ))}
          </div>
        )}

        {/* Kalender-Ansicht vor mount: zeige flache Liste (kein Hydration-Flash) */}
        {viewMode === 'calendar' && !mounted && (
          <div className="space-y-2 w-full">
            {filtered.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                updatingId={updatingId}
                onCycle={cycleStatus}
                onOpen={setSelectedTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="absolute bottom-20 right-4 w-16 h-16 bg-emerald-600 active:bg-emerald-500 rounded-full flex items-center justify-center shadow-xl z-10"
      >
        <Plus size={30} />
      </button>

      {selectedTask && (
        <Sheet onClose={() => setSelectedTask(null)}>
          <TaskDetail task={selectedTask} onStatusChange={cycleStatus} updatingId={updatingId} />
        </Sheet>
      )}

      {showCreate && (
        <Sheet onClose={() => setShowCreate(false)}>
          <CreateTaskForm
            forests={forests}
            members={members}
            orgSlug={orgSlug}
            onCreated={task => { setLocalTasks(ts => [task, ...ts]); setShowCreate(false); onTasksChange?.(); }}
          />
        </Sheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------
function TaskCard({ task, updatingId, onCycle, onOpen }: {
  task: Task;
  updatingId: string | null;
  onCycle: (t: Task) => void;
  onOpen: (t: Task) => void;
}) {
  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.OPEN;
  const StatusIcon = cfg.Icon;
  const isDone = task.status === 'DONE';
  const borderColor = PRIORITY_BORDER_COLOR[task.priority] ?? '#475569';
  const assignee = memberName(task.assignee);

  return (
    <div
      className="w-full bg-slate-800 rounded-xl overflow-hidden"
      style={{ borderLeft: `5px solid ${borderColor}` }}
    >
      <div className="flex items-stretch w-full">
        {/* Status-Button – hohe Touch-Fläche */}
        <button
          onClick={() => onCycle(task)}
          disabled={updatingId === task.id}
          className="flex items-center justify-center w-16 shrink-0 active:bg-slate-700 transition-colors disabled:opacity-50"
          style={{ color: cfg.textColor }}
        >
          <StatusIcon size={26} className={updatingId === task.id ? 'animate-spin' : ''} />
        </button>

        {/* Inhalt – zum Öffnen */}
        <button
          className="flex-1 text-left px-3 py-4 min-w-0"
          onClick={() => onOpen(task)}
        >
          <p className={`text-base font-semibold leading-snug ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
            <span className="text-sm text-slate-400">{task.forest.name}</span>
            {assignee && <span className="text-sm text-slate-400">{assignee}</span>}
            {task.dueDate && (
              <span className="text-sm text-slate-400">
                {new Date(task.dueDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <span
            className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: cfg.textColor, backgroundColor: cfg.bgColor }}
          >
            {cfg.label}
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------
function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>
        <div className="flex justify-end px-4">
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="px-4 pb-12">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Detail
// ---------------------------------------------------------------------------
function TaskDetail({ task, onStatusChange, updatingId }: {
  task: Task;
  onStatusChange: (t: Task) => void;
  updatingId: string | null;
}) {
  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.OPEN;
  const StatusIcon = cfg.Icon;
  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/app/tasks/${task.id}/image`)
      .then(r => r.ok ? r.json() : { images: [] })
      .then(d => setImages(d.images ?? []));
  }, [task.id]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/app/tasks/${task.id}/image`, { method: 'POST', body: fd });
      if (res.ok) {
        const { image } = await res.json();
        setImages(prev => [...prev, image]);
      }
    } catch { /* ignore */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 leading-snug">{task.title}</h2>

      {/* Status-Button – volle Breite */}
      <button
        onClick={() => onStatusChange(task)}
        disabled={updatingId === task.id}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl mb-5 font-semibold text-base active:opacity-70 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: cfg.bgColor, color: cfg.textColor }}
      >
        <StatusIcon size={22} className={updatingId === task.id ? 'animate-spin' : ''} />
        {cfg.label}
        <span className="text-xs opacity-60 font-normal">→ tippen zum Weiterschalten</span>
      </button>

      <div className="mb-6 space-y-0">
        <Row label="Wald" value={task.forest.name} />
        <Row label="Zugewiesen" value={memberName(task.assignee) ?? '–'} />
        <Row label="Priorität" value={
          task.priority === 'URGENT' ? 'Dringend'
          : task.priority === 'HIGH' ? 'Hoch'
          : task.priority === 'LOW'  ? 'Niedrig' : 'Mittel'
        } />
        {task.dueDate && (
          <Row label="Fällig" value={
            new Date(task.dueDate).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
          } />
        )}
      </div>

      {/* Fotos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-300">Fotos</span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 rounded-xl text-sm text-emerald-400 disabled:opacity-50 active:bg-slate-700"
          >
            <Camera size={16} />{uploading ? 'Lädt hoch…' : 'Foto hinzufügen'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {images.map(img => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.url} alt={img.name} className="w-full aspect-square object-cover rounded-lg bg-slate-800" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 text-center py-6">Noch keine Fotos</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-800">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Task Form
// ---------------------------------------------------------------------------
function CreateTaskForm({ forests, members, orgSlug, onCreated }: {
  forests: Forest[];
  members: Member[];
  orgSlug: string;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle]           = useState('');
  const [forestId, setForestId]     = useState(forests[0]?.id ?? '');
  const [priority, setPriority]     = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate]       = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photo, setPhoto]           = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!title.trim() || !forestId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/app/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug, title: title.trim(), forestId, priority, assigneeId: assigneeId || undefined, dueDate: dueDate || undefined }),
      });
      if (res.ok) {
        const { task } = await res.json();
        if (photo) {
          const fd = new FormData();
          fd.append('file', photo);
          await fetch(`/api/app/tasks/${task.id}/image`, { method: 'POST', body: fd });
        }
        onCreated(task);
      }
    } catch { /* Offline */ }
    setSaving(false);
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Neue Aufgabe</h2>
      <div className="space-y-5">

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Titel *</label>
          <input
            type="text" placeholder="Was muss erledigt werden?" value={title}
            onChange={e => setTitle(e.target.value)} autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Wald *</label>
          <select value={forestId} onChange={e => setForestId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-base text-white focus:outline-none focus:border-emerald-500">
            {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Priorität</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['LOW', 'Niedrig', '#475569'], ['MEDIUM', 'Mittel', '#ca8a04'],
              ['HIGH', 'Hoch', '#ea580c'],   ['URGENT', 'Dringend', '#dc2626'],
            ] as [string, string, string][]).map(([val, label, color]) => (
              <button key={val} onClick={() => setPriority(val)}
                className="py-3.5 rounded-xl text-sm font-semibold transition-all"
                style={priority === val
                  ? { backgroundColor: color, color: '#fff' }
                  : { backgroundColor: 'rgb(30 41 59)', color: '#94a3b8' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {members.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Zuweisen an</label>
            <div className="space-y-2">
              <button onClick={() => setAssigneeId('')}
                className={`w-full text-left px-4 py-3.5 rounded-xl text-base transition-colors ${assigneeId === '' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                Nicht zugewiesen
              </button>
              {members.map(m => (
                <button key={m.id} onClick={() => setAssigneeId(m.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl text-base transition-colors ${assigneeId === m.id ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {memberName(m)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Fällig am</label>
          <DateTrigger value={dueDate} placeholder="Kein Datum gewählt" onClick={() => setShowDatePicker(true)} />
          {showDatePicker && (
            <DatePickerSheet
              value={dueDate}
              label="Fälligkeitsdatum"
              onChange={setDueDate}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Foto (optional)</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Vorschau" className="w-full h-48 object-cover rounded-xl" />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-2 text-white">
                <X size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-5 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl text-base text-slate-400 active:bg-slate-700">
              <Camera size={22} /> Foto aufnehmen
            </button>
          )}
        </div>

        <button onClick={submit} disabled={!title.trim() || !forestId || saving}
          className="w-full py-4 bg-emerald-600 active:bg-emerald-500 disabled:opacity-40 rounded-xl text-base font-bold transition-colors">
          {saving ? 'Wird gespeichert…' : 'Aufgabe anlegen'}
        </button>
      </div>
    </div>
  );
}
