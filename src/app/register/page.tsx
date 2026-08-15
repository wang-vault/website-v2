import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Daftar',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const sessionContext = await getSession();
  if (sessionContext) redirect('/dashboard');
  return (
    <AuthCard
      title="Buat Akun WangStore"
      description="Akun digunakan untuk riwayat pesanan, konfigurasi tersimpan, tiket, notifikasi, dan profil."
      footer="Sudah punya akun?"
    >
      <RegisterForm />
    </AuthCard>
  );
}
