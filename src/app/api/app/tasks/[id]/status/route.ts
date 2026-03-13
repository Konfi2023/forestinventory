import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const VALID: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE'];
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
  }
  const validStatus = status as TaskStatus;

  const task = await prisma.task.findUnique({ where: { id }, include: { forest: true } });
  if (!task) return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organization: { forests: { some: { id: task.forestId } } } },
  });
  if (!membership) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

  const updated = await prisma.task.update({
    where: { id },
    data: { status: validStatus },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      forest: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, task: updated });
}
