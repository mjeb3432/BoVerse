// lib/registry.ts
//
// The Attribute Registry, as data (corpus doc 03). It defines WHAT facts to
// look for in uploaded evidence and WHICH canonical field each populates, and
// it drives registry-GUIDED extraction:
//
//   1. ExtractionEnvelopeSchema — a permissive structured-output schema the LLM
//      fills. Enum-ish fields are plain strings here (coerced to canonical enums
//      at map time) so extraction never hard-fails on a provider quirk; arrays
//      carry NO bounds (Cerebras rejects minItems/maxItems); nullable not
//      optional (Groq strict `required`).
//   2. extractionSystemPrompt() — the registry-derived instruction.
//   3. mapExtractionToStore() — envelope → CanonicalStore + provenance, with the
//      schema's closed enums imposed deterministically (the corpus determinism
//      boundary: probabilistic read in, typed canonical facts out).

import { z } from 'zod';
import {
  WorkflowTypeEnum,
  OutputTypeEnum,
  OutputFormatEnum,
  InputTypeEnum,
  InputFormatEnum,
  StructuredEnum,
  RequiredOptionalEnum,
  PersonOrTeamEnum,
  ApprovalAuthorityEnum,
  InteractionTypeEnum,
  ConnectionTypeEnum,
  DeterministicStatusEnum,
  ReviewTriggerEnum,
  type CanonicalStore,
  type Provenance,
} from './canonical-schema';
import { emptyStore, makeProvenance } from './canonical';

// ─── Registry reference (categories → fields → cues) ─────────────────────────
// Compact, for the operator drawer + prompt grounding. Not exhaustive.
export interface RegistryAttribute {
  attribute: string;
  table: string;
  category: string;
  cues: string;
}
export const REGISTRY: RegistryAttribute[] = [
  { attribute: 'primary_objective', table: 'workflow_identity', category: 'outcome', cues: 'the one thing the workflow must achieve; "we want…", goal statements' },
  { attribute: 'outcome_description', table: 'outcome', category: 'outcome', cues: 'the north-star result; pain removed; time/revenue/risk language' },
  { attribute: 'output_name / output_type / output_format', table: 'output', category: 'output', cues: 'the deliverable; sample outputs; "proposal", "report", PDF/email' },
  { attribute: 'required_sections / required_fields', table: 'output', category: 'output', cues: 'headings + named values a correct output must contain' },
  { attribute: 'input_name / input_type / format', table: 'input', category: 'inputs', cues: 'briefs, rate cards, exports; distinguish evidence vs per-run inputs' },
  { attribute: 'role_name / approval_authority', table: 'actor', category: 'actors', cues: 'named people/teams; who approves; sign-off authority' },
  { attribute: 'system_name / connection_type', table: 'system_connector', category: 'systems', cues: 'tools touched; QuickBooks/Notion/CRM; API/MCP/export/manual' },
  { attribute: 'rule_name / condition / action / threshold', table: 'decision_rule', category: 'decisions', cues: 'pricing logic, multipliers, discounts, approval gates, ordering rules' },
  { attribute: 'step_name / primitive flags', table: 'process_step', category: 'decisions', cues: 'the ordered steps; which are deterministic vs reasoning vs human gate' },
  { attribute: 'human_role / review_trigger', table: 'human_review', category: 'human_review', cues: 'where a human must approve; thresholds that route to review' },
];

// ─── Extraction envelope (permissive; coerced at map time) ───────────────────
const Conf = z.number().nullable();

