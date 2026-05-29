# 03 — Workflow Attribute Registry

> **Series:** BoVerse Workflow Creator framework corpus
> **This document:** the searchable extraction checklist — *what facts to look for* in uploaded evidence.
> **Status:** Portable IP / handoff artifact. Implementation-agnostic.
> **Cross-references:** The 12 discovery categories are defined in [01 — Workflow Discovery Framework](01-discovery-framework.md). The archetypes whose signals appear here are defined in [02 — Workflow Archetype Framework](02-archetype-framework.md). The canonical tables and fields every attribute maps into are defined in [04 — Canonical Workflow Design Schema](04-canonical-schema.md). The engine that performs the extraction is CAKE (see 01 §2.1).

---

## 1. What this document is

The Canonical Schema (doc 04) says **where facts go**. This registry says **what facts to look for** before they can go anywhere. It is the search-and-extraction checklist CAKE works through when it reads a pile of uploaded evidence — the freeform notes, the SOP, the spreadsheet, the screenshots, the one sample output, the system export, the API/MCP description.

Each row of the registry names a single fact worth hunting for, says in plain English what it means, lists the **evidence types** most likely to contain it, and — this is mandatory — names the exact **canonical `table.field`** it populates. Every attribute in this registry resolves to a field that exists in doc 04. An attribute that cannot be mapped is a **schema gap** and is flagged as such (see §16); the registry never invents a destination.

This division of labor is the whole point:

- **Registry (this doc): probabilistic target list.** "Go find whether there is an approval threshold anywhere in this evidence." Reading messy evidence and proposing a value is LLM-driven and non-deterministic.
- **Schema (doc 04): deterministic destination.** The proposed value must land in a named field (`hitl.confidence_threshold`), of a named type (`float[0..1]`), stamped with confidence and provenance, or else become a row in the ledger (`missing_information.*`).

> The registry tells CAKE *what to look for*; the schema constrains *where the answer is allowed to land*. Determinism lives in the schema and the rules layer, never in the act of extraction. (See 01 §2.2 and 04 §1.)

---

## 2. How to read the registry tables

Every attribute row has these columns:

| Column | Meaning |
|---|---|
| **Attribute** | The canonical name of the fact to extract. Stable; cite it by name in tooling. |
| **What it means** | One-line definition — what CAKE is actually looking for. |
| **Where to find it (evidence types)** | The evidence types most likely to carry this fact. Drawn from the fixed vocabulary in §3. |
| **Maps to (table.field)** | The canonical destination in doc 04, written `table.field`. The single most important column. |
| **Pass** | `first-pass` = high value, extract on every workflow. `deep` = extract only when the workflow makes it relevant. See §4. |

Table references use the short canonical table names from doc 04 (e.g. `workflow_identity`, `hitl`, `process_step`). The full §9.x mapping is in §3.1 below so an implementer can resolve every reference unambiguously.

---

## 3. Evidence-type vocabulary

Every "where to find it" cell uses one or more of these tokens. This is the closed set of evidence types BoVerse ingests.

| Token | Evidence type | Typical content |
|---|---|---|
| `SOP` | Standard operating procedure / written process doc | Step sequences, roles, approval gates, exception handling |
| `sample_output` | A real example of the deliverable | Output format, sections, fields, tone, quality bar |
| `screenshot` | UI screen capture | System identity, fields on screen, current manual surface |
| `spreadsheet` | Excel/CSV/Sheets file | Rate tables, lookups, structured inputs, calculations, volumes |
| `freeform_notes` | Unstructured prose the client wrote | Outcome, pain, tacit rules, wishes, ambiguity |
| `api_mcp` | API or MCP server description | System connectivity, auth, objects, read/write surface |
| `email` | Email thread or single message | Triggers, hand-offs, approvals, turnaround, escalation |
| `transcript` | Call/meeting/voice transcript | Tacit knowledge, decisions, actors, pain, success talk |

These tokens correspond to the formats enumerated on the Input / Evidence table (`input.format` in 04 §9.4: `pdf, docx, xlsx, csv, json, image, email, plain_text, api_payload, voice_transcript, …`). The registry uses the human evidence-type label; the schema stores the concrete format.

### 3.1 Canonical table short-name resolver

| Short name used here | Canonical table (doc 04) | Section | Primary key |
|---|---|---|---|
| `workflow_identity` | Workflow Identity | §9.1 | `workflow_id` |
| `outcome` | Outcome | §9.2 | `outcome_id` |
| `output` | Output | §9.3 | `output_id` |
| `input` | Input / Evidence | §9.4 | `input_id` |
| `actor` | Actor / Role | §9.5 | `actor_id` |
| `hitl` | Human-in-the-Loop | §9.6 | `hitl_id` |
| `trigger` | Trigger | §9.7 | `trigger_id` |
| `process_step` | Process / Step | §9.8 | `step_id` |
| `connector` | Systems / Connector | §9.9 | `connector_id` |
| `knowledge` | Knowledge Source | §9.10 | `knowledge_id` |
| `rule` | Rule / Decision | §9.11 | `rule_id` |
| `missing_information` | Missing Information / Ambiguity Ledger | §9.12 | `gap_id` |
| `archetype` | Workflow Archetype | §9.13 | `archetype_id` |
| `provenance` | Audit / Provenance | §9.14 | `provenance_id` |

---

## 4. First-pass vs deep

Each attribute is marked `first-pass` or `deep`.

- **`first-pass`** — high-value attributes CAKE extracts on **every** workflow regardless of archetype. These are the facts without which no archetype can be classified and no specification can be drafted (the Outcome statement, the primary Output, the core Inputs, the Trigger, the lead Actor, etc.). If a first-pass attribute is absent from the evidence, that absence itself is recorded as a gap (`missing_information.missing_attribute`).
- **`deep`** — attributes extracted only when the workflow's shape makes them relevant. A `connector.authentication_required` value is irrelevant to a single-document generator with no systems; an `audit.compliance_standard` is irrelevant outside regulated workflows. Pulling deep attributes on every workflow wastes extraction budget and manufactures false gaps.

