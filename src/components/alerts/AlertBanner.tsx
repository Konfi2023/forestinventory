'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Wind, X, FlaskConical } from 'lucide-react';
import type { ActiveAlert } from '@/lib/active-alerts';
import { acknowledgeAlert } from '@/actions/alerts';

const LS_KEY = 'fi_dismissed_alerts';

function getStoredDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'));
  } catch { return new Set(); }
}

function addDismissed(id: string) {
  const current = getStoredDismissed();
  current.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...current]));
}

function alertTitle(alert: ActiveAlert): string {
  if (alert.type === 'STORM') return `Sturmereignis in ${alert.forestName}`;
  return `Möglicher Waldschaden in ${alert.forestName}`;
}

function alertBody(alert: ActiveAlert): string {
  if (alert.type === 'STORM') {
    const kmh = alert.windMaxKmh != null ? `Windböen bis ${alert.windMaxKmh} km/h` : 'Starke Windböen';
    const dir  = windDir(alert.windDirDeg);
    return `${kmh}${dir ? ` aus ${dir}` : ''} wurden registriert. Bitte den Bestand auf Windwürfe und Bruchholz prüfen — gefallene Bäume auf Wegen bergen Gefahren.`;
  }
  return `Satellitenmessung (Sentinel-1 Radar) zeigt eine ungewöhnliche Veränderung im Bestand. Ursachen können Windwurf, Borkenkäferbefall oder andere Schäden sein. Bitte den Wald zeitnah begehen und den Zustand dokumentieren.`;
}

function windDir(deg?: number | null): string {
  if (deg == null) return '';
  const dirs = ['Norden','Nordosten','Osten','Südosten','Süden','Südwesten','Westen','Nordwesten'];
  return dirs[Math.round(deg / 45) % 8];
}

interface Props {
  alerts:  ActiveAlert[];
  orgSlug: string;
}

export function AlertBanner({ alerts, orgSlug }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Beim Mount: aus localStorage laden
  useEffect(() => {
    setDismissed(getStoredDismissed());
  }, []);

  // Andere Fenster/Tabs mithören
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) setDismissed(getStoredDismissed());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const dismiss = useCallback(async (alert: ActiveAlert) => {
    addDismissed(alert.id);
    setDismissed(getStoredDismissed());
    await acknowledgeAlert(alert);
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-3">
      {visible.map(alert => (
        <div key={alert.id} className={`rounded-xl border-2 shadow-md overflow-hidden ${
          alert.type === 'STORM'
            ? 'border-amber-400 bg-amber-50'
            : 'border-red-400 bg-red-50'
        }`}>
          {/* Titelzeile */}
          <div className={`flex items-center gap-3 px-4 py-3 ${
            alert.type === 'STORM' ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                alert.type === 'STORM' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                alert.type === 'STORM' ? 'bg-amber-600' : 'bg-red-600'
              }`} />
            </span>

            {alert.type === 'STORM'
              ? <Wind size={18} className="text-amber-700 shrink-0" />
              : <AlertTriangle size={18} className="text-red-700 shrink-0" />}

            <span className={`font-bold text-base flex-1 ${
              alert.type === 'STORM' ? 'text-amber-900' : 'text-red-900'
            }`}>
              {alertTitle(alert)}
            </span>

            {alert.isTest && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-300">
                <FlaskConical size={11} /> Probe
              </span>
            )}

            <span className={`text-xs shrink-0 ${
              alert.type === 'STORM' ? 'text-amber-600' : 'text-red-500'
            }`}>
              {new Date(alert.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>

            <button
              onClick={() => dismiss(alert)}
              className={`p-1 rounded-md transition shrink-0 ${
                alert.type === 'STORM'
                  ? 'text-amber-500 hover:bg-amber-200 hover:text-amber-800'
                  : 'text-red-400 hover:bg-red-200 hover:text-red-800'
              }`}
              title="Warnung quittieren"
            >
              <X size={17} />
            </button>
          </div>

          {/* Beschreibung */}
          <div className="px-4 py-3">
            <p className={`text-sm leading-relaxed ${
              alert.type === 'STORM' ? 'text-amber-800' : 'text-red-800'
            }`}>
              {alertBody(alert)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
