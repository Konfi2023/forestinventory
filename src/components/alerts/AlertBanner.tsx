'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Wind, X, FlaskConical, ChevronDown, ChevronUp, Bug, Droplets, Snowflake } from 'lucide-react';
import type { ActiveAlert } from '@/lib/active-alerts';
import { acknowledgeAlert } from '@/actions/alerts';
import { useTranslations } from 'next-intl';

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

const WIND_DIR_FULL_KEYS = [
  'windDirFullN', 'windDirFullNE', 'windDirFullE', 'windDirFullSE',
  'windDirFullS', 'windDirFullSW', 'windDirFullW', 'windDirFullNW',
] as const;

interface AlertGroup {
  key:        string;
  type:       ActiveAlert['type'];
  date:       string;
  alerts:     ActiveAlert[];
  maxWindKmh?: number | null;
  windDirDeg?: number | null;
}

// Styling pro Alert-Typ
const ALERT_STYLES: Record<string, { border: string; bg: string; header: string; text: string; dot: string; icon: any; label: string }> = {
  STORM:          { border: 'border-amber-400', bg: 'bg-amber-50', header: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', icon: Wind, label: 'Sturmwarnung' },
  SAR_ANOMALY:    { border: 'border-red-400', bg: 'bg-red-50', header: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', icon: AlertTriangle, label: 'SAR-Anomalie' },
  BARK_BEETLE:    { border: 'border-red-400', bg: 'bg-red-50', header: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', icon: Bug, label: 'Borkenkäfer-Warnung' },
  DROUGHT_STRESS: { border: 'border-orange-400', bg: 'bg-orange-50', header: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500', icon: Droplets, label: 'Trockenstress' },
  STORM_DAMAGE:   { border: 'border-red-400', bg: 'bg-red-50', header: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', icon: Wind, label: 'Sturmschaden bestätigt' },
  FROST_DAMAGE:   { border: 'border-blue-400', bg: 'bg-blue-50', header: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', icon: Snowflake, label: 'Spätfrost-Warnung' },
};

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
  const t = useTranslations('Alerts');
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

  function windDir(deg?: number | null): string {
    if (deg == null) return '';
    return t(WIND_DIR_FULL_KEYS[Math.round(deg / 45) % 8]);
  }

  const groups  = groupAlerts(alerts);
  const visible = groups.filter(g => !dismissed.has(g.key));
  if (!visible.length) return null;

  return (
    <div className="space-y-3">
      {visible.map(group => {
        const style = ALERT_STYLES[group.type] ?? ALERT_STYLES.SAR_ANOMALY;
        const IconComponent = style.icon;
        const isExpanded = expanded.has(group.key);
        const count      = group.alerts.length;
        const isCorrelation = ['BARK_BEETLE', 'DROUGHT_STRESS', 'STORM_DAMAGE', 'FROST_DAMAGE'].includes(group.type);

        // Title
        let title: string;
        if (isCorrelation) {
          title = group.alerts[0]?.description
            ? `${style.label}: ${group.alerts[0].forestName}`
            : style.label;
        } else {
          const titleBase = group.type === 'STORM' ? t('stormEvent') : t('possibleForestDamage');
          const titleSuffix = count > 1
            ? ` – ${t('forestsAffected', { count })}`
            : ` ${t('inForest', { name: group.alerts[0].forestName })}`;
          title = titleBase + titleSuffix;
        }

        // Body
        let body: string;
        if (isCorrelation) {
          const a = group.alerts[0];
          body = a.description ?? '';
          if (a.suggestion) body += `\n\nEmpfehlung: ${a.suggestion}`;
        } else if (group.type === 'STORM') {
          const kmh = group.maxWindKmh != null
            ? t('windGustsUp', { kmh: group.maxWindKmh })
            : t('strongWindGusts');
          const dir = windDir(group.windDirDeg);
          body = `${kmh}${dir ? ` ${t('fromDirection', { dir })}` : ''} ${t('stormBodySuffix')}`;
        } else {
          body = t('sarBody');
        }

        return (
          <div key={group.key} className={`rounded-xl border-2 shadow-md overflow-hidden ${style.border} ${style.bg}`}>
            {/* Header */}
            <div className={`flex items-center gap-3 px-4 py-3 ${style.header}`}>
              <span className="relative flex h-3 w-3 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${style.dot}`} />
              </span>
              <IconComponent size={18} className={`${style.text} shrink-0`} />
              <span className={`font-bold text-base flex-1 ${style.text}`}>
                {title}
              </span>
              <span className={`text-xs shrink-0 ${style.text} opacity-70`}>
                {new Date(group.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {count > 1 && (
                <button
                  onClick={() => toggleExpand(group.key)}
                  className={`p-1 rounded transition ${style.text} hover:opacity-80`}
                  title={isExpanded ? t('collapse') : t('showAffectedForests')}
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
              <button
                onClick={() => dismiss(group)}
                className={`p-1 rounded-md transition shrink-0 ${style.text} hover:opacity-80`}
                title={t('acknowledgeWarning')}
              >
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-2">
              <p className={`text-sm leading-relaxed whitespace-pre-line ${style.text}`}>{body}</p>

              {count > 1 && isExpanded && (
                <ul className={`text-sm space-y-1 pt-2 border-t border-current/20 ${style.text}`}>
                  {group.alerts.map(a => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
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
