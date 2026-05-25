import Link from 'next/link';
import { AlertTriangle, Package, DollarSign, Clock, Plus, ShoppingCart, ClipboardList } from 'lucide-react';
import { getDashboardStats } from '@/app/actions/inventory';
import { getSetting } from '@/lib/db';
import { StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime, daysSince } from '@/lib/utils';
import { DashboardChart } from '@/components/features/dashboard-chart';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const reminderThreshold = parseInt((await getSetting('reminder_threshold')) ?? '7', 10);
  const daysSinceCount = stats.lastSession ? daysSince(stats.lastSession.counted_at) : null;
  const showReminder = daysSinceCount === null || daysSinceCount >= reminderThreshold;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Bar inventory overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/count">
            <Button size="sm">
              <Plus size={15} />
              New Count
            </Button>
          </Link>
        </div>
      </div>

      {/* Reminder banner */}
      {showReminder && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
          <Clock size={16} className="flex-shrink-0" />
          <span className="text-sm">
            {daysSinceCount === null
              ? 'No inventory counts taken yet. Start your first count!'
              : `Last count was ${daysSinceCount} day${daysSinceCount !== 1 ? 's' : ''} ago. Consider doing a new count.`}
          </span>
          <Link href="/inventory/count" className="ml-auto text-xs font-medium underline underline-offset-2 hover:text-yellow-300">
            Count now
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          icon={<Package size={16} />}
        />
        <StatCard
          label="Low Inventory"
          value={stats.lowCount + stats.warningCount}
          icon={<AlertTriangle size={16} />}
          className={stats.lowCount > 0 ? 'border-red-500/40' : stats.warningCount > 0 ? 'border-yellow-500/40' : ''}
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(stats.totalValue)}
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Last Count"
          value={daysSinceCount === null ? 'Never' : daysSinceCount === 0 ? 'Today' : `${daysSinceCount}d ago`}
          icon={<Clock size={16} />}
        />
      </div>

      {/* Location last counts */}
      {stats.locationSessions.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Last Count Per Location
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {stats.locationSessions.map((ls) => (
              <div key={ls.location_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800">
                <span className="text-sm font-medium text-white">{ls.location_name}</span>
                <span className="text-xs text-slate-400">{formatDateTime(ls.counted_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low / Warning items */}
      {stats.lowItems.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-700/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Needs Attention ({stats.lowItems.length})
            </h2>
            <Link href="/orders" className="text-xs text-orange-400 hover:text-orange-300">
              View Order List →
            </Link>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {stats.lowItems.map((item, i) => {
              const isLow = item.quantity !== null && item.quantity <= item.low_threshold;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    isLow ? 'bg-red-900/30 border border-red-800/50' : 'bg-yellow-900/20 border border-yellow-800/40'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-white truncate block">{item.product_name}</span>
                    <span className="text-xs text-slate-400">{item.location_name}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-yellow-400'}`}>
                      {item.quantity}
                    </span>
                    <Badge variant={isLow ? 'low' : 'warning'}>
                      {isLow ? 'Low' : 'Warning'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory health chart */}
      <DashboardChart locationSessions={stats.locationSessions} lowItems={stats.lowItems} totalProducts={stats.totalProducts} />

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/inventory/count">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-orange-500/50 transition-colors text-center">
            <ClipboardList size={20} className="text-orange-400" />
            <span className="text-xs font-medium text-slate-300">New Count</span>
          </div>
        </Link>
        <Link href="/orders">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-orange-500/50 transition-colors text-center">
            <ShoppingCart size={20} className="text-orange-400" />
            <span className="text-xs font-medium text-slate-300">Order List</span>
          </div>
        </Link>
        <Link href="/products/new">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-orange-500/50 transition-colors text-center">
            <Plus size={20} className="text-orange-400" />
            <span className="text-xs font-medium text-slate-300">Add Product</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
