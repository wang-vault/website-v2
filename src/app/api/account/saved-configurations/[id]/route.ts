import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();
    const { id } = await params;
    await db.savedConfigurations.remove(id, session.sub);
    return apiOk({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return apiError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk tindakan ini.');
    }
    return handleApiError(error);
  }
}
