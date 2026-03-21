import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory Sliding-Window Rate Limiter.
 * Im PM2-Cluster-Modus hat jede Instanz eigene Counter.
 * Limits sind pro Instanz auf die Hälfte gesetzt → kombiniert entspricht das dem
 * gewünschten Gesamtlimit. Für exakte Limits später auf Redis migrieren.
 */
const counters = new Map<string, { count: number; resetAt: number }>();
let cleanupTick = 0;

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = counters.get(key);

  if (!entry || now > entry.resetAt) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function maybeCleanup() {
  if (++cleanupTick % 500 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of counters.entries()) {
    if (now > entry.resetAt) counters.delete(key);
  }
}

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const { pathname } = req.nextUrl;

  maybeCleanup();

  // Auth-Routen: Brute-Force-Schutz
  // Callback/Session/CSRF sind interne Systemaufrufe – separater, großzügiger Counter.
  // Sign-in-Versuche bekommen einen eigenen, strengeren Counter.
  // Wichtig: Mobile-Netze nutzen CGNAT (viele Nutzer hinter einer IP) → Limits großzügig genug.
  if (pathname.startsWith('/api/auth')) {
    const isSystemCall = pathname.startsWith('/api/auth/callback') ||
                         pathname.startsWith('/api/auth/session') ||
                         pathname.startsWith('/api/auth/csrf');
    if (isSystemCall) {
      if (!rateLimit(`auth-sys:${ip}`, 300, 15 * 60 * 1000)) {
        return NextResponse.json(
          { error: 'Zu viele Anfragen. Bitte warte 15 Minuten.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        );
      }
    } else {
      // Eigentliche Sign-in-Versuche (/api/auth/signin, /api/auth/signout, ...)
      if (!rateLimit(`auth-login:${ip}`, 60, 15 * 60 * 1000)) {
        return NextResponse.json(
          { error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        );
      }
    }
  }

  // App-API-Routen: 300 Anfragen / Minute (normaler Betrieb)
  if (pathname.startsWith('/api/')) {
    if (!rateLimit(`api:${ip}`, 150, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte kurz.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Landingpage: eingeloggte Nutzer sofort zum Dashboard leiten (cookie-basiert,
  // ohne Keycloak-Roundtrip → Seite bleibt statisch und schnell für alle anderen)
  if (pathname === '/') {
    const sessionCookie =
      req.cookies.get('__Secure-next-auth.session-token') ??
      req.cookies.get('next-auth.session-token');
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Aktuellen Pfad als Header weitergeben (für Server Components)
  const res = NextResponse.next();
  res.headers.set('x-current-path', pathname);
  return res;
}

export const config = {
  matcher: ['/', '/api/:path*', '/dashboard/:path*'],
};
