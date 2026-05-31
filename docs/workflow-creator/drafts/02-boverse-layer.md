# 02 — BoVerse-Specific Layer (Draft)

**Purpose:** the opinionated layer that turns generic discovered facts into a *BoVerse-shaped* workflow — it decides the primitives, the archetype, and the exact BoVerse objects to build (and refuse to build).

**Status:** first draft (to be optimized).

> **What the business user sees:** **nothing in this document is shown to the user.** This is the internal machinery that runs *between* the two contract surfaces. Discovery has already extracted facts; this layer reads them deterministically and decides what to build. The only way the user ever perceives this layer is **indirectly** — as the *shape and quality of the sample output* (and the inputs worked backward from it). A sharp, one-page priced proposal — rather than a sprawling multi-screen app — is this layer doing its job. The user never sees a primitive, an archetype token, an object name, or a build decision (`see Doc 00 — Index §5`).

---

## 0. Where this layer sits

Discovery (Swarm 1) produces canonical facts (`see Doc 04 — Canonical Schema`). Build (Swarm 2) compiles objects. **This layer is the hinge between them** — it reads the facts and decides the architecture, in three deterministic moves:

```
discovered facts (§4)  ─▶  PRIMITIVES        what kind of step is each thing
   (probabilistic)     ─▶  ARCHETYPE         what shape of system is this, really
                       ─▶  BoVerse OBJECTS   exactly which objects Swarm 2 builds
   ──────────────────────────────────────────────────────────────────────────
   (deterministic: rules over canonical facts — same facts in, same shape out)
```

Three things make a recommended architecture *BoVerse-shaped* rather than generic:

1. **It reduces every step to one of 5 primitives** (§1) — the atomic verbs BoVerse builds from.
2. **It classifies the whole into exactly one of 9 archetypes** (§2), choosing the *smallest correct shape* via a tie-break that is biased against over-building.
3. **It maps that archetype to a fixed set of BoVerse objects** (§3) — building only what the shape requires and explicitly refusing the rest.

Distilled from `see Doc 02 — Archetype Framework`, `see Doc 09 — Build Mapping`, `see Doc 10 — Object Creation Framework`, and `see Doc 05 — Rules/Wiki`.

---

## 1. The 5 primitives

Every workflow step, no matter the domain, reduces to one of five atomic primitives. They are the verbs the Build swarm assembles into a runnable process (`see README — Brand`; `see Doc 00 — Spine §3.1`). Naming a step's primitive is the first BoVerse-specific act: it says *what category of work* the step is, independent of the business jargon the evidence used.

| Primitive | What it does | Flint & Tinder example |
|---|---|---|
| `ingest` | Bring evidence/data in. | Read the inbound Northstar brief (deliverables requested, the July 1 identity sub-deadline inside the Aug 5 launch) and the rate-card rows. |
| `transform` | Reshape, compute, or enrich it. | Decompose the brief into catalogue line items (ID-001, CAMP-001, PHOTO-001) and compute each line's price: base × rush multiplier, then discounts, per the pricing math. |
| `validate` | Check it against rules/constraints. | Test the request against rules: is a line's delivery inside that service's standard window — e.g. identity by July 1 vs ID-001's 21-day standard (yes → rush applies)? Is the client at ≥3 prior jobs (no → repeat discount withheld)? Is the brief in an excluded industry (no)? |
| `action` | Produce an output or write to a system. | Render the draft proposal (Scope, Line Items, Pricing, Terms) as the deliverable the user receives. |
| `feedback` | Capture human review / learning back into the system. | Route the proposal to the Creative Director for pre-send approval (it crosses the $25k gate); capture the approve/edit decision. |

> **Why primitives matter to the rest of the layer.** The primitive a step carries previews its compile target in Build: a `transform`/`validate` step driven by policy becomes a deterministic rule call; a `transform` needing judgement becomes an agent task; a `feedback` step becomes a human gate (`see Doc 10 §3.5`). The mix of primitives present is itself a classification signal — a workflow that is mostly `ingest → transform → action` with one `feedback` is the signature of a focused, end-to-end job.

