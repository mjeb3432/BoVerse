# 01 — Discovery Framework (Draft)

**Purpose:** the universal lens — the fixed set of questions the Discovery swarm (Swarm 1) asks of whatever evidence the user uploads, so it can understand the workflow they want and resolve it into a buildable specification.

**Status:** first draft (to be optimized)

> **What the business user sees**
> Nothing in this document, almost. The user states an **Outcome** in their own words and uploads whatever evidence they have. Of the 12 categories below, only three — **Outcome (1), Output (2), Inputs (3)** — ever reach them, and even then only as the Outcome they typed plus the two rendered surfaces of the contract (the sample output and the sample inputs). The other nine categories are inferred silently by the swarm and surface to the user *only* as an occasional, plain-language clarifying question when a missing fact genuinely blocks the sample output (`see Doc 06 — Missing-Information Framework`). The user never sees a category name, a confidence score, or a canonical field.

---

## 1. What discovery is and why it is the hard part

BoVerse never asks a business user to design a workflow. The user describes an **outcome** they want and uploads whatever **evidence** they already have — an inbound email, a spreadsheet rate card, an SOP, a sample of a past deliverable, an API description. The system **infers the workflow's architecture from that evidence and builds it** (`see Doc 00 — Index`).

So the hard problem is **discovery**, not construction. Construction is mechanical once the architecture is known; discovery is where the intelligence lives — reading messy human evidence and resolving it into a precise, deterministic specification that Swarm 2 can compile.

This document defines the **universal lens** Discovery looks through. Every workflow BoVerse meets — any industry, any archetype — is analyzed through the **same 12 categories**. The categories never change; only the answers do, and how those answers map to architecture (`see Doc 02 — Archetype Framework`). The category numbering is canonical and load-bearing — **do not renumber or rename** (`see Doc 00 — Index §2`).

### 1.1 Where determinism comes from (binding)

Reading evidence is inherently **probabilistic** — the same SOP read twice may yield slightly different phrasings. Determinism does **not** come from the extraction step. It comes from forcing every extracted value into the **canonical schema** (typed fields, closed enums, required links — `see Doc 04 — Canonical Schema`) and the **rules layer** (`see Doc 05 — Rules/Wiki`). Anything that survives the schema and the rules is deterministic and buildable; anything that cannot be forced in becomes either a rule-driven default or an explicit gap (a question for the user) — never a silent guess. The 12 categories are the parent structure that organizes both the schema and the rules, so this discipline starts here. Drafts must never describe extraction as deterministic (`see Doc 00 — Index §7`).

---

## 2. The 12 Discovery Categories

Each category answers one business question, drives one architectural decision, is either **USER-FACING** or **INTERNAL**, and resolves to a concrete answer for the running example — **Flint & Tinder**, a Calgary creative agency scoping an inbound brief from **Northstar Brewing** (Q3 "Cold Front IPA" launch) into a priced proposal. The decisive signature — one main output, one user group, limited inputs — classifies it as a `sharp_point_solution` (`see Doc 02 — Archetype Framework §2`).

### 2.1 — Outcome (1) · **USER-FACING**

| | |
|---|---|
| **Business question** | What is the business ultimately trying to accomplish by running this? |
| **Why it matters** | The north star. It bounds scope: any inferred step, object, or question that does not serve the Outcome is out of scope. It is how Discovery prevents over-building — the build path must be the *minimal* path to the Outcome. |
| **Surface** | **USER-FACING** — this is the Outcome the user states up front, in their own words. It is never shown back as a "category". |
| **Flint & Tinder** | "Turn an inbound creative brief into an accurate, on-brand, correctly-priced proposal in minutes instead of days, without underpricing or skipping an approval gate." |

### 2.2 — Output (2) · **USER-FACING**

| | |
|---|---|
| **Business question** | What concrete artifact, decision, action, or state does a single run produce? |
| **Why it matters** | The most architecture-determining category after Outcome. Whether a run yields a document, a decision, an external action, or a state change shapes the whole build path, and it defines the *shape of the thing Swarm 2 must emit*. |
| **Surface** | **USER-FACING** — renders into the **sample output** the user reviews (`see Doc 00 — Index §3`; spine §5.1). |
| **Flint & Tinder** | A client-facing **priced proposal** (`document` / `pdf`) with sections {Scope, Line Items, Pricing, Terms} — one per run. |

