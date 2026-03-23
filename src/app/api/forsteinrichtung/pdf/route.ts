import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ForsteinrichtungPdf, type ForsteinrichtungPdfData, type ReportCompartment, type ReportInventoryPlot } from '@/lib/pdf/ForsteinrichtungPdf';
import { getSpeciesLabel } from '@/lib/tree-species';
import { calcPlotMetrics, averagePlotResults } from '@/lib/forest-mensuration';
import { estimateSiteClass, getYieldTableValues, calcStockingDegree, isYieldTableSpecies, SITE_CLASS_LABELS, type Species, type SiteClass } from '@/lib/yield-tables';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const orgSlug       = searchParams.get('orgSlug') ?? '';
  const forestId      = searchParams.get('forestId') ?? '';   // optional filter
  const compartmentId = searchParams.get('compartmentId') ?? ''; // optional single

  if (!orgSlug) return NextResponse.json({ error: 'orgSlug required' }, { status: 400 });

  // Verify membership
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const member = await prisma.membership.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
  });
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Load forests + compartments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forests: any[] = await (prisma.forest.findMany as any)({
    where: {
      organizationId: org.id,
      ...(forestId ? { id: forestId } : {}),
    },
    include: {
      compartments: {
        where: compartmentId ? { id: compartmentId } : {},
        include: {
          inventoryPlots: {
            include: {
              trees: {
                select: { species: true, diameter: true, height: true, age: true },
              },
            },
          },
        },
      },
      pois: {
        where: { type: 'TREE' },
        include: { tree: { select: { compartmentId: true } } },
      },
    },
  });

  const compartments: ReportCompartment[] = [];

  for (const forest of forests) {
    for (const comp of forest.compartments) {
      // Plot metrics
      const plots: ReportInventoryPlot[] = comp.inventoryPlots.map((plot: any) => {
        const plotTrees = plot.trees
          .filter((t: any) => t.diameter != null && t.diameter > 0)
          .map((t: any) => ({ species: t.species, diameterCm: t.diameter, heightM: t.height ?? null }));
        const result = calcPlotMetrics(plotTrees, plot.radiusM, true);

        let siteClassLabel: string | null = null;
        let stockingDegree: number | null = null;

        if (result && comp.standAge && result.meanHeight) {
          const dominantSp = (comp.mainSpecies as any[])?.[0]?.species ?? null;
          if (dominantSp && isYieldTableSpecies(dominantSp)) {
            const sorted = [...plotTrees.filter((t: any) => t.heightM != null)].sort((a, b) => b.diameterCm - a.diameterCm);
            const topK = Math.max(1, Math.round(sorted.length * 0.2));
            const hTop = sorted.slice(0, topK).reduce((s, t) => s + (t.heightM ?? 0), 0) / topK;
            const sc = estimateSiteClass(dominantSp as Species, comp.standAge!, hTop || result.meanHeight!);
            siteClassLabel = SITE_CLASS_LABELS[sc];
            stockingDegree = calcStockingDegree(result.gHa, dominantSp as Species, comp.standAge!, sc);
          }
        }

        return {
          name: plot.name,
          radiusM: plot.radiusM,
          measuredAt: plot.measuredAt.toISOString(),
          nHa: result?.nHa ?? 0,
          gHa: result?.gHa ?? 0,
          vHa: result?.vHa ?? null,
          dg: result?.dg ?? 0,
          siteClassLabel,
          stockingDegree,
        };
      });

      const treeCount = forest.pois.filter((p: any) => p.tree?.compartmentId === comp.id).length;

      const mapSpecies = (arr: any[]) =>
        (arr ?? []).map((e: any) => ({ species: e.species, percent: e.percent ?? 0, label: getSpeciesLabel(e.species) }));

      const mapRejuv = (arr: any[]) =>
        (arr ?? []).map((e: any) => ({ species: e.species, heightCm: e.heightCm ?? 0, density: e.density ?? '', label: getSpeciesLabel(e.species) }));

      compartments.push({
        name: comp.name,
        number: comp.number,
        forestName: forest.name,
        color: comp.color,
        areaHa: comp.areaHa,
        soilType: comp.soilType,
        waterBalance: comp.waterBalance,
        nutrientLevel: comp.nutrientLevel,
        exposition: comp.exposition,
        slopeClass: comp.slopeClass,
        protectionStatus: comp.protectionStatus,
        restrictions: comp.restrictions,
        standAge: comp.standAge,
        developmentStage: comp.developmentStage,
        mixingForm: comp.mixingForm,
        structure: comp.structure,
        mainSpecies: mapSpecies(comp.mainSpecies as any[]),
        sideSpecies: mapSpecies(comp.sideSpecies as any[]),
        volumePerHa: comp.volumePerHa,
        incrementPerHa: comp.incrementPerHa,
        stockingDegree: comp.stockingDegree,
        deadwoodPerHa: comp.deadwoodPerHa,
        yieldClass: comp.yieldClass,
        siteProductivity: comp.siteProductivity,
        rejuvenation: mapRejuv(comp.rejuvenation as any[]),
        vitalityNote: comp.vitalityNote,
        damageNote: comp.damageNote,
        stabilityNote: comp.stabilityNote,
        lastMeasureDate: comp.lastMeasureDate,
        lastMeasureType: comp.lastMeasureType,
        maintenanceStatus: comp.maintenanceStatus,
        accessibility: comp.accessibility,
        note: comp.note,
        plots,
        treeCount,
      });
    }
  }

  if (compartments.length === 0) {
    return NextResponse.json({ error: 'Keine Abteilungen gefunden' }, { status: 404 });
  }

  const data: ForsteinrichtungPdfData = {
    orgName: org.name,
    generatedAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    compartments,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ForsteinrichtungPdf, { data }) as any);

  const filename = compartmentId
    ? `Abteilungsblatt_${compartments[0]?.number ?? compartments[0]?.name ?? 'export'}.pdf`
    : `Forsteinrichtung_${orgSlug}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
