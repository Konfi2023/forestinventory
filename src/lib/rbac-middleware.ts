import { prisma } from '@/lib/prisma';

/**
 * Validiert den User und gibt den Kontext (User + Aktive Org) zurück.
 * Wirft einen Fehler, wenn Rechte fehlen.
 *
 * @param userId - Die interne DB-ID des Users
 * @param requiredPermission - Der Permission-String (z.B. 'forest:view')
 * @param orgSlug - Der Slug der Organisation aus der URL
 */
export async function requireAuthContext(userId: string, requiredPermission: string, orgSlug: string) {
  if (!userId) {
    throw new Error("Nicht authentifiziert (Keine ID)");
  }

  // 1. Organisation per Slug finden
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    throw new Error("Organisation nicht gefunden");
  }

  // 2. User laden
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { role: true }
      }
    }
  });

  if (!user) {
    throw new Error("Nutzer nicht in Datenbank gefunden");
  }

  // 3. Mitgliedschaft in dieser spezifischen Org finden
  let activeMembership = user.memberships.find(m => m.organizationId === org.id);

  if (!activeMembership) {
    // Fallback für System-Admins: nimm die erste verfügbare Mitgliedschaft
    if (user.memberships.length > 0) {
      activeMembership = user.memberships[0];
    } else {
      throw new Error("Keine Organisation gefunden / Kein Mitglied");
    }
  }

  const activeOrgId = org.id;

  // 4. Berechtigung prüfen (RBAC)

  // A. System-Admin (Superuser) darf alles
  if (user.isSystemAdmin) {
      return { userId: user.id, keycloakId: user.keycloakId, organizationId: activeOrgId, user };
  }

  // B. Org-Administrator darf ALLES in seiner Org (Der Fix!)
  // Wir vertrauen dem Rollennamen "Administrator"
  const isOrgAdmin = activeMembership.role.name === "Administrator";

  // C. Expliziter Permission Check
  const hasPermission = activeMembership.role.permissions.includes(requiredPermission);

  if (!isOrgAdmin && !hasPermission) {
    console.error(`Access Denied. User: ${user.email}, Role: ${activeMembership.role.name}, Needed: ${requiredPermission}`);
    throw new Error(`Zugriff verweigert. Fehlende Berechtigung: ${requiredPermission}`);
  }

  // 5. Kontext zurückgeben
  return {
    userId: user.id,
    keycloakId: user.keycloakId,
    organizationId: activeOrgId,
    user
  };
}
