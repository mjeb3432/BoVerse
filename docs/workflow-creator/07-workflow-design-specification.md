# 07 — Workflow Design Specification (Template)

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** the **handoff artifact** from Swarm 1 (Discovery) to Swarm 2 (Build) — the deterministic blueprint, provided as a reusable template plus one filled example.
> **Status:** Portable IP / handoff artifact. Implementation-agnostic. An engineer on any stack must be able to populate and consume this template without further questions.
> **Consumes:** the 12 discovery categories ([01 — Workflow Discovery Framework](01-discovery-framework.md)), the archetype taxonomy ([02 — Workflow Archetype Framework](02-archetype-framework.md)), and the canonical store ([04 — Canonical Workflow Design Schema](04-canonical-schema.md)).
> **Feeds:** the Simulation Pack (sample-output + synthetic-input package) and the Build Swarm's object-selection logic (Swarm 2).

---

## 1. Purpose of this document

The **Workflow Design Specification** (WDS) is the single document Discovery emits and Build consumes. It is the contract at the seam of the two swarms:

```
evidence ──▶ Discovery (Swarm 1) ──▶ [ Workflow Design Specification ] ──▶ Build (Swarm 2)
```

It has exactly one job: **aggregate the canonical store ([04](04-canonical-schema.md)) into a document that is simultaneously readable by a business stakeholder and executable by a backend build system.** The same artifact must let a client confirm "yes, that is my process" *and* let Swarm 2 decide which BoVerse objects to instantiate — with no human translation step in between.

Two properties make that possible:

- **It is a projection, not a new source of truth.** Every value in the WDS is copied or summarized from a row in the canonical tables (§9.1–§9.14 of [04](04-canonical-schema.md)). The WDS adds no facts. If a field is populated here, a canonical row backs it; if a canonical row exists, it surfaces here. This is what keeps the WDS deterministic: it inherits the determinism of the schema and rules layer rather than introducing a second, looser representation.
- **It is bilingual by section.** Early sections are plain English for the business reader (Executive Summary, Classification, Human Review rationale). Later sections are structured tables for the build system (Data Model, Rules Model, Build Recommendation). The two halves describe the *same* workflow at two altitudes.

> **Determinism note (read this carefully).** Extraction from messy evidence is probabilistic and LLM-driven (see [01 §2.2](01-discovery-framework.md) and CAKE). The WDS is **not** another probabilistic generation step. It is a deterministic rendering of canonical rows: given the same populated canonical store, the same WDS is produced every time. Where a value is uncertain, the WDS does not hide that — it carries the `confidence_score` and lists the gap in the **Missing Information Ledger** (§9 of this template). The WDS never launders a low-confidence guess into confident prose.

### 1.1 How to read the template

Sections 1–13 below are the **template**. Field placeholders are written in `{{ double_brace }}` form and each is annotated with the canonical table and field it draws from (e.g. *from §9.1 `primary_objective`*). Repeating structures (one row per actor, per step, etc.) are shown as a single representative row plus an ellipsis.

Section 14 is **one short filled example** for a single archetype (a Sharp Point Solution), so an implementer can see a populated WDS end to end.

Section 15 is **conformance and cross-reference notes** for the engineer building the renderer.

---

## 2. Template — front matter

Every WDS opens with a fixed block of identity fields so it can be filed, versioned, and traced.

| Field | Value | Source |
|-------|-------|--------|
| Workflow name | `{{ workflow_name }}` | §9.1 `workflow_name` |
| Workflow ID | `{{ workflow_id }}` | §9.1 `workflow_id` (root key; scopes every other row) |
| Client | `{{ client_name }}` | §9.1 `client_name` |
| Business unit | `{{ business_unit }}` | §9.1 `business_unit` |
| Specification version | `{{ version }}` | max `version` across §9.14 provenance rows |
| Generated at | `{{ timestamp }}` | render time, ISO-8601 UTC |
| Overall confidence | `{{ confidence_score }}` | §9.1 `confidence_score` |
| Primary archetype | `{{ primary_archetype }}` | §9.13 `primary_archetype` |
| Build readiness | `{{ blocking | ready | ready_with_assumptions }}` | derived from §9.12 — see §9 below |

> **Build-readiness rule (deterministic).** `blocking` if any ledger row (§9.12) has `blocking_status = blocking` and `resolution_status ∈ {open, asked}`. `ready` if no blocking gaps remain unresolved and no row was resolved by assumption. `ready_with_assumptions` otherwise (resolved, but at least one gap was closed with `resolution_status = assumed`). Swarm 2 MUST refuse to build while readiness is `blocking`.

---

## 3. Template — Section 1: Executive Workflow Summary (plain English)

*The business reader's section. No schema language. Three short paragraphs.*

