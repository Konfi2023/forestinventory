'use client';

import { useState } from 'react';
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logTime, deleteTimeEntry } from '@/actions/time-entries';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const CATEGORY_LABELS: Record<string, string> = {
  MANUAL_WORK:  'Handarbeit',
  MACHINE_WORK: 'Maschine',
  PLANNING:     'Planung',
  TRAVEL:       'Anfahrt',
  INSPECTION:   'Begehung',
};

function fmtMins(mins: number | null | undefined): string {
  if (!mins) return 'keine Schätzung';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface Props {
  taskId:        string;
  estimatedTime: number | null;
  timeEntries:   any[];
  currentUserId: string;
  onRefresh:     () => void;
}

export function TimeTrackingSection({ taskId, estimatedTime, timeEntries, currentUserId, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [hours,    setHours]    = useState('');
  const [category, setCategory] = useState('MANUAL_WORK');
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const entries     = timeEntries ?? [];
  const totalActual = entries.reduce((s: number, e: any) => s + (e.durationMinutes ?? 0), 0);
  const progress    = estimatedTime && estimatedTime > 0
    ? Math.min((totalActual / estimatedTime) * 100, 100)
    : null;
  const isOver = estimatedTime ? totalActual > estimatedTime : false;

  const handleLog = async () => {
    const h = parseFloat(hours);
    if (!h || h <= 0) { toast.error('Bitte gültige Stundenzahl eingeben'); return; }
    setSaving(true);
    try {
      await logTime(taskId, { date, durationMinutes: Math.round(h * 60), description: note || undefined, category });
      toast.success('Zeit gebucht');
      setHours(''); setNote(''); setShowForm(false);
    } catch {
      toast.error('Fehler beim Buchen');
      setSaving(false);
      return;
    }
    setSaving(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteTimeEntry(id);
      toast.success('Eintrag gelöscht');
    } catch {
      toast.error('Fehler');
      setDeleting(null);
      return;
    }
    setDeleting(null);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Zeiterfassung</span>
        </div>
        <Button size="sm" variant="ghost"
          className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-white/5 px-2"
          onClick={() => setShowForm(v => !v)}>
          <Plus size={13} className="mr-1" /> Eintrag
        </Button>
      </div>

      <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Geschätzt</span>
          <span className="text-white font-mono">{fmtMins(estimatedTime)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Gebucht</span>
          <span className={`font-mono font-semibold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
            {totalActual > 0 ? fmtMins(totalActual) : '0h'}
          </span>
        </div>
        {progress !== null && (
          <div className="space-y-1">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {isOver && estimatedTime && (
              <p className="text-[11px] text-red-400">+{fmtMins(totalActual - estimatedTime)} über Schätzung</p>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Datum</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="h-8 bg-black/30 border-white/10 text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Stunden</label>
              <Input type="number" min="0.25" step="0.25" placeholder="z.B. 2.5"
                value={hours} onChange={e => setHours(e.target.value)}
                className="h-8 bg-black/30 border-white/10 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Kategorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-8 bg-black/30 border border-white/10 rounded-md text-white text-sm px-2">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Notiz (optional)</label>
            <Input placeholder="Was wurde gemacht?" value={note} onChange={e => setNote(e.target.value)}
              className="h-8 bg-black/30 border-white/10 text-white text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleLog} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'Buchen'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}
              className="text-slate-400 h-8 text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-center gap-2 text-xs text-slate-400 group px-1">
              <span className="shrink-0 text-slate-500">
                {format(new Date(e.startTime), 'dd.MM.yy', { locale: de })}
              </span>
              <span className="font-mono text-white shrink-0">{fmtMins(e.durationMinutes)}</span>
              <span className="text-slate-600 shrink-0">{CATEGORY_LABELS[e.category] ?? e.category}</span>
              <span className="truncate flex-1">{e.description ?? ''}</span>
              <span className="text-slate-600 shrink-0">
                {e.user?.firstName ?? (e.user?.email ? e.user.email.split('@')[0] : '?')}
              </span>
              {e.userId === currentUserId && (
                <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                  className="opacity-0 group-hover:opacity-100 transition text-red-500 hover:text-red-400 shrink-0">
                  {deleting === e.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-xs text-slate-600 text-center py-2">Noch keine Zeiteinträge.</p>
      )}
    </div>
  );
}
