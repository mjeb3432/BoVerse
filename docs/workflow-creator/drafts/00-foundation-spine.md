# 00 — Foundation Spine (Draft)

> **Series:** BoVerse Workflow Creator framework corpus — drafts
> **This document:** the shared spine all four first-draft documents conform to, so they do not drift.
> **Status:** FIRST DRAFT — to be optimized. The audited corpus (docs `00`–`11`) governs; where this draft and the corpus disagree, the corpus wins and this draft is corrected.
> **Cross-references:** the operating model is in `see Doc 00 — Index`; the categories in `see Doc 01 — Discovery Framework`; the archetypes in `see Doc 02 — Archetype Framework`; extraction targets in `see Doc 03 — Attribute Registry`; canonical tables in `see Doc 04 — Canonical Schema`; the build objects in `see Doc 10 — Object Creation Framework`.

---

## 0. What this spine is for

BoVerse is a **workflow factory**: the business user describes an **outcome** and uploads whatever **evidence** they have, and the system **infers the architecture and builds it**. The user never designs the workflow. Two cooperating swarms do the work — **Swarm 1 (Discovery)** turns messy evidence into a deterministic specification, **Swarm 2 (Build)** compiles only the objects that specification requires:

```
evidence ──▶ Discovery (Swarm 1) ──▶ architecture ──▶ build path ──▶ required objects ──▶ Build (Swarm 2)
```

This spine fixes the vocabulary, the contract, the field set, and the projection rules that the four downstream first-draft documents share. Anything a drafter needs to name — a category, a primitive, an archetype token, a canonical field, a projection step — is defined here exactly once, so all four drafts agree. The single governing UX principle from the corpus is restated up front and is binding on every draft: **do not expose the plumbing** (`see Doc 00 — Index §5`).

Running example throughout: **Flint & Tinder**, a Calgary creative agency, scoping an inbound brief from Northstar Brewing into a priced proposal (the `BoVerse-Demo-2` bundle). It classifies as a **Sharp Point Solution** (one output, one user group, limited inputs) and is used to make the projection contract concrete.

---

## 1. The Business-User Contract (the single most important constraint)

The business user interacts with **exactly two surfaces, and nothing else**:

| Surface | What it is | What the user sees |
|---|---|---|
| **INPUTS** | The evidence/data the workflow will consume on each run — presented as recognizable example values, not as a schema. | A short list of named inputs with realistic example values (the **Simulation Pack**, §5). |
| **OUTPUTS** | A **sample of what the workflow will produce** — a draft of the real deliverable, rendered the way they will actually receive it. | One rendered sample output (e.g. a draft proposal), in the format they recognize. |

The user may take **only two kinds of action**, in plain business language:

1. **Comment** on an input or an output ("the rush fee looks too low", "this proposal is missing payment terms").
2. **Change an input value** ("the deadline is July 1, not July 25", "make it the full-system identity, not single-product").

The user **NEVER sees or touches** any of the internal machinery: the 12 discovery categories, the Attribute Registry, the canonical tables/fields, the BoVerse object catalog, the 9 archetypes, the rules/wiki layer, confidence scores, provenance, or gap severities. All of that is inferred and operated by the swarms and is hidden by design (`see Doc 00 — Index §5`). Exposing it would re-impose the design burden the system exists to remove.

### 1.1 The loop: agree → modify → re-render → approve

```
        ┌──────────────────────────────────────────────────────┐
        ▼                                                      │
  see INPUTS + OUTPUTS  ──▶  comment / change an input  ──▶  system re-renders BOTH surfaces
        │                                                      ▲
        │  looks right                                         │
        ▼                                                      │
     APPROVE  ─────────────────────────────────────────────────┘ (until approved)
        │
        ▼
   GATE: approval releases the Build swarm (Swarm 2)
```

- **Agree** — the user reads the two surfaces in business terms.
- **Modify** — the user comments or changes an input value (the only two affordances).
- **Re-render** — the system maps the edit back to a canonical change internally (§5.3) and **re-renders both the sample output and the sample inputs** so they stay mutually consistent.
- **Approve** — when the surfaces look right, the user approves.

