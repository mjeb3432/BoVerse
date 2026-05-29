# 11 — Workflow Generation Framework

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** how Swarm 2 (Build) converts an approved Workflow Design Specification into a working application, workflow, bridge, or module.
> **Consumes:** the Workflow Design Specification, the Simulation Pack, the canonical tables, the Attribute Registry, and the rules/wiki layer — all produced by Swarm 1 (Discovery).
> **Orchestrates:** Object Creation ([10 — Object Creation Framework](10-object-creation-framework.md)) driven by Build Mapping ([09 — Build Mapping Framework](09-build-mapping-framework.md)).
> **Status:** Portable IP / handoff artifact. Implementation-agnostic. An engineer on any stack (including boverse.io) must be able to implement against this document without further questions.

---

## 1. Purpose of this document

Discovery (Swarm 1) ends with an **approved Workflow Design Specification**: a deterministic description of *what* the workflow is, anchored in the canonical tables ([04 — Canonical Schema](04-canonical-schema.md)) and classified into one of the nine archetypes ([02 — Workflow Archetype Framework](02-archetype-framework.md)). It does **not** describe *how to build it*. This document defines that conversion.

> **Discovery determines architecture. Architecture determines build path. Build path determines required objects.** Swarm 2 is the realization of the last two clauses. It never invents scope; it compiles the specification into the smallest set of BoVerse objects that satisfies it.

The conversion has three named participants, and keeping them distinct is the whole discipline of Build:

| Participant | Defined in | Responsibility |
|---|---|---|
| **Build Mapping** | [09](09-build-mapping-framework.md) | The deterministic function `archetype + canonical facts → required / optional / unnecessary objects`. Answers *which objects.* |
| **Object Creation** | [10](10-object-creation-framework.md) | The construction recipe for each individual BoVerse object type (workflow, step, connector, UI surface, knowledge asset, rule, audit sink). Answers *how to build one object.* |
| **Workflow Generation** | **this document (11)** | The orchestration that runs Build Mapping, then drives Object Creation in the correct order, wiring objects together into a runnable whole. Answers *in what order, wired how.* |

Read 11 as the conductor: 09 hands it the parts list, 10 builds each part on demand, and 11 sequences and connects them.

### 1.1 The prototype this generalizes

The working Next.js prototype runs a thin version of this in its **generate** stage (the fourth of five: ingest → clarify → simulate → generate → deliver). That stage emits a full workflow definition — ordered steps, each tagged with a **primitive** (`ingest` / `transform` / `validate` / `action` / `feedback`), an **actor** (`auto` / `human` / `hybrid`), a **model** (an LLM identifier or `deterministic`), an optional **prompt template**, declared **inputs** and **outputs**, and **knowledge-asset references** — plus a **knowledge library** that is seeded into a vector store and cross-linked into a graph. The **deliver** stage renders that definition into an executable, audited, human-gated artifact with a per-step trace.

This document formalizes and generalizes that behavior so it applies to all nine archetypes, not only the document-generation shape the prototype demos. Where the prototype hard-codes a single linear shape, the generalized framework branches on the archetype's build path.

---

## 2. Inputs to generation

Swarm 2 begins only when Swarm 1 has produced and the user has approved the following. All five are read-only to generation; generation never edits the specification, it compiles from it.

| Input | Source | What generation uses it for |
|---|---|---|
| **Workflow Design Specification** | Swarm 1 deliverable | The authoritative description of the workflow. Carries the archetype assignment and the component lists (see §2.1). The spine of generation. |
| **Simulation Pack** | Swarm 1 deliverable | The input contract (typed schema) plus synthetic test rows (happy-path + edge cases) and the golden/expected outputs. Used to derive runtime data shapes, seed connectors and UI fields, and provide the acceptance tests every generated object is verified against. |
| **Canonical tables** | [04](04-canonical-schema.md), §9.1–§9.14 | The structured fact store. Generation reads specific tables to build specific objects (see the mapping in §4). The single `workflow_id` scopes the entire build. |
| **Attribute Registry** | [Discovery / CAKE](01-discovery-framework.md) | The list of attributes that were searched for during Discovery. Generation reads it to know the field vocabulary and to write the **learning update** back at the end (§6). |
| **Rules / wiki layer** | Rules/wiki layer | The deterministic rules (`Rule / Decision`, §9.11) and the reference knowledge (`Knowledge Source`, §9.10) that govern how steps decide. Generation compiles rules into executable decision logic and reference knowledge into retrievable assets. |

