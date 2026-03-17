"use server";

import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { deleteKeycloakUser } from "@/lib/keycloak-admin";

/**
 * Aktualisiert den Status einer Organisation (z.B. FREE -> PRO oder SUSPENDED)
 */
export async function updateOrgStatus(orgId: string, status: string) {
  // 1. Security Check
  await requireSystemAdmin();

  // 2. Audit Log Eintrag vorbereiten (Best Practice)
  // Hier vereinfacht, idealerweise in separate Audit-Tabelle schreiben

  // 3. Update - cast to SubscriptionStatus enum
  const { SubscriptionStatus } = await import("@prisma/client");
  const enumStatus = Object.values(SubscriptionStatus).includes(status as any)
    ? (status as any)
    : SubscriptionStatus.FREE;

  await prisma.organization.update({
    where: { id: orgId },
    data: { subscriptionStatus: enumStatus },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}
export async function deleteOrganization(orgId: string) {
  await requireSystemAdmin();

  // Audit Log schreiben (wichtig vor dem Löschen!)
  // In Realität: Log in separate Tabelle schreiben, da Org-Logs mitgelöscht werden könnten
  console.log(`SystemAdmin löscht Org ${orgId}`);

  await prisma.organization.delete({
    where: { id: orgId }
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}
export async function deleteUser(userId: string) {
  await requireSystemAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { keycloakId: true },
  });

  // 1. Assigned tasks → unassigned
  await prisma.task.updateMany({
    where: { assigneeId: userId },
    data: { assigneeId: null },
  });

  // 2. Remove from watched tasks
  await prisma.user.update({
    where: { id: userId },
    data: { watchedTasks: { set: [] } },
  });

  // 3. Delete task comments
  await prisma.taskComment.deleteMany({ where: { userId } });

  // 4. Delete memberships
  await prisma.membership.deleteMany({ where: { userId } });

  // 5. Anonymize user record
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
  if (user?.keycloakId && !user.keycloakId.startsWith("deleted-")) {
    await deleteKeycloakUser(user.keycloakId);
  }

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * EDIT: E-Mail ändern
 */
export async function updateUserEmail(userId: string, newEmail: string) {
  await requireSystemAdmin();

  // Prüfen ob Email schon belegt
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    throw new Error("E-Mail bereits vergeben");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail }
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * EDIT: Rolle eines Mitglieds ändern (Notfall-Management)
 */
export async function updateOrgMemberRole(membershipId: string, newRoleId: string) {
  await requireSystemAdmin();

  await prisma.membership.update({
    where: { id: membershipId },
    data: { roleId: newRoleId }
  });

  // Pfad revalidieren (da wir nicht wissen, welche Org-Page genau, nehmen wir den Admin-Pfad allgemein)
  revalidatePath("/admin/organizations/[id]", "page"); 
  return { success: true };
}

/**
 * Paket einer Organisation ändern (Admin-Override, kein Stripe-Checkout)
 */
export async function updateOrgPlan(orgId: string, planId: string) {
  await requireSystemAdmin();

  await prisma.organization.update({
    where: { id: orgId },
    data: { planId },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}

/**
 * Statistik für das Dashboard laden
 */
export async function getSystemStats() {
  await requireSystemAdmin();

  const [orgCount, userCount, logsCount] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.auditLog.count(),
  ]);

  return {
    orgCount,
    userCount,
    logsCount,
  };
  
}