> **Approval is the gate between the two swarms** (`see Doc 00 — Index §4, step 11`). Nothing is built until the user approves the two surfaces. Discovery may also surface a *small* number of high-value clarifying questions before this loop (only blocking, high-severity gaps — `see Doc 06`), but those are the sole additional thing a user ever answers; they are never an intake form and never expose the categories.

---

## 2. The 12 Discovery Categories

The universal lens. Every workflow is analyzed through the **same 12 categories**; only the answers change (`see Doc 01 — Discovery Framework §5`). The numbering is canonical and load-bearing — **do not renumber or rename**. Three are **user-facing** (they surface as the two contract surfaces of §1); the other nine are **internal** machinery the user never sees.

| # | Category | One-line business-framed definition | Surface |
|---|---|---|---|
| 1 | Outcome | What the business is ultimately trying to accomplish by running this. | **USER-FACING** (frames the ask) |
| 2 | Output | The artifact, decision, action, or state one run produces. | **USER-FACING** (the OUTPUTS surface) |
| 3 | Inputs | What information must be present for a run to produce its output. | **USER-FACING** (the INPUTS surface) |
| 4 | Trigger | What causes a run to begin. | INTERNAL |
| 5 | Actors | Who or what participates, and in what role. | INTERNAL |
| 6 | Human Review | Where human judgment is required before the workflow proceeds. | INTERNAL |
| 7 | Systems | Existing tools/systems the workflow touches. | INTERNAL |
| 8 | Knowledge | Rules, policies, formulas, references, or expertise it depends on. | INTERNAL |
| 9 | Decisions | Choices it makes automatically or routes to a human. | INTERNAL |
| 10 | Exceptions | What can go wrong during a run and how it is handled. | INTERNAL |
| 11 | Audit | What about each run must be explainable, traceable, or retained. | INTERNAL |
| 12 | Success | How we know it is working — per run and over time. | INTERNAL |

> **Note on "user-facing".** Categories 1–3 are the *only* ones whose content the user perceives, and even then they perceive them as the Outcome they typed plus the two rendered surfaces — never as named categories. Outcome (1) is what the user states up front; Output (2) renders into the sample output; Inputs (3) render into the sample inputs. The other nine are extracted, classified, and built upon entirely behind the scenes.

---

## 3. The BoVerse Vocabulary (exact tokens — do not rename)

These tokens are canonical across all four drafts. Use the snake_case token in any persisted/spec context; prose may use the display name.

### 3.1 The 5 primitives

Every workflow step reduces to one of five atomic primitives (`see README — Brand`).

| Primitive | What it does |
|---|---|
| `ingest` | Bring evidence/data in. |
| `transform` | Reshape, compute, or enrich it. |
| `validate` | Check it against rules/constraints. |
| `action` | Produce an output or write to a system. |
| `feedback` | Capture human review / learning back into the system. |

### 3.2 The 9 archetypes (token ↔ display name)

The coarse classification that determines the build path. Exactly one `primary_archetype` and zero or one `secondary_archetype` per workflow (`see Doc 02 — Archetype Framework §2`). Listed in the canonical **tie-break order** (lowest build cost first; prefer the lower-cost archetype unless a higher-cost signal fires at `observed`/`implied`).

| Order | Token (snake_case) | Display name | One-line shape |
|---|---|---|---|
| 1 | `workflow_component` | Workflow Component | One reusable backend capability, often no front end. |
| 2 | `mini_app` | Mini-App | One narrow job inside a larger workflow; thin UI. |
| 3 | `sharp_point_solution` | Sharp Point Solution | One painful job solved end-to-end; one output, one user group. |
| 4 | `bridge` | Bridge | Keeps work moving across existing tools; flow, not artifact. |
| 5 | `app` | App | Full user-facing app; persistent data, repeatable use. |
| 6 | `decision_support_app` | Decision-Support App | Produces recommendations/scenarios/priorities, with reasoning. |
| 7 | `integrated_workflow` | Integrated Workflow | Multi-step, multi-actor, multi-output staged process. |
| 8 | `intelligence_layer` | Intelligence Layer | Canonicalizes many sources into one persistent store for many consumers. |
| 9 | `operating_layer_oso` | Operating Layer / OSO | Org-wide layer: many workflows + shared memory + cross-system visibility. |

