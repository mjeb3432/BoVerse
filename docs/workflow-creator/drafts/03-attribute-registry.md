# 03 — Attribute Registry (Draft)

**Purpose:** the target-search checklist — given whatever the user uploads, the explicit hit-list of facts to extract and exactly where each one lands in the Canonical Table (`see Doc 04 — Canonical Schema`).

**Status:** first draft (to be optimized).

> **What the business user sees:** *nothing.* The registry is pure internal machinery — the swarm's search list for reading uploaded evidence. The user only ever uploads files and later reviews the two surfaces (sample INPUTS + sample OUTPUT, `see Doc 00 — Index §5`, spine §1). The whole point of this registry is that the user can **just upload and never fill in a form**: every fact below is hunted for automatically, scored, and traced to its source behind the scenes.

---

## 1. What this document is

The Canonical Schema (`see Doc 04`) says **where facts go**. This registry says **what facts to look for** before they can go anywhere. It is the search-and-extraction checklist the Discovery swarm (Swarm 1) works through when it reads the pile of evidence the user dropped in — the freeform brief, the rate-card spreadsheet, the pricing-rules JSON, the SOP/playbook, the one past proposal, the screenshots, the API/MCP description.

Each row names a **single fact worth hunting for**, says in plain English what it means, lists the **search cues / synonyms** to look for, names the exact **canonical field** it populates, and flags **user-facing?** (almost always **no**). The division of labor is the whole point and it preserves the corpus determinism stance (`see Doc 00 — Index §7`, spine §6):

- **Registry (this doc) — probabilistic target list.** "Go find whether there is an approval threshold anywhere in this evidence." Reading messy evidence and proposing a value is LLM-driven and non-deterministic.
- **Schema (`see Doc 04`) — deterministic destination.** The proposed value must land in a named field, of a named type, drawn from a closed enum where one applies, stamped with confidence and provenance — or else become a gap in the ledger (`missing_information`, `see Doc 04 §9.12`).

> The registry tells the swarm *what to look for*; the schema constrains *where the answer is allowed to land*. Determinism lives in the schema and the rules layer, never in the act of extraction.

This is a **first-draft, high-value subset** (~40 attributes), not the exhaustive registry. It is grouped by the 12 discovery categories (`see Doc 01 — Discovery Framework`) plus two derived groups (archetype signals, governance). It is designed to grow: new industries surface new high-value facts as new rows; the canonical schema does **not** grow casually — a fact with no home is recorded as a gap and raised as a schema-change proposal, never forced into an unrelated field.

---

## 2. How to read a registry row

| Column | Meaning |
|---|---|
| **Attribute** | snake_case name of the fact to extract. Stable; cite by name in tooling. |
| **What it is** | One-line definition — what the swarm is actually looking for. |
| **Search cues / synonyms** | Words, patterns, and structures in the evidence that signal this fact is present. |
| **Maps to (canonical field)** | The destination in `see Doc 04`, written `table.field`. The single most important column. Every attribute resolves to a field that exists in Doc 04 (the spine §4 distils the highest-value subset; a few destinations below live in the fuller Doc 04 beyond that subset and are noted with `†`). |
| **User-facing?** | Whether the user ever perceives this fact. Almost always **No** — only Outcome (1), Output (2), and Inputs (3) content reaches the two surfaces, and even then only as the rendered surfaces, never as a named field. |

> `†` = destination field exists in the full Doc 04 schema but is outside the spine's distilled field set (spine §4). Still a valid, deterministic home.

---

## 3. Evidence type → what it usually yields

The closed set of evidence types BoVerse ingests, and the facts each one most reliably carries. This is how the swarm decides *which file to read for which fact*. The human label maps to the concrete `input.format` enum (`see Doc 04 §9.4`).

