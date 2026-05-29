# 10 — Object Creation Framework

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** the catalog of objects Swarm 2 (Build) generates, object by object, each defined so it can be produced **conditionally** — only when the Build Mapping says it is needed.
> **Consumes:** the **Workflow Design Specification** and the **Workflow Archetype** record — specifically the `recommended_build_path`, `required_boverse_components`, `optional_components`, and `unnecessary_components` lists (Canonical Schema §9.13 — Workflow Archetype).
> **Reads alongside:** the **Build Mapping** (archetype → build-path → object selection) and the **Simulation Pack** (the synthetic runs each built object must survive).
> **Determinism note:** every object in this catalog is realized from deterministic spec fields. The LLM-driven step happened upstream in Discovery; Build does not re-infer architecture. It compiles spec rows into objects. Where an object embeds a probabilistic step at runtime (e.g. an agent task, an LLM extraction in a Connector), that probabilistic step is always wrapped by the deterministic constraints the spec already fixed — the canonical schema it must emit into, the rules that validate it, and the confidence threshold that routes it to a human.

---

## 1. Purpose of this document

Discovery (Swarm 1) decides **what shape of system this is**. This document defines **what Swarm 2 actually builds** to realize that shape — and, just as importantly, **what it must refuse to build**.

The governing principle of the whole corpus applies with full force here:

```
Discovery determines architecture
  → architecture determines build path
    → build path determines required objects
```

This document is the bottom of that chain: the **required-objects** layer made concrete. It enumerates every object category Swarm 2 can produce, and for each object specifies four things an engineer on any stack needs:

1. **Purpose** — what the object is for.
2. **When it is created** — the archetypes and the spec conditions that switch it on, expressed in the **Build Mapping component vocabulary** (`required_boverse_components` / `optional_components` / `unnecessary_components` from §9.13, plus the per-archetype *needs / does NOT need* build posture).
3. **Inputs from the spec** — the exact Workflow Design Specification fields / canonical tables the object is generated from.
4. **Output shape** — the artifact the object produces or is, named in implementation-agnostic terms.

### 1.1 Conditional, not default — the single most important rule

> **No object in this catalog is built by default. Every object is built only because a specific spec condition switched it on.**

The cost of getting this wrong is the same expensive mistake the archetype framework exists to prevent (over-building / under-building). The object catalog is the place where that discipline is finally enforced — at the level of individual artifacts.

The spread is enormous and intentional:

| Archetype | Rough object footprint | Illustrative objects switched on |
|---|---|---|
| **Workflow Component** | Smallest | One Workflow (often a single step), one input contract, one output contract, provenance on the result. **No** UI, **no** Library, **no** Decision Layer, **no** Reporting Layer. |
| **Sharp Point Solution** | Small | One Workflow, one Connector or upload path, the Rules/Wiki for the domain, a thin intake + output-preview UI, a minimal Audit Layer. |
| **Decision-Support App** | Medium–High | All of the above plus a **Decision Layer** (scoring/ranking/scenarios), a richer review/approval UI, a Reporting Layer. |
| **Integrated Workflow** | High | Multiple Workflows/stages, several Connectors, multi-role UI surfaces, full Audit Layer, app-specific Canonical Tables. |
| **Operating Layer / OSO** | Largest | Nearly all of it — multiple Workflows, a Library + Registry + Canonical Tables + Rules/Wiki (a full Intelligence Layer as a component), broad Connectors, role-aware UI, full Audit + Reporting + Decision Layers. |

A simple workflow that builds the full OSO object set is **broken**, not thorough. A Sharp Point Solution shipped without the Rules/Wiki that makes its output *correct* is **broken**, not lean. The Build Mapping is what arbitrates, and the `unnecessary_components` list in §9.13 is an explicit instruction to *not* generate the named objects no matter how natural they seem.

### 1.2 How "when it is created" is expressed

Throughout §3 each object's **When it is created** clause is written against three switches, in priority order:

1. **Explicit component lists (authoritative).** The component lists hold the 13 Build Mapping component terms (doc `09` §2), which map to the objects in this catalog via the **crosswalk in doc `09` §2.1** — the mapping is not 1:1 by name (e.g. the `front-end app` and `mini-app` components both resolve to the `UI` object §3.7; the `organizational-memory layer` component is a composition, not one object). If an object's mapped component appears in `required_boverse_components`, build it; if it appears in `unnecessary_components`, do **not** build it, even if a condition below would otherwise fire. `optional_components` means "build only if a spec condition below also fires."
2. **Archetype build posture.** The per-archetype *usually needs / usually does NOT need* defaults from the Workflow Archetype Framework (its §3 build-posture lines). These set the starting point when the component lists are silent.
3. **Spec-row conditions.** Concrete predicates over canonical tables — e.g. "a Connector is created for every Systems / Connector row referenced by a required input, a step, or a trigger." These are the deterministic triggers that make generation reproducible.

When two switches conflict, the higher-priority one wins: an explicit `unnecessary_components` entry overrides a posture default, and an explicit `required_boverse_components` entry overrides everything.

