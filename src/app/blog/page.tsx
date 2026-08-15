import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Tag } from 'lucide-react';
import { getDb } from '@/lib/db';
import { formatDate, readingTimeMinutes, truncate } from '@/lib/utils';
import { PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/ui/state';
import { BlogSearch } from '@/components/blog-search';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Artikel dan panduan seputar hosting, server Minecraft, dan platform WangStore.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const category = params.category ?? '';

  const db = await getDb();
  const [categories, posts] = await Promise.all([
    db.blog.categories(),
    query ? db.blog.search(query) : db.blog.listPublished(),
  ]);

  const filtered = category
    ? posts.filter((post) => post.categoryId === category)
    : posts;

  return (
    <div className="container-page py-10">
      <PageShell
        eyebrow="Blog"
        title="Blog WangStore"
        description="Artikel dan panduan yang ditulis oleh tim WangStore — tentang hosting, server Minecraft, dan cara memanfaatkan platform kami."
        breadcrumb={[{ label: 'Beranda', href: '/' }, { label: 'Blog' }]}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <BlogSearch placeholder="Cari judul, isi, tag, kategori…" />
        </div>

        {categories.length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
            <Link
              href="/blog"
              className={
                !category
                  ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast'
                  : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary'
              }
            >
              Semua
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog?category=${encodeURIComponent(cat.id)}`}
                className={
                  category === cat.id
                    ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast'
                    : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary'
                }
              >
                {cat.name}
              </Link>
            ))}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            title={query ? 'Tidak ada hasil untuk pencarian ini' : 'Belum ada artikel'}
            description={
              query
                ? `Tidak ditemukan artikel yang cocok dengan "${query}". Coba kata kunci lain.`
                : 'Artikel baru akan muncul di sini.'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((post) => {
              const cat = categories.find((c) => c.id === post.categoryId);
              return (
                <article key={post.id} className="flex flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-text-muted">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {cat ? <span className="font-medium text-text-secondary">{cat.name}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" />
                      {formatDate(post.publishedAt ?? post.createdAt)}
                    </span>
                    <span>{readingTimeMinutes(post.content)} mnt baca</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold leading-snug text-text-primary">
                    <Link href={`/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                    {truncate(post.excerpt, 160)}
                  </p>
                  {post.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
                          <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}
