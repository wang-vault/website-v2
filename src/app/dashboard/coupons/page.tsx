import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/state';
import { formatDate, formatRupiah } from '@/lib/utils';
import { TIER_LABELS } from '@/types';

export default async function DashboardCouponsPage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();

  const [coupons, orders] = await Promise.all([
    db.coupons.list(),
    db.orders.listByUser(sessionContext.session.sub),
  ]);

  const now = new Date();
  const active = coupons.filter((coupon) => {
    if (!coupon.active) return false;
    if (coupon.startsAt && new Date(coupon.startsAt) > now) return false;
    if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return false;
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return false;
    return true;
  });
  const usedCodes = new Set(orders.map((o) => o.couponCode).filter((c): c is string => Boolean(c)));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Kupon</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kupon yang sedang aktif. Validasi kupon selalu dilakukan ulang oleh server saat order dibuat.
        </p>
      </header>

      {active.length === 0 ? (
        <EmptyState
          title="Tidak ada kupon aktif saat ini"
          description="Kupon baru akan muncul di sini saat tersedia. Pantau pengumuman resmi WangStore."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((coupon) => {
            const usedByMe = usedCodes.has(coupon.code);
            return (
              <div key={coupon.id} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-bold tracking-wide text-text-primary">{coupon.code}</p>
                  <Badge variant={usedByMe ? 'neutral' : 'success'}>{usedByMe ? 'Sudah Dipakai' : 'Aktif'}</Badge>
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {coupon.type === 'percentage'
                    ? `Potongan ${coupon.value}%`
                    : `Potongan ${formatRupiah(coupon.value)}`}
                  {coupon.minOrder > 0 ? ` · min. order ${formatRupiah(coupon.minOrder)}` : ''}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-text-muted">
                  <li>Berlaku untuk: {coupon.applicableTiers.length > 0 ? coupon.applicableTiers.map((t) => TIER_LABELS[t]).join(', ') : 'Semua tier'}</li>
                  {coupon.expiresAt ? <li>Berlaku hingga {formatDate(coupon.expiresAt)}</li> : <li>Tanpa tanggal kedaluwarsa</li>}
                  <li>Maksimal {coupon.usesPerCustomer}× per pelanggan</li>
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="rounded-lg border border-border bg-surface-muted p-4 text-sm leading-relaxed text-text-secondary">
        Gunakan kode kupon pada formulir pemesanan di Server Builder. Nilai diskon dihitung dan divalidasi
        sepenuhnya oleh server — Anda tidak perlu menghitung apa pun.
      </p>
    </div>
  );
}
