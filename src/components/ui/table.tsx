import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = 'Belum ada data.',
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn('px-4 py-2.5 font-medium text-text-secondary', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border last:border-b-0',
                  onRowClick && 'cursor-pointer hover:bg-surface-muted',
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 align-middle text-text-primary', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Navigasi halaman" className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-text-muted">
        Halaman {page} dari {totalPages} · {total} data
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-text-primary hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-text-primary hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50"
        >
          Berikutnya
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
