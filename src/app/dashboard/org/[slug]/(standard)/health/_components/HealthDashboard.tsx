'use client';

import { useState, useTransition } from 'react';
import { triggerHealthCheck } from '@/actions/health';
import { toast } from 'sonner';
import {
  Activity, Database, Cloud, Satellite, HardDrive,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Clock,
  Thermometer, TreePine,
} from 'lucide-react';
import type { HealthReport, ForestFreshness } from '@/lib/health-check';

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

interface HealthEntry {
  id:           string;
  runAt:        string;
  overall:      string;
  dbOk:         boolean;
  openMeteoOk:  boolean;
  sentinelOk:   boolean;
  s3Ok:         boolean;
  testAlertS1Id: string | null;
  testAlertWxId: string | null;
  report:       unknown;
}

// ---------------------------------------------------------------------------
// Status-Hilfsfunktionen
// ---------------------------------------------------------------------------

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok)   return <CheckCircle2  size={18} className="text-emerald-500 shrink-0" />;
  if (warn) return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
  return          <XCircle        size={18} className="text-red-500 shrink-0" />;
}

function OverallBadge({ status }: { status: string }) {
  const cls =
    status === 'OK'    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    status === 'WARN'  ? 'bg-amber-100 text-amber-800 border-amber-200' :
                         'bg-red-100 text-red-800 border-red-200';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${cls}`}>
      {status === 'OK' ? 'Alles OK' : status === 'WARN' ? 'Warnung' : 'Fehler'}
    </span>
  );
}

function ServiceCard({
  icon, label, ok, latencyMs, info, error,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  latencyMs?: number;
  info?: string;
  error?: string;
}) {
  return (
    <div className={`bg-white border rounded-lg p-4 flex flex-col gap-2 ${ok ? 'border-slate-200' : 'border-red-200 bg-red-50/30'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="text-slate-500">{icon}</span>
          {label}
        </div>
        <StatusIcon ok={ok} />
      </div>
      {latencyMs != null && (
        <p className="text-xs text-slate-400">{latencyMs} ms Latenz</p>
      )}
      {info && <p className="text-xs text-slate-500 truncate">{info}</p>}
      {error && <p className="text-xs text-red-600 truncate" title={error}>{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export function HealthDashboard({ slug, history }: { slug: string; history: HealthEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const [localHistory, setLocalHistory] = useState<HealthEntry[]>(history);

  const latest = localHistory[0] ?? null;
  const report = latest?.report as HealthReport | null;

  function handleTrigger() {
    startTransition(async () => {
      try {
        const result = await triggerHealthCheck(slug);
        toast.success(`Health-Check abgeschlossen: ${result.overall}`);
        // Seite neu laden um frische Daten zu zeigen
        window.location.reload();
      } catch (e: any) {
        toast.error(e?.message ?? 'Fehler beim Health-Check');
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* Trigger-Button + letzter Check */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {latest ? (
            <>
              <OverallBadge status={latest.overall} />
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Clock size={13} />
                Letzter Check: {new Date(latest.runAt).toLocaleString('de-DE')}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">Noch kein Health-Check durchgeführt</span>
          )}
        </div>
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition"
        >
          <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Wird geprüft …' : 'Jetzt Health-Check ausführen'}
        </button>
      </div>

      {/* Service-Status */}
      {latest && report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ServiceCard
            icon={<Database size={16} />}
            label="Datenbank"
            ok={latest.dbOk}
            latencyMs={report.db?.latencyMs}
            error={report.db?.error}
            info="PostgreSQL"
          />
          <ServiceCard
            icon={<Cloud size={16} />}
            label="Open-Meteo"
            ok={latest.openMeteoOk}
            latencyMs={report.openMeteo?.latencyMs}
            info={report.openMeteo?.info}
            error={report.openMeteo?.error}
          />
          <ServiceCard
            icon={<Satellite size={16} />}
            label="Sentinel Hub"
            ok={latest.sentinelOk}
            latencyMs={report.sentinel?.latencyMs}
            info={report.sentinel?.info}
            error={report.sentinel?.error}
          />
          <ServiceCard
            icon={<HardDrive size={16} />}
            label="S3 Storage"
            ok={latest.s3Ok}
            info={report.s3?.info ?? (latest.s3Ok ? 'Konfiguriert' : 'Nicht konfiguriert')}
            error={report.s3?.error}
          />
        </div>
      )}

      {/* Test-Alarm Status */}
      {latest && report?.testAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 text-sm text-amber-800 flex items-start gap-3">
          <Activity size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <strong>Probe-Alarm aktiv</strong> — Test-Daten für Wald <em>{report.testAlert.forestName}</em>:
            {' '}SAR-Anomalie (changeDb = −3.7 dB) + Sturmereignis (78 km/h) wurden erfolgreich erstellt.
            <br />
            <span className="text-amber-600 text-xs">S1-ID: {latest.testAlertS1Id} · Wetter-ID: {latest.testAlertWxId}</span>
          </div>
        </div>
      )}

      {/* Datenfreshness Tabelle */}
      {report?.forests && report.forests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TreePine size={16} className="text-emerald-600" />
            Datenfreshness pro Wald
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Wald</th>
                  <th className="text-left px-4 py-2.5">GeoJSON</th>
                  <th className="text-left px-4 py-2.5">Letzter Wetter-Snapshot</th>
                  <th className="text-left px-4 py-2.5">Letzter SAR-Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(report.forests as ForestFreshness[]).map(f => (
                  <tr key={f.id} className={f.weatherStale || f.s1Stale ? 'bg-amber-50/40' : ''}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{f.name}</td>
                    <td className="px-4 py-2.5">
                      {f.hasGeoJson
                        ? <CheckCircle2 size={15} className="text-emerald-500" />
                        : <XCircle size={15} className="text-red-400" />}
                    </td>
                    <td className="px-4 py-2.5">
                      <FreshnessCell date={f.lastWeatherAt} ageDays={f.weatherAgeDays} stale={f.weatherStale} maxDays={2} />
                    </td>
                    <td className="px-4 py-2.5">
                      <FreshnessCell date={f.lastS1At} ageDays={f.s1AgeDays} stale={f.s1Stale} maxDays={12} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      {localHistory.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock size={16} className="text-slate-400" />
            Verlauf (letzte {localHistory.length} Checks)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Zeitpunkt</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">DB</th>
                  <th className="text-left px-4 py-2.5">Wetter-API</th>
                  <th className="text-left px-4 py-2.5">Sentinel</th>
                  <th className="text-left px-4 py-2.5">S3</th>
                  <th className="text-left px-4 py-2.5">Probe-Alarm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localHistory.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {new Date(h.runAt).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-2.5"><OverallBadge status={h.overall} /></td>
                    <td className="px-4 py-2.5"><StatusIcon ok={h.dbOk} /></td>
                    <td className="px-4 py-2.5"><StatusIcon ok={h.openMeteoOk} /></td>
                    <td className="px-4 py-2.5"><StatusIcon ok={h.sentinelOk} /></td>
                    <td className="px-4 py-2.5"><StatusIcon ok={h.s3Ok} /></td>
                    <td className="px-4 py-2.5">
                      {h.testAlertS1Id
                        ? <CheckCircle2 size={15} className="text-emerald-500" />
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cron-Info */}
      <div className="bg-slate-100 rounded-lg px-5 py-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">Automatisierung (täglicher Cron)</p>
        <p>
          Täglich ausführen via: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            GET /api/cron/health
          </code>{' '}
          mit <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            Authorization: Bearer {'<CRON_SECRET>'}
          </code>
        </p>
        <p>Test-Alarme werden nach 7 Tagen automatisch gelöscht.</p>
      </div>

    </div>
  );
}

function FreshnessCell({
  date, ageDays, stale, maxDays,
}: { date: string | null; ageDays: number | null; stale: boolean; maxDays: number }) {
  if (!date) return <span className="text-slate-300 text-xs">Keine Daten</span>;
  return (
    <div className="flex items-center gap-1.5">
      {stale
        ? <AlertTriangle size={13} className="text-amber-500" />
        : <CheckCircle2 size={13} className="text-emerald-500" />}
      <span className={stale ? 'text-amber-700' : 'text-slate-600'}>
        {new Date(date).toLocaleDateString('de-DE')}
        {ageDays != null && (
          <span className="text-slate-400 ml-1">({ageDays}d)</span>
        )}
      </span>
    </div>
  );
}
