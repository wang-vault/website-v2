import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/guards';

/** GET /api/admin/audit-logs — log audit (admin+; owner tidak eksklusif). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { db } = await requireAdmin('audit.read');
    const resource = request.nextUrl.searchParams.get('resource') ?? '';
    const search = request.nextUrl.searchParams.get('q') ?? '';
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const pageSize = Number(request.nextUrl.searchParams.get('pageSize') ?? 25);
    const result = await db.audit.list({ resource, search, page, pageSize });
    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
