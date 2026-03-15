"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function deleteKeycloakUser(keycloakId: string): Promise<void> {
  try {
    const issuer = process.env.KEYCLOAK_ISSUER!;
    const base = issuer.split("/realms/")[0];
    const realm = issuer.split("/realms/")[1];

    // Admin token via password grant
    const tokenRes = await fetch(
      `${base}/realms/master/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: "admin-cli",
          grant_type: "password",
          username: process.env.KEYCLOAK_ADMIN_USER ?? "admin",
          password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
        }),
      }
    );
    if (!tokenRes.ok) throw new Error("Admin token failed");
    const { access_token } = await tokenRes.json();

    const delRes = await fetch(
      `${base}/admin/realms/${realm}/users/${keycloakId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    if (!delRes.ok && delRes.status !== 404) {
      throw new Error(`Keycloak delete failed: ${delRes.status}`);
    }
  } catch (err) {
    // Log but don't block account deletion if Keycloak call fails
    console.error("[deleteAccount] Keycloak deletion error:", err);
  }
}

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
      keycloakId: null,
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
