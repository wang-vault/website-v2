'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ email }),
      });
      // Respons selalu generik — tidak membocorkan keberadaan email.
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Periksa email Anda">
          <p>
            Jika alamat email tersebut terdaftar di WangStore, kami telah mengirim tautan untuk mengatur ulang
            kata sandi. Tautan berlaku 1 jam dan hanya sekali pakai.
          </p>
        </Alert>
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-contrast hover:bg-text-secondary"
        >
          Kembali ke Halaman Masuk
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      <Field label="Email" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="nama@email.com"
          required
        />
      </Field>
      <Button type="submit" className="w-full" loading={submitting}>
        Kirim Tautan Reset
      </Button>
    </form>
  );
}
