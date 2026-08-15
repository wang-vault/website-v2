'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Pencarian blog dengan debounce — query disinkronkan ke URL (?q=)
 * sehingga daftar dirender ulang oleh Server Component.
 */
export function BlogSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get('q') ?? '');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    setValue(current);
  }, [searchParams]);

  const onChange = (next: string): void => {
    setValue(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) params.set('q', next.trim());
      else params.delete('q');
      params.delete('page');
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    }, 350);
  };

  return (
    <div className="relative max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Cari artikel"
        className="pl-9"
      />
    </div>
  );
}
