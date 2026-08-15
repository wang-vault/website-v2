import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2', className)} aria-label="WangStore — Beranda">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-contrast"
      >
        W
      </span>
      <span className="text-[1.05rem] font-semibold tracking-tight text-text-primary">WangStore</span>
    </Link>
  );
}
