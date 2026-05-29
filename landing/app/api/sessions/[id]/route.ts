// GET  /api/sessions/[id]                — full session as JSON (all stages)
// GET  /api/sessions/[id]?download=json   — same payload, attachment download
// GET  /api/sessions/[id]?download=md     — agent-swarm prompt markdown
//
// One endpoint, three response shapes so the /sessions detail page can
// fetch for display and the same URL can be used as a direct download link.

import { NextResponse } from 'next/server';
import { ensurePostgresConfigured, query } from '@/lib/postgres';
import type { GenerateOutput, SimulateOutput } from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const cfg = ensurePostgresConfigured();
  if (!cfg.ok) {
    return NextResponse.json({ error: 'no_database', message: cfg.reason }, { status: 503 });
  }

  const url = new URL(req.url);
  const download = url.searchParams.get('download');

  try {
    const session = await query<{
      id: string;
      created_at: string;
      updated_at: string;
      current_stage: string;
      uploaded_files: unknown;
      ingest_output: unknown;
      clarify_output: unknown;
      clarify_answers: unknown;
      simulate_output: SimulateOutput | null;
      generate_output: GenerateOutput | null;
      deliver_output: unknown;
    }>(`select * from workflow_sessions where id = $1`, [id]);

    const row = session?.rows[0];
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Pull artifact full-text rows + rag assets + edges for completeness.
    const artifacts = await query(
      `select id, file_name, mime_type, size_bytes, extracted_text, was_multimodal, created_at
         from session_artifacts where session_id = $1 order by created_at asc`,
      [id]
    );
    const ragAssets = await query(
      `select id, asset_name, asset_type, description, content, (embedding is not null) as has_embedding, created_at
         from rag_assets where session_id = $1 order by created_at asc`,
      [id]
    );
    const ragEdges = await query(
      `select source_asset_id, target_asset_id, edge_type, weight, metadata
         from rag_edges where session_id = $1`,
      [id]
    );

    const payload = {
      ...row,
      artifacts: artifacts?.rows ?? [],
      rag_assets: ragAssets?.rows ?? [],
      rag_edges: ragEdges?.rows ?? [],
    };

    // Download-as-JSON
    if (download === 'json') {
      return new Response(JSON.stringify(payload, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="session-${id.slice(0, 8)}.json"`,
        },
      });
    }

    // Download-as-Markdown — agent-swarm prompt pack (re-generated server-side
    // from the saved generate_output + simulate_output so it's always fresh).
    if (download === 'md') {
      if (!row.generate_output || !row.simulate_output) {
        return NextResponse.json(
          { error: 'incomplete_session', message: `Session ${id.slice(0, 8)} did not reach Stage 04, no markdown to render.` },
          { status: 400 }
        );
      }
      // Lazy import the renderer so we don't pull `docx` etc. into this route.
      const { renderAgentSwarmPromptFromSession } = await import('@/lib/agent-swarm-prompt');
      const md = renderAgentSwarmPromptFromSession(row.generate_output, row.simulate_output);
      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="agent-swarm-${id.slice(0, 8)}.md"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (err) {
    // DB unreachable (paused/restored project, pooler tenant not found,
    // timeout). Clean 503 instead of an opaque HTTP 500.
    console.error(`[GET /api/sessions/${id}] database error:`, err);
    return NextResponse.json(
      {
        error: 'database_unreachable',
        message:
          'The sessions database is temporarily unavailable. Please try again in a moment.',
      },
      { status: 503 }
    );
  }
}
