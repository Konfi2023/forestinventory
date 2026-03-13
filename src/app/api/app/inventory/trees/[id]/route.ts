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
    const {
      species, diameter, height, notes,
      soilCondition, soilMoisture,
      exposition, slopeClass, slopePosition, standType, stockingDegree,
      damageType, damageSeverity, crownCondition,
    } = body;

    // Zugriff prüfen
    const poi = await prisma.forestPoi.findUnique({
      where: { id: poiId },
      include: { forest: { include: { organization: { include: { members: { where: { userId: session.user.id } } } } } } },
    });

    if (!poi || !poi.forest.organization.members[0]) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    const parsedDiameter = diameter !== undefined ? (diameter ? parseFloat(diameter) : null) : undefined;
    const parsedHeight   = height   !== undefined ? (height   ? parseFloat(height)   : null) : undefined;

    const updatedTree = await prisma.forestPoiTree.update({
      where: { poiId },
      data: {
        species:        species        ?? undefined,
        diameter:       parsedDiameter,
        height:         parsedHeight,
        soilCondition:  soilCondition  !== undefined ? (soilCondition  || null) : undefined,
        soilMoisture:   soilMoisture   !== undefined ? (soilMoisture   || null) : undefined,
        exposition:     exposition     !== undefined ? (exposition     || null) : undefined,
        slopeClass:     slopeClass     !== undefined ? (slopeClass     || null) : undefined,
        slopePosition:  slopePosition  !== undefined ? (slopePosition  || null) : undefined,
        standType:      standType      !== undefined ? (standType      || null) : undefined,
        stockingDegree: stockingDegree !== undefined ? (stockingDegree || null) : undefined,
        damageType:     damageType     !== undefined ? (damageType     || null) : undefined,
        damageSeverity: damageSeverity !== undefined ? damageSeverity            : undefined,
        crownCondition: crownCondition !== undefined ? crownCondition            : undefined,
        notes:          notes          !== undefined ? (notes          || null) : undefined,
      },
    });

    // Messung als Zeitreiheneintrag (Phase 2)
    if (parsedDiameter != null || parsedHeight != null) {
      await prisma.treeMeasurement.create({
        data: {
          poiId,
          measuredById:   session.user.id,
          diameter:       parsedDiameter  ?? null,
          height:         parsedHeight    ?? null,
          soilMoisture:   soilMoisture    ?? null,
          damageType:     damageType      ?? null,
          damageSeverity: damageSeverity  ?? null,
          crownCondition: crownCondition  ?? null,
          notes:          notes           ?? null,
        },
      });
    }

    return NextResponse.json({ success: true, tree: updatedTree });
  } catch (err: any) {
    console.error('[PATCH /api/app/inventory/trees/[id]]', err?.message);
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
    console.error('[DELETE /api/app/inventory/trees/[id]]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
