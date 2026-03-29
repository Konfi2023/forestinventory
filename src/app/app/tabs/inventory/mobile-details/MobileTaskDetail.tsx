'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, MapPin, Navigation, ExternalLink, Loader2, User, AlertCircle } from 'lucide-react';
import { updateTaskStatus } from '@/actions/tasks';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TODO:        { label: 'Offen',        color: 'bg-slate-200 text-slate-700' },
  IN_PROGRESS: { label: 'In Arbeit',    color: 'bg-blue-100 text-blue-700' },
  BLOCKED:     { label: 'Blockiert',     color: 'bg-red-100 text-red-700' },
  DONE:        { label: 'Erledigt',      color: 'bg-green-100 text-green-700' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  LOW:    { label: 'Niedrig', color: 'text-slate-400' },
  MEDIUM: { label: 'Normal',  color: 'text-blue-500' },
  HIGH:   { label: 'Hoch',    color: 'text-orange-500' },
  URGENT: { label: 'Dringend', color: 'text-red-500' },
};

interface Props {
  task: any;
  orgSlug: string;
  onRefresh: () => void;
}

export function MobileTaskDetail({ task, orgSlug, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);
  const statusInfo = STATUS_LABELS[task.status] ?? STATUS_LABELS.TODO;
  const priorityInfo = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.MEDIUM;
  const isDone = task.status === 'DONE';

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      await updateTaskStatus(orgSlug, task.id, newStatus as any);
      toast.success(newStatus === 'DONE' ? 'Aufgabe erledigt!' : 'Status aktualisiert');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Aktualisieren');
    }
    setSaving(false);
  };

  const navigateToLocation = () => {
    if (task.lat && task.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDone ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isDone ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-blue-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900">{task.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className={`text-xs font-medium ${priorityInfo.color}`}>
              {priorityInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Beschreibung */}
      {task.description && (
        <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{task.description}</p>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {task.dueDate && (
          <div className="bg-slate-50 px-3 py-2 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Fällig</p>
            <p className="text-slate-800 font-medium">{format(new Date(task.dueDate), 'dd.MM.yyyy', { locale: de })}</p>
          </div>
        )}
        {task.assignee && (
          <div className="bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <User className="w-3 h-3 text-slate-400" />
            <p className="text-slate-800 font-medium text-sm truncate">{task.assignee.name || task.assignee.email}</p>
          </div>
        )}
      </div>

      {/* Koordinaten + Navigation */}
      {task.lat && task.lng && (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded-lg">
            <MapPin className="w-3 h-3 shrink-0" />
            {task.lat.toFixed(6)}, {task.lng.toFixed(6)}
          </div>
          <button
            onClick={navigateToLocation}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl font-medium text-sm transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Navigieren
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </button>
        </>
      )}

      {/* Status-Buttons */}
      {!isDone && (
        <div className="space-y-2">
          <button
            onClick={() => handleStatusChange('DONE')}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Als erledigt markieren
          </button>
          {task.status === 'TODO' && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 text-blue-700 rounded-xl font-medium text-sm transition-colors"
            >
              In Arbeit setzen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
