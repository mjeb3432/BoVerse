# 04 — Canonical Workflow Design Schema

> **Status:** Portable IP. Implementation-agnostic. An engineer on any stack must be able to implement against this document without further questions.
> **Cross-references:** Discovery categories are defined in [01 — Discovery Framework](01-discovery-framework.md). The archetype catalog is defined in [02 — Archetype Framework](02-archetype-framework.md) and the classification rules in [05 — Rules / Wiki Layer](05-rules-wiki.md); build-path mapping is in [09 — Build Mapping Framework](09-build-mapping-framework.md). The downstream artifacts these tables feed are defined in [07 — Workflow Design Specification](07-workflow-design-specification.md) and [08 — Simulation Pack](08-simulation-pack.md). The CAKE engine that populates these tables is described in [01 — Discovery Framework](01-discovery-framework.md) §2.1.

---

## 1. Purpose of this document

This document defines **the canonical store**: the set of linked tables that represent a single workflow opportunity in deterministic form. It is the destination of Discovery. Everything the Discovery Swarm learns from messy evidence is written here, and nothing leaves Discovery except as rows in these tables plus the artifacts derived from them.

These tables are **not** the messy evidence and they are **not** the raw LLM output. They are the canonical form that the raw output is forced into. This is the central determinism move of the whole system:

- **Extraction is probabilistic.** Reading a freeform note, a screenshot, an SOP, or a sample output and proposing candidate facts is LLM-driven and therefore non-deterministic. The same evidence run twice may yield slightly different phrasing, ordering, or confidence.
- **The schema and the rules layer are deterministic.** Every probabilistic extraction must land in a named field, of a named type, drawn from a named enumeration where one applies, linked to its evidence, and stamped with a confidence score. Facts that do not fit are not silently dropped — they become rows in the **Missing Information / Ambiguity Ledger** (§9.12). Rules in the **Rule / Decision** table (§9.11) reference steps and fire deterministically on the canonical values.

So: the LLM proposes; the schema disposes. Determinism does not come from making the model deterministic. It comes from constraining where the model's output is allowed to go and forcing every claim to declare its evidence, its confidence, and its open questions.

---

## 2. Structural invariants

Every implementation MUST honor these invariants. They are the contract other documents rely on.

| Invariant | Statement |
|-----------|-----------|
| **Root** | Every table hangs off `workflow_id`. `workflow_id` is the primary key of the Workflow Identity table (§9.1) and a foreign key on all 13 other tables. A workflow opportunity is the unit of isolation; one Discovery run produces exactly one `workflow_id` and all rows scoped to it. |
| **Provenance** | Provenance links via `fact_id`. Every canonical fact written by extraction is assigned a `fact_id`, and the Audit / Provenance table (§9.14) carries one row per `fact_id` recording where the value came from, how it was extracted, who reviewed it, and the version. Any field in any table whose value was extracted (not derived or assigned by the system) SHOULD be traceable to a `fact_id`. |
| **HITL → Actor** | Human-in-the-Loop rows reference actors. The `human_role` field on a HITL row (§9.6) MUST correspond to a `role_name` in the Actor / Role table (§9.5). Human review points are never free-floating; they always name a responsible role. |
| **Rules → Step** | Rules reference steps. The `applies_to_step` field on a Rule / Decision row (§9.11) MUST correspond to a `step_id` (or be explicitly `null` for workflow-global rules). Decision logic is anchored to where in the process it fires. |
| **Confidence everywhere** | Every table carries a `confidence_score` (a float in `[0.0, 1.0]`). On extracted rows it is the extraction confidence; on derived rows (e.g. Archetype §9.13) it is the system's confidence in the derivation. The confidence rubric is shared across the corpus: `0.90–1.00` directly stated in evidence, `0.70–0.89` strongly implied, `0.50–0.69` plausible inference, `< 0.50` guess. Rows below the relevant threshold drive clarification questions. |
| **Evidence vs inputs** | The Input / Evidence table (§9.4) distinguishes **evidence used for Discovery** from **inputs required for the final workflow** via the `input_type` enumeration. The two are different populations and MUST NOT be conflated (see §9.4 note). |

### 2.1 Shared types

