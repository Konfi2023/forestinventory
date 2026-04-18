/**
 * API Auth helper — supports both NextAuth sessions (web) and
 * Keycloak Bearer tokens (native app).
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFileSync } from 'fs';

function dbg(msg: string) {
  try { writeFileSync('/tmp/fm-debug.log', new Date().toISOString() + ' [api-auth] ' + msg + '\n', { flag: 'a' }); } catch {}
}

interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extracts the authenticated user from either:
 * 1. NextAuth session (cookie-based, for web)
 * 2. Authorization: Bearer <keycloak-token> (for native app)
 */
export async function getApiUser(req?: Request): Promise<AuthUser | null> {
  // 1. Try NextAuth session first (web / cookie auth)
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { id: session.user.id, email: session.user.email ?? '' };
  }

  // 2. Try Bearer token (native app)
  if (req) {
    const authHeader = req.headers.get('authorization');
    dbg('authHeader present: ' + !!authHeader);
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        // Decode JWT payload (Keycloak token)
        const raw = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(raw);
        dbg('JWT payload keys: ' + Object.keys(payload).join(', '));
        dbg('JWT payload: ' + JSON.stringify({ sub: payload.sub, email: payload.email, preferred_username: payload.preferred_username, azp: payload.azp, exp: payload.exp }));
        const keycloakSub = payload.sub || '';
        const email = payload.email || payload.preferred_username || '';

        if (!keycloakSub && !email) { dbg('No sub and no email in token'); return null; }

        // Find user by keycloakId (if sub is present)
        if (keycloakSub) {
          const user = await prisma.user.findFirst({
            where: { keycloakId: keycloakSub },
            select: { id: true, email: true },
          });
          if (user) {
            dbg('User found by keycloakId: ' + user.id + ' / ' + user.email);
            return { id: user.id, email: user.email };
          }
          dbg('No user found by keycloakId: ' + keycloakSub);
        }

        // Fallback: find by email (also covers tokens without sub)
        if (email) {
          const userByEmail = await prisma.user.findFirst({
            where: { email },
            select: { id: true, email: true },
          });
          if (userByEmail) {
            dbg('User found by email: ' + email + ' -> ' + userByEmail.id);
            // Auto-link keycloakId if sub is present
            if (keycloakSub) {
              await prisma.user.update({
                where: { id: userByEmail.id },
                data: { keycloakId: keycloakSub },
              });
            }
            return { id: userByEmail.id, email: userByEmail.email };
          }
          dbg('No user found by email: ' + email);
        }
      } catch (err: any) {
        dbg('Token decode error: ' + (err?.message || String(err)));
      }
    }
  }

  dbg('[api-auth] No auth found, returning null');
  return null;
}