The split is a default, not a hard gate. The rules layer (doc 02/04) may promote a `deep` attribute to mandatory once a triggering signal fires — e.g. once `connector` rows exist, the connector-detail deep attributes become expected for each.

---

## 5. The registry is designed to grow

This registry is **explicitly a living artifact**, mirroring CAKE's "evolving registries" principle (01 §2.1). It is expected to grow along three axes, and implementations MUST treat it as append-friendly rather than fixed:

1. **New attributes within existing categories.** As BoVerse meets new industries, new high-value facts surface (e.g. a "lien-waiver required" fact in construction, a "PHI present" fact in healthcare). They are added as new rows under the appropriate category, each mapped to an existing `table.field` or flagged as a schema gap.
2. **New evidence-type affinities.** An attribute may turn out to be reliably present in an evidence type not originally listed; the "where to find it" cell is updated.
3. **Promotion/demotion across the pass split.** Operational data (which attributes actually drive build decisions) can move an attribute from `deep` to `first-pass` or back.

What does **not** grow casually is the canonical schema. New attributes should map to **existing** fields wherever possible. When a genuinely new fact has no home, the correct response is to (a) record it via the ledger and (b) raise a schema-change proposal against doc 04 — *not* to silently widen a field's meaning. Section 16 lists the schema gaps this version of the registry has already surfaced.

Versioning: this document carries a registry version; each attribute SHOULD be addressable as `registry.<category>.<attribute>` so downstream tooling can reference a stable id even as rows are added.

---

## 6. Category 1 — Outcome attributes

*Maps to discovery category 1 (Outcome). Why the workflow exists; the north star that bounds scope.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `outcome_statement` | One-sentence statement of what the business is trying to accomplish | `freeform_notes`, `transcript`, `email` | `outcome.outcome_description` | first-pass |
| `stated_problem` | The problem exactly as the client phrased it, verbatim | `freeform_notes`, `transcript`, `email` | `workflow_identity.stated_problem` | first-pass |
| `inferred_problem` | The real problem as Discovery reads it, which may differ from the stated one | `freeform_notes`, `SOP`, `transcript`, `sample_output` | `workflow_identity.inferred_problem` | first-pass |
| `primary_objective` | The single most important thing the workflow must achieve | `freeform_notes`, `transcript` | `workflow_identity.primary_objective` | first-pass |
| `secondary_objectives` | Additional goals ranked below the primary one | `freeform_notes`, `transcript`, `email` | `workflow_identity.secondary_objectives` | deep |
| `business_value` | Why this outcome matters to the business, in concrete terms | `freeform_notes`, `transcript`, `email` | `outcome.business_value` | first-pass |
| `pain_being_removed` | What is slow, manual, or error-prone today that this replaces | `freeform_notes`, `transcript`, `email` | `outcome.business_value` | first-pass |
| `decision_supported` | The business decision this outcome enables or improves | `freeform_notes`, `transcript` | `outcome.decision_supported` | deep |
| `user_benefit` | The benefit to the end user / operator of the workflow | `freeform_notes`, `transcript` | `outcome.user_benefit` | deep |
| `operational_benefit` | The benefit to operations (consistency, throughput, less rework) | `freeform_notes`, `transcript`, `SOP` | `outcome.operational_benefit` | deep |
| `risk_reduction` | The risk this outcome reduces (compliance, error, key-person dependency) | `freeform_notes`, `SOP`, `transcript` | `outcome.risk_reduction` | deep |
| `revenue_impact` | Expected revenue effect, qualitative or quantified | `freeform_notes`, `transcript`, `email` | `outcome.revenue_impact` | deep |
| `time_savings` | Expected time saved per run, qualitative or quantified | `freeform_notes`, `transcript` | `outcome.time_savings` | deep |
| `value_unit` | The unit of value produced per run (one quote, one reconciled period) | `freeform_notes`, `sample_output`, `transcript` | `outcome.outcome_description` | first-pass |
| `expected_volume` | How many runs per period are expected | `freeform_notes`, `spreadsheet`, `transcript` | `output.output_frequency` | deep |
| `outcome_owner` | The business stakeholder accountable for the outcome | `freeform_notes`, `email`, `transcript` | `actor.role_name` | deep |

---

## 7. Category 2 — Output attributes

*Maps to discovery category 2 (Output). The artifact, decision, action, or state a single run produces. Most architecture-determining category after Outcome.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `output_name` | Human-readable name of the deliverable | `sample_output`, `freeform_notes`, `SOP` | `output.output_name` | first-pass |
| `output_type` | The kind of artifact: document, report, dataset, record_update, message, decision, alert, dashboard, api_response | `sample_output`, `freeform_notes`, `SOP` | `output.output_type` | first-pass |
| `output_format` | The concrete file/wire format (pdf, docx, xlsx, csv, json, html, email, …) | `sample_output`, `screenshot`, `SOP` | `output.output_format` | first-pass |
| `output_audience` | Who consumes the output (role, team, external party) | `sample_output`, `email`, `freeform_notes` | `output.output_audience` | first-pass |
| `output_destination` | Where the output is delivered (system, inbox, folder, channel) | `SOP`, `email`, `api_mcp` | `output.output_destination` | deep |
| `output_frequency` | How often the output is produced (on_demand, per_event, daily, …) | `SOP`, `freeform_notes`, `transcript` | `output.output_frequency` | first-pass |
| `required_sections` | Named sections the output must contain | `sample_output`, `SOP` | `output.required_sections` | first-pass |
| `required_fields` | Named fields the output must populate | `sample_output`, `spreadsheet`, `SOP` | `output.required_fields` | first-pass |
| `output_editable_by_user` | Whether a human may edit the output before it is finalized | `SOP`, `freeform_notes`, `transcript` | `output.editable_by_user` | deep |
| `output_approval_required` | Whether the output needs sign-off before release | `SOP`, `email`, `transcript` | `output.approval_required` | first-pass |
| `sample_output_available` | Whether a real example of the output was provided | `sample_output` | `output.sample_output_available` | first-pass |
| `sample_output_refs` | Identifiers of the sample-output documents used as evidence | `sample_output` | `output.source_examples` | first-pass |
| `output_quality_criteria` | The criteria by which a correct/acceptable output is judged | `sample_output`, `SOP`, `freeform_notes` | `output.quality_criteria` | first-pass |
| `output_cardinality` | Whether a run emits a single output or a batch | `SOP`, `sample_output`, `transcript` | `output.output_type` | deep |
| `output_tone_or_style` | Required voice, branding, or style of the deliverable | `sample_output`, `freeform_notes` | `output.quality_criteria` | deep |
| `golden_output_example` | A known-correct exemplar to grade future runs against | `sample_output` | `output.source_examples` | first-pass |

