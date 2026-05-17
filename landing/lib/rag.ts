// RAG asset storage + retrieval against pgvector. Used by Stage 04 (writes
// the workflow's rag_library to the table) and Stage 05 (similarity search
// at execution time so retrieve steps return real content, not stubs).
//
// Embedding model: Google `text-embedding-004` (768 dims, free 1500 req/day).
// If GOOGLE_GENERATIVE_AI_API_KEY is unset, embeddings are skipped and
// retrieval falls back to ILIKE keyword matching — the system stays usable
// without RAG, just less precise.

import { embed } from 'ai';
import { embeddingModel } from './llm';
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
    const { embedding } = await embed({ model, value: text });
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
