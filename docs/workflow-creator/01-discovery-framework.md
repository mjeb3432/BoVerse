# 01 — Workflow Discovery Framework

> **Series:** BoVerse Workflow Creator Framework
> **Document:** 01 of the corpus — the universal lens
> **Status:** Portable IP / handoff artifact. Implementation-agnostic.
> **Audience:** Engineers and product partners implementing BoVerse on any stack (including boverse.io).

---

## 1. Purpose of this document

BoVerse does not ask a user to design a workflow. The user describes an **outcome** they want and uploads whatever **evidence** they already have — freeform notes, SOPs, spreadsheets, screenshots, sample outputs, system exports, API/MCP descriptions. The system then **infers the workflow's architecture** from that evidence and builds it.

The hard problem is therefore **workflow discovery**, not workflow construction. Construction is mechanical once the architecture is known. Discovery is where the intelligence lives: reading messy human evidence and resolving it into a precise, buildable specification.

This document defines the **universal lens** used to perform that discovery. Every workflow BoVerse encounters — no matter the industry, no matter the archetype — is analyzed through the **same 12 core categories**. The categories never change. What changes from one workflow to the next is *how the answers map to architecture*, which is the subject of later documents in this corpus.

This is the most upstream document in the corpus. Everything else refines, routes, or builds on the facts these 12 categories capture.

---

## 2. Where this sits in the system

BoVerse runs as **two cooperating swarms**:

| Swarm | Name | Responsibility |
|---|---|---|
| **Swarm 1** | Discovery | Ingests evidence, extracts workflow-relevant facts, maps them into canonical tables, applies a rules/wiki layer, classifies the workflow archetype, finds gaps, asks only high-value questions, and emits a deterministic **Workflow Design Specification** plus a **Simulation Pack**. |
| **Swarm 2** | Build | Consumes the specification and builds **only** the BoVerse objects the workflow actually needs. |

The chain of causation is strict and one-directional:

```
evidence ──▶ Discovery (Swarm 1) ──▶ architecture ──▶ build path ──▶ required objects ──▶ Build (Swarm 2)
```

> Discovery determines the **architecture**. Architecture determines the **build path**. Build path determines the **required objects**. Swarm 2 never invents scope; it only realizes what Swarm 1 decided.

**This document defines the lens Swarm 1 looks through.** The 12 categories are the questions Discovery must answer about *any* workflow before architecture can be classified.

### 2.1 CAKE is the engine behind the lens

The evidence-to-canonical-facts work is performed by **CAKE**, the extraction engine. CAKE thinks natively in:

- **documents as evidence** — each upload is a source to be read, not data to be trusted blindly;
- **attributes as extraction targets** — named things to search the evidence for;
- **canonical facts** — normalized, typed values placed into a fixed schema;
- **confidence** — how sure CAKE is about each extracted fact;
- **provenance** — which document(s) and location each fact came from;
- **evolving registries** — the set of attributes and entities grows as evidence reveals more;
- **missing information** — explicit tracking of what was *not* found.

CAKE is the natural engine for Swarm 1. The 12 categories in this document are the **conceptual targets** CAKE extracts toward; document 03 turns them into the concrete **Attribute Registry** (the searchable list), and document 04 turns them into the **Canonical Schema** (the typed destination). Other internal engine names may exist elsewhere in the platform; they are out of scope here.

### 2.2 Where determinism comes from (read this carefully)

Reading messy human evidence is inherently **probabilistic**. CAKE uses LLM-driven extraction, and LLM extraction is never deterministic — the same SOP read twice may yield slightly different phrasings, groupings, or confidence.

> **Determinism does not come from the extraction step. It comes from forcing the extraction output into a fixed, typed structure plus a rules layer.**

- The **probabilistic part** is: "read this messy evidence and propose facts."
- The **deterministic constraints** are: (a) the **Canonical Schema** — every fact must land in a named field of a known type drawn from a closed enumeration; and (b) the **rules/wiki layer** — a set of explicit, repeatable rules that normalize, validate, default, and cross-check those facts.

Anything that survives the schema and the rules layer is deterministic and buildable. Anything that cannot be forced into the schema becomes either a **rule-driven default** or an **explicit gap** (a question for the user) — never a silent guess. The 12 categories below are the *parent structure* that organizes both the schema and the rules, so this discipline starts here.

