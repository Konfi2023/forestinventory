import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { forestId, lat, lng, radiusM = 10, name, notes } = body;
    let { compartmentId } = body;

    if (!forestId || lat == null || lng == null) {
      return NextResponse.json({ error: 'forestId, lat und lng sind Pflichtfelder' }, { status: 400 });
    }

    if (!compartmentId) {
      compartmentId = await detectCompartment(forestId, lat, lng);
    }

    const plot = await prisma.inventoryPlot.create({
      data: {
        forestId,
        lat,
        lng,
        radiusM,
        name:          name         ?? null,
        notes:         notes        ?? null,
        measuredById:  session.user.id,
        ...(compartmentId ? { compartmentId } : {}),
      },
    });

    return NextResponse.json({ success: true, plotId: plot.id, compartmentId: compartmentId ?? null });
  } catch (err) {
    console.error('Inventory plot error:', err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
