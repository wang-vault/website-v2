import { getDb } from '@/lib/db';
import { StatCard } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/state';
import { formatRupiah } from '@/lib/utils';

export default async function AdminAnalyticsPage() {
  const db = await getDb();
  const stats = await db.orders.stats();

  const maxDayCount = Math.max(1, ...stats.ordersByDay.map((d) => d.count));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analitik</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Statistik nyata dari data order yang tersimpan. Jika belum ada data, ditampilkan apa adanya — tanpa
          angka palsu.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Order" value={String(stats.totalOrders)} />
        <StatCard label="Order Hari Ini" value={String(stats.ordersToday)} />
        <StatCard label="Order Bulan Ini" value={String(stats.ordersThisMonth)} />
        <StatCard label="Pendapatan (order non-batal)" value={formatRupiah(stats.revenue)} />
      </div>

      <section aria-labelledby="grafik-order">
        <h2 id="grafik-order" className="mb-4 text-base font-semibold text-text-primary">
          Order per Hari (30 hari terakhir)
        </h2>
        {stats.totalOrders === 0 ? (
          <EmptyState
            title="Belum ada data untuk periode ini"
            description="Grafik akan muncul setelah ada order yang masuk."
          />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex h-40 items-end gap-1" role="img" aria-label="Grafik batang jumlah order per hari selama 30 hari terakhir">
              {stats.ordersByDay.map((day) => (
                <div key={day.date} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-accent/80 transition-opacity group-hover:bg-accent"
                    style={{ height: `${Math.max((day.count / maxDayCount) * 100, day.count > 0 ? 4 : 0)}%` }}
                    title={`${day.date}: ${day.count} order · ${formatRupiah(day.revenue)}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-text-muted">
              <span>30 hari lalu</span>
              <span>Hari ini</span>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="paket-populer">
          <h2 id="paket-populer" className="mb-3 text-base font-semibold text-text-primary">
            Paket / Tier Populer
          </h2>
          {stats.packages.length === 0 ? (
            <EmptyState title="Belum ada data untuk periode ini" description="Data muncul setelah ada order." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {stats.packages.map((entry) => (
                <li key={entry.packageId} className="flex items-center justify-between px-5 py-3">
                  <span className="font-mono text-xs text-text-primary">{entry.label}</span>
                  <span className="text-sm font-semibold text-text-primary">{entry.count} order</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="penggunaan-kupon">
          <h2 id="penggunaan-kupon" className="mb-3 text-base font-semibold text-text-primary">
            Penggunaan Kupon
          </h2>
          {stats.couponUsage.length === 0 ? (
            <EmptyState title="Belum ada data untuk periode ini" description="Kupon yang dipakai akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {stats.couponUsage.map((entry) => (
                <li key={entry.code} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-mono text-xs font-semibold text-text-primary">{entry.code}</span>
                    <p className="text-xs text-text-muted">Total potongan {formatRupiah(entry.discountTotal)}</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{entry.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
