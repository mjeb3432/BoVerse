# 04 — Canonical Table (Draft): Source of Truth & Business-User Projections

**Purpose:** the single source of truth where Discovery's extracted facts are stored, AND the engine that renders the only two things the business user ever sees — a **sample output** and a **sample-inputs simulation pack** — and that absorbs their comments and edits.

**Status:** first draft (to be optimized)

> **What the business user sees.** Two surfaces, and nothing else: **a sample of the real deliverable** (Part B — for Flint & Tinder, a draft client proposal with scope, line items, price math, and terms) and **a pack of realistic sample inputs** that would produce it (Part C — an example brief, a few rate-card lines, the key pricing rules). They read these in plain business language, **comment** on either, or **change an input value**; both surfaces re-render together; then they **approve** (Part D). Everything in Part A — the tables, fields, types, enums, confidence scores, provenance — is internal machinery they never see. A non-technical owner reads the sample output and sample inputs, tweaks them, and approves **without ever seeing a schema.**

---

## 0. How this document is organized

This is the most important document in the corpus: it is both the **store** (Part A) and the **projection engine** (Parts B–D) that turns that store into the business-user contract.

| Part | What it covers | Who sees it |
|---|---|---|
| **A** | Canonical fields — the source of truth (distilled entity/field set). | **INTERNAL — never shown to the user.** |
| **B** | Sample-OUTPUT projection — how stored facts render into a draft of the real deliverable, plus the actual rendered sample for the scenario. | **USER-FACING surface.** |
| **C** | Simulation Pack / sample-INPUTS projection — how the system works backward from the sample output to realistic sample inputs, plus the actual rendered inputs. | **USER-FACING surface.** |
| **D** | The comment / modify loop — how a comment or an input change maps internally to a canonical update and re-renders both surfaces; the agree → modify → re-render → approve cycle; the gate to Build. | The user acts in business terms; the canonical effect is internal. |

> **The invariant, stated once and binding throughout.** The business user sees **only the Part B and Part C surfaces**. **Part A is never exposed** — not the tables, not the fields, not the enums, not the confidence scores, not the provenance. The whole point of the system is to remove the design burden; surfacing the schema would re-impose it (`see Doc 00 — Index §5`).

**Grounding.** Part A distills `see Doc 04 — Canonical Schema` (the full 14 tables and §2 invariants). Parts B–C distill `see Doc 08 — Simulation Pack` (the output-first / inputs-backward inversion) and the projection contract of the spine (§5). The Workflow Design Specification (`see Doc 07 — Workflow Design Specification`) is the *internal* aggregate of this same store; it is **not** a user surface — the user never reads the WDS, only the two rendered surfaces here. The worked example throughout is **Flint & Tinder** (Calgary creative agency) scoping Northstar Brewing's **Cold Front IPA** Q3 launch brief into a priced proposal — a `sharp_point_solution` (one output, one user group, limited inputs).

---

# PART A — Canonical fields (source of truth) · **INTERNAL — NEVER SHOWN TO THE USER**

> Everything in Part A is internal machinery. The business user never sees a field name, a type, an enum, a confidence score, or a provenance row. Part A exists so the swarms can operate on deterministic, typed, linked facts while the user operates on the plain-business surfaces of Parts B–C.

This is the **distilled** field set — the focused subset of the 14 canonical tables (`see Doc 04 — Canonical Schema §9.1–§9.14`) needed to (a) capture the workflow and (b) render the sample output + sample inputs. Types use the shared tokens: `UUID`, `string`, `text`, `float[0..1]`, `int`, `bool`, `enum(...)`, `string[]`, `UUID[]`, `timestamp`. Enums are abbreviated with `…` where the corpus list is long; full enumerations live in `see Doc 04 — Canonical Schema`.

### A.0 Structural invariants (binding)

