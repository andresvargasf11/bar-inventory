'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Product, CustomField } from '@/lib/types';
import { createProduct, updateProduct, deleteProduct } from '@/app/actions/products';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/modal';
import { parseCategories } from '@/lib/utils';

interface Props {
  product?: Product;
  customFields: CustomField[];
  customValues?: Record<number, string>;
  defaults?: { unit?: string; categories?: string };
}

export function ProductForm({ product, customFields, customValues = {}, defaults = {} }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  const categories = parseCategories(defaults.categories ?? 'Spirits,Beer,Wine,Liqueur,Mixer');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');

    startTransition(async () => {
      const result = isEdit ? await updateProduct(product.id, fd) : await createProduct(fd);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(isEdit ? 'Product updated' : 'Product created');
        router.push('/products');
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProduct(product!.id);
      toast.success('Product removed');
      router.push('/products');
      router.refresh();
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-white">
          {isEdit ? `Edit: ${product.name}` : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basic Info</h2>

          <Input
            label="Product Name *"
            name="name"
            defaultValue={product?.name}
            placeholder="e.g. Tito's Handmade Vodka"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-300">Category</label>
              <input
                list="category-list"
                name="category"
                defaultValue={product?.category}
                placeholder="Select or type…"
                className="h-10 w-full rounded-lg border bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 border-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <datalist id="category-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <Input
              label="Unit of Measurement"
              name="unit"
              defaultValue={product?.unit ?? defaults.unit}
              placeholder="e.g. 750ml, Case/24"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Distributor"
              name="distributor"
              defaultValue={product?.distributor}
              placeholder="e.g. Southern Wine & Spirits"
            />
            <Input
              label="SKU / Barcode"
              name="sku"
              defaultValue={product?.sku}
              placeholder="e.g. TITOS750"
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Pricing & Thresholds</h2>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Cost Per Unit ($)"
              name="cost_per_unit"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.cost_per_unit ?? 0}
              placeholder="0.00"
            />
            <Input
              label="Low Threshold (Red)"
              name="low_threshold"
              type="number"
              step="0.5"
              min="0"
              defaultValue={product?.low_threshold ?? 0}
              placeholder="0"
              hint="Qty ≤ this = red"
            />
            <Input
              label="Warning Threshold (Yellow)"
              name="warning_threshold"
              type="number"
              step="0.5"
              min="0"
              defaultValue={product?.warning_threshold ?? 0}
              placeholder="0"
              hint="Qty ≤ this = yellow"
            />
          </div>
        </div>

        {customFields.length > 0 && (
          <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Custom Fields</h2>
            {customFields.map((field) => {
              const fieldName = `custom_${field.id}`;
              const defaultValue = customValues[field.id] ?? '';
              if (field.field_type === 'dropdown') {
                const options: string[] = (() => {
                  if (!field.options) return [];
                  try { return JSON.parse(field.options) as string[]; } catch { return []; }
                })();
                return (
                  <Select key={field.id} label={field.name} name={fieldName} defaultValue={defaultValue}>
                    <option value="">— Select —</option>
                    {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </Select>
                );
              }
              return (
                <Input
                  key={field.id}
                  label={field.name}
                  name={fieldName}
                  type={field.field_type === 'number' ? 'number' : 'text'}
                  defaultValue={defaultValue}
                />
              );
            })}
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={14} /> Remove Product
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              <Save size={14} /> {isEdit ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Remove Product"
        description={`Remove "${product?.name}"? Its inventory history will be preserved.`}
        confirmLabel="Remove Product"
        loading={isPending}
      />
    </div>
  );
}
