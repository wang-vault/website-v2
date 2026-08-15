import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button-link';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">Halaman tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
        Halaman yang Anda cari tidak tersedia atau telah dipindahkan. Periksa kembali alamat URL atau kembali
        ke beranda.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" variant="primary">
          Kembali ke Beranda
        </ButtonLink>
        <ButtonLink href="/contact" variant="outline">
          Hubungi Kami
        </ButtonLink>
      </div>
      <p className="mt-10 text-xs text-text-muted">
        Butuh bantuan? Buka{' '}
        <Link href="/knowledge-base" className="underline underline-offset-2 hover:text-text-primary">
          Knowledge Base
        </Link>
        .
      </p>
    </div>
  );
}