> **What this workflow does.** `{{ workflow_description }}` *(from §9.1 `workflow_description`).*
>
> **The problem it solves.** The client described the problem as: "`{{ stated_problem }}`" *(from §9.1 `stated_problem`).* Discovery's reading of the underlying problem is: `{{ inferred_problem }}` *(from §9.1 `inferred_problem`).* The single most important outcome is to `{{ primary_objective }}` *(from §9.1 `primary_objective`).*
>
> **Why it matters.** `{{ outcome_description }}` — `{{ business_value }}`. Success will be measured by `{{ success_metric }}`. *(from §9.2 `outcome_description`, `business_value`, `success_metric`; if multiple outcome rows exist, summarize the highest-`confidence_score` row and list the rest in §6 below.)*

> **Stated vs inferred.** When `stated_problem` and `inferred_problem` diverge materially, the summary MUST surface both and name the divergence in one sentence (e.g. *"The client framed this as a reporting problem; the evidence indicates the real bottleneck is data reconciliation upstream of the report."*). This is the most important sentence in the document for a business reviewer and the one most likely to trigger a correction.

---

## 4. Template — Section 2: Workflow Classification

*Bridges plain English and structure. Names the archetype and what it implies, citing [02](02-archetype-framework.md).*

| Field | Value | Source |
|-------|-------|--------|
| Primary archetype | `{{ primary_archetype }}` | §9.13 `primary_archetype` |
| Secondary archetype | `{{ secondary_archetype | none }}` | §9.13 `secondary_archetype` |
| Classification confidence | `{{ confidence_score }}` | §9.13 `confidence_score` (confidence in the *derivation*, per [02 §2](02-archetype-framework.md)) |
| Complexity | `{{ complexity_level }}` | §9.13 `complexity_level` |
| Why this archetype | `{{ evidence_for_classification }}` | §9.13 `evidence_for_classification` |
| Recommended build path | `{{ recommended_build_path }}` | §9.13 `recommended_build_path` |

**Plain-English classification statement (one sentence):**

> This is a **`{{ primary_archetype }}`**`{{ , with a secondary aspect of secondary_archetype }}` because `{{ evidence_for_classification, summarized }}`. Per [02](02-archetype-framework.md), that means the build should `{{ recommended_build_path }}` and deliberately stay at the smallest correct shape.

> **Invariant.** The archetype here MUST match the value Swarm 2 reads in §11 (Build Recommendation). The WDS carries the archetype exactly once as a fact (from §9.13) and references it in both sections; it is never independently re-derived in the spec.

---

## 5. Template — Section 3: User / Actor Model

*Who and what participates, and what authority each holds. One row per §9.5 actor.*

| Role | Type | Responsibility | Decision authority | Review authority | Approval authority | Escalates to | Systems needed |
|------|------|----------------|--------------------|--------------------|--------------------|--------------|----------------|
| `{{ role_name }}` | `{{ person_or_team }}` | `{{ responsibility }}` | `{{ decision_authority }}` | `{{ review_authority }}` | `{{ approval_authority }}` | `{{ escalation_role }}` | `{{ system_access_required[] }}` |
| … | … | … | … | … | … | … | … |

*All fields from §9.5. `escalation_role` and `systems needed` are themselves references — `escalation_role` to another `role_name` in this same table, `system_access_required[]` to `system_name` in the System Model (§7).*

> **No free-floating humans.** Every role named in the Human Review Model (§9 below) MUST appear as a row here. If a human appears in a HITL row but not in this table, that is a spec defect — the renderer MUST fail validation rather than emit it (see [04 §2](04-canonical-schema.md), *HITL → Actor* invariant).

---

## 6. Template — Section 4: Input Model

*The runtime input contract. Lists ONLY the inputs the built workflow needs — not the discovery evidence.*

| Input | Required? | Source system | Format | Structure | Extraction method | Example available | Known quality issues |
|-------|-----------|---------------|--------|-----------|-------------------|-------------------|----------------------|
| `{{ input_name }}` | `{{ required_or_optional }}` | `{{ source_system }}` | `{{ format }}` | `{{ structured_or_unstructured }}` | `{{ extraction_method }}` | `{{ example_available }}` | `{{ known_quality_issues[] }}` |
| … | … | … | … | … | … | … | … |

*All fields from §9.4. **Filter rule:** this table includes only rows where `input_type ∈ {required_workflow_input, both}`. Rows with `input_type = discovery_evidence` are NOT listed here — they were consumed once during Discovery and are retained only for provenance (see [04 §9.4 note](04-canonical-schema.md)).*

> **Evidence vs inputs (the single most common mistake).** The materials the client uploaded to *explain* the workflow (the SOP, the screenshot, the one sample output) are **discovery evidence** and do not belong in this contract. The data the workflow consumes *on every run* (the live request, the current rate table, the customer record) is a **required input** and does. A single artifact can be both — record it once with `input_type = both` and it appears here. Getting this wrong causes Swarm 2 to provision connectors for files that will never arrive at runtime.

