'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Snapshot } from './computeInsights';

interface AiReport {
  status: 'green' | 'yellow' | 'red';
  headline: string;
  summary: string;
  takeaways: string[];
}

const STATUS_CONFIG = {
  green:  { emoji: '🟢', label: 'Gut',      bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' },
  yellow: { emoji: '🟡', label: 'Neutral',  bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700'   },
  red:    { emoji: '🔴', label: 'Kritisch', bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-100 text-red-700'       },
};

export function ForestAiReport({ forestName, forestId, snapshots }: { forestName: string; forestId: string; snapshots: Snapshot[] }) {
  const [report, setReport]   = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/biomass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forestName, forestId, snapshots }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Fehler ${res.status}`);
      }
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cfg = report ? STATUS_CONFIG[report.status] : null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-3',
        cfg ? cn(cfg.bg, cfg.border, 'border-b') : 'bg-slate-50 border-b border-slate-200',
      )}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className={cfg ? cfg.text : 'text-slate-400'} />
          <span className={cn('text-xs font-bold uppercase tracking-wider', cfg ? cfg.text : 'text-slate-500')}>
            KI-Vitalitätsanalyse
          </span>
          {cfg && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', cfg.badge)}>
              {cfg.emoji} {cfg.label}
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all',
            report
              ? 'border-slate-200 text-slate-500 hover:border-slate-400 bg-white'
              : 'border-slate-800 bg-slate-800 text-white hover:bg-slate-700',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analysiere…' : report ? 'Aktualisieren' : 'Analyse starten'}
        </button>
      </div>

      {/* Content */}
      {!report && !loading && !error && (
        <div className="px-5 py-6 text-center">
          <Sparkles size={24} className="mx-auto text-slate-200 mb-2" />
          <p className="text-xs text-slate-400">
            GPT-4o analysiert NDVI-Trend, Jahresvergleich und Saisonalität
            und gibt eine forstwirtschaftliche Einschätzung.
          </p>
        </div>
      )}

      {loading && (
        <div className="px-5 py-6 flex items-center justify-center gap-3 text-sm text-slate-400">
          <RefreshCw size={16} className="animate-spin text-emerald-500" />
          GPT-4o wertet die Daten aus…
        </div>
      )}

      {error && (
        <div className="px-5 py-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {report && cfg && !loading && (
        <div className={cn('p-5 space-y-4', cfg.bg)}>
          {/* Headline */}
          <h4 className={cn('font-bold text-base', cfg.text)}>
            {cfg.emoji} {report.headline}
          </h4>

          {/* Summary */}
          <p className="text-sm text-slate-700 leading-relaxed">
            {report.summary}
          </p>

          {/* Takeaways */}
          <div className="space-y-1.5 pt-1 border-t border-white/60">
            {report.takeaways.map((t, i) => (
              <p key={i} className="text-xs text-slate-600 leading-snug">{t}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
