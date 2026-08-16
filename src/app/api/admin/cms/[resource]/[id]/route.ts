import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity, type AdminContext } from '@/lib/api/guards';
import { cmsDelete, cmsList, cmsUpdate, getResourceDefinition } from '@/lib/cms';

/** Baca memakai readPermission, tulis memakai writePermission resource. */
function requireCmsRead(resource: string): Promise<AdminContext> {
  return requireAdmin(getResourceDefinition(resource).readPermission);
}

function requireCmsWrite(resource: string): Promise<AdminContext> {
  return requireAdmin(getResourceDefinition(resource).writePermission);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
): Promise<Response> {
  try {
    const { resource, id } = await params;
    getResourceDefinition(resource);
    await requireCmsRead(resource);
    const items = await cmsList(resource);
    const item = items.find((entry) => {
      const record = entry as { id?: string };
      return record.id === id;
    });
    if (!item) return apiError(404, 'NOT_FOUND', 'Data tidak ditemukan.');
    return apiOk(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
): Promise<Response> {
  try {
    const { resource, id } = await params;
    getResourceDefinition(resource);
    const { session } = await requireCmsWrite(resource);
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid.');
    }
    const updated = await cmsUpdate(resource, id, body as Record<string, unknown>, session.email);
    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
): Promise<Response> {
  try {
    const { resource, id } = await params;
    getResourceDefinition(resource);
    const { session } = await requireCmsWrite(resource);
    await requireWriteSecurity();
    await cmsDelete(resource, id, session.email);
    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