### 2.1 The fields that drive the build

Three fields, all from the **Workflow Archetype** table ([04](04-canonical-schema.md) §9.13), are the load-bearing inputs. Build Mapping ([09](09-build-mapping-framework.md)) reads them; generation honors them literally.

| Field (§9.13) | Type | Role in generation |
|---|---|---|
| `primary_archetype` | enum (one of the nine archetypes in [02](02-archetype-framework.md)) | Selects the **build path** — the template sequence of objects this shape of system requires. |
| `recommended_build_path` | text | The named path Swarm 2 follows (resolvable to a path in [02](02-archetype-framework.md)/[09](09-build-mapping-framework.md)). |
| `required_boverse_components` | string[] | The objects generation **must** create. Authoritative. |
| `optional_components` | string[] | Objects generation **may** create only if an evidenced requirement justifies them. |
| `unnecessary_components` | string[] | Objects generation **must not** create. The guard against over-building. |

> **Determinism note.** Discovery's *extraction* of facts from evidence was probabilistic (LLM-driven; see [01](01-discovery-framework.md)/CAKE). Generation is **not** probabilistic. It is a deterministic compilation of an already-canonical, already-classified specification: the same approved specification plus the same Build Mapping ruleset always produces the same object graph. The only place generation touches an LLM is when it *authors the runtime artifacts of a probabilistic step* (e.g. a step's prompt template), and even that is constrained by the schema and verified against the Simulation Pack. Generation introduces no new probabilistic decisions about architecture.

---

## 3. The generation sequence

Generation runs as an ordered pipeline. Each stage has a clear input, a clear output, and a verification check against the Simulation Pack before the next stage begins. The order is not arbitrary: each stage produces the references the next stage wires against (you cannot generate steps before the tables they read exist; you cannot generate UI before the steps it surfaces exist).

```
┌─ 0. Read the specification ──────────────────────────────────────────────┐
│  Load the workflow_id, the archetype (§9.13), the Simulation Pack.        │
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 1. Determine required objects (Build Mapping, doc 09) ───────────────────┐
│  required / optional / unnecessary component lists → the parts list.      │
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 2. Generate canonical data layer: tables + registry + rules ────────────┐
│  Materialize the persistent store the workflow reads/writes; compile      │
│  rules (§9.11) and knowledge (§9.10) into executable + retrievable form.  │
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 3. Generate workflow steps + HITL gates ────────────────────────────────┐
│  One step per Process/Step row (§9.8); insert human gates per HITL (§9.6).│
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 4. Generate connectors ──────────────────────────────────────────────────┐
│  One connector per Systems/Connector row (§9.9) referenced by a required  │
│  input, step, or trigger. Provision fallbacks.                            │
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 5. Generate UI surfaces ─────────────────────────────────────────────────┐
│  Only if the archetype's build path calls for a front end. Trigger entry, │
│  review/approval screens, output presentation.                           │
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 6. Generate audit + reporting ───────────────────────────────────────────┐
│  Provenance/audit sink (§9.14) wired to every step and gate; reporting    │
│  surfaces only if the spec/Success category requires them.                │
└───────────────────────────────────────────────────────────────────────────┘
            │
┌─ 7. Wire deterministic-where-possible execution ─────────────────────────┐
│  Bind steps to rules / LLM calls / human gates; set confidence           │
│  thresholds; assemble the runnable workflow; verify on the Simulation Pack.│
└───────────────────────────────────────────────────────────────────────────┘
```

Each stage below names exactly which canonical tables it reads and which object type ([10](10-object-creation-framework.md)) it produces.

### 3.0 Read the specification

Load the single `workflow_id` and select all rows across the canonical tables scoped to it ([04](04-canonical-schema.md) §10: "Load a workflow opportunity by selecting all rows across all 14 tables where `workflow_id` matches"). Read the archetype assignment (§9.13) and the Simulation Pack. Validate the structural invariants from [04](04-canonical-schema.md) §2 are intact (every HITL `human_role` resolves to an actor; every rule `applies_to_step` resolves to a step or `null`). If an invariant is violated, generation halts and returns the violation rather than building a broken graph — a violated invariant means Discovery is incomplete, not that Build should improvise.

