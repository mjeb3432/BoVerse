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

The formal framework lives in `docs/workflow-creator/` (the implementation-agnostic corpus, 00–11) and `docs/workflow-creator/IMPLEMENTATION.md` (how the Next.js app realizes it).

## What lives here

| Path | What it is |
|------|------------|
| `landing/` | The app: marketing site + `/factory` two-swarm workflow factory (Next.js 16, React 19, Tailwind 4, TypeScript). |
| `landing/migrations/` | Postgres schema (0001–0006: sessions + RAG + the canonical store + build artifacts). Apply with `node scripts/migrate.mjs`. |
| `docs/workflow-creator/` | The Workflow Creator framework corpus (00–11), business-user drafts, and implementation notes. |
| `BoVerse-Demo-2/` | Flint & Tinder sample **evidence** pack (creative-agency brief → priced proposal) — 5 realistic files and a runbook. The *simulation pack* itself is generated per session by BoVerse from this evidence + your Setup answers, not stored here. |

## Quick start

**Prerequisites:** [Node.js 20+](https://nodejs.org/) and [git](https://git-scm.com/).

```bash
git clone https://github.com/mjeb3432/BoVerse.git
cd BoVerse/landing
npm install
npm run dev
```

Opens http://localhost:3000. Go to `/factory`, answer the optional **Setup** questions (where work comes from, what you want to produce, where it lands, sign-off), describe the outcome, and drop in the five evidence files from `BoVerse-Demo-2/`. BoVerse generates a fresh **simulation pack** for your session (sample output + sample inputs + sign-off gates + your Setup answers); download it with the button in the review surface to hand off to the downstream build team. Step-by-step: [`BoVerse-Demo-2/SIMULATION-RUNBOOK.md`](BoVerse-Demo-2/SIMULATION-RUNBOOK.md).

**Other scripts:** `npm run build` (production build), `npm run lint`, `npm run dev:plain` (no auto-open).

## Environment

The app degrades gracefully without keys (no LLM → discovery is disabled with a clear message; no DB → an in-memory store for local dev). For the full flow, set in `landing/.env.local`:

- `CEREBRAS_API_KEY` (preferred) or `GROQ_API_KEY` — the text LLM
- `GOOGLE_GENERATIVE_AI_API_KEY` — multimodal (PDFs / images) + embeddings
- `DATABASE_URL` — Supabase Postgres + pgvector (Transaction pooler, port 6543)

Then `node scripts/migrate.mjs` applies migrations 0001–0006.

## Deploy (Vercel + Supabase)

1. Import `mjeb3432/BoVerse` on Vercel, Root Directory = `landing`.
2. Create a Supabase project; apply the migrations (`node scripts/migrate.mjs` with `DATABASE_URL` set).
3. Set the env vars above on the Vercel project (Production + Preview).

Pushing to `main` auto-deploys.

## Brand

- **5 primitives**: ingest, transform, validate, action, feedback — every workflow decomposes into these.
- **9 archetypes**: from `workflow_component` up to `operating_layer` — the system classifies into one and builds only what that archetype requires.
- **Persona**: small business ($5M–$30M), no IT department.
- **Worked example**: Flint & Tinder, a creative agency turning an inbound brief into a priced proposal (classifies as a `sharp_point_solution`).

## License

Proprietary. © 2026 BoVerse.
