// lib/simulation.ts
//
// The Simulation Pack projector (corpus doc 08 + drafts/04 Parts B & C). It
// renders the ONLY two things the business user ever sees:
//   - the sample OUTPUT (Part B) — the deliverable, rendered as the real thing;
//   - the sample INPUTS (Part C) — realistic example inputs, worked BACKWARD
//     from the output, that the user comments on / edits.
//
// Per corpus 08 §1.1 the rendered prose is the one allowed probabilistic
// synthesis; it is constrained to conform to the canonical `output` row and to
// apply the canonical `decision_rule` rows in order. (A fully deterministic
// pricing evaluator is the documented hardening path; this first cut has the
// LLM compute from the rules and records the key numbers in computed_fields.)

import { generateObject } from 'ai';
import { z } from 'zod';
import { fastModel } from './llm';
import { searchRagAssets } from './rag';
import type { CanonicalStore } from './canonical-schema';
import type { SimulationPack, SampleInput, SampleOutput, SimSchemaField } from './swarm/contract';

const isRuntime = (t: string) => t === 'required_workflow_input' || t === 'both';

const SimLLMSchema = z.object({
  sample_inputs: z.array(
    z.object({
      input_name: z.string(),
      rendered: z.string(), // business-readable rendering of the example value
      example_value_json: z.string(), // the structured value, JSON-stringified
    }),
  ),
  sample_output: z.object({
    rendered_sample: z.string(), // the deliverable, rendered as the real thing
    computed_fields: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  grading_targets: z.array(z.string()),
});

function simulateSystemPrompt(store: CanonicalStore, grounding: string): string {
  const out = store.outputs[0];
  const runtimeInputs = store.inputs.filter((i) => isRuntime(i.input_type));
  const rules = store.rules
    .map((r) => `- ${r.rule_name}: WHEN ${r.condition ?? '(unspecified)'} THEN ${r.action ?? '(unspecified)'}${r.threshold ? ` [${r.threshold}]` : ''}`)
    .join('\n');

  // Canonical identity — always available (deterministic), independent of RAG.
  // This anchors the sample to the ACTUAL client/problem so it stays grounded
  // even when embedding-based grounding is unavailable (e.g. the embeddings
  // provider is down) — otherwise the model invents a generic placeholder
  // company instead of using the real one from the evidence.
  const id = store.identity;
  const idLines = [
    id.client_name ? `- client: ${id.client_name}` : null,
    id.workflow_name ? `- workflow: ${id.workflow_name}` : null,
    id.stated_problem ? `- the client's request (verbatim): ${id.stated_problem}` : null,
    id.primary_objective ? `- objective: ${id.primary_objective}` : null,
  ].filter(Boolean).join('\n');

  return `You are BoVerse's simulation engine. Produce the TWO surfaces a non-technical business owner will review. Work OUTPUT-FIRST, then back-solve the inputs.

THE CLIENT / CONTEXT (use these REAL names — never invent a placeholder company when a real one is given):
${idLines || '- (no client captured — keep the example plausible and internally consistent)'}

THE DELIVERABLE (output) to render:
- name: ${out?.output_name ?? 'Output'} (${out?.output_type ?? 'document'}, ${out?.output_format ?? 'document'})
- required sections: ${(out?.required_sections ?? []).join(', ') || '(infer sensible sections)'}
- quality criteria: ${(out?.quality_criteria ?? []).join('; ') || '(produce a correct, complete deliverable)'}

THE BUSINESS RULES to apply (apply multipliers before discounts; honor thresholds and approval gates; never mark up pass-through costs):
${rules || '(no explicit rules — produce a faithful deliverable)'}

THE PER-RUN INPUTS to fabricate realistic examples for (one example per input, grounded in the evidence below):
${runtimeInputs.map((i) => `- ${i.input_name} (${i.format})`).join('\n') || '- (infer the inputs the deliverable needs)'}

GROUNDING EVIDENCE (use real names/numbers/structures from here so the sample is believable):
${grounding || '(no embedding-based grounding retrieved — rely on THE CLIENT / CONTEXT above and the rules; do NOT invent a different company name)'}

Return:
1. sample_inputs: for EACH per-run input, a realistic example_value_json (valid JSON) and a short business-readable "rendered" string a non-technical owner would recognize.
2. sample_output.rendered_sample: the deliverable rendered exactly as the user would receive it (e.g. a draft proposal with scope, line items, the price math applied IN ORDER per the rules, totals, and terms). Show the arithmetic the rules imply.
3. sample_output.computed_fields: the key named numbers (label + value), e.g. subtotal, each multiplier/discount line, total, deposit.
4. grading_targets: how a correct output is judged.

Be specific and internally consistent: the sample_inputs, run through the rules, MUST produce the numbers in sample_output.`;
}

export async function buildSimulation(store: CanonicalStore, sessionId: string): Promise<SimulationPack> {
  const runtimeInputs = store.inputs.filter((i) => isRuntime(i.input_type));

  // RAG grounding (golden references seeded at extract time).
  let grounding = '';
  if (!sessionId.startsWith('local-')) {
    const q = store.outputs[0]?.output_name ?? store.identity.primary_objective ?? 'workflow output';
    const hits = await searchRagAssets(sessionId, q, 3);
    grounding = hits.map((h) => `### ${h.asset_name}\n${h.content.slice(0, 2500)}`).join('\n\n');
  }

  const { object } = await generateObject({
    model: fastModel(),
    schema: SimLLMSchema,
    messages: [{ role: 'user', content: [{ type: 'text', text: simulateSystemPrompt(store, grounding) }] }],
  });

  // Assemble sample inputs (match LLM outputs to canonical runtime inputs).
  const pool = [...object.sample_inputs];
  const sample_inputs: SampleInput[] = runtimeInputs.map((i) => {
    const idx = pool.findIndex((s) => s.input_name === i.input_name);
    const found = idx >= 0 ? pool.splice(idx, 1)[0] : pool.shift();
    let example_value: unknown = i.example_value ?? null;
    if (found) {
      try {
        example_value = JSON.parse(found.example_value_json);
      } catch {
        example_value = found.example_value_json;
      }
    }
    return {
      input_name: i.input_name ?? 'input',
      input_type: i.input_type,
      format: i.format,
      rendered: found?.rendered ?? '',
      example_value,
    };
  });

  const computed_fields: Record<string, unknown> = {};
  for (const c of object.sample_output.computed_fields) computed_fields[c.label] = c.value;

  const out = store.outputs[0];
  const sample_output: SampleOutput = {
    output_name: out?.output_name ?? 'Output',
    output_type: out?.output_type ?? 'document',
    output_format: out?.output_format ?? 'unknown',
    required_sections: out?.required_sections ?? [],
    rendered_sample: object.sample_output.rendered_sample,
    computed_fields,
  };

  const input_contract: SimSchemaField[] = runtimeInputs.map((i) => ({
    name: i.input_name ?? 'input',
    type: 'object',
    description: `${i.input_type} input (${i.format})`,
    required: i.required_or_optional !== 'optional',
    enum_values: null,
  }));

  const step_trace = store.steps.map((s, idx) => ({
    sequence_order: s.sequence_order ?? idx + 1,
    step_name: s.step_name ?? `step ${idx + 1}`,
    consumed: s.input_required.join(', '),
    produced: s.output_produced ?? '',
    determinism: {
      rule: s.deterministic_rule_available,
      reasoning: s.probabilistic_reasoning_required,
      hitl: s.hitl_required,
    },
    rule_fired: null,
  }));

  return {
    workflow_id: store.identity.workflow_id ?? '',
    version: 1,
    input_contract,
    sample_output,
    sample_inputs,
    grading_targets: object.grading_targets,
    step_trace,
  };
}

// ─── reprojection (the Part D edit loop) ─────────────────────────────────────
// After the user edits an input value, KEEP the edited inputs and re-render ONLY
// the output from them. This is what keeps the two surfaces mutually consistent.

function renderInputValue(value: unknown): string {
  if (value == null) return '(no value)';
  if (typeof value === 'string') return value;
  try {
    if (Array.isArray(value)) {
      return value.map((v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v))).join('\n');
    }
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v && typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join('\n');
    }
  } catch {
    /* fall through */
  }
  return String(value);
}