---

## 8. Category 3 — Input attributes

*Maps to discovery category 3 (Inputs). What information the workflow needs to run, plus the discovery-evidence vs required-input distinction (04 §9.4).*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `input_name` | Human-readable name of an input | `SOP`, `spreadsheet`, `freeform_notes`, `screenshot` | `input.input_name` | first-pass |
| `input_role` | Whether the item is discovery_evidence, a required_workflow_input, or both | `SOP`, `freeform_notes`, `api_mcp` | `input.input_type` | first-pass |
| `input_source_system` | The system or origin the data comes from | `screenshot`, `api_mcp`, `SOP`, `spreadsheet` | `input.source_system` | first-pass |
| `input_format` | The concrete format of the input (pdf, xlsx, json, image, …) | `spreadsheet`, `screenshot`, `api_mcp` | `input.format` | first-pass |
| `input_owner` | Person or team responsible for supplying/maintaining the input | `SOP`, `email`, `transcript` | `input.owner` | deep |
| `input_frequency` | How often the input is supplied / was supplied | `SOP`, `freeform_notes`, `transcript` | `input.frequency` | deep |
| `input_reliability` | How dependable/clean the source is in practice | `freeform_notes`, `transcript`, `spreadsheet` | `input.reliability` | deep |
| `input_structure` | Degree of structure: structured, semi_structured, unstructured | `spreadsheet`, `screenshot`, `freeform_notes` | `input.structured_or_unstructured` | first-pass |
| `input_required_or_optional` | Whether the workflow can run without this input | `SOP`, `freeform_notes` | `input.required_or_optional` | first-pass |
| `input_example_available` | Whether a concrete example of the input was provided | `spreadsheet`, `sample_output`, `screenshot` | `input.example_available` | deep |
| `input_extraction_method` | How values are obtained from the input (direct_field, llm_extraction, ocr, parse_table, transcription, …) | `spreadsheet`, `screenshot`, `api_mcp`, `SOP` | `input.extraction_method` | deep |
| `input_quality_issues` | Documented problems with the input (missing fields, stale data, inconsistent units) | `freeform_notes`, `transcript`, `spreadsheet` | `input.known_quality_issues` | deep |
| `input_cardinality` | Whether the input is a single value, a list, or a table | `spreadsheet`, `api_mcp`, `SOP` | `input.structured_or_unstructured` | deep |
| `input_validation_constraint` | Constraints a valid input must satisfy (ranges, required fields, formats) | `SOP`, `spreadsheet`, `freeform_notes` | `input.known_quality_issues` | deep |
| `input_default_value` | A value the rules layer can supply when the input is absent | `SOP`, `freeform_notes`, `spreadsheet` | `rule.action` | deep |
| `evidence_document_ref` | Identifier of an uploaded evidence document (for provenance) | all | `provenance.source_document` | first-pass |

---

## 9. Category 4 — Trigger attributes

*Maps to discovery category 4 (Trigger). What causes a run to begin; sets the execution mode.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `trigger_type` | Category of trigger: event, schedule, manual, webhook, file_arrival, email_received, record_change, threshold_breach | `SOP`, `freeform_notes`, `email`, `api_mcp` | `trigger.trigger_type` | first-pass |
| `trigger_description` | Plain-English description of what starts the workflow | `SOP`, `freeform_notes`, `transcript` | `trigger.trigger_description` | first-pass |
| `trigger_source_system` | The system that emits the trigger | `api_mcp`, `screenshot`, `SOP`, `email` | `trigger.source_system` | deep |
| `trigger_event_condition` | The condition that must hold for the trigger to fire | `SOP`, `freeform_notes`, `email` | `trigger.event_condition` | deep |
| `trigger_schedule` | Schedule expression when the trigger is time-based (cron, "weekdays 08:00") | `SOP`, `freeform_notes`, `transcript` | `trigger.schedule` | deep |
| `trigger_manual_or_automated` | Whether a human initiates the run or it fires automatically | `SOP`, `freeform_notes`, `transcript` | `trigger.manual_or_automated` | first-pass |
| `trigger_required_input` | Inputs that must be present for the trigger to proceed | `SOP`, `api_mcp`, `email` | `trigger.required_input` | deep |
| `trigger_downstream_action` | The first step/action the trigger initiates | `SOP`, `freeform_notes` | `trigger.downstream_action` | deep |
| `trigger_frequency` | How often the trigger is expected to fire | `freeform_notes`, `transcript`, `spreadsheet` | `trigger.event_condition` | deep |
| `trigger_initiating_actor` | Who fires a manual trigger | `SOP`, `email`, `transcript` | `actor.role_name` | deep |

---

## 10. Category 5 — Actor attributes