| Type token | Meaning |
|------------|---------|
| `UUID` | Globally unique identifier (string). Used for all `*_id` primary and foreign keys. |
| `string` | Free text, single line unless noted. |
| `text` | Free text, multi-line / paragraph. |
| `float[0..1]` | Floating point constrained to the closed interval `[0.0, 1.0]`. Used for every `confidence_score` and every `threshold` expressed as a probability. |
| `int` | Integer. |
| `bool` | `true` / `false`. |
| `enum(...)` | One value from the listed set. Implementations SHOULD store the token, not the label. Unknown/undetermined is always representable as `unknown`. |
| `string[]` | Ordered array of strings. |
| `UUID[]` | Array of foreign keys (a many-to-one or many-to-many link expressed inline). |
| `timestamp` | ISO-8601 datetime in UTC. |

`confidence_score` is `float[0..1]` in every table and is not repeated in the per-field descriptions below beyond its one-line meaning.

### 2.2 The 14 tables at a glance

| # | Table | Primary key | Discovery category served |
|---|-------|-------------|---------------------------|
| 9.1 | Workflow Identity | `workflow_id` | Problem / objective framing |
| 9.2 | Outcome | `outcome_id` | Business value & success |
| 9.3 | Output | `output_id` | Deliverables the workflow produces |
| 9.4 | Input / Evidence | `input_id` | Evidence & required inputs |
| 9.5 | Actor / Role | `actor_id` | People & responsibility |
| 9.6 | Human-in-the-Loop | `hitl_id` | Human review & control points |
| 9.7 | Trigger | `trigger_id` | How the workflow starts |
| 9.8 | Process / Step | `step_id` | The process itself |
| 9.9 | Systems / Connector | `connector_id` | Integration surface |
| 9.10 | Knowledge Source | `knowledge_id` | Rules/wiki/reference layer |
| 9.11 | Rule / Decision | `rule_id` | Deterministic decision logic |
| 9.12 | Missing Information / Ambiguity Ledger | `gap_id` | Gaps & open questions |
| 9.13 | Workflow Archetype | `archetype_id` | Classification & build path |
| 9.14 | Audit / Provenance | `provenance_id` | Traceability of every fact |

---

## 9. The canonical tables

The section numbering (9.1–9.14) is canonical and is referenced by other documents. Do not renumber.

### 9.1 Workflow Identity

**Purpose.** The root record for a workflow opportunity. Names the workflow, the client, and the business unit; captures both what the client *said* the problem was and what Discovery *inferred* it to be; states the objectives; and assigns the high-level type. Every other table foreign-keys to this row's `workflow_id`.

**Discovery category served.** Problem / objective framing.

| Field | Type | Meaning |
|-------|------|---------|
| `workflow_id` | `UUID` | **Primary key.** Root identifier for the entire workflow opportunity; foreign key on all other tables. |
| `workflow_name` | `string` | Human-readable name for the workflow (e.g. "Job Quote Preparation"). |
| `client_name` | `string` | Name of the client organization the workflow belongs to. |
| `business_unit` | `string` | Department, team, or function within the client that owns the workflow. |
| `workflow_description` | `text` | Plain-English description of what the workflow does, end to end. |
| `stated_problem` | `text` | The problem exactly as the client articulated it, verbatim or lightly normalized. |
| `inferred_problem` | `text` | The problem as Discovery infers it from evidence, which may differ from `stated_problem`. |
| `primary_objective` | `text` | The single most important thing the workflow must achieve. |
| `secondary_objectives` | `string[]` | Additional objectives ranked below the primary one. |
| `workflow_type` | `enum(document_generation, data_transformation, decision_support, classification_routing, monitoring_alerting, extraction_enrichment, multi_step_orchestration, approval_review, other, unknown)` | High-level **functional** type; a coarse precursor to the **archetype** classification in §9.13. Note: `workflow_type` (functional shape) and `primary_archetype` (the 9-archetype catalog) are distinct fields — do not conflate them. |
| `confidence_score` | `float[0..1]` | Confidence in this identity record (especially in `inferred_problem` and `workflow_type`). |
| `evidence_sources` | `string[]` | List of source document identifiers that informed this record (resolvable to provenance rows). |
| `unresolved_questions` | `string[]` | Open questions about identity/scope that remain after extraction; mirrored into the ledger (§9.12). |

---

### 9.2 Outcome

**Purpose.** Captures *why the workflow matters* — the business value, the decision it supports, and the measurable definition of success. Discovery may record multiple outcomes per workflow. These rows feed the value framing of the Workflow Design Specification and the success metrics the Simulation Pack is graded against.

**Discovery category served.** Business value & success.

