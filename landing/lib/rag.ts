// RAG asset storage + retrieval against pgvector. Used by Stage 04 (writes
// the workflow's rag_library to the table) and Stage 05 (similarity search
// at execution time so retrieve steps return real content, not stubs).
//
// Embedding model: Google `text-embedding-004` (768 dims, free 1500 req/day).
// If GOOGLE_GENERATIVE_AI_API_KEY is unset, embeddings are skipped and
// retrieval falls back to ILIKE keyword matching — the system stays usable
// without RAG, just less precise.

import { embed } from 'ai';
import { embeddingModel, EMBEDDING_DIMENSIONS } from './llm';
import { query } from './postgres';

// asset_type is free-form text (per 0003 migration). The LLM picks names
// like 'database_lookup', 'spreadsheet', 'live_feed', 'document', 'template'.
// We keep it as `string` to avoid forcing the model into a closed enum.
export type RagAssetType = string;

export interface RagAssetInput {
  asset_name: string;
  asset_type: RagAssetType;
  description: string;
  content?: string; // defaults to description if absent
}

export interface RagAssetHit {
  id: string;
  asset_name: string;
  asset_type: RagAssetType;
  description: string;
  content: string;
  similarity: number; // 0-1, higher = closer
}

// ─── ingest ──────────────────────────────────────────────────────────────

// Compute an embedding for a single string. Returns null if no embedding
// model is configured. Callers should treat null as "no vector available"
// and store the asset without it — retrieval will then use keyword fallback.
export async function embedText(text: string): Promise<number[] | null> {
  const model = embeddingModel();
  if (!model) return null;
  try {
    // gemini-embedding-001 defaults to 3072 dims; request 768 to match the
    // pgvector column. (Ignored harmlessly by models without the option.)
    const { embedding } = await embed({
      model,
      value: text,
      providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS } },
    });
    return embedding;
  } catch (err) {
    // Embedding failures must not block ingestion. Log and continue with null
    // so the asset row still lands in the table.
    console.error('[rag] embedText failed:', (err as Error).message);
    return null;
  }
}

// Upsert one asset to rag_assets. Returns the id of the row. Idempotent on
// (session_id, asset_name) per the unique constraint in 0002_rag_assets.sql.
export async function upsertRagAsset(
  sessionId: string,
  asset: RagAssetInput
): Promise<string | null> {
  // Local sessions don't write to the DB — keep behaviour consistent with
  // saveStageOutput in the api routes.
  if (sessionId.startsWith('local-')) return null;

  const content = asset.content ?? asset.description;
  const embedding = await embedText(`${asset.asset_name}\n${asset.description}\n${content}`);

  // pgvector wants the array serialised as a Postgres array literal string.
  // `[1,2,3]` works for the `vector` type. We cast in SQL to be explicit.
  const embeddingParam = embedding ? `[${embedding.join(',')}]` : null;

  const result = await query<{ id: string }>(
    `insert into rag_assets (session_id, asset_name, asset_type, description, content, embedding)
     values ($1, $2, $3, $4, $5, $6::vector)
     on conflict (session_id, asset_name) do update set
       asset_type = excluded.asset_type,
       description = excluded.description,
       content = excluded.content,
       embedding = excluded.embedding
     returning id`,
    [sessionId, asset.asset_name, asset.asset_type, asset.description, content, embeddingParam]
  );
  return result?.rows[0]?.id ?? null;
}

// Bulk upsert. Sequential — the embeddings API rate-limits at 1500/day, so
// running ~5 assets per workflow is fine; fan-out parallelism would risk
// burning the quota for no benefit.
export async function upsertRagAssets(
  sessionId: string,
  assets: RagAssetInput[]
): Promise<Array<{ id: string | null; asset_name: string }>> {
  const out: Array<{ id: string | null; asset_name: string }> = [];
  for (const a of assets) {
    const id = await upsertRagAsset(sessionId, a);
    out.push({ id, asset_name: a.asset_name });
  }
  return out;
}

// ─── graph edges (vector graph) ─────────────────────────────────────────

export type EdgeType = 'used_by_step' | 'co_referenced' | 'semantic' | 'manual';

export interface EdgeInput {
  source_asset_id: string;
  target_asset_id: string;
  edge_type: EdgeType;
  weight?: number;
  metadata?: Record<string, unknown>;
}

// Upsert one edge. ON CONFLICT (session_id, source, target, edge_type)
// updates the weight + metadata so re-running Stage 04 refreshes the graph
// instead of duplicating rows.
export async function upsertRagEdge(
  sessionId: string,
  edge: EdgeInput
): Promise<string | null> {
  if (sessionId.startsWith('local-')) return null;
  const result = await query<{ id: string }>(
    `insert into rag_edges (session_id, source_asset_id, target_asset_id, edge_type, weight, metadata)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (session_id, source_asset_id, target_asset_id, edge_type)
     do update set weight = excluded.weight, metadata = excluded.metadata
     returning id`,
    [
      sessionId,
      edge.source_asset_id,
      edge.target_asset_id,
      edge.edge_type,
      edge.weight ?? 1.0,
      JSON.stringify(edge.metadata ?? {}),
    ]
  );
  return result?.rows[0]?.id ?? null;
}

