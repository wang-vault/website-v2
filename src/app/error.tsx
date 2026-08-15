'use client';

import { useEffect } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { ErrorState } from '@/components/ui/state';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[wangstore] page error:', error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">500</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">Terjadi kesalahan</h1>
      <div className="mt-6 w-full max-w-md">
        <ErrorState
          title="Kami tidak dapat memuat halaman ini"
          description="Coba muat ulang halaman. Jika masalah berlanjut, hubungi tim kami melalui halaman Kontak."
        />
      </div>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" variant="outline">
          Kembali ke Beranda
        </ButtonLink>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-text-secondary"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
