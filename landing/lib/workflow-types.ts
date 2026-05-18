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

export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  gap: z.string(),
  question: z.string(),
  why_this_matters: z.string(),
  suggested_answer: z.string().optional(),
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
  enum_values: z.array(z.string()).optional(),
});

export const SyntheticRowSchema = z.object({
  row_id: z.string(),
  kind: z.enum(['happy', 'edge']),
  edge_case_description: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
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
  model: z.enum(['gemini-2.0-flash', 'gemini-1.5-pro', 'groq-llama-3.3-70b', 'deterministic']),
  prompt: z.string().optional(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  rag_assets: z.array(z.string()).optional(),
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
