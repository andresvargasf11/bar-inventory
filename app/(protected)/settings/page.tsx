import { getAppSettings } from '@/app/actions/settings';
import { getLocations } from '@/app/actions/locations';
import { getCustomFields } from '@/app/actions/products';
import { SettingsPanel } from '@/components/features/settings-panel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, locations, customFields] = await Promise.all([
    getAppSettings(),
    getLocations(),
    getCustomFields(),
  ]);

  return <SettingsPanel settings={settings} locations={locations} customFields={customFields} />;
}
