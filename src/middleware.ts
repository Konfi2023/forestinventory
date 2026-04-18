import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * In-memory Sliding-Window Rate Limiter.
 * Im PM2-Cluster-Modus hat jede Instanz eigene Counter.
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

// next-intl middleware for locale detection + routing
const intlMiddleware = createIntlMiddleware(routing);

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const { pathname } = req.nextUrl;

  maybeCleanup();

  // ── CORS for native app API calls ──────────────────────────────────
  if (pathname.startsWith('/api/app/')) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  }

  // ── Rate Limiting (API routes) ─────────────────────────────────────
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
      if (!rateLimit(`auth-login:${ip}`, 60, 15 * 60 * 1000)) {
        return NextResponse.json(
          { error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        );
      }
    }
  }

  if (pathname.startsWith('/api/')) {
    if (!rateLimit(`api:${ip}`, 150, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte kurz.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // ── Internal routes: no locale handling ────────────────────────────
  const isInternalRoute =
    pathname.startsWith('/api') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signout') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/messkarte');

  if (isInternalRoute) {
    const res = NextResponse.next();
    res.headers.set('x-current-path', pathname);

    // Sicherstellen dass NEXT_LOCALE Cookie gesetzt ist (fuer /app, /dashboard etc.)
    if (!req.cookies.get('NEXT_LOCALE')) {
      const acceptLang = req.headers.get('accept-language') ?? '';
      const browserLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      const supported = ['de', 'en', 'es', 'fr'];
      const locale = supported.includes(browserLang) ? browserLang : 'de';
      res.cookies.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
      });
    }

    return res;
  }

  // ── Marketing routes: logged-in user redirect ──────────────────────
  const isRoot = pathname === '/' || /^\/(de|en|es|fr)\/?$/.test(pathname);
  if (isRoot) {
    const sessionCookie =
      req.cookies.get('__Secure-next-auth.session-token') ??
      req.cookies.get('next-auth.session-token');
    if (sessionCookie) {
      const redirectRes = NextResponse.redirect(new URL('/dashboard', req.url));
      // Persist locale from URL before redirecting to dashboard
      const rootLocaleMatch = pathname.match(/^\/(de|en|es|fr)/);
      if (rootLocaleMatch) {
        redirectRes.cookies.set('NEXT_LOCALE', rootLocaleMatch[1], {
          path: '/',
          maxAge: 365 * 24 * 60 * 60,
          sameSite: 'lax',
        });
      }
      return redirectRes;
    }
  }

  // ── Marketing routes: detect locale from URL ────────────────────────
  const localeMatch = pathname.match(/^\/(de|en|es|fr)(\/|$)/);
  const detectedLocale = localeMatch?.[1];

  // Persist locale as NEXT_LOCALE cookie so internal routes
  // (dashboard, onboarding, etc.) that skip intl middleware can read it.
  if (detectedLocale) {
    const response = intlMiddleware(req);
    response.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
    return response;
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/',
    '/(de|en|es|fr)',
    '/(de|en|es|fr)/:path*',
    '/datenschutz',
    '/impressum',
    '/agb',
    '/api/:path*',
    '/dashboard/:path*',
  ],
};
