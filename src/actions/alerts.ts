'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActiveAlert } from '@/lib/active-alerts';

export async function acknowledgeAlert(alert: ActiveAlert) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;

  const userId    = session.user.id;
  const userEmail = session.user.email ?? '';

  // upsert: zweimal quittieren = kein Duplikat
  await prisma.alertAcknowledgement.upsert({
    where:  { alertId_userId: { alertId: alert.id, userId } },
    create: {
      alertId:    alert.id,
      alertType:  alert.type,
      forestId:   alert.forestId,
      forestName: alert.forestName,
      userId,
      userEmail,
      isTest:     alert.isTest,
    },
    update: { dismissedAt: new Date() },
  });
}
