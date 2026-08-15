import { getDb } from '@/lib/db';
import { ROLE_HIERARCHY } from '@/types';
import type { Role } from '@/types';

/**
 * Mode Maintenance — dikelola dari admin (Tabel settings):
 * title, message, estimated restoration, allowed paths, admin bypass.
 */

export interface MaintenanceState {
  title: string;
  message: string;
  estimatedRestoration: string;
}

export async function getMaintenanceState(
  pathname: string,
  role: Role | null,
): Promise<MaintenanceState | null> {
  const db = await getDb();
  const settings = await db.settings.get();
  if (!settings.maintenanceMode) return null;

  // Admin bypass: staff ke atas tetap dapat mengakses.
  if (role && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.staff) return null;

  const allowed = settings.maintenanceAllowedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (allowed) return null;

  return {
    title: settings.maintenanceTitle || 'Sedang Dalam Pemeliharaan',
    message:
      settings.maintenanceMessage ||
      'WangStore sedang dalam pemeliharaan. Kami akan segera kembali.',
    estimatedRestoration: settings.maintenanceEstimatedRestoration,
  };
}
