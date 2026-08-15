import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Tag } from 'lucide-react';
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
  const post = await db.blog.getBySlug(slug);
  if (!post || post.status !== 'published') return { title: 'Artikel tidak ditemukan' };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: `${baseUrl}/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      authors: [post.author],
      tags: post.tags,
      locale: 'id_ID',
    },
    twitter: { card: 'summary', title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const db = await getDb();
  const post = await db.blog.getBySlug(slug);
  if (!post || post.status !== 'published') notFound();

  const [categories, allPosts] = await Promise.all([db.blog.categories(), db.blog.listPublished()]);
  const category = categories.find((c) => c.id === post.categoryId);
  const related = allPosts.filter((p) => p.id !== post.id && p.categoryId === post.categoryId).slice(0, 2);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'WangStore',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    keywords: post.tags.join(', '),
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/blog/${post.slug}`,
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <Breadcrumb
          items={[{ label: 'Beranda', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]}
          className="mb-6"
        />
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            {category ? (
              <Link href={`/blog?category=${encodeURIComponent(category.id)}`} className="font-medium text-text-secondary hover:text-text-primary">
                {category.name}
              </Link>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {formatDate(post.publishedAt ?? post.createdAt)}
            </span>
            <span>{readingTimeMinutes(post.content)} mnt baca</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">{post.excerpt}</p>
          <p className="mt-4 text-sm text-text-secondary">
            Ditulis oleh <span className="font-medium text-text-primary">{post.author}</span>
          </p>
          {post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] text-text-muted">
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <Markdown content={post.content} />

        {related.length > 0 ? (
          <section aria-labelledby="artikel-terkait" className="mt-12 border-t border-border pt-8">
            <h2 id="artikel-terkait" className="text-lg font-semibold text-text-primary">
              Artikel terkait
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-text-muted"
                >
                  <p className="text-sm font-semibold text-text-primary">{relatedPost.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatDate(relatedPost.publishedAt ?? relatedPost.createdAt)} ·{' '}
                    {readingTimeMinutes(relatedPost.content)} mnt baca
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-10 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-text-primary">Butuh bantuan memilih konfigurasi?</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Gunakan Server Builder untuk melihat harga dan estimasi performa, atau konsultasikan kebutuhan Anda
            dengan tim kami sebelum memesan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/server-builder"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-text-secondary"
            >
              Buka Server Builder
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text-primary hover:bg-surface-muted"
            >
              Konsultasi
            </Link>
          </div>
        </div>
        <p className="mt-6 text-xs text-text-muted">
          <Badge variant="neutral">Catatan</Badge> Artikel ini bersifat informatif. Pembelian bersifat final
          sesuai kebijakan WangStore.
        </p>
      </div>
    </div>
  );
}
