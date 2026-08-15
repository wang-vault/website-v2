import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { MarkdownPage } from './page-shell';

const LEGAL_META: Record<string, { eyebrow: string; title: string }> = {
  terms: { eyebrow: 'Ketentuan', title: 'Syarat & Ketentuan' },
  privacy: { eyebrow: 'Ketentuan', title: 'Kebijakan Privasi' },
  refund: { eyebrow: 'Ketentuan', title: 'Kebijakan Refund' },
  sla: { eyebrow: 'Ketentuan', title: 'Service Level Agreement (SLA)' },
  'acceptable-use': { eyebrow: 'Ketentuan', title: 'Kebijakan Penggunaan yang Dapat Diterima' },
  'cookie-policy': { eyebrow: 'Ketentuan', title: 'Kebijakan Cookie' },
};

/** Halaman legal dibaca dari database (bisa diedit dari admin tanpa menyentuh kode). */
export async function LegalPage({ slug }: { slug: string }) {
  const meta = LEGAL_META[slug];
  const db = await getDb();
  const doc = await db.legal.get(slug);
  if (!doc) notFound();
  return (
    <MarkdownPage
      eyebrow={meta?.eyebrow ?? 'Ketentuan'}
      title={meta?.title ?? doc.title}
      breadcrumb={[{ label: 'Beranda', href: '/' }, { label: meta?.title ?? doc.title }]}
      content={doc.content}
      updatedAt={doc.updatedAt}
    />
  );
}