---

## 2. The object catalog at a glance

Ten object categories. The order is roughly inner-to-outer: knowledge and data first, then logic, then integration, then surface, then the cross-cutting layers.

| # | Object category | One-line purpose | Built when (headline condition) |
|---|---|---|---|
| 3.1 | **Library** (knowledge / RAG) | Retrievable corpus of reference knowledge the workflow consults at runtime. | A Knowledge Source (§9.10) has `retrieval_required = true`. |
| 3.2 | **Registry** (app-specific attribute registry) | The named set of attributes this specific workflow extracts toward. | Evidence/inputs require structured extraction of recurring attributes. |
| 3.3 | **Canonical Tables** (app-specific) | The persistent, typed store of this workflow's own canonical facts. | The workflow persists structured facts/records across runs. |
| 3.4 | **Rules / Wiki** (app-specific) | The executable decision logic + reference policy that makes output *correct*. | Rule / Decision rows (§9.11) exist, or a Knowledge Source needs canonicalization. |
| 3.5 | **Workflow** (steps, agents, routing, exceptions, HITL, thresholds) | The runnable process itself: ordered steps with determinism flags and gates. | Always (every archetype has at least one). |
| 3.6 | **Connectors** (MCP, API, batch, scheduled ingest, write-back) | The integration surface to external systems. | A Systems / Connector row (§9.9) is referenced by a required input, step, or trigger. |
| 3.7 | **UI** (intake, upload, review, editable report, status, approval, preview) | The human surfaces for input, review, approval, and output. | An Actor (§9.5) interacts, or a HITL gate (§9.6) exists. |
| 3.8 | **Audit Layer** (run logs, provenance, review history, approval trail, versioning) | The traceability spine for runs and facts. | An Audit requirement, a HITL `audit_required`, or any regulated workflow. |
| 3.9 | **Reporting Layer** | Aggregate views and reports across runs / facts. | Outputs include dashboards/reports, or success metrics need tracking over time. |
| 3.10 | **Decision Layer** (scoring, ranking, recommendations, scenarios, sensitivity) | The recommendation/optimization engine. | Decision-Support archetype, or recommendation/scoring is the headline output. |

> **Reading the conditions.** Every "built when" predicate resolves against the Workflow Design Specification, whose fields are the canonical tables defined in the Canonical Schema (referenced below as §9.1–§9.14). The Build Mapping's component lists (§9.13) sit *above* these predicates and can force-on or force-off any object.

> **Object ↔ component mapping.** These ten object categories *realize* the thirteen Build Mapping components (doc `09` §2). The mapping is **not 1:1 by name** — it is grouped for build convenience (the `UI` object realizes components C1 *front-end app* and C2 *mini-app*; the C13 *organizational-memory layer* component is realized as a **composition** of Canonical Tables + Library + Registry + Rules/Wiki, not a single object). The authoritative binding is the **crosswalk in doc `09` §2.1**.

---

## 3. The objects

Each object below is defined with the same four-part structure: **Purpose**, **When it is created**, **Inputs it consumes from the spec**, **Output shape**. A short *Build posture by archetype* line closes each, restating the conditional spread.

---

### 3.1 Library (knowledge / RAG)

**Purpose.** A retrievable corpus of reference knowledge the workflow must *consult* (not execute) at runtime: policy documents, pricing books, SOPs, prior examples, regulations, style guides. The Library is the runtime home of everything that, in Discovery terms, is *reference* rather than *rule* or *input*. Retrieval (RAG / lookup) over the Library lets a step or an agent ground its reasoning in the client's own authoritative material. This is the object that the working prototype's pgvector RAG generalizes into.

**When it is created.** Build a Library **when at least one Knowledge Source (§9.10) row has `retrieval_required = true`** — i.e. the source must be fetched at runtime to ground a step. Force-on if `Library` (or "knowledge"/"RAG") appears in `required_boverse_components`. Skip entirely when the only knowledge is executable rules (those go to Rules/Wiki §3.4, not here) or when `Library` is listed in `unnecessary_components`. By archetype posture: an **Intelligence Layer** or **OSO** almost always needs it; a **Workflow Component** almost never does; a **Sharp Point Solution** needs it only if its correctness depends on consulting a body of reference text it cannot reduce to rules.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Knowledge Source (§9.10): `knowledge_source_name`, `source_type`, `source_location`, `structured_or_unstructured`, `update_frequency`, `owner` | Identifies *what* to ingest, from *where*, and how often it changes (drives re-index cadence). |
| Knowledge Source (§9.10): `retrieval_required = true` | The switch that turns the source into a Library member. |
| Knowledge Source (§9.10): `required_for_steps` | Maps each Library collection to the Workflow steps (§3.5) that query it. |
| Input / Evidence (§9.4) rows of type `discovery_evidence` flagged as reusable reference | Evidence that should persist as queryable reference rather than be consumed once. |