---

## 3. The framework is universal

The single most important principle to encode:

> **The 12 categories are the same for every workflow. The questions do not change. Only the answers — and how those answers map to architecture — change.**

Consider three workflows that look nothing alike:

- **An estimating tool** (e.g. a contractor pricing a job from plans and a rate sheet).
- **A reconciliation app** (e.g. matching a bank feed against an internal ledger and flagging discrepancies).
- **A cross-system bridge** (e.g. relaying records from a CRM into an ERP whenever a deal closes).

All three must answer all 12 categories. Each one has an Outcome, an Output, Inputs, a Trigger, Actors, Human Review, Systems, Knowledge, Decisions, Exceptions, Audit, and Success. The *content* of each answer differs wildly — but the *shape* of the interrogation is identical. That uniformity is what lets a single deterministic schema and a single rules layer serve every archetype, and it is what makes archetype classification (document 02) possible: archetypes are recognized by the **pattern of the 12 answers**, not by a separate set of questions.

For this reason, throughout this document each category is illustrated with **at least two cross-archetype examples** so the reader sees the same question producing very different — but equally structured — answers.

### 3.1 These 12 categories are the parent structure

The 12 categories are not just an interview script. They are the **organizing parent** for the two core deterministic artifacts of Swarm 1:

| Artifact | Defined in | The 12 categories provide… |
|---|---|---|
| **Attribute Registry** — *what to search the evidence for* | Document 03 | The top-level grouping of every searchable attribute. Each attribute belongs to exactly one category. |
| **Canonical Schema** — *where extracted facts are stored* | Document 04 | The top-level grouping of every canonical fact table/field. Each field traces back to one category. |

So the relationship is:

```
12 Discovery Categories  (this document — the questions)
        │
        ├──▶ Attribute Registry   (doc 03 — what to look for in the evidence)
        │
        └──▶ Canonical Schema      (doc 04 — where the found facts are stored)
```

When document 03 lists an attribute or document 04 lists a field, it cites the category number from this document. Those cross-references are the spine of the corpus. **Category numbering in this document is therefore stable and load-bearing — do not renumber.**

---

## 4. How to read each category definition

Every category below is defined with the same four-part structure:

1. **Question it asks** — the single question Discovery must answer.
2. **Why it matters** — what architectural decision depends on the answer.
3. **Facts to capture** — the specific, named facts CAKE extracts toward (these seed the Attribute Registry and Canonical Schema).
4. **Cross-archetype examples** — the same question answered for at least two very different workflows.

A capability note appears wherever it helps: whether a category tends to be filled directly from evidence, derived by the rules layer, or surfaced as a clarifying question when evidence is thin.

---

## 5. The 12 Discovery Categories

### 5.1 — Outcome

| Field | Detail |
|---|---|
| **Question it asks** | What is the business ultimately trying to accomplish by running this workflow? |
| **Why it matters** | Outcome is the north star. It anchors every other category and is the test for scope: any inferred step, object, or question that does not serve the Outcome is out of scope. It is also how Swarm 1 prevents over-building — the build path must be the *minimal* path to the Outcome. |
| **Facts to capture** | A one-sentence outcome statement; the **business goal** behind it (revenue, speed, accuracy, compliance, cost, risk reduction); the **unit of value** produced per run; the **frequency/volume** expected; the **pain being removed** (what is slow, error-prone, or manual today). |

**Cross-archetype examples**

- *Estimating tool:* "Produce an accurate, defensible price for a custom job in minutes instead of days, so we win bids without underpricing." Goal = speed + accuracy; unit of value = one priced estimate.
- *Reconciliation app:* "Close the books faster by automatically matching transactions and surfacing only the true exceptions for a human to resolve." Goal = speed + accuracy; unit of value = one reconciled period.
- *Cross-system bridge:* "Stop double data-entry by keeping the ERP in sync with the CRM the moment a deal closes." Goal = cost + accuracy; unit of value = one synced record.

---

### 5.2 — Output

