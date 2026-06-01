'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, GitCompare, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { InventorySession, StorageLocation, SessionComparison, UsageReportRow } from '@/lib/types';
import { compareSessions, getUsageReport } from '@/app/actions/inventory';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';

interface Session extends InventorySession {
  location_name: string;
  product_count?: number;
}

interface Props {
  sessions: Session[];
  locations: StorageLocation[];
}

export function HistoryList({ sessions, locations }: Props) {
  const [compareA, setCompareA] = useState<number | ''>('');
  const [compareB, setCompareB] = useState<number | ''>('');
  const [compareData, setCompareData] = useState<SessionComparison[] | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const [usageLocation, setUsageLocation] = useState<number | ''>(locations[0]?.id ?? '');
  const [usageStart, setUsageStart] = useState('');
  const [usageEnd, setUsageEnd] = useState(new Date().toISOString().split('T')[0]);
  const [usageData, setUsageData] = useState<UsageReportRow[] | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCompare = () => {
    if (!compareA || !compareB || compareA === compareB) {
      toast.error('Select two different sessions to compare');
      return;
    }
    startTransition(async () => {
      const data = await compareSessions(Number(compareA), Number(compareB));
      setCompareData(data);
      setShowCompare(true);
    });
  };

  const handleUsageReport = () => {
    if (!usageLocation || !usageStart || !usageEnd) {
      toast.error('Select a location and date range');
      return;
    }
    if (usageStart > usageEnd) {
      toast.error('Start date must be before end date');
      return;
    }
    startTransition(async () => {
      const data = await getUsageReport(Number(usageLocation), usageStart, usageEnd);
      if (data.length === 0) {
        toast.info('No depletion data found for this range (need at least 2 sessions)');
        return;
      }
      setUsageData(data);
      setShowUsage(true);
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Clock size={40} className="mb-3 opacity-40" />
        <p className="text-lg font-medium text-slate-400">No inventory history yet</p>
        <p className="text-sm">Complete your first count to see history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Inventory History</h1>
        <p className="text-sm text-slate-400">{sessions.length} sessions recorded</p>
      </div>

      {/* Compare tool */}
      <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-white">Compare Two Sessions</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Session A</label>
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value ? Number(e.target.value) : '')}
              className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
            >
              <option value="">Select…</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.counted_at)} — {s.location_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Session B</label>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value ? Number(e.target.value) : '')}
              className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
            >
              <option value="">Select…</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.counted_at)} — {s.location_name}
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={handleCompare} loading={isPending}>
            Compare
          </Button>
        </div>
      </div>

      {/* Usage/Depletion report */}
      <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-white">Usage & Depletion Report</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Location</label>
            <select
              value={usageLocation}
              onChange={(e) => setUsageLocation(e.target.value ? Number(e.target.value) : '')}
              className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
            >
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Start Date</label>
            <input
              type="date"
              value={usageStart}
              onChange={(e) => setUsageStart(e.target.value)}
              className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">End Date</label>
            <input
              type="date"
              value={usageEnd}
              onChange={(e) => setUsageEnd(e.target.value)}
              className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
            />
          </div>
          <Button size="sm" onClick={handleUsageReport} loading={isPending}>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Sessions list */}
      <div className="space-y-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/history/${session.id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-orange-500/40 transition-colors group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
              <Clock size={16} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">{session.location_name}</span>
                {session.notes && <span className="text-xs text-slate-500 truncate">&ldquo;{session.notes}&rdquo;</span>}
              </div>
              <div className="text-xs text-slate-400">{formatDateTime(session.counted_at)} · {session.product_count ?? 0} products</div>
            </div>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-orange-400 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Compare Modal */}
      <Modal open={showCompare} onClose={() => setShowCompare(false)} title="Session Comparison" size="xl">
        {compareData && (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800">
                    <th className="px-3 py-2 text-left text-slate-400">Product</th>
                    <th className="px-3 py-2 text-center text-slate-400">Session A</th>
                    <th className="px-3 py-2 text-center text-slate-400">Session B</th>
                    <th className="px-3 py-2 text-center text-slate-400">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {compareData.map((row) => (
                    <tr key={row.product_id} className="bg-slate-900">
                      <td className="px-3 py-2 text-white">{row.product_name}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.qty_a ?? '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.qty_b ?? '—'}</td>
                      <td className="px-3 py-2 text-center font-bold">
                        <span className={cn(
                          (row.delta ?? 0) > 0 ? 'text-green-400' : (row.delta ?? 0) < 0 ? 'text-red-400' : 'text-slate-500'
                        )}>
                          {(row.delta ?? 0) > 0 ? '+' : ''}{row.delta ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Usage Report Modal */}
      <Modal open={showUsage} onClose={() => setShowUsage(false)} title="Usage & Depletion Report" size="xl">
        {usageData && (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="text-sm text-slate-400">
              Total cost of goods: <span className="text-white font-bold">
                {formatCurrency(usageData.reduce((s, r) => s + r.total_cost, 0))}
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800">
                    <th className="px-3 py-2 text-left text-slate-400">Product</th>
                    <th className="px-3 py-2 text-left text-slate-400">Category</th>
                    <th className="px-3 py-2 text-center text-slate-400">Used</th>
                    <th className="px-3 py-2 text-right text-slate-400">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {usageData.map((row) => (
                    <tr key={row.product_id} className="bg-slate-900">
                      <td className="px-3 py-2 text-white font-medium">{row.product_name}</td>
                      <td className="px-3 py-2 text-slate-400">{row.category}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.total_used} {row.unit}</td>
                      <td className="px-3 py-2 text-right text-orange-400 font-medium">{formatCurrency(row.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
