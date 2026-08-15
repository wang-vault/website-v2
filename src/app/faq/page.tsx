import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { PageShell } from '@/components/layout/page-shell';
import { Markdown } from '@/components/markdown';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Pertanyaan yang sering diajukan seputar layanan, pemesanan, dan kebijakan WangStore.',
};

export default async function FaqPage() {
  const db = await getDb();
  const items = await db.faq.list({ activeOnly: true });

  const categories = [...new Set(items.map((item) => item.category))];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageShell
        eyebrow="Bantuan"
        title="Pertanyaan yang Sering Diajukan"
        description="Jawaban atas pertanyaan umum seputar layanan, pemesanan, pembayaran, dan kebijakan WangStore."
        breadcrumb={[{ label: 'Beranda', href: '/' }, { label: 'FAQ' }]}
      >
        {categories.map((category) => (
          <section key={category} className="mb-10" aria-labelledby={`faq-${category.toLowerCase().replace(/\s+/g, '-')}`}>
            <h2
              id={`faq-${category.toLowerCase().replace(/\s+/g, '-')}`}
              className="mb-4 border-b border-border pb-2 text-lg font-semibold text-text-primary"
            >
              {category}
            </h2>
            <div className="space-y-4">
              {items
                .filter((item) => item.category === category)
                .map((item) => (
                  <details key={item.id} className="group rounded-lg border border-border bg-surface">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-5 py-4 text-sm font-medium text-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <span aria-hidden="true" className="text-text-muted transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="border-t border-border px-5 py-4">
                      <Markdown content={item.answer} />
                    </div>
                  </details>
                ))}
            </div>
          </section>
        ))}
        <p className="mt-10 text-sm text-text-secondary">
          Tidak menemukan jawaban?{' '}
          <Link href="/contact" className="font-medium text-text-primary underline underline-offset-4">
            Hubungi kami
          </Link>{' '}
          atau buat tiket dari{' '}
          <Link href="/dashboard/tickets" className="font-medium text-text-primary underline underline-offset-4">
            dashboard pelanggan
          </Link>
          .
        </p>
      </PageShell>
    </div>
  );
}
