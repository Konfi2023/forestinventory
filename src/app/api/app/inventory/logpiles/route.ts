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
    if (!org || !org.members[0]) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

    const where = {
      forest: { organizationId: org.id },
      type: 'LOG_PILE' as const,
      ...(forestId ? { forestId } : {}),
    };

    const total = cursor ? undefined : await prisma.forestPoi.count({ where });

    const pois = cursor
      ? await prisma.forestPoi.findMany({
          where,
          include: { logPile: true, forest: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          cursor: { id: cursor },
          skip: 1,
        })
      : await prisma.forestPoi.findMany({
          where,
          include: { logPile: true, forest: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
        });

    const hasMore    = pois.length > limit;
    const pageItems  = hasMore ? pois.slice(0, limit) : pois;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

    const logpiles = pageItems.map(p => ({
      id:          p.id,
      lat:         p.lat,
      lng:         p.lng,
      name:        p.name,
      forestId:    p.forest.id,
      forestName:  p.forest.name,
      createdAt:   p.createdAt,
      treeSpecies: p.logPile?.treeSpecies  ?? null,
      woodType:    p.logPile?.woodType     ?? null,
      volumeFm:    p.logPile?.volumeFm     ?? null,
      logLength:   p.logPile?.logLength    ?? null,
      layerCount:  p.logPile?.layerCount   ?? null,
      qualityClass:p.logPile?.qualityClass ?? null,
      imageKey:    p.logPile?.imageKey     ?? null,
      notes:       p.logPile?.notes        ?? null,
      synced: true,
    }));

    return NextResponse.json({
      logpiles,
      nextCursor,
      hasMore,
      ...(total !== undefined ? { total } : {}),
    });
  } catch (err: any) {
    console.error('[GET /api/app/inventory/logpiles]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orgSlug, forestId, lat, lng, treeSpecies, woodType, volumeFm, logLength, layerCount, qualityClass, notes } = body;

    if (!orgSlug || !forestId || lat == null || lng == null) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { members: { where: { userId: session.user.id } } },
    });
    if (!org || !org.members[0]) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

    const forest = await prisma.forest.findFirst({
      where: { id: forestId, organizationId: org.id },
    });
    if (!forest) return NextResponse.json({ error: 'Wald nicht gefunden' }, { status: 404 });

    const poi = await prisma.forestPoi.create({
      data: {
        type:     'LOG_PILE',
        lat,
        lng,
        forestId,
        name:     `Polter ${new Date().toLocaleDateString('de-DE')}`,
        logPile: {
          create: {
            treeSpecies:  treeSpecies  ?? null,
            woodType:     woodType     ?? 'LOG',
            volumeFm:     volumeFm     != null ? parseFloat(volumeFm) : null,
            logLength:    logLength    != null ? parseFloat(logLength) : null,
            layerCount:   layerCount   != null ? parseInt(layerCount) : null,
            qualityClass: qualityClass ?? null,
            notes:        notes        ?? null,
          },
        },
      },
      include: { logPile: true },
    });

    return NextResponse.json({ success: true, poiId: poi.id, logPile: poi.logPile });
  } catch (err: any) {
    console.error('[POST /api/app/inventory/logpiles]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
