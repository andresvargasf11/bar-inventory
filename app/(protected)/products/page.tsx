import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { getProducts, getCustomFields } from '@/app/actions/products';
import { Button } from '@/components/ui/button';
import { ProductsTable } from '@/components/features/products-table';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [products, customFields] = await Promise.all([getProducts(), getCustomFields()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Products</h1>
          <p className="text-sm text-slate-400">{products.length} active products</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products/import">
            <Button variant="outline" size="sm"><Upload size={14} /> Import CSV</Button>
          </Link>
          <Link href="/products/new">
            <Button size="sm"><Plus size={14} /> Add Product</Button>
          </Link>
        </div>
      </div>
      <ProductsTable products={products} customFields={customFields} />
    </div>
  );
}
