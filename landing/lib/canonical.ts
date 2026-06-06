// lib/canonical.ts
//
// The canonical-store data-access layer. The whole CanonicalStore for one
// workflow is the unit of persistence: each Swarm 1 stage loads it, mutates it,
// and saves it back. Postgres is the source of truth when DATABASE_URL is set;
// otherwise a module-level in-memory map persists across requests within a
// single dev process (production must set DATABASE_URL — see README).
//
// Also home to validateInvariants() — the app-level enforcement of the corpus
// structural invariants that are stored as soft text references in 0005
// (HITL.human_role → actor.role_name; decision_rule.applies_to_step_name →
// process_step.step_name; process_step.input_required → input.input_name).
// A dangling reference becomes a `broken_link` gap, never a silent failure.

import { randomUUID } from 'node:crypto';
import { HAS_DATABASE, query } from './postgres';
import type { CanonicalStore, MissingInformation, Provenance } from './canonical-schema';

// ─── in-memory fallback (dev / no-DB) ────────────────────────────────────────
const MEMORY = new Map<string, CanonicalStore>();

export function newWorkflowId(): string {
  return randomUUID();
}

export function newFactId(): string {
  return randomUUID();
}

/** A minimal empty store, ready for Swarm 1 to populate. */
export function emptyStore(sessionId: string, workflowId: string): CanonicalStore {
  return {
    identity: {
      workflow_id: workflowId,
      session_id: sessionId,
      workflow_name: null,
      client_name: null,
      stated_problem: null,
      inferred_problem: null,
      primary_objective: null,
      workflow_type: 'unknown',
      confidence_score: null,
    },
    outcomes: [],
    outputs: [],
    inputs: [],
    actors: [],
    systems: [],
    steps: [],
    rules: [],
    hitl: [],
    archetype: null,
    gaps: [],
    provenance: [],
    approval: null,
  };
}

/** Build a provenance row for an extracted fact. */
export function makeProvenance(args: {
  factId?: string;
  targetTable: string;
  targetField: string;
  sourceDocument?: string | null;
  extractedValue?: string | null;
  method?: Provenance['extraction_method'];
  confidence?: number | null;
  sourceLocation?: unknown;
}): Provenance {
  return {
    fact_id: args.factId ?? newFactId(),
    target_table: args.targetTable,
    target_field: args.targetField,
    source_document: args.sourceDocument ?? null,
    source_location: args.sourceLocation ?? null,
    extracted_value: args.extractedValue ?? null,
    extraction_method: args.method ?? 'llm_extraction',
    confidence_score: args.confidence ?? null,
    reviewer: null,
    review_status: 'unreviewed',
    version: 1,
  };
}

// ─── invariant enforcement (pure; corpus 06 §2.1 / doc 07 §15.3) ─────────────
/**
 * Returns broken_link gap rows for every dangling soft reference. The caller
 * merges these into store.gaps before saving so the ledger — not a silent
 * failure — records the break.
 */
export function validateInvariants(store: CanonicalStore): MissingInformation[] {
  const out: MissingInformation[] = [];
  const roleNames = new Set(store.actors.map((a) => a.role_name));
  const stepNames = new Set(store.steps.map((s) => s.step_name).filter(Boolean) as string[]);
  const inputNames = new Set(store.inputs.map((i) => i.input_name).filter(Boolean) as string[]);

  const brokenLink = (attr: string, why: string): MissingInformation => ({
    gap_id: newFactId(),
    missing_attribute: attr,
    why_it_matters: why,
    affected_output: null,
    affected_step: null,
    possible_sources: [],
    suggested_question: null,
    severity: 'high',
    blocking_status: 'blocking',
    gap_kind: 'broken_link',
    confidence_score: 1,
    resolution_status: 'open',
  });

  // HITL.human_role → actor.role_name
  for (const h of store.hitl) {
    if (h.human_role && !roleNames.has(h.human_role)) {
      out.push(brokenLink(
        `human_review.human_role="${h.human_role}"`,
        `A human review gate names a role ("${h.human_role}") that is not a defined actor. Add the actor or correct the role.`,
      ));
    }
  }
  // decision_rule.applies_to_step_name → process_step.step_name
  for (const r of store.rules) {
    if (r.applies_to_step_name && !stepNames.has(r.applies_to_step_name)) {
      out.push(brokenLink(
        `decision_rule.applies_to_step_name="${r.applies_to_step_name}"`,
        `Rule "${r.rule_name ?? r.rule_id}" applies to a step that does not exist.`,
      ));
    }
  }
  // process_step.input_required → input.input_name
  for (const s of store.steps) {
    for (const need of s.input_required) {
      if (need && !inputNames.has(need)) {
        out.push(brokenLink(
          `process_step.input_required="${need}"`,
          `Step "${s.step_name ?? s.step_id}" consumes an input ("${need}") that is not defined.`,
        ));
      }
    }
  }
  return out;
}

