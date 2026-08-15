import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { getDb } from '@/lib/db';
import { formatDate, readingTimeMinutes } from '@/lib/utils';
import { Markdown } from '@/components/markdown';
import { Breadcrumb } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const article = await db.knowledgeBase.getBySlug(slug);
  if (!article || article.status !== 'published') return { title: 'Artikel tidak ditemukan' };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/knowledge-base/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      url: `${baseUrl}/knowledge-base/${article.slug}`,
      publishedTime: article.publishedAt ?? undefined,
      locale: 'id_ID',
    },
    twitter: { card: 'summary', title: article.title, description: article.excerpt },
  };
}

export default async function KnowledgeArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const db = await getDb();
  const article = await db.knowledgeBase.getBySlug(slug);
  if (!article || article.status !== 'published') notFound();

  const allArticles = await db.knowledgeBase.listPublished();
  const related = allArticles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const techArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: 'WangStore' },
    keywords: article.tags.join(', '),
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/knowledge-base/${article.slug}`,
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <Breadcrumb
          items={[
            { label: 'Beranda', href: '/' },
            { label: 'Knowledge Base', href: '/knowledge-base' },
            { label: article.title },
          ]}
          className="mb-6"
        />
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <Link
              href={`/knowledge-base?category=${encodeURIComponent(article.category)}`}
              className="font-medium text-text-secondary hover:text-text-primary"
            >
              {article.category}
            </Link>
            <span>{formatDate(article.publishedAt ?? article.createdAt)}</span>
            <span>{readingTimeMinutes(article.content)} mnt baca</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{article.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">{article.excerpt}</p>
        </header>

        <Markdown content={article.content} />

        {related.length > 0 ? (
          <section aria-labelledby="artikel-terkait" className="mt-12 border-t border-border pt-8">
            <h2 id="artikel-terkait" className="text-lg font-semibold text-text-primary">
              Artikel terkait
            </h2>
            <ul className="mt-4 space-y-2">
              {related.map((relatedArticle) => (
                <li key={relatedArticle.id}>
                  <Link
                    href={`/knowledge-base/${relatedArticle.slug}`}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-text-muted"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="text-sm font-medium text-text-primary">{relatedArticle.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 border-t border-border pt-4 text-xs text-text-muted">
          Artikel ini diperbarui terakhir pada {formatDate(article.updatedAt)}.
        </p>
        <div className="mt-4">
          <Badge variant="neutral">Dokumentasi resmi WangStore</Badge>
        </div>
      </div>
    </div>
  );
}
