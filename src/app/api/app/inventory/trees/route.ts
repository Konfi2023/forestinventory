import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const orgSlug  = searchParams.get('orgSlug');
    const forestId = searchParams.get('forestId');
    const cursor   = searchParams.get('cursor') ?? undefined;
    const limitRaw = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit    = Math.min(isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw, MAX_LIMIT);

    if (!orgSlug) return NextResponse.json({ error: 'orgSlug fehlt' }, { status: 400 });

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { members: { where: { userId: session.user.id } } },
    });

    if (!org || !org.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    const where = {
      forest: { organizationId: org.id },
      type: 'TREE' as const,
      ...(forestId ? { forestId } : {}),
    };

    // Gesamtzahl nur auf der ersten Seite (kein cursor)
    const total = cursor ? undefined : await prisma.forestPoi.count({ where });

    // Cursor-Pagination: Prisma benötigt zwei separate Aufrufe für saubere Typen
    const pois = cursor
      ? await prisma.forestPoi.findMany({
          where,
          include: { tree: true, forest: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          cursor: { id: cursor },
          skip: 1,
        })
      : await prisma.forestPoi.findMany({
          where,
          include: { tree: true, forest: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
        });

    const hasMore    = pois.length > limit;
    const pageItems  = hasMore ? pois.slice(0, limit) : pois;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

    const trees = pageItems.map(p => ({
      id:             p.id,
      lat:            p.lat,
      lng:            p.lng,
      forestId:       p.forest.id,
      forestName:     p.forest.name,
      createdAt:      p.createdAt,
      species:        p.tree?.species        ?? null,
      diameter:       p.tree?.diameter       ?? null,
      height:         p.tree?.height         ?? null,
      co2Storage:     p.tree?.co2Storage     ?? null,
      health:         p.tree?.health         ?? null,
      damageType:     p.tree?.damageType     ?? null,
      damageSeverity: p.tree?.damageSeverity ?? null,
      crownCondition: p.tree?.crownCondition ?? null,
      soilCondition:  p.tree?.soilCondition  ?? null,
      soilMoisture:   p.tree?.soilMoisture   ?? null,
      exposition:     p.tree?.exposition     ?? null,
      slopeClass:     p.tree?.slopeClass     ?? null,
      slopePosition:  p.tree?.slopePosition  ?? null,
      standType:      p.tree?.standType      ?? null,
      stockingDegree: p.tree?.stockingDegree ?? null,
      notes:          p.tree?.notes          ?? null,
      synced: true,
    }));

    return NextResponse.json({
      trees,
      nextCursor,
      hasMore,
      ...(total !== undefined ? { total } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/app/inventory/trees]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
