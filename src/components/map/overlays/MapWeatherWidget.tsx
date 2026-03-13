'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  CloudFog, CloudDrizzle, Wind, Droplets, Eye, EyeOff,
  TreePine, TriangleAlert, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore } from '../stores/useMapStores';

// ---------------------------------------------------------------------------
// WMO helpers
// ---------------------------------------------------------------------------

function wmoIcon(code: number, size = 16, className?: string) {
  const props = { size, className };
  if (code <= 2)  return <Sun {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code <= 48) return <CloudFog {...props} />;
  if (code <= 57) return <CloudDrizzle {...props} />;
  if (code <= 67) return <CloudRain {...props} />;
  if (code <= 77) return <CloudSnow {...props} />;
  if (code <= 82) return <CloudRain {...props} />;
  if (code <= 86) return <CloudSnow {...props} />;
  return <CloudLightning {...props} />;
}

function wmoLabel(code: number): string {
  if (code <= 2)  return 'Klar';
  if (code === 3) return 'Bewölkt';
  if (code <= 48) return 'Nebel';
  if (code <= 57) return 'Nieselregen';
  if (code <= 67) return 'Regen';
  if (code <= 77) return 'Schnee';
  if (code <= 82) return 'Schauer';
  if (code <= 86) return 'Schneeschauer';
  return 'Gewitter';
}

const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ---------------------------------------------------------------------------
// Unwetter-Alarm: prüft die nächsten 3 Tage
// ---------------------------------------------------------------------------

interface Alert {
  level: 'warning' | 'danger'; // gelb / rot
  label: string;
  date: string; // YYYY-MM-DD
}

