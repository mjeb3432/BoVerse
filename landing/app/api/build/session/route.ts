// Session lifecycle: create a new workflow session, fetch an existing one,
// list recent sessions.

import { NextResponse } from 'next/server';
import { createServerSupabase, ensureSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/build/session — create a new session, return id.
export async function POST() {
  const cfg = ensureSupabaseConfigured();
  if (!cfg.ok) {
    // No DB yet: return an ephemeral session id so the UI can still walk
    // through stages with sessionStorage as the local backing store.
    return NextResponse.json({
      id: `local-${crypto.randomUUID()}`,
      ephemeral: true,
      reason: cfg.reason,
    });
  }

  const supabase = createServerSupabase()!;
  const { data, error } = await supabase
    .from('workflow_sessions')
    .insert({ current_stage: 'idle' })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, ephemeral: false });
}

// GET /api/build/session?id=… — fetch full session state.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const cfg = ensureSupabaseConfigured();
  if (!cfg.ok || id.startsWith('local-')) {
    return NextResponse.json({ ephemeral: true, reason: cfg.ok ? 'local session id' : cfg.reason });
  }

  const supabase = createServerSupabase()!;
  const { data, error } = await supabase
    .from('workflow_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
