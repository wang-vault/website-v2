import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Kebijakan Penggunaan yang Dapat Diterima',
  description: 'Aturan penggunaan platform WangStore.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="acceptable-use" />;
}
