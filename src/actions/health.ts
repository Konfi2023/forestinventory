'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runHealthCheck } from '@/lib/health-check';
import { revalidatePath } from 'next/cache';

async function requireAuth(slug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Nicht angemeldet');
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) throw new Error('Organisation nicht gefunden');
  const member = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: org.id },
  });
  if (!member) throw new Error('Kein Mitglied dieser Organisation');
  return { session, org };
}

/** Führt einen vollständigen Health-Check durch und speichert das Ergebnis. */
export async function triggerHealthCheck(slug: string) {
  await requireAuth(slug);
  const result = await runHealthCheck();
  revalidatePath(`/dashboard/org/${slug}/health`);
  return { overall: result.overall, id: result.id, runAt: result.runAt.toISOString() };
}

/** Lädt die letzten N Health-Check-Ergebnisse für das Dashboard. */
export async function getHealthHistory(slug: string, limit = 20) {
  await requireAuth(slug);
  return prisma.systemHealthCheck.findMany({
    orderBy: { runAt: 'desc' },
    take:    limit,
    select: {
      id: true, runAt: true, overall: true,
      dbOk: true, openMeteoOk: true, sentinelOk: true, s3Ok: true,
      testAlertS1Id: true, testAlertWxId: true,
      report: true,
    },
  });
}
