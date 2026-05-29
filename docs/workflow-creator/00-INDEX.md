# 00 — Corpus Index and Operating Model

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** the map of the corpus and the end-to-end operating model — read this first.
> **Status:** Portable IP / handoff artifact. Implementation-agnostic. An engineer on any stack (including boverse.io) must be able to implement against this corpus without further questions.

---

## 1. What this corpus is

This corpus is the **portable Workflow Creator framework** behind BoVerse and the **handoff artifact** for porting that framework into a separate product, **boverse.io**, built by a partner. BoVerse turns messy business evidence — freeform notes, SOPs, spreadsheets, screenshots, sample outputs, system exports, API/MCP descriptions — into working workflows. The user never designs the workflow directly: they describe the **outcome** they want and upload whatever **evidence** they already have, and the system **infers the architecture** and then builds it. The hard problem is therefore workflow **discovery**, not workflow construction. These eleven documents (01–11, indexed by this document 00) formalize and generalize the discovery-and-build pipeline so that an engineer on a different stack can implement it from the documents alone, with no access to the original prototype's source.

---

## 2. The two-swarm model

BoVerse runs as **two cooperating swarms**. The seam between them is a single artifact — the **Workflow Design Specification** — accompanied by a **Simulation Pack**.

| Swarm | Name | Responsibility |
|---|---|---|
| **Swarm 1** | Discovery | Ingests evidence, extracts workflow-relevant facts, maps them into canonical tables, applies a rules/wiki layer, classifies the workflow archetype, finds gaps, asks only high-value questions, and emits a deterministic **Workflow Design Specification** plus a **Simulation Pack**. |
| **Swarm 2** | Build | Consumes the specification and builds **only** the BoVerse objects the workflow actually needs. |

The chain of causation is strict and one-directional:

```
evidence ──▶ Discovery (Swarm 1) ──▶ architecture ──▶ build path ──▶ required objects ──▶ Build (Swarm 2)
```

> **Discovery determines the architecture. Architecture determines the build path. Build path determines the required objects.** Swarm 2 never invents scope; it only realizes what Swarm 1 decided.

**CAKE** is the evidence-to-canonical-facts engine that powers Swarm 1. It thinks in documents-as-evidence, attributes-as-extraction-targets, canonical facts, confidence, provenance, evolving registries, and missing information. It is the natural engine for Discovery.

---

## 3. The eleven documents

| # | Name | Purpose (one line) | Swarm |
|---|---|---|---|
| 01 | Workflow Discovery Framework | The universal lens: every workflow is analyzed through the same **12 discovery categories**. | Discovery |
| 02 | Workflow Archetype Framework | The **9 archetypes**, their decisive signals, and the tie-break order that classifies any workflow. | Both |
| 03 | Workflow Attribute Registry | The evolving extraction checklist — *what facts to look for* in evidence and the `table.field` each populates. | Discovery |
| 04 | Canonical Workflow Design Schema | The **14 canonical tables** — *where facts go*: named fields, types, enumerations, cross-references. | Both |
| 05 | Rules / Wiki Layer | Deterministic `condition → action` rules (Part A) plus append-only learned guidance (Part B) over the canonical facts. | Both |
| 06 | Missing Information Framework | How the system finds what it does not know, scores severity, and turns a gap into a single high-value question. | Discovery |
| 07 | Workflow Design Specification (Template) | The deterministic blueprint Discovery emits and Build consumes — the contract at the seam of the two swarms. | Both |
| 08 | Simulation Pack | The validation loop and demo artifact: a sample output worked **backward** to the synthetic inputs that would produce it. | Both |
| 09 | Build Mapping Framework | The deterministic map from **archetype → BoVerse objects to build** (required / optional / unnecessary). | Build |
| 10 | Object Creation Framework | The catalog of objects Swarm 2 generates, each defined to be produced **conditionally** — only when needed. | Build |
| 11 | Workflow Generation Framework | How Swarm 2 compiles an approved specification into a working application, workflow, bridge, or module. | Build |

---

## 4. The end-to-end operating model

The full lifecycle, as a numbered flow. Steps 2–10 are Swarm 1 (Discovery); steps 12–13 are Swarm 2 (Build).

