# BoVerse Workflow Factory — TODOS

Captured during /office-hours → /plan-ceo-review → /plan-eng-review → /plan-devex-review on 2026-05-13.

Items here are deferred work, not blocking the v1 build. Prune as you go.

This is the **Workflow Factory backend** TODOs. The **landing site** TODOs live at `landing/TODOS.md` (separate scope).

---

## P0 — Champion-tier deployment kit (blocks Phase 1 ship; integrated into design doc rev 6 weeks 1-5)

These are tracked in design doc rev 6 Success Criteria as weekly tasks. Listed here for completeness and for the build-week kickoff checklist.

### DX-1. Generated artifact template structure
- **What**: Factory emits a Python repo with the canonical top-level structure (Dockerfile, docker-compose.yml, .env.example, README.md with factory-vs-artifact disambiguation, DEPLOY.md, samples/, tests/fixtures/servicetitan/, primitives/, mcp_servers/, alembic/, docs/, eval/, .github/) per generated workflow.
- **Why**: F1 (factory-vs-artifact confusion), F2 (minimum env undefined). Foundation for every other DX prescription.
- **Effort**: Human ~3 days / CC ~6 hrs.
- **Status**: Locked into design doc rev 6 week 1.

### DX-2. Dockerfile pre-built per generated workflow
- **What**: Factory emits a multi-stage Dockerfile (uv install → app). CI in generated repo runs `docker build .` on every PR.
- **Why**: F7. Champion-tier deployment kit centerpiece. Without this, every customer hand-builds.
- **Effort**: Human ~2 days / CC ~4 hrs.
- **Status**: Locked into design doc rev 6 week 4.

### DX-3. Sample data pack ships per workflow
- **What**: Synthetic CSV/JSON shipped at `samples/` in every generated repo. Built from anonymized customer data templates. 5-10 samples covering happy path + 2 edge cases.
- **Why**: F5. Without sample data, Hello World can't run offline.
- **Effort**: Human ~1 day / CC ~2 hrs per vertical.
- **Status**: Locked into design doc rev 6 week 4.

### DX-4. ServiceTitan mock mode
- **What**: `SERVICETITAN_MOCK_MODE=true` env var skips real API calls, serves fixtures from `tests/fixtures/servicetitan/`.
- **Why**: F6. Hello World must work offline.
- **Effort**: Human ~1 day / CC ~2 hrs.
- **Status**: Locked into design doc rev 6 week 1.

### DX-5. Primitive-aware error format
- **What**: Error rendering layer wraps every WorkflowError with 4-block structure: what failed / what it means / what to do / how to debug. Rich-rendered. Includes link to `boverse.ai/errors/{code}`.
- **Why**: F10. Generic Python stack traces fail Champion claim.
- **Effort**: Human ~2 days / CC ~4 hrs.
- **Status**: Locked into design doc rev 6 weeks 6-7.

### DX-6. OTel auto-instrumentation
- **What**: `opentelemetry-instrument` wrapper for every `workflow run`. Spans per primitive with workflow_id/step/primitive_name attributes. Default OTel collector in docker-compose.dev.yml prints to stdout. Exporter configs shipped for Honeycomb, Datadog, Grafana Cloud.
- **Why**: F12. Champion-tier observability default.
- **Effort**: Human ~2 days / CC ~4 hrs.
- **Status**: Locked into design doc rev 6 weeks 6-7.

---

## P1 — Upgrade path (blocks v2 regeneration; integrated into design doc rev 6 weeks 10-11)

### DX-7. Workflow versioning (semver per regeneration)
- **What**: Factory emits version in `pyproject.toml`. Increment policy: patch for additive non-breaking, minor for additive primitives, major for breaking changes. Factory version tracked separately. Primitive version per primitive in `primitives/__manifest__.json`.
- **Why**: F13. Without versioning, every regeneration is unknown lineage.
- **Effort**: Human ~1 day / CC ~2 hrs.
- **Status**: Locked into design doc rev 6 week 10.

### DX-8. `workflow diff` CLI
- **What**: Compares two workflow versions, outputs structured diff (primitive additions/modifications/removals, schema changes, state changes, model changes, recommended migration order).
- **Why**: F14. Without diff, customer can't see what changed.
- **Effort**: Human ~3 days / CC ~6 hrs.
- **Status**: Locked into design doc rev 6 week 10.

