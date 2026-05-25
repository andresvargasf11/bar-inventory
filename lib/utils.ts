import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CurrentInventoryRow } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function daysSince(unixSeconds: number): number {
  const diffMs = Date.now() - unixSeconds * 1000;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getInventoryStatus(
  qty: number | null,
  lowThreshold: number,
  warningThreshold: number
): 'good' | 'warning' | 'low' | 'uncounted' {
  if (qty === null || qty === undefined) return 'uncounted';
  if (qty <= lowThreshold) return 'low';
  if (qty <= warningThreshold) return 'warning';
  return 'good';
}

export function getStatusColor(status: CurrentInventoryRow['status']) {
  switch (status) {
    case 'low': return 'bg-red-900/40 border-red-800';
    case 'warning': return 'bg-yellow-900/30 border-yellow-800';
    case 'good': return '';
    case 'uncounted': return 'opacity-60';
    default: return '';
  }
}

export function getStatusBadgeClass(status: CurrentInventoryRow['status']) {
  switch (status) {
    case 'low': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'warning': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'good': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'uncounted': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    default: return '';
  }
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csvContent = rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCategories(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
