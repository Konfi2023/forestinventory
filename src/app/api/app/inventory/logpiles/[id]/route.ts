import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: poiId } = await params;
    const body = await req.json();
    const { treeSpecies, woodType, volumeFm, logLength, layerCount, qualityClass, notes } = body;

    const poi = await prisma.forestPoi.findUnique({
      where: { id: poiId },
      include: { forest: { include: { organization: { include: { members: { where: { userId: session.user.id } } } } } } },
    });
    if (!poi || !poi.forest.organization.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    const updated = await prisma.forestPoiLogPile.update({
      where: { poiId },
      data: {
        treeSpecies:  treeSpecies  !== undefined ? (treeSpecies  || null) : undefined,
        woodType:     woodType     !== undefined ? (woodType     || null) : undefined,
        volumeFm:     volumeFm     !== undefined ? (volumeFm != null ? parseFloat(volumeFm) : null) : undefined,
        logLength:    logLength    !== undefined ? (logLength != null ? parseFloat(logLength) : null) : undefined,
        layerCount:   layerCount   !== undefined ? (layerCount != null ? parseInt(layerCount) : null) : undefined,
        qualityClass: qualityClass !== undefined ? (qualityClass || null) : undefined,
        notes:        notes        !== undefined ? (notes        || null) : undefined,
      },
    });

    return NextResponse.json({ success: true, logPile: updated });
  } catch (err: any) {
    console.error('[PATCH /api/app/inventory/logpiles/[id]]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: poiId } = await params;

    const poi = await prisma.forestPoi.findUnique({
      where: { id: poiId },
      include: { forest: { include: { organization: { include: { members: { where: { userId: session.user.id } } } } } } },
    });
    if (!poi || !poi.forest.organization.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    await prisma.forestPoi.delete({ where: { id: poiId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/app/inventory/logpiles/[id]]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
