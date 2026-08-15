import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/legal-page';

export const metadata: Metadata = {
  title: 'Service Level Agreement (SLA)',
  description: 'Target uptime 99,9%, kredit layanan, dan target waktu respons dukungan WangStore.',
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="sla" />;
}