### 2.3 — Inputs (3) · **USER-FACING**

| | |
|---|---|
| **Business question** | What information must be present for a run to produce its Output? |
| **Why it matters** | Defines the workflow's data contract and dependencies. The gap between *required inputs* and *inputs the evidence proves are available* is a primary source of high-value clarifying questions. |
| **Surface** | **USER-FACING** — the `required_workflow_input`/`both` rows render into the **sample inputs** (Simulation Pack) the user reviews and edits (spine §5.2). Discovery-evidence-only rows stay internal. |
| **Flint & Tinder** | The **inbound brief** (deliverables, deadlines), the **rate card**, the **pricing rules**, and **client history** (Northstar = 1 prior job). |

### 2.4 — Trigger (4) · INTERNAL

| | |
|---|---|
| **Business question** | What causes a run to begin? |
| **Why it matters** | Sets the execution mode and a large part of the plumbing — on-demand entry point vs. scheduler vs. event listener/queue. A manual and an event trigger produce very different builds even when every other category is identical. |
| **Surface** | INTERNAL — inferred; the user never specifies it. |
| **Flint & Tinder** | `manual` / incoming email — a brief lands in the inbox and a team member starts the scoping run. |

### 2.5 — Actors (5) · INTERNAL

| | |
|---|---|
| **Business question** | Who or what participates, and in what role? |
| **Why it matters** | Defines roles, authority, and hand-offs — who initiates, who reviews, who approves, who is notified — which drives any UI surfaces, notifications, and access boundaries, and distinguishes human from system participants. |
| **Surface** | INTERNAL — inferred and operated by the swarm. |
| **Flint & Tinder** | The brief-handling pod (Jas/Asif, `performs_work`); the Creative Director (`approve_high`, ≥$25K); the Managing Partner / Renée (`approve_unbounded`, ≥$60K or off-province production); the client (`is_informed`, receives the proposal). |

### 2.6 — Human Review (6) · INTERNAL

