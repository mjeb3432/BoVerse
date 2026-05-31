// lib/swarm2/store.ts — build-artifact persistence. Text artifacts in rows
// (browsable, survive refresh); the .zip is assembled on the fly at download.

import { randomUUID } from 'node:crypto';
import { HAS_DATABASE, query } from '../postgres';
import type { BundleManifest, ObjectFile, ObjectResult } from './types';

const BUILD_MEMORY = new Map<string, { manifest: BundleManifest; files: ObjectFile[] }>();

export function newBuildId(): string {
  return randomUUID();
}

export async function saveBuild(args: {
  buildId: string;
  workflowId: string;
  sessionId: string;
  wdsVersion: number;
  manifest: BundleManifest;
  objects: ObjectResult[];
  files: ObjectFile[];
}): Promise<void> {
  const { buildId, workflowId, sessionId, wdsVersion, manifest, objects, files } = args;

  if (!HAS_DATABASE || sessionId.startsWith('local-')) {
    BUILD_MEMORY.set(buildId, { manifest, files });
    return;
  }

  await query(
    `insert into build_runs
       (id, workflow_id, session_id, wds_version, primary_archetype, build_path, build_readiness, verification_status, manifest, warnings)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)`,
    [
      buildId, workflowId, sessionId, wdsVersion, manifest.primary_archetype, manifest.build_path,
      manifest.build_readiness, manifest.verification_status, JSON.stringify(manifest), JSON.stringify(manifest.warnings),
    ],
  );

  const objectFilePaths = new Set<string>();
  for (const o of objects) {
    const objId = randomUUID();
    await query(
      `insert into build_objects (id, build_id, object_type, status, reason, summary)
       values ($1,$2,$3,$4,$5,$6::jsonb)`,
      [objId, buildId, o.object_type, o.kind, o.kind === 'refused' ? o.reason : null, JSON.stringify(o.kind === 'built' ? o.summary : {})],
    );
    if (o.kind === 'built') {
      for (const f of o.files) {
        objectFilePaths.add(f.path);
        await query(
          `insert into build_artifacts (build_id, object_id, path, media_type, content, bytes)
           values ($1,$2,$3,$4,$5,$6)`,
          [buildId, objId, f.path, f.media_type, f.content, f.content.length],
        );
      }
    }
  }
  // top-level files (manifest, spec, agent-swarm, REFUSED) — object_id null
  for (const f of files) {
    if (objectFilePaths.has(f.path)) continue;
    await query(
      `insert into build_artifacts (build_id, object_id, path, media_type, content, bytes)
       values ($1,null,$2,$3,$4,$5)`,
      [buildId, f.path, f.media_type, f.content, f.content.length],
    );
  }
}

export async function getBuild(buildId: string): Promise<{ manifest: BundleManifest; files: ObjectFile[] } | null> {
  if (!HAS_DATABASE) return BUILD_MEMORY.get(buildId) ?? null;

  const r = await query<{ manifest: BundleManifest }>('select manifest from build_runs where id = $1', [buildId]);
  const run = r?.rows[0];
  if (!run) return BUILD_MEMORY.get(buildId) ?? null;

  const a = await query<{ path: string; media_type: string; content: string | null }>(
    'select path, media_type, content from build_artifacts where build_id = $1 order by path',
    [buildId],
  );
  const files: ObjectFile[] = (a?.rows ?? []).map((row) => ({ path: row.path, media_type: row.media_type, content: row.content ?? '' }));
  return { manifest: run.manifest, files };
}
