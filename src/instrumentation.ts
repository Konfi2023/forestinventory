/**
 * Next.js Instrumentation Hook — läuft einmal beim Serverstart.
 * Prüft ob alle Pflicht-Umgebungsvariablen gesetzt sind.
 * In Production: Fehler werden als WARNING geloggt (kein hard crash,
 * damit der Betreiber das Deployment-Log sieht).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Sentry server-side init (kompatibel mit Next.js 16 ohne withSentryConfig)
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.2,
        beforeSend(event) {
          if (event.request?.cookies) delete event.request.cookies;
          return event;
        },
      });
    }
    const required: Record<string, string> = {
      DATABASE_URL:         'PostgreSQL-Verbindung (PgBouncer)',
      DIRECT_DATABASE_URL:  'PostgreSQL-Direktverbindung (für Migrationen)',
      NEXTAUTH_URL:         'Öffentliche App-URL (z.B. https://app.deinedomain.de)',
      NEXTAUTH_SECRET:      'NextAuth Signing Secret (openssl rand -base64 32)',
      KEYCLOAK_ISSUER:      'Keycloak Realm URL',
      KEYCLOAK_CLIENT_ID:   'Keycloak Client ID',
      KEYCLOAK_CLIENT_SECRET: 'Keycloak Client Secret',
    };

    const s3vars: Record<string, string> = {
      AWS_REGION:            'AWS Region (z.B. eu-central-1)',
      AWS_ACCESS_KEY_ID:     'AWS Access Key',
      AWS_SECRET_ACCESS_KEY: 'AWS Secret Key',
      AWS_S3_BUCKET:         'S3 Bucket Name für Foto-Uploads',
    };

    const missing: string[] = [];

    for (const [key, description] of Object.entries(required)) {
      if (!process.env[key]) {
        missing.push(`  ✗ ${key.padEnd(26)} — ${description}`);
      }
    }

    // S3: entweder alle gesetzt oder alle fehlen (lokaler Fallback ist OK in Dev)
    const s3Set = Object.keys(s3vars).filter(k => process.env[k]);
    const s3Missing = Object.keys(s3vars).filter(k => !process.env[k]);
    if (s3Set.length > 0 && s3Missing.length > 0) {
      // Teilweise konfiguriert — das ist ein Fehler
      for (const key of s3Missing) {
        missing.push(`  ✗ ${key.padEnd(26)} — ${s3vars[key]} (S3 teilweise konfiguriert)`);
      }
    }

    // Empfohlen (kein Hard-Fail, aber Warnung)
    if (!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      missing.push(`  ⚠ ${'SENTRY_DSN'.padEnd(26)} — Sentry Error-Monitoring (empfohlen)`);
    }

    if (missing.length > 0) {
      const border = '═'.repeat(62);
      const lines = [
        `╔${border}╗`,
        `║  ⚠  FEHLENDE UMGEBUNGSVARIABLEN${' '.repeat(29)}║`,
        `╠${border}╣`,
        ...missing.map(l => `║ ${l.padEnd(61)}║`),
        `╠${border}╣`,
        `║  Bitte .env.production prüfen und Server neu starten.${' '.repeat(8)}║`,
        `╚${border}╝`,
      ];
      console.warn('\n' + lines.join('\n') + '\n');
    } else if (process.env.NODE_ENV === 'production') {
      console.info('[env-check] ✓ Alle Pflicht-Umgebungsvariablen sind gesetzt.');
    }
  }
}
