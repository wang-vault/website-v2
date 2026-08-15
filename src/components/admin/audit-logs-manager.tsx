'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Pagination } from '@/components/ui/table';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import type { AuditLogRecord } from '@/types';

const RESOURCE_OPTIONS = [
  { value: '', label: 'Semua resource' },
  { value: 'order', label: 'order' },
  { value: 'user', label: 'user' },
  { value: 'coupon', label: 'coupon' },
  { value: 'pricing', label: 'pricing' },
  { value: 'ticket', label: 'ticket' },
  { value: 'settings', label: 'settings' },
  { value: 'product', label: 'product' },
  { value: 'package', label: 'package' },
  { value: 'blog', label: 'blog' },
  { value: 'knowledgeBase', label: 'knowledgeBase' },
  { value: 'faq', label: 'faq' },
  { value: 'testimonials', label: 'testimonials' },
  { value: 'pages', label: 'pages' },
  { value: 'legal', label: 'legal' },
  { value: 'announcements', label: 'announcements' },
  { value: 'incidents', label: 'incidents' },
  { value: 'maintenanceWindows', label: 'maintenanceWindows' },
];

const PAGE_SIZE = 25;

export function AuditLogsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);

  const load = useCallback(
    async (targetPage: number, targetResource: string, targetQuery: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
        if (targetResource) params.set('resource', targetResource);
        if (targetQuery) params.set('q', targetQuery);
        const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, { cache: 'no-store' });
        const result = (await response.json()) as {
          success: boolean;
          data?: { items: AuditLogRecord[]; total: number };
        };
        if (result.success && result.data) {
          setItems(result.data.items);
          setTotal(result.data.total);
        }
      } catch {
        toast({ variant: 'error', title: 'Gagal memuat audit log' });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(page, resource, debouncedQuery);
  }, [load, page, resource, debouncedQuery]);

  const onQueryChange = (value: string): void => {
    setQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(value);
      setPage(1);
    }, 350);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari email, aksi, resource id…"
            aria-label="Cari audit log"
            className="pl-9"
          />
        </div>
        <Select
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            setPage(1);
          }}
          options={RESOURCE_OPTIONS}
          aria-label="Filter resource"
          className="w-auto min-w-[180px]"
        />
      </div>

      {loading ? (
        <LoadingState label="Memuat audit log…" />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada entri audit" description="Tindakan akan tercatat di sini secara otomatis." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Waktu</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aktor</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Resource</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">IP</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Detail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-primary">{entry.actorEmail}</td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral">{entry.action}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-text-primary">{entry.resource}</p>
                    {entry.resourceId ? <p className="font-mono text-xs text-text-muted">{entry.resourceId}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{entry.ipAddress ?? '—'}</td>
                  <td className="max-w-[240px] px-4 py-3">
                    <p className="truncate font-mono text-[11px] text-text-muted" title={JSON.stringify(entry.metadata)}>
                      {JSON.stringify(entry.metadata)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
