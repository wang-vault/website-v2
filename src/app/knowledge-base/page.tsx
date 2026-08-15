import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, FileText } from 'lucide-react';
import { getDb } from '@/lib/db';
import { formatDate, readingTimeMinutes } from '@/lib/utils';
import { PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/ui/state';
import { BlogSearch } from '@/components/blog-search';
import { KB_CATEGORIES } from '@/types';

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'Panduan dan dokumentasi resmi WangStore: memulai, pemesanan, pembayaran, Minecraft, server, dan lainnya.',
};

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const category = params.category ?? '';

  const db = await getDb();
  const articles = query
    ? await db.knowledgeBase.search(query)
    : await db.knowledgeBase.listPublished();

  const filtered = category ? articles.filter((a) => a.category === category) : articles;

  const grouped = new Map<string, typeof filtered>();
  for (const article of filtered) {
    const list = grouped.get(article.category) ?? [];
    list.push(article);
    grouped.set(article.category, list);
  }

  return (
    <div className="container-page py-10">
      <PageShell
        eyebrow="Dokumentasi"
        title="Knowledge Base"
        description="Panduan resmi WangStore — dari cara memesan hingga pengelolaan akun. Semua artikel ditulis oleh tim kami."
        breadcrumb={[{ label: 'Beranda', href: '/' }, { label: 'Knowledge Base' }]}
      >
        <div className="mb-6">
          <BlogSearch placeholder="Cari artikel, kategori, kata kunci…" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
          <Link
            href="/knowledge-base"
            className={
              !category
                ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast'
                : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary'
            }
          >
            Semua
          </Link>
          {KB_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/knowledge-base?category=${encodeURIComponent(cat)}`}
              className={
                category === cat
                  ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast'
                  : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary'
              }
            >
              {cat}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={query ? 'Tidak ada hasil untuk pencarian ini' : 'Belum ada artikel'}
            description={query ? `Tidak ditemukan artikel yang cocok dengan "${query}".` : 'Artikel baru akan muncul di sini.'}
          />
        ) : (
          <div className="space-y-8">
            {[...grouped.entries()].map(([cat, list]) => (
              <section key={cat} aria-labelledby={`kb-${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                <h2
                  id={`kb-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-base font-semibold text-text-primary"
                >
                  <BookOpen className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  {cat}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {list.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/knowledge-base/${article.slug}`}
                        className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-text-muted"
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">{article.title}</p>
                          <p className="mt-1 text-xs text-text-muted">
                            {formatDate(article.publishedAt ?? article.createdAt)} · {readingTimeMinutes(article.content)} mnt baca
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PageShell>
    </div>
  );
}