---

## 7. Template — Section 5: Output Model

*What the workflow produces. One row per §9.3 output.*

| Output | Type | Format | Audience | Destination | Frequency | Required sections | Approval required | Sample available | Quality criteria |
|--------|------|--------|----------|-------------|-----------|-------------------|-------------------|------------------|------------------|
| `{{ output_name }}` | `{{ output_type }}` | `{{ output_format }}` | `{{ output_audience }}` | `{{ output_destination }}` | `{{ output_frequency }}` | `{{ required_sections[] }}` | `{{ approval_required }}` | `{{ sample_output_available }}` | `{{ quality_criteria[] }}` |
| … | … | … | … | … | … | … | … | … | … |

*All fields from §9.3. When `approval_required = true`, a corresponding HITL row MUST exist in §9 (Human Review Model). When `sample_output_available = true`, the sample is referenced in §10 (Simulation Pack) and is the strongest single grading target the workflow has.*

---

## 8. Template — Section 6: Process Model (high-level steps and dependencies)

*The ordered process. Business-readable, but every step carries its three build-critical flags. One row per §9.8 step, in `sequence_order`.*

| # | Step | Performed by | Consumes | Produces | Deterministic rule? | Reasoning required? | Human in loop? | Depends on |
|---|------|--------------|----------|----------|---------------------|---------------------|----------------|------------|
| `{{ sequence_order }}` | `{{ step_name }}` | `{{ actor_responsible | system_responsible }}` | `{{ input_required[] }}` | `{{ output_produced }}` | `{{ deterministic_rule_available }}` | `{{ probabilistic_reasoning_required }}` | `{{ hitl_required }}` | `{{ upstream_dependencies[] }}` |
| … | … | … | … | … | … | … | … | … |

*All fields from §9.8. The three flag columns are the heart of the handoff: they tell Swarm 2 whether each step compiles to a **deterministic rule** (→ §9.11 rule), an **LLM reasoning call**, a **human gate** (→ §9.6 HITL), or a combination.*

> **Step-shape legend (for the build system).**
> - `deterministic_rule_available = true` → bind this step to one or more rules from the Rules Model (§9 below) via `applies_to_step`.
> - `probabilistic_reasoning_required = true` → this step needs an LLM call; the prompt is grounded in the relevant Knowledge Sources (§9 Knowledge Model).
> - `hitl_required = true` → this step has a human gate; see its row in the Human Review Model (§9 below).
> - A step with **all three false** is a defect: it does nothing. The renderer MUST cross-check against §9.12 and surface it as a gap rather than emit a no-op step.

---

## 9. Template — the structured models (build-system half)

The following models are the structured, machine-consumable half of the WDS. Each is a near-direct projection of a canonical table. Section numbers below are *within this template*; the parenthetical `§9.x` refers to the canonical table in [04](04-canonical-schema.md).

### 9.A System Model — tools, APIs, MCPs, batch connections *(from §9.9)*

| System | Connection | API? | MCP? | Batch? | Read? | Write? | Auth | Data objects | Fallback |
|--------|------------|------|------|--------|-------|--------|------|--------------|----------|
| `{{ system_name }}` | `{{ connection_type }}` | `{{ api_available }}` | `{{ mcp_available }}` | `{{ batch_export_available }}` | `{{ read_required }}` | `{{ write_required }}` | `{{ authentication_required }}` | `{{ data_objects_accessed[] }}` | `{{ fallback_method }}` |
| … | … | … | … | … | … | … | … | … | … |

> **Provisioning filter.** Swarm 2 provisions a connector for a system row **only** if it is referenced by a required input (§6), a step (§8 `system_responsible`), or a trigger (§9.B). Systems present in the store but unreferenced are listed for completeness and explicitly NOT provisioned.

### 9.B Trigger Model — what starts a run *(from §9.7)*

| Trigger | Type | Manual/automated | Source system | Condition | Schedule | First step |
|---------|------|------------------|---------------|-----------|----------|------------|
| `{{ trigger_description }}` | `{{ trigger_type }}` | `{{ manual_or_automated }}` | `{{ source_system }}` | `{{ event_condition }}` | `{{ schedule }}` | `{{ downstream_action }}` |
| … | … | … | … | … | … | … |

### 9.C Knowledge Model — rules/wiki/reference the workflow consults *(from §9.10)*

| Knowledge source | Type | Location | Rule or reference | Used by steps | Retrieval (RAG)? | Canonicalize to rules? | Owner |
|------------------|------|----------|-------------------|---------------|------------------|------------------------|-------|
| `{{ knowledge_source_name }}` | `{{ source_type }}` | `{{ source_location }}` | `{{ rule_or_reference }}` | `{{ required_for_steps[] }}` | `{{ retrieval_required }}` | `{{ canonicalization_required }}` | `{{ owner }}` |
| … | … | … | … | … | … | … | … |

