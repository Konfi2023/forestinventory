import { prisma } from "@/lib/prisma";

/**
 * Holt alle Wälder, die ein bestimmter User sehen darf.
 * - Org-Admins sehen ALLE Wälder der Org.
 * - Normale User sehen nur die, die ihnen zugewiesen sind (via ForestAccess).
 */
export async function getAccessibleForests(orgId: string, userId: string) {
  // 1. Rolle des Users in dieser Org prüfen
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId: orgId },
    include: { role: true }
  });

  if (!membership) return [];

  // 2. Admin-Check (System-Admin Rolle oder Name 'Administrator')
  // Wir gehen davon aus, dass 'Administrator' immer alles darf.
  const isAdmin = membership.role.name === "Administrator" || membership.role.permissions.includes("forest:view_all");

  if (isAdmin) {
    // Admin sieht ALLES in der Org
    return await prisma.forest.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' }
    });
  } else {
    // Normaler User sieht nur zugewiesene Wälder
    return await prisma.forest.findMany({
      where: {
        organizationId: orgId,
        grantedUsers: { some: { id: userId } } // <--- Der Filter
      },
      orderBy: { name: 'asc' }
    });
  }
}