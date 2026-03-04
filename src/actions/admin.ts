"use server";

import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

/**
 * Aktualisiert den Status einer Organisation (z.B. FREE -> PRO oder SUSPENDED)
 */
export async function updateOrgStatus(orgId: string, status: string) {
  // 1. Security Check
  await requireSystemAdmin();

  // 2. Audit Log Eintrag vorbereiten (Best Practice)
  // Hier vereinfacht, idealerweise in separate Audit-Tabelle schreiben

  // 3. Update
  await prisma.organization.update({
    where: { id: orgId },
    data: { subscriptionStatus: status },
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

  await prisma.user.delete({
    where: { id: userId }
  });

  // HINWEIS: Hier müsste idealerweise auch der Keycloak-User via Admin-API gelöscht werden,
  // damit er sich nicht mehr einloggen kann.
  
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