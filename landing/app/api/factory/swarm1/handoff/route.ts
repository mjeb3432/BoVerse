// Swarm 1 · HANDOFF — the EXPORT BOUNDARY.
//
// This is the documented seam where BoVerse stops and the downstream Build
// swarm (running in another application) takes over. It returns the canonical
// Swarm 1 -> Swarm 2 contract (lib/swarm/contract.ts -> Swarm2Input: WDS +
// Simulation Pack + Approval record) PLUS the pre-upload Setup answers (the
// integration-points record).
//
// The app's own Swarm 2 (/api/factory/swarm2/build) consumes the exact same
// contract internally as a REFERENCE BUILD. To replace it, point the downstream
// swarm at this endpoint: GET it by session id and consume the returned bundle.
// Nothing here depends on the in-app build — the boundary is a plain JSON read.
//
// Tolerant of the pre-approval state: the Download-simulation-pack button calls
// this during review, before the user has approved. When there is no approval
// record yet, `approval.approved` is false and `approval.approved_at` is null —
// the downstream swarm is expected to gate on that field, not assume approval.

import { NextResponse } from 'next/server';
import {
  getWorkflowIdForSession,
  getCanonical,
  getProjections,
  getSetupIntake,
} from '@/lib/canonical';
import { buildWds } from '@/lib/wds';
import { buildDiscoveryPackage } from '@/lib/discovery-package';
import type { ApprovalRecord, SimulationPack, Wds } from '@/lib/swarm/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bump when the handoff envelope shape changes so the downstream swarm can
// branch on it. Independent of the inner contract versions (wds.version etc.).
const HANDOFF_CONTRACT_VERSION = 1;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
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
  if (!simulation) {
    return NextResponse.json(
      { error: 'no_simulation', message: 'Run specify (review the sample) before exporting the handoff.' },
      { status: 409 },
    );
  }

  // Prefer the persisted WDS projection; fall back to a fresh deterministic
  // build from the canonical store (they agree — buildWds is pure).
  const wds = (proj?.wds as Wds | undefined) ?? buildWds(store);

  // Approval may not exist yet (handoff fetched during review). Synthesize a
  // not-approved record so the envelope shape is stable either way.
  const approval: ApprovalRecord = store.approval
    ? {
        workflow_id: workflowId,
        wds_version: store.approval.wds_version ?? 1,
        approved: true,
        approved_surfaces: { sample_output: true, sample_inputs: true },
        approved_by: store.approval.approved_by ?? null,
        approved_at: store.approval.approved_at ?? null,
        build_readiness_at_approval: store.approval.build_readiness,
        assumptions_acknowledged: store.gaps
          .filter((g) => g.resolution_status === 'assumed')
          .map((g) => g.missing_attribute ?? '')
          .filter(Boolean),
      }
    : {
        workflow_id: workflowId,
        wds_version: 1,
        approved: false,
        approved_surfaces: { sample_output: false, sample_inputs: false },
        approved_by: null,
        approved_at: null,
        build_readiness_at_approval: wds.build_recommendation.build_readiness,
        assumptions_acknowledged: store.gaps
          .filter((g) => g.resolution_status === 'assumed')
          .map((g) => g.missing_attribute ?? '')
          .filter(Boolean),
      };

  const setup_intake = await getSetupIntake(sessionId);

  return NextResponse.json({
    handoff_contract_version: HANDOFF_CONTRACT_VERSION,
    session_id: sessionId,
    workflow_id: workflowId,
    // The integration-points record (pre-upload Setup answers). Null if the
    // user skipped the Setup form.
    setup_intake: setup_intake ?? null,
    // Configuration 0 — the six named Discovery outputs (Workflow Blueprint,
    // Classification + the "what to build" answer, Registry, Canonical Schema,
    // Rules Wiki, Simulation Pack). A projection of the same store/WDS/simulation
    // below; included so the downstream builder gets the named set directly.
    discovery_package: buildDiscoveryPackage(store, simulation),
    // The canonical Swarm 1 -> Swarm 2 contract. The downstream swarm consumes
    // these three exactly as the in-app Swarm 2 does.
    wds,
    simulation,
    approval,
  });
}
