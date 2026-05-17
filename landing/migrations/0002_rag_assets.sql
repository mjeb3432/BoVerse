-- BoVerse — RAG asset library with pgvector embeddings.
-- Applied via `node scripts/migrate.mjs` (the same one-off runner that
-- shipped 0001). Idempotent — safe to run repeatedly.
--
-- Why pgvector here:
--   - Stage 04 (GENERATE) emits a `rag_library: [{asset_name, asset_type,
--     description}]` for every workflow. Without persistence these assets
--     are inert — the footer claim "Postgres + pgvector" was marketing only.
--   - This migration enables pgvector and adds a single `rag_assets` table
--     keyed by (session_id, asset_name) so Stage 05's per-row execution
--     can do real similarity search instead of just listing assets.
--
-- Embedding model: Google `text-embedding-004` (768 dimensions, free tier
-- 1500 req/day). If we ever swap to OpenAI's `text-embedding-3-small` we'll
-- need to add a second `embedding_3` vector(1536) column rather than
-- altering this one in place — embeddings from different models are not
-- comparable.

create extension if not exists vector;

create table if not exists rag_assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workflow_sessions(id) on delete cascade,
  asset_name text not null,
  asset_type text not null
    check (asset_type in ('rules', 'data', 'template', 'prompt', 'reference', 'other')),
  description text not null,
  -- Full textual content that will be retrieved on RAG hits. For Stage 04
  -- this is `description` (the LLM is the source); for later real-world
  -- assets it can be the full markdown / PDF text.
  content text not null,
  -- 768-dim Gemini text-embedding-004 vector. nullable so we can insert
  -- the row first and embed asynchronously.
  embedding vector(768),
  created_at timestamptz not null default now(),
  -- Keep (session_id, asset_name) unique so re-running Stage 04 upserts
  -- instead of duplicating.
  unique (session_id, asset_name)
);

-- HNSW index for fast cosine similarity queries. ef_construction = 64 and
-- m = 16 are pgvector defaults and work well for libraries up to ~1M rows.
-- The `vector_cosine_ops` operator class matches the `<=>` distance we use
-- in the retrieval query (lib/rag.ts).
create index if not exists rag_assets_embedding_idx
  on rag_assets using hnsw (embedding vector_cosine_ops);

-- Useful secondary index for filtering by session before similarity search.
create index if not exists rag_assets_session_idx
  on rag_assets (session_id);
