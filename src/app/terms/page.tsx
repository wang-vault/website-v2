import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat & Ketentuan penggunaan platform WangStore.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="terms" />;
}
