// lib/swarm2/types.ts — shared shapes for the Build swarm.

import type { ObjectType } from '../canonical-schema';

export interface ObjectFile {
  path: string;
  media_type: string;
  content: string;
}

export interface BuiltObject {
  kind: 'built';
  object_type: ObjectType;
  summary: Record<string, unknown>;
  files: ObjectFile[];
}

export interface RefusedObject {
  kind: 'refused';
  object_type: ObjectType;
  reason: string;
}

export type ObjectResult = BuiltObject | RefusedObject;

export interface BundleManifest {
  workflow_id: string;
  workflow_name: string | null;
  primary_archetype: string;
  build_path: string | null;
  build_readiness: string;
  generated_at: string;
  verification_status: 'pending' | 'passed' | 'failed' | 'skipped';
  objects: { object_type: ObjectType; status: 'built' | 'refused'; reason: string | null; file_count: number }[];
  files: string[];
  warnings: string[];
}

export function slug(s: string | null | undefined, fallback = 'item'): string {
  return (s ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;
}
