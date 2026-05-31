-- BoVerse Two-Swarm Factory — Swarm 2 BUILD artifacts.
-- ADDITIVE + idempotent. Applies after 0005 (migrate.mjs order), so the
-- workflow_id FK to workflow_identity resolves. Reuses touch_updated_at() (0001).
--
-- Text artifacts are stored in build_artifacts (browsable, survive refresh);
-- the .zip is assembled on the fly at download; the .docx is re-rendered on
-- demand and never stored. object_type is the 10-object vocabulary (matches
-- lib/canonical-schema.ts OBJECT_TYPES).

create extension if not exists "pgcrypto";

-- ─── build_runs (one row per Swarm 2 build of an approved workflow) ──────────
create table if not exists build_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflow_identity (workflow_id) on delete cascade,
  session_id  uuid references workflow_sessions (id) on delete set null,
  wds_version int not null default 1,
  primary_archetype text not null,
  build_path text,
  build_readiness text not null check (build_readiness in ('blocking','ready','ready_with_assumptions')),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','passed','failed','skipped')),
  manifest jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists build_runs_workflow_idx on build_runs (workflow_id, created_at desc);

drop trigger if exists build_runs_touch on build_runs;
create trigger build_runs_touch
before update on build_runs
for each row execute function touch_updated_at();

-- ─── build_objects (one row per object considered: built or refused) ─────────
create table if not exists build_objects (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references build_runs (id) on delete cascade,
  object_type text not null check (object_type in
    ('library','registry','canonical_tables','rules_wiki','workflow',
     'connectors','ui','audit_layer','reporting_layer','decision_layer')),
  status text not null check (status in ('built','refused')),
  reason text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (build_id, object_type)
);
create index if not exists build_objects_build_idx on build_objects (build_id);

-- ─── build_artifacts (per-file text content of the bundle) ───────────────────
create table if not exists build_artifacts (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references build_runs (id) on delete cascade,
  object_id uuid references build_objects (id) on delete cascade,  -- null for top-level files
  path text not null,
  media_type text not null,
  content text,
  bytes int,
  created_at timestamptz not null default now(),
  unique (build_id, path)
);
create index if not exists build_artifacts_build_idx on build_artifacts (build_id);
