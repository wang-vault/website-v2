'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Pagination } from '@/components/ui/table';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ROLE_LABELS } from '@/types';
import type { Role } from '@/types';

interface CustomerRow {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  fullName: string;
}

interface CustomersResponse {
  success: boolean;
  data?: { items: CustomerRow[]; total: number; page: number; pageSize: number };
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

const PAGE_SIZE = 25;
const ROLES: Role[] = ['customer', 'staff', 'admin', 'owner'];
/** Role yang dapat ditetapkan lewat panel — owner dibuat lewat npm run db:seed. */
const ASSIGNABLE_ROLES: Role[] = ['customer', 'staff', 'admin'];

export interface CustomersManagerProps {
  /** Izin customers.update — Admin ke atas. */
  canUpdate: boolean;
  /** Izin roles.manage — Owner saja. */
  canManageRoles: boolean;
}

export function CustomersManager({ canUpdate, canManageRoles }: CustomersManagerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Role>('customer');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const load = useCallback(
    async (targetPage: number, targetRole: string, targetQuery: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
        if (targetRole) params.set('role', targetRole);
        if (targetQuery) params.set('q', targetQuery);
        const response = await fetch(`/api/admin/customers?${params.toString()}`, { cache: 'no-store' });
        const result = (await response.json()) as CustomersResponse;
        if (result.success && result.data) {
          setItems(result.data.items);
          setTotal(result.data.total);
        }
      } catch {
        toast({ variant: 'error', title: 'Gagal memuat pelanggan' });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(page, roleFilter, debouncedQuery);
  }, [load, page, roleFilter, debouncedQuery]);

  const onQueryChange = (value: string): void => {
    setQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(value);
      setPage(1);
    }, 350);
  };

  const changeRole = useCallback(
    async (customer: CustomerRow, next: Role) => {
      if (!canManageRoles) return;
      setSaving(true);
      try {
        const response = await fetch(`/api/admin/customers/${customer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
          body: JSON.stringify({ role: next }),
        });
        const result = (await response.json()) as { success: boolean; message?: string };
        if (result.success) {
          toast({ variant: 'success', title: `Role ${customer.email} → ${ROLE_LABELS[next]}` });
          setEditingId(null);
          await load(page, roleFilter, debouncedQuery);
        } else {
          toast({ variant: 'error', title: 'Gagal mengubah role', message: result.message });
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      } finally {
        setSaving(false);
      }
    },
    [canManageRoles, load, page, roleFilter, debouncedQuery, toast],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari email…"
            aria-label="Cari pelanggan"
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Semua role' },
            ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
          ]}
          aria-label="Filter role"
          className="w-auto min-w-[140px]"
        />
      </div>

      {loading ? (
        <LoadingState label="Memuat pelanggan…" />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada pelanggan" description="Pengguna terdaftar akan muncul di sini." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Pelanggan</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Role</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Verifikasi</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Terdaftar</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Login Terakhir</th>
                {canManageRoles ? (
                  <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-text-primary">{customer.fullName || '—'}</p>
                    <p className="text-xs text-text-muted">{customer.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={customer.role === 'owner' ? 'accent' : 'neutral'}>{ROLE_LABELS[customer.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={customer.emailVerified ? 'success' : 'warning'}>
                      {customer.emailVerified ? 'Terverifikasi' : 'Belum'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{formatDate(customer.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{formatDateTime(customer.lastLoginAt)}</td>
                  {canManageRoles ? (
                    <td className="px-4 py-3">
                      {editingId === customer.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={pendingRole}
                            onChange={(e) => setPendingRole(e.target.value as Role)}
                            options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                            aria-label={`Role untuk ${customer.email}`}
                            className="h-8 w-auto py-0 text-xs"
                          />
                          <Button size="sm" loading={saving} onClick={() => void changeRole(customer, pendingRole)}>
                            Simpan
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={customer.role === 'owner'}
                          title={customer.role === 'owner' ? 'Role Owner tidak dapat diubah.' : undefined}
                          onClick={() => {
                            setPendingRole(customer.role);
                            setEditingId(customer.id);
                          }}
                        >
                          Ubah Role
                        </Button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      <p className="text-xs text-text-muted">
        {canManageRoles
          ? 'Perubahan role hanya dapat dilakukan oleh Owner, dan role Owner tidak dapat diturunkan. Semua perubahan dicatat di Audit Log.'
          : canUpdate
            ? 'Peran Anda dapat melihat dan memperbarui data pelanggan; perubahan role adalah wewenang Owner dan dicatat di Audit Log.'
            : 'Tampilan baca-saja. Perubahan data pelanggan adalah wewenang Admin, dan perubahan role wewenang Owner.'}
      </p>
    </div>
  );
}
