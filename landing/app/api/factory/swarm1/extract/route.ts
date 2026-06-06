// Swarm 1 · EXTRACT (corpus lifecycle steps 2-4).
// Accepts multipart/form-data (an optional stated outcome + uploaded evidence),
// runs registry-guided LLM extraction, and writes the CANONICAL STORE — typed,
// provenance-tracked facts. This is the one probabilistic step; everything
// downstream is deterministic over these rows.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { ensureLLMConfigured, fastModel, multimodalModel } from '@/lib/llm';
import { HAS_DATABASE, query } from '@/lib/postgres';
import { parseFile } from '@/lib/file-parsers';
import {
  ensureSession,
  newWorkflowId,
  saveCanonical,
  setSessionStage,
  validateInvariants,
} from '@/lib/canonical';
import {
  ExtractionEnvelopeSchema,
  extractionSystemPrompt,
  mapExtractionToStore,
  type ExtractionEnvelope,
  type SetupIntake,
} from '@/lib/registry';
import { upsertRagAssets } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const llm = ensureLLMConfigured();
  if (!llm.ok) {
    return NextResponse.json({ error: 'llm_not_configured', message: llm.reason }, { status: 200 });
  }

  const form = await req.formData();
  const outcome = typeof form.get('outcome') === 'string' ? (form.get('outcome') as string) : null;
  const providedSession = typeof form.get('session_id') === 'string' ? (form.get('session_id') as string) : null;
  // Optional pre-upload Setup — four plain-English answers that anchor
  // discovery (source system, desired output, destination, connection
  // notes / sign-off contact). Free-text by design so non-technical users
  // can describe their stack however they like; the LLM uses these as
  // additional grounding alongside the stated outcome.
  const setupIntake = parseSetupIntake(form.get('setup_intake'));
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'no_files', message: 'Upload at least one evidence file.' }, { status: 400 });
  }

  // Parse each file → text blocks + inline image parts.
  const parsed = await Promise.all(
    files.map(async (file) => {
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await parseFile(buf, file.type, file.name);
      return { file, buf, result };
    }),
  );

  const textBlocks: string[] = [];
  const imageParts: { type: 'image'; image: Buffer; mimeType: string }[] = [];
  for (const { file, buf, result } of parsed) {
    if (result.isImage) {
      imageParts.push({ type: 'image', image: buf, mimeType: file.type || 'image/png' });
      textBlocks.push(`[image attached: ${file.name}]`);
    } else if (result.text) {
      textBlocks.push(`### ${file.name}\n\n${result.text.slice(0, 50_000)}`);
    } else {
      textBlocks.push(`[unhandled file: ${file.name}]`);
    }
  }

  const sessionId = await ensureSession(providedSession);
  const workflowId = newWorkflowId();

  const needsMultimodal = imageParts.length > 0;
  const mmModel = multimodalModel();
  const model = needsMultimodal && mmModel ? mmModel : fastModel();
  const droppedImages = needsMultimodal && !mmModel;
  const system = extractionSystemPrompt(outcome, setupIntake);

  let env: ExtractionEnvelope | null = null;
  try {
    const result = await generateObject({
      model,
      schema: ExtractionEnvelopeSchema,
      messages: [
        {
          role: 'user',
          content:
            needsMultimodal && mmModel
              ? [
                  { type: 'text', text: system },
                  { type: 'text', text: textBlocks.join('\n\n---\n\n') },
                  ...imageParts,
                ]
              : [
                  {
                    type: 'text',
                    text: `${system}\n\nEVIDENCE:\n\n${textBlocks.join('\n\n---\n\n')}${
                      droppedImages ? '\n\n[NOTE: image inputs dropped — no multimodal key configured]' : ''
                    }`,
                  },
                ],
        },
      ],
    });
    env = result.object;
  } catch (err) {
    return NextResponse.json({ error: 'extraction_failed', message: (err as Error).message }, { status: 500 });
  }
  if (!env) {
    return NextResponse.json({ error: 'extraction_failed', message: 'No object returned.' }, { status: 500 });
  }

  // Probabilistic envelope → deterministic canonical store.
  const fileNames = parsed.map((p) => p.file.name);
  const store = mapExtractionToStore(env, sessionId, workflowId, fileNames);

  // Enforce the structural invariants; dangling references become broken_link gaps.
  store.gaps.push(...validateInvariants(store));

  await saveCanonical(store);
  await persistArtifacts(sessionId, parsed);
  await seedRag(sessionId, parsed);
  await setSessionStage(sessionId, 'extract');

  const lowConfidence = [
    ...store.outputs.filter((o) => (o.confidence_score ?? 1) < 0.7).map((o) => `output: ${o.output_name}`),
    ...store.rules.filter((r) => (r.confidence_score ?? 1) < 0.7).map((r) => `rule: ${r.rule_name}`),
    ...store.inputs.filter((i) => (i.confidence_score ?? 1) < 0.7).map((i) => `input: ${i.input_name}`),
  ];

  return NextResponse.json({
    workflow_id: workflowId,
    session_id: sessionId,
    counts: {
      outputs: store.outputs.length,
      inputs: store.inputs.length,
      runtime_inputs: store.inputs.filter((i) => i.input_type === 'required_workflow_input' || i.input_type === 'both').length,
      actors: store.actors.length,
      systems: store.systems.length,
      steps: store.steps.length,
      rules: store.rules.length,
      hitl: store.hitl.length,
      provenance: store.provenance.length,
      broken_links: store.gaps.filter((g) => g.gap_kind === 'broken_link').length,
    },
    low_confidence_facts: lowConfidence,
    ...(droppedImages ? { warning: 'Image inputs were dropped (no multimodal key). Text was processed.' } : {}),
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

type Parsed = { file: File; buf: Buffer; result: { text: string | null; isImage: boolean; meta: Record<string, unknown> } };

async function persistArtifacts(sessionId: string, parsed: Parsed[]) {
  if (!HAS_DATABASE || sessionId.startsWith('local-')) return;
  const uploaded = parsed.map(({ file, result }) => ({
    name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    extracted_text_preview: result.text?.slice(0, 1000) ?? null,
  }));
  await query('update workflow_sessions set uploaded_files = $1 where id = $2', [JSON.stringify(uploaded), sessionId]);
  for (const { file, result } of parsed) {
    await query(
      `insert into session_artifacts (session_id, file_name, mime_type, size_bytes, extracted_text, was_multimodal)
       values ($1,$2,$3,$4,$5,$6)`,
      [sessionId, file.name, file.type, file.size, result.text ?? null, Boolean(result.isImage)],
    );
  }
}

// Parse the optional Setup intake JSON blob from FormData. Lenient: any non-
// string fields are dropped, an unparseable blob returns null, and a fully
// empty payload returns null so downstream callers can treat "no setup
// provided" the same as "missing" (the prompt collapses cleanly).
function parseSetupIntake(raw: FormDataEntryValue | null): SetupIntake | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const out: SetupIntake = {
    source: typeof obj.source === 'string' ? obj.source.trim() : '',
    output: typeof obj.output === 'string' ? obj.output.trim() : '',
    destination: typeof obj.destination === 'string' ? obj.destination.trim() : '',
    connection: typeof obj.connection === 'string' ? obj.connection.trim() : '',
  };
  const empty = !out.source && !out.output && !out.destination && !out.connection;
  return empty ? null : out;
}

// Seed each text-bearing evidence file as a RAG asset (grounding for later
// projection + the Library object). No-ops on local- sessions.
async function seedRag(sessionId: string, parsed: Parsed[]) {
  if (sessionId.startsWith('local-')) return;
  const assets = parsed
    .filter((p) => p.result.text && p.result.text.length > 20)
    .map((p) => ({
      asset_name: p.file.name,
      asset_type: 'evidence',
      description: `Uploaded evidence: ${p.file.name}`,
      content: p.result.text!.slice(0, 50_000),
    }));
  if (assets.length > 0) await upsertRagAssets(sessionId, assets);
}
