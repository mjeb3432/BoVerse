// lib/canonical-schema.ts
//
// The canonical store, in TypeScript. This is the SINGLE SOURCE OF TRUTH for the
// field names, types, and enumerations that the SQL migration
// `migrations/0005_canonical_store.sql` mirrors, that Swarm 1 (extraction → DAL)
// writes, and that Swarm 2 (the seam) reads.
//
// Grounded in docs/workflow-creator/04-canonical-schema.md (the 14 tables) and
// docs/workflow-creator/drafts/04-canonical-table.md Part A (the distilled subset).
//
// Determinism note (corpus 00 §7): LLM extraction is the probabilistic step. The
// closed enums + typed fields here — and the FK/CHECK constraints in 0005 — are
// the deterministic constraint that tames it. A fact with no valid home becomes a
// gap (missing_information), never a silent loss.

import { z } from 'zod';

// ─── Shared vocabulary (canonical tokens — do not rename) ────────────────────

/** The 9 archetypes (corpus 02 §3 / drafts 02 §2.1), snake_case tokens. */
export const ARCHETYPES = [
  'workflow_component', 'mini_app', 'sharp_point_solution', 'bridge', 'app',
  'decision_support_app', 'integrated_workflow', 'intelligence_layer', 'operating_layer_oso',
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

/**
 * The 10 BoVerse objects (corpus 10 / drafts 02 §3.3). We use these object
 * tokens as the SINGLE component vocabulary across archetype.*_components, the
 * build-mapping matrix, and the build_objects enum — collapsing the corpus's
 * 13-component → 10-object crosswalk for this first cut.
 */
export const OBJECT_TYPES = [
  'library', 'registry', 'canonical_tables', 'rules_wiki', 'workflow',
  'connectors', 'ui', 'audit_layer', 'reporting_layer', 'decision_layer',
] as const;
export type ObjectType = (typeof OBJECT_TYPES)[number];

/** The 5 primitives (README / drafts 02 §1). */
export const PRIMITIVES = ['ingest', 'transform', 'validate', 'action', 'feedback'] as const;
export type Primitive = (typeof PRIMITIVES)[number];

/** The 12 discovery categories (corpus 01 / drafts 00 §2). */
export const DISCOVERY_CATEGORIES = [
  'outcome', 'output', 'inputs', 'trigger', 'actors', 'human_review',
  'systems', 'knowledge', 'decisions', 'exceptions', 'audit', 'success',
] as const;
export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];

// ─── Enum schemas (each list mirrors a CHECK constraint in 0005) ─────────────

export const ArchetypeEnum = z.enum(ARCHETYPES);
export const SecondaryArchetypeEnum = z.enum([...ARCHETYPES, 'none'] as const);
export const ObjectTypeEnum = z.enum(OBJECT_TYPES);
export const PrimitiveEnum = z.enum(PRIMITIVES);

export const WorkflowTypeEnum = z.enum([
  'document_generation', 'data_transformation', 'decision_support', 'classification_routing',
  'monitoring_alerting', 'extraction_enrichment', 'multi_step_orchestration', 'approval_review',
  'other', 'unknown',
]);
export const OutputTypeEnum = z.enum([
  'document', 'report', 'dataset', 'record_update', 'message', 'decision', 'alert',
  'dashboard', 'api_response', 'other', 'unknown',
]);
export const OutputFormatEnum = z.enum([
  'pdf', 'docx', 'xlsx', 'csv', 'json', 'html', 'email', 'plain_text', 'slack_message',
  'db_write', 'other', 'unknown',
]);
export const InputTypeEnum = z.enum(['discovery_evidence', 'required_workflow_input', 'both', 'unknown']);
export const InputFormatEnum = z.enum([
  'pdf', 'docx', 'xlsx', 'csv', 'json', 'image', 'email', 'plain_text', 'api_payload',
  'voice_transcript', 'other', 'unknown',
]);
export const StructuredEnum = z.enum(['structured', 'semi_structured', 'unstructured', 'unknown']);
export const RequiredOptionalEnum = z.enum(['required', 'optional', 'conditional', 'unknown']);
export const PersonOrTeamEnum = z.enum(['individual', 'team', 'role_function', 'external_party', 'unknown']);
export const ApprovalAuthorityEnum = z.enum(['none', 'approve_low', 'approve_high', 'approve_unbounded', 'unknown']);
export const InteractionTypeEnum = z.enum(['performs_work', 'reviews', 'approves', 'is_informed', 'consulted', 'unknown']);
export const ConnectionTypeEnum = z.enum(['api', 'mcp', 'batch_export', 'file_drop', 'manual_entry', 'webhook', 'none', 'unknown']);
export const AuthRequiredEnum = z.enum(['none', 'api_key', 'oauth', 'basic', 'sso', 'certificate', 'unknown']);
export const DeterministicStatusEnum = z.enum(['deterministic', 'heuristic', 'probabilistic', 'unconfirmed', 'unknown']);
export const ReviewTriggerEnum = z.enum([
  'always', 'on_low_confidence', 'on_threshold_breach', 'on_exception', 'sampled',
  'on_high_value', 'pre_send', 'unknown',
]);
export const ComplexityLevelEnum = z.enum(['simple', 'moderate', 'complex', 'very_complex', 'unknown']);
export const SeverityEnum = z.enum(['critical', 'high', 'medium', 'low', 'unknown']);
export const BlockingStatusEnum = z.enum(['blocking', 'non_blocking', 'deferred', 'unknown']);
export const GapKindEnum = z.enum(['absence', 'low_confidence', 'broken_link', 'conflict', 'tech_stack']);
export const ResolutionStatusEnum = z.enum(['open', 'asked', 'answered', 'assumed', 'wont_fix', 'unknown']);
export const ExtractionMethodEnum = z.enum([
  'llm_extraction', 'direct_field', 'ocr', 'table_parse', 'transcription', 'rule_derived',
  'manual', 'unknown',
]);
export const ReviewStatusEnum = z.enum(['unreviewed', 'confirmed', 'corrected', 'rejected', 'unknown']);
export const BuildReadinessEnum = z.enum(['blocking', 'ready', 'ready_with_assumptions']);

