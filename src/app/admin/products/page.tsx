import { requireAdminPage } from '@/lib/auth/page-guards';
import { getDb } from '@/lib/db';
import { resolveCatalogStatus } from '@/lib/catalog';
import { ProductsManager } from '@/components/admin/products-manager';
import { VpsPackagesManager } from '@/components/admin/vps-packages-manager';
import { CatalogAvailabilityForm } from '@/components/admin/catalog-availability-form';
import { Tabs } from '@/components/ui/tabs';

export default async function AdminProductsPage() {
  const { can } = await requireAdminPage('products.read');
  const db = await getDb();
  const settings = await db.settings.get();
  const catalogStatus = resolveCatalogStatus(settings);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Produk, Paket &amp; Ketersediaan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Katalog Minecraft (paket Medium &amp; High), katalog VPS, dan status ketersediaan setiap layanan —
          seluruhnya disimpan di database, tidak di-hardcode ke UI.
        </p>
      </header>
      <Tabs
        items={[
          {
            key: 'catalog',
            label: 'Ketersediaan Layanan',
            content: (
              <CatalogAvailabilityForm initial={catalogStatus} readOnly={!can('products.manage')} />
            ),
          },
          {
            key: 'minecraft',
            label: 'Produk & Paket Minecraft',
            content: <ProductsManager readOnly={!can('products.manage')} />,
          },
          {
            key: 'vps',
            label: 'Paket VPS',
            content: <VpsPackagesManager readOnly={!can('packages.manage')} />,
          },
        ]}
      />
    </div>
  );
}
