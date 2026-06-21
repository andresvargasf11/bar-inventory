'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowUpDown, Plus, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { CurrentInventoryRow } from '@/lib/types';
import { StorageLocation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateQuickQty } from '@/app/actions/inventory';
import { formatCurrency, formatDateTime, downloadCsv, cn } from '@/lib/utils';

type SortKey = keyof CurrentInventoryRow;

interface Props {
  rows: CurrentInventoryRow[];
  locations: StorageLocation[];
  selectedLocationId?: number;
}

export function InventoryTable({ rows, locations, selectedLocationId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDistributor, setFilterDistributor] = useState('');
  const [editingQty, setEditingQty] = useState<{ id: number; value: string } | null>(null);
  const [, startTransition] = useTransition();

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows]
  );
  const distributors = useMemo(
    () => [...new Set(rows.map((r) => r.distributor).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let data = rows;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.distributor.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q)
      );
    }
    if (filterCategory) data = data.filter((r) => r.category === filterCategory);
    if (filterDistributor) data = data.filter((r) => r.distributor === filterDistributor);
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, filterCategory, filterDistributor, sortKey, sortDir]);

  const totalValue = filtered.reduce((s, r) => s + r.total_value, 0);
  const lowCount = filtered.filter((r) => r.status === 'low').length;
  const warningCount = filtered.filter((r) => r.status === 'warning').length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleQtyEdit = (id: number, current: number | null) => {
    setEditingQty({ id, value: String(current ?? '') });
  };

  const saveQty = (row: CurrentInventoryRow) => {
    if (!editingQty || editingQty.id !== row.id) return;
    const qty = parseFloat(editingQty.value);
    if (isNaN(qty) || qty < 0) {
      toast.error('Invalid quantity');
      setEditingQty(null);
      return;
    }
    if (!selectedLocationId) {
      toast.error('Select a location to edit quantity');
      setEditingQty(null);
      return;
    }
    startTransition(async () => {
      await updateQuickQty(row.id, selectedLocationId, qty);
      toast.success(`Updated ${row.name}`);
      setEditingQty(null);
      router.refresh();
    });
  };

  const handleExport = () => {
    const headers = ['Name', 'Category', 'Unit', 'Distributor', 'Cost/Unit', 'Qty', 'Low Threshold', 'Warning Threshold', 'Total Value', 'Last Updated'];
    const data = filtered.map((r) => [
      r.name, r.category, r.unit, r.distributor,
      String(r.cost_per_unit), String(r.quantity ?? ''),
      String(r.low_threshold), String(r.warning_threshold),
      String(r.total_value.toFixed(2)),
      r.counted_at ? formatDateTime(r.counted_at) : '',
    ]);
    downloadCsv('inventory.csv', [headers, ...data]);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Current Inventory</h1>
          <p className="text-sm text-slate-400">{filtered.length} products · {formatCurrency(totalValue)} total value</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={14} /> Print Sheet
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
          <Link href={`/inventory/count${selectedLocationId ? `?location=${selectedLocationId}` : ''}`}>
            <Button size="sm"><Plus size={14} /> New Count</Button>
          </Link>
        </div>
      </div>

      {/* Summary badges */}
      {(lowCount > 0 || warningCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {lowCount > 0 && <Badge variant="low">{lowCount} Low</Badge>}
          {warningCount > 0 && <Badge variant="warning">{warningCount} Warning</Badge>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Location filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => router.push('/inventory')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              !selectedLocationId ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            All Locations
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => router.push(`/inventory?location=${loc.id}`)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectedLocationId === loc.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              )}
            >
              {loc.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 min-w-0 mt-1 sm:mt-0">
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
          <select
            value={filterDistributor}
            onChange={(e) => setFilterDistributor(e.target.value)}
            className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Distributors</option>
            {distributors.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900">
              {[
                { key: 'name', label: 'Product' },
                { key: 'category', label: 'Category' },
                { key: 'unit', label: 'Unit' },
                { key: 'distributor', label: 'Distributor' },
                { key: 'cost_per_unit', label: 'Cost' },
                { key: 'quantity', label: 'Qty' },
                { key: 'low_threshold', label: 'Threshold' },
                { key: 'total_value', label: 'Value' },
                { key: 'counted_at', label: 'Updated' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as SortKey)}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap select-none"
                >
                  <span className="flex items-center gap-1">
                    {label} <ArrowUpDown size={11} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  No products found
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr
                key={`${row.id}-${row.location_id}`}
                className={cn(
                  'transition-colors hover:bg-slate-800/50',
                  row.status === 'low' && 'bg-red-950/30',
                  row.status === 'warning' && 'bg-yellow-950/20'
                )}
              >
                <td className="px-3 py-2.5">
                  <Link href={`/products/${row.id}`} className="font-medium text-white hover:text-orange-400 transition-colors">
                    {row.name}
                  </Link>
                  {row.sku && <div className="text-xs text-slate-500">{row.sku}</div>}
                </td>
                <td className="px-3 py-2.5 text-slate-400">{row.category}</td>
                <td className="px-3 py-2.5 text-slate-400">{row.unit}</td>
                <td className="px-3 py-2.5 text-slate-400 max-w-[120px] truncate">{row.distributor}</td>
                <td className="px-3 py-2.5 text-slate-300">{formatCurrency(row.cost_per_unit)}</td>
                <td className="px-3 py-2.5">
                  {editingQty?.id === row.id ? (
                    <input
                      type="number"
                      autoFocus
                      value={editingQty.value}
                      onChange={(e) => setEditingQty({ id: row.id, value: e.target.value })}
                      onBlur={() => saveQty(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveQty(row);
                        if (e.key === 'Escape') setEditingQty(null);
                      }}
                      className="w-20 h-7 px-2 rounded bg-slate-700 border border-orange-500 text-white text-sm focus:outline-none"
                      min="0"
                      step="0.5"
                    />
                  ) : (
                    <button
                      onClick={() => handleQtyEdit(row.id, row.quantity)}
                      className={cn(
                        'font-bold text-lg min-w-[2rem] text-left hover:underline',
                        row.status === 'low' ? 'text-red-400' : row.status === 'warning' ? 'text-yellow-400' : 'text-white'
                      )}
                      title="Click to edit"
                    >
                      {row.quantity ?? '—'}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className={cn('text-xs', row.status === 'low' ? 'text-red-400' : row.status === 'warning' ? 'text-yellow-400' : 'text-slate-400')}>
                      ≤{row.low_threshold}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="text-xs text-yellow-500">≤{row.warning_threshold}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-300">{formatCurrency(row.total_value)}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                  {row.counted_at ? formatDateTime(row.counted_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-900/50">
                <td colSpan={7} className="px-3 py-2 text-xs text-slate-400">
                  {filtered.length} products shown
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-white">
                  {formatCurrency(totalValue)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Print-only count sheet */}
      <div className="print-only">
        <h2 className="text-xl font-bold mb-4">Inventory Count Sheet</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-400 px-2 py-1 text-left">Product</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Category</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Unit</th>
              <th className="border border-gray-400 px-2 py-1 text-left" style={{ width: '120px' }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-300 px-2 py-1">{row.name}</td>
                <td className="border border-gray-300 px-2 py-1">{row.category}</td>
                <td className="border border-gray-300 px-2 py-1">{row.unit}</td>
                <td className="border border-gray-300 px-2 py-1">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
