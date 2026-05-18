// Stage 05 — DELIVER. Two responsibilities:
//   1. Emit a Markdown spec for the workflow (downloadable artifact).
//   2. Actually EXECUTE the workflow against the 10 synthetic rows. For each
//      (row, step) we call the LLM if model != deterministic, otherwise we
//      run a stub deterministic operation that produces realistic-looking
//      output. Results are streamed back as Server-Sent Events so the UI
//      can show live progress, and persisted to Postgres so they survive
//      a refresh.
//
// Real per-row execution is what the user picked in D4 (vs simulated trace).

import { generateText } from 'ai';
import { renderAgentSwarmPromptFromSession } from '@/lib/agent-swarm-prompt';
import { ensureLLMConfigured, fastModel } from '@/lib/llm';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import { searchRagAssets, type RagAssetHit } from '@/lib/rag';
import {
  GenerateOutputSchema,
  SimulateOutputSchema,
  type GenerateOutput,
  type SimulateOutput,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — per-row execution can run long.

export async function POST(req: Request) {
  const body = await req.json();
  const sessionId = body.session_id as string | undefined;
  const generate = GenerateOutputSchema.safeParse(body.generate_output);
  const simulate = SimulateOutputSchema.safeParse(body.simulate_output);

  if (!sessionId) return new Response('session_id required', { status: 400 });
  if (!generate.success || !simulate.success) {
    return new Response('invalid stage inputs', { status: 400 });
  }

  const spec = renderMarkdownSpec(generate.data, simulate.data);
  const swarmPrompt = renderAgentSwarmPromptFromSession(generate.data, simulate.data);

  // SSE stream so the UI can show live per-row progress.
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      send('spec', { workflow_spec_markdown: spec, agent_swarm_markdown: swarmPrompt });

      const llmAvailable = ensureLLMConfigured().ok;
      const totalSteps = generate.data.steps.length;
      let totalLlmCalls = 0;
      const startTime = Date.now();
      const perRowResults: Array<{
        row_id: string;
        kind: 'happy' | 'edge';
        status: 'success' | 'partial' | 'failure';
        step_results: Array<unknown>;
        total_duration_ms: number;
      }> = [];

      for (const row of simulate.data.rows) {
        const rowStart = Date.now();
        const stepResults: Array<unknown> = [];
        let rowStatus: 'success' | 'partial' | 'failure' = 'success';

        send('row_started', { row_id: row.row_id, kind: row.kind });

        for (let i = 0; i < totalSteps; i++) {
          const step = generate.data.steps[i];
          const stepStart = Date.now();
          send('step_started', {
            row_id: row.row_id,
            step_id: step.id,
            step_name: step.name,
            index: i,
            total: totalSteps,
          });

          try {
            const result = await executeStep(step, row, generate.data, llmAvailable, sessionId);
            if (result.usedLLM) totalLlmCalls++;

            const stepResult = {
              step_id: step.id,
              step_name: step.name,
              status: result.status,
              duration_ms: Date.now() - stepStart,
              output: result.output,
              trace_message: result.trace,
            };
            stepResults.push(stepResult);

            await persistStepExecution(sessionId, row, step, stepResult);
            send('step_finished', { row_id: row.row_id, ...stepResult });

            if (result.status === 'failure') rowStatus = 'failure';
            else if (result.status === 'gated_for_human' && rowStatus === 'success')
              rowStatus = 'partial';
          } catch (err) {
            rowStatus = 'failure';
            send('step_finished', {
              row_id: row.row_id,
              step_id: step.id,
              status: 'failure',
              duration_ms: Date.now() - stepStart,
              error: (err as Error).message,
              trace_message: `Step crashed: ${(err as Error).message}`,
            });
            break;
          }
        }

        perRowResults.push({
          row_id: row.row_id,
          kind: row.kind,
          status: rowStatus,
          step_results: stepResults,
          total_duration_ms: Date.now() - rowStart,
        });
        send('row_finished', { row_id: row.row_id, status: rowStatus });
      }

      const summary = {
        total_rows: perRowResults.length,
        happy_rows_passed: perRowResults.filter((r) => r.kind === 'happy' && r.status === 'success').length,
        edge_rows_caught: perRowResults.filter((r) => r.kind === 'edge' && r.status !== 'success').length,
        total_llm_calls: totalLlmCalls,
        total_duration_ms: Date.now() - startTime,
      };

      const deliverOutput = {
        workflow_spec_markdown: spec,
        execution_summary: summary,
        per_row_results: perRowResults,
      };

      await saveDeliverOutput(sessionId, deliverOutput);
      send('done', { summary });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

// ─── Per-step execution ──────────────────────────────────────────────────

async function executeStep(
  step: GenerateOutput['steps'][number],
  row: SimulateOutput['rows'][number],
  workflow: GenerateOutput,
  llmAvailable: boolean,
  sessionId: string
): Promise<{
  status: 'success' | 'failure' | 'gated_for_human' | 'skipped';
  output: unknown;
  trace: string;
  usedLLM: boolean;
  ragHits?: Array<{ asset_name: string; similarity: number }>;
}> {
  // Human-gated steps short-circuit in execution (we don't have a human in
  // the loop during the demo — we record that we'd pause here and continue).
  if (step.actor === 'human') {
    return {
      status: 'gated_for_human',
      output: { gate_reason: `Step ${step.id} requires human approval.` },
      trace: `Step ${step.id} (${step.name}) flagged for human review. In production this would route to a human queue.`,
      usedLLM: false,
    };
  }

  // RAG retrieval. If this step declared rag_assets, search pgvector for the
  // most semantically similar assets stored in the session's library. Use a
  // query built from the step's name + rationale + inputs (so retrieval keys
  // on what the step is *doing*, not just what it's called).
  let ragHits: RagAssetHit[] = [];
  const hasRagDeclared = Array.isArray(step.rag_assets) && step.rag_assets.length > 0;
  if (hasRagDeclared) {
    const ragQuery = `${step.name}\n${step.rationale ?? ''}\nInputs: ${step.inputs.join(', ')}`;
    try {
      ragHits = await searchRagAssets(sessionId, ragQuery, 3);
    } catch (err) {
      // RAG retrieval failures must not block step execution. Log and continue
      // with an empty hit list — the step still runs, just without retrieved
      // context.
      console.error('[05-deliver] RAG retrieval failed:', (err as Error).message);
    }
  }
  const ragSummary = ragHits.map((h) => ({ asset_name: h.asset_name, similarity: h.similarity }));
  const ragContextBlock = ragHits.length
    ? `\n\n## Retrieved knowledge (top ${ragHits.length} by similarity)\n\n${ragHits
        .map((h) => `### ${h.asset_name} (${h.asset_type}, sim=${h.similarity.toFixed(2)})\n${h.content}`)
        .join('\n\n')}`
    : '';

  // Deterministic steps: produce structured stub output so the trace narrative
  // looks real. In a full build these would be real adapters (lookups, math).
  if (step.model === 'deterministic') {
    const ragNote = ragHits.length
      ? ` RAG retrieved ${ragHits.length} asset(s): ${ragHits.map((h) => `${h.asset_name}(${h.similarity.toFixed(2)})`).join(', ')}.`
      : '';
    return {
      status: 'success',
      output: { ...deterministicStub(step, row), retrieved_assets: ragSummary },
      trace: `Step ${step.id} (${step.name}) executed deterministically. Inputs: ${step.inputs.join(', ')}. Outputs: ${step.outputs.join(', ')}.${ragNote}`,
      usedLLM: false,
      ragHits: ragSummary,
    };
  }

  // LLM steps. If no key, return a structured note so the run completes.
  if (!llmAvailable || !step.prompt) {
    return {
      status: 'success',
      output: { note: 'LLM step simulated — no LLM key configured or no prompt template.', retrieved_assets: ragSummary },
      trace: `Step ${step.id} (${step.name}) would invoke ${step.model} with the prompt template. (Configure GROQ_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to run for real.)`,
      usedLLM: false,
      ragHits: ragSummary,
    };
  }

  // Real LLM call. Substitute {{placeholders}} with row data, then append the
  // retrieved RAG context block so the model has the relevant assets in scope.
  // `row.data` is typed as `unknown` (the schema is open-shape per-process);
  // cast to a record for templating.
  const rowDataRec = (row.data ?? {}) as Record<string, unknown>;
  const prompt = renderPromptTemplate(step.prompt, rowDataRec) + ragContextBlock;
  const { text } = await generateText({
    model: fastModel(),
    messages: [
      {
        role: 'system',
        content: `You are executing step "${step.name}" in the "${workflow.workflow_name}" workflow. Respond with concise, structured output that downstream steps can consume.${ragHits.length ? ' Use the Retrieved knowledge block at the end of the user message to ground your response.' : ''}`,
      },
      { role: 'user', content: prompt },
    ],
  });

  const ragNote = ragHits.length
    ? ` Grounded on ${ragHits.length} retrieved asset(s): ${ragHits.map((h) => `${h.asset_name}(${h.similarity.toFixed(2)})`).join(', ')}.`
    : '';
  return {
    status: 'success',
    output: { response: text, retrieved_assets: ragSummary },
    trace: `Step ${step.id} (${step.name}) ran on ${step.model} with rendered prompt.${ragNote} Response: ${text.slice(0, 200)}${text.length > 200 ? '…' : ''}`,
    usedLLM: true,
    ragHits: ragSummary,
  };
}

function renderPromptTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? `<missing:${key}>`));
}

function deterministicStub(
  step: GenerateOutput['steps'][number],
  row: SimulateOutput['rows'][number]
): Record<string, unknown> {
  // Returns a tiny synthetic output keyed off the step's declared outputs.
  // Good enough to make the trace look like real workflow data flowing.
  const out: Record<string, unknown> = {};
  for (const fieldName of step.outputs) {
    out[fieldName] = `<${fieldName} computed from ${step.inputs.join('+')} for ${row.row_id}>`;
  }
  return out;
}

// ─── Markdown spec rendering ─────────────────────────────────────────────

function renderMarkdownSpec(generate: GenerateOutput, simulate: SimulateOutput): string {
  const lines: string[] = [];
  lines.push(`# ${generate.workflow_name}`, '');
  lines.push(generate.workflow_description, '');
  lines.push(`*Generated by BoVerse · ${new Date().toISOString().slice(0, 10)}*`, '');
  lines.push('---', '');

  lines.push('## Input schema', '');
  lines.push('| Field | Type | Required | Description |');
  lines.push('|---|---|---|---|');
  for (const f of simulate.schema) {
    const type = f.type === 'enum' ? `enum(${(f.enum_values ?? []).join(', ')})` : f.type;
    lines.push(`| \`${f.name}\` | ${type} | ${f.required ? 'yes' : 'no'} | ${f.description} |`);
  }
  lines.push('');

  lines.push('## Workflow steps', '');
  for (const step of generate.steps) {
    lines.push(`### ${step.id} — ${step.name}`, '');
    lines.push(`- **Primitive**: ${step.primitive}`);
    lines.push(`- **Actor**: ${step.actor}`);
    lines.push(`- **Model**: ${step.model}`);
    if (step.inputs.length) lines.push(`- **Inputs**: ${step.inputs.map((s) => `\`${s}\``).join(', ')}`);
    if (step.outputs.length) lines.push(`- **Outputs**: ${step.outputs.map((s) => `\`${s}\``).join(', ')}`);
    if (step.rag_assets?.length)
      lines.push(`- **RAG assets**: ${step.rag_assets.map((s) => `\`${s}\``).join(', ')}`);
    lines.push(`- **Why**: ${step.rationale}`);
    if (step.prompt) {
      lines.push('', '```text', step.prompt, '```');
    }
    lines.push('');
  }

  lines.push('## RAG library', '');
  for (const asset of generate.rag_library) {
    lines.push(`- **${asset.asset_name}** (${asset.asset_type}) — ${asset.description}`);
  }
  lines.push('');

  return lines.join('\n');
}

// Agent-swarm prompt markdown rendering lives in lib/agent-swarm-prompt.ts
// so the /sessions detail endpoint can re-render it for past sessions.

// ─── Persistence ─────────────────────────────────────────────────────────

async function persistStepExecution(
  sessionId: string,
  row: SimulateOutput['rows'][number],
  step: GenerateOutput['steps'][number],
  result: {
    status: 'success' | 'failure' | 'gated_for_human' | 'skipped';
    duration_ms: number;
    output: unknown;
    trace_message: string;
  }
) {
  if (sessionId.startsWith('local-')) return;
  if (!ensurePostgresConfigured().ok) return;
  await query(
    `insert into workflow_step_executions
       (session_id, synthetic_row_id, synthetic_row_kind, step_id, step_name,
        status, finished_at, duration_ms, output, trace_message)
     values ($1, $2, $3, $4, $5, $6, now(), $7, $8, $9)`,
    [
      sessionId,
      row.row_id,
      row.kind,
      step.id,
      step.name,
      result.status,
      result.duration_ms,
      JSON.stringify(result.output),
      result.trace_message,
    ]
  );
}

async function saveDeliverOutput(sessionId: string, output: unknown) {
  if (sessionId.startsWith('local-')) return;
  if (!ensurePostgresConfigured().ok) return;
  await query(
    `update workflow_sessions set deliver_output = $1, current_stage = 'complete' where id = $2`,
    [JSON.stringify(output), sessionId]
  );
}
