// lib/swarm/contract.ts
//
// THE SEAM between the two swarms. Swarm 1 (Discovery) emits a Swarm2Input
// (WDS + Simulation Pack + Approval record); Swarm 2 (Build) consumes it and
// compiles only the objects the archetype requires. Field names reuse the
// canonical row schemas (lib/canonical-schema.ts) so there is zero translation.
//
// Grounded in docs/workflow-creator/07 (WDS), 08 (Simulation Pack),
// 09 (build recommendation), and drafts/04 Parts B/C (the two business surfaces).

import { z } from 'zod';
import {
  ArchetypeEnum,
  SecondaryArchetypeEnum,
  ObjectTypeEnum,
  ComplexityLevelEnum,
  BuildReadinessEnum,
  WorkflowTypeEnum,
  OutcomeSchema,
  OutputSchema,
  InputSchema,
  ActorSchema,
  SystemConnectorSchema,
  ProcessStepSchema,
  DecisionRuleSchema,
  HumanReviewSchema,
  MissingInformationSchema,
  ProvenanceSchema,
} from '../canonical-schema';

const PrimaryArchetype = ArchetypeEnum.or(z.literal('unknown'));
const SecondaryArchetype = SecondaryArchetypeEnum.or(z.literal('unknown'));

// ─── Build recommendation (corpus 07 §11 / 09) — the load-bearing contract ───
export const BuildRecommendationSchema = z.object({
  primary_archetype: PrimaryArchetype,
  secondary_archetype: SecondaryArchetype,
  recommended_build_path: z.string().nullable(),
  required_components: z.array(ObjectTypeEnum),   // build these (authoritative)
  optional_components: z.array(ObjectTypeEnum),   // build only with evidenced justification
  unnecessary_components: z.array(ObjectTypeEnum), // MUST refuse to build
  build_readiness: BuildReadinessEnum,
});
export type BuildRecommendation = z.infer<typeof BuildRecommendationSchema>;

// ─── Workflow Design Specification (the deterministic blueprint) ─────────────
export const WdsSchema = z.object({
  workflow_id: z.string(),
  version: z.number().int(),
  generated_at: z.string(),
  workflow_name: z.string().nullable(),
  client_name: z.string().nullable(),
  stated_problem: z.string().nullable(),
  inferred_problem: z.string().nullable(),
  primary_objective: z.string().nullable(),
  workflow_type: WorkflowTypeEnum,
  overall_confidence: z.number().min(0).max(1),
  classification: z.object({
    primary_archetype: PrimaryArchetype,
    secondary_archetype: SecondaryArchetype,
    complexity_level: ComplexityLevelEnum,
    classification_confidence: z.number().min(0).max(1).nullable(),
    evidence_for_classification: z.string().nullable(),
  }),
  outcomes: z.array(OutcomeSchema),
  outputs: z.array(OutputSchema),
  inputs: z.array(InputSchema), // runtime-contract inputs (required_workflow_input | both)
  actors: z.array(ActorSchema),
  systems: z.array(SystemConnectorSchema),
  steps: z.array(ProcessStepSchema),
  rules: z.array(DecisionRuleSchema),
  hitl: z.array(HumanReviewSchema),
  ledger: z.array(MissingInformationSchema),
  provenance: z.array(ProvenanceSchema),
  build_recommendation: BuildRecommendationSchema,
});
export type Wds = z.infer<typeof WdsSchema>;

// ─── Simulation Pack = the two business-user surfaces (drafts/04 B + C) ──────
export const SimSchemaFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'enum', 'object']),
  description: z.string(),
  required: z.boolean(),
  enum_values: z.array(z.string()).nullable(),
});
export type SimSchemaField = z.infer<typeof SimSchemaFieldSchema>;

/** Part B — the rendered sample OUTPUT (the deliverable the user recognizes). */
export const SampleOutputSchema = z.object({
  output_name: z.string(),
  output_type: z.string(),
  output_format: z.string(),
  required_sections: z.array(z.string()),
  rendered_sample: z.string(),
  computed_fields: z.record(z.string(), z.unknown()), // priced totals etc.
});
export type SampleOutput = z.infer<typeof SampleOutputSchema>;

/** Part C — one rendered sample INPUT card (editable in the Part D loop). */
export const SampleInputSchema = z.object({
  input_name: z.string(),
  input_type: z.string(),
  format: z.string(),
  rendered: z.string(),
  example_value: z.unknown(),
});
export type SampleInput = z.infer<typeof SampleInputSchema>;

export const SimStepTraceSchema = z.object({
  sequence_order: z.number().int(),
  step_name: z.string(),
  consumed: z.string(),
  produced: z.string(),
  determinism: z.object({ rule: z.boolean(), reasoning: z.boolean(), hitl: z.boolean() }),
  rule_fired: z.string().nullable(),
});

export const SimulationPackSchema = z.object({
  workflow_id: z.string(),
  version: z.number().int(),
  input_contract: z.array(SimSchemaFieldSchema),
  sample_output: SampleOutputSchema,
  sample_inputs: z.array(SampleInputSchema),
  grading_targets: z.array(z.string()),
  step_trace: z.array(SimStepTraceSchema),
});
export type SimulationPack = z.infer<typeof SimulationPackSchema>;

// ─── Approval record — the gate that releases Swarm 2 (corpus 00 §4 step 11) ─
export const ApprovalRecordSchema = z.object({
  workflow_id: z.string(),
  wds_version: z.number().int(),
  approved: z.boolean(),
  approved_surfaces: z.object({ sample_output: z.boolean(), sample_inputs: z.boolean() }),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  build_readiness_at_approval: BuildReadinessEnum,
  assumptions_acknowledged: z.array(z.string()),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;

// ─── The complete Swarm 2 input ──────────────────────────────────────────────
export const Swarm2InputSchema = z.object({
  wds: WdsSchema,
  simulation: SimulationPackSchema,
  approval: ApprovalRecordSchema,
});
export type Swarm2Input = z.infer<typeof Swarm2InputSchema>;