**Output shape.** A named, versioned **knowledge collection**: a set of ingested source documents chunked and embedded for retrieval, each chunk carrying provenance back to its `source_document` and `source_location` (so retrieved context is auditable via §3.8). The Library exposes a **retrieval interface** — query in, ranked grounded passages out, each with a source citation and a relevance score — consumable by Workflow steps and the Decision Layer.

**Build posture by archetype.** Required-ish: Intelligence Layer, OSO. Conditional: Sharp Point Solution, App, Decision-Support, Integrated Workflow (only when reference text must be grounded at runtime). Skip: Workflow Component, most Bridges, most Mini-Apps.

---

### 3.2 Registry (app-specific attribute registry)

**Purpose.** The named, typed set of **attributes this specific workflow extracts toward** — the app-local instance of CAKE's evolving registry concept. Where the corpus-wide Attribute Registry names what *Discovery* searches for, this object is the *runtime* registry the **built** workflow uses to extract recurring facts from each new input instance (e.g. for an estimating workflow: `line_item`, `quantity`, `unit_rate`, `margin_target`). It is what makes runtime extraction land in the same named slots every run, which is the precondition for both the app-specific Canonical Tables (§3.3) and reproducible rule evaluation (§3.4).

**When it is created.** Build a Registry **when the workflow performs structured extraction of recurring attributes from its inputs at runtime** — i.e. when one or more steps (§9.8) consume an input (§9.4) whose `extraction_method` is `llm_extraction`, `parse_table`, `ocr`, or `transcription` *and* the extracted attributes recur run-over-run. Force-on/off per the component lists. By archetype posture: present wherever an **Intelligence Layer**, **OSO**, or extraction-heavy **Integrated Workflow** lives; a simple **Sharp Point Solution** may carry a small implicit registry; a **Bridge** that only routes records typically needs none.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Input / Evidence (§9.4): `extraction_method`, `structured_or_unstructured`, `format` | Determines which inputs require attribute-level extraction and how. |
| Output (§9.3): `required_fields`, `required_sections` | The output's required fields imply the attributes that must be extracted/derived to populate them. |
| Process / Step (§9.8): steps with `probabilistic_reasoning_required = true` consuming those inputs | Anchors each registry attribute to the step that extracts it. |
| Rule / Decision (§9.11): `condition` operands | Rules reference attributes by name; those names must exist in the Registry. |

**Output shape.** A **registry definition**: a list of attribute entries, each with `attribute_name`, `type` (reusing the shared type tokens — `string`, `text`, `float[0..1]`, `int`, `bool`, `enum(...)`, etc.), an optional enumeration of allowed values, a `required_or_optional` flag, and a back-link to the `step_id` that extracts it and any `rule_id` that consumes it. The Registry is *data about extraction*, not the extracted data — the extracted instances land in the Canonical Tables (§3.3).

**Build posture by archetype.** Required-ish: Intelligence Layer, OSO, extraction-heavy Integrated Workflow. Conditional: Decision-Support, App, Sharp Point Solution. Skip: pure routing Bridge, most Mini-Apps, Workflow Components that take already-structured input.

---

### 3.3 Canonical Tables (app-specific)

**Purpose.** The workflow's **own persistent, typed fact store** — the place its runtime-extracted and runtime-produced facts live across runs. This is distinct from the *Discovery* canonical store (the 14 tables in the Canonical Schema that describe the workflow); these app-specific tables hold the *operational* data the built workflow accumulates (e.g. every estimate's line items, every reconciled period's matches, every supplier's canonical record). They give the workflow memory and are the substrate the Reporting Layer (§3.9) and any Intelligence-Layer behavior query.