| Field | Detail |
|---|---|
| **Question it asks** | What concrete artifact, decision, action, or state does a single run of the workflow produce? |
| **Why it matters** | Output is the most architecture-determining category after Outcome. Whether the workflow produces a **document/artifact**, a **decision**, an **external action**, or a **state change** strongly shapes the build path (e.g. a document generator vs. a decision engine vs. an integration that writes to another system). The Output also defines the *shape of the thing Swarm 2 must be able to emit*. |
| **Facts to capture** | The **output type** — one of `artifact` \| `decision` \| `action` \| `state_change`; the **output format** (e.g. PDF, line-item table, approval flag, API write, updated record); the **fields/structure** of the output; the **destination** (downstream consumer or system); whether output is **single** or **batch** per run. |

**Cross-archetype examples**

- *Estimating tool:* Output type = `artifact`. A structured estimate document (line items, quantities, unit prices, totals, terms) rendered as a customer-facing PDF.
- *Reconciliation app:* Output type = `decision` + `artifact`. A reconciliation result that labels each transaction (matched / unmatched / exception) plus a summary report.
- *Cross-system bridge:* Output type = `action` + `state_change`. A write to the ERP that creates/updates a record; the produced state is "ERP record exists and matches CRM."

---

### 5.3 — Inputs

| Field | Detail |
|---|---|
| **Question it asks** | What information must be present for the workflow to run and produce its Output? |
| **Why it matters** | Inputs define the workflow's **dependencies** and its **data contract**. They tell Swarm 2 what fields must be collected, validated, or fetched before processing. The gap between *required inputs* and *inputs the evidence proves are available* is a primary source of high-value clarifying questions. |
| **Facts to capture** | Each input's **name**, **type**, and **format**; whether it is **required or optional**; its **source** (user-provided, uploaded file, fetched from a system, derived); its **cardinality** (single value, list, table); known **validation constraints**; and any **default** the rules layer can supply when absent. |

**Cross-archetype examples**

- *Estimating tool:* Inputs = project scope/plans (uploaded), a rate sheet or price book (uploaded or system-fetched), labor/material assumptions, margin target. Some required, some defaulted by rules.
- *Reconciliation app:* Inputs = the bank/statement feed (system export), the internal ledger (system export), a matching tolerance and date window. All required.
- *Cross-system bridge:* Inputs = the source CRM record and its field mapping to the ERP. Required; sourced by system fetch on trigger.

---

### 5.4 — Trigger

| Field | Detail |
|---|---|
| **Question it asks** | What causes a run of the workflow to begin? |
| **Question it answers for architecture** | Whether the build path needs an on-demand entry point, a scheduler, an event listener/webhook, or a queue consumer. |
| **Why it matters** | The Trigger determines the workflow's **execution mode** and therefore a large part of its plumbing. A manual trigger and an event trigger produce very different builds even when every other category is identical. |
| **Facts to capture** | The **trigger type** — one of `manual` \| `scheduled` \| `event` \| `incoming_data`; the **trigger source** (a person, a clock/cron expression, an external system event, an arriving file/record); the **frequency or cadence**; any **trigger conditions** that gate whether the run actually proceeds. |

**Cross-archetype examples**

- *Estimating tool:* Trigger type = `manual`. A salesperson starts an estimate when a customer requests a quote.
- *Reconciliation app:* Trigger type = `scheduled` (e.g. nightly) or `manual` at period close. Source = cron or accountant.
- *Cross-system bridge:* Trigger type = `event`. Source = a "deal closed" event/webhook from the CRM.

---

### 5.5 — Actors

| Field | Detail |
|---|---|
| **Question it asks** | Who or what participates in the workflow, and in what role? |
| **Why it matters** | Actors define **roles, permissions, and hand-offs**. They tell Swarm 2 who initiates, who is notified, who reviews, and who consumes the Output — which drives any UI surfaces, notifications, and access boundaries. Actors also distinguish human participants from system/automated participants. |
| **Facts to capture** | Each actor's **name/role**; whether the actor is `human` or `system`/`automated`; the **action they perform** (initiate, supply input, review, approve, consume, be notified); their **permission/authority level**; and the **hand-off points** between actors. |

**Cross-archetype examples**

