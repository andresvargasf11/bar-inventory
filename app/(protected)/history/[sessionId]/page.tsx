import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getSessionById } from '@/app/actions/inventory';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SessionDetailPage({ params }: { params: { sessionId: string } }) {
  const id = parseInt(params.sessionId, 10);
  if (isNaN(id)) notFound();

  const data = await getSessionById(id);
  if (!data) notFound();

  const { session, counts } = data;
  const totalValue = counts.reduce((s, c) => s + c.quantity * c.cost_per_unit, 0);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/history" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={16} /> History
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Session #{session.id}</h1>
          <p className="text-xs text-slate-400">{session.location_name} · {formatDateTime(session.counted_at)}</p>
        </div>
      </div>

      {session.notes && (
        <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300">
          {session.notes}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/60">
        <span className="text-sm text-slate-400">{counts.length} products counted</span>
        <span className="text-sm font-semibold text-white">Total value: {formatCurrency(totalValue)}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Qty</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {counts.map((count) => (
              <tr key={count.product_id} className="bg-slate-900 hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-medium text-white">{count.product_name}</td>
                <td className="px-3 py-2.5 text-slate-400">{count.category}</td>
                <td className="px-3 py-2.5 text-center text-white font-bold">{count.quantity} <span className="text-xs text-slate-500">{count.unit}</span></td>
                <td className="px-3 py-2.5 text-right text-slate-300">{formatCurrency(count.quantity * count.cost_per_unit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 bg-slate-800/50">
              <td colSpan={3} className="px-3 py-2 text-sm text-slate-400">{counts.length} products</td>
              <td className="px-3 py-2 text-right font-semibold text-white">{formatCurrency(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
