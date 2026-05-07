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
| Batch 1 — Foundation (Phase 0 + Phase 1 demo subset) | **DONE** — Phase 0 + Tasks 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9 (skipped 1.6 + 1.7 per V1 demo cuts D7/D8) |
| Batch 2 — Quote happy path (Phase 2 demo subset) | **DONE** — Tasks 2.1, 2.2, 2.3, 2.4.1–2.4.6 (Plans/Census/Mapping read-only per cuts D1/D2/D3; Pricing live with backoff poll; demo end-to-end walkthrough deferred to next session w/ user) |
| Batch 3 — Issuance + PAM + glue (Phase 3, 4, 5 demo subsets) | **DONE** — Tasks 3.1 (light) + 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1; demo walkthrough (5.3) deferred to a session w/ user. Skipped per cuts: 4.5, 5.2, 5.4. |
| Post-batch follow-ups (2026-05-07) | **DONE** — pre-demo audit pass (P1.1–P1.9 + P2.2); GCL frontends; backend deployed, proxy mode wired; error envelope updated; FLOAT_UNAVAILABLE fixture removed. See SESSION_LOG.md. |
| Honesty pass (2026-05-07 late) | **DONE** — removed mock simulators for backend-missing behavior: pricing simulator, maker-checker `awaitingApproval` overlay (incl. `lib/maker-checker.ts`, `/awaiting-approval` mock routes, MOCK_ONLY_PATTERNS carve-out, `awaiting-approval` cell type). Q→P handoff converted from async-in-mock to sync (matches backend). New schema field: `disabledTooltip` on `ActionConfig`. ActionBar tests rewritten. |

**Deferred-from-demo backlog (D1–D12)** lives in the same plan section. After demo lands, work that backlog before starting any new feature.

### Open items at this thread close (2026-05-07)

Read [context/SESSION_LOG.md](SESSION_LOG.md) "End-of-thread handoff snapshot" entry first — full state lives there. Quick index of what's outstanding:

1. **Two questions drafted to send to backend** (full text in SESSION_LOG):
   - Quote-level maker-checker — apply existing PAM approval pattern (decision: backend OWNS this; UI overlay is transitional scaffolding only).
   - File upload status — all four `/files/upload-url` + `/files/download-url` endpoints non-functional; needs S3 wiring.
2. **Cloudflare deploy** failed — bundle 8.4 MB, free tier 3 MiB. Three options offered to user (pay $5/mo, prune `pdfmake`+`xlsx`, aggressive purge). Awaiting user decision.
3. **Demo walkthrough Task 5.3** still gated on user attendance.
4. **Pass-2 V1_DEMO_ISSUES** still has open items: P2.1 (confirm-with-input dialog), P2.5 ("still working" banner on Pricing tab), P2.6 (filter-bar reset on chip clear).
5. **Optional polish:** `useClientNames()` resolver for proxy-mode list pages (~2h).

### Demo posture at thread close

- **Mock mode** (default — `.env.local` not set): rich fixture data, full happy path works through the real action set. Pricing tab is honest (button rendered disabled with tooltip — backend Rule Engine not wired); approval-lock fiction is gone; Q→P handoff is sync. **Recommended for the demo.**
- **Proxy mode** (`GROUP_PAS_BACKEND_URL=https://group-pas-dev.anairacloud.com` in `.env.local`): real backend wiring proven. Same honesty surface — disabled-with-tooltip explains everything backend can't do yet.
- Switch between modes by editing `.env.local` (1 line, restart `npm run dev`).
- **Seeding the dev backend with demo data:** `npm run seed:backend` runs [`scripts/seed-backend.ts`](../scripts/seed-backend.ts) — creates 6 clients, 9 fully-decorated DRAFT quotes, 5 PAM policies (one CANCELLED), and 20 PAM members against `https://group-pas-dev.anairacloud.com`. Quotes can't advance past DRAFT (backend has no premium-set REST endpoint); seed comments document the constraint inline. Idempotent across runs (timestamp-suffixed reg numbers / proposalIds), append-only (no delete endpoint exposed). Logs each request/response under `/tmp/keystone-seed/<run>/` for debugging.

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
