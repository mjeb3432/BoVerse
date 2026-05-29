# 05 — Rules / Wiki Layer

> **Series:** BoVerse Workflow Creator framework corpus
> **Status:** Portable IP / handoff artifact. Implementation-agnostic. An engineer on any stack must be able to implement against this document without further questions.
> **Consumes:** the canonical facts and confidence ladder produced by CAKE ([01 — Workflow Discovery Framework](01-discovery-framework.md)); the archetype signals and tie-break order ([02 — Workflow Archetype Framework](02-archetype-framework.md)); the canonical tables it writes into ([04 — Canonical Workflow Design Schema](04-canonical-schema.md), tables §9.1–§9.14).
> **Feeds:** the gap/question policy, the Workflow Design Specification, and the Build Swarm's object-selection logic (later documents in the corpus).

---

## 1. What this layer is, and why it exists

CAKE reads messy evidence and proposes candidate facts. That step is **probabilistic** — the same note, screenshot, or SOP run twice can yield slightly different phrasing, ordering, or confidence. The Rules / Wiki layer is what tames that output into something **deterministic and reproducible**.

It does so in two distinct ways, which this document keeps strictly separate:

- **Part A — Deterministic rules.** A fixed, ordered ruleset that reads canonical facts and *fires the same way every time*. Same facts in, same classification and same canonical-table writes out. These rules are not another LLM judgement; they are explicit `condition → action` statements over the five fact dimensions ([02 §2.3](02-archetype-framework.md)) and the canonical fields ([04 §9](04-canonical-schema.md)). This is where archetype classification, build-path defaults, connector decisions, review gates, and gap detection become testable instead of vibes.
- **Part B — Wiki / learned guidance.** An **append-only** body of accumulated patterns, one section per archetype, that captures *what BoVerse has learned tends to be true* for each shape of system. The wiki does not fire automatically and never overrides Part A; it primes extraction and gap-finding ("for an estimating app, you will almost always need a pricing source — go look for it") and it grows over time as more workflows are discovered.

> **Determinism boundary (read this once).** The LLM extraction inside CAKE is probabilistic and is never described otherwise. Determinism in BoVerse comes from two constraints downstream of extraction: the **canonical schema** (named fields, types, enumerations, required links — see [04](04-canonical-schema.md)) and **this rules layer** (Part A). The schema says *where a fact is allowed to land*; the rules say *what that fact then means and triggers*. Part B (the wiki) is a learning aid, not a determinism mechanism — it influences what CAKE looks for, but the rules still decide.

### 1.1 How a rule is written in Part A

Every Part A rule is stated in one row of a rules table with this shape:

| Column | Meaning |
|---|---|
| **Rule ID** | Stable identifier (`R-CLS-01`, `R-CONN-02`, …). Stable across versions; referenced by spec rationale and by tests. |
| **Condition** | A predicate over canonical facts / fields. Stated precisely enough to evaluate without re-reading evidence. |
| **Action** | What the rule does when the condition holds (assign a value, set a flag, create a row). |
| **Writes to** | The canonical table(s) from [04 §9](04-canonical-schema.md) the action writes, named by section. |
| **Confidence gate** | The minimum CAKE confidence the deciding fact must carry for the rule to fire silently (see ladder below). Below it, the rule defers to a clarifying question instead of firing. |

**Confidence ladder** (identical across the corpus — [01](01-discovery-framework.md), [02 §2](02-archetype-framework.md)):

| Level | Numeric band ([04 §2](04-canonical-schema.md)) | Meaning |
|---|---|---|
| `observed` | `0.90–1.00` | Stated directly in evidence. |
| `implied` | `0.70–0.89` | Strongly implied; multiple consistent signals, no competing one. |
| `inferred` | `0.50–0.69` | Most plausible reading, but a competing reading is live. |
| `guess` | `< 0.50` | Insufficient evidence; must ask before committing. |

Unless a rule states otherwise, its default confidence gate is **`implied`**: at `observed` or `implied` it fires; at `inferred` or `guess` it does not fire silently — it writes a gap row instead (see R-GAP-01).

