// Swarm 1 · REVIEW (corpus drafts/04 Part D — the business-user loop).
// The user has exactly two affordances over the two surfaces:
//   - comment on an input/output (logged; never silently rewrites a surface)
//   - change an input value (re-projects BOTH surfaces so they stay consistent)
// ...plus APPROVE, which is the gate that releases Swarm 2. Approval is refused
// while build readiness is blocking.

import { NextResponse } from 'next/server';
import {
  getWorkflowIdForSession,
  getCanonical,
  saveCanonical,
  saveProjections,
  getProjections,
  setSessionStage,
  makeProvenance,
} from '@/lib/canonical';
import { reproject } from '@/lib/simulation';
import { summarizeReadiness } from '@/lib/gaps';
import { buildWds } from '@/lib/wds';
import type { SimulationPack } from '@/lib/swarm/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = body?.session_id;
  const kind = body?.kind;
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  const workflowId = await getWorkflowIdForSession(sessionId);
  if (!workflowId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const store = await getCanonical(workflowId);
  if (!store) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // ── change an input value → re-project both surfaces ──
  if (kind === 'input_change') {
    const inputName = body?.input_name;
    const inp = store.inputs.find((i) => i.input_name === inputName);
    if (!inp) return NextResponse.json({ error: 'input_not_found' }, { status: 404 });
    inp.example_value = body?.example_value ?? inp.example_value;
    store.provenance.push(
      makeProvenance({
        targetTable: 'input',
        targetField: `${inputName}.example_value`,
        sourceDocument: 'user edit',
        extractedValue: JSON.stringify(body?.example_value ?? null).slice(0, 500),
        method: 'manual',
        confidence: 1,
      }),
    );
    await saveCanonical(store);
    try {
      const sim = await reproject(store);
      await saveProjections(sessionId, buildWds(store), sim);
      return NextResponse.json({ sample_output: sim.sample_output, sample_inputs: sim.sample_inputs });
    } catch (err) {
      return NextResponse.json({ error: 'reproject_failed', message: (err as Error).message }, { status: 500 });
    }
  }

  // ── comment → log only (never silently rewrites a surface) ──
  if (kind === 'comment') {
    const target = typeof body?.target === 'string' ? body.target : 'output';
    const text = typeof body?.text === 'string' ? body.text : '';
    store.provenance.push(
      makeProvenance({
        targetTable: target,
        targetField: 'comment',
        sourceDocument: 'user comment',
        extractedValue: text.slice(0, 1000),
        method: 'manual',
        confidence: null,
      }),
    );
    await saveCanonical(store);
    const proj = await getProjections(sessionId);
    const sim = proj?.simulation as SimulationPack | undefined;
    return NextResponse.json({
      logged: true,
      sample_output: sim?.sample_output ?? null,
      sample_inputs: sim?.sample_inputs ?? null,
    });
  }

  // ── approve → the seam gate ──
  if (kind === 'approve') {
    const readiness = summarizeReadiness(store.gaps);
    if (readiness === 'blocking') {
      const blocking = store.gaps.filter(
        (g) =>
          g.blocking_status === 'blocking' &&
          (g.severity === 'critical' || g.severity === 'high') &&
          g.resolution_status !== 'answered' &&
          g.resolution_status !== 'assumed',
      );
      return NextResponse.json(
        {
          error: 'blocked',
          message: 'Resolve the open questions before approving.',
          remaining: blocking.map((g) => ({ gap_id: g.gap_id, suggested_question: g.suggested_question })),
        },
        { status: 409 },
      );
    }
    store.approval = {
      build_readiness: readiness,
      approved_by: typeof body?.approved_by === 'string' ? body.approved_by : null,
      wds_version: 1,
    };
    await saveCanonical(store);
    await setSessionStage(sessionId, 'approved');
    return NextResponse.json({ approved: true, workflow_id: workflowId, build_readiness: readiness });
  }

  return NextResponse.json({ error: 'bad_kind', message: 'kind must be input_change | comment | approve' }, { status: 400 });
}