// ─── persistence ─────────────────────────────────────────────────────────────

export async function getWorkflowIdForSession(sessionId: string): Promise<string | null> {
  if (!HAS_DATABASE) {
    for (const [wid, store] of MEMORY) {
      if (store.identity.session_id === sessionId) return wid;
    }
    return null;
  }
  const res = await query<{ workflow_id: string }>(
    'select workflow_id from workflow_identity where session_id = $1 limit 1',
    [sessionId],
  );
  return res?.rows[0]?.workflow_id ?? null;
}

// ─── session envelope helpers ────────────────────────────────────────────────
/** Return a usable session id, creating a workflow_sessions row in DB mode. */
export async function ensureSession(sessionId?: string | null): Promise<string> {
  if (sessionId && sessionId.length > 0) return sessionId;
  if (!HAS_DATABASE) return 'local-' + randomUUID();
  const res = await query<{ id: string }>(
    `insert into workflow_sessions (current_stage) values ('extract') returning id`,
  );
  return res?.rows[0]?.id ?? 'local-' + randomUUID();
}

/** Advance the session's state-machine column (DB only). */
export async function setSessionStage(sessionId: string, stage: string): Promise<void> {
  if (!HAS_DATABASE || sessionId.startsWith('local-')) return;
  await query('update workflow_sessions set current_stage = $1 where id = $2', [stage, sessionId]);
}

// ─── pre-upload Setup intake persistence ─────────────────────────────────────
// The Setup answers anchor Discovery AND form the integration-points record
// that travels with the handoff bundle. Persisted to the setup_intake JSONB
// column (migration 0007). Memory map for local / no-DB sessions.
const SETUP_INTAKE = new Map<string, unknown>();

// Persisting / reading the Setup answers is a BEST-EFFORT side-effect: it must
// never break discovery. If the setup_intake column is missing (migration 0007
// not yet applied) or any DB error occurs, we degrade gracefully — save no-ops
// and read returns null — rather than 500-ing the extract / gaps / handoff
// routes. (Apply migration 0007 to restore persistence.)
export async function saveSetupIntake(sessionId: string, setup: unknown): Promise<void> {
  if (setup == null) return;
  if (!HAS_DATABASE || sessionId.startsWith('local-')) {
    SETUP_INTAKE.set(sessionId, setup);
    return;
  }
  try {
    await query('update workflow_sessions set setup_intake = $1 where id = $2', [
      JSON.stringify(setup),
      sessionId,
    ]);
  } catch (err) {
    console.warn('[canonical] saveSetupIntake skipped (is migration 0007 applied?):', (err as Error).message);
  }
}

export async function getSetupIntake(sessionId: string): Promise<unknown | null> {
  if (!HAS_DATABASE || sessionId.startsWith('local-')) {
    return SETUP_INTAKE.get(sessionId) ?? null;
  }
  try {
    const r = await query<{ setup_intake: unknown }>(
      'select setup_intake from workflow_sessions where id = $1',
      [sessionId],
    );
    return r?.rows[0]?.setup_intake ?? null;
  } catch (err) {
    console.warn('[canonical] getSetupIntake returned null (is migration 0007 applied?):', (err as Error).message);
    return null;
  }
}

// ─── derived-projection persistence (WDS + Simulation Pack) ──────────────────
// Reuses the now-free generate_output / simulate_output JSONB columns on
// workflow_sessions (no migration). Memory map for local / no-DB.
const PROJECTIONS = new Map<string, { wds: unknown; simulation: unknown }>();

export async function saveProjections(sessionId: string, wds: unknown, simulation: unknown): Promise<void> {
  if (!HAS_DATABASE || sessionId.startsWith('local-')) {
    PROJECTIONS.set(sessionId, { wds, simulation });
    return;
  }
  await query(
    'update workflow_sessions set generate_output = $1, simulate_output = $2 where id = $3',
    [JSON.stringify(wds), JSON.stringify(simulation), sessionId],
  );
}

export async function getProjections(sessionId: string): Promise<{ wds: unknown; simulation: unknown } | null> {
  if (!HAS_DATABASE || sessionId.startsWith('local-')) {
    return PROJECTIONS.get(sessionId) ?? null;
  }
  const r = await query<{ generate_output: unknown; simulate_output: unknown }>(
    'select generate_output, simulate_output from workflow_sessions where id = $1',
    [sessionId],
  );
  const row = r?.rows[0];
  if (!row) return null;
  return { wds: row.generate_output, simulation: row.simulate_output };
}

