# 06 — Missing Information Framework

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** how the system finds what it does not know, decides what is worth asking, and turns a gap into a single high-value question.
> **Consumes:** the canonical facts and their `confidence_score`s produced by CAKE (Discovery Framework, the 12 categories; Canonical Schema, the 14 tables), and the archetype classification (Archetype Framework).
> **Feeds:** the clarify stage of Swarm 1 and, through resolved gaps, the Workflow Design Specification and the Simulation Pack.
> **Status:** Portable IP / handoff artifact. Implementation-agnostic. An engineer on any stack must be able to implement against this document without further questions.

---

## 1. Purpose and the one rule that governs everything

BoVerse never hands the user a consulting intake form. The whole point of Discovery is that the user describes an outcome, uploads what they have, and the **system** does the work of figuring out the workflow. A forty-question questionnaire would defeat that promise on the first screen.

So the central design rule of this document is:

> **The full intake interrogation (roughly 40–60 questions) is an *internal coverage framework*, not a user-facing form. The system answers as many of those questions as it can from the evidence. Only the items it genuinely cannot answer — or answers with low confidence — are ever surfaced to the user, and even then only the high-value or build-blocking ones.**

The user-facing experience is therefore not "fill this out." It is closer to a knowledgeable consultant who has already read everything and reports back:

> "Based on what you uploaded, I think this is an **estimate-generation** workflow. I found clear evidence for the **output** (a customer-facing PDF), the **inputs** (job scope plus your rate sheet), and the **trigger** (a salesperson starts it when a quote is requested). I'm missing two things I need before I can build it correctly: **who signs off on an estimate before it goes to the client**, and **where the current labour rates actually come from**. Can you tell me those?"

Everything below specifies how the system gets to that paragraph: how it detects gaps, how it scores them, how it decides which ones earn a question, how it phrases the question, and what it does when the evidence contradicts itself.

### 1.1 Where this sits in the pipeline

```
evidence ─▶ CAKE extraction ─▶ canonical store (14 tables) ─▶ GAP ANALYSIS (this doc)
                                                                    │
                                          ┌─────────────────────────┼───────────────────────────┐
                                          ▼                         ▼                           ▼
                                   answered internally     surfaced as a question        recorded as a
                                   (no user contact)        (clarify stage)               safe assumption
```

Gap analysis runs **after** extraction has populated the canonical store and **after** a provisional archetype has been assigned, because both the schema and the archetype tell the system what *should* be present. It runs **before** the Workflow Design Specification is finalized, because an unresolved blocking gap must not silently become a built assumption.

### 1.2 Determinism boundary (read this carefully)

Consistent with the rest of the corpus: **extraction is probabilistic; gap analysis is deterministic.**

- The probabilistic part already happened — CAKE read messy evidence and proposed canonical facts, each stamped with a `confidence_score`.
- Gap analysis is a **deterministic function** of (a) which canonical fields and required links are present versus absent, (b) their confidence scores against fixed thresholds, and (c) the archetype's required-coverage profile. The same canonical store plus the same thresholds always yields the same ledger of gaps and the same prioritized question set.

The system does **not** ask an LLM "what questions should I ask?" as a free-form judgement. It computes the gap set from coverage and confidence, then uses the LLM only to *phrase* each already-decided question in plain language (§6.4). Phrasing is cosmetic; *which* questions exist and *which* reach the user is rule-driven.

---

## 2. The internal coverage framework (the 40–60 questions)

The coverage framework is the union of two things the corpus already defines:

1. **The 12 Discovery Categories** (Discovery Framework) — the universal lens. Every workflow must have an answer for Outcome, Output, Inputs, Trigger, Actors, Human Review, Systems, Knowledge, Decisions, Exceptions, Audit, and Success.
2. **The fields of the 14 Canonical Tables** (Canonical Schema) — the concrete attributes that, taken together, *constitute* an answer to each category.

The "40–60 questions" are simply the **coverage checks** over those fields: each material field (or required cross-reference) in the canonical store is one thing the system needs to know. The number is approximate and workflow-dependent — a Workflow Component needs far fewer answered than an Integrated Workflow — because the **archetype scopes which checks are material** (§4).

