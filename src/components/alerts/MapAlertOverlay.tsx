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

function windDir(deg?: number | null) {
  if (deg == null) return '';
  const d = ['N','NO','O','SO','S','SW','W','NW'];
  return d[Math.round(deg / 45) % 8];
}

// ── Gruppierung ─────────────────────────────────────────────────────────────

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
      map.set(key, {
        key, type: alert.type, date: alert.date, alerts: [],
        maxWindKmh: null, windDirDeg: null,
      });
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

// ── Komponente ───────────────────────────────────────────────────────────────

interface Props { alerts: ActiveAlert[]; orgSlug: string; }

export function MapAlertOverlay({ alerts, orgSlug }: Props) {
  // Direkt aus localStorage initialisieren → kein Flash beim Remount
  const [dismissed, setDismissed] = useState<Set<string>>(() => getStoredDismissed());
  const [expanded,  setExpanded]  = useState<Set<string>>(() => new Set());

  // Andere Tabs mithören
  useEffect(() => {
    const fn = (e: StorageEvent) => { if (e.key === LS_KEY) setDismissed(getStoredDismissed()); };
    window.addEventListener('storage', fn);
    return () => window.removeEventListener('storage', fn);
  }, []);

  const dismiss = useCallback(async (group: AlertGroup) => {
    addDismissed(group.key);
    setDismissed(getStoredDismissed());
    // Alle Einzel-Alerts der Gruppe quittieren
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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[min(480px,94vw)] pointer-events-auto space-y-2">
      {visible.map(group => {
        const isStorm   = group.type === 'STORM';
        const isExpanded = expanded.has(group.key);
        const count     = group.alerts.length;
        const colorHead = isStorm ? 'bg-amber-900/60 border-amber-500/70' : 'bg-red-900/60 border-red-500/70';
        const colorBody = isStorm ? 'bg-amber-950/90'                    : 'bg-red-950/90';
        const textMain  = isStorm ? 'text-amber-100'  : 'text-red-100';
        const textSub   = isStorm ? 'text-amber-300'  : 'text-red-300';
        const ping      = isStorm ? 'bg-amber-400'    : 'bg-red-400';

        const title = isStorm ? 'Sturmwarnung' : 'Waldschaden-Warnung';
        const body  = isStorm
          ? `Windböen bis ${group.maxWindKmh ?? '?'} km/h${group.windDirDeg != null ? ` aus ${windDir(group.windDirDeg)}` : ''}. Bitte auf Windwurfschäden prüfen.`
          : 'Sentinel-1 Radar zeigt ungewöhnliche Veränderungen. Bitte Bestand begehen und Schäden dokumentieren.';

        return (
          <div key={group.key} className={`backdrop-blur-sm rounded-xl shadow-2xl border overflow-hidden ${colorBody} ${colorHead}`}>
            {/* Header */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 ${colorHead}`}>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ping}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ping}`} />
              </span>
              {isStorm
                ? <Wind size={15} className="text-amber-300 shrink-0" />
                : <AlertTriangle size={15} className="text-red-300 shrink-0" />}
              <span className={`font-bold text-sm flex-1 ${textMain}`}>{title}</span>
              <span className={`text-xs ${textSub}`}>
                {count === 1
                  ? group.alerts[0].forestName
                  : `${count} Wälder betroffen`}
              </span>
              {count > 1 && (
                <button
                  onClick={() => toggleExpand(group.key)}
                  className={`p-0.5 transition ${textSub} hover:text-white`}
                  title={isExpanded ? 'Liste einklappen' : 'Betroffene Wälder anzeigen'}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              <button
                onClick={() => dismiss(group)}
                className="text-slate-400 hover:text-white transition p-0.5 shrink-0"
                title="Warnung schließen"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-2.5 space-y-2">
              <p className={`text-xs leading-relaxed ${textSub}`}>{body}</p>

              {/* Waldliste aufklappbar */}
              {count > 1 && isExpanded && (
                <ul className={`text-xs space-y-0.5 pt-1 border-t border-white/10 ${textSub}`}>
                  {group.alerts.map(a => (
                    <li key={a.id} className="flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${ping}`} />
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
