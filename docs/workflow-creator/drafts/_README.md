# Workflow Creator — Starting Drafts

> **Status:** FIRST DRAFTS — to be optimized. Created 2026-05-29.
> **What these are:** a distilled, **business-user-facing** cut of four Workflow-Creator documents, written so a non-technical owner can review a workflow by **commenting on inputs and outputs only** — never by reading a schema.
> **Relationship to the audited corpus:** these distill the full corpus (`../00`–`../11`) and conform to the shared spine (`00-foundation-spine.md`). **Where a draft and the audited corpus disagree, the corpus governs and the draft is corrected.**

---

## The four documents (+ spine)

| File | Role | Maps to corpus |
|---|---|---|
| `00-foundation-spine.md` | Shared vocabulary anchor: the **business-user contract**, the 12 discovery categories, the 9 archetype tokens, the 5 primitives, the object catalog, the **distilled canonical field set**, and the **projection contract**. Keeps the four drafts from drifting. | `../00` operating model + a distilled cross-section |
| `01-discovery-framework.md` | The **universal lens** — the 12 questions Discovery asks of whatever the user uploads; which 3 surface to the user and which 9 are inferred silently. | distills `../01` |
| `02-boverse-layer.md` | The **BoVerse-specific interpretation** — primitives → archetype classification → the BoVerse objects to build (required / optional / unnecessary). Deterministic; invisible to the user. | fuses `../02`, `../09`, `../10` (primes with `../05`) |
| `03-attribute-registry.md` | The **target-search hit-list** — ~40 facts to extract from uploaded evidence, with search cues and the canonical field each populates. Pure machinery; the user never sees it. | distills `../03` |
| `04-canonical-table.md` | **The heart.** The source-of-truth store (Part A, internal) **plus** the projection engine that renders the only two surfaces the user sees: a **sample output** (Part B) and a **sample-inputs simulation pack** (Part C), and absorbs comments/edits via the **agree → modify → re-render → approve** loop (Part D). | fuses `../04`, `../07`, `../08` |

**Reading order:** `00` (spine) → `01` → `02` → `03` → `04`. If you only read one, read `04`.

---

## The one invariant that governs all four

The business user interacts with **exactly two surfaces — INPUTS and OUTPUTS — and nothing else.** They may only (a) **comment** on an input/output, or (b) **change an input value**. They never see the categories, the registry, the canonical fields, the archetypes, the rules, confidence, or provenance. Approval of the two surfaces is the **gate to the Build swarm**.

## The worked example (one coherent story across all four)

**Flint & Tinder** (Calgary creative agency) scoping **Northstar Brewing's "Cold Front" IPA Q3 launch** brief into a priced proposal — the live `../../BoVerse-Demo-2` bundle. Classifies as `sharp_point_solution`. The rendered sample output in `04` Part B is a draft proposal totalling **$39,401.25** (agency fees), with the demo's real rules honored: multiplier-before-discount, media pass-through at cost, and **no** repeat-client discount (Northstar at 1 prior job; threshold is 3).

---

## Decisions for the optimizer (consolidated punch-list)

These are the open questions the drafters surfaced. None are contradictions *within* the draft set (the reconciliation pass fixed 3 and verified the rest); they are **choices a human should make** when optimizing — several require reconciling the drafts against the audited corpus or the demo data.

### A. Naming — pick one set (touches all four)
- **Long vs short table names.** Drafts use `decision_rule` / `human_review` / `system_connector` (per the spine); the audited corpus `../03`/`../04` uses `rule` / `hitl` / `connector` for the same tables. Choose one convention and apply everywhere. *(Flagged inline in `01` §3 note c and `03` §4.)*
- **Draft title vs cross-reference name.** `04`'s H1 is "Canonical **Table**" but it is cross-referenced everywhere as "Canonical **Schema**"; `02` is "BoVerse-Specific Layer" but referenced as "Archetype Framework." Decide whether to unify display titles with cross-ref names.

### B. The worked example's price math — lock a single canonical version
- **Definition of "rush."** The drafts fire the rush multiplier when a line's delivery falls **inside that service's standard window**. The demo also defines a global `rush_threshold_days = 14` and a Playbook triage rule (decline if < 50% of standard days). With ID-001 at a 21-day standard and ~44 days available to July 1, a literal 14-day threshold would **not** trip — so the single canonical definition of "rush" must be chosen and the totals recomputed if it changes. *(Most important example issue — flagged in `01`, `04` Part B note, `04` open questions.)*
- **Rush multiplier value.** Service Catalogue says **1.35** (per-service); Pricing Rules say **1.4** (category-level). Drafts use 1.35 and surface the conflict as a user question. Pick the authoritative source.
- **Multi-SKU bundle discount.** Playbook says to *score* multi-deliverable briefs against the multi-SKU table "even if it doesn't strictly apply." Drafts treat Cold Front as single-SKU and do **not** apply it. Decide the default.
- **GST & pass-through scope.** Drafts compute GST on agency fees only and leave pass-through line amounts as "to be confirmed." Decide whether the sample output should carry illustrative pass-through figures (as the Aurora proposal did).
- **Optional lines.** Decide whether paid-social (SOC-001) / retainer (RETAIN-001) appear in the headline total or stay as add-ons.

### C. Corpus matrix reconciliation (affects `02`)
- **Object-matrix cells.** `../09` §5 and `../10` §3 disagree on a few cells (Rules/Wiki optional-vs-required for `app`; Sharp Point's UI). `02` followed `../10`'s stronger posture. Pick one source of truth per cell.
- **Library for the example.** `02` scopes Library to *skip* for Flint & Tinder. The past-winning Aurora proposal + brand voice could justify a RAG Library. Decide whether the canonical example should exercise a Library or stay lean.

### D. Scope/altitude choices
- **Governance facts.** `data_sensitivity`, `data_residency`, `retention_policy`, `compliance_standard` are flagged in `../03` §20 as having no clean canonical home (they route to the gap ledger). Decide whether the distilled drafts should carry these explicit schema-gaps or defer entirely to the full corpus.
- **`workflow_type` enum exposure.** `01` omits the `workflow_identity.workflow_type` precursor from the per-category tables to keep first-draft altitude. Decide whether it belongs in the Category 1/2 mapping rows.
- **Distilled subset boundary (`†` rows).** ~12 attributes in `03` map to valid `../04` fields that sit **outside** the spine's distilled §4 subset (marked `†`). Decide: keep the `†` convention, expand the spine subset, or drop those rows.

---

*Generated by a foundation → 4-way parallel draft → reconciliation workflow. The reconciliation report (verdict: FIXED-3-ISSUES, no residual contradictions) is in the task output; the most material cross-doc fix was aligning the proposal's `required_sections`/`required_fields` example lists across the spine, `03`, and `04`.*