---

## PART A — Deterministic Rules

The ruleset is grouped into six families. Within a family the rules are evaluated in order; the **classification family (R-CLS)** additionally obeys the global tie-break order from [02 §2.2](02-archetype-framework.md). Every rule names the canonical table it writes ([04 §9](04-canonical-schema.md)).

### A.1 Classification rules (assign the archetype)

These rules read the five fact dimensions — Outputs, Actors/user groups, Inputs, Decision points, Systems ([02 §2.3](02-archetype-framework.md)) — and write the **Workflow Archetype** table ([04 §9.13](04-canonical-schema.md)). The value written to `primary_archetype` / `secondary_archetype` is one of the **9 canonical archetypes**: *Workflow Component, Mini-App, Sharp Point Solution, Bridge, App, Decision-Support App, Integrated Workflow, Intelligence Layer, Operating Layer / OSO* (rules below name the display form; the value is **persisted as the snake_case token** per the display-name ↔ token map in [04 §9.13](04-canonical-schema.md)).

> **Tie-break (encoded bias against over-building).** When more than one R-CLS rule fires, choose the archetype lowest in the build-cost order ([02 §2.2](02-archetype-framework.md)) **unless** a higher-cost archetype's decisive signal fired at `observed` or `implied`. Order, lowest first: Workflow Component → Mini-App → Sharp Point Solution → Bridge → App → Decision-Support App → Integrated Workflow → Intelligence Layer → Operating Layer / OSO. R-CLS-99 enforces this.

| Rule ID | Condition | Action | Writes to | Confidence gate |
|---|---|---|---|---|
| **R-CLS-01** | Exactly **one main output** AND **one user group** AND **limited inputs** (one or a few), with one acute job named end-to-end. | Set `primary_archetype = Sharp Point Solution`. Record the firing facts in `evidence_for_classification`. | §9.13 | `implied` (decisive signature) |
| **R-CLS-02** | Evidence describes **coordinating status / handoffs across two or more existing tools** already in use, and no single deliverable is the goal — the goal is *flow*. | Set `primary_archetype = Bridge`. | §9.13 | `implied` (decisive signature) |
| **R-CLS-03** | The headline output is **recommendations, scenarios, priorities, scores, or decisions** produced from **structured AND unstructured inputs**, with reasoning. | Set `primary_archetype = Decision-Support App`. | §9.13 | `implied` (decisive signature) |
| **R-CLS-04** | **Multiple inputs AND multiple actors AND multiple outputs AND several decision points** all present; distinct roles act at distinct stages with handoffs; no single deliverable dominates. | Set `primary_archetype = Integrated Workflow`. | §9.13 | `implied` (decisive signature) |
| **R-CLS-05** | Evidence requires **canonicalizing facts across many documents/sources into one persistent, reconciled store**, queried by more than one downstream workflow; outputs are queries/analyses over canonical facts, not one fixed report. | Set `primary_archetype = Intelligence Layer`. The CAKE-store requirement is set by **R-CAKE-01**, which fires on the same canonicalization signal and sets `canonicalization_required = true` on the relevant Knowledge Source rows (§9.10). | §9.13 | `implied` (decisive signature) |
| **R-CLS-06** | **Multiple workflows AND shared canonical memory AND cross-system visibility — all three together**, framed as an operating layer for the organization, sitting above existing tools. | Set `primary_archetype = Operating Layer / OSO`. | §9.13 | `observed`/`implied` only (highest cost; demand all three decisive signals — [02 §3.9](02-archetype-framework.md)) |
| **R-CLS-07** | **One operation** framed as a step not a product; **no user group named** (consumer is "the system" or another workflow); output consumed by another process, not read by a human. | Set `primary_archetype = Workflow Component`. | §9.13 | `implied` |
| **R-CLS-08** | **One narrow job explicitly part of a bigger process**, for **one user group**, with light interaction and a thin/single-screen front end implied. | Set `primary_archetype = Mini-App`. | §9.13 | `implied` |
| **R-CLS-09** | **Front end + persistent data + repeatable interaction** all present, framed as a product with a clear single outcome (not a one-shot), for one or a few user groups returning over time — and **not** matching the Decision-Support signature (R-CLS-03) or the Integrated Workflow signature (R-CLS-04). | Set `primary_archetype = App`. | §9.13 | `implied` |
| **R-CLS-90** | A second archetype's decisive signal also fires at `observed`/`implied`, but the primary build path is unchanged by it (e.g. a Sharp Point Solution that *also* writes to one external system). | Set `secondary_archetype` to that archetype. **Never** let the secondary escalate `recommended_build_path` ([02 §2.1](02-archetype-framework.md)). | §9.13 | `implied` |
| **R-CLS-99** | More than one R-CLS-01..09 rule fired. | Resolve `primary_archetype` by the tie-break order above; demote the loser to `secondary_archetype` only if R-CLS-90's no-escalation condition holds, else drop it to a gap/future-fit note. Record the resolution in `evidence_for_classification`. | §9.13, §9.12 | n/a (meta-rule) |