| Evidence type | `input.format` | What it usually yields (highest-value facts) |
|---|---|---|
| **Freeform brief / notes** | `plain_text`, `email`, `docx` | Outcome, stated problem, the ask (Outputs requested), Inputs available, deadlines/triggers, budget signal, tacit constraints, competitor/tool mentions. |
| **Rate card / spreadsheet** | `xlsx`, `csv` | Line-item catalog, prices, lookup tables, standard vs rush delivery, formulas, structured Inputs, expected volumes. |
| **Pricing-rules JSON** | `json` | Deterministic rules: thresholds, multipliers, discounts, approval gates, payment terms, exclusions. The richest source of `decision_rule` rows. |
| **SOP / playbook** | `docx`, `pdf`, `plain_text` | Ordered steps, actor roles, approval gates, decision logic, exception handling, "things we forget to ask" gaps, determinism cues. |
| **Past sample output** | `pdf`, `docx`, `plain_text` | Output format, required sections + fields, tone/quality bar, worked example of rules applied, a golden case for grading. |
| **Screenshot** | `image` | System identity, on-screen fields, the current manual surface, what data is visible where. |
| **API / MCP description** | `json`, `api_payload`, `plain_text` | System name + connection type, read/write surface, auth method, named data objects, sync cadence — the Connector facts. |

> Flint & Tinder bundle (the `BoVerse-Demo-2` files) exercises six of these at once: a freeform brief (`01_inbound_brief.txt`), a rate-card spreadsheet-as-JSON-array (`02_service_catalogue.json`), a pricing-rules nested JSON (`03_pricing_rules.json`), an SOP/playbook (`04_internal_playbook.md`), and a past winning proposal (`05_past_winning_proposal.txt`).

---

## 4. The registry (grouped by discovery category)

Categories follow the canonical numbering (`see Doc 01`, spine §2). Categories 1–3 feed the two user-facing surfaces; 4–12 are internal. Numbering is load-bearing — do not renumber.

### 4.1 Category 1 — Outcome
*Why the workflow exists; the north star that bounds scope. Found mostly in prose.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `stated_problem` | The problem as the client phrased it, verbatim | "we need…", "we're trying to…", the opening ask | `workflow_identity.stated_problem` | No (frames the ask) |
| `inferred_problem` | The real problem as Discovery reads it | gap between what's asked and what's implied | `workflow_identity.inferred_problem` | No |
| `primary_objective` | The single most important thing a run must achieve | "the goal is…", "what matters is…", the bolded ask | `workflow_identity.primary_objective` | No (frames the ask) |
| `business_value` / `pain_being_removed` | Why it matters; what's slow/manual/error-prone today | "we lose…", "takes us days", "they ghosted us", $ at stake | `outcome.business_value` | No |
| `success_metric` | The measurable definition of success | "win rate", "sell-through", a target number | `outcome.success_metric` | No |
| `time_savings` | Time saved per run, qualitative or quantified | "2 days → 20 min", "same day instead of a week" | `outcome.time_savings` | No |

### 4.2 Category 2 — Output
*The artifact a single run produces. The OUTPUTS surface is rendered from these. Strongest evidence: a past sample output.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `output_name` | Human-readable name of the deliverable | the noun the client wants ("a proposal", "a quote") | `output.output_name` | **Yes** (renders into sample output) |
| `output_type` | Kind of artifact | document / report / dataset / decision / message / alert | `output.output_type` | **Yes** (medium of sample) |
| `output_format` | Concrete file/wire format | "PDF", "Word doc", "spreadsheet", "email", file extensions | `output.output_format` | **Yes** (medium of sample) |
| `required_sections` | Named sections the output must contain | headings in the sample ("Scope", "Line Items", "Pricing", "Terms") | `output.required_sections` | **Yes** (section headings) |
| `required_fields` | Named fields the output must populate | populated values in the sample ("total", "deposit", "valid_until") | `output.required_fields` | **Yes** (populated fields) |
| `approval_required` | Whether sign-off is needed before release | "Renée approves", "sign-off", "before we send" | `output.approval_required` | No |
| `editable_by_user` | Whether a human may edit before finalizing | "draft", "before finalizing", "we tweak it" | `output.editable_by_user` | No |
| `output_quality_criteria` / `tone` | How a correct output is judged; voice/branding | "on-brand", "clear total not add-ons", style notes | `output.quality_criteria` | No (sets the bar) |
| `golden_output_example` | A known-correct exemplar to grade against | a provided past/won deliverable | `output.source_examples` | No |