> **Three populations, kept distinct.** *Knowledge* is **consulted** (this table). *Inputs* are **consumed** (§6). *Rules* are **executed** (§9.D). A pricing book is knowledge; the live job request is an input; "rush jobs add 15%" is a rule. The WDS never collapses them, because Swarm 2 builds a retriever for knowledge, a connector for inputs, and a rule evaluator for rules.

### 9.D Rules Model — deterministic rules and rules requiring confirmation *(from §9.11)*

| Rule | Condition | Action | Threshold | Applies to step | Deterministic status | Needs human confirmation? | Source |
|------|-----------|--------|-----------|-----------------|----------------------|---------------------------|--------|
| `{{ rule_name }}` | `{{ condition }}` | `{{ action }}` | `{{ threshold }}` | `{{ applies_to_step }}` | `{{ deterministic_status }}` | `{{ requires_confirmation }}` | `{{ source }}` |
| … | … | … | … | … | … | … | … |

> **Two sub-lists Swarm 2 reads separately.** (1) Rules with `requires_confirmation = false` and `deterministic_status = deterministic` are **ready to compile** — they fire automatically over canonical fields. (2) Rules with `requires_confirmation = true` (or `deterministic_status ∈ {heuristic, probabilistic, unconfirmed}`) are **gated** — they must be confirmed by the role named in the relevant HITL row before they may fire automatically. The WDS presents both in one table but the renderer SHOULD visually separate them.
>
> **Invariant.** Every `applies_to_step` MUST resolve to a step `#` in §8, or be explicitly `null` for a workflow-global rule (see [04 §2](04-canonical-schema.md), *Rules → Step* invariant).

### 9.E Human Review Model — where humans participate and why *(from §9.6)*

*Plain-English-friendly: each HITL point names a stage, a responsible role, and a reason a human is required rather than full automation.*

| Stage | Human role | Why a human | Trigger | Confidence threshold | Approval gate? | Rejection path | Escalation path |
|-------|-----------|-------------|---------|----------------------|----------------|----------------|-----------------|
| `{{ workflow_stage }}` | `{{ human_role }}` | `{{ reason_for_review }}` | `{{ review_trigger }}` | `{{ confidence_threshold }}` | `{{ approval_required }}` | `{{ rejection_path }}` | `{{ escalation_path }}` |
| … | … | … | … | … | … | … | … |

> **Invariant.** Each `human_role` MUST match a `role_name` in the Actor Model (§5). Each `workflow_stage` SHOULD resolve to a step in §8. A HITL point that names neither is a spec defect.

### 9.F Data Model — which canonical tables and attributes are populated *(coverage map over §9.1–§9.14)*

*This is the bridge for the build system: it states, per canonical table, whether the table is populated for this workflow, how many rows, and the mean confidence. Swarm 2 uses it to size the build and to know what NOT to build.*

| Canonical table (in [04](04-canonical-schema.md)) | Populated? | Rows | Mean confidence | Notes |
|----------------|------------|------|-----------------|-------|
| §9.1 Workflow Identity | yes (always 1) | 1 | `{{ confidence_score }}` | Root record |
| §9.2 Outcome | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.3 Output | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.4 Input / Evidence | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | of which `required_workflow_input`/`both`: `{{ k }}` |
| §9.5 Actor / Role | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.6 Human-in-the-Loop | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.7 Trigger | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.8 Process / Step | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.9 Systems / Connector | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | of which referenced/provisioned: `{{ k }}` |
| §9.10 Knowledge Source | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | |
| §9.11 Rule / Decision | `{{ yes/no }}` | `{{ n }}` | `{{ mean }}` | of which ready / gated: `{{ a }}` / `{{ b }}` |
| §9.12 Missing Information Ledger | `{{ yes/no }}` | `{{ n }}` | — | blocking: `{{ k }}` (see §9.G) |
| §9.13 Workflow Archetype | yes (always 1) | 1 | `{{ confidence_score }}` | Drives build path |
| §9.14 Audit / Provenance | yes | `{{ n }}` | — | one row per extracted `fact_id` |

> **Why this table exists.** An empty or thin canonical table is a *signal*, not an omission. A Sharp Point Solution legitimately has zero Bridge-style connectors and one actor; an Operating Layer has many of everything. The coverage map lets Swarm 2 confirm the build matches the archetype's posture from [02 §3](02-archetype-framework.md), and lets a reviewer see at a glance where confidence is thin.

### 9.G Missing Information Ledger *(from §9.12)*

*The honest record of what Discovery does not know. Drives build readiness (§2) and is the list of questions still worth a human's time.*

