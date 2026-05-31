// Swarm 2 · BUILD. Consumes the approved spec + simulation, assembles the
// implementation bundle (only the objects the archetype requires), verifies it,
// and persists it. Refuses if the spec was never approved.

import { NextResponse } from 'next/server';
import { getWorkflowIdForSession, getCanonical, getProjections } from '@/lib/canonical';
import { buildWds } from '@/lib/wds';
import { assemble, type AssembledBundle } from '@/lib/swarm2/assemble';
import { saveBuild, newBuildId } from '@/lib/swarm2/store';
import type { ApprovalRecord, SimulationPack } from '@/lib/swarm/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = body?.session_id;
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const workflowId = await getWorkflowIdForSession(sessionId);
  if (!workflowId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const store = await getCanonical(workflowId);
  if (!store) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!store.approval) {
    return NextResponse.json({ error: 'not_approved', message: 'Approve the specification before building.' }, { status: 409 });
  }

  const proj = await getProjections(sessionId);
  const simulation = proj?.simulation as SimulationPack | undefined;
  if (!simulation) {
    return NextResponse.json({ error: 'no_simulation', message: 'Run specify first.' }, { status: 400 });
  }

  const wds = buildWds(store);
  const approval: ApprovalRecord = {
    workflow_id: workflowId,
    wds_version: store.approval.wds_version ?? 1,
    approved: true,
    approved_surfaces: { sample_output: true, sample_inputs: true },
    approved_by: store.approval.approved_by ?? null,
    approved_at: store.approval.approved_at ?? new Date().toISOString(),
    build_readiness_at_approval: store.approval.build_readiness,
    assumptions_acknowledged: store.gaps
      .filter((g) => g.resolution_status === 'assumed')
      .map((g) => g.missing_attribute ?? '')
      .filter(Boolean),
  };

  let bundle: AssembledBundle | null = null;
  try {
    bundle = assemble({ wds, simulation, approval });
  } catch (err) {
    return NextResponse.json({ error: 'build_failed', message: (err as Error).message }, { status: 500 });
  }
  if (!bundle) {
    return NextResponse.json({ error: 'build_failed', message: 'No bundle produced.' }, { status: 500 });
  }

  const buildId = newBuildId();
  await saveBuild({
    buildId,
    workflowId,
    sessionId,
    wdsVersion: approval.wds_version,
    manifest: bundle.manifest,
    objects: bundle.objects,
    files: bundle.files,
  });

  return NextResponse.json({ build_id: buildId, manifest: bundle.manifest, verification: bundle.verification });
}
