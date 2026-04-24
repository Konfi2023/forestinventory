'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { db, type PendingPath } from './inventory-db';
import { watchPosition, type WatchedPosition } from './capacitor-bridge';

export type PathType = 'ROAD' | 'SKID_TRAIL' | 'WATER';
export type RecorderStatus = 'idle' | 'recording' | 'confirming';

export interface RecorderError {
  code: 'denied' | 'unavailable' | 'timeout' | 'unknown';
  message: string;
}

const ACCURACY_THRESHOLD_M = 30;   // Punkte mit schlechterer Genauigkeit verwerfen
const MIN_DISTANCE_M       = 4;    // Mindestabstand zwischen zwei akzeptierten Punkten (Anti-Jitter)
const PERSIST_INTERVAL_MS  = 10_000; // Alle 10 s nach IndexedDB schreiben

/**
 * Haversine-Distanz in Metern.
 */
function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface UseRecorderArgs {
  orgSlug: string;
  forestId: string;
  forestName: string;
}

export interface PathRecorder {
  status: RecorderStatus;
  points: [number, number][];        // [lat, lng] für Leaflet
  distanceM: number;
  durationSec: number;
  lastAccuracy: number | null;
  error: RecorderError | null;
  pendingId: number | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  discard: () => Promise<void>;
  markConfirmed: () => Promise<void>;
}

