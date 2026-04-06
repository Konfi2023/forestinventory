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
import { useTranslations } from 'next-intl';

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

function OverallBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations<'Health'>> }) {
  const cls =
    status === 'OK'    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    status === 'WARN'  ? 'bg-amber-100 text-amber-800 border-amber-200' :
                         'bg-red-100 text-red-800 border-red-200';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${cls}`}>
      {status === 'OK' ? t('allOk') : status === 'WARN' ? t('warning') : t('error')}
    </span>
  );
}

function ServiceCard({
  icon, label, ok, latencyMs, info, error, t,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  latencyMs?: number;
  info?: string;
  error?: string;
  t: ReturnType<typeof useTranslations<'Health'>>;
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
        <p className="text-xs text-slate-400">{t('msLatency', { ms: latencyMs })}</p>
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
  const t = useTranslations('Health');
  const [isPending, startTransition] = useTransition();
  const [localHistory, setLocalHistory] = useState<HealthEntry[]>(history);

  const latest = localHistory[0] ?? null;
  const report = latest?.report as HealthReport | null;

  function handleTrigger() {
    startTransition(async () => {
      try {
        const result = await triggerHealthCheck(slug);
        toast.success(t('healthCheckDone', { status: result.overall }));
        // Seite neu laden um frische Daten zu zeigen
        window.location.reload();
      } catch (e: any) {
        toast.error(e?.message ?? t('healthCheckError'));
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
              <OverallBadge status={latest.overall} t={t} />
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Clock size={13} />
                {t('lastCheck', { date: new Date(latest.runAt).toLocaleString('de-DE') })}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">{t('noCheckYet')}</span>
          )}
        </div>
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition"
        >
          <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
          {isPending ? t('checking') : t('runHealthCheck')}
        </button>
      </div>

      {/* Service-Status */}
      {latest && report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ServiceCard
            icon={<Database size={16} />}
            label={t('database')}
            ok={latest.dbOk}
            latencyMs={report.db?.latencyMs}
            error={report.db?.error}
            info="PostgreSQL"
            t={t}
          />
          <ServiceCard
            icon={<Cloud size={16} />}
            label={t('openMeteo')}
            ok={latest.openMeteoOk}
            latencyMs={report.openMeteo?.latencyMs}
            info={report.openMeteo?.info}
            error={report.openMeteo?.error}
            t={t}
          />
          <ServiceCard
            icon={<Satellite size={16} />}
            label={t('sentinelHub')}
            ok={latest.sentinelOk}
            latencyMs={report.sentinel?.latencyMs}
            info={report.sentinel?.info}
            error={report.sentinel?.error}
            t={t}
          />
          <ServiceCard
            icon={<HardDrive size={16} />}
            label={t('s3Storage')}
            ok={latest.s3Ok}
            info={report.s3?.info ?? (latest.s3Ok ? t('configured') : t('notConfigured'))}
            error={report.s3?.error}
            t={t}
          />
        </div>
      )}

      {/* Test-Alarm Status */}
      {latest && report?.testAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 text-sm text-amber-800 flex items-start gap-3">
          <Activity size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <strong>{t('probeAlertActive')}</strong> — {t('probeAlertTestData')} <em>{report.testAlert.forestName}</em>:
            {' '}{t('probeAlertDesc')}
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
            {t('dataFreshness')}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">{t('thForest')}</th>
                  <th className="text-left px-4 py-2.5">{t('thGeoJson')}</th>
                  <th className="text-left px-4 py-2.5">{t('thLastWeather')}</th>
                  <th className="text-left px-4 py-2.5">{t('thLastSar')}</th>
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
                      <FreshnessCell date={f.lastWeatherAt} ageDays={f.weatherAgeDays} stale={f.weatherStale} maxDays={2} t={t} />
                    </td>
                    <td className="px-4 py-2.5">
                      <FreshnessCell date={f.lastS1At} ageDays={f.s1AgeDays} stale={f.s1Stale} maxDays={12} t={t} />
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
            {t('history', { count: localHistory.length })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">{t('thTimestamp')}</th>
                  <th className="text-left px-4 py-2.5">{t('thStatus')}</th>
                  <th className="text-left px-4 py-2.5">{t('thDb')}</th>
                  <th className="text-left px-4 py-2.5">{t('thWeatherApi')}</th>
                  <th className="text-left px-4 py-2.5">{t('thSentinel')}</th>
                  <th className="text-left px-4 py-2.5">{t('thS3')}</th>
                  <th className="text-left px-4 py-2.5">{t('thProbeAlarm')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localHistory.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {new Date(h.runAt).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-2.5"><OverallBadge status={h.overall} t={t} /></td>
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
        <p className="font-semibold text-slate-600">{t('cronTitle')}</p>
        <p>
          {t('cronDesc')} <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            GET /api/cron/health
          </code>{' '}
          {t('cronAuth')} <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            Authorization: Bearer {'<CRON_SECRET>'}
          </code>
        </p>
        <p>{t('cronCleanup')}</p>
      </div>

    </div>
  );
}

function FreshnessCell({
  date, ageDays, stale, maxDays, t,
}: { date: string | null; ageDays: number | null; stale: boolean; maxDays: number; t: ReturnType<typeof useTranslations<'Health'>> }) {
  if (!date) return <span className="text-slate-300 text-xs">{t('noData')}</span>;
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
