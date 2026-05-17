# BoVerse

Atomic workflows. Five primitives. Infinite forms. The workflow factory for SMBs.

## What lives here

| Path                                          | What it is                                                                                  |
|-----------------------------------------------|---------------------------------------------------------------------------------------------|
| `landing/`                                    | Marketing site + `/build` workflow generator (Next.js 16, React 19, Tailwind 4, TypeScript). Renders .docx in-process via the Node `docx` library. |
| `landing/migrations/`                         | Postgres schema. Apply with `node scripts/migrate.mjs` or via Supabase SQL Editor.          |
| `Context/BoVerse_Workflow_Factory_Design.md`  | Source-of-truth design doc, rev 6. APPROVED.                                                |
| `Context/BoVerse_Workflow_Factory_TODOS.md`   | Workflow Factory backend TODOs (P0-P3 + v1.1 + v2 + infra).                                 |
| `Context/BoVerse_Workflow_Factory_v1.docx`    | v1.0 spec (locked).                                                                         |
| `Context/BoVerse_Workflow_Factory_Narrative.docx` | Vision narrative.                                                                       |
| `Context/BoVerse_Example_Workflow_Apex_Electrical (1).docx` | Apex Electrical worked example (22-step workflow).                              |

The Python Workflow Factory backend is planned but not yet built — see design doc rev 6 for the 17-week build plan starting Sep 2026.

## Quick start (landing site)

**Prerequisites:** [Node.js 20+](https://nodejs.org/) and [git](https://git-scm.com/) installed.

Open a fresh terminal (Windows PowerShell, macOS Terminal, or Linux shell) in any directory and copy-paste:

```bash
git clone https://github.com/mjeb3432/BoVerse.git
cd BoVerse/landing
npm install
npm run dev
```

The dev server starts on http://localhost:3000 and your default browser opens to it automatically. If port 3000 is busy, Next.js picks the next free port and the browser opens there instead.

**Already cloned the repo?** Skip the `git clone` line and just `cd` to wherever you cloned it, then into `landing/`:

```bash
cd path/to/BoVerse/landing
npm install
npm run dev
```

**Production build:**

```bash
npm run build
npm run start
```

`npm run build` compiles via Turbopack in a few seconds. `npm run start` serves the compiled build on http://localhost:3000 (open it manually — production mode doesn't auto-open).

**Other scripts:**

- `npm run dev:plain` — runs `next dev` without the auto-open wrapper
- `npm run lint` — ESLint check

## Production deploy (Vercel + Supabase)

Single Vercel deployment for the Next.js app (including the `/api/build/05-deliver/docx` route which renders .docx in-process via the Node `docx` library). Supabase for Postgres.

1. **Sign up at https://vercel.com** via GitHub (free Hobby tier)
2. **Import the repo** `mjeb3432/BoVerse` → set Root Directory = `landing`
3. **Sign up at https://supabase.com** via GitHub, create a project, copy the **Transaction pooler** connection string (port 6543) from Project Settings → Database
4. **Apply Postgres schema** (one of):
   - Supabase SQL Editor: paste contents of `landing/migrations/0001_workflow_sessions.sql` and Run
   - Or locally: `cd landing && node scripts/migrate.mjs` (reads `DATABASE_URL` from `.env.local`)
5. **Set environment variables** on the Vercel project:
   - `GOOGLE_GENERATIVE_AI_API_KEY` — get from https://aistudio.google.com/app/apikey
   - `DATABASE_URL` — your Supabase pooler connection string

Pushing to `main` auto-deploys.

## Architecture

The Workflow Factory backend (planned, not built):

```
boverse-ingestion-mcp    boverse-state-mcp    boverse-servicetitan-mcp
        |                       |                       |
        |                       v                       |
        +-------->  Postgres + pgvector  <--------------+
                            |
                            v
              Claude Agent SDK orchestration
                  (5 subagent stages)
                            |
                            v
                  Generated workflow artifact
              (Python repo, Docker, OTel, docs)
```

See `Context/BoVerse_Workflow_Factory_Design.md` for the complete architectural design.

## Brand

- **5 primitives**: ingest, transform, validate, action, feedback
- **Persona**: $5M-$30M SMB segment (no IT department, ~12-50 staff)
- **Worked example**: Apex Electrical, 12 estimators, $8-12M revenue, 22-step quote-intake workflow

## Status

- Marketing site: built, ready for review
- Workflow Factory backend: APPROVED design doc rev 6, build begins Sep 2026
- Independent study: Sep 2026 → Apr 2027 (320-480 hrs)

## License

Proprietary. © 2026 BoVerse.
