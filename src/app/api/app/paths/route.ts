import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = new Set(['ROAD', 'SKID_TRAIL', 'WATER', 'PATH']);

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orgSlug, forestId, type, name, color, geoJson, lengthM, note } = body;

    if (!orgSlug || !forestId || !type || !geoJson) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Ungültiger Wegtyp' }, { status: 400 });
    }
    if (geoJson?.type !== 'LineString' || !Array.isArray(geoJson.coordinates) || geoJson.coordinates.length < 2) {
      return NextResponse.json({ error: 'GeoJSON LineString mit mindestens zwei Punkten erforderlich' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { members: { where: { userId: user.id } } },
    });
    if (!org || !org.members[0]) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

    const forest = await prisma.forest.findFirst({
      where: { id: forestId, organizationId: org.id },
    });
    if (!forest) return NextResponse.json({ error: 'Wald nicht gefunden' }, { status: 404 });

    const fallbackName = (() => {
      switch (type) {
        case 'ROAD':       return 'LKW-Weg';
        case 'SKID_TRAIL': return 'Rückegasse';
        case 'WATER':      return 'Gewässer';
        case 'PATH':       return 'Pfad';
        default:           return 'Weg';
      }
    })();

    const path = await prisma.forestPath.create({
      data: {
        forestId,
        type,
        name: (name && String(name).trim()) || fallbackName,
        color: color ?? null,
        geoJson,
        lengthM: typeof lengthM === 'number' ? lengthM : null,
        note: note ?? null,
      },
    });

    return NextResponse.json({ success: true, pathId: path.id });
  } catch (err: any) {
    console.error('[POST /api/app/paths]', err?.message);
    return NextResponse.json({ error: err.message ?? 'Serverfehler' }, { status: 500 });
  }
}