*Maps to discovery category 5 (Actors). Who/what participates and the authority each holds. The referent for HITL rows and step ownership.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `actor_role_name` | Canonical name of a participating role | `SOP`, `email`, `transcript`, `freeform_notes` | `actor.role_name` | first-pass |
| `actor_kind` | Whether the actor is an individual, team, role_function, or external_party | `SOP`, `email`, `transcript` | `actor.person_or_team` | first-pass |
| `actor_human_or_system` | Whether the participant is a human or an automated/system actor | `SOP`, `api_mcp`, `screenshot`, `transcript` | `actor.person_or_team` | first-pass |
| `actor_responsibility` | What this actor is responsible for in the workflow | `SOP`, `transcript`, `freeform_notes` | `actor.responsibility` | first-pass |
| `actor_stage` | The stage(s)/step(s) where this actor is active | `SOP`, `transcript` | `actor.stage_in_workflow` | deep |
| `actor_decision_authority` | The actor's authority to make decisions: none, recommend, decide | `SOP`, `email`, `transcript` | `actor.decision_authority` | deep |
| `actor_review_authority` | The actor's review authority: none, review_advisory, review_blocking | `SOP`, `email`, `transcript` | `actor.review_authority` | deep |
| `actor_approval_authority` | The actor's approval authority and any value ceiling: none, approve_low, approve_high, approve_unbounded | `SOP`, `email`, `transcript` | `actor.approval_authority` | first-pass |
| `actor_escalation_role` | The role this actor escalates to when an item exceeds their authority | `SOP`, `email`, `transcript` | `actor.escalation_role` | deep |
| `actor_system_access` | Systems this actor must have access to | `SOP`, `screenshot`, `api_mcp` | `actor.system_access_required` | deep |
| `actor_interaction_type` | Primary mode of involvement: performs_work, reviews, approves, is_informed, consulted | `SOP`, `email`, `transcript` | `actor.interaction_type` | first-pass |
| `actor_handoff_point` | Where work passes from this actor to another | `SOP`, `email`, `transcript` | `actor.stage_in_workflow` | deep |
| `actor_notified_on` | Conditions under which this actor is merely informed | `SOP`, `email` | `actor.interaction_type` | deep |

---

## 11. Category 6 — Human-Interaction attributes

*Maps to discovery category 6 (Human Review). Where human judgment is required to proceed. `hitl.human_role` references `actor.role_name` (04 §9.6).*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `hitl_stage` | The stage/step where the human intervention occurs | `SOP`, `transcript`, `email` | `hitl.workflow_stage` | first-pass |
| `hitl_human_role` | The role that performs the intervention (must resolve to an `actor.role_name`) | `SOP`, `email`, `transcript` | `hitl.human_role` | first-pass |
| `hitl_reason` | Why a human is required here rather than full automation | `SOP`, `freeform_notes`, `transcript` | `hitl.reason_for_review` | first-pass |
| `hitl_review_trigger` | The condition that pulls a human in: always, on_low_confidence, on_threshold_breach, on_exception, sampled, on_high_value | `SOP`, `freeform_notes`, `email` | `hitl.review_trigger` | first-pass |
| `hitl_confidence_threshold` | Confidence below which an item is routed to a human (when trigger is on_low_confidence) | `freeform_notes`, `SOP` | `hitl.confidence_threshold` | deep |
| `hitl_value_threshold` | Monetary/quantitative threshold above which review is mandatory | `SOP`, `email`, `spreadsheet`, `transcript` | `rule.threshold` | first-pass |
| `hitl_required_action` | What the human is expected to do (review, edit, approve, classify) | `SOP`, `email`, `transcript` | `hitl.required_action` | first-pass |
| `hitl_approval_required` | Whether the human's action constitutes a blocking approval gate | `SOP`, `email` | `hitl.approval_required` | first-pass |
| `hitl_rejection_path` | What happens when the human rejects the item | `SOP`, `email`, `transcript` | `hitl.rejection_path` | deep |
| `hitl_escalation_path` | What happens when the human cannot resolve it | `SOP`, `email`, `transcript` | `hitl.escalation_path` | deep |
| `hitl_audit_required` | Whether this intervention must be logged for audit | `SOP`, `freeform_notes` | `hitl.audit_required` | deep |
| `hitl_evidence_required` | What the human must see to make the decision | `SOP`, `screenshot`, `transcript` | `hitl.evidence_required` | deep |
| `hitl_expected_turnaround` | Expected human response time | `SOP`, `email`, `transcript` | `hitl.expected_turnaround` | deep |
| `hitl_review_outcomes` | The set of possible review outcomes (approve, reject, edit, escalate) | `SOP`, `transcript` | `hitl.required_action` | deep |

---

## 12. Category 7 — System attributes

*Maps to discovery category 7 (Systems). The integration surface. API/MCP descriptions become concrete connectors here.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `system_name` | Name of an external system the workflow touches | `api_mcp`, `screenshot`, `SOP`, `email` | `connector.system_name` | first-pass |
| `system_connection_type` | Preferred reach mechanism: api, mcp, batch_export, file_drop, manual_entry, webhook, none | `api_mcp`, `SOP`, `screenshot` | `connector.connection_type` | first-pass |
| `system_role` | Whether the system is a source, destination, both, or reference | `api_mcp`, `SOP`, `freeform_notes` | `connector.read_required` / `connector.write_required` | first-pass |
| `system_api_available` | Whether the system exposes a usable API | `api_mcp`, `screenshot`, `freeform_notes` | `connector.api_available` | deep |
| `system_mcp_available` | Whether an MCP server exists or can be built for the system | `api_mcp`, `freeform_notes` | `connector.mcp_available` | deep |
| `system_batch_export_available` | Whether a batch/file export is a viable integration path | `SOP`, `spreadsheet`, `screenshot` | `connector.batch_export_available` | deep |
| `system_read_required` | Whether the workflow must read from this system | `api_mcp`, `SOP` | `connector.read_required` | first-pass |
| `system_write_required` | Whether the workflow must write to this system | `api_mcp`, `SOP` | `connector.write_required` | first-pass |
| `system_authentication` | Auth method the system requires: none, api_key, oauth, basic, sso, certificate | `api_mcp`, `screenshot` | `connector.authentication_required` | deep |
| `system_data_objects` | Named entities/objects read or written (Customer, Invoice, JobRequest) | `api_mcp`, `screenshot`, `spreadsheet` | `connector.data_objects_accessed` | deep |
| `system_sync_frequency` | How often data is synchronized: real_time, on_demand, hourly, daily, batch_nightly | `SOP`, `api_mcp`, `freeform_notes` | `connector.sync_frequency` | deep |
| `system_integration_complexity` | Estimated effort to integrate: low, medium, high | `api_mcp`, `freeform_notes`, `transcript` | `connector.integration_complexity` | deep |
| `system_fallback_method` | Fallback path if the preferred connection is unavailable | `SOP`, `freeform_notes`, `transcript` | `connector.fallback_method` | deep |
| `system_rate_volume_constraint` | Known rate limits or volume ceilings on the system | `api_mcp`, `freeform_notes` | `connector.integration_complexity` | deep |
| `system_count` | How many distinct external systems the workflow touches (archetype signal) | `api_mcp`, `SOP`, `screenshot` | `connector.system_name` (count of rows) | first-pass |