| | |
|---|---|
| **Business question** | Where is human judgment required before the workflow proceeds or completes? |
| **Why it matters** | The line between full automation and human-in-the-loop. It determines whether the build needs review queues, approval gates, edit surfaces, and hold/resume states. Mis-detecting it produces a workflow that auto-acts when it should pause, or nags when it should proceed. |
| **Surface** | INTERNAL — inferred. (The contract's own approval gate in spine §1.1 is a separate, product-level gate, not this per-workflow review.) |
| **Flint & Tinder** | An approval gate fires `on_threshold_breach`: any proposal ≥ $25K is blocked for Creative-Director sign-off; ≥ $60K or off-province production requires the Managing Partner. Below threshold, no review. |

### 2.7 — Systems (7) · INTERNAL

| | |
|---|---|
| **Business question** | What existing tools, applications, data stores, or services does the workflow touch? |
| **Why it matters** | Defines the integration surface — what must be read, written, or authenticated against. API/MCP descriptions in the evidence become concrete Connectors here, and the count/direction of touchpoints is a key archetype signal. |
| **Surface** | INTERNAL — inferred; materializes as Connectors at build time (`see Doc 10 — Object Creation Framework`). |
| **Flint & Tinder** | Light surface — **Notion** (write the proposal page) and document/email as the brief source. No heavy bidirectional integration (consistent with `sharp_point_solution`). |

### 2.8 — Knowledge (8) · INTERNAL

| | |
|---|---|
| **Business question** | What rules, policies, formulas, reference documents, or expertise does it depend on? |
| **Why it matters** | The business logic and reference material that makes the Output *correct*, not merely well-formed. It feeds the rules/wiki layer (`see Doc 05`) and any RAG/reference corpus, turning a generic step into a correct-for-this-business step. |
| **Surface** | INTERNAL — inferred; tacit knowledge may surface as a clarifying question. |
| **Flint & Tinder** | The pricing formulas (rate card × multipliers × (1 − discounts) + pass-through), the **multiplier-before-discount** rule (the Lighthaus rule), the rush threshold, the repeat-client discount policy, the approval gates, and the "billed at cost" media pass-through. |

### 2.9 — Decisions (9) · INTERNAL

| | |
|---|---|
| **Business question** | What choices does it make — automatically or by routing to a human? |
| **Why it matters** | The branch points that give a workflow its logic shape; each is where Knowledge (8) is *applied*. They decide whether the build needs a rules engine, a scoring step, or simple conditional routing, and link directly to Human Review (6). |
| **Surface** | INTERNAL — inferred. |
| **Flint & Tinder** | "Does the rush multiplier apply to this line?" (automated, per-category threshold); "Does this proposal need an approval gate?" (automated route → human); "Is the repeat-client discount earned?" (automated — *no*, since 1 prior job < the 3-job threshold). |

### 2.10 — Exceptions (10) · INTERNAL

| | |
|---|---|
| **Business question** | What can go wrong during a run, and how is it handled? |
| **Why it matters** | Defines robustness — error states, retries, fallbacks, holds, escalation. A workflow specified without its exceptions demos fine and fails in production, so this is treated as first-class. |
| **Surface** | INTERNAL — inferred. |
| **Flint & Tinder** | A requested deliverable has no matching `service_code` (→ `hold_for_review`, flag to Renée); the brief's industry is on the decline list (→ `abort` with the §7 decline note); a required pricing input is missing (→ open a gap). |

### 2.11 — Audit (11) · INTERNAL

| | |
|---|---|
| **Business question** | What about each run must be explainable, traceable, or retained? |
| **Why it matters** | Defines traceability and accountability — what must be logged, versioned, timestamped, and retained. Tied to provenance: just as every extracted *fact* carries provenance, every *run* may need an explainable trail. |
| **Surface** | INTERNAL — inferred; materializes as the Audit Layer at build time. |
| **Flint & Tinder** | Retain each proposal version, the rate-card version used, which rules fired (so a multiplier or discount can be defended), and who approved — so a disputed bid can be reconstructed. |

### 2.12 — Success (12) · INTERNAL

| | |
|---|---|
| **Business question** | How do we know it is working — per run and over time? |
| **Why it matters** | Defines acceptance criteria and health metrics; closes the loop with Outcome (1). These criteria seed the Simulation Pack (`see Doc 08`) and the live monitoring. |
| **Surface** | INTERNAL — inferred. Golden examples in the evidence become simulation cases. |
| **Flint & Tinder** | A correct proposal matches the won "Aurora" proposal's structure and bar, prices within tolerance of a partner-prepared figure, applies every gate, and is produced in minutes rather than days. The past winning proposal becomes a golden case. |

---

## 3. Category → what to search for → where it lands

Each category groups a set of searchable attributes in the **Attribute Registry** (`see Doc 03`) that resolve to typed fields in the **Canonical Schema** (`see Doc 04`). This is the spine of the corpus: the registry says *what to look for* (probabilistic), the schema says *where it is allowed to land* (deterministic). The table below shows the headline first-pass attributes and their canonical destinations using the spine's distilled field set (spine §4); the full attribute list lives in Doc 03 and the full schema in Doc 04.

| # | Category | What to search for (Doc 03 attributes) | Where it lands (Doc 04 `table.field`) |
|---|---|---|---|
| 1 | Outcome | `outcome_statement`, `stated_problem`, `inferred_problem`, `primary_objective`, `business_value`, `pain_being_removed`, `value_unit` | `outcome.outcome_description`, `workflow_identity.stated_problem` / `inferred_problem` / `primary_objective`, `outcome.business_value` |
| 2 | Output | `output_name`, `output_type`, `output_format`, `required_sections`, `required_fields`, `output_approval_required`, `output_quality_criteria`, `golden_output_example` | `output.output_name` / `output_type` / `output_format` / `required_sections` / `required_fields` / `approval_required` / `quality_criteria` / `source_examples` |
| 3 | Inputs | `input_name`, `input_role`, `input_source_system`, `input_format`, `input_structure`, `input_required_or_optional`, `evidence_document_ref` | `input.input_name` / `input_type` / `source_system` / `format` / `structured_or_unstructured` / `required_or_optional`; `provenance.source_document` |
| 4 | Trigger | `trigger_type`, `trigger_description`, `trigger_manual_or_automated`, `trigger_source_system` | `trigger.*` (`see Doc 04 §9.7`) |
| 5 | Actors | `actor_role_name`, `actor_human_or_system`, `actor_responsibility`, `actor_approval_authority`, `actor_interaction_type` | `actor.role_name` / `person_or_team` / `responsibility` / `approval_authority` / `interaction_type` |
| 6 | Human Review | `hitl_stage`, `hitl_human_role`, `hitl_reason`, `hitl_review_trigger`, `hitl_value_threshold`, `hitl_approval_required` | `human_review.workflow_stage` / `human_role` / `reason_for_review` / `review_trigger` / `approval_required`; threshold → `decision_rule.threshold` |
| 7 | Systems | `system_name`, `system_connection_type`, `system_role`, `system_read_required`, `system_write_required`, `system_count` | `system_connector.system_name` / `connection_type` / `read_required` / `write_required` |
| 8 | Knowledge | `knowledge_source_name`, `knowledge_source_type`, `knowledge_rule_or_reference`, `tacit_knowledge_item`, `lookup_table_ref`, `formula_definition` | `knowledge.*` (`see Doc 04 §9.10`); formulas → `decision_rule.action` |
| 9 | Decisions | `rule_name`, `decision_condition`, `decision_action`, `decision_threshold`, `decision_determinism_status`; plus `step_*` process attributes | `decision_rule.rule_name` / `condition` / `action` / `threshold` / `deterministic_status`; `process_step.*` (`see Doc 04 §9.8`) |
| 10 | Exceptions | `exception_trigger_condition`, `exception_severity`, `exception_handling_strategy`, `exception_responsible_actor` | `process_step.error_conditions`*, `decision_rule.action` (handling), `missing_information.severity` (`see Doc 04 §9.12`) |
| 11 | Audit | `audit_what_logged`, `audit_versioning_required`, `audit_source_traceability`, `audit_reviewer_record` | `human_review` audit flags, `provenance.*` (`see Doc 04 §9.14`) |
| 12 | Success | `success_per_run_definition`, `success_metric`, `success_golden_case` | `outcome.success_metric`, `output.quality_criteria`, `output.source_examples` |

> Notes. (a) Two cross-cutting groups in Doc 03 are **not** discovery categories: the **Archetype-Signal** attributes (counts and decisive signals that feed `archetype.*`, `see Doc 04 §9.13`) and the **Risk/Governance** attributes (which often map to the `missing_information` ledger because an unanswered governance question is a blocking gap, not a default). (b) Doc 03 §20 flags four facts (e.g. data sensitivity, retention) that currently have **no clean home** in the schema and route to `missing_information` pending a schema change. (c) Field-name reconciliation: this draft uses the spine's distilled names (`decision_rule`, `human_review`, `system_connector`); the full corpus uses the shorter table names (`rule`, `hitl`, `connector`). They denote the same tables — `see Doc 04 §3.1` resolver. The optimizer should pick one naming set across all drafts.

---

## 4. The business-user view of the lens

Of the 12 categories, the contract (spine §1) surfaces only three, and only as artifacts the user already recognizes:

| What the user does | Which categories are involved | What the user actually perceives |
|---|---|---|
| States the ask up front | Outcome (1) | A sentence in their own words. No category label. |
| Reviews the **sample output** | Output (2), and indirectly the Knowledge/Decisions that priced it | One rendered draft proposal — Scope, Line Items, Pricing, Terms. |
| Reviews / edits the **sample inputs** | Inputs (3) | A short list of recognizable example values (a sample brief, a rate-card row, a deadline). |
| Answers an occasional clarifying question | Any of 4–12, but only when a missing fact **blocks the sample output** | A single plain-language question (e.g. "Cans go to print July 7 — do you need the identity done by July 1 even at a rush premium?"). |

The other nine categories are extracted, classified, and built on **entirely behind the scenes**. They surface to the user only through their *effect* on the two rendered surfaces, or — rarely — as one high-value clarifying question when a genuinely blocking, high-severity gap is found (`see Doc 06 — Missing-Information Framework`). The user is never shown an intake form, never sees a category, and never touches a canonical field. Exposing any of it would re-impose the design burden BoVerse exists to remove (`see Doc 00 — Index §5`).

---

## 5. Worked pass: Flint & Tinder, all 12 from the uploaded evidence

Given the five uploaded files — the inbound brief (`01_inbound_brief.txt`), the rate card (`02_service_catalogue.json`), the pricing rules (`03_pricing_rules.json`), the internal playbook (`04_internal_playbook.md`), and a past winning proposal (`05_past_winning_proposal.txt`) — Discovery fills the 12 categories as follows. One line each; the **source file** shows where the evidence was read.

| # | Category | Resolves to (one line) | Source file(s) |
|---|---|---|---|
| 1 | Outcome | Convert an inbound brief into an accurate, on-brand, correctly-priced proposal in minutes, without underpricing or skipping a gate. | brief, playbook |
| 2 | Output | A client-facing proposal (`document`/`pdf`) with {Scope, Line Items, Pricing, Terms}; one per run. | brief, past proposal |
| 3 | Inputs | Inbound brief (required), rate card (required), pricing rules (required), client history = 1 prior job (required). | all five |
| 4 | Trigger | `manual` — a brief arrives by email and a pod member starts the run. | brief (email header), playbook §1 |
| 5 | Actors | Brief pod (Jas/Asif, performs work); Creative Director (`approve_high` ≥$25K); Managing Partner/Renée (`approve_unbounded` ≥$60K / off-province); client (informed). | playbook §1, §4; rules `approval_gates` |
| 6 | Human Review | `on_threshold_breach` — block for sign-off at $25K (CD) and $60K / off-province production (Renée); else auto. | rules `approval_gates`, playbook §4 |
| 7 | Systems | Notion (write proposal page); email/document as brief source. Light surface. | playbook §1 step 5 |
| 8 | Knowledge | Pricing math, multiplier-before-discount (Lighthaus rule), rush rule (delivery inside the service's standard window), repeat-client & multi-SKU discounts, gates, "billed at cost" pass-through. | playbook §3–§6, pricing rules |
| 9 | Decisions | Rush applies to a line? Proposal needs a gate? Repeat-client discount earned (→ no, 1 < 3 jobs)? Retainer included? | pricing rules, playbook §3/§6, past proposal |
| 10 | Exceptions | No matching `service_code` → hold for Renée; declined industry → abort with §7 note; missing pricing input → gap. | playbook §2, §7; rules `exclusions` |
| 11 | Audit | Retain proposal version + rate-card version + which rules fired + approver, to reconstruct a disputed bid. | playbook §3 (Lighthaus post-mortem), §4 |
| 12 | Success | Matches the won "Aurora" proposal's structure/bar, prices within tolerance, applies every gate, produced in minutes; Aurora = golden case. | past proposal, brief budget |

This completed set of 12 answers is the input to archetype classification (`see Doc 02 — Archetype Framework`) and the backbone of the Workflow Design Specification (`see Doc 07`). The classification reads the *pattern* of these answers — one main output (proposal), one user group (the brief pod), limited inputs — and assigns `sharp_point_solution`. From the user's side, none of this is visible: they will see only a draft proposal and a short, editable list of example inputs, plus — here — likely one clarifying question about the July 1 vs July 25 rush decision, since the brief states it ambiguously and it changes the price.

---

## 6. Cross-references

- `see Doc 00 — Index` — the operating model and the binding "do not expose the plumbing" principle.
- `see Doc 02 — Archetype Framework` — recognizes the archetype from the *pattern* of the 12 answers.
- `see Doc 03 — Attribute Registry` — the searchable attribute list, each tagged with one of these 12 categories.
- `see Doc 04 — Canonical Schema` — the typed destination tables/fields, each tracing back to one category.
- `see Doc 06 — Missing-Information Framework` — how a blocking gap becomes the one clarifying question the user answers.
- `see Doc 08 — Simulation Pack` — how Success (12) and Inputs (3) seed the sample-input surface.
