// LLM provider configuration. Centralized so swapping providers is a one-line
// change. Currently defaults to Google Gemini 2.5 Flash — its free tier is
// the most permissive of the current Google AI Studio lineup (`gemini-2.0-flash`
// can return "limit: 0" on some keys even though the model is "free").
//
// Symptom that triggered the swap: 2026-05 production logs showed
//   "Quota exceeded ... limit: 0, model: gemini-2.0-flash"
// from the user's brand-new API key, which means 2.0-flash isn't enabled on
// their free tier. 2.5-flash is enabled by default.

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export const HAS_GOOGLE_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
export const HAS_GROQ_KEY = Boolean(process.env.GROQ_API_KEY);

// Primary model: gemini-2.5-flash.
//
// Reliable free tier (15 req/min, 1M tokens/day), multimodal (PDFs / images /
// audio inline), structured JSON output. Verified working on the user's key
// in production (Stages 01-03 all succeeded).
//
// Why ALSO use 2.5-flash for "reasoning"? 2.5-pro has tight free limits
// (2 req/min, 50K tokens/day) AND can return the same "limit: 0" error as
// 2.0-flash on brand-new keys without billing enabled. Stage 04's workflow
// generation works fine on 2.5-flash — the 22-step Apex output we saw in
// Stage 01 inference proves it can reason at that level.
export const fastModel = () => google('gemini-2.5-flash');
export const reasoningModel = () => google('gemini-2.5-flash');

// Groq Llama 3.3 70B — text-only but very fast (~250 tok/s). Useful when
// a per-row execution loop needs to fan out lots of small LLM calls quickly,
// or as a fallback when Google quota is exhausted.
export const fastTextModel = () => groq('llama-3.3-70b-versatile');

// Guard helper. Use this at the top of any route that requires keys so the
// UI can show a friendly "configure keys first" message instead of crashing.
export function ensureLLMConfigured(): { ok: true } | { ok: false; reason: string } {
  if (!HAS_GOOGLE_KEY) {
    return {
      ok: false,
      reason:
        'GOOGLE_GENERATIVE_AI_API_KEY is not set. Get a free key at https://aistudio.google.com/app/apikey and add it to landing/.env.local.',
    };
  }
  return { ok: true };
}