**When it is created.** Build app-specific Canonical Tables **when the workflow must persist structured facts or records across runs** — signaled by an Output (§9.3) of `output_type = record_update` or `dataset`, by a Connector (§9.9) with `write_required = true` to a system of record, or by any requirement to query past runs. Force-on/off per the component lists. By archetype posture: an **Intelligence Layer** is *defined* by canonicalizing facts into such a store; an **OSO** and most **Apps**/**Integrated Workflows** need them; a one-shot **Sharp Point Solution** or **Workflow Component** typically does **not** (it emits its output and forgets).

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Registry (§3.2) attribute definitions | The columns of the app-specific tables derive from registry attributes. |
| Output (§9.3): `output_type`, `required_fields` | Outputs that *are* records/datasets define the persisted row shape. |
| Process / Step (§9.8): `output_produced` | Intermediate values a step persists become table columns. |
| Systems / Connector (§9.9): `data_objects_accessed`, `write_required` | Entities written back to a system of record define mirrored canonical tables. |
| Audit / Provenance (§9.14): `fact_id` linkage | Every persisted fact carries a provenance link, so the tables interoperate with the Audit Layer (§3.8). |

**Output shape.** A set of **typed tables** (or equivalent persistent structures), each row keyed and carrying: the workflow's run identifier, the extracted/produced values for its attributes, a `confidence_score` where the value was probabilistically derived, and a `fact_id` resolvable to provenance (§9.14 / §3.8). The schema is generated from the Registry plus the Output contract; it is app-specific and lives beside, not inside, the Discovery canonical store.

**Build posture by archetype.** Required: Intelligence Layer, OSO. Required-ish: App, Decision-Support, Integrated Workflow. Skip: Workflow Component, one-shot Sharp Point Solution, pure routing Bridge.

---

### 3.4 Rules / Wiki (app-specific)

**Purpose.** The **executable decision logic plus reference policy** that makes the workflow's output *correct for this business* rather than merely well-formed. This object is the runtime realization of the corpus-wide deterministic discipline: it holds the rules (condition → action) that evaluate over the canonical fields, and the wiki-style reference notes that document *why* a rule exists. It is where the determinism the whole system promises is actually executed. Distinguish it sharply from the Library (§3.1): the Library is *consulted* (probabilistic retrieval grounding a reasoning step); Rules/Wiki is *executed* (deterministic evaluation producing a reproducible decision).

**When it is created.** Build Rules/Wiki **when one or more Rule / Decision rows (§9.11) exist, or when a Knowledge Source (§9.10) has `canonicalization_required = true`** (meaning reference knowledge must be turned into executable rules before use). Force-on/off per the component lists. By archetype posture: nearly every archetype that produces a *correct* output needs at least a thin rule set — a **Sharp Point Solution** needs its domain rules; a **Decision-Support App** layers scoring rules into the Decision Layer (§3.10); an **Intelligence Layer** needs reconciliation rules. The rare skip is a **Workflow Component** whose single operation is purely mechanical (e.g. a format transform) with no business policy.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Rule / Decision (§9.11): `condition`, `action`, `threshold`, `applies_to_step`, `deterministic_status`, `requires_confirmation`, `exception_handling` | The complete definition of each executable rule, its anchor step, and its confirmation/exception behavior. |
| Knowledge Source (§9.10): rows with `canonicalization_required = true`, `rule_or_reference` | Reference knowledge to be canonicalized into rules; the wiki notes preserve the source. |
| Process / Step (§9.8): `deterministic_rule_available = true` | Identifies which steps are governed by rules vs. reasoning. |
| Registry (§3.2) attribute names | The operands a rule's `condition` may legally reference. |

**Output shape.** A **rule set** — an ordered/keyed collection of executable rules, each with a machine-evaluable `condition` over named canonical fields, an `action`, an optional `threshold`, a `deterministic_status`, a `requires_confirmation` flag (rules so flagged do not fire automatically until a human validates them via a HITL gate, §3.7), and `exception_handling` for unevaluable inputs — plus a **wiki** of human-readable notes citing each rule's source (`knowledge_id` or evidence). Rules are anchored to steps via `applies_to_step` so the Workflow object (§3.5) can invoke the right rule at the right point.

**Build posture by archetype.** Required: Decision-Support, Integrated Workflow, Intelligence Layer, OSO, most Sharp Point Solutions and Apps. Conditional: Bridge (conflict-resolution rules only), Mini-App. Skip: purely mechanical Workflow Components.

---

### 3.5 Workflow (deterministic steps, agent tasks, routing, exception handling, confidence thresholds, HITL gates)

**Purpose.** The **runnable process itself** — the ordered set of steps that does the work. Each step is compiled from a Process / Step row into one of three executable forms dictated by that row's determinism flags: a **deterministic rule invocation** (`deterministic_rule_available = true` → calls into Rules/Wiki §3.4), an **agent task** (`probabilistic_reasoning_required = true` → an LLM/agent call, optionally grounded by the Library §3.1), or a **human gate** (`hitl_required = true` → a HITL surface in the UI §3.7). The Workflow object also carries the routing between steps, the exception handling, and the **confidence thresholds** that decide when a probabilistic result is trusted vs. escalated to a human. This is the object the working prototype's five-stage pipeline (ingest, clarify, simulate, generate, deliver) generalizes.

**When it is created.** **Always** — every archetype, even the smallest Workflow Component, produces at least one Workflow object (which may be a single step). What varies is *how many* and *how rich*: a Workflow Component is one step; an Integrated Workflow or OSO is multiple staged Workflows with multi-actor handoffs. There is no `unnecessary_components` case for the Workflow object as a whole, though individual *facets* (agent tasks, HITL gates, multi-step routing) are themselves conditional on the step rows.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Process / Step (§9.8): `sequence_order`, `upstream_dependencies`, `downstream_dependencies` | The execution graph / ordering and parallelism. |
| Process / Step (§9.8): `deterministic_rule_available`, `probabilistic_reasoning_required`, `hitl_required` | The compile target for each step (rule call / agent task / human gate). |
| Process / Step (§9.8): `input_required`, `output_produced`, `actor_responsible`, `system_responsible` | What each step consumes/produces and who/what performs it. |
| Process / Step (§9.8): `error_conditions` | The exception-handling branches per step. |
| Trigger (§9.7): `trigger_type`, `schedule`, `event_condition`, `downstream_action`, `manual_or_automated` | The workflow's entry point(s) and execution mode (on-demand / scheduled / event / queue). |
| Human-in-the-Loop (§9.6): `review_trigger`, `confidence_threshold`, `approval_required`, `rejection_path`, `escalation_path` | The HITL gates, including the confidence threshold below which a probabilistic step routes to a human, and the reject/escalate routing. |
| Rule / Decision (§9.11): `applies_to_step` | Binds each deterministic step to its rule. |

**Output shape.** A **runnable workflow definition**: an ordered, branchable graph of steps where each node declares its kind (`deterministic_rule` \| `agent_task` \| `human_gate`), its inputs/outputs, its responsible actor or system, its exception branches, and — for agent-task nodes — the confidence threshold and the HITL escalation target invoked when confidence falls below it. The definition references Rules/Wiki (§3.4) for rule nodes, the Library (§3.1) for grounded agent nodes, Connectors (§3.6) for system I/O, and UI (§3.7) for human gates. It emits a per-run trace into the Audit Layer (§3.8).

**Build posture by archetype.** Required for **all** archetypes. Complexity scales with archetype: 1 step (Workflow Component) → many staged, multi-actor Workflows (Integrated Workflow, OSO).

---

### 3.6 Connectors (MCP, API, batch upload, scheduled ingestion, write-back actions)

**Purpose.** The **integration surface** — the objects that move data between the workflow and the external systems it touches. A Connector is generated per integration path: an **MCP** client, an **API** client, a **batch/file upload** importer, a **scheduled ingestion** poller, or a **write-back action** that pushes results into a system of record. Connectors are how the API/MCP descriptions in the evidence become live integration in the build. The corpus rule is strict: Connectors are provisioned **only for systems the runtime actually needs**, never for every system merely mentioned in evidence.

**When it is created.** Build a Connector **for every Systems / Connector row (§9.9) that is referenced by a required input, a step, or a trigger** — concretely, when a `connector_id` is named by a `required_workflow_input`/`both` Input row (§9.4), a Step's `system_responsible` (§9.8), or a Trigger's `source_system` (§9.7). The connector *kind* is chosen from `connection_type` / `api_available` / `mcp_available` / `batch_export_available`, and the direction from `read_required` / `write_required`. Force-on/off per the component lists. By archetype posture: a **Bridge** is *defined* by multiple Connectors (its decisive signal is coordinating across existing tools); an **OSO** needs broad cross-system Connectors; a **Sharp Point Solution** often needs just one (or only an upload path); a **Workflow Component** invoked in-process may need none.

> **Evidence vs. runtime (critical).** Connectors are built from the *required-input* population, never from `discovery_evidence`-only rows. A system that supplied a one-time sample during Discovery does **not** get a Connector unless a required input, step, or trigger also references it. This is the same evidence-vs-inputs discipline the Canonical Schema fixes at §9.4.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Systems / Connector (§9.9): `system_name`, `connection_type`, `api_available`, `mcp_available`, `batch_export_available` | Selects the connector kind (MCP / API / batch / file-drop). |
| Systems / Connector (§9.9): `read_required`, `write_required`, `data_objects_accessed`, `sync_frequency` | Direction, the entities exchanged, and polling/sync cadence. |
| Systems / Connector (§9.9): `authentication_required`, `fallback_method`, `integration_complexity` | Auth wiring and the fallback path (e.g. CSV export, manual entry, mock connector) when the preferred connection is unavailable. |
| Trigger (§9.7): `trigger_type = webhook`/`file_arrival`/`record_change`, `source_system` | Event-listener and scheduled-ingestion Connectors. |
| Input / Evidence (§9.4): `input_type` (`required_workflow_input`/`both`), `source_system` | Confirms the system is part of the runtime contract, not evidence-only. |

**Output shape.** A set of **connector instances**, each declaring: target `system_name`, kind (`mcp_client` \| `api_client` \| `batch_importer` \| `scheduled_poller` \| `write_back_action`), direction (`read` \| `write` \| `both`), the `data_objects_accessed` it maps, an auth configuration stub, a sync cadence, and a declared `fallback_method`. Read connectors yield typed input instances to the Workflow (§3.5); write-back connectors accept results and confirm the external state change; all connector activity is logged to the Audit Layer (§3.8).

**Build posture by archetype.** Required (multiple): Bridge, OSO. Required-ish: Integrated Workflow, Intelligence Layer (ingestion connectors). Conditional (often one, or upload-only): Sharp Point Solution, App, Decision-Support, Mini-App. Skip: in-process Workflow Components with no external system.

---

### 3.7 UI (intake screen, upload interface, review dashboard, editable report view, status tracker, approval page, output preview)

**Purpose.** The **human surfaces** of the workflow. This is a family of related screens, each conditionally generated: an **intake screen** (collect the run's inputs), an **upload interface** (accept evidence/required files), a **review dashboard** (work a queue of items needing human judgment), an **editable report view** (let a human correct the output before finalizing), a **status tracker** (show where a run/handoff stands), an **approval page** (a blocking sign-off gate), and an **output preview** (render the finished artifact before delivery). The set generated is dictated entirely by who interacts and where human gates sit. This family is what the partner frontend (boverse.io) replicates from the prototype UX.

**When it is created.** Build a UI surface **when an Actor (§9.5) interacts with the workflow or a HITL gate (§9.6) exists**, and build *only the specific surfaces the spec implies*:

| Surface | Built when |
|---|---|
| Intake screen | A Trigger (§9.7) is `manual`/`semi_automated` **and** a human supplies run inputs. |
| Upload interface | An Input (§9.4) is supplied by a human as an uploaded file (the prototype's dropzone). |
| Review dashboard | A HITL row (§9.6) has `review_trigger` other than `always`-auto, i.e. items queue for human review. |
| Editable report view | An Output (§9.3) has `editable_by_user = true`. |
| Status tracker | The workflow has multi-stage handoffs (multiple Actors across stages) — strongly indicated for Bridge / Integrated Workflow / OSO. |
| Approval page | An Output (§9.3) has `approval_required = true` or a HITL row has `approval_required = true`. |
| Output preview | Any human-facing Output (§9.3) — render before deliver. |

Force-on/off per the component lists. By archetype posture: a **Workflow Component** (no user group, consumer is another workflow) builds **no UI** at all — this is its decisive trait; a **Mini-App** builds a thin/single surface; an **App**/**Decision-Support App** builds a full set; a **Bridge** leans on the status tracker more than on intake/preview.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Actor / Role (§9.5): `role_name`, `interaction_type`, `system_access_required` | Which roles get which surfaces and what they may do. |
| Human-in-the-Loop (§9.6): `human_role`, `required_action`, `review_trigger`, `approval_required`, `evidence_required`, `rejection_path`, `escalation_path` | The review dashboard and approval page: who reviews, what they see, what actions and routings exist. |
| Output (§9.3): `output_format`, `required_sections`, `required_fields`, `editable_by_user`, `approval_required` | The output-preview and editable-report views. |
| Input / Evidence (§9.4): human-supplied inputs, `format`, `example_available` | The intake screen and upload interface fields and accepted formats. |
| Trigger (§9.7): `manual_or_automated` | Whether an intake entry point is needed at all. |