| Invariant | Statement |
|---|---|
| **Root** | Every table foreign-keys to `workflow_id` (PK of `workflow_identity`). One Discovery run = one `workflow_id`. |
| **Provenance** | Every *extracted* value carries a `fact_id` and is traceable to a row in `provenance` (§9.14) recording where it came from, how, who reviewed it, and the version. |
| **Confidence everywhere** | Every table carries a `confidence_score` (`float[0..1]`). On extracted rows it is extraction confidence; on derived rows (e.g. archetype) it is confidence in the derivation. |
| **HITL → Actor** | `human_review.human_role` MUST resolve to an `actor.role_name`. Human gates are never free-floating. |
| **Rules → Step** | `decision_rule.applies_to_step` MUST resolve to a `process_step.step_id` (or be `null` for workflow-global). |
| **Evidence vs inputs** | `input.input_type` separates Discovery evidence from runtime inputs; only `required_workflow_input`/`both` rows enter the runtime contract and get Simulation instances. The two populations MUST NOT be conflated. |
| **Determinism** | Extraction is **probabilistic**; determinism comes from the **schema** (typed fields, closed enums, required links) and the **rules layer** — never from the extraction step. |

### A.1 `workflow_identity` (root) — `see Doc 04 §9.1`

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

### A.2 `outcome` — `see Doc 04 §9.2`

| Field | Type | Enum / notes |
|---|---|---|
| `outcome_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `outcome_description` | `text` | The outcome the workflow delivers (north star). |
| `business_value` | `text` | Why it matters, concretely (also holds pain removed). |
| `success_metric` | `string` | Measurable definition of success. |
| `time_savings` | `string` | e.g. "2 days → 20 min per proposal". |
| `confidence_score` | `float[0..1]` | |

### A.3 `output` — `see Doc 04 §9.3`

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

### A.4 `input` (Input / Evidence) — `see Doc 04 §9.4`

| Field | Type | Enum / notes |
|---|---|---|
| `input_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `input_name` | `string` | e.g. "Inbound Brief", "Service Catalogue". |
| `input_type` | `enum` | `discovery_evidence, required_workflow_input, both, unknown`. **Disambiguator** — only `required_workflow_input`/`both` rows are in the runtime contract and get Simulation instances. |
| `source_system` | `string` | e.g. "email", "uploaded file". |
| `format` | `enum` | `pdf, docx, xlsx, csv, json, image, email, plain_text, api_payload, voice_transcript, other, unknown`. |
| `structured_or_unstructured` | `enum` | `structured, semi_structured, unstructured, unknown`. |
| `required_or_optional` | `enum` | `required, optional, conditional, unknown`. |
| `confidence_score` | `float[0..1]` | |

### A.5 `actor` (Actor / Role) — `see Doc 04 §9.5`

| Field | Type | Enum / notes |
|---|---|---|
| `actor_id` | `UUID` | Primary key. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `role_name` | `string` | Canonical role; referenced by `human_review.human_role` and `process_step.actor_responsible`. |
| `person_or_team` | `enum` | `individual, team, role_function, external_party, unknown` (also encodes human vs system). |
| `responsibility` | `text` | What this actor does. |
| `approval_authority` | `enum` | `none, approve_low, approve_high, approve_unbounded, unknown`. |
| `interaction_type` | `enum` | `performs_work, reviews, approves, is_informed, consulted, unknown`. |
| `confidence_score` | `float[0..1]` | |

### A.6 `system_connector` (Systems / Connector) — `see Doc 04 §9.9`

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

### A.7 `decision_rule` (Rule / Decision) — `see Doc 04 §9.11`

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

### A.8 `human_review` (Human-in-the-Loop) — `see Doc 04 §9.6`

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

### A.9 `process_step` (Process / Step) — `see Doc 04 §9.8`

| Field | Type | Enum / notes |
|---|---|---|
| `step_id` | `UUID` | Primary key; referenced by rules, HITL, triggers. |
| `workflow_id` | `UUID` | FK → `workflow_identity`. |
| `step_name` | `string` | e.g. "Calculate Line-Item Price". |
| `sequence_order` | `int` | Position in the ordered process (ties = parallel). |
| `input_required` | `UUID[]` | `input_id`s consumed. |
| `output_produced` | `string` | Intermediate value or named output (resolves to §A.3). |
| `actor_responsible` | `string` | `actor.role_name`, if human-performed. |
| `deterministic_rule_available` | `bool` | Step can be governed by a deterministic rule. |
| `probabilistic_reasoning_required` | `bool` | Step needs LLM/agent judgment. |
| `hitl_required` | `bool` | Step needs a human gate. |
| `confidence_score` | `float[0..1]` | |

