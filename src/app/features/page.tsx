import type { Metadata } from 'next';
import { CmsContentPage } from '@/components/layout/cms-page';

export const metadata: Metadata = {
  title: 'Fitur',
  description: 'Fitur platform WangStore: Server Builder, harga transparan, dashboard pelanggan, tiket, dan lainnya.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CmsContentPage slug="features" />;
}