---

## 13. Category 8 — Knowledge attributes

*Maps to discovery category 8 (Knowledge). The rules/wiki/reference layer — what the workflow must consult to be correct, not merely well-formed.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `knowledge_source_name` | Human-readable name of a knowledge source | `SOP`, `spreadsheet`, `freeform_notes` | `knowledge.knowledge_source_name` | first-pass |
| `knowledge_source_type` | Kind of source: policy_document, reference_table, sop, wiki, pricing_book, regulation, tribal_knowledge, prior_examples | `SOP`, `spreadsheet`, `freeform_notes`, `transcript` | `knowledge.source_type` | first-pass |
| `knowledge_source_location` | Where the source lives (URL, system, file path, "in X's head") | `SOP`, `freeform_notes`, `transcript` | `knowledge.source_location` | deep |
| `knowledge_rule_or_reference` | Whether the source yields executable rules, is consulted as reference, or both | `SOP`, `spreadsheet`, `freeform_notes` | `knowledge.rule_or_reference` | first-pass |
| `knowledge_structure` | Degree of structure: structured, semi_structured, unstructured | `spreadsheet`, `SOP`, `freeform_notes` | `knowledge.structured_or_unstructured` | deep |
| `knowledge_update_frequency` | How often the source changes: static, annual, quarterly, monthly, ad_hoc | `SOP`, `spreadsheet`, `freeform_notes` | `knowledge.update_frequency` | deep |
| `knowledge_owner` | Person or team that maintains the source | `SOP`, `email`, `transcript` | `knowledge.owner` | deep |
| `knowledge_required_for_steps` | Which steps depend on this knowledge source | `SOP`, `transcript` | `knowledge.required_for_steps` | deep |
| `knowledge_retrieval_required` | Whether the source must be retrieved at runtime (RAG / lookup) | `SOP`, `spreadsheet`, `api_mcp` | `knowledge.retrieval_required` | deep |
| `knowledge_canonicalization_required` | Whether the source must be converted into structured rules before use | `SOP`, `spreadsheet`, `freeform_notes` | `knowledge.canonicalization_required` | deep |
| `tacit_knowledge_item` | Expert judgment that is implied, not written, and must be confirmed | `transcript`, `freeform_notes` | `knowledge.source_type` (= `tribal_knowledge`) | first-pass |
| `lookup_table_ref` | A reference/lookup table the workflow consults (rate sheet, code map) | `spreadsheet`, `screenshot` | `knowledge.knowledge_source_name` | first-pass |
| `formula_definition` | A calculation or formula the workflow applies | `spreadsheet`, `SOP`, `freeform_notes` | `rule.action` | first-pass |
| `policy_statement` | A written policy that constrains the workflow's behavior | `SOP`, `freeform_notes`, `email` | `knowledge.knowledge_source_name` | deep |

---

## 14. Category 9 — Decision attributes

*Maps to discovery category 9 (Decisions). The branch points; where Knowledge is applied. Rules anchor to steps via `rule.applies_to_step` (04 §9.11).*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `rule_name` | Human-readable name of a decision/rule | `SOP`, `spreadsheet`, `freeform_notes` | `rule.rule_name` | first-pass |
| `rule_description` | Plain-English statement of what the rule does | `SOP`, `freeform_notes`, `transcript` | `rule.rule_description` | first-pass |
| `decision_condition` | The condition under which the rule fires | `SOP`, `spreadsheet`, `freeform_notes` | `rule.condition` | first-pass |
| `decision_action` | The action taken when the condition holds | `SOP`, `spreadsheet`, `freeform_notes` | `rule.action` | first-pass |
| `decision_threshold` | The numeric/categorical threshold the condition tests | `spreadsheet`, `SOP`, `email` | `rule.threshold` | first-pass |
| `decision_source` | Where the rule came from (evidence doc or knowledge source) | `SOP`, `spreadsheet`, `freeform_notes` | `rule.source` | deep |
| `decision_applies_to_step` | The step the rule governs | `SOP`, `transcript` | `rule.applies_to_step` | deep |
| `decision_determinism_status` | Whether the rule is deterministic, heuristic, probabilistic, or unconfirmed | `SOP`, `spreadsheet`, `freeform_notes` | `rule.deterministic_status` | first-pass |
| `decision_requires_confirmation` | Whether a human must confirm the rule before it fires automatically | `freeform_notes`, `transcript`, `SOP` | `rule.requires_confirmation` | deep |
| `decision_exception_handling` | What happens when the rule's inputs are missing or it cannot be evaluated | `SOP`, `freeform_notes` | `rule.exception_handling` | deep |
| `decision_automated_or_human` | Whether the decision is made automatically or routed to a human | `SOP`, `freeform_notes`, `transcript` | `process_step.probabilistic_reasoning_required` / `process_step.hitl_required` | first-pass |
| `decision_outcomes` | The possible outcomes/branches of the decision | `SOP`, `transcript` | `rule.action` | deep |
| `decision_default_outcome` | The default branch when criteria are ambiguous or data is missing | `SOP`, `freeform_notes` | `rule.exception_handling` | deep |