> The three determinism flags are independent booleans and decide each step's compile target in Build: rule invocation, agent task, or human gate (`see Doc 10 §3.5`).

### A.10 Supporting tables (cited, not expanded)

Used by the projection/build but not central to rendering the two surfaces; drafts cite them by their Doc 04 section: `trigger` (§9.7), `knowledge` (§9.10), `missing_information` / ambiguity ledger (§9.12), `archetype` (§9.13), `provenance` (§9.14). Two matter especially for Parts C–D:

- **`missing_information` (§9.12)** — the gap ledger. Comments that imply a missing required fact land here (`missing_attribute`, `why_it_matters`, `suggested_question`, `severity ∈ {critical, high, medium, low}`, `blocking_status ∈ {blocking, non_blocking, deferred}`). Only `critical`/`high` + `blocking` gaps ever become a user-facing question.
- **`provenance` (§9.14)** — one row per `fact_id`: `source_document`, `source_location`, `extracted_value`, `extraction_method`, `confidence_score`, `review_status`, `version`. This is what makes every projected value traceable — internally.

### A.11 The Flint & Tinder canonical store (filled, INTERNAL)

These are the actual rows for the Cold Front workflow, extracted from the five demo evidence files. **The user never sees this.** It is shown here only so Parts B–C can be traced to concrete facts.

**`workflow_identity`** (1 row)

| Field | Value | `confidence_score` |
|---|---|---|
| `workflow_name` | "Inbound Brief → Priced Proposal" | — |
| `client_name` | "Flint & Tinder" | — |
| `stated_problem` | "We want a single proposal with a clear total for Northstar's Q3 launch, not a series of add-ons." | 0.90 |
| `inferred_problem` | "Scoping inbound briefs into a correctly-priced, gate-compliant proposal is manual, slow, and error-prone (the Lighthaus margin slip)." | 0.82 |
| `primary_objective` | "Turn an inbound creative brief into a sendable, correctly-priced proposal PDF in minutes." | 0.88 |
| `workflow_type` | `document_generation` | 0.90 |

**`output`** (1 row)

| Field | Value | `confidence_score` |
|---|---|---|
| `output_name` | "Northstar Cold Front Proposal" | — |
| `output_type` | `document` | 0.93 |
| `output_format` | `pdf` | 0.90 |
| `required_sections` | `["Engagement Summary", "Scope / Line Items", "Multipliers", "Discounts", "Pass-Through", "Total", "Payment Terms"]` | 0.88 |
| `required_fields` | `["subtotal", "adjusted_subtotal", "total_before_gst", "gst", "grand_total", "deposit", "valid_until"]` | 0.85 |
| `approval_required` | `true` | 0.92 |
| `source_examples` | `["P-2025-0218 (Aurora winning proposal)"]` | 0.95 |
| `quality_criteria` | `["totals reconcile to line items", "multiplier applied before discount", "pass-through billed at cost", "approval gate satisfied"]` | 0.88 |

**`input`** (rows; `input_type` disambiguates evidence vs runtime contract)

| `input_name` | `input_type` | `format` | `structured_or_unstructured` | `required_or_optional` | `conf` |
|---|---|---|---|---|---|
| Inbound Brief | `both` | `email` | `unstructured` | `required` | 0.90 |
| Service Catalogue | `both` | `json` | `structured` | `required` | 0.95 |
| Pricing Rules | `both` | `json` | `structured` | `required` | 0.95 |
| Client / Account History | `required_workflow_input` | `json` | `structured` | `required` | 0.80 |
| Internal Playbook | `discovery_evidence` | `plain_text` | `unstructured` | — | 0.85 |
| Past Winning Proposal (Aurora) | `discovery_evidence` | `plain_text` | `unstructured` | — | 0.90 |

