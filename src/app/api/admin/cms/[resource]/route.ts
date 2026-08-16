import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity, type AdminContext } from '@/lib/api/guards';
import { cmsCreate, cmsList, getResourceDefinition } from '@/lib/cms';

/**
 * Akses CMS dipisah antara BACA dan TULIS.
 * Staff boleh membaca konten sebagai rujukan (content.read / status.read),
 * sedangkan membuat & mengubah butuh izin tulis resource tersebut
 * (content.manage, legal.manage, atau status.manage).
 */
function requireCmsRead(resource: string): Promise<AdminContext> {
  return requireAdmin(getResourceDefinition(resource).readPermission);
}

function requireCmsWrite(resource: string): Promise<AdminContext> {
  return requireAdmin(getResourceDefinition(resource).writePermission);
}

/**
 * GENERIC CMS API — satu handler untuk seluruh resource konten.
 * GET: daftar resource. POST: buat resource baru.
 * Resource map + skema validasi + minimum role ada di src/lib/cms.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
): Promise<Response> {
  try {
    const { resource } = await params;
    getResourceDefinition(resource);
    await requireCmsRead(resource);
    const items = await cmsList(resource);
    return apiOk(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
): Promise<Response> {
  try {
    const { resource } = await params;
    getResourceDefinition(resource);
    const { session } = await requireCmsWrite(resource);
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid.');
    }
    const record = await cmsCreate(resource, body as Record<string, unknown>, session.email);
    return apiOk(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