> Flint & Tinder = `sharp_point_solution` (decisive signature: one main output + one user group + limited inputs). No secondary fires.

### 3.3 The BoVerse object catalog

What Swarm 2 can build. **Every object is conditional** — built only when a spec condition switches it on; never by default (`see Doc 10 — Object Creation Framework §1.1`).

| Object | One-line purpose |
|---|---|
| Library | Retrievable reference knowledge (RAG) the workflow consults at runtime. |
| Registry | The app-specific set of attributes the built workflow extracts toward each run. |
| Canonical Tables | The workflow's own persistent, typed fact store across runs. |
| Rules/Wiki | Executable decision logic + reference policy that makes the output *correct*. |
| Workflow | The runnable process itself (steps, routing, exceptions, HITL gates, thresholds). **Always built.** |
| Connectors | The integration surface to external systems (MCP / API / batch / write-back). |
| UI | The human surfaces (intake, upload, review, editable report, status, approval, preview). |
| Audit Layer | Per-run logs, fact provenance, review/approval trail, output versioning. |
| Reporting Layer | Aggregate views/metrics across many runs. |
| Decision Layer | Scoring, ranking, recommendations, scenarios, sensitivity. |

---

## 4. The Distilled Canonical Field Set

A focused subset of the 14 canonical tables (`see Doc 04 — Canonical Schema`) — only the entities/fields needed to (a) capture the workflow and (b) render a sample output + sample inputs. snake_case; types use the shared tokens (`UUID`, `string`, `text`, `float[0..1]`, `int`, `bool`, `enum(...)`, `string[]`, `UUID[]`, `timestamp`). Enums are abbreviated with `…` where the corpus list is long — the full enumerations live in Doc 04. **Structural invariants** (binding on all drafts): every table foreign-keys to `workflow_id`; every extracted value carries a `confidence_score` (`float[0..1]`) and is traceable to a `fact_id` in provenance; `hitl.human_role` resolves to an `actor.role_name`; `rule.applies_to_step` resolves to a `step_id` (or `null`).

### 4.1 `workflow_identity` (root) — Doc 04 §9.1

| Field | Type | Enum / notes |
|---|---|---|
| `workflow_id` | `UUID` | Primary key; FK on every other table. |
| `workflow_name` | `string` | e.g. "Inbound Brief → Proposal". |
| `client_name` | `string` | e.g. "Flint & Tinder". |
| `stated_problem` | `text` | The problem as the client phrased it. |
| `inferred_problem` | `text` | The problem as Discovery reads it. |
| `primary_objective` | `text` | The single most important thing the workflow must achieve. |
| `workflow_type` | `enum` | `document_generation, data_transformation, decision_support, classification_routing, monitoring_alerting, extraction_enrichment, multi_step_orchestration, approval_review, other, unknown`. Functional precursor to archetype — distinct from `primary_archetype`. |
| `confidence_score` | `float[0..1]` | Confidence in this record. |

### 4.2 `outcome` — Doc 04 §9.2

| Field | Type | Enum / notes |
|---|---|---|
| `outcome_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `outcome_description` | `text` | The outcome the workflow delivers (north star). |
| `business_value` | `text` | Why it matters, concretely (also holds pain removed). |
| `success_metric` | `string` | The measurable definition of success. |
| `time_savings` | `string` | e.g. "2 days → 20 min per proposal". |
| `confidence_score` | `float[0..1]` | |

### 4.3 `output` — Doc 04 §9.3

| Field | Type | Enum / notes |
|---|---|---|
| `output_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `output_name` | `string` | e.g. "Northstar Cold Front Proposal". |
| `output_type` | `enum` | `document, report, dataset, record_update, message, decision, alert, dashboard, api_response, other, unknown`. |
| `output_format` | `enum` | `pdf, docx, xlsx, csv, json, html, email, plain_text, slack_message, db_write, other, unknown`. |
| `required_sections` | `string[]` | Sections the output must contain (e.g. "Scope", "Line Items", "Pricing", "Terms"). |
| `required_fields` | `string[]` | Fields the output must populate (e.g. "total", "deposit", "valid_until"). |
| `editable_by_user` | `bool` | Whether a human may edit before finalizing. |
| `approval_required` | `bool` | Whether sign-off is required before release (links to a HITL row). |
| `source_examples` | `string[]` | Identifiers of sample/golden outputs used as evidence. |
| `quality_criteria` | `string[]` | How a correct output is judged. |
| `confidence_score` | `float[0..1]` | |

