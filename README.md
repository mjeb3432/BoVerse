# BoVerse

The workflow factory for small business. You describe the outcome you want and upload what you already have. BoVerse infers the workflow and builds it — you only review and approve.

## How it works: two agent swarms

BoVerse runs as two cooperating swarms of AI agents. The seam between them is a single artifact — the specification you approve.

```
evidence ─▶ Swarm 1 (Discovery) ─▶ canonical store ─▶ archetype ─▶ spec + sample
                                                                      │
                                                           you review & approve
                                                                      │
                                                                      ▼
                                         Swarm 2 (Build) ─▶ only the objects it needs
```

- **Swarm 1 · Discovery** — reads the evidence, extracts canonical facts, classifies the workflow archetype, and emits a Workflow Design Specification plus a sample to approve. This is the only swarm the user interacts with.
- **Swarm 2 · Build** — takes the approved spec and compiles only the BoVerse objects the archetype requires (workflow, rules, registry, canonical tables, UI, audit, ...), refusing everything it does not need.

The formal framework lives in [`docs/workflow-creator/`](docs/workflow-creator/) — the implementation-agnostic corpus (`00`–`11`) plus [`IMPLEMENTATION.md`](docs/workflow-creator/IMPLEMENTATION.md) (how the Next.js app realizes it) and [`HANDOFF.md`](docs/workflow-creator/HANDOFF.md) (the Discovery → Build export boundary).

## What lives here

| Path | What it is |
|------|------------|
| `landing/` | The app: marketing site + `/factory` two-swarm workflow factory (Next.js 16, React 19, Tailwind 4, TypeScript). |
| `landing/lib/` | The engine — extraction registry, canonical store, deterministic rules engine + classifier, gaps, WDS projection, simulation, the Swarm-1→2 contract, and the Swarm-2 object creators. |
| `landing/migrations/` | Postgres schema (`0001`–`0008`: sessions + RAG + the canonical store + build artifacts + Setup intake + the `tech_stack` gap kind). Apply with `node scripts/migrate.mjs`. |
| `landing/scripts/test-*.ts` | Deterministic tests (no LLM, no DB). `npm test` runs the classifier golden set and the Swarm-2 assemble oracle. |
| `docs/workflow-creator/` | The Workflow Creator framework corpus (`00`–`11`), `IMPLEMENTATION.md`, `HANDOFF.md`, and `drafts/` (the foundational narrative + the fully-worked Flint & Tinder example). |
| `BoVerse-Demo-2/` | Flint & Tinder sample **evidence** pack (creative-agency brief → priced proposal) — 5 realistic files and a runbook. The *simulation pack* itself is generated per session from this evidence + your Setup answers, not stored here. |

## Quick start

**Prerequisites:** [Node.js 20+](https://nodejs.org/) and [git](https://git-scm.com/).

```bash
git clone https://github.com/mjeb3432/BoVerse.git
cd BoVerse/landing
npm install
npm run dev
```

Opens http://localhost:3000. Go to `/factory`, answer the optional **Setup** questions (where work comes from, what you want to produce, where it lands, sign-off), describe the outcome, and drop in the five evidence files from `BoVerse-Demo-2/`. BoVerse generates a fresh **simulation pack** for your session (sample output + sample inputs + sign-off gates + your Setup answers); download it with the button in the review surface to hand off to the build team. Step-by-step: [`BoVerse-Demo-2/SIMULATION-RUNBOOK.md`](BoVerse-Demo-2/SIMULATION-RUNBOOK.md).

**Other scripts:** `npm run build` (production build), `npm run lint`, `npm test` (deterministic tests), `npm run dev:plain` (no auto-open).

## Environment

The app degrades gracefully without keys (no LLM → discovery is disabled with a clear message; no DB → an in-memory store for local dev). For the full flow, set in `landing/.env.local` (see `.env.local.example`):

- `CEREBRAS_API_KEY` (preferred) or `GROQ_API_KEY` — the text LLM
- `GOOGLE_GENERATIVE_AI_API_KEY` — multimodal (PDFs / images) + embeddings (`gemini-embedding-001`, 768-dim)
- `DATABASE_URL` — Supabase Postgres + pgvector (Transaction pooler, port 6543)

Then `node scripts/migrate.mjs` applies migrations `0001`–`0008`.

## Migrating into BoVerse

The Discovery half is the part that ports into the main BoVerse platform; the in-app Build swarm is a **reference** implementation you can keep or replace. The seam is a single typed contract, so the swap is a plain JSON read — there is no tight coupling to undo.

- **The contract** — `Swarm2Input` (`landing/lib/swarm/contract.ts`): `{ wds, simulation, approval }`, with field names that reuse the canonical row schemas (zero translation).
- **The export boundary** — `GET /api/factory/swarm1/handoff?session_id=<id>` returns that contract plus the pre-upload `setup_intake` (the integration-points record) and the named `discovery_package` (the six Configuration-0 outputs). Point the downstream BoVerse swarm at this endpoint and ignore the in-app `/api/factory/swarm2/build` route.
- **Gate on approval** — `approval.approved` is `false` until the user approves; honor every `wds.hitl` sign-off gate.
- **Build posture** — `wds.build_recommendation` says exactly what to build (`required_components`), what's optional, and what to **refuse** (`unnecessary_components`).

Start with [`docs/workflow-creator/HANDOFF.md`](docs/workflow-creator/HANDOFF.md) (the full envelope, the `sourceMode`/`destinationMode` vocabulary, and a swap-in checklist), then [`IMPLEMENTATION.md`](docs/workflow-creator/IMPLEMENTATION.md) (routes + lib modules) and the corpus `00`–`11` for the framework itself. `docs/workflow-creator/drafts/04-canonical-table.md` is the fully-worked Flint & Tinder example (the canonical store, the two review surfaces, and the priced proposal it produces).

## Testing

```bash
cd landing
npm test          # classifier golden set + Swarm-2 assemble oracle (deterministic, no LLM/DB)
npx tsc --noEmit  # type check
npm run lint
```

`scripts/test-classify.ts` pins archetype classification against labeled cases; `scripts/test-assemble.ts` proves the Swarm-2 build oracle (right objects built, unnecessary ones refused, valid bundle).

## Deploy (Vercel + Supabase)

1. Import `mjeb3432/BoVerse` on Vercel, Root Directory = `landing`.
2. Create a Supabase project; apply the migrations (`node scripts/migrate.mjs` with `DATABASE_URL` set).
3. Set the env vars above on the Vercel project (Production + Preview).

Pushing to `main` auto-deploys. **Note:** schema migrations are *not* run by the deploy — apply new `migrations/*.sql` to the database yourself when they're added.

## Concepts

- **5 primitives**: ingest, transform, validate, action, feedback — every workflow decomposes into these.
- **9 archetypes**: from `workflow_component` up to `operating_layer` — the system classifies into one and builds only what that archetype requires.
- **Persona**: small business ($5M–$30M), no IT department.
- **Worked example**: Flint & Tinder, a creative agency turning an inbound brief into a priced proposal (classifies as a `sharp_point_solution`).

## License

Proprietary. © 2026 BoVerse.
