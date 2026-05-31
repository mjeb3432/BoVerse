// lib/swarm2/objects.ts
//
// The Object Creation framework (corpus doc 10). One creator per BoVerse object;
// each turns the approved WDS into concrete artifacts. The assembler calls a
// creator only when the build plan marks that object REQUIRED (or justified
// optional) and refuses everything in `unnecessary` — so a build produces ONLY
// what the workflow needs. Deterministic (no LLM): the workflow's prompt
// templates are left as TODO placeholders in this first cut.

import type { Swarm2Input } from '../swarm/contract';
import type { BuildPlan } from '../build-mapping';
import type { ObjectType } from '../canonical-schema';
import { type BuiltObject, type ObjectFile, slug } from './types';

function jsonFile(path: string, obj: unknown): ObjectFile {
  return { path, media_type: 'application/json', content: JSON.stringify(obj, null, 2) };
}
function mdFile(path: string, content: string): ObjectFile {
  return { path, media_type: 'text/markdown', content };
}
function built(object_type: ObjectType, summary: Record<string, unknown>, files: ObjectFile[]): BuiltObject {
  return { kind: 'built', object_type, summary, files };
}

type Creator = (input: Swarm2Input, plan: BuildPlan) => BuiltObject;

// 5 · Workflow — ALWAYS built. The runnable definition.
const createWorkflow: Creator = (input, plan) => {
  const wds = input.wds;
  const steps = wds.steps.map((s, idx) => {
    const order = s.sequence_order ?? idx + 1;
    const kind = s.hitl_required
      ? 'human_gate'
      : s.deterministic_rule_available && !s.probabilistic_reasoning_required
        ? 'deterministic_rule'
        : 'agent_task';
    return {
      sequence_order: order,
      id: String(order),
      name: s.step_name ?? `step ${order}`,
      kind,
      actor: s.hitl_required ? 'human' : 'auto',
      inputs: s.input_required,
      outputs: s.output_produced ? [s.output_produced] : [],
      rule_ref: kind === 'deterministic_rule' ? 'rules/ruleset.json' : null,
      prompt_template: kind === 'agent_task' ? `TODO: author prompt for "${s.step_name ?? order}"` : null,
      hitl_gate_ref: s.hitl_required ? `gate_${order}` : null,
    };
  });
  const hitl_gates = wds.hitl.map((h, i) => ({
    id: `gate_${i + 1}`,
    human_role: h.human_role,
    review_trigger: h.review_trigger,
    approval_required: h.approval_required,
    reason: h.reason_for_review,
  }));
  const workflow = {
    workflow_id: wds.workflow_id,
    workflow_name: wds.workflow_name,
    archetype: wds.classification.primary_archetype,
    build_path: plan.build_path,
    trigger: { type: 'manual', first_step: 1 },
    input_contract: input.simulation.input_contract,
    steps,
    rules_ref: 'rules/ruleset.json',
    hitl_gates,
    audit_ref: 'audit/audit-spec.json',
  };
  return built('workflow', { steps: steps.length, gates: hitl_gates.length }, [jsonFile('workflow.json', workflow)]);
};

// 4 · Rules / Wiki — compiled ruleset + prose wiki.
const createRulesWiki: Creator = (input) => {
  const rules = input.wds.rules;
  const ruleset = {
    rules: rules.map((r) => ({
      rule_name: r.rule_name,
      condition: r.condition,
      action: r.action,
      threshold: r.threshold,
      applies_to_step: r.applies_to_step_name,
      deterministic_status: r.deterministic_status,
      requires_confirmation: r.requires_confirmation,
    })),
  };
  const wiki = ['# Rules / Wiki', '', `${rules.length} rule(s) compiled from the approved specification.`, '']
    .concat(
      rules.map((r) =>
        `## ${r.rule_name ?? 'rule'}\n\n- **When:** ${r.condition ?? '—'}\n- **Then:** ${r.action ?? '—'}\n- **Threshold:** ${r.threshold ?? '—'}\n- **Confirmation required:** ${r.requires_confirmation ? 'yes' : 'no'}\n`,
      ),
    )
    .join('\n');
  return built('rules_wiki', { rules: rules.length }, [jsonFile('rules/ruleset.json', ruleset), mdFile('rules/wiki.md', wiki)]);
};

// 2 · Registry — the recurring attributes the workflow extracts/uses.
const createRegistry: Creator = (input) => {
  const attrs = new Map<string, string>();
  for (const o of input.wds.outputs) for (const f of o.required_fields) attrs.set(f, 'output_field');
  for (const i of input.wds.inputs) if (i.input_name) attrs.set(i.input_name, 'input');
  const registry = { attributes: [...attrs].map(([attribute, source]) => ({ attribute, source })) };
  return built('registry', { attributes: attrs.size }, [jsonFile('registry/attributes.json', registry)]);
};

