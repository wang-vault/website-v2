import { getDb } from '@/lib/db';
import { apiError, apiOk, handleApiError } from '@/lib/api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    const { slug } = await params;
    const db = await getDb();
    const article = await db.knowledgeBase.getBySlug(slug);
    if (!article || article.status !== 'published') {
      return apiError(404, 'NOT_FOUND', 'Artikel tidak ditemukan.');
    }
    return apiOk(article);
  } catch (error) {
    return handleApiError(error);
  }
}
