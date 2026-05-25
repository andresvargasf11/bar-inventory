'use client';

import { useState, useMemo } from 'react';
import { Download, Mail, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/utils';

interface OrderItem {
  product_id: number;
  product_name: string;
  category: string;
  distributor: string;
  unit: string;
  location_id: number;
  location_name: string;
  quantity: number | null;
  low_threshold: number;
  warning_threshold: number;
}

interface Props {
  items: OrderItem[];
}

export function OrderListView({ items }: Props) {
  const [suggestedQtys, setSuggestedQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const item of items) {
      const key = `${item.product_id}-${item.location_id}`;
      const target = item.quantity !== null && item.quantity <= item.low_threshold
        ? item.warning_threshold * 2
        : item.warning_threshold;
      init[key] = Math.max(1, Math.ceil(target - (item.quantity ?? 0)));
    }
    return init;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const dist = item.distributor || 'Unknown Distributor';
      if (!map.has(dist)) map.set(dist, []);
      map.get(dist)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const handleExport = () => {
    const headers = ['Distributor', 'Product', 'Category', 'Location', 'Unit', 'Current Qty', 'Threshold', 'Status', 'Suggested Order Qty'];
    const rows = items.map((item) => {
      const key = `${item.product_id}-${item.location_id}`;
      const isLow = item.quantity !== null && item.quantity <= item.low_threshold;
      return [
        item.distributor,
        item.product_name,
        item.category,
        item.location_name,
        item.unit,
        String(item.quantity ?? ''),
        String(item.low_threshold),
        isLow ? 'Low' : 'Warning',
        String(suggestedQtys[key] ?? ''),
      ];
    });
    downloadCsv('order-list.csv', [headers, ...rows]);
  };

  const handleEmailDraft = () => {
    const lines: string[] = ['ORDER LIST\n', `Generated: ${new Date().toLocaleString()}\n`];
    for (const [dist, distItems] of grouped) {
      lines.push(`\n--- ${dist} ---`);
      for (const item of distItems) {
        const key = `${item.product_id}-${item.location_id}`;
        const isLow = item.quantity !== null && item.quantity <= item.low_threshold;
        lines.push(
          `• ${item.product_name} (${item.location_name}) — Qty: ${item.quantity ?? '?'} [${isLow ? 'LOW' : 'WARNING'}] — Order: ${suggestedQtys[key] ?? '?'} ${item.unit}`
        );
      }
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(
      () => alert('Order list copied to clipboard! Paste into your email.'),
      () => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert('Order list copied to clipboard! Paste into your email.');
      }
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <ShoppingCart size={40} className="mb-3 opacity-40" />
        <p className="text-lg font-medium text-slate-400">All stocked up!</p>
        <p className="text-sm">No low or warning inventory items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Order List</h1>
          <p className="text-sm text-slate-400">{items.length} items need restocking across {grouped.length} distributor{grouped.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEmailDraft}>
            <Mail size={14} /> Email Draft
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {grouped.map(([distributor, distItems]) => (
        <div key={distributor} className="rounded-xl bg-slate-900 border border-slate-700/60 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700 flex items-center gap-2">
            <ShoppingCart size={14} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-white">{distributor}</h2>
            <span className="text-xs text-slate-400">({distItems.length} items)</span>
          </div>
          <div className="divide-y divide-slate-800">
            {distItems.map((item) => {
              const key = `${item.product_id}-${item.location_id}`;
              const isLow = item.quantity !== null && item.quantity <= item.low_threshold;
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{item.product_name}</span>
                      <Badge variant={isLow ? 'low' : 'warning'}>{isLow ? 'Low' : 'Warning'}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.location_name} · {item.category} · {item.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className={`font-bold ${isLow ? 'text-red-400' : 'text-yellow-400'}`}>
                        {item.quantity ?? '?'}
                      </div>
                      <div className="text-xs text-slate-500">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">≤{item.low_threshold}</div>
                      <div className="text-xs text-slate-500">Threshold</div>
                    </div>
                    <div className="text-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={suggestedQtys[key] ?? 1}
                        onChange={(e) =>
                          setSuggestedQtys((prev) => ({
                            ...prev,
                            [key]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                        className="w-16 h-8 text-center rounded-lg bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                      <div className="text-xs text-slate-500">Order Qty</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