> Only the first four rows (`both` / `required_workflow_input`) enter the runtime contract and get Simulation instances in Part C. The Playbook and the Aurora proposal are **evidence only** — they shaped the rules and the output format but are not fed on every run.

**`decision_rule`** (key rows; all `applies_to_step` resolve to §A.9 steps)

| `rule_name` | `condition` | `action` | `threshold` | `deterministic_status` | `requires_confirmation` | `conf` |
|---|---|---|---|---|---|---|
| Rush Multiplier | line's `delivery_days < service.delivery_days_standard` | multiply that line by its rush multiplier | `delivery_days_standard` per service | `deterministic` | `false` | 0.74 |
| Multiplier-Before-Discount | always (pricing order) | apply all multipliers, then discounts (Lighthaus rule) | n/a | `deterministic` | `false` | 0.90 |
| Repeat-Client Discount | client prior jobs `≥ 3` | 5% off project line | `≥ 3 jobs` | `deterministic` | `false` | 0.88 |
| Multi-SKU Bundle Discount | `≥ 2` SKUs in identity bundle | tiered 5/10/15% | SKU count tiers | `heuristic` | `true` | 0.62 |
| Media Pass-Through At Cost | line is media/ad spend | bill at cost, no markup, separate line | always | `deterministic` | `false` | 0.95 |
| Approval Gate | proposal total `≥ $25,000` / `≥ $60,000` | route to creative_director / managing_partner | `$25K` / `$60K` | `deterministic` | `false` | 0.92 |
| Deposit Rule | total `≥ $15,000`; rush present | 40% deposit (50% if rush) | `$15K` | `deterministic` | `false` | 0.85 |

**`actor`** (rows)

| `role_name` | `person_or_team` | `approval_authority` | `interaction_type` |
|---|---|---|---|
| Brief Handler (Jas/Asif) | role_function | none | performs_work |
| Creative Director (Devon) | individual | approve_high | approves |
| Managing Partner (Renée) | individual | approve_unbounded | approves |

**`human_review`** (1 row) — `human_role = "Creative Director (Devon)"` (resolves to `actor.role_name`), `review_trigger = on_threshold_breach` (total ≥ $25K), `approval_required = true`.

**`archetype`** (1 row) — `primary_archetype = sharp_point_solution`, `secondary_archetype = none`, `confidence_score = 0.90`. Decisive signature: one main output (the proposal) + one user group (the brief-handling pod) + limited inputs.

---

# PART B — SAMPLE OUTPUT projection · **USER-FACING SURFACE**

## B.1 What the user sees

A **draft of the real deliverable, rendered the way they will actually receive it** — not a schema dump, not a description. For Flint & Tinder that is a **draft client proposal**: an engagement summary, a scope with priced line items, the price math (multipliers, discounts, pass-through), a total, and payment terms — in the format the agency recognizes from its own past winning proposals. The user reads it as a proposal and reacts to it as a proposal.

## B.2 The actual rendered sample output (Cold Front IPA proposal)

> This is exactly the rendered artifact the user reviews. Numbers are computed from the demo's Service Catalogue + Pricing Rules, honoring the Playbook rules: **multiplier applies before discount**, **media spend is pass-through at cost**, and **Northstar is a 1-prior-job client so the repeat-client discount (which kicks in at 3 jobs) does NOT apply.**

---

### PROPOSAL — DRAFT
**Prepared for:** Northstar Brewing — Cold Front IPA, Q3 launch
**Prepared by:** Flint & Tinder
**Date:** 2026-05-29 · **Valid until:** 2026-06-28 (30 days)

**Engagement summary.** Full Q3 creative engagement for the Cold Front IPA launch (drop date August 5): brand identity for the new SKU, a 5-week multi-channel launch campaign, and a half-day local photo/video shoot. Identity work compressed to a July 1 sub-deadline to meet your July 7 can-print date.

**Scope / Line items**

