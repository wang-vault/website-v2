import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { apiOk, handleApiError } from '@/lib/api';
import { resolveCatalogStatus } from '@/lib/catalog';

/**
 * GET /api/vps-packages — katalog VPS aktif (publik).
 * Menyertakan status ketersediaan agar klien menampilkan keadaan sebenarnya
 * (dijual / sedang disiapkan / tidak tersedia) alih-alih menebak.
 */
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    const [packages, settings] = await Promise.all([db.vpsPackages.list(), db.settings.get()]);
    const status = resolveCatalogStatus(settings).vps;
    return apiOk({ status, packages: packages.filter((pkg) => pkg.active) });
  } catch (error) {
    return handleApiError(error);
  }
}