- *Estimating tool:* Actors = salesperson (initiates, edits), estimator/manager (reviews high-value bids), customer (receives the estimate).
- *Reconciliation app:* Actors = accountant (initiates, resolves exceptions), controller (approves the close), the accounting system (automated source of records).
- *Cross-system bridge:* Actors = the CRM (automated event source), the integration service (automated processor), the RevOps owner (notified on failure). Often **no human in the happy path**.

---

### 5.6 — Human Review

| Field | Detail |
|---|---|
| **Question it asks** | Where in the workflow is human judgment required before it can proceed or complete? |
| **Why it matters** | Human Review is the line between **full automation** and **human-in-the-loop**. It directly determines whether the build path needs review queues, approval gates, edit surfaces, and hold/resume states. Mis-detecting this category produces either a workflow that auto-acts when it should have paused, or one that nags a human when it should have proceeded. |
| **Facts to capture** | Each **review point** (where it occurs in the flow); the **reason** review is required (judgment, risk, compliance, exception handling); the **reviewer role** (links to Actors); whether the gate is **mandatory or conditional**; the **conditions** that trigger a conditional review (e.g. amount over a threshold, low extraction confidence); and the **possible review outcomes** (approve, reject, edit, escalate). |

**Cross-archetype examples**

- *Estimating tool:* Conditional review — estimates above a dollar threshold or below a margin floor must be approved by a manager before being sent. Below threshold, auto-send.
- *Reconciliation app:* Mandatory review of **exceptions only** — matched transactions pass automatically; unmatched ones are queued for an accountant to resolve.
- *Cross-system bridge:* Typically **none** in the happy path; review appears only on exception (e.g. a mapping conflict routes to a human).

---

### 5.7 — Systems

| Field | Detail |
|---|---|
| **Question it asks** | What existing tools, applications, data stores, or services does the workflow touch? |
| **Why it matters** | Systems define the workflow's **integration surface** — what must be read from, written to, or authenticated against. This is where API/MCP descriptions in the evidence become concrete connectors in the build path. The number and direction of system touchpoints is a key signal for archetype classification (e.g. a bridge is *defined* by its two-system topology). |
| **Facts to capture** | Each system's **name** and **role** (`source` \| `destination` \| `both` \| `reference`); the **access method** (API, MCP, file export/import, manual, database); **authentication** requirements; the **entities/objects** read or written; the **direction of data flow**; and known **rate/volume constraints**. |

**Cross-archetype examples**

- *Estimating tool:* Systems = a price-book/catalog system (reference, read), possibly a CRM (destination, to attach the estimate). Light integration surface.
- *Reconciliation app:* Systems = a bank/payment provider (source, read via export or API) and an accounting/ERP system (source, read). Two read sources.
- *Cross-system bridge:* Systems = CRM (source, read via API/event) and ERP (destination, write via API/MCP). Heavy, bidirectional integration surface — the defining trait of the archetype.

---

### 5.8 — Knowledge

| Field | Detail |
|---|---|
| **Question it asks** | What rules, policies, formulas, reference documents, or domain expertise does the workflow depend on? |
| **Why it matters** | Knowledge is the **business logic and reference material** that makes the Output correct rather than merely well-formed. It feeds the **rules/wiki layer** (the deterministic constraints from §2.2) and any RAG/reference corpus. Knowledge captured here is what turns a generic step into a *correct-for-this-business* step. |
| **Facts to capture** | Each knowledge item's **type** — `rule` \| `policy` \| `formula` \| `reference_document` \| `lookup_table` \| `expertise`; its **statement or location** (the rule text, the formula, the document reference); whether it is **explicit** (written in the evidence) or **tacit** (implied, must be confirmed with the user); its **scope/applicability**; and its **source/authority**. |

**Cross-archetype examples**

- *Estimating tool:* Knowledge = pricing formulas (markup %, waste factor), the rate sheet (lookup table), discount policy, and tacit estimator heuristics that must be drawn out by questions.
- *Reconciliation app:* Knowledge = matching rules (match on amount + date within tolerance), the chart of accounts (reference), and the policy for what counts as a reportable exception.
- *Cross-system bridge:* Knowledge = the field-mapping rules between CRM and ERP, value translation tables (e.g. status code maps), and the policy for conflict resolution when both systems changed.

---

