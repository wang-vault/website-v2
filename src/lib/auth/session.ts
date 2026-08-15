import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

export const SESSION_COOKIE = 'ws_session';
export const CSRF_COOKIE = 'ws_csrf';

export interface SessionPayload {
  sub: string;
  email: string;
  role: Role;
  tv: number; // token version — di-increment saat logout/password change
}

const encoder = new TextEncoder();

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET belum dikonfigurasi.');
  }
  return encoder.encode(secret);
}

export async function signSession(payload: SessionPayload, remember: boolean): Promise<string> {
  const hours = remember ? 24 * 30 : 24 * 7;
  return new SignJWT({ email: payload.email, role: payload.role, tv: payload.tv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    const role = payload.role as Role;
    if (!(role in ROLE_HIERARCHY)) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      role,
      tv: typeof payload.tv === 'number' ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}

export interface SessionContext {
  session: SessionPayload;
  csrfToken: string;
}

const isServer = typeof window === 'undefined';

/**
 * Membaca sesi pengguna terautentikasi dari cookie httpOnly.
 * Memvalidasi ulang token terhadap tokenVersion pengguna di basis data,
 * sehingga logout / pergantian kata sandi langsung membatalkan sesi.
 */
export async function getSession(): Promise<SessionContext | null> {
  if (!isServer) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const csrfToken = cookieStore.get(CSRF_COOKIE)?.value ?? '';
  return { session: payload, csrfToken };
}

export async function setSessionCookie(token: string, remember: boolean): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function isStaff(role: Role): boolean {
  return hasRole(role, 'staff');
}

export function isAdmin(role: Role): boolean {
  return hasRole(role, 'admin');
}

export function isOwner(role: Role): boolean {
  return role === 'owner';
}
