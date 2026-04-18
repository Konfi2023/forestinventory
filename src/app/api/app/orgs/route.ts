import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/api-auth';

export async function GET(req: Request) {
  console.warn('[orgs] GET called');
  const user = await getApiUser(req);
  console.warn('[orgs] getApiUser result:', user ? user.id : 'null');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      role: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const orgs = memberships.map(m => ({
    ...m.organization,
    role: m.role.name,
  }));

  return NextResponse.json(orgs);
}