| Code | Service | Rate (CAD) |
|---|---|---|
| ID-001 | Brand identity (single product) — label + can art + tap handle, fits existing Aurora/Glacier system | $9,500 |
| CAMP-001 | Launch campaign (5-week, multi-channel) — concept + 4 video edits + 12 static social + 2 billboard layouts + in-store collateral | $18,500 |
| PHOTO-001 | Photo/video shoot (half-day, local) — 1 location, 1 talent, 30 retouched stills, 4 short-form video edits | $6,200 |
| | **Subtotal (rate card)** | **$34,200** |

**Multipliers**

| Adjustment | Basis | Amount |
|---|---|---|
| Rush — identity (delivered by July 1, inside standard 21-day window) | +35% on ID-001 ($9,500) | +$3,325 |
| | **Adjusted subtotal** | **$37,525** |

**Discounts**

| Adjustment | Basis | Amount |
|---|---|---|
| Repeat-client discount | Not applied — Northstar at 1 prior job (Aurora); discount begins at 3 jobs | — |
| Multi-SKU bundle discount | Not applied — single-SKU launch (Cold Front only) | — |
| | **Pre-pass-through total** | **$37,525** |

**Pass-through (billed at cost — never marked up)**

| Item | Amount |
|---|---|
| Print pre-press setup (printer TBC) | *to be confirmed* |
| Talent buyout — 12 months | *to be confirmed* |
| Location permit (half-day) | *to be confirmed* |
| _Paid social ad spend (~$8K/mo, if SOC-001 added)_ | *pass-through at cost, separate* |

**Total**

| | CAD |
|---|---|
| Total before GST | **$37,525** |
| GST (5%) | +$1,876.25 |
| **Grand total (agency fees)** | **$39,401.25** |

**Payment terms.** 50% deposit on signature ($18,762.50 — rush deposit rate), balance net-30.
**Optional add-on (not in total above):** Paid social management (SOC-001) at $4,200/mo for the 5-week campaign; ad spend billed through at cost.

*This is a draft for your review. Tell us anything that looks off, or change a detail (deadline, scope, which identity package), and we'll re-draft.*

---

> **Note on the rush multiplier (a real, surfaced ambiguity).** The Service Catalogue gives ID-001 a per-service `rush_multiplier` of **1.35**; the Pricing Rules give a category-level `rush_multipliers.identity` of **1.4**. The draft uses the per-service **1.35**. This conflict is logged as a `missing_information` row and surfaces to the user as one high-value question (Part D / open questions), *not* as silent machinery. The Aurora precedent applied rush to the **campaign** (compressed to 21 days); here the rush is on **identity** (July 1 sub-deadline) while the campaign stays on the standard July 25 timeline — the system distinguishes the two.

## B.3 How this maps (how this maps, internal)

> Secondary subsection. The user does **not** see this map — they see the rendered proposal above. This is the forward projection `canonical facts → sample output`.

| Canonical source (Part A) | Projects into the sample output as |
|---|---|
| `output.output_type = document` + `output.output_format = pdf` | The medium: a draft PDF proposal. |
| `output.required_sections` | The section headings present (Engagement Summary, Scope / Line Items, Multipliers, Discounts, Pass-Through, Total, Payment Terms). |
| `output.required_fields` | The named values populated (`subtotal`, `adjusted_subtotal`, `total_before_gst`, `gst`, `grand_total`, `deposit`, `valid_until`). |
| `input` rows (Service Catalogue) resolved to line items | The line-item rows (ID-001 $9,500; CAMP-001 $18,500; PHOTO-001 $6,200). |
| `decision_rule` **Rush Multiplier** applied to example inputs | The +35% on the identity line ($9,500 → $12,825), because the July 1 ask is inside ID-001's standard 21-day window. |
| `decision_rule` **Multiplier-Before-Discount** | The ordering: multipliers computed on $34,200 → $37,525 **before** any discount is considered. |
| `decision_rule` **Repeat-Client Discount** (threshold 3) over Account History (1 prior job) | The discount correctly shown as **not applied**. |
| `decision_rule` **Media Pass-Through At Cost** | The separate "billed at cost" pass-through block (ad spend, print, talent, permit), unmarked-up. |
| `decision_rule` **Deposit Rule** (rush present) | The 50% deposit ($18,762.50) and net-30 balance. |
| `decision_rule` **Approval Gate** ($25K) | Internally routes the draft to the Creative Director before send (the user does not see the gate; they see only that a review happens). |
| `output.quality_criteria` / `source_examples` (Aurora) | The tone, structure, and bar the draft is rendered to — matched to the winning Aurora proposal as the golden example. |

