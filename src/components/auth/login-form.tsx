'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback((field: 'email' | 'password' | 'remember', value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { success: boolean; message: string; code?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Berhasil masuk' });
        const next = searchParams.get('next');
        router.replace(next && next.startsWith('/') ? next : '/dashboard');
        router.refresh();
        return;
      }
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        setError('Email Anda belum diverifikasi. Periksa kotak masuk Anda untuk tautan verifikasi.');
        return;
      }
      setError(result.message || 'Gagal masuk.');
    } catch {
      setError('Tidak dapat menghubungi server. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }, [form, router, searchParams, toast]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      {error ? (
        <Alert variant="error" title="Gagal masuk">
          <p>{error}</p>
        </Alert>
      ) : null}
      <Field label="Email" required>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          autoComplete="email"
          placeholder="nama@email.com"
          required
        />
      </Field>
      <Field label="Kata Sandi" required>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>
      <div className="flex items-center justify-between gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(e) => update('remember', e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Ingat saya
        </label>
        <Link href="/forgot-password" className="text-sm font-medium text-text-primary underline underline-offset-4">
          Lupa kata sandi?
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={submitting}>
        Masuk
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Belum punya akun?{' '}
        <Link href="/register" className="font-medium text-text-primary underline underline-offset-4">
          Daftar
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
