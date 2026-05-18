// One-off: pulls every completed workflow_sessions row and writes a full
// markdown walkthrough to ../../BoVerse-Demo/_HISTORIC_WALKTHROUGH.md.
// Reads DATABASE_URL from landing/.env.local. Not committed.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: new URL('../.env.local', import.meta.url) });
import { Client } from 'pg';
import { writeFileSync } from 'node:fs';

const OUT_PATH = 'C:\\Users\\micha\\OneDrive\\Desktop\\BoVerse-Demo\\_HISTORIC_WALKTHROUGH.md';

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const r = await c.query(`
  select id, created_at, updated_at, current_stage,
         ingest_output, clarify_output, clarify_answers,
         simulate_output, generate_output
  from workflow_sessions
  where simulate_output is not null and generate_output is not null
  order by created_at asc
`);

const parts = [];
const log = (...args) => parts.push(args.join(''));

log('# BoVerse — Historic Workflow Sessions Walkthrough\n\n');
log('Pulled from `workflow_sessions` table in Supabase Postgres on 2026-05-18.  \n');
log('Three sessions reached Stage 04 with full data. Earlier sessions stopped at Stage 02/03 due to schema-validation bugs that have since been fixed.\n\n');
log('---\n\n');
log('## Index\n\n');
r.rows.forEach((s, i) => {
  const ts = s.created_at.toISOString().slice(0, 19).replace('T', ' ');
  log(`${i + 1}. Session \`${s.id.slice(0, 8)}\` — ${ts} UTC — stage=\`${s.current_stage}\`\n`);
});
log('\n---\n\n');

