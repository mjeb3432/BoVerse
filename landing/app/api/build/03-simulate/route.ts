// Stage 03 — SIMULATE. Generates input schema + ~10 synthetic rows
// (7 happy + 3 deliberate edge cases) for downstream execution.
//
// Provider fallback chain:
//   1. Cerebras gpt-oss-120b — FASTEST (~3-5s), no rate limit, but rejects
//      `minItems`/`maxItems` and empty-object schemas. Uses the LOOSE
//      LLM schema; row count is post-validated in code.
//   2. Groq gpt-oss-120b     — medium speed, no rate limit. Strict schema.
//   3. Gemini 2.5-flash      — slow + rate-limited but best at row counts.
//                              Strict schema. Save for last so we don't
//                              burn the 5-req/min quota early in the chain.
//
// KEY FIX (May 2026): The `data` field on each row was previously `z.unknown()`
// which compiles to `{}` (empty object schema). Cerebras strict mode rejected
// this with "Unsupported JSON schema fields in schema with keys: dict_keys([])".
// Now the LLM emits `data_json` as a JSON-stringified payload (z.string),
// and we parse it server-side before saving. Works on all three providers.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { cerebras } from '@ai-sdk/cerebras';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { HAS_CEREBRAS_KEY, HAS_GOOGLE_KEY, HAS_GROQ_KEY, ensureLLMConfigured } from '@/lib/llm';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import {
  ClarifyAnswersSchema,
  ClarifyOutputSchema,
  IngestOutputSchema,
  SimulateOutputLLMSchemaLoose,
  SimulateOutputLLMSchemaStrict,
  type SimulateOutput,
  type SyntheticRowLLMSchema,
} from '@/lib/workflow-types';
import type { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior workflow architect at BoVerse. Given an inferred business process and the user's clarification answers, you produce:

1. An INPUT SCHEMA — the fields a real batch of work would need. Each field has a name, type, description, required flag, and (if enum) the allowed values.
2. EXACTLY 10 SYNTHETIC ROWS — realistic test data shaped to the schema. EXACTLY 7 must be HAPPY PATH (typical cases that should flow through smoothly). EXACTLY 3 must be EDGE CASES designed to deliberately exercise the rules and exceptions surfaced during clarification.

YOU MUST EMIT 10 ROWS IN TOTAL. Not 3. Not 5. Ten. Seven happy + three edge. If you emit fewer the run is rejected. Count them before you finish.

For edge cases, populate the edge_case_description field with the specific failure mode being tested (e.g. "heritage multiplier collides with loyalty discount", "scope ambiguity should trigger human gate", "labour rate exception for property mgmt"). For happy rows, set edge_case_description to null.

CRITICAL FORMAT RULE for the row payload:
  The data_json field is a STRING containing a JSON-stringified object.
  It is NOT a raw JSON object. You must emit a STRING that, when parsed
  with JSON.parse, yields an object whose keys match the schema field
  names you defined above, with realistic specific values.

  Example shape (do not copy these values — generate realistic ones):
    "data_json": "{\\"inquiry_id\\":\\"INQ-001\\",\\"client_name\\":\\"Acme Co\\",\\"budget\\":35000}"

  Note the escaped quotes inside the string. Every key from your schema
  should appear in every row's data_json. Realistic, specific values —
  never empty objects, never generic placeholders like "John Doe" or
  "Test Co".`;

const MIN_USABLE_ROWS = 5;

type LLMRow = z.infer<typeof SyntheticRowLLMSchema>;
type LLMOutput = { schema: SimulateOutput['schema']; rows: LLMRow[] };

interface ProviderAttempt {
  name: string;
  run: () => Promise<LLMOutput>;
}

export async function POST(req: Request) {
  const llmCfg = ensureLLMConfigured();
  if (!llmCfg.ok) {
    return NextResponse.json({ output: mockSimulateOutput(), mock: true });
  }

  const body = await req.json();
  const sessionId = body.session_id as string | undefined;
  const ingest = IngestOutputSchema.safeParse(body.ingest_output);
  const clarify = ClarifyOutputSchema.safeParse(body.clarify_output);
  const answers = ClarifyAnswersSchema.safeParse(body.clarify_answers);

  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  if (!ingest.success || !clarify.success || !answers.success) {
    return NextResponse.json({ error: 'invalid stage inputs' }, { status: 400 });
  }

  const userMsg = `## Inferred process\n\n\`\`\`json\n${JSON.stringify(ingest.data, null, 2)}\n\`\`\`\n\n## Clarification\n\nQuestions:\n\`\`\`json\n${JSON.stringify(clarify.data, null, 2)}\n\`\`\`\n\nAnswers:\n\`\`\`json\n${JSON.stringify(answers.data, null, 2)}\n\`\`\`\n\nProduce the input schema and 10 synthetic rows (7 happy + 3 edge cases). Remember: data_json must be a JSON-stringified STRING, not a raw object.`;

  // Provider chain. Cerebras first for speed, Groq for capacity, Gemini last
  // because of its 5 RPM cap (and frequent "high demand" errors).
  const attempts: ProviderAttempt[] = [];

  if (HAS_CEREBRAS_KEY) {
    attempts.push({
      name: 'cerebras-gpt-oss-120b',
      run: async () => {
        const { object } = await generateObject({
          model: cerebras('gpt-oss-120b'),
          schema: SimulateOutputLLMSchemaLoose,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.3,
        });
        if (!object.rows || object.rows.length < MIN_USABLE_ROWS) {
          throw new Error(`Cerebras returned only ${object.rows?.length ?? 0} rows; need ≥${MIN_USABLE_ROWS}.`);
        }
        return object as LLMOutput;
      },
    });
  }

  if (HAS_GROQ_KEY) {
    attempts.push({
      name: 'groq-gpt-oss-120b',
      run: async () => {
        const { object } = await generateObject({
          model: groq('openai/gpt-oss-120b'),
          schema: SimulateOutputLLMSchemaStrict,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.3,
        });
        return object;
      },
    });
  }

  if (HAS_GOOGLE_KEY) {
    attempts.push({
      name: 'gemini-2.5-flash',
      run: async () => {
        const { object } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: SimulateOutputLLMSchemaStrict,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.3,
        });
        return object;
      },
    });
  }

  const errors: Array<{ provider: string; message: string; ms: number }> = [];
  for (const attempt of attempts) {
    const t0 = Date.now();
    try {
      const raw = await attempt.run();
      // Parse each row's data_json string into the canonical object shape.
      // If a row's data_json is malformed, skip that row rather than failing
      // the whole stage — partial data is still useful.
      const parsedRows: SimulateOutput['rows'] = [];
      const dropped: Array<{ row_id: string; reason: string }> = [];
      for (const row of raw.rows) {
        try {
          const data = JSON.parse(row.data_json) as Record<string, unknown>;
          parsedRows.push({
            row_id: row.row_id,
            kind: row.kind,
            edge_case_description: row.edge_case_description,
            data,
          });
        } catch (parseErr) {
          dropped.push({ row_id: row.row_id, reason: (parseErr as Error).message });
        }
      }

      if (parsedRows.length < MIN_USABLE_ROWS) {
        throw new Error(
          `${attempt.name} produced ${raw.rows.length} rows but only ${parsedRows.length} had valid data_json. Need ≥${MIN_USABLE_ROWS}.`
        );
      }

      const output: SimulateOutput = {
        schema: raw.schema,
        rows: parsedRows,
      };

      await saveStageOutput(sessionId, 'simulate_output', output, 'generate');
      return NextResponse.json({
        output,
        provider: attempt.name,
        provider_ms: Date.now() - t0,
        prior_attempts: errors,
        dropped_rows: dropped,
      });
    } catch (err) {
      errors.push({
        provider: attempt.name,
        message: (err as Error).message,
        ms: Date.now() - t0,
      });
      // Keep going — try the next provider.
    }
  }

  return NextResponse.json(
    {
      error: 'llm_error',
      message: `All ${errors.length} provider(s) failed for Stage 03. ${errors.map((e) => `[${e.provider} ${e.ms}ms] ${e.message.slice(0, 140)}`).join(' | ')}`,
      attempts: errors,
    },
    { status: 500 }
  );
}

