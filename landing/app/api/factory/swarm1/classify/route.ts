// Swarm 1 · CLASSIFY (corpus lifecycle steps 5-7). Deterministic, no LLM.
// Runs the rules engine over the canonical store to set the archetype and the
// build posture (required / optional / unnecessary objects).

import { NextResponse } from 'next/server';
import { getWorkflowIdForSession, getCanonical, saveCanonical, setSessionStage } from '@/lib/canonical';
import { classify } from '@/lib/rules-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = body?.session_id;
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const workflowId = await getWorkflowIdForSession(sessionId);
  if (!workflowId) {
    return NextResponse.json({ error: 'not_found', message: 'No workflow for this session — run extract first.' }, { status: 404 });
  }
  const store = await getCanonical(workflowId);
  if (!store) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  classify(store);
  await saveCanonical(store);
  await setSessionStage(sessionId, 'classify');

  const a = store.archetype!;
  return NextResponse.json({
    workflow_id: workflowId,
    primary_archetype: a.primary_archetype,
    secondary_archetype: a.secondary_archetype,
    complexity_level: a.complexity_level,
    confidence: a.confidence_score,
    evidence: a.evidence_for_classification,
    recommended_build_path: a.recommended_build_path,
    required_components: a.required_boverse_components,
    optional_components: a.optional_components,
    unnecessary_components: a.unnecessary_components,
  });
}