| Field | Type | Meaning |
|-------|------|---------|
| `outcome_id` | `UUID` | **Primary key.** Identifier for this outcome. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `outcome_description` | `text` | Plain-English statement of the outcome the workflow delivers. |
| `business_value` | `text` | Why this outcome matters to the business in concrete terms. |
| `decision_supported` | `text` | The business decision this outcome enables or improves. |
| `user_benefit` | `text` | The benefit to the end user / operator of the workflow. |
| `operational_benefit` | `text` | The benefit to operations (consistency, throughput, reduced rework). |
| `risk_reduction` | `text` | The risk this outcome reduces (compliance, error, key-person dependency). |
| `revenue_impact` | `string` | Expected revenue effect, qualitative or quantified (e.g. "+3% win rate"). |
| `time_savings` | `string` | Expected time saved, qualitative or quantified (e.g. "4 hrs → 15 min per quote"). |
| `success_metric` | `string` | The measurable metric that defines success for this outcome. |
| `evidence_source` | `string` | Source identifier supporting this outcome (resolvable to a provenance row). |
| `confidence_score` | `float[0..1]` | Confidence in this outcome record. |

---

### 9.3 Output

**Purpose.** Defines *what the workflow produces* — the concrete deliverable(s): name, type, format, who receives it, where it goes, how often, and the structural and quality requirements it must satisfy. When a sample output exists it is referenced here, because sample outputs are among the strongest evidence Discovery can have.

**Discovery category served.** Deliverables the workflow produces.

| Field | Type | Meaning |
|-------|------|---------|
| `output_id` | `UUID` | **Primary key.** Identifier for this output. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `output_name` | `string` | Human-readable name of the deliverable (e.g. "Customer Quote PDF"). |
| `output_type` | `enum(document, report, dataset, record_update, message, decision, alert, dashboard, api_response, other, unknown)` | The kind of artifact produced. |
| `output_format` | `enum(pdf, docx, xlsx, csv, json, html, email, plain_text, slack_message, db_write, other, unknown)` | The concrete file/wire format of the output. |
| `output_audience` | `string` | Who consumes the output (role, team, or external party). |
| `output_destination` | `string` | Where the output is delivered (system, inbox, folder, channel). |
| `output_frequency` | `enum(on_demand, per_event, hourly, daily, weekly, monthly, ad_hoc, unknown)` | How often the output is produced. |
| `required_sections` | `string[]` | Named sections the output must contain (e.g. "Scope", "Line Items", "Terms"). |
| `required_fields` | `string[]` | Named fields the output must populate (e.g. "total", "valid_until", "tax"). |
| `editable_by_user` | `bool` | Whether a human may edit the output before it is finalized. |
| `approval_required` | `bool` | Whether the output requires sign-off before release (links to a HITL row in §9.6). |
| `sample_output_available` | `bool` | Whether a real example of this output was provided as evidence. |
| `source_examples` | `string[]` | Identifiers of sample-output documents used as evidence. |
| `quality_criteria` | `string[]` | The criteria by which a correct/acceptable output is judged. |
| `confidence_score` | `float[0..1]` | Confidence in this output record. |

---

### 9.4 Input / Evidence

**Purpose.** Catalogs the data the system sees. This table does double duty and the duty is disambiguated by `input_type`:

- **Evidence used for Discovery** — the messy materials the client uploaded so the system could *infer* the workflow (the freeform notes, the SOP, the screenshot, the one sample quote). These are consumed once, during Discovery, to build the canonical store.
- **Inputs required for the final workflow** — the data the *built* workflow will need on every run (the live job request, the current labor-rate table, the customer record). These define the runtime input contract that the Simulation Pack (07) materializes.

A single artifact can be both (a sample spreadsheet may be evidence now and the template for a required input later) — in that case record two rows, or one row with `input_type = both`. Never collapse the two populations into one undifferentiated list; downstream build (Swarm 2) provisions connectors only for the *required-input* population.

**Discovery category served.** Evidence & required inputs.

