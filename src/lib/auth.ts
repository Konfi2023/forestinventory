import { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { prisma } from "@/lib/prisma";
import { markEmailVerified } from "@/lib/keycloak-admin";

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(
      `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.KEYCLOAK_CLIENT_ID!,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken as string,
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) throw data;
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      idToken: data.id_token ?? token.idToken,
      accessTokenExpires: Date.now() + (data.expires_in as number) * 1000,
      error: undefined,
    };
  } catch {
    console.warn('[auth] Token refresh failed — forcing re-login');
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      id: 'keycloak',
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
      allowDangerousEmailAccountLinking: true,
      token: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`,
    }),
    // Zweiter Provider für direkte Registrierung — zeigt auf /registrations statt /auth.
    // WICHTIG: type:'oauth' (nicht 'oidc') damit kein OIDC-Discovery die authorization.url überschreibt.
    // KeycloakProvider (type:'oidc') holt immer den authorization_endpoint aus dem Discovery-Dokument
    // und ignoriert dabei unsere custom URL — daher plain OAuth2.
    {
      id: 'keycloak-register',
      name: 'Keycloak Register',
      type: 'oauth',
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      checks: ['pkce', 'state'],
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/registrations`,
        params: { scope: 'openid email profile', response_type: 'code' },
      },
      token: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`,
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username ?? '',
          email: profile.email,
          image: profile.picture ?? null,
        };
      },
    } as any,
  ],
  callbacks: {
    // 1. JWT Callback: Hier landen die Daten von Keycloak
    async jwt({ token, profile, account }) {
      // ── Initial sign-in: store tokens ──────────────────────────────────────
      if (account) {
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = Date.now() + ((account.expires_in as number) ?? 300) * 1000;
      }

      // ── Returning session: validate ─────────────────────────────────────────
      if (!profile && !account) {
        // Propagate existing error to client (SessionGuard will force re-login)
        if (token.error === 'RefreshAccessTokenError') return token;

        // Check if DB user still exists (e.g. after manual deletion or DB reset)
        if (token.dbId) {
          const exists = await prisma.user.findUnique({ where: { id: token.dbId as string }, select: { id: true } });
          if (!exists) {
            delete token.dbId;
            delete token.lastActiveOrgId;
          }
        }

        // If access token is expired, try to refresh via Keycloak
        if (token.refreshToken && token.accessTokenExpires && Date.now() > (token.accessTokenExpires as number)) {
          return refreshAccessToken(token);
        }

        return token;
      }

      // ── New login or missing dbId: DB user lookup / create ─────────────────
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

            // Eingeladene Nutzer: E-Mail sofort als verifiziert markieren.
            // Der Einladungslink selbst bestätigt implizit die E-Mail-Adresse.
            const pendingInvite = await prisma.invite.findFirst({
              where: { email: email.toLowerCase() },
              select: { id: true },
            });
            if (pendingInvite && keycloakId) {
              markEmailVerified(keycloakId).catch(console.error);
            }

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
        session.user.id = token.dbId as string;
      }
      if (token.error) {
        (session as any).error = token.error;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
    signOut: '/signout',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 Tage – App bleibt eingeloggt
  },
  debug: process.env.NODE_ENV === 'development',
};