**Output shape.** A set of **screen definitions**, each named by surface type, declaring its bound role(s), the fields/sections it renders or collects (derived from the relevant canonical rows), the actions it exposes (submit / edit / approve / reject / escalate), and its data bindings to the Workflow (§3.5) and Audit Layer (§3.8). Definitions are implementation-agnostic (no framework); the partner frontend maps each to its own components.

**Build posture by archetype.** Full set: App, Decision-Support, OSO. Subset (status-tracker heavy): Bridge, Integrated Workflow. Thin/single surface: Mini-App, Sharp Point Solution. **None:** Workflow Component.

---

### 3.8 Audit Layer (run logs, fact provenance, review history, approval trail, output versioning)

**Purpose.** The **traceability spine** for the built workflow: per-run logs, fact-level provenance, the history of human reviews, the approval trail, and versioning of outputs. It is the runtime counterpart of the Canonical Schema's Audit / Provenance table (§9.14): just as every *discovered fact* carries provenance, every *run* and every *runtime fact* carries an explainable trail. This is what lets a human ask "why did the workflow decide this?" and trace any output value back to the input, rule, agent decision, or human edit that produced it.

**When it is created.** Build an Audit Layer **when the Audit discovery category yields any retention/explainability requirement, when any HITL row (§9.6) has `audit_required = true`, or when any output requires versioning** — and treat it as effectively mandatory for regulated/financial workflows (where the Audit requirement is high) and for any workflow with approval gates. Scale it down, not off, for trivial cases: even a Sharp Point Solution keeps a minimal run log + fact provenance so its output is defensible. Force-on/off per the component lists; in practice it rarely lands in `unnecessary_components` except for a throwaway Workflow Component.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Audit / Provenance (§9.14): `fact_id`, `source_document`, `source_location`, `extracted_value`, `extraction_method`, `confidence_score`, `reviewer`, `review_status`, `timestamp`, `version` | The provenance record shape — carried forward to runtime facts so each value is traceable. |
| Human-in-the-Loop (§9.6): `audit_required`, `human_role`, `required_action` | Which interventions must be logged, and as whom. |
| Output (§9.3): `approval_required`, versioning need | The approval trail and output-version history. |
| Process / Step (§9.8): `deterministic_rule_available`, `probabilistic_reasoning_required` | Lets the log distinguish rule-driven from agent-driven decisions for explainability. |
| Rule / Decision (§9.11): `rule_id`, `applies_to_step` | Records which rule fired on which step in each run. |