const OutputLLMSchema = z.object({
  rendered_sample: z.string(),
  computed_fields: z.array(z.object({ label: z.string(), value: z.string() })),
  grading_targets: z.array(z.string()),
});

async function renderOutputFromInputs(store: CanonicalStore, sampleInputs: SampleInput[]) {
  const out = store.outputs[0];
  const inputsBlock = sampleInputs
    .map((si) => `### ${si.input_name}\n${JSON.stringify(si.example_value, null, 2)}`)
    .join('\n\n');
  const rulesBlock = store.rules
    .map((r) => `- ${r.rule_name}: WHEN ${r.condition ?? '(unspecified)'} THEN ${r.action ?? '(unspecified)'}${r.threshold ? ` [${r.threshold}]` : ''}`)
    .join('\n');
  const prompt = `Render the deliverable "${out?.output_name ?? 'Output'}" from these FIXED example inputs, applying the business rules IN ORDER (multipliers before discounts; honor thresholds/approval gates; never mark up pass-through). Do not change the inputs.

INPUTS:
${inputsBlock}

RULES:
${rulesBlock || '(no explicit rules)'}

Required sections: ${(out?.required_sections ?? []).join(', ') || '(sensible sections)'}.
Return the rendered deliverable, the key computed_fields (label + value), and grading_targets.`;

  const { object } = await generateObject({
    model: fastModel(),
    schema: OutputLLMSchema,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  });
  return object;
}

