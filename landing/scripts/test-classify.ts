// Golden test for archetype classification (corpus doc 02 / lib/rules-engine).
// Deterministic — no LLM, no DB. Builds labeled canonical stores and asserts
// the archetype + borderline flag. Run: npx tsx scripts/test-classify.ts
//
// These cases pin the tuning: the noisy-`systems` gate (vague/manual systems
// must NOT trip bridge/integrated), the document-generation prior, and that
// genuine multi-system integrations are still classified as bridge/integrated.

import { emptyStore } from '../lib/canonical';
import { classify, isClassificationBorderline } from '../lib/rules-engine';
import {
  OutputSchema, InputSchema, ActorSchema, SystemConnectorSchema,
  ProcessStepSchema, DecisionRuleSchema,
  type CanonicalStore, type WorkflowIdentity,
} from '../lib/canonical-schema';

// ── builders (lean on the schemas' own defaults) ──
type P<T> = Partial<T>;
const out = (o: P<ReturnType<typeof OutputSchema.parse>> = {}) => OutputSchema.parse(o);
const inp = (o: P<ReturnType<typeof InputSchema.parse>> = {}) => InputSchema.parse(o);
const actor = (role_name: string, o: P<ReturnType<typeof ActorSchema.parse>> = {}) => ActorSchema.parse({ role_name, ...o });
const sys = (o: P<ReturnType<typeof SystemConnectorSchema.parse>> = {}) => SystemConnectorSchema.parse(o);
const step = (o: P<ReturnType<typeof ProcessStepSchema.parse>> = {}) => ProcessStepSchema.parse(o);
const rule = (o: P<ReturnType<typeof DecisionRuleSchema.parse>> = {}) => DecisionRuleSchema.parse(o);

interface StoreParts {
  identity?: Partial<WorkflowIdentity>;
  outputs?: CanonicalStore['outputs'];
  inputs?: CanonicalStore['inputs'];
  actors?: CanonicalStore['actors'];
  systems?: CanonicalStore['systems'];
  steps?: CanonicalStore['steps'];
  rules?: CanonicalStore['rules'];
}
function mkStore(parts: StoreParts): CanonicalStore {
  const s = emptyStore('test-session', 'wf-test');
  if (parts.identity) Object.assign(s.identity, parts.identity);
  s.outputs = parts.outputs ?? [];
  s.inputs = parts.inputs ?? [];
  s.actors = parts.actors ?? [];
  s.systems = parts.systems ?? [];
  s.steps = parts.steps ?? [];
  s.rules = parts.rules ?? [];
  return s;
}

const nSteps = (n: number) => Array.from({ length: n }, (_, i) => step({ step_name: `step ${i + 1}`, sequence_order: i + 1 }));
const nRules = (n: number) => Array.from({ length: n }, (_, i) => rule({ rule_name: `rule ${i + 1}` }));

// A real, live integration (counts toward systems/reads/writes).
const apiRead = (name: string) => sys({ system_name: name, connection_type: 'api', read_required: true, confidence_score: 0.9 });
const apiWrite = (name: string) => sys({ system_name: name, connection_type: 'api', write_required: true, confidence_score: 0.9 });
// A vague/manual "system" the LLM over-extracted (must be ignored).
const vague = (name: string, write = false) => sys({ system_name: name, connection_type: write ? 'manual_entry' : 'unknown', read_required: !write, write_required: write });

interface Case { name: string; store: CanonicalStore; expect: string; borderline?: boolean }

