// lib/gaps.ts
//
// The Missing Information framework (corpus doc 06). Deterministic gap detection
// over canonical rows, severity scoring, and a prioritize→surface policy: only
// blocking, high-value gaps become user questions; everything else is recorded
// as an explicit assumption. The user is never shown the full coverage map.

import type { CanonicalStore, MissingInformation } from './canonical-schema';
import { newFactId, makeProvenance } from './canonical';

type BuildReadiness = 'blocking' | 'ready' | 'ready_with_assumptions';

const isRuntime = (t: string) => t === 'required_workflow_input' || t === 'both';

function gap(
  partial: Partial<MissingInformation> & Pick<MissingInformation, 'missing_attribute' | 'why_it_matters' | 'severity' | 'blocking_status' | 'gap_kind'>,
): MissingInformation {
  return {
    gap_id: newFactId(),
    missing_attribute: partial.missing_attribute,
    why_it_matters: partial.why_it_matters,
    affected_output: partial.affected_output ?? null,
    affected_step: partial.affected_step ?? null,
    possible_sources: partial.possible_sources ?? [],
    suggested_question: partial.suggested_question ?? null,
    severity: partial.severity,
    blocking_status: partial.blocking_status,
    gap_kind: partial.gap_kind,
    confidence_score: partial.confidence_score ?? null,
    resolution_status: partial.resolution_status ?? 'open',
  };
}

/** Detect rules that share a normalized name but disagree on threshold. */
function detectRuleConflicts(store: CanonicalStore): MissingInformation[] {
  const byName = new Map<string, { threshold: string | null; name: string }[]>();
  for (const r of store.rules) {
    const key = (r.rule_name ?? '').toLowerCase().replace(/[^a-z]+/g, '');
    if (!key) continue;
    const arr = byName.get(key) ?? [];
    arr.push({ threshold: r.threshold ?? null, name: r.rule_name ?? key });
    byName.set(key, arr);
  }
  const out: MissingInformation[] = [];
  for (const [, arr] of byName) {
    const thresholds = new Set(arr.map((x) => x.threshold).filter((t): t is string => Boolean(t)));
    if (thresholds.size > 1) {
      out.push(gap({
        missing_attribute: `decision_rule "${arr[0].name}" threshold`,
        why_it_matters: `The evidence gives conflicting values for this rule (${[...thresholds].join(' vs ')}). The wrong one changes the output.`,
        severity: 'high',
        blocking_status: 'blocking',
        gap_kind: 'conflict',
        suggested_question: `"${arr[0].name}" appears with conflicting values (${[...thresholds].join(' vs ')}). Which is correct?`,
        confidence_score: 1,
      }));
    }
  }
  return out;
}

