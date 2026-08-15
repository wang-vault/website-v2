import { getDb } from '@/lib/db';
import { clearSessionCookie, getSession } from '@/lib/auth/session';
import { apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';

/** POST /api/auth/logout — membatalkan sesi dan menaikkan tokenVersion. */
export async function POST(): Promise<Response> {
  try {
    await requireWriteSecurity();
    const sessionContext = await getSession();
    if (sessionContext) {
      const db = await getDb();
      const user = await db.users.findById(sessionContext.session.sub);
      if (user) {
        await db.users.update(user.id, { tokenVersion: user.tokenVersion + 1 });
      }
      await db.audit.log({
        actorId: user?.id ?? null,
        actorEmail: sessionContext.session.email,
        action: 'logout',
        resource: 'user',
        resourceId: user?.id ?? null,
        ipAddress: null,
        metadata: {},
      });
    }
    await clearSessionCookie();
    return apiOk({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