export async function getCanonical(workflowId: string): Promise<CanonicalStore | null> {
  if (!HAS_DATABASE) {
    return MEMORY.get(workflowId) ?? null;
  }
  const identity = await query(
    'select * from workflow_identity where workflow_id = $1',
    [workflowId],
  );
  if (!identity || identity.rows.length === 0) return null;

  const [outcomes, outputs, inputs, actors, systems, steps, rules, hitl, arche, gaps, prov, appr] =
    await Promise.all([
      query('select * from outcome where workflow_id = $1', [workflowId]),
      query('select * from output where workflow_id = $1', [workflowId]),
      query('select * from input where workflow_id = $1', [workflowId]),
      query('select * from actor where workflow_id = $1', [workflowId]),
      query('select * from system_connector where workflow_id = $1', [workflowId]),
      query('select * from process_step where workflow_id = $1 order by sequence_order nulls last', [workflowId]),
      query('select * from decision_rule where workflow_id = $1', [workflowId]),
      query('select * from human_review where workflow_id = $1', [workflowId]),
      query('select * from archetype where workflow_id = $1', [workflowId]),
      query('select * from missing_information where workflow_id = $1', [workflowId]),
      query('select * from provenance where workflow_id = $1', [workflowId]),
      query('select * from workflow_approval where workflow_id = $1', [workflowId]),
    ]);

  return {
    identity: identity.rows[0] as CanonicalStore['identity'],
    outcomes: (outcomes?.rows ?? []) as CanonicalStore['outcomes'],
    outputs: (outputs?.rows ?? []) as CanonicalStore['outputs'],
    inputs: (inputs?.rows ?? []) as CanonicalStore['inputs'],
    actors: (actors?.rows ?? []) as CanonicalStore['actors'],
    systems: (systems?.rows ?? []) as CanonicalStore['systems'],
    steps: (steps?.rows ?? []) as CanonicalStore['steps'],
    rules: (rules?.rows ?? []) as CanonicalStore['rules'],
    hitl: (hitl?.rows ?? []) as CanonicalStore['hitl'],
    archetype: (arche?.rows[0] ?? null) as CanonicalStore['archetype'],
    gaps: (gaps?.rows ?? []) as CanonicalStore['gaps'],
    provenance: (prov?.rows ?? []) as CanonicalStore['provenance'],
    approval: (appr?.rows[0] ?? null) as CanonicalStore['approval'],
  };
}

// columns per child table (excluding workflow_id, which is prepended). Mark
// jsonb columns so values are stringified + cast.
type ColSpec = { name: string; json?: boolean };
const CHILD_TABLES: Record<string, { rowsKey: keyof CanonicalStore; cols: ColSpec[] }> = {
  outcome: { rowsKey: 'outcomes', cols: [
    { name: 'outcome_description' }, { name: 'business_value' }, { name: 'success_metric' },
    { name: 'time_savings' }, { name: 'confidence_score' },
  ] },
  output: { rowsKey: 'outputs', cols: [
    { name: 'output_name' }, { name: 'output_type' }, { name: 'output_format' },
    { name: 'required_sections' }, { name: 'required_fields' }, { name: 'editable_by_user' },
    { name: 'approval_required' }, { name: 'source_examples' }, { name: 'quality_criteria' },
    { name: 'confidence_score' },
  ] },
  input: { rowsKey: 'inputs', cols: [
    { name: 'input_name' }, { name: 'input_type' }, { name: 'source_system' }, { name: 'format' },
    { name: 'structured_or_unstructured' }, { name: 'required_or_optional' },
    { name: 'example_value', json: true }, { name: 'confidence_score' },
  ] },
  actor: { rowsKey: 'actors', cols: [
    { name: 'role_name' }, { name: 'person_or_team' }, { name: 'responsibility' },
    { name: 'approval_authority' }, { name: 'interaction_type' }, { name: 'confidence_score' },
  ] },
  system_connector: { rowsKey: 'systems', cols: [
    { name: 'system_name' }, { name: 'connection_type' }, { name: 'read_required' },
    { name: 'write_required' }, { name: 'authentication_required' },
    { name: 'data_objects_accessed' }, { name: 'confidence_score' },
  ] },
  process_step: { rowsKey: 'steps', cols: [
    { name: 'step_name' }, { name: 'sequence_order' }, { name: 'input_required' },
    { name: 'output_produced' }, { name: 'actor_responsible' },
    { name: 'deterministic_rule_available' }, { name: 'probabilistic_reasoning_required' },
    { name: 'hitl_required' }, { name: 'confidence_score' },
  ] },
  decision_rule: { rowsKey: 'rules', cols: [
    { name: 'rule_name' }, { name: 'condition' }, { name: 'action' }, { name: 'threshold' },
    { name: 'applies_to_step_name' }, { name: 'deterministic_status' },
    { name: 'requires_confirmation' }, { name: 'confidence_score' },
  ] },
  human_review: { rowsKey: 'hitl', cols: [
    { name: 'workflow_stage' }, { name: 'human_role' }, { name: 'reason_for_review' },
    { name: 'review_trigger' }, { name: 'confidence_threshold' }, { name: 'approval_required' },
    { name: 'confidence_score' },
  ] },
  missing_information: { rowsKey: 'gaps', cols: [
    { name: 'gap_id' },
    { name: 'missing_attribute' }, { name: 'why_it_matters' }, { name: 'affected_output' },
    { name: 'affected_step' }, { name: 'possible_sources' }, { name: 'suggested_question' },
    { name: 'severity' }, { name: 'blocking_status' }, { name: 'gap_kind' },
    { name: 'confidence_score' }, { name: 'resolution_status' },
  ] },
  provenance: { rowsKey: 'provenance', cols: [
    { name: 'fact_id' }, { name: 'target_table' }, { name: 'target_field' },
    { name: 'source_document' }, { name: 'source_location', json: true },
    { name: 'extracted_value' }, { name: 'extraction_method' }, { name: 'confidence_score' },
    { name: 'reviewer' }, { name: 'review_status' }, { name: 'version' },
  ] },
};

