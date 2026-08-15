import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">{title}</h1>
          {description ? <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? (
          <p className="mt-4 text-center text-sm text-text-secondary">
            {footer}{' '}
            <Link href="/" className="font-medium text-text-primary underline underline-offset-4">
              Kembali ke beranda
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