| Field | Type | Meaning |
|-------|------|---------|
| `input_id` | `UUID` | **Primary key.** Identifier for this input/evidence item. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `input_name` | `string` | Human-readable name (e.g. "Labor Rate Spreadsheet"). |
| `input_type` | `enum(discovery_evidence, required_workflow_input, both, unknown)` | **Disambiguator.** Whether this item is evidence for Discovery, a required input for the built workflow, or both. |
| `source_system` | `string` | The system or origin the data comes from (e.g. "QuickBooks", "email", "uploaded file"). |
| `format` | `enum(pdf, docx, xlsx, csv, json, image, email, plain_text, api_payload, voice_transcript, other, unknown)` | The concrete format of the input. |
| `owner` | `string` | Person or team responsible for supplying/maintaining this input. |
| `frequency` | `enum(once, per_run, hourly, daily, weekly, monthly, ad_hoc, unknown)` | How often this input is supplied (for required inputs) or was supplied (for evidence). |
| `reliability` | `enum(high, medium, low, unknown)` | How dependable/clean this source is in practice. |
| `structured_or_unstructured` | `enum(structured, semi_structured, unstructured, unknown)` | Degree of structure in the data. |
| `required_or_optional` | `enum(required, optional, conditional, unknown)` | Whether the workflow can run without this input. |
| `example_available` | `bool` | Whether a concrete example of this input was provided. |
| `extraction_method` | `enum(direct_field, llm_extraction, ocr, parse_table, transcription, manual, not_applicable, unknown)` | How values are/were obtained from this input. |
| `known_quality_issues` | `string[]` | Documented problems with this input (missing fields, inconsistent units, stale data). |
| `confidence_score` | `float[0..1]` | Confidence in this input/evidence record. |

> **Note (evidence vs inputs).** Reports, dashboards, and queries built downstream depend on this distinction. The Workflow Design Specification (06) lists only `required_workflow_input` and `both` rows in its input contract; the Simulation Pack (07) generates synthetic instances of exactly those rows. `discovery_evidence`-only rows are retained for provenance and audit but are **not** part of the runtime contract.

---

### 9.5 Actor / Role

**Purpose.** Enumerates the people and teams involved and what authority each holds. Distinguishes who *does* work, who *reviews* it, who *approves* it, and who an item *escalates* to. This table is the referent for every Human-in-the-Loop row (§9.6) and for the `actor_responsible` field on every step (§9.8).

**Discovery category served.** People & responsibility.

| Field | Type | Meaning |
|-------|------|---------|
| `actor_id` | `UUID` | **Primary key.** Identifier for this actor/role. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `role_name` | `string` | Canonical name of the role (e.g. "Estimator", "Ops Manager"). Referenced by HITL `human_role` and step `actor_responsible`. |
| `person_or_team` | `enum(individual, team, role_function, external_party, unknown)` | Whether this actor is a named individual, a team, a functional role, or an external party. |
| `responsibility` | `text` | What this actor is responsible for in the workflow. |
| `stage_in_workflow` | `string` | The stage(s) or step(s) where this actor is active (resolvable to step names/IDs). |
| `decision_authority` | `enum(none, recommend, decide, unknown)` | The actor's authority to make decisions in the workflow. |
| `review_authority` | `enum(none, review_advisory, review_blocking, unknown)` | The actor's authority to review work (advisory vs blocking). |
| `approval_authority` | `enum(none, approve_low, approve_high, approve_unbounded, unknown)` | The actor's authority to approve, and any value ceiling on that approval. |
| `escalation_role` | `string` | The `role_name` this actor escalates to when an item exceeds their authority. |
| `system_access_required` | `string[]` | Systems this actor must have access to (resolvable to connector `system_name` in §9.9). |
| `interaction_type` | `enum(performs_work, reviews, approves, is_informed, consulted, unknown)` | The primary mode of this actor's involvement. |
| `confidence_score` | `float[0..1]` | Confidence in this actor record. |

---

### 9.6 Human-in-the-Loop

**Purpose.** Defines every point where a human must intervene — review, approve, correct, or be consulted — before the workflow proceeds. Each row names the stage, the responsible role, the reason, the trigger (including the confidence threshold below which a human is pulled in), and the paths for rejection and escalation. **`human_role` references the Actor / Role table (§9.5).**

**Discovery category served.** Human review & control points.

| Field | Type | Meaning |
|-------|------|---------|
| `hitl_id` | `UUID` | **Primary key.** Identifier for this human-in-the-loop point. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `workflow_stage` | `string` | The stage/step where the human intervention occurs (resolvable to a `step_id`). |
| `human_role` | `string` | **Reference to Actor / Role (§9.5) `role_name`** — the role that performs this intervention. |
| `reason_for_review` | `text` | Why a human is required here rather than full automation. |
| `review_trigger` | `enum(always, on_low_confidence, on_threshold_breach, on_exception, sampled, on_high_value, pre_send, unknown)` | The condition that pulls a human in. `pre_send` = mandatory human approval before any external/outbound send. |
| `confidence_threshold` | `float[0..1]` | When `review_trigger = on_low_confidence`, the confidence below which the item is routed to a human. |
| `required_action` | `text` | What the human is expected to do (review, edit, approve, classify). |
| `approval_required` | `bool` | Whether the human's action constitutes a blocking approval gate. |
| `rejection_path` | `text` | What happens when the human rejects the item (return to which step / actor). |
| `escalation_path` | `text` | What happens when the human cannot resolve it (escalate to which `role_name`). |
| `audit_required` | `bool` | Whether this intervention must be logged for audit. |
| `evidence_required` | `string[]` | What the human must see to make the decision (named inputs/outputs). |
| `expected_turnaround` | `string` | Expected human response time (e.g. "within 1 business day"). |
| `confidence_score` | `float[0..1]` | Confidence in this HITL record. |

