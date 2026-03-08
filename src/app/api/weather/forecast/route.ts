import { NextRequest, NextResponse } from 'next/server';

// Open-Meteo forecast — no API key, free tier, 16-day forecast
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export async function GET(request: NextRequest) {
  const lat  = request.nextUrl.searchParams.get('lat');
  const lng  = request.nextUrl.searchParams.get('lng');
  const days = Math.min(Number(request.nextUrl.searchParams.get('days') ?? '7'), 16);

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude',  lat);
  url.searchParams.set('longitude', lng);
  url.searchParams.set('current', [
    'temperature_2m',
    'weather_code',
    'wind_speed_10m',
    'precipitation',
    'relative_humidity_2m',
    'apparent_temperature',
  ].join(','));
  url.searchParams.set('daily', [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'sunshine_duration',
  ].join(','));
  url.searchParams.set('timezone',      'auto');
  url.searchParams.set('forecast_days', String(days));

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // cache 1 hour
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Open-Meteo ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  const c    = json.current;
  const d    = json.daily;

  const daily = (d?.time ?? []).map((date: string, i: number) => ({
    date,
    weatherCode: d.weather_code?.[i] ?? 0,
    maxTemp:     d.temperature_2m_max?.[i]  != null ? Math.round(d.temperature_2m_max[i])  : null,
    minTemp:     d.temperature_2m_min?.[i]  != null ? Math.round(d.temperature_2m_min[i])  : null,
    precipMm:       d.precipitation_sum?.[i]            != null ? Number(d.precipitation_sum[i].toFixed(1))       : null,
    precipProbPct:  d.precipitation_probability_max?.[i] != null ? Math.round(d.precipitation_probability_max[i]) : null,
    windKmh:        d.wind_speed_10m_max?.[i]            != null ? Math.round(d.wind_speed_10m_max[i])            : null,
    windGustsKmh:   d.wind_gusts_10m_max?.[i]            != null ? Math.round(d.wind_gusts_10m_max[i])            : null,
    sunshineH:      d.sunshine_duration?.[i]             != null ? Number((d.sunshine_duration[i] / 3600).toFixed(1)) : null,
  }));

  return NextResponse.json({
    current: c ? {
      temp:        c.temperature_2m       != null ? Math.round(c.temperature_2m)       : null,
      feelsLike:   c.apparent_temperature != null ? Math.round(c.apparent_temperature) : null,
      weatherCode: c.weather_code  ?? 0,
      windKmh:     c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) : null,
      precipMm:    c.precipitation ?? 0,
      humidity:    c.relative_humidity_2m ?? null,
    } : null,
    daily,
    timezone: json.timezone,
  });
}
