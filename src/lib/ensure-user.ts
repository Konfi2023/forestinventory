import { Session } from "next-auth";
import { prisma } from "./prisma";

/**
 * Stellt sicher, dass ein DB-User-Eintrag für die aktuelle Session existiert.
 * Wird bei Org-Erstellung und Invite-Annahme aufgerufen — nicht beim Login.
 * Gibt die DB-User-ID zurück.
 */
export async function ensureDbUser(session: Session): Promise<string> {
  if (session.user.id) return session.user.id;

  const keycloakId = session.user.keycloakId;
  const email = session.user.email;

  if (!keycloakId || !email) throw new Error("Keine gültige Session");

  // Existing user by Keycloak ID
  let user = await prisma.user.findUnique({ where: { keycloakId } });
  if (user) return user.id;

  // Account linking: existing user with same email but different Keycloak ID
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: { keycloakId },
    });
    return updated.id;
  }

  // New user — create now that there is a legitimate purpose
  const created = await prisma.user.create({
    data: {
      keycloakId,
      email,
      firstName: session.user.firstName || "User",
      lastName: session.user.lastName || "",
    },
  });

  return created.id;
}
