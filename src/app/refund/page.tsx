import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Kebijakan Refund',
  description: 'Semua pembelian di WangStore bersifat final. Pelajari kondisi kompensasi dan proses klaim.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="refund" />;
}