### 4.3 Category 3 — Inputs
*What must be present for a run to produce its output. The INPUTS surface is rendered from the runtime subset. **Critical disambiguator:** `input_type` separates evidence-for-discovery from required-runtime-inputs — only the latter materialize into the Simulation Pack and Connectors (`see Doc 08 — Simulation Pack`).*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `input_name` | Human-readable name of an input | the named things a run consumes ("the brief", "rate card") | `input.input_name` | **Yes** (renders into sample inputs) |
| `input_role` | discovery_evidence vs required_workflow_input vs both | does the *built* workflow need this each run, or only Discovery? | `input.input_type` | No (decides surface membership) |
| `input_source_system` | System/origin the data comes from | "from email", "in Notion", "uploaded file", "QuickBooks" | `input.source_system` | No |
| `input_format` | Concrete format of the input | file type, "spreadsheet", "JSON", "scanned" | `input.format` | No |
| `input_structure` | structured / semi_structured / unstructured | table vs prose vs scan | `input.structured_or_unstructured` | No |
| `input_required_or_optional` | Whether a run can proceed without it | "optional add-on", "if available", "we always need" | `input.required_or_optional` | No |

### 4.4 Category 4 — Trigger
*What causes a run to begin. Found in SOPs and email threads.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `trigger_type` | Category of trigger | "when an email arrives", "every Monday", "on upload", manual | `trigger.trigger_type` † | No |
| `trigger_manual_or_automated` | Human-initiated vs automatic | "someone kicks it off" vs "fires automatically" | `trigger.manual_or_automated` † | No |
| `trigger_description` | Plain-English start condition | "a new brief comes in", "client emails us" | `trigger.trigger_description` † | No |

### 4.5 Category 5 — Actors
*Who/what participates and the authority each holds. The referent for HITL and step ownership.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `actor_role_name` | Canonical name of a participating role | named roles/titles ("Managing Partner", "Estimator", "the pod") | `actor.role_name` | No |
| `actor_kind` / human-or-system | individual / team / role_function / external_party | a person vs a team vs a system actor | `actor.person_or_team` | No |
| `actor_responsibility` | What this actor does in the workflow | "X scopes", "Y prices", "Z signs off" | `actor.responsibility` | No |
| `actor_approval_authority` | Authority + value ceiling to approve | "$25K+ needs…", "can approve up to…" | `actor.approval_authority` | No |
| `actor_interaction_type` | performs_work / reviews / approves / is_informed / consulted | the verb attached to the role | `actor.interaction_type` | No |

### 4.6 Category 6 — Human Review (HITL)
*Where human judgment is required before the workflow proceeds. `human_review.human_role` MUST resolve to an `actor.role_name`.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `hitl_stage` | The step where intervention occurs | "before sending", "at pricing", "after draft" | `human_review.workflow_stage` | No |
| `hitl_human_role` | The role that intervenes (→ `actor.role_name`) | named approver/reviewer | `human_review.human_role` | No |
| `hitl_review_trigger` | What pulls a human in | always / on_threshold_breach / on_high_value / pre_send / on_low_confidence | `human_review.review_trigger` | No |
| `hitl_value_threshold` | Monetary/quantitative threshold forcing review | "$25K+", "anything over…" | `decision_rule.threshold` | No |
| `hitl_approval_required` | Whether it's a blocking approval gate | "non-negotiable", "must sign off", "cannot skip" | `human_review.approval_required` | No |

