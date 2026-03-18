'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

/**
 * Detects a failed token refresh (e.g. account deleted elsewhere) and
 * performs a full Keycloak logout + NextAuth sign-out automatically.
 */
export function SessionGuard() {
  const { data: session } = useSession();

  useEffect(() => {
    if ((session as any)?.error !== 'RefreshAccessTokenError') return;

    async function forceLogout() {
      try {
        const res = await fetch('/api/auth/keycloak-logout?callbackUrl=/');
        const { url } = await res.json();
        await signOut({ redirect: false });
        window.location.href = url;
      } catch {
        await signOut({ callbackUrl: '/' });
      }
    }

    forceLogout();
  }, [session]);

  return null;
}