export async function reproject(store: CanonicalStore): Promise<SimulationPack> {
  const runtimeInputs = store.inputs.filter((i) => isRuntime(i.input_type));
  const sample_inputs: SampleInput[] = runtimeInputs.map((i) => ({
    input_name: i.input_name ?? 'input',
    input_type: i.input_type,
    format: i.format,
    rendered: renderInputValue(i.example_value),
    example_value: i.example_value ?? null,
  }));

  const o = await renderOutputFromInputs(store, sample_inputs);
  const computed_fields: Record<string, unknown> = {};
  for (const c of o.computed_fields) computed_fields[c.label] = c.value;

  const out = store.outputs[0];
  const sample_output: SampleOutput = {
    output_name: out?.output_name ?? 'Output',
    output_type: out?.output_type ?? 'document',
    output_format: out?.output_format ?? 'unknown',
    required_sections: out?.required_sections ?? [],
    rendered_sample: o.rendered_sample,
    computed_fields,
  };

  const input_contract: SimSchemaField[] = runtimeInputs.map((i) => ({
    name: i.input_name ?? 'input',
    type: 'object',
    description: `${i.input_type} input (${i.format})`,
    required: i.required_or_optional !== 'optional',
    enum_values: null,
  }));

  const step_trace = store.steps.map((s, idx) => ({
    sequence_order: s.sequence_order ?? idx + 1,
    step_name: s.step_name ?? `step ${idx + 1}`,
    consumed: s.input_required.join(', '),
    produced: s.output_produced ?? '',
    determinism: {
      rule: s.deterministic_rule_available,
      reasoning: s.probabilistic_reasoning_required,
      hitl: s.hitl_required,
    },
    rule_fired: null,
  }));

  return {
    workflow_id: store.identity.workflow_id ?? '',
    version: 1,
    input_contract,
    sample_output,
    sample_inputs,
    grading_targets: o.grading_targets,
    step_trace,
  };
}
