"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function checkPermission(orgSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { where: { userId: session.user.id } } }
  });
  
  if (!org || !org.members[0]) throw new Error("Kein Zugriff");
  return { org, user: session.user };
}

export async function createEvent(orgSlug: string, data: {
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  forestId?: string;
}) {
  const { org, user } = await checkPermission(orgSlug);

  await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      start: data.start,
      end: data.end,
      allDay: data.allDay,
      forestId: data.forestId,
      organizationId: org.id,
      creatorId: user.id
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/calendar`);
  return { success: true };
}

// Action für Drag & Drop von Events
export async function updateEventDate(orgSlug: string, eventId: string, start: Date, end: Date | null) {
  await checkPermission(orgSlug);
  
  await prisma.event.update({
    where: { id: eventId },
    data: { start, end }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/calendar`);
  return { success: true };
}

export async function deleteEvent(orgSlug: string, eventId: string) {
  await checkPermission(orgSlug);
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath(`/dashboard/org/${orgSlug}/calendar`);
  return { success: true };
}