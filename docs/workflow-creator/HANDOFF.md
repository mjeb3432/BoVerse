# The handoff boundary — Discovery → external Build swarm

BoVerse is two swarms with a single seam between them: **Discovery** (Swarm 1)
reads evidence and emits a spec + simulation you approve; **Build** (Swarm 2)
compiles only the objects the archetype requires. This document describes the
**export boundary** — the point where Discovery hands off — so the Build half
can run inside this app *or* inside a separate application.

## TL;DR

- The seam is a single typed contract: `Swarm2Input` in
  [`landing/lib/swarm/contract.ts`](../../landing/lib/swarm/contract.ts) —
  `{ wds, simulation, approval }`.
- The app exposes it at **`GET /api/factory/swarm1/handoff?session_id=<id>`**,
  wrapped with the pre-upload **Setup answers** (the integration-points record)
  and a `handoff_contract_version`.
- The app's own Build swarm
  ([`/api/factory/swarm2/build`](../../landing/app/api/factory/swarm2/build/route.ts))
  is the **reference build** — it consumes the exact same contract internally.
- To run Build elsewhere, point the downstream swarm at the handoff endpoint
  and ignore the in-app build route. Discovery does not depend on it.

## Why a boundary instead of one end-to-end swarm

The Build swarm is being ported into another application. Rather than couple
Discovery to this app's build, we treat the approved spec as the deliverable
and expose it as a plain JSON read. The in-app Swarm 2 stays as a working
reference so the full flow is demonstrable today; the downstream app can
replace it without touching Discovery.

```
evidence ─▶ Swarm 1 (Discovery, this app) ─▶ HANDOFF (export boundary)
                                                  │
                              ┌───────────────────┴───────────────────┐
                              ▼                                        ▼
                   /swarm2/build (reference,            downstream app's Build swarm
                    in this app, optional)               (consumes the same contract)
```

## The handoff envelope

`GET /api/factory/swarm1/handoff?session_id=<id>` returns:

```jsonc
{
  "handoff_contract_version": 1,
  "session_id": "…",
  "workflow_id": "…",

  // Integration-points record — the pre-upload Setup answers.
  // null if the user skipped the Setup form.
  "setup_intake": {
    "source": "…", "sourceMode": "email",
    "fileTypes": "…",
    "output": "…",
    "destination": "…", "destinationMode": "batch_upload",
    "connection": "…"
  },

  // Configuration 0 — the six named Discovery outputs (see next section).
  "discovery_package": { /* blueprint, classification, registry, canonical_schema, rules_wiki, simulation_pack */ },

  // The canonical Swarm 1 → Swarm 2 contract (Swarm2Input).
  "wds":        { /* Workflow Design Specification — the deterministic blueprint */ },
  "simulation": { /* Simulation Pack — sample output + sample inputs + step trace */ },
  "approval":   { /* Approval record — `approved` is false until the user approves */ }
}
```

## Configuration 0 — the six named Discovery outputs

Discovery (the Workflow Creator itself) produces a fixed set of artifacts that
answer **"What should we build?"** *before* any build runs. They are exposed as
a single package at **`GET /api/factory/swarm1/blueprint?session_id=<id>`**
(also embedded in the handoff envelope as `discovery_package`), and surfaced to
the user as the "Discovery outputs" panel in the review surface.

| # | Output | What it is | Source |
|---|---|---|---|
| 1 | `workflow_blueprint` | The deterministic spec (the WDS) | `lib/wds.ts` |
| 2 | `workflow_classification` | Archetype + the `what_to_build` answer (required / optional / **unnecessary** components) | `rules-engine.ts` |
| 3 | `registry` | The recurring attributes the workflow extracts/produces/uses | projected from the store |
| 4 | `canonical_schema` | The populated canonical data model (13-table store) | `migrations/0005` |
| 5 | `rules_wiki` | The business rules, as a ruleset + wiki | `decision_rule` rows |
| 6 | `simulation_pack` | Sample output + the inputs that produce it (null until `/specify`) | `lib/simulation.ts` |

All six are a **pure projection** of the canonical store (+ the generated
simulation) — no LLM, no build. `lib/discovery-package.ts` assembles them. The
Swarm-2 build objects `registry`, `rules_wiki`, and `canonical_tables` are
realizations of outputs 3–5; this package is the discovery-time source.

`wds`, `simulation`, and `approval` are validated by the Zod schemas in
`contract.ts`. The downstream swarm should validate against
`Swarm2InputSchema` (or its own port of it) before building.

### Approval gating

The endpoint is **tolerant of the pre-approval state** — the in-app
"Download simulation pack" button calls it during review, before the user has
approved. When there's no approval yet, `approval.approved` is `false` and
`approval.approved_at` is `null`.

**The downstream swarm must gate on `approval.approved === true`** before it
builds anything. A handoff fetched mid-review is for inspection only.

## `setup_intake` — the integration points

The Setup answers are the explicit integration-points record. Two of the
fields are a typed vocabulary the downstream swarm can switch on directly:

| Field | Type | Meaning |
|---|---|---|
| `source` | free text | Where work comes in from |
| `sourceMode` | `batch_upload \| api \| email \| periodic_export \| webhook \| unknown` | How it arrives |
| `fileTypes` | free text | Expected upload file types |
| `output` | free text | What to produce |
| `destination` | free text | Where the result lands |
| `destinationMode` | same enum as `sourceMode` | How the result leaves |
| `connection` | free text | API / tenant / sign-off contact notes |

Use `sourceMode` / `destinationMode` to decide whether to wire an API client,
a batch job, a mailbox poller, or a webhook receiver. The free-text fields
carry the human nuance; the enums carry the switchable decision.

## Sign-off gates (human-in-the-loop)

The human-review points live in `wds.hitl` (and are surfaced to the user as the
"Sign-off gates" panel during review). Each gate carries `workflow_stage`,
`human_role`, `reason_for_review`, `review_trigger`, and `approval_required`.
The downstream swarm is responsible for honoring every `approval_required`
gate as a real review step — they are part of the contract, not advisory.

## Swapping in the downstream swarm — checklist

1. Drive Discovery to the review stage as usual (extract → classify → gaps →
   specify), or however the downstream app integrates it.
2. `GET /api/factory/swarm1/handoff?session_id=<id>`.
3. Validate the envelope; confirm `approval.approved === true`.
4. Build from `wds.build_recommendation`:
   - build `required_components`,
   - build `optional_components` only with evidenced justification,
   - **refuse** `unnecessary_components`.
5. Honor every `wds.hitl` gate where `approval_required` is true.
6. Use `setup_intake.sourceMode` / `destinationMode` to wire the connectors.

## Versioning

- `handoff_contract_version` — bump when the envelope shape changes.
- `wds.version`, `simulation.version` — the inner contract versions, independent
  of the envelope.

Pin the downstream consumer to a `handoff_contract_version` and branch on it.