### 4.7 Category 7 — Systems
*The integration surface. API/MCP descriptions become concrete connectors here.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `system_name` | Name of an external system touched | product names ("Notion", "QuickBooks", "Meta", "TikTok") | `system_connector.system_name` | No |
| `system_connection_type` | api / mcp / batch_export / file_drop / manual_entry / webhook | "via API", "export CSV", "we paste it in" | `system_connector.connection_type` | No |
| `system_read_required` | Whether the workflow reads from it | "pull from", "look up in" | `system_connector.read_required` | No |
| `system_write_required` | Whether it writes back (system-of-record side effect) | "create a page", "post to", "update the record" | `system_connector.write_required` | No |
| `system_authentication` | Auth method required | "API key", "OAuth", "SSO login" | `system_connector.authentication_required` | No |

### 4.8 Category 8 — Knowledge
*The rules/wiki/reference layer — what the workflow must consult to be **correct**, not merely well-formed. Pricing JSON and playbooks are richest here.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `knowledge_source_name` | Named knowledge source | "rate card", "pricing rules", "the playbook", "policy" | `knowledge.knowledge_source_name` † | No |
| `knowledge_source_type` | policy_document / reference_table / pricing_book / tribal_knowledge / prior_examples | the kind of reference | `knowledge.source_type` † | No |
| `lookup_table_ref` | A reference/lookup table consulted | a rate sheet, a code→price map, a catalog | `knowledge.knowledge_source_name` † | No |
| `formula_definition` | A calculation the workflow applies | "base × multiplier × (1 − discount)", any formula | `decision_rule.action` | No |
| `tacit_knowledge_item` | Expert judgment that is implied, not written | "we always assume…", post-mortem lessons, "what we forget to ask" | `knowledge.source_type` (= `tribal_knowledge`) † | No |

### 4.9 Category 9 — Decisions (+ Process structure)
*The branch points where Knowledge is applied, and the ordered steps decisions live inside. Rules anchor to steps via `decision_rule.applies_to_step`.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `rule_name` | Human-readable name of a rule | named rules ("Rush Multiplier", "Multiplier-Before-Discount") | `decision_rule.rule_name` | No |
| `decision_condition` | When the rule fires | "if delivery < 14 days", "when total > $X" | `decision_rule.condition` | No |
| `decision_action` | What happens when it fires | "apply 1.4×", "require deposit", "route to approval" | `decision_rule.action` | No |
| `decision_threshold` | The numeric/categorical test | "14 days", "$25,000", "3 prior jobs" | `decision_rule.threshold` | No |
| `decision_determinism_status` | deterministic / heuristic / probabilistic / unconfirmed | hard rule vs judgment call vs unconfirmed | `decision_rule.deterministic_status` | No |
| `decision_requires_confirmation` | Whether a human must confirm before it auto-fires | "Renée treats as a soft synonym", anything unconfirmed | `decision_rule.requires_confirmation` | No |
| `step_name` | Human-readable name of a process step | numbered/ordered steps in an SOP | `process_step.step_name` | No |
| `step_sequence_order` | Position in the ordered process | "first…", "then…", "in this order", numbering | `process_step.sequence_order` | No |
| `step_actor_responsible` | Role responsible, if human-performed | the role attached to a step | `process_step.actor_responsible` | No |
| `step_determinism_flags` | Whether the step is rule-governed / needs LLM judgment / needs a human gate | "mechanical" vs "craft/judgment" vs "needs sign-off" | `process_step.deterministic_rule_available`, `.probabilistic_reasoning_required`, `.hitl_required` | No |

### 4.10 Category 10 — Exceptions
*What can go wrong during a run and how it is handled. Modeled as step failure modes + rule-level handling.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `exception_trigger_condition` | What makes an exception happen | "if inputs missing", "when the printer spec is unknown" | `process_step.error_conditions` † | No |
| `exception_handling_strategy` | retry / fallback / hold_for_review / skip / abort / escalate | "escalate to Renée", "hold for review", "fall back to…" | `decision_rule.exception_handling` † | No |

