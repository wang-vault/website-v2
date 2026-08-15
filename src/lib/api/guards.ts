import { headers } from 'next/headers';
import { getDb } from '@/lib/db';
import type { DataStore } from '@/lib/db/types';
import { getSession, type SessionPayload } from '@/lib/auth/session';
import { assertPermission, type Permission } from '@/lib/auth/rbac';
import { validateOrigin, verifyCsrf } from '@/lib/security/csrf';
import { getMaintenanceState } from '@/lib/maintenance';
import { ApiErrorException } from '@/lib/api';

export interface AdminContext {
  db: DataStore;
  session: SessionPayload;
}

/**
 * Verifikasi sesi + RBAC untuk route admin.
 * RBAC diverifikasi ulang di SETIAP route API (bukan hanya di UI).
 * Sesi divalidasi terhadap tokenVersion pengguna di basis data.
 */
export async function requireAdmin(permission: Permission): Promise<AdminContext> {
  const db = await getDb();
  const sessionContext = await getSession();
  if (!sessionContext) {
    throw new ApiErrorException(401, 'UNAUTHENTICATED', 'Anda harus masuk terlebih dahulu.');
  }
  assertPermission(sessionContext.session.role, permission);
  const user = await db.users.findById(sessionContext.session.sub);
  if (!user || user.tokenVersion !== sessionContext.session.tv) {
    throw new ApiErrorException(401, 'SESSION_EXPIRED', 'Sesi Anda sudah tidak berlaku. Silakan masuk kembali.');
  }
  return { db, session: sessionContext.session };
}

/** Konteks untuk route akun pelanggan (harus login, peran apa pun). */
export async function requireUser(): Promise<AdminContext> {
  const db = await getDb();
  const sessionContext = await getSession();
  if (!sessionContext) {
    throw new ApiErrorException(401, 'UNAUTHENTICATED', 'Anda harus masuk terlebih dahulu.');
  }
  const user = await db.users.findById(sessionContext.session.sub);
  if (!user || user.tokenVersion !== sessionContext.session.tv) {
    throw new ApiErrorException(401, 'SESSION_EXPIRED', 'Sesi Anda sudah tidak berlaku. Silakan masuk kembali.');
  }
  return { db, session: sessionContext.session };
}

/**
 * Keamanan permintaan tulis:
 * 1. Origin/Host validation untuk SEMUA permintaan tulis.
 * 2. Double-submit CSRF untuk permintaan terautentikasi.
 */
export async function requireWriteSecurity(): Promise<void> {
  const originOk = await validateOrigin();
  if (!originOk) {
    throw new ApiErrorException(403, 'CSRF_FAILED', 'Permintaan ditolak: origin tidak valid.');
  }
  const sessionContext = await getSession();
  if (sessionContext) {
    const headerStore = await headers();
    const csrfHeader = headerStore.get('x-csrf-token');
    const csrfOk = await verifyCsrf(csrfHeader);
    if (!csrfOk) {
      throw new ApiErrorException(403, 'CSRF_FAILED', 'Permintaan ditolak: token CSRF tidak valid.');
    }
  }
}

/** Cek mode maintenance untuk route API (mengembalikan 503 saat aktif). */
export async function assertNotInMaintenance(pathname: string): Promise<void> {
  const sessionContext = await getSession();
  const state = await getMaintenanceState(pathname, sessionContext?.session.role ?? null);
  if (state) {
    throw new ApiErrorException(503, 'MAINTENANCE_MODE', state.message);
  }
}