### 14.1 Process attributes (step structure)

*Also category 9-adjacent: the ordered step structure that decisions live inside, mapping to the Process / Step table (04 §9.8).*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `step_name` | Human-readable name of a process step | `SOP`, `screenshot`, `transcript` | `process_step.step_name` | first-pass |
| `step_description` | What the step does, in plain English | `SOP`, `transcript`, `freeform_notes` | `process_step.step_description` | first-pass |
| `step_sequence_order` | The step's position in the ordered process | `SOP`, `transcript` | `process_step.sequence_order` | first-pass |
| `step_upstream_dependencies` | Steps that must complete before this one runs | `SOP`, `transcript` | `process_step.upstream_dependencies` | deep |
| `step_downstream_dependencies` | Steps that depend on this step's completion | `SOP`, `transcript` | `process_step.downstream_dependencies` | deep |
| `step_input_required` | Inputs this step consumes | `SOP`, `spreadsheet`, `api_mcp` | `process_step.input_required` | deep |
| `step_output_produced` | What this step emits (intermediate value or named output) | `SOP`, `sample_output` | `process_step.output_produced` | deep |
| `step_actor_responsible` | The role responsible for the step, if human-performed | `SOP`, `transcript`, `email` | `process_step.actor_responsible` | first-pass |
| `step_system_responsible` | The system responsible for the step, if system-performed | `SOP`, `api_mcp`, `screenshot` | `process_step.system_responsible` | deep |
| `step_deterministic_rule_available` | Whether the step can be governed by a deterministic rule | `SOP`, `spreadsheet`, `freeform_notes` | `process_step.deterministic_rule_available` | first-pass |
| `step_probabilistic_reasoning_required` | Whether the step requires LLM judgment / probabilistic reasoning | `freeform_notes`, `transcript`, `SOP` | `process_step.probabilistic_reasoning_required` | first-pass |
| `step_hitl_required` | Whether the step requires a human-in-the-loop intervention | `SOP`, `transcript` | `process_step.hitl_required` | first-pass |
| `step_error_conditions` | Known failure modes for the step | `SOP`, `freeform_notes`, `transcript` | `process_step.error_conditions` | deep |

---

## 15. Category 10 — Exception attributes

*Maps to discovery category 10 (Exceptions). What can go wrong and how it is handled. Exceptions are modeled as failure modes on steps and as rule-level handling.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `exception_trigger_condition` | What makes an exception happen | `SOP`, `freeform_notes`, `transcript` | `process_step.error_conditions` | first-pass |
| `exception_severity` | The severity/impact of the exception | `SOP`, `freeform_notes` | `missing_information.severity` | deep |
| `exception_detection_method` | How the exception is detected | `SOP`, `api_mcp`, `freeform_notes` | `process_step.error_conditions` | deep |
| `exception_handling_strategy` | The handling strategy: retry, fallback, hold_for_review, skip, abort, escalate | `SOP`, `freeform_notes`, `transcript` | `rule.exception_handling` | first-pass |
| `exception_responsible_actor` | The actor responsible when an exception escalates | `SOP`, `email`, `transcript` | `actor.escalation_role` | deep |
| `exception_notification` | Any notification required when the exception fires | `SOP`, `email` | `hitl.escalation_path` | deep |
| `exception_fallback_value` | A safe default used when the normal path fails | `SOP`, `spreadsheet`, `freeform_notes` | `rule.exception_handling` | deep |
| `exception_retry_policy` | Retry count/backoff when the strategy is retry | `SOP`, `api_mcp`, `freeform_notes` | `rule.exception_handling` | deep |

---

## 16. Category 11 — Audit attributes

*Maps to discovery category 11 (Audit). What about each run must be explainable and retained. Tied to CAKE provenance (04 §9.14).*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `audit_what_logged` | What must be logged per run (inputs used, decisions made, who reviewed) | `SOP`, `freeform_notes`, `transcript` | `hitl.audit_required` | first-pass |
| `audit_retention_requirement` | How long, and where, run records must be retained | `SOP`, `freeform_notes` | `missing_information.missing_attribute` *(schema gap — see §17)* | deep |
| `audit_versioning_required` | Whether inputs/rules/outputs must be versioned | `SOP`, `freeform_notes` | `provenance.version` | deep |
| `audit_explainability_required` | Whether a human must be able to ask "why did it decide this?" | `SOP`, `freeform_notes`, `transcript` | `rule.rule_description` | deep |
| `audit_compliance_standard` | Any compliance standard the trail must satisfy | `SOP`, `freeform_notes`, `email` | `missing_information.missing_attribute` *(schema gap — see §17)* | deep |
| `audit_source_traceability` | Whether each output value must trace to its source value | `SOP`, `freeform_notes` | `provenance.source_document` | deep |
| `audit_reviewer_record` | Whether the identity of each reviewer must be captured | `SOP`, `email` | `provenance.reviewer` | deep |
| `audit_decision_log` | Whether each automated decision must be recorded with its inputs | `SOP`, `freeform_notes` | `provenance.extracted_value` | deep |

---

## 17. Category 12 — Success attributes

