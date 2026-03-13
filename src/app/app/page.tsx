import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AppShell } from './AppShell';

export const metadata = { title: 'Forstinventur App' };

export default async function AppPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/app');
  }

  // Alle Organisationen des Nutzers laden
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      role: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (memberships.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Kein Zugriff</p>
          <p className="text-slate-400 text-sm">Du bist noch keiner Organisation zugewiesen.</p>
        </div>
      </div>
    );
  }

  const orgs = memberships.map(m => ({ ...m.organization, role: m.role.name }));

  // Erste Org vorladen
  const firstOrg = orgs[0];
  const [initialTasks, initialForests, initialMembers] = await Promise.all([
    prisma.task.findMany({
      where: { forest: { organizationId: firstOrg.id } },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        forest: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    prisma.forest.findMany({
      where: { organizationId: firstOrg.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.membership.findMany({
      where: { organizationId: firstOrg.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
  ]);

  return (
    <AppShell
      orgs={orgs}
      currentUserId={session.user.id}
      initialOrgSlug={firstOrg.slug}
      initialTasks={initialTasks as any}
      initialForests={initialForests}
      initialMembers={initialMembers.map(m => m.user)}
    />
  );
}
