// lib/discovery-package.ts
//
// CONFIGURATION 0 — DISCOVERY. The Workflow Creator's own output set: the six
// named artifacts Discovery produces to answer "What should we build?" BEFORE
// any build runs. This is a PURE projection of the canonical store (+ the
// already-generated Simulation Pack) — no LLM, no build. It names and surfaces
// content that already exists across the store, the WDS, and the simulation,
// so the six outputs are first-class Discovery deliverables rather than being
// tucked inside the operator view or only materialized later as Swarm-2 build
// objects.
//
//   Inputs (evidence): notes, docs, SOPs, examples →
//   Outputs (this package):
//     1. Workflow Blueprint        (the WDS — the deterministic spec)
//     2. Workflow Classification   (archetype + the "what to build" answer)
//     3. Registry                  (the recurring attributes the workflow uses)
//     4. Canonical Schema          (the populated canonical data model)
//     5. Rules Wiki                (the business rules, as a wiki)
//     6. Simulation Pack           (sample output + sample inputs)

import type { CanonicalStore } from './canonical-schema';
import type { SimulationPack, Wds } from './swarm/contract';
import { buildWds } from './wds';

const isRuntime = (t: string) => t === 'required_workflow_input' || t === 'both';

// ─── 2 · Classification + the load-bearing question ──────────────────────────
export interface DiscoveryClassification {
  primary_archetype: string;
  secondary_archetype: string;
  complexity_level: string;
  classification_confidence: number | null;
  evidence_for_classification: string | null;
  // "What should we build?" — the deterministic answer.
  what_to_build: {
    build_path: string | null;
    required_components: string[];   // build these
    optional_components: string[];   // build only with justification
    unnecessary_components: string[]; // MUST refuse
    build_readiness: string;
  };
}

// ─── 3 · Registry ────────────────────────────────────────────────────────────
export interface RegistryAttribute { attribute: string; role: string; source: string | null }
export interface DiscoveryRegistry { count: number; attributes: RegistryAttribute[] }

// ─── 4 · Canonical Schema (populated) ────────────────────────────────────────
export interface CanonicalTableView { table: string; rows: number; key_fields: string[] }
export interface DiscoveryCanonicalSchema {
  note: string;
  populated_tables: CanonicalTableView[];
  entities: {
    identity: CanonicalStore['identity'];
    outputs: CanonicalStore['outputs'];
    inputs: CanonicalStore['inputs'];
    actors: CanonicalStore['actors'];
    systems: CanonicalStore['systems'];
    steps: CanonicalStore['steps'];
  };
}

// ─── 5 · Rules Wiki ──────────────────────────────────────────────────────────
export interface RulesWikiEntry {
  rule_name: string | null;
  condition: string | null;
  action: string | null;
  threshold: string | null;
  applies_to_step: string | null;
  deterministic_status: string;
  requires_confirmation: boolean;
}
export interface DiscoveryRulesWiki { count: number; rules: RulesWikiEntry[]; markdown: string }

// ─── the package ─────────────────────────────────────────────────────────────
export interface DiscoveryPackage {
  discovery_package_version: number;
  question: 'What should we build?';
  workflow_blueprint: Wds;
  workflow_classification: DiscoveryClassification;
  registry: DiscoveryRegistry;
  canonical_schema: DiscoveryCanonicalSchema;
  rules_wiki: DiscoveryRulesWiki;
  simulation_pack: SimulationPack | null;
}

const DISCOVERY_PACKAGE_VERSION = 1;

function projectRegistry(store: CanonicalStore): DiscoveryRegistry {
  // The recurring attributes the workflow extracts/produces/uses. Deduped by
  // attribute name; first role wins.
  const attrs = new Map<string, RegistryAttribute>();
  const add = (attribute: string | null | undefined, role: string, source: string | null) => {
    const key = (attribute ?? '').trim();
    if (!key || attrs.has(key)) return;
    attrs.set(key, { attribute: key, role, source });
  };
  for (const o of store.outputs) {
    for (const f of o.required_fields) add(f, 'output_field', o.output_name ?? null);
  }
  for (const i of store.inputs.filter((x) => isRuntime(x.input_type))) {
    add(i.input_name, 'runtime_input', i.source_system);
  }
  for (const s of store.systems) add(s.system_name, 'system', s.connection_type);
  for (const a of store.actors) add(a.role_name, 'actor', a.person_or_team);
  return { count: attrs.size, attributes: [...attrs.values()] };
}

