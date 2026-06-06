-- BoVerse Workflow Factory — allow the 'tech_stack' gap kind.
-- Apply with:
--   psql "$DATABASE_URL" -f migrations/0008_gap_kind_tech_stack.sql
-- (or: node scripts/migrate.mjs)

-- Discover-phase tech-stack probing emits gaps with gap_kind = 'tech_stack'
-- (lib/tech-stacks.ts + lib/gaps.ts). The original missing_information CHECK
-- (migration 0005) predates that kind, so persisting such a gap violated the
-- constraint and 500-ed the gaps route. Extend the CHECK to match the
-- GapKindEnum in lib/canonical-schema.ts. The new set is a superset, so every
-- existing row still satisfies it.
alter table public.missing_information
  drop constraint if exists missing_information_gap_kind_check;

alter table public.missing_information
  add constraint missing_information_gap_kind_check
  check (gap_kind in ('absence','low_confidence','broken_link','conflict','tech_stack'));
