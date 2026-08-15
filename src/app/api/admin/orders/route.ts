import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/guards';
import type { OrderStatus } from '@/types';

const VALID_STATUS: OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'expired',
  'refunded',
];

/** GET /api/admin/orders — daftar order (staff+). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { db } = await requireAdmin('orders.read');
    const statusParam = request.nextUrl.searchParams.get('status') ?? '';
    const search = request.nextUrl.searchParams.get('q') ?? '';
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const pageSize = Number(request.nextUrl.searchParams.get('pageSize') ?? 25);

    const status = VALID_STATUS.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;
    const result = await db.orders.listAdmin({ status, search, page, pageSize });
    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
