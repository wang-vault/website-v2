import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from '@/lib/auth/session';
import { hasPermission, type Permission } from '@/lib/auth/rbac';
import type { Role } from '@/types';

/**
 * Guard RBAC untuk HALAMAN panel admin (server component).
 *
 * Middleware hanya memastikan pengunjung /admin minimal berperan Staff.
 * Setiap halaman tetap harus menyatakan izin yang dibutuhkannya sendiri agar
 * Staff tidak dapat membuka halaman khusus Admin/Owner lewat URL langsung.
 *
 * Pola pemakaian di halaman:
 *   const { role, can } = await requireAdminPage('pricing.read');
 *   ... <PricingForm readOnly={!can('pricing.manage')} />
 */

export interface AdminPageContext {
  session: SessionPayload;
  role: Role;
  /** Pemeriksaan izin tambahan untuk menentukan mode baca-saja di UI. */
  can: (permission: Permission) => boolean;
}

export async function requireAdminPage(permission?: Permission): Promise<AdminPageContext> {
  const sessionContext = await getSession();
  if (!sessionContext) {
    redirect('/login?next=/admin');
  }
  const { role } = sessionContext.session;
  if (role === 'customer') {
    redirect('/dashboard');
  }
  if (permission && !hasPermission(role, permission)) {
    redirect(`/admin/forbidden?permission=${encodeURIComponent(permission)}`);
  }
  return {
    session: sessionContext.session,
    role,
    can: (target: Permission) => hasPermission(role, target),
  };
}
