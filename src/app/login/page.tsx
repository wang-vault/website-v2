import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Masuk',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const sessionContext = await getSession();
  if (sessionContext) redirect('/dashboard');
  return (
    <AuthCard
      title="Masuk ke WangStore"
      description="Akses dashboard pelanggan, riwayat pesanan, tiket, dan konfigurasi tersimpan Anda."
      footer="Butuh bantuan?"
    >
      <LoginForm />
    </AuthCard>
  );
}