---

### 9.7 Trigger

**Purpose.** Defines *how the workflow starts* — the event, schedule, or manual action that kicks off a run, the source of that trigger, the condition that must hold, the input it carries, and the first downstream action. A workflow may have multiple triggers.

**Discovery category served.** How the workflow starts.

| Field | Type | Meaning |
|-------|------|---------|
| `trigger_id` | `UUID` | **Primary key.** Identifier for this trigger. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `trigger_type` | `enum(event, schedule, manual, webhook, file_arrival, email_received, record_change, threshold_breach, other, unknown)` | The category of trigger. |
| `trigger_description` | `text` | Plain-English description of what starts the workflow. |
| `source_system` | `string` | The system that emits the trigger (resolvable to connector `system_name` in §9.9). |
| `event_condition` | `text` | The condition that must be true for the trigger to fire. |
| `schedule` | `string` | When `trigger_type = schedule`, the schedule expression (e.g. "every weekday 08:00", cron). |
| `manual_or_automated` | `enum(manual, automated, semi_automated, unknown)` | Whether a human initiates the run or it fires automatically. |
| `required_input` | `string[]` | Inputs that must be present for the trigger to proceed (resolvable to `input_id` in §9.4). |
| `downstream_action` | `string` | The first step/action the trigger initiates (resolvable to a `step_id`). |
| `confidence_score` | `float[0..1]` | Confidence in this trigger record. |

---

### 9.8 Process / Step

**Purpose.** The heart of the schema: the ordered set of steps that constitute the workflow. Each step records its sequence, dependencies, the input it consumes and output it produces, who/what performs it, and — critically — whether the step is governed by a **deterministic rule** or requires **probabilistic reasoning**, and whether it needs a human in the loop. This determinism flag is what tells the Build Swarm whether a step compiles to a rule, an LLM call, or a human gate. **Rules in §9.11 reference these steps via `applies_to_step`.**

**Discovery category served.** The process itself.

| Field | Type | Meaning |
|-------|------|---------|
| `step_id` | `UUID` | **Primary key.** Identifier for this step. Referenced by rules (`applies_to_step`), HITL (`workflow_stage`), and triggers (`downstream_action`). |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `step_name` | `string` | Human-readable name of the step (e.g. "Calculate Line-Item Price"). |
| `step_description` | `text` | What the step does, in plain English. |
| `sequence_order` | `int` | The step's position in the ordered process (ties allowed for parallel steps). |
| `upstream_dependencies` | `UUID[]` | `step_id`s that must complete before this step runs. |
| `downstream_dependencies` | `UUID[]` | `step_id`s that depend on this step's completion. |
| `input_required` | `UUID[]` | `input_id`s (§9.4) consumed by this step. |
| `output_produced` | `string` | What this step emits (intermediate value, or a named output resolvable to §9.3). |
| `actor_responsible` | `string` | The `role_name` (§9.5) responsible for this step, if human-performed. |
| `system_responsible` | `string` | The `system_name` (§9.9) responsible for this step, if system-performed. |
| `deterministic_rule_available` | `bool` | Whether this step can be governed by a deterministic rule (links to §9.11). |
| `probabilistic_reasoning_required` | `bool` | Whether this step requires LLM judgment / probabilistic reasoning. |
| `hitl_required` | `bool` | Whether this step requires a human-in-the-loop intervention (links to §9.6). |
| `error_conditions` | `string[]` | Known failure modes for this step and what constitutes an error. |
| `evidence_source` | `string` | Source identifier supporting the existence/shape of this step. |
| `confidence_score` | `float[0..1]` | Confidence in this step record. |

> **Note.** `deterministic_rule_available` and `probabilistic_reasoning_required` are independent booleans, not mutually exclusive: a step may have a deterministic rule for the common case *and* require reasoning for the residual (in which case both are `true` and a HITL row typically governs the residual). A step with both `false` and `hitl_required = false` is a candidate gap — flag it in the ledger (§9.12).

---

### 9.9 Systems / Connector

