'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Wind, X, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActiveAlert } from '@/lib/active-alerts';
import { acknowledgeAlert } from '@/actions/alerts';

const LS_KEY = 'fi_dismissed_alert_groups';

function getStoredDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')); }
  catch { return new Set(); }
}

function addDismissed(key: string) {
  const c = getStoredDismissed();
  c.add(key);
  localStorage.setItem(LS_KEY, JSON.stringify([...c]));
}

function windDir(deg?: number | null): string {
  if (deg == null) return '';
  const dirs = ['Norden','Nordosten','Osten','Südosten','Süden','Südwesten','Westen','Nordwesten'];
  return dirs[Math.round(deg / 45) % 8];
}

interface AlertGroup {
  key:        string;
  type:       'STORM' | 'SAR_ANOMALY';
  date:       string;
  alerts:     ActiveAlert[];
  maxWindKmh?: number | null;
  windDirDeg?: number | null;
}

function groupAlerts(alerts: ActiveAlert[]): AlertGroup[] {
  const map = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const dateStr = alert.date.split('T')[0];
    const key     = `${alert.type}_${dateStr}`;
    if (!map.has(key)) {
      map.set(key, { key, type: alert.type, date: alert.date, alerts: [], maxWindKmh: null, windDirDeg: null });
    }
    const g = map.get(key)!;
    g.alerts.push(alert);
    if (alert.windMaxKmh != null && (g.maxWindKmh == null || alert.windMaxKmh > g.maxWindKmh)) {
      g.maxWindKmh = alert.windMaxKmh;
      g.windDirDeg = alert.windDirDeg;
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

interface Props { alerts: ActiveAlert[]; orgSlug: string; }

export function AlertBanner({ alerts, orgSlug }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => getStoredDismissed());
  const [expanded,  setExpanded]  = useState<Set<string>>(() => new Set());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) setDismissed(getStoredDismissed());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const dismiss = useCallback(async (group: AlertGroup) => {
    addDismissed(group.key);
    setDismissed(getStoredDismissed());
    await Promise.all(group.alerts.map(a => acknowledgeAlert(a)));
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const groups  = groupAlerts(alerts);
  const visible = groups.filter(g => !dismissed.has(g.key));
  if (!visible.length) return null;

  return (
    <div className="space-y-3">
      {visible.map(group => {
        const isStorm    = group.type === 'STORM';
        const isExpanded = expanded.has(group.key);
        const count      = group.alerts.length;

        const title = isStorm
          ? `Sturmereignis${count > 1 ? ` – ${count} Wälder betroffen` : ` in ${group.alerts[0].forestName}`}`
          : `Möglicher Waldschaden${count > 1 ? ` – ${count} Wälder betroffen` : ` in ${group.alerts[0].forestName}`}`;

        const body = isStorm
          ? (() => {
              const kmh = group.maxWindKmh != null ? `Windböen bis ${group.maxWindKmh} km/h` : 'Starke Windböen';
              const dir = windDir(group.windDirDeg);
              return `${kmh}${dir ? ` aus ${dir}` : ''} wurden registriert. Bitte den Bestand auf Windwürfe und Bruchholz prüfen — gefallene Bäume auf Wegen bergen Gefahren.`;
            })()
          : 'Satellitenmessung (Sentinel-1 Radar) zeigt ungewöhnliche Veränderungen im Bestand. Ursachen können Windwurf, Borkenkäferbefall oder andere Schäden sein. Bitte die Wälder zeitnah begehen und den Zustand dokumentieren.';

        return (
          <div key={group.key} className={`rounded-xl border-2 shadow-md overflow-hidden ${
            isStorm ? 'border-amber-400 bg-amber-50' : 'border-red-400 bg-red-50'
          }`}>
            {/* Header */}
            <div className={`flex items-center gap-3 px-4 py-3 ${isStorm ? 'bg-amber-100' : 'bg-red-100'}`}>
              <span className="relative flex h-3 w-3 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStorm ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isStorm ? 'bg-amber-600' : 'bg-red-600'}`} />
              </span>
              {isStorm
                ? <Wind size={18} className="text-amber-700 shrink-0" />
                : <AlertTriangle size={18} className="text-red-700 shrink-0" />}
              <span className={`font-bold text-base flex-1 ${isStorm ? 'text-amber-900' : 'text-red-900'}`}>
                {title}
              </span>
              <span className={`text-xs shrink-0 ${isStorm ? 'text-amber-600' : 'text-red-500'}`}>
                {new Date(group.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {count > 1 && (
                <button
                  onClick={() => toggleExpand(group.key)}
                  className={`p-1 rounded transition ${isStorm ? 'text-amber-600 hover:bg-amber-200' : 'text-red-500 hover:bg-red-200'}`}
                  title={isExpanded ? 'Einklappen' : 'Betroffene Wälder anzeigen'}
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
              <button
                onClick={() => dismiss(group)}
                className={`p-1 rounded-md transition shrink-0 ${
                  isStorm ? 'text-amber-500 hover:bg-amber-200 hover:text-amber-800' : 'text-red-400 hover:bg-red-200 hover:text-red-800'
                }`}
                title="Warnung quittieren"
              >
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-2">
              <p className={`text-sm leading-relaxed ${isStorm ? 'text-amber-800' : 'text-red-800'}`}>{body}</p>

              {count > 1 && isExpanded && (
                <ul className={`text-sm space-y-1 pt-2 border-t ${isStorm ? 'border-amber-200 text-amber-700' : 'border-red-200 text-red-700'}`}>
                  {group.alerts.map(a => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isStorm ? 'bg-amber-500' : 'bg-red-500'}`} />
                      {a.forestName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
