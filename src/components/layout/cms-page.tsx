import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { MarkdownPage } from './page-shell';

const PAGE_META: Record<string, { eyebrow: string; title: string; description: string }> = {
  about: {
    eyebrow: 'Perusahaan',
    title: 'Tentang WangStore',
    description: 'Cerita, visi, misi, dan prinsip platform WangStore.',
  },
  features: {
    eyebrow: 'Platform',
    title: 'Fitur WangStore',
    description: 'Semua fitur platform: Server Builder, harga transparan, order management, dan lainnya.',
  },
  'why-wangstore': {
    eyebrow: 'Platform',
    title: 'Mengapa WangStore?',
    description: 'Alasan memilih WangStore: kejujuran, transparansi harga, dan pengalaman pemesanan yang jelas.',
  },
  infrastructure: {
    eyebrow: 'Teknis',
    title: 'Infrastruktur',
    description: 'Penjelasan jujur tentang batas platform WangStore dan infrastruktur hosting pelanggan.',
  },
};

/** Halaman konten CMS (dapat diedit dari admin tanpa menyentuh kode). */
export async function CmsContentPage({ slug }: { slug: string }) {
  const meta = PAGE_META[slug];
  const db = await getDb();
  const page = await db.cmsPages.get(slug);
  if (!page) notFound();
  return (
    <MarkdownPage
      eyebrow={meta?.eyebrow}
      title={meta?.title ?? page.title}
      breadcrumb={[{ label: 'Beranda', href: '/' }, { label: meta?.title ?? page.title }]}
      content={page.content}
      updatedAt={page.updatedAt}
    />
  );
}