### 4.11 Category 11 — Audit
*What about each run must be explainable, traceable, or retained. Tied to provenance (`see Doc 04 §9.14`).*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `audit_what_logged` | What must be logged per run | "log who approved", "record decisions" | `human_review.audit_required` † | No |
| `audit_source_traceability` | Whether each output value must trace to its source | "show where the number came from", "defensible" | `provenance.source_document` † | No |

### 4.12 Category 12 — Success
*How we know it's working, per run and over time. Seeds the Simulation Pack grading.*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `success_per_run_definition` | What a correct output looks like for one run | "a clean priced proposal", acceptance language | `output.quality_criteria` | No |
| `success_metric` | The measurable metric of success | a target number / KPI | `outcome.success_metric` | No |
| `success_golden_case` | A known-correct input/output pair as a test case | a won proposal with its inputs | `output.source_examples` | No |

### 4.13 Derived group A — Archetype signals
*Not a discovery category. Fact patterns the rules layer matches to assign an archetype (`see Doc 02 — Archetype Framework`). The extracted signal text lands on `archetype.evidence_for_classification`; the decision lands on `archetype.primary_archetype` / `secondary_archetype`. Counts are computed by counting rows (in `output`, `actor`, `system_connector`), not stored as columns.*

| Attribute | What it signals | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `signal_output_count` | single-output vs multi-output discriminator | how many distinct deliverables the request produces | `archetype.evidence_for_classification` † (count of `output` rows) | No |
| `signal_user_group_count` | App vs Mini-App vs Sharp Point discriminator | how many distinct user groups return over time | `archetype.evidence_for_classification` † (count of `actor` rows) | No |
| `signal_one_output_one_user_limited_inputs` | decisive signature of **Sharp Point Solution** | one main output + one user group + limited inputs | `archetype.evidence_for_classification` † | No |
| `signal_workflow_type` | coarse functional precursor to archetype | document_generation / decision_support / extraction… | `workflow_identity.workflow_type` | No |

### 4.14 Derived group B — Risk / Governance
*Not a discovery category. Surfaces compliance, data-sensitivity, and confidence risks that gate the build. Several map deliberately to the ledger because an unanswered governance question is a **blocking gap**, not a silent default (`see Doc 04 §9.12`).*

| Attribute | What it is | Search cues / synonyms | Maps to (canonical field) | User-facing? |
|---|---|---|---|---|
| `gov_write_to_system_of_record` | Writes an irreversible side effect to a system of record | "post the invoice", "create the record" | `system_connector.write_required` | No |
| `gov_confirmation_before_action` | Human must confirm before an irreversible/external action | "approve before sending", "confirm before posting" | `decision_rule.requires_confirmation` | No |
| `gov_unconfirmed_rule` | A rule the client hasn't confirmed; must not auto-fire | "soft synonym", "treats as", "we usually" | `decision_rule.deterministic_status` (= `unconfirmed`) | No |
| `gov_blocking_gap` | A missing fact that blocks a correct build | derived during extraction; absent required facts | `missing_information.blocking_status` | No (may surface as a high-value question) |
| `gov_clarifying_question` | The single high-value question to close a gap | derived; the "stuff we forget to ask" items | `missing_information.suggested_question` | No (may surface as a high-value question) |

> **Note on user-facing.** Two governance rows can *indirectly* reach the user — not as fields, but as the rare high-value clarifying question Discovery is allowed to ask before the approve/modify loop (spine §1.1, `see Doc 06`). The user answers a plain-business question; they never see the `missing_information` row, its severity, or its mapping.

---

## 5. Confidence and provenance (always present, never shown)

Every extracted attribute carries two pieces of internal metadata that travel with it and are **never surfaced to the business user**: a **confidence score** (`confidence_score`, `float[0..1]`) recording how sure the swarm is the value is right — `0.90–1.00` directly stated, `0.70–0.89` strongly implied, `0.50–0.69` plausible inference, `< 0.50` a guess — and a **provenance pointer** (`fact_id` → a row in `provenance`, `see Doc 04 §9.14`) recording the exact source document and location (the file, the cell, the line, the sentence) the value came from, plus how it was extracted, who reviewed it, and its version. Low-confidence and unconfirmed facts are what drive the small number of clarifying questions; provenance is what lets the swarm (and a human auditor, never the business user) trace any canonical value back to the evidence that produced it. Confidence scores, provenance, and gap severities are all hidden by design — exposing them would re-impose the design burden the system exists to remove (`see Doc 00 — Index §5`).

