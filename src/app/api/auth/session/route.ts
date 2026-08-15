import { getSession } from '@/lib/auth/session';
import { apiOk } from '@/lib/api';

/** GET /api/auth/session — status sesi saat ini (tidak membocorkan data sensitif). */
export async function GET(): Promise<Response> {
  const sessionContext = await getSession();
  if (!sessionContext) {
    return apiOk({ authenticated: false });
  }
  return apiOk({
    authenticated: true,
    email: sessionContext.session.email,
    role: sessionContext.session.role,
  });
}
