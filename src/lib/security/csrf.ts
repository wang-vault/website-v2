import { cookies, headers } from 'next/headers';
import { CSRF_COOKIE } from '@/lib/auth/session';

/**
 * Perlindungan CSRF dengan double-submit cookie:
 * - Cookie acak (tidak httpOnly) diset oleh middleware saat pengguna login.
 * - Klien mengirim nilainya kembali lewat header X-CSRF-Token.
 * - Server membandingkan cookie vs header untuk permintaan terautentikasi.
 *
 * Selain itu, SEMUA permintaan tulis memvalidasi Origin/Host (lihat
 * validateOrigin()) sehingga permintaan lintas situs ditolak lebih awal.
 *
 * Catatan: implementasi edge-compatible (Web Crypto, bukan node:crypto)
 * karena dipakai juga oleh middleware.
 */

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

/** Perbandingan string yang konstan terhadap panjangnya (timing-safe sederhana). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function setCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();
  if (!cookieStore.get(CSRF_COOKIE)?.value) {
    cookieStore.set(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }
}

export async function verifyCsrf(expectedToken: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookie || !expectedToken) return false;
  return safeEqual(cookie, expectedToken);
}

/** Memvalidasi Origin/Host pada permintaan tulis (write request). */
export async function validateOrigin(): Promise<boolean> {
  const headerStore = await headers();
  const origin = headerStore.get('origin');
  if (!origin) return true; // Klien non-browser (curl/CLI) — dilindungi lapisan lain.
  const host = headerStore.get('host');
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
