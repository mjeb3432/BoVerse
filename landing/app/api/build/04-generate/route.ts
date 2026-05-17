// Stage 04 — GENERATE. Emits the full workflow spec: ordered steps tagged
// with primitive / actor / model / prompt / inputs / outputs / rag assets.
// This is the "deliverable" of the factory — the runnable workflow definition.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { ensureLLMConfigured, reasoningModel } from '@/lib/llm';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import {
  ClarifyAnswersSchema,
  GenerateOutputSchema,
  IngestOutputSchema,
  SimulateOutputSchema,
  type GenerateOutput,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior workflow architect at BoVerse. You have:
- An inferred business process
- The user's clarification answers
- An input schema and 10 synthetic test rows (7 happy + 3 edge cases)

Now you produce the FULL workflow definition. This is the runnable spec.

For each step, decide:
1. NAME (concrete, action-oriented, e.g. "Lookup labour rate for trade")
2. PRIMITIVE — exactly one of ingest / transform / validate / action / feedback
3. ACTOR — auto (deterministic or LLM, no human), human (gate), hybrid (LLM proposes, human approves)
4. MODEL — gemini-2.0-flash (fast/cheap), gemini-1.5-pro (reasoning), groq-llama-3.3-70b (fast text), or deterministic (no LLM needed)
5. PROMPT — if the step uses an LLM, write the actual prompt template (with {{placeholders}} for runtime inputs)
6. INPUTS — list of field names this step reads (from schema or prior step outputs)
7. OUTPUTS — list of new field names this step produces
8. RAG_ASSETS — names of any knowledge assets this step needs (price lists, rate cards, etc.)
9. RATIONALE — one sentence explaining why this step exists in the workflow

Subagent vs function rule:
- If the step needs LLM judgment (ambiguous inputs, free-text reasoning) → actor: auto + model: gemini/groq
- If the step is a deterministic transformation (lookup, calculation, format conversion) → actor: auto + model: deterministic
- If the step gates the workflow (approval, exception review) → actor: human or hybrid

Also produce a rag_library: the named knowledge assets this workflow needs to operate (each step's rag_assets entries should reference these by name).

Aim for 15-25 steps. Be specific to the actual business.`;

export async function POST(req: Request) {
  const llmCfg = ensureLLMConfigured();
  if (!llmCfg.ok) {
    return NextResponse.json({ output: mockGenerateOutput(), mock: true });
  }

  const body = await req.json();
  const sessionId = body.session_id as string | undefined;
  const ingest = IngestOutputSchema.safeParse(body.ingest_output);
  const answers = ClarifyAnswersSchema.safeParse(body.clarify_answers);
  const simulate = SimulateOutputSchema.safeParse(body.simulate_output);

  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  if (!ingest.success || !answers.success || !simulate.success) {
    return NextResponse.json({ error: 'invalid stage inputs' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: reasoningModel(),
      schema: GenerateOutputSchema,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Inferred process\n\n\`\`\`json\n${JSON.stringify(ingest.data, null, 2)}\n\`\`\`\n\n## Clarification answers\n\n\`\`\`json\n${JSON.stringify(answers.data, null, 2)}\n\`\`\`\n\n## Schema + synthetic data\n\n\`\`\`json\n${JSON.stringify(simulate.data, null, 2)}\n\`\`\`\n\nGenerate the full workflow definition.`,
        },
      ],
    });

    await saveStageOutput(sessionId, 'generate_output', object, 'deliver');
    return NextResponse.json({ output: object });
  } catch (err) {
    return NextResponse.json(
      { error: 'llm_error', message: (err as Error).message },
      { status: 500 }
    );
  }
}

