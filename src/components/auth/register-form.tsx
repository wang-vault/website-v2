'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function RegisterForm() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ emailSent: boolean; devLink: string | null } | null>(null);

  const update = useCallback((field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    setApiError('');
    const nextErrors: Record<string, string> = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = 'Nama minimal 2 karakter.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Format email tidak valid.';
    if (form.password.length < 8) nextErrors.password = 'Kata sandi minimal 8 karakter.';
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      nextErrors.password = 'Kata sandi harus mengandung huruf dan angka.';
    }
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { emailSent: boolean; devVerificationLink: string | null } | null;
      };
      if (result.success && result.data) {
        setDone({ emailSent: result.data.emailSent, devLink: result.data.devVerificationLink });
        return;
      }
      setApiError(result.message || 'Gagal mendaftar.');
    } catch {
      setApiError('Tidak dapat menghubungi server. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  if (done) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Pendaftaran berhasil">
          <p>
            Akun Anda sudah dibuat. Tautan verifikasi telah {done.emailSent ? 'dikirim' : 'disiapkan untuk'} alamat
            email Anda — buka tautan tersebut untuk mengaktifkan akun sebelum masuk.
          </p>
        </Alert>
        {done.devLink ? (
          <Alert variant="info" title="Mode pengembangan">
            <p>
              Provider email saat ini adalah <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">console</code>,
              sehingga tautan verifikasi ditampilkan di sini:{' '}
              <a href={done.devLink} className="break-all font-medium underline underline-offset-2">
                {done.devLink}
              </a>
            </p>
          </Alert>
        ) : null}
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-contrast hover:bg-text-secondary"
        >
          Lanjut ke Halaman Masuk
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
      {apiError ? (
        <Alert variant="error" title="Pendaftaran gagal">
          <p>{apiError}</p>
        </Alert>
      ) : null}
      <Field label="Nama Lengkap" required error={errors.fullName}>
        <Input
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          invalid={Boolean(errors.fullName)}
          autoComplete="name"
          placeholder="Nama Anda"
        />
      </Field>
      <Field label="Email" required error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          invalid={Boolean(errors.email)}
          autoComplete="email"
          placeholder="nama@email.com"
        />
      </Field>
      <Field label="Kata Sandi" required error={errors.password} hint="Minimal 8 karakter, mengandung huruf dan angka.">
        <Input
          type="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          invalid={Boolean(errors.password)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>
      <Field label="Konfirmasi Kata Sandi" required error={errors.confirmPassword}>
        <Input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>
      <Button type="submit" className="w-full" loading={submitting}>
        Daftar
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-text-primary underline underline-offset-4">
          Masuk
        </Link>
      </p>
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-text-muted">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Dengan mendaftar, Anda menyetujui{' '}
        <Link href="/terms" className="underline underline-offset-2">
          Syarat &amp; Ketentuan
        </Link>{' '}
        dan{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          Kebijakan Privasi
        </Link>{' '}
        WangStore.
      </p>
    </form>
  );
}