The framework is *never rendered as a list to the user*. It exists only as the checklist gap analysis walks internally.

### 2.1 Coverage map — category → the canonical fields that satisfy it

For each of the 12 categories, the table below names the canonical fields whose presence-and-confidence the system checks. "Satisfied when" states the minimum bar for the category to count as covered for a typical workflow. (Field names and tables are defined verbatim in the Canonical Schema.)

| # | Discovery category | Primary canonical source(s) | Key fields checked | Satisfied when |
|---|---|---|---|---|
| 1 | Outcome | Workflow Identity (§9.1); Outcome (§9.2) | `primary_objective`, `inferred_problem`, `outcome_description`, `business_value` | A primary objective and at least one outcome with business value are present above threshold |
| 2 | Output | Output (§9.3) | `output_type`, `output_format`, `required_sections`, `output_destination`, `approval_required` | At least one output with a known type **and** format is present |
| 3 | Inputs | Input / Evidence (§9.4) | `input_type`, `source_system`, `format`, `required_or_optional`, `extraction_method` | Every step's `input_required` resolves to a known input flagged `required_workflow_input` or `both` |
| 4 | Trigger | Trigger (§9.7) | `trigger_type`, `event_condition`, `schedule`, `manual_or_automated`, `downstream_action` | At least one trigger with a known type and a resolvable first step |
| 5 | Actors | Actor / Role (§9.5) | `role_name`, `decision_authority`, `review_authority`, `approval_authority` | Every human-performed step and every HITL row names a role that exists here |
| 6 | Human Review | Human-in-the-Loop (§9.6) | `human_role`, `review_trigger`, `confidence_threshold`, `approval_required`, `escalation_path` | Either a HITL row exists, or it is positively established that none is required |
| 7 | Systems | Systems / Connector (§9.9) | `system_name`, `connection_type`, `read_required`/`write_required`, `fallback_method` | Every referenced system has a known connection type or a fallback |
| 8 | Knowledge | Knowledge Source (§9.10) | `source_type`, `rule_or_reference`, `required_for_steps`, `retrieval_required`, `canonicalization_required` | Every step that applies business logic has a knowledge source or rule backing it |
| 9 | Decisions | Rule / Decision (§9.11); Process / Step (§9.8) | `condition`, `action`, `applies_to_step`, `deterministic_status`, `requires_confirmation` | Every branch/decision step maps to a rule, a model step, or a HITL route |
| 10 | Exceptions | Process / Step (§9.8) `error_conditions`; Rule / Decision (§9.11) `exception_handling` | `error_conditions`, `exception_handling` | Each material step has a stated failure mode and handling, or is explicitly best-effort |
| 11 | Audit | Audit / Provenance (§9.14); HITL `audit_required` | `audit_required`, retention/explainability facts | Audit need is positively known (required + scope, or explicitly not required) |
| 12 | Success | Outcome (§9.2) `success_metric`; Output (§9.3) `quality_criteria` | `success_metric`, `quality_criteria`, golden examples in `source_examples` | At least one measurable success metric or one golden example exists |

Two cross-cutting checks apply on top of the per-category checks, because they are the schema's structural invariants (Canonical Schema, §2) and a broken link is itself a gap:

- **HITL → Actor.** Every `Human-in-the-Loop.human_role` must resolve to an `Actor.role_name`. A dangling reference is a gap on category 5/6.
- **Rule → Step.** Every `Rule.applies_to_step` must resolve to a `Step.step_id` (or be explicitly `null`/global). A dangling reference is a gap on category 9.

---

## 3. How gaps are detected

A **gap** is any material coverage check that is not satisfied. There are four detectable kinds, and the detector emits one Ambiguity-Ledger row (§5) per gap regardless of kind.

| Gap kind | Definition | How the detector recognizes it |
|---|---|---|
| **Absence** | A material field or required row is simply not present. | The field is null/empty, or the table has zero rows where the archetype requires at least one (e.g. an App with no Output row). |
| **Low confidence** | A field is present but its `confidence_score` is below the threshold for its severity tier (§4.2). | `confidence_score < threshold`. The value exists but is not trustworthy enough to build on. |
| **Broken link** | A required cross-reference does not resolve. | `human_role` not found in Actors; `applies_to_step` not found in Steps; a step's `input_required` id not found in Inputs. |
| **Conflict** | Two or more extracted facts about the same attribute disagree. | Multiple provenance rows (§9.14) produce incompatible canonical values for one field (handled in §7). |

