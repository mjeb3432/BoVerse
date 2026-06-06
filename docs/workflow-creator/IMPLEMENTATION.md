# Two-Swarm Factory — Implementation Notes

> **What this is:** the corpus (`00`–`11` + `drafts/`) realized as a working app. The Next.js `landing/` app was overhauled from a single ad-hoc 5-stage pipeline into the **two cooperating swarms**, and the old pipeline was removed. Branch: `feat/two-swarm-factory`.

## The flow (what the user does)

`/factory` → describe an **outcome** + upload **evidence** → (answer a few blocking questions) → review the **sample output** and **sample inputs** → comment / edit an input (re-renders both) → **approve** → the build runs → `/factory/[buildId]` shows the **bundle** (object ledger + downloads). The business user only ever touches inputs and outputs; all machinery sits behind the **OPERATOR** drawer.

## Routes

| Route | Swarm | Role |
|---|---|---|
| `POST /api/factory/swarm1/extract` | 1 | evidence → registry-guided LLM extraction → canonical store + provenance |
| `POST /api/factory/swarm1/classify` | 1 | deterministic rules → archetype + build posture (no LLM) |
| `POST`/`PATCH /api/factory/swarm1/gaps` | 1 | missing-info ledger → blocking questions; apply answers |
| `POST /api/factory/swarm1/specify` | 1 | WDS + Simulation Pack (sample output + sample inputs) |
| `POST /api/factory/swarm1/review` | 1 | comment / input_change (re-project) / **approve** (the seam gate) |
| `GET /api/factory/swarm1/blueprint` | 1 | Configuration 0 — the six named Discovery outputs (blueprint, classification, registry, canonical schema, rules wiki, simulation pack) |
| `GET /api/factory/swarm1/handoff` | 1 | export boundary — the Swarm2Input contract + setup_intake + discovery_package |
| `POST /api/factory/swarm2/build` | 2 | approved spec → assemble bundle (only required objects) → verify → persist |
| `GET /api/factory/swarm2/[buildId]` | 2 | bundle manifest + files; `?download=zip\|md\|json` |

## Data model (additive migrations — infra untouched)

- `migrations/0005_canonical_store.sql` — the 13 canonical tables keyed by `workflow_id` (`workflow_identity`, `outcome`, `output`, `input`, `actor`, `system_connector`, `process_step`, `decision_rule`, `human_review`, `archetype`, `missing_information`, `provenance`, `workflow_approval`). Closed CHECK enums + FKs = the determinism layer.
- `migrations/0006_build_artifacts.sql` — `build_runs`, `build_objects`, `build_artifacts`.
- The WDS + Simulation Pack persist in the freed `workflow_sessions.generate_output` / `simulate_output` JSONB columns (no migration).

## lib modules

`canonical-schema.ts` (zod mirror + shared vocab) · `canonical.ts` (DAL + `validateInvariants` + provenance + session/projection helpers) · `registry.ts` (extraction envelope + map) · `rules-engine.ts` (classify + HITL) · `build-mapping.ts` (archetype→objects matrix, shared) · `gaps.ts` (ledger) · `wds.ts` (WDS projection) · `simulation.ts` (two surfaces + reproject) · `swarm/contract.ts` (the seam types) · `swarm2/{objects,assemble,verify,zip,store,types}.ts`.

## How to run

```bash
cd landing
# env in .env.local: a text LLM key (CEREBRAS_API_KEY preferred, or GROQ_API_KEY),
# GOOGLE_GENERATIVE_AI_API_KEY (multimodal + embeddings), DATABASE_URL (Postgres+pgvector)
node scripts/migrate.mjs          # applies 0001–0006
npm run dev                       # open /factory, drop the 5 BoVerse-Demo-2 files
```

Degrades gracefully: **no DB** → an in-memory canonical store (single dev process; production needs `DATABASE_URL`). **No LLM** → extract/specify return `llm_not_configured`.

## Verification status

- `npm run build`, `npx tsc --noEmit`, `npm run lint` — all clean.
- `npx tsx scripts/test-assemble.ts` — proves the **Swarm 2 oracle** deterministically: a `sharp_point_solution` builds **6 objects** (workflow, rules_wiki, registry, canonical_tables, ui, audit_layer) and **refuses 4** (connectors, decision_layer, library, reporting_layer), verification green, valid zip — matching `drafts/02 §5`.
- A full live run (LLM + DB) against `BoVerse-Demo-2/` is the remaining manual check (needs keys).

## First cut vs. hardening (honest)

- **Pricing math** in the sample output is LLM-computed *from* the canonical rules (corpus 08 §1.1 allows the rendered prose to be probabilistic). A fully **deterministic pricing evaluator** driven by `decision_rule` rows is the documented hardening path; exact figures may vary run-to-run until then.
- **Object creators** are first cuts (e.g. `workflow.json` leaves agent prompt templates as TODO placeholders).
- **docx / agent-swarm reuse:** the bundle generates `spec.md` + `agent-swarm.md` directly from the WDS; reusing `lib/docx-renderer.ts` via an adapter (for a `.docx` in the bundle) is deferred.
- **Determinism boundary held:** the LLM is used only for extraction, the rendered sample prose, and question phrasing. Classification, build-mapping, the gap policy, verification, and the zip are pure functions of canonical rows.