// confidence helper: float[0..1], nullable (some derived rows omit it)
const conf = () => z.number().min(0).max(1).nullable();

// ─── Canonical table row schemas ─────────────────────────────────────────────
// Each schema is the LOGICAL row Swarm 1 writes. Server-managed columns
// (primary-key id, created_at, version defaults) are optional here and supplied
// by the DAL / database. Field names are identical to 0005 columns.

export const WorkflowIdentitySchema = z.object({
  workflow_id: z.string().optional(),
  session_id: z.string(),
  workflow_name: z.string().nullable().default(null),
  client_name: z.string().nullable().default(null),
  stated_problem: z.string().nullable().default(null),
  inferred_problem: z.string().nullable().default(null),
  primary_objective: z.string().nullable().default(null),
  workflow_type: WorkflowTypeEnum.default('unknown'),
  confidence_score: conf().default(null),
});
export type WorkflowIdentity = z.infer<typeof WorkflowIdentitySchema>;

export const OutcomeSchema = z.object({
  outcome_id: z.string().optional(),
  outcome_description: z.string().nullable().default(null),
  business_value: z.string().nullable().default(null),
  success_metric: z.string().nullable().default(null),
  time_savings: z.string().nullable().default(null),
  confidence_score: conf().default(null),
});
export type Outcome = z.infer<typeof OutcomeSchema>;

export const OutputSchema = z.object({
  output_id: z.string().optional(),
  output_name: z.string().nullable().default(null),
  output_type: OutputTypeEnum.default('unknown'),
  output_format: OutputFormatEnum.default('unknown'),
  required_sections: z.array(z.string()).default([]),
  required_fields: z.array(z.string()).default([]),
  editable_by_user: z.boolean().default(true),
  approval_required: z.boolean().default(false),
  source_examples: z.array(z.string()).default([]),
  quality_criteria: z.array(z.string()).default([]),
  confidence_score: conf().default(null),
});
export type Output = z.infer<typeof OutputSchema>;

export const InputSchema = z.object({
  input_id: z.string().optional(),
  input_name: z.string().nullable().default(null),
  input_type: InputTypeEnum.default('unknown'),
  source_system: z.string().nullable().default(null),
  format: InputFormatEnum.default('unknown'),
  structured_or_unstructured: StructuredEnum.default('unknown'),
  required_or_optional: RequiredOptionalEnum.default('unknown'),
  // The sample-INPUTS instance value (drafts/04 Part C). Open-shaped → jsonb.
  example_value: z.unknown().nullable().default(null),
  confidence_score: conf().default(null),
});
export type Input = z.infer<typeof InputSchema>;

export const ActorSchema = z.object({
  actor_id: z.string().optional(),
  role_name: z.string(),
  person_or_team: PersonOrTeamEnum.default('unknown'),
  responsibility: z.string().nullable().default(null),
  approval_authority: ApprovalAuthorityEnum.default('unknown'),
  interaction_type: InteractionTypeEnum.default('unknown'),
  confidence_score: conf().default(null),
});
export type Actor = z.infer<typeof ActorSchema>;

export const SystemConnectorSchema = z.object({
  connector_id: z.string().optional(),
  system_name: z.string().nullable().default(null),
  connection_type: ConnectionTypeEnum.default('unknown'),
  read_required: z.boolean().default(false),
  write_required: z.boolean().default(false),
  authentication_required: AuthRequiredEnum.default('unknown'),
  data_objects_accessed: z.array(z.string()).default([]),
  confidence_score: conf().default(null),
});
export type SystemConnector = z.infer<typeof SystemConnectorSchema>;

