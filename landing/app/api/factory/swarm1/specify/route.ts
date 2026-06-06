// Swarm 1 · SPECIFY (corpus lifecycle step 10). Builds the deterministic WDS
// and the Simulation Pack (the two business-user surfaces), persists the
// example inputs onto the canonical store, and returns the surfaces for review.

import { NextResponse } from 'next/server';
import { ensureLLMConfigured } from '@/lib/llm';
import {
  getWorkflowIdForSession,
  getCanonical,
  saveCanonical,
  saveProjections,
  setSessionStage,
} from '@/lib/canonical';
import { buildWds } from '@/lib/wds';
import { buildSimulation } from '@/lib/simulation';
import type { SimulationPack } from '@/lib/swarm/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const llm = ensureLLMConfigured();
  if (!llm.ok) {
    return NextResponse.json({ error: 'llm_not_configured', message: llm.reason }, { status: 200 });
  }

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
  if (!store.archetype) {
    return NextResponse.json({ error: 'not_classified', message: 'Run classify first.' }, { status: 400 });
  }

  const wds = buildWds(store);

  let simulation: SimulationPack | null = null;
  try {
    simulation = await buildSimulation(store, sessionId);
  } catch (err) {
    return NextResponse.json({ error: 'simulation_failed', message: (err as Error).message }, { status: 500 });
  }
  if (!simulation) {
    return NextResponse.json({ error: 'simulation_failed', message: 'No simulation produced.' }, { status: 500 });
  }

  // Persist the example inputs back onto the canonical inputs (so the Part D
  // edit loop has them as the source of truth), then persist the projections.
  for (const si of simulation.sample_inputs) {
    const inp = store.inputs.find((i) => i.input_name === si.input_name);
    if (inp) inp.example_value = si.example_value;
  }
  await saveCanonical(store);
  await saveProjections(sessionId, wds, simulation);
  await setSessionStage(sessionId, 'specify');

  // Surface every human-in-the-loop gate the canonical store knows about. The
  // review surface renders these as a dedicated "Sign-off gates" panel so the
  // business user can see every approval point in one place — not buried in
  // the operator drawer.
  const hitl_gates = store.hitl
    .filter((h) => h.workflow_stage || h.human_role || h.reason_for_review)
    .map((h) => ({
      workflow_stage: h.workflow_stage,
      human_role: h.human_role,
      reason_for_review: h.reason_for_review,
      review_trigger: h.review_trigger,
      approval_required: h.approval_required,
    }));

  return NextResponse.json({
    workflow_id: workflowId,
    build_readiness: wds.build_recommendation.build_readiness,
    sample_output: simulation.sample_output,
    sample_inputs: simulation.sample_inputs,
    hitl_gates,
    open_questions: store.gaps
      .filter((g) => g.resolution_status === 'asked')
      .map((g) => ({ gap_id: g.gap_id, suggested_question: g.suggested_question, severity: g.severity })),
    wds_summary: {
      primary_archetype: wds.classification.primary_archetype,
      complexity: wds.classification.complexity_level,
      overall_confidence: wds.overall_confidence,
      required_components: wds.build_recommendation.required_components,
      unnecessary_components: wds.build_recommendation.unnecessary_components,
    },
  });
}
