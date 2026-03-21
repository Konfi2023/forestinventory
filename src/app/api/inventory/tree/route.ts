import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function calculateCo2(species: string, diameter: number, height: number): number {
  const radius = diameter / 200;
  const volume = Math.PI * radius * radius * height * 0.5;
  const density: Record<string, number> = {
    SPRUCE: 470, PINE: 520, FIR: 450, DOUGLAS: 510, LARCH: 590,
    OAK: 690, BEECH: 720, ASH: 690, MAPLE: 630, BIRCH: 650,
    ALDER: 530, POPLAR: 420,
  };
  const d = density[species] ?? 550;
  return Math.round(volume * d * 0.5 * 3.67 * 10) / 10;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      forestId, compartmentId, lat, lng, species, diameter, height, notes,
      soilCondition, soilMoisture,
      exposition, slopeClass, slopePosition, standType, stockingDegree,
      damageType, damageSeverity, crownCondition,
    } = body;

    if (!forestId || lat == null || lng == null) {
      return NextResponse.json({ error: 'forestId, lat und lng sind Pflichtfelder' }, { status: 400 });
    }

    const co2 = species && diameter && height
      ? calculateCo2(species, diameter, height)
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
            species:        species        ?? null,
            diameter:       diameter       ?? null,
            height:         height         ?? null,
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

    return NextResponse.json({ success: true, poiId: poi.id });
  } catch (err) {
    console.error('Inventory tree error:', err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
