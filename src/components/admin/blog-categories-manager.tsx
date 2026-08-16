'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import type { CmsRecord } from './cms-manager';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

/** Mode baca-saja aktif untuk peran tanpa izin content.manage (mis. Staff). */
export function BlogCategoriesManager({ readOnly = false }: { readOnly?: boolean }) {
  const { toast } = useToast();
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cms/blogCategories', { cache: 'no-store' });
      const result = (await response.json()) as { success: boolean; data?: CmsRecord[] };
      if (result.success && result.data) setItems(result.data);
    } catch {
      toast({ variant: 'error', title: 'Gagal memuat kategori' });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/cms/blogCategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Kategori disimpan' });
        setModalOpen(false);
        setForm({ slug: '', name: '', description: '' });
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [form, load, readOnly, toast]);

  const remove = useCallback(
    async (id: string) => {
      if (readOnly) return;
      if (!window.confirm('Hapus kategori ini?')) return;
      try {
        await fetch(`/api/admin/cms/blogCategories/${id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        toast({ variant: 'success', title: 'Kategori dihapus' });
        await load();
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, readOnly, toast],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Kategori Blog</h3>
        {readOnly ? null : (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Kategori
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{String(item.name ?? '')}</p>
              <p className="font-mono text-xs text-text-muted">{String(item.slug ?? '')}</p>
            </div>
            {readOnly ? null : (
              <button
                type="button"
                onClick={() => void remove(item.id)}
                aria-label="Hapus kategori"
                className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-6 text-center text-sm text-text-muted">Belum ada kategori.</li> : null}
      </ul>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Kategori Blog">
        <div className="space-y-4">
          <Field label="Nama" required>
            <Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </Field>
          <Field label="Slug" required hint="Huruf kecil dan strip, contoh: panduan">
            <Input value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value.toLowerCase() }))} className="font-mono" />
          </Field>
          <Field label="Deskripsi">
            <Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