*Maps to discovery category 12 (Success). How we know the workflow is working, per run and over time. Seeds the Simulation Pack.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `success_per_run_definition` | What a correct output looks like for a single run | `sample_output`, `SOP`, `freeform_notes` | `output.quality_criteria` | first-pass |
| `success_metric` | The measurable metric that defines success | `freeform_notes`, `transcript`, `spreadsheet` | `outcome.success_metric` | first-pass |
| `success_accuracy_target` | The accuracy/quality target and its numeric goal | `freeform_notes`, `transcript`, `spreadsheet` | `outcome.success_metric` | deep |
| `success_throughput_latency` | Throughput/latency expectations for the workflow | `freeform_notes`, `transcript` | `outcome.success_metric` | deep |
| `success_tolerable_failure_rate` | The failure rate that is acceptable | `freeform_notes`, `transcript` | `outcome.success_metric` | deep |
| `success_degradation_signal` | Signals that the workflow is degrading over time | `freeform_notes`, `transcript` | `outcome.success_metric` | deep |
| `success_golden_case` | A known-correct input/output pair that becomes a simulation test case | `sample_output`, `spreadsheet` | `output.source_examples` | first-pass |
| `success_acceptance_criteria` | The criteria the built workflow must meet to be accepted | `freeform_notes`, `SOP`, `email` | `outcome.success_metric` | deep |

---

## 18. Archetype-Signal attributes

*Not a discovery category — a derived group. These are the fact patterns the Rules/Wiki layer matches to assign an archetype (see 02). Each maps to a field that, once populated, the classifier reads; the assignment itself lands on the `archetype` table (04 §9.13). The "decisive signal" wording is taken verbatim from the archetype catalog in 02.*

| Attribute | What it means (which archetype it signals) | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `signal_single_operation_no_frontend` | One operation framed as a step, no user group, consumed by another process → **Workflow Component** | `api_mcp`, `SOP`, `freeform_notes` | `archetype.evidence_for_classification` | first-pass |
| `signal_narrow_job_single_user` | One narrow job inside a bigger process, one user, thin UI implied → **Mini-App** | `freeform_notes`, `SOP`, `screenshot` | `archetype.evidence_for_classification` | first-pass |
| `signal_one_output_one_user_limited_inputs` | One main output + one user group + limited inputs (decisive) → **Sharp Point Solution** | `freeform_notes`, `sample_output`, `transcript` | `archetype.evidence_for_classification` | first-pass |
| `signal_coordinates_status_across_tools` | Coordinating status/handoffs across multiple existing tools (decisive), flow not output → **Bridge** | `api_mcp`, `SOP`, `freeform_notes` | `archetype.evidence_for_classification` | first-pass |
| `signal_frontend_plus_persistent_data_plus_repeat` | Front end + persistent data + repeatable interaction, clear single outcome as a product → **App** | `screenshot`, `freeform_notes`, `transcript` | `archetype.evidence_for_classification` | first-pass |
| `signal_recommendations_from_mixed_inputs` | Recommendations/scenarios/priorities from structured + unstructured inputs (decisive) → **Decision-Support App** | `freeform_notes`, `spreadsheet`, `transcript` | `archetype.evidence_for_classification` | first-pass |
| `signal_multi_input_actor_output_decision` | Multiple inputs AND actors AND outputs AND decision points all present (decisive) → **Integrated Workflow** | `SOP`, `transcript`, `freeform_notes` | `archetype.evidence_for_classification` | first-pass |
| `signal_canonicalize_many_sources_one_store` | Canonicalizing facts across many sources into one persistent reconciled store (decisive) → **Intelligence Layer** | `freeform_notes`, `spreadsheet`, `api_mcp` | `archetype.evidence_for_classification` | first-pass |
| `signal_workflows_plus_memory_plus_visibility` | Multiple workflows + shared memory + cross-system visibility, all three together (decisive) → **Operating Layer / OSO** | `freeform_notes`, `transcript`, `api_mcp` | `archetype.evidence_for_classification` | first-pass |
| `signal_consumer_is_system_not_human` | The consumer of the output is the system / another workflow, not a person → component vs app discriminator | `api_mcp`, `SOP`, `freeform_notes` | `archetype.evidence_for_classification` | first-pass |
| `signal_named_external_systems_in_use` | Two or more named external systems already in use → Bridge/OSO signal | `api_mcp`, `screenshot`, `SOP` | `archetype.evidence_for_classification` | deep |
| `signal_framed_as_operating_system` | Explicitly framed as an "operating system/layer for the organization" → OSO (observed) | `freeform_notes`, `transcript` | `archetype.evidence_for_classification` | deep |
| `signal_user_group_count` | How many distinct user groups return over time → App vs Mini-App vs Sharp Point discriminator | `freeform_notes`, `transcript`, `screenshot` | `archetype.evidence_for_classification` | first-pass |
| `signal_output_count` | How many distinct deliverables the request produces → single-output vs multi-output discriminator | `sample_output`, `SOP`, `freeform_notes` | `archetype.evidence_for_classification` | first-pass |
| `signal_complexity_level` | Overall complexity reading: simple, moderate, complex, very_complex | `SOP`, `transcript`, `freeform_notes` | `archetype.complexity_level` | deep |
| `signal_workflow_type` | Coarse functional type precursor (document_generation, decision_support, …) | `SOP`, `sample_output`, `freeform_notes` | `workflow_identity.workflow_type` | first-pass |

> **Note.** The archetype-signal attributes do not have their own dedicated columns in the schema; they are *evidence the classifier weighs*. The natural home for the extracted signal text is `archetype.evidence_for_classification` (which 04 §9.13 defines as "the evidence and reasoning behind the archetype assignment"), and the resulting decision lands in `archetype.primary_archetype` / `archetype.secondary_archetype`. Counts (`signal_system_count`, `signal_output_count`, `signal_user_group_count`) are derived by counting rows in `connector`, `output`, and `actor` respectively — they are computed signals, not stored fields, and that is called out so an implementer does not look for a non-existent column.

---

## 19. Risk/Governance attributes

