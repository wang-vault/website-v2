import { requireAdminPage } from '@/lib/auth/page-guards';
import { ProductsManager } from '@/components/admin/products-manager';

export default async function AdminProductsPage() {
  const { can } = await requireAdminPage('products.read');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Produk & Paket</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Katalog produk dan paket High disimpan di database — tidak di-hardcode ke UI.
        </p>
      </header>
      <ProductsManager readOnly={!can('products.manage')} />
    </div>
  );
}
