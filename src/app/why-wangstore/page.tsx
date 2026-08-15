import type { Metadata } from 'next';
import { CmsContentPage } from '@/components/layout/cms-page';

export const metadata: Metadata = {
  title: 'Mengapa WangStore',
  description: 'Alasan memilih WangStore: kejujuran, transparansi harga, dan pengalaman pemesanan yang jelas.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CmsContentPage slug="why-wangstore" />;
}
