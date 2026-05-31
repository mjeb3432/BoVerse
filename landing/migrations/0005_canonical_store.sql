-- BoVerse Two-Swarm Factory — the CANONICAL STORE (Swarm 1 Discovery output).
-- ADDITIVE: keeps every infra table from 0001-0004 untouched. Idempotent.
-- Mirrors lib/canonical-schema.ts field-for-field. Grounded in
-- docs/workflow-creator/04-canonical-schema.md + drafts/04-canonical-table.md Part A.
--
-- Determinism (corpus 00 §7): LLM extraction is probabilistic; the closed CHECK
-- enums + FKs here are the deterministic constraint. Soft references
-- (applies_to_step_name, affected_step, process_step.input_required) are stored
-- as text and validated in lib/canonical.ts validateInvariants() to avoid
-- insert-ordering FK deadlocks; only workflow_id / session_id are hard FKs.

create extension if not exists "pgcrypto";

-- ─── workflow_identity (root) ────────────────────────────────────────────────
create table if not exists workflow_identity (
  workflow_id uuid primary key default gen_random_uuid(),
  session_id  uuid not null references workflow_sessions (id) on delete cascade,
  workflow_name     text,
  client_name       text,
  stated_problem    text,
  inferred_problem  text,
  primary_objective text,
  workflow_type text not null default 'unknown' check (workflow_type in
    ('document_generation','data_transformation','decision_support','classification_routing',
     'monitoring_alerting','extraction_enrichment','multi_step_orchestration','approval_review','other','unknown')),
  confidence_score real check (confidence_score between 0 and 1),
  created_at timestamptz not null default now(),
  unique (session_id)
);