const OutputFact = z.object({
  output_name: z.string().nullable(),
  output_type: z.string().nullable(),
  output_format: z.string().nullable(),
  required_sections: z.array(z.string()),
  required_fields: z.array(z.string()),
  quality_criteria: z.array(z.string()),
  source_examples: z.array(z.string()),
  approval_required: z.boolean().nullable(),
  confidence: Conf,
});
const InputFact = z.object({
  input_name: z.string().nullable(),
  // 'evidence' (used only to discover) | 'runtime' (fed every run) | 'both'
  input_role: z.string().nullable(),
  source_system: z.string().nullable(),
  format: z.string().nullable(),
  structured_or_unstructured: z.string().nullable(),
  required_or_optional: z.string().nullable(),
  confidence: Conf,
});
const ActorFact = z.object({
  role_name: z.string().nullable(),
  person_or_team: z.string().nullable(),
  responsibility: z.string().nullable(),
  approval_authority: z.string().nullable(),
  interaction_type: z.string().nullable(),
  confidence: Conf,
});
const SystemFact = z.object({
  system_name: z.string().nullable(),
  connection_type: z.string().nullable(),
  read_required: z.boolean().nullable(),
  write_required: z.boolean().nullable(),
  confidence: Conf,
});
const StepFact = z.object({
  step_name: z.string().nullable(),
  sequence_order: z.number().nullable(),
  input_required: z.array(z.string()),
  output_produced: z.string().nullable(),
  actor_responsible: z.string().nullable(),
  deterministic_rule_available: z.boolean().nullable(),
  probabilistic_reasoning_required: z.boolean().nullable(),
  hitl_required: z.boolean().nullable(),
  confidence: Conf,
});
const RuleFact = z.object({
  rule_name: z.string().nullable(),
  condition: z.string().nullable(),
  action: z.string().nullable(),
  threshold: z.string().nullable(),
  applies_to_step_name: z.string().nullable(),
  deterministic_status: z.string().nullable(),
  requires_confirmation: z.boolean().nullable(),
  confidence: Conf,
});
const HitlFact = z.object({
  workflow_stage: z.string().nullable(),
  human_role: z.string().nullable(),
  reason_for_review: z.string().nullable(),
  review_trigger: z.string().nullable(),
  approval_required: z.boolean().nullable(),
  confidence: Conf,
});
const OutcomeFact = z.object({
  outcome_description: z.string().nullable(),
  business_value: z.string().nullable(),
  success_metric: z.string().nullable(),
  time_savings: z.string().nullable(),
  confidence: Conf,
});

export const ExtractionEnvelopeSchema = z.object({
  identity: z.object({
    workflow_name: z.string().nullable(),
    client_name: z.string().nullable(),
    stated_problem: z.string().nullable(),
    inferred_problem: z.string().nullable(),
    primary_objective: z.string().nullable(),
    workflow_type: z.string().nullable(),
    confidence: Conf,
  }),
  outcomes: z.array(OutcomeFact),
  outputs: z.array(OutputFact),
  inputs: z.array(InputFact),
  actors: z.array(ActorFact),
  systems: z.array(SystemFact),
  steps: z.array(StepFact),
  rules: z.array(RuleFact),
  hitl: z.array(HitlFact),
});
export type ExtractionEnvelope = z.infer<typeof ExtractionEnvelopeSchema>;

