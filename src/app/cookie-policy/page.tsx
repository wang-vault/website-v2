import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Kebijakan Cookie',
  description: 'Cookie yang digunakan platform WangStore.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="cookie-policy" />;
}
