import { requireAdminPage } from '@/lib/auth/page-guards';
import { getDb } from '@/lib/db';
import { PricingForm } from '@/components/admin/pricing-form';
import { DEFAULT_LOW_PRICING, HIGH_PACKAGES } from '@/lib/pricing';
import { formatRupiahPerMonth } from '@/lib/utils';

export default async function AdminPricingPage() {
  const { can } = await requireAdminPage('pricing.read');
  const db = await getDb();
  const rules = await db.pricing.get();
  const packages = await db.packages.list();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Formula Harga</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola formula harga tier Low. Harga paket High dikelola di modul Produk &amp; Paket.
        </p>
      </header>

      <section aria-labelledby="formula-low">
        <h2 id="formula-low" className="mb-4 text-base font-semibold text-text-primary">
          Formula Harga Low
        </h2>
        <PricingForm
          initial={{
            base: rules.base,
            perCore: rules.perCore,
            perGbRam: rules.perGbRam,
            perGbStorage: rules.perGbStorage,
            roundTo: rules.roundTo,
            minPrice: rules.minPrice,
          }}
          defaultPricing={DEFAULT_LOW_PRICING}
          readOnly={!can('pricing.manage')}
        />
      </section>

      <section aria-labelledby="paket-high">
        <h2 id="paket-high" className="mb-3 text-base font-semibold text-text-primary">
          Paket High Saat Ini
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">ID</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">CPU</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">RAM</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Penyimpanan</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Harga Final</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{pkg.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{pkg.cpu} vCore</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{pkg.ramGb} GB</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{pkg.storageGb} GB</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{formatRupiahPerMonth(pkg.price)}</td>
                  <td className="px-4 py-2.5 text-xs">{pkg.active ? 'Aktif' : 'Nonaktif'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Paket High memiliki harga final. Katalog referensi: {HIGH_PACKAGES.length} paket.
        </p>
      </section>
    </div>
  );
}