**Output shape.** A **run-and-fact audit store** producing, per run: an ordered run log of step executions (which step, which rule or agent, inputs consumed, output produced, confidence); a **provenance record** per runtime fact (keyed by `fact_id`, resolving value → source); a **review history** (who reviewed, the outcome, the timestamp); an **approval trail** (each blocking sign-off); and an **output version history**. The store is queryable for explainability and feeds the Reporting Layer (§3.9).

**Build posture by archetype.** Required (high): Integrated Workflow, Decision-Support, Intelligence Layer, OSO, and any regulated/financial workflow. Required-ish (minimal): Sharp Point Solution, App, Bridge, Mini-App. Skip (only if explicitly unnecessary): throwaway Workflow Component.

---

### 3.9 Reporting Layer

**Purpose.** The **aggregate view across runs and facts** — dashboards, periodic reports, and the metrics that show whether the workflow is working over time. Where the Audit Layer (§3.8) explains a *single* run, the Reporting Layer summarizes *many*: throughput, accuracy against targets, exception rates, success-metric trends. It is the object that turns the Success discovery category and the Outcome's success metrics into something a human can watch.

**When it is created.** Build a Reporting Layer **when an Output (§9.3) is itself a `dashboard` or recurring `report`, or when the Outcome/Success spec defines metrics that must be tracked over time** (e.g. an Outcome (§9.2) with a `success_metric`, or success criteria the Simulation Pack also grades against). Force-on/off per the component lists. By archetype posture: an **App**, **Decision-Support App**, **Intelligence Layer**, and **OSO** typically need it; a **Sharp Point Solution** or **Workflow Component** that produces a one-shot artifact and tracks nothing over time does **not** — putting it in `unnecessary_components` is common and correct for those.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Outcome (§9.2): `success_metric`, `business_value`, `time_savings`, `revenue_impact` | The headline metrics the reports surface. |
| Output (§9.3): `output_type = dashboard`/`report`, `output_frequency` | Whether reporting *is* the output, and at what cadence. |
| Canonical Tables (§3.3) | The persisted facts the reports aggregate over. |
| Audit Layer (§3.8) run logs | Operational metrics: run counts, exception rates, review/approval throughput. |
| Process / Step (§9.8): `error_conditions` | Exception-rate reporting. |

