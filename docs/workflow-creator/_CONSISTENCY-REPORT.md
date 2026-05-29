# Cross-Document Consistency Report — BoVerse Workflow Creator Corpus

> **Scope:** Audit of cross-document consistency across the Workflow Creator framework corpus, documents `00-INDEX` through `11`.
> **Method:** Every Markdown file in `docs/workflow-creator/` was read in full. The audit checked: (a) the Attribute Registry (03) "Maps to" references against the Canonical Schema (04); (b) the archetype names used in Rules/Wiki (05) and Build Mapping (09) against the Archetype Framework (02); (c) the component vocabulary shared by Build Mapping (09), Object Creation (10), and Workflow Generation (11); (d) the 12 discovery categories across Discovery (01), Attribute Registry (03), and Missing Information (06); and (e) contradictions, duplicated/renamed fields, and orphan references corpus-wide.
> **Status:** Report only. No other file was edited.
> **Files audited (12):** `00-INDEX.md`, `01-discovery-framework.md`, `02-archetype-framework.md`, `03-attribute-registry.md`, `04-canonical-schema.md`, `05-rules-wiki.md`, `06-missing-information-framework.md`, `07-workflow-design-specification.md`, `08-simulation-pack.md`, `09-build-mapping-framework.md`, `10-object-creation-framework.md`, `11-workflow-generation-framework.md`. *(No document 12 exists.)*

---

## Verdict

**RESOLVED — all 9 issues fixed (2026-05-29).** Original audit: **FAIL, 9 issues** (2 critical, 3 high, 4 low). Every issue has since been corrected in documents 00–11; a re-grep confirms none of the original problem patterns (`data_transformation_pipeline`, `requires_cake_layer`, the stale `0x-*.md` cross-reference filenames, the out-of-enum `review_trigger` tokens) remain anywhere in the framework documents. The detailed findings below are retained verbatim as the audit trail.

### Resolution log

- **Issues 1 + 2 + 8 (archetype tokens) — fixed.** Doc 04 §9.13 `primary_archetype` / `secondary_archetype` now enumerate the **9 canonical snake_case archetype tokens** (`workflow_component … operating_layer_oso`); a **display-name ↔ token map** was added beneath the table; §9.1 `workflow_type` spelling normalized (`multi_step_orchestration`); doc 05 §A.1 notes that values persist as the token.
- **Issues 5, 6, 7 (cross-reference numbering) — fixed.** Docs 01, 02, 04 cross-references reconciled to the authoritative `00-INDEX` §3 numbering (Archetype = 02, Registry = 03, Schema = 04, Rules = 05, Missing-Info = 06, Design-Spec = 07, Build-Mapping = 09). Doc 04's broken `0x-*.md` header links repointed to the real filenames.
- **Issue 3 (review_trigger) — fixed.** `pre_send` added to the §9.6 `review_trigger` enum (mandatory human approval before external send); doc 05 R-HITL-02 corrected to `on_low_confidence`.
- **Issue 9 (orphan flag) — fixed.** `requires_cake_layer` removed from doc 05; R-CLS-05 and R-BLD-06 rebound to the existing `canonicalization_required` (§9.10) signal — no schema change needed.
- **Issue 4 (component vocabulary) — fixed.** Doc 09 gained an authoritative **§2.1 component → object crosswalk** (C1–C13 → the 10 doc-10 objects, incl. C1+C2 → UI and C13 → composition); the "verbatim / no-synonym" claims in docs 09 and 10 were softened to "realize per the crosswalk."

The single most important issue (Issue 1) is resolved: the §9.13 enum now holds the 9 archetype tokens every other document writes into it.

---

## Original audit (retained for the record)

**FAIL — 9 issues found** (2 critical, 3 high, 4 low). The corpus is conceptually coherent and the four foundational vocabularies (12 discovery categories, 9 archetypes, 14 canonical tables, 13 build components) are stable in *intent* across documents. However, the audit found one corpus-breaking schema contradiction and a systematic cross-reference numbering drift in two documents that must be fixed before handoff.

The single most important issue: **the Canonical Schema (04) `archetype.primary_archetype` / `secondary_archetype` enums (§9.13) do not contain the 9 canonical archetype names** that every other document writes into those fields. This is a direct schema-vs-usage contradiction (Issue 1).

