-- BoVerse Workflow Factory — initial schema for /build sessions.
-- Works with any Postgres (managed or self-hosted). Apply with:
--   psql "$DATABASE_URL" -f migrations/0001_workflow_sessions.sql

create extension if not exists "pgcrypto";

-- ─── workflow_sessions ────────────────────────────────────────────────────
-- One row per "build workflow" session. Each session walks through all 5
-- stages (ingest → clarify → simulate → generate → deliver). Stage outputs
-- are stored as jsonb so the schema can evolve without migrations.

create table if not exists workflow_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  current_stage text not null default 'idle'
    check (current_stage in ('idle', 'ingest', 'clarify', 'simulate', 'generate', 'deliver', 'complete')),

  -- Stage outputs (jsonb so we can evolve type shapes without migrations)
  uploaded_files     jsonb not null default '[]'::jsonb,
  ingest_output      jsonb,
  clarify_output     jsonb,
  clarify_answers    jsonb,
  simulate_output    jsonb,
  generate_output    jsonb,
  deliver_output     jsonb
);

create index if not exists workflow_sessions_updated_at_idx
  on workflow_sessions (updated_at desc);

-- Auto-update updated_at on every row change.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workflow_sessions_touch on workflow_sessions;
create trigger workflow_sessions_touch
before update on workflow_sessions
for each row execute function touch_updated_at();

-- ─── workflow_step_executions ─────────────────────────────────────────────
-- Stage 05 real-per-row execution. Each row stores one (session, row, step)
-- result so the UI can render live progress, and so we can rebuild the trace
-- after a refresh.

create table if not exists workflow_step_executions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workflow_sessions (id) on delete cascade,
  synthetic_row_id text not null,
  synthetic_row_kind text not null check (synthetic_row_kind in ('happy', 'edge')),
  step_id text not null,
  step_name text not null,
  status text not null check (status in ('success', 'failure', 'gated_for_human', 'skipped', 'running')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  output jsonb,
  error text,
  trace_message text
);

create index if not exists workflow_step_executions_session_idx
  on workflow_step_executions (session_id, synthetic_row_id, step_id);
