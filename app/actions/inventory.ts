'use server';

import { revalidatePath } from 'next/cache';
import { query, execute } from '@/lib/db';
import { CurrentInventoryRow, InventorySession, SessionComparison, UsageReportRow } from '@/lib/types';
import { getInventoryStatus } from '@/lib/utils';

export async function getStorageLocations() {
  return query<{ id: number; name: string; sort_order: number }>(
    'SELECT * FROM storage_locations WHERE 1=1 ORDER BY sort_order, name'
  );
}

export async function getCurrentInventory(locationId?: number): Promise<CurrentInventoryRow[]> {
  if (locationId) {
    // For each product, get its count from the most recent session at this location
    const rows = await query<CurrentInventoryRow>(`
      SELECT
        p.id, p.name, p.category, p.unit, p.distributor,
        p.cost_per_unit, p.low_threshold, p.warning_threshold, p.sku,
        ic.quantity, ins.counted_at, ins.id as session_id,
        ins.location_id, sl.name as location_name
      FROM products p
      LEFT JOIN inventory_counts ic
        ON ic.product_id = p.id
        AND ic.session_id = (SELECT MAX(id) FROM inventory_sessions WHERE location_id = ?)
      LEFT JOIN inventory_sessions ins ON ins.id = ic.session_id
      LEFT JOIN storage_locations sl ON sl.id = ins.location_id
      WHERE p.is_active = 1
      ORDER BY p.category, p.name
    `, [locationId]);

    return rows.map((r) => ({
      ...r,
      status: getInventoryStatus(r.quantity, r.low_threshold, r.warning_threshold),
      total_value: (r.quantity ?? 0) * r.cost_per_unit,
    }));
  } else {
    // All locations: sum the most recent count per product per location
    const rows = await query<CurrentInventoryRow>(`
      SELECT
        p.id, p.name, p.category, p.unit, p.distributor,
        p.cost_per_unit, p.low_threshold, p.warning_threshold, p.sku,
        SUM(COALESCE(ic.quantity, 0)) as quantity,
        MAX(ins.counted_at) as counted_at,
        NULL as session_id, NULL as location_id, 'All Locations' as location_name
      FROM products p
      CROSS JOIN storage_locations sl
      LEFT JOIN inventory_counts ic
        ON ic.product_id = p.id
        AND ic.session_id = (SELECT MAX(id) FROM inventory_sessions WHERE location_id = sl.id)
      LEFT JOIN inventory_sessions ins ON ins.id = ic.session_id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.category, p.name
    `);

    return rows.map((r) => ({
      ...r,
      status: getInventoryStatus(r.quantity, r.low_threshold, r.warning_threshold),
      total_value: (r.quantity ?? 0) * r.cost_per_unit,
    }));
  }
}

export async function getLastCountsForLocation(locationId: number) {
  const rows = await query<{ product_id: number; quantity: number }>(`
    SELECT ic.product_id, ic.quantity
    FROM inventory_counts ic
    JOIN inventory_sessions ins ON ins.id = ic.session_id
    WHERE ins.location_id = ?
    AND ic.session_id = (
      SELECT MAX(id) FROM inventory_sessions WHERE location_id = ?
    )
  `, [locationId, locationId]);

  return Object.fromEntries(rows.map((r) => [r.product_id, r.quantity]));
}

export async function saveInventorySession(formData: FormData) {
  const locationId = parseInt(formData.get('location_id') as string, 10);
  const notes = (formData.get('notes') as string) || null;
  const countsJson = formData.get('counts') as string;

  if (!locationId) return { error: 'Location is required' };

  let counts: Record<string, number>;
  try {
    counts = JSON.parse(countsJson);
  } catch {
    return { error: 'Invalid counts data' };
  }

  const result = await execute(
    'INSERT INTO inventory_sessions (location_id, notes, counted_at) VALUES (?, ?, unixepoch())',
    [locationId, notes]
  );
  const sessionId = result.lastInsertRowid != null ? Number(result.lastInsertRowid) : null;
  if (!sessionId) return { error: 'Failed to create session' };

  for (const [productId, quantity] of Object.entries(counts)) {
    if (quantity === null || quantity === undefined) continue;
    await execute(
      'INSERT INTO inventory_counts (session_id, product_id, quantity) VALUES (?, ?, ?)',
      [sessionId, Number(productId), Number(quantity)]
    );
  }

  revalidatePath('/inventory');
  revalidatePath('/');
  return { success: true, sessionId };
}

