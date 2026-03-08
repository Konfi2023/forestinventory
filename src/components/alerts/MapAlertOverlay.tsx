'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Wind, X, FlaskConical } from 'lucide-react';
import type { ActiveAlert } from '@/lib/active-alerts';
import { acknowledgeAlert } from '@/actions/alerts';

const LS_KEY = 'fi_dismissed_alerts';

function getStoredDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function addDismissed(id: string) {
  const c = getStoredDismissed(); c.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...c]));
}

function windDir(deg?: number | null) {
  if (deg == null) return '';
  const d = ['N','NO','O','SO','S','SW','W','NW'];
  return d[Math.round(deg / 45) % 8];
}

interface Props { alerts: ActiveAlert[]; orgSlug: string; }

export function MapAlertOverlay({ alerts, orgSlug }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => { setDismissed(getStoredDismissed()); }, []);

  useEffect(() => {
    const fn = (e: StorageEvent) => { if (e.key === LS_KEY) setDismissed(getStoredDismissed()); };
    window.addEventListener('storage', fn);
    return () => window.removeEventListener('storage', fn);
  }, []);

  const dismiss = useCallback(async (alert: ActiveAlert) => {
    addDismissed(alert.id);
    setDismissed(getStoredDismissed());
    await acknowledgeAlert(alert);
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[min(440px,92vw)] pointer-events-auto space-y-2">
      {visible.map(alert => (
        <div key={alert.id} className={`backdrop-blur-sm rounded-xl shadow-2xl border overflow-hidden ${
          alert.type === 'STORM'
            ? 'bg-amber-950/90 border-amber-500/70'
            : 'bg-red-950/90 border-red-500/70'
        }`}>
          <div className={`flex items-center gap-2.5 px-4 py-2.5 ${
            alert.type === 'STORM' ? 'bg-amber-900/50' : 'bg-red-900/50'
          }`}>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                alert.type === 'STORM' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                alert.type === 'STORM' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
            </span>
            {alert.type === 'STORM'
              ? <Wind size={15} className="text-amber-300 shrink-0" />
              : <AlertTriangle size={15} className="text-red-300 shrink-0" />}
            <span className={`font-bold text-sm flex-1 ${
              alert.type === 'STORM' ? 'text-amber-100' : 'text-red-100'
            }`}>
              {alert.type === 'STORM' ? 'Sturmwarnung' : 'Waldschaden-Warnung'}: {alert.forestName}
            </span>
            {alert.isTest && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-violet-800/60 text-violet-300">
                <FlaskConical size={10} /> Probe
              </span>
            )}
            <button onClick={() => dismiss(alert)}
              className="text-slate-400 hover:text-white transition p-0.5 shrink-0">
              <X size={15} />
            </button>
          </div>
          <div className="px-4 py-2.5">
            <p className={`text-xs leading-relaxed ${
              alert.type === 'STORM' ? 'text-amber-200' : 'text-red-200'
            }`}>
              {alert.type === 'STORM'
                ? `Windböen bis ${alert.windMaxKmh ?? '?'} km/h${alert.windDirDeg != null ? ` aus ${windDir(alert.windDirDeg)}` : ''}. Bitte auf Windwurfschäden prüfen.`
                : `Satellitenmessung zeigt ungewöhnliche Veränderung. Bitte Bestand begehen und Schäden dokumentieren.`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
