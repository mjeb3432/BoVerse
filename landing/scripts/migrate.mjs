// One-off migration runner. Uses the same `pg` client the app uses, so
// no extra dependencies and no psql installation needed.
//
// Run with:
//   cd landing
//   node scripts/migrate.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local first, then .env as fallback.
loadEnv({ path: join(__dirname, '..', '.env.local') });
loadEnv({ path: join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const migrationsDir = join(__dirname, '..', 'migrations');
const files = ['0001_workflow_sessions.sql'];

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Connected to ${new URL(process.env.DATABASE_URL).host}`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`  ✓ done`);
  }

  // Verify the tables exist.
  const result = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name like 'workflow_%'
     order by table_name`
  );
  console.log('\nTables present:');
  for (const row of result.rows) console.log(`  - ${row.table_name}`);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
