import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MONTH_NAMES_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

const SEASON_PHASES: Record<number, string> = {
  0: 'Winterruhe',   1: 'Winterruhe',   2: 'Frühjahrsbelebung',
  3: 'Frühjahrsbelebung', 4: 'Frühjahr',  5: 'Vegetationshöhepunkt',
  6: 'Vegetationshöhepunkt', 7: 'Hochsommer', 8: 'Spätsommer',
  9: 'Herbstbeginn', 10: 'Herbst',      11: 'Winterruhe',
};

interface SnapshotInput {
  date: string;
  meanNdvi: number | null;
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const { forestName, forestId, snapshots }: { forestName: string; forestId: string; snapshots: SnapshotInput[] } = await request.json();

  // ── Kontext aufbauen ──────────────────────────────────────────────────────

  const valid = snapshots.filter(s => s.meanNdvi != null) as (SnapshotInput & { meanNdvi: number })[];
  const sorted = [...valid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 3) {
    return NextResponse.json({ error: 'Zu wenig Datenpunkte für eine Analyse (min. 3).' }, { status: 400 });
  }

  const now        = new Date();
  const curYear    = now.getFullYear();
  const curMonth   = now.getMonth(); // 0-based

  // Neuester verfügbarer Datenpunkt (nicht zwingend der aktuelle Monat)
  const latest     = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date);
  const latestYear = latestDate.getFullYear();
  const latestMonth= latestDate.getMonth();

  // Vormonat
  const prevMonthSnap = sorted.find(s => {
    const d = new Date(s.date);
    return d.getFullYear() === latestYear && d.getMonth() === latestMonth - 1;
  }) ?? sorted[sorted.length - 2];

  // Gleicher Monat Vorjahr
  const sameMonthPrevYear = sorted.find(s => {
    const d = new Date(s.date);
    return d.getFullYear() === latestYear - 1 && d.getMonth() === latestMonth;
  });

  // 3-Jahres-Durchschnitt für diesen Monat
  const historical = sorted.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === latestMonth && d.getFullYear() < latestYear;
  });
  const avg3y = historical.length > 0
    ? historical.reduce((s, x) => s + x.meanNdvi, 0) / historical.length
    : null;

  // Trendrichtung (letzten 6 Monate)
  const last6 = sorted.slice(-6);
  const trendSlope = last6.length >= 3
    ? last6[last6.length - 1].meanNdvi - last6[0].meanNdvi
    : 0;
  const trendDir = trendSlope > 0.02 ? 'positiv' : trendSlope < -0.02 ? 'negativ' : 'stabil';

  // Abweichung vom 3-Jahres-Mittel
  const deviationPct = avg3y
    ? (((latest.meanNdvi - avg3y) / avg3y) * 100).toFixed(1)
    : null;

  // Ausreißer-Check (>20% unter Vormonat in normalerweise stabiler Phase)
  const prevValue  = prevMonthSnap?.meanNdvi ?? null;
  const monthDrop  = prevValue ? ((latest.meanNdvi - prevValue) / prevValue) * 100 : null;
  const anomalyDetected = monthDrop != null && monthDrop < -15;

  // YoY Änderung
  const yoyChange = sameMonthPrevYear
    ? (((latest.meanNdvi - sameMonthPrevYear.meanNdvi) / sameMonthPrevYear.meanNdvi) * 100).toFixed(1)
    : null;

  // ── Wetterdaten für den analysierten Monat aus DB ────────────────────────
  const weatherMonthStart = new Date(Date.UTC(latestYear, latestMonth, 1));
  const weatherMonthEnd   = new Date(Date.UTC(latestYear, latestMonth + 1, 0));

  const weatherRows = forestId ? await prisma.forestWeatherSnapshot.findMany({
    where: {
      forestId,
      date: { gte: weatherMonthStart, lte: weatherMonthEnd },
    },
    orderBy: { date: 'asc' },
  }) : [];

  let weatherContext: Record<string, any> | null = null;
  if (weatherRows.length > 0) {
    const precips  = weatherRows.map(w => w.precipMm).filter((v): v is number => v != null);
    const temps    = weatherRows.map(w => w.avgTempC).filter((v): v is number => v != null);
    const winds    = weatherRows.map(w => w.windMaxKmh).filter((v): v is number => v != null);
    const balances = weatherRows.map(w => w.waterBalanceMm).filter((v): v is number => v != null);

    const sumPrecip   = precips.reduce((s, v) => s + v, 0);
    const avgTemp     = temps.length ? temps.reduce((s, v) => s + v, 0) / temps.length : null;
    const maxWind     = winds.length ? Math.max(...winds) : null;
    const sumBalance  = balances.reduce((s, v) => s + v, 0);
    const frostDays   = weatherRows.filter(w => w.isFrost).length;
    const heatDays    = weatherRows.filter(w => w.isHeatStress).length;
    const beetleDays  = weatherRows.filter(w => w.barkBeetleRisk).length;

    // Niederschlagsanomalie: historischer Monatsdurchschnitt aus Wetterdaten der Vorjahre
    const historicWeather = await prisma.forestWeatherSnapshot.findMany({
      where: {
        forestId,
        date: {
          gte: new Date(Date.UTC(latestYear - 3, latestMonth, 1)),
          lte: new Date(Date.UTC(latestYear - 1, latestMonth + 1, 0)),
        },
      },
      select: { precipMm: true, date: true },
    });
    const histPrecips = historicWeather
      .filter(w => new Date(w.date).getMonth() === latestMonth)
      .map(w => w.precipMm).filter((v): v is number => v != null);
    const histAvgPrecip = histPrecips.length
      ? histPrecips.reduce((s, v) => s + v, 0) / histPrecips.length * (weatherRows.length / 30)
      : null;
    const precipAnomaly = histAvgPrecip && histAvgPrecip > 0
      ? `${((sumPrecip - histAvgPrecip) / histAvgPrecip * 100).toFixed(0)}%`
      : null;

    weatherContext = {
      data_days: weatherRows.length,
      precipitation_sum_mm: Number(sumPrecip.toFixed(1)),
      precipitation_anomaly_vs_3y_avg: precipAnomaly,
      avg_temp_celsius: avgTemp != null ? Number(avgTemp.toFixed(1)) : null,
      max_wind_gusts_kmh: maxWind,
      water_balance_mm: Number(sumBalance.toFixed(1)),
      frost_days: frostDays,
      heat_stress_days: heatDays,
      bark_beetle_risk_days: beetleDays,
      drought_risk: sumBalance < -40 ? 'hoch' : sumBalance < -20 ? 'mittel' : 'niedrig',
    };
  }

  const contextData = {
    context: {
      location_name: forestName,
      report_month: `${MONTH_NAMES_DE[latestMonth]} ${latestYear}`,
      current_season_phase: SEASON_PHASES[latestMonth],
    },
    current_data: {
      ndvi_value: latest.meanNdvi.toFixed(3),
      growth_vs_prev_month: prevValue ? (latest.meanNdvi - prevValue).toFixed(3) : null,
      growth_vs_prev_year: yoyChange ? `${Number(yoyChange) > 0 ? '+' : ''}${yoyChange}%` : null,
    },
    historical_context: {
      '3_year_average_for_month': avg3y?.toFixed(3) ?? null,
      deviation_from_average: deviationPct ? `${Number(deviationPct) > 0 ? '+' : ''}${deviationPct}%` : null,
      trend_direction: trendDir,
      outliers_detected: anomalyDetected,
      ...(anomalyDetected && { anomaly_detail: `Rückgang um ${Math.abs(monthDrop!).toFixed(1)}% gegenüber dem Vormonat` }),
    },
    seasonality: {
      typical_peak_month: 'August',
      current_phase: SEASON_PHASES[latestMonth],
    },
    ...(weatherContext ? { weather_context: weatherContext } : {}),
  };

  // ── Prompt ────────────────────────────────────────────────────────────────

  const systemPrompt = `Du bist ein KI-Assistent für Forstwirtschaft und Satellitendatenanalyse.
Deine Aufgabe ist es, NDVI-Vegetationsdaten für Waldbesitzer zu interpretieren.
Dein Tonfall ist professionell, sachlich und prägnant.
Vermeide technische Floskeln und fokussiere dich auf die Vitalität und den Gesundheitszustand des Waldes.
Antworte ausschließlich auf Deutsch und ausschließlich als valides JSON-Objekt.`;

  const userPrompt = `Erstelle eine monatliche Vitalitätsanalyse für den Standort "${forestName}" basierend auf folgenden Daten für ${MONTH_NAMES_DE[latestMonth]} ${latestYear}:

${JSON.stringify(contextData, null, 2)}

Anweisungen:
1. Bewerte die aktuelle Vitalität im Vergleich zum Vorjahr und zum langjährigen Mittel.
2. Wenn eine starke Abweichung (>10%) vorliegt, formuliere eine konkrete forstwirtschaftliche Hypothese (früher Austrieb, Trockenstress, möglicher Borkenkäferbefall etc.).
3. Gib einen kurzen Ausblick auf den Folgemonat basierend auf dem Trend und der Saisonphase.
4. Leite den Status (green/yellow/red) aus den Daten ab: green = überdurchschnittlich oder normal, yellow = leicht auffällig, red = kritische Anomalie.
5. Falls Wetterdaten vorhanden: Erkläre NDVI-Abweichungen zwingend mit Wetteranomalien (Dürre, Frost, Hitzestress). Wenn das Wetter gut war aber NDVI trotzdem fällt, warne vor Schädlingsbefall. Erwähne Borkenkäfer-Risikotage wenn >5 Tage im Monat.

Antworte mit exakt diesem JSON-Format:
{
  "status": "green" | "yellow" | "red",
  "headline": "Ein prägnanter Satz (max. 60 Zeichen) als Überschrift",
  "summary": "Drei aussagekräftige Sätze zur Analyse. Zweiter Satz. Dritter Satz mit Ausblick.",
  "takeaways": [
    "Erstes Key Takeaway mit passendem Emoji",
    "Zweites Key Takeaway mit passendem Emoji",
    "Drittes Key Takeaway mit passendem Emoji"
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 500,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return NextResponse.json(result);
}