---

## PASS list (what is consistent and correct)

- **P1 — The 9 archetype *names* are consistent across the prose of 02, 05, 06, 09, 10, 11, and 00.** All seven documents use the identical canonical set, in the same order: *Workflow Component, Mini-App, Sharp Point Solution, Bridge, App, Decision-Support App, Integrated Workflow, Intelligence Layer, Operating Layer / OSO.* Doc 05 §A.1 lists them verbatim; doc 09 §3 and §5 use all nine; doc 11 §7 step 7 enumerates all nine; doc 02 §3 is the source registry. The build-cost tie-break order (02 §2.2) is reproduced identically in 05 §A.1 and 09 §3. *(The contradiction is with the doc-04 enum tokens, not with these names — see Issue 1.)*

- **P2 — The 12 discovery categories are numbered consistently across 01, 03, and 06.** Doc 01 §5.1–§5.12 and its `CANON` table define categories 1–12; doc 03 §6–§17 headers map each attribute group to "Category N"; doc 06 §2.1 coverage map lists all 12 in the same order with the same names. The category→number binding (1 Outcome … 12 Success) never drifts.

- **P3 — Almost every "Maps to (table.field)" reference in the Attribute Registry (03) resolves to a real field in the Canonical Schema (04).** Spot-verified across all 14 registry groups: e.g. `outcome.outcome_description`, `output.output_format`, `input.source_system`, `actor.role_name`, `hitl.review_trigger`, `connector.write_required`, `knowledge.source_type`, `rule.condition`, `process_step.hitl_required`, `missing_information.blocking_status`, `archetype.evidence_for_classification`, `provenance.fact_id`, `provenance.review_status` all exist in 04. Doc 03 §3.1 supplies an explicit short-name → §9.x table resolver that matches 04 §2.2 exactly. The four genuinely unmapped attributes are *correctly* flagged as schema gaps in 03 §20 (`audit_retention_requirement`, `audit_compliance_standard`, `gov_data_sensitivity`, `gov_data_residency`) and routed to `missing_information.missing_attribute` — this is honest, not a defect.

- **P4 — The 14 canonical tables and their §9.x numbering are stable across the corpus.** Docs 03, 05, 06, 07, 08, 09, 10, 11 all reference the same §9.1–§9.14 anchors with the same table identities (e.g. §9.6 Human-in-the-Loop, §9.12 Missing Information / Ambiguity Ledger, §9.13 Workflow Archetype, §9.14 Audit / Provenance). Doc 04 §9 explicitly marks the numbering as canonical and "do not renumber," and downstream docs honor it.

- **P5 — The structural invariants are stated identically everywhere they appear.** "HITL → Actor" (`hitl.human_role` resolves to `actor.role_name`) and "Rule → Step" (`rule.applies_to_step` resolves to a `step_id` or null) appear in 04 §2, 06 §2.1, 07 §5/§9.D/§9.E, 08 A10, and 11 §3.0/§3.3 with consistent semantics. The evidence-vs-required-input distinction (`input.input_type ∈ {discovery_evidence, required_workflow_input, both}`) is consistent across 04 §9.4, 06 §2.1, 07 §6, 08 A2, 10 §3.6, 11 §3.4.

- **P6 — The 4 component lists on `archetype` (§9.13) are used consistently as the build contract.** `required_boverse_components`, `optional_components`, `unnecessary_components`, and `recommended_build_path` are referenced identically as authoritative by 05 §A.2, 07 §11, 09 §1/§6, 10 §1.2, and 11 §2.1/§6. The "unnecessary = refuse to build" discipline is stated the same way in all of them.

- **P7 — The 13-component build vocabulary (09) and the 10-object catalog (10) are *conceptually* aligned and 10/11 agree with each other.** Doc 10's objects and doc 11's stage outputs use the same object names (Library, Registry, Canonical Tables, Rules/Wiki, Workflow, Connectors, UI, Audit Layer, Reporting Layer, Decision Layer); doc 11 §4 maps each generation stage to a doc-10 object cleanly. *(The mismatch is between 09's C1–C13 term spelling and 10's object names — see Issue 4 — but the mapping is unambiguous and 10↔11 are internally consistent.)*

