import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

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

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orgSlug, forestId, lat, lng, radiusM = 10, name, notes } = body;
    let { compartmentId } = body;

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug fehlt' }, { status: 400 });
    }
    if (!forestId || lat == null || lng == null) {
      return NextResponse.json({ error: 'forestId, lat und lng sind Pflichtfelder' }, { status: 400 });
    }

    // Verify user has access to the org
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { members: { where: { userId: user.id } } },
    });
    if (!org || !org.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    // Auto-detect compartment if not provided
    if (!compartmentId) {
      compartmentId = await detectCompartment(forestId, lat, lng);
    }

    const plot = await prisma.inventoryPlot.create({
      data: {
        forestId,
        lat,
        lng,
        radiusM,
        name:         name  ?? null,
        notes:        notes ?? null,
        measuredById: user.id,
        ...(compartmentId ? { compartmentId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      plotId: plot.id,
      compartmentId: compartmentId ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/app/inventory/plot]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
