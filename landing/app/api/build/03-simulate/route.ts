// Stage 03 — SIMULATE. Generates input schema + 10 synthetic data rows
// (7 happy path + 3 deliberate edge cases) for downstream execution.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { ensureLLMConfigured, fastModel } from '@/lib/llm';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import {
  ClarifyAnswersSchema,
  ClarifyOutputSchema,
  IngestOutputSchema,
  SimulateOutputSchema,
  type SimulateOutput,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 60s is the Hobby-tier Vercel ceiling. Stage 03's prompt is large (full
// stage 01 output + 5 questions + 5 answers) and asks Gemini to emit a
// 10-row dataset that conforms to a strict Zod schema — slowest stage in
// the pipeline.
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior workflow architect at BoVerse. Given an inferred business process and the user's clarification answers, you produce:

1. An INPUT SCHEMA — the fields a real batch of work would need. Each field has a name, type, description, required flag, and (if enum) the allowed values.
2. 10 SYNTHETIC ROWS — realistic test data shaped to the schema. Exactly 7 must be HAPPY PATH (typical cases that should flow through smoothly). Exactly 3 must be EDGE CASES designed to deliberately exercise the rules and exceptions surfaced during clarification.

For edge cases, populate the edge_case_description field with the specific failure mode being tested (e.g. "heritage multiplier collides with loyalty discount", "scope ambiguity should trigger human gate", "labour rate exception for property mgmt").

Synthetic data must be plausible, specific, and grounded in the inferred business context. Avoid generic placeholders like "John Doe" or "Test Co".`;

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

  try {
    const { object } = await generateObject({
      model: fastModel(),
      schema: SimulateOutputSchema,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Inferred process\n\n\`\`\`json\n${JSON.stringify(ingest.data, null, 2)}\n\`\`\`\n\n## Clarification\n\nQuestions:\n\`\`\`json\n${JSON.stringify(clarify.data, null, 2)}\n\`\`\`\n\nAnswers:\n\`\`\`json\n${JSON.stringify(answers.data, null, 2)}\n\`\`\`\n\nProduce the input schema and 10 synthetic rows (7 happy + 3 edge cases).`,
        },
      ],
    });

    await saveStageOutput(sessionId, 'simulate_output', object, 'generate');
    return NextResponse.json({ output: object });
  } catch (err) {
    // Always return JSON — the client uses .json() and will crash on HTML
    // error pages (e.g. Vercel function timeout returns an HTML response).
    return NextResponse.json(
      { error: 'llm_error', message: (err as Error).message },
      { status: 500 }
    );
  }
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