### 3.1 Determine required objects (Build Mapping)

Hand the archetype and canonical facts to Build Mapping ([09](09-build-mapping-framework.md)). It returns the three authoritative lists from §9.13: `required_boverse_components`, `optional_components`, `unnecessary_components`. This is the parts list for the entire build. Everything that follows builds from `required` (and from any `optional` item with an evidenced justification), and refuses to build anything in `unnecessary`.

The archetype's **build posture** ([02](02-archetype-framework.md) §3) is the default that produced these lists. Two examples make the branching concrete:

- A **Sharp Point Solution** posture: needs one workflow, one input contract, one output artifact, the domain rules, persistence for runs; does **not** need multiple user roles, cross-system orchestration, or a shared canonical store. Generation therefore runs stages 2–4 and 6–7 but **skips most of stage 5** (UI is thin or single-surface) and provisions no cross-workflow store.
- An **Operating Layer / OSO** posture: needs multiple orchestrated workflows, a shared canonical memory, cross-system connectors, role-aware surfaces. Generation runs every stage, repeats stages 2–5 per constituent workflow, and adds an orchestration/integration backbone.

### 3.2 Generate the canonical data layer (tables + registry + rules)

**Reads:** Workflow Identity (§9.1), Knowledge Source (§9.10), Rule / Decision (§9.11), plus the input contract from the Simulation Pack.
**Produces:** the persistent data model, the runtime attribute set, and the executable rule + retrievable knowledge layer.

Three things are built here, in this sub-order:

1. **Tables / data model.** Materialize the persistent store the built workflow reads and writes. For a Sharp Point Solution this may be a single run-record table; for an Intelligence Layer or OSO it is a canonical fact store *with provenance and confidence carried forward* (the same provenance discipline CAKE used in Discovery, [01](01-discovery-framework.md) §2.1, now applies to runtime facts). The fields come from the Simulation Pack's input contract and the outputs declared on steps (§9.8 `output_produced`).
2. **Registry.** Instantiate the runtime attribute set — the field vocabulary the workflow operates over — from the Attribute Registry restricted to attributes this workflow actually touches. This is what later lets the learning loop (§6) extend the registry with anything new the build revealed.
3. **Rules + knowledge.** Compile each `Rule / Decision` row (§9.11) into executable decision logic, keyed by its `applies_to_step`. Compile each `Knowledge Source` row (§9.10): if `canonicalization_required = true`, convert it into structured rules; if `retrieval_required = true`, embed it as a retrievable asset (the prototype's "knowledge library" seeded into a vector store, then cross-linked into a graph by `used_by_step` and by semantic similarity). A rule whose `deterministic_status = deterministic` compiles to a pure function; `requires_confirmation = true` marks it for a human gate before it may fire automatically.

> **Why this stage is first after mapping.** Steps (3.3) bind to rules and read/write these tables; connectors (3.4) read/write these tables; UI (3.5) renders these fields. The data layer is the substrate everything else references, so it is generated first.

### 3.3 Generate workflow steps + HITL gates

**Reads:** Process / Step (§9.8), Human-in-the-Loop (§9.6), Trigger (§9.7), Actor / Role (§9.5).
**Produces:** one ordered workflow step per `Process / Step` row, plus a human gate per `Human-in-the-Loop` row.

For each `Process / Step` row, generate a step object ([10](10-object-creation-framework.md)) carrying:

| Step attribute | Sourced from (§9.8 unless noted) | Notes |
|---|---|---|
| sequence + dependencies | `sequence_order`, `upstream_dependencies`, `downstream_dependencies` | Defines the execution graph; ties allowed for parallel steps. |
| inputs / outputs | `input_required`, `output_produced` | Inputs resolve to `input_id`s (§9.4) or prior step outputs. |
| primitive | derived from the step's nature | The prototype's vocabulary: `ingest` / `transform` / `validate` / `action` / `feedback`. |
| executor binding | `deterministic_rule_available`, `probabilistic_reasoning_required`, `hitl_required` | The three booleans that decide rule vs LLM vs human (resolved fully in stage 7). |
| responsible party | `actor_responsible` (→ §9.5) or `system_responsible` (→ §9.9) | Human role or system. |
| error conditions | `error_conditions` | Seeds exception handling. |

For each `Human-in-the-Loop` row (§9.6), insert a gate at the stage named by `workflow_stage` (resolves to a `step_id`). The gate carries the `human_role` (which **must** resolve to an Actor `role_name`, [04](04-canonical-schema.md) §2 invariant), the `review_trigger` (e.g. `always`, `on_low_confidence`, `on_threshold_breach`, `on_exception`), the `confidence_threshold` when the trigger is `on_low_confidence`, the `approval_required` flag, and the `rejection_path` / `escalation_path`. A step whose `hitl_required = true` always has a matching gate.

> **The `actor` taxonomy.** Mirroring the prototype: a step is `auto` when no human is in its path (a deterministic rule or an LLM call decides), `human` when it is a blocking gate (`STOP here, route to reviewer`), or `hybrid` when an LLM proposes and a human approves. `hybrid` is the runtime expression of a step that has *both* `deterministic_rule_available`/`probabilistic_reasoning_required` **and** `hitl_required` — the common case handled automatically, the residual escalated ([04](04-canonical-schema.md) §9.8 note).

### 3.4 Generate connectors

**Reads:** Systems / Connector (§9.9), and the `required_workflow_input` / `both` rows of Input / Evidence (§9.4).
**Produces:** one connector per system the *built workflow* must reach.

Provision a connector only for systems referenced by a **required input**, a **step's** `system_responsible`, or a **trigger's** `source_system`. Critically, generation does **not** provision connectors for systems that appeared only as Discovery evidence: per [04](04-canonical-schema.md) §9.4, "downstream build (Swarm 2) provisions connectors only for the *required-input* population," and §9.9 confirms "the Build Swarm provisions connectors only from rows here that are referenced by required inputs, steps, or triggers." This is the evidence-vs-inputs distinction enforced at build time.

Each connector is built from its §9.9 row: `connection_type` (`api` / `mcp` / `batch_export` / `file_drop` / `manual_entry` / `webhook`), the `read_required` / `write_required` directions, the `authentication_required` method, the `data_objects_accessed`, and — always — the `fallback_method`. When the preferred path is unavailable, generation wires the fallback (e.g. a CSV export or a mock connector) so the workflow degrades gracefully rather than failing to build. A row whose only viable path is `manual_entry` produces a UI input rather than an automated connector (linking stage 3.4 to stage 3.5).

### 3.5 Generate UI surfaces

**Reads:** the archetype build posture (§9.13 / [02](02-archetype-framework.md) §3), Trigger (§9.7), Human-in-the-Loop (§9.6), Output (§9.3), Actor / Role (§9.5).
**Produces:** front-end surfaces — **only if the build path calls for them.**

This stage is the sharpest expression of "build only what is needed." Whether it runs at all is decided by the archetype:

- **Workflow Component** (no front end): skip entirely. The consumer is another workflow, not a person.
- **Mini-App**: a single thin surface — typically one review/adjust/approve screen.
- **App / Decision-Support App**: full front end — trigger entry, the workflow's interactive surfaces, output presentation, and (for Decision-Support) the rationale/explanation display.
- **Bridge**: minimal UI of its own; mostly coordination state, not screens.
- **Integrated Workflow / OSO**: role-aware surfaces, one per actor stage.

When UI is built, it is assembled from the canonical rows, not invented: a **trigger entry** surface for each `manual` trigger (§9.7); a **review/approval** surface for each HITL gate (§9.6), showing exactly the `evidence_required` the human must see; an **output presentation** surface for each `Output` row (§9.3), honoring `required_sections`, `required_fields`, and `editable_by_user`. UI field types and example values are pulled from the Simulation Pack's input contract so the surfaces are populated and testable from the moment they exist.

### 3.6 Generate audit and reporting

**Reads:** Audit / Provenance (§9.14), the Audit answers in the spec, Success (§9.2 / Discovery category 12), Output (§9.3).
**Produces:** the provenance/audit sink and any reporting surfaces.

Audit is generated for **every** workflow, not gated by archetype — it is the runtime continuation of the provenance spine that made Discovery auditable ([04](04-canonical-schema.md) §9.14). Wire an audit sink that records, per run and per step: the inputs used, the rule or model that decided, the confidence, the human reviewer and outcome at each gate (`audit_required` on §9.6), and a timestamped, versioned trace. The prototype's per-step trace — a `step_results[]` array with `status`, `duration_ms`, `output`, `trace_message`, and `retrieved_assets` — is the concrete shape this takes; it is what makes a run "auditable end-to-end."

**Reporting** surfaces, by contrast, are built only when the Success category (Discovery 12) or the Output table calls for them (e.g. a `dashboard` output type in §9.3, or a Success metric that must be tracked over time). An archetype whose `unnecessary_components` lists analytics gets no reporting layer.

### 3.7 Wire deterministic-where-possible execution

**Reads:** Process / Step (§9.8), Rule / Decision (§9.11), Human-in-the-Loop (§9.6).
**Produces:** the bound, runnable workflow, verified against the Simulation Pack.

This final stage binds each step to its executor, using the three booleans on the step row plus the matching rule and HITL rows. The binding rule is the heart of the framework (and is detailed in §5):

- `deterministic_rule_available = true` → bind to the compiled rule (a pure function). No LLM call.
- `probabilistic_reasoning_required = true` → bind to an LLM call with an authored prompt template; attach the relevant confidence threshold.
- `hitl_required = true` → insert the human gate; the gate's `review_trigger` and `confidence_threshold` decide when execution pauses.

Set every gate's threshold from §9.6 `confidence_threshold`. Assemble the steps into the execution graph defined by their dependencies. Then **verify**: run the assembled workflow against the Simulation Pack's synthetic rows (happy-path *and* edge cases) and confirm the outputs match the golden/expected outputs and that every edge-case row triggers the gate or exception path the spec predicted. A build that does not pass its own Simulation Pack is not delivered.

> **Stability of generation.** Like the prototype's generate stage, any LLM-authored artifact (a prompt template) is produced at low temperature so the compiled workflow is stable across regenerations of the same specification — users compare builds, so the build of an unchanged spec must not drift.

---

## 4. Table-to-object mapping (quick reference)

Which canonical table each generation stage consumes, and which object it yields. This is the contract an implementer codes against.

| Stage | Reads canonical table(s) | Produces object ([10](10-object-creation-framework.md)) |
|---|---|---|
| 3.1 Build Mapping | Workflow Archetype (§9.13) | *(the parts list — no object yet)* |
| 3.2 Data layer | Workflow Identity (§9.1), Knowledge Source (§9.10), Rule / Decision (§9.11) | Tables / data model, runtime registry, compiled rules, retrievable knowledge assets |
| 3.3 Steps + gates | Process / Step (§9.8), Human-in-the-Loop (§9.6), Trigger (§9.7), Actor / Role (§9.5) | Workflow steps, human gates |
| 3.4 Connectors | Systems / Connector (§9.9), Input / Evidence (§9.4, required only) | Connectors (+ fallbacks) |
| 3.5 UI | Output (§9.3), Trigger (§9.7), Human-in-the-Loop (§9.6), Actor / Role (§9.5) | UI surfaces *(archetype-gated)* |
| 3.6 Audit + reporting | Audit / Provenance (§9.14), Outcome/Success (§9.2), Output (§9.3) | Audit sink, reporting surfaces *(reporting gated)* |
| 3.7 Execution wiring | Process / Step (§9.8), Rule / Decision (§9.11), Human-in-the-Loop (§9.6) | Bound, runnable, verified workflow |

---

## 5. How probabilistic discovery becomes deterministic execution

This is the conceptual payload of the document. Discovery was probabilistic at one point only — reading messy evidence into proposed facts ([01](01-discovery-framework.md) §2.2). Everything downstream of that, including the *execution* generation builds, is made deterministic by three mechanisms working together. Generation's job is to wire all three.

| Mechanism | Where it comes from | What it makes deterministic |
|---|---|---|
| **Rules** | `Rule / Decision` (§9.11), compiled in stage 3.2, bound in stage 3.7 | A step with `deterministic_rule_available = true` becomes a **pure function** over canonical fields — the same inputs always yield the same output. No model in the loop. This is where the workflow's decisions become reproducible. |
| **Confidence thresholds** | `confidence_threshold` on HITL (§9.6) and on steps that reason probabilistically | An LLM-driven step is not trusted blindly: its output carries a confidence, and a threshold deterministically routes low-confidence results to a human. The *boundary* between "trust the model" and "ask a human" is a fixed number, not a vibe. |
| **HITL gates** | `Human-in-the-Loop` (§9.6), generated in stage 3.3, triggered in stage 3.7 | Where judgment genuinely cannot be reduced to a rule, a human gate makes the *control flow* deterministic even though the decision is human: execution **always** pauses at the gate under the gate's `review_trigger`, and the outcome (`approve` / `reject` / `escalate`) follows a fixed path. |

Put together: the probabilistic step (reading evidence) happened once, in Discovery, and was forced into the canonical schema. Generation never re-opens that probabilistic step. It compiles the canonical result into an execution model where **deterministic rules handle what can be ruled, confidence thresholds gate what is reasoned, and human gates handle what must be judged** — and every one of those is a reproducible control decision. A residual step that is genuinely probabilistic (an LLM call) is still bounded: its prompt is fixed, its low-confidence outputs are routed to a human by a fixed threshold, and its every invocation is logged to the audit sink with its confidence and trace.

> The honest framing, preserved from upstream docs: generation does not make the model deterministic. It constrains *where the model's output is allowed to flow* — into a rule-checked, threshold-gated, human-reviewable, fully-audited execution graph — so that the workflow as a whole behaves reproducibly even where one of its steps reasons.

---

## 6. Only necessary artifacts are created

The governing constraint across every stage above: **generation creates only the objects the workflow actually needs.** The three lists in §9.13 (`required` / `optional` / `unnecessary`) are not advisory — they are the build contract.

- **`required_boverse_components`** are built, always.
- **`optional_components`** are built only when an evidenced requirement in the canonical tables justifies them — never on ambition or "might be nice."
- **`unnecessary_components`** are **refused**. Discovery already decided this shape of system does not need them; generation that builds them anyway is over-building, the single most expensive mistake the system can make ([02](02-archetype-framework.md) §1).

This is why stages 3.5 (UI) and 3.6 (reporting) are explicitly archetype-gated, why connectors (3.4) are restricted to the required-input population, and why a Workflow Component emerges with no front end at all. The build posture per archetype ([02](02-archetype-framework.md) §3) supplies the default minimal set; an evidenced secondary archetype or explicit requirement can *add* a justified object, but the default is always the smallest correct build. Generation realizes exactly what Discovery decided — no more.

---

## 7. The end-to-end operating model

The full BoVerse loop, from a user's first sentence to a smarter system, as a single numbered flow. Steps 1–10 are Swarm 1 (Discovery); 11 is the handoff; 12 is Swarm 2 (Build, this document); 13–14 are runtime and learning. This is the canonical narrative the whole corpus serves.

1. **The user describes the desired workflow and uploads evidence.** They state an outcome and upload whatever they have — freeform notes, SOPs, spreadsheets, screenshots, sample outputs, system exports, API/MCP descriptions. They never design the workflow ([01](01-discovery-framework.md) §1).
2. **The Attribute Registry defines what to search for.** The registry (from the 12 Discovery categories, [01](01-discovery-framework.md)) is the list of named attributes CAKE will hunt for in the evidence.
3. **CAKE extracts facts.** CAKE reads documents-as-evidence and proposes canonical facts with confidence and provenance. *This is the one probabilistic step* ([01](01-discovery-framework.md) §2.1–§2.2).
4. **Facts are stored in the canonical tables.** Each proposed fact is forced into a named field, of a named type, drawn from a closed enumeration, linked to its provenance via `fact_id`, and stamped with confidence — the 14 tables of [04](04-canonical-schema.md). The schema is the first deterministic constraint.
5. **The rules/wiki layer interprets them.** Rules normalize, validate, default, and cross-check the canonical facts; reference knowledge is attached. The rules layer is the second deterministic constraint.
6. **The discovery framework identifies universal requirements.** The 12 categories ([01](01-discovery-framework.md)) guarantee every workflow is interrogated for Outcome, Output, Inputs, Trigger, Actors, Human Review, Systems, Knowledge, Decisions, Exceptions, Audit, and Success — the same questions for every workflow.
7. **The archetype is classified.** From the *pattern* of the 12 answers, the rules layer assigns one of the nine archetypes — Workflow Component, Mini-App, Sharp Point Solution, Bridge, App, Decision-Support App, Integrated Workflow, Intelligence Layer, or Operating Layer / OSO ([02](02-archetype-framework.md)) — deterministically, with a tie-break bias against over-building.
8. **The missing-information ledger identifies gaps.** Every gap, ambiguity, and unconfirmed assumption becomes a row in the ledger (§9.12), scored by severity and blocking status, each carrying the single high-value question that would resolve it. Nothing that fails the schema is silently dropped.
9. **The system asks only targeted questions.** Only blocking, high-severity gaps generate clarifying questions; the user answers a short, high-value set rather than a long interview.
10. **Swarm 1 produces the Design Specification plus a sample output and a sample input pack.** The deterministic Workflow Design Specification, plus the Simulation Pack: the input contract, synthetic happy-path and edge-case rows, and golden expected outputs.
11. **The user edits and approves.** The specification and samples are reviewable and editable; approval is the gate that releases Build. Until approval, nothing is built.
12. **Swarm 2 builds only the needed objects.** Per this document: Build Mapping ([09](09-build-mapping-framework.md)) reads the archetype and emits the required/optional/unnecessary lists; generation drives Object Creation ([10](10-object-creation-framework.md)) through stages 0–7 — data layer, steps, HITL gates, connectors, UI, audit/reporting, and execution wiring — refusing every unnecessary object and verifying the build against the Simulation Pack.
13. **The workflow runs with audit, provenance, HITL, and deterministic execution where possible.** At runtime, deterministic rules handle what can be ruled, confidence thresholds gate what is reasoned, human gates handle what must be judged, and every run writes a timestamped, versioned, provenance-linked trace to the audit sink (§5, §3.6).
14. **Learnings update the wiki and registry so future builds get smarter.** What the build revealed — new attributes worth searching for, rules that needed confirmation, connectors and fallbacks that worked, edge cases the Simulation Pack missed — is written back to the Attribute Registry and the rules/wiki layer. The next workflow's Discovery starts from a richer registry and a sharper ruleset. The loop compounds: each build makes the next one faster and more accurate.

```
 1. user: outcome + evidence
 2. Attribute Registry: what to search for
 3. CAKE: extract facts            ◀── the only probabilistic step
 4. canonical tables: store facts  ◀── deterministic constraint #1 (schema)
 5. rules/wiki: interpret          ◀── deterministic constraint #2 (rules)
 6. discovery framework: 12 universal requirements
 7. archetype: classify (1 of 9)
 8. ledger: find gaps
 9. ask only targeted questions
10. Swarm 1 → Design Spec + Simulation Pack (sample output + input pack)
11. user: edit + approve
12. Swarm 2 → build only needed objects (Build Mapping → Object Creation)   ◀── this document
13. run: audit + provenance + HITL + deterministic-where-possible
14. learnings → update registry + wiki  ──────┐
       ▲                                       │
       └───────────────────────────────────────┘  (future builds get smarter)
```

---

## 8. Cross-references

| Document | Relationship to this document |
|---|---|
| [01 — Workflow Discovery Framework](01-discovery-framework.md) | Defines the 12 Discovery categories, CAKE, the Attribute Registry, and the determinism framing (probabilistic extraction → deterministic schema + rules) that generation continues into execution. Source of operating-model steps 1–6, 14. |
| [02 — Workflow Archetype Framework](02-archetype-framework.md) | Defines the nine archetypes and their build postures. `primary_archetype` selects the build path generation follows; the posture supplies the minimal default object set (§3.1, §6). |
| [04 — Canonical Schema](04-canonical-schema.md) | Defines the 14 tables generation reads (§4 mapping), the structural invariants generation validates (§3.0), the evidence-vs-inputs distinction that gates connectors (§3.4), and the §9.13 component lists that are the build contract (§2.1, §6). |
| [09 — Build Mapping Framework](09-build-mapping-framework.md) | The deterministic `archetype + facts → objects` function generation invokes in stage 3.1. Answers *which objects.* |
| [10 — Object Creation Framework](10-object-creation-framework.md) | The construction recipe per object type that generation drives in stages 3.2–3.7. Answers *how to build one object.* |

The numbered operating model in §7 is the canonical end-to-end narrative; other documents in the corpus may cite it by section.