### 5.9 — Decisions

| Field | Detail |
|---|---|
| **Question it asks** | What choices does the workflow make — either automatically or by routing to a human? |
| **Why it matters** | Decisions are the **branch points** that give a workflow its logic shape. They determine whether the build path needs a rules engine, a scoring/classification step, or simple conditional routing. Every Decision is the place where Knowledge (5.8) is *applied*. Distinguishing automated decisions from human-routed ones links directly to Human Review (5.6). |
| **Facts to capture** | Each decision's **name/question**; the **inputs/criteria** it evaluates; whether it is **automated or human**; the **possible outcomes/branches**; the **rule or model** that decides; and the **default outcome** when criteria are ambiguous or data is missing. |

**Cross-archetype examples**

- *Estimating tool:* Decision = "Which rate tier applies?" (automated, from the rate sheet) and "Does this bid need manager approval?" (automated route → human review).
- *Reconciliation app:* Decision = "Is this transaction a match?" (automated, by the matching rule) and "Is this exception material?" (automated classification → human queue).
- *Cross-system bridge:* Decision = "Create new ERP record or update existing?" (automated, by key match) and "Both sides changed — which wins?" (conflict rule → possibly human).

---

### 5.10 — Exceptions

| Field | Detail |
|---|---|
| **Question it asks** | What can go wrong during a run, and what should happen when it does? |
| **Why it matters** | Exceptions define the workflow's **robustness and failure handling**. They tell Swarm 2 what error states, retries, fallbacks, holds, and escalation paths are required. A workflow specified without its exceptions will appear to work in the demo and fail in production — so this category is treated as first-class, not an afterthought. |
| **Facts to capture** | Each exception's **trigger condition** (what makes it happen); its **severity/impact**; the **detection method**; the **handling strategy** — `retry` \| `fallback` \| `hold_for_review` \| `skip` \| `abort` \| `escalate`; the **responsible actor** for escalations; and any **notification** required. |

**Cross-archetype examples**

- *Estimating tool:* Exceptions = a requested item is missing from the rate sheet (→ hold for review / prompt user), or computed margin falls below the floor (→ escalate to manager).
- *Reconciliation app:* Exceptions = the feed fails to import (→ retry then abort with alert), or a one-to-many partial match is ambiguous (→ hold for review).
- *Cross-system bridge:* Exceptions = the ERP API is down (→ retry with backoff, then queue), or a required mapped field is empty (→ skip + notify), or a duplicate key collision (→ escalate).

---

### 5.11 — Audit

| Field | Detail |
|---|---|
| **Question it asks** | What about each run must be explainable, traceable, or retained after the fact? |
| **Why it matters** | Audit defines the workflow's **traceability and accountability** requirements. It determines what the build path must log, version, timestamp, and retain — and it is closely tied to **provenance** from CAKE (§2.1): just as every extracted *fact* carries provenance, every workflow *run* may need to carry an explainable trail. Regulated and financial workflows lean heavily on this category. |
| **Facts to capture** | What must be **logged** per run (inputs used, decisions made, who reviewed); the **retention requirement** (how long, where); whether **versioning** of inputs/rules/outputs is required; the **explainability requirement** (must a human be able to ask "why did it decide this?"); and any **compliance standard** the trail must satisfy. |

**Cross-archetype examples**

- *Estimating tool:* Audit = retain each estimate version, the rate sheet version used, who edited and approved it — so a disputed bid can be reconstructed.
- *Reconciliation app:* Audit = full trail of which transactions matched which, the tolerances applied, and who cleared each exception — for the financial audit. High requirement.
- *Cross-system bridge:* Audit = a log of every record synced, the source value, the written value, and any conflict resolution — so a wrong ERP value can be traced to its CRM origin.

---

### 5.12 — Success

| Field | Detail |
|---|---|
| **Question it asks** | How do we know the workflow is working — both per run and over time? |
| **Why it matters** | Success defines the workflow's **acceptance criteria and health metrics**. It closes the loop with Outcome (5.1): Outcome states the goal; Success states the measurable evidence the goal is being met. These criteria seed the **Simulation Pack** (the test cases Swarm 1 emits) and the monitoring the live workflow needs. |
| **Facts to capture** | The **per-run success definition** (what a correct output looks like); the **quality/accuracy metric** and its target; **throughput/latency** expectations; the **failure rate** that is tolerable; the **signals** that the workflow is degrading; and any **golden examples** of correct output found in the evidence (these become simulation test cases). |

