// Postgres connection. Uses node-postgres (pg) with a connection pool.
// Targets Supabase Postgres via the IPv4-compatible transaction pooler
// (port 6543). Connection string lives in DATABASE_URL.
//
// If DATABASE_URL is not set, helper functions return null/skip silently so
// the rest of the app falls back to sessionStorage-only persistence and the
// UI keeps working.

import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export const HAS_DATABASE = Boolean(process.env.DATABASE_URL);

// Global pool — Node caches the module so this only constructs once.
let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (!HAS_DATABASE) return null;
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Sensible defaults for Vercel serverless functions. The Supabase
    // pooler multiplexes connections so each lambda only needs a few.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Force SSL for any managed Postgres; harmless on self-hosted.
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  });
  pool.on('error', (err) => {
    // Background pool errors must not crash the server.
    console.error('[pg pool error]', err);
  });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T> | null> {
  const p = getPool();
  if (!p) return null;
  return p.query<T>(text, params);
}

export function ensurePostgresConfigured():
  | { ok: true }
  | { ok: false; reason: string } {
  if (!HAS_DATABASE) {
    return {
      ok: false,
      reason:
        'DATABASE_URL is not set. Add it to landing/.env.local with your Postgres connection string (postgresql://user:password@host:5432/db).',
    };
  }
  return { ok: true };
}