/** Build the full gap ledger. Preserves broken_link gaps already on the store. */
export function analyzeGaps(store: CanonicalStore): MissingInformation[] {
  const gaps: MissingInformation[] = [];
  gaps.push(...store.gaps.filter((g) => g.gap_kind === 'broken_link'));

  // ── absence (structural completeness) ──
  if (!store.identity.primary_objective) {
    gaps.push(gap({ missing_attribute: 'primary_objective', why_it_matters: 'Without a clear objective the sample output cannot be anchored.', severity: 'critical', blocking_status: 'blocking', gap_kind: 'absence' }));
  }
  if (store.outputs.length === 0) {
    gaps.push(gap({ missing_attribute: 'output', why_it_matters: 'No deliverable was identified — there is nothing for the workflow to produce.', severity: 'critical', blocking_status: 'blocking', gap_kind: 'absence' }));
  }
  if (store.inputs.filter((i) => isRuntime(i.input_type)).length === 0) {
    gaps.push(gap({ missing_attribute: 'runtime_input', why_it_matters: 'No per-run inputs were identified — the workflow has nothing to consume on each run.', severity: 'high', blocking_status: 'blocking', gap_kind: 'absence' }));
  }

  // ── low confidence (< 0.7 drives clarification per corpus 06) ──
  if ((store.identity.confidence_score ?? 1) < 0.7) {
    gaps.push(gap({ missing_attribute: 'primary_objective', why_it_matters: 'The workflow objective was inferred with low confidence.', severity: 'high', blocking_status: 'non_blocking', gap_kind: 'low_confidence', confidence_score: store.identity.confidence_score ?? null, suggested_question: `Is the goal "${store.identity.primary_objective ?? ''}" correct?` }));
  }
  for (const r of store.rules) {
    const c = r.confidence_score ?? 1;
    if (c < 0.6) {
      const blocking = c < 0.4;
      gaps.push(gap({ missing_attribute: `rule: ${r.rule_name}`, why_it_matters: 'A business rule that drives the output was inferred with low confidence.', severity: blocking ? 'high' : 'medium', blocking_status: blocking ? 'blocking' : 'non_blocking', gap_kind: 'low_confidence', confidence_score: c, suggested_question: `We inferred the rule "${r.rule_name}" (${r.condition ?? ''} → ${r.action ?? ''}). Is that right?` }));
    }
  }
  for (const i of store.inputs.filter((x) => isRuntime(x.input_type))) {
    if ((i.confidence_score ?? 1) < 0.6) {
      gaps.push(gap({ missing_attribute: `input: ${i.input_name}`, why_it_matters: 'A per-run input was inferred with low confidence.', severity: 'medium', blocking_status: 'non_blocking', gap_kind: 'low_confidence', confidence_score: i.confidence_score ?? null }));
    }
  }

  // ── conflicts ──
  gaps.push(...detectRuleConflicts(store));
  return gaps;
}

const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };

/**
 * Surface only blocking critical/high gaps as questions; mark everything else
 * as an explicit assumption. Mutates resolution_status + suggested_question.
 */
export function prioritize(gaps: MissingInformation[]): MissingInformation[] {
  const questions = gaps
    .filter((g) => g.blocking_status === 'blocking' && (g.severity === 'critical' || g.severity === 'high'))
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  const qset = new Set(questions);
  for (const g of gaps) {
    if (qset.has(g)) {
      g.resolution_status = 'asked';
      g.suggested_question = g.suggested_question ?? templateQuestion(g);
    } else if (g.resolution_status === 'open') {
      g.resolution_status = 'assumed';
    }
  }
  return questions;
}

function templateQuestion(g: MissingInformation): string {
  switch (g.gap_kind) {
    case 'absence':
      return `What is the ${g.missing_attribute}? We could not find it in your evidence.`;
    case 'broken_link':
      return g.why_it_matters ?? 'Please confirm this reference.';
    case 'conflict':
      return `${g.missing_attribute} has conflicting values — which is correct?`;
    default:
      return `Please confirm: ${g.missing_attribute}.`;
  }
}

export function summarizeReadiness(gaps: MissingInformation[]): BuildReadiness {
  const unresolvedBlocking = gaps.some(
    (g) =>
      g.blocking_status === 'blocking' &&
      (g.severity === 'critical' || g.severity === 'high') &&
      g.resolution_status !== 'answered' &&
      g.resolution_status !== 'assumed',
  );
  if (unresolvedBlocking) return 'blocking';
  return gaps.some((g) => g.resolution_status === 'assumed') ? 'ready_with_assumptions' : 'ready';
}

/** Apply user answers to gaps: mark answered + record provenance. */
export function applyAnswers(store: CanonicalStore, answers: { gap_id: string; answer: string }[]): void {
  const byId = new Map(store.gaps.map((g) => [g.gap_id, g]));
  for (const { gap_id, answer } of answers) {
    const g = byId.get(gap_id);
    if (!g) continue;
    g.resolution_status = 'answered';
    store.provenance.push(
      makeProvenance({
        targetTable: 'missing_information',
        targetField: g.missing_attribute ?? 'gap',
        sourceDocument: 'user clarification',
        extractedValue: answer,
        method: 'manual',
        confidence: 1,
      }),
    );
  }
}
