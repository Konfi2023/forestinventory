import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forestId = req.nextUrl.searchParams.get('forestId');
  if (!forestId) return NextResponse.json({ error: 'forestId fehlt' }, { status: 400 });

  const forest = await prisma.forest.findUnique({
    where: { id: forestId },
    select: { id: true, name: true, geoJson: true, color: true },
  });

  if (!forest) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  // Zugriff prüfen
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organization: { forests: { some: { id: forestId } } } },
  });
  if (!membership) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

  return NextResponse.json({ forest });
}
