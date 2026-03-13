import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.2,

  // Keine personenbezogenen Daten in Server-Errors
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
