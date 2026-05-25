'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Upload, Download, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { batchImportProducts } from '@/app/actions/products';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/utils';

const ALL_COLS = ['name', 'category', 'unit', 'distributor', 'cost_per_unit', 'low_threshold', 'warning_threshold', 'sku'];

interface ParsedRow {
  name: string;
  category: string;
  unit: string;
  distributor: string;
  cost_per_unit: number;
  low_threshold: number;
  warning_threshold: number;
  sku: string;
  _error?: string;
  _index: number;
}

export function CsvImport() {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed: ParsedRow[] = (result.data as Record<string, string>[]).map((row, i) => {
          const name = row.name?.trim() ?? row.Name?.trim() ?? '';
          const errors: string[] = [];
          if (!name) errors.push('name is required');
          return {
            name,
            category: row.category?.trim() ?? row.Category?.trim() ?? '',
            unit: row.unit?.trim() ?? row.Unit?.trim() ?? '',
            distributor: row.distributor?.trim() ?? row.Distributor?.trim() ?? '',
            cost_per_unit: parseFloat(row.cost_per_unit ?? row['Cost Per Unit'] ?? '0') || 0,
            low_threshold: parseFloat(row.low_threshold ?? row['Low Threshold'] ?? '0') || 0,
            warning_threshold: parseFloat(row.warning_threshold ?? row['Warning Threshold'] ?? '0') || 0,
            sku: row.sku?.trim() ?? row.SKU?.trim() ?? '',
            _error: errors.join('; ') || undefined,
            _index: i + 2,
          };
        });
        setRows(parsed);
      },
      error: (err) => toast.error(`Parse error: ${err.message}`),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  const handleImport = () => {
    if (validRows.length === 0) return;
    startTransition(async () => {
      const result = await batchImportProducts(validRows);
      if (result.success) {
        toast.success(`Imported ${result.imported} products`);
        router.push('/products');
        router.refresh();
      } else {
        toast.error('Import failed');
      }
    });
  };

  const downloadTemplate = () => {
    downloadCsv('product-import-template.csv', [ALL_COLS, ['Example Vodka', 'Spirits', '750ml', 'Glazer\'s Dist.', '18.50', '2', '4', 'VODKA750']]);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-white">Import Products via CSV</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Upload a CSV file to bulk-add products. Download the template to get started.</p>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download size={14} /> Download Template
        </Button>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          className="rounded-xl border-2 border-dashed border-slate-600 hover:border-orange-500/50 transition-colors p-12 text-center cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload size={32} className="mx-auto text-slate-500 mb-3" />
          <p className="text-slate-300 font-medium">Drop your CSV here or click to browse</p>
          <p className="text-sm text-slate-500 mt-1">Supported: .csv files</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle size={14} /> {validRows.length} valid rows
              </span>
              {errorRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle size={14} /> {errorRows.length} errors
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRows([])}>Clear</Button>
              <Button size="sm" onClick={handleImport} loading={isPending} disabled={validRows.length === 0}>
                Import {validRows.length} Products
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700/60">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-3 py-2 text-left text-slate-400">#</th>
                  <th className="px-3 py-2 text-left text-slate-400">Name</th>
                  <th className="px-3 py-2 text-left text-slate-400">Category</th>
                  <th className="px-3 py-2 text-left text-slate-400">Unit</th>
                  <th className="px-3 py-2 text-left text-slate-400">Distributor</th>
                  <th className="px-3 py-2 text-left text-slate-400">Cost</th>
                  <th className="px-3 py-2 text-left text-slate-400">Low</th>
                  <th className="px-3 py-2 text-left text-slate-400">Warning</th>
                  <th className="px-3 py-2 text-left text-slate-400">SKU</th>
                  <th className="px-3 py-2 text-left text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row._index} className={row._error ? 'bg-red-950/30' : 'bg-slate-900'}>
                    <td className="px-3 py-1.5 text-slate-500">{row._index}</td>
                    <td className="px-3 py-1.5 text-white font-medium">{row.name || '—'}</td>
                    <td className="px-3 py-1.5 text-slate-400">{row.category || '—'}</td>
                    <td className="px-3 py-1.5 text-slate-400">{row.unit || '—'}</td>
                    <td className="px-3 py-1.5 text-slate-400">{row.distributor || '—'}</td>
                    <td className="px-3 py-1.5 text-slate-400">${row.cost_per_unit}</td>
                    <td className="px-3 py-1.5 text-slate-400">{row.low_threshold}</td>
                    <td className="px-3 py-1.5 text-slate-400">{row.warning_threshold}</td>
                    <td className="px-3 py-1.5 text-slate-400">{row.sku || '—'}</td>
                    <td className="px-3 py-1.5">
                      {row._error ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle size={12} /> {row._error}
                        </span>
                      ) : (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle size={12} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
