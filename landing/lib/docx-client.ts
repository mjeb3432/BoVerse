// Client for the python-docx sidecar service. Calls it from Stage 05 to
// render a production-grade Word document. If DOCX_SERVICE_URL is not set,
// returns null and Stage 05 falls back to Markdown-only output.

import type { GenerateOutput, SimulateOutput, DeliverOutput } from './workflow-types';

export const HAS_DOCX_SERVICE = Boolean(process.env.DOCX_SERVICE_URL);

export async function renderDocx(
  workflow: GenerateOutput,
  simulate: SimulateOutput,
  executionSummary: DeliverOutput['execution_summary'] | null
): Promise<Buffer | null> {
  if (!HAS_DOCX_SERVICE) return null;
  const url = `${process.env.DOCX_SERVICE_URL!.replace(/\/$/, '')}/render`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow,
      simulate,
      execution_summary: executionSummary,
      generated_on: new Date().toISOString().slice(0, 10),
    }),
  });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`[docx-client] render failed: ${res.status} ${res.statusText}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}
