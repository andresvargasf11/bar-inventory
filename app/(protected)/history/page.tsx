import { getSessions } from '@/app/actions/inventory';
import { getLocations } from '@/app/actions/locations';
import { HistoryList } from '@/components/features/history-list';
import { InventorySession } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const [sessions, locations] = await Promise.all([getSessions(), getLocations()]);
  return <HistoryList sessions={sessions as (InventorySession & { location_name: string; product_count?: number })[]} locations={locations} />;
}