### 3.1 Detection algorithm (deterministic)

```
for each material coverage check C scoped by the archetype (§4):
    locate the canonical field(s)/row(s) F that satisfy C
    if F is absent or empty                      -> emit gap(kind = absence)
    else if confidence(F) < threshold(severity(C)) -> emit gap(kind = low_confidence)
    else                                           -> C is satisfied
for each required cross-reference R in the store:
    if R does not resolve                         -> emit gap(kind = broken_link)
for each attribute A with >1 provenance value:
    if values are incompatible                     -> emit gap(kind = conflict)   # see §7
```

Two facts make this honest:

- **CAKE already records what it did not find.** The Discovery Framework lists *missing information* as a native CAKE concern, and `Workflow Identity.unresolved_questions` plus `evidence_sources` are populated during extraction. Those become seed `absence` gaps; gap analysis then adds the archetype-scoped and confidence-based gaps on top.
- **Nothing is silently dropped.** Per the Canonical Schema, facts that do not fit the schema land in the Ambiguity Ledger rather than disappearing. Gap analysis is the process that reads that ledger and decides what to do with each row.

---

## 4. How the archetype scopes and weights the checks

The same absent field can be a build-blocker for one archetype and irrelevant for another. The archetype (from the Archetype Framework, recorded in `Workflow Archetype` §9.13) therefore does two jobs: it **scopes** which checks are material, and it **weights** their default severity.

### 4.1 Scoping — which categories are mandatory per archetype

A check is *material* only if the archetype needs it. The `unnecessary_components` list on the archetype row (§9.13) directly suppresses the corresponding gaps: if the archetype says a front end is unnecessary, the absence of UI-related facts is **not** a gap.

| Archetype | Categories that are **mandatory** (a gap here is real) | Categories typically **non-material** (absence is not a gap by default) |
|---|---|---|
| **Workflow Component** | Output, Inputs, Knowledge/Decisions (the logic), Audit (provenance on result) | Actors, Human Review, Trigger, Systems |
| **Mini-App** | Output, Inputs, Actors (the one user), Human Review (light) | Systems (cross-system), Success-over-time |
| **Sharp Point Solution** | Outcome, **Output**, **Inputs**, Knowledge, Success | Multi-actor Human Review, cross-system Systems |
| **Bridge** | **Systems** (the tools), Trigger, Decisions (routing), Exceptions, Audit | A single Output artifact; Knowledge-heavy business rules |
| **App** | Outcome, Output, Inputs, Actors, Trigger, Success | Cross-system orchestration, canonical store |
| **Decision-Support App** | **Inputs** (structured + unstructured), **Decisions**, Knowledge, Output (the recommendation), Success | Cross-system orchestration |
| **Integrated Workflow** | **All 12** — multiple inputs, actors, outputs, decisions, plus Exceptions and Audit | (None are non-material; this archetype demands full coverage) |
| **Intelligence Layer** | **Inputs** (many sources), Knowledge/canonicalization, Audit/provenance, Success (query quality) | A single fixed Output; Trigger as a one-shot |
| **Operating Layer / OSO** | **All 12**, plus shared-memory and cross-system Systems coverage | (None are non-material) |

> This scoping is exactly the structural bias against over-building from the Archetype Framework, applied to questions: a Sharp Point Solution must **not** generate a question about multi-department approval routing, because that category is non-material for it. Asking it would make the user feel they are filling out a generic form — the precise failure this framework exists to prevent.

### 4.2 Weighting — severity and the confidence thresholds

Each material check carries a default **severity** derived from how badly the build breaks without it. Severity sets the confidence threshold a present value must clear (a critical field needs higher confidence to be trusted than a cosmetic one) and feeds prioritization (§6).

The confidence ladder is the shared corpus rubric (Canonical Schema, §2): `0.90–1.00` directly stated, `0.70–0.89` strongly implied, `0.50–0.69` plausible inference, `< 0.50` guess.