> **Worked example (R-CLS-01 + R-CLS-99).** Evidence: one estimate output, one estimator user group, a handful of inputs — *plus* a single aside, "we'd love trends across all jobs eventually." R-CLS-01 fires at `observed`; the Intelligence-Layer signal (R-CLS-05) is a lone `guess`. Tie-break keeps **Sharp Point Solution** as primary. The Intelligence Layer is **not** assigned; R-GAP-04 records it as a future-fit gap.

### A.2 Build-path / object-selection rules (turn archetype into a build posture)

These rules read `primary_archetype` (and `secondary_archetype`) and populate the component lists on the **Workflow Archetype** table ([04 §9.13](04-canonical-schema.md)): `recommended_build_path`, `required_boverse_components`, `optional_components`, `unnecessary_components`. They encode the build postures from [02 §3](02-archetype-framework.md). The Build Swarm treats these as authoritative defaults; only a secondary archetype (R-CLS-90) or an explicit evidenced requirement may add an object the default omits.

| Rule ID | Condition | Action | Writes to | Confidence gate |
|---|---|---|---|---|
| **R-BLD-01** | `primary_archetype ∈ {Workflow Component, Mini-App, Sharp Point Solution}` AND evidence shows only **periodic / occasional file uploads** as the input path (no live system status, no continuous sync). | Add file-upload ingestion to `required_boverse_components`. Add **API / MCP live integrations** to `unnecessary_components` — **do NOT overbuild API integrations** for a workflow that only needs periodic uploads. | §9.13 | `implied` |
| **R-BLD-02** | `primary_archetype = Sharp Point Solution`. | `required_boverse_components`: one input contract, one output generator, the core rule/transform logic, provenance on the result. `unnecessary_components`: cross-system orchestration, multi-actor roles, intelligence store, broad auth. | §9.13 | `implied` |
| **R-BLD-03** | `primary_archetype = Bridge`. | `required_boverse_components`: state model, actor model, system connectors, handoff/routing logic. **Defer report templates** to `optional_components`. (Mirrors Part B wiki for Bridges.) | §9.13 | `implied` |
| **R-BLD-04** | `primary_archetype = Decision-Support App`. | `required_boverse_components`: front end, recommendation/scoring logic, scenario modelling, rationale generation, decision persistence. `unnecessary_components`: cross-system orchestration as a primary job, shared canonical store (unless Intelligence-Layer secondary fired). | §9.13 | `implied` |
| **R-BLD-05** | `primary_archetype = Integrated Workflow`. | `required_boverse_components`: multiple stages/workflows, several input+output contracts, multi-actor roles + handoffs, decision/branch logic, persistent process state, audit trail. | §9.13 | `implied` |
| **R-BLD-06** | `primary_archetype ∈ {Intelligence Layer, Operating Layer / OSO}` OR any Knowledge Source row has `canonicalization_required = true` (set by R-CAKE-01, §9.10). | `required_boverse_components`: a CAKE canonical store with provenance + confidence, reconciliation/dedup logic, multi-source ingestion, a query/analysis surface. For OSO additionally: multiple orchestrated workflows, cross-system connectors, role-aware surfaces. | §9.13 | `implied` |

