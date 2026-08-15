import { getDb } from '@/lib/db';
import { apiOk, handleApiError } from '@/lib/api';

/** GET /api/knowledge-base — artikel knowledge base terbit (publik). */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const articles = await db.knowledgeBase.listPublished();
    return apiOk(articles);
  } catch (error) {
    return handleApiError(error);
  }
}
