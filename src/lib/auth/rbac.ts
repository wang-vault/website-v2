import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

/**
 * Matriks izin RBAC WangStore.
 * Hierarchy: Owner > Admin > Staff.
 * Setiap API route admin WAJIB memanggil requirePermission() — verifikasi
 * dilakukan ulang di setiap route, tidak hanya di UI.
 */

export type Permission =
  | 'orders.read'
  | 'orders.update'
  | 'customers.read'
  | 'customers.update'
  | 'roles.manage'
  | 'tickets.read'
  | 'tickets.reply'
  | 'pricing.manage'
  | 'coupons.manage'
  | 'products.manage'
  | 'packages.manage'
  | 'analytics.read'
  | 'content.manage'
  | 'legal.manage'
  | 'settings.manage'
  | 'maintenance.manage'
  | 'audit.read'
  | 'status.manage';

const PERMISSIONS: Record<Permission, Role> = {
  'orders.read': 'staff',
  'orders.update': 'staff',
  'customers.read': 'admin',
  'customers.update': 'admin',
  'roles.manage': 'owner',
  'tickets.read': 'staff',
  'tickets.reply': 'staff',
  'pricing.manage': 'admin',
  'coupons.manage': 'admin',
  'products.manage': 'admin',
  'packages.manage': 'admin',
  'analytics.read': 'admin',
  'content.manage': 'admin',
  'legal.manage': 'admin',
  'settings.manage': 'admin',
  'maintenance.manage': 'owner',
  'audit.read': 'admin',
  'status.manage': 'staff',
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const minimum = PERMISSIONS[permission];
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error = new Error('FORBIDDEN');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}