---

## 2. The 9 archetypes and the tie-break order

The archetype is the **coarse classification that determines the build path** — the single answer to *"what shape of system is this, really?"* (`see Doc 02 — Archetype Framework §1`). Getting it wrong is the most expensive mistake in the pipeline: over-build a one-output request into a multi-screen app, or under-build a multi-actor program into a report generator. The archetype is the control that prevents both.

Exactly **one `primary_archetype`** and **zero or one `secondary_archetype`** is assigned per workflow. A secondary adds objects but **never escalates the primary build path** and must be evidenced, not aspirational (`see Doc 02 §2.1`).

### 2.1 The decisive signal for each archetype

Listed in canonical **tie-break order** — lowest build cost first. Each row gives the one fact pattern that decisively identifies it (the full signal tables live in `see Doc 02 §3`).

| Order | Token (snake_case) | Display name | Decisive signal (the fact pattern that identifies it) |
|---|---|---|---|
| 1 | `workflow_component` | Workflow Component | One operation framed as a step, **no user group** named; output consumed by another process, not read by a human. |
| 2 | `mini_app` | Mini-App | One narrow job **explicitly part of a bigger process**, one user, thin/single-screen UI. |
| 3 | `sharp_point_solution` | Sharp Point Solution | **One main output + one user group + limited inputs** — one painful job solved end-to-end. |
| 4 | `bridge` | Bridge | **Coordinating status/handoffs across two or more existing tools**; the goal is *flow*, not a single artifact. |
| 5 | `app` | App | **Front end + persistent data + repeatable interaction** — a product users return to with saved state. |
| 6 | `decision_support_app` | Decision-Support App | The headline output is **recommendations / scenarios / scores from structured + unstructured inputs**, with reasoning. |
| 7 | `integrated_workflow` | Integrated Workflow | **Multiple inputs + multiple actors + multiple outputs + several decision points**, all present; distinct roles act at distinct stages. |
| 8 | `intelligence_layer` | Intelligence Layer | **Canonicalizing facts across many sources into one persistent, reconciled store** queried by more than one downstream workflow. |
| 9 | `operating_layer_oso` | Operating Layer / OSO | **Multiple workflows + shared memory + cross-system visibility, all three together** — an operating layer above the org's existing tools. |

### 2.2 The tie-break: cheapest shape that fits wins

When two archetypes' signals fire with comparable strength, the rule is:

> **Prefer the lower-cost archetype as primary, unless a higher-cost archetype's decisive signal fires at `observed` or `implied` confidence.**

This is the structural bias against over-building, encoded (`see Doc 02 §2.2`; implemented as rule `R-CLS-99`, `see Doc 05 §A.1`). A lone, low-confidence mention of a bigger ambition — *"we'd love trends across all our jobs eventually"* — never silently escalates the build; it is recorded as a future-fit note, not a build target (`see Doc 05 §A.6`, `R-GAP-04`). The result: BoVerse defaults to the **smallest correct system**, and any larger shape must earn its place with strong, present evidence.

---

## 3. The mapping chain: facts → primitives → archetype → objects

This is the causal chain the whole corpus turns on (`see Doc 09 — Build Mapping §1`):

```
Discovery determines architecture
  → architecture determines build path
    → build path determines required objects
```

The archetype is the input to a **deterministic lookup**: given the `primary_archetype` (a closed enum) plus any `secondary_archetype`, the set of BoVerse objects to build is fixed. No re-inference happens at build time.

### 3.1 The BoVerse object catalog (what Swarm 2 can build)

Ten object categories. **Every object is conditional** — built only when a spec condition switches it on, never by default (`see Doc 10 §1.1`; `see Doc 00 — Spine §3.3`).