**Purpose.** The integration surface. Lists each external system the workflow touches and how it can be reached — API, MCP, or batch export — what data objects it exposes, whether read and/or write access is needed, the authentication burden, and a fallback method if the preferred connection is unavailable. The Build Swarm provisions connectors only from rows here that are referenced by required inputs, steps, or triggers.

**Discovery category served.** Integration surface.

| Field | Type | Meaning |
|-------|------|---------|
| `connector_id` | `UUID` | **Primary key.** Identifier for this system/connector. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `system_name` | `string` | Name of the external system (e.g. "QuickBooks", "ServiceTitan"). Referenced by step `system_responsible`, trigger `source_system`, actor `system_access_required`. |
| `connection_type` | `enum(api, mcp, batch_export, file_drop, manual_entry, webhook, none, unknown)` | The preferred mechanism for reaching the system. |
| `api_available` | `bool` | Whether the system exposes a usable API. |
| `mcp_available` | `bool` | Whether an MCP server exists or can be built for the system. |
| `batch_export_available` | `bool` | Whether the system supports a batch/file export as an integration path. |
| `read_required` | `bool` | Whether the workflow must read from this system. |
| `write_required` | `bool` | Whether the workflow must write to this system. |
| `authentication_required` | `enum(none, api_key, oauth, basic, sso, certificate, unknown)` | The authentication method the system requires. |
| `data_objects_accessed` | `string[]` | The named entities/objects the workflow reads or writes (e.g. "Customer", "Invoice", "JobRequest"). |
| `sync_frequency` | `enum(real_time, on_demand, hourly, daily, batch_nightly, unknown)` | How often data is synchronized with the system. |
| `integration_complexity` | `enum(low, medium, high, unknown)` | Estimated effort to integrate this system. |
| `fallback_method` | `string` | The fallback path if the preferred connection is unavailable (e.g. "CSV export", "manual entry", "mock connector"). |
| `confidence_score` | `float[0..1]` | Confidence in this connector record. |

---

### 9.10 Knowledge Source

**Purpose.** Captures the **rules/wiki/reference layer** — the documents, tables, policies, and tribal knowledge the workflow must consult to behave correctly (pricing books, eligibility policies, style guides, lookup tables). For each source it records type, location, ownership, which steps need it, and whether it must be **retrieved** (RAG) at runtime and/or **canonicalized** into structured rules. This is the table that distinguishes reference knowledge (consulted) from inputs (consumed) and from rules (executed).

**Discovery category served.** Rules / wiki / reference layer.

| Field | Type | Meaning |
|-------|------|---------|
| `knowledge_id` | `UUID` | **Primary key.** Identifier for this knowledge source. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `knowledge_source_name` | `string` | Human-readable name (e.g. "2026 Labor Rate Book", "Discount Policy"). |
| `source_type` | `enum(policy_document, reference_table, sop, wiki, pricing_book, regulation, tribal_knowledge, prior_examples, other, unknown)` | The kind of knowledge source. |
| `source_location` | `string` | Where the source lives (URL, system, file path, "in person X's head"). |
| `rule_or_reference` | `enum(rule, reference, both, unknown)` | Whether the source yields executable rules, is consulted as reference, or both. |
| `structured_or_unstructured` | `enum(structured, semi_structured, unstructured, unknown)` | Degree of structure in the source. |
| `update_frequency` | `enum(static, annual, quarterly, monthly, ad_hoc, unknown)` | How often the source changes. |
| `owner` | `string` | Person or team that maintains the source. |
| `required_for_steps` | `UUID[]` | `step_id`s (§9.8) that depend on this knowledge source. |
| `retrieval_required` | `bool` | Whether the source must be retrieved at runtime (RAG / lookup). |
| `canonicalization_required` | `bool` | Whether the source must be converted into structured rules (§9.11) before use. |
| `confidence_score` | `float[0..1]` | Confidence in this knowledge-source record. |

---

### 9.11 Rule / Decision

**Purpose.** The deterministic decision layer. Each row is an executable rule — a condition, an action, and an optional threshold — sourced from evidence or a knowledge source, **anchored to a step via `applies_to_step`**. The `deterministic_status` field declares whether the rule is fully deterministic, partly heuristic, or still unconfirmed; `requires_confirmation` flags rules a human must validate before they fire. This is where the system's determinism is made executable: rules evaluate over the canonical fields and produce reproducible decisions.

**Discovery category served.** Deterministic decision logic.