// 3 · Canonical Tables — a minimal run table for the output record.
const createCanonicalTables: Creator = (input) => {
  const out = input.wds.outputs[0];
  const name = `${slug(out?.output_name, 'workflow_record')}_record`;
  const table = {
    table_name: name,
    columns: [
      { name: 'id', type: 'uuid', pk: true },
      ...(out?.required_fields ?? []).map((f) => ({ name: slug(f), type: 'text' })),
      { name: 'created_at', type: 'timestamptz' },
    ],
  };
  return built('canonical_tables', { table: name, columns: table.columns.length }, [jsonFile(`canonical/${name}.schema.json`, table)]);
};

// 6 · Connectors — only for systems the runtime reads/writes.
const createConnectors: Creator = (input) => {
  const systems = input.wds.systems.filter((s) => s.read_required || s.write_required);
  if (systems.length === 0) {
    return built('connectors', { systems: 0, note: 'no runtime systems referenced' }, [
      jsonFile('connectors/none.json', { connectors: [], note: 'No runtime systems — inputs are uploaded, not fed.' }),
    ]);
  }
  const files = systems.map((s) =>
    jsonFile(`connectors/${slug(s.system_name, 'system')}.json`, {
      system_name: s.system_name,
      connection_type: s.connection_type,
      read: s.read_required,
      write: s.write_required,
      authentication_required: s.authentication_required,
      data_objects: s.data_objects_accessed,
    }),
  );
  return built('connectors', { systems: systems.length }, files);
};

// 7 · UI — only the surfaces an actor/HITL implies.
const createUi: Creator = (input) => {
  const surfaces = [
    { name: 'upload', purpose: 'collect the per-run inputs' },
    { name: 'output_preview', purpose: 'show the rendered output for review' },
  ];
  if (input.wds.hitl.length > 0) surfaces.push({ name: 'approval', purpose: 'human approval gate before release' });
  const files = surfaces.map((s) =>
    jsonFile(`ui/${s.name}.json`, {
      surface: s.name,
      purpose: s.purpose,
      fields: input.simulation.input_contract.map((f) => ({ name: f.name, type: f.type, required: f.required })),
    }),
  );
  return built('ui', { surfaces: surfaces.length }, files);
};

// 8 · Audit Layer — retention + explainability + the approval gates.
const createAudit: Creator = (input) => {
  const audit = {
    retain: ['inputs', 'rendered_output', 'approvals', 'provenance'],
    explainability: true,
    approval_gates: input.wds.hitl.map((h) => ({ stage: h.workflow_stage, role: h.human_role, trigger: h.review_trigger, approval_required: h.approval_required })),
  };
  return built('audit_layer', { gates: input.wds.hitl.length }, [jsonFile('audit/audit-spec.json', audit)]);
};

// 1 · Library — knowledge/RAG collections (intelligence-heavy workflows).
const createLibrary: Creator = (input) => {
  const sources = input.wds.outputs.flatMap((o) => o.source_examples);
  const library = {
    collections: [
      { name: 'knowledge', sources: sources.length ? sources : ['(seed from uploaded evidence)'], retrieval: 'pgvector cosine top-k' },
    ],
  };
  return built('library', { collections: 1, sources: sources.length }, [jsonFile('library/knowledge.json', library)]);
};

// 9 · Reporting Layer — metrics over runs.
const createReporting: Creator = (input) => {
  const reports = input.wds.outcomes
    .filter((o) => o.success_metric)
    .map((o) => ({ name: o.success_metric, measures: o.outcome_description }));
  const reporting = { reports: reports.length ? reports : [{ name: 'throughput', measures: 'runs over time' }] };
  return built('reporting_layer', { reports: reporting.reports.length }, [jsonFile('reporting/report.json', reporting)]);
};

// 10 · Decision Layer — scoring/recommendation logic.
const createDecision: Creator = (input) => {
  const decision = {
    decision: input.wds.outputs[0]?.output_name ?? 'decision',
    factors: input.wds.rules.map((r) => ({ factor: r.rule_name, logic: `${r.condition ?? ''} -> ${r.action ?? ''}` })),
  };
  return built('decision_layer', { factors: decision.factors.length }, [jsonFile('decision/decision-spec.json', decision)]);
};

export const CREATORS: Record<ObjectType, Creator> = {
  workflow: createWorkflow,
  rules_wiki: createRulesWiki,
  registry: createRegistry,
  canonical_tables: createCanonicalTables,
  connectors: createConnectors,
  ui: createUi,
  audit_layer: createAudit,
  library: createLibrary,
  reporting_layer: createReporting,
  decision_layer: createDecision,
};
