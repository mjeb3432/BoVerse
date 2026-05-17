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

// Primary models.
//
// gemini-2.5-flash: reliable free tier (15 req/min, 1M tokens/day),
//   multimodal (PDFs / images / audio inline), structured JSON output.
//
// gemini-2.5-pro: stronger reasoning. Free tier is tight (2 req/min,
//   50K tokens/day), but Stage 04 only fires once per generation so it fits.
//   If this also returns "limit: 0" on your key, fall back to
//   gemini-2.5-flash by changing this single line.
export const fastModel = () => google('gemini-2.5-flash');
export const reasoningModel = () => google('gemini-2.5-pro');

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