### DX-9. Auto-generated Alembic migrations on regeneration
- **What**: Factory emits Alembic migration script + state migration script + config migration + rollback for every breaking change. Migration scripts ship in `alembic/versions/<workflow-version>/` and `migrations/state/<workflow-version>/`.
- **Why**: F15. Without auto-gen, every regeneration is a hand-migration.
- **Effort**: Human ~4 days / CC ~8 hrs.
- **Status**: Locked into design doc rev 6 week 11.

---

## P2 — Documentation completeness (integrated into design doc rev 6 weeks 8-9)

### DX-10. Diátaxis docs structure with mkdocs-material
- **What**: 4 quadrants (tutorials/how-to/reference/concepts) + operations subsection. Auto-generated reference from CLI (typer) + SDK (sphinx-autodoc) + MCP tool metadata + error class hierarchy. CI link checker (lychee or mkdocs-linkcheck) on every PR.
- **Why**: Without structured docs, customer onboarding is one-on-one consulting forever.
- **Effort**: Human ~5 days / CC ~10 hrs.
- **Status**: Locked into design doc rev 6 weeks 8-9.

### DX-11. CI-tested tutorials
- **What**: Tutorials 01 (Hello World), 02 (Real ServiceTitan), 03 (Deploy to staging), 04 (Handle failure), 05 (Upgrade regeneration), 06 (Write an eval) are executable as CI tests. Every code block syntax-checked. Every `expected:` output regex-matched against real run output.
- **Why**: Docs rot. CI testing keeps them current.
- **Effort**: Human ~3 days / CC ~6 hrs.
- **Status**: Locked into design doc rev 6 weeks 8-9.

---

## P3 — Dev environment polish (integrated into design doc rev 6 week 12)

### DX-12. Hot reload via `workflow run --watch`
- **What**: Watches `primitives/`, `mcp_servers/`, `eval/` for changes. On change, validates syntax, re-runs last sample, prints diff between previous and new trace.
- **Why**: <5s feedback loop for primitive development.
- **Effort**: Human ~1 day / CC ~2 hrs.

### DX-13. mypy --strict on entire codebase
- **What**: CI fails on any type error. Every public function has full type hints. Pydantic models for all data shapes.
- **Why**: Caught at compile time, not runtime.
- **Effort**: Human ~2 days / CC ~4 hrs (mostly fixing existing untyped code).

### DX-14. Debug + profile modes
- **What**: `workflow run --debugger primitive=N` drops into pdb at primitive boundary. `workflow run --profile` outputs cProfile data + flamegraph SVG. `workflow run --inspect-llm` pretty-prints every LLM request/response with token counts + latency + retries.
- **Why**: Production debugging without re-running full workflow.
- **Effort**: Human ~2 days / CC ~4 hrs.

---

## P4 — Community + measurement (integrated into design doc rev 6 week 13)

