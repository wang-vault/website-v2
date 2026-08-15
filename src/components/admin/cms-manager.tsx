'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import type { CmsResourceName } from '@/lib/cms';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export type FieldType = 'text' | 'textarea' | 'markdown' | 'select' | 'number' | 'checkbox' | 'datetime' | 'tags' | 'string-list';

export interface CmsFieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface CmsColumnDef {
  key: string;
  header: string;
}

export interface CmsManagerConfig {
  resource: CmsResourceName;
  emptyTitle: string;
  emptyDescription: string;
  columns: CmsColumnDef[];
  fields: CmsFieldDef[];
  deletable: boolean;
  /** Field yang menjadi judul baris tabel. */
  titleField: string;
  /** Opsi select yang diambil dari resource CMS lain (mis. kategori blog). */
  selectSources?: Record<string, { resource: CmsResourceName; valueField: string; labelField: string }>;
}

export type CmsRecord = Record<string, unknown> & { id: string };

const LIST_LABELS: Record<string, Record<string, string>> = {
  blog: {
    draft: 'Draft',
    published: 'Terbit',
  },
  knowledgeBase: {
    draft: 'Draft',
    published: 'Terbit',
  },
};

export function CmsManager({ config }: { config: CmsManagerConfig }) {
  const { toast } = useToast();
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [selectOptions, setSelectOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/cms/${config.resource}`, { cache: 'no-store' });
      const result = (await response.json()) as { success: boolean; data?: CmsRecord[] };
      if (result.success && result.data) setItems(result.data);

      // Muat opsi select dari resource lain bila dikonfigurasi.
      if (config.selectSources) {
        const nextOptions: Record<string, { value: string; label: string }[]> = {};
        await Promise.all(
          Object.entries(config.selectSources).map(async ([fieldName, source]) => {
            const sourceResponse = await fetch(`/api/admin/cms/${source.resource}`, { cache: 'no-store' });
            const sourceResult = (await sourceResponse.json()) as { success: boolean; data?: CmsRecord[] };
            if (sourceResult.success && sourceResult.data) {
              nextOptions[fieldName] = sourceResult.data.map((entry) => ({
                value: String(entry[source.valueField] ?? ''),
                label: String(entry[source.labelField] ?? ''),
              }));
            }
          }),
        );
        setSelectOptions(nextOptions);
      }
    } catch {
      toast({ variant: 'error', title: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  }, [config.resource, config.selectSources, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialForm = useCallback(
    (record?: CmsRecord): Record<string, unknown> => {
      const next: Record<string, unknown> = {};
      for (const field of config.fields) {
        const raw = record ? record[field.name] : undefined;
        if (field.type === 'tags' || field.type === 'string-list') {
          const list = Array.isArray(raw) ? (raw as string[]) : [];
          next[field.name] = list.join(', ');
        } else if (field.type === 'checkbox') {
          next[field.name] = typeof raw === 'boolean' ? raw : field.defaultValue === 'true';
        } else if (field.type === 'number') {
          next[field.name] = raw !== undefined && raw !== null ? String(raw) : field.defaultValue ?? '';
        } else {
          next[field.name] = raw !== undefined && raw !== null ? String(raw) : field.defaultValue ?? '';
        }
      }
      return next;
    },
    [config.fields],
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(initialForm());
    setModalOpen(true);
  }, [initialForm]);

  const openEdit = useCallback(
    (record: CmsRecord) => {
      setEditingId(record.id);
      setForm(initialForm(record));
      setModalOpen(true);
    },
    [initialForm],
  );

  const buildPayload = useCallback((): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = form[field.name];
      if (field.type === 'tags' || field.type === 'string-list') {
        payload[field.name] = String(raw ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      } else if (field.type === 'checkbox') {
        payload[field.name] = raw === true;
      } else if (field.type === 'number') {
        payload[field.name] = Number(raw) || 0;
      } else if (field.type === 'datetime') {
        payload[field.name] = raw ? new Date(String(raw)).toISOString() : null;
      } else if (field.type === 'select' && (field.name === 'categoryId' || field.name === 'publishedAt')) {
        payload[field.name] = raw ? String(raw) : null;
      } else {
        payload[field.name] = String(raw ?? '');
      }
    }
    // Tanggal terbit otomatis saat artikel dipublikasikan.
    if (payload.status === 'published') {
      const current = items.find((item) => item.id === editingId);
      payload.publishedAt = current?.publishedAt ?? new Date().toISOString();
    }
    return payload;
  }, [config.fields, form, items, editingId]);

  const save = useCallback(async () => {
    // Validasi required sederhana.
    for (const field of config.fields) {
      if (field.required) {
        const raw = form[field.name];
        if (raw === undefined || raw === null || String(raw).trim() === '') {
          toast({ variant: 'error', title: 'Field wajib kosong', message: field.label });
          return;
        }
      }
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const url = editingId
        ? `/api/admin/cms/${config.resource}/${editingId}`
        : `/api/admin/cms/${config.resource}`;
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Tersimpan' });
        setModalOpen(false);
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [buildPayload, config, editingId, form, load, toast]);

  const remove = useCallback(
    async (record: CmsRecord) => {
      if (!window.confirm('Hapus data ini? Tindakan dicatat di Audit Log.')) return;
      try {
        const response = await fetch(`/api/admin/cms/${config.resource}/${record.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        if (response.ok) {
          toast({ variant: 'success', title: 'Dihapus' });
          await load();
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [config.resource, load, toast],
  );

  const statusLabel = useCallback(
    (record: CmsRecord): string => {
      const status = record.status;
      if (typeof status !== 'string') return '';
      return LIST_LABELS[config.resource]?.[status] ?? status;
    },
    [config.resource],
  );

  const formTabs = useMemo(() => {
    const markdownFields = config.fields.filter((f) => f.type === 'markdown');
    if (markdownFields.length === 0) return null;
    const renderWithOptions = (field: CmsFieldDef): React.ReactNode =>
      renderField(field, form, setForm, selectOptions[field.name]);
    const editor = (
      <div className="space-y-4">{config.fields.map((field) => renderWithOptions(field))}</div>
    );
    const preview = (
      <div className="prose-ws">
        {markdownFields.map((field) => (
          <div key={field.name}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{field.label}</p>
            <ReactMarkdown>{String(form[field.name] ?? '')}</ReactMarkdown>
          </div>
        ))}
      </div>
    );
    return (
      <Tabs
        items={[
          { key: 'edit', label: 'Tulis', content: editor },
          { key: 'preview', label: 'Pratinjau', content: preview },
        ]}
      />
    );
  }, [config.fields, form, selectOptions]);

  const plainForm = (
    <div className="space-y-4">
      {config.fields.map((field) => renderField(field, form, setForm, selectOptions[field.name]))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Memuat data…" />
      ) : items.length === 0 ? (
        <EmptyState title={config.emptyTitle} description={config.emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                {config.columns.map((column) => (
                  <th key={column.key} scope="col" className="px-4 py-2.5 font-medium text-text-secondary">
                    {column.header}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-b-0">
                  {config.columns.map((column) => (
                    <td key={column.key} className="max-w-[280px] px-4 py-3 align-top">
                      <CellRenderer column={column} record={record} statusLabel={statusLabel} />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(record)}>
                        Edit
                      </Button>
                      {config.deletable ? (
                        <button
                          type="button"
                          onClick={() => void remove(record)}
                          aria-label="Hapus data"
                          className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Data' : 'Tambah Data'}
        description="Perubahan langsung tersimpan dan dicatat di Audit Log."
        className="max-w-2xl"
      >
        {formTabs ?? plainForm}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Simpan
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CellRenderer({
  column,
  record,
  statusLabel,
}: {
  column: CmsColumnDef;
  record: CmsRecord;
  statusLabel: (record: CmsRecord) => string;
}) {
  const value = record[column.key];
  if (column.key === 'status' && typeof value === 'string') {
    return (
      <Badge variant={value === 'published' || value === 'active' || value === 'resolved' || value === 'completed' ? 'success' : value === 'draft' || value === 'scheduled' ? 'warning' : 'neutral'}>
        {statusLabel(record) || String(value)}
      </Badge>
    );
  }
  if (Array.isArray(value)) {
    return <span className="block truncate text-xs text-text-secondary">{value.join(', ') || '—'}</span>;
  }
  if (value === null || value === undefined || value === '') {
    return <span className="text-xs text-text-muted">—</span>;
  }
  if (column.key === 'publishedAt' || column.key === 'updatedAt' || column.key === 'createdAt') {
    return <span className="text-xs text-text-secondary">{formatDate(String(value))}</span>;
  }
  if (column.key === 'slug' || column.key === 'id') {
    return <span className="font-mono text-xs text-text-primary">{String(value)}</span>;
  }
  return <span className="block truncate text-xs text-text-primary">{String(value)}</span>;
}

function renderField(
  field: CmsFieldDef,
  form: Record<string, unknown>,
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
  externalOptions?: { value: string; label: string }[],
) {
  const value = form[field.name];
  const set = (next: unknown) => setForm((current) => ({ ...current, [field.name]: next }));
  const key = field.name;

  switch (field.type) {
    case 'textarea':
      return (
        <Field key={key} label={field.label} hint={field.hint} required={field.required}>
          <Textarea
            value={String(value ?? '')}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        </Field>
      );
    case 'markdown':
      return (
        <Field key={key} label={field.label} hint={field.hint ?? 'Mendukung format Markdown.'} required={field.required}>
          <Textarea
            value={String(value ?? '')}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder}
            rows={12}
            className="font-mono text-xs"
          />
        </Field>
      );
    case 'select':
      return (
        <Field key={key} label={field.label} hint={field.hint} required={field.required}>
          <Select
            value={String(value ?? '')}
            onChange={(e) => set(e.target.value)}
            options={externalOptions && externalOptions.length > 0 ? externalOptions : field.options ?? []}
          />
        </Field>
      );
    case 'number':
      return (
        <Field key={key} label={field.label} hint={field.hint} required={field.required}>
          <Input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => set(e.target.value)}
            inputMode="numeric"
          />
        </Field>
      );
    case 'checkbox':
      return (
        <div key={key}>
          <Checkbox checked={value === true} onChange={(e) => set(e.target.checked)} label={field.label} />
          {field.hint ? <p className="mt-1 text-xs text-text-muted">{field.hint}</p> : null}
        </div>
      );
    case 'datetime':
      return (
        <Field key={key} label={field.label} hint={field.hint}>
          <Input
            type="datetime-local"
            value={value ? String(value).slice(0, 16) : ''}
            onChange={(e) => set(e.target.value)}
          />
        </Field>
      );
    case 'tags':
    case 'string-list':
      return (
        <Field key={key} label={field.label} hint={field.hint ?? 'Pisahkan dengan koma.'} required={field.required}>
          <Input
            value={String(value ?? '')}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder}
          />
        </Field>
      );
    default:
      return (
        <Field key={key} label={field.label} hint={field.hint} required={field.required}>
          <Input
            value={String(value ?? '')}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder}
          />
        </Field>
      );
  }
}