### 4.4 `input` (Input / Evidence) — Doc 04 §9.4

| Field | Type | Enum / notes |
|---|---|---|
| `input_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `input_name` | `string` | e.g. "Inbound Brief", "Rate Card". |
| `input_type` | `enum` | `discovery_evidence, required_workflow_input, both, unknown`. **Disambiguator** — only `required_workflow_input`/`both` rows are in the runtime contract and get Connectors / Simulation instances. |
| `source_system` | `string` | e.g. "email", "uploaded file". |
| `format` | `enum` | `pdf, docx, xlsx, csv, json, image, email, plain_text, api_payload, voice_transcript, other, unknown`. |
| `structured_or_unstructured` | `enum` | `structured, semi_structured, unstructured, unknown`. |
| `required_or_optional` | `enum` | `required, optional, conditional, unknown`. |
| `confidence_score` | `float[0..1]` | |

### 4.5 `actor` (Actor / Role) — Doc 04 §9.5

| Field | Type | Enum / notes |
|---|---|---|
| `actor_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `role_name` | `string` | Canonical role; referenced by `hitl.human_role` and `process_step.actor_responsible`. |
| `person_or_team` | `enum` | `individual, team, role_function, external_party, unknown` (also encodes human vs system). |
| `responsibility` | `text` | What this actor does in the workflow. |
| `approval_authority` | `enum` | `none, approve_low, approve_high, approve_unbounded, unknown`. |
| `interaction_type` | `enum` | `performs_work, reviews, approves, is_informed, consulted, unknown`. |
| `confidence_score` | `float[0..1]` | |

### 4.6 `system_connector` (Systems / Connector) — Doc 04 §9.9

| Field | Type | Enum / notes |
|---|---|---|
| `connector_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `system_name` | `string` | e.g. "Notion", "QuickBooks". |
| `connection_type` | `enum` | `api, mcp, batch_export, file_drop, manual_entry, webhook, none, unknown`. |
| `read_required` | `bool` | Whether the workflow reads from it. |
| `write_required` | `bool` | Whether the workflow writes to it (system-of-record side effect). |
| `authentication_required` | `enum` | `none, api_key, oauth, basic, sso, certificate, unknown`. |
| `data_objects_accessed` | `string[]` | Named entities read/written (e.g. "ProposalPage"). |
| `confidence_score` | `float[0..1]` | |

### 4.7 `decision_rule` (Rule / Decision) — Doc 04 §9.11

| Field | Type | Enum / notes |
|---|---|---|
| `rule_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `rule_name` | `string` | e.g. "Rush Multiplier", "Multiplier-Before-Discount". |
| `condition` | `text` | When the rule fires (over canonical fields/inputs). |
| `action` | `text` | What happens when it fires. |
| `threshold` | `string` | Numeric/categorical test, e.g. "delivery_days < 14", "> $25,000". |
| `applies_to_step` | `UUID` | FK → `process_step.step_id`, or `null` for workflow-global. |
| `deterministic_status` | `enum` | `deterministic, heuristic, probabilistic, unconfirmed, unknown`. |
| `requires_confirmation` | `bool` | Whether a human must validate before it auto-fires. |
| `confidence_score` | `float[0..1]` | |

### 4.8 `human_review` (Human-in-the-Loop) — Doc 04 §9.6