// ─── system prompt (registry-derived) ────────────────────────────────────────
export function extractionSystemPrompt(statedOutcome: string | null): string {
  return `You are BoVerse's discovery engine. You read messy business evidence (briefs, rate cards, pricing rules, SOPs/playbooks, past sample outputs, spreadsheets, screenshots) and reason BACKWARD from the evidence to the workflow it implies. Extract ONLY what the evidence supports — never invent.

${statedOutcome ? `The user stated this desired OUTCOME: "${statedOutcome}". Anchor the extraction to it.\n` : ''}
Extract these canonical facts (leave a field null when the evidence is silent):

- identity: workflow_name, client_name, stated_problem (as the client phrased it), inferred_problem (as you read it), primary_objective (the single most important thing), workflow_type (one of: document_generation, data_transformation, decision_support, classification_routing, monitoring_alerting, extraction_enrichment, multi_step_orchestration, approval_review, other).
- outcomes: outcome_description, business_value, success_metric, time_savings.
- outputs: the deliverable(s) — output_name, output_type, output_format, required_sections (headings the output must contain), required_fields (named values), quality_criteria, source_examples (ids/names of any sample outputs in the evidence), approval_required.
- inputs: every artifact — input_name, and input_role = "evidence" (used only to understand the workflow, e.g. a playbook or a past proposal), "runtime" (fed on every run), or "both"; plus source_system, format, structured_or_unstructured, required_or_optional.
- actors: role_name, person_or_team, responsibility, approval_authority, interaction_type.
- systems: external tools touched — system_name, connection_type, read_required, write_required.
- steps: the ordered process — step_name, sequence_order, input_required (input_names it consumes), output_produced, actor_responsible, and the three booleans deterministic_rule_available / probabilistic_reasoning_required / hitl_required.
- rules: business logic — rule_name, condition, action, threshold, applies_to_step_name, deterministic_status, requires_confirmation. Capture pricing math, multipliers, discounts, ordering rules, and approval gates precisely.
- hitl: human review points — workflow_stage, human_role (must match an actor role_name), reason_for_review, review_trigger, approval_required.

Confidence per fact (the 'confidence' number, 0-1): 0.9+ directly visible in the evidence; 0.7-0.9 strongly implied; 0.5-0.7 plausible; <0.5 a guess. Be specific to the actual evidence.`;
}

// ─── envelope → canonical store ──────────────────────────────────────────────

function coerce<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  if (typeof value === 'string') {
    if ((options as readonly string[]).includes(value)) return value as T;
    const norm = value.trim().toLowerCase().replace(/[\s/-]+/g, '_');
    if ((options as readonly string[]).includes(norm)) return norm as T;
  }
  return fallback;
}

function coerceInputType(role: string | null): CanonicalStore['inputs'][number]['input_type'] {
  const r = (role ?? '').toLowerCase();
  if (r.includes('both')) return 'both';
  if (r.startsWith('runtime') || r.includes('required_workflow_input') || r.includes('per_run') || r.includes('per-run')) return 'required_workflow_input';
  if (r.includes('evidence') || r.includes('discovery')) return 'discovery_evidence';
  return coerce(role, InputTypeEnum.options, 'both');
}

const clamp = (n: number | null | undefined): number | null =>
  n == null ? null : Math.max(0, Math.min(1, n));