async function saveStageOutput(
  sessionId: string,
  column: 'simulate_output',
  output: unknown,
  nextStage: string
) {
  if (sessionId.startsWith('local-')) return;
  if (!ensurePostgresConfigured().ok) return;
  await query(
    `update workflow_sessions set ${column} = $1, current_stage = $2 where id = $3`,
    [JSON.stringify(output), nextStage, sessionId]
  );
}

function mockSimulateOutput(): SimulateOutput {
  return {
    schema: [
      { name: 'inquiry_id', type: 'string', description: 'Unique inquiry identifier', required: true, enum_values: null },
      { name: 'client_name', type: 'string', description: 'Prospect or repeat client', required: true, enum_values: null },
      { name: 'is_repeat_client', type: 'boolean', description: 'Triggers loyalty discount', required: true, enum_values: null },
      { name: 'building_type', type: 'enum', description: 'Drives heritage multiplier', required: true, enum_values: ['residential', 'commercial', 'heritage'] },
      { name: 'scope_description', type: 'string', description: 'Free-text scope from inquiry', required: true, enum_values: null },
      { name: 'estimated_value', type: 'number', description: 'Initial value estimate', required: false, enum_values: null },
    ],
    rows: Array.from({ length: 10 }).map((_, i) => {
      const isEdge = i < 3;
      return {
        row_id: `row-${i + 1}`,
        kind: (isEdge ? 'edge' : 'happy') as 'edge' | 'happy',
        edge_case_description: isEdge
          ? [
              'Heritage building + repeat client (multiplier + discount interaction)',
              'Ambiguous scope ("rewire the kitchen") should trigger human gate',
              'Job value $22K crosses senior estimator threshold',
            ][i]
          : null,
        data: {
          inquiry_id: `INQ-2026-${String(1000 + i).padStart(4, '0')}`,
          client_name: ['Acme Corp', 'Bluebird Realty', 'Crystal Inn', 'Delta Construction', 'Evergreen Mgmt', 'Foundry Plaza', 'Garden Hotel', 'Heritage Square', 'Indigo Tower', 'Junction Mall'][i],
          is_repeat_client: [true, false, true, false, true, false, true, true, false, false][i],
          building_type: (['heritage', 'commercial', 'residential', 'commercial', 'residential', 'commercial', 'heritage', 'residential', 'commercial', 'residential'] as const)[i],
          scope_description: isEdge
            ? ['Heritage facade restoration with full rewire', 'Rewire the kitchen', 'Panel upgrade + 12 new circuits + EV charger'][i]
            : 'Standard tenant fit-out with code-compliant lighting and outlets',
          estimated_value: isEdge ? [45000, undefined, 22000][i] : [8500, 12000, 6500, 15000, 9000, 11500, 7800][i - 3],
        },
      };
    }),
  };
}