export function usePathRecorder({ orgSlug, forestId, forestName }: UseRecorderArgs): PathRecorder {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<RecorderError | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  // Refs für Werte, die im watchPosition-Callback aktuell bleiben müssen
  const pointsRef = useRef<[number, number][]>([]);
  const distanceRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const pendingIdRef = useRef<number | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<any>(null);
  const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── interner Persistor: schreibt aktuellen Stand in pendingPaths ────────────
  const persist = useCallback(async () => {
    if (!pendingIdRef.current || !startedAtRef.current) return;
    try {
      await db.pendingPaths.update(pendingIdRef.current, {
        coordinates: pointsRef.current.map(([lat, lng]) => [lng, lat] as [number, number]),
        lengthM: Math.round(distanceRef.current),
      });
    } catch (e) {
      console.warn('[path-recording] persist error:', e);
    }
  }, []);

  // ── Cleanup-Helper ──────────────────────────────────────────────────────────
  const cleanupTimers = useCallback(() => {
    if (persistTimerRef.current) { clearInterval(persistTimerRef.current); persistTimerRef.current = null; }
    if (tickTimerRef.current)    { clearInterval(tickTimerRef.current);    tickTimerRef.current    = null; }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch { /* ignore */ }
      wakeLockRef.current = null;
    }
  }, []);

  const teardownWatch = useCallback(() => {
    if (stopWatchRef.current) {
      stopWatchRef.current();
      stopWatchRef.current = null;
    }
  }, []);

  // ── Public: start ───────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setError(null);
    setPoints([]);
    setDistanceM(0);
    setDurationSec(0);
    setLastAccuracy(null);
    pointsRef.current = [];
    distanceRef.current = 0;
    const now = Date.now();
    startedAtRef.current = now;

    // Neuen Draft in IDB anlegen
    let id: number;
    try {
      id = await db.pendingPaths.add({
        orgSlug,
        forestId,
        forestName,
        type: 'ROAD',
        name: null,
        note: null,
        coordinates: [],
        lengthM: 0,
        startedAt: new Date(now).toISOString(),
        stoppedAt: null,
        confirmed: false,
        synced: false,
      });
    } catch (e) {
      console.error('[path-recording] IDB add failed:', e);
      setError({ code: 'unknown', message: 'Lokaler Speicher nicht verfügbar' });
      return;
    }
    pendingIdRef.current = id;
    setPendingId(id);

    // Wake Lock anfordern (Screen bleibt wach)
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch { /* nicht kritisch */ }
    }

    // GPS-Watch starten
    try {
      stopWatchRef.current = await watchPosition(
        (pos: WatchedPosition) => {
          // Genauigkeitsfilter
          if (pos.accuracy > ACCURACY_THRESHOLD_M) {
            setLastAccuracy(pos.accuracy);
            return;
          }
          const next: [number, number] = [pos.lat, pos.lng];
          const last = pointsRef.current[pointsRef.current.length - 1];

          // Mindestabstandsfilter (gegen Jitter im Stand)
          if (last) {
            const d = haversineM(last, next);
            if (d < MIN_DISTANCE_M) {
              setLastAccuracy(pos.accuracy);
              return;
            }
            distanceRef.current += d;
          }

          pointsRef.current = [...pointsRef.current, next];
          setPoints(pointsRef.current);
          setDistanceM(distanceRef.current);
          setLastAccuracy(pos.accuracy);
        },
        (err) => {
          if (err.code === 1) setError({ code: 'denied', message: err.message });
          else if (err.code === 3) setError({ code: 'timeout', message: err.message });
          else setError({ code: 'unavailable', message: err.message });
        },
      );
    } catch (e: any) {
      setError({ code: 'unavailable', message: e?.message ?? 'GPS-Fehler' });
      return;
    }

    // Periodischer IDB-Backup
    persistTimerRef.current = setInterval(() => { void persist(); }, PERSIST_INTERVAL_MS);
    // Sekunden-Tick für Anzeige
    tickTimerRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);

    setStatus('recording');
  }, [orgSlug, forestId, forestName, persist]);

  // ── Public: stop ────────────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    teardownWatch();
    cleanupTimers();
    await releaseWakeLock();

    if (pendingIdRef.current) {
      try {
        await db.pendingPaths.update(pendingIdRef.current, {
          coordinates: pointsRef.current.map(([lat, lng]) => [lng, lat] as [number, number]),
          lengthM: Math.round(distanceRef.current),
          stoppedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[path-recording] stop persist error:', e);
      }
    }
    setStatus('confirming');
  }, [teardownWatch, cleanupTimers, releaseWakeLock]);

  // ── Public: discard ─────────────────────────────────────────────────────────
  const discard = useCallback(async () => {
    teardownWatch();
    cleanupTimers();
    await releaseWakeLock();
    if (pendingIdRef.current) {
      try { await db.pendingPaths.delete(pendingIdRef.current); } catch { /* ignore */ }
    }
    pendingIdRef.current = null;
    pointsRef.current = [];
    distanceRef.current = 0;
    startedAtRef.current = null;
    setPendingId(null);
    setPoints([]);
    setDistanceM(0);
    setDurationSec(0);
    setLastAccuracy(null);
    setError(null);
    setStatus('idle');
  }, [teardownWatch, cleanupTimers, releaseWakeLock]);

  // ── Public: markConfirmed ───────────────────────────────────────────────────
  // Wird aufgerufen, NACHDEM der Sync (oder lokales Speichern) erfolgreich war.
  const markConfirmed = useCallback(async () => {
    pendingIdRef.current = null;
    pointsRef.current = [];
    distanceRef.current = 0;
    startedAtRef.current = null;
    setPendingId(null);
    setPoints([]);
    setDistanceM(0);
    setDurationSec(0);
    setLastAccuracy(null);
    setError(null);
    setStatus('idle');
  }, []);

  // Beim Unmount: Watch + Timer stoppen, aber Draft NICHT löschen (Recovery)
  useEffect(() => {
    return () => {
      teardownWatch();
      cleanupTimers();
      void releaseWakeLock();
    };
  }, [teardownWatch, cleanupTimers, releaseWakeLock]);

  return {
    status, points, distanceM, durationSec, lastAccuracy, error, pendingId,
    start, stop, discard, markConfirmed,
  };
}

/**
 * Konvertiert Punkt-Liste in GeoJSON LineString.
 */
export function toGeoJsonLineString(coordinates: [number, number][]): {
  type: 'LineString';
  coordinates: [number, number][];
} {
  return { type: 'LineString', coordinates };
}

/**
 * Liefert alle nicht-bestätigten Drafts (für Recovery-Banner).
 */
export async function findUnfinishedDraft(orgSlug: string): Promise<PendingPath | null> {
  try {
    const drafts = await db.pendingPaths
      .where('orgSlug').equals(orgSlug)
      .filter(p => !p.confirmed)
      .reverse()
      .sortBy('startedAt');
    return drafts[0] ?? null;
  } catch {
    return null;
  }
}
