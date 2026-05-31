import { getProducts } from '@/app/actions/products';
import { getLastCountsForLocation } from '@/app/actions/inventory';
import { getLocations } from '@/app/actions/locations';
import { InventoryCountForm } from '@/components/features/inventory-count-form';

export const dynamic = 'force-dynamic';

export default async function CountPage({
  searchParams,
}: {
  searchParams: { location?: string };
}) {
  const [products, locations] = await Promise.all([getProducts(), getLocations()]);
  const locationId = searchParams.location ? parseInt(searchParams.location, 10) : locations[0]?.id;
  const lastCounts = locationId ? await getLastCountsForLocation(locationId) : {};

  return (
    <InventoryCountForm
      key={locationId}
      products={products}
      locations={locations}
      selectedLocationId={locationId}
      lastCounts={lastCounts}
    />
  );
}
