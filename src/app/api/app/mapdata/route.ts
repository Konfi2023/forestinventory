import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgSlug = req.nextUrl.searchParams.get('orgSlug');
    if (!orgSlug) return NextResponse.json({ error: 'orgSlug fehlt' }, { status: 400 });

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        members: {
          where: { userId: session.user.id },
          include: { role: true },
        },
      },
    });

    if (!org || !org.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    const isAdmin = org.members[0].role.name === 'Administrator';
    const permissions = isAdmin ? ['*'] : (org.members[0].role.permissions ?? []);

    // Forests mit allen Karten-Layern laden.
    // POIs: max. 500 pro Anfrage, nested Relations mit select statt true
    // um den Payload zu begrenzen. Messhistorie wird nicht mitgeladen.
    const forests = await prisma.forest.findMany({
      where: { organizationId: org.id },
      include: {
        paths: true,
        pois: {
          take: 500,
          include: {
            vehicle: {
              select: {
                vehicleType: true,
                serialNumber: true,
                yearBuilt: true,
                lastInspection: true,
                nextInspection: true,
                imageKey: true,
                notes: true,
              },
            },
            logPile: {
              select: {
                volumeFm: true,
                logLength: true,
                layerCount: true,
                treeSpecies: true,
                woodType: true,
                qualityClass: true,
                imageKey: true,
                notes: true,
              },
            },
            tree: {
              select: {
                species: true,
                diameter: true,
                height: true,
                health: true,
                co2Storage: true,
                soilCondition: true,
                soilMoisture: true,
                exposition: true,
                slopeClass: true,
                slopePosition: true,
                standType: true,
                stockingDegree: true,
                damageType: true,
                damageSeverity: true,
                crownCondition: true,
                notes: true,
                imageKey: true,
                crownImageKey: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        plantings: true,
        maintenance: true,
        calamities: true,
        habitats: true,
        hunting: true,
      },
    });

    // Nur aktive Tasks (kein DONE) für die Karten-Overlay
    const tasks = await prisma.task.findMany({
      where: {
        forest: { organizationId: org.id },
        status: { not: 'DONE' },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        forestId: true,
        lat: true,
        lng: true,
        poiId: true,
      },
    });

    return NextResponse.json({
      forests,
      tasks,
      members: [],
      currentUserId: session.user.id,
      orgSlug,
      permissions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/app/mapdata] Fehler:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