### DX-15. Issue templates + CONTRIBUTING.md + MCP_PROTOCOL.md
- **What**: `.github/ISSUE_TEMPLATE/` with 4 templates (bug-report, feature-request, primitive-proposal, deployment-help). CONTRIBUTING.md (code style, type checking, commits, PR template, release process). MCP_PROTOCOL.md (Factory's MCP tool contract, registration, versioning, testing).
- **Why**: Without structure, every customer reports the same way.
- **Effort**: Human ~1 day / CC ~2 hrs.

### DX-16. `workflow feedback` CLI
- **What**: Opens a structured form for operator feedback. Submits to telemetry endpoint.
- **Why**: Closes the feedback loop. Quarterly retros draw from this.
- **Effort**: Human ~1 day / CC ~2 hrs.

### DX-17. DX scorecard process
- **What**: Quarterly template: pull support tickets, group by friction point, survey active operators, time a fresh hire, update scorecard, publish to internal team.
- **Why**: Without measurement, DX silently degrades.
- **Effort**: Human ~0.5 days / CC ~1 hr.

---

## v1.1 — DX scope cut from v1 under timeline pressure (per design doc rev 6 D14)

These ship in v1.1, not v1. Cut order if v1 timeline slips further:

### DX-18. Helm chart shipped per generated workflow
- **What**: Generated repo includes `charts/<workflow>/` with Helm values for prod deployment to Kubernetes.
- **Why**: F8. Some customers run K8s. Without Helm, they hand-write manifests.
- **Effort**: Human ~3 days / CC ~6 hrs.

### DX-19. ECS task definition + Fly.io fly.toml examples
- **What**: Reference deployment configs for non-K8s shops: AWS ECS task definition JSON, Fly.io fly.toml.
- **Why**: F8. SMBs run on ECS or Fly. Without examples, they figure it out from generic Docker tutorials.
- **Effort**: Human ~2 days / CC ~4 hrs.

### DX-20. In-flight run handling sophistication during regeneration migration
- **What**: When running `workflow migrate` with in-flight runs, checkpoint active runs and resume them post-migration with best-effort schema reconciliation. v1 just refuses-if-running.
- **Why**: For long-running workflows (multi-hour Apex runs), refuse-if-running blocks regeneration entirely.
- **Effort**: Human ~5 days / CC ~10 hrs.

### DX-21. Telemetry collector (self-hostable)
- **What**: FastAPI endpoint that collects opt-in workflow run telemetry. Customers can self-host or use BoVerse-hosted at telemetry.boverse.ai.
- **Why**: Measure TTPL, success rates, error class frequencies across customer base.
- **Effort**: Human ~3 days / CC ~6 hrs.

### DX-22. Community templates (Slack Connect playbook polish)
- **What**: Slack Connect channel onboarding playbook, customer-facing CONTRIBUTING guide, public discussion forum on `boverse-mcp-sdk` GitHub.
- **Why**: v1 ships skeletons; v1.1 polishes.
- **Effort**: Human ~2 days / CC ~4 hrs.

---

## v2 — Deferred to future versions (from /plan-ceo-review)

### E7. Workflow marketplace / cross-engagement template library
- **What**: Once 5+ workflows exist for similar businesses, system suggests templates. Network effect moat.
- **Status**: v2 strategic.

### E8. Versioning + audit trail beyond basic engagement history
- **What**: Full change history per workflow. Critical for compliance verticals.
- **Status**: v2.

### E9. Multi-language support
- **What**: Whisper multilingual + parameterized prompts. Expands TAM beyond English-speaking SMBs.
- **Status**: v2.

### E10. A/B testing framework
- **What**: Prompt variation testing for ablation studies and customer-facing experiments.
- **Status**: v2.

### E11. Failure mode catalog as cross-engagement RAG
- **What**: Every miss becomes a learning entry. Future workflows benefit from prior failures.
- **Status**: v2.

### E12. Auto-generated SOPs alongside workflow
- **What**: Write client team training docs in parallel with workflow generation.
- **Status**: v2.

### E13. Cost reporting per workflow
- **What**: Runtime cost + time savings reporting per workflow run.
- **Status**: v2 (partial in E5 analytics).

### E14. Mirror Score
- **What**: Overall system confidence as a single 0-10 score visible to operator + client.
- **Status**: v2.

### QuickBooks MCP server
- **What**: Second integration after ServiceTitan. Connects to QuickBooks for accounting data.
- **Status**: v2.

---

## Pre-build infrastructure (from /plan-eng-review outside voice findings)

### IF-1. CI/CD beyond pre-commit
- **What**: GitHub Actions for lint + test + build + deploy. Beyond pre-commit hooks.
- **Why**: Pre-commit doesn't catch what CI does. Per outside voice finding #17.
- **Effort**: Human ~1 day / CC ~2 hrs.
- **Status**: Deferred from v1 (local discipline + manual runs). v1.1.

### IF-2. Streamlit Co-design panel migration to FastAPI + HTMX
- **What**: If Streamlit click-to-correct latency exceeds 10s consistently, extract Co-design panel to FastAPI + minimal HTMX for tighter latency control.
- **Why**: Per outside voice finding #4 + Risk #16.
- **Effort**: Human ~2 weeks / CC ~4 days.
- **Status**: Decision week 5 (Gate 1). Defer if latency target achievable.

### IF-3. Chat-iteration clarification prompts
- **What**: Chat input requires "I think you mean X, confirm?" clarification turns to disambiguate ambiguous corrections.
- **Why**: Per outside voice finding #18 + design doc rev 5 hidden coupling note.
- **Effort**: Human ~3 days / CC ~6 hrs.
- **Status**: Locked into design doc rev 6 weeks 10-11.

---

## Revision History

- **rev 1** (2026-05-13): Initial creation post-/plan-devex-review with 17 DX items (P0-P3) + 5 v1.1 items + 9 v2 items + 3 pre-build infra items. References design doc rev 6 weekly success criteria for status of P0-P3 items.
