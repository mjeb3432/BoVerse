// Swarm 1 · GAPS (corpus lifecycle steps 8-9). Deterministic detection +
// prioritization; only blocking, high-value gaps surface as user questions.
// POST builds the ledger; PATCH applies the user's answers.

import { NextResponse } from 'next/server';
import { getWorkflowIdForSession, getCanonical, getSetupIntake, saveCanonical, setSessionStage } from '@/lib/canonical';
import { analyzeGaps, prioritize, summarizeReadiness, applyAnswers } from '@/lib/gaps';
import type { MissingInformation } from '@/lib/canonical-schema';

// Flatten the persisted Setup answers into free-text signals for tech-stack
// detection. The Setup "source"/"connection" fields routinely name the stack
// (e.g. "weekly export from QuickBooks") — the richest signal we have.
function setupSignals(setup: unknown): string[] {
  if (!setup || typeof setup !== 'object') return [];
  const o = setup as Record<string, unknown>;
  return ['source', 'fileTypes', 'output', 'destination', 'connection']
    .map((k) => (typeof o[k] === 'string' ? (o[k] as string) : ''))
    .filter(Boolean);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const asQuestion = (g: MissingInformation) => ({
  gap_id: g.gap_id,
  missing_attribute: g.missing_attribute,
  suggested_question: g.suggested_question,
  severity: g.severity,
  gap_kind: g.gap_kind,
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = body?.session_id;
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const workflowId = await getWorkflowIdForSession(sessionId);
  if (!workflowId) {
    return NextResponse.json({ error: 'not_found', message: 'Run extract first.' }, { status: 404 });
  }
  const store = await getCanonical(workflowId);
  if (!store) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const setup = await getSetupIntake(sessionId);
  const gaps = analyzeGaps(store, setupSignals(setup));
  const questions = prioritize(gaps);
  store.gaps = gaps;
  await saveCanonical(store);
  await setSessionStage(sessionId, 'gaps');

  return NextResponse.json({
    workflow_id: workflowId,
    build_readiness: summarizeReadiness(gaps),
    questions: questions.map(asQuestion),
    assumed_count: gaps.filter((g) => g.resolution_status === 'assumed').length,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = body?.session_id;
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const answers = Array.isArray(body?.answers) ? body.answers : [];
  const workflowId = await getWorkflowIdForSession(sessionId);
  if (!workflowId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const store = await getCanonical(workflowId);
  if (!store) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  applyAnswers(store, answers);
  await saveCanonical(store);

  const remaining = store.gaps.filter(
    (g) =>
      g.blocking_status === 'blocking' &&
      (g.severity === 'critical' || g.severity === 'high') &&
      g.resolution_status !== 'answered' &&
      g.resolution_status !== 'assumed',
  );
  return NextResponse.json({
    workflow_id: workflowId,
    build_readiness: summarizeReadiness(store.gaps),
    remaining_questions: remaining.map(asQuestion),
  });
}
