"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteKeycloakUser } from "@/lib/keycloak-admin";

export async function deleteAccount(confirmedEmail: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Nicht authentifiziert");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, keycloakId: true },
  });

  if (!user) throw new Error("User nicht gefunden");

  // Email confirmation check
  if (confirmedEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("E-Mail-Adresse stimmt nicht überein");
  }

  const userId = user.id;

  // 1. Assigned tasks → unassigned
  await prisma.task.updateMany({
    where: { assigneeId: userId },
    data: { assigneeId: null },
  });

  // 2. Remove from watched tasks (many-to-many via user update)
  await prisma.user.update({
    where: { id: userId },
    data: { watchedTasks: { set: [] } },
  });

  // 3. Delete task comments
  await prisma.taskComment.deleteMany({ where: { userId } });

  // 4. Delete memberships
  await prisma.membership.deleteMany({ where: { userId } });

  // 5. Anonymize user record (keep row for FK integrity on createdTasks etc.)
  await prisma.user.update({
    where: { id: userId },
    data: {
      keycloakId: `deleted-${userId}`,
      email: `deleted-${userId}@deleted.local`,
      firstName: "Gelöschter",
      lastName: "Nutzer",
      companyName: null,
      vatId: null,
      street: null,
      zip: null,
      city: null,
      lastActiveOrgId: null,
      calendarToken: null,
    },
  });

  // 6. Delete Keycloak account
  if (user.keycloakId) {
    await deleteKeycloakUser(user.keycloakId);
  }

  return { success: true };
}
