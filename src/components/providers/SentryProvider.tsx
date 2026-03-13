'use client';

import { useEffect } from 'react';

export function SentryProvider({ dsn }: { dsn: string | undefined }) {
  useEffect(() => {
    if (!dsn) return;
    import('@sentry/browser').then(Sentry => {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.2,
      });
    });
  }, [dsn]);

  return null;
}
