import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forestId = req.nextUrl.searchParams.get('forestId');
  if (!forestId) return NextResponse.json({ error: 'forestId fehlt' }, { status: 400 });

  const forest = await prisma.forest.findUnique({
    where: { id: forestId },
    select: { id: true, name: true, geoJson: true, color: true },
  });

  if (!forest) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  // Zugriff prüfen
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { forests: { some: { id: forestId } } } },
  });
  if (!membership) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

  return NextResponse.json({ forest });
}