### A.3 Knowledge / CAKE / rules-layer trigger rules

These rules decide when the workflow needs a persistent canonical store (a CAKE layer) and when it needs its own runtime rules/wiki layer. They write the **Knowledge Source** ([04 §9.10](04-canonical-schema.md)) and **Rule / Decision** ([04 §9.11](04-canonical-schema.md)) tables.

| Rule ID | Condition | Action | Writes to | Confidence gate |
|---|---|---|---|---|
| **R-CAKE-01** | Evidence requires **canonicalized facts reconciled across many documents/sources** into one persistent store that more than one step or workflow reuses. | Mark that a **CAKE layer is required**: set `canonicalization_required = true` on the relevant Knowledge Source rows; ensure R-BLD-06's components are present. | §9.10, §9.13 | `implied` |
| **R-KNOW-01** | Evidence shows **repeated interpretation of policy, contracts, or SOPs** — the workflow must consult the *same* rules/policy/reference repeatedly to behave correctly. | Create a **rules/wiki layer**: add a Knowledge Source row with `rule_or_reference = rule` (or `both`) and `source_type ∈ {policy_document, sop, regulation, pricing_book, reference_table}`; set `retrieval_required = true` where the source is consulted at runtime. | §9.10 | `implied` |
| **R-KNOW-02** | A Knowledge Source row has `canonicalization_required = true`. | For each interpretable clause, emit a candidate **Rule / Decision** row (`condition`/`action`/`threshold`), `source = <knowledge_id>`, `deterministic_status = unconfirmed`, `requires_confirmation = true`, `applies_to_step` set where known. | §9.11 | `implied` |
| **R-KNOW-03** | A knowledge source is **unstructured tribal knowledge** ("it's in X's head") with no document behind it. | Add the Knowledge Source row (`source_type = tribal_knowledge`) **and** a gap row (R-GAP) flagging that the rule cannot be made deterministic until captured. | §9.10, §9.12 | `inferred` (record even when weak) |

### A.4 Connector / systems rules

These rules decide how the workflow touches external systems, writing the **Systems / Connector** table ([04 §9.9](04-canonical-schema.md)).

| Rule ID | Condition | Action | Writes to | Confidence gate |
|---|---|---|---|---|
| **R-CONN-01** | Evidence requires **live system status** — current state must be read from (or written to) an external system at runtime (e.g. "show open tickets now", "post the invoice"). | Create **connector logic**: a Systems / Connector row with `connection_type` set (api/mcp/etc.), `read_required`/`write_required` per direction, `sync_frequency ∈ {real_time, on_demand}`, and a `fallback_method`. | §9.9 | `implied` |
| **R-CONN-02** | Evidence shows the input path is **only periodic file uploads / batch exports**, with no live-status requirement. | Set `batch_export_available = true`, `sync_frequency = batch_nightly` or `on_demand`; **do NOT** create API/MCP connectors (defer them to `unnecessary_components`, see R-BLD-01). Provenance of each upload still recorded. | §9.9, §9.13 | `implied` |
| **R-CONN-03** | An API/MCP description is supplied for a system but the workflow only ever reads a snapshot. | Prefer `connection_type = batch_export` or `api` with `sync_frequency = on_demand` over real-time polling. Record the richer capability in `optional_components`, not `required`. | §9.9, §9.13 | `implied` |

### A.5 Human-in-the-loop / review rules

These rules decide where a human must intervene, writing the **Human-in-the-Loop** table ([04 §9.6](04-canonical-schema.md)). Per the corpus invariant, every HITL row's `human_role` MUST resolve to a `role_name` in the **Actor / Role** table ([04 §9.5](04-canonical-schema.md)).