export async function updateQuickQty(productId: number, locationId: number, qty: number) {
  // Find or create a session for today at this location
  const existing = await query<{ id: number }>(`
    SELECT id FROM inventory_sessions
    WHERE location_id = ?
    AND date(counted_at, 'unixepoch') = date('now')
    ORDER BY id DESC LIMIT 1
  `, [locationId]);

  let sessionId: number;
  if (existing[0]) {
    sessionId = existing[0].id;
  } else {
    const r = await execute(
      'INSERT INTO inventory_sessions (location_id, notes, counted_at) VALUES (?, ?, unixepoch())',
      [locationId, 'Quick edit']
    );
    sessionId = Number(r.lastInsertRowid);
  }

  await execute(
    `INSERT INTO inventory_counts (session_id, product_id, quantity) VALUES (?, ?, ?)
     ON CONFLICT(session_id, product_id) DO UPDATE SET quantity=excluded.quantity`,
    [sessionId, productId, qty]
  );

  revalidatePath('/inventory');
  return { success: true };
}

export async function getSessions(): Promise<InventorySession[]> {
  return query<InventorySession>(`
    SELECT ins.*, sl.name as location_name,
      COUNT(ic.id) as product_count
    FROM inventory_sessions ins
    JOIN storage_locations sl ON sl.id = ins.location_id
    LEFT JOIN inventory_counts ic ON ic.session_id = ins.id
    GROUP BY ins.id
    ORDER BY ins.counted_at DESC
  `);
}

export async function getSessionById(sessionId: number) {
  const session = await query<InventorySession & { location_name: string }>(`
    SELECT ins.*, sl.name as location_name
    FROM inventory_sessions ins
    JOIN storage_locations sl ON sl.id = ins.location_id
    WHERE ins.id = ?
  `, [sessionId]);

  if (!session[0]) return null;

  const counts = await query<{
    product_id: number;
    product_name: string;
    category: string;
    unit: string;
    cost_per_unit: number;
    quantity: number;
    notes: string | null;
  }>(`
    SELECT ic.product_id, p.name as product_name, p.category, p.unit, p.cost_per_unit,
      ic.quantity, ic.notes
    FROM inventory_counts ic
    JOIN products p ON p.id = ic.product_id
    WHERE ic.session_id = ?
    ORDER BY p.category, p.name
  `, [sessionId]);

  return { session: session[0], counts };
}

export async function compareSessions(
  sessionIdA: number,
  sessionIdB: number
): Promise<SessionComparison[]> {
  return query<SessionComparison>(`
    SELECT
      p.id as product_id, p.name as product_name, p.category, p.unit, p.cost_per_unit,
      a.quantity as qty_a, b.quantity as qty_b,
      COALESCE(b.quantity, 0) - COALESCE(a.quantity, 0) as delta
    FROM products p
    LEFT JOIN inventory_counts a ON a.product_id = p.id AND a.session_id = ?
    LEFT JOIN inventory_counts b ON b.product_id = p.id AND b.session_id = ?
    WHERE a.quantity IS NOT NULL OR b.quantity IS NOT NULL
    ORDER BY p.category, p.name
  `, [sessionIdA, sessionIdB]);
}

