import { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
    KeycloakProvider({
      id: "keycloak-register",
      name: "Keycloak Register",
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
      authorization: {
        url: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/registrations`,
        params: { scope: "openid email profile" },
      },
    }),
  ],
  callbacks: {
    // 1. JWT Callback: Hier landen die Daten von Keycloak
    async jwt({ token, profile, account }) {
      // Auch bei bestehenden Tokens prüfen ob der User noch in der DB existiert
      // (z.B. nach DB-Reset oder Migration). Falls nicht → wie neuer Login behandeln.
      if (!profile && !account && token.dbId) {
        const exists = await prisma.user.findUnique({ where: { id: token.dbId as string }, select: { id: true } });
        if (!exists) {
          delete token.dbId;
          delete token.lastActiveOrgId;
        }
      }

      if (profile && account || (!token.dbId && token.sub)) {
        const email = token.email;
        const keycloakId = token.sub;

        // Sicherheitscheck: Ohne Email/ID können wir nichts tun
        if (!email || !keycloakId) return token;

        // A. Versuche User per Keycloak-ID zu finden (Normalfall)
        let dbUser = await prisma.user.findUnique({
          where: { keycloakId },
        });

        // B. Wenn nicht gefunden, suche per E-Mail (Account Linking Fall)
        // Das verhindert den "Unique Constraint Error", wenn du dich über die IP neu einloggst
        if (!dbUser) {
          const existingUserByEmail = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUserByEmail) {
            // User existiert, aber Keycloak-ID fehlte oder war anders -> Updaten!
            console.log("🔗 Verknüpfe existierenden User mit neuer Keycloak-ID...");
            dbUser = await prisma.user.update({
              where: { id: existingUserByEmail.id },
              data: { keycloakId },
            });
          } else {
            // C. Ganz neuer User -> Erstellen
            console.log("🆕 Neuer User erkannt. Erstelle DB-Eintrag...");
            dbUser = await prisma.user.create({
              data: {
                keycloakId,
                email,
                firstName: (profile as any)?.name?.split(" ")[0] || "User",
                lastName: (profile as any)?.name?.split(" ")[1] || "",
              },
            });

            // DEV-ONLY: Der allererste User wird automatisch Admin der Demo-Org.
            // In Production läuft dieser Block nie – Memberships werden über Einladungen verwaltet.
            if (process.env.NODE_ENV === 'development') {
              const userCount = await prisma.user.count();
              if (userCount === 1) {
                const demoOrg = await prisma.organization.findUnique({ where: { slug: "demo-forst" } });
                const adminRole = await prisma.role.findFirst({ where: { name: "Administrator", organizationId: demoOrg?.id } });
                if (demoOrg && adminRole) {
                  await prisma.membership.create({
                    data: { userId: dbUser.id, organizationId: demoOrg.id, roleId: adminRole.id },
                  });
                  console.log("👑 [DEV] Erster User wurde zum Admin der Demo-Org gemacht.");
                }
              }
            }
          }
        }

        // DB-Daten ins Token schreiben, damit sie in der Session verfügbar sind
        if (dbUser) {
          token.dbId = dbUser.id;
          token.lastActiveOrgId = dbUser.lastActiveOrgId;
        }
      }
      return token;
    },

    // 2. Session Callback: Das ist das, was im Frontend ankommt
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Erweitere das Session-Objekt um unsere DB-Daten
        session.user.id = token.dbId as string; 
      }
      return session;
    },
  },
  pages: {
    signOut: '/signout',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 Tage – App bleibt eingeloggt
  },
  debug: process.env.NODE_ENV === 'development',
};