const cases: Case[] = [
  {
    name: 'invoice (doc-gen, no systems)',
    expect: 'sharp_point_solution', borderline: false,
    store: mkStore({
      identity: { workflow_type: 'document_generation', primary_objective: 'monthly invoice' },
      outputs: [out({ output_name: 'Invoice', output_type: 'document' })],
      inputs: [inp({ input_name: 'request', input_type: 'required_workflow_input' })],
      actors: [actor('Owner')], steps: nSteps(4), rules: nRules(3),
    }),
  },
  {
    name: 'priced proposal (doc-gen)',
    expect: 'sharp_point_solution',
    store: mkStore({
      identity: { workflow_type: 'document_generation', primary_objective: 'priced proposal' },
      outputs: [out({ output_name: 'Proposal', output_type: 'document' })],
      inputs: [inp({ input_name: 'brief', input_type: 'both' })],
      actors: [actor('Creative Director'), actor('Account Lead')], steps: nSteps(5), rules: nRules(4),
    }),
  },
  {
    name: 'strata quote — REGRESSION (3 vague systems must not trip bridge)',
    expect: 'sharp_point_solution',
    store: mkStore({
      identity: { workflow_type: 'document_generation', primary_objective: 'seasonal quote' },
      outputs: [out({ output_name: 'Quote', output_type: 'document' })],
      inputs: [inp({ input_name: 'request email', input_type: 'both' })],
      actors: [actor('Owner'), actor('Board'), actor('Estimator')],
      systems: [vague('Inbox'), vague('Board portal'), vague('Prior vendor', true)],
      steps: nSteps(8), rules: nRules(6),
    }),
  },
  {
    name: 'Shopify → QuickBooks (genuine bridge)',
    expect: 'bridge', borderline: true,
    store: mkStore({
      identity: { workflow_type: 'data_transformation', primary_objective: 'sync orders to accounting' },
      outputs: [out({ output_name: 'QB entry', output_type: 'record_update' })],
      inputs: [inp({ input_name: 'order', input_type: 'required_workflow_input' })],
      actors: [actor('Bookkeeper')],
      systems: [apiRead('Shopify'), apiWrite('QuickBooks')],
      steps: nSteps(5), rules: nRules(1),
    }),
  },
  {
    name: 'multi-system orchestration (integrated)',
    expect: 'integrated_workflow',
    store: mkStore({
      identity: { workflow_type: 'multi_step_orchestration', primary_objective: 'nightly reconcile across systems' },
      outputs: [out({ output_name: 'Reconcile log', output_type: 'record_update' })],
      inputs: [inp({ input_name: 'trigger', input_type: 'required_workflow_input' })],
      actors: [actor('Ops'), actor('Finance')],
      systems: [apiRead('Stripe'), apiRead('NetSuite'), apiRead('Salesforce')],
      steps: nSteps(16), rules: nRules(5),
    }),
  },
  {
    name: 'decision recommendation (decision-support)',
    expect: 'decision_support_app',
    store: mkStore({
      identity: { workflow_type: 'decision_support', primary_objective: 'approve or decline' },
      outputs: [out({ output_name: 'Recommendation', output_type: 'decision' })],
      inputs: [inp({ input_name: 'application', input_type: 'required_workflow_input' })],
      actors: [actor('Underwriter'), actor('Manager')], steps: nSteps(3), rules: nRules(2),
    }),
  },
  {
    name: 'live dashboard (app, not sharp_point)',
    expect: 'app', borderline: true,
    store: mkStore({
      identity: { workflow_type: 'monitoring_alerting', primary_objective: 'live KPI surface' },
      outputs: [out({ output_name: 'KPI board', output_type: 'dashboard' })],
      inputs: [inp({ input_name: 'feed', input_type: 'required_workflow_input' })],
      actors: [actor('Manager'), actor('Analyst')], steps: nSteps(3), rules: nRules(2),
    }),
  },
  {
    name: 'tiny one-shot tool (mini_app)',
    expect: 'mini_app',
    store: mkStore({
      identity: { workflow_type: 'other', primary_objective: 'reformat a value' },
      outputs: [out({ output_name: 'Formatted', output_type: 'message' })],
      inputs: [inp({ input_name: 'value', input_type: 'required_workflow_input' })],
      actors: [actor('User')], steps: nSteps(2), rules: nRules(1),
    }),
  },
  {
    name: 'single reusable step (workflow_component)',
    expect: 'workflow_component',
    store: mkStore({
      identity: { workflow_type: 'extraction_enrichment', primary_objective: 'enrich one field' },
      outputs: [out({ output_name: 'Enriched', output_type: 'record_update' })],
      inputs: [inp({ input_name: 'record', input_type: 'required_workflow_input' })],
      actors: [actor('System')], steps: nSteps(1), rules: [],
    }),
  },
];

let pass = 0; let fail = 0;
for (const c of cases) {
  classify(c.store);
  const got = c.store.archetype!.primary_archetype;
  const ok = got === c.expect;
  let bok = true;
  if (c.borderline !== undefined) {
    const b = isClassificationBorderline(c.store);
    bok = b === c.borderline;
  }
  if (ok && bok) {
    pass++;
    console.log(`  PASS  ${c.name}  → ${got}`);
  } else {
    fail++;
    if (!ok) console.log(`  FAIL  ${c.name}  → got ${got}, expected ${c.expect}`);
    if (!bok) console.log(`  FAIL  ${c.name}  → borderline ${isClassificationBorderline(c.store)}, expected ${c.borderline}`);
    console.log(`        evidence: ${c.store.archetype!.evidence_for_classification}`);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) { console.error(`\n${fail} classification case(s) failed.`); process.exit(1); }
console.log('All archetype classification cases passed.');
