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

### archV1 Layer 1 Runtime — Build prep (plan ready, code not started)

The declarative runtime described in [docs/archV1/00..13](../docs/archV1/) has been converted into an executable, multi-agent build plan. **Schema delivery / materialization is deferred (Layer 3); schemas keep being served from `/schemas/` via `src/lib/schemaResolver.ts` as today.**

- **Plan:** [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md](../docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md) — 11 tracks, dependency graph at [14:99](../docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md#L99), file-ownership table at [14:118](../docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md#L118).
- **Per-track briefings (AI-agent-ready):** [docs/archV1/tracks/](../docs/archV1/tracks/) — one file per track with exact TS signatures, worked examples, allowed deps, and DoD with concrete test commands. Spec refs cite `file:line`.
- **Agent handoff wrapper:** [docs/archV1/tracks/AGENT-KICKOFF-TEMPLATE.md](../docs/archV1/tracks/AGENT-KICKOFF-TEMPLATE.md).

**Status:** plan committed and pushed (`6e91be8` on `feat/new-buisiness`). No `src/lib/runtime/` code yet. Layer 2 (schema port) gated on Track 10b passing. This stream runs in parallel with the Group PAS V1 demo stream below.

**Pickup order:** Track 0 (workspace scaffold) → Track 1 (types + version validator) → Track 2 (graph). Tracks 3–9 fan out from there per the graph.

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
| Form success transitions (2026-05-11) | **DONE** — schema-driven forms had no post-success hook, so create-modals didn't close and the add-member page didn't navigate back. New schema field: `onSuccess?: ActionConfig[]` on `api-mutation`; `useActionHandler` dispatches the array sequentially after toast + query invalidation. Applied to all 27 `schemas/forms/*-form.json` files. Commit `37adbad`. See SESSION_LOG 2026-05-11 entry. |
| Audit pass (2026-05-11 continued) | **DONE** — 14-item P1/P2/P3 punch list across action-bar gating, detail structure, mock honesty, empty/loading/error states, design-token drift. 5 commits (`acb89c6` chore typecheck → `b6f0396` semantic warning/success tokens + gap helper → `a26feac` **maker-checker overlay restored** as transitional scaffolding (reverses 2026-05-07 removal for the Quote/Proposal flow) + fetch-error surfacing + quote-schema cleanup → `138d225` pricing-tab `stateField` + policy-member `archive` for Checker → `63c4b08` empty-state on member tabs + shared `DetailPageSkeleton`). Pre-commit hook deferred (lint debt). See SESSION_LOG 2026-05-11 "Audit pass" entry. |
| AWS deploy migration (2026-05-11 → 2026-05-12) | **DONE** — Cloudflare bundle 8.4 MB exceeded free-tier 3 MiB. Cherry-picked PR #28 (Docker + Helm + ECR push), wired `GROUP_PAS_BACKEND_URL` through the chart, swapped one `process.env.NEXT_PUBLIC_BASE_URL` consumer for `headers()`, then layered DevOps's "self-managed CD" pattern on top — `values-dev.yaml` + `deploy-dev` job in `.github/workflows/ci-cd.yml` that helm-upgrades into K3s via `K3S_KUBECONFIG` secret. **Live at https://keystone-ui-dev.anairacloud.com**, auto-deploys on every push to `feat/new-buisiness`. Cloudflare files kept as fallback. Commits `6bf8e62`, `91348df`, `acba003`. See SESSION_LOG 2026-05-11 → 2026-05-12 entry and [docs/planning/keystone-ui-deployment-guide.md](../docs/planning/keystone-ui-deployment-guide.md). |
| Two-panel navigation (2026-05-12) | **DONE on dev; PR #58 open against `main`** — replaced single nested `AppSidebar` with a VSCode-style icon rail + submenu panel (`src/components/navigation/`). Migrated both mocked portals (group-insurance, auto-claims) to spec-aligned rails (Home / Quotation / Issuance / Policy Admin / Accounting for group-insurance, per [docs/group-pas-v1-plan.md:119](../docs/group-pas-v1-plan.md)). Commit 1 (`4de1efd`, feat) shipped and live-verified on dev; Commit 2 (`7d8a913`, chore) deleted `AppSidebar.tsx` and collapsed the `SideBarType` enum (only `DUAL_PANEL` remained, so the field was dropped from `AppConfig.navigation` entirely). New commit-hygiene rule landed alongside (`92dd2b6`) — see CORE_MEMORY.md. **For main:** PR [#58](https://github.com/Anaira-AI/keystone-ui/pull/58) on `feat/two-panel-nav` carries a single-commit (`025e719`) manually rebuilt against `main` after `git cherry-pick` failed on entangled unrelated changes (RoleProvider/Toaster). 404 caveat documented in the PR — spec-aligned rail points at not-yet-built `/quotation`, `/issuance/proposals`, `/policy-admin/*` routes; per V1 plan Task 0.2 this is accepted (IA lands first). **Open design Q deferred:** whether module-detail tabs (Quotation/Proposal/Members) move into the submenu under uppercase group labels — answered in a follow-up session. |
| Schema-engine extraction (2026-05-12) | **PR #57 open against `main` w/ first review feedback addressed** — `extract/schema-engine` branch off `origin/main`; 13 commits, +1591 / −85 across 55 files carrying the schema-runtime + widget-engine slice of `feat/new-buisiness` (poll/stop, `onSuccess[]`, dataSource on selects, KeyValueGrid nested accessors + list/count/presence cells, native toast, semantic warning/success tokens, gap-tokens helper, `ActionBar`, `StateBadge`, `ReasonBanner`, `RoleSwitcher`, `state-badge` cell). Layer 3 refactors decouple from Group PAS: Role type relocated `@/types/group-pas/roles` → `@/types/role` with new `ROLES` const; `state-map.ts` ships as an empty-default registry (`registerStateMap` / `registerReasonMap` / `registerReasonGroupResolver`) with Group PAS data file staying on feat branch. Negative leakage check passes — no `src/lib/api-mock/`, `src/mocks/group-pas/`, `src/types/group-pas/`, or `src/lib/maker-checker.ts` on the branch. Review feedback addressed in `d969827`: dropped `useActionHandler` rethrow (was leaking unhandled promise rejections at every caller); replaced in-place `nestedParseAt` mutation in KeyValueGrid with `immutableSet()`; added defensive try/catch + `liveEntity ?? fetchedEntity` to ActionBar; `state-map.__resetRegistriesForTests()`; `ROLES`-driven `readStoredRole`; renamed `RoleContext` interface → `RoleClaimPayload`; `gapClass()` returns undefined + dev warn on unmapped values; `useSmartQuery` resets `pollStartRef` via useEffect on queryKey-input change; `RoleProvider` write-throughs to `useWidgetState` under `global:current-role` (matching STATE_MANAGEMENT_GUIDE.md §8.4). **PR URL:** https://github.com/Anaira-AI/keystone-ui/pull/57. **Merge-back impact:** documented in PR body — Layer 1 commits auto-skip via patch-id; Layer 2/Layer 3 refactors need feat branch to repoint Role import + ship `state-map.group-pas.ts` data file. |

**Deferred-from-demo backlog (D1–D12)** lives in the same plan section. After demo lands, work that backlog before starting any new feature.

### Group PAS — API-coverage backlog (2026-05-13)

Audit (2026-05-13) compared the keystone-ui surface against the OpenAPI spec at `https://group-pas-dev.anairacloud.com/v3/api-docs`. Three gaps approved as proposals; accounting suite (~30 endpoints) excluded by user.

| Proposal | Status | Endpoints | Note |
|----------|--------|-----------|------|
| [PROP-0001](../proposals/PROP-0001-census-submission-ui.md) — Census Submission UI | approved | `census-submission-api` (6) | Equivalent to V1 plan Task 4.5 / D4; pick up via `/build-feature PROP-0001`. Update [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md) D4 to point here. |
| [PROP-0002](../proposals/PROP-0002-member-quote-gcl-ui.md) — Member-Quote (GCL/W4) UI | approved | `member-quote-api` (6) | New API-driven-scope rule (CORE_MEMORY.md 2026-05-13) lifted the prior GCL out-of-V1 lock. Replaces `member-quotes-placeholder` tab. |
| [PROP-0003](../proposals/PROP-0003-post-issuance-add-member-ui.md) — Post-issuance AddMember UI | approved | `addMember` on `/policies/{id}/members` (1) | Endpoint is `Public` per blueprint §4; UI adds "Add member" action on Policy detail with PENDING→ACTIVE polling. |

### Group PAS — Role-workbench + portal split backlog (2026-05-13)

Plan at `/Users/seriousblack/.claude/plans/read-docs-planning-demo-narrative-gtl-gc-cosmic-dove.md` (approved). Driven by [docs/planning/DEMO_NARRATIVE_GTL_GCL.md](../docs/planning/DEMO_NARRATIVE_GTL_GCL.md) — 6 demo personas, current portal serves only Sales + Partner Agent; MPH / Member / UW / Ops get their own portals.

| Proposal | Status | Build order | Notes |
|----------|--------|-------------|-------|
| [PROP-0009](../proposals/PROP-0009-role-workbench-inbox.md) — Role-workbench + Dashboard Inbox in `group-insurance` portal | draft | 1st (build now) | Sweeps role enum to 6 narrative personas, adds `visibleRoles` to `WidgetRenderer`, makes `/api/config/app` role-aware. Introduces the primitives the other 4 portals reuse. |
| [PROP-0010](../proposals/PROP-0010-mph-portal.md) — MPH portal | draft, deferred | 2nd | New `appId: mph`. **Backend confirmed:** accept is at Quote level (`POST /quotes/{id}/accept`), not Proposal. Demo narrative wording adjustment noted in the proposal. |
| [PROP-0011](../proposals/PROP-0011-member-portal.md) — Member portal (MAF landing + OTP) | draft, deferred | 3rd | New `appId: member`. Backend ready (`confirm-maf` endpoint exists). |
| [PROP-0012](../proposals/PROP-0012-uw-portal.md) — UW workbench portal | draft, deferred | 4th | Backend ready (`/uw/approve`, `/uw/reject` exist). Needs product input on UW member-detail layout. |
| [PROP-0013](../proposals/PROP-0013-ops-portal.md) — Ops repair portal | draft, deferred | 5th | **Backend confirmed:** two-step `PUT /policy-members/{id}` + `POST .../send-for-issuance`. Domain `completeMemberRepair` exists but is not exposed via API — flag if two-step UX bites. |

All three open API-team questions were resolved by direct investigation of `group-pas` backend source (2026-05-13). See SESSION_LOG 2026-05-13 entry for the per-question file:line evidence. No outbound questions remain; all four deferred portals are unblocked from a backend-contract perspective.

### Open items at this thread close (2026-05-07)

Read [context/SESSION_LOG.md](SESSION_LOG.md) "End-of-thread handoff snapshot" entry first — full state lives there. Quick index of what's outstanding:

1. **Two questions drafted to send to backend** (full text in SESSION_LOG):
   - Quote-level maker-checker — apply existing PAM approval pattern (decision: backend OWNS this; UI overlay is transitional scaffolding only).
   - File upload status — all four `/files/upload-url` + `/files/download-url` endpoints non-functional; needs S3 wiring.
2. ~~Cloudflare deploy failed — bundle 8.4 MB, free tier 3 MiB.~~ **Resolved 2026-05-12 by migrating to AWS K3s.** Site live at https://keystone-ui-dev.anairacloud.com; auto-deploys via `.github/workflows/ci-cd.yml`. Cloudflare files kept on-branch as fallback — cleanup is a separate decision.
3. **Demo walkthrough Task 5.3** still gated on user attendance.
4. **Pass-2 V1_DEMO_ISSUES** still has open items: P2.1 (confirm-with-input dialog), P2.5 ("still working" banner on Pricing tab), P2.6 (filter-bar reset on chip clear).
5. **Optional polish:** `useClientNames()` resolver for proxy-mode list pages (~2h).

### Demo posture at thread close

- **Live URL (auto-deployed):** https://keystone-ui-dev.anairacloud.com — runs in **proxy mode** against `https://group-pas-dev.anairacloud.com`. Every push to `feat/new-buisiness` updates it within ~4 minutes (build → push to ECR → `helm upgrade` into K3s namespace `dev-env` → smoke test). See [docs/planning/keystone-ui-deployment-guide.md](../docs/planning/keystone-ui-deployment-guide.md) for the cluster details + rollback recipe.
- **Mock mode** (default — `.env.local` not set, **`npm run dev` locally**): rich fixture data, full happy path works through the real action set. Pricing tab still honest (button disabled with tooltip — backend Rule Engine not wired); Q→P handoff is sync. **Maker-checker overlay is back (2026-05-11)** as transitional scaffolding — `awaitingApproval:true` seeded on QTE-2026-0002 so the Maker → Checker demo path renders the locked state. **Recommended for the demo if running locally.**
- **Proxy mode** (`GROUP_PAS_BACKEND_URL=https://group-pas-dev.anairacloud.com` in `.env.local`, OR the deployed URL above): real backend wiring proven. Same honesty surface — disabled-with-tooltip explains everything backend can't do yet. The maker-checker overlay POST/DELETE routes are in `MOCK_ONLY_PATTERNS` so they work in proxy mode, but proxied GETs don't enrich `awaitingApproval` back — the overlay only fully composes in mock mode.
- Switch local modes by editing `.env.local` (1 line, restart `npm run dev`).
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
