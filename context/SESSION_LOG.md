# Session Log — Group PAS V1 Frontend

This file is the running record of plans, decisions, and actions for the Group PAS V1 frontend build.
Update it before stopping work so any AI tool (or human) can pick up where we left off.

## How to use this log

- Before starting any non-trivial task, append a dated entry stating what you are about to do.
- After completing it, edit the entry with results, tests run, files touched, and next steps.
- If a task spans multiple sessions, add a continuation note rather than overwriting.
- When status of a phase or proposal changes, update [context/HANDOFF.md](HANDOFF.md) Active Workstreams in the same commit.

---

## Context

**Repo:** keystone-ui
**Branch:** check `git branch --show-current`. Recent V1 plan work was on `feat/group-pas-v1-plan`; new build branch may have been cut by user.
**Product:** Group PAS — Quotation, Issuance (Proposal + PolicyMember + Census), Policy Admin (Client/Policy/Member). UI-only maker-checker overlay for V1 demo.
**Backend specs:** [docs/spec/](../docs/spec/) (DSL, canon).
**Backend blueprint:** [docs/planning/team_nb_blueprint_v3.md](../docs/planning/team_nb_blueprint_v3.md).
**OpenAPI snapshot (stale):** [docs/planning/openapi.json](../docs/planning/openapi.json) — useful for shape cross-check; trust DSL on conflict.
**V1 implementation plan:** [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md)
**Reference precedence + interim assumptions:** [context/CORE_MEMORY.md](CORE_MEMORY.md#reference-doc-precedence-group-pas-v1).

---

## Actions taken

### 2026-05-06 — Plan locked, process scaffolding transferred

- Backend specs and blueprint reviewed; plan written at [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md) with per-task context, outputs, and acceptance criteria.
- Architecture decision: stay on existing keystone-ui schema-driven arch for V1; defer the PDF spec's `frontendProjection` pattern. State-aware actions handled via per-schema `stateActions` map + new `ActionBar` widget.
- Process scaffolding transferred from `feature/2026-05-02-auth-module-2`:
  - `.claude/skills/` — full skill set copied as-is.
  - `proposals/TEMPLATE.md` and `proposals/README.md` copied; auth-specific PROP-NNNN files intentionally left out.
  - Fresh `context/HANDOFF.md`, `context/SESSION_LOG.md` (this file), `context/CORE_MEMORY.md`, `context/ARCH_TRANSITION.md` — process preserved, contents reset for group-pas V1.
- Next: kickoff Phase 0 (teardown of legacy quotations module).

### 2026-05-07 — Plan verification + maker-checker overlay added

User added authoritative reference docs into the repo (`docs/planning/openapi.json`, `docs/planning/team_nb_blueprint_v3.md`, `docs/planning/SAMPLE-WORKFLOW.md`, `docs/planning/GTL Quotation Module (3).md`) and copied DSL specs to `docs/spec/`. Also confirmed maker-checker is needed in V1 demo via UI-only role switcher.

**Backend Q&A absorbed:**
- `docs/spec/` (DSL) is canon. All DSL values for enums, structs, API contracts are stable.
- Issuance entity is `PolicyMember` (not `ProposalMember` as OpenAPI suggested) — OpenAPI snapshot is stale on this point.
- PAM cross-ref is `policyMemberId` (final, not `proposalMemberId`).
- PAM API delta absorbed: `GET /api/policy-admin/members/by-proposal-member/{...}` → `GET /api/policy-admin/members/by-policy-member/{policyMemberId}`. `MemberDto` adds `pendingReason?`, `voidReason?`, `cancellationReason?`. `MemberSummaryDto` adds `pendingReason?`.

**Reference-doc precedence locked** (now in `context/CORE_MEMORY.md`): DSL → blueprint v3 → GTL Quotation Module (3).md → OpenAPI (stale) → SAMPLE-WORKFLOW.md (future).

**V1 interim assumptions logged** (8 entries in `context/ARCH_TRANSITION.md` + scope-locks summary in `context/CORE_MEMORY.md`):
1. Async signalling = 5s polling
2. Quote → Proposal handoff = auto-create on finalize
3. send-for-issuance → PAM Member visibility = async, poll
4. Error response shape = Spring-style `{ message, errors? }`
5. Member-to-Plan DMN = opaque file ref
6. GCL endpoints = stub
7. Auth = open API in V1
8. File upload = mock-first via Next.js routes

**Maker-checker UI overlay** (new ARCH_TRANSITION entry): role switcher widget (Maker / Checker / Ops / Viewer), `roleActions` map alongside `stateActions` on schemas, `awaitingApproval: true` UI-overlay state on Quote/Proposal. Checker's "Approve" calls real backend `submit`. Backend stays unchanged.

**Plan structure changes:**
- Phase 0 deletion list extended to include auth-branch zombie forms (`add-member-form`, `bulk-upload-form` etc.) bundled in `schemas/forms/index.ts` whose widgets aren't on this branch.
- Phase 1 gains **Task 1.9 — Role switcher + role-aware action gating**.
- Tasks 1.1, 1.5, 1.8 updated for `cancellationReason`, summary `pendingReason`, CANCELLED state.
- Tasks 3.3, 3.4, 5.1 updated for `by-policy-member` endpoint rename + reason badges in member lists.
- Task 4.4 explicitly drops the auth-branch 5-step add-member wizard; uses single-step `form-container` with the 8 V1 fields.
- All quote/proposal/member tasks gained `roleActions` gating notes.
- Conventions section restructured: precedence ranking, frontend conventions, coding conventions.

**Files touched:** `docs/group-pas-v1-plan.md` (full rewrite), `context/HANDOFF.md` (drop Local environment section, list canonical docs with precedence), `context/CORE_MEMORY.md` (add precedence rule + V1 assumptions + maker-checker scope lock), `context/ARCH_TRANSITION.md` (added 7 new interim contracts; total 9 entries now), this log.

**Next:** kickoff Phase 0 teardown.

### 2026-05-07 (continued) — Architecture audit + small engine extension

Audited current widget engine vs V1 plan needs. Verdict: existing arch supports the plan with two real gaps (small wrappers) and two verbosity-tax patterns (workable today, future widget-engine cleanups noted).

**Real gaps resolved:**

1. **Polling with stop-condition.** Extended `useSmartQuery` to take `stopWhen: VisibilityCondition` and `maxPollMs?` on `DataSourceConfig`. Implementation uses TanStack's function-form `refetchInterval` — returns `false` when `stopWhen` evaluates truthy against latest data, otherwise returns `refreshInterval`. ~10 LOC added; `npx tsc --noEmit` clean.
   - Files: `src/hooks/useSmartQuery.ts`, `src/types/widget.ts`.
   - Used by Pricing tab (Task 2.4.5) — schema declares poll cadence + stop predicate; component owns hard timeout.

2. **Composite cells deferred.** V1 renders `state` and `pendingReason` as two separate columns instead of building a `composite` cell type. ~20 LOC saved for now; documented as a future widget-engine cleanup.

**Verbosity-tax patterns documented in `docs/STATE_MANAGEMENT_GUIDE.md` (new §8):**

- §8.1 Polling until an async backend computation completes (uses the new `stopWhen`).
- §8.2 State-driven detail page (sibling widgets gated by entity state via `useWidgetState` + `visibleWhen`).
- §8.3 Form fields disabled by parent entity state or current role (dual sibling widgets — editable form vs read-only key-value-grid).
- §8.4 Role context as a global state key (`global:current-role`) so role gating uses the same `stateDependencies` plumbing as state gating.

**ARCH_TRANSITION.md additions:**
- Updated "Async transition signalling" entry to reflect the new `stopWhen` capability.
- Added "State-conditional siblings via `useWidgetState`" — interim verbose pattern, future `state-conditional-section` widget.
- Added "Form-level disable via dual sibling widgets" — interim dual-render pattern, future `disabledWhen` on `FieldConfig`.
- Added "Composite cells deferred — two-column rendering for V1" — interim two-column approach, future `composite` cell type.

**Plan updates:**
- Conventions section now references `STATE_MANAGEMENT_GUIDE.md §8` so all detail-page tasks follow the canonical patterns.
- Task 2.4.5 (Pricing tab) explicitly uses `dataSource.stopWhen` per §8.1.
- Task 3.3 (Policy detail → Members tab) explicitly uses two columns for state + reason.
- New "Future widget-engine cleanups" section in plan listing the 4 deferred items so they don't get lost.

**Files touched:** `src/hooks/useSmartQuery.ts`, `src/types/widget.ts`, `docs/STATE_MANAGEMENT_GUIDE.md`, `docs/group-pas-v1-plan.md`, `context/ARCH_TRANSITION.md`, this log.

**Next:** Phase 0 teardown.

### 2026-05-07 (continued) — Three more backend clarifications absorbed

Backend confirmed:

1. **Polling cadence:** 2s for first 10s, then back off to 5s up to ~60s. Use this for any GET endpoint after triggering an async action.
2. **Error response shape:** Spring default `{ timestamp, status, error, message, path }` for V1. No field-level error array yet. Backend will add a `{ code, message, fieldErrors: [{ field, code, message }] }` envelope on request — small lift, but only when frontend forms actually need it.
3. **Pending breakdown:** no dedicated endpoint in V1. Derive client-side by grouping `MemberSummaryDto.pendingReason` from the members list response. Server-side aggregate added later if it becomes hot.

**Engine work:**
- Extended `useSmartQuery` to support `pollSchedule: { initialIntervalMs, initialDurationMs, fallbackIntervalMs, maxDurationMs? }` for backoff polling. Falls back to fixed `refreshInterval` when no schedule is given. `stopWhen` halts either kind early. Implementation uses `useRef` to track polling-cycle start time.
- Added `src/lib/polling.ts` exporting `STANDARD_POLL_SCHEDULE = { 2s for 10s → 5s up to 60s }`. All polling consumers reference this constant rather than hardcoding intervals; one tuning point for cadence.
- Typecheck clean.

**Plan + docs updates:**
- Task 1.2 (API clients): error mapper notes Spring default shape, no field-level errors, envelope-upgrade trigger documented.
- Task 2.4.5 (Pricing tab): replaced fixed 5s with `STANDARD_POLL_SCHEDULE`; "still working…" banner appears once initial-cadence phase ends (≥10s).
- Task 3.3 (Policy detail): pending breakdown card derives client-side; no `GetPolicyPendingBreakdownQuery` endpoint; shared dataSource between card and members tab via `useWidgetState` or a `useMemberPendingBreakdown` selector hook.
- `STATE_MANAGEMENT_GUIDE.md §8.1`: schema example switched to `pollSchedule` + the constant; explanation of fast/slow phases.
- `ARCH_TRANSITION.md`:
  - "Async transition signalling" updated for backoff cadence + new risks.
  - "Error response shape" rewritten to match Spring default + envelope-upgrade convergence trigger.
  - New entry "Pending-breakdown derived client-side" with risks (paginated list drift) and convergence trigger.
- `CORE_MEMORY.md` V1 assumption list updated: now 9 items (added pending-breakdown), polling cadence + error shape revised.

**Files touched:** `src/hooks/useSmartQuery.ts`, `src/types/widget.ts`, `src/lib/polling.ts` (new), `docs/STATE_MANAGEMENT_GUIDE.md`, `docs/group-pas-v1-plan.md`, `context/ARCH_TRANSITION.md`, `context/CORE_MEMORY.md`, this log.

**Process answer to user's `/build-feature` question:** the skill takes proposal id, free-form ask, **or path to a design doc**. Plan tasks have Context/Output/Done structured like a design doc, so `/build-feature Task 0.1 per docs/group-pas-v1-plan.md` works. Proposals are only needed for out-of-plan changes.

**Next:** Phase 0 teardown.

### 2026-05-07 (continued) — V1 demo execution strategy locked, cuts captured

User flagged: the full plan is too big to iterate task-by-task with `/build-feature` against the Friday demo deadline. Strategy locked:

**3 batches, mostly direct execution (no `/build-feature` overhead) for mechanical work:**

- Batch 1 — Foundation (Phase 0 + Phase 1 demo subset: Tasks 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9; skip 1.6 + 1.7).
- Batch 2 — Quote happy path (Tasks 2.1, 2.2, 2.3, 2.4.1 editable + 2.4.2/3/4 **read-only** + 2.4.5 with poll + 2.4.6 placeholder).
- Batch 3 — Issuance + PAM + demo glue (Tasks 3.1 light + 3.2 + 3.3 + 3.4 + 4.1 + 4.2 + 4.3 + 4.4 single-member-only + 5.1 + 5.3 walkthrough).

`/build-feature` reserved for the two genuinely ambiguous design points: action-bar maker-checker overlay (Batch 2) and state-driven PolicyMember detail (Batch 3). Everything else executes directly against the plan as design doc.

**Deferred-from-V1-demo backlog (D1–D12)** captured in [docs/group-pas-v1-plan.md → V1 demo — execution strategy + deferred work](../docs/group-pas-v1-plan.md#v1-demo--execution-strategy--deferred-work):

- D1 Plans CRUD, D2 Census authoring, D3 DMN replace flow, D4 Bulk census flow, D5 Operational queue index, D6 Tests, D7 PresignedUploader, D8 useEnum, D9 Clients detail, D10 UW review queue surface, D11 Terminal-state polish, D12 Saved-view chip variants.

**Demo-time-only shortcuts** (correctness-debt to clean up immediately post-demo):
- Mock route accepts any POST as successful upload (no PresignedUploader).
- Inline-hardcoded enum options instead of `useEnum`.
- Forms render top-level message only (no field-level errors); request envelope upgrade from backend if pain surfaces.

HANDOFF Active Workstreams updated to show the 3-batch view + pointer to the strategy section. Future AI/human picking up work reads that section before any task.

**Files touched:** `docs/group-pas-v1-plan.md`, `context/HANDOFF.md`, this log.

**Next:** kick off Batch 1 — Phase 0 teardown.

### 2026-05-07 (continued) — Batch 1 in progress

Starting **Batch 1 — Foundation**. Order:

1. Task 0.1 — Teardown legacy quotations + auth-branch zombie forms.
2. Task 0.2 — Nav config update (3 modules + GCL placeholder).
3. Task 1.1 — TypeScript domain types.
4. Task 1.5 — Mock fixtures.
5. Task 1.4 — Mock API route handlers (catch-all per module).
6. Task 1.2 — API clients.
7. Task 1.9 — Role switcher (must land before ActionBar consumes it).
8. Task 1.3 — ActionBar widget.
9. Task 1.8 — StateBadge + ReasonBanner widgets.

Tasks 1.6 (PresignedUploader) and 1.7 (useEnum) explicitly skipped per V1 demo strategy — replaced with mock-accept-anything + inline enum constants.

In progress.

#### Task 0.1 — Teardown legacy quotations + auth-branch zombies — DONE

Bulk delete (90 files, ~24,500 LoC removed):

- Routes: `src/app/quotations/`, `src/app/api/quotations/` (catch-all + 7 sub-routes).
- Page schemas: `schemas/quotations.json`, `schemas/quotations-detail.json`.
- Tab schemas (all only referenced by the deleted detail): `plans`, `plan-products`, `plan-product-credit-life`, `plan-product-health`, `plan-product-investment`, `plan-product-term-life`, `plan-product-benefits`, `plan-product-benefits-health`, `benefit-investment`, `policy-profile`, `policy-exclusion`, `common-header`, `premium-method-05/06/07/08`, `headcount`, `subsidiaries`, `members`, `documents`, `qtn-detail-help-sheet`.
- Forms (33 deleted): per the plan list + the orphan `plan-product-*`, `premium-method-*`, `benefit-investment`, `add-product`, `policy-configuration`, `policy-details` forms (none referenced elsewhere). Auth-branch zombies (`add-member-form`, `bulk-upload-form`) removed from the bundled `schemas/forms/index.ts`. Survivors: 7 accounting/payout forms.
- Tests: `QuotationListTable.test.tsx`, `CreateQuotationForm.test.tsx`, `FilterBar.unit.test.tsx` (the FilterBar test sourced its config from `quotations.json` so deleted alongside).
- Mocks: `src/mocks/original/seeds/` (entire dir — orphan after `quotation-mock.ts` removed), `quotations-list-page-config-mock.ts`, `quotations-detail-page-config-mock.ts`, `tab-config-mock.ts`, `table-config-mock.ts`, `form-config-mock.ts`, `data/quotation-mock.ts`, `data/index.ts`, `data/` (empty dir removed implicitly).
- Updated registries: `schemas/forms/index.ts` (removed deleted entries + zombies), `src/mocks/original/page-config-mock.ts` (no quotation re-exports), `src/mocks/original/group-insurance/page-config-service.ts` (no quotation registry entries), `src/mocks/original/group-insurance/config/index.ts` (no quotation/tab/form/table-config-mock exports).
- Dashboard schema (`schemas/dashboard.json`) + `dashboard-page-config-mock.ts` cards repurposed: legacy "Group Quotation" / "Group New Business" cards → "Quotation" / "Issuance" / "Policy Admin" cards pointing at the new module routes; legacy `metric-pending-quotations` renamed to `metric-pending-quotes`; `new-quotation-action` → `new-quote-action` navigating to `/quotation`.
- `src/app/page.tsx` legacy "Quotations List" card removed.

#### Task 0.2 — Nav config update — DONE (folded into 0.1)

`src/mocks/original/group-insurance/config/app-config-mock.ts`: legacy "Group Quotation" multi-link nav entry replaced with three new top-level items — **Quotation** (`/quotation`, with disabled "Member Quotes (GCL) — coming soon" sub-item), **Issuance** (`/issuance/proposals`), **Policy Admin** (`/policy-admin/clients` and `/policy-admin/policies` sub-items). Lucide icons: FileText, ShieldCheck, Building2.

**Verify:**
- `npx tsc --noEmit` clean (modulo stale `.next/` cache from a previous branch).
- `npm run build` succeeds.
- Test failures: 2 files (`DataTable.unit`, `FormContainer.unit`) — confirmed pre-existing on the prior commit via stash dance; not introduced by this batch. Filed as part of pre-existing tech debt; will revisit in Batch 3 polish.

**Next:** Phase 1 — types, mocks, API clients, widgets.
