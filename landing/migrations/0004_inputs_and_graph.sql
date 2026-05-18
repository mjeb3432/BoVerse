-- 0004 — full input persistence + vector graph edges.
-- Two unrelated changes bundled because they're both small and ship together.

-- ─── A. Full input persistence ───────────────────────────────────────────
--
-- Until now, `workflow_sessions.uploaded_files` stored only a 1KB text
-- preview per artifact. We need the FULL extracted text so users can review
-- and download what they put in, not just what came out.
--
-- New table `session_artifacts` — one row per uploaded file per session,
-- with the complete extracted text (or NULL for binary-only artifacts) and
-- a mime type. Linked back to workflow_sessions by FK.

create table if not exists session_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workflow_sessions(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  -- Full extracted text. NULL for images / binary attachments that the
  -- multimodal model read directly without going through the text path.
  extracted_text text,
  -- Whether the file was passed to a multimodal model (image / inline PDF)
  -- as opposed to text extraction.
  was_multimodal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists session_artifacts_session_idx
  on session_artifacts (session_id);


-- ─── B. Vector graph — RAG asset edges ───────────────────────────────────
--
-- Step 1 was pgvector + rag_assets (0002). Now add edges between assets so
-- retrieval can traverse the graph, not just rank by cosine distance.
--
-- Edge types:
--   "used_by_step"   — asset is referenced by a workflow step's rag_assets
--                       (we materialize this when Stage 04 finishes)
--   "co_referenced"  — two assets are both referenced by the same step
--                       (cheap concept-similarity proxy)
--   "semantic"       — two assets are above a cosine-similarity threshold
--                       (computed during Stage 04's RAG seeding)
--   "manual"         — human-curated edge (future)
--
-- All edges are directed but symmetric edges are stored as two rows so the
-- query plan is simple ("walk from asset X" = "select where source = X").

create table if not exists rag_edges (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workflow_sessions(id) on delete cascade,
  source_asset_id uuid not null references rag_assets(id) on delete cascade,
  target_asset_id uuid not null references rag_assets(id) on delete cascade,
  edge_type text not null
    check (edge_type in ('used_by_step', 'co_referenced', 'semantic', 'manual')),
  -- Weight in [0, 1]. Higher = stronger relationship. For semantic edges,
  -- this is cosine similarity. For co_referenced, this is the number of
  -- shared steps normalized. For used_by_step, this is always 1.0.
  weight real not null default 1.0
    check (weight >= 0 and weight <= 1),
  -- Free-form metadata, e.g. {"step_id": "step_04"} for used_by_step edges.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, source_asset_id, target_asset_id, edge_type)
);

create index if not exists rag_edges_source_idx
  on rag_edges (source_asset_id);
create index if not exists rag_edges_target_idx
  on rag_edges (target_asset_id);
create index if not exists rag_edges_session_idx
  on rag_edges (session_id);
