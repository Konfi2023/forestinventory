import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

const VALID_STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE'];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgSlug = searchParams.get('orgSlug');
  if (!orgSlug) return NextResponse.json({ error: 'orgSlug fehlt' }, { status: 400 });

  // Optionaler Status-Filter: ?status=OPEN,IN_PROGRESS
  // Ohne Filter: alle nicht-archivierten Tasks
  const statusParam = searchParams.get('status');
  const statusFilter: TaskStatus[] | undefined = statusParam
    ? statusParam.split(',').filter((s): s is TaskStatus => VALID_STATUSES.includes(s as TaskStatus))
    : undefined;

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { role: true },
      },
    },
  });

  if (!org || !org.members[0]) {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
  }

  const [tasks, forests, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        forest: { organizationId: org.id },
        ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        forest:   { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      // 500 Tasks – deutlich mehr Puffer als vorher (200).
      // Für Orgs mit > 500 Tasks kommt cursor-Pagination in einem späteren Sprint.
      take: 500,
    }),
    prisma.forest.findMany({
      where:   { organizationId: org.id },
      select:  {
        id: true, name: true,
        compartments: { select: { id: true, name: true, number: true, color: true }, orderBy: [{ number: 'asc' }, { name: 'asc' }] },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.membership.findMany({
      where:   { organizationId: org.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    tasks,
    forests,
    members: members.map(m => m.user),
  });
}
