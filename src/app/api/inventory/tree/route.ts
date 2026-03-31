import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { calcCo2Storage } from '@/lib/forest-mensuration';

/** Detect compartment from GPS coordinates via point-in-polygon */
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
  } catch {}
  return null;
}

/** Propagate all plot tree data to the parent compartment */
async function propagatePlotDataToCompartment(compartmentId: string) {
  // Get all plot trees in this compartment
  const trees = await prisma.forestPoiTree.findMany({
    where: { compartmentId, plotId: { not: null } },
    select: {
      species: true, speciesId: true, age: true, diameter: true, height: true,
      soilCondition: true, soilMoisture: true, exposition: true, slopeClass: true,
      standType: true, stockingDegree: true,
    },
  });
  if (trees.length === 0) return;

  const comp = await prisma.forestCompartment.findUnique({ where: { id: compartmentId } });
  if (!comp) return;

  const updates: Record<string, any> = {};

  // Calculate species distribution → mainSpecies / sideSpecies
  const speciesCount: Record<string, number> = {};
  trees.forEach(t => {
    const sp = t.species || t.speciesId || 'OTHER';
    speciesCount[sp] = (speciesCount[sp] || 0) + 1;
  });
  const total = trees.length;
  const sorted = Object.entries(speciesCount)
    .map(([species, count]) => ({ species, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.percent - a.percent);

  const mainSpecies = sorted.filter(s => s.percent >= 20);
  const sideSpecies = sorted.filter(s => s.percent > 0 && s.percent < 20);
  if (mainSpecies.length > 0 && (!comp.mainSpecies || (comp.mainSpecies as any[]).length === 0)) {
    updates.mainSpecies = mainSpecies;
  }
  if (sideSpecies.length > 0 && (!comp.sideSpecies || (comp.sideSpecies as any[]).length === 0)) {
    updates.sideSpecies = sideSpecies;
  }

  // Average age → standAge
  const ages = trees.filter(t => t.age != null).map(t => t.age!);
  if (ages.length > 0 && !comp.standAge) {
    updates.standAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
  }

  // Most common site values (mode)
  function mode<T>(vals: (T | null | undefined)[]): T | null {
    const filtered = vals.filter(v => v != null) as T[];
    if (!filtered.length) return null;
    const counts = new Map<T, number>();
    filtered.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  if (!comp.soilType) {
    const v = mode(trees.map(t => t.soilCondition));
    if (v) updates.soilType = v;
  }
  if (!comp.waterBalance) {
    const v = mode(trees.map(t => t.soilMoisture));
    if (v) updates.waterBalance = v;
  }
  if (!comp.exposition) {
    const v = mode(trees.map(t => t.exposition));
    if (v) updates.exposition = v;
  }
  if (!comp.slopeClass) {
    const v = mode(trees.map(t => t.slopeClass));
    if (v) updates.slopeClass = v;
  }
  if (!comp.developmentStage) {
    const v = mode(trees.map(t => t.standType));
    if (v) {
      const stageMap: Record<string, string> = {
        'YOUNG_GROWTH': 'Verjüngung', 'PURE_CONIFER': 'Stangenholz',
        'PURE_DECIDUOUS': 'Stangenholz', 'MIXED': 'Baumholz I',
        'EDGE': 'Baumholz I', 'CLEARCUT': 'Blöße',
      };
      updates.developmentStage = stageMap[v] ?? v;
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.forestCompartment.update({ where: { id: compartmentId }, data: updates });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      forestId, lat, lng, species, speciesId, diameter, height, age, notes,
      soilCondition, soilMoisture,
      exposition, slopeClass, slopePosition, standType, stockingDegree,
      damageType, damageSeverity, crownCondition,
      plotId, orgSlug,
    } = body;

    let { compartmentId } = body;

    if (!forestId || lat == null || lng == null) {
      return NextResponse.json({ error: 'forestId, lat und lng sind Pflichtfelder' }, { status: 400 });
    }

    // ── Duplicate guard ────────────────────────────────────────────────────────
    // Prevent multiple trees from rapid taps on the same GPS position
    const duplicate = await prisma.forestPoi.findFirst({
      where: { type: 'TREE', forestId, lat, lng },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ success: true, poiId: duplicate.id, duplicate: true });
    }

    // ── Auto-detect compartment ────────────────────────────────────────────────
    if (!compartmentId) {
      compartmentId = await detectCompartment(forestId, lat, lng);
    }

    // Resolve legacy species from speciesId for CO2 calculation
    let legacySpecies = species;
    let resolvedSpeciesId = speciesId ?? null;
    if (speciesId && !species) {
      const sp = await prisma.treeSpecies.findUnique({ where: { id: speciesId }, select: { legacyId: true } });
      legacySpecies = sp?.legacyId ?? species;
    }
    if (!resolvedSpeciesId && species) {
      const sp = await prisma.treeSpecies.findUnique({ where: { legacyId: species }, select: { id: true } });
      resolvedSpeciesId = sp?.id ?? null;
    }

    const co2 = (legacySpecies || species) && diameter && height
      ? calcCo2Storage(legacySpecies || species, diameter, height)
      : null;

    const poi = await prisma.forestPoi.create({
      data: {
        type: 'TREE',
        name: 'Einzelbaum',
        lat,
        lng,
        forestId,
        tree: {
          create: {
            species:        legacySpecies  ?? species ?? null,
            speciesId:      resolvedSpeciesId,
            diameter:       diameter       ?? null,
            height:         height         ?? null,
            age:            age            ?? null,
            co2Storage:     co2,
            soilCondition:  soilCondition  ?? null,
            soilMoisture:   soilMoisture   ?? null,
            exposition:     exposition     ?? null,
            slopeClass:     slopeClass     ?? null,
            slopePosition:  slopePosition  ?? null,
            standType:      standType      ?? null,
            stockingDegree: stockingDegree ?? null,
            damageType:     damageType     ?? null,
            damageSeverity: damageSeverity ?? null,
            crownCondition: crownCondition ?? null,
            notes:          notes          ?? null,
            ...(compartmentId ? { compartmentId } : {}),
            ...(plotId        ? { plotId }        : {}),
          },
        },
        measurements: {
          create: {
            measuredById:   session.user.id,
            diameter:       diameter       ?? null,
            height:         height         ?? null,
            co2Storage:     co2,
            soilMoisture:   soilMoisture   ?? null,
            damageType:     damageType     ?? null,
            damageSeverity: damageSeverity ?? null,
            crownCondition: crownCondition ?? null,
            notes:          notes          ?? null,
          },
        },
      },
    });

    // Increment species favorite counter for the org (fire-and-forget)
    if (resolvedSpeciesId && orgSlug) {
      prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } })
        .then(org => {
          if (!org) return;
          return prisma.orgSpeciesFavorite.upsert({
            where: { organizationId_speciesId: { organizationId: org.id, speciesId: resolvedSpeciesId! } },
            create: { organizationId: org.id, speciesId: resolvedSpeciesId!, usageCount: 1 },
            update: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
          });
        })
        .catch(() => {});
    }

    // Propagate plot data to compartment — calculate species distribution + site data
    if (plotId && compartmentId) {
      propagatePlotDataToCompartment(compartmentId).catch(() => {});
    }

    return NextResponse.json({ success: true, poiId: poi.id, compartmentId: compartmentId ?? null });
  } catch (err) {
    console.error('Inventory tree error:', err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
