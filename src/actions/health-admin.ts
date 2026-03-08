'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runHealthCheck } from '@/lib/health-check';
import { revalidatePath } from 'next/cache';

async function requireSystemAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Nicht angemeldet');
  const user = session.user.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSystemAdmin: true } })
    : await prisma.user.findUnique({ where: { email: session.user.email! }, select: { isSystemAdmin: true } });
  if (!user?.isSystemAdmin) throw new Error('Nur System-Administratoren erlaubt');
}

export async function triggerAdminHealthCheck() {
  await requireSystemAdmin();
  const result = await runHealthCheck();
  revalidatePath('/dashboard/admin/health');
  return { overall: result.overall, id: result.id, runAt: result.runAt.toISOString() };
}
