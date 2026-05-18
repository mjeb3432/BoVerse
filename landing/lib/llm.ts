// LLM provider configuration. Centralized so swapping providers is a one-line
// change. Currently defaults to Google Gemini 2.0 Flash (free tier, multimodal,
// clean JSON output). Groq is wired as an alternate for speed-critical paths.

import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export const HAS_GOOGLE_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
export const HAS_GROQ_KEY = Boolean(process.env.GROQ_API_KEY);

// Primary models. Free-tier friendly. Change here to upgrade.
//
// Gemini 2.0 Flash: 15 req/min, 1M tokens/day free, multimodal (reads PDFs,
// images, audio inline).
//
// Gemini 2.5 Pro: tighter free limits but stronger reasoning — reserve for
// Stage 04 workflow generation where reasoning quality matters most.
export const fastModel = () => google('gemini-2.0-flash');
export const reasoningModel = () => google('gemini-2.5-pro');

// Groq Llama 3.3 70B — text-only but very fast (~250 tok/s). Useful when a
// per-row execution loop needs to fan out lots of small LLM calls quickly.
export const fastTextModel = () => groq('llama-3.3-70b-versatile');

// Guard helper. Use this at the top of any route that requires keys, so the
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
