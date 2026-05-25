import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T[]> {
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

export async function execute(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<{ rowsAffected: number; lastInsertRowid: bigint | undefined }> {
  const db = getDb();
  const result = await db.execute({ sql, args });
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  };
}

export async function batch(
  statements: Array<{ sql: string; args?: (string | number | null | boolean)[] }>
) {
  const db = getDb();
  return db.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] }))
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()',
    [key, value]
  );
}
