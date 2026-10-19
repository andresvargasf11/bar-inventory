'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Scan, Save, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Product, StorageLocation } from '@/lib/types';
import { saveInventorySession } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  products: Product[];
  locations: StorageLocation[];
  selectedLocationId?: number;
  lastCounts: Record<number, number>;
}

export function InventoryCountForm({ products, locations, selectedLocationId, lastCounts }: Props) {
  const router = useRouter();
  const [locationId, setLocationId] = useState<number>(selectedLocationId ?? locations[0]?.id);
  const [counts, setCounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, String(lastCounts[p.id] ?? '')]))
  );
  const [notes, setNotes] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [filterMenuItems, setFilterMenuItems] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Navigate to reload server data when user switches location
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    router.push(`/inventory/count?location=${locationId}`);
  }, [locationId, router]);

  const jumpToProduct = (product: Product) => {
    inputRefs.current[product.id]?.focus();
    inputRefs.current[product.id]?.select();
    setBarcodeInput('');
    setSearchResults([]);
    toast.success(`Found: ${product.name}`);
  };

  const handleBarcodeInput = (value: string) => {
    setBarcodeInput(value);
    const q = value.toLowerCase().trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    // Exact SKU match — immediate jump (barcode scanner)
    const exactSku = products.find((p) => p.sku && p.sku.toLowerCase() === q);
    if (exactSku) {
      jumpToProduct(exactSku);
      return;
    }
    // Partial name or SKU match — show dropdown
    const matches = products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    );
    if (matches.length === 1) {
      jumpToProduct(matches[0]);
    } else {
      setSearchResults(matches.slice(0, 6));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, productId: number, idx: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const next = products[idx + 1];
      if (next) {
        inputRefs.current[next.id]?.focus();
        inputRefs.current[next.id]?.select();
      } else {
        // Last item — focus the save button or notes
        barcodeRef.current?.focus();
      }
    }
  };

  const handleSave = () => {
    if (!locationId) {
      toast.error('Please select a location');
      return;
    }

    const countsData: Record<string, number> = {};
    for (const [id, val] of Object.entries(counts)) {
      if (val !== '' && !isNaN(Number(val))) {
        countsData[id] = Number(val);
      }
    }

    if (Object.keys(countsData).length === 0) {
      toast.error('Enter at least one quantity');
      return;
    }

    const fd = new FormData();
    fd.append('location_id', String(locationId));
    fd.append('notes', notes);
    fd.append('counts', JSON.stringify(countsData));

    startTransition(async () => {
      try {
        const result = await saveInventorySession(fd);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Inventory count saved!');
          router.push(`/inventory?location=${locationId}`);
          router.refresh();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Save failed: ${message}`);
      }
    });
  };

  const visibleProducts = filterMenuItems ? products.filter((p) => Number(p.is_menu_item) === 1) : products;
  const filledCount = Object.values(counts).filter((v) => v !== '').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">New Inventory Count</h1>
          <p className="text-sm text-slate-400">{filledCount} of {visibleProducts.length} products entered</p>
        </div>
        <Button onClick={handleSave} loading={isPending} disabled={filledCount === 0}>
          <Save size={15} /> Save Count
        </Button>
      </div>

      {/* Location selector + Menu Items filter */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setLocationId(loc.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                locationId === loc.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              {loc.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFilterMenuItems((v) => !v)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filterMenuItems ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          )}
        >
          Menu Items
        </button>
      </div>

      {/* Search input */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700">
          <Scan size={16} className="text-orange-400 flex-shrink-0" />
          <input
            ref={barcodeRef}
            type="text"
            placeholder="Search by name, barcode, or SKU…"
            value={barcodeInput}
            onChange={(e) => handleBarcodeInput(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {barcodeInput && (
            <button
              type="button"
              onClick={() => { setBarcodeInput(''); setSearchResults([]); }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
            {searchResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => jumpToProduct(product)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800 active:bg-slate-700 border-b border-slate-800 last:border-b-0 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{product.name}</div>
                  <div className="text-xs text-slate-500">{[product.category, product.unit].filter(Boolean).join(' · ')}</div>
                </div>
                {product.sku && <div className="text-xs text-slate-500 flex-shrink-0">{product.sku}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <input
        type="text"
        placeholder="Session notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full h-10 px-3 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
      />

      {/* Products list */}
      <div className="space-y-1 overflow-hidden rounded-xl border border-slate-700/60">
        {/* Header */}
        <div className="flex items-center px-3 py-2 bg-slate-900 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span className="flex-1">Product</span>
          <span className="w-16 text-center">Previous</span>
          <span className="w-24 text-right">Count</span>
        </div>

        {visibleProducts.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-6 text-slate-500">
            <AlertCircle size={16} />
            <span className="text-sm">
              {filterMenuItems ? 'No products flagged as menu items yet.' : 'No products. Add some in the Products page first.'}
            </span>
          </div>
        )}

        {/* Group by category */}
        {Array.from(new Set(visibleProducts.map((p) => p.category))).map((category) => (
          <div key={category}>
            <div className="px-3 py-1.5 bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {category || 'Uncategorized'}
            </div>
            {visibleProducts
              .filter((p) => p.category === category)
              .map((product) => {
                const globalIdx = visibleProducts.indexOf(product);
                const hasValue = counts[product.id] !== '';
                const prevCount = lastCounts[product.id];
                const currentVal = counts[product.id];
                const numVal = currentVal !== '' ? parseFloat(currentVal) : null;
                const isLow = numVal !== null && numVal <= product.low_threshold;
                const isWarning = numVal !== null && numVal > product.low_threshold && numVal <= product.warning_threshold;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 border-b border-slate-800/50 last:border-b-0',
                      isLow ? 'bg-red-950/20' : isWarning ? 'bg-yellow-950/10' : 'bg-slate-900'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.unit} · {product.sku || 'No SKU'}</div>
                    </div>
                    <div className="w-16 text-center text-sm text-slate-500">
                      {prevCount !== undefined ? prevCount : '—'}
                    </div>
                    <input
                      ref={(el) => { inputRefs.current[product.id] = el; }}
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={counts[product.id]}
                      onChange={(e) => setCounts((prev) => ({ ...prev, [product.id]: e.target.value }))}
                      onKeyDown={(e) => handleKeyDown(e, product.id, globalIdx)}
                      onFocus={(e) => e.target.select()}
                      className={cn(
                        'w-24 h-10 px-2 rounded-lg border text-right text-white text-base font-medium focus:outline-none',
                        isLow
                          ? 'bg-red-900/30 border-red-600 focus:border-red-400'
                          : isWarning
                          ? 'bg-yellow-900/20 border-yellow-600 focus:border-yellow-400'
                          : hasValue
                          ? 'bg-slate-800 border-slate-600 focus:border-orange-500'
                          : 'bg-slate-800 border-slate-700 focus:border-orange-500'
                      )}
                    />
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2 pb-4">
        <Button onClick={handleSave} loading={isPending} disabled={filledCount === 0} size="lg">
          <Save size={16} /> Save {filledCount} Count{filledCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
