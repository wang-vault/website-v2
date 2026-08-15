import { getDb } from '@/lib/db';
import { apiOk, handleApiError } from '@/lib/api';

/** GET /api/blog — artikel blog terbit (publik). */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const posts = await db.blog.listPublished();
    return apiOk(posts.map(({ content: _content, ...post }) => post));
  } catch (error) {
    return handleApiError(error);
  }
}
