import { Suspense } from 'react';
import { getCurrentInventory } from '@/app/actions/inventory';
import { getLocations } from '@/app/actions/locations';
import { InventoryTable } from '@/components/features/inventory-table';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { location?: string };
}) {
  const locationId = searchParams.location ? parseInt(searchParams.location, 10) : undefined;
  const [inventory, locations] = await Promise.all([
    getCurrentInventory(locationId),
    getLocations(),
  ]);

  return (
    <Suspense fallback={<div className="text-slate-400">Loading…</div>}>
      <InventoryTable
        rows={inventory}
        locations={locations}
        selectedLocationId={locationId}
      />
    </Suspense>
  );
}