async function saveStageOutput(
  sessionId: string,
  column: 'generate_output',
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

function mockGenerateOutput(): GenerateOutput {
  return {
    workflow_name: 'Apex Electrical · Inbound Quote Workflow v1',
    workflow_description:
      'Ingests inbound quote inquiries, applies tribal pricing rules, gates large or ambiguous jobs for senior estimator review, and emits a branded quote PDF.',
    steps: [
      {
        id: '1.1', name: 'Inquiry capture', primitive: 'ingest', actor: 'auto', model: 'deterministic',
        inputs: ['raw_inquiry'], outputs: ['inquiry_id', 'received_at', 'channel'],
        rationale: 'Normalize whatever channel the inquiry arrived through into a single shape.',
      },
      {
        id: '1.2', name: 'Client history lookup', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['client_name'], outputs: ['is_repeat_client', 'prior_quote_count', 'historical_win_rate'],
        rag_assets: ['ServiceTitan client history'],
        rationale: 'Determines whether loyalty discount applies and provides context for pricing strategy.',
      },
      {
        id: '2.1', name: 'Scope extraction', primitive: 'transform', actor: 'auto', model: 'gemini-2.0-flash',
        prompt: 'Extract the work scope items from this inquiry:\n\n{{scope_description}}\n\nReturn a list of {item, quantity, ambiguity_score}.',
        inputs: ['scope_description'], outputs: ['scope_items', 'ambiguity_flags'],
        rationale: 'Free-text scope must be decomposed into pricable line items.',
      },
      {
        id: '2.2', name: 'Ambiguity gate', primitive: 'validate', actor: 'hybrid', model: 'gemini-2.0-flash',
        prompt: 'For each scope item with ambiguity_score > 0.6, decide: clarify, assume_default, or escalate.',
        inputs: ['scope_items', 'ambiguity_flags'], outputs: ['ambiguity_resolutions', 'requires_human'],
        rationale: 'Ambiguous scope must be resolved before pricing; routes to human if unsure.',
      },
      {
        id: '3.1', name: 'Labour hour calculation', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['scope_items'], outputs: ['labour_hours_by_trade'],
        rag_assets: ['Labour hour estimation lookup table'],
        rationale: 'Maps scope items → trade-hours via lookup table.',
      },
      {
        id: '3.2', name: 'Materials costing', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['scope_items'], outputs: ['materials_cost'],
        rag_assets: ['Home Depot pro pricing'],
        rationale: 'Materials line items costed at current pro pricing.',
      },
      {
        id: '3.3', name: 'Apply labour rate', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['labour_hours_by_trade', 'client_category'], outputs: ['labour_cost_pre_multiplier'],
        rag_assets: ['Labour rate card (with client category exceptions)'],
        rationale: 'Trade-hours × hourly rate, with property-mgmt and government exceptions.',
      },
      {
        id: '3.4', name: 'Apply heritage multiplier', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['labour_cost_pre_multiplier', 'building_type'], outputs: ['labour_cost_post_multiplier'],
        rationale: 'Heritage buildings = 1.4x. Applied BEFORE loyalty discount per clarification answer.',
      },
      {
        id: '3.5', name: 'Apply loyalty discount', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['labour_cost_post_multiplier', 'materials_cost', 'is_repeat_client'], outputs: ['subtotal'],
        rationale: 'Repeat clients = 5% off the post-multiplier subtotal.',
      },
      {
        id: '3.6', name: 'Add margin + overhead', primitive: 'transform', actor: 'auto', model: 'deterministic',
        inputs: ['subtotal'], outputs: ['quote_total'],
        rag_assets: ['Margin policy by job type'],
        rationale: 'Standard margin + overhead applied per job type.',
      },
      {
        id: '4.1', name: 'Threshold check', primitive: 'validate', actor: 'auto', model: 'deterministic',
        inputs: ['quote_total', 'building_type'], outputs: ['requires_senior_review'],
        rationale: '$20K residential / $50K commercial trigger senior estimator review.',
      },
      {
        id: '4.2', name: 'Senior estimator review', primitive: 'validate', actor: 'human', model: 'deterministic',
        inputs: ['quote_total', 'scope_items', 'ambiguity_resolutions'], outputs: ['senior_approved', 'senior_notes'],
        rationale: 'Human gate for large or ambiguous quotes. Returns approval + any markup adjustments.',
      },
      {
        id: '5.1', name: 'Quote PDF generation', primitive: 'action', actor: 'auto', model: 'deterministic',
        inputs: ['quote_total', 'scope_items', 'client_name', 'senior_notes'], outputs: ['quote_pdf_path'],
        rag_assets: ['Quote PDF template'],
        rationale: 'Render branded PDF with payment terms + 30-day validity.',
      },
      {
        id: '5.2', name: 'Send quote email', primitive: 'action', actor: 'auto', model: 'deterministic',
        inputs: ['quote_pdf_path', 'client_email'], outputs: ['email_sent_at'],
        rationale: 'Deliver the PDF to the prospect within the 48-hour SLA.',
      },
      {
        id: '6.1', name: 'Track quote outcome', primitive: 'feedback', actor: 'auto', model: 'deterministic',
        inputs: ['inquiry_id'], outputs: ['outcome', 'won_at_or_lost_at'],
        rationale: 'Win/loss tracking feeds the historical_win_rate signal for future pricing.',
      },
    ],
    rag_library: [
      { asset_name: 'ServiceTitan client history', asset_type: 'database_lookup', description: 'Live ServiceTitan MCP for client history and ServiceTitan custom fields.' },
      { asset_name: 'Labour hour estimation lookup table', asset_type: 'spreadsheet', description: 'Tribal scope-to-hours table maintained by the estimating manager.' },
      { asset_name: 'Home Depot pro pricing', asset_type: 'live_feed', description: 'Materials pricing API (or scraped weekly).' },
      { asset_name: 'Labour rate card (with client category exceptions)', asset_type: 'spreadsheet', description: 'Standard rates + property mgmt and government exceptions.' },
      { asset_name: 'Margin policy by job type', asset_type: 'document', description: 'Margin and overhead percentages by job category.' },
      { asset_name: 'Quote PDF template', asset_type: 'template', description: 'Branded quote template with payment terms and validity.' },
    ],
  };
}
