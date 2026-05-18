// Stage 01 — INGEST. Accepts multipart/form-data with one or more files,
// extracts text from each, then runs the multimodal LLM (Gemini) to produce
// structured inference. Multimodal is REQUIRED here — PDFs and images are
// passed inline as image parts, and Groq (our text-only primary provider)
// can't read them.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import {
  ensureLLMConfigured,
  fastModel,
  multimodalModel,
} from '@/lib/llm';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import { parseFile } from '@/lib/file-parsers';
import {
  IngestOutputSchema,
  type IngestOutput,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a senior workflow architect at BoVerse. You read raw business artifacts (quotes, emails, spreadsheets, screenshots, PDFs) and reason BACKWARDS from the artifact to the embedded business process.

Your job is to extract:
1. The business type (industry, segment, scale)
2. The process name (what workflow these artifacts represent)
3. The output goal (what the workflow produces for the business)
4. The inferred inputs (what triggers / feeds the workflow)
5. The inferred steps with primitive classification (ingest / transform / validate / action / feedback) and confidence per step
6. The inferred business rules (margin logic, pricing rules, approval gates, etc.)
7. The inferred knowledge assets (price lists, rate cards, templates, etc.)
8. What you CANNOT see (gaps that need clarification)
9. A 2-3 sentence plain-English summary

Confidence scoring:
- 0.9+ = directly visible in the artifact
- 0.7-0.9 = strongly implied
- 0.5-0.7 = plausible inference
- <0.5 = guess (these items drive Stage 02 clarification)

Be precise. Be specific to the actual artifacts you were given. Do not invent details not supported by the source material.`;

export async function POST(req: Request) {
  const llmCfg = ensureLLMConfigured();
  if (!llmCfg.ok) {
    return NextResponse.json(
      { error: 'llm_not_configured', message: llmCfg.reason, mock: mockIngestOutput() },
      { status: 200 }
    );
  }

  const form = await req.formData();
  const sessionId = form.get('session_id');
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'no files uploaded' }, { status: 400 });
  }

  // Parse each file.
  const parsed = await Promise.all(
    files.map(async (file) => {
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await parseFile(buf, file.type, file.name);
      return { file, buf, result };
    })
  );

  // Build the multimodal prompt: text bits inline, image bits as image parts.
  const textBlocks: string[] = [];
  const imageParts: { type: 'image'; image: Buffer; mimeType: string }[] = [];

  for (const { file, buf, result } of parsed) {
    if (result.isImage) {
      imageParts.push({ type: 'image', image: buf, mimeType: file.type });
      textBlocks.push(`[image attached: ${file.name}, ${file.type}]`);
    } else if (result.text) {
      textBlocks.push(`### ${file.name} (${file.type})\n\n${result.text.slice(0, 50_000)}`);
    } else {
      textBlocks.push(`[unhandled binary file: ${file.name}]`);
    }
  }

  // Persist file references in Supabase storage if configured (best-effort).
  await persistArtifacts(sessionId, parsed);

  // Pick the model. If any inputs are images and we have a multimodal model
  // available, use it; otherwise route text through the primary (Groq).
  const needsMultimodal = imageParts.length > 0;
  const mmModel = multimodalModel();
  const modelToUse = needsMultimodal && mmModel ? mmModel : fastModel();

  // If user uploaded images but we don't have multimodal capability, the
  // image parts would be silently ignored. Surface that as a soft warning
  // in the response so the UI can show a note.
  const droppedImages = needsMultimodal && !mmModel;

  try {
    const { object } = await generateObject({
      model: modelToUse,
      schema: IngestOutputSchema,
      messages: [
        {
          role: 'user',
          content: needsMultimodal && mmModel
            ? [
                { type: 'text', text: SYSTEM_PROMPT },
                { type: 'text', text: textBlocks.join('\n\n---\n\n') },
                ...imageParts,
              ]
            : [
                {
                  type: 'text',
                  text: `${SYSTEM_PROMPT}\n\n${textBlocks.join('\n\n---\n\n')}${droppedImages ? '\n\n[NOTE: image inputs were dropped — Gemini key not configured]' : ''}`,
                },
              ],
      },
      ],
    });

    await saveStageOutput(sessionId, 'ingest_output', object, 'clarify');
    return NextResponse.json({
      output: object,
      ...(droppedImages ? { warning: 'Image inputs were dropped because no multimodal LLM (Gemini) key is configured. Text inputs were processed normally.' } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'llm_error', message: (err as Error).message },
      { status: 500 }
    );
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────

// Persist file metadata + a text preview to workflow_sessions (back-compat
// for the existing UI), PLUS the FULL extracted text to session_artifacts
// (one row per file) so the user can download the original inputs later via
// the /sessions browse page or the dump scripts.
async function persistArtifacts(
  sessionId: string,
  parsed: Array<{ file: File; buf: Buffer; result: { text: string | null; isImage?: boolean; meta: Record<string, unknown> } }>
) {
  if (sessionId.startsWith('local-')) return;
  if (!ensurePostgresConfigured().ok) return;

  // Preview blob on workflow_sessions (kept small for fast list queries).
  const uploaded = parsed.map(({ file, result }) => ({
    name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    extracted_text_preview: result.text?.slice(0, 1000) ?? null,
  }));
  await query(
    `update workflow_sessions set uploaded_files = $1 where id = $2`,
    [JSON.stringify(uploaded), sessionId]
  );

  // Full text + multimodal flag on session_artifacts (one row per file).
  // We don't store raw bytes — text artifacts get extracted_text, images
  // get extracted_text=null + was_multimodal=true (the multimodal model
  // read them directly, the bytes weren't kept).
  for (const { file, result } of parsed) {
    await query(
      `insert into session_artifacts (session_id, file_name, mime_type, size_bytes, extracted_text, was_multimodal)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        file.name,
        file.type,
        file.size,
        result.text ?? null,
        Boolean(result.isImage),
      ]
    );
  }
}

async function saveStageOutput(
  sessionId: string,
  column: 'ingest_output' | 'clarify_output' | 'simulate_output' | 'generate_output' | 'deliver_output',
  output: unknown,
  nextStage: string
) {
  if (sessionId.startsWith('local-')) return;
  if (!ensurePostgresConfigured().ok) return;
  // Column name is fixed by the type union above — safe to interpolate.
  await query(
    `update workflow_sessions set ${column} = $1, current_stage = $2 where id = $3`,
    [JSON.stringify(output), nextStage, sessionId]
  );
}

// Mock used when no LLM key is configured. Lets the UI work end-to-end.
function mockIngestOutput(): IngestOutput {
  return {
    inferred_business_type:
      'SMB · commercial electrical contractor · $8-12M revenue · 12 estimators',
    inferred_process_name: 'Inbound quote intake and pricing',
    inferred_output_goal:
      'A priced, scoped quote PDF sent back to the prospect within 48 hours of inquiry.',
    inferred_inputs: [
      'Inbound email or web-form inquiry',
      'Site visit notes (optional)',
      'Existing client history from ServiceTitan',
    ],
    inferred_steps: [
      { step: 'Inquiry capture', primitive: 'ingest', confidence: 0.95 },
      { step: 'Client history lookup', primitive: 'transform', confidence: 0.85 },
      { step: 'Scope extraction', primitive: 'transform', confidence: 0.75 },
      { step: 'Labour hour calculation', primitive: 'transform', confidence: 0.7 },
      { step: 'Senior estimator review', primitive: 'validate', confidence: 0.6 },
      { step: 'Quote PDF generation', primitive: 'action', confidence: 0.9 },
    ],
    inferred_rules: [
      'Heritage buildings get a 1.4x labour multiplier',
      'Jobs over $20K require senior estimator approval',
      'Repeat clients get a 5% loyalty discount',
    ],
    inferred_knowledge_assets: [
      'Hourly labour rate card (by trade)',
      'Materials cost lookup (Home Depot pro pricing)',
      'Past 12 months of quote-to-win ratios by job type',
    ],
    what_we_cannot_see: [
      'Exact pricing formula for ambiguous scope items',
      'How edge-case rules (e.g. heritage 1.4x) interact with discounts',
      'Volume thresholds for escalation routing',
    ],
    summary:
      'A commercial electrical contractor pricing inbound jobs. The estimator reads inquiries, applies tribal pricing rules with several documented exceptions, and routes complex jobs to a senior estimator for review. The output is a priced quote PDF sent within 48 hours.',
  };
}