| Object | One-line purpose | Headline switch |
|---|---|---|
| Library | Retrievable reference knowledge (RAG) consulted at runtime. | A knowledge source needs runtime retrieval (`retrieval_required = true`). |
| Registry | The app-specific attributes the built workflow extracts toward each run. | Steps extract recurring attributes from inputs at runtime. |
| Canonical Tables | The workflow's own persistent, typed fact store across runs. | The workflow persists facts/records across runs. |
| Rules/Wiki | Executable decision logic + reference policy that makes the output *correct*. | `decision_rule` rows exist, or knowledge needs canonicalization. |
| Workflow | The runnable process itself (steps, routing, exceptions, HITL gates, thresholds). | **Always** — every archetype has ≥1. |
| Connectors | The integration surface to external systems (MCP/API/batch/write-back). | A `system_connector` is referenced by a required input, step, or trigger. |
| UI | The human surfaces (intake, upload, review, editable report, status, approval, preview). | An actor interacts, or a HITL gate exists — and only the implied surfaces. |
| Audit Layer | Per-run logs, fact provenance, review/approval trail, output versioning. | Any retention / explainability / approval / versioning requirement. |
| Reporting Layer | Aggregate views/metrics across many runs. | Output is a dashboard/report, or metrics tracked over time. |
| Decision Layer | Scoring, ranking, recommendations, scenarios, sensitivity. | Headline output is a recommendation/score/ranking/scenario. |

### 3.2 Archetype → required / optional / unnecessary objects

The deterministic map, distilled from `see Doc 09 §5` and `see Doc 10 §3`. **● = required** (built by default); **○ = optional** (built only if a secondary archetype or an explicit evidenced fact also fires); **· = unnecessary** (refused by default — an explicit instruction *not* to build it).

| Object | Workflow Component | Mini-App | Sharp Point | Bridge | App | Decision-Support | Integrated Workflow | Intelligence Layer | Operating Layer / OSO |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Library** | · | · | ○ | · | ○ | ○ | ○ | ● | ● |
| **Registry** | ○ | ○ | ● (limited) | ○ | ○ | ○ | ○ | ● (broad) | ● |
| **Canonical Tables** | · | ○ | · (emit + forget) | ● (state/event) | ● | ● | ● (process state) | ● (reconciled) | ● (org state) |
| **Rules/Wiki** | ● | ○ | ● | ○ | ○ | ● | ● | ● (reconciliation) | ● |
| **Workflow** | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| **Connectors** | · | · | · (or upload-only) | ● (multiple) | ○ | · | ○ | ○ (ingest) | ● (cross-system) |
| **UI** | · (none) | ● (thin) | ● (thin) | ● (status tracker) | ● (full) | ● (full) | ● (multi-role) | ○ | ● (full + status) |
| **Audit Layer** | ● (minimal) | ● | ● (minimal) | ● | ● | ● (high) | ● (high) | ● | ● (full) |
| **Reporting Layer** | · | · | · | ● (status) | ○ | ○ | ○ | ○ | ● (exec) |
| **Decision Layer** | · | · | · | · | · | ● (defining object) | ○ | ○ | ○ |

