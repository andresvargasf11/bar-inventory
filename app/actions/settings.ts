'use server';

import { revalidatePath } from 'next/cache';
import { query, execute, setSetting } from '@/lib/db';
import { AppSettings } from '@/lib/types';

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as AppSettings;
}

export async function updateSettings(formData: FormData) {
  const timeout = formData.get('inactivity_timeout') as string;
  const unit = formData.get('default_unit') as string;
  const categories = formData.get('default_categories') as string;
  const reminderDays = formData.get('reminder_threshold') as string;

  if (timeout) await setSetting('inactivity_timeout', timeout);
  if (unit) await setSetting('default_unit', unit);
  if (categories) await setSetting('default_categories', categories);
  if (reminderDays) await setSetting('reminder_threshold', reminderDays);

  revalidatePath('/settings');
  return { success: true };
}

export async function resetInventoryData() {
  await execute('DELETE FROM inventory_counts');
  await execute('DELETE FROM inventory_sessions');
  revalidatePath('/');
  revalidatePath('/inventory');
  revalidatePath('/history');
  return { success: true };
}

export async function resetAllData() {
  await execute('DELETE FROM inventory_counts');
  await execute('DELETE FROM inventory_sessions');
  await execute('DELETE FROM product_custom_values');
  await execute('DELETE FROM custom_fields');
  await execute('DELETE FROM products');
  await execute('DELETE FROM storage_locations');
  await execute(
    "DELETE FROM app_settings WHERE key NOT IN ('pin_hash', 'setup_complete')"
  );
  revalidatePath('/');
  revalidatePath('/inventory');
  revalidatePath('/products');
  revalidatePath('/settings');
  return { success: true };
}
