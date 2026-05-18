// Stage 05 → Word doc. Calls the python-docx sidecar to render a
// production-grade .docx file. Separate route from the SSE execution stream
// so the UI can download the doc as a normal file response.

import { NextResponse } from 'next/server';
import { renderDocx, HAS_DOCX_SERVICE } from '@/lib/docx-client';
import {
  GenerateOutputSchema,
  SimulateOutputSchema,
  DeliverOutputSchema,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!HAS_DOCX_SERVICE) {
    return NextResponse.json(
      {
        error: 'docx_service_not_configured',
        message:
          'DOCX_SERVICE_URL is not set. Deploy the python-docx sidecar from docx-service/ and set DOCX_SERVICE_URL in landing/.env.local.',
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const workflow = GenerateOutputSchema.safeParse(body.generate_output);
  const simulate = SimulateOutputSchema.safeParse(body.simulate_output);
  const execSummary = body.execution_summary
    ? DeliverOutputSchema.shape.execution_summary.safeParse(body.execution_summary)
    : null;

  if (!workflow.success || !simulate.success) {
    return NextResponse.json({ error: 'invalid inputs' }, { status: 400 });
  }

  const docx = await renderDocx(
    workflow.data,
    simulate.data,
    execSummary?.success ? execSummary.data : null
  );

  if (!docx) {
    return NextResponse.json(
      { error: 'docx_render_failed', message: 'python-docx sidecar returned no output' },
      { status: 502 }
    );
  }

  const filename =
    workflow.data.workflow_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 80) + '.docx';

  return new Response(docx as unknown as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
