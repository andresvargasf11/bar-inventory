'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  locationSessions: Array<{ location_id: number; location_name: string; counted_at: number; product_count: number }>;
  lowItems: Array<{
    product_id: number;
    location_id: number;
    location_name: string;
    quantity: number | null;
    low_threshold: number;
    warning_threshold: number;
  }>;
  totalProducts: number;
}

export function DashboardChart({ locationSessions, lowItems, totalProducts }: Props) {
  if (locationSessions.length === 0 || totalProducts === 0) return null;

  const data = locationSessions.map((ls) => {
    const items = lowItems.filter((i) => i.location_id === ls.location_id);
    const low = items.filter((i) => i.quantity !== null && i.quantity <= i.low_threshold).length;
    const warning = items.filter(
      (i) => i.quantity !== null && i.quantity > i.low_threshold && i.quantity <= i.warning_threshold
    ).length;
    // Use the actual counted products in the latest session, not the full catalog
    const counted = Number(ls.product_count ?? 0);
    const good = Math.max(0, counted - low - warning);
    return {
      name: ls.location_name,
      Good: good,
      Warning: warning,
      Low: low,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Health by Location</CardTitle>
      </CardHeader>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Bar dataKey="Good" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Warning" stackId="a" fill="#eab308" />
            <Bar dataKey="Low" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