// Given a workflow's steps and the asset_name → asset_id mapping from
// upsertRagAssets, materialize the graph: used_by_step edges (asset →
// asset, with step in metadata — represents the step that uses it) and
// co_referenced edges (assets that share at least one step). Returns
// the count of edges written.
export async function buildGraphFromWorkflow(
  sessionId: string,
  steps: Array<{ id: string; rag_assets: string[] | null | undefined }>,
  assetNameToId: Map<string, string>
): Promise<{ used_by_step: number; co_referenced: number }> {
  if (sessionId.startsWith('local-')) return { used_by_step: 0, co_referenced: 0 };

  let usedByStepCount = 0;
  let coReferencedCount = 0;

  // For each step, write a used_by_step self-edge per asset (records that
  // the asset is consumed by this step — stored as a self-loop so the graph
  // can be traversed from any asset to find its consumers via metadata).
  for (const step of steps) {
    const refs = (step.rag_assets ?? []).filter((name) => assetNameToId.has(name));
    for (const name of refs) {
      const id = assetNameToId.get(name)!;
      await upsertRagEdge(sessionId, {
        source_asset_id: id,
        target_asset_id: id,
        edge_type: 'used_by_step',
        weight: 1.0,
        metadata: { step_id: step.id },
      });
      usedByStepCount++;
    }
    // Co-referenced edges: every pair of assets in this step's refs gets a
    // bidirectional edge (two rows). Weight = 1 / number of refs so a step
    // with many assets contributes less per-pair to the overall co-ref score.
    if (refs.length >= 2) {
      const weight = Math.min(1, 1 / refs.length);
      for (let i = 0; i < refs.length; i++) {
        for (let j = 0; j < refs.length; j++) {
          if (i === j) continue;
          await upsertRagEdge(sessionId, {
            source_asset_id: assetNameToId.get(refs[i])!,
            target_asset_id: assetNameToId.get(refs[j])!,
            edge_type: 'co_referenced',
            weight,
            metadata: { via_step: step.id },
          });
          coReferencedCount++;
        }
      }
    }
  }

  return { used_by_step: usedByStepCount, co_referenced: coReferencedCount };
}

// Semantic edges: for every pair of session assets with embedding vectors,
// compute cosine similarity. If above the threshold, write a semantic edge.
// Cheap-ish — does the cross-join inside Postgres using the <=> operator.
export async function buildSemanticEdges(
  sessionId: string,
  similarityThreshold = 0.6
): Promise<number> {
  if (sessionId.startsWith('local-')) return 0;

  // SELECT every pair of (this session) assets whose cosine similarity is
  // above the threshold. cosine_similarity = 1 - cosine_distance, and
  // <=> returns cosine distance in pgvector.
  const r = await query<{ source_id: string; target_id: string; similarity: number }>(
    `select a1.id as source_id, a2.id as target_id,
            1 - (a1.embedding <=> a2.embedding) as similarity
       from rag_assets a1
       join rag_assets a2 on a1.session_id = a2.session_id and a1.id <> a2.id
      where a1.session_id = $1
        and a1.embedding is not null
        and a2.embedding is not null
        and 1 - (a1.embedding <=> a2.embedding) >= $2`,
    [sessionId, similarityThreshold]
  );

  for (const row of r?.rows ?? []) {
    await upsertRagEdge(sessionId, {
      source_asset_id: row.source_id,
      target_asset_id: row.target_id,
      edge_type: 'semantic',
      weight: row.similarity,
      metadata: { method: 'cosine' },
    });
  }
  return r?.rows.length ?? 0;
}

// ─── retrieve ────────────────────────────────────────────────────────────

// Similarity search scoped to a session. Returns the top-k most similar
// assets to `q` by cosine distance. Falls back to keyword (ILIKE) if there's
// no embedding model configured.
//
// Why cosine and not L2: text-embedding-004 produces normalised vectors so
// cosine and L2 rank identically; cosine reads more naturally as "similarity
// = 1 - distance" in [0, 1].
export async function searchRagAssets(
  sessionId: string,
  q: string,
  k = 3
): Promise<RagAssetHit[]> {
  if (sessionId.startsWith('local-')) return [];

  const qEmbedding = await embedText(q);

  if (qEmbedding) {
    const qParam = `[${qEmbedding.join(',')}]`;
    const r = await query<{
      id: string;
      asset_name: string;
      asset_type: RagAssetType;
      description: string;
      content: string;
      distance: number;
    }>(
      `select id, asset_name, asset_type, description, content,
              embedding <=> $1::vector as distance
         from rag_assets
        where session_id = $2 and embedding is not null
        order by embedding <=> $1::vector
        limit $3`,
      [qParam, sessionId, k]
    );
    return (r?.rows ?? []).map((row) => ({
      id: row.id,
      asset_name: row.asset_name,
      asset_type: row.asset_type,
      description: row.description,
      content: row.content,
      similarity: 1 - row.distance,
    }));
  }

  // Keyword fallback. Worse precision but keeps the system usable when
  // no embedding model is available.
  const r = await query<{
    id: string;
    asset_name: string;
    asset_type: RagAssetType;
    description: string;
    content: string;
  }>(
    `select id, asset_name, asset_type, description, content
       from rag_assets
      where session_id = $1
        and (asset_name ilike $2 or description ilike $2 or content ilike $2)
      limit $3`,
    [sessionId, `%${q}%`, k]
  );
  return (r?.rows ?? []).map((row) => ({ ...row, similarity: 0 }));
}
