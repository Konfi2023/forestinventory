/**
 * API Auth helper — supports both NextAuth sessions (web) and
 * Keycloak Bearer tokens (native app).
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    console.log('[api-auth] authHeader present:', !!authHeader);
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        // Decode JWT payload (Keycloak token)
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        );
        const keycloakSub = payload.sub;
        const email = payload.email || payload.preferred_username || '';
        console.log('[api-auth] JWT decoded — sub:', keycloakSub, 'email:', email);

        if (!keycloakSub) { console.log('[api-auth] No sub in token'); return null; }

        // Find user by keycloakId
        const user = await prisma.user.findFirst({
          where: { keycloakId: keycloakSub },
          select: { id: true, email: true },
        });

        if (user) {
          console.log('[api-auth] User found by keycloakId:', user.id);
          return { id: user.id, email: user.email };
        }
        console.log('[api-auth] No user found by keycloakId:', keycloakSub);

        // Fallback: try to find by email and auto-link keycloakId
        if (email) {
          const userByEmail = await prisma.user.findFirst({
            where: { email },
            select: { id: true, email: true },
          });
          if (userByEmail) {
            console.log('[api-auth] User found by email, auto-linking keycloakId');
            await prisma.user.update({
              where: { id: userByEmail.id },
              data: { keycloakId: keycloakSub },
            });
            return { id: userByEmail.id, email: userByEmail.email };
          }
          console.log('[api-auth] No user found by email:', email);
        }
      } catch (err: any) {
        console.error('[api-auth] Token decode error:', err?.message);
      }
    }
  }

  console.log('[api-auth] No auth found, returning null');
  return null;
}