export const ProcessStepSchema = z.object({
  step_id: z.string().optional(),
  step_name: z.string().nullable().default(null),
  sequence_order: z.number().int().nullable().default(null),
  // Referenced inputs are addressed by input_name at extraction time, resolved
  // to input_id by the DAL. Stored as text[] of names for first-cut simplicity.
  input_required: z.array(z.string()).default([]),
  output_produced: z.string().nullable().default(null),
  actor_responsible: z.string().nullable().default(null),
  deterministic_rule_available: z.boolean().default(false),
  probabilistic_reasoning_required: z.boolean().default(false),
  hitl_required: z.boolean().default(false),
  confidence_score: conf().default(null),
});
export type ProcessStep = z.infer<typeof ProcessStepSchema>;

export const DecisionRuleSchema = z.object({
  rule_id: z.string().optional(),
  rule_name: z.string().nullable().default(null),
  condition: z.string().nullable().default(null),
  action: z.string().nullable().default(null),
  threshold: z.string().nullable().default(null),
  // Resolved to a step_id by the DAL when applies_to_step_name is given.
  applies_to_step_name: z.string().nullable().default(null),
  deterministic_status: DeterministicStatusEnum.default('unknown'),
  requires_confirmation: z.boolean().default(false),
  confidence_score: conf().default(null),
});
export type DecisionRule = z.infer<typeof DecisionRuleSchema>;

export const HumanReviewSchema = z.object({
  hitl_id: z.string().optional(),
  workflow_stage: z.string().nullable().default(null),
  human_role: z.string().nullable().default(null), // resolves to actor.role_name (app-validated)
  reason_for_review: z.string().nullable().default(null),
  review_trigger: ReviewTriggerEnum.default('unknown'),
  confidence_threshold: conf().default(null),
  approval_required: z.boolean().default(false),
  confidence_score: conf().default(null),
});
export type HumanReview = z.infer<typeof HumanReviewSchema>;

export const ArchetypeRowSchema = z.object({
  archetype_id: z.string().optional(),
  primary_archetype: ArchetypeEnum.or(z.literal('unknown')).default('unknown'),
  secondary_archetype: SecondaryArchetypeEnum.or(z.literal('unknown')).default('none'),
  evidence_for_classification: z.string().nullable().default(null),
  complexity_level: ComplexityLevelEnum.default('unknown'),
  recommended_build_path: z.string().nullable().default(null),
  required_boverse_components: z.array(ObjectTypeEnum).default([]),
  optional_components: z.array(ObjectTypeEnum).default([]),
  unnecessary_components: z.array(ObjectTypeEnum).default([]),
  confidence_score: conf().default(null),
});
export type ArchetypeRow = z.infer<typeof ArchetypeRowSchema>;

export const MissingInformationSchema = z.object({
  gap_id: z.string().optional(),
  missing_attribute: z.string().nullable().default(null),
  why_it_matters: z.string().nullable().default(null),
  affected_output: z.string().nullable().default(null),
  affected_step: z.string().nullable().default(null),
  possible_sources: z.array(z.string()).default([]),
  suggested_question: z.string().nullable().default(null),
  severity: SeverityEnum.default('unknown'),
  blocking_status: BlockingStatusEnum.default('unknown'),
  gap_kind: GapKindEnum.default('absence'),
  confidence_score: conf().default(null),
  resolution_status: ResolutionStatusEnum.default('open'),
});
export type MissingInformation = z.infer<typeof MissingInformationSchema>;

export const ProvenanceSchema = z.object({
  provenance_id: z.string().optional(),
  fact_id: z.string(),
  target_table: z.string().nullable().default(null),
  target_field: z.string().nullable().default(null),
  source_document: z.string().nullable().default(null),
  source_location: z.unknown().nullable().default(null),
  extracted_value: z.string().nullable().default(null),
  extraction_method: ExtractionMethodEnum.default('unknown'),
  confidence_score: conf().default(null),
  reviewer: z.string().nullable().default(null),
  review_status: ReviewStatusEnum.default('unreviewed'),
  version: z.number().int().default(1),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const WorkflowApprovalSchema = z.object({
  approval_id: z.string().optional(),
  approved_by: z.string().nullable().default(null),
  build_readiness: BuildReadinessEnum,
  wds_version: z.number().int().default(1),
  approved_at: z.string().optional(),
});
export type WorkflowApproval = z.infer<typeof WorkflowApprovalSchema>;

/**
 * The full in-memory canonical store for one workflow_id — what
 * `lib/canonical.ts getCanonical()` returns and what Swarm 1's specify + Swarm 2
 * project from. Mirrors the relational tables one array per child table.
 */
export interface CanonicalStore {
  identity: WorkflowIdentity;
  outcomes: Outcome[];
  outputs: Output[];
  inputs: Input[];
  actors: Actor[];
  systems: SystemConnector[];
  steps: ProcessStep[];
  rules: DecisionRule[];
  hitl: HumanReview[];
  archetype: ArchetypeRow | null;
  gaps: MissingInformation[];
  provenance: Provenance[];
  approval: WorkflowApproval | null;
}
