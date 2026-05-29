# 02 — Workflow Archetype Framework

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** the archetype taxonomy used to classify every request.
> **Consumes:** the canonical facts and registries produced by CAKE (see `01` and `04`).
> **Feeds:** the Rules/Wiki classification layer (`05`), the Gap Analysis and Question Policy (`06`), the Workflow Design Specification (`07`), and the Build Swarm's object-selection logic (`09`).

---

## 1. Why archetypes exist

BoVerse turns messy business evidence into a working workflow without ever asking the user to design that workflow. The user states a desired outcome and uploads what they have. The Discovery Swarm (Swarm 1) infers the architecture; the Build Swarm (Swarm 2) builds only the objects that architecture requires.

The single most expensive mistake in this pipeline is **building the wrong amount of system**:

- **Over-building** — turning a one-output, one-user request into a multi-table application with auth, dashboards, and an intelligence layer nobody asked for. Expensive, slow, and it buries the outcome the user actually wanted.
- **Under-building** — treating a multi-actor, multi-output, cross-system program as if it were a single report generator. Ships something that demos well and collapses on contact with the real process.

The **archetype** is the control that prevents both. It is a coarse, deliberately small classification — **9 archetypes** — that answers one question: *what shape of system is this, really?* That answer constrains everything downstream:

```
Discovery determines architecture
  → architecture determines build path
    → build path determines required BoVerse objects
```

The archetype is the hinge in that chain. It is assigned by the Rules/Wiki layer (`05`) from canonical facts (`04`), recorded in the Workflow Design Specification (`07`), and read by the Build Swarm (`09`) to decide which objects to instantiate and — equally important — which to refuse to build.

> **Determinism note.** Extraction of facts from evidence is probabilistic (LLM-driven, see `01`/CAKE). Archetype classification is **not** another free-form LLM judgement layered on top. It is a *deterministic function of canonical facts and the rules layer*: the same fact set plus the same ruleset always yields the same primary archetype. The probabilistic step is taming the evidence into canonical facts; the rules then read those facts and fire. This document defines the **signals** (the fact patterns the rules match against) so that `05` can be authored as explicit, testable rules rather than vibes.

---

## 2. How classification works

Every request is assigned exactly **one primary archetype** and **zero or one secondary archetype**.

| Field | Type | Description |
|---|---|---|
| `primary_archetype` | enum (one of the 9 below) | The dominant shape. Drives the build path. |
| `secondary_archetype` | enum \| null | An optional second shape the system also exhibits. Adds objects but does not change the primary build path. |
| `archetype_confidence` | enum (`observed` \| `implied` \| `inferred` \| `guess`) | Reuses the canonical confidence ladder from `01`. Below `implied`, classification becomes a high-value clarifying question (`06`) rather than a silent assumption. |
| `classification_rationale` | string | Plain-English statement of which signals fired, citing the canonical facts by id. Provenance for the spec. |

**Confidence ladder** (identical to the fact-confidence enum used everywhere in the corpus):

| Level | Meaning for classification |
|---|---|
| `observed` | The evidence states the shape directly (e.g. a slide literally says "operating system for the agency"). |
| `implied` | Multiple strong fact patterns point to one archetype with no competing pattern. |
| `inferred` | The shape is the most plausible reading but a competing archetype is live. |
| `guess` | Insufficient evidence; the system must ask before committing. |

### 2.1 Single primary, optional secondary

The primary archetype answers *"what is the smallest correct shape of this system?"* The secondary, when present, captures a real second dimension without licensing scope creep. Two rules govern it:

1. **The secondary never escalates the build path.** A Sharp Point Solution with a Bridge secondary is built as a Sharp Point Solution that *also* writes to one external system. It does not become a full Bridge.
2. **The secondary must be evidenced, not aspirational.** "It could eventually become an Operating Layer" is not a secondary archetype. A secondary requires its own firing signals in the canonical facts.

### 2.2 The tie-break order

