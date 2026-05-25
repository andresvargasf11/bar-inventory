import { getLowInventoryItems } from '@/app/actions/inventory';
import { OrderListView } from '@/components/features/order-list';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const items = await getLowInventoryItems();
  return <OrderListView items={items} />;
}
