'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { calcCo2Storage } from '@/lib/forest-mensuration';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

interface ImportTreeRow {
  species: string | null;
  diameter: number | null;
  height: number | null;
  age: number | null;
  lat: number | null;
  lng: number | null;
}

interface ImportPlotRow {
  name: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  trees: ImportTreeRow[];
}

async function detectCompartment(forestId: string, lat: number, lng: number): Promise<string | null> {
  try {
    const forest = await prisma.forest.findUnique({
      where: { id: forestId },
      include: { compartments: { select: { id: true, geoJson: true } } },
    });
    if (!forest?.compartments?.length) return null;
    const p = point([lng, lat]);
    for (const c of forest.compartments) {
      if (c.geoJson && booleanPointInPolygon(p, c.geoJson as any)) return c.id;
    }
  } catch { /* ignore */ }
  return null;
}

// ── Plot-Import ────────────────────────────────────────────────────────────────

export async function importInventoryPlots(
  forestId: string,
  orgSlug: string,
  userId: string,
  plots: ImportPlotRow[],
) {
  let plotsCreated = 0;
  let treesCreated = 0;

  for (const plot of plots) {
    const lat = plot.lat ?? 0;
    const lng = plot.lng ?? 0;
    const compartmentId = lat !== 0 ? await detectCompartment(forestId, lat, lng) : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbPlot = await (prisma as any).inventoryPlot.create({
      data: {
        forestId,
        lat,
        lng,
        radiusM:     plot.radiusM,
        name:        plot.name || null,
        measuredById: userId,
        notes:       lat === 0 ? 'GPS-Koordinaten nicht erfasst – Probekreis nicht auf Karte sichtbar.' : null,
        ...(compartmentId ? { compartmentId } : {}),
      },
    });
    plotsCreated++;

    // Bäume als ForestPoi + ForestPoiTree anlegen (Mittelpunkt als Position)
    for (const tree of plot.trees) {
      if (!tree.species && !tree.diameter) continue;
      const co2 = tree.species && tree.diameter && tree.height
        ? calcCo2Storage(tree.species, tree.diameter, tree.height)
        : null;

      await prisma.forestPoi.create({
        data: {
          type:     'TREE',
          name:     tree.species ? `${tree.species} (Import)` : 'Baum (Import)',
          lat,
          lng,
          forestId,
          tree: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: {
              species:   tree.species  ?? null,
              diameter:  tree.diameter ?? null,
              height:    tree.height   ?? null,
              age:       tree.age      ?? null,
              co2Storage: co2,
              plotId:    (dbPlot as any).id,
              ...(compartmentId ? { compartmentId } : {}),
            } as any,
          },
          measurements: {
            create: {
              measuredById: userId,
              diameter:     tree.diameter ?? null,
              height:       tree.height   ?? null,
              co2Storage:   co2,
            },
          },
        },
      });
      treesCreated++;
    }
  }

  revalidatePath(`/dashboard/org/${orgSlug}/inventory`);
  revalidatePath(`/dashboard/org/${orgSlug}/forsteinrichtung`);
  revalidatePath(`/dashboard/org/${orgSlug}/map`);
  return { success: true, plotsCreated, treesCreated };
}

// ── Einzelbaum-Import ──────────────────────────────────────────────────────────

export async function importInventoryTrees(
  forestId: string,
  orgSlug: string,
  userId: string,
  trees: ImportTreeRow[],
) {
  let treesCreated = 0;
  // Fallback-Koordinate: Wald-Centroid oder 0/0
  const fallbackLat = 0;
  const fallbackLng = 0;

  for (const tree of trees) {
    if (!tree.species && !tree.diameter) continue;
    const lat = tree.lat ?? fallbackLat;
    const lng = tree.lng ?? fallbackLng;
    const compartmentId = lat !== 0 ? await detectCompartment(forestId, lat, lng) : null;
    const co2 = tree.species && tree.diameter && tree.height
      ? calcCo2Storage(tree.species, tree.diameter, tree.height)
      : null;

    await prisma.forestPoi.create({
      data: {
        type:     'TREE',
        name:     tree.species ? `${tree.species} (Import)` : 'Baum (Import)',
        lat,
        lng,
        forestId,
        tree: {
          create: {
            species:   tree.species  ?? null,
            diameter:  tree.diameter ?? null,
            height:    tree.height   ?? null,
            age:       tree.age      ?? null,
            co2Storage: co2,
            notes:     lat === 0 ? 'GPS-Koordinaten nicht erfasst – Baum nicht auf Karte sichtbar.' : null,
            ...(compartmentId ? { compartmentId } : {}),
          },
        },
        measurements: {
          create: {
            measuredById: userId,
            diameter:     tree.diameter ?? null,
            height:       tree.height   ?? null,
            co2Storage:   co2,
          },
        },
      },
    });
    treesCreated++;
  }

  revalidatePath(`/dashboard/org/${orgSlug}/inventory`);
  revalidatePath(`/dashboard/org/${orgSlug}/forsteinrichtung`);
  revalidatePath(`/dashboard/org/${orgSlug}/map`);
  return { success: true, treesCreated };
}