> The user sees a **proposal**, not the rules that produced it. Every computed number above traces to a `decision_rule` firing over `input` values, and every fact traces to a `fact_id` in `provenance` — but all of that is Part A, hidden.

---

# PART C — SIMULATION PACK / SAMPLE INPUTS projection · **USER-FACING SURFACE**

## C.1 What the user sees, and the inversion that produces it

The user sees **a short list of named inputs with realistic example values** — an example inbound brief, a few rate-card lines, the key pricing rules — each rendered as something they recognize and can correct. This is the **Simulation Pack**.

The system generates it by a deliberate **inversion** (`see Doc 08 — Simulation Pack §1`): it commits to the **sample output first** (Part B), then works **backward** to the realistic sample inputs that would have to exist to produce it. Committing to a concrete deliverable forces every input it depends on into the open — which is exactly how the system exposes its own gaps instead of hiding them.

```
   SAMPLE OUTPUT (Part B)  ──worked backward──▶  SAMPLE INPUTS (this Part C)
   (the "answer")                                (synthetic inputs that yield it)
```

Only the runtime-contract inputs are materialized — the `input_type = required_workflow_input | both` rows (§A.4). The Playbook and the Aurora proposal (evidence-only) are **never** part of the Simulation Pack the user sees.

## C.2 How the backward projection works (internal)

| Step | What happens |
|---|---|
| 1. Take the target sample output (Part B). | The "answer" the inputs must produce. |
| 2. Enumerate required inputs from `input` rows. | Only `required_workflow_input`/`both`; each gets a synthetic instance shaped by `format` and `structured_or_unstructured`. |
| 3. Back-solve values through `decision_rule` logic. | Pick input values that, run through the rules, yield the output's computed fields (e.g. a July 1 identity sub-deadline so the Rush Multiplier fires; 1 prior job so the Repeat-Client Discount does not). |
| 4. Render each as a recognizable example. | A sample brief, sample catalogue rows, the key pricing rules, a client-history value — values the user can read and correct. |

## C.3 The actual rendered sample inputs (Cold Front scenario)

> These are the artifacts the user comments on and edits. They are deliberately consistent with the Part B output: run them through the rules and you get that proposal.

### Sample input 1 — Inbound brief *(example value; `both`, `format = email`, `unstructured`)*

> **From:** Priya Shah, Marketing Lead, Northstar Brewing
> **Re:** Creative brief — Q3 product launch + summer campaign
>
> New IPA "Cold Front" drops **August 5** (hazy, 6.8%, Mosaic + Citra). We need: **(1) brand identity** for Cold Front (label, can art, tap handle) fitting our existing Aurora/Glacier system; **(2) a launch campaign** Aug 5–Sept 7 (Instagram, TikTok, 2 billboards, in-store displays, 4 restaurant videos); **(3) a half-day photo/video shoot**, Calgary, outdoors. **Optional:** paid social management for 5 weeks (~$8K/mo ad spend).
> Everything ready by **July 25**; **if you can compress the identity work to July 1** we'd appreciate it — cans go to print **July 7**. Budget **$48–65K** (upper bound only with the optional paid social). We want **one proposal with a clear total**.

### Sample input 2 — Service catalogue rows *(example value; `both`, `format = json`, `structured`)*