> **How to read this table.** The columns are in build-cost order. A Workflow Component builds ~3 objects; an OSO builds nearly all ten — *same catalog, only the switches differ* (`see Doc 10 §4`). A `secondary_archetype` promotes its distinctive objects from **·**/**○** into `optional_components`, but **never** adopts the secondary's whole column and **never** escalates the primary build path (`see Doc 09 §5`). Likewise, a single evidenced fact can move *one* object from **·** to **●** with a recorded justification — e.g. a Sharp Point Solution whose one step must write to an external system gains a Connector, and nothing else (`see Doc 09 §6`, step 5).

### 3.3 The build procedure (deterministic, minimal by construction)

Swarm 2 applies this fixed algorithm (`see Doc 09 §6`):

1. **Read** the `primary_archetype` and `secondary_archetype`.
2. **Seed required** from the primary archetype's **●** column.
3. **Seed unnecessary** from the primary archetype's **·** column.
4. **Add secondary as optional only** — never to required, never escalating the build path.
5. **Apply evidenced exceptions** — move *one* object from unnecessary to required if a specific fact proves it, recording the justifying `fact_id`.
6. **Demote unevidenced wishes** — "might be nice later" becomes a future-fit note, not a build target.
7. **Emit the build path** — the archetype's one-line `recommended_build_path`, adjusted only for step-5 exceptions.

The output is reproducible, auditable, and minimal: the same facts always yield the same object set.

---

## 4. The determinism note

This layer is the **deterministic interpretation** of the workflow. That distinction is load-bearing and binding on the whole corpus (`see Doc 00 — Spine §6`; `see Doc 05 §7`):

| Stage | Nature | Why |
|---|---|---|
| Fact **extraction** (Discovery / Swarm 1) | **Probabilistic** | An LLM reads messy evidence; the same note run twice can yield slightly different phrasing or confidence. |
| **This layer** (primitives, archetype, objects) | **Deterministic** | Fixed, confidence-gated rules read canonical facts and fire the same way every time. |

> **Same facts in → same archetype + same object set out.** Determinism in BoVerse does **not** come from the extraction step — it comes from two downstream constraints: the **canonical schema** (typed fields, closed enums, required links) and the **rules layer** (`condition → action` over those fields). The schema says *where a fact may land*; the rules say *what that fact then means and triggers*. Archetype classification is therefore not a second free-form LLM judgement layered on top — it is a deterministic function of the canonical facts plus the ruleset (`see Doc 02 §1`, `see Doc 09 §1.1`).

Two consequences worth stating:

- **Probabilistic steps survive only inside deterministic guardrails.** Where a built object embeds an LLM step at runtime (an agent task, an extraction in a Connector), it is always wrapped by the schema it must emit into, the rules that validate it, and a confidence threshold that routes low-confidence results to a human (`see Doc 10 — preamble`).
- **The build mapping is a lookup, not a model.** Because the archetype is a closed enum, the required/optional/unnecessary object sets are fixed tables (§3.2). Nothing about the build is improvised.

---

## 5. Worked classification: Flint & Tinder

Discovery has read the Northstar Brewing Q3 IPA-launch bundle and produced canonical facts. This layer now interprets them — entirely behind the scenes.

### 5.1 Primitives present

| Primitive | Present? | The step in this workflow |
|---|---|---|
| `ingest` | ● | Read the inbound brief + rate-card rows + pricing rules + client history. |
| `transform` | ● | Decompose the brief into line items; compute base × rush multiplier, then discounts, then add the at-cost pass-through. |
| `validate` | ● | Check the rush condition (identity line inside ID-001's 21-day standard window → rush fires), the repeat-client threshold (1 prior job < 3 → no discount), the excluded-industry list, the approval gate ($25k+). |
| `action` | ● | Render the draft proposal — the deliverable. |
| `feedback` | ● | Creative-Director pre-send approval (crosses the $25k gate); capture approve/edit. |

The signature — a mostly linear `ingest → transform → validate → action` chain with a single `feedback` gate — points squarely at a focused, end-to-end, one-output job.

### 5.2 Archetype

| Signal read from canonical facts | Fires for |
|---|---|
| **One main output** (a priced proposal) | Sharp Point Solution (decisive) |
| **One user group** (the brief-handling pod / one approver) | Sharp Point Solution (decisive) |
| **Limited inputs** (brief, rate card, pricing rules, client history) | Sharp Point Solution (decisive) |
| One acute job named end-to-end (brief → priced proposal) | Sharp Point Solution (supporting) |
| No "keep everything in sync across tools" language | confirms *not* a Bridge |
| Output is an artifact, not a ranked recommendation with reasoning | confirms *not* Decision-Support |
| Lone aside about an optional retainer add-on / future trends | recorded as a future-fit note, not an escalation |

**Result:** `primary_archetype = sharp_point_solution`; **no secondary fires** (the rush write-back is to a generated document and an internal approval, not to a coordinated set of external tools). This is rule `R-CLS-01` firing at `implied`, with the tie-break (`R-CLS-99`) keeping the lower-cost shape because no higher-cost decisive signal reaches `observed`/`implied` (`see Doc 05 §A.1`).

### 5.3 Objects built

Applying the Sharp Point Solution column (§3.2) and the build procedure (§3.3):

| Object | Built? | Why |
|---|---|---|
| **Workflow** | ● Build | Always — the brief→proposal process: ingest, decompose, price, gate, render. |
| **Rules/Wiki** | ● Build | The pricing logic that makes the proposal *correct*: rush multiplier when a line beats its service's standard window, **multiplier-before-discount** (the Lighthaus rule), repeat-discount at ≥3 jobs, the $25k/$60k approval gates, media spend always at-cost. |
| **Registry** (limited) | ● Build | A small set of recurring attributes to extract per run: `service_code`, `delivery_days`, `rate_card_cad`, `rush_multiplier`, `prior_jobs`. |
| **Canonical Tables** | ● Build (minimal) | A focused store for runs of this one job — enough to persist each proposal's line items; not a broad analytical model. |
| **UI** (thin) | ● Build | Upload interface for the brief/rate card, an output-preview of the draft proposal, and an approval page (the output crosses the $25k gate, so `approval_required = true`). |
| **Audit Layer** (minimal) | ● Build | A run log + fact provenance so the proposal's numbers are defensible (which rule produced the rush line, the at-cost pass-through). |
| **Connectors** | · Skip | Inputs arrive as uploads, not a live system feed (`R-CONN-02` / `R-BLD-01`: do **not** overbuild API/MCP integrations for periodic uploads). |
| **Decision Layer** | · Skip | The output is a priced artifact, not a ranked recommendation with reasoning. |
| **Reporting Layer** | · Skip | One artifact per run; nothing is tracked across many runs. |
| **Library** | · Skip | The pricing knowledge reduces cleanly to executable rules, so it lives in Rules/Wiki, not a retrieval corpus. *(Would flip to ○ only if correctness depended on grounding against un-ruleable reference text — e.g. brand-voice exemplars.)* |

**Net:** roughly six objects, not ten. That restraint — the refused Connectors, Decision Layer, Reporting Layer, and Library — *is* the BoVerse-specific layer doing its job.

### 5.4 What the user sees (and does not)

> The user **never** sees §5.1–§5.3. They see only the rendered **draft proposal** (the OUTPUTS surface) and the **sample inputs** worked backward from it (the INPUTS surface) (`see Doc 00 — Spine §1`, §5). Every decision above manifests for the user as a single fact: the system handed them a tight, correct one-page proposal — not a sprawling app, and not a thin report missing its pricing logic. The shape and quality of that output is the only visible trace of this entire layer.

---

## 6. Cross-references

| Document | Relationship |
|---|---|
| `see Doc 00 — Spine` | Defines the 5 primitives, the 9 archetype tokens, the object catalog, and the do-not-expose-the-plumbing contract this document conforms to. |
| `see Doc 02 — Archetype Framework` | The full 9-archetype signal tables, the five fact dimensions, and the tie-break order distilled in §2. |
| `see Doc 04 — Canonical Schema` | The canonical facts this layer reads; the Workflow Archetype table (§9.13) holds the `required`/`optional`/`unnecessary` component lists and `recommended_build_path`. |
| `see Doc 05 — Rules/Wiki` | Implements classification, build-posture, connector, HITL, and gap decisions as explicit deterministic rules (`R-CLS-*`, `R-BLD-*`, `R-CONN-*`). |
| `see Doc 09 — Build Mapping` | The deterministic archetype → object lookup (§3.2) and the anti-over/under-build procedure (§3.3). |
| `see Doc 10 — Object Creation Framework` | Defines each of the ten objects and the spec condition that switches it on. |
