'use client';

import { useState, useRef } from 'react';
import { Download, Loader2, Check, X } from 'lucide-react';
import { precacheTiles, estimateTileCount, type PrecacheProgress } from '@/lib/tile-precacher';
import { toast } from 'sonner';

interface Props {
  bounds: { south: number; north: number; west: number; east: number } | null;
}

export function OfflineMapButton({ bounds }: Props) {
  const [progress, setProgress] = useState<PrecacheProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isDownloading = progress !== null && !progress.done;

  const handleDownload = async () => {
    if (!bounds) {
      toast.error('Kein Waldgebiet ausgewählt');
      return;
    }

    const count = estimateTileCount(bounds);
    if (count > 5000) {
      toast.error(`Zu viele Kacheln (${count}). Bitte näher heranzoomen.`);
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await precacheTiles(bounds, setProgress, 10, 16, abort.signal);
      if (!abort.signal.aborted) {
        toast.success('Karte offline verfügbar!');
      }
    } catch {
      if (!abort.signal.aborted) {
        toast.error('Download fehlgeschlagen');
      }
    }

    setTimeout(() => setProgress(null), 2000);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setProgress(null);
  };

  if (isDownloading) {
    const pct = progress.total > 0 ? Math.round((progress.cached / progress.total) * 100) : 0;
    return (
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border bg-white/90 backdrop-blur-md border-slate-200 text-slate-700 text-xs font-medium"
      >
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        {pct}%
        <X className="w-3.5 h-3.5 text-slate-400" />
      </button>
    );
  }

  if (progress?.done) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border bg-emerald-50 border-emerald-200 text-emerald-700 text-xs font-medium">
        <Check className="w-4 h-4" />
        Offline bereit
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xl border bg-white/90 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-white active:bg-slate-100 transition-all"
      title="Karte offline speichern"
    >
      <Download className="w-5 h-5" />
    </button>
  );
}
