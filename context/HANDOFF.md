# Handoff Entry Point

Read this file first when resuming work with any AI.

This is the single entry point for project context. It links to the standing memory, session state, active workstreams, and proposal/build artifacts that a replacement AI should load before acting.

## Resume Protocol

1. Read [context/CORE_MEMORY.md](CORE_MEMORY.md).
2. Read [context/SESSION_LOG.md](SESSION_LOG.md).
3. Read the files listed in **Active Workstreams** below.
4. Check `git status` and recent commits to understand workspace drift.
5. Only then continue the active task or ask the user a clarifying question.

## Canonical Context Files

**Process & state**
- Core memory: [context/CORE_MEMORY.md](CORE_MEMORY.md)
- Architecture transition notes: [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md)
- Running session history: [context/SESSION_LOG.md](SESSION_LOG.md)
- Proposal directory: [proposals/](../proposals/)
- Active build-feature designs: [context/build-feature/](build-feature/)
- Active build-feature logs: `agent_logs/build-feature/`

**Plan**
- V1 implementation plan: [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md)

**Reference docs (in `docs/`) — precedence ranked**

When sources disagree, follow this order. Higher entries win. Same rule lives in [CORE_MEMORY.md → Reference-doc precedence](CORE_MEMORY.md#reference-doc-precedence-group-pas-v1).

1. **DSL specs (canon):** [docs/spec/](../docs/spec/) — `quotation/`, `issuance/`, `policy-admin/`, `common/`. Backend has confirmed all DSL values are stable.
2. **V1 blueprint:** [docs/planning/team_nb_blueprint_v3.md](../docs/planning/team_nb_blueprint_v3.md)
3. **Original product spec (long-term direction):** [docs/planning/GTL Quotation Module (3).md](../docs/planning/GTL%20Quotation%20Module%20(3).md)
4. **OpenAPI snapshot (stale):** [docs/planning/openapi.json](../docs/planning/openapi.json) — useful for shape cross-check, but disagrees with DSL in places (e.g. `ProposalMember` vs DSL's `PolicyMember`). Trust DSL.
5. **Future-state workflow:** [docs/planning/SAMPLE-WORKFLOW.md](../docs/planning/SAMPLE-WORKFLOW.md) — full GTL workflow (sanction/medical/actuarial/manager-approval). V1 ships a simpler subset.

**Frontend conventions (in repo)**
- Module-creation walkthrough: [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](../docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md)
- State patterns: [docs/STATE_MANAGEMENT_GUIDE.md](../docs/STATE_MANAGEMENT_GUIDE.md)
- Codebase overview: [docs/CODEBASE_OVERVIEW.md](../docs/CODEBASE_OVERVIEW.md)

## Active Workstreams

### Group PAS V1 — Frontend (in progress)

Demo target: internal demo by 2026-05-08 (Friday of plan-locked week). Plan in [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md).

**Build is batched, not iterated per task.** The plan above is the complete V1; for the demo we ship a narrower slice in 3 batches per [docs/group-pas-v1-plan.md → V1 demo — execution strategy + deferred work](../docs/group-pas-v1-plan.md#v1-demo--execution-strategy--deferred-work). Read that section before picking up work — it lists which tasks are demo-critical, which are demo-deferred-but-V1, and which shortcuts must be cleaned up post-demo.

| Batch | Status |
|-------|--------|
| Batch 1 — Foundation (Phase 0 + Phase 1 demo subset) | in progress — Phase 0 done; Tasks 1.1, 1.5 done; **next = Task 1.4** (then 1.2 → 1.9 → 1.3 → 1.8) |
| Batch 2 — Quote happy path (Phase 2 demo subset) | blocked on Batch 1 |
| Batch 3 — Issuance + PAM + glue (Phase 3, 4, 5 demo subsets) | blocked on Batch 2 |

**Deferred-from-demo backlog (D1–D12)** lives in the same plan section. After demo lands, work that backlog before starting any new feature.

When picking up a task, follow the per-task **Context to load / Output / Done when** structure in the plan doc — it points to the exact spec files, templates, and acceptance criteria.

## Skill catalogue

The pipeline skills under [.claude/skills/](../.claude/skills/) are the canonical way to take work from idea → ship:

- `/propose` — file a structured change proposal under `proposals/`.
- `/review-proposals` — triage drafts, decide approve/reject/defer.
- `/build-feature` — multi-stage CLARIFY → DESIGN → BUILD pipeline with user gates. Accepts a `PROP-NNNN` id or a free-form ask. **Default choice for any feature work.**
- `/execute-proposal PROP-NNNN` — pick up an approved proposal, branch, implement, PR. **Use only when the proposal's design is fully locked and CLARIFY would be a no-op** (mechanical, tightly-scoped change). Otherwise prefer `/build-feature`.
- `/build-backend` — backend-only execution path (mirrors execute-proposal for FastAPI work).
- `/specs-to-draft` / `/refine-specs-to-draft` — turn a spec into a proposal draft.
- `/specs-to-tests` — derive test plan from a spec.
- `/extract-usecase` — pull canonical use cases from a PRD.
- `/design-system` — design-system audit / extension.
- `/preview-and-deploy` — lint + test + preview gate.
