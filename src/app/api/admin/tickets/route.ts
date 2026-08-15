import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/guards';
import type { TicketStatus } from '@/types';

const VALID_STATUS: TicketStatus[] = ['open', 'pending', 'closed'];

/** GET /api/admin/tickets — daftar tiket (staff+). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { db } = await requireAdmin('tickets.read');
    const statusParam = request.nextUrl.searchParams.get('status') ?? '';
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const pageSize = Number(request.nextUrl.searchParams.get('pageSize') ?? 25);
    const status = VALID_STATUS.includes(statusParam as TicketStatus) ? (statusParam as TicketStatus) : undefined;
    const result = await db.tickets.listAdmin({ status, page, pageSize });
    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
