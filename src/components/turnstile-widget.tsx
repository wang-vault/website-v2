'use client';

import { useEffect, useRef } from 'react';

/**
 * Widget Cloudflare Turnstile (hanya dirender jika site key dikonfigurasi).
 * Token dibaca saat submit oleh komponen yang membutuhkannya.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; theme: 'light' | 'dark' | 'auto' }) => string;
      getResponse: (widgetId?: string) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current || loadedRef.current) return;
    if (window.turnstile) {
      window.turnstile.render(containerRef.current, { sitekey: siteKey, theme: 'auto' });
      loadedRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (containerRef.current) {
        window.turnstile?.render(containerRef.current, { sitekey: siteKey, theme: 'auto' });
        loadedRef.current = true;
      }
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} aria-hidden="true" />;
}
