// Extract the OUTPUT data from Supabase — just the LLM-generated payloads
// from workflow_sessions, with no metadata wrapping. One subfolder per
// session, one JSON file per stage. Plus a flat CSV of all synthetic rows
// across all sessions for easy spreadsheet review.
//
// Reads DATABASE_URL from landing/.env.local. Writes to
// C:\Users\micha\OneDrive\Desktop\BoVerse-Demo\outputs\.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: new URL('../.env.local', import.meta.url) });
import { Client } from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = 'C:\\Users\\micha\\OneDrive\\Desktop\\BoVerse-Demo\\outputs';

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

// Only sessions that actually have output payloads.
const sessions = await c.query(`
  select id, created_at, current_stage,
         ingest_output, clarify_output, clarify_answers,
         simulate_output, generate_output, deliver_output
  from workflow_sessions
  where ingest_output is not null
     or clarify_output is not null
     or simulate_output is not null
     or generate_output is not null
     or deliver_output is not null
  order by created_at asc
`);

mkdirSync(ROOT, { recursive: true });

// Track flat row data for the master CSV.
const csvRows = [];
csvRows.push(['session_id', 'session_started_at', 'workflow_name', 'row_id', 'kind', 'edge_case_description', 'data_json']);

let totalFiles = 0;
const manifest = [];

for (const s of sessions.rows) {
  const sid = s.id;
  const shortId = sid.slice(0, 8);
  const ts = s.created_at.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const dir = `${ROOT}\\${ts}__${shortId}`;
  mkdirSync(dir, { recursive: true });
  const sessionManifest = { session_id: sid, created_at: s.created_at.toISOString(), stage: s.current_stage, files: [] };

  const stages = [
    ['stage-01-ingest_output.json', s.ingest_output],
    ['stage-02-clarify_output.json', s.clarify_output],
    ['stage-02-clarify_answers.json', s.clarify_answers],
    ['stage-03-simulate_output.json', s.simulate_output],
    ['stage-04-generate_output.json', s.generate_output],
    ['stage-05-deliver_output.json', s.deliver_output],
  ];

  for (const [filename, payload] of stages) {
    if (payload === null || payload === undefined) continue;
    const path = `${dir}\\${filename}`;
    writeFileSync(path, JSON.stringify(payload, null, 2), 'utf-8');
    sessionManifest.files.push(filename);
    totalFiles++;
  }

  manifest.push(sessionManifest);

  // Flat CSV of synthetic rows.
  if (s.simulate_output?.rows) {
    const workflowName = s.generate_output?.workflow_name ?? '';
    for (const row of s.simulate_output.rows) {
      csvRows.push([
        sid,
        s.created_at.toISOString(),
        workflowName,
        row.row_id ?? '',
        row.kind ?? '',
        row.edge_case_description ?? '',
        JSON.stringify(row.data ?? {}),
      ]);
    }
  }
}

// Write the synthetic-rows CSV.
const csv = csvRows
  .map((r) =>
    r
      .map((v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(',')
  )
  .join('\n');
writeFileSync(`${ROOT}\\_ALL_SYNTHETIC_ROWS.csv`, csv, 'utf-8');

// Write a manifest.
writeFileSync(`${ROOT}\\_MANIFEST.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  database_host: new URL(process.env.DATABASE_URL).host,
  total_sessions: manifest.length,
  total_output_files: totalFiles,
  total_synthetic_rows: csvRows.length - 1,
  sessions: manifest,
}, null, 2), 'utf-8');

console.log(`Wrote ${totalFiles} stage output files across ${manifest.length} sessions`);
console.log(`Wrote ${csvRows.length - 1} synthetic rows to _ALL_SYNTHETIC_ROWS.csv`);
console.log(`Root: ${ROOT}`);

await c.end();
