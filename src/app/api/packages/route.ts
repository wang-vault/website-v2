import { getDb } from '@/lib/db';
import { apiOk, handleApiError } from '@/lib/api';

/** GET /api/packages — paket High yang aktif (katalog publik). */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const packages = await db.packages.list();
    return apiOk(packages.filter((pkg) => pkg.active));
  } catch (error) {
    return handleApiError(error);
  }
}
