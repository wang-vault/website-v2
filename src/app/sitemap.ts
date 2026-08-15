import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';

/**
 * Sitemap dinamis: halaman publik + artikel blog + knowledge base.
 * Rute privat (/dashboard, /login, /order/*, /admin/*, /account) TIDAK
 * disertakan sesuai kebijakan noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const db = await getDb();
  const [blogPosts, kbArticles] = await Promise.all([
    db.blog.listPublished(),
    db.knowledgeBase.listPublished(),
  ]);

  const staticPages = [
    '',
    '/about',
    '/infrastructure',
    '/server-builder',
    '/features',
    '/why-wangstore',
    '/faq',
    '/testimonials',
    '/blog',
    '/knowledge-base',
    '/status',
    '/contact',
    '/terms',
    '/privacy',
    '/refund',
    '/sla',
    '/acceptable-use',
    '/cookie-policy',
  ];

  const now = new Date();

  return [
    ...staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
    })),
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...kbArticles.map((article) => ({
      url: `${baseUrl}/knowledge-base/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
