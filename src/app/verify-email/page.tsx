import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getDb } from '@/lib/db';
import { toIso } from '@/lib/utils';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Verifikasi Email',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let verified = false;
  let message = 'Tautan verifikasi tidak valid atau sudah digunakan.';

  if (token) {
    const db = await getDb();
    const target = await db.users.findByVerificationToken(token);
    if (target) {
      await db.users.update(target.id, {
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: toIso(),
      });
      verified = true;
      message = 'Email Anda berhasil diverifikasi.';
      await db.audit.log({
        actorId: target.id,
        actorEmail: target.email,
        action: 'email_verified',
        resource: 'user',
        resourceId: target.id,
        ipAddress: null,
        metadata: {},
      });
    }
  }

  return (
    <AuthCard
      title={verified ? 'Email Terverifikasi' : 'Verifikasi Gagal'}
      description="Verifikasi alamat email akun WangStore Anda."
    >
      {verified ? (
        <div className="space-y-4">
          <Alert variant="success" title="Berhasil">
            <p className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {message}
            </p>
          </Alert>
          <Link
            href="/login"
            className="block w-full rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-contrast hover:bg-text-secondary"
          >
            Masuk Sekarang
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert variant="error" title="Gagal">
            <p className="inline-flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {message}
            </p>
          </Alert>
          <p className="text-sm text-text-secondary">
            Ajukan ulang verifikasi dengan masuk dan meminta tautan baru, atau hubungi tim kami melalui{' '}
            <Link href="/contact" className="font-medium text-text-primary underline underline-offset-4">
              halaman Kontak
            </Link>
            .
          </p>
        </div>
      )}
    </AuthCard>
  );
}
