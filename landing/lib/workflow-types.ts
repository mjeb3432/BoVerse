// Shared type definitions for the workflow factory. Used by both the API
// routes (server side) and the React page (client side). When we wire
// Postgres later, these become the schema source-of-truth too.

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Stage 01 — INGEST
// ────────────────────────────────────────────────────────────────────────────

export const ConfidenceLevelSchema = z.enum(['observed', 'implied', 'inferred', 'guess']);

export const InferredStepSchema = z.object({
  step: z.string(),
  primitive: z.enum(['ingest', 'transform', 'validate', 'action', 'feedback']),
  confidence: z.number().min(0).max(1),
});

export const IngestOutputSchema = z.object({
  inferred_business_type: z.string(),
  inferred_process_name: z.string(),
  inferred_output_goal: z.string(),
  inferred_inputs: z.array(z.string()),
  inferred_steps: z.array(InferredStepSchema),
  inferred_rules: z.array(z.string()),
  inferred_knowledge_assets: z.array(z.string()),
  what_we_cannot_see: z.array(z.string()),
  summary: z.string(),
});
export type IngestOutput = z.infer<typeof IngestOutputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Stage 02 — CLARIFY
// ────────────────────────────────────────────────────────────────────────────

// NOTE: optional fields on LLM-output schemas use `.nullable()` (not
// `.optional()`) because Groq's `openai/gpt-oss-120b` enforces OpenAI-strict
// json_schema, which requires EVERY property to appear in `required`. The
// model emits `null` when a field doesn't apply; consumers must treat
// null and undefined the same way. Gemini is happy with either form.
export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  gap: z.string(),
  question: z.string(),
  why_this_matters: z.string(),
  suggested_answer: z.string().nullable(),
});

export const ClarifyOutputSchema = z.object({
  questions: z.array(ClarifyQuestionSchema).max(5),
});
export type ClarifyOutput = z.infer<typeof ClarifyOutputSchema>;

export const ClarifyAnswersSchema = z.object({
  answers: z.array(z.object({ id: z.string(), answer: z.string() })),
});
export type ClarifyAnswers = z.infer<typeof ClarifyAnswersSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Stage 03 — SIMULATE
// ────────────────────────────────────────────────────────────────────────────

export const SchemaFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'enum', 'object']),
  description: z.string(),
  required: z.boolean(),
  // Nullable (see note on ClarifyQuestionSchema).
  enum_values: z.array(z.string()).nullable(),
});

export const SyntheticRowSchema = z.object({
  row_id: z.string(),
  kind: z.enum(['happy', 'edge']),
  // Nullable (see note on ClarifyQuestionSchema). Happy rows emit null here;
  // edge rows describe the failure mode being tested.
  edge_case_description: z.string().nullable(),
  // The row payload is open-shape (the schema differs per inferred process).
  // We can't use `z.record()` here because it compiles to JSON-Schema
  // `propertyNames`, which OpenAI strict mode rejects with
  //   "propertyNames is not supported [unsupported_propertyNames]".
  // `z.unknown()` becomes `{}` (no constraints) in the emitted schema, which
  // OpenAI accepts. Consumers cast to Record<string, unknown> on read.
  data: z.unknown(),
});

export const SimulateOutputSchema = z.object({
  schema: z.array(SchemaFieldSchema),
  rows: z.array(SyntheticRowSchema).length(10),
});
export type SimulateOutput = z.infer<typeof SimulateOutputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Stage 04 — GENERATE
// ────────────────────────────────────────────────────────────────────────────

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  primitive: z.enum(['ingest', 'transform', 'validate', 'action', 'feedback']),
  actor: z.enum(['auto', 'human', 'hybrid']),
  // Model labels are advisory — the engine maps everything to fastModel().
  // Updated the enum to reflect the current provider chain so the LLM picks
  // realistic names rather than hallucinating obsolete model IDs.
  model: z.enum(['groq-gpt-oss-120b', 'gemini-2.5-flash', 'deterministic']),
  // Nullable (see note on ClarifyQuestionSchema). Deterministic steps emit
  // null here because they don't need a prompt template.
  prompt: z.string().nullable(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  // Nullable (see note on ClarifyQuestionSchema). Steps with no RAG needs
  // emit null or an empty array.
  rag_assets: z.array(z.string()).nullable(),
  rationale: z.string(),
});

export const GenerateOutputSchema = z.object({
  workflow_name: z.string(),
  workflow_description: z.string(),
  steps: z.array(WorkflowStepSchema),
  rag_library: z.array(
    z.object({
      asset_name: z.string(),
      asset_type: z.string(),
      description: z.string(),
    })
  ),
});
export type GenerateOutput = z.infer<typeof GenerateOutputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Stage 05 — DELIVER (real per-row execution)
// ────────────────────────────────────────────────────────────────────────────

export const StepExecutionResultSchema = z.object({
  step_id: z.string(),
  step_name: z.string(),
  status: z.enum(['success', 'failure', 'gated_for_human', 'skipped']),
  duration_ms: z.number(),
  output: z.unknown(),
  error: z.string().optional(),
  trace_message: z.string(),
});

export const RowExecutionResultSchema = z.object({
  row_id: z.string(),
  kind: z.enum(['happy', 'edge']),
  status: z.enum(['success', 'partial', 'failure']),
  step_results: z.array(StepExecutionResultSchema),
  total_duration_ms: z.number(),
});

export const DeliverOutputSchema = z.object({
  workflow_spec_markdown: z.string(),
  execution_summary: z.object({
    total_rows: z.number(),
    happy_rows_passed: z.number(),
    edge_rows_caught: z.number(),
    total_llm_calls: z.number(),
    total_duration_ms: z.number(),
  }),
  per_row_results: z.array(RowExecutionResultSchema),
});
export type DeliverOutput = z.infer<typeof DeliverOutputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Persistent session state (top-level row in Postgres)
// ────────────────────────────────────────────────────────────────────────────

export const SessionStageSchema = z.enum([
  'idle',
  'ingest',
  'clarify',
  'simulate',
  'generate',
  'deliver',
  'complete',
]);
export type SessionStage = z.infer<typeof SessionStageSchema>;

export const WorkflowSessionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_stage: SessionStageSchema,
  uploaded_files: z.array(
    z.object({
      name: z.string(),
      mime_type: z.string(),
      size_bytes: z.number(),
      storage_path: z.string(),
      extracted_text_preview: z.string().optional(),
    })
  ),
  ingest_output: IngestOutputSchema.optional(),
  clarify_output: ClarifyOutputSchema.optional(),
  clarify_answers: ClarifyAnswersSchema.optional(),
  simulate_output: SimulateOutputSchema.optional(),
  generate_output: GenerateOutputSchema.optional(),
  deliver_output: DeliverOutputSchema.optional(),
});
export type WorkflowSession = z.infer<typeof WorkflowSessionSchema>;