*Not a discovery category — a cross-cutting group. These attributes surface compliance, data-sensitivity, trust-boundary, and confidence risks that gate the build. Several intentionally map to the **Missing Information / Ambiguity Ledger** because an unanswered governance question is a blocking gap, not a silent default.*

| Attribute | What it means | Where to find it (evidence types) | Maps to (table.field) | Pass |
|---|---|---|---|---|
| `gov_data_sensitivity` | Whether the workflow touches sensitive data (PII, PHI, financial, confidential) | `freeform_notes`, `spreadsheet`, `screenshot`, `SOP` | `missing_information.missing_attribute` *(schema gap — see §20)* | first-pass |
| `gov_regulatory_regime` | Any regulation the workflow falls under (HIPAA, SOC 2, GDPR, sector rule) | `SOP`, `freeform_notes`, `email` | `knowledge.source_type` (= `regulation`) | deep |
| `gov_approval_gate_required` | Whether a governance approval gate is mandatory before output release | `SOP`, `email`, `freeform_notes` | `hitl.approval_required` | first-pass |
| `gov_write_to_system_of_record` | Whether the workflow writes to a system of record (irreversible side effect) | `api_mcp`, `SOP` | `connector.write_required` | first-pass |
| `gov_confirmation_before_action` | Whether a human must confirm before an irreversible/external action fires | `SOP`, `freeform_notes`, `transcript` | `rule.requires_confirmation` | first-pass |
| `gov_low_confidence_handling` | How the workflow must behave when extraction/decision confidence is low | `freeform_notes`, `SOP` | `hitl.review_trigger` (= `on_low_confidence`) | deep |
| `gov_unconfirmed_rule` | A rule the client has not yet confirmed and that must not auto-fire | `freeform_notes`, `transcript`, `SOP` | `rule.deterministic_status` (= `unconfirmed`) | first-pass |
| `gov_blocking_gap` | A missing fact that blocks a correct build | derived during extraction; all evidence types | `missing_information.blocking_status` | first-pass |
| `gov_gap_severity` | How damaging an identified gap is: critical, high, medium, low | derived during extraction; all evidence types | `missing_information.severity` | first-pass |
| `gov_clarifying_question` | The single high-value question to ask the client to close a gap | derived during extraction; all evidence types | `missing_information.suggested_question` | first-pass |
| `gov_assumption_made` | An assumption Discovery made in place of a confirmed fact | `freeform_notes`, derived | `missing_information.resolution_status` (= `assumed`) | first-pass |
| `gov_provenance_required` | Whether a given fact must be traceable to its source for trust | `SOP`, `freeform_notes` | `provenance.fact_id` | deep |
| `gov_review_status` | The human/QA review outcome for an extracted fact | derived; QA pass | `provenance.review_status` | deep |
| `gov_data_residency` | Any requirement on where data may be stored/processed | `SOP`, `freeform_notes`, `email` | `missing_information.missing_attribute` *(schema gap — see §20)* | deep |
| `gov_access_restriction` | Access/permission boundaries on who may run or see the workflow | `SOP`, `freeform_notes`, `screenshot` | `actor.system_access_required` | deep |
| `gov_key_person_dependency` | A single point of human failure the workflow depends on | `freeform_notes`, `transcript` | `outcome.risk_reduction` | deep |

---

## 20. Schema gaps surfaced by this registry

These are attributes the registry considers high-value to extract but for which **doc 04 has no dedicated field**. Per §5, the correct handling is to record the fact via the ledger and raise a schema-change proposal — not to overload an unrelated field. They are flagged inline above with *(schema gap)* and consolidated here.

| Attribute | Category | Why no clean home in doc 04 | Interim mapping | Proposed schema change |
|---|---|---|---|---|
| `audit_retention_requirement` | Audit (11) | The Audit / Provenance table (§9.14) tracks per-*fact* provenance and the HITL table has `audit_required` (a bool), but **no field captures a per-workflow retention duration/policy**. | `missing_information.missing_attribute` until confirmed | Add `retention_policy` (`string`) to a workflow-level Audit/Governance record, or extend `workflow_identity`. |
| `audit_compliance_standard` | Audit (11) | No field names the compliance regime a run's trail must satisfy. `knowledge.source_type = regulation` can hold the *document* but not the *applicability of a standard to this workflow*. | `missing_information.missing_attribute` | Add `compliance_standard` (`string[]`) at workflow level (e.g. on `workflow_identity` or a governance table). |
| `gov_data_sensitivity` | Risk/Governance | No field flags that the workflow touches PII/PHI/financial/confidential data. This is a first-class build-gating fact with no destination. | `missing_information.missing_attribute` (severity typically `high`/`critical`) | Add `data_sensitivity` (`enum(none, pii, phi, financial, confidential, mixed, unknown)`) at workflow level. |
| `gov_data_residency` | Risk/Governance | No field captures data-residency/processing-location constraints. | `missing_information.missing_attribute` | Add `data_residency` (`string`) at workflow level or on `connector`. |

All four are governance/compliance facts that the prototype's five-stage thin slice does not yet model; they are noted so the partner implementation (boverse.io) can extend the canonical schema deliberately rather than discovering the gap in production. Every other attribute in this registry maps cleanly to an existing `table.field` in doc 04.

---

## 21. Summary

- The registry defines **what to look for**; doc 04 defines **where it lands**. Extraction is probabilistic; the destination schema and the rules layer are the deterministic constraints.
- Attributes are grouped by the **12 discovery categories** (01) plus an **Archetype-Signal** group (feeding 02/04 §9.13) and a **Risk/Governance** group (feeding the ledger and governance gates).
- Every attribute names its **evidence types** (from the fixed §3 vocabulary) and its exact **canonical `table.field`**.
- Each attribute is **`first-pass`** (extract always) or **`deep`** (extract when relevant); the split is a tunable default the rules layer may override.
- The registry is **designed to grow**: add rows freely, but map new facts to existing fields or raise a schema-change proposal. Four schema gaps are already flagged in §20.