**Cross-archetype examples**

- *Estimating tool:* Success = estimates match a manager-prepared "golden" estimate within X%, produced in under N minutes, with bid win-rate maintained. Golden estimates in the evidence become simulation cases.
- *Reconciliation app:* Success = ≥99% of transactions auto-matched correctly, zero false matches, exception list reconciles to the known answer for a sample period.
- *Cross-system bridge:* Success = every closed deal appears correctly in the ERP within the agreed latency, with zero dropped or duplicated records over a test batch.

---

## 6. Putting it together: the discovery interrogation

For any workflow, Swarm 1 fills the 12 categories from evidence, lets the rules layer normalize and default them, and treats every remaining hole as a candidate clarifying question. The completed set of 12 answers is the **input to archetype classification** (document 02) and the backbone of the **Workflow Design Specification** (defined later in the corpus).

A compact way to see the universality: the same 12-row interrogation, three different workflows.

| # | Category | Estimating tool | Reconciliation app | Cross-system bridge |
|---|---|---|---|---|
| 1 | Outcome | Win bids with fast, accurate prices | Close books faster, surface true exceptions | Eliminate double data-entry |
| 2 | Output | `artifact`: estimate PDF | `decision`+`artifact`: match labels + report | `action`+`state_change`: ERP write |
| 3 | Inputs | Scope, rate sheet, assumptions | Bank feed, ledger, tolerance | CRM record + field mapping |
| 4 | Trigger | `manual` (quote request) | `scheduled`/`manual` (period close) | `event` (deal closed) |
| 5 | Actors | Salesperson, manager, customer | Accountant, controller, acct. system | CRM, integration svc, RevOps owner |
| 6 | Human Review | Conditional (over threshold) | Mandatory on exceptions only | None in happy path |
| 7 | Systems | Price book (read), CRM (write) | Bank (read), ERP (read) | CRM (read) ↔ ERP (write) |
| 8 | Knowledge | Pricing formulas, rate sheet | Matching rules, chart of accounts | Field maps, conflict policy |
| 9 | Decisions | Rate tier; needs approval? | Is it a match? Material exception? | Create vs update; conflict winner |
| 10 | Exceptions | Missing item; margin too low | Import fails; ambiguous match | API down; empty field; key collision |
| 11 | Audit | Estimate + rate-sheet versions | Full match trail for audit | Per-record sync log + origin |
| 12 | Success | Within X% of golden, < N min | ≥99% auto-matched, 0 false | 0 dropped/dup, within latency |

Same 12 questions. Three completely different architectures fall out of the answers — which is precisely the point: **the lens is constant; the architecture is inferred.**

---

## 7. Cross-references

- **Document 02 — Archetype Framework:** recognizes a workflow's archetype from the *pattern* of its 12 answers, and maps that pattern to a build path.
- **Document 03 — Attribute Registry:** the concrete, searchable list of attributes CAKE looks for, each tagged with one of the 12 categories from this document.
- **Document 04 — Canonical Schema:** the typed destination tables/fields for extracted facts, each tracing back to one of the 12 categories.

The category names and numbering below are the canonical reference these documents cite.

---

## CANON: 12 Discovery Categories

| # | Category | Description |
|---|---|---|
| 1 | Outcome | What the business is ultimately trying to accomplish |
| 2 | Output | The artifact, decision, action, or state produced |
| 3 | Inputs | What information is required to run |
| 4 | Trigger | What causes the workflow to run |
| 5 | Actors | Who or what participates, and their roles |
| 6 | Human Review | Where human judgment is required to proceed |
| 7 | Systems | Existing tools or systems the workflow touches |
| 8 | Knowledge | Rules, policies, documents, or expertise required |
| 9 | Decisions | Choices the workflow automates or routes to humans |
| 10 | Exceptions | What can go wrong and how it is handled |
| 11 | Audit | What about each run must be explainable and retained |
| 12 | Success | How we know the workflow is working over time |