| Field | Type | Meaning |
|-------|------|---------|
| `rule_id` | `UUID` | **Primary key.** Identifier for this rule. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `rule_name` | `string` | Human-readable name (e.g. "Rush Job Surcharge"). |
| `rule_description` | `text` | Plain-English statement of what the rule does. |
| `condition` | `text` | The condition under which the rule fires (expressed over canonical fields/inputs). |
| `action` | `text` | The action taken when the condition holds. |
| `threshold` | `string` | The numeric/categorical threshold the condition tests, if any (e.g. "> $10,000", "rush = true"). |
| `source` | `string` | Where the rule came from (evidence document or `knowledge_id` in §9.10). |
| `applies_to_step` | `UUID` | **Reference to Process / Step (§9.8) `step_id`** the rule governs; `null` for workflow-global rules. |
| `deterministic_status` | `enum(deterministic, heuristic, probabilistic, unconfirmed, unknown)` | Whether the rule is fully deterministic, a heuristic, genuinely probabilistic, or not yet confirmed. |
| `requires_confirmation` | `bool` | Whether a human must confirm this rule before it is allowed to fire automatically. |
| `exception_handling` | `text` | What happens when the rule's inputs are missing or it cannot be evaluated. |
| `confidence_score` | `float[0..1]` | Confidence in this rule record. |

---

### 9.12 Missing Information / Ambiguity Ledger

**Purpose.** The system's record of what it does *not* know. Every gap, ambiguity, and unconfirmed assumption that surfaced during extraction becomes a row here, scored by severity and blocking status, linked to the output and step it affects, with the possible source that could resolve it and the single high-value question to ask. This table is how Discovery decides *which* clarifying questions are worth a human's time: only blocking, high-severity gaps generate questions. It is also the explicit place where facts that did not fit the schema land, so nothing is silently dropped.

**Discovery category served.** Gaps & open questions.

| Field | Type | Meaning |
|-------|------|---------|
| `gap_id` | `UUID` | **Primary key.** Identifier for this gap/ambiguity. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `missing_attribute` | `string` | The specific attribute or fact that is missing or ambiguous. |
| `why_it_matters` | `text` | The consequence of leaving this gap unresolved. |
| `affected_output` | `UUID` | `output_id` (§9.3) impacted by this gap, if any. |
| `affected_step` | `UUID` | `step_id` (§9.8) impacted by this gap, if any. |
| `possible_sources` | `string[]` | Where the missing information might be found (person, system, document). |
| `suggested_question` | `text` | The single, high-value question to ask the client to resolve the gap. |
| `severity` | `enum(critical, high, medium, low, unknown)` | How damaging the gap is to a correct build. |
| `blocking_status` | `enum(blocking, non_blocking, deferred, unknown)` | Whether the gap blocks the build or can proceed with an assumption. |
| `confidence_score` | `float[0..1]` | Confidence that this is a genuine gap (vs an artifact of low extraction confidence). |
| `resolution_status` | `enum(open, asked, answered, assumed, wont_fix, unknown)` | Current lifecycle state of the gap. |

---

### 9.13 Workflow Archetype

**Purpose.** The classification that drives the build path. Discovery assigns a primary (and optional secondary) archetype from the catalog in [02 — Archetype Framework](02-archetype-framework.md), records the evidence for the classification and the complexity level, and — most importantly — emits the **recommended build path** and the explicit lists of **required**, **optional**, and **unnecessary** BoVerse components. This is the bridge from Discovery to Build: *Discovery determines architecture; architecture determines build path; build path determines required objects.* The `confidence_score` here is the system's confidence in the *derivation*, not an extraction confidence.

**Discovery category served.** Classification & build path.

| Field | Type | Meaning |
|-------|------|---------|
| `archetype_id` | `UUID` | **Primary key.** Identifier for this archetype assignment. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `primary_archetype` | `enum(workflow_component, mini_app, sharp_point_solution, bridge, app, decision_support_app, integrated_workflow, intelligence_layer, operating_layer_oso, unknown)` | The dominant archetype from the 9-archetype catalog (see [02 — Archetype Framework](02-archetype-framework.md)). Stored as the snake_case token; see the display-name ↔ token map below. |
| `secondary_archetype` | `enum(workflow_component, mini_app, sharp_point_solution, bridge, app, decision_support_app, integrated_workflow, intelligence_layer, operating_layer_oso, none, unknown)` | A secondary archetype if the workflow is a hybrid; `none` if single-archetype. |
| `evidence_for_classification` | `text` | The evidence and reasoning behind the archetype assignment. |
| `complexity_level` | `enum(simple, moderate, complex, very_complex, unknown)` | The overall complexity of the workflow. |
| `recommended_build_path` | `text` | The build path Swarm 2 should follow given the archetype (resolvable to a named path in [09 — Build Mapping Framework](09-build-mapping-framework.md)). |
| `required_boverse_components` | `string[]` | BoVerse objects the workflow definitely needs. |
| `optional_components` | `string[]` | BoVerse objects that may help but are not required. |
| `unnecessary_components` | `string[]` | BoVerse objects explicitly *not* needed (so Build does not over-provision). |
| `confidence_score` | `float[0..1]` | Confidence in this classification/derivation. |

