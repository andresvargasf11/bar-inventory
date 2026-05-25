'use server';

import { revalidatePath } from 'next/cache';
import { query, execute } from '@/lib/db';
import { Product, CustomField } from '@/lib/types';

export async function getProducts(): Promise<Product[]> {
  return query<Product>(
    'SELECT * FROM products WHERE is_active = 1 ORDER BY category, name'
  );
}

export async function getAllProducts(): Promise<Product[]> {
  return query<Product>('SELECT * FROM products ORDER BY category, name');
}

export async function getProductById(id: number): Promise<Product | null> {
  const rows = await query<Product>('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function createProduct(formData: FormData) {
  const name = formData.get('name') as string;
  const category = (formData.get('category') as string) || '';
  const unit = (formData.get('unit') as string) || '';
  const distributor = (formData.get('distributor') as string) || '';
  const cost = parseFloat((formData.get('cost_per_unit') as string) || '0') || 0;
  const lowThreshold = parseFloat((formData.get('low_threshold') as string) || '0') || 0;
  const warningThreshold = parseFloat((formData.get('warning_threshold') as string) || '0') || 0;
  const sku = (formData.get('sku') as string) || '';

  if (!name?.trim()) return { error: 'Product name is required' };

  const result = await execute(
    `INSERT INTO products (name, category, unit, distributor, cost_per_unit, low_threshold, warning_threshold, sku)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), category, unit, distributor, cost, lowThreshold, warningThreshold, sku]
  );

  revalidatePath('/products');
  revalidatePath('/inventory');
  return { success: true, id: Number(result.lastInsertRowid) };
}

export async function updateProduct(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const category = (formData.get('category') as string) || '';
  const unit = (formData.get('unit') as string) || '';
  const distributor = (formData.get('distributor') as string) || '';
  const cost = parseFloat((formData.get('cost_per_unit') as string) || '0') || 0;
  const lowThreshold = parseFloat((formData.get('low_threshold') as string) || '0') || 0;
  const warningThreshold = parseFloat((formData.get('warning_threshold') as string) || '0') || 0;
  const sku = (formData.get('sku') as string) || '';

  if (!name?.trim()) return { error: 'Product name is required' };

  await execute(
    `UPDATE products SET name=?, category=?, unit=?, distributor=?, cost_per_unit=?,
     low_threshold=?, warning_threshold=?, sku=?, updated_at=unixepoch()
     WHERE id=?`,
    [name.trim(), category, unit, distributor, cost, lowThreshold, warningThreshold, sku, id]
  );

  revalidatePath('/products');
  revalidatePath('/inventory');
  return { success: true };
}

export async function deleteProduct(id: number) {
  await execute('UPDATE products SET is_active=0, updated_at=unixepoch() WHERE id=?', [id]);
  revalidatePath('/products');
  revalidatePath('/inventory');
  return { success: true };
}

export async function duplicateProduct(id: number) {
  const product = await getProductById(id);
  if (!product) return { error: 'Product not found' };

  const result = await execute(
    `INSERT INTO products (name, category, unit, distributor, cost_per_unit, low_threshold, warning_threshold, sku)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `${product.name} (Copy)`,
      product.category,
      product.unit,
      product.distributor,
      product.cost_per_unit,
      product.low_threshold,
      product.warning_threshold,
      '',
    ]
  );

  revalidatePath('/products');
  return { success: true, id: Number(result.lastInsertRowid) };
}

export async function updateThresholds(
  productId: number,
  lowThreshold: number,
  warningThreshold: number
) {
  await execute(
    'UPDATE products SET low_threshold=?, warning_threshold=?, updated_at=unixepoch() WHERE id=?',
    [lowThreshold, warningThreshold, productId]
  );
  revalidatePath('/inventory');
  return { success: true };
}

export async function batchImportProducts(
  rows: Array<{
    name: string;
    category: string;
    unit: string;
    distributor: string;
    cost_per_unit: number;
    low_threshold: number;
    warning_threshold: number;
    sku: string;
  }>
) {
  let imported = 0;
  for (const row of rows) {
    if (!row.name?.trim()) continue;
    await execute(
      `INSERT INTO products (name, category, unit, distributor, cost_per_unit, low_threshold, warning_threshold, sku)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.name.trim(),
        row.category || '',
        row.unit || '',
        row.distributor || '',
        Number(row.cost_per_unit) || 0,
        Number(row.low_threshold) || 0,
        Number(row.warning_threshold) || 0,
        row.sku || '',
      ]
    );
    imported++;
  }
  revalidatePath('/products');
  return { success: true, imported };
}

// Custom Fields
export async function getCustomFields(): Promise<CustomField[]> {
  return query<CustomField>(
    'SELECT * FROM custom_fields ORDER BY sort_order, id'
  );
}

export async function createCustomField(formData: FormData) {
  const name = formData.get('name') as string;
  const fieldType = formData.get('field_type') as string;
  const optionsRaw = formData.get('options') as string;

  if (!name?.trim()) return { error: 'Field name is required' };
  if (!['text', 'number', 'dropdown'].includes(fieldType)) return { error: 'Invalid field type' };

  const rows = await query<{ max_order: number }>(
    'SELECT MAX(sort_order) as max_order FROM custom_fields'
  );
  const nextOrder = (rows[0]?.max_order ?? -1) + 1;

  await execute(
    'INSERT INTO custom_fields (name, field_type, options, sort_order) VALUES (?, ?, ?, ?)',
    [name.trim(), fieldType, optionsRaw || null, nextOrder]
  );

  revalidatePath('/products');
  revalidatePath('/settings');
  return { success: true };
}

export async function deleteCustomField(id: number) {
  await execute('DELETE FROM custom_fields WHERE id=?', [id]);
  revalidatePath('/products');
  revalidatePath('/settings');
  return { success: true };
}

export async function getProductCustomValues(
  productId: number
): Promise<Record<number, string>> {
  const rows = await query<{ custom_field_id: number; value: string }>(
    'SELECT custom_field_id, value FROM product_custom_values WHERE product_id=?',
    [productId]
  );
  return Object.fromEntries(rows.map((r) => [r.custom_field_id, r.value]));
}

export async function saveProductCustomValues(
  productId: number,
  values: Record<number, string>
) {
  for (const [fieldId, value] of Object.entries(values)) {
    await execute(
      `INSERT INTO product_custom_values (product_id, custom_field_id, value) VALUES (?, ?, ?)
       ON CONFLICT(product_id, custom_field_id) DO UPDATE SET value=excluded.value`,
      [productId, Number(fieldId), value]
    );
  }
  return { success: true };
}