function projectCanonicalSchema(store: CanonicalStore): DiscoveryCanonicalSchema {
  const populated_tables: CanonicalTableView[] = [
    { table: 'workflow_identity', rows: store.identity.primary_objective || store.identity.workflow_name ? 1 : 0, key_fields: ['workflow_name', 'primary_objective', 'workflow_type'] },
    { table: 'outcome', rows: store.outcomes.length, key_fields: ['outcome_description', 'business_value', 'success_metric'] },
    { table: 'output', rows: store.outputs.length, key_fields: ['output_name', 'output_type', 'output_format', 'required_sections'] },
    { table: 'input', rows: store.inputs.length, key_fields: ['input_name', 'input_type', 'source_system', 'format'] },
    { table: 'actor', rows: store.actors.length, key_fields: ['role_name', 'person_or_team', 'approval_authority'] },
    { table: 'system_connector', rows: store.systems.length, key_fields: ['system_name', 'connection_type', 'read_required', 'write_required'] },
    { table: 'process_step', rows: store.steps.length, key_fields: ['step_name', 'sequence_order', 'hitl_required'] },
    { table: 'decision_rule', rows: store.rules.length, key_fields: ['rule_name', 'condition', 'action', 'threshold'] },
    { table: 'human_review', rows: store.hitl.length, key_fields: ['human_role', 'review_trigger', 'approval_required'] },
  ].filter((t) => t.rows > 0);

  return {
    note: 'The 13-table canonical store (migrations/0005_canonical_store.sql), populated for this workflow. Closed enums + FK/CHECK constraints are the determinism layer.',
    populated_tables,
    entities: {
      identity: store.identity,
      outputs: store.outputs,
      inputs: store.inputs,
      actors: store.actors,
      systems: store.systems,
      steps: store.steps,
    },
  };
}

function projectRulesWiki(store: CanonicalStore): DiscoveryRulesWiki {
  const rules: RulesWikiEntry[] = store.rules.map((r) => ({
    rule_name: r.rule_name,
    condition: r.condition,
    action: r.action,
    threshold: r.threshold,
    applies_to_step: r.applies_to_step_name,
    deterministic_status: r.deterministic_status,
    requires_confirmation: r.requires_confirmation,
  }));
  const markdown = ['# Rules / Wiki', '', `${rules.length} rule(s) extracted from the evidence.`, '']
    .concat(
      rules.map((r) =>
        `## ${r.rule_name ?? 'rule'}\n\n- **When:** ${r.condition ?? '—'}\n- **Then:** ${r.action ?? '—'}\n- **Threshold:** ${r.threshold ?? '—'}\n- **Applies to step:** ${r.applies_to_step ?? '—'}\n- **Confirmation required:** ${r.requires_confirmation ? 'yes' : 'no'}\n`,
      ),
    )
    .join('\n');
  return { count: rules.length, rules, markdown };
}

/**
 * Assemble the six named Discovery (Configuration 0) outputs. Pure: a function
 * of the canonical store plus the already-generated Simulation Pack (passed in
 * when available; the other five outputs need only the store).
 */
export function buildDiscoveryPackage(store: CanonicalStore, simulation: SimulationPack | null): DiscoveryPackage {
  const blueprint = buildWds(store);
  const br = blueprint.build_recommendation;

  return {
    discovery_package_version: DISCOVERY_PACKAGE_VERSION,
    question: 'What should we build?',
    workflow_blueprint: blueprint,
    workflow_classification: {
      primary_archetype: blueprint.classification.primary_archetype,
      secondary_archetype: blueprint.classification.secondary_archetype,
      complexity_level: blueprint.classification.complexity_level,
      classification_confidence: blueprint.classification.classification_confidence,
      evidence_for_classification: blueprint.classification.evidence_for_classification,
      what_to_build: {
        build_path: br.recommended_build_path,
        required_components: br.required_components,
        optional_components: br.optional_components,
        unnecessary_components: br.unnecessary_components,
        build_readiness: br.build_readiness,
      },
    },
    registry: projectRegistry(store),
    canonical_schema: projectCanonicalSchema(store),
    rules_wiki: projectRulesWiki(store),
    simulation_pack: simulation,
  };
}

// Compact counts for the UI panel (cheap; no need to ship the full package
// just to show "Rules Wiki — 6 rules").
export interface DiscoveryPackageSummary {
  archetype: string;
  build_readiness: string;
  required_components: string[];
  unnecessary_components: string[];
  registry_attributes: number;
  canonical_tables_populated: number;
  rules: number;
  has_simulation: boolean;
}

export function summarizeDiscoveryPackage(pkg: DiscoveryPackage): DiscoveryPackageSummary {
  return {
    archetype: pkg.workflow_classification.primary_archetype,
    build_readiness: pkg.workflow_classification.what_to_build.build_readiness,
    required_components: pkg.workflow_classification.what_to_build.required_components,
    unnecessary_components: pkg.workflow_classification.what_to_build.unnecessary_components,
    registry_attributes: pkg.registry.count,
    canonical_tables_populated: pkg.canonical_schema.populated_tables.length,
    rules: pkg.rules_wiki.count,
    has_simulation: pkg.simulation_pack != null,
  };
}
