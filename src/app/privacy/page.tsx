import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description: 'Kebijakan Privasi WangStore — data yang kami kumpulkan dan cara kami melindunginya.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="privacy" />;
}
