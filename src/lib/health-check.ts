/**
 * System Health Check – Kernlogik
 * Wird von /api/cron/health und der Server Action aufgerufen.
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface ServiceResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  info?: string;
}

export interface ForestFreshness {
  id:            string;
  name:          string;
  hasGeoJson:    boolean;
  lastWeatherAt: string | null;
  weatherAgeDays: number | null;
  weatherStale:  boolean;
  lastS1At:      string | null;
  s1AgeDays:     number | null;
  s1Stale:       boolean;
}

export interface HealthReport {
  db:           ServiceResult;
  openMeteo:    ServiceResult;
  sentinel:     ServiceResult;
  s3:           ServiceResult;
  forests:      ForestFreshness[];
  staleForests: number;
  testAlert:    { s1Id: string; wxId: string; forestName: string; forestId: string; orgSlug: string } | null;
  cleanedUp:    { s1: number; wx: number };
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function daysDiff(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

async function pingOpenMeteo(): Promise<ServiceResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=48.1&longitude=11.6&daily=temperature_2m_max&forecast_days=1&timezone=UTC',
      { signal: AbortSignal.timeout(8000) },
    );
    const latencyMs = Date.now() - t0;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const json = await res.json();
    const ok = Array.isArray(json?.daily?.time) && json.daily.time.length > 0;
    return { ok, latencyMs, info: ok ? `${json.daily.time[0]}` : 'Leere Antwort' };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

async function pingSentinelHub(): Promise<ServiceResult> {
  const clientId     = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: 'CDSE_CLIENT_ID / CDSE_CLIENT_SECRET nicht konfiguriert' };
  }

  const t0 = Date.now();
  try {
    const body = new URLSearchParams();
    body.set('grant_type',    'client_credentials');
    body.set('client_id',     clientId);
    body.set('client_secret', clientSecret);

    const res = await fetch(
      'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
        signal: AbortSignal.timeout(10000) },
    );
    const latencyMs = Date.now() - t0;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const json = await res.json();
    const ok = !!json?.access_token;
    return { ok, latencyMs, info: ok ? `Token: ${json.token_type}, ${json.expires_in}s` : 'Kein Token' };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

function checkS3(): ServiceResult {
  const bucket    = process.env.S3_BUCKET_NAME ?? process.env.AWS_S3_BUCKET;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const region    = process.env.AWS_REGION ?? process.env.S3_REGION;
  if (!bucket || !accessKey) {
    return { ok: false, error: 'S3-Credentials nicht konfiguriert (Platzhalter in .env)', info: 'Lokal-Fallback aktiv' };
  }
  return { ok: true, info: `Bucket: ${bucket}, Region: ${region ?? '—'}` };
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

/** Führt alle Health-Checks durch, speichert Ergebnis in SystemHealthCheck und gibt es zurück. */
export async function runHealthCheck() {
  const report: HealthReport = {
    db:           { ok: false },
    openMeteo:    { ok: false },
    sentinel:     { ok: false },
    s3:           { ok: false },
    forests:      [],
    staleForests: 0,
    testAlert:    null,
    cleanedUp:    { s1: 0, wx: 0 },
  };

  // 1. DB-Konnektivität
  const dbT0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    report.db = { ok: true, latencyMs: Date.now() - dbT0 };
  } catch (e: any) {
    report.db = { ok: false, latencyMs: Date.now() - dbT0, error: e?.message ?? String(e) };
  }

  // 2. Datenfreshness pro Wald
  const forests = await prisma.forest.findMany({
    select: {
      id: true, name: true, geoJson: true,
      organization: { select: { slug: true } },
    },
    orderBy: { name: 'asc' },
  });

  for (const f of forests) {
    const lastWx = await prisma.forestWeatherSnapshot.findFirst({
      where: { forestId: f.id, source: { not: 'TEST_ALERT' } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const lastS1 = await prisma.forestS1Snapshot.findFirst({
      where: { forestId: f.id, source: { not: 'TEST_ALERT' } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const wxAge  = lastWx ? daysDiff(lastWx.date)  : null;
    const s1Age  = lastS1 ? daysDiff(lastS1.date)  : null;
    const hasGeo = !!f.geoJson;

    const entry: ForestFreshness = {
      id:             f.id,
      name:           f.name,
      hasGeoJson:     hasGeo,
      lastWeatherAt:  lastWx ? lastWx.date.toISOString() : null,
      weatherAgeDays: wxAge,
      weatherStale:   hasGeo && (wxAge == null || wxAge > 2),
      lastS1At:       lastS1 ? lastS1.date.toISOString() : null,
      s1AgeDays:      s1Age,
      s1Stale:        hasGeo && (s1Age == null || s1Age > 12),
    };
    report.forests.push(entry);
    if (entry.weatherStale || entry.s1Stale) report.staleForests++;
  }

  // 3. Open-Meteo ping
  report.openMeteo = await pingOpenMeteo();

  // 4. Sentinel Hub OAuth2
  report.sentinel = await pingSentinelHub();

  // 5. S3-Konfiguration
  report.s3 = checkS3();

  // 6. Cleanup ALLER Test-Alarme (werden nie automatisch neu erstellt)
  const [cleanS1, cleanWx] = await Promise.all([
    prisma.forestS1Snapshot.deleteMany({ where: { source: 'TEST_ALERT' } }),
    prisma.forestWeatherSnapshot.deleteMany({ where: { source: 'TEST_ALERT' } }),
  ]);
  report.cleanedUp = { s1: cleanS1.count, wx: cleanWx.count };

  // 8. Gesamtstatus berechnen
  const criticalOk = report.db.ok && report.openMeteo.ok;
  const overall =
    !criticalOk              ? 'ERROR' :
    !report.sentinel.ok || report.staleForests > 0 ? 'WARN' :
    'OK';

  // 9. Ergebnis speichern
  const saved = await prisma.systemHealthCheck.create({
    data: {
      overall,
      dbOk:         report.db.ok,
      openMeteoOk:  report.openMeteo.ok,
      sentinelOk:   report.sentinel.ok,
      s3Ok:         report.s3.ok,
      report:       report as any,
      testAlertS1Id: report.testAlert?.s1Id ?? null,
      testAlertWxId: report.testAlert?.wxId ?? null,
    },
  });

  return { ...saved, report };
}