- **P8 — The determinism framing is uniform across all 12 documents.** Every document states that LLM extraction is the probabilistic step and that the canonical schema (04) plus the rules layer (05) are the deterministic constraints; none mislabels extraction as deterministic. 00 §7, 01 §2.2, 04 §1, 05 §1/§7, 06 §1.2, 07 §1, 08 §1.1, 09 §1.1, 10 determinism note, 11 §2.1/§5 are mutually consistent.

- **P9 — The 00-INDEX operating model agrees with the per-document operating models.** The 14-step lifecycle in 00 §4 matches the 14-step flow in 11 §7 (same ordering, same doc attributions, same "probabilistic step" placement at CAKE extraction).

- **P10 — The HITL `review_trigger` enum is used correctly in 03, 08, and 11.** Doc 03 §11/§19 uses `on_low_confidence`; doc 08 §6.1 (A10) uses `on_high_value`; doc 11 §3.3 lists `always, on_low_confidence, on_threshold_breach, on_exception` — all valid members of the 04 §9.6 enum. *(Doc 05 is the lone exception — see Issue 3.)*

---

## ISSUES list (numbered; file, problem, suggested fix)

### 1. [CRITICAL] Canonical Schema (04) archetype enums do not contain the 9 archetype names that every other document writes into them

- **Where:** `04-canonical-schema.md` §9.13, fields `primary_archetype` and `secondary_archetype` (lines ~393–394).
- **Problem:** The enum is `enum(document_generation, data_transformation_pipeline, decision_support, classification_routing, monitoring_alerting, extraction_enrichment, multi_step_orchestration, approval_review, other/none, unknown)` — eight *functional-type* tokens. But the 9 canonical archetypes (02 §3) are *Workflow Component, Mini-App, Sharp Point Solution, Bridge, App, Decision-Support App, Integrated Workflow, Intelligence Layer, Operating Layer / OSO.* The schema field that is supposed to store the archetype literally cannot hold any of the nine values the rest of the corpus assigns to it. Doc 05 §A.1 (R-CLS rules) explicitly writes `primary_archetype = Sharp Point Solution`, `= Bridge`, `= Intelligence Layer`, etc. — all of which the doc-04 enum forbids. Docs 02 §2, 06 §4.1, 07 §2/§11, 09 §3, 11 §2.1 all treat `primary_archetype` as one of the nine names. This is the central spine of the corpus (Discovery → archetype → build path) and it is broken at the schema level. The enum appears to be a leftover that duplicates a variant of the `workflow_identity.workflow_type` list (04 §9.1).
- **Suggested fix:** Replace the §9.13 `primary_archetype` / `secondary_archetype` enums with the 9 canonical archetype tokens (and `none`/`unknown` for the secondary), e.g. `enum(workflow_component, mini_app, sharp_point_solution, bridge, app, decision_support_app, integrated_workflow, intelligence_layer, operating_layer_oso, unknown)`. Decide a single casing/token convention and apply it everywhere (see Issue 2). Keep the functional-type list *only* on `workflow_identity.workflow_type` (§9.1), where it correctly belongs as "a coarse precursor to the archetype classification."

### 2. [CRITICAL] Three incompatible representations of the archetype value coexist across the corpus

