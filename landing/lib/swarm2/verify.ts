// lib/swarm2/verify.ts — deterministic acceptance of the build against the
// approved spec + simulation (corpus doc 11 §3.7). No LLM.

import type { Swarm2Input } from '../swarm/contract';
import type { BuiltObject, ObjectResult } from './types';

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail: string;
}
export interface VerifyResult {
  passed: boolean;
  checks: VerifyCheck[];
}

export function verify(input: Swarm2Input, objects: ObjectResult[]): VerifyResult {
  const checks: VerifyCheck[] = [];
  const builtTypes = objects.filter((o): o is BuiltObject => o.kind === 'built').map((o) => o.object_type);
  const rec = input.wds.build_recommendation;

  checks.push({ name: 'workflow_built', ok: builtTypes.includes('workflow'), detail: 'workflow.json present' });

  const missing = rec.required_components.filter((r) => !builtTypes.includes(r));
  checks.push({
    name: 'required_objects_built',
    ok: missing.length === 0,
    detail: missing.length ? `missing required: ${missing.join(', ')}` : 'all required objects built',
  });

  const overbuilt = rec.unnecessary_components.filter((u) => builtTypes.includes(u));
  checks.push({
    name: 'no_overbuild',
    ok: overbuilt.length === 0,
    detail: overbuilt.length ? `over-built: ${overbuilt.join(', ')}` : 'refused every unnecessary object',
  });

  const so = input.simulation.sample_output;
  const rendered = (so.rendered_sample ?? '').toLowerCase();
  const missingSections = (so.required_sections ?? []).filter((s) => {
    const head = s.toLowerCase().split(/[\s/]+/)[0];
    return head.length > 2 && !rendered.includes(head);
  });
  checks.push({
    name: 'output_sections_present',
    ok: missingSections.length === 0,
    detail: missingSections.length ? `sample missing sections: ${missingSections.join(', ')}` : 'sample output covers required sections',
  });

  const computed = Object.keys(so.computed_fields ?? {}).length;
  checks.push({ name: 'computed_fields', ok: computed > 0, detail: `${computed} computed field(s) in the sample output` });

  return { passed: checks.every((c) => c.ok), checks };
}
