// lib/swarm2/assemble.ts — the Build conductor (corpus doc 11).
// Gate → build plan → iterate the 10 creators (build required, refuse
// unnecessary) → add spec.md + agent-swarm.md + REFUSED.md + manifest.json →
// verify. Swarm 2 NEVER re-infers architecture; it realizes the approved plan.

import { OBJECT_TYPES } from '../canonical-schema';
import type { Swarm2Input } from '../swarm/contract';
import { computeBuildPlan } from '../build-mapping';
import { CREATORS } from './objects';
import { verify, type VerifyResult } from './verify';
import type { BundleManifest, ObjectFile, ObjectResult } from './types';

export interface AssembledBundle {
  manifest: BundleManifest;
  objects: ObjectResult[];
  files: ObjectFile[];
  verification: VerifyResult;
}

export function assemble(input: Swarm2Input): AssembledBundle {
  const wds = input.wds;
  if (!input.approval.approved) throw new Error('Specification is not approved — Swarm 2 refuses to build.');
  if (input.approval.build_readiness_at_approval === 'blocking') throw new Error('Build readiness is blocking — refuse to build.');

  const archetype = wds.classification.primary_archetype;
  const plan = computeBuildPlan(archetype);

  // Build required, refuse unnecessary, defer optional.
  const objects: ObjectResult[] = [];
  for (const type of OBJECT_TYPES) {
    if (plan.required.includes(type)) {
      objects.push(CREATORS[type](input, plan));
    } else if (plan.unnecessary.includes(type)) {
      objects.push({ kind: 'refused', object_type: type, reason: `not needed for ${archetype}` });
    } else {
      objects.push({ kind: 'refused', object_type: type, reason: 'optional — not built this pass' });
    }
  }

  // Collect object files, then the top-level bundle files.
  const files: ObjectFile[] = [];
  files.push({ path: 'spec.md', media_type: 'text/markdown', content: renderSpec(input, plan.build_path) });
  for (const o of objects) if (o.kind === 'built') files.push(...o.files);
  files.push({ path: 'agent-swarm.md', media_type: 'text/markdown', content: renderAgentSwarm(input, objects) });
  files.push({ path: 'REFUSED.md', media_type: 'text/markdown', content: renderRefused(objects, archetype) });

  const verification = verify(input, objects);

  const manifest: BundleManifest = {
    workflow_id: wds.workflow_id,
    workflow_name: wds.workflow_name,
    primary_archetype: archetype,
    build_path: plan.build_path,
    build_readiness: input.approval.build_readiness_at_approval,
    generated_at: new Date().toISOString(),
    verification_status: verification.passed ? 'passed' : 'failed',
    objects: objects.map((o) => ({
      object_type: o.object_type,
      status: o.kind,
      reason: o.kind === 'refused' ? o.reason : null,
      file_count: o.kind === 'built' ? o.files.length : 0,
    })),
    files: ['manifest.json', ...files.map((f) => f.path)],
    warnings: [],
  };

  files.unshift({ path: 'manifest.json', media_type: 'application/json', content: JSON.stringify(manifest, null, 2) });
  return { manifest, objects, files, verification };
}

// ─── renderers ───────────────────────────────────────────────────────────────

function renderSpec(input: Swarm2Input, buildPath: string | null): string {
  const w = input.wds;
  const lines: string[] = [];
  lines.push(`# ${w.workflow_name ?? 'Workflow'} — Specification`, '');
  lines.push(`**Client:** ${w.client_name ?? '—'}  `);
  lines.push(`**Archetype:** ${w.classification.primary_archetype}  `);
  lines.push(`**Objective:** ${w.primary_objective ?? '—'}`, '');
  if (buildPath) lines.push(`**Build path:** ${buildPath}`, '');

  lines.push('## Outputs');
  for (const o of w.outputs) lines.push(`- **${o.output_name}** (${o.output_type}/${o.output_format}) — sections: ${o.required_sections.join(', ') || '—'}`);
  lines.push('', '## Inputs (runtime)');
  for (const i of w.inputs) lines.push(`- **${i.input_name}** (${i.input_type}, ${i.format})`);
  lines.push('', '## Rules');
  for (const r of w.rules) lines.push(`- **${r.rule_name}:** WHEN ${r.condition ?? '—'} THEN ${r.action ?? '—'}${r.threshold ? ` [${r.threshold}]` : ''}`);
  lines.push('', '## Steps');
  for (const s of w.steps) lines.push(`${s.sequence_order ?? '?'}. ${s.step_name}${s.hitl_required ? ' · HUMAN GATE' : ''}`);
  lines.push('', '## Human review');
  for (const h of w.hitl) lines.push(`- ${h.human_role ?? '—'} — ${h.review_trigger} (${h.reason_for_review ?? ''})`);
  lines.push('', '## Build posture');
  lines.push(`- **Required:** ${w.build_recommendation.required_components.join(', ')}`);
  lines.push(`- **Refused:** ${w.build_recommendation.unnecessary_components.join(', ') || '—'}`);
  return lines.join('\n');
}

function renderAgentSwarm(input: Swarm2Input, objects: ObjectResult[]): string {
  const w = input.wds;
  const built = objects.filter((o) => o.kind === 'built').map((o) => o.object_type);
  const lines: string[] = [];
  lines.push(`# Agent Swarm Prompt — ${w.workflow_name ?? 'Workflow'}`, '');
  lines.push(`You are an agent swarm executing a **${w.classification.primary_archetype}** workflow. Mission: ${w.primary_objective ?? 'produce the deliverable below'}.`, '');
  lines.push('## Input contract');
  for (const f of input.simulation.input_contract) lines.push(`- \`${f.name}\` (${f.type}${f.required ? ', required' : ''})`);
  lines.push('', '## Steps');
  for (const s of w.steps) {
    const kind = s.hitl_required ? 'HUMAN GATE' : s.deterministic_rule_available && !s.probabilistic_reasoning_required ? 'deterministic' : 'agent task';
    lines.push(`${s.sequence_order ?? '?'}. **${s.step_name}** — ${kind}; consumes ${s.input_required.join(', ') || '—'}; produces ${s.output_produced ?? '—'}`);
  }
  lines.push('', '## Rules to enforce (in order; multipliers before discounts)');
  for (const r of w.rules) lines.push(`- ${r.rule_name}: ${r.condition ?? ''} → ${r.action ?? ''}`);
  lines.push('', '## Output');
  const o = w.outputs[0];
  lines.push(`Produce **${o?.output_name ?? 'the deliverable'}** with sections: ${(o?.required_sections ?? []).join(', ') || '—'}.`);
  lines.push('', `_Objects available in this bundle: ${built.join(', ')}._`);
  return lines.join('\n');
}

function renderRefused(objects: ObjectResult[], archetype: string): string {
  const refused = objects.filter((o) => o.kind === 'refused');
  const lines: string[] = [];
  lines.push('# Refused objects', '');
  lines.push(`This is a **${archetype}**. The Build swarm deliberately did NOT build the following — proof that the build path determines the objects, and only what is needed gets built:`, '');
  for (const o of refused) lines.push(`- **${o.object_type}** — ${o.kind === 'refused' ? o.reason : ''}`);
  if (refused.length === 0) lines.push('_(Every object was required for this archetype.)_');
  return lines.join('\n');
}
