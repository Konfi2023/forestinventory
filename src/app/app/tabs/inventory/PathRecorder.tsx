'use client';

import { useCallback, useEffect, useState } from 'react';
import { Route, Play, Square, MapPin, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { db } from '@/lib/inventory-db';
import { usePathRecorder, toGeoJsonLineString, findUnfinishedDraft, type PathType } from '@/lib/path-recording';
import { PathConfirmSheet } from './PathConfirmSheet';

interface Forest { id: string; name: string; }

interface Props {
  orgSlug: string;
  forests: Forest[];
  onCapturingChange?: (capturing: boolean) => void;
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

export function PathRecorder({ orgSlug, forests, onCapturingChange }: Props) {
  const t = useTranslations('MobileApp');
  const [forestId, setForestId]   = useState<string>(forests[0]?.id ?? '');
  const forest = forests.find(f => f.id === forestId) ?? forests[0];
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<'online' | 'offline' | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<{ id: number; lengthM: number; startedAt: string } | null>(null);

  const recorder = usePathRecorder({
    orgSlug,
    forestId: forest?.id ?? '',
    forestName: forest?.name ?? '',
  });

  // Beim Mount: nach unfertigem Draft suchen
  useEffect(() => {
    if (!orgSlug) return;
    let cancelled = false;
    findUnfinishedDraft(orgSlug).then(draft => {
      if (cancelled || !draft || draft.id == null) return;
      // Nur anzeigen, wenn nicht gerade aktiv aufgenommen wird (frischer Mount)
      if (recorder.status === 'idle') {
        setRecoveryDraft({ id: draft.id, lengthM: draft.lengthM, startedAt: draft.startedAt });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  // Capturing-Flag an AppShell melden (für Org-Switch-Schutz)
  useEffect(() => {
    onCapturingChange?.(recorder.status === 'recording');
  }, [recorder.status, onCapturingChange]);

  const handleSave = useCallback(async (data: { name: string; type: PathType; note: string; color: string }) => {
    if (!forest) return;
    setSaving(true);
    setSaveError(null);
    const geoJson = toGeoJsonLineString(
      recorder.points.map(([lat, lng]) => [lng, lat] as [number, number]),
    );
    const lengthM = Math.round(recorder.distanceM);

    try {
      const res = await fetch('/api/app/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          forestId: forest.id,
          type: data.type,
          name: data.name || null,
          color: data.color,
          geoJson,
          lengthM,
          note: data.note || null,
        }),
      });

      if (res.ok) {
        // IDB-Eintrag löschen (kein Bedarf mehr für offline-sync)
        if (recorder.pendingId != null) {
          try { await db.pendingPaths.delete(recorder.pendingId); } catch { /* ignore */ }
        }
        await recorder.markConfirmed();
        setSavedNotice('online');
        setSaving(false);
        return;
      }

      // Server-Fehler → als offline markieren und in IDB belassen
      const err = await res.json().catch(() => ({}));
      setSaveError(err?.error ?? `HTTP ${res.status}`);
      setSaving(false);
    } catch {
      // Netzwerkfehler → IDB-Eintrag als bestätigt markieren, sync später
      if (recorder.pendingId != null) {
        try {
          await db.pendingPaths.update(recorder.pendingId, {
            type: data.type,
            name: data.name || null,
            note: data.note || null,
            confirmed: true,
            synced: false,
            coordinates: recorder.points.map(([lat, lng]) => [lng, lat] as [number, number]),
            lengthM,
          });
        } catch { /* ignore */ }
      }
      await recorder.markConfirmed();
      setSavedNotice('offline');
      setSaving(false);
    }
  }, [forest, orgSlug, recorder]);

  const handleResumeDraft = useCallback(async () => {
    if (!recoveryDraft) return;
    // Vereinfachung: Draft als „abgeschlossen" markieren, nicht weiteraufnehmen.
    // Das User-Mental-Model nach Crash/Reload: „mein letzter Weg ist noch da, aber GPS-Aufnahme läuft nicht mehr."
    try { await db.pendingPaths.delete(recoveryDraft.id); } catch { /* ignore */ }
    setRecoveryDraft(null);
  }, [recoveryDraft]);

  const handleDiscardDraft = useCallback(async () => {
    if (!recoveryDraft) return;
    try { await db.pendingPaths.delete(recoveryDraft.id); } catch { /* ignore */ }
    setRecoveryDraft(null);
  }, [recoveryDraft]);

  // ── UI ────────────────────────────────────────────────────────────────────
  if (forests.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        {t('pathNoForests')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Wald-Auswahl (nur wenn idle) */}
      {recorder.status === 'idle' && (
        <div className="p-4 border-b border-slate-200">
          <label className="text-xs font-medium text-slate-500 mb-2 block">{t('pathForestPick')}</label>
          <select
            value={forestId}
            onChange={(e) => setForestId(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
          >
            {forests.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recovery-Banner */}
      {recoveryDraft && recorder.status === 'idle' && (
        <div className="m-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">{t('pathRecoveryTitle')}</p>
              <p className="text-amber-700 mt-0.5">
                {t('pathRecoveryDesc', {
                  length: formatLength(recoveryDraft.lengthM),
                  date: new Date(recoveryDraft.startedAt).toLocaleString(),
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleDiscardDraft}
              className="flex-1 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-semibold"
            >
              {t('discard')}
            </button>
            <button
              onClick={handleResumeDraft}
              className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold"
            >
              {t('pathRecoveryAck')}
            </button>
          </div>
        </div>
      )}

      {/* Hauptbereich */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Status-Anzeige */}
        <div className="text-center">
          <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-3 ${
            recorder.status === 'recording'
              ? 'bg-rose-100 ring-4 ring-rose-200 animate-pulse'
              : 'bg-emerald-100'
          }`}>
            <Route size={40} className={recorder.status === 'recording' ? 'text-rose-600' : 'text-emerald-600'} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {recorder.status === 'idle'      && t('pathReady')}
            {recorder.status === 'recording' && t('pathRecording')}
            {recorder.status === 'confirming' && t('pathStopped')}
          </h2>
          {recorder.status === 'idle' && (
            <p className="text-xs text-slate-500 mt-1">{t('pathReadyDesc')}</p>
          )}
        </div>

        {/* Live-Stats während Aufnahme */}
        {recorder.status === 'recording' && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('pathDistance')}</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatLength(recorder.distanceM)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('pathDuration')}</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatDuration(recorder.durationSec)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center col-span-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('pathPointsAndAccuracy')}</p>
              <p className="text-base font-semibold text-slate-900">
                {recorder.points.length} <span className="text-slate-400">·</span>{' '}
                <span className={recorder.lastAccuracy != null && recorder.lastAccuracy > 30 ? 'text-amber-600' : 'text-emerald-600'}>
                  {recorder.lastAccuracy != null ? `±${Math.round(recorder.lastAccuracy)} m` : '—'}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Fehleranzeige */}
        {recorder.error && recorder.status === 'recording' && (
          <div className="w-full max-w-xs p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center">
            <AlertTriangle size={14} className="inline mr-1" />
            {recorder.error.code === 'denied' && t('gpsDenied')}
            {recorder.error.code === 'timeout' && t('gpsTimeout')}
            {recorder.error.code === 'unavailable' && t('gpsUnavailable')}
            {recorder.error.code === 'unknown' && recorder.error.message}
          </div>
        )}

        {/* Save-Notice */}
        {savedNotice && (
          <div className={`w-full max-w-xs p-3 rounded-xl text-xs text-center ${
            savedNotice === 'online'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            {savedNotice === 'online' ? t('pathSavedOnline') : t('pathSavedOffline')}
          </div>
        )}

        {/* Aktions-Button */}
        <div className="w-full max-w-xs">
          {recorder.status === 'idle' && (
            <button
              onClick={() => { setSavedNotice(null); recorder.start(); }}
              disabled={!forest}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Play size={18} /> {t('pathStart')}
            </button>
          )}
          {recorder.status === 'recording' && (
            <button
              onClick={recorder.stop}
              className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Square size={18} fill="currentColor" /> {t('pathStop')}
            </button>
          )}
          {recorder.status === 'confirming' && (
            <p className="text-center text-xs text-slate-400">
              <Loader2 size={14} className="inline animate-spin mr-1" />
              {t('pathPreparingConfirm')}
            </p>
          )}
        </div>

        {/* Wald-Hinweis während Aufnahme */}
        {recorder.status === 'recording' && forest && (
          <p className="text-xs text-slate-500 text-center">
            <MapPin size={11} className="inline mr-1" />
            {forest.name}
          </p>
        )}
      </div>

      {/* Bestätigungs-Sheet */}
      {recorder.status === 'confirming' && (
        <PathConfirmSheet
          points={recorder.points}
          distanceM={recorder.distanceM}
          durationSec={recorder.durationSec}
          forestName={forest?.name ?? ''}
          saving={saving}
          errorMessage={saveError}
          onConfirm={handleSave}
          onDiscard={() => { setSavedNotice(null); recorder.discard(); }}
        />
      )}
    </div>
  );
}
