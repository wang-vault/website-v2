'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback((field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    setError('');
    if (form.password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Kata sandi harus mengandung huruf dan angka.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ token, password: form.password }),
      });
      const result = (await response.json()) as { success: boolean; message: string };
      if (result.success) {
        setDone(true);
        toast({ variant: 'success', title: 'Kata sandi berhasil diubah' });
      } else {
        setError(result.message || 'Gagal mengatur ulang kata sandi.');
      }
    } catch {
      setError('Tidak dapat menghubungi server. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }, [form, token, toast]);

  if (done) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Kata sandi berhasil diubah">
          <p>Sesi lama Anda telah dibatalkan. Silakan masuk dengan kata sandi baru.</p>
        </Alert>
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-contrast hover:bg-text-secondary"
        >
          Masuk Sekarang
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
      {error ? (
        <Alert variant="error" title="Tidak dapat memproses">
          <p>{error}</p>
        </Alert>
      ) : null}
      <Field label="Kata Sandi Baru" required hint="Minimal 8 karakter, mengandung huruf dan angka.">
        <Input
          type="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>
      <Field label="Konfirmasi Kata Sandi Baru" required>
        <Input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>
      <Button type="submit" className="w-full" loading={submitting}>
        Simpan Kata Sandi Baru
      </Button>
    </form>
  );
}
