import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

/**
 * GET /api/app/locate?lat=...&lng=...&orgSlug=...
 *
 * Returns the forest and compartment containing the given GPS coordinates.
 * Used by the mobile app to auto-suggest location after photo capture.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const orgSlug = searchParams.get('orgSlug');
    const lat     = parseFloat(searchParams.get('lat') ?? '');
    const lng     = parseFloat(searchParams.get('lng') ?? '');

    if (!orgSlug || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'orgSlug, lat und lng sind Pflichtfelder' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { members: { where: { userId: session.user.id } } },
    });
    if (!org || !org.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    const forests = await prisma.forest.findMany({
      where: { organizationId: org.id },
      select: {
        id: true, name: true, geoJson: true,
        compartments: {
          select: { id: true, name: true, color: true, geoJson: true },
        },
      },
    });

    const p = point([lng, lat]);

    for (const forest of forests) {
      // Check forest boundary
      let inForest = false;
      try {
        if (forest.geoJson) inForest = booleanPointInPolygon(p, forest.geoJson as any);
      } catch {}

      if (!inForest) continue;

      // Find matching compartment within this forest
      let matchedCompartment: { id: string; name: string | null; color: string | null } | null = null;
      for (const c of forest.compartments) {
        try {
          if (c.geoJson && booleanPointInPolygon(p, c.geoJson as any)) {
            matchedCompartment = c;
            break;
          }
        } catch {}
      }

      return NextResponse.json({
        forestId:        forest.id,
        forestName:      forest.name,
        compartmentId:   matchedCompartment?.id    ?? null,
        compartmentName: matchedCompartment?.name  ?? null,
        compartmentColor: matchedCompartment?.color ?? null,
      });
    }

    // Not in any known forest boundary
    return NextResponse.json({ forestId: null, compartmentId: null });
  } catch (err) {
    console.error('[GET /api/app/locate]', err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