| `service_code` | `service_name` | `rate_card_cad` | `delivery_days_standard` | `rush_multiplier` |
|---|---|---|---|---|
| ID-001 | Brand identity (single product) | 9,500 | 21 | 1.35 |
| CAMP-001 | Launch campaign (5-week, multi-channel) | 18,500 | 35 | 1.30 |
| PHOTO-001 | Photo/video shoot (half-day, local) | 6,200 | 14 | 1.25 |
| SOC-001 | Paid social management (Meta + TikTok) | 4,200/mo | 30 | — |

### Sample input 3 — Key pricing rules *(example value; `both`, `format = json`, `structured`)*

| Rule | Value (as the workflow reads it) |
|---|---|
| Rush threshold | a line is "rush" when its delivery is inside that service's standard delivery window |
| Pricing order | **multipliers first, then discounts** (Lighthaus rule) |
| Repeat-client discount | 5% — **only at 3+ prior jobs** |
| Media spend | **pass-through at cost, never marked up** |
| Approval gates | $25K → Creative Director; $60K → Managing Partner |
| Deposit | 40% if total ≥ $15K; **50% if the job is rush** |

### Sample input 4 — Client / account history *(example value; `required_workflow_input`, `structured`)*

| Field | Example value |
|---|---|
| Client | Northstar Brewing |
| Prior jobs (trailing 24 months) | **1** (Aurora launch, 2025 — won, paid in full) |
| On retainer? | No |
| Known credit issue? | No |

> **Why these values.** They are back-solved from the Part B proposal: the **July 1 identity sub-deadline** is what makes the Rush Multiplier fire on ID-001; **1 prior job** is what (correctly) keeps the Repeat-Client Discount off; the **single SKU** is what keeps the Multi-SKU Bundle off. Change any of them (Part D) and the proposal re-renders.

---

# PART D — THE COMMENT / MODIFY LOOP

## D.1 The only two affordances (business language)

The user may take **exactly two kinds of action**, both in plain business terms — never on the schema:

1. **Comment** on an input or an output — e.g. *"the rush fee looks too low"*, *"this is missing payment terms"*, *"we never get the printer spec up front"*.
2. **Change an input value** — e.g. *"the identity deadline is July 1, treat it as rush"*, *"make it the full-system identity, not single product"*, *"add the paid-social retainer"*.

That is the entire surface. The user never sees a field, an enum, or a confidence score.

## D.2 The cycle: agree → modify → re-render → approve

```
        ┌────────────────────────────────────────────────────────────┐
        ▼                                                            │
  read SAMPLE OUTPUT (B) + SAMPLE INPUTS (C)  ──▶  comment / change an input  ──▶  re-render BOTH
        │                                                            ▲
        │  looks right                                               │
        ▼                                                            │
     APPROVE  ───────────────────────────────────────────────────────┘ (loop until approved)
        │
        ▼
   GATE: approval releases the Build swarm (Swarm 2)
```

- **Agree** — the user reads the two surfaces in business terms.
- **Modify** — the user comments or changes an input value (the only two affordances).
- **Re-render** — the system maps the action back to a canonical change **internally** (§D.3) and **re-renders both** the sample output and the sample inputs so they stay mutually consistent.
- **Approve** — when the surfaces look right, the user approves.

> **Approval is the gate between the two swarms.** Nothing is built until the user approves the two surfaces (`see Doc 00 — Index §4, step 11`). Discovery may also surface a *small* number of high-value clarifying questions before this loop — only blocking, high-severity gaps (`see Doc 06`) — and those are the sole additional thing a user ever answers. They are never an intake form and never expose the categories.

## D.3 How each action maps internally (the user never sees this column move)

