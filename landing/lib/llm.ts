// LLM provider routing. Four categories of model, picked from the best
// available free provider:
//
//   fastModel        — structured JSON output (no array length constraints)
//                       used by Stages 02 / 04 / 05 inner loop
//   reasoningModel   — Stage 04 workflow generation (alias for fastModel)
//   bulkModel        — Stage 03 SIMULATE (needs .min/.max on rows array,
//                       so MUST avoid Cerebras which rejects minItems/maxItems)
//   multimodalModel  — Stage 01 PDF / image ingestion (requires vision)
//   embeddingModel   — RAG asset embeddings written to pgvector
//
// Why three text providers instead of one:
//
//   - Cerebras free tier: gpt-oss-120b at ~2000 tok/s, 30 req/min, ZERO
//     latency on small structured calls (~300ms end-to-end). Hard constraint:
//     does NOT support `minItems` / `maxItems` in JSON schema, so schemas
//     with bounded arrays must NOT be routed here. PRIMARY for fastModel.
//
//   - Groq free tier: gpt-oss-120b at ~250 tok/s, 30 req/min. Slower than
//     Cerebras (~3s per call) but supports the full strict JSON schema
//     including array bounds. FALLBACK for fastModel.
//
//   - Gemini free tier: 2.5-flash, 5-15 req/min, multimodal (PDFs/images
//     inline) + embeddings + reliable array generation. Used as PRIMARY for
//     bulkModel (Stage 03 needs all 10 rows reliably), SOLE provider for
//     multimodal + embeddings.
//
// Combined: typical workflow run uses 1 Gemini multimodal call (Stage 01),
// 1 Cerebras call (Stage 02), 1-2 Gemini calls (Stage 03), 1 Cerebras call
// (Stage 04), then 5-30 Cerebras calls (Stage 05 inner loop). Well under
// every provider's per-minute ceiling.
//
// Symptom that drove this design: Stage 05's 10-row × 3-LLM-call loop hit
// Gemini's 5 RPM ceiling after 17 calls. Cerebras with no rate-limit
// concerns runs the full loop in ~10 seconds instead of 6 minutes throttled.

import { cerebras } from '@ai-sdk/cerebras';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export const HAS_GOOGLE_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
export const HAS_GROQ_KEY = Boolean(process.env.GROQ_API_KEY);
export const HAS_CEREBRAS_KEY = Boolean(process.env.CEREBRAS_API_KEY);
export const HAS_ANY_LLM = HAS_GOOGLE_KEY || HAS_GROQ_KEY || HAS_CEREBRAS_KEY;

// PRIMARY structured-output workhorse for schemas WITHOUT array length
// constraints (.min / .max on arrays). Stages 02, 04, 05 inner loop.
//
// Priority: Cerebras first (~300ms per call, ~10x faster than Groq), then
// Groq (~3s per call, same model with array-bounds support), then Gemini
// (multimodal model used here only when other text providers absent).
//
// Why both providers offer the same `openai/gpt-oss-120b` model: it natively
// supports strict json_schema (required for the AI SDK's generateObject
// default mode) and we already validated its output quality on this project.
// Groq calls it `openai/gpt-oss-120b`, Cerebras calls it `gpt-oss-120b`.
export const fastModel = () => {
  if (HAS_CEREBRAS_KEY) return cerebras('gpt-oss-120b');
  if (HAS_GROQ_KEY) return groq('openai/gpt-oss-120b');
  return google('gemini-2.5-flash');
};

// Stage 04 alias. Same chain — gpt-oss-120b handles the ~20-step output
// with primitive/actor/model/prompt fields at quality parity across all
// three providers.
export const reasoningModel = () => fastModel();

// BULK-ARRAY tasks (Stage 03 SIMULATE — needs SimulateOutputSchema.rows
// constrained to .min(2).max(15)). Cerebras CANNOT serve this stage:
//
//   Cerebras error: "Invalid fields for schema with types ['array']:
//                    {'minItems', 'maxItems'}"
//
// So the chain here EXCLUDES Cerebras. Gemini first (best at hitting the
// 10-row target — verified live), Groq fallback (gpt-oss-120b returns
// 2-5 rows under count pressure but the .min(2) floor lets it validate).
export const bulkModel = () => {
  if (HAS_GOOGLE_KEY) return google('gemini-2.5-flash');
  if (HAS_GROQ_KEY) return groq('openai/gpt-oss-120b');
  return google('gemini-2.5-flash'); // unreachable if ensureLLMConfigured passed
};

// Stage 01 multimodal ingest. Gemini is the only free provider that reads
// PDFs and images inline. Returns null if Gemini key is missing — callers
// must then extract text upstream (pdf-parse / image OCR) and route through
// `fastModel()` instead.
export const multimodalModel = () => {
  if (HAS_GOOGLE_KEY) return google('gemini-2.5-flash');
  return null;
};

// RAG asset embeddings. Gemini `text-embedding-004` is free (1500 req/day,
// 768 dimensions, matches the pgvector column type). Returns null if Gemini
// key is missing — RAG features then degrade to keyword search.
export const embeddingModel = () => {
  if (HAS_GOOGLE_KEY) return google.textEmbedding('text-embedding-004');
  return null;
};

// Guard for routes that absolutely need at least one text LLM.
export function ensureLLMConfigured(): { ok: true } | { ok: false; reason: string } {
  if (!HAS_ANY_LLM) {
    return {
      ok: false,
      reason:
        'No LLM provider configured. Set CEREBRAS_API_KEY (preferred — ~2000 tok/s at cloud.cerebras.ai), GROQ_API_KEY (30 req/min free at console.groq.com), or GOOGLE_GENERATIVE_AI_API_KEY (15 req/min free, multimodal, at aistudio.google.com/app/apikey) in landing/.env.local — or in Vercel project env vars for production.',
    };
  }
  return { ok: true };
}

// Stage 01 specifically requires multimodal capability if any files are
// images / PDFs. Surfaces a distinct error so the UI can fall back to the
// text-only path.
export function ensureMultimodalLLMConfigured(): { ok: true } | { ok: false; reason: string } {
  if (!HAS_GOOGLE_KEY) {
    return {
      ok: false,
      reason:
        'Multimodal ingestion (PDFs / images) requires Gemini. Set GOOGLE_GENERATIVE_AI_API_KEY in landing/.env.local or strip your inputs to plain text first.',
    };
  }
  return { ok: true };
}