1. **User describes and uploads.** The user states the **outcome** they want and uploads whatever **evidence** they have. They are never asked to design the workflow or fill in a long intake form.
2. **Registry defines targets** *(doc 03).* The Attribute Registry tells CAKE *what facts to look for* in the evidence and which canonical `table.field` each one populates.
3. **CAKE extracts** *(docs 01, 03).* CAKE reads the messy evidence and proposes candidate facts, each carrying a `confidence_score` and provenance. **This step is probabilistic.**
4. **Canonical tables store** *(doc 04).* Each candidate fact is forced into a named field, of a named type, in one of the **14 canonical tables** — or, if it has no home, it becomes a gap. This is the first place determinism is imposed.
5. **Rules / wiki interpret** *(doc 05).* Deterministic rules (Part A) fire over the canonical facts to classify, set flags, and select defaults; the learned wiki (Part B) primes extraction and gap-finding without overriding the rules.
6. **Discovery framework checks coverage** *(doc 01).* The **12 categories** are the checklist that confirms every dimension of the workflow has been addressed — Outcome, Output, Inputs, Trigger, Actors, Human Review, Systems, Knowledge, Decisions, Exceptions, Audit, Success.
7. **Archetype classified** *(docs 02, 05).* The rules assign exactly one `primary_archetype` (and zero or one `secondary_archetype`) from the **9 archetypes**. This is the architecture decision that determines the build path.
8. **Missing-info ledger finds gaps** *(doc 06).* Unanswered or low-confidence attributes, and any build-blocking ambiguities, are recorded with severity and blocking status.
9. **Targeted questions asked** *(doc 06).* Only the high-value or build-blocking gaps are surfaced to the user, as a short list of specific questions — not the full internal coverage interrogation.
10. **Design Specification + Simulation Pack produced** *(docs 07, 08).* Discovery emits the deterministic **Workflow Design Specification** and a **Simulation Pack** (a sample output worked backward to the inputs that would produce it) that proves comprehension before anything is built.
11. **User edits and approves.** The user reviews the specification and simulation in plain business terms, corrects anything wrong, and approves. Approval is the gate between the two swarms.
12. **Swarm 2 builds only what is needed** *(docs 09, 10, 11).* Build Mapping turns the archetype into a required/optional/unnecessary object set; Object Creation produces each needed object conditionally; the Generation Framework compiles the specification into the smallest working system that satisfies it.
13. **Run with audit and HITL** *(docs 04, 06, 10).* The built workflow runs with provenance retained for every run and with human-in-the-loop review at the points Discovery identified (low-confidence outputs, required approvals, escalations).
14. **Learnings update registry and wiki** *(docs 03, 05).* What each new workflow teaches feeds back into the evolving Attribute Registry (new extraction targets) and the append-only wiki (per-archetype patterns), so the next discovery is sharper.

---

## 5. Core principle: do not expose the plumbing

The user describes and uploads; the **system infers**. Everything that makes that inference work — **CAKE**, the **connectors**, the **human-in-the-loop** gates, the **canonical tables**, the **rules/wiki layer** — is internal plumbing and is **never surfaced to the user as machinery**. The user sees outcomes, evidence requests, a small number of high-value clarifying questions, and a specification they can read and approve. They never see a schema, a rule ID, a confidence ladder, or an object catalog.

This is a direct consequence of the two-swarm causal chain:

> **Discovery determines architecture; architecture determines build path; build path determines required objects.**

Because architecture is *derived from evidence* rather than *chosen by the user*, the user never has to understand or operate the architecture-deriving machinery. Exposing the plumbing would re-impose exactly the design burden the system exists to remove.

---

## 6. How this ports to boverse.io

These documents are **implementation-agnostic by design**: they name fields, types, enumerations, and cross-references explicitly, but they prescribe **no framework, language, database, or runtime**. The partner building **boverse.io** owns the frontend and the runtime; the deliverable here is the set of frameworks those systems must **consume and satisfy**.

- The **frontend** replicates the prototype's user experience — describe an outcome, upload evidence, answer a few targeted questions, review and approve a specification and simulation — while keeping all plumbing hidden (see §5).
- The **runtime** implements Swarm 1 and Swarm 2 against these documents: extraction targets (03), canonical store (04), rules/wiki (05), gap policy (06), the specification and simulation artifacts (07, 08), and the build pipeline (09–11).
- The **working prototype** — a Next.js app that runs a thin version of Swarm 1 as five stages (**ingest, clarify, simulate, generate, deliver**), with a multi-provider LLM layer (Cerebras, Gemini, Groq with fallback) and pgvector RAG — is the **reference behavior**. Its prompts and route logic are not the spec; they are the existence proof that these frameworks produce real output. When a document and the prototype disagree, the document governs and the prototype is updated.

---

## 7. The determinism note

**Extraction from messy evidence is probabilistic.** CAKE's reading of a note, screenshot, or SOP is LLM-driven; run twice, it may yield slightly different phrasing, ordering, or confidence. The corpus **never** describes that extraction as deterministic.

**Determinism comes from two constraints downstream of extraction:**

1. **The canonical schema** *(doc 04)* — named fields, types, enumerations, and required cross-references. It dictates *where a fact is allowed to land*. A fact with no valid destination becomes a gap, not a silent loss.
2. **The rules layer** *(doc 05, Part A)* — a fixed, ordered ruleset that reads canonical facts and fires the same way every time. Same facts in, same classification and same canonical writes out. It dictates *what a fact then means and triggers*.

> The schema and the rules are the deterministic constraints that **tame** the probabilistic step. The wiki (doc 05, Part B) is a learning aid that influences *what CAKE looks for*; it is not a determinism mechanism. Build (Swarm 2) inherits this discipline: it does not re-infer architecture, it deterministically compiles the already-fixed specification into objects.
