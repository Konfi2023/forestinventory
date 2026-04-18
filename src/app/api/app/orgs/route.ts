import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser } from '@/lib/api-auth';
import { writeFileSync } from 'fs';

function dbg(msg: string) {
  try { writeFileSync('/tmp/fm-debug.log', new Date().toISOString() + ' ' + msg + '\n', { flag: 'a' }); } catch {}
}

export async function GET(req: Request) {
  dbg('GET /api/app/orgs called');
  const authHeader = req.headers.get('authorization');
  dbg('auth header: ' + (authHeader ? authHeader.slice(0, 20) + '...' : 'NONE'));
  const user = await getApiUser(req);
  dbg('getApiUser result: ' + (user ? JSON.stringify(user) : 'null'));
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