export async function getUsageReport(
  locationId: number,
  startDate: string,
  endDate: string
): Promise<UsageReportRow[]> {
  // Get all sessions in range
  const sessions = await query<{ id: number; counted_at: number }>(`
    SELECT id, counted_at FROM inventory_sessions
    WHERE location_id = ?
    AND date(counted_at, 'unixepoch') BETWEEN ? AND ?
    ORDER BY counted_at ASC
  `, [locationId, startDate, endDate]);

  if (sessions.length < 2) return [];

  // For each consecutive pair, calculate depletion (decrease = usage)
  const usageMap = new Map<number, { product_name: string; category: string; unit: string; cost_per_unit: number; total_used: number }>();

  for (let i = 0; i < sessions.length - 1; i++) {
    const comparison = await compareSessions(sessions[i].id, sessions[i + 1].id);
    for (const row of comparison) {
      if (!row.delta || row.delta >= 0) continue;
      const used = Math.abs(row.delta);
      const existing = usageMap.get(row.product_id);
      if (existing) {
        existing.total_used += used;
      } else {
        usageMap.set(row.product_id, {
          product_name: row.product_name,
          category: row.category,
          unit: row.unit,
          cost_per_unit: row.cost_per_unit,
          total_used: used,
        });
      }
    }
  }

  return Array.from(usageMap.entries()).map(([product_id, data]) => ({
    product_id,
    ...data,
    total_cost: data.total_used * data.cost_per_unit,
  })).sort((a, b) => b.total_cost - a.total_cost);
}

export async function getLowInventoryItems() {
  const rows = await query<{
    product_id: number;
    product_name: string;
    category: string;
    unit: string;
    distributor: string;
    location_id: number;
    location_name: string;
    quantity: number | null;
    low_threshold: number;
    warning_threshold: number;
  }>(`
    SELECT
      p.id as product_id, p.name as product_name, p.category, p.unit, p.distributor,
      sl.id as location_id, sl.name as location_name,
      ic.quantity, p.low_threshold, p.warning_threshold
    FROM products p
    CROSS JOIN storage_locations sl
    JOIN inventory_counts ic
      ON ic.product_id = p.id
      AND ic.session_id = (SELECT MAX(id) FROM inventory_sessions WHERE location_id = sl.id)
    WHERE p.is_active = 1
    AND p.warning_threshold > 0
    AND ic.quantity <= p.warning_threshold
    ORDER BY ic.quantity ASC, p.name
  `);

  return rows;
}

export async function getDashboardStats() {
  const [totalProducts] = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM products WHERE is_active = 1'
  );
  const [lastSession] = await query<{ counted_at: number; location_name: string }>(`
    SELECT ins.counted_at, sl.name as location_name
    FROM inventory_sessions ins
    JOIN storage_locations sl ON sl.id = ins.location_id
    ORDER BY ins.counted_at DESC LIMIT 1
  `);
  const totalValue = await query<{ total: number }>(`
    SELECT COALESCE(SUM(p.cost_per_unit * ic.quantity), 0) as total
    FROM products p
    CROSS JOIN storage_locations sl
    JOIN inventory_counts ic
      ON ic.product_id = p.id
      AND ic.session_id = (SELECT MAX(id) FROM inventory_sessions WHERE location_id = sl.id)
    WHERE p.is_active = 1
  `);

  const lowItems = await getLowInventoryItems();
  const locationSessions = await query<{ location_id: number; location_name: string; counted_at: number; product_count: number }>(`
    SELECT sub.location_id, sl.name as location_name, sub.counted_at,
      COUNT(ic.id) as product_count
    FROM (
      SELECT location_id, MAX(id) as session_id, MAX(counted_at) as counted_at
      FROM inventory_sessions
      GROUP BY location_id
    ) sub
    JOIN storage_locations sl ON sl.id = sub.location_id
    LEFT JOIN inventory_counts ic ON ic.session_id = sub.session_id
    GROUP BY sub.location_id
  `);

  return {
    totalProducts: totalProducts?.count ?? 0,
    lowCount: lowItems.filter((i) => i.quantity !== null && i.quantity <= i.low_threshold).length,
    warningCount: lowItems.filter(
      (i) => i.quantity !== null && i.quantity > i.low_threshold && i.quantity <= i.warning_threshold
    ).length,
    totalValue: totalValue[0]?.total ?? 0,
    lastSession,
    lowItems,
    locationSessions,
  };
}
