'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Clock,
  Database, Cloud, Satellite, HardDrive, TreePine, Activity, ExternalLink,
} from 'lucide-react';
import type { HealthReport, ForestFreshness } from '@/lib/health-check';
import { triggerAdminHealthCheck } from '@/actions/health-admin';

interface HealthEntry {
  id:            string;
  runAt:         string;
  overall:       string;
  dbOk:          boolean;
  openMeteoOk:   boolean;
  sentinelOk:    boolean;
  s3Ok:          boolean;
  testAlertS1Id: string | null;
  testAlertWxId: string | null;
  report:        unknown;
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
    : <XCircle      size={16} className="text-red-500 shrink-0" />;
}

function OverallBadge({ status }: { status: string }) {
  const cls =
    status === 'OK'   ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    status === 'WARN' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-red-100 text-red-800 border-red-200';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status === 'OK' ? 'Alles OK' : status === 'WARN' ? 'Warnung' : 'Fehler'}
    </span>
  );
}

function ServiceCard({ icon, label, ok, latencyMs, info, error }: {
  icon: React.ReactNode; label: string; ok: boolean;
  latencyMs?: number; info?: string; error?: string;
}) {
  return (
    <div className={`rounded-lg p-4 border flex flex-col gap-1.5 bg-white ${
      ok ? 'border-slate-200' : 'border-red-200 bg-red-50/40'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="text-slate-400">{icon}</span>
          {label}
        </div>
        <StatusIcon ok={ok} />
      </div>
      {latencyMs != null && <p className="text-xs text-slate-400">{latencyMs} ms</p>}
      {info  && <p className="text-xs text-slate-500 truncate">{info}</p>}
      {error && <p className="text-xs text-red-500 truncate" title={error}>{error}</p>}
    </div>
  );
}

function FreshnessCell({ date, ageDays, stale }: {
  date: string | null; ageDays: number | null; stale: boolean;
}) {
  if (!date) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className={`flex items-center gap-1 text-xs ${stale ? 'text-amber-600' : 'text-slate-500'}`}>
      {stale
        ? <AlertTriangle size={12} className="shrink-0" />
        : <CheckCircle2  size={12} className="text-emerald-500 shrink-0" />}
      {new Date(date).toLocaleDateString('de-DE')}
      {ageDays != null && <span className="text-slate-400 ml-0.5">({ageDays}d)</span>}
    </span>
  );
}

export function HealthDashboard({ history }: { history: HealthEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const latest = history[0] ?? null;
  const report = latest?.report as HealthReport | null;

  function handleTrigger() {
    startTransition(async () => {
      try {
        const result = await triggerAdminHealthCheck();
        toast.success(`Health-Check: ${result.overall}`, {
          description: new Date(result.runAt).toLocaleString('de-DE'),
        });
        window.location.reload();
      } catch (e: any) {
        toast.error(e?.message ?? 'Fehler');
      }
    });
  }

  return (
    <div className="space-y-5">

      {/* Trigger + letzter Status */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {latest ? (
            <>
              <OverallBadge status={latest.overall} />
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {new Date(latest.runAt).toLocaleString('de-DE')}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">Noch kein Check ausgeführt</span>
          )}
        </div>
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Prüfe …' : 'Health-Check ausführen'}
        </button>
      </div>

      {/* Service-Karten */}
      {latest && report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ServiceCard icon={<Database size={15} />} label="PostgreSQL"
            ok={latest.dbOk} latencyMs={report.db?.latencyMs} error={report.db?.error} info="Primärdatenbank" />
          <ServiceCard icon={<Cloud size={15} />} label="Open-Meteo"
            ok={latest.openMeteoOk} latencyMs={report.openMeteo?.latencyMs}
            info={report.openMeteo?.info} error={report.openMeteo?.error} />
          <ServiceCard icon={<Satellite size={15} />} label="Sentinel Hub"
            ok={latest.sentinelOk} latencyMs={report.sentinel?.latencyMs}
            info={report.sentinel?.info} error={report.sentinel?.error} />
          <ServiceCard icon={<HardDrive size={15} />} label="S3 Storage"
            ok={latest.s3Ok} info={report.s3?.info} error={report.s3?.error} />
        </div>
      )}

      {/* Probe-Alarm */}
      {report?.testAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
          <Activity size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <strong>Probe-Alarm OK</strong> — Wald: <em>{report.testAlert.forestName}</em>
            <br />
            SAR-Anomalie (changeDb = −3.7 dB) + Sturm (78 km/h, SW) erfolgreich erstellt.
            <br />
            <span className="text-amber-600 text-xs">
              S1: {latest?.testAlertS1Id} · Wx: {latest?.testAlertWxId}
            </span>
          </div>
          <a
            href={`/dashboard/org/${(report.testAlert as any).orgSlug}/biomass?preview=1&forest=${(report.testAlert as any).forestId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 text-xs font-medium rounded-md transition whitespace-nowrap shrink-0"
          >
            <ExternalLink size={12} />
            Nutzer-Ansicht
          </a>
        </div>
      )}

      {/* Datenfreshness */}
      {report?.forests && report.forests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <TreePine size={14} className="text-emerald-600" />
            Datenfreshness pro Wald
            {(report.staleForests ?? 0) > 0 && (
              <span className="ml-auto text-amber-600 flex items-center gap-1">
                <AlertTriangle size={12} /> {report.staleForests} veraltet
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                  <th className="text-left px-4 py-2">Wald</th>
                  <th className="text-left px-4 py-2">GeoJSON</th>
                  <th className="text-left px-4 py-2">Wetter (max 2d)</th>
                  <th className="text-left px-4 py-2">SAR (max 12d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(report.forests as ForestFreshness[]).map(f => (
                  <tr key={f.id} className={f.weatherStale || f.s1Stale ? 'bg-amber-50/50' : ''}>
                    <td className="px-4 py-2 font-medium text-slate-700">{f.name}</td>
                    <td className="px-4 py-2">
                      {f.hasGeoJson
                        ? <CheckCircle2 size={13} className="text-emerald-500" />
                        : <XCircle size={13} className="text-red-400" />}
                    </td>
                    <td className="px-4 py-2">
                      <FreshnessCell date={f.lastWeatherAt} ageDays={f.weatherAgeDays} stale={f.weatherStale} />
                    </td>
                    <td className="px-4 py-2">
                      <FreshnessCell date={f.lastS1At} ageDays={f.s1AgeDays} stale={f.s1Stale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verlauf */}
      {history.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <Clock size={13} /> Verlauf ({history.length} Checks)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                  <th className="text-left px-4 py-2">Zeitpunkt</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="px-3 py-2 text-center">DB</th>
                  <th className="px-3 py-2 text-center">Wetter</th>
                  <th className="px-3 py-2 text-center">Sentinel</th>
                  <th className="px-3 py-2 text-center">S3</th>
                  <th className="px-3 py-2 text-center">Probe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(h.runAt).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-2"><OverallBadge status={h.overall} /></td>
                    <td className="px-3 py-2 text-center"><StatusIcon ok={h.dbOk} /></td>
                    <td className="px-3 py-2 text-center"><StatusIcon ok={h.openMeteoOk} /></td>
                    <td className="px-3 py-2 text-center"><StatusIcon ok={h.sentinelOk} /></td>
                    <td className="px-3 py-2 text-center"><StatusIcon ok={h.s3Ok} /></td>
                    <td className="px-3 py-2 text-center">
                      {h.testAlertS1Id
                        ? <CheckCircle2 size={13} className="text-emerald-500 mx-auto" />
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
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">Täglicher Cron (empfohlen: 06:00 UTC)</p>
        <code className="block bg-white px-3 py-2 rounded border border-slate-200 font-mono text-slate-700">
          curl -H &quot;Authorization: Bearer $CRON_SECRET&quot; https://your-domain/api/cron/health
        </code>
        <p>Test-Alarme werden nach 7 Tagen automatisch bereinigt.</p>
      </div>

    </div>
  );
}
