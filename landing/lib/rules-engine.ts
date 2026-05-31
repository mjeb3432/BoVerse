// lib/rules-engine.ts
//
// The deterministic interpretation layer (corpus doc 05 Part A + doc 02
// archetype tie-break). Pure functions over canonical rows: same facts in →
// same classification and same build posture out. NO LLM. This is the
// determinism the corpus relies on, downstream of probabilistic extraction.

import type { Archetype, CanonicalStore, ArchetypeRow } from './canonical-schema';
import { computeBuildPlan } from './build-mapping';

interface Signals {
  outputs: number;
  actors: number;
  runtimeInputs: number;
  writes: number;
  reads: number;
  systems: number;
  steps: number;
  rules: number;
  decisionHeadline: boolean;
  dashboardHeadline: boolean;
  hitlGates: number;
}

function signalsOf(store: CanonicalStore): Signals {
  return {
    outputs: store.outputs.length,
    actors: store.actors.length,
    runtimeInputs: store.inputs.filter((i) => i.input_type === 'required_workflow_input' || i.input_type === 'both').length,
    writes: store.systems.filter((s) => s.write_required).length,
    reads: store.systems.filter((s) => s.read_required).length,
    systems: store.systems.length,
    steps: store.steps.length,
    rules: store.rules.length,
    decisionHeadline: store.outputs.some((o) => o.output_type === 'decision'),
    dashboardHeadline: store.outputs.some((o) => o.output_type === 'dashboard' || o.output_type === 'report'),
    hitlGates: store.hitl.length,
  };
}

/**
 * Tie-break (corpus 02 §2.2): pick the cheapest archetype that fits, UNLESS a
 * more expensive archetype's decisive signal fires (bridge ← system writes;
 * decision-support ← a decision headline; integrated ← many systems/steps).
 */
function classifyArchetype(s: Signals): { primary: Archetype; complexity: ArchetypeRow['complexity_level']; confidence: number; evidence: string } {
  let primary: Archetype;
  let why: string;

  if (s.steps <= 1 && s.outputs <= 1 && s.rules === 0) {
    primary = 'workflow_component';
    why = 'a single reusable step with no decisioning';
  } else if (s.outputs <= 1 && s.actors <= 1 && s.rules <= 1 && s.systems === 0) {
    primary = 'mini_app';
    why = 'one tiny self-contained tool (one input → one output)';
  } else if (s.writes >= 1 && s.systems >= 2 && s.outputs <= 1) {
    primary = 'bridge';
    why = 'decisive signal: writes data between two or more systems';
  } else if (s.decisionHeadline && s.outputs <= 2) {
    primary = 'decision_support_app';
    why = 'decisive signal: the headline output is a decision/recommendation';
  } else if (s.systems >= 3 || s.steps >= 15) {
    primary = 'integrated_workflow';
    why = 'decisive signal: many steps across many systems';
  } else if (s.outputs <= 1 && s.actors <= 3 && s.writes === 0 && s.systems <= 1) {
    primary = 'sharp_point_solution';
    why = 'one output, one user group, limited inputs, no system writes';
  } else if (s.dashboardHeadline) {
    primary = 'app';
    why = 'a persistent dashboard/report surface';
  } else {
    primary = 'app';
    why = 'multi-output or multi-user scope';
  }

  const complexity: ArchetypeRow['complexity_level'] =
    s.steps <= 6 && s.rules <= 8 ? 'simple' : s.steps <= 15 ? 'moderate' : 'complex';

  // confidence: decisive branches are surer than the default fall-through.
  const decisive = ['bridge', 'decision_support_app', 'integrated_workflow', 'sharp_point_solution', 'workflow_component', 'mini_app'].includes(primary);
  const confidence = decisive ? 0.9 : 0.7;

  const evidence = `${why} [outputs=${s.outputs}, actors=${s.actors}, runtime_inputs=${s.runtimeInputs}, systems=${s.systems} (writes=${s.writes}), steps=${s.steps}, rules=${s.rules}, hitl=${s.hitlGates}]`;
  return { primary, complexity, confidence, evidence };
}

/**
 * Classify the workflow and write the archetype row (incl. the build posture)
 * onto the store. Also backfills a human-review gate when an output requires
 * approval but none was extracted. Mutates and returns the store.
 */
export function classify(store: CanonicalStore): CanonicalStore {
  const s = signalsOf(store);
  const { primary, complexity, confidence, evidence } = classifyArchetype(s);
  const plan = computeBuildPlan(primary);

  store.archetype = {
    primary_archetype: primary,
    secondary_archetype: 'none',
    evidence_for_classification: evidence,
    complexity_level: complexity,
    recommended_build_path: plan.build_path,
    required_boverse_components: plan.required,
    optional_components: plan.optional,
    unnecessary_components: plan.unnecessary,
    confidence_score: confidence,
  };

  // R-HITL backfill: an output that needs approval must have a review gate.
  const needsApproval = store.outputs.some((o) => o.approval_required);
  if (needsApproval && store.hitl.length === 0) {
    const approver =
      store.actors.find((a) => a.approval_authority === 'approve_unbounded') ??
      store.actors.find((a) => a.approval_authority === 'approve_high') ??
      store.actors.find((a) => a.approval_authority === 'approve_low') ??
      store.actors[0];
    const hasThresholdRule = store.rules.some((r) => /\$|threshold|>=|>|gate/i.test(`${r.threshold ?? ''} ${r.rule_name ?? ''} ${r.condition ?? ''}`));
    store.hitl.push({
      workflow_stage: 'before_send',
      human_role: approver?.role_name ?? null,
      reason_for_review: 'Output requires approval before release.',
      review_trigger: hasThresholdRule ? 'on_threshold_breach' : 'pre_send',
      confidence_threshold: null,
      approval_required: true,
      confidence_score: 0.7,
    });
  }

  return store;
}
