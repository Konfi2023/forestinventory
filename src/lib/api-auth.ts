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
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        // Decode JWT payload (Keycloak token)
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        );
        const keycloakSub = payload.sub;
        const email = payload.email || payload.preferred_username || '';

        if (!keycloakSub) return null;

        // Find user by keycloakId
        const user = await prisma.user.findFirst({
          where: { keycloakId: keycloakSub },
          select: { id: true, email: true },
        });

        if (user) {
          return { id: user.id, email: user.email };
        }

        // Fallback: try to find by email
        if (email) {
          const userByEmail = await prisma.user.findFirst({
            where: { email },
            select: { id: true, email: true },
          });
          if (userByEmail) {
            return { id: userByEmail.id, email: userByEmail.email };
          }
        }
      } catch {
        // Invalid token
      }
    }
  }

  return null;
}
