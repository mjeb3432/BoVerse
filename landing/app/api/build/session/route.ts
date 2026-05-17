// Session lifecycle: create a new workflow session, fetch an existing one.

import { NextResponse } from 'next/server';
import { ensurePostgresConfigured, query } from '@/lib/postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/build/session — create a new session, return id.
export async function POST() {
  const cfg = ensurePostgresConfigured();
  if (!cfg.ok) {
    // No DB yet: return an ephemeral session id so the UI can still walk
    // through stages with sessionStorage as the local backing store.
    return NextResponse.json({
      id: `local-${crypto.randomUUID()}`,
      ephemeral: true,
      reason: cfg.reason,
    });
  }

  try {
    const result = await query<{ id: string }>(
      `insert into workflow_sessions (current_stage) values ('idle') returning id`
    );
    const id = result?.rows[0]?.id;
    if (!id) throw new Error('Failed to insert session');
    return NextResponse.json({ id, ephemeral: false });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// GET /api/build/session?id=… — fetch full session state.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const cfg = ensurePostgresConfigured();
  if (!cfg.ok || id.startsWith('local-')) {
    return NextResponse.json({ ephemeral: true, reason: cfg.ok ? 'local session id' : cfg.reason });
  }

  try {
    const result = await query(`select * from workflow_sessions where id = $1`, [id]);
    const row = result?.rows[0];
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
