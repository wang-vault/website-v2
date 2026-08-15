import { apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';

export async function GET(): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    const [notifications, unreadCount] = await Promise.all([
      db.notifications.listByUser(session.sub, 50),
      db.notifications.unreadCount(session.sub),
    ]);
    return apiOk({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();
    await db.notifications.markAllRead(session.sub);
    return apiOk({ markedAllRead: true });
  } catch (error) {
    return handleApiError(error);
  }
}