---

## 6. Worked examples — Flint & Tinder (Northstar Q3 IPA)

Two concrete extractions from the `BoVerse-Demo-2` bundle, showing the exact cue that found the fact and the canonical field it populated. (Northstar classifies as `sharp_point_solution` — one output, one user group, limited inputs.)

| Attribute | Exact cue in the uploaded files | Canonical field populated |
|---|---|---|
| `decision_threshold` (rush) | `04_internal_playbook.md` §3 (*"rush_multiplier per category if delivery_days < category.delivery_days_standard"*), cross-checked against the brief's "compress the identity work to be done by July 1" (inside `ID-001`'s 21-day standard window) | `decision_rule.threshold` = `"delivery_days < delivery_days_standard"` (the Rush Multiplier rule); the identity line gets its per-service `rush_multiplier` 1.35 (the category-level 1.4 in `03_pricing_rules.json` is the conflicting value surfaced as a question — `see Doc 04 §B.2`) |
| `rule_name` = "Multiplier-Before-Discount" | `04_internal_playbook.md` §3: *"**Multipliers apply BEFORE discounts.** This is the Lighthaus rule… Never again."* | `decision_rule.rule_name`, with `deterministic_status = deterministic`, `applies_to_step` → the pricing step |
| `gov_blocking_gap` (printer spec) | `04_internal_playbook.md` §8: *"Where the cans/labels are going to print… we've held up two launches by not asking this"* — and the brief never states it | `missing_information.missing_attribute` = "printer spec", surfaced via `missing_information.suggested_question` |
| `signal_one_output_one_user_limited_inputs` | The brief: *"we want this to be a single proposal with a clear total, not a series of add-ons"* (one output) for one buyer (Priya/Northstar) from a handful of files | `archetype.evidence_for_classification` → `archetype.primary_archetype = sharp_point_solution` |

A note the registry catches deliberately: `05_past_winning_proposal.txt` states Northstar is *"now at 1 prior job… The 5% repeat discount kicks in at job 3."* Cross-referenced with `03_pricing_rules.json` → `"repeat_client_threshold_jobs": 3`, the swarm extracts `decision_condition`/`decision_threshold` such that the repeat-client discount correctly does **not** fire — a fact that shapes the sample output without the user ever seeing the rule.

---

## 7. Business-user view (the whole reason this exists)

The registry is **pure machinery**. The business user never sees a category, an attribute, a search cue, a canonical field, a confidence score, or a provenance pointer. They do exactly one thing that touches this document: **they drop their files in.** Everything in §3–§6 then happens automatically — the swarm decides which file to read for which fact, proposes values, scores and traces each one, and routes the gaps. The user's next moment is reviewing the two rendered surfaces (sample INPUTS + sample OUTPUT, spine §1) and, at most, answering a couple of plain-language questions. The registry exists so that the user **can just upload and never fill in a form** — which is the entire promise of the system.

---

## 8. Summary

- The registry defines **what to look for**; `see Doc 04` defines **where it lands**. Extraction is probabilistic; the schema and rules layer are the deterministic constraints.
- Attributes are grouped by the **12 discovery categories** plus derived **archetype-signal** and **risk/governance** groups. This first-draft subset (~40 attributes) covers the highest-value facts, not the exhaustive set.
- Every attribute names its **evidence-type affinity**, its **search cues**, and its exact **canonical field** (all resolving to fields in Doc 04; the spine §4 distils the most-used subset).
- Every extracted value carries a hidden **confidence score** and a **provenance pointer**; neither is ever shown to the business user.
- **User-facing? = No** on essentially every row — the registry's success condition is that the user just uploads and is never asked to fill in a form.