| `severity` | Meaning | Confidence threshold to count as *covered* | Default `blocking_status` |
|---|---|---|---|
| `critical` | The workflow cannot be built or would be built wrong (e.g. unknown Output type; unknown core Decision). | `≥ 0.85` | `blocking` |
| `high` | A major part is unsafe to assume (e.g. who approves; where a rate table comes from). | `≥ 0.70` | `blocking` |
| `medium` | Build can proceed on a stated assumption, but accuracy/robustness suffers (e.g. an exception path). | `≥ 0.60` | `non_blocking` |
| `low` | Nice to confirm; a sensible default is safe (e.g. output filename convention). | `≥ 0.50` | `non_blocking` |
| `unknown` | Severity itself cannot yet be assessed. | n/a | `deferred` |

A field that is **present but below its tier threshold** becomes a `low_confidence` gap at that same severity. So a `critical` field at confidence `0.72` is a blocking gap even though a value exists — because the system is not sure enough to build on it.

---

## 5. The Ambiguity Ledger: a gap becomes a row

Every detected gap is written as one row in the **Missing Information / Ambiguity Ledger** — table **§9.12** of the Canonical Schema. That table is the canonical home of this entire framework; this document specifies how its rows are produced, scored, and turned into questions. The fields, restated from the schema for convenience:

| Field | Type | Role in this framework |
|---|---|---|
| `gap_id` | `UUID` | Primary key for the gap. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `missing_attribute` | `string` | The specific attribute/fact that is missing, low-confidence, dangling, or conflicting. Maps to a canonical field + category. |
| `why_it_matters` | `text` | The build consequence of leaving it unresolved — drives the "I'm missing X because…" narration. |
| `affected_output` | `UUID` | `output_id` (§9.3) jeopardized, if any. |
| `affected_step` | `UUID` | `step_id` (§9.8) jeopardized, if any. |
| `possible_sources` | `string[]` | Where the answer likely lives (a person/role, a system, a document) — used to make the question concrete. |
| `suggested_question` | `text` | **The single, high-value, plain-language question** to ask. Produced per §6.4. |
| `severity` | `enum(critical, high, medium, low, unknown)` | From §4.2. |
| `blocking_status` | `enum(blocking, non_blocking, deferred, unknown)` | From §4.2; whether the build can proceed without resolution. |
| `confidence_score` | `float[0..1]` | Confidence that this is a *genuine* gap, not an artifact of low extraction confidence (§5.1). |
| `resolution_status` | `enum(open, asked, answered, assumed, wont_fix, unknown)` | Lifecycle state (§5.2). |

### 5.1 The gap's own confidence

Note the subtlety baked into `confidence_score` on a ledger row: it is **confidence that the gap is real**, not the extraction confidence of the missing fact. This guards against a feedback trap. If CAKE extracted a value at `0.55`, that is a candidate `low_confidence` gap — but if the same value appears consistently across three independent documents, the *gap* is probably not real (the value is fine; the model was just hedging). The detector lowers the gap's `confidence_score` accordingly, which deprioritizes it (§6) so the user is not asked to confirm something the evidence actually supports well.

### 5.2 Lifecycle of a gap

```
open ──(selected to ask, §6)──▶ asked ──(user answers)──▶ answered ──▶ canonical store updated, re-run detection
  │                                  │
  │                                  └─(user can't/won't answer)──▶ assumed  (a safe default is recorded; see §6.3)
  │
  └─(deprioritized or non-material)──▶ wont_fix / deferred
```

When a gap is `answered`, the new fact is written back to the appropriate canonical table **with full provenance** (`source_document = "user clarification"`, a fresh `fact_id` in §9.14), and detection re-runs — because one answer can close several gaps or, occasionally, open a new one. When a gap is `assumed`, the assumption and its default are recorded so the Workflow Design Specification can surface it as a stated assumption rather than an invisible guess.

---

## 6. Prioritization: which gaps actually reach the user

This is the heart of the "no consulting form" promise. The ledger may contain dozens of rows; only a few become questions. The pipeline is **detect → filter → rank → batch → narrate**.

### 6.1 Filter — drop everything not worth a human's time

