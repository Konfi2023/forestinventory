'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Loader2, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PathType } from '@/lib/path-recording';

const PathPreviewMap = dynamic(() => import('./PathPreviewMap').then(m => m.PathPreviewMap), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100" />,
});

const PATH_TYPES: { id: PathType; tKey: string; color: string }[] = [
  { id: 'ROAD',       tKey: 'pathTypeRoad',      color: '#94a3b8' },
  { id: 'SKID_TRAIL', tKey: 'pathTypeSkidTrail', color: '#eab308' },
  { id: 'WATER',      tKey: 'pathTypeWater',     color: '#3b82f6' },
  { id: 'PATH',       tKey: 'pathTypePath',      color: '#a16207' },
];

interface Props {
  points: [number, number][]; // [lat, lng]
  distanceM: number;
  durationSec: number;
  forestName: string;
  saving: boolean;
  errorMessage: string | null;
  onConfirm: (data: { name: string; type: PathType; note: string; color: string }) => void;
  onDiscard: () => void;
}

function formatLength(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PathConfirmSheet({
  points, distanceM, durationSec, forestName, saving, errorMessage,
  onConfirm, onDiscard,
}: Props) {
  const t = useTranslations('MobileApp');
  const [type, setType] = useState<PathType>('ROAD');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const config = PATH_TYPES.find(p => p.id === type)!;

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return [51, 10]; // Mittel-DE Fallback
    return points[Math.floor(points.length / 2)];
  }, [points]);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">{t('pathConfirmTitle')}</h2>
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
            aria-label={t('cancel')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Karten-Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-200 h-56 bg-slate-100">
            {points.length >= 2 ? (
              <PathPreviewMap points={points} center={center} color={config.color} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                {t('pathTooShort')}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-lg py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('pathDistance')}</p>
              <p className="text-base font-semibold text-slate-900">{formatLength(distanceM)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('pathDuration')}</p>
              <p className="text-base font-semibold text-slate-900">{formatDuration(durationSec)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('pathPoints')}</p>
              <p className="text-base font-semibold text-slate-900">{points.length}</p>
            </div>
          </div>

          {/* Wald */}
          <div className="text-xs text-slate-500">
            {t('pathForest')}: <span className="text-slate-700 font-medium">{forestName}</span>
          </div>

          {/* Wegtyp */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">{t('pathType')}</p>
            <div className="grid grid-cols-2 gap-2">
              {PATH_TYPES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setType(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    type === p.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  style={type === p.id ? { borderColor: p.color, backgroundColor: p.color + '15', color: p.color } : undefined}
                >
                  {t(p.tKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{t('pathName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('pathNamePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Notiz */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{t('notes')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            disabled={saving}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {t('discard')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ name: name.trim(), type, note: note.trim(), color: config.color })}
            disabled={saving || points.length < 2}
            className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> {t('saving')}</> : <><Check size={16} /> {t('savePath')}</>}
          </button>
        </div>
      </div>

      {/* Discard-Bestätigung */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-[10000] bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Trash2 size={18} className="text-rose-500" />
              {t('pathDiscardTitle')}
            </h3>
            <p className="text-sm text-slate-500 mb-5">{t('pathDiscardDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                {t('back')}
              </button>
              <button
                onClick={() => { setConfirmDiscard(false); onDiscard(); }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition-colors"
              >
                {t('discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
