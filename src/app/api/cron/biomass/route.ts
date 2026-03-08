import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const STATS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

// ---------------------------------------------------------------------------
// OAuth2 Token
// ---------------------------------------------------------------------------

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
// Evalscript: NDVI (Sentinel-2 B04=Red, B08=NIR)
// ---------------------------------------------------------------------------

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"], units: "REFLECTANCE" }],
    output: [
      { id: "ndvi",     bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8"   }
    ]
  };
}
function evaluatePixel(samples) {
  const ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 1e-10);
  return { ndvi: [ndvi], dataMask: [samples.dataMask] };
}`;

// ---------------------------------------------------------------------------
// Einen Monat auswerten
// ---------------------------------------------------------------------------

interface NdviStats {
  mean: number | null;
  min:  number | null;
  max:  number | null;
}

async function fetchNdviForMonth(
  geometry: object,
  year: number,
  month: number,  // 1-based
  token: string,
): Promise<NdviStats> {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const to   = new Date(Date.UTC(year, month, 1)).toISOString(); // exklusiv: erster Tag des Folgemonats

  const body = {
    input: {
      bounds: {
        geometry,
        properties: { crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' },
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { maxCloudCoverage: 100, mosaickingOrder: 'leastCC' },
      }],
    },
    aggregation: {
      timeRange: { from, to },
      aggregationInterval: { of: 'P1M' },
      evalscript: EVALSCRIPT,
    },
    calculations: {
      ndvi: { statistics: {} },
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
    throw new Error(`Statistical API ${res.status}: ${text}`);
  }

  const json = await res.json();
  const interval = json?.data?.[0];
  if (!interval) return { mean: null, min: null, max: null };

  const stats = interval?.outputs?.ndvi?.bands?.B0?.stats;
  if (!stats || stats.sampleCount === 0) return { mean: null, min: null, max: null };

  // Statistical API liefert NaN-Werte als null, Extremwerte prüfen
  const mean = typeof stats.mean  === 'number' && isFinite(stats.mean)  ? stats.mean  : null;
  const min  = typeof stats.min   === 'number' && isFinite(stats.min)   ? stats.min   : null;
  const max  = typeof stats.max   === 'number' && isFinite(stats.max)   ? stats.max   : null;

  return { mean, min, max };
}

// ---------------------------------------------------------------------------
// Route: GET /api/cron/biomass
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Wie viele Monate zurück? Default: 12
  const monthsBack = Number(request.nextUrl.searchParams.get('months') ?? '12');

  try {
    const token = await getAccessToken();

    // Alle Wälder mit geoJson laden
    const forests = await prisma.forest.findMany({
      select: { id: true, name: true, geoJson: true },
    });

    const results: { forest: string; snapshots: number; skipped: number; errors: string[] }[] = [];

    for (const forest of forests) {
      const log = { forest: forest.name, snapshots: 0, skipped: 0, errors: [] as string[] };

      if (!forest.geoJson) {
        log.skipped++;
        results.push(log);
        continue;
      }

      let geometry: object;
      try {
        const raw = typeof forest.geoJson === 'string'
          ? JSON.parse(forest.geoJson)
          : forest.geoJson;
        // Kann ein FeatureCollection, Feature oder direkt ein Polygon sein
        geometry = raw?.features?.[0]?.geometry
          ?? raw?.geometry
          ?? raw;
      } catch {
        log.errors.push('GeoJSON parse error');
        results.push(log);
        continue;
      }

      // Monate berechnen
      const now = new Date();
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const year  = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const snapshotDate = new Date(Date.UTC(year, month - 1, 1));

        // Bereits vorhanden?
        const existing = await prisma.forestBiomassSnapshot.findFirst({
          where: {
            forestId: forest.id,
            date: snapshotDate,
          },
        });
        if (existing) {
          log.skipped++;
          continue;
        }

        try {
          const ndvi = await fetchNdviForMonth(geometry, year, month, token);

          await prisma.forestBiomassSnapshot.create({
            data: {
              forestId: forest.id,
              date:     snapshotDate,
              meanNdvi: ndvi.mean,
              minNdvi:  ndvi.min,
              maxNdvi:  ndvi.max,
              source:   'SENTINEL2_L2A',
            },
          });
          log.snapshots++;
        } catch (err: any) {
          log.errors.push(`${year}-${String(month).padStart(2, '0')}: ${err.message}`);
        }

        // Rate-Limit: Pause zwischen API-Calls (CDSE Free Tier ~30 req/min)
        await new Promise(r => setTimeout(r, 2500));
      }

      results.push(log);
    }

    const totalSnapshots = results.reduce((s, r) => s + r.snapshots, 0);
    const totalErrors    = results.reduce((s, r) => s + r.errors.length, 0);

    return NextResponse.json({
      success: true,
      message: `${totalSnapshots} Snapshots gespeichert, ${totalErrors} Fehler`,
      details: results,
    });

  } catch (error: any) {
    console.error('[Biomass Cron]', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
