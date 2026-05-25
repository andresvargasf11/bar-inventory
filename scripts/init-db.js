#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:./dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  distributor TEXT NOT NULL DEFAULT '',
  cost_per_unit REAL NOT NULL DEFAULT 0,
  low_threshold REAL NOT NULL DEFAULT 0,
  warning_threshold REAL NOT NULL DEFAULT 0,
  sku TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS custom_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'dropdown')),
  options TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS product_custom_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_field_id INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE(product_id, custom_field_id)
);

CREATE TABLE IF NOT EXISTS inventory_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES storage_locations(id),
  notes TEXT,
  counted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS inventory_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(session_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_distributor ON products(distributor);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_sessions_location ON inventory_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sessions_counted_at ON inventory_sessions(counted_at);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_session ON inventory_counts(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_product ON inventory_counts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_custom_values_product ON product_custom_values(product_id);
`;

const SEED_SETTINGS = [
  ['inactivity_timeout', '30'],
  ['default_unit', '750ml'],
  ['default_categories', 'Spirits,Beer,Wine,Liqueur,Mixer,Garnish,Supplies'],
  ['reminder_threshold', '7'],
  ['setup_complete', '0'],
];

const SEED_LOCATIONS = [
  ['Back Bar', 0],
  ['Walk-in Cooler', 1],
];

const SEED_PRODUCTS = [
  ["Tito's Handmade Vodka", 'Spirits', '750ml', "Glazer's Distributors", 18.50, 2, 4, 'TITOS750'],
  ["Jack Daniel's Whiskey", 'Spirits', '750ml', 'Southern Wine & Spirits', 22.00, 2, 4, 'JACKD750'],
  ["Hendrick's Gin", 'Spirits', '750ml', 'Republic National Dist.', 28.00, 1, 3, 'HNDCK750'],
  ['Patron Silver Tequila', 'Spirits', '750ml', 'Southern Wine & Spirits', 35.00, 1, 3, 'PATRN750'],
  ['Bacardi Superior Rum', 'Spirits', '750ml', "Glazer's Distributors", 12.00, 2, 5, 'BCRD750'],
  ['Tanqueray Gin', 'Spirits', '750ml', 'Diageo Distributors', 16.00, 2, 4, 'TANQ750'],
  ['Blue Moon Belgian White', 'Beer', 'Case/24', 'MillerCoors Dist.', 24.00, 1, 3, 'BMOON24'],
  ['Corona Extra', 'Beer', 'Case/24', 'Crown Imports', 22.00, 2, 5, 'CORONA24'],
  ['House Cabernet Sauvignon', 'Wine', '750ml', 'Republic National Dist.', 14.00, 3, 6, 'HCAB750'],
  ['Cointreau Orange Liqueur', 'Liqueur', '750ml', 'Moët Hennessy USA', 32.00, 1, 2, 'COIN750'],
];

// Sample counts: [product_index (0-based), location_index (1-based), quantity]
// Some products are low/warning for demo purposes
const SAMPLE_COUNTS_LOC1 = [
  [1, 1, 5],   // Tito's - good
  [2, 1, 1],   // Jack Daniels - LOW (threshold 2)
  [3, 1, 2],   // Hendrick's - warning (threshold 1, warning 3)
  [4, 1, 3],   // Patron - good
  [5, 1, 1],   // Bacardi - LOW
  [6, 1, 4],   // Tanqueray - good
  [7, 1, 2],   // Blue Moon - warning
  [8, 1, 6],   // Corona - good
  [9, 1, 4],   // Cab - good
  [10, 1, 1],  // Cointreau - LOW
];

const SAMPLE_COUNTS_LOC2 = [
  [1, 2, 12],
  [7, 2, 2],   // Blue Moon - warning in cooler
  [8, 2, 3],   // Corona - low in cooler
  [9, 2, 8],
];

async function runSchema() {
  const statements = SCHEMA.trim().split(';').map(s => s.trim()).filter(Boolean);
  for (const sql of statements) {
    await client.execute(sql);
  }
  console.log('✓ Schema created');
}

async function seedData() {
  // Settings
  for (const [key, value] of SEED_SETTINGS) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
      args: [key, value],
    });
  }
  console.log('✓ Settings seeded');

  // Locations
  let loc1Id, loc2Id;
  for (const [name, sortOrder] of SEED_LOCATIONS) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO storage_locations (name, sort_order) VALUES (?, ?)',
      args: [name, sortOrder],
    });
  }
  const locs = await client.execute('SELECT id, name FROM storage_locations ORDER BY sort_order');
  loc1Id = locs.rows[0].id;
  loc2Id = locs.rows[1].id;
  console.log('✓ Locations seeded');

  // Products
  for (const [name, category, unit, distributor, cost, low, warning, sku] of SEED_PRODUCTS) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO products (name, category, unit, distributor, cost_per_unit, low_threshold, warning_threshold, sku)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name, category, unit, distributor, cost, low, warning, sku],
    });
  }
  const prods = await client.execute('SELECT id FROM products ORDER BY id');
  console.log('✓ Products seeded');

  // Inventory sessions (one per location, ~3 days ago and today)
  const now = Math.floor(Date.now() / 1000);
  const threeDaysAgo = now - 3 * 24 * 3600;

  // Session 1 - 3 days ago for Back Bar
  const s1 = await client.execute({
    sql: 'INSERT INTO inventory_sessions (location_id, notes, counted_at) VALUES (?, ?, ?)',
    args: [loc1Id, 'Opening count', threeDaysAgo],
  });
  const session1Id = Number(s1.lastInsertRowid);

  // Seed older counts for session 1 (higher quantities to show depletion)
  const olderCounts = [
    [prods.rows[0].id, 8],
    [prods.rows[1].id, 4],
    [prods.rows[2].id, 3],
    [prods.rows[3].id, 5],
    [prods.rows[4].id, 4],
    [prods.rows[5].id, 6],
    [prods.rows[6].id, 3],
    [prods.rows[7].id, 8],
    [prods.rows[8].id, 6],
    [prods.rows[9].id, 3],
  ];
  for (const [productId, qty] of olderCounts) {
    await client.execute({
      sql: 'INSERT INTO inventory_counts (session_id, product_id, quantity) VALUES (?, ?, ?)',
      args: [session1Id, productId, qty],
    });
  }

  // Session 2 - today for Back Bar (current counts - some low)
  const s2 = await client.execute({
    sql: 'INSERT INTO inventory_sessions (location_id, notes, counted_at) VALUES (?, ?, ?)',
    args: [loc1Id, 'Weekly count', now],
  });
  const session2Id = Number(s2.lastInsertRowid);

  for (const [, , qty] of SAMPLE_COUNTS_LOC1) {
    const idx = SAMPLE_COUNTS_LOC1.indexOf([SAMPLE_COUNTS_LOC1.find(c => c[2] === qty)].flat());
  }
  for (const [productIdx, , qty] of SAMPLE_COUNTS_LOC1) {
    const productId = prods.rows[productIdx - 1].id;
    await client.execute({
      sql: 'INSERT INTO inventory_counts (session_id, product_id, quantity) VALUES (?, ?, ?)',
      args: [session2Id, productId, qty],
    });
  }

  // Session 3 - today for Walk-in Cooler
  const s3 = await client.execute({
    sql: 'INSERT INTO inventory_sessions (location_id, notes, counted_at) VALUES (?, ?, ?)',
    args: [loc2Id, 'Cooler count', now],
  });
  const session3Id = Number(s3.lastInsertRowid);

  for (const [productIdx, , qty] of SAMPLE_COUNTS_LOC2) {
    const productId = prods.rows[productIdx - 1].id;
    await client.execute({
      sql: 'INSERT INTO inventory_counts (session_id, product_id, quantity) VALUES (?, ?, ?)',
      args: [session3Id, productId, qty],
    });
  }

  console.log('✓ Sample inventory data seeded');
}

async function main() {
  console.log('Initializing database...');
  console.log(`URL: ${process.env.TURSO_DATABASE_URL ?? 'file:./dev.db'}`);

  try {
    await runSchema();
    await seedData();
    console.log('\n✅ Database initialized successfully!');
    console.log('\nNext steps:');
    console.log('  1. npm run dev');
    console.log('  2. Visit http://localhost:3000');
    console.log('  3. Set your PIN on first launch');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
