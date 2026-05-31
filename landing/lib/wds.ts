// lib/wds.ts
//
// The Workflow Design Specification projection (corpus doc 07) — the seam
// artifact Swarm 2 consumes. Pure, deterministic function of the canonical
// store. No LLM. The WDS is INTERNAL (the user never reads it); the user sees
// only the two Simulation-Pack surfaces (lib/simulation.ts).

import type { CanonicalStore } from './canonical-schema';
import type { Wds, BuildRecommendation } from './swarm/contract';
import { summarizeReadiness } from './gaps';

const isRuntime = (t: string) => t === 'required_workflow_input' || t === 'both';

export function buildWds(store: CanonicalStore): Wds {
  const a = store.archetype;
  const readiness = summarizeReadiness(store.gaps);

  const confidences = [
    store.identity.confidence_score,
    a?.confidence_score ?? null,
    ...store.outputs.map((o) => o.confidence_score),
    ...store.rules.map((r) => r.confidence_score),
  ].filter((c): c is number => typeof c === 'number');
  const overall = confidences.length ? confidences.reduce((s, c) => s + c, 0) / confidences.length : 0.7;

  const build_recommendation: BuildRecommendation = {
    primary_archetype: a?.primary_archetype ?? 'unknown',
    secondary_archetype: a?.secondary_archetype ?? 'unknown',
    recommended_build_path: a?.recommended_build_path ?? null,
    required_components: a?.required_boverse_components ?? [],
    optional_components: a?.optional_components ?? [],
    unnecessary_components: a?.unnecessary_components ?? [],
    build_readiness: readiness,
  };

  // Fall back to a concise, human name when extraction didn't capture one:
  // "<client> — <primary output>", else the stated objective, else null.
  const _out0 = store.outputs[0]?.output_name ?? null;
  const _composed = [store.identity.client_name, _out0].filter(Boolean).join(' — ');
  const workflowName =
    store.identity.workflow_name ?? (_composed || null) ?? store.identity.primary_objective ?? null;

  return {
    workflow_id: store.identity.workflow_id ?? '',
    version: 1,
    generated_at: new Date().toISOString(),
    workflow_name: workflowName,
    client_name: store.identity.client_name,
    stated_problem: store.identity.stated_problem,
    inferred_problem: store.identity.inferred_problem,
    primary_objective: store.identity.primary_objective,
    workflow_type: store.identity.workflow_type,
    overall_confidence: Math.max(0, Math.min(1, overall)),
    classification: {
      primary_archetype: a?.primary_archetype ?? 'unknown',
      secondary_archetype: a?.secondary_archetype ?? 'unknown',
      complexity_level: a?.complexity_level ?? 'unknown',
      classification_confidence: a?.confidence_score ?? null,
      evidence_for_classification: a?.evidence_for_classification ?? null,
    },
    outcomes: store.outcomes,
    outputs: store.outputs,
    inputs: store.inputs.filter((i) => isRuntime(i.input_type)),
    actors: store.actors,
    systems: store.systems,
    steps: store.steps,
    rules: store.rules,
    hitl: store.hitl,
    ledger: store.gaps,
    provenance: store.provenance,
    build_recommendation,
  };
}