A gap is **eligible** to become a question only if **all** of these hold:

1. It is **material** for the assigned archetype (§4.1). Non-material gaps are recorded as `wont_fix`/`deferred` and never shown.
2. Its `blocking_status` is `blocking`, **or** its `severity` is `high` or above. Non-blocking, medium/low gaps are *resolved by assumption*, not by asking (§6.3).
3. Its own `confidence_score` (that it is a real gap, §5.1) is at or above a floor (default `0.50`). Likely-spurious gaps are suppressed.
4. It is **not answerable from evidence already on hand** — i.e. it survived extraction. (If `possible_sources` points only to a document the user already uploaded, the system re-reads that document before asking.)

### 6.2 Rank — order the survivors

Eligible gaps are sorted deterministically by, in order:

1. `blocking_status` (`blocking` before `non_blocking`),
2. `severity` (`critical` → `high` → `medium` → `low`),
3. **fan-out** — how many other gaps an answer would likely close (a question about "where labour rates come from" that resolves Inputs, Knowledge, and a Systems connector ranks above a single-field question),
4. gap `confidence_score` (more certainly-real first).

### 6.3 The assumption path — the alternative to asking

For every eligible-but-not-surfaced gap (non-blocking, medium/low), and for any blocking gap the user declines to answer, the system **records a safe default** rather than nagging:

- The default comes from the rules/wiki layer where one exists (e.g. "if no approval threshold is stated, default to *all outputs require review*" — the safe direction), or from a conservative convention (e.g. default output format = `pdf` when an output is clearly a client-facing document).
- The assumption is written to the canonical store **and** retained on the ledger row (`resolution_status = assumed`) so it appears in the Workflow Design Specification's assumptions list and can be revisited.

This is what lets the system proceed without a long interview: most gaps are closed by assumption; only the genuinely consequential, genuinely unknown ones are spoken aloud.

### 6.4 Question generation — gap → one plain-language question

Each surfaced gap yields exactly one `suggested_question`. The generation is templated and deterministic in structure; the LLM only smooths the wording. The template assembles four parts from canonical fields:

```
[what we believe] + [the specific unknown] + [why it matters, plainly] + [the concrete options, if enumerable]
```

- **what we believe** — grounds the question in the evidence so it never feels like a blank form ("Your sample quote is a PDF, so…").
- **the specific unknown** — the `missing_attribute`, phrased as a direct question.
- **why it matters** — a plain rendering of `why_it_matters`, kept short.
- **concrete options** — when the canonical field is an `enum`, the question offers those values as choices, which is faster for the user and keeps the answer machine-parseable. `possible_sources` is used to name the likely place the answer lives.

**Question budget.** The clarify stage shows a small, bounded batch (default **3–7** questions at a time, never the whole ledger). If more than the budget are eligible, only the top-ranked are shown; the rest stay `open` and may surface in a later round after the first answers re-run detection (§5.2). The user always sees "here's what I found / here's the few things I'm missing," never a wall of fields.

### 6.5 The narration the user actually sees

Before any questions, the clarify stage renders a short summary built directly from the store: the assigned archetype and its confidence, the categories that are **covered** (with the evidence), and the categories that are **missing** (the surfaced gaps). This is the consultant paragraph from §1. The questions follow as a short, prioritized list — each one already explained by its `why_it_matters`.

---

## 7. The conflicting-evidence case

Conflict is the one gap kind that is not about absence. It occurs when two or more provenance rows (§9.14) yield **incompatible canonical values for the same attribute** — e.g. one SOP says estimates over $5,000 need approval while a manager's note says the threshold is $10,000, or one spreadsheet lists a labour rate of $85/hr and a newer export says $95/hr.

### 7.1 Detecting a conflict

A conflict is detected when, for a single canonical field, the provenance set contains values that cannot both be true under the field's type:

- For `enum`/scalar fields: two distinct non-`unknown` values.
- For numeric thresholds: values outside a tolerance of each other.
- For boolean facts (e.g. `approval_required`): `true` from one source, `false` from another.

The detector does **not** pick a winner by itself. It writes a `conflict` gap whose `missing_attribute` names the field and whose `why_it_matters` states the divergence, and it preserves **both** provenance rows (no source value is overwritten or discarded).