> **Display name ↔ stored token (canonical).** The catalog in [02 — Archetype Framework](02-archetype-framework.md) names archetypes in Title Case for prose; the canonical store holds the snake_case token (per §2.1, "store the token, not the label"). The mapping is one-to-one and authoritative:
>
> | Display name | Stored token |
> |--------------|--------------|
> | Workflow Component | `workflow_component` |
> | Mini-App | `mini_app` |
> | Sharp Point Solution | `sharp_point_solution` |
> | Bridge | `bridge` |
> | App | `app` |
> | Decision-Support App | `decision_support_app` |
> | Integrated Workflow | `integrated_workflow` |
> | Intelligence Layer | `intelligence_layer` |
> | Operating Layer / OSO | `operating_layer_oso` |
>
> Every document that writes `primary_archetype` / `secondary_archetype` MUST use these tokens. Prose may use the display name; persisted values use the token.

---

### 9.14 Audit / Provenance

**Purpose.** The traceability spine. One row per canonical fact, keyed by `fact_id`, recording exactly where the value came from (which document, which location within it), the raw extracted value, the extraction method, the confidence, the reviewer and review status, and the timestamp and version. **Provenance links via `fact_id`:** any extracted value in any other table can be traced to its origin through this table. This is what lets a human hover over any value in the prototype UI and see its evidence, and what makes the canonical store auditable end to end.

**Discovery category served.** Traceability of every fact.

| Field | Type | Meaning |
|-------|------|---------|
| `provenance_id` | `UUID` | **Primary key.** Identifier for this provenance record. |
| `workflow_id` | `UUID` | Foreign key to Workflow Identity (§9.1). |
| `fact_id` | `UUID` | **The canonical fact this row traces.** Every extracted value carries a `fact_id`; this table records its origin. |
| `source_document` | `string` | The evidence document the fact was extracted from (resolvable to an `input_id` in §9.4). |
| `source_location` | `string` | The location within the source (page, cell, line, timestamp, bounding box). |
| `extracted_value` | `text` | The raw value as extracted, before canonicalization. |
| `extraction_method` | `enum(llm_extraction, direct_field, ocr, table_parse, transcription, rule_derived, manual, unknown)` | How the value was obtained. |
| `confidence_score` | `float[0..1]` | The extraction confidence for this specific fact. |
| `reviewer` | `string` | The `role_name` (§9.5) or system that reviewed this fact, if reviewed. |
| `review_status` | `enum(unreviewed, confirmed, corrected, rejected, unknown)` | The human/QA review outcome for this fact. |
| `timestamp` | `timestamp` | When the fact was extracted or last updated (ISO-8601 UTC). |
| `version` | `int` | Monotonically increasing version of this fact, for iteration/regeneration history. |

---

## 10. How the tables compose

A quick read of the link graph, for implementers:

- **`workflow_id`** is the hub. Load a workflow opportunity by selecting all rows across all 14 tables where `workflow_id` matches.
- **`fact_id`** is the provenance key. Trace any extracted value to §9.14; render its source in the UI; gate it on `review_status`.
- **Actor ← HITL.** `Human-in-the-Loop.human_role` resolves to `Actor.role_name`. Validate on write.
- **Step ← Rule.** `Rule.applies_to_step` resolves to `Step.step_id` (or `null`). Validate on write.
- **Step ↔ Input / Output / Knowledge / Connector.** Steps consume `input_id`s, produce outputs (§9.3), depend on `knowledge_id`s, and are performed by a `system_name` (§9.9) or `role_name` (§9.5).
- **Trigger → Step.** `Trigger.downstream_action` resolves to the first `step_id`.
- **Gap → Output / Step.** Ledger rows point at the `output_id`/`step_id` they jeopardize and supply the question to close them.
- **Archetype → Build.** §9.13 is read by Swarm 2 to decide which objects to build. Its component lists are authoritative.

Determinism recap: the LLM fills these cells; the **schema** (types, enums, required links) and the **rules layer** (§9.11) are the deterministic constraints that make the filled store reproducible and auditable. The probabilistic step is named honestly (extraction); it is never the thing called deterministic.
