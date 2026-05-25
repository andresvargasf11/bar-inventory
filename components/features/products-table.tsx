'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Edit, Trash2, Copy, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import { deleteProduct, duplicateProduct } from '@/app/actions/products';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';

interface Props {
  products: Product[];
  customFields?: unknown[];
}

export function ProductsTable({ products }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortKey, setSortKey] = useState<keyof Product>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);

  const filtered = useMemo(() => {
    let data = products;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.distributor.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    if (filterCategory) data = data.filter((p) => p.category === filterCategory);
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, search, filterCategory, sortKey, sortDir]);

  const handleSort = (key: keyof Product) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteProduct(id);
      toast.success('Product removed');
      setDeleteId(null);
      router.refresh();
    });
  };

  const handleDuplicate = (id: number) => {
    startTransition(async () => {
      const result = await duplicateProduct(id);
      if (result.success) {
        toast.success('Product duplicated');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to duplicate');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900">
              {[
                { key: 'name', label: 'Product' },
                { key: 'category', label: 'Category' },
                { key: 'unit', label: 'Unit' },
                { key: 'distributor', label: 'Distributor' },
                { key: 'cost_per_unit', label: 'Cost/Unit' },
                { key: 'low_threshold', label: 'Thresholds' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof Product)}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap select-none"
                >
                  <span className="flex items-center gap-1">{label} <ArrowUpDown size={11} /></span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No products found
                </td>
              </tr>
            )}
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-2.5">
                  <Link href={`/products/${product.id}`} className="font-medium text-white hover:text-orange-400 transition-colors">
                    {product.name}
                  </Link>
                  {product.sku && <div className="text-xs text-slate-500">{product.sku}</div>}
                </td>
                <td className="px-3 py-2.5">
                  {product.category && <Badge variant="outline">{product.category}</Badge>}
                </td>
                <td className="px-3 py-2.5 text-slate-400">{product.unit}</td>
                <td className="px-3 py-2.5 text-slate-400 max-w-[140px] truncate">{product.distributor}</td>
                <td className="px-3 py-2.5 text-slate-300 font-medium">{formatCurrency(product.cost_per_unit)}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-red-400">≤{product.low_threshold}</span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-xs text-yellow-400">≤{product.warning_threshold}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Link href={`/products/${product.id}`}>
                      <button className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Edit">
                        <Edit size={13} />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDuplicate(product.id)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(product.id)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Remove Product"
        description="This product will be hidden from inventory views. Its history will be preserved."
        confirmLabel="Remove Product"
        loading={isPending}
      />
    </div>
  );
}