| User action (on a surface) | Internal canonical effect (Part A) | Re-projection |
|---|---|---|
| **Change an input value** (e.g. identity deadline → July 1, mark rush) | Update the `input` instance value, and any `decision_rule` operand it feeds (the Rush Multiplier's delivery-vs-standard test). | Re-run forward projection → new sample output; re-run backward projection → consistent sample inputs. **Both surfaces refresh together.** |
| **Comment on an input** (e.g. "we never get the printer spec up front") | Logged against the relevant `input` row; if it implies a missing required fact, it becomes a `missing_information` row (gap), not a silent change. | If it changes a fact, both surfaces re-render; if it raises a gap, it may surface as one high-value question (`see Doc 06`). |
| **Comment on an output** (e.g. "rush fee looks too low", "add net-15 terms") | Interpreted against `output.required_fields` / `required_sections` and the `decision_rule`s that produce them; either corrects a rule/field operand or opens a gap. | Re-render the sample output (and inputs if a driving fact changed) so the two surfaces stay mutually consistent. |

> **Mutual-consistency invariant.** A change to *either* surface is projected through the canonical store and **both** are re-rendered. A user can therefore never approve a sample output that its sample inputs would not actually produce. Approval is taken only against a consistent pair — and only then is Build released.

## D.4 Worked example — the user changes the rush assumption

**Starting point.** The Part B draft applied the rush multiplier to the **identity** line only (ID-001, +35%), because the brief's July 1 sub-deadline falls inside ID-001's 21-day standard window. The campaign (CAMP-001) was left at standard pricing on the July 25 timeline. Grand total (agency fees): **$39,401.25**.

**The user's action (plain business language).** On the sample brief (an *input*), the marketing lead edits one line:

> *"Actually we need the **whole package** — identity **and** campaign — locked by July 1, not just the identity. The print date moved up."*

This is a **change to an input value** (affordance #2). The user does not touch any rule or field.

**What happens internally (Part A — hidden from the user).**

1. The `input` "Inbound Brief" instance updates: the campaign's effective delivery is now ~July 1, inside CAMP-001's 35-day standard window → CAMP-001 now satisfies the **Rush Multiplier** condition.
2. The Rush Multiplier (`decision_rule`) now fires on **two** lines: ID-001 (+35% → +$3,325) and CAMP-001 (+30% → +$5,550).
3. **Multiplier-Before-Discount** holds: multipliers computed first; discounts still none (1 prior job; single SKU).
4. The new total crosses the **Approval Gate** at $25K (it already had) and is re-checked against the $60K gate (still under) — internally routed to the Creative Director.
5. The **Deposit Rule** recomputes 50% on the new pre-GST total.

**What re-renders (the two surfaces the user sees).**

*Sample output (Part B) — re-drafted:*

| | Before (identity rush only) | After (identity + campaign rush) |
|---|---|---|
| Rate-card subtotal | $34,200 | $34,200 |
| Rush — identity (+35% on $9,500) | +$3,325 | +$3,325 |
| Rush — campaign (+30% on $18,500) | — | **+$5,550** |
| Adjusted subtotal | $37,525 | **$43,075** |
| Discounts | none | none |
| Total before GST | $37,525 | **$43,075** |
| GST (5%) | $1,876.25 | **$2,153.75** |
| **Grand total (agency fees)** | **$39,401.25** | **$45,228.75** |
| Deposit (50%, rush) | $18,762.50 | **$21,537.50** |

*Sample inputs (Part C) — re-rendered consistently:* the example brief now reads "full package by July 1"; the rendered inputs remain a set that, run through the rules, produce exactly the new $45,228.75 proposal. The two surfaces stay locked together.

**The user's next move.** They read the re-drafted proposal. If it looks right, they **approve** — which releases the Build swarm (Swarm 2). If not, they comment or change another input, and the loop repeats. At no point did they see a table, a field, an enum, or a rule — only a brief and a proposal.

---

## Cross-references

| Document | Relationship |
|---|---|
| `see Doc 00 — Index §5` | The governing UX principle: do not expose the plumbing. Part A is hidden; only Parts B–C are user-facing. |
| `see Doc 04 — Canonical Schema` | The full 14 canonical tables and §2 invariants that Part A distills. |
| `see Doc 07 — Workflow Design Specification` | The *internal* aggregate of this same store (the Swarm 1 → Swarm 2 handoff); not a user surface. |
| `see Doc 08 — Simulation Pack` | The output-first / inputs-backward inversion that Parts B–C implement; the artifact set (A1–A11) the two surfaces distill for the business user. |
| `see Doc 10 — Object Creation Framework` | What Build (Swarm 2) compiles once the user approves the two surfaces. |