When two archetypes' signals fire with comparable strength, classification is resolved by the **build-cost order** below, lowest first. The rule: *prefer the lower-cost archetype as primary unless a higher-cost signal fires at `observed` or `implied` confidence.* This is the structural bias against over-building, encoded.

```
Workflow Component  (lowest build cost)
Mini-App
Sharp Point Solution
Bridge
App
Decision-Support App
Integrated Workflow
Intelligence Layer
Operating Layer / OSO   (highest build cost)
```

Worked example: evidence shows one main output (an estimate) for one user group, but also mentions "we'd love to see trends across all our jobs eventually." The estimate signal fires at `observed`; the trends signal is a single `guess`-level mention. Primary = **Sharp Point Solution**. The Intelligence Layer is *not* assigned — it becomes a noted gap and possibly a future-fit question (`06`), never a silent build target.

### 2.3 The five dimensions every signal reads

All classification signals are expressed in terms of five canonical fact dimensions defined in the Canonical Schema (`04`). Authoring `05` means writing rules over these five axes:

| Dimension | Canonical fact source | What it measures |
|---|---|---|
| **Outputs** | `output_facts[]` | How many distinct deliverables; are they reports, decisions, or kept-in-sync state. |
| **Actors / user groups** | `actor_facts[]` | How many distinct human roles or user groups interact. |
| **Inputs** | `input_facts[]` | How many distinct input sources/feeds; structured vs unstructured. |
| **Decision points** | `decision_facts[]` | How many branch/approval/routing points the process contains. |
| **Systems** | `system_facts[]` (incl. MCP/API descriptions) | How many external tools/systems are named, and whether the job is to *coordinate* them or *consume* them. |

Two derived signals recur across archetypes and are worth naming explicitly:

- **Shared memory / canonicalization** — evidence that facts must be reconciled into one persistent canonical store and reused across more than one workflow. Pushes classification *up* toward Intelligence Layer / Operating Layer.
- **Cross-system visibility / orchestration** — evidence that the job is to keep work *moving* across tools (status, handoffs, routing), not to produce a single artifact. Pushes classification toward Bridge or, when combined with shared memory and multiple workflows, Operating Layer.

---

## 3. The 9 archetypes

The registry, ordered by typical build cost (ascending). Each archetype is then detailed in §3.1–§3.9.

| # | Archetype | One-line definition | Typical build cost |
|---|---|---|---|
| 1 | **Workflow Component** | A reusable backend capability, often with no front end. | Lowest |
| 2 | **Mini-App** | A small bounded tool that does one narrow job inside a larger workflow. | Low |
| 3 | **Sharp Point Solution** | A focused solution to one painful job, end to end. | Low–Medium |
| 4 | **Bridge** | An orchestration layer that keeps work moving across tools, teams, or systems. | Medium |
| 5 | **App** | A full user-facing application with a clear business outcome. | Medium–High |
| 6 | **Decision-Support App** | An application that produces recommendations, scenarios, or priorities. | High |
| 7 | **Integrated Workflow** | A multi-step process with multiple inputs, actors, outputs, and decision points. | High |
| 8 | **Intelligence Layer** | A canonicalization layer supporting ongoing analysis across many workflows. | High |
| 9 | **Operating Layer / OSO** | A broad organizational system sitting above existing tools. | Highest |

