'use client';

import { useCallback, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback((field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    setError('');
    if (form.newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (!/[a-zA-Z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
      setError('Kata sandi baru harus mengandung huruf dan angka.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const result = (await response.json()) as { success: boolean; message: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Kata sandi berhasil diubah', message: 'Sesi lain Anda telah dibatalkan.' });
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(result.message);
      }
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setSubmitting(false);
    }
  }, [form, toast]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      {error ? <p role="alert" className="text-xs font-medium text-error">{error}</p> : null}
      <Field label="Kata Sandi Saat Ini" required>
        <Input
          type="password"
          value={form.currentPassword}
          onChange={(e) => update('currentPassword', e.target.value)}
          autoComplete="current-password"
        />
      </Field>
      <Field label="Kata Sandi Baru" required hint="Minimal 8 karakter, mengandung huruf dan angka.">
        <Input
          type="password"
          value={form.newPassword}
          onChange={(e) => update('newPassword', e.target.value)}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Konfirmasi Kata Sandi Baru" required>
        <Input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          autoComplete="new-password"
        />
      </Field>
      <Button type="submit" loading={submitting}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Ubah Kata Sandi
      </Button>
    </form>
  );
}
