import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory Sliding-Window Rate Limiter.
 * Funktioniert zuverlässig auf selbst-gehostetem Next.js (single Node.js-Prozess).
 * Kein Redis erforderlich.
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
  if (pathname.startsWith('/api/auth')) {
    const isCallback = pathname.startsWith('/api/auth/callback') || pathname.startsWith('/api/auth/session') || pathname.startsWith('/api/auth/csrf');
    const limit = isCallback ? 200 : 60;
    if (!rateLimit(`auth:${ip}`, limit, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }
  }

  // App-API-Routen: 300 Anfragen / Minute (normaler Betrieb)
  if (pathname.startsWith('/api/')) {
    if (!rateLimit(`api:${ip}`, 300, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte kurz.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Aktuellen Pfad als Header weitergeben (für Server Components)
  const res = NextResponse.next();
  res.headers.set('x-current-path', pathname);
  return res;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