| Rule ID | Condition | Action | Writes to | Confidence gate |
|---|---|---|---|---|
| **R-HITL-01** | A step produces or sends **material external communication** (client-facing email, quote, contract, public post, payment, regulatory filing). | Insert a HITL row: `review_trigger = pre_send`, `approval_required = true`. **Human approval is required before send** — the step may not auto-dispatch. Bind `human_role` to an Actor with the relevant `approval_authority`. | §9.6 | `observed`/`implied` (safety rule — bias to requiring approval when unsure) |
| **R-HITL-02** | A step's controlling fact, rule, or extraction was produced at **`inferred` or `guess`** confidence (below the firing gate). | Insert a HITL row: `review_trigger = on_low_confidence`, `confidence_threshold` set to the firing gate, `approval_required = true`. **Low-confidence extraction routes to review** rather than running silently. | §9.6 | n/a (this *is* the low-confidence handler) |
| **R-HITL-03** | A Rule / Decision row has `requires_confirmation = true` (e.g. R-KNOW-02 output, or any `deterministic_status ∈ {heuristic, probabilistic, unconfirmed}`). | Insert a HITL row gating that rule's step; the rule may not fire automatically until a human confirms it (after which `deterministic_status` may be promoted to `deterministic`). | §9.6, §9.11 | `implied` |
| **R-HITL-04** | A step routes to a human-only decision the workflow does not automate (judgement call, exception approval). | Insert a HITL row with `escalation_path` set; bind `human_role` and `escalation_role` to Actors. | §9.6 | `implied` |

### A.6 Gap / question / ledger rules

These rules govern what BoVerse does *not* know, writing the **Missing Information / Ambiguity Ledger** ([04 §9.12](04-canonical-schema.md)). The policy is deliberately stingy: only blocking, high-value gaps become questions, so a human's attention is spent well.

| Rule ID | Condition | Action | Writes to | Confidence gate |
|---|---|---|---|---|
| **R-GAP-01** | An extraction needed by a downstream rule or output is **below `implied`** (`inferred`/`guess`), OR a fact does not fit any canonical field. | Create a ledger row capturing the `missing_attribute`; **nothing is silently dropped**. Set `severity`/`blocking_status` per the matrix below. | §9.12 | n/a (this is the catch-all) |
| **R-GAP-02** | A **missing attribute would change an output** (or its required sections, format, or approval) — e.g. an unknown pricing source for an estimate. | Set `severity = critical|high` and `blocking_status = blocking`; generate a single high-value `suggested_question` (a **user clarification prompt**); link `affected_output`/`affected_step`. **Missing attributes that affect outputs generate user clarification prompts.** | §9.12 | n/a |
| **R-GAP-03** | A gap is real but the workflow can proceed under a stated assumption (it does not change an output). | Set `blocking_status = non_blocking`, `resolution_status = assumed`; record the assumption. Do **not** generate a question (protects question budget). | §9.12 | n/a |
| **R-GAP-04** | A higher-cost archetype signal fired below `observed`/`implied` and was set aside by the tie-break (R-CLS-99). | Record a **future-fit** gap (`severity = low`, `blocking_status = deferred`) rather than building the larger shape. Optionally surface as a future-fit question. | §9.12 | n/a |
| **R-LEDGER-01** | The **same kind of question recurs across many workflows** (a question asked again and again during discovery — e.g. "what is your approval threshold?"). | Promote it to the **question ledger / registry**: a reusable, append-only catalogue of high-value questions keyed by archetype and missing attribute, so future discoveries ask it proactively. **Many recurring questions create a question ledger.** | §9.12 (+ registry; see Part B) | n/a |

**Severity / blocking matrix (used by R-GAP-01/02/03):**

| Does the missing attribute change an **output**? | Can a safe **assumption** proceed? | `severity` | `blocking_status` | Generates a question? |
|---|---|---|---|---|
| Yes | No | `critical` | `blocking` | **Yes** (one high-value prompt) |
| Yes | Yes, but risky | `high` | `blocking` | **Yes** |
| No | Yes | `medium`/`low` | `non_blocking` | No (record assumption) |
| Set aside by tie-break | n/a | `low` | `deferred` | Optional future-fit only |

