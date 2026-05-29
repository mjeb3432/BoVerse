# 09 — Build Mapping Framework

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** the deterministic map from **archetype → BoVerse objects to build**.
> **Consumes:** the `primary_archetype` / `secondary_archetype` classification (archetype framework, doc `02`) and the Workflow Archetype table (`archetype_id`, canonical schema §9.13).
> **Feeds:** the Build Swarm's object-selection and generation logic (Object Creation and Generation documents), which **realize** the component vocabulary defined here as build objects (see the component → object crosswalk in §2.1).
> **Status:** Portable IP. Implementation-agnostic. An engineer on any stack must be able to implement against this document without further questions.

---

## 1. Purpose of this document

This is the document that turns a classification into a **build plan without over-building or under-building**. It closes the causal chain the whole corpus is built on:

```
Discovery determines architecture
  → architecture determines build path
    → build path determines required objects
```

The first arrow is the archetype framework (doc `02`): it assigns each request exactly one `primary_archetype` (and zero or one `secondary_archetype`) from the **9 canonical archetypes**. This document owns the second and third arrows. For each archetype it states:

- **Likely NEEDS** — the BoVerse objects the archetype typically requires.
- **Likely does NOT need** — the objects the archetype typically should *not* build, so the Build Swarm refuses to provision them by default.
- **Recommended build path** — a one-line summary of the build order for that archetype.

These map directly onto the three string-array fields of the Workflow Archetype table (canonical schema §9.13):

| §9.13 field | Filled from this document |
|---|---|
| `required_boverse_components` | the archetype's **Likely NEEDS** list (minus anything the evidence proves absent) |
| `optional_components` | components a secondary archetype or an explicit evidenced requirement adds |
| `unnecessary_components` | the archetype's **Likely does NOT need** list |
| `recommended_build_path` | the archetype's one-line build path (§3) |

> **The central discipline.** The default for every archetype is **minimal**. A component leaves the *does-NOT-need* column and enters the build only when justified by (a) the chosen archetype's own NEEDS list, (b) an evidenced `secondary_archetype`, or (c) an explicit requirement in the canonical facts. "It might be nice later" is never sufficient — that is a future-fit note in the Missing Information / Ambiguity Ledger (§9.12), not a build target.

### 1.1 Where determinism lives (carried forward)

Extraction of facts from messy evidence is **probabilistic** (LLM-driven; see CAKE in doc `01`). This document is **not** another probabilistic step. It is a **deterministic lookup table**: given a `primary_archetype` (a closed enum) and an optional `secondary_archetype`, the required / optional / unnecessary component sets are fixed. The same archetype always yields the same default build posture. The probabilistic work already happened upstream (taming evidence into canonical facts and classifying the archetype); the build mapping then reads that classification and fires deterministically — exactly as the rules layer (§9.11) does over canonical fields.

---

## 2. Component vocabulary (canonical)

Every NEEDS / does-NOT-need list below is expressed in these **13 component terms** and no others. These 13 terms are the canonical vocabulary for *classification* and for the §9.13 component lists. The Object Creation and Generation documents **realize** them as build objects; because object names there are grouped for build convenience (e.g. the two UI components C1/C2 become one `UI` object), the authoritative binding is the **component → object crosswalk in §2.1** — consult it rather than matching names directly.