- **Where:** Title-case names in `02`, `05`, `06`, `09`, `10`, `11`, `00` (e.g. "Sharp Point Solution"); snake_case token in `07-workflow-design-specification.md` §14 filled example (`primary_archetype = sharp_point_solution`, `secondary_archetype = none`, lines ~332, 349–350, 467); functional-type enum in `04-canonical-schema.md` §9.13 (`document_generation`, …).
- **Problem:** Even setting aside Issue 1, the corpus has not chosen one serialization for the archetype value. Doc 07's worked example uses `sharp_point_solution` (snake_case), which matches neither the prose names ("Sharp Point Solution") nor the doc-04 enum. An implementer cannot know whether the stored value is `Sharp Point Solution`, `sharp_point_solution`, or `document_generation`. Doc 04 §2.1 says "implementations SHOULD store the token, not the label," which implies a snake_case token is intended — so the *prose* names need a defined token mapping, and doc 04's enum must list those tokens.
- **Suggested fix:** In doc 04, define the canonical token set for the 9 archetypes once (snake_case, per 04 §2.1), and add a one-line "display name ↔ token" note. Have docs 02/05/06/09/10/11 reference the tokens (or state the display↔token mapping in 02's registry table). Doc 07's `sharp_point_solution` then becomes correct by construction. This issue is resolved together with Issue 1 by a single decision on tokens.

### 3. [HIGH] Rules/Wiki (05) writes `review_trigger` values that are not in the Canonical Schema (04) enum

- **Where:** `05-rules-wiki.md` §A.5: R-HITL-01 sets `review_trigger = pre_send`; R-HITL-02 sets `review_trigger = low_confidence`.
- **Problem:** The `hitl.review_trigger` enum in `04-canonical-schema.md` §9.6 is `enum(always, on_low_confidence, on_threshold_breach, on_exception, sampled, on_high_value, unknown)`. Neither `pre_send` nor `low_confidence` is a member. A rule that writes a value the schema forbids cannot fire deterministically into the canonical store. Note the rest of the corpus uses the *canonical* tokens correctly: doc 03 §19 uses `on_low_confidence`, doc 08 §6.1 uses `on_high_value`, doc 11 §3.3 lists `on_low_confidence` — so doc 05 is the outlier. (Doc 06's use of `low_confidence` is a distinct, legitimate *gap-kind* token, not a `review_trigger`, and is fine.)
- **Suggested fix:** In doc 05, change R-HITL-02 to `review_trigger = on_low_confidence` (the exact 04 §9.6 token). For R-HITL-01's "approval before send," either map it to the existing `on_high_value` / `always` token, or — if a dedicated pre-send trigger is genuinely wanted — add `pre_send` to the 04 §9.6 enum and reference it consistently. Do not leave `pre_send`/`low_confidence` as undefined tokens.

### 4. [HIGH] Build Mapping (09) and Object Creation (10) use different names for the same components, despite both claiming the vocabulary is shared "verbatim"

- **Where:** `09-build-mapping-framework.md` §2 defines 13 component terms C1–C13 and states (§2, §5) that "the Object Creation and Generation documents reuse this exact vocabulary … do not rename a term or introduce a synonym." `10-object-creation-framework.md` §2 then names its 10 objects with renamed/regrouped terms, while §1.2 and §5 claim it writes its conditions "against the Build Mapping component vocabulary."
- **Problem:** The terms are renamed, not reused verbatim: C3 *backend workflow* → "Workflow"; C5 *attribute registry* → "Registry"; C7 *knowledge/RAG library* → "Library"; C6 *rules/wiki layer* → "Rules / Wiki"; C8 *connector layer (MCP/API/batch)* → "Connectors"; C10 *audit/provenance layer* → "Audit Layer"; C11 *dashboards/reporting layer* → "Reporting Layer"; C12 *decision/scoring layer* → "Decision Layer". More substantively: doc 09's C1 *front-end app* and C2 *mini-app* are **consolidated** into a single doc-10 "UI" object (with surface sub-types), and doc 09's C13 *organizational-memory layer* has **no corresponding named object** in doc 10's 10-item catalog (it is described only narratively as "a full Intelligence Layer as a component"). So the "13 components" and the "10 objects" are not a 1:1 mapping, contradicting 09's "no synonyms / load-bearing" instruction and 10's "verbatim" claim.
- **Suggested fix:** Add an explicit crosswalk table mapping each of 09's C1–C13 to the doc-10 object(s) that realize it (including C1+C2 → UI, and C13 → organizational-memory object / Intelligence-Layer composition). Then either (a) soften 09 §2/§5 and 10 §1.2/§5 to say "the object catalog *realizes* these components per the crosswalk" rather than "reuses verbatim / no synonyms," or (b) rename doc-10 objects to match the C-terms exactly. Option (a) is lower-churn and preserves doc 10's clearer object names.

### 5. [HIGH] Document 01 internal cross-references point to the wrong document numbers

- **Where:** `01-discovery-framework.md` §2.1 ("document 02 turns them into the concrete **Attribute Registry**"; "document 03 turns them into the **Canonical Schema**"), §3.1 table (Attribute Registry = "Document 02"; Canonical Schema = "Document 03"), §5 intro ("archetype classification (document 04)"), §6 ("input to archetype classification (document 04)"), §7 ("Document 02 — Attribute Registry"; "Document 03 — Canonical Schema"; "Document 04 — Archetype Classification").
- **Problem:** Per the authoritative numbering in `00-INDEX.md` §3 (and the actual filenames), the Attribute Registry is **document 03**, the Canonical Schema is **document 04**, the Archetype Framework is **document 02**. Doc 01 systematically mislabels them (Registry→02, Schema→03, Archetype→04), i.e. an off-by-one/scrambled mapping. A reader following doc 01's pointers lands on the wrong documents. This appears to be a stale numbering from an earlier corpus arrangement.
- **Suggested fix:** In doc 01, change all references: "Attribute Registry" → document **03**; "Canonical Schema" → document **04**; "Archetype Classification/Framework" → document **02**. Align the §3.1 table and the §7 cross-reference list to `00-INDEX` §3.

### 6. [HIGH] Document 04 header cross-references use filenames/numbers that do not exist in the corpus

- **Where:** `04-canonical-schema.md` top matter (lines ~4): links to `02-discovery-swarm.md`, `05-workflow-archetypes.md`, `06-workflow-design-spec.md`, `07-simulation-pack.md`, `03-cake-engine.md`. Also `04` §9.13 prose says the archetype catalog is "see doc 05" / "[05 — Workflow Archetypes]".
- **Problem:** None of those filenames match the corpus. The actual mapping (per `00-INDEX` §3) is: Discovery = `01-discovery-framework.md`; CAKE lives inside `01` (no standalone "03-cake-engine"); Archetypes = `02-archetype-framework.md` (not 05); Workflow Design Spec = `07` (not 06); Simulation Pack = `08` (not 07). Doc 04 is pointing at a prior numbering scheme in which CAKE, Discovery, and Archetypes had different numbers. Consequently doc 04's "see doc 05 / Workflow Archetypes" for the archetype catalog is also wrong (Archetypes = 02; doc 05 is Rules/Wiki).
- **Suggested fix:** Rewrite doc 04's header cross-references to the real targets: Discovery categories → `02`? **No** — Discovery is `01`; Archetype catalog → `02`; Rules/Wiki → `05`; WDS → `07`; Simulation Pack → `08`; CAKE → `01 §2.1`. Fix the §9.13 "see doc 05" to "see doc 02." Verify against `00-INDEX` §3. *(This is the mirror image of Issue 5; together they show 01 and 04 were authored under an older numbering and never reconciled to `00-INDEX`.)*

### 7. [LOW] Document 02 cross-references are off by the same scheme as Issue 6 (Consumes/Feeds line and §5 table)

- **Where:** `02-archetype-framework.md` top matter ("**Consumes:** … see `01` and `03`"; "**Feeds:** the Rules/Wiki classification layer (`04`), the Gap Analysis and Question Policy (`05`), the Workflow Design Specification (`06`), and the Build Swarm's object-selection logic (`07`)"), and the §5 cross-reference table (`01` = "CAKE / canonical facts engine"; `03` = "Canonical schema & registries"; `04` = "Rules / Wiki layer"; `05` = "Gap analysis"; `06` = "Workflow Design Specification"; `07` = "Build Swarm object selection").
- **Problem:** Same stale numbering as docs 01 and 04. Per `00-INDEX`: Rules/Wiki = `05` (not 04), Gap/Question policy (Missing Information) = `06` (not 05), Workflow Design Spec = `07` (not 06), Build object-selection = `09` (not 07), Canonical schema = `04` (not 03). The §5 table's labels are internally plausible but bound to the wrong numbers. Marked LOW only because the *prose descriptions* make the intent recoverable; the numbers themselves are wrong.
- **Suggested fix:** Renumber doc 02's Consumes/Feeds and §5 table to: canonical facts/CAKE → `01`; Canonical Schema → `04`; Rules/Wiki → `05`; Missing Information/Gap policy → `06`; Workflow Design Specification → `07`; Build Mapping/object selection → `09`. Reconcile to `00-INDEX` §3.

### 8. [LOW] Internal token mismatch *within* Canonical Schema (04): `workflow_type` vs `primary_archetype` spell the same concepts differently

- **Where:** `04-canonical-schema.md` §9.1 `workflow_type` uses `data_transformation` and `orchestration_multistep`; §9.13 `primary_archetype` uses `data_transformation_pipeline` and `multi_step_orchestration` for the (intended) same concepts.
- **Problem:** Two fields in the same document use divergent tokens for the same functional categories (`data_transformation` vs `data_transformation_pipeline`; `orchestration_multistep` vs `multi_step_orchestration`). Even if §9.13 is repurposed to the 9 archetypes (Issue 1), the §9.1 list should be internally self-consistent and any shared tokens spelled identically. Low severity because it is contained within one document and one of the two enums is slated to change under Issue 1.
- **Suggested fix:** Pick one spelling per concept for the `workflow_type` enum (e.g. `data_transformation`, `multi_step_orchestration`) and apply it consistently. Resolve in the same edit as Issue 1.

### 9. [LOW] Undefined working field `requires_cake_layer` referenced by Rules/Wiki (05) with no home in the schema

- **Where:** `05-rules-wiki.md` R-CLS-05 ("**Also** set `requires_cake_layer = true`") and R-BLD-06 (condition `… OR requires_cake_layer = true`).
- **Problem:** `requires_cake_layer` is read and written as if it were a canonical field, but no such field exists in `04` §9.13 (or anywhere in the 14 tables). Other doc-05 rules name the exact table/field they write (e.g. `canonicalization_required` on §9.10, the component lists on §9.13); this one introduces an orphan flag. An implementer has nowhere to persist it.
- **Suggested fix:** Either (a) replace `requires_cake_layer` with the existing signal it stands for — e.g. drive R-BLD-06 off `primary_archetype ∈ {Intelligence Layer, Operating Layer / OSO}` plus `knowledge.canonicalization_required = true` (already set by R-CAKE-01) — or (b) add an explicit boolean (e.g. `requires_canonical_store`) to a named table in doc 04 and reference it consistently. Option (a) needs no schema change.

---

## Notes (observations that are NOT issues)

- **N1 — Category 6 label variant.** Doc 03 §11's section *title* is "Category 6 — Human-Interaction attributes," whereas docs 01/06 call category 6 "Human Review." The body of doc 03 §11 correctly says "Maps to discovery category 6 (Human Review)," and the number is right, so this is a cosmetic title synonym, not a structural inconsistency. Optional: rename the 03 §11 title to "Human Review attributes" for exactness.
- **N2 — Severity thresholds vs confidence ladder.** Doc 06 §4.2 severity-coverage thresholds (`critical ≥ 0.85`, `high ≥ 0.70`, `medium ≥ 0.60`, `low ≥ 0.50`) are finer-grained than, and cut across, the 4-band confidence ladder in 04 §2 / 05 (`observed 0.90–1.00`, `implied 0.70–0.89`, …). These measure different things (coverage-trust threshold vs extraction-confidence label) and are not strictly contradictory, but `critical ≥ 0.85` sits mid-`implied` band. Consider one cross-reference sentence in doc 06 acknowledging the relationship, to pre-empt reader confusion. Not counted as an issue.
- **N3 — `00-INDEX.md` is the authority for numbering.** Its §3 table is internally consistent with all the *target* documents' own self-descriptions; the only documents out of step with it are 01, 02, and 04's cross-reference blocks (Issues 5, 6, 7). Fixing those three to match `00-INDEX` resolves all the numbering drift.
- **N4 — Status.** The entire `docs/workflow-creator/` directory is currently untracked in git (work in progress), and `00-INDEX.md` was added after the corpus body; this is consistent with these being pre-handoff drafts.

---

## Recommended fix order

1. **Issue 1 + Issue 2 + Issue 8 together** — one decision on archetype tokens fixes the schema enum (04 §9.13), the three-way serialization split, and the intra-04 token drift. This is the corpus-critical fix.
2. **Issues 5, 6, 7 together** — reconcile docs 01, 02, 04 cross-references to `00-INDEX` §3 numbering (single pass).
3. **Issue 3** — correct doc 05's two `review_trigger` tokens to the 04 §9.6 enum.
4. **Issue 9** — remove/rebind the orphan `requires_cake_layer` flag in doc 05.
5. **Issue 4** — add the 09→10 component crosswalk and soften the "verbatim/no-synonym" claims.
