import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Atur Ulang Kata Sandi',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token || token.length < 16) {
    return (
      <AuthCard title="Tautan Tidak Valid">
        <Alert variant="error" title="Tautan reset tidak valid">
          <p>Pastikan Anda membuka tautan lengkap dari email reset kata sandi.</p>
        </Alert>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Atur Ulang Kata Sandi"
      description="Buat kata sandi baru untuk akun Anda. Tautan ini berlaku 1 jam dan hanya sekali pakai."
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