| Field | Type | Enum / notes |
|---|---|---|
| `hitl_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `workflow_stage` | `string` | Step where intervention occurs (resolves to a `step_id`). |
| `human_role` | `string` | **Resolves to `actor.role_name`.** |
| `reason_for_review` | `text` | Why a human is required here. |
| `review_trigger` | `enum` | `always, on_low_confidence, on_threshold_breach, on_exception, sampled, on_high_value, pre_send, unknown`. |
| `confidence_threshold` | `float[0..1]` | Used when `review_trigger = on_low_confidence`. |
| `approval_required` | `bool` | Whether this is a blocking approval gate. |
| `confidence_score` | `float[0..1]` | |

### 4.9 `process_step` (Process / Step) — Doc 04 §9.8

| Field | Type | Enum / notes |
|---|---|---|
| `step_id` | `UUID` | Primary key; referenced by rules, HITL, triggers. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `step_name` | `string` | e.g. "Calculate Line-Item Price". |
| `sequence_order` | `int` | Position in the ordered process (ties = parallel). |
| `input_required` | `UUID[]` | `input_id`s consumed. |
| `output_produced` | `string` | Intermediate value or named output (resolves to §9.3). |
| `actor_responsible` | `string` | `actor.role_name`, if human-performed. |
| `deterministic_rule_available` | `bool` | Step can be governed by a deterministic rule. |
| `probabilistic_reasoning_required` | `bool` | Step needs LLM/agent judgment. |
| `hitl_required` | `bool` | Step needs a human gate. |
| `confidence_score` | `float[0..1]` | |

> The three determinism flags (`deterministic_rule_available`, `probabilistic_reasoning_required`, `hitl_required`) are independent booleans and decide each step's compile target in Build: rule invocation, agent task, or human gate (`see Doc 10 §3.5`).

> **Supporting tables not expanded here** (used by the projection/build but not central to rendering the two surfaces): `trigger` (§9.7), `knowledge` (§9.10), `missing_information` (§9.12), `archetype` (§9.13), `provenance` (§9.14). Drafts cite them by their Doc 04 section.

---

## 5. The Projection Contract (the crux)

The two business-user surfaces (§1) are **projections** of the canonical store (§4). Projection is the deterministic mapping between stored facts and the rendered surfaces, in both directions. This is what lets the user operate on plain business artifacts while the swarms operate on canonical facts.

```
   canonical facts (§4)
        │  forward projection
        ├───────────────▶  SAMPLE OUTPUT      (a draft of the real deliverable)
        │                       │
        │                       │ worked backward
        │                       ▼
        └───────────────▶  SAMPLE INPUTS       (Simulation Pack: synthetic inputs that produce it)
                                ▲
   user comment / input change  │  reverse projection → canonical update → re-project both
