// Swarm 1 · BLUEPRINT — Configuration 0 (Discovery) output set.
//
// Returns the six named Discovery deliverables — Workflow Blueprint,
// Workflow Classification (+ the "what should we build" answer), Registry,
// Canonical Schema, Rules Wiki, and the Simulation Pack — assembled purely
// from the canonical store (+ the generated simulation when present). This is
// "Configuration 0": it sits before the build and answers "What should we
// build?". No LLM, no build.
//
// Available any time after extract. The five deterministic outputs come from
// the store; simulation_pack is included once /specify has run (null before).

import { NextResponse } from 'next/server';
import { getWorkflowIdForSession, getCanonical, getProjections } from '@/lib/canonical';
import { buildDiscoveryPackage } from '@/lib/discovery-package';
import type { SimulationPack } from '@/lib/swarm/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const workflowId = await getWorkflowIdForSession(sessionId);
  if (!workflowId) {
    return NextResponse.json({ error: 'not_found', message: 'Run extract first.' }, { status: 404 });
  }
  const store = await getCanonical(workflowId);
  if (!store) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const proj = await getProjections(sessionId);
  const simulation = (proj?.simulation as SimulationPack | undefined) ?? null;

  const pkg = buildDiscoveryPackage(store, simulation);
  return NextResponse.json({ generated_at: new Date().toISOString(), session_id: sessionId, ...pkg });
}