### A.7 Rule-family precedence

When families interact, apply this order so results are deterministic:

1. **R-CLS** (classification) → fixes the archetype.
2. **R-CAKE / R-KNOW / R-CONN** → derive knowledge, CAKE, and connector needs from facts + archetype.
3. **R-BLD** (build posture) → reads the archetype *and* the R-CONN/R-CAKE outcomes to finalize component lists (so R-BLD-01's "do NOT overbuild API integrations" respects R-CONN-02).
4. **R-HITL** → adds review gates over the now-known steps and rules.
5. **R-GAP / R-LEDGER** → run last over everything, capturing every fact that fell below a firing gate and every output-affecting unknown.

---

## PART B — Wiki / Learned Guidance

> **Nature of Part B.** This section is **append-only** and **learns over time**. Each archetype accumulates patterns BoVerse has repeatedly found true. The wiki **does not fire automatically** and **never overrides Part A**. Its job is to *prime* CAKE extraction and gap-finding: it tells the system what to go looking for and what is usually missing, so the deterministic rules have better facts to act on. New entries are added (never silently rewritten); each entry should carry a short provenance note (which workflows taught it) when promoted.

### B.1 How wiki guidance is recorded

| Field | Meaning |
|---|---|
| **Pattern ID** | Append-only identifier (`W-SPS-01`, `W-BRG-02`, …). |
| **Archetype** | One of the 9 canonical archetypes the pattern applies to. |
| **Guidance** | What to look for / what is usually true. Phrased as a hint to extraction, not a hard rule. |
| **Why it primes** | Which Part A rule(s) or canonical table(s) the guidance feeds better facts into. |
| **Learned from** | Provenance: the kind(s) of workflow that established the pattern (added when promoted). |

The **question ledger / registry** referenced by R-LEDGER-01 lives alongside the wiki: an append-only catalogue of recurring high-value questions, keyed by `(archetype, missing_attribute)`, each mapped to the canonical field it resolves. When a discovery hits a known gap, the registry supplies a pre-vetted `suggested_question` instead of inventing one.

### B.2 Estimating / quoting apps (typically Sharp Point Solution or App)

| Pattern ID | Guidance | Why it primes |
|---|---|---|
| **W-EST-01** | **Always identify the pricing source.** An estimate is only as trustworthy as its prices — find the price book / rate sheet / quoting basis. | Feeds a Knowledge Source row (R-KNOW-01) and prevents an output-affecting gap (R-GAP-02). |
| **W-EST-02** | **Always identify the labour source.** Where do labour hours and rates come from (a rate book, a person, a system)? | Knowledge Source (§9.10); flags tribal knowledge via R-KNOW-03 if it lives "in someone's head". |
| **W-EST-03** | **Always identify the materials source.** Material lists and unit costs and their update cadence. | Knowledge Source (§9.10) with `update_frequency`. |
| **W-EST-04** | **Always identify the approval authority.** Who signs off a quote before it goes out, and at what threshold. | Drives an Actor (`approval_authority`, §9.5) and a pre-send HITL gate (R-HITL-01). |

### B.3 Bridges

| Pattern ID | Guidance | Why it primes |
|---|---|---|
| **W-BRG-01** | **Prioritize the state, actor, system, and handoff tables before report templates.** A Bridge's value is *flow*, not a document — model what moves, who moves it, between which systems, and at which handoffs first. | Orders extraction toward §9.5/§9.9 and the state/handoff model; mirrors R-BLD-03 (report templates deferred). |
| **W-BRG-02** | Look for the **trigger of each handoff** (what event passes work from one tool/actor to the next). | Feeds Trigger (§9.7) and the routing logic in R-BLD-03. |

### B.4 Reconciliation workflows (typically Workflow Component or Intelligence Layer)

| Pattern ID | Guidance | Why it primes |
|---|---|---|
| **W-REC-01** | **Always create an exception ledger.** Reconciliation is defined by its mismatches — capture deltas, unmatched rows, and why they failed. | Feeds a ledger/output and the gap policy (§9.12); aligns with the canonical "generate-ledger" component pattern. |
| **W-REC-02** | **Always track provenance.** Every reconciled fact must trace to its source row on both sides. | Forces Audit / Provenance rows (§9.14) and `fact_id` linkage. |

### B.5 Decision-support workflows

| Pattern ID | Guidance | Why it primes |
|---|---|---|
| **W-DS-01** | **Separate facts, assumptions, sensitivities, constraints, and recommendations.** Never blend them into one blob — a recommendation must show which facts and assumptions it rests on and how sensitive it is to each. | Shapes outputs (§9.3 `required_sections`) and rationale generation (R-BLD-04); assumptions become ledger rows (R-GAP-03). |
| **W-DS-02** | Make the **structured + unstructured input split** explicit (R-CLS-03's signature) — name which inputs are data and which are narrative/judgement. | Feeds Input / Evidence (§9.4) and confirms the Decision-Support classification. |

### B.6 Operating Layer / OSO

| Pattern ID | Guidance | Why it primes |
|---|---|---|
| **W-OSO-01** | **Identify the organizational-memory objects** — the entities the whole organization shares (clients, projects, assets, policies) that must live in one canonical memory. | Feeds the CAKE store (R-CAKE-01, R-BLD-06) and §9.10. |
| **W-OSO-02** | **Map cross-workflow dependencies** — which workflows read/write which shared objects, so the operating layer wires them coherently. | Informs the multi-workflow orchestration in R-BLD-06; surfaces missing dependencies as gaps (§9.12). |

### B.7 Intelligence Layer

| Pattern ID | Guidance | Why it primes |
|---|---|---|
| **W-IL-01** | **Name the canonical entity and its identity/dedup key first** — what is the "one true record" being built, and how are duplicates collapsed. | Feeds reconciliation/dedup logic (R-BLD-06) and §9.10 `canonicalization_required`. |
| **W-IL-02** | **Enumerate the downstream consumers.** An Intelligence Layer must serve more than one workflow; list them or it is probably Decision-Support instead. | Confirms R-CLS-05 vs the Decision-Support/Intelligence-Layer disambiguation ([02 §4](02-archetype-framework.md)). |

---

## 6. Cross-references

| Document | Relationship |
|---|---|
| [01 — Workflow Discovery Framework](01-discovery-framework.md) | Supplies the 12 categories, the confidence ladder, and CAKE — the probabilistic source this layer tames. |
| [02 — Workflow Archetype Framework](02-archetype-framework.md) | Defines the 9 archetypes, the five fact dimensions, the decisive signals, and the tie-break order that the R-CLS rules implement. |
| [04 — Canonical Workflow Design Schema](04-canonical-schema.md) | Defines tables §9.1–§9.14. Every Part A rule names the table it writes; the schema is the deterministic destination, this layer is the deterministic interpreter. |
| Gap & question policy (later in corpus) | Consumes R-GAP / R-LEDGER output: turns blocking, output-affecting gaps into the minimal set of high-value clarification prompts. |
| Workflow Design Specification (later in corpus) | Records the archetype, component lists, rules, HITL gates, and ledger this layer produced, with rule IDs as rationale. |
| Build Swarm object selection (later in corpus) | Reads the R-BLD component lists as authoritative defaults and refuses to build `unnecessary_components`. |

---

## 7. Determinism recap

CAKE extraction is probabilistic and is named as such. **Part A** is deterministic: a fixed, ordered, confidence-gated ruleset that reads canonical facts and writes canonical tables the same way every time — same facts in, same archetype, components, connectors, review gates, and gaps out. **Part B** is an append-only learning aid that improves the *facts* CAKE brings to Part A, but never decides on its own. Determinism in BoVerse is the schema ([04](04-canonical-schema.md)) plus this rules layer — the constraints on where a fact may land and what it then means — not any claim that the model itself is deterministic.
