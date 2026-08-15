import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE, CSRF_COOKIE } from '@/lib/auth/session';
import { generateCsrfToken } from '@/lib/security/csrf';
import { ROLE_HIERARCHY } from '@/types';

/**
 * Middleware (edge):
 * - Header keamanan + CSP nonce (dokumentasi resmi Next.js).
 * - Perlindungan rute: /dashboard, /account → login; /admin → staff+.
 * - Cookie CSRF untuk sesi terautentikasi.
 * - Menyuntikkan x-pathname untuk pengecekan maintenance di layout.
 * - noindex untuk rute privat.
 */

const PRIVATE_PREFIXES = ['/dashboard', '/account', '/admin', '/order', '/login', '/register', '/verify-email', '/reset-password', '/forgot-password'];

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // CSP nonce: Next.js membaca header x-nonce dan menerapkannya ke semua script.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', pathname);

  const isDev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    'img-src \'self\' data: blob: https:',
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  let response: NextResponse;

  // Proteksi rute berdasarkan sesi.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const needsAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/account');
  const needsStaff = pathname.startsWith('/admin');

  if (needsAuth && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    response = NextResponse.redirect(url);
  } else if (needsStaff && (!session || ROLE_HIERARCHY[session.role] < ROLE_HIERARCHY.staff)) {
    const url = request.nextUrl.clone();
    url.pathname = session ? '/dashboard' : '/login';
    if (!session) url.searchParams.set('next', pathname);
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Cookie CSRF untuk permintaan terautentikasi.
  if (session && !request.cookies.get(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      secure: !isDev,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  // Header keamanan.
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  if (isPrivateRoute(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
};