### 7.2 Resolving a conflict

Resolution follows a deterministic ladder; the first rule that applies wins:

1. **Authority/recency from the rules layer.** If a rule states a precedence (e.g. "the rate export supersedes the spreadsheet," or "the most recent `timestamp` wins"), apply it; record the resolution with provenance pointing at the winning source and the rule.
2. **Confidence gap.** If one value's extraction confidence is materially higher (default lead `≥ 0.20`) and no authority rule contradicts it, prefer the higher-confidence value and lower (not zero) the gap's blocking weight.
3. **Otherwise, ask.** If neither rule resolves it, the conflict is surfaced as a question — and conflicts are inherently high-value, so they are treated as at least `high` severity. The generated question presents **both** values and their sources for the user to choose:

> "Two of your documents disagree on the approval threshold: your SOP says estimates over **$5,000** need sign-off, but a later note says **$10,000**. Which should the workflow use?"

Until resolved, a conflicting fact that feeds a `critical` step keeps that step's gap `blocking`: the system will not build on a value it knows is contested.

---

## 8. Worked examples: gaps and the questions they generate

Each example shows the archetype, a detected gap, the ledger row's key scores, and the resulting `suggested_question`. The four requested example questions appear across these cases.

### 8.1 Sharp Point Solution — estimate generator

Evidence: a folder of past jobs, one sample estimate PDF, a labour-rate spreadsheet. Output and Inputs are well-covered; the approval point and the rate provenance are not.

| Detected gap | Category / field | severity | blocking | Generated `suggested_question` |
|---|---|---|---|---|
| No HITL row, but the sample PDF is client-facing | 6 Human Review / `Human-in-the-Loop.approval_required` | high | blocking | "Before an estimate goes to the client, does someone need to approve it — and if so, who?" |
| Rate spreadsheet exists but its `source_system`/`update_frequency` is unknown | 3 Inputs / `Input.source_system`, `Knowledge.update_frequency` | high | blocking | "Where do the current labour rates come from — a system like QuickBooks, or this spreadsheet you maintain by hand? How often do they change?" |
| Output format inferred from one sample at `0.66` | 2 Output / `Output.output_format` | low | non_blocking | *(not asked — resolved by assumption: `output_format = pdf`, recorded on the ledger)* |

The first two are surfaced; the third is silently assumed. The user sees two questions, not a form.

### 8.2 Decision-Support App — supplier risk scoring

Evidence: a supplier questionnaire template and a spreadsheet of past scores. The recommendation output is clear; the deciding logic is thin.

| Detected gap | Category / field | severity | blocking | Generated `suggested_question` |
|---|---|---|---|---|
| Scoring exists but no rule maps inputs → tier | 9 Decisions / `Rule.condition`, `Rule.action` | critical | blocking | "When you score a supplier, what actually pushes them into 'high risk' — is there a cutoff or a set of rules you follow, or is it judgement we should route to a person?" |
| Final artifact format unstated | 2 Output / `Output.output_format` | medium | non_blocking | "Should the result come out as a **spreadsheet**, a **PDF report**, an **email**, or a **dashboard**?" |

The output-format question is the requested enum-style question, offering the canonical `output_format` values as choices.

### 8.3 Bridge — keep delivery moving across tools

