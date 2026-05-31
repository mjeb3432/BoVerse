// lib/build-mapping.ts
//
// The deterministic map from archetype → which of the 10 BoVerse objects to
// build (required / optional / unnecessary). Corpus doc 09 (build mapping) +
// doc 10 (objects) + drafts/02 §3.2. SHARED: Swarm 1 classify writes these
// lists onto the archetype row; Swarm 2 recomputes + asserts agreement and
// refuses to build anything in `unnecessary`.
//
// "Discovery determines architecture → architecture determines build path →
//  build path determines objects." This file is the second arrow.

import type { Archetype, ObjectType } from './canonical-schema';

export interface BuildPlan {
  required: ObjectType[];
  optional: ObjectType[];
  unnecessary: ObjectType[];
  build_path: string;
}

// Every archetype partitions the 10 objects. Lists are exhaustive (required ∪
// optional ∪ unnecessary = all 10) so Swarm 2 can iterate uniformly.
const MATRIX: Record<Archetype, BuildPlan> = {
  workflow_component: {
    required: ['workflow'],
    optional: [],
    unnecessary: ['library', 'registry', 'canonical_tables', 'rules_wiki', 'connectors', 'ui', 'audit_layer', 'reporting_layer', 'decision_layer'],
    build_path: 'A single reusable workflow primitive. Build only the workflow; expose it for composition.',
  },
  mini_app: {
    required: ['workflow', 'ui'],
    optional: ['rules_wiki'],
    unnecessary: ['library', 'registry', 'canonical_tables', 'connectors', 'audit_layer', 'reporting_layer', 'decision_layer'],
    build_path: 'One tiny self-contained tool: a workflow plus a thin single-screen UI.',
  },
  sharp_point_solution: {
    required: ['workflow', 'rules_wiki', 'registry', 'canonical_tables', 'ui', 'audit_layer'],
    optional: [],
    unnecessary: ['connectors', 'decision_layer', 'reporting_layer', 'library'],
    build_path: 'One output, one user group, limited inputs: a workflow governed by a rules/wiki layer, a thin registry + canonical table, a thin upload→preview→approve UI, and a minimal audit trail. No connectors (inputs are uploaded), no reporting/decision/library.',
  },
  bridge: {
    required: ['workflow', 'connectors', 'canonical_tables'],
    optional: ['rules_wiki', 'audit_layer'],
    unnecessary: ['ui', 'registry', 'reporting_layer', 'decision_layer', 'library'],
    build_path: 'Move/transform data between systems: a workflow plus connectors (read + write) and a canonical table as the interchange. UI is incidental.',
  },
  app: {
    required: ['workflow', 'ui', 'canonical_tables', 'rules_wiki', 'audit_layer'],
    optional: ['registry', 'connectors', 'reporting_layer', 'library'],
    unnecessary: ['decision_layer'],
    build_path: 'A multi-screen, multi-workflow application: workflow + persistent UI + canonical tables + rules/wiki + audit. Reporting/connectors as the evidence warrants.',
  },
  decision_support_app: {
    required: ['workflow', 'decision_layer', 'ui', 'canonical_tables', 'audit_layer'],
    optional: ['rules_wiki', 'registry', 'reporting_layer', 'library'],
    unnecessary: ['connectors'],
    build_path: 'Produce a recommendation/score for a human: workflow + a decision/scoring layer + a review UI + canonical tables + audit.',
  },
  integrated_workflow: {
    required: ['workflow', 'connectors', 'canonical_tables', 'rules_wiki', 'audit_layer', 'registry'],
    optional: ['ui', 'reporting_layer', 'decision_layer', 'library'],
    unnecessary: [],
    build_path: 'Many steps across many systems: workflow + connectors + canonical tables + rules/wiki + registry + audit, orchestrated end to end.',
  },
  intelligence_layer: {
    required: ['workflow', 'library', 'canonical_tables', 'registry', 'rules_wiki', 'audit_layer'],
    optional: ['ui', 'reporting_layer', 'decision_layer', 'connectors'],
    unnecessary: [],
    build_path: 'Knowledge/RAG-centric: a library (embeddings) + canonical tables + registry + rules/wiki, with a workflow that grounds against them and an audit trail.',
  },
  operating_layer_oso: {
    required: ['library', 'registry', 'canonical_tables', 'rules_wiki', 'workflow', 'connectors', 'ui', 'audit_layer', 'reporting_layer', 'decision_layer'],
    optional: [],
    unnecessary: [],
    build_path: 'The org-wide operating system: build the full object set.',
  },
};

const UNKNOWN_PLAN: BuildPlan = {
  required: ['workflow'],
  optional: ['ui', 'rules_wiki', 'canonical_tables', 'registry', 'audit_layer', 'connectors', 'library', 'reporting_layer', 'decision_layer'],
  unnecessary: [],
  build_path: 'Archetype unresolved — build the workflow and treat all other objects as optional pending clarification.',
};

export function computeBuildPlan(archetype: Archetype | 'unknown'): BuildPlan {
  if (archetype === 'unknown') return UNKNOWN_PLAN;
  return MATRIX[archetype];
}

/** All 10 object types in canonical order (for uniform iteration). */
export { OBJECT_TYPES } from './canonical-schema';
