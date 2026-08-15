import { apiOk, handleApiError } from '@/lib/api';
import { requireUser } from '@/lib/api/guards';

/** GET /api/account/orders — riwayat order milik pengguna yang login. */
export async function GET(): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    const orders = await db.orders.listByUser(session.sub);
    return apiOk(orders);
  } catch (error) {
    return handleApiError(error);
  }
}
