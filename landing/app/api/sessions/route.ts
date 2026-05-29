// GET /api/sessions  — list every workflow_sessions row with a summary of
// how far it got. Used by the /sessions browse page.
//
// Returns: { sessions: [{ id, created_at, current_stage, workflow_name,
//                         counts: { files, schema, rows, steps, rag } }] }

import { NextResponse } from 'next/server';
import { ensurePostgresConfigured, query } from '@/lib/postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = ensurePostgresConfigured();
  if (!cfg.ok) {
    return NextResponse.json({ error: 'no_database', message: cfg.reason }, { status: 503 });
  }

  try {
    const r = await query<{
      id: string;
      created_at: string;
      updated_at: string;
      current_stage: string;
      workflow_name: string | null;
      files_count: number;
      schema_count: number;
      rows_count: number;
      steps_count: number;
      rag_count: number;
    }>(
      `select
         id, created_at, updated_at, current_stage,
         generate_output->>'workflow_name' as workflow_name,
         coalesce(jsonb_array_length(uploaded_files), 0) as files_count,
         coalesce(jsonb_array_length(simulate_output->'schema'), 0) as schema_count,
         coalesce(jsonb_array_length(simulate_output->'rows'), 0) as rows_count,
         coalesce(jsonb_array_length(generate_output->'steps'), 0) as steps_count,
         coalesce(jsonb_array_length(generate_output->'rag_library'), 0) as rag_count
       from workflow_sessions
       order by created_at desc
       limit 200`
    );

    return NextResponse.json({ sessions: r?.rows ?? [] });
  } catch (err) {
    // DB unreachable (e.g. Supabase project paused/restored, pooler tenant
    // not found, connection timeout). Surface a clean 503 so the /sessions
    // page shows a readable banner instead of an opaque HTTP 500.
    console.error('[GET /api/sessions] database error:', err);
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