**Output shape.** A set of **report/dashboard definitions**, each declaring its metric(s), the source (Canonical Tables and/or Audit Layer), the aggregation, the cadence (`output_frequency`), and the audience (an Actor `role_name`). Output is implementation-agnostic chart/table specifications plus the underlying queries; the partner frontend renders them.

**Build posture by archetype.** Required-ish: App, Decision-Support, Intelligence Layer, OSO. Conditional: Integrated Workflow, Bridge (flow/throughput reporting). Skip: one-shot Sharp Point Solution, Workflow Component, most Mini-Apps.

---

### 3.10 Decision Layer (scoring, ranking, recommendations, scenario logic, sensitivity analysis)

**Purpose.** The **recommendation and optimization engine** — the object that produces *what to do* or *what is likely*, with reasoning, rather than merely processed data. It houses scoring models, ranking logic, recommendation generation, scenario comparison, and sensitivity analysis. It is the defining object of the **Decision-Support App** archetype and a frequent component of an **Intelligence Layer** or **OSO**. It sits downstream of the Rules/Wiki (§3.4) and the Canonical Tables (§3.3): rules and canonical facts feed scores; scores feed rankings, recommendations, and scenarios.

**When it is created.** Build a Decision Layer **when the headline output is a recommendation, score, ranking, scenario, or optimized plan** — concretely, when the primary archetype is **Decision-Support App**, or when an Output (§9.3) is `output_type = decision` whose value is a recommendation/score, or when Decisions/Knowledge in the spec describe scoring/optimization that is the *product* rather than incidental routing. Force-on/off per the component lists. By archetype posture: **Decision-Support App** always; **Intelligence Layer** / **OSO** often (as one component among many); a plain **App** that only *presents* data, a **Sharp Point Solution** that only *produces an artifact*, and a **Bridge** that only *moves work* do **not** need it — for those it belongs in `unnecessary_components`.

**Inputs it consumes from the spec.**

| Spec source | Used for |
|---|---|
| Workflow Archetype (§9.13): `primary_archetype = decision_support` (and `recommended_build_path`) | The decisive switch that turns the Decision Layer on. |
| Outcome (§9.2): `decision_supported`, `success_metric` | The decision the layer must support and how its quality is judged. |
| Output (§9.3): `output_type = decision`, `required_fields`, `quality_criteria` | The shape of the recommendation/score and its acceptance criteria. |
| Rule / Decision (§9.11): scoring/threshold rules | The deterministic scoring rules the layer evaluates. |
| Canonical Tables (§3.3) + Library (§3.1) | The structured facts and grounded reference the scores and rationale draw on. |
| Input / Evidence (§9.4): `structured_or_unstructured` | Confirms the structured + unstructured input mix that Decision-Support is signed by. |

