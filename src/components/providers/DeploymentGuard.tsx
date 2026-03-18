'use client';

import { useEffect } from 'react';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 Minuten

/**
 * Schützt vor zwei Problemen nach Deployments:
 *
 * 1. "Failed to find Server Action" — Browser hat veraltete Seite, Server kennt
 *    die alten Action-IDs nicht mehr. → Seite wird automatisch hart neu geladen.
 *
 * 2. Langer Inaktivitäts-Tab — Nutzer öffnet einen Tab der >10 Min. im Hintergrund
 *    war. Möglicherweise ein neues Deployment dazwischen. → Reload beim Zurückkehren.
 */
export function DeploymentGuard() {
  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const msg = event.reason?.message ?? String(event.reason ?? '');
      if (msg.includes('Failed to find Server Action')) {
        event.preventDefault();
        window.location.reload();
      }
    }

    let hiddenAt: number | null = null;

    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt > STALE_THRESHOLD_MS) {
        hiddenAt = null;
        window.location.reload();
      } else {
        hiddenAt = null;
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