/** Map a (probabilistic) extraction envelope into the (deterministic) store. */
export function mapExtractionToStore(
  env: ExtractionEnvelope,
  sessionId: string,
  workflowId: string,
  sourceDocs: string[],
): CanonicalStore {
  const store = emptyStore(sessionId, workflowId);
  const src = sourceDocs.join(', ') || null;
  const prov: Provenance[] = [];

  // identity
  store.identity.workflow_name = env.identity.workflow_name;
  store.identity.client_name = env.identity.client_name;
  store.identity.stated_problem = env.identity.stated_problem;
  store.identity.inferred_problem = env.identity.inferred_problem;
  store.identity.primary_objective = env.identity.primary_objective;
  store.identity.workflow_type = coerce(env.identity.workflow_type, WorkflowTypeEnum.options, 'unknown');
  store.identity.confidence_score = clamp(env.identity.confidence);
  prov.push(makeProvenance({ targetTable: 'workflow_identity', targetField: 'primary_objective', sourceDocument: src, extractedValue: env.identity.primary_objective, confidence: clamp(env.identity.confidence) }));

  store.outcomes = env.outcomes.map((o) => ({
    outcome_description: o.outcome_description,
    business_value: o.business_value,
    success_metric: o.success_metric,
    time_savings: o.time_savings,
    confidence_score: clamp(o.confidence),
  }));

  store.outputs = env.outputs.map((o) => ({
    output_name: o.output_name,
    output_type: coerce(o.output_type, OutputTypeEnum.options, 'unknown'),
    output_format: coerce(o.output_format, OutputFormatEnum.options, 'unknown'),
    required_sections: o.required_sections,
    required_fields: o.required_fields,
    editable_by_user: true,
    approval_required: o.approval_required ?? false,
    source_examples: o.source_examples,
    quality_criteria: o.quality_criteria,
    confidence_score: clamp(o.confidence),
  }));
  for (const o of store.outputs) {
    prov.push(makeProvenance({ targetTable: 'output', targetField: 'output_name', sourceDocument: src, extractedValue: o.output_name, confidence: o.confidence_score }));
  }

  store.inputs = env.inputs.map((i) => ({
    input_name: i.input_name,
    input_type: coerceInputType(i.input_role),
    source_system: i.source_system,
    format: coerce(i.format, InputFormatEnum.options, 'unknown'),
    structured_or_unstructured: coerce(i.structured_or_unstructured, StructuredEnum.options, 'unknown'),
    required_or_optional: coerce(i.required_or_optional, RequiredOptionalEnum.options, 'unknown'),
    example_value: null,
    confidence_score: clamp(i.confidence),
  }));
  for (const i of store.inputs) {
    prov.push(makeProvenance({ targetTable: 'input', targetField: 'input_type', sourceDocument: src, extractedValue: `${i.input_name}=${i.input_type}`, confidence: i.confidence_score }));
  }

  store.actors = env.actors
    .filter((a) => a.role_name)
    .map((a) => ({
      role_name: a.role_name as string,
      person_or_team: coerce(a.person_or_team, PersonOrTeamEnum.options, 'unknown'),
      responsibility: a.responsibility,
      approval_authority: coerce(a.approval_authority, ApprovalAuthorityEnum.options, 'unknown'),
      interaction_type: coerce(a.interaction_type, InteractionTypeEnum.options, 'unknown'),
      confidence_score: clamp(a.confidence),
    }));

  store.systems = env.systems.map((s) => ({
    system_name: s.system_name,
    connection_type: coerce(s.connection_type, ConnectionTypeEnum.options, 'unknown'),
    read_required: s.read_required ?? false,
    write_required: s.write_required ?? false,
    authentication_required: 'unknown',
    data_objects_accessed: [],
    confidence_score: clamp(s.confidence),
  }));

  store.steps = env.steps.map((s, idx) => ({
    step_name: s.step_name,
    sequence_order: s.sequence_order ?? idx + 1,
    input_required: s.input_required,
    output_produced: s.output_produced,
    actor_responsible: s.actor_responsible,
    deterministic_rule_available: s.deterministic_rule_available ?? false,
    probabilistic_reasoning_required: s.probabilistic_reasoning_required ?? false,
    hitl_required: s.hitl_required ?? false,
    confidence_score: clamp(s.confidence),
  }));

  store.rules = env.rules.map((r) => ({
    rule_name: r.rule_name,
    condition: r.condition,
    action: r.action,
    threshold: r.threshold,
    applies_to_step_name: r.applies_to_step_name,
    deterministic_status: coerce(r.deterministic_status, DeterministicStatusEnum.options, 'unknown'),
    requires_confirmation: r.requires_confirmation ?? false,
    confidence_score: clamp(r.confidence),
  }));
  for (const r of store.rules) {
    prov.push(makeProvenance({ targetTable: 'decision_rule', targetField: 'rule_name', sourceDocument: src, extractedValue: r.rule_name, confidence: r.confidence_score }));
  }

  store.hitl = env.hitl.map((h) => ({
    workflow_stage: h.workflow_stage,
    human_role: h.human_role,
    reason_for_review: h.reason_for_review,
    review_trigger: coerce(h.review_trigger, ReviewTriggerEnum.options, 'unknown'),
    confidence_threshold: null,
    approval_required: h.approval_required ?? false,
    confidence_score: clamp(h.confidence),
  }));

  store.provenance = prov;
  return store;
}
