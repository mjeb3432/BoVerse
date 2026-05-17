// LLM provider routing. Three categories of model, picked from the best
// available free provider:
//
//   fastModel        — structured JSON output, Stages 02 / 03 / 05 inner loop
//   reasoningModel   — Stage 04 workflow generation (20+ steps with details)
//   multimodalModel  — Stage 01 PDF / image ingestion (requires vision)
//   embeddingModel   — RAG asset embeddings written to pgvector
//
// Why a provider chain instead of a single one:
//
//   - Groq free tier   = 30 req/min, ~250 tok/s Llama 3.3 70B, no signup cost.
//     Used as PRIMARY for text-only structured calls. The 10-row execution
//     loop in Stage 05 needs ~3 LLM calls per row × 10 rows = 30 calls; Groq
//     fits that in 60s, Gemini's 5/min ceiling needed 6 minutes of throttling.
//
//   - Gemini free tier = 15 req/min on 2.5-flash, ALSO multimodal (PDFs/images
//     inline). Kept as FALLBACK for text and SOLE provider for multimodal +
//     embeddings.
//
//   - Combined headroom = 45 req/min for text, which is enough for Stage 05's
//     50-150 LLM calls without hitting either provider's ceiling.
//
// Symptom that drove this design: 2026-05 production logs showed Stage 05
//   "Quota exceeded ... limit: 5, model: gemini-2.5-flash"
// after just 17 LLM calls because the free tier of 2.5-flash on a brand-new
// key is sometimes throttled to 5 RPM. Groq has no such limit on Llama 70B.

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export const HAS_GOOGLE_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
export const HAS_GROQ_KEY = Boolean(process.env.GROQ_API_KEY);
export const HAS_ANY_LLM = HAS_GOOGLE_KEY || HAS_GROQ_KEY;

// PRIMARY structured-output workhorse. Groq Llama 3.3 70B first because of
// the much higher request ceiling; Gemini as fallback if Groq key absent.
// Both providers support JSON-mode via the AI SDK's `generateObject`.
export const fastModel = () => {
  if (HAS_GROQ_KEY) return groq('llama-3.3-70b-versatile');
  return google('gemini-2.5-flash');
};

// Stage 04 workflow generation. Llama 3.3 70B handles the ~20-step output
// with primitive/actor/model/prompt fields at quality parity with Gemini
// 2.5-flash (verified on the "Electrical Services Quoting Process" run).
export const reasoningModel = () => fastModel();

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
        'No LLM provider configured. Set GROQ_API_KEY (preferred — 30 req/min free at console.groq.com) or GOOGLE_GENERATIVE_AI_API_KEY (15 req/min free, multimodal, at aistudio.google.com/app/apikey) in landing/.env.local — or in Vercel project env vars for production.',
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
