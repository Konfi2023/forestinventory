import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Open-Meteo — kein API-Key nötig (Free Tier, global)
// Historisch: archive-api.open-meteo.com  (Vergangenheit bis ~5 Tage zurück)
// Aktuell/Forecast: api.open-meteo.com
// ---------------------------------------------------------------------------

const ARCHIVE_URL  = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Archiv-API: nur stabil verfügbare tägliche Variablen (ERA5-basiert)
const ARCHIVE_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'windgusts_10m_max',
  'windspeed_10m_max',
  'winddirection_10m_dominant',
  'et0_fao_evapotranspiration',
].join(',');

// Forecast-API: gleiche stabile Variablen + Sonnenstunden
const FORECAST_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'windgusts_10m_max',
  'windspeed_10m_max',
  'winddirection_10m_dominant',
  'et0_fao_evapotranspiration',
  'sunshine_duration',
].join(',');

// ---------------------------------------------------------------------------
// GeoJSON Zentroid
// ---------------------------------------------------------------------------

function getCentroid(geoJson: any): { lat: number; lng: number } | null {
  try {
    const geom = geoJson?.features?.[0]?.geometry ?? geoJson?.geometry ?? geoJson;
    if (!geom || geom.type !== 'Polygon') return null;
    const coords: [number, number][] = geom.coordinates[0];
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Open-Meteo API-Aufruf
// ---------------------------------------------------------------------------

interface DailyWeather {
  date: string;             // YYYY-MM-DD
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  precipMm: number | null;
  windMaxKmh: number | null;
  windAvgKmh: number | null;
  windDirDeg: number | null;
  et0Mm: number | null;
  sunshineDurationH: number | null;
  soilMoisture: number | null;
  waterBalanceMm: number | null;
  isFrost: boolean;
  isHeatStress: boolean;
  barkBeetleRisk: boolean;
  isStorm: boolean;
}

async function fetchWeather(
  lat: number, lng: number,
  startDate: string, endDate: string,
  useArchive: boolean,
): Promise<DailyWeather[]> {
  const base = useArchive ? ARCHIVE_URL : FORECAST_URL;
  const url  = new URL(base);
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('daily',     useArchive ? ARCHIVE_VARS : FORECAST_VARS);
  url.searchParams.set('timezone',  'UTC');

  if (useArchive) {
    // Archive-API: explizite Datumsgrenzen
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date',   endDate);
  } else {
    // Forecast-API: forecast_days ist mit start_date/end_date NICHT kombinierbar
    url.searchParams.set('forecast_days', '16');
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const d = json.daily;
  if (!d?.time) return [];

  return d.time.map((date: string, i: number) => {
    const maxT    = d.temperature_2m_max?.[i] ?? null;
    const minT    = d.temperature_2m_min?.[i] ?? null;
    const avgT    = maxT != null && minT != null ? (maxT + minT) / 2 : null;
    const precip  = d.precipitation_sum?.[i] ?? null;
    const et0     = d.et0_fao_evapotranspiration?.[i] ?? null;
    const windMax = d.windgusts_10m_max?.[i] ?? null;
    const windAvg = d.windspeed_10m_max?.[i] ?? null;
    const windDir = d.winddirection_10m_dominant?.[i] ?? null;
    const sun     = d.sunshine_duration?.[i] != null ? d.sunshine_duration[i] / 3600 : null; // s → h
    const soil    = d.soil_moisture_0_to_7cm?.[i] ?? null;
    const balance = precip != null && et0 != null ? precip - et0 : null;

    return {
      date,
      maxTempC:         maxT    != null ? Number(maxT.toFixed(1))    : null,
      minTempC:         minT    != null ? Number(minT.toFixed(1))    : null,
      avgTempC:         avgT    != null ? Number(avgT.toFixed(1))    : null,
      precipMm:         precip  != null ? Number(precip.toFixed(1))  : null,
      windMaxKmh:       windMax != null ? Number(windMax.toFixed(1)) : null,
      windAvgKmh:       windAvg != null ? Number(windAvg.toFixed(1)) : null,
      windDirDeg:       windDir != null ? Number(windDir.toFixed(0)) : null,
      et0Mm:            et0     != null ? Number(et0.toFixed(2))     : null,
      sunshineDurationH: sun    != null ? Number(sun.toFixed(1))     : null,
      soilMoisture:     soil    != null ? Number(soil.toFixed(3))    : null,
      waterBalanceMm:   balance != null ? Number(balance.toFixed(1)) : null,
      isFrost:          minT != null && minT < 0,
      isHeatStress:     maxT != null && maxT > 30,
      barkBeetleRisk:   avgT != null && avgT >= 16.5 && (precip ?? 0) < 2,
      // Bft 8 Sturm ab 62 km/h Böen (Windwurf-Risiko für Waldbestände)
      isStorm:          windMax != null && windMax >= 62,
    };
  });
}

// ---------------------------------------------------------------------------
// Route: GET /api/cron/weather
// Query-Parameter:
//   days=365    Wie viele Tage in die Vergangenheit (default: 365)
//   forecast=1  Auch Forecast-Daten laden (default: true)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const daysBack = Number(request.nextUrl.searchParams.get('days') ?? '365');
  const withForecast = request.nextUrl.searchParams.get('forecast') !== '0';

  const forests = await prisma.forest.findMany({
    select: { id: true, name: true, geoJson: true },
  });

  const now      = new Date();
  // Archiv endet ~5 Tage vor heute (Latenz Open-Meteo)
  const archiveEnd   = new Date(now); archiveEnd.setDate(archiveEnd.getDate() - 5);
  const archiveStart = new Date(now); archiveStart.setDate(archiveStart.getDate() - daysBack);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const results: { forest: string; inserted: number; skipped: number; errors: string[] }[] = [];

  for (const forest of forests) {
    const log = { forest: forest.name, inserted: 0, skipped: 0, errors: [] as string[] };

    const centroid = forest.geoJson ? getCentroid(forest.geoJson) : null;
    if (!centroid) { log.skipped = -1; results.push(log); continue; }

    try {
      // 1. Historische Daten
      const historical = await fetchWeather(
        centroid.lat, centroid.lng,
        fmt(archiveStart), fmt(archiveEnd),
        true,
      );

      // 2. Forecast (optional)
      const forecast = withForecast ? await fetchWeather(
        centroid.lat, centroid.lng,
        fmt(archiveEnd), fmt(new Date(now.getTime() + 16 * 86400000)),
        false,
      ) : [];

      const all = [...historical, ...forecast];

      for (const w of all) {
        const date = new Date(`${w.date}T00:00:00Z`);
        // 'date' aus dem Spread ausschließen — Prisma erwartet DateTime, w.date ist String
        const { date: _dateStr, ...fields } = w;
        try {
          await prisma.forestWeatherSnapshot.upsert({
            where:  { forestId_date: { forestId: forest.id, date } },
            create: { forestId: forest.id, date, ...fields, source: 'OPEN_METEO' },
            update: { ...fields },
          });
          log.inserted++;
        } catch (e: any) {
          log.skipped++;
          if (log.errors.length < 2) log.errors.push(e?.message ?? String(e));
        }
      }

      // Kurze Pause (Open-Meteo Rate Limit: ~10k req/day, wir sind weit darunter)
      await new Promise(r => setTimeout(r, 200));

    } catch (err: any) {
      log.errors.push(err.message);
    }

    results.push(log);
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const totalErrors   = results.reduce((s, r) => s + r.errors.length, 0);

  return NextResponse.json({
    success: true,
    message: `${totalInserted} Wetter-Datenpunkte gespeichert, ${totalErrors} Fehler`,
    details: results,
  });
}
