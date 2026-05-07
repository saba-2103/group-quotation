# Handoff Entry Point

Read this file first when resuming work with any AI.

This is the single entry point for project context. It links to the standing memory, session state, active workstreams, and proposal/build artifacts that a replacement AI should load before acting.

## Resume Protocol

1. Read [context/CORE_MEMORY.md](CORE_MEMORY.md).
2. Read [context/SESSION_LOG.md](SESSION_LOG.md).
3. Read the files listed in **Active Workstreams** below.
4. Check `git status` and recent commits to understand workspace drift.
5. Only then continue the active task or ask the user a clarifying question.

## Local environment

Backend specs live in a separate `group-pas` repo (sibling to this one). Path references below use `<group-pas-repo>` as a placeholder — resolve it to wherever you've checked out `group-pas` locally.

- **Expected default layout:** `group-pas` is checked out at the same workspace level as this repo. Example: if this repo is at `<workspace>/sandbox/keystone-ui/`, then `group-pas` is at `<workspace>/group-pas/` and references below resolve via `../../group-pas/`.
- **Override:** set the `GROUP_PAS_REPO` env var to the absolute path of your local `group-pas` checkout if your layout differs.
- **AI agents:** if you cannot resolve `<group-pas-repo>`, ask the user for the path rather than guessing.

## Canonical Context Files

- Core memory: [context/CORE_MEMORY.md](CORE_MEMORY.md)
- Architecture transition notes: [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md)
- Running session history: [context/SESSION_LOG.md](SESSION_LOG.md)
- V1 implementation plan: [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md)
- Module-creation walkthrough: [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](../docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md)
- State patterns: [docs/STATE_MANAGEMENT_GUIDE.md](../docs/STATE_MANAGEMENT_GUIDE.md)
- Backend specs (read-only reference): `<group-pas-repo>/spec/`
- Backend blueprint: `<group-pas-repo>/plans/team_nb_blueprint_v3.md`
- Proposal directory: [proposals/](../proposals/)
- Active build-feature designs: [context/build-feature/](build-feature/)
- Active build-feature logs: `agent_logs/build-feature/`

## Active Workstreams

### Group PAS V1 — Frontend (in progress)

Demo target: internal demo by end of week. Plan in [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md).

| Phase | Status |
|-------|--------|
| Phase 0 — Teardown of legacy quotations module | not started |
| Phase 1 — Shared infrastructure (8 parallel tasks) | not started |
| Phase 2 — Quotation module | blocked on Phase 1 |
| Phase 3 — Policy Admin read views | blocked on Phase 1 |
| Phase 4 — Issuance module | blocked on Phase 3 detail routes |
| Phase 5 — Cross-cutting polish | blocked on 2/3/4 |

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