function computeAlerts(daily: DailyDay[]): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date().toISOString().split('T')[0];
  const upcoming = daily.filter(d => d.date >= today).slice(0, 3);

  for (const d of upcoming) {
    const label = d.date === today
      ? 'Heute'
      : DAY_SHORT[new Date(d.date + 'T12:00:00Z').getDay()];

    // Gewitter
    if (d.weatherCode >= 95) {
      alerts.push({ level: 'danger', label: `${label}: Gewitter`, date: d.date });
    }
    // Orkan / Sturm (Böen > 75 km/h)
    if ((d.windGustsKmh ?? 0) > 75) {
      alerts.push({ level: 'danger', label: `${label}: Sturmböen ${d.windGustsKmh} km/h`, date: d.date });
    } else if ((d.windGustsKmh ?? 0) > 55) {
      alerts.push({ level: 'warning', label: `${label}: Böen ${d.windGustsKmh} km/h`, date: d.date });
    }
    // Starkregen (> 20 mm/Tag)
    if ((d.precipMm ?? 0) > 20) {
      alerts.push({ level: 'danger', label: `${label}: Starkregen ${d.precipMm} mm`, date: d.date });
    } else if ((d.precipMm ?? 0) > 10) {
      alerts.push({ level: 'warning', label: `${label}: Starker Regen ${d.precipMm} mm`, date: d.date });
    }
    // Frost (min < -5°C)
    if ((d.minTemp ?? 0) < -5) {
      alerts.push({ level: 'warning', label: `${label}: Frost ${d.minTemp}°C`, date: d.date });
    }
    // Hitzestress (max > 35°C)
    if ((d.maxTemp ?? 0) > 35) {
      alerts.push({ level: 'warning', label: `${label}: Hitze ${d.maxTemp}°C`, date: d.date });
    }
  }

  // Deduplizieren: pro Tag nur den schlimmsten
  const seen = new Set<string>();
  return alerts.filter(a => {
    const key = a.date;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Precipitation probability color
// ---------------------------------------------------------------------------

function precipColor(pct: number): string {
  if (pct >= 70) return 'text-sky-400';
  if (pct >= 40) return 'text-sky-300/80';
  return 'text-white/35';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyDay {
  date: string;
  weatherCode: number;
  maxTemp: number | null;
  minTemp: number | null;
  precipMm: number | null;
  precipProbPct: number | null;
  windKmh: number | null;
  windGustsKmh: number | null;
}

interface WeatherData {
  current: {
    temp: number | null;
    feelsLike: number | null;
    weatherCode: number;
    windKmh: number | null;
    precipMm: number;
    humidity: number | null;
  } | null;
  daily: DailyDay[];
}

// ---------------------------------------------------------------------------
// Centroid helper
// ---------------------------------------------------------------------------

function getCentroid(forest: any): { lat: number; lng: number } | null {
  if (!forest?.geoJson) return null;

  const raw = typeof forest.geoJson === 'string'
    ? (() => { try { return JSON.parse(forest.geoJson); } catch { return null; } })()
    : forest.geoJson;
  if (!raw) return null;

  // FeatureCollection → Feature → Geometry
  let geom: any = null;
  if (raw.type === 'FeatureCollection') {
    geom = raw.features?.find((f: any) =>
      f?.geometry?.type === 'Polygon' || f?.geometry?.type === 'MultiPolygon'
    )?.geometry ?? null;
  } else if (raw.type === 'Feature') {
    geom = raw.geometry ?? null;
  } else {
    geom = raw;
  }
  if (!geom) return null;

  let ring: number[][] | null = null;
  if (geom.type === 'Polygon' && geom.coordinates?.[0]?.length) {
    ring = geom.coordinates[0];
  } else if (geom.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.length) {
    ring = geom.coordinates[0][0];
  }
  if (!ring) return null;

  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapWeatherWidget({ forests }: { forests: any[] }) {
  const selectedFeatureId   = useMapStore(s => s.selectedFeatureId);
  const selectedFeatureType = useMapStore(s => s.selectedFeatureType);

  const [weather,   setWeather]   = useState<WeatherData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const activeForest = useMemo(() => {
    if (selectedFeatureType === 'FOREST' && selectedFeatureId) {
      const found = forests.find(f => f.id === selectedFeatureId);
      if (found && getCentroid(found)) return found;
    }
    return forests.find(f => getCentroid(f) !== null) ?? null;
  }, [forests, selectedFeatureId, selectedFeatureType]);

  const centroid   = useMemo(() => activeForest ? getCentroid(activeForest) : null, [activeForest]);
  const forestName = activeForest?.name ?? null;

  useEffect(() => {
    if (!centroid) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setWeather(null);
      try {
        const res = await fetch(
          `/api/weather/forecast?lat=${centroid.lat.toFixed(4)}&lng=${centroid.lng.toFixed(4)}&days=7`,
        );
        if (res.ok && !cancelled) setWeather(await res.json());
      } catch {}
      if (!cancelled) setLoading(false);
    };

    load();
    const timer = setInterval(load, 3_600_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [centroid?.lat, centroid?.lng]);

  if (!centroid) return null;

  const cur      = weather?.current;
  const daily    = weather?.daily ?? [];
  const today    = new Date().toISOString().split('T')[0];
  const forecast = daily.filter(d => d.date >= today).slice(0, 5);
  const alerts   = computeAlerts(daily);
  const topAlert = alerts[0] ?? null;

  return (
    <div className={cn(
      'bg-black/60 backdrop-blur-md text-white rounded-xl border border-white/10 shadow-2xl',
      'select-none transition-all duration-200',
      collapsed ? 'w-[3.25rem]' : 'w-[13rem]',
    )}>

      {/* Unwetter-Banner */}
      {!collapsed && topAlert && (
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-[10px] font-semibold',
          topAlert.level === 'danger'
            ? 'bg-red-500/80 text-white'
            : 'bg-amber-400/80 text-black',
        )}>
          {topAlert.level === 'danger'
            ? <Zap size={11} className="shrink-0" />
            : <TriangleAlert size={11} className="shrink-0" />
          }
          <span className="truncate">{topAlert.label}</span>
          {alerts.length > 1 && (
            <span className="ml-auto shrink-0 opacity-70">+{alerts.length - 1}</span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {!collapsed && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <TreePine size={11} className="text-emerald-400 shrink-0" />
            <span className="text-[10px] text-white/60 truncate" title={forestName ?? ''}>
              {forestName ?? 'Wetter'}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-white/40 hover:text-white/80 transition-colors shrink-0"
          title={collapsed ? 'Wetter anzeigen' : 'Minimieren'}
        >
          {collapsed ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {loading && !cur && (
            <div className="px-3 pb-3 text-[11px] text-white/40 animate-pulse">Lade…</div>
          )}

          {cur && (
            <div className="px-3 pb-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-thin leading-none">
                  {cur.temp != null ? `${cur.temp}°` : '–'}
                </span>
                <div className="mb-0.5">
                  {wmoIcon(cur.weatherCode, 22, 'text-sky-300')}
                </div>
              </div>
              <div className="text-[11px] text-white/60 mt-0.5">
                {wmoLabel(cur.weatherCode)}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/50">
                {cur.windKmh != null && (
                  <span className="flex items-center gap-0.5">
                    <Wind size={10} /> {cur.windKmh} km/h
                  </span>
                )}
                {cur.humidity != null && (
                  <span className="flex items-center gap-0.5">
                    <Droplets size={10} /> {cur.humidity}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 5-day forecast strip */}
          {forecast.length > 0 && (
            <div className="border-t border-white/10 px-2 py-2">
              <div className="flex justify-between gap-1">
                {forecast.map(day => {
                  const d = new Date(day.date + 'T12:00:00Z');
                  const isToday  = day.date === today;
                  const hasAlert = alerts.some(a => a.date === day.date);
                  return (
                    <div
                      key={day.date}
                      className={cn(
                        'flex flex-col items-center gap-0.5 flex-1 rounded-lg px-0.5 py-1',
                        isToday && 'bg-white/10',
                        hasAlert && !isToday && 'ring-1 ring-amber-400/50',
                      )}
                    >
                      <span className={cn(
                        'text-[9px] font-semibold',
                        isToday ? 'text-white' : 'text-white/50',
                        hasAlert && 'text-amber-300',
                      )}>
                        {isToday ? 'Heute' : DAY_SHORT[d.getDay()]}
                      </span>
                      {wmoIcon(day.weatherCode, 13, isToday ? 'text-sky-300' : 'text-white/60')}
                      <span className="text-[9px] text-white/80 font-medium">
                        {day.maxTemp != null ? `${day.maxTemp}°` : '–'}
                      </span>
                      <span className="text-[8px] text-white/40">
                        {day.minTemp != null ? `${day.minTemp}°` : '–'}
                      </span>
                      {/* Regenwahrscheinlichkeit */}
                      {day.precipProbPct != null && day.precipProbPct > 0 && (
                        <span className={cn('text-[8px] font-medium', precipColor(day.precipProbPct))}>
                          {day.precipProbPct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
