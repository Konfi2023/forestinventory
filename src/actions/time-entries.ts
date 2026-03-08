'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function logTime(taskId: string, data: {
  date: string;
  durationMinutes: number;
  description?: string;
  category?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.timeEntry.create({
    data: {
      taskId,
      userId:          session.user.id,
      startTime:       new Date(data.date),
      durationMinutes: data.durationMinutes,
      description:     data.description || null,
      category:        (data.category as any) ?? 'MANUAL_WORK',
    },
  });

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function deleteTimeEntry(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) throw new Error('Nicht berechtigt');

  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}