```

### 5.1 Canonical facts → SAMPLE OUTPUT

The system renders the stored facts into a **sample of the real deliverable the user recognizes** — not a schema dump, not a description.

| Canonical source | Projects into the sample output as |
|---|---|
| `output.output_type` + `output.output_format` | The medium of the rendered sample (e.g. `document` / `pdf` → a draft PDF/Word proposal). |
| `output.required_sections` | The section headings present in the sample (Scope, Line Items, Terms). |
| `output.required_fields` | The named fields populated in the sample (total, valid_until, deposit). |
| `decision_rule.*` applied to example inputs | The computed values shown (rush multiplier applied, discounts, totals) — see §5.2. |
| `output.quality_criteria` / `source_examples` | The tone, structure, and bar the sample is rendered to (matched to any golden example). |

> Flint & Tinder forward projection: a one-page **draft proposal** with sections {Scope, Line Items, Pricing, Terms}, line items pulled from the rate card (e.g. ID-001 Brand identity \$9,500; CAMP-001 Launch campaign \$18,500; PHOTO-001 half-day shoot \$6,200), the rush multiplier applied to the identity line because the July 1 ask compresses ID-001 inside its standard 21-day delivery window, multiplier-applied-before-discount per the playbook, and a "billed at cost" pass-through line for ad spend. The user sees a proposal — not the rules that produced it.

### 5.2 Canonical facts → SAMPLE INPUTS (Simulation Pack)

The system generates **realistic synthetic example inputs**, worked **backward from the sample output**, that would plausibly produce that output. These materialize exactly the `input_type = required_workflow_input | both` population (§4.4) — never `discovery_evidence`-only rows (`see Doc 04 §9.4`, `see Doc 08 — Simulation Pack`).

| Step | What happens |
|---|---|
| 1. Take the target sample output (§5.1). | The "answer" the inputs must produce. |
| 2. Enumerate required inputs from `input` rows. | Only `required_workflow_input`/`both`; each gets a synthetic instance shaped by `format` and `structured_or_unstructured`. |
| 3. Back-solve values through `decision_rule` logic. | Choose input values that, run through the rules, yield the sample output's computed fields. |
| 4. Render each as a recognizable example. | A sample brief, a sample rate-card row, a sample deadline — values the user can read and correct. |

> Flint & Tinder backward projection: from the draft proposal, the Simulation Pack produces a synthetic **inbound brief** (deliverables requested, an Aug 5 launch with a July 1 identity sub-deadline → triggers the rush rule), a **rate-card** instance (the relevant `service_code` rows + multipliers), and a **client-history** value (1 prior job → repeat-client discount correctly *not* applied, since it kicks in at 3). These are the INPUTS surface the user reviews and edits.

### 5.3 User comment / input-change → canonical update → re-projection

The user's two affordances (§1) map back to canonical changes **internally**; the user never sees the canonical layer move.

| User action (surface) | Internal canonical effect | Re-projection |
|---|---|---|
| **Change an input value** (e.g. deadline July 25 → July 1) | Update the corresponding `input` instance value (and any `decision_rule` operand it feeds, e.g. the rush threshold test). | Re-run forward projection → new sample output; re-run backward projection → consistent sample inputs. Both surfaces refresh together. |
| **Comment on an input** (e.g. "we never get the printer spec up front") | Logged against the relevant `input` row; if it implies a missing required fact, it becomes a `missing_information` row (gap) rather than a silent change. | If it changes a fact, both surfaces re-render; if it raises a gap, it may surface as a high-value question (`see Doc 06`). |
| **Comment on an output** (e.g. "rush fee looks low", "add net-15 terms") | Interpreted against `output.required_fields`/`required_sections` and the `decision_rule`s that produce them; either corrects a rule/field or opens a gap. | Re-render the sample output (and inputs if a driving fact changed) so the two surfaces stay mutually consistent. |

> **Invariant:** the two surfaces are always kept **mutually consistent** — a change to either is projected through the canonical store and both are re-rendered, so a user can never approve a sample output that its sample inputs would not actually produce. Approval (§1.1) is taken only against a consistent pair, and only then is the Build swarm released.

---

## 6. Naming & Status Conventions

- **Tokens are snake_case.** Archetype tokens, enum values, table names, and field names are written in snake_case (e.g. `sharp_point_solution`, `required_workflow_input`, `process_step.actor_responsible`). Prose may use display names (e.g. "Sharp Point Solution"); persisted/spec values use the token (`see Doc 04 §9.13` display-name ↔ token map).
- **Types use the shared tokens** from Doc 04 §2.1 (`UUID`, `string`, `text`, `float[0..1]`, `int`, `bool`, `enum(...)`, `string[]`, `UUID[]`, `timestamp`). `unknown` is always a representable enum value.
- **These are FIRST DRAFTS to be optimized.** This spine and the four drafts that conform to it are first-draft altitude — tables and short definitions, not essays — and are expected to be tightened. Where any draft conflicts with the audited corpus, the corpus governs and the draft is corrected (`see Doc 00 — Index §6`).
- **Cross-reference style:** cite corpus documents as `see Doc NN — Short Title` (e.g. `see Doc 03 — Attribute Registry`, `see Doc 04 — Canonical Schema §9.6`). Discovery-category numbers (1–12) and canonical-table section numbers (§9.1–§9.14) are stable and load-bearing — do not renumber.
- **Determinism framing (binding on all drafts):** extraction from evidence is **probabilistic**; determinism comes from the **canonical schema** (typed fields, closed enums, required links) and the **rules layer** — never from the extraction step. Drafts must never describe extraction as deterministic (`see Doc 00 — Index §7`).
- **Do not expose the plumbing (binding on all drafts):** the user sees only the two surfaces of §1 plus a few high-value questions. No draft may put a category, field, archetype, rule, confidence score, or object in front of the business user.
