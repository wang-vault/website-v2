import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/guards';

/**
 * GET /api/admin/customers — daftar pengguna.
 * Izin customers.read dimiliki Staff ke atas (baca-saja untuk verifikasi saat
 * melayani tiket). Mengubah data butuh customers.update (Admin) dan mengubah
 * role butuh roles.manage (Owner) — lihat route [id].
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { db } = await requireAdmin('customers.read');
    const search = request.nextUrl.searchParams.get('q') ?? '';
    const role = request.nextUrl.searchParams.get('role') ?? '';
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const pageSize = Number(request.nextUrl.searchParams.get('pageSize') ?? 25);

    const users = await db.users.list({
      search,
      role: role === 'owner' || role === 'admin' || role === 'staff' || role === 'customer' ? role : undefined,
      page,
      pageSize,
    });
    const enriched = await Promise.all(
      users.items.map(async (user) => {
        const profile = await db.profiles.get(user.id);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          fullName: profile?.fullName ?? '',
        };
      }),
    );
    return apiOk({ items: enriched, total: users.total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}