r.rows.forEach((s, i) => {
  const ts = s.created_at.toISOString().slice(0, 19).replace('T', ' ');
  log(`## Session ${i + 1}: \`${s.id}\`\n\n`);
  log(`- Started: ${ts} UTC\n`);
  log(`- Final stage: \`${s.current_stage}\`\n`);
  log(`- Schema fields: ${s.simulate_output?.schema?.length ?? 0}\n`);
  log(`- Synthetic rows: ${s.simulate_output?.rows?.length ?? 0} (${s.simulate_output?.rows?.filter(r => r.kind === 'happy').length ?? 0} happy + ${s.simulate_output?.rows?.filter(r => r.kind === 'edge').length ?? 0} edge)\n`);
  log(`- Generated steps: ${s.generate_output?.steps?.length ?? 0}\n`);
  log(`- RAG assets: ${s.generate_output?.rag_library?.length ?? 0}\n\n`);

  // ── Stage 01 ─────────────────────────────────────────────────
  log(`### Stage 01 INGEST — what the factory inferred\n\n`);
  if (s.ingest_output) {
    const ing = s.ingest_output;
    log(`- **Business type:** ${ing.inferred_business_type}\n`);
    log(`- **Process name:** ${ing.inferred_process_name}\n`);
    log(`- **Output goal:** ${ing.inferred_output_goal}\n\n`);
    log(`**Summary:** ${ing.summary}\n\n`);
    log(`**Inferred steps:**\n\n`);
    ing.inferred_steps?.forEach((step, j) =>
      log(`${j + 1}. \`${step.primitive}\` · ${step.step} · confidence=${(step.confidence * 100).toFixed(0)}%\n`)
    );
    log(`\n**Inferred rules:**\n\n`);
    ing.inferred_rules?.forEach(rule => log(`- ${rule}\n`));
    log(`\n**Knowledge assets needed:**\n\n`);
    ing.inferred_knowledge_assets?.forEach(asset => log(`- ${asset}\n`));
    log(`\n**Gaps:**\n\n`);
    ing.what_we_cannot_see?.forEach(gap => log(`- ${gap}\n`));
    log(`\n`);
  }

  // ── Stage 02 ─────────────────────────────────────────────────
  log(`### Stage 02 CLARIFY — questions + answers\n\n`);
  if (s.clarify_output?.questions) {
    const answerMap = new Map((s.clarify_answers?.answers ?? []).map(a => [a.id, a.answer]));
    s.clarify_output.questions.forEach((q, j) => {
      log(`**Q${j + 1}: ${q.question}**\n\n`);
      log(`- *Gap:* ${q.gap}\n`);
      log(`- *Why it matters:* ${q.why_this_matters}\n`);
      if (q.suggested_answer) log(`- *Suggested:* ${q.suggested_answer}\n`);
      const ans = answerMap.get(q.id);
      if (ans) log(`- **Answer given:** ${ans}\n`);
      log(`\n`);
    });
  }

  // ── Stage 03 — the simulated data ───────────────────────────
  log(`### Stage 03 SIMULATE — input schema + synthetic dataset\n\n`);
  if (s.simulate_output) {
    log(`**Input schema (${s.simulate_output.schema?.length ?? 0} fields):**\n\n`);
    log(`| Field | Type | Required | Description |\n`);
    log(`|---|---|---|---|\n`);
    s.simulate_output.schema?.forEach(f => {
      const typeStr = f.type === 'enum' && f.enum_values ? `enum(${f.enum_values.join(' \\| ')})` : f.type;
      log(`| \`${f.name}\` | ${typeStr} | ${f.required ? 'yes' : 'no'} | ${f.description} |\n`);
    });
    log(`\n**Synthetic rows (${s.simulate_output.rows?.length ?? 0} total):**\n\n`);
    s.simulate_output.rows?.forEach((row, j) => {
      const kindLabel = row.kind === 'edge' ? '🔴 EDGE' : '🟢 happy';
      log(`#### Row ${j + 1}: \`${row.row_id}\` — ${kindLabel}\n\n`);
      if (row.edge_case_description) log(`*Edge case being tested:* **${row.edge_case_description}**\n\n`);
      log(`\`\`\`json\n${JSON.stringify(row.data, null, 2)}\n\`\`\`\n\n`);
    });
  }

  // ── Stage 04 ─────────────────────────────────────────────────
  log(`### Stage 04 GENERATE — workflow definition\n\n`);
  if (s.generate_output) {
    log(`**${s.generate_output.workflow_name}**\n\n`);
    log(`${s.generate_output.workflow_description}\n\n`);
    log(`**Steps (${s.generate_output.steps?.length ?? 0}):**\n\n`);
    log(`| # | ID | Step | Primitive | Actor | Model | RAG |\n`);
    log(`|---|---|---|---|---|---|---|\n`);
    s.generate_output.steps?.forEach((step, j) => {
      const rag = (step.rag_assets && step.rag_assets.length) ? step.rag_assets.length : '—';
      log(`| ${j + 1} | \`${step.id}\` | ${step.name} | \`${step.primitive}\` | ${step.actor} | \`${step.model}\` | ${rag} |\n`);
    });
    log(`\n**Step details:**\n\n`);
    s.generate_output.steps?.forEach((step, j) => {
      log(`<details><summary><strong>${j + 1}. ${step.name}</strong> (\`${step.id}\`)</summary>\n\n`);
      log(`- **Rationale:** ${step.rationale}\n`);
      log(`- **Inputs:** ${step.inputs?.map(i => `\`${i}\``).join(', ') || '—'}\n`);
      log(`- **Outputs:** ${step.outputs?.map(o => `\`${o}\``).join(', ') || '—'}\n`);
      if (step.rag_assets?.length) log(`- **RAG assets:** ${step.rag_assets.map(a => `\`${a}\``).join(', ')}\n`);
      if (step.prompt) log(`\n**Prompt template:**\n\n\`\`\`\n${step.prompt}\n\`\`\`\n`);
      log(`\n</details>\n\n`);
    });
    log(`**RAG library (${s.generate_output.rag_library?.length ?? 0} assets):**\n\n`);
    s.generate_output.rag_library?.forEach((asset, j) =>
      log(`${j + 1}. \`${asset.asset_name}\` (${asset.asset_type}) — ${asset.description}\n`)
    );
    log(`\n`);
  }

  log(`---\n\n`);
});

// ── RAG audit ──────────────────────────────────────────────────
log(`## RAG assets in pgvector\n\n`);
const ragRows = await c.query(`
  select session_id, asset_name, asset_type, description,
         length(content) as content_len, (embedding is not null) as has_emb,
         created_at
  from rag_assets
  order by created_at asc
`);
log(`Total rows: ${ragRows.rows.length}  \n`);
log(`With embeddings: ${ragRows.rows.filter(r => r.has_emb).length}  \n\n`);
log(`Embeddings null because Gemini's free-tier embedding quota was burned on Stage 03 in each run. Retrieval falls back to ILIKE keyword match. Embeddings will populate on the next clean run when the per-minute quota window resets.\n\n`);
log(`| Session | Asset | Type | Content | Embedded |\n`);
log(`|---|---|---|---|---|\n`);
ragRows.rows.forEach(r => {
  log(`| \`${r.session_id.slice(0, 8)}\` | ${r.asset_name} | ${r.asset_type} | ${r.content_len}ch | ${r.has_emb ? '✓' : '—'} |\n`);
});

writeFileSync(OUT_PATH, parts.join(''), 'utf-8');
console.log(`Wrote ${OUT_PATH} (${parts.join('').length} chars, ${parts.length} blocks)`);
await c.end();
