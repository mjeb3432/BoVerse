// Stage 05 → Word doc. Renders the workflow spec to a real .docx file
// in-process using the Node `docx` library (same OOXML format as python-docx).
// No separate Python service — everything runs in the Next.js app on Vercel.

import { NextResponse } from 'next/server';
import { renderWorkflowDocx } from '@/lib/docx-renderer';
import {
  GenerateOutputSchema,
  SimulateOutputSchema,
  DeliverOutputSchema,
} from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const workflow = GenerateOutputSchema.safeParse(body.generate_output);
  const simulate = SimulateOutputSchema.safeParse(body.simulate_output);
  const execSummary = body.execution_summary
    ? DeliverOutputSchema.shape.execution_summary.safeParse(body.execution_summary)
    : null;

  if (!workflow.success || !simulate.success) {
    return NextResponse.json({ error: 'invalid inputs' }, { status: 400 });
  }

  try {
    const docx = await renderWorkflowDocx(
      workflow.data,
      simulate.data,
      execSummary?.success ? execSummary.data : null,
      new Date().toISOString().slice(0, 10)
    );

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
  } catch (err) {
    return NextResponse.json(
      { error: 'docx_render_failed', message: (err as Error).message },
      { status: 500 }
    );
  }
}
