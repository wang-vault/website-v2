import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Lupa Kata Sandi"
      description="Masukkan email Anda dan kami akan mengirim tautan untuk mengatur ulang kata sandi."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