> **Reading the "build posture" lines.** Each archetype ends with a one-line posture: *usually needs* X **/** *usually does NOT need* Y. These are defaults the Build Swarm (`09`) starts from, not hard limits. A secondary archetype or an explicit evidenced requirement can add an object the default would omit. The posture exists so the default is *minimal*, and additions are *justified*.

---

### 3.1 Workflow Component

**Definition.** A reusable backend capability that performs one well-defined transformation, validation, classification, or routing step. It frequently has **no front end** at all — it is invoked by another workflow, not by a person.

**When it applies.** The request describes a *capability*, not a destination. The user wants "a thing that does X to an item" where X is a single primitive operation (in BoVerse primitive terms: a `transform`, `validate`, `action`, or `feedback` step) that other workflows will call.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| Exactly one operation described, framed as a step not a product | Outputs | Strong |
| No user group named, or "the system" / "the other workflow" is the consumer | Actors | Strong |
| Output is consumed by another process, not read by a human | Outputs | Strong |
| Verbs like *extract*, *classify*, *reconcile*, *route*, *compare-to-rules*, *generate-ledger* | Outputs | Medium |
| No front-end, dashboard, or "screen" language anywhere in evidence | Systems | Medium |

**Examples.**

- Extract contract terms from an uploaded agreement and return them as structured fields.
- Classify an inbound document by type so a larger intake workflow can route it.
- Reconcile two tables (system export vs. spreadsheet) and emit the deltas.
- Generate a missing-information ledger for an item and hand it back to the caller.
- Compare a row of actuals against a rules table and return pass/fail with reasons.

**Build posture.** *Usually needs:* one input contract, one output contract, the rule/transform logic, provenance on the result. **Usually does NOT need:** front end, auth, persistence beyond the call, multiple actors, dashboards.

---

### 3.2 Mini-App

**Definition.** A smaller, bounded tool that lives **inside a larger workflow** and solves one narrow job for one user. It may have a thin front end (a single screen or panel), but its scope is deliberately small.

**When it applies.** The request names a specific helper that a person uses at one point in a bigger process — a focused assistant, calculator, triage screen, or reviewer — rather than the whole process or a standalone product.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| One narrow job described, explicitly *part of* a bigger process | Outputs | Strong |
| One user group, light interaction (review / adjust / approve) | Actors | Strong |
| Thin or single-screen front end implied, not a full app | Systems | Medium |
| Limited inputs (one or two), often the output of an upstream step | Inputs | Medium |
| Language like "a little tool to…", "a helper for…", "a quick way to…" | Outputs | Medium |

**Examples.**

- A feedback-triage panel that sorts incoming feedback into themes for a PM.
- An approval assistant that summarizes an item and pre-fills an approve/reject recommendation.
- A scope-change calculator that recomputes a number when a project parameter changes.
- A project-risk summarizer that turns status notes into a one-paragraph risk readout.
- A document-intake reviewer where a human confirms what an extractor pulled.

**Build posture.** *Usually needs:* one thin UI surface, one or two input contracts, one user role, light persistence for the in-progress item. **Usually does NOT need:** multiple workflows, cross-system orchestration, an intelligence layer, broad auth, analytics.

---

### 3.3 Sharp Point Solution

**Definition.** A focused, end-to-end solution to **one painful job**. Bounded scope, one primary output, one main user group, limited inputs. Often the **best place to start** — a Sharp Point Solution can later grow into an App, a Decision-Support App, or seed an Intelligence Layer.

**When it applies.** The user has one acute pain ("we waste two days building every estimate by hand") and wants that one job solved completely — from input to finished artifact — for one audience.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| **One main output + one user group + limited inputs** | Outputs + Actors + Inputs | **Decisive** (this is the canonical Sharp Point signature) |
| A single painful job named with urgency | Outputs | Strong |
| End-to-end ask (input → finished artifact) but only one artifact | Outputs | Strong |
| Few decision points, no multi-actor handoffs | Decision points + Actors | Medium |
| No "across all our…" / "keep everything in sync" language | Systems / shared memory | Medium (its *absence* keeps it sharp) |

**Examples.**

- Generate a complete estimate from a job description and a rate sheet.
- Analyze a commercial lease and surface the clauses that matter.
- Classify a supplier into a risk tier from a profile and a questionnaire.
- Reconcile a bank/processor statement against the ledger and produce the exceptions.
- Review an application against eligibility criteria and return a recommendation.

**Build posture.** *Usually needs:* one structured workflow, one input contract, one output artifact, the domain rules, persistence for runs. **Usually does NOT need:** multiple user roles, cross-system orchestration, dashboards across many runs, a canonical store shared with other workflows.

> **Relationship to App.** A Sharp Point Solution becomes an **App** (§3.5) when *repeatable, persistent, multi-session interaction with a real front end* is required — i.e. when the artifact stops being a one-shot deliverable and becomes a tool people return to. If the evidence only shows the one-shot job, stay at Sharp Point.

---

### 3.4 Bridge

**Definition.** An orchestration layer **between tools, teams, or systems**. The job is to keep work *moving* — status, handoffs, routing, coordination — **not** to produce a single report or artifact. A Bridge's value is flow, not output.

**When it applies.** The user already has the tools they need (Slack, Figma, Asana, Jira, Loom, a ticketing system, supplier portals). What is broken is the *coordination between* them: things fall through cracks, status is invisible, handoffs are manual.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| **Coordinating status / handoffs across multiple existing tools** | Systems (cross-system visibility/orchestration) | **Decisive** (canonical Bridge signature) |
| Two or more named external systems the user already uses | Systems | Strong |
| The pain is "things fall through the cracks between X and Y" | Decision points (routing) | Strong |
| No single deliverable is the goal; the goal is *flow* | Outputs (notably absent) | Strong |
| Routing / notification / sync verbs: *route*, *notify*, *keep in sync*, *hand off* | Outputs | Medium |

**Examples.**

- Coordinate a creative workflow across Slack, Figma, Asana, and Loom so nothing stalls.
- Route accessibility issues across Jira, Figma, and QA and track them to closure.
- Coordinate suppliers across email and a portal so responses are chased and logged.
- A client-approval bridge that moves a deliverable through review and records sign-off.

**Build posture.** *Usually needs:* connectors/MCP clients to each named system, routing and state-sync logic, a coordination state model, event/notification handling. **Usually does NOT need:** a heavy front end of its own, a single big output artifact, a canonical analytical store, complex per-item business rules.

> **Bridge vs. Workflow Component.** A Workflow Component *routes one item on request*; a Bridge *continuously keeps many items moving across systems*. Continuity and multiple systems are what elevate routing to a Bridge.

---

### 3.5 App

**Definition.** A full **user-facing application** with a clear business outcome: a front end, structured workflows, persistent data, real outputs, and **repeatable interaction**. People come back to it to do a job, not once but routinely.

**When it applies.** The request describes a *product* — something with screens, saved data, and an ongoing user relationship — oriented around a clear outcome, but without the multi-actor / multi-stage program scope of an Integrated Workflow and without recommendation-generation as its core (which would make it Decision-Support).

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| Front end + persistent data + repeatable interaction all present | Systems + Outputs | Strong |
| A clear, single business outcome named as a *product*, not a one-shot | Outputs | Strong |
| One or a few user groups returning over time | Actors | Medium |
| Structured workflows the user runs repeatedly | Decision points | Medium |
| "Tool / platform / app where users can…" framing | Outputs | Medium |

**Examples.**

- An estimating tool teams use on every new job.
- A land-valuation application with saved parcels and repeatable valuations.
- An ISO reconciliation platform staff run each reporting cycle.
- A supplier-review application where reviews accumulate over time.
- An export-readiness tool a company works through and revisits.

**Build posture.** *Usually needs:* front end, persistent data model, one or more structured workflows, output generation, basic auth/roles. **Usually does NOT need:** cross-system orchestration (unless a Bridge secondary fires), a canonical intelligence store across many workflows, an organization-wide operating layer.

> **App vs. Sharp Point Solution.** The dividing line is *persistence + repeatable interaction*. One-shot artifact → Sharp Point. A place users return to with saved state → App.

---

### 3.6 Decision-Support App

**Definition.** An application whose **core output is recommendations, scenarios, priorities, or decisions** — not just processed data. It takes structured and unstructured inputs and tells the user *what to do* or *what is likely*, with reasoning.

**When it applies.** The user wants help *deciding*, not just *seeing*. The valuable output is a ranked list, a scenario comparison, a recommended action, a risk score with rationale, or an optimized plan.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| **Output is recommendations / scenarios / priorities from structured + unstructured inputs** | Outputs + Inputs | **Decisive** (canonical Decision-Support signature) |
| Language: *recommend*, *prioritize*, *score*, *optimize*, *what should we…*, *which option* | Outputs | Strong |
| Multiple inputs combined to produce judgement, not just a passthrough | Inputs | Strong |
| Decision points are the *product*, not incidental steps | Decision points | Strong |
| A front end exists to present and explore the recommendations | Systems | Medium |

**Examples.**

- Valuation decision support that recommends a price band with comparables and rationale.
- An SMB risk tool that scores and ranks accounts by likelihood of churn or default.
- A capital-markets assistant that compares scenarios and flags the strongest option.
- A scheduling/quoting optimizer that proposes the best plan under constraints.

**Build posture.** *Usually needs:* front end, recommendation/scoring logic, scenario modelling, explanation/rationale generation, persistence of decisions. **Usually does NOT need:** cross-system orchestration as a primary job, a shared canonical store across many workflows (unless an Intelligence Layer secondary fires).

> **Decision-Support vs. App.** A plain App *processes and presents*. A Decision-Support App *recommends and reasons*. If the headline deliverable is "here is the answer / the ranking / the recommended action," it is Decision-Support.

---

### 3.7 Integrated Workflow

**Definition.** A **multi-step process with multiple inputs, multiple actors, multiple outputs, and several decision points**. It is a program, not a single tool — work moves through stages, different roles act at different points, and the process has real branching.

**When it applies.** The evidence describes an end-to-end *process* with handoffs between roles and several stages — onboarding, review, due diligence, compliance — where no single step is the product; the orchestrated whole is.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| Multiple inputs **and** multiple actors **and** multiple outputs **and** several decision points (all present) | All five | **Decisive** (canonical Integrated Workflow signature) |
| Distinct roles act at distinct stages (handoffs between people) | Actors + Decision points | Strong |
| The process has named stages/phases | Decision points | Strong |
| No single deliverable dominates; the orchestrated process is the value | Outputs | Strong |
| The job is internal process execution, not cross-tool coordination | Systems (distinguishes from Bridge) | Medium |

**Examples.**

- A grant-review process: intake, eligibility, scoring by panel, decision, notification.
- ISO due-diligence: document collection, gap analysis, evidence review, sign-off.
- An export-readiness program: assessment, planning, documentation, certification stages.
- Employee or client onboarding across several departments and approvals.
- A multi-stage compliance review with branching by case type.

**Build posture.** *Usually needs:* multiple structured workflows/stages, several input and output contracts, multi-actor roles and handoffs, decision/branch logic, persistent process state, audit trail. **Usually does NOT need:** an organization-wide operating layer above it, a canonical analytical store across *other* programs (unless a secondary fires).

> **Integrated Workflow vs. Bridge.** Integrated Workflow *executes a process internally* (the steps are the system's own). Bridge *coordinates work across tools the user already owns*. Internal stages → Integrated Workflow; cross-tool flow → Bridge.

---

### 3.8 Intelligence Layer

**Definition.** A layer that **canonicalizes information into a persistent, reconciled store and supports ongoing analysis across many workflows**. It is not a single app; it is the shared brain other workflows query. Its defining act is *canonicalization* — turning many messy sources into one trusted set of facts that persists and is reused.

**When it applies.** The user wants a durable, queryable understanding of a domain — a market, a neighbourhood, a supplier base, an accessibility landscape — built from many documents/sources, that *multiple* workflows or analyses will draw on over time.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| **Canonicalizing facts across many documents/sources into one persistent store** | Inputs + shared memory | **Decisive** (canonical Intelligence Layer signature) |
| Outputs are *queries/analyses over canonical facts*, not one fixed report | Outputs | Strong |
| Many heterogeneous sources reconciled into one model | Inputs | Strong |
| Explicit "across all our…" / "build a picture of…" / "single source of truth" language | Shared memory | Strong |
| Serves more than one downstream workflow or analysis | Outputs + Actors | Medium |

**Examples.**

- Neighbourhood intelligence: canonical facts about areas, queried by valuation and other workflows.
- Market intelligence: a reconciled view of a sector that several analyses draw on.
- Supplier intelligence: one canonical supplier record set feeding review, risk, and sourcing.
- Accessibility intelligence: a canonical map of issues/standards feeding routing and reporting.
- Sector graphing: entities and relationships canonicalized for ongoing analysis.

**Build posture.** *Usually needs:* a canonical fact store with provenance and confidence (CAKE's evolving registries, `04`), reconciliation/dedup logic, ingestion from many sources, a query/analysis surface. **Usually does NOT need:** a single fixed end-user workflow as its reason for existing, heavy task-orchestration, an organization-wide operating layer above it (until that is explicitly the ask → OSO).

> **Intelligence Layer vs. Decision-Support.** Decision-Support *makes a recommendation now* from inputs to one decision. Intelligence Layer *maintains canonical facts* that many decisions and workflows draw on over time. Persistence + canonicalization + many consumers is the line.

---

### 3.9 Operating Layer / OSO

**Definition.** A broad **organizational system sitting above existing tools** — BoVerse as an *organizational intelligence layer*, not a single app. An OSO ("Organizational Smart/Operating Object") combines **multiple workflows + shared memory + cross-system visibility** into one coherent operating surface for how an organization runs.

**When it applies.** The ambition is organization-wide: not one tool, not one process, but a layer that ties together many workflows, a shared canonical memory, and visibility across the tools the organization already uses. This is the highest-cost, broadest archetype and is assigned **only** when the signals fire strongly — the tie-break bias (§2.2) deliberately resists landing here by accident.

**Classification signals.**

| Signal | Dimension | Strength |
|---|---|---|
| **Multiple workflows + shared memory + cross-system visibility (all three together)** | Decision points + shared memory + Systems | **Decisive** (canonical OSO signature) |
| Framed as an "operating system / operating layer for the [organization]" | Outputs | Strong |
| Sits *above* existing tools rather than replacing or coordinating one set | Systems | Strong |
| Organization-wide scope; many roles, many processes | Actors + Decision points | Strong |
| A canonical shared memory underpins everything (an Intelligence Layer is a *part* of it) | Shared memory | Strong |

**Examples.**

- OtherHalf OSO — an operating layer over an organization's tools and processes.
- An accessibility OS that unifies routing, intelligence, and reporting org-wide.
- An export ecosystem OS spanning programs, intelligence, and coordination.
- Agency operating intelligence: many agency workflows on one shared operating surface.

**Build posture.** *Usually needs:* multiple workflows orchestrated together, a shared canonical memory (Intelligence Layer as a component), cross-system connectors/visibility, role-aware surfaces, an integration backbone. **Usually does NOT need:** *nothing is cheap here* — but it does NOT need to be the default for any ambitious-sounding request. Demand all three decisive signals at `observed`/`implied` before assigning; otherwise classify the strongest concrete sub-shape (often Integrated Workflow or Intelligence Layer) and record OSO as a future-fit note (`05`).

---

## 4. Disambiguation matrix

The pairs most likely to collide, and the single question that resolves each. These map directly to rules in `05` and to high-value clarifying questions in `06` when the deciding fact is missing.

| If torn between… | …ask this | Resolves to… |
|---|---|---|
| Workflow Component vs. Mini-App | Does a human use a screen, or does another workflow call it? | Screen → Mini-App; called by code → Workflow Component |
| Mini-App vs. Sharp Point Solution | Is it part of a bigger process, or is it the whole job? | Part → Mini-App; whole job → Sharp Point |
| Sharp Point vs. App | One-shot artifact, or a tool people return to with saved state? | One-shot → Sharp Point; return + persist → App |
| App vs. Decision-Support App | Does it present data, or recommend an action/ranking? | Present → App; recommend/reason → Decision-Support |
| App vs. Integrated Workflow | One user group + one workflow, or many actors + many stages? | One/one → App; many/many → Integrated Workflow |
| Bridge vs. Integrated Workflow | Coordinating existing tools, or executing internal stages? | Coordinate tools → Bridge; internal stages → Integrated Workflow |
| Bridge vs. Workflow Component | Continuous flow across many systems, or one routing call? | Continuous/many → Bridge; one call → Workflow Component |
| Decision-Support vs. Intelligence Layer | Make one decision now, or maintain canonical facts for many? | Decide now → Decision-Support; canonicalize for many → Intelligence Layer |
| Intelligence Layer vs. OSO | Canonical facts for analysis, or workflows + memory + cross-system org-wide? | Facts only → Intelligence Layer; all three → OSO |
| Integrated Workflow vs. OSO | One end-to-end process, or many processes on one operating surface? | One process → Integrated Workflow; many + shared memory + cross-system → OSO |

---

## 5. Cross-references

| Document | Relationship |
|---|---|
| `01` — Discovery Framework / CAKE | Produces the canonical facts and confidence ladder this document reads. |
| `04` — Canonical schema & registries | Defines `output_facts`, `actor_facts`, `input_facts`, `decision_facts`, `system_facts` — the five dimensions every signal is expressed over. |
| `05` — Rules / Wiki layer | Implements classification as explicit, deterministic rules over the signals defined here. Owns the firing logic and the tie-break order (§2.2). |
| `06` — Missing Information / gap & question policy | When a deciding signal is missing or below `implied`, turns the relevant disambiguation question (§4) into a high-value clarification. |
| `07` — Workflow Design Specification | Records `primary_archetype`, `secondary_archetype`, `archetype_confidence`, `classification_rationale` as deterministic spec fields. |
| `09` — Build Mapping / object selection | Reads the archetype and applies the build-posture defaults (§3) to decide which BoVerse objects to build and which to omit. |

---

## 6. Quick-reference card

> Pinned summary for authors of `05`/`06`/`09`. Canonical, copy-safe.

| Archetype | Strongest signals (fact patterns) | Default: needs / does NOT need |
|---|---|---|
| **Workflow Component** | One operation; no user group; output consumed by another process | Needs input/output contract + logic / NOT front end, auth, multi-actor |
| **Mini-App** | One narrow job *inside* a bigger process; one user; thin UI | Needs one UI + light persistence / NOT multi-workflow, orchestration |
| **Sharp Point Solution** | **One output + one user group + limited inputs**; one painful job, end-to-end | Needs one workflow + one artifact + rules / NOT multi-actor, shared store |
| **Bridge** | **Coordinating status/handoffs across multiple existing tools**; flow, not artifact | Needs connectors + routing/sync state / NOT big UI, canonical analytical store |
| **App** | Front end + persistent data + repeatable interaction; clear product outcome | Needs UI + data model + workflow / NOT cross-system orchestration, intelligence store |
| **Decision-Support App** | **Recommendations/scenarios/priorities from structured + unstructured inputs** | Needs scoring + scenarios + rationale / NOT orchestration-first, canonical store |
| **Integrated Workflow** | Multiple inputs + actors + outputs + decision points; internal staged process | Needs multi-stage workflows + roles + audit / NOT operating layer, cross-program store |
| **Intelligence Layer** | **Canonicalizing facts across many sources into one persistent store**; many consumers | Needs canonical store + reconciliation + query surface / NOT one fixed workflow |
| **Operating Layer / OSO** | **Multiple workflows + shared memory + cross-system visibility** together; org-wide | Needs orchestration + shared memory + connectors / NOT to be the default for ambition |