| Gap | Why it matters | Affected output/step | Severity | Blocking? | Status | Suggested question |
|-----|----------------|----------------------|----------|-----------|--------|--------------------|
| `{{ missing_attribute }}` | `{{ why_it_matters }}` | `{{ affected_output | affected_step }}` | `{{ severity }}` | `{{ blocking_status }}` | `{{ resolution_status }}` | `{{ suggested_question }}` |
| … | … | … | … | … | … | … |

> **Discipline.** Only `blocking` + `high`/`critical` gaps should ever have become clarifying questions during Discovery; the rest are recorded but proceed under a stated assumption. Any gap closed by assumption (`resolution_status = assumed`) downgrades build readiness to `ready_with_assumptions` and the assumption is restated to the client at delivery.

---

## 10. Template — Section: Simulation Pack reference

*The WDS does not embed the simulation data; it references the package and states what it contains, so Swarm 2 (and the prototype's "simulate" stage) can locate and run it.*

| Item | Reference / description | Source |
|------|-------------------------|--------|
| Sample output(s) | `{{ pointer to each sample_output referenced }}` | §9.3 rows where `sample_output_available = true` (`source_examples[]`) |
| Synthetic input package | `{{ pointer to generated instances of each required input }}` | §9.4 rows where `input_type ∈ {required_workflow_input, both}` |
| Grading targets | `{{ quality_criteria per output }}` | §9.3 `quality_criteria`; §9.2 `success_metric` |
| Walkthrough | `{{ pointer to the worked end-to-end run }}` | derived from §9.8 step order + §9.11 rules |

> **What the Simulation Pack proves.** It is a dry run of the *specified* workflow on synthetic-but-realistic data: it materializes one instance of every required input (§6), runs the process (§8) applying the ready rules (§9.D), and produces a candidate of every output (§7) to compare against the real sample. It validates that the specification is buildable and that its rules and steps actually produce the expected artifact **before** Swarm 2 commits to building. The package itself is defined in its own corpus document; this section is only the pointer and contents manifest.

---

## 11. Template — Section: Build Recommendation (what BoVerse should create next)

*The explicit instruction set for Swarm 2. This is where the WDS stops describing and starts directing.*

| Field | Value | Source |
|-------|-------|--------|
| Primary archetype | `{{ primary_archetype }}` | §9.13 (same value as §4 — carried once) |
| Recommended build path | `{{ recommended_build_path }}` | §9.13 `recommended_build_path` |
| **Required** BoVerse components | `{{ required_boverse_components[] }}` | §9.13 `required_boverse_components` |
| **Optional** components | `{{ optional_components[] }}` | §9.13 `optional_components` |
| **Unnecessary** components (do NOT build) | `{{ unnecessary_components[] }}` | §9.13 `unnecessary_components` |
| Build readiness | `{{ blocking | ready | ready_with_assumptions }}` | derived from §9.G (rule in §2) |

> **The three lists are authoritative and equally important.** `required` tells Swarm 2 what to build; `unnecessary` tells it what to refuse to build. The *unnecessary* list is the WDS's defense against over-building (see [02 §1](02-archetype-framework.md)): a Sharp Point Solution's spec explicitly marks "cross-system orchestration", "multi-actor roles", and "shared canonical store" as unnecessary, so Swarm 2 cannot quietly add them. Swarm 2 builds the `required` list, may build from `optional` only with justification, and MUST NOT build anything on the `unnecessary` list.
>
> **Gate.** If build readiness is `blocking`, this section still renders (so the reader sees the intended build) but is marked **NOT YET BUILDABLE**, and Swarm 2 halts pending resolution of the blocking gaps in §9.G.

---

## 12. Template — Section: Provenance & audit summary

*Closing block. Confirms the spec is traceable end to end (the property that lets a reviewer hover any value and see its evidence in the prototype UI).*

| Field | Value | Source |
|-------|-------|--------|
| Facts with provenance | `{{ count of §9.14 rows }}` / `{{ count of extracted facts }}` | §9.14 |
| Facts reviewed | `{{ count where review_status ∈ {confirmed, corrected} }}` | §9.14 `review_status` |
| Lowest-confidence populated fact | `{{ field + value + confidence_score }}` | min over extracted rows |
| Specification version | `{{ version }}` | max §9.14 `version` |

> **Traceability invariant.** Every extracted value rendered anywhere in this WDS SHOULD resolve to a `fact_id` with a row in §9.14 (see [04 §2](04-canonical-schema.md), *Provenance* invariant). Derived/system-assigned values (counts, the archetype derivation, readiness) need not, but SHOULD be reproducible from the rows they summarize.

---

## 13. Template — section index (for the renderer)

The fixed order of a rendered WDS, with its canonical backing:

| WDS section | Title | Primary canonical source | Reader |
|-------------|-------|--------------------------|--------|
| Front matter | Identity & readiness | §9.1, §9.13, §9.12 | both |
| 1 | Executive Workflow Summary | §9.1, §9.2 | business |
| 2 | Workflow Classification | §9.13 | both |
| 3 | User / Actor Model | §9.5 | both |
| 4 | Input Model | §9.4 (filtered) | both |
| 5 | Output Model | §9.3 | both |
| 6 | Process Model | §9.8 | both |
| 5 (struct) A | System Model | §9.9 | build |
| 5 (struct) B | Trigger Model | §9.7 | build |
| 5 (struct) C | Knowledge Model | §9.10 | build |
| 5 (struct) D | Rules Model | §9.11 | build |
| 5 (struct) E | Human Review Model | §9.6 | both |
| 5 (struct) F | Data Model (coverage) | §9.1–§9.14 | build |
| 5 (struct) G | Missing Information Ledger | §9.12 | both |
| 6 (ref) | Simulation Pack reference | §9.3, §9.4, §9.2 | build |
| 7 (rec) | Build Recommendation | §9.13, §9.12 | build |
| 8 (prov) | Provenance & audit summary | §9.14 | both |

---

## 14. Filled example — Sharp Point Solution

*A short, concrete WDS for one archetype, populated from a realistic canonical store. The workflow: a residential HVAC contractor wants to turn a job description plus its rate sheet into a finished customer quote PDF. One output, one user group, limited inputs — the canonical Sharp Point Solution signature (see [02 §3.3](02-archetype-framework.md)). Values are illustrative; placeholders are replaced with concrete data.*

### Front matter

| Field | Value |
|-------|-------|
| Workflow name | Job Quote Preparation |
| Workflow ID | `wf_3f2a…` |
| Client | NorthPeak Mechanical |
| Business unit | Estimating |
| Specification version | 3 |
| Generated at | 2026-05-29T14:02:00Z |
| Overall confidence | 0.86 |
| Primary archetype | `sharp_point_solution` |
| Build readiness | `ready_with_assumptions` |

### Section 1 — Executive Workflow Summary

> **What this workflow does.** Takes a freeform job description and the current labor/material rate sheet, computes line items and a total, and produces a finished, branded customer quote PDF ready to send.
>
> **The problem it solves.** The client described the problem as: *"Every quote takes our estimator half a day and they all look different."* Discovery's reading is: the bottleneck is manual line-item pricing and inconsistent formatting, not quote *volume*. The single most important outcome is to **produce a consistent, correct quote PDF from a job description in minutes instead of hours.**
>
> **Why it matters.** A faster, consistent quote shortens the sales cycle and reduces pricing errors. Success will be measured by **median quote turnaround time (target: 4 hours → 15 minutes) and pricing-error rate.**

> **Stated vs inferred.** The client framed this as a *speed* problem; the evidence indicates the deeper win is *consistency and pricing accuracy* — speed follows from removing manual line-item lookup.

### Section 2 — Workflow Classification

| Field | Value |
|-------|-------|
| Primary archetype | `sharp_point_solution` |
| Secondary archetype | `none` |
| Classification confidence | 0.91 |
| Complexity | `simple` |
| Why this archetype | One main output (quote PDF) + one user group (estimator) + limited inputs (job description, rate sheet). No multi-actor handoffs, no cross-system coordination, no shared analytical store. |
| Recommended build path | One structured workflow: parse → price (rules) → assemble PDF, with a single human review gate before send. |

> This is a **Sharp Point Solution** because one painful job is solved end to end for one audience with one artifact. Per [02](02-archetype-framework.md), the build stays at the smallest correct shape and explicitly omits dashboards, multi-role auth, and any cross-workflow store.

### Section 3 — User / Actor Model

| Role | Type | Responsibility | Decision authority | Review authority | Approval authority | Escalates to | Systems needed |
|------|------|----------------|--------------------|--------------------|--------------------|--------------|----------------|
| Estimator | individual | Reviews drafted quote, adjusts line items, approves for send | decide | review_blocking | approve_high | Owner | QuickBooks |
| Owner | individual | Approves quotes above the estimator's ceiling | decide | review_blocking | approve_unbounded | — | QuickBooks |

### Section 4 — Input Model

| Input | Required? | Source system | Format | Structure | Extraction method | Example available | Known quality issues |
|-------|-----------|---------------|--------|-----------|-------------------|-------------------|----------------------|
| Job description | required | email | plain_text | unstructured | llm_extraction | true | Free text; sometimes omits unit/quantity |
| Labor & material rate sheet | required | uploaded file | xlsx | structured | parse_table | true | Updated quarterly; stale rows possible |
| Customer record | optional | QuickBooks | api_payload | structured | direct_field | true | — |

*(The original blank quote template the client uploaded to explain formatting is `discovery_evidence` only and is therefore NOT listed here — it shaped the Output Model but is not a runtime input.)*

### Section 5 — Output Model

| Output | Type | Format | Audience | Destination | Frequency | Required sections | Approval required | Sample available | Quality criteria |
|--------|------|--------|----------|-------------|-----------|-------------------|-------------------|------------------|------------------|
| Customer Quote PDF | document | pdf | Customer (via Estimator) | email | per_event | Scope, Line Items, Totals, Terms, Valid-Until | true | true | Totals reconcile to line items; all sections present; branded header |

### Section 6 — Process Model

| # | Step | Performed by | Consumes | Produces | Deterministic rule? | Reasoning required? | Human in loop? | Depends on |
|---|------|--------------|----------|----------|---------------------|---------------------|----------------|------------|
| 1 | Parse job description into line items | system | Job description | Structured line items | false | true | false | — |
| 2 | Price each line item from rate sheet | system | Line items, Rate sheet | Priced line items | true | false | false | 1 |
| 3 | Apply surcharges/discounts | system | Priced line items | Adjusted total | true | false | false | 2 |
| 4 | Assemble branded quote PDF | system | Adjusted total, template | Draft quote PDF | true | false | false | 3 |
| 5 | Estimator reviews & approves | Estimator | Draft quote PDF | Approved quote PDF | false | false | true | 4 |

### Structured models

**5A System Model**

| System | Connection | API? | MCP? | Batch? | Read? | Write? | Auth | Data objects | Fallback |
|--------|------------|------|------|--------|-------|--------|------|--------------|----------|
| QuickBooks | api | true | false | true | true | false | oauth | Customer | CSV export |

**5B Trigger Model**

| Trigger | Type | Manual/automated | Source system | Condition | Schedule | First step |
|---------|------|------------------|---------------|-----------|----------|------------|
| Estimator starts a new quote | manual | manual | — | Estimator submits a job description | — | Step 1 |

**5C Knowledge Model**

| Knowledge source | Type | Location | Rule or reference | Used by steps | Retrieval (RAG)? | Canonicalize to rules? | Owner |
|------------------|------|----------|-------------------|---------------|------------------|------------------------|-------|
| 2026 Labor & Material Rate Sheet | pricing_book | uploaded xlsx | both | 2, 3 | true | true | Estimating lead |
| Surcharge & Discount Policy | policy_document | Google Doc | rule | 3 | false | true | Owner |

**5D Rules Model**

| Rule | Condition | Action | Threshold | Applies to step | Deterministic status | Needs human confirmation? | Source |
|------|-----------|--------|-----------|-----------------|----------------------|---------------------------|--------|
| Line-item unit price | line_item matches a rate-sheet row | set unit_price from rate sheet | exact match | 2 | deterministic | false | Rate Sheet |
| Rush surcharge | job marked rush | add 15% to labor subtotal | rush = true | 3 | deterministic | false | Surcharge Policy |
| Volume discount | subtotal > $10,000 | apply 5% discount | > $10,000 | 3 | heuristic | true | Surcharge Policy (ambiguous wording) |

*Ready to compile: the two `deterministic` rules. Gated (needs Owner confirmation): the volume-discount rule, because the policy wording is ambiguous (see ledger).*

**5E Human Review Model**

| Stage | Human role | Why a human | Trigger | Confidence threshold | Approval gate? | Rejection path | Escalation path |
|-------|-----------|-------------|---------|----------------------|----------------|----------------|-----------------|
| Step 5 (review & approve) | Estimator | Pricing/scope judgment and final accountability before a quote reaches a customer | always | — | true | Return to Step 1 with notes | Quotes above estimator ceiling → Owner |

**5F Data Model (coverage)**

| Canonical table | Populated? | Rows | Mean confidence | Notes |
|----------------|------------|------|-----------------|-------|
| §9.1 Workflow Identity | yes | 1 | 0.86 | Root |
| §9.2 Outcome | yes | 1 | 0.88 | |
| §9.3 Output | yes | 1 | 0.92 | |
| §9.4 Input / Evidence | yes | 4 | 0.83 | required/both: 3 |
| §9.5 Actor / Role | yes | 2 | 0.90 | |
| §9.6 Human-in-the-Loop | yes | 1 | 0.89 | |
| §9.7 Trigger | yes | 1 | 0.94 | |
| §9.8 Process / Step | yes | 5 | 0.85 | |
| §9.9 Systems / Connector | yes | 1 | 0.80 | referenced/provisioned: 1 |
| §9.10 Knowledge Source | yes | 2 | 0.87 | |
| §9.11 Rule / Decision | yes | 3 | 0.82 | ready/gated: 2/1 |
| §9.12 Missing Information Ledger | yes | 2 | — | blocking: 0 |
| §9.13 Workflow Archetype | yes | 1 | 0.91 | |
| §9.14 Audit / Provenance | yes | 41 | — | one per extracted fact |

**5G Missing Information Ledger**

| Gap | Why it matters | Affected output/step | Severity | Blocking? | Status | Suggested question |
|-----|----------------|----------------------|----------|-----------|--------|--------------------|
| Volume-discount threshold & rate | Determines totals on large quotes; policy wording is ambiguous | Step 3 / Quote PDF | high | non_blocking | assumed | "Is the volume discount 5% on subtotals over $10,000, or a tiered rate?" |
| Quote validity window | Affects the Valid-Until section | Quote PDF | low | non_blocking | assumed | "How many days should a quote remain valid — 30?" |

### Section 6 — Simulation Pack reference

| Item | Reference / description |
|------|-------------------------|
| Sample output | The client's real "Smith residence" quote PDF (`source_examples[0]`) — primary grading target |
| Synthetic input package | One generated job description + a copy of the rate sheet + one synthetic QuickBooks customer record |
| Grading targets | Totals reconcile to line items; all five required sections present; branded header; turnaround within target |
| Walkthrough | Steps 1→5 run on the synthetic inputs, producing a candidate quote PDF compared field-by-field against the Smith sample |

### Section 7 — Build Recommendation

| Field | Value |
|-------|-------|
| Primary archetype | `sharp_point_solution` |
| Recommended build path | One structured workflow: parse → price → adjust → assemble → human-approve |
| **Required** components | One workflow definition; job-description parser (LLM step); rate-sheet + policy rule evaluator; PDF assembler; one input contract; one output artifact; run persistence; one human-review gate |
| **Optional** components | QuickBooks customer-record connector (auto-fills customer block; workflow runs without it) |
| **Unnecessary** (do NOT build) | Cross-system orchestration; multi-tenant dashboards; shared canonical/intelligence store across workflows; additional user roles beyond Estimator/Owner; analytics surface |
| Build readiness | `ready_with_assumptions` |

> Readiness is `ready_with_assumptions` because both open gaps are non-blocking and were closed with stated assumptions (5% over $10k; 30-day validity). The assumptions are restated to the client at delivery; no gap blocks the build.

### Section 8 — Provenance & audit summary

| Field | Value |
|-------|-------|
| Facts with provenance | 41 / 41 |
| Facts reviewed | 33 confirmed, 2 corrected |
| Lowest-confidence populated fact | Volume-discount rule (`condition`), 0.71 |
| Specification version | 3 |

---

## 15. Conformance & cross-reference notes

**Conformance (for the engineer building the WDS renderer):**

1. **Projection only.** The renderer reads the canonical store ([04](04-canonical-schema.md)) and emits this document. It MUST NOT introduce facts not present as canonical rows. Counts, the readiness flag, and the coverage map are *derived* and MUST be reproducible from the rows.
2. **Filter the Input Model.** §4 lists only `input_type ∈ {required_workflow_input, both}` (§9.4). Discovery-evidence-only rows are excluded from the input contract and the Simulation Pack but retained for provenance.
3. **Enforce the invariants at render time.** A WDS that violates an [04 §2](04-canonical-schema.md) invariant — HITL role not in the Actor Model, a rule's `applies_to_step` that resolves to no step, a step with all three flags false — MUST fail validation rather than render. These are spec defects, not stylistic choices.
4. **Carry the archetype once.** `primary_archetype` (§9.13) appears in the front matter, §2, and §11 but is one fact rendered three times — never independently re-derived.
5. **Readiness gates the build.** Compute build readiness by the §2 rule. While `blocking`, the Build Recommendation renders but is marked NOT YET BUILDABLE and Swarm 2 halts.
6. **Bilingual ordering is fixed.** Use the §13 section order so business readers meet plain-English sections first and the build system finds the structured models in a predictable place.

**Cross-references:**

| Document | Relationship |
|----------|--------------|
| [01 — Workflow Discovery Framework](01-discovery-framework.md) | Defines the 12 categories the WDS sections roll up; defines where determinism comes from (the WDS inherits it). |
| [02 — Workflow Archetype Framework](02-archetype-framework.md) | Defines the archetype recorded in §2/§11 and the build-posture defaults the *required/optional/unnecessary* lists encode. |
| [04 — Canonical Workflow Design Schema](04-canonical-schema.md) | The single source of every value in the WDS. Section §9.x of [04](04-canonical-schema.md) backs the like-named model here; all structural invariants the renderer enforces live in [04 §2](04-canonical-schema.md). |
| Simulation Pack (separate corpus document) | The package §10 references — sample outputs + synthetic instances of the required inputs, run end to end to prove the spec is buildable before Swarm 2 commits. |
| Build Swarm / Swarm 2 (object selection) | Consumes §9.F (coverage), §9.G (gaps/readiness), and §11 (Build Recommendation) to instantiate the *required* objects and refuse the *unnecessary* ones. |
