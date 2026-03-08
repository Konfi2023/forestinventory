import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Sentinel Hub OAuth2 (selbe Credentials wie WMS-Proxy)
// ---------------------------------------------------------------------------

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CATALOG_URL = 'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';
const STATS_URL   = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.exp > now) return cachedToken.token;

  const clientId     = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing CDSE credentials');

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const expiresIn = Number(json.expires_in ?? 3600);
  cachedToken = { token: json.access_token, exp: now + (expiresIn - 60) * 1000 };
  return cachedToken.token;
}

// ---------------------------------------------------------------------------
// Catalog API: Neue S1 GRD Szenen seit einem Datum prüfen
// ---------------------------------------------------------------------------

async function hasNewS1Scenes(
  geometry: object,
  since: string, // ISO8601
  token: string,
): Promise<boolean> {
  const body = {
    collections: ['sentinel-1-grd'],
    datetime: `${since}/..`,
    intersects: geometry,
    limit: 1,
    fields: { include: ['id'], exclude: [] },
  };

  const res = await fetch(CATALOG_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Catalog API ${res.status}: ${text}`);
  }

  const json = await res.json();
  return (json?.features?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Evalscript: VH + VV Rückstreuung (linear, für Statistics API)
// ---------------------------------------------------------------------------

const S1_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VH", "VV", "dataMask"], units: "LINEAR_POWER" }],
    output: [
      { id: "vh",       bands: 1, sampleType: "FLOAT32" },
      { id: "vv",       bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8"   }
    ]
  };
}
function evaluatePixel(samples) {
  return {
    vh:       [samples.VH],
    vv:       [samples.VV],
    dataMask: [samples.dataMask]
  };
}`;

interface S1Stats {
  vhMean:   number | null;
  vhStd:    number | null;
  vvMean:   number | null;
  vvStd:    number | null;
  sceneCount: number;
}

async function fetchS1StatsForWindow(
  geometry: object,
  from: string,
  to: string,
  token: string,
): Promise<S1Stats> {
  const body = {
    input: {
      bounds: {
        geometry,
        properties: { crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' },
      },
      data: [{
        type: 'sentinel-1-grd',
        dataFilter: {
          acquisitionMode: 'IW',
          polarization: 'DV',
          resolution: 'HIGH',
        },
        processing: {
          orthorectify: true,
          backCoeff: 'GAMMA0_TERRAIN',
        },
      }],
    },
    aggregation: {
      timeRange: { from, to },
      aggregationInterval: { of: 'P1D' },
      evalscript: S1_EVALSCRIPT,
    },
    calculations: {
      vh: { statistics: {} },
      vv: { statistics: {} },
    },
  };

  const res = await fetch(STATS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Statistics API ${res.status}: ${text}`);
  }

  const json = await res.json();
  const intervals: any[] = json?.data ?? [];

  // Alle Intervalle mit validen Daten sammeln und mitteln
  const vhValues: number[] = [];
  const vvValues: number[] = [];

  for (const interval of intervals) {
    const vhStats = interval?.outputs?.vh?.bands?.B0?.stats;
    const vvStats = interval?.outputs?.vv?.bands?.B0?.stats;

    if (vhStats && vhStats.sampleCount > 0 && typeof vhStats.mean === 'number' && isFinite(vhStats.mean)) {
      vhValues.push(vhStats.mean);
    }
    if (vvStats && vvStats.sampleCount > 0 && typeof vvStats.mean === 'number' && isFinite(vvStats.mean)) {
      vvValues.push(vvStats.mean);
    }
  }

  if (vhValues.length === 0) {
    return { vhMean: null, vhStd: null, vvMean: null, vvStd: null, sceneCount: 0 };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr: number[], mean: number) =>
    Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);

  const vhMean = avg(vhValues);
  const vvMean = vvValues.length > 0 ? avg(vvValues) : null;

  return {
    vhMean,
    vhStd:    vhValues.length > 1 ? std(vhValues, vhMean) : null,
    vvMean,
    vvStd:    vvValues.length > 1 && vvMean !== null ? std(vvValues, vvMean) : null,
    sceneCount: vhValues.length,
  };
}

// ---------------------------------------------------------------------------
// dB Umrechnung
// ---------------------------------------------------------------------------

function toDb(linear: number | null): number | null {
  if (linear === null || linear <= 0) return null;
  return 10 * Math.log10(linear);
}

// ---------------------------------------------------------------------------
// Rolling Median (letzten N Snapshots)
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ---------------------------------------------------------------------------
// Route: GET /api/cron/sentinel1
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Anomalie-Schwelle in dB (Standard: 3 dB ≈ Faktor 2 in Rückstreuung)
  const anomalyThresholdDb = Number(
    request.nextUrl.searchParams.get('threshold') ?? '3'
  );
  // Rollendes Fenster für Baseline
  const baselineWindow = Number(
    request.nextUrl.searchParams.get('baseline') ?? '6'
  );

  try {
    const token = await getAccessToken();

    const forests = await prisma.forest.findMany({
      select: { id: true, name: true, organizationId: true, geoJson: true },
    });

    // Pro Org den ersten Member als Task-Creator vorladen
    const orgIds = [...new Set(forests.map(f => f.organizationId))];
    const orgMembers = await prisma.membership.findMany({
      where: { organizationId: { in: orgIds } },
      select: { organizationId: true, userId: true },
      distinct: ['organizationId'],
    });
    const orgAdminMap = new Map(orgMembers.map((m: { organizationId: string; userId: string }) => [m.organizationId, m.userId]));

    const results: {
      forest: string;
      newSnapshot: boolean;
      skipped: boolean;
      anomaly: boolean;
      taskCreated: boolean;
      error?: string;
    }[] = [];

    for (const forest of forests) {
      const log = {
        forest: forest.name,
        newSnapshot: false,
        skipped: false,
        anomaly: false,
        taskCreated: false,
      };

      if (!forest.geoJson) {
        log.skipped = true;
        results.push(log);
        continue;
      }

      let geometry: object;
      try {
        const raw = typeof forest.geoJson === 'string'
          ? JSON.parse(forest.geoJson)
          : forest.geoJson;
        geometry = raw?.features?.[0]?.geometry ?? raw?.geometry ?? raw;
      } catch {
        results.push({ ...log, error: 'GeoJSON parse error' });
        continue;
      }

      try {
        // Letzten Snapshot ermitteln (für Catalog-Prüfung)
        const lastSnapshot = await prisma.forestS1Snapshot.findFirst({
          where: { forestId: forest.id },
          orderBy: { date: 'desc' },
        });

        const checkSince = lastSnapshot
          ? lastSnapshot.date.toISOString()
          : new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(); // 12 Tage zurück

        // Catalog API: Gibt es neue Szenen seit letztem Snapshot?
        const hasNew = await hasNewS1Scenes(geometry, checkSince, token);
        if (!hasNew) {
          log.skipped = true;
          results.push(log);
          // Kleine Pause um Rate Limits zu schonen
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Zeitfenster: letzte 6 Tage (S1 revisit ~6 Tage für Mitteleuropa)
        const toDate   = new Date();
        const fromDate = new Date(toDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        const snapshotDate = new Date(
          Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate())
        );

        // Bereits für heute vorhanden?
        const existing = await prisma.forestS1Snapshot.findUnique({
          where: { forestId_date: { forestId: forest.id, date: snapshotDate } },
        });
        if (existing) {
          log.skipped = true;
          results.push(log);
          continue;
        }

        // Statistics API abrufen
        const stats = await fetchS1StatsForWindow(
          geometry,
          fromDate.toISOString(),
          toDate.toISOString(),
          token,
        );

        if (stats.sceneCount === 0) {
          log.skipped = true;
          results.push(log);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const vhMeanDb = toDb(stats.vhMean);
        const vvMeanDb = toDb(stats.vvMean);
        const ratio    = stats.vhMean && stats.vvMean && stats.vvMean > 0
          ? stats.vhMean / stats.vvMean
          : null;

        // Baseline: Median der letzten N Snapshots (nur wenn vhMeanDb vorhanden)
        const previousSnapshots = await prisma.forestS1Snapshot.findMany({
          where: { forestId: forest.id, vhMeanDb: { not: null } },
          orderBy: { date: 'desc' },
          take: baselineWindow,
          select: { vhMeanDb: true },
        });

        const baselineValues = previousSnapshots
          .map(s => s.vhMeanDb)
          .filter((v): v is number => v !== null);

        const baselineDb = baselineValues.length >= 2
          ? median(baselineValues)
          : null;

        const changeDb = baselineDb !== null && vhMeanDb !== null
          ? vhMeanDb - baselineDb
          : null;

        const isAnomaly = changeDb !== null && Math.abs(changeDb) >= anomalyThresholdDb;

        // Snapshot speichern
        await prisma.forestS1Snapshot.create({
          data: {
            forestId:   forest.id,
            date:       snapshotDate,
            vhMean:     stats.vhMean,
            vhStd:      stats.vhStd,
            vhMeanDb,
            vvMean:     stats.vvMean,
            vvStd:      stats.vvStd,
            vvMeanDb,
            ratio,
            baselineDb,
            changeDb,
            isAnomaly,
            sceneCount: stats.sceneCount,
          },
        });

        log.newSnapshot = true;
        log.anomaly     = isAnomaly;

        // Automatische Aufgabe bei Anomalie
        if (isAnomaly && changeDb !== null) {
          const direction = changeDb < 0 ? 'Rückgang' : 'Anstieg';
          const absChange = Math.abs(changeDb).toFixed(1);
          const dateStr   = snapshotDate.toISOString().split('T')[0];

          const creatorId = orgAdminMap.get(forest.organizationId);
          if (creatorId) {
            await prisma.task.create({
              data: {
                title: `SAR-Anomalie: ${forest.name} (${dateStr})`,
                description:
                  `Sentinel-1 Rückstreuungs-Anomalie erkannt:\n` +
                  `• ${direction} um ${absChange} dB (Schwelle: ${anomalyThresholdDb} dB)\n` +
                  `• VH-Rückstreuung: ${vhMeanDb?.toFixed(2) ?? '–'} dB\n` +
                  `• Baseline (${baselineValues.length} Aufnahmen): ${baselineDb?.toFixed(2) ?? '–'} dB\n\n` +
                  `Mögliche Ursachen: Kahlschlag, Windwurf, Bestandsverlust oder starke Bodennässe.\n` +
                  `Bitte Waldbereich kontrollieren.`,
                status: 'OPEN',
                priority: Math.abs(changeDb) >= anomalyThresholdDb * 2 ? 'HIGH' : 'MEDIUM',
                forestId: forest.id,
                creatorId,
              },
            });
          }

          log.taskCreated = true;
        }

      } catch (err: any) {
        results.push({ ...log, error: err.message });
        // Bei Fehler trotzdem weitermachen mit den anderen Wäldern
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      results.push(log);

      // Rate-Limit: CDSE Free Tier ~30 req/min
      await new Promise(r => setTimeout(r, 3000));
    }

    const newSnapshots = results.filter(r => r.newSnapshot).length;
    const anomalies    = results.filter(r => r.anomaly).length;
    const tasks        = results.filter(r => r.taskCreated).length;
    const errors       = results.filter(r => r.error).length;

    // -----------------------------------------------------------------------
    // Polygon Tracking: Pflanzungen & Kalamitäten mit trackBiomass=true
    // -----------------------------------------------------------------------

    const trackedPolygons: {
      id: string; type: 'PLANTING' | 'CALAMITY'; forestId: string; geoJson: any;
    }[] = [];

    const [plantings, calamities] = await Promise.all([
      prisma.forestPlanting.findMany({
        where: { trackBiomass: true },
        select: { id: true, forestId: true, geoJson: true },
      }),
      prisma.forestCalamity.findMany({
        where: { trackBiomass: true },
        select: { id: true, forestId: true, geoJson: true },
      }),
    ]);

    for (const p of plantings)  trackedPolygons.push({ ...p, type: 'PLANTING' });
    for (const c of calamities) trackedPolygons.push({ ...c, type: 'CALAMITY' });

    const polyResults: { polygon: string; type: string; newSnapshot: boolean; error?: string }[] = [];

    for (const poly of trackedPolygons) {
      let geometry: object;
      try {
        const raw = typeof poly.geoJson === 'string' ? JSON.parse(poly.geoJson) : poly.geoJson;
        geometry  = raw?.features?.[0]?.geometry ?? raw?.geometry ?? raw;
      } catch {
        polyResults.push({ polygon: poly.id, type: poly.type, newSnapshot: false, error: 'GeoJSON parse error' });
        continue;
      }

      try {
        const toDate   = new Date();
        const fromDate = new Date(toDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        const snapDate = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));

        const existing = await prisma.forestPolygonSnapshot.findUnique({
          where: { polygonId_date: { polygonId: poly.id, date: snapDate } },
        });
        if (existing) {
          polyResults.push({ polygon: poly.id, type: poly.type, newSnapshot: false });
          continue;
        }

        const stats = await fetchS1StatsForWindow(geometry, fromDate.toISOString(), toDate.toISOString(), token);

        if (stats.sceneCount === 0) {
          polyResults.push({ polygon: poly.id, type: poly.type, newSnapshot: false });
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const vhMeanDb = toDb(stats.vhMean);
        const vvMeanDb = toDb(stats.vvMean);

        const prev = await prisma.forestPolygonSnapshot.findMany({
          where: { polygonId: poly.id, vhMeanDb: { not: null } },
          orderBy: { date: 'desc' },
          take: baselineWindow,
          select: { vhMeanDb: true },
        });
        const baselineValues = prev.map(s => s.vhMeanDb).filter((v): v is number => v !== null);
        const baselineDb = baselineValues.length >= 2 ? median(baselineValues) : null;
        const changeDb   = baselineDb !== null && vhMeanDb !== null ? vhMeanDb - baselineDb : null;
        const isAnomaly  = changeDb !== null && Math.abs(changeDb) >= anomalyThresholdDb;

        await prisma.forestPolygonSnapshot.create({
          data: {
            polygonId:   poly.id,
            polygonType: poly.type,
            forestId:    poly.forestId,
            date:        snapDate,
            vhMeanDb,
            vvMeanDb,
            changeDb,
            baselineDb,
            isAnomaly,
            sceneCount: stats.sceneCount,
          },
        });

        polyResults.push({ polygon: poly.id, type: poly.type, newSnapshot: true });
      } catch (err: any) {
        polyResults.push({ polygon: poly.id, type: poly.type, newSnapshot: false, error: err.message });
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    const polyNew    = polyResults.filter(r => r.newSnapshot).length;
    const polyErrors = polyResults.filter(r => r.error).length;

    return NextResponse.json({
      success: true,
      message: `${newSnapshots} Wald-Snapshots, ${anomalies} Anomalien, ${tasks} Aufgaben, ${polyNew} Polygon-Snapshots, ${errors + polyErrors} Fehler`,
      details: results,
      polygons: polyResults,
    });

  } catch (error: any) {
    console.error('[S1 Cron]', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
