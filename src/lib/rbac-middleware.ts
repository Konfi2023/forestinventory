import { prisma } from '@/lib/prisma';

/**
 * Validiert den User und gibt den Kontext (User + Aktive Org) zurück.
 * Wirft einen Fehler, wenn Rechte fehlen.
 * 
 * @param userId - Die interne DB-ID des Users
 * @param requiredPermission - Der Permission-String (z.B. 'forest:view')
 */
export async function requireAuthContext(userId: string, requiredPermission: string) {
  if (!userId) {
    throw new Error("Nicht authentifiziert (Keine ID)");
  }

  // 1. User & Mitgliedschaften laden
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

  // 2. Aktive Organisation bestimmen
  let activeOrgId = user.lastActiveOrgId;
  let activeMembership = user.memberships.find(m => m.organizationId === activeOrgId);

  if (!activeOrgId || !activeMembership) {
    // Fallback: Nimm die erste gefundene Org
    if (user.memberships.length > 0) {
      activeMembership = user.memberships[0];
      activeOrgId = activeMembership.organizationId;
      
      // DB Selbstheilung
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveOrgId: activeOrgId }
      });
    } else {
      throw new Error("Keine Organisation gefunden / Kein Mitglied");
    }
  }

  // 3. Berechtigung prüfen (RBAC)
  
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

  // 4. Kontext zurückgeben
  return {
    userId: user.id,
    keycloakId: user.keycloakId,
    organizationId: activeOrgId,
    user 
  };
}