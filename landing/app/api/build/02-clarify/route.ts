// Stage 02 — CLARIFY. Reads the Stage 01 inference, identifies gaps
// (confidence < 0.7 items, what_we_cannot_see entries), and generates up to
// 5 targeted questions whose answers drive specific downstream decisions.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { ensureLLMConfigured, fastModel } from '@/lib/llm';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import {
  ClarifyOutputSchema,
  IngestOutputSchema,
  type ClarifyOutput,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a senior workflow architect at BoVerse. You just inferred a business process from a customer's artifacts. Now you need to ask up to 5 TARGETED questions to fill the most important gaps.

Rules:
- Maximum 5 questions. Quality over quantity.
- Each question must drive a SPECIFIC downstream decision (a rule, a threshold, a routing branch, a primitive choice).
- Prefer questions about rules, thresholds, exceptions, and edge cases. Avoid open-ended interviews.
- Skip questions whose answers you can already infer with confidence > 0.7.
- For each question, explain why it matters (what downstream decision it drives).
- If you can reasonably guess the answer, include a suggested_answer so the user can confirm with one click.

Be ruthless about the 5-question limit. Pick the highest-leverage gaps.`;

export async function POST(req: Request) {
  const llmCfg = ensureLLMConfigured();
  if (!llmCfg.ok) {
    return NextResponse.json({ output: mockClarifyOutput(), mock: true });
  }

  const body = await req.json();
  const sessionId = body.session_id as string | undefined;
  const ingestOutput = IngestOutputSchema.safeParse(body.ingest_output);
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  if (!ingestOutput.success) {
    return NextResponse.json(
      { error: 'invalid ingest_output', issues: ingestOutput.error.issues },
      { status: 400 }
    );
  }

  const { object } = await generateObject({
    model: fastModel(),
    schema: ClarifyOutputSchema,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Inferred process so far:\n\n\`\`\`json\n${JSON.stringify(ingestOutput.data, null, 2)}\n\`\`\`\n\nGenerate up to 5 targeted clarification questions.`,
      },
    ],
  });

  await saveStageOutput(sessionId, 'clarify_output', object, 'clarify');
  return NextResponse.json({ output: object });
}

async function saveStageOutput(
  sessionId: string,
  column: 'clarify_output',
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

// Save user answers (separate endpoint to make the round-trip explicit).
export async function PATCH(req: Request) {
  const body = await req.json();
  const sessionId = body.session_id as string | undefined;
  const answers = body.answers;
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  if (!sessionId.startsWith('local-') && ensurePostgresConfigured().ok) {
    await query(
      `update workflow_sessions set clarify_answers = $1, current_stage = 'simulate' where id = $2`,
      [JSON.stringify({ answers }), sessionId]
    );
  }
  return NextResponse.json({ ok: true });
}

function mockClarifyOutput(): ClarifyOutput {
  return {
    questions: [
      {
        id: 'q1',
        gap: 'Heritage multiplier vs loyalty discount interaction',
        question:
          'When a repeat client (5% loyalty discount) requests work on a heritage building (1.4x multiplier), do you apply both, or does one override the other?',
        why_this_matters:
          'Determines the order-of-operations in the pricing primitive. Affects ~8% of quotes.',
        suggested_answer: 'Apply both. Multiplier first, then discount on the final line.',
      },
      {
        id: 'q2',
        gap: 'Escalation threshold',
        question:
          'What is the exact dollar threshold above which a quote requires senior estimator review? Is it the same for all job types?',
        why_this_matters:
          'Drives the validate primitive gating logic. Wrong threshold = either too many escalations (bottleneck) or too few (margin leakage).',
        suggested_answer: '$20,000 for residential, $50,000 for commercial.',
      },
      {
        id: 'q3',
        gap: 'Ambiguous scope handling',
        question:
          'When a scope item is ambiguous (e.g. "rewire the kitchen" without panel info), do you assume a default scope or flag for clarification?',
        why_this_matters:
          'Determines whether ambiguous inputs short-circuit to a human gate or proceed with a documented assumption.',
      },
      {
        id: 'q4',
        gap: 'Labour rate exceptions',
        question:
          'Are there client categories that get non-standard labour rates (e.g. property management contracts, government work)?',
        why_this_matters:
          'Without this we cannot build a complete rate-lookup primitive. Edge cases will silently mis-price.',
      },
      {
        id: 'q5',
        gap: 'Quote PDF format requirements',
        question:
          'Is there a specific template or branding requirement for the quote PDF, or any required line items (e.g. payment terms, validity period)?',
        why_this_matters:
          'Drives the action primitive output format. Wrong format = manual rework on every quote.',
      },
    ],
  };
}
