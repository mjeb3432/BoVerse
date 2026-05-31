// Deterministic smoke test of the Swarm 2 core (no LLM, no DB).
// Verifies the sharp_point_solution oracle: 6 built / 4 refused, verify passes,
// and the zip writer emits a valid archive. Run: npx tsx scripts/test-assemble.ts
import { assemble } from '../lib/swarm2/assemble';
import { zipStore } from '../lib/swarm2/zip';
import type { Swarm2Input } from '../lib/swarm/contract';

const input: Swarm2Input = {
  wds: {
    workflow_id: 'wf-test', version: 1, generated_at: '2026-05-29T00:00:00Z',
    workflow_name: 'Inbound Brief to Proposal', client_name: 'Flint & Tinder',
    stated_problem: null, inferred_problem: null, primary_objective: 'Turn a brief into a priced proposal',
    workflow_type: 'document_generation', overall_confidence: 0.85,
    classification: { primary_archetype: 'sharp_point_solution', secondary_archetype: 'none', complexity_level: 'simple', classification_confidence: 0.9, evidence_for_classification: 'one output, limited inputs' },
    outcomes: [{ outcome_description: 'priced proposal in minutes', business_value: null, success_metric: 'turnaround', time_savings: '2d -> 20m', confidence_score: 0.8 }],
    outputs: [{ output_name: 'Cold Front Proposal', output_type: 'document', output_format: 'pdf', required_sections: ['Scope', 'Line Items', 'Pricing', 'Terms'], required_fields: ['total', 'deposit'], editable_by_user: true, approval_required: true, source_examples: [], quality_criteria: ['totals reconcile'], confidence_score: 0.9 }],
    inputs: [{ input_name: 'Inbound Brief', input_type: 'both', source_system: 'email', format: 'plain_text', structured_or_unstructured: 'unstructured', required_or_optional: 'required', example_value: null, confidence_score: 0.9 }],
    actors: [{ role_name: 'Creative Director', person_or_team: 'individual', responsibility: 'approve', approval_authority: 'approve_high', interaction_type: 'approves', confidence_score: 0.9 }],
    systems: [],
    steps: [
      { step_name: 'Price the proposal', sequence_order: 1, input_required: ['Inbound Brief'], output_produced: 'priced proposal', actor_responsible: null, deterministic_rule_available: true, probabilistic_reasoning_required: false, hitl_required: false, confidence_score: 0.8 },
      { step_name: 'Creative Director approval', sequence_order: 2, input_required: [], output_produced: 'approved proposal', actor_responsible: 'Creative Director', deterministic_rule_available: false, probabilistic_reasoning_required: false, hitl_required: true, confidence_score: 0.9 },
    ],
    rules: [{ rule_name: 'Rush Multiplier', condition: 'delivery < standard', action: 'multiply by 1.35', threshold: '1.35', applies_to_step_name: 'Price the proposal', deterministic_status: 'deterministic', requires_confirmation: false, confidence_score: 0.8 }],
    hitl: [{ workflow_stage: 'before_send', human_role: 'Creative Director', reason_for_review: 'approval', review_trigger: 'on_threshold_breach', confidence_threshold: null, approval_required: true, confidence_score: 0.9 }],
    ledger: [], provenance: [],
    build_recommendation: { primary_archetype: 'sharp_point_solution', secondary_archetype: 'none', recommended_build_path: 'thin', required_components: ['workflow', 'rules_wiki', 'registry', 'canonical_tables', 'ui', 'audit_layer'], optional_components: [], unnecessary_components: ['connectors', 'decision_layer', 'reporting_layer', 'library'], build_readiness: 'ready' },
  },
  simulation: {
    workflow_id: 'wf-test', version: 1,
    input_contract: [{ name: 'Inbound Brief', type: 'object', description: 'brief', required: true, enum_values: null }],
    sample_output: { output_name: 'Cold Front Proposal', output_type: 'document', output_format: 'pdf', required_sections: ['Scope', 'Line Items', 'Pricing', 'Terms'], rendered_sample: '## Scope\nIdentity + campaign\n## Line Items\nID-001 $9,500\n## Pricing\nTotal: $39,401.25\n## Terms\n50% deposit', computed_fields: { subtotal: '$34,200', total: '$39,401.25' } },
    sample_inputs: [{ input_name: 'Inbound Brief', input_type: 'both', format: 'plain_text', rendered: 'A brief from Northstar', example_value: { deadline: 'July 1' } }],
    grading_targets: ['totals reconcile'], step_trace: [],
  },
  approval: { workflow_id: 'wf-test', wds_version: 1, approved: true, approved_surfaces: { sample_output: true, sample_inputs: true }, approved_by: null, approved_at: '2026-05-29T00:00:00Z', build_readiness_at_approval: 'ready', assumptions_acknowledged: [] },
};

const bundle = assemble(input);
const built = bundle.objects.filter((o) => o.kind === 'built').map((o) => o.object_type).sort();
const refused = bundle.objects.filter((o) => o.kind === 'refused').map((o) => o.object_type).sort();
const zip = zipStore(bundle.files.map((f) => ({ path: f.path, content: f.content })));

const expectBuilt = ['audit_layer', 'canonical_tables', 'registry', 'rules_wiki', 'ui', 'workflow'];
const expectRefused = ['connectors', 'decision_layer', 'library', 'reporting_layer'];
const magic = zip.subarray(0, 2).toString('ascii');

console.log('BUILT   :', built.join(', '));
console.log('REFUSED :', refused.join(', '));
console.log('FILES   :', bundle.files.map((f) => f.path).join(', '));
console.log('VERIFY  :', bundle.verification.passed, '|', bundle.verification.checks.map((c) => `${c.name}=${c.ok}`).join(' '));
console.log('ZIP     :', zip.length, 'bytes, magic =', magic);
console.log('---');
const ok =
  JSON.stringify(built) === JSON.stringify(expectBuilt) &&
  JSON.stringify(refused) === JSON.stringify(expectRefused) &&
  bundle.verification.passed &&
  magic === 'PK' &&
  bundle.files.some((f) => f.path === 'REFUSED.md') &&
  bundle.files.some((f) => f.path === 'workflow.json') &&
  bundle.files.some((f) => f.path === 'manifest.json');
console.log(ok ? 'PASS ✓ sharp_point_solution oracle: 6 built / 4 refused, verify green, valid zip' : 'FAIL ✗');
process.exit(ok ? 0 : 1);
