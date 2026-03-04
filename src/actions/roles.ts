// src/actions/roles.ts
"use server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * Aktualisiert die Berechtigungen einer Rolle.
 */
export async function updateRolePermissions(
  orgSlug: string,
  roleId: string,
  newPermissions: string[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // 1. Berechtigung des aktuellen Users prüfen
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { role: true },
      },
    },
  });

  if (!org || !org.members[0]) throw new Error("Organisation nicht gefunden");

  const currentUserRole = org.members[0].role;
  
  // Darf der User Rollen verwalten? (Entweder explizites Recht oder er ist Admin)
  const hasPermission = 
    currentUserRole.permissions.includes("roles:manage") || 
    currentUserRole.name === "Administrator";
  
  if (!hasPermission) {
    throw new Error("Keine Berechtigung zum Ändern von Rollen.");
  }

  // 2. Ziel-Rolle validieren
  const targetRole = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!targetRole) throw new Error("Rolle nicht gefunden");
  if (targetRole.organizationId !== org.id) throw new Error("Zugriff verweigert: Rolle gehört nicht zur Org");
  
  // WICHTIG: Die System-Administrator-Rolle darf oft nicht beschnitten werden,
  // um sich nicht selbst auszusperren.
  if (targetRole.isSystemRole && targetRole.name === "Administrator") {
     // Optional: Man könnte erlauben, neue Rechte hinzuzufügen, aber nicht essenzielle zu entfernen.
     // Für Sicherheit blockieren wir es hier ganz oder erlauben es nur, wenn man Super-Admin ist.
     // Hier: Erlauben, aber mit Vorsicht. (Oder: Blockieren, da Admin eh alles darf laut Code-Logik)
     // throw new Error("Die Administrator-Rolle kann nicht bearbeitet werden.");
  }

  // 3. Update durchführen
  await prisma.role.update({
    where: { id: roleId },
    data: { permissions: newPermissions },
  });

  // 4. Cache leeren
  revalidatePath(`/dashboard/org/${orgSlug}/roles`);
  
  return { success: true };
}

/**
 * Erstellt eine neue Rolle.
 */
export async function createRole(orgSlug: string, name: string, description: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // 1. Org Id holen
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
        members: {
            where: { userId: session.user.id },
            include: { role: true }
        }
    }
  });
  
  if (!org || !org.members[0]) throw new Error("Org nicht gefunden");

  // Berechtigungscheck
  const currentUserRole = org.members[0].role;
  const hasPermission = currentUserRole.permissions.includes("roles:manage") || currentUserRole.name === "Administrator";
  if (!hasPermission) throw new Error("Keine Berechtigung.");

  // 2. Rolle erstellen
  await prisma.role.create({
    data: {
      name,
      description,
      organizationId: org.id,
      permissions: [], // Neue Rollen starten ohne Rechte
      isSystemRole: false, // Custom Role
    },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/roles`);
  return { success: true };
}

/**
 * Löscht eine Rolle (wenn keine User mehr zugewiesen sind).
 */
export async function deleteRole(orgSlug: string, roleId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // 1. Rolle prüfen inkl. Mitglieder-Anzahl
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { 
        organization: true,
        _count: { select: { members: true } } 
    }
  });

  if (!role) throw new Error("Rolle nicht gefunden");
  if (role.organization.slug !== orgSlug) throw new Error("Zugriff verweigert");

  // 2. Sicherheitschecks
  if (role.isSystemRole) {
    throw new Error("Systemrollen können nicht gelöscht werden.");
  }
  
  if (role._count.members > 0) {
    throw new Error(`Diese Rolle ist noch ${role._count.members} Benutzern zugewiesen. Bitte weisen Sie diesen erst eine andere Rolle zu.`);
  }

  // 3. Löschen
  await prisma.role.delete({
    where: { id: roleId },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/roles`);
  return { success: true };
}