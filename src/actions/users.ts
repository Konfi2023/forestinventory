"use server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * Hilfsfunktion: Prüft Login, Org-Zugehörigkeit und Berechtigung.
 */
async function checkPermission(orgSlug: string, requiredPermission: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // Organisation und eigene Mitgliedschaft laden
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { role: true },
      },
    },
  });

  if (!org || !org.members[0]) throw new Error("Organisation nicht gefunden oder kein Zugriff");

  const myMembership = org.members[0];
  const myRole = myMembership.role;

  // Admin darf immer alles (Bypass).
  const isAdmin = myRole.name === "Administrator";

  if (!isAdmin && !myRole.permissions.includes(requiredPermission)) {
    throw new Error(`Keine Berechtigung: ${requiredPermission}`);
  }

  return { org, session, myMembership, isAdmin };
}

/**
 * Entfernt ein Mitglied aus der Organisation.
 */
export async function removeMember(orgSlug: string, memberId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // Ziel-Mitgliedschaft vorab laden, um Self-Remove zu erkennen
  const targetMembership = await prisma.membership.findUnique({
    where: { id: memberId },
    include: { role: true },
  });
  if (!targetMembership) throw new Error("Mitglied nicht gefunden");

  const isSelfRemove = targetMembership.userId === session.user.id;

  // 1. Berechtigung prüfen — bei Self-Remove reicht normale Org-Mitgliedschaft
  let org: any;
  let isAdmin: boolean;
  if (isSelfRemove) {
    const orgRecord = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!orgRecord) throw new Error("Organisation nicht gefunden");
    org = orgRecord;
    isAdmin = targetMembership.role.name === "Administrator";
  } else {
    const result = await checkPermission(orgSlug, "users:delete");
    org = result.org;
    isAdmin = result.isAdmin;
  }

  // --- SICHERHEITS-CHECKS ---

  // A. Hierarchie-Schutz: Nicht-Admin darf keinen Admin kicken
  if (targetMembership.role.name === "Administrator" && !isAdmin) {
    throw new Error("Fehlende Berechtigung: Nur Administratoren können andere Administratoren entfernen.");
  }

  // B. Last-Admin-Schutz
  if (targetMembership.role.name === "Administrator") {
    const adminCount = await prisma.membership.count({
      where: {
        organizationId: org.id,
        role: { name: "Administrator" }
      }
    });

    if (adminCount <= 1) {
      throw new Error("Der letzte Administrator kann nicht entfernt werden.");
    }
  }

  // 3. Löschen durchführen
  await prisma.membership.delete({
    where: { id: memberId },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/users`);

  return { 
    success: true, 
    isSelf: targetMembership.userId === session.user.id 
  };
}

/**
 * Ändert die Rolle eines Mitglieds.
 */
export async function updateMemberRole(orgSlug: string, memberId: string, newRoleId: string) {
  // 1. Berechtigung prüfen
  const { org, isAdmin } = await checkPermission(orgSlug, "users:edit");

  // 2. Ziel laden
  const targetMembership = await prisma.membership.findUnique({
    where: { id: memberId },
    include: { role: true }
  });

  if (!targetMembership) throw new Error("Mitglied nicht gefunden");

  // A. Hierarchie-Schutz
  if (targetMembership.role.name === "Administrator" && !isAdmin) {
    throw new Error("Fehlende Berechtigung: Nur Administratoren können andere Administratoren bearbeiten.");
  }

  // B. Last-Admin-Schutz
  if (targetMembership.role.name === "Administrator") {
    const adminCount = await prisma.membership.count({
      where: {
        organizationId: org.id,
        role: { name: "Administrator" }
      }
    });

    if (adminCount <= 1) {
       throw new Error("Die Rolle des letzten Administrators kann nicht geändert werden.");
    }
  }

  // 3. Update durchführen
  await prisma.membership.update({
    where: { id: memberId },
    data: { roleId: newRoleId },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/users`);
  return { success: true };
}

/**
 * NEU: Aktualisiert den Zugriff auf Wälder für einen Benutzer.
 */
export async function updateUserForestAccess(orgSlug: string, userId: string, forestIds: string[]) {
  // 1. Berechtigung prüfen (Nutzer bearbeiten recht reicht hier)
  const { isAdmin } = await checkPermission(orgSlug, "users:edit");

  // Optional: Nur Admins dürfen Wald-Zugriff steuern? 
  // Hier erlauben wir es jedem, der "users:edit" hat.
  
  // Update mit 'set' (überschreibt die komplette Liste)
  await prisma.user.update({
    where: { id: userId },
    data: {
      accessibleForests: {
        set: forestIds.map(id => ({ id }))
      }
    }
  });
  
  revalidatePath(`/dashboard/org/${orgSlug}/users`);
  return { success: true };
}