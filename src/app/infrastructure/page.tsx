import type { Metadata } from 'next';
import { CmsContentPage } from '@/components/layout/cms-page';

export const metadata: Metadata = {
  title: 'Infrastruktur',
  description: 'Penjelasan jujur tentang batas platform WangStore dan infrastruktur hosting pelanggan.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CmsContentPage slug="infrastructure" />;
}
