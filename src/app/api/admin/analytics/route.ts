import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/guards';

/** GET /api/admin/analytics — statistik nyata dari data order (tanpa angka palsu). */
export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('analytics.read');
    const stats = await db.orders.stats();
    const customerCount = await db.users.count();
    return apiOk({
      ...stats,
      registeredCustomers: customerCount,
      note:
        'Angka dihitung langsung dari data order yang tersimpan. Jika belum ada data, angka akan nol.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
