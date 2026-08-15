import { ProductsManager } from '@/components/admin/products-manager';

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Produk & Paket</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Katalog produk dan paket High disimpan di database — tidak di-hardcode ke UI.
        </p>
      </header>
      <ProductsManager />
    </div>
  );
}