-- ─── outcome ─────────────────────────────────────────────────────────────────
create table if not exists outcome (
  outcome_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  outcome_description text,
  business_value text,
  success_metric text,
  time_savings text,
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists outcome_workflow_idx on outcome (workflow_id);

-- ─── output ──────────────────────────────────────────────────────────────────
create table if not exists output (
  output_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  output_name text,
  output_type text not null default 'unknown' check (output_type in
    ('document','report','dataset','record_update','message','decision','alert','dashboard','api_response','other','unknown')),
  output_format text not null default 'unknown' check (output_format in
    ('pdf','docx','xlsx','csv','json','html','email','plain_text','slack_message','db_write','other','unknown')),
  required_sections text[] not null default '{}',
  required_fields   text[] not null default '{}',
  editable_by_user  boolean not null default true,
  approval_required boolean not null default false,
  source_examples   text[] not null default '{}',
  quality_criteria  text[] not null default '{}',
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists output_workflow_idx on output (workflow_id);

-- ─── input (evidence + runtime contract; disambiguated by input_type) ────────
create table if not exists input (
  input_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  input_name text,
  input_type text not null default 'unknown' check (input_type in
    ('discovery_evidence','required_workflow_input','both','unknown')),
  source_system text,
  format text not null default 'unknown' check (format in
    ('pdf','docx','xlsx','csv','json','image','email','plain_text','api_payload','voice_transcript','other','unknown')),
  structured_or_unstructured text not null default 'unknown' check (structured_or_unstructured in
    ('structured','semi_structured','unstructured','unknown')),
  required_or_optional text not null default 'unknown' check (required_or_optional in
    ('required','optional','conditional','unknown')),
  example_value jsonb,
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists input_workflow_idx on input (workflow_id, input_type);

-- ─── actor (unique role_name per workflow so HITL.human_role resolves) ───────
create table if not exists actor (
  actor_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  role_name text not null,
  person_or_team text not null default 'unknown' check (person_or_team in
    ('individual','team','role_function','external_party','unknown')),
  responsibility text,
  approval_authority text not null default 'unknown' check (approval_authority in
    ('none','approve_low','approve_high','approve_unbounded','unknown')),
  interaction_type text not null default 'unknown' check (interaction_type in
    ('performs_work','reviews','approves','is_informed','consulted','unknown')),
  confidence_score real check (confidence_score between 0 and 1),
  unique (workflow_id, role_name)
);

-- ─── system_connector ────────────────────────────────────────────────────────
create table if not exists system_connector (
  connector_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  system_name text,
  connection_type text not null default 'unknown' check (connection_type in
    ('api','mcp','batch_export','file_drop','manual_entry','webhook','none','unknown')),
  read_required  boolean not null default false,
  write_required boolean not null default false,
  authentication_required text not null default 'unknown' check (authentication_required in
    ('none','api_key','oauth','basic','sso','certificate','unknown')),
  data_objects_accessed text[] not null default '{}',
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists system_connector_workflow_idx on system_connector (workflow_id);

-- ─── process_step (input_required = input NAMES, app-resolved) ───────────────
create table if not exists process_step (
  step_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  step_name text,
  sequence_order int,
  input_required text[] not null default '{}',
  output_produced text,
  actor_responsible text,
  deterministic_rule_available     boolean not null default false,
  probabilistic_reasoning_required boolean not null default false,
  hitl_required                    boolean not null default false,
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists process_step_workflow_idx on process_step (workflow_id, sequence_order);

-- ─── decision_rule (applies_to_step_name app-validated → process_step) ───────
create table if not exists decision_rule (
  rule_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  rule_name text,
  condition text,
  action text,
  threshold text,
  applies_to_step_name text,
  deterministic_status text not null default 'unknown' check (deterministic_status in
    ('deterministic','heuristic','probabilistic','unconfirmed','unknown')),
  requires_confirmation boolean not null default false,
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists decision_rule_workflow_idx on decision_rule (workflow_id);

-- ─── human_review (human_role app-validated → actor.role_name) ───────────────
create table if not exists human_review (
  hitl_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  workflow_stage text,
  human_role text,
  reason_for_review text,
  review_trigger text not null default 'unknown' check (review_trigger in
    ('always','on_low_confidence','on_threshold_breach','on_exception','sampled','on_high_value','pre_send','unknown')),
  confidence_threshold real check (confidence_threshold between 0 and 1),
  approval_required boolean not null default false,
  confidence_score real check (confidence_score between 0 and 1)
);
create index if not exists human_review_workflow_idx on human_review (workflow_id);

-- ─── archetype (1 row; the architecture decision; components = 10 object tokens)
create table if not exists archetype (
  archetype_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  primary_archetype text not null default 'unknown' check (primary_archetype in
    ('workflow_component','mini_app','sharp_point_solution','bridge','app',
     'decision_support_app','integrated_workflow','intelligence_layer','operating_layer_oso','unknown')),
  secondary_archetype text not null default 'none' check (secondary_archetype in
    ('workflow_component','mini_app','sharp_point_solution','bridge','app',
     'decision_support_app','integrated_workflow','intelligence_layer','operating_layer_oso','none','unknown')),
  evidence_for_classification text,
  complexity_level text not null default 'unknown' check (complexity_level in
    ('simple','moderate','complex','very_complex','unknown')),
  recommended_build_path text,
  required_boverse_components text[] not null default '{}',
  optional_components        text[] not null default '{}',
  unnecessary_components      text[] not null default '{}',
  confidence_score real check (confidence_score between 0 and 1),
  unique (workflow_id)
);

-- ─── missing_information (the gap ledger) ────────────────────────────────────
create table if not exists missing_information (
  gap_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  missing_attribute text,
  why_it_matters text,
  affected_output text,
  affected_step text,
  possible_sources text[] not null default '{}',
  suggested_question text,
  severity text not null default 'unknown' check (severity in ('critical','high','medium','low','unknown')),
  blocking_status text not null default 'unknown' check (blocking_status in ('blocking','non_blocking','deferred','unknown')),
  gap_kind text not null default 'absence' check (gap_kind in ('absence','low_confidence','broken_link','conflict')),
  confidence_score real check (confidence_score between 0 and 1),
  resolution_status text not null default 'open' check (resolution_status in
    ('open','asked','answered','assumed','wont_fix','unknown')),
  created_at timestamptz not null default now()
);
create index if not exists missing_information_idx on missing_information (workflow_id, blocking_status, severity);

-- ─── provenance (one row per extracted fact) ─────────────────────────────────
create table if not exists provenance (
  provenance_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  fact_id uuid not null,
  target_table text,
  target_field text,
  source_document text,
  source_location jsonb,
  extracted_value text,
  extraction_method text not null default 'unknown' check (extraction_method in
    ('llm_extraction','direct_field','ocr','table_parse','transcription','rule_derived','manual','unknown')),
  confidence_score real check (confidence_score between 0 and 1),
  reviewer text,
  review_status text not null default 'unreviewed' check (review_status in
    ('unreviewed','confirmed','corrected','rejected','unknown')),
  ts timestamptz not null default now(),
  version int not null default 1
);
create index if not exists provenance_workflow_idx on provenance (workflow_id);
create index if not exists provenance_fact_idx on provenance (fact_id);

-- ─── workflow_approval (the SEAM gate that releases Swarm 2) ──────────────────
create table if not exists workflow_approval (
  approval_id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  approved_by text,
  approved_at timestamptz not null default now(),
  build_readiness text not null check (build_readiness in ('blocking','ready','ready_with_assumptions')),
  wds_version int not null default 1,
  unique (workflow_id)
);

-- ─── widen workflow_sessions.current_stage for the two-swarm state machine ────
alter table workflow_sessions drop constraint if exists workflow_sessions_current_stage_check;
alter table workflow_sessions add constraint workflow_sessions_current_stage_check
  check (current_stage in
    ('idle','ingest','clarify','simulate','generate','deliver','complete',
     'extract','classify','gaps','specify','review','approved','built'));
