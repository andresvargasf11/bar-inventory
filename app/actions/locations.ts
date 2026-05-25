'use server';

import { revalidatePath } from 'next/cache';
import { query, execute } from '@/lib/db';
import { StorageLocation } from '@/lib/types';

export async function getLocations(): Promise<StorageLocation[]> {
  return query<StorageLocation>(
    'SELECT * FROM storage_locations ORDER BY sort_order, name'
  );
}

export async function createLocation(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name?.trim()) return { error: 'Location name is required' };

  const rows = await query<{ max_order: number }>(
    'SELECT MAX(sort_order) as max_order FROM storage_locations'
  );
  const nextOrder = (rows[0]?.max_order ?? -1) + 1;

  try {
    await execute(
      'INSERT INTO storage_locations (name, sort_order) VALUES (?, ?)',
      [name.trim(), nextOrder]
    );
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return { error: 'A location with that name already exists' };
    }
    throw e;
  }

  revalidatePath('/settings');
  revalidatePath('/inventory');
  return { success: true };
}

export async function updateLocation(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name?.trim()) return { error: 'Location name is required' };

  try {
    await execute(
      'UPDATE storage_locations SET name=?, updated_at=unixepoch() WHERE id=?',
      [name.trim(), id]
    );
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return { error: 'A location with that name already exists' };
    }
    throw e;
  }

  revalidatePath('/settings');
  revalidatePath('/inventory');
  return { success: true };
}

export async function deleteLocation(id: number) {
  const sessions = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM inventory_sessions WHERE location_id=?',
    [id]
  );
  if ((sessions[0]?.count ?? 0) > 0) {
    return { error: 'Cannot delete a location that has inventory history. Remove all sessions first or reset data.' };
  }

  await execute('DELETE FROM storage_locations WHERE id=?', [id]);
  revalidatePath('/settings');
  revalidatePath('/inventory');
  return { success: true };
}
