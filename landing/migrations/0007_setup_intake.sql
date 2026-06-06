-- BoVerse Workflow Factory — persist the pre-upload Setup intake.
-- Apply with:
--   psql "$DATABASE_URL" -f migrations/0007_setup_intake.sql
-- (or: node scripts/migrate.mjs)

-- The four-plus-three plain-English answers the business user gives BEFORE
-- uploading evidence (source + source mode, expected file types, desired
-- output, destination + destination mode, connection / sign-off note).
--
-- These anchor Discovery, and — more importantly — they ARE the integration-
-- points record that travels with the bundle when the session hands off to the
-- downstream Build swarm. Stored as jsonb so the shape can evolve without a
-- further migration (matching the rest of workflow_sessions).
alter table workflow_sessions
  add column if not exists setup_intake jsonb;

comment on column workflow_sessions.setup_intake is
  'Pre-upload Setup answers (SetupIntake). Anchors Discovery and is included in the Swarm 1 -> Swarm 2 handoff contract.';
