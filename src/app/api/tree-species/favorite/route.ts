import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { orgSlug, speciesId } = await req.json();

  if (!orgSlug || !speciesId) {
    return NextResponse.json({ error: 'orgSlug and speciesId required' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  await prisma.orgSpeciesFavorite.upsert({
    where: { organizationId_speciesId: { organizationId: org.id, speciesId } },
    create: { organizationId: org.id, speciesId, usageCount: 1 },
    update: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
