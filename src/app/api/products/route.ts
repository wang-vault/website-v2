import { getDb } from '@/lib/db';
import { apiOk, handleApiError } from '@/lib/api';

/** GET /api/products — katalog produk publik (aktif & terlihat). */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const products = await db.products.list({ publicOnly: true });
    return apiOk(products);
  } catch (error) {
    return handleApiError(error);
  }
}