**Output shape.** A **decision engine definition** producing, per run: a **score** (with the rule/feature contributions that produced it), a **ranking** of options, a **recommendation** with generated rationale (grounded via the Library §3.1 and explainable via the Audit Layer §3.8), optional **scenario comparisons** (alternative inputs → alternative outcomes), and optional **sensitivity analysis** (which inputs most move the result). Each output carries a `confidence_score` and, where below the HITL `confidence_threshold` (§9.6), routes to a human via the review/approval UI (§3.7).

**Build posture by archetype.** Required: Decision-Support App. Conditional (as a component): Intelligence Layer, OSO, occasionally Integrated Workflow. Skip: Workflow Component, plain App, Sharp Point Solution, Bridge, Mini-App.

---

## 4. Worked spread: the same catalog, three archetypes

To make the conditional principle concrete, here is the object set switched on for three archetypes the corpus uses as running examples. Every column draws from the *same* catalog; the difference is entirely which objects the Build Mapping switched on.

| Object (§) | Sharp Point Solution (estimating, one-shot) | Decision-Support App (account-risk scoring) | OSO (organization-wide operating layer) |
|---|---|---|---|
| Library (3.1) | Only if reference text must be grounded | Likely (comparables, policy) | Yes |
| Registry (3.2) | Small / implicit | Yes | Yes |
| Canonical Tables (3.3) | No (emit + forget) | Yes (scored accounts persist) | Yes |
| Rules / Wiki (3.4) | Yes (pricing rules) | Yes (scoring rules) | Yes |
| Workflow (3.5) | Yes (one workflow) | Yes | Yes (many, staged) |
| Connectors (3.6) | One, or upload-only | One or few (read sources) | Many (cross-system) |
| UI (3.7) | Thin: intake + preview (+ approval if over threshold) | Full: intake, review dashboard, editable view, preview | Full + status tracker, role-aware |
| Audit Layer (3.8) | Minimal (run log + provenance) | High (decision explainability) | Full |
| Reporting Layer (3.9) | No | Yes (score trends) | Yes |
| Decision Layer (3.10) | No | **Yes (the defining object)** | Yes (as a component) |

The Sharp Point Solution builds roughly four objects; the OSO builds nearly all ten. Same catalog, same definitions — only the switches differ. That is the entire point of building conditionally.

---

## 5. Cross-references

| Document | Relationship |
|---|---|
| Workflow Discovery Framework (`01`) | Defines the 12 discovery categories whose answers populate the canonical store this document's objects are generated from. |
| Workflow Archetype Framework (`02`) | Defines the 9 archetypes and their *needs / does NOT need* build postures — switch #2 in every "When it is created" clause. The Decision Layer (§3.10) is the defining object of its Decision-Support App archetype. |
| Canonical Workflow Design Schema (`04`) | Defines the 14 canonical tables (§9.1–§9.14) that *are* the Workflow Design Specification fields each object consumes. The Workflow Archetype table (§9.13) supplies the authoritative `required_boverse_components` / `optional_components` / `unnecessary_components` lists — switch #1, which overrides all others. |
| **Build Mapping** (archetype → build path → objects) | Owns the mapping from `recommended_build_path` to this catalog; resolves the component lists into a concrete object selection. This document defines the *objects*; the Build Mapping defines the *selection function* over them. |
| **Workflow Design Specification** | The deterministic input artifact. Every "Inputs it consumes from the spec" table cites its fields by canonical-table section. |
| **Simulation Pack** | The synthetic runs (built from the required-input population, §9.4) that each generated object — especially the Workflow (§3.5), Connectors (§3.6), Rules/Wiki (§3.4), and Decision Layer (§3.10) — must survive before the build is accepted. |

---

## 6. Quick-reference card

> Pinned summary for Build Swarm authors. Canonical, copy-safe. Every object is **conditional** — the headline switch is shown.

| Object | Built when (headline switch) | Skipped when |
|---|---|---|
| **Library** (3.1) | A Knowledge Source has `retrieval_required = true` | Knowledge is all executable rules, or no runtime grounding needed |
| **Registry** (3.2) | Steps extract recurring attributes at runtime (`extraction_method` ≠ direct) | Input arrives already structured; pure routing |
| **Canonical Tables** (3.3) | Workflow persists facts/records across runs | One-shot emit-and-forget |
| **Rules / Wiki** (3.4) | Rule/Decision rows exist, or knowledge needs canonicalization | Purely mechanical single-operation component |
| **Workflow** (3.5) | **Always** (≥1 per workflow) | Never (only individual facets are optional) |
| **Connectors** (3.6) | A Systems/Connector row is referenced by a required input, step, or trigger | System is evidence-only; in-process component |
| **UI** (3.7) | An Actor interacts or a HITL gate exists (build only the implied surfaces) | Consumer is another workflow (Workflow Component) |
| **Audit Layer** (3.8) | Any retention/explainability/approval/versioning requirement | Throwaway component only |
| **Reporting Layer** (3.9) | Output is a dashboard/report, or metrics tracked over time | One-shot artifact, nothing tracked |
| **Decision Layer** (3.10) | Headline output is a recommendation/score/ranking/scenario (Decision-Support) | Output only presents data, produces an artifact, or moves work |
