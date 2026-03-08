import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getAccessibleForests } from '@/lib/forest-access';
import { Leaf, RefreshCw, Radio, FlaskConical } from 'lucide-react';
import { BiomassCharts } from './_components/BiomassCharts';
import { PolygonBiomassSection } from './_components/PolygonBiomassSection';
import { BiomassTabsClient } from './_components/BiomassTabsClient';
import { EudrOverviewPanel } from './_components/EudrOverviewPanel';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { getActiveAlerts } from '@/lib/active-alerts';

export default async function BiomassPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; forest?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const { preview, forest: previewForestId, tab } = await searchParams;
  const activeTab = tab ?? 'monitoring';
  const isPreview = preview === '1';
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin');

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      eudrActivityType: true,
      eoriNumber: true,
      eudrApiEnabled: true,
      eudrApiUsername: true,
      eudrApiPassword: true,
    },
  });
  if (!org) return notFound();

  // EUDR-Tab: DDS + Holzverkäufe laden (nur wenn tab=eudr)
  const [eudrStatements, eudrSales] = activeTab === 'eudr'
    ? await Promise.all([
        prisma.dueDiligenceStatement.findMany({
          where: { orgId: org.id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            activityType: true,
            internalNote: true,
            referenceNumber: true,
            verificationNumber: true,
            createdAt: true,
            submittedAt: true,
            harvestStartDate: true,
            harvestEndDate: true,
            products: {
              select: { id: true, hsCode: true, description: true, treeSpecies: true, quantityM3: true, countryOfHarvest: true },
            },
          },
        }),
        prisma.timberSale.findMany({
          where: { organizationId: org.id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            buyerName: true,
            contractNumber: true,
            status: true,
            eudrReference: true,
            createdAt: true,
            operation: { select: { title: true, year: true, forest: { select: { name: true } } } },
            logPiles: { select: { measuredAmount: true, estimatedAmount: true, treeSpecies: true } },
            _count: { select: { transportTickets: true } },
          },
        }),
      ])
    : [[], []] as const;

  // Nur zugängliche Wälder laden
  const accessible = await getAccessibleForests(org.id, session.user.id);
  const accessibleIds = accessible.map(f => f.id);

  const alerts = await getActiveAlerts(accessibleIds, session.user.id);

  const forests = await prisma.forest.findMany({
    where: { id: { in: accessibleIds } },
    select: {
      id: true,
      name: true,
      color: true,
      geoJson: true,
      biomassSnapshots: {
        orderBy: { date: 'asc' },
        select: { date: true, meanNdvi: true, minNdvi: true, maxNdvi: true },
      },
      s1Snapshots: {
        where: isPreview ? undefined : { source: { not: 'TEST_ALERT' } },
        orderBy: { date: 'asc' },
        select: { date: true, vhMeanDb: true, vvMeanDb: true, ratio: true, changeDb: true, baselineDb: true, isAnomaly: true, sceneCount: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Polygon Snapshots laden (Pflanzungen + Kalamitäten mit trackBiomass=true)
  const polygonSnapshots = await prisma.forestPolygonSnapshot.findMany({
    where: { forestId: { in: accessibleIds } },
    orderBy: { date: 'asc' },
    select: {
      polygonId: true, polygonType: true, forestId: true,
      date: true, vhMeanDb: true, vvMeanDb: true, changeDb: true, baselineDb: true, isAnomaly: true, sceneCount: true,
    },
  });

  // Polygon-Metadaten (Name / Typ-Label) laden
  const [trackedPlantings, trackedCalamities] = await Promise.all([
    prisma.forestPlanting.findMany({
      where: { trackBiomass: true, forestId: { in: accessibleIds } },
      select: { id: true, treeSpecies: true, description: true, areaHa: true, forestId: true },
    }),
    prisma.forestCalamity.findMany({
      where: { trackBiomass: true, forestId: { in: accessibleIds } },
      select: { id: true, cause: true, description: true, areaHa: true, forestId: true },
    }),
  ]);

  // Wetterdaten für alle Wälder laden (täglich → monatlich aggregieren)
  const weatherRows = await prisma.forestWeatherSnapshot.findMany({
    where:   {
      forestId: { in: accessibleIds },
      ...(isPreview ? {} : { source: { not: 'TEST_ALERT' } }),
    },
    select:  {
      forestId: true, date: true,
      avgTempC: true, precipMm: true, waterBalanceMm: true,
      isFrost: true, isHeatStress: true, barkBeetleRisk: true,
      windMaxKmh: true, windAvgKmh: true, windDirDeg: true, isStorm: true,
    },
    orderBy: { date: 'asc' },
  });

  // Tageswerte → Monatswerte je Wald aggregieren
  type MonthEntry = {
    forestId: string; year: number; month: number;
    temps: number[]; precips: number[]; balances: number[];
    frostDays: number; heatDays: number; beetleDays: number;
    stormDays: number; windMaxKmh: number | null;
  };
  const monthMap = new Map<string, MonthEntry>();

  // Sturmereignisse (Tagesebene) separat für Zeitreihen-Marker
  type StormDay = { forestId: string; date: string; windMaxKmh: number; windDirDeg: number | null };
  const stormDays: StormDay[] = [];

  for (const row of weatherRows) {
    const d     = new Date(row.date);
    const year  = d.getFullYear();
    const month = d.getMonth();
    const key   = `${row.forestId}_${year}_${month}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { forestId: row.forestId, year, month,
        temps: [], precips: [], balances: [],
        frostDays: 0, heatDays: 0, beetleDays: 0,
        stormDays: 0, windMaxKmh: null });
    }
    const e = monthMap.get(key)!;
    if (row.avgTempC       != null) e.temps.push(row.avgTempC);
    if (row.precipMm       != null) e.precips.push(row.precipMm);
    if (row.waterBalanceMm != null) e.balances.push(row.waterBalanceMm);
    if (row.isFrost)        e.frostDays++;
    if (row.isHeatStress)   e.heatDays++;
    if (row.barkBeetleRisk) e.beetleDays++;
    if (row.isStorm) {
      e.stormDays++;
      if (row.windMaxKmh != null && (e.windMaxKmh == null || row.windMaxKmh > e.windMaxKmh)) {
        e.windMaxKmh = row.windMaxKmh;
      }
      stormDays.push({
        forestId:   row.forestId,
        date:       d.toISOString(),
        windMaxKmh: row.windMaxKmh ?? 0,
        windDirDeg: row.windDirDeg ?? null,
      });
    }
  }

  // Für die Seite: wie viele Snapshots insgesamt, neuester Datenpunkt
  const totalSnapshots = forests.reduce((s, f) => s + f.biomassSnapshots.length, 0);
  const totalS1Snapshots = forests.reduce((s, f) => s + f.s1Snapshots.length, 0);
  const latestDate = forests
    .flatMap(f => f.biomassSnapshots.map(s => new Date(s.date)))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const sum = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) : null;

  // Serialisierbare Daten für den Client
  const forestData = forests.map(f => ({
    id:        f.id,
    name:      f.name,
    color:     f.color,
    snapshots: f.biomassSnapshots.map(s => ({
      date:     s.date.toISOString(),
      meanNdvi: s.meanNdvi,
      minNdvi:  s.minNdvi,
      maxNdvi:  s.maxNdvi,
    })),
    s1Snapshots: f.s1Snapshots.map(s => ({
      date:       s.date.toISOString(),
      vhMeanDb:   s.vhMeanDb,
      vvMeanDb:   s.vvMeanDb,
      ratio:      s.ratio,
      changeDb:   s.changeDb,
      baselineDb: s.baselineDb,
      isAnomaly:  s.isAnomaly,
      sceneCount: s.sceneCount,
    })),
    weatherMonths: [...monthMap.values()]
      .filter(e => e.forestId === f.id)
      .map(e => ({
        year:         e.year,
        month:        e.month,
        avgTemp:      avg(e.temps)    != null ? Number(avg(e.temps)!.toFixed(1))  : null,
        precipSum:    sum(e.precips)  != null ? Number(sum(e.precips)!.toFixed(1)): null,
        waterBalance: sum(e.balances) != null ? Number(sum(e.balances)!.toFixed(1)): null,
        frostDays:    e.frostDays,
        heatDays:     e.heatDays,
        beetleDays:   e.beetleDays,
        stormDays:    e.stormDays,
        windMaxKmh:   e.windMaxKmh,
      })),
    stormEvents: stormDays
      .filter(s => s.forestId === f.id)
      .map(s => ({
        date:       s.date,
        windMaxKmh: s.windMaxKmh,
        windDirDeg: s.windDirDeg,
      })),
  }));

  // Für EUDR: maßgeblich sind die Waldpolygone (Forest.geoJson), nicht Sub-Flächen
  const trackedPolygons = forests.filter(f => f.geoJson != null).length;
  const apiEnabled    = org.eudrApiEnabled ?? false;
  const apiConfigured = apiEnabled && !!org.eudrApiUsername && !!org.eudrApiPassword;

  return (
    <div className="space-y-6">
      {/* Tab-Navigation */}
      <BiomassTabsClient slug={slug} activeTab={activeTab} />

      {/* EUDR-Tab */}
      {activeTab === 'eudr' && (
        <EudrOverviewPanel
          orgSlug={slug}
          eudrActivityType={org.eudrActivityType}
          eoriNumber={org.eoriNumber}
          trackedPolygons={trackedPolygons}
          apiEnabled={apiEnabled}
          apiConfigured={apiConfigured}
          statements={eudrStatements}
          timberSales={eudrSales.map(s => ({
            id: s.id,
            buyerName: s.buyerName,
            contractNumber: s.contractNumber,
            status: s.status,
            eudrReference: s.eudrReference,
            createdAt: s.createdAt,
            forestName: s.operation?.forest?.name ?? null,
            operationTitle: s.operation?.title ?? null,
            operationYear: s.operation?.year ?? null,
            totalFm: s.logPiles.reduce((sum, p) => sum + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0),
            species: [...new Set(s.logPiles.map(p => p.treeSpecies).filter(Boolean))].join(", "),
            ticketCount: s._count.transportTickets,
          }))}
          forests={forests.map(f => ({ id: f.id, name: f.name }))}
        />
      )}

      {/* Monitoring-Tab */}
      {activeTab === 'monitoring' && <>

      {/* Vorschau-Banner */}
      {isPreview && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 text-sm text-violet-800 flex items-center gap-2">
          <FlaskConical size={15} className="text-violet-500 shrink-0" />
          <strong>Vorschau-Modus:</strong> Test-Alarme (Probe-Daten) sind sichtbar — so sehen Nutzer echte SAR-Anomalien und Sturmereignisse.
        </div>
      )}

      {/* Aktive Alarme */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} orgSlug={slug} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Leaf className="text-emerald-600" size={24} />
            Biomasse-Monitoring
          </h2>
          <p className="text-muted-foreground mt-1">
            NDVI-Jahresvergleich per Wald — Sentinel-2 L2A Satellitendaten
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold text-slate-800">{totalSnapshots}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Datenpunkte</p>
          </div>
          {latestDate && (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-center">
              <p className="text-sm font-bold text-slate-800">
                {latestDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Letzter Snapshot</p>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold text-slate-800">{totalS1Snapshots}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1 justify-center">
              <Radio size={10} /> SAR-Szenen
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-center text-xs text-slate-400">
            <RefreshCw size={14} className="mx-auto mb-1" />
            Monatlich aktualisiert
          </div>
        </div>
      </div>

      {/* Legende */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-3 text-sm text-emerald-800 flex items-start gap-3">
        <Leaf size={16} className="mt-0.5 shrink-0 text-emerald-600" />
        <span>
          <strong>Jahresvergleich:</strong> Jede Linie zeigt den NDVI-Verlauf eines Jahres.
          Der Sommer-NDVI (Jul/Aug) ist der wichtigste Indikator für Waldvitalität —
          ein anhaltender Rückgang gegenüber dem Vorjahr kann auf Trockenstress, Borkenkäfer oder Sturm hinweisen.
          Werte unter 0,2 im Sommer sind kritisch.
        </span>
      </div>

      {/* Charts */}
      <BiomassCharts forests={forestData} initialForestId={isPreview ? previewForestId : undefined} />

      {/* Polygon SAR-Tracking */}
      {(trackedPlantings.length > 0 || trackedCalamities.length > 0) && (
        <PolygonBiomassSection
          plantings={trackedPlantings.map(p => ({
            id: p.id,
            label: p.description || p.treeSpecies || 'Pflanzfläche',
            areaHa: p.areaHa,
            forestId: p.forestId,
            forestName: forests.find(f => f.id === p.forestId)?.name ?? '',
          }))}
          calamities={trackedCalamities.map(c => ({
            id: c.id,
            label: c.description || c.cause || 'Kalamitätsfläche',
            areaHa: c.areaHa,
            forestId: c.forestId,
            forestName: forests.find(f => f.id === c.forestId)?.name ?? '',
          }))}
          snapshots={polygonSnapshots.map(s => ({
            polygonId:   s.polygonId,
            polygonType: s.polygonType,
            date:        s.date.toISOString(),
            vhMeanDb:    s.vhMeanDb,
            changeDb:    s.changeDb,
            baselineDb:  s.baselineDb,
            isAnomaly:   s.isAnomaly,
            sceneCount:  s.sceneCount,
          }))}
        />
      )}

      </>}
    </div>
  );
}