function valueFor(col: ColSpec, row: Record<string, unknown>): unknown {
  const v = row[col.name];
  if (v === undefined) return null;
  if (col.json) return v === null ? null : JSON.stringify(v);
  return v;
}

/** Persist the whole store (replace-child-rows; upsert single-row tables). */
export async function saveCanonical(store: CanonicalStore): Promise<void> {
  const workflowId = store.identity.workflow_id;
  if (!workflowId) throw new Error('saveCanonical: store.identity.workflow_id is required');

  if (!HAS_DATABASE) {
    MEMORY.set(workflowId, store);
    return;
  }

  // identity (upsert)
  await query(
    `insert into workflow_identity
       (workflow_id, session_id, workflow_name, client_name, stated_problem,
        inferred_problem, primary_objective, workflow_type, confidence_score)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (workflow_id) do update set
       workflow_name=$3, client_name=$4, stated_problem=$5, inferred_problem=$6,
       primary_objective=$7, workflow_type=$8, confidence_score=$9`,
    [
      workflowId, store.identity.session_id, store.identity.workflow_name,
      store.identity.client_name, store.identity.stated_problem, store.identity.inferred_problem,
      store.identity.primary_objective, store.identity.workflow_type, store.identity.confidence_score,
    ],
  );

  // child tables: delete + reinsert
  for (const [table, spec] of Object.entries(CHILD_TABLES)) {
    await query(`delete from ${table} where workflow_id = $1`, [workflowId]);
    const rows = store[spec.rowsKey] as unknown as Record<string, unknown>[];
    for (const row of rows) {
      const names = ['workflow_id', ...spec.cols.map((c) => c.name)];
      const params: unknown[] = [workflowId];
      const placeholders: string[] = ['$1'];
      spec.cols.forEach((c, i) => {
        params.push(valueFor(c, row));
        placeholders.push(c.json ? `$${i + 2}::jsonb` : `$${i + 2}`);
      });
      await query(
        `insert into ${table} (${names.join(', ')}) values (${placeholders.join(', ')})`,
        params,
      );
    }
  }

  // archetype (upsert single row)
  if (store.archetype) {
    const a = store.archetype;
    await query(
      `insert into archetype
         (workflow_id, primary_archetype, secondary_archetype, evidence_for_classification,
          complexity_level, recommended_build_path, required_boverse_components,
          optional_components, unnecessary_components, confidence_score)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (workflow_id) do update set
         primary_archetype=$2, secondary_archetype=$3, evidence_for_classification=$4,
         complexity_level=$5, recommended_build_path=$6, required_boverse_components=$7,
         optional_components=$8, unnecessary_components=$9, confidence_score=$10`,
      [
        workflowId, a.primary_archetype, a.secondary_archetype, a.evidence_for_classification,
        a.complexity_level, a.recommended_build_path, a.required_boverse_components,
        a.optional_components, a.unnecessary_components, a.confidence_score,
      ],
    );
  }

  // approval (upsert single row)
  if (store.approval) {
    const ap = store.approval;
    await query(
      `insert into workflow_approval (workflow_id, approved_by, build_readiness, wds_version)
       values ($1,$2,$3,$4)
       on conflict (workflow_id) do update set
         approved_by=$2, build_readiness=$3, wds_version=$4, approved_at=now()`,
      [workflowId, ap.approved_by, ap.build_readiness, ap.wds_version],
    );
  }
}
