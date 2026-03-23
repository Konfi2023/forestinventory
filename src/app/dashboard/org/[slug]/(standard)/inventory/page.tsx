import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { InventoryClient } from './InventoryClient';

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) redirect('/dashboard');

  const [forests, memberships] = await Promise.all([
    prisma.forest.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        name: true,
        compartments: { select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.membership.findMany({
      where: { organizationId: org.id },
      select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
  ]);

  const members = memberships.map(m => m.user);

  return <InventoryClient forests={forests} orgSlug={slug} members={members} userId={session.user.id} />;
}