| # | Component | What it is | Backing canonical tables |
|---|---|---|---|
| C1 | **front-end app** | A full user-facing UI: multiple screens, navigation, an ongoing user relationship. | Output §9.3, Actor §9.5 |
| C2 | **mini-app** | A thin single-screen / single-panel UI for one narrow job for one user. | Output §9.3, Actor §9.5 |
| C3 | **backend workflow** | A server-side orchestration of steps (the executable process), with no UI of its own. | Process/Step §9.8, Trigger §9.7 |
| C4 | **canonical table** | A typed, persistent store of the workflow's facts/records (one focused table, or a set). | any of §9.1–§9.14 as data |
| C5 | **attribute registry** | The evolving list of attributes to extract/track (CAKE's searchable targets). | drives extraction into §9.x |
| C6 | **rules/wiki layer** | Deterministic condition→action rules plus the reference wiki they encode. | Rule/Decision §9.11, Knowledge §9.10 |
| C7 | **knowledge/RAG library** | A retrievable corpus of reference documents consulted at runtime. | Knowledge §9.10 (`retrieval_required`) |
| C8 | **connector layer (MCP/API/batch)** | Clients that read/write external systems via API, MCP, or batch export. | Systems/Connector §9.9 |
| C9 | **HITL gates** | Human-in-the-loop review/approval points that block until a person acts. | Human-in-the-Loop §9.6, Actor §9.5 |
| C10 | **audit/provenance layer** | Per-fact and per-run traceability: source, value, reviewer, version. | Audit/Provenance §9.14 |
| C11 | **dashboards/reporting layer** | Aggregate views/reports over many runs or many records. | Output §9.3 (`dashboard`), Outcome §9.2 |
| C12 | **decision/scoring layer** | Recommendation, scoring, ranking, scenario, and sensitivity logic. | Rule/Decision §9.11, Outcome §9.2 |
| C13 | **organizational-memory layer** | A persistent shared memory reconciled across many workflows (the org's brain). | canonical tables §9.x as shared store |

> **Note on overlap with the schema.** These 13 components are *build objects*; the 14 canonical tables (§9.1–§9.14) are the *data shape* those objects read and write. Several components touch the same tables (e.g. both **rules/wiki layer** and **decision/scoring layer** read Rule/Decision §9.11). That is expected: the component is what gets *built*; the table is what it *operates on*.

### 2.1 Component → object crosswalk (authoritative)

This document classifies builds in the 13 component terms above; the Object Creation document ([10](10-object-creation-framework.md)) groups them into **10 build objects** for convenience. The mapping is intentionally **not 1:1 by name** — it is the authoritative binding between the two documents. The component terms remain canonical for `required_boverse_components` / `optional_components` / `unnecessary_components`; this table says which object(s) realize each.

| # | Component (this doc, §2) | Realized as object(s) in doc 10 §3 |
|---|---|---|
| C1 | front-end app | **UI** (§3.7) — full multi-screen set |
| C2 | mini-app | **UI** (§3.7) — thin single surface |
| C3 | backend workflow | **Workflow** (§3.5) |
| C4 | canonical table | **Canonical Tables** (§3.3) |
| C5 | attribute registry | **Registry** (§3.2) |
| C6 | rules/wiki layer | **Rules / Wiki** (§3.4) |
| C7 | knowledge/RAG library | **Library** (§3.1) |
| C8 | connector layer (MCP/API/batch) | **Connectors** (§3.6) |
| C9 | HITL gates | a facet of **Workflow** (§3.5, the `human_gate` step kind) surfaced by **UI** (§3.7, review dashboard / approval page) |
| C10 | audit/provenance layer | **Audit Layer** (§3.8) |
| C11 | dashboards/reporting layer | **Reporting Layer** (§3.9) |
| C12 | decision/scoring layer | **Decision Layer** (§3.10) |
| C13 | organizational-memory layer | **composition** — Canonical Tables (§3.3) + Library (§3.1) + Registry (§3.2) + Rules/Wiki (§3.4) assembled as a shared cross-workflow store (an Intelligence Layer used as a component); no single dedicated object |
| — | graph layer (extension of C4) | a relationship-aware extension of **Canonical Tables** (§3.3) |

> **Why not 1:1.** Two components (C1, C2) collapse into one object (UI) because they are the same build surface at different sizes; one component (C13) expands into a composition because an organizational memory *is* an assembly of simpler objects. Everything else is one-to-one with a renamed label. The crosswalk is the contract; the names on either side are labels for the same things.

---

## 3. Build-path summary (all 9 archetypes)

The one-line `recommended_build_path` per archetype, ordered by the canonical build-cost order (lowest first — the same order as the archetype framework's tie-break, doc `02` §2.2). Detailed NEEDS / does-NOT-need follow in §4.

| # | Archetype | One-line recommended build path |
|---|---|---|
| 1 | **Workflow Component** | Define input contract → backend workflow (one operation) → rules/transform logic → output contract → provenance. No UI. |
| 2 | **Mini-App** | One mini-app screen → thin backend workflow → one/two input contracts → light HITL → provenance. |
| 3 | **Sharp Point Solution** | Focused canonical table → limited attribute registry → simple UI → backend workflow → output template → rules layer → one review gate → audit. |
| 4 | **Bridge** | Actor table + system table + state/event table → connector layer to each system → handoff/routing logic → reminders/escalations → status dashboard. |
| 5 | **App** | Front-end app → persistent canonical table(s) → backend workflow(s) → output generation → auth/roles → HITL where needed → audit. |
| 6 | **Decision-Support App** | Canonical facts + assumptions table → decision/scoring + sensitivity logic → recommendation rules → scenario outputs → front-end app → human approval → explainability (audit). |
| 7 | **Integrated Workflow** | Multi-stage backend workflows → input/output contracts per stage → actor roles + HITL handoffs → rules/decision branching → persistent process-state canonical tables → audit trail. |
| 8 | **Intelligence Layer** | Broad attribute registry → canonical tables → knowledge/RAG library → graph layer → missing-info ledger → reconciliation + recurring update jobs → query surface. |
| 9 | **Operating Layer / OSO** | Multiple backend workflows → organizational-memory layer (incl. an Intelligence Layer) → cross-system connectors → org state model → task/event routing → reporting → executive front-end layer. |

> **"Graph layer" in archetypes 8–9.** A *graph layer* is the relationship-aware extension of the **canonical table** component (C4): entities plus typed relationships over the canonical facts, enabling traversal/analysis. It is only ever a NEED for the Intelligence Layer and the Operating Layer / OSO; for every other archetype a graph layer is in the *does-NOT-need* column.

---

## 4. Archetype → component mapping

Each archetype below lists its **Likely NEEDS** and **Likely does NOT need** as the component terms from §2, then restates the one-line build path. The "Why" column ties each decision back to the archetype's decisive signals (doc `02` §3) so the mapping is auditable, not arbitrary.

---

### 4.1 Workflow Component

A reusable backend capability, often with **no front end**, performing one well-defined operation other workflows call. Decisive signals: one operation framed as a step not a product; no user group named; output consumed by another process.

| Likely NEEDS | Why |
|---|---|
| **backend workflow** (C3) | The one operation *is* the deliverable. |
| **rules/wiki layer** (C6) | The transform/validate/route logic is the substance of the operation. |
| **audit/provenance layer** (C10) | The caller must trust the result; provenance on the output is the contract. |
| input contract + output contract (data shape, not a separate component) | Defines what the operation consumes and returns for its caller. |

| Likely does NOT need | Why |
|---|---|
| **front-end app** (C1), **mini-app** (C2) | No human uses it directly; the consumer is "the system" / another workflow. |
| **dashboards/reporting layer** (C11) | No aggregate human-facing view. |
| **knowledge/RAG library** (C7) | Logic is rule-based, not retrieval-based, unless evidence shows otherwise. |
| **connector layer** (C8) | It is *called*; it does not itself orchestrate external systems (unless a step proves it must). |
| **organizational-memory layer** (C13), graph layer | Far above a single-operation capability. |
| persistence beyond the call, multiple actors | A component is stateless-by-default and consumer-agnostic. |

**Build path.** Define input contract → backend workflow (one operation) → rules/transform logic → output contract → provenance. No UI.

---

### 4.2 Mini-App

A small bounded tool that does one narrow job inside a larger workflow for one user. Decisive signals: one narrow job explicitly part of a bigger process; one user group with light interaction; thin/single-screen front end implied.

| Likely NEEDS | Why |
|---|---|
| **mini-app** (C2) | One thin UI surface for the single user to review/adjust/approve. |
| **backend workflow** (C3) | A light process behind the screen to do the narrow job. |
| **HITL gates** (C9) | The interaction *is* a human touch (review / adjust / approve). |
| **audit/provenance layer** (C10) | What the human saw and decided is traceable. |
| one or two input contracts (data shape) | The narrow job's inputs, often the output of an upstream step. |

| Likely does NOT need | Why |
|---|---|
| **front-end app** (C1) | Thin/single-screen, not a full multi-screen product. |
| **connector layer** (C8) | Lives *inside* a larger workflow; it does not coordinate external systems itself. |
| **dashboards/reporting layer** (C11) | One in-progress item, not aggregate analytics. |
| **decision/scoring layer** (C12) | Light interaction, not a recommendation engine (a pre-fill is fine; a scoring layer is not). |
| **knowledge/RAG library** (C7), **organizational-memory layer** (C13), graph layer | Out of scope for one narrow job. |

**Build path.** One mini-app screen → thin backend workflow → one/two input contracts → light HITL → provenance.

---

### 4.3 Sharp Point Solution

A focused, end-to-end solution to one painful job. Decisive signals: **one main output + one user group + limited inputs**; a single painful job named with urgency; end-to-end ask producing only one artifact.

| Likely NEEDS | Why |
|---|---|
| **backend workflow** (C3) | The end-to-end process from input to the one finished artifact. |
| **canonical table** (C4) — focused | A focused store for runs of this one job (not a broad model). |
| **attribute registry** (C5) — limited | A small set of attributes for this single job's inputs/output. |
| **front-end app** (C1) — simple | A simple UI to run the job and get the artifact (single-purpose, not a platform). |
| output template (data shape) | The shape of the one artifact the workflow emits. |
| **rules/wiki layer** (C6) | The domain rules that make the one output correct. |
| **HITL gates** (C9) — one review gate | A single review/approval before the artifact is released. |
| **audit/provenance layer** (C10) | The artifact must be explainable/defensible. |

| Likely does NOT need | Why |
|---|---|
| **organizational-memory layer** (C13) | One job for one audience does not need broad org memory. |
| complex cross-system state / **connector layer** (C8) | No multi-system coordination is the goal (absence of "keep in sync" language keeps it sharp). |
| heavy **dashboards/reporting layer** (C11) | One artifact per run, not analytics across many runs. |
| graph layer | No relationship store for a single bounded job. |
| multiple user roles, **decision/scoring layer** (C12) | One user group; the output is an artifact, not a recommendation engine. |

**Build path.** Focused canonical table → limited attribute registry → simple UI → backend workflow → output template → rules layer → one review gate → audit.

> **Growth note.** A Sharp Point Solution becomes an **App** (§4.5) when persistent, repeatable, multi-session interaction is added, and can later *seed* an **Intelligence Layer** (§4.8). Until the evidence shows that, hold at the Sharp Point posture.

---

### 4.4 Bridge

An orchestration layer that keeps work moving across tools, teams, or systems — flow, not output. Decisive signals: **coordinating status/handoffs across multiple existing tools**; two or more named external systems already in use; the goal is flow, not a single deliverable.

| Likely NEEDS | Why |
|---|---|
| **canonical table** (C4) — actor table + system table + **state/event table** | The coordination state model: who is involved, which systems, and the live status/events of each item in flight. |
| **connector layer (MCP/API/batch)** (C8) | One client per named external system — the defining build of a Bridge. |
| **backend workflow** (C3) — handoff/routing logic | The logic that moves items between systems and parties (route, notify, keep in sync, hand off). |
| reminders / escalations (handoff logic) | Chasing stalled items and escalating; encoded in the routing logic and surfaced via notifications. |
| **dashboards/reporting layer** (C11) — status dashboard | A status view so coordination is visible (the one report a Bridge *does* need). |
| **audit/provenance layer** (C10) | A log of what moved where, and any conflict resolution. |

| Likely does NOT need | Why |
|---|---|
| heavy report generation beyond the status dashboard | The value is flow, not produced reports. |
| large **knowledge/RAG library** (C7) / document library | Coordination, not reference-heavy reasoning. |
| **canonical table** as a big analytical store | State/event coordination, not analytics over canonical facts. |
| heavy **front-end app** (C1) of its own | A status dashboard suffices; it is not a destination product. |
| complex per-item business rules / **decision/scoring layer** (C12) | Routing and sync, not deep per-item judgement. |
| **organizational-memory layer** (C13), graph layer | A Bridge coordinates one set of tools; it is not an org-wide memory. |

**Build path.** Actor table + system table + state/event table → connector layer to each system → handoff/routing logic → reminders/escalations → status dashboard.

> **Bridge vs. Workflow Component.** A Workflow Component routes *one item on request*; a Bridge *continuously keeps many items moving across systems*. Continuity + multiple systems is what adds the connector layer, the state/event table, and the status dashboard.

---

### 4.5 App

A full user-facing application with a clear business outcome: front end, persistent data, repeatable interaction. Decisive signals: front end + persistent data + repeatable interaction all present; a clear single outcome framed as a product; one or a few user groups returning over time.

| Likely NEEDS | Why |
|---|---|
| **front-end app** (C1) | A real multi-screen UI people return to — the defining trait. |
| **canonical table** (C4) — persistent | Saved data and state across sessions. |
| **backend workflow** (C3) — one or more | The structured workflow(s) users run repeatedly. |
| output generation (template + render) | The real outputs the app produces. |
| auth / roles (data + access) | One or a few user groups returning over time need basic auth/roles. |
| **HITL gates** (C9) — where needed | Review/approval where the process calls for it. |
| **audit/provenance layer** (C10) | Saved work and outputs must be traceable. |

| Likely does NOT need | Why |
|---|---|
| **connector layer** (C8) | Cross-system orchestration is not the job, unless a **Bridge** secondary fires. |
| **organizational-memory layer** (C13), graph layer | A single product is not an org-wide intelligence store. |
| **decision/scoring layer** (C12) | If recommendations/reasoning were the core, it would be a **Decision-Support App** (§4.6). |
| big **knowledge/RAG library** (C7) | Only if the product's job actually requires retrieval; not by default. |

**Build path.** Front-end app → persistent canonical table(s) → backend workflow(s) → output generation → auth/roles → HITL where needed → audit.

> **App vs. Sharp Point Solution.** The dividing line is *persistence + repeatable interaction*. One-shot artifact → Sharp Point; a place users return to with saved state → App.

---

### 4.6 Decision-Support App

An application whose core output is recommendations, scenarios, priorities, or decisions with reasoning. Decisive signals: **recommendations/scenarios/priorities produced from structured + unstructured inputs**; recommend/prioritize/score/optimize language; the decision points are the product.

| Likely NEEDS | Why |
|---|---|
| **canonical table** (C4) — canonical facts **+ assumptions table** | The structured inputs the recommendation reasons over, plus the explicit assumptions behind each scenario. |
| **decision/scoring layer** (C12) — scoring + **sensitivity logic** | The scoring/ranking/optimization and the sensitivity analysis are the product. |
| **rules/wiki layer** (C6) — recommendation rules | The rules that turn facts + assumptions into a recommendation. |
| scenario outputs (output templates) | Scenario comparisons / ranked options as the deliverable shape. |
| **front-end app** (C1) | A UI to present and explore the recommendations and scenarios. |
| **HITL gates** (C9) — human approval | A human approves/overrides the recommended action. |
| **audit/provenance layer** (C10) — explainability | "Why did it recommend this?" must be answerable; rationale is traced. |

| Likely does NOT need | Why |
|---|---|
| **connector layer** (C8) as a primary job | Orchestration is not the point; recommending is. |
| **organizational-memory layer** (C13) / shared canonical store across many workflows | Only if an **Intelligence Layer** secondary fires; not by default. |
| heavy **dashboards/reporting layer** (C11) beyond scenario/recommendation views | The deliverable is the recommendation, not broad reporting. |
| graph layer | Unless the reasoning genuinely needs relationships (then Intelligence Layer secondary). |

**Build path.** Canonical facts + assumptions table → decision/scoring + sensitivity logic → recommendation rules → scenario outputs → front-end app → human approval → explainability (audit).

> **Decision-Support vs. App.** A plain App *processes and presents*; a Decision-Support App *recommends and reasons*. The assumptions table, sensitivity logic, and explainability are what an App does *not* carry.

---

### 4.7 Integrated Workflow

A multi-step internal process with multiple inputs, actors, outputs, and decision points. Decisive signals: multiple inputs **and** actors **and** outputs **and** decision points all present; distinct roles act at distinct stages with handoffs; the orchestrated whole is the value.

| Likely NEEDS | Why |
|---|---|
| **backend workflow** (C3) — multiple stages | Several structured stages make up the process. |
| input/output contracts per stage (data shape) | Each stage consumes and produces defined data. |
| **canonical table** (C4) — persistent **process state** | The state of an item as it moves through stages. |
| **actor** roles + **HITL gates** (C9) — handoffs | Distinct roles act at distinct stages; handoffs are human gates. |
| **rules/wiki layer** (C6) — decision branching | The branch/route logic by case type at each decision point. |
| **front-end app** (C1) | Surfaces for the roles to do their stage's work (often multiple role-aware screens). |
| **audit/provenance layer** (C10) — audit trail | A multi-actor staged process must be reconstructable end to end. |

| Likely does NOT need | Why |
|---|---|
| **organizational-memory layer** (C13) above it | One process, not an org-wide operating surface — unless an **OSO** signal fires. |
| **canonical table** as a cross-*program* analytical store | State for *this* process; not analytics across other programs (unless a secondary fires). |
| **connector layer** (C8) as the defining job | Internal stages, not cross-tool coordination — that is a **Bridge** (§4.4). Connectors only where a specific stage reads/writes a system. |
| graph layer | No relationship store needed for an internal staged process. |

**Build path.** Multi-stage backend workflows → input/output contracts per stage → actor roles + HITL handoffs → rules/decision branching → persistent process-state canonical tables → audit trail.

> **Integrated Workflow vs. Bridge.** Integrated Workflow *executes a process internally* (the steps are the system's own). Bridge *coordinates work across tools the user already owns*. Internal stages → Integrated Workflow; cross-tool flow → Bridge.

---

### 4.8 Intelligence Layer

A layer that canonicalizes information into a persistent reconciled store supporting analysis across many workflows. Decisive signals: **canonicalizing facts across many sources into one persistent store**; outputs are queries/analyses over canonical facts, not one fixed report; serves more than one downstream workflow.

| Likely NEEDS | Why |
|---|---|
| **attribute registry** (C5) — broad | A wide, evolving set of attributes across many heterogeneous sources. |
| **canonical table** (C4) — the reconciled store | The persistent canonical facts with confidence and provenance (CAKE's evolving registries). |
| graph layer (relationship-aware extension of C4) | Entities + typed relationships for traversal/analysis over the canonical facts. |
| **knowledge/RAG library** (C7) | Retrievable reference corpus feeding canonicalization and queries. |
| missing-info ledger (Missing Information / Ambiguity Ledger, §9.12) | Explicit tracking of what is not yet known across the many sources. |
| reconciliation / dedup logic + **recurring update** jobs (backend workflow, C3) | Many sources must be reconciled into one model and refreshed over time. |
| query/analysis surface (over the canonical store) | Outputs are queries/analyses, not one fixed report. |
| **audit/provenance layer** (C10) | Every canonical fact traces to its source(s). |

| Likely does NOT need | Why |
|---|---|
| a single fixed end-user **backend workflow** as its reason for existing | Its purpose is the store + queries serving *many* workflows, not one workflow. |
| heavy task/event **connector**-driven orchestration (C8) | Ingestion connectors yes; cross-system *task orchestration* is a Bridge/OSO concern. |
| **organizational-memory layer** (C13) *above* it / executive layer | Until that org-wide framing is explicitly the ask → that is **OSO** (§4.9). |
| one fixed **dashboards/reporting layer** (C11) as the deliverable | The deliverable is queryable canonical facts, not a fixed report. |

**Build path.** Broad attribute registry → canonical tables → knowledge/RAG library → graph layer → missing-info ledger → reconciliation + recurring update jobs → query surface.

> **Intelligence Layer vs. Decision-Support.** Decision-Support *makes a recommendation now* from inputs to one decision; Intelligence Layer *maintains canonical facts* many decisions and workflows draw on over time. Persistence + canonicalization + many consumers is the line. An Intelligence Layer is also frequently a *component of* an OSO.

---

### 4.9 Operating Layer / OSO

A broad organization-wide system sitting above existing tools — an organizational intelligence layer, not a single app. Decisive signals: **multiple workflows + shared memory + cross-system visibility, all three together**; framed as an "operating system/layer for the organization"; sits above existing tools rather than replacing or coordinating one set.

| Likely NEEDS | Why |
|---|---|
| **backend workflow** (C3) — multiple workflows orchestrated together | "Multiple workflows" is a decisive signal. |
| **organizational-memory layer** (C13) — incl. an **Intelligence Layer** (§4.8) | The shared canonical memory underpinning everything; an Intelligence Layer is a *part* of it. |
| **connector layer (MCP/API/batch)** (C8) — cross-system visibility | Visibility across the tools the org already uses. |
| organizational **state model** (canonical table, C4) | A model of how the organization runs, above individual processes. |
| task/event routing (backend workflow, C3) | Routing work and events across the many workflows. |
| **dashboards/reporting layer** (C11) + **front-end app** (C1) — **executive layer** | Org-wide reporting and a role-aware executive surface. |
| **audit/provenance layer** (C10) | Org-wide traceability across workflows and systems. |

| Likely does NOT need | Why |
|---|---|
| *nothing is cheap here* — but it does **NOT** need to be the default for any ambitious-sounding request | The build-cost tie-break (doc `02` §2.2) deliberately resists landing here by accident. |
| to be assigned without **all three** decisive signals at `observed`/`implied` | Otherwise build the strongest concrete sub-shape (often **Integrated Workflow** or **Intelligence Layer**) and record OSO as a future-fit note in the ledger (§9.12). |

**Build path.** Multiple backend workflows → organizational-memory layer (incl. an Intelligence Layer) → cross-system connectors → org state model → task/event routing → reporting → executive front-end layer.

> **OSO vs. its parts.** An OSO is not "a big App." It is the composition of *multiple workflows + shared memory (Intelligence Layer) + cross-system visibility*. If only one or two of those are present, classify and build the part, not the whole.

---

## 5. Component-by-archetype matrix

The full map at a glance. **●** = likely NEEDS (default in `required_boverse_components`); **○** = optional / only if a secondary archetype or explicit evidence adds it (`optional_components`); **·** = likely does NOT need (default in `unnecessary_components`). Columns are the build-cost order (lowest first). "Graph layer" is listed as a relationship-aware extension of **canonical table (C4)**.

| Component | Workflow Component | Mini-App | Sharp Point | Bridge | App | Decision-Support | Integrated Workflow | Intelligence Layer | Operating Layer / OSO |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **C1 front-end app** | · | · | ○ (simple) | · | ● | ● | ● | ○ | ● |
| **C2 mini-app** | · | ● | · | · | · | · | · | · | · |
| **C3 backend workflow** | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| **C4 canonical table** | ○ | ○ | ● (focused) | ● (state/event) | ● | ● | ● (state) | ● (reconciled) | ● (org state) |
| **C5 attribute registry** | ○ | ○ | ● (limited) | ○ | ○ | ○ | ○ | ● (broad) | ● |
| **C6 rules/wiki layer** | ● | ○ | ● | ○ | ○ | ● | ● | ○ | ○ |
| **C7 knowledge/RAG library** | · | · | ○ | · | ○ | ○ | ○ | ● | ● |
| **C8 connector layer** | · | · | · | ● | ○ | · | ○ | ○ (ingest) | ● |
| **C9 HITL gates** | ○ | ● | ● (one) | ○ | ● | ● | ● | ○ | ● |
| **C10 audit/provenance layer** | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| **C11 dashboards/reporting** | · | · | · | ● (status) | ○ | ○ | ○ | ○ | ● (exec) |
| **C12 decision/scoring layer** | ○ | · | · | · | · | ● | ○ | ○ | ○ |
| **C13 organizational-memory** | · | · | · | · | · | · | · | ○ | ● |
| **graph layer** (ext. of C4) | · | · | · | · | · | · | · | ● | ● |

> **How to read the matrix with secondaries.** The matrix shows the **primary**-archetype default. An evidenced `secondary_archetype` promotes the secondary's NEEDS from **·**/**○** to inclusion as `optional_components` — but per the archetype framework (doc `02` §2.1) it **never escalates the primary build path**. Example: a Sharp Point Solution with a Bridge secondary keeps the Sharp Point row as its base and adds **C8 connector layer** for the one external write it must do; it does **not** adopt the full Bridge row.

---

## 6. The anti-over/under-build procedure

How the Build Swarm uses this document deterministically. This is the algorithm the Object Creation and Generation documents implement.

1. **Read the classification.** Take `primary_archetype` and `secondary_archetype` from the Workflow Archetype table (§9.13).
2. **Seed required from the primary.** Copy the primary archetype's **Likely NEEDS** (§4) into `required_boverse_components`.
3. **Seed unnecessary from the primary.** Copy the primary archetype's **Likely does NOT need** (§4) into `unnecessary_components`.
4. **Add the secondary as optional only.** If a `secondary_archetype` is present and evidenced, add its distinctive NEEDS to `optional_components` (never to `required_*`, never escalating the build path — doc `02` §2.1).
5. **Apply evidenced exceptions.** If a specific canonical fact proves a does-NOT-need component is actually required (e.g. a single step in a Sharp Point Solution must write to one external system → **C8**), move that one component from `unnecessary_components` to `required_boverse_components`, and record the justifying `fact_id` in the rationale. One component, one justification — not the whole archetype.
6. **Demote unevidenced wishes.** Any component motivated only by "might be nice later" is **not** added; it becomes a future-fit row in the Missing Information / Ambiguity Ledger (§9.12), not a build target.
7. **Emit the build path.** Write the primary archetype's one-line `recommended_build_path` (§3), adjusted only for the evidenced exceptions from step 5.

The result is a §9.13 row whose three component lists are a **deterministic function** of the classification plus the evidenced exceptions — reproducible, auditable, and minimal by construction.

---

## 7. Cross-references

| Document | Relationship |
|---|---|
| `01` — Workflow Discovery Framework / CAKE | Establishes that extraction is probabilistic and the schema + rules are the deterministic constraints; this document is a deterministic lookup, not another probabilistic step. |
| `02` — Workflow Archetype Framework | Defines the 9 archetypes, their decisive signals, the build-cost tie-break order, and the primary/secondary rules this document consumes. |
| `04` — Canonical Workflow Design Schema | Defines the 14 canonical tables the 13 components read/write; §9.13 (Workflow Archetype) is the row this document fills (`required_boverse_components`, `optional_components`, `unnecessary_components`, `recommended_build_path`). |
| Object Creation & Generation documents | Realize this document's component vocabulary (§2) as build objects per the **§2.1 crosswalk**, and implement the anti-over/under-build procedure (§6) to instantiate them. |

---

## CANON: 13 BoVerse Build Components

| # | Component | One-line definition |
|---|---|---|
| C1 | front-end app | Full user-facing multi-screen UI with an ongoing user relationship. |
| C2 | mini-app | Thin single-screen/panel UI for one narrow job for one user. |
| C3 | backend workflow | Server-side orchestration of steps; the executable process, no UI. |
| C4 | canonical table | Typed, persistent store of the workflow's facts/records. |
| C5 | attribute registry | Evolving list of attributes to extract/track (CAKE's targets). |
| C6 | rules/wiki layer | Deterministic condition→action rules plus the reference wiki. |
| C7 | knowledge/RAG library | Retrievable reference corpus consulted at runtime. |
| C8 | connector layer (MCP/API/batch) | Clients that read/write external systems. |
| C9 | HITL gates | Human review/approval points that block until a person acts. |
| C10 | audit/provenance layer | Per-fact and per-run traceability. |
| C11 | dashboards/reporting layer | Aggregate views/reports over many runs or records. |
| C12 | decision/scoring layer | Recommendation, scoring, scenario, and sensitivity logic. |
| C13 | organizational-memory layer | Persistent shared memory reconciled across many workflows. |

> **Graph layer** is not a 14th component; it is the relationship-aware extension of **C4 canonical table**, a NEED only for Intelligence Layer and Operating Layer / OSO.
