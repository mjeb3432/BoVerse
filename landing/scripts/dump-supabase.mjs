// One-off: dumps the full bo-verse Postgres state to the desktop.
// Three files written:
//   _RAW_SUPABASE_DUMP.json  — everything, machine-readable
//   _SESSIONS_INVENTORY.md   — every session as a row in an inventory table
//   _HISTORIC_WALKTHROUGH.md — already exists; refreshed by this script too
//
// Reads DATABASE_URL from landing/.env.local. Not committed.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: new URL('../.env.local', import.meta.url) });
import { Client } from 'pg';
import { writeFileSync } from 'node:fs';

const DESKTOP = 'C:\\Users\\micha\\OneDrive\\Desktop\\BoVerse-Demo';

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
console.log('connected to', new URL(process.env.DATABASE_URL).host);

// ─── workflow_sessions: full rows, everything jsonb included ──────────
const sessions = await c.query(`
  select id, created_at, updated_at, current_stage,
         uploaded_files,
         ingest_output, clarify_output, clarify_answers,
         simulate_output, generate_output, deliver_output
  from workflow_sessions
  order by created_at asc
`);

// ─── rag_assets: don't dump the raw embedding vectors (too big, opaque) ─
const rag = await c.query(`
  select id, session_id, asset_name, asset_type, description, content,
         (embedding is not null) as has_embedding,
         created_at
  from rag_assets
  order by created_at asc
`);

// ─── schema info, for orientation ─────────────────────────────────────
const tables = await c.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`);
const extensions = await c.query(`
  select extname, extversion
  from pg_extension
  order by extname
`);

const dump = {
  pulled_at: new Date().toISOString(),
  database_host: new URL(process.env.DATABASE_URL).host,
  database_extensions: extensions.rows,
  public_tables: tables.rows.map((r) => r.table_name),
  workflow_sessions: {
    count: sessions.rows.length,
    rows: sessions.rows,
  },
  rag_assets: {
    count: rag.rows.length,
    with_embeddings: rag.rows.filter((r) => r.has_embedding).length,
    rows: rag.rows,
  },
};

// ── 1. raw JSON dump ─────────────────────────────────────────────────
writeFileSync(`${DESKTOP}\\_RAW_SUPABASE_DUMP.json`, JSON.stringify(dump, null, 2), 'utf-8');

// ── 2. inventory markdown — every session in a table ────────────────
const inv = [];
inv.push(`# BoVerse Supabase — Sessions Inventory\n\n`);
inv.push(`Pulled: ${dump.pulled_at}  \n`);
inv.push(`Host: \`${dump.database_host}\`  \n`);
inv.push(`Extensions: ${dump.database_extensions.map((e) => `\`${e.extname}@${e.extversion}\``).join(', ')}  \n`);
inv.push(`Public tables: ${dump.public_tables.map((t) => `\`${t}\``).join(', ')}\n\n`);

inv.push(`## All \`workflow_sessions\` rows (${sessions.rows.length})\n\n`);
inv.push(`| # | Session ID | Created | Stage | Files | 01 | 02 | 02ans | 03 | 04 | Schema | Rows | Steps | RAG |\n`);
inv.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`);
sessions.rows.forEach((s, i) => {
  const ts = s.created_at.toISOString().slice(0, 19).replace('T', ' ');
  const has = (x) => (x ? '✓' : '—');
  const arrLen = (jsonb, key) => (jsonb && Array.isArray(jsonb[key]) ? jsonb[key].length : 0);
  const fileCount = Array.isArray(s.uploaded_files) ? s.uploaded_files.length : 0;
  inv.push(
    `| ${i + 1} | \`${s.id.slice(0, 8)}\` | ${ts} | \`${s.current_stage}\` | ${fileCount} | ${has(s.ingest_output)} | ${has(s.clarify_output)} | ${has(s.clarify_answers)} | ${has(s.simulate_output)} | ${has(s.generate_output)} | ${arrLen(s.simulate_output, 'schema')} | ${arrLen(s.simulate_output, 'rows')} | ${arrLen(s.generate_output, 'steps')} | ${arrLen(s.generate_output, 'rag_library')} |\n`
  );
});

inv.push(`\n## All \`rag_assets\` rows (${rag.rows.length})\n\n`);
inv.push(`With embeddings: ${dump.rag_assets.with_embeddings} / ${rag.rows.length}\n\n`);
inv.push(`| # | Session | Asset | Type | Description | Content size | Embedded | Created |\n`);
inv.push(`|---|---|---|---|---|---|---|---|\n`);
rag.rows.forEach((r, i) => {
  const ts = r.created_at.toISOString().slice(0, 19).replace('T', ' ');
  const desc = r.description.length > 80 ? r.description.slice(0, 80) + '…' : r.description;
  inv.push(
    `| ${i + 1} | \`${r.session_id?.slice(0, 8) ?? '—'}\` | ${r.asset_name} | ${r.asset_type} | ${desc} | ${r.content?.length ?? 0}ch | ${r.has_embedding ? '✓' : '—'} | ${ts} |\n`
  );
});

writeFileSync(`${DESKTOP}\\_SESSIONS_INVENTORY.md`, inv.join(''), 'utf-8');

console.log(`Wrote:`);
console.log(`  ${DESKTOP}\\_RAW_SUPABASE_DUMP.json (${JSON.stringify(dump).length} chars, ${sessions.rows.length} sessions + ${rag.rows.length} rag rows)`);
console.log(`  ${DESKTOP}\\_SESSIONS_INVENTORY.md`);

await c.end();
