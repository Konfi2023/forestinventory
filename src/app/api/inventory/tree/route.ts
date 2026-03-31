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

    // Propagate plot tree site data to compartment (fire-and-forget)
    // Only for plot-based captures — fills empty compartment fields from tree data
    if (plotId && compartmentId) {
      prisma.forestCompartment.findUnique({ where: { id: compartmentId } })
        .then(comp => {
          if (!comp) return;
          const updates: Record<string, any> = {};
          // Only fill fields that are currently empty on the compartment
          if (!comp.soilType && soilCondition) updates.soilType = soilCondition;
          if (!comp.waterBalance && soilMoisture) updates.waterBalance = soilMoisture;
          if (!comp.exposition && exposition) updates.exposition = exposition;
          if (!comp.slopeClass && slopeClass) updates.slopeClass = slopeClass;
          if (!comp.standAge && age) updates.standAge = age;
          if (standType && !comp.developmentStage) {
            // Map app stand types to forsteinrichtung development stages
            const stageMap: Record<string, string> = {
              'YOUNG_GROWTH': 'Verjüngung', 'PURE_CONIFER': 'Stangenholz',
              'PURE_DECIDUOUS': 'Stangenholz', 'MIXED': 'Baumholz I', 'EDGE': 'Baumholz I',
            };
            if (stageMap[standType]) updates.developmentStage = stageMap[standType];
          }
          if (Object.keys(updates).length > 0) {
            return prisma.forestCompartment.update({ where: { id: compartmentId }, data: updates });
          }
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, poiId: poi.id, compartmentId: compartmentId ?? null });
  } catch (err) {
    console.error('Inventory tree error:', err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