Evidence: mentions of Asana and email; the pain is "things stall between hand-offs." Output is deliberately non-material (a Bridge's value is flow). The decisive unknown is read/write direction on a named system.

| Detected gap | Category / field | severity | blocking | Generated `suggested_question` |
|---|---|---|---|---|
| Asana named, but `read_required`/`write_required` unknown | 7 Systems / `Connector.read_required`, `Connector.write_required` | critical | blocking | "Does this need to **write back into Asana** (create/update tasks), or only **read** status from it?" |
| Trigger cadence unstated | 4 Trigger / `Trigger.trigger_type`, `Trigger.schedule` | high | blocking | "Should this run continuously as things change in Asana, or on a schedule (say, a morning sweep)?" |

The first is the requested read-vs-write question — decisive for a Bridge because it determines whether a write connector must be provisioned.

### 8.4 Integrated Workflow — conflict surfaced

Evidence: a detailed SOP plus a manager's note that contradicts it on an approval threshold. All categories are material (Integrated Workflow demands full coverage), and §7 fires.

| Detected gap | Category / field | severity | blocking | Generated `suggested_question` |
|---|---|---|---|---|
| Conflicting approval thresholds across two sources | 6 Human Review / `Human-in-the-Loop` + `Rule.threshold` | high | blocking | "Two of your documents disagree on the approval threshold: the SOP says over **$5,000** needs sign-off, a later note says **$10,000**. Which should the workflow use?" |

---

## 9. Implementation checklist

An engineer implementing this framework on any stack must provide:

1. **A coverage map** from each of the 12 categories to the canonical fields/links that satisfy it (§2.1), including the two structural-link checks (HITL→Actor, Rule→Step).
2. **An archetype scoping table** that marks each category material/non-material per archetype and reads `unnecessary_components` (§9.13) to suppress gaps (§4.1).
3. **A severity model** with the fixed confidence thresholds (§4.2) and the default `blocking_status` per tier.
4. **A deterministic detector** emitting `absence`, `low_confidence`, `broken_link`, and `conflict` gaps as Ambiguity-Ledger rows (§3.1, §5).
5. **A gap-confidence estimate** (confidence the gap is *real*, §5.1) that down-weights gaps the evidence actually corroborates.
6. **A prioritization pipeline** — filter, rank by (blocking, severity, fan-out, gap-confidence), and a question budget of 3–7 per round (§6).
7. **An assumption path** that records safe defaults for non-surfaced and declined gaps, with provenance, so they appear as stated assumptions downstream (§6.3).
8. **A question generator** that assembles one plain-language question per surfaced gap from the four-part template, using enums as offered choices and `possible_sources` for concreteness (§6.4).
9. **A conflict resolver** implementing the authority → confidence → ask ladder, preserving all provenance (§7).
10. **Write-back with re-run** — answered gaps update the canonical store with fresh `fact_id` provenance and re-trigger detection (§5.2).

> The contract with the user, restated: the system reports what it understood and asks only for the few consequential things it genuinely could not determine. The 40–60-question framework lives entirely inside the machine; the human sees a short, evidence-grounded conversation.

---

## 10. Cross-references

| Document | Relationship |
|---|---|
| Discovery Framework — 12 Discovery Categories | Defines the universal lens; the coverage framework (§2) is built over these 12 categories. CAKE's native *missing information* concern seeds the `absence` gaps. |
| Archetype Framework — 9 archetypes | Provides the classification that **scopes and weights** which checks are material (§4); its anti-over-build bias is why non-material categories never generate questions. Its disambiguation questions become high-value clarifications when a deciding fact is missing. |
| Canonical Schema — 14 tables | Defines every field the coverage checks read, the shared confidence rubric (§4.2), and the structural invariants whose breakage is a gap. **Table §9.12 (Missing Information / Ambiguity Ledger)** is the canonical home of every row this framework produces. |
| Workflow Design Specification | Consumes resolved gaps; surfaces `assumed` gaps as stated assumptions; will not finalize over an open `blocking` gap. |
| Simulation Pack | Generated only after blocking gaps are resolved or assumed, so test cases run against a complete-enough specification. |

---

## CANON: Gap severity and routing

| `severity` | Confidence threshold to count as covered | Default `blocking_status` | Default routing |
|---|---|---|---|
| `critical` | `≥ 0.85` | `blocking` | Always surfaced as a question (or conflict) |
| `high` | `≥ 0.70` | `blocking` | Surfaced as a question |
| `medium` | `≥ 0.60` | `non_blocking` | Resolved by safe assumption; not asked |
| `low` | `≥ 0.50` | `non_blocking` | Resolved by safe assumption; not asked |
| `unknown` | n/a | `deferred` | Held until severity can be assessed |

> Gap kinds: `absence`, `low_confidence`, `broken_link`, `conflict`. Lifecycle (`resolution_status`): `open → asked → answered`, or `open → assumed`, or `open → wont_fix`/`deferred`. Question budget per clarify round: **3–7**. All rows live in the Missing Information / Ambiguity Ledger (Canonical Schema §9.12).
