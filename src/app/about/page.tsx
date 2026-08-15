import type { Metadata } from 'next';
import { CmsContentPage } from '@/components/layout/cms-page';

export const metadata: Metadata = {
  title: 'Tentang WangStore',
  description: 'Cerita, visi, misi, dan prinsip WangStore — platform penjualan dan pengelolaan layanan hosting.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CmsContentPage slug="about" />;
}
