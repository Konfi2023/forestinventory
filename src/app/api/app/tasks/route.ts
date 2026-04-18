import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { orgSlug, title, forestId, priority, assigneeId, dueDate, description, poiId, lat, lng } = body;

  if (!orgSlug || !title || !forestId) {
    return NextResponse.json({ error: 'orgSlug, title und forestId sind Pflichtfelder' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { where: { userId: user.id } } },
  });

  if (!org || !org.members[0]) {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      forestId,
      creatorId: user.id,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      poiId: poiId || null,
      lat: lat ?? null,
      lng: lng ?? null,
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      forest: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, task });
}
