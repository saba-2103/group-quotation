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

---

### 2026-05-07 — Thread handoff

This conversation is closing because the context window is filling up. **Pick up in a new thread starting at Task 1.1.**

State at handoff:
- HEAD: `f5f97e8 feat(group-pas): Phase 0 teardown` on `feat/new-buisiness` (pushed).
- Phase 0 (Tasks 0.1, 0.2) — done.
- Batch 1 — Phase 1 — not started. Order to follow: 1.1 → 1.5 → 1.4 → 1.2 → 1.9 → 1.3 → 1.8. Tasks 1.6 (PresignedUploader) and 1.7 (useEnum) skipped for V1 demo per cuts D7, D8.
- `useSmartQuery` already extended with `pollSchedule` + `stopWhen`; `STANDARD_POLL_SCHEDULE` exported from `src/lib/polling.ts`. No further widget-engine work needed before Phase 1.
- Test failures pre-exist: `DataTable.unit`, `FormContainer.unit`. Will revisit in Batch 3 polish.

Resume entry point: read `context/HANDOFF.md` first. It links to CORE_MEMORY, this log, and the V1 plan with the demo execution strategy section.

### 2026-05-07 (continued) — Task 1.1 — TypeScript domain types — DONE

Picked up Batch 1 / Phase 1 in a fresh thread per the previous handoff.

Created `src/types/group-pas/{common,quotation,issuance,policy-admin,roles,index}.ts` from the DSL specs in `docs/spec/`. Source of truth is DSL (per CORE_MEMORY precedence).

Decisions baked in:
- `Money = { amount: number; currency: 'INR' | 'USD' }` per `CommonData.data`.
- DSL optional `?` → TS `?:`. `list<X>` → `X[]`. `date` → `ISODate` (string alias). `datetime` → `ISODateTime`.
- Domain entities use strict enum unions (e.g. `Quote.status: QuoteStatus`); wire DTOs keep loose `string` for the fields the DSL DTOs declare as `string`. Mappers in Task 1.2 will narrow at the API-client boundary.
- DTO `*Json` string fields (e.g. `plansJson`, `aggregateCensusJson`, `byPlanJson`) carry serialized payloads. Modelled as `string` here; Task 1.2 mappers will parse to typed `Plan[]` / `AggregateCensus` / etc.
- `ClassificationLane` aliased to DSL `UwLane = 'STP' | 'REPAIR' | 'REVIEW' | 'REJECT'` per Task 1.1 wording in the plan.
- PAM `MemberSummaryDto.pendingReason?: string` is optional per the latest backend additions noted in HANDOFF; PAM `MemberDto` carries `pendingReason / voidReason / cancellationReason` as required strings (DSL declares them non-optional but they'll be empty when the entity isn't in that state — same pattern as existing `archivedReason` etc.).
- Roles per scope-lock: `Role = 'maker' | 'checker' | 'ops' | 'viewer'`. `RoleContext` carries `currentRole` plus reserved `userId` / `displayName` slots so post-V1 auth can fill them without changing call sites.

**Files created:**
- `src/types/group-pas/common.ts` — Money, AmountFormula, Plan(+children), AggregateCensus, QuotePremium, MemberPremium, MemberData, file-flow DTOs.
- `src/types/group-pas/quotation.ts` — Quote, MemberQuote, all enums (QuoteStatus etc.), CensusFileFormat, QuoteDto/QuoteSummaryDto/QuotePlanDto/EstimatedPremiumDto/MemberQuoteDto.
- `src/types/group-pas/issuance.ts` — Proposal, PolicyMember, CensusSubmission(+Row), enums (ProposalState, PolicyMemberState, UwLane, CensusSubmission*), value objects (ClassifyMemberResult, UwDecisionResult, MemberRepairCorrections), all DTOs.
- `src/types/group-pas/policy-admin.ts` — Client, Policy, Member, ClientRegistrationData, MemberEnrollmentData, PolicyPlan*, all enums (PolicyState, MemberState, PolicyPendingReason, MemberPendingReason, MemberVoidReason, ClientState, CommunicationPreference, FloatReservationStatus), workflow signal payloads, all DTOs (incl. ReasonCount + PolicyPendingBreakdownDto).
- `src/types/group-pas/roles.ts` — Role, RoleContext.
- `src/types/group-pas/index.ts` — barrel re-export.

**Verify:**
- `npx tsc --noEmit` clean (exit 0). No callers yet, so this just guarantees the types compile in isolation; they'll get exercised by Tasks 1.2 (API clients) and 1.5 (fixtures).

**Next:** Task 1.5 — Mock fixtures (per the order locked at the previous handoff: 1.1 → 1.5 → 1.4 → 1.2 → 1.9 → 1.3 → 1.8). Skip 1.6 (PresignedUploader) and 1.7 (useEnum) per V1 demo cuts D7/D8.

### 2026-05-07 (continued) — Task 1.5 — Mock fixtures — DONE

Created `src/mocks/group-pas/` typed against the Task 1.1 interfaces. The legacy mock pattern at `src/mocks/original/group-insurance/data/` was deleted during Phase 0 (Task 0.1), so this batch establishes the new layout. Each fixture file exports typed arrays + a derived summary array; the `src/mocks/group-pas/index.ts` barrel re-exports them so Task 1.4 mock route handlers can pull from a single import.

UI-overlay state: `awaitingApproval` is added on the Quote fixtures as a non-DSL mock-only flag via `MockQuote = Quote & { awaitingApproval?: boolean }` — it is purely a UI-layer demo affordance for the role-switcher per CORE_MEMORY scope-locks.

Also fixed a Phase 0 stale stub: `src/mocks/original/group-insurance/index.ts` still re-exported `./data` (deleted in Task 0.1). Only `app/api/config/app/route.ts` imported the deeper file directly, so the broken barrel never tripped tsc — but it would have bitten the next caller. Removed the stale re-export.

**Coverage notes:**
- `quotes.ts` — 10 quotes covering all 8 `QuoteStatus` values; one (QTE-2026-0002) flagged `awaitingApproval: true` for the maker-checker demo. `QUOTE_SUMMARIES` derived from the long-form list so list endpoints stay in sync.
- `proposals.ts` — 5 proposals: POLICY_CREATED (with policyNumber), FINALIZED, SUBMITTED, DRAFT, CANCELLED. Plan + premium carried verbatim from the parent Quote (W2 step 1 contract).
- `policy-members.ts` — 20 PolicyMembers covering every DSL state: CREATED, PRICED, MAF_PENDING, MAF_CONFIRMED, CLASSIFYING, APPROVED, REPAIR_PENDING (with classification errors on PMB-0007 + PMB-0020), REFERRED_TO_UW, REJECTED, SENT_FOR_ISSUANCE, ADDED, ARCHIVED. Plan task wording said "REVIEW_PENDING" loosely — the canonical DSL state is REFERRED_TO_UW.
- `census.ts` — 2 submissions: CSB-0001 INGESTED with mixed-status rows (ACCEPTED / INGESTED / REJECTED); CSB-0002 COMPLETED with all rows accepted.
- `clients.ts` — 5 clients, all ACTIVE per ClientState MVP single state.
- `policies.ts` — 5 policies covering CREATED, PENDING (`AWAITING_MIN_MEMBERS` and `AWAITING_COMPLIANCE`), ACTIVE, CANCELLED.
- `members.ts` — 15 members:
  - PENDING samples covering every `MemberPendingReason` (PENDING_FLOAT_RESERVATION, PENDING_APPROVAL, PENDING_POLICY_ACTIVATION).
  - 4 ACTIVE samples (with `floatReservationId` set per MemberEnrollmentFlow).
  - VOID samples covering every `MemberVoidReason` (FLOAT_UNAVAILABLE, APPROVAL_REJECTED, POLICY_CANCELLED, WITHDRAWN_BY_PROPOSER).
  - 1 CANCELLED with a free-text `cancellationReason` (MEM-0013).
  - `MEMBER_SUMMARIES` carries `pendingReason` so the policy → members tab can render reason badges inline (Task 3.3 requirement).

**ID conventions:** quotes `QTE-YYYY-NNNN`, proposals `PRO-YYYY-NNNN`, policies `POL-YYYY-NNNN`, policy-members `PMB-NNNN`, members `MEM-NNNN`, clients `CLI-NNNN`, plans `PLAN-GTL-NNN`, census submissions `CSB-NNNN`. Cross-refs preserved (e.g. PRO-2026-0001 → QTE-2026-0006 → CLI-0005 → POL-2026-0001).

**Files created:** `src/mocks/group-pas/{quotation/quotes,issuance/proposals,issuance/policy-members,issuance/census,policy-admin/clients,policy-admin/policies,policy-admin/members,index}.ts`. **Files touched:** `src/mocks/original/group-insurance/index.ts` (removed dangling `./data` re-export).

**Verify:** `npx tsc --noEmit` clean (exit 0). Fixtures will be exercised by Task 1.4 mock routes next.

**Next:** Task 1.4 — Mock API route handlers (catch-all per module).

### 2026-05-07 (continued) — Task 1.4 — Mock API route handlers — IN PROGRESS

About to do: build catch-all `[[...path]]/route.ts` handlers for `/api/quotation`, `/api/issuance`, `/api/policy-admin`, backed by a shared in-memory mock layer cloned from the Task 1.5 fixtures. The accounting catch-all is a pure proxy — too thin for V1 since the backend isn't deployed — so this lays down a richer mock-first layer with a `GROUP_PAS_BACKEND_URL` proxy toggle for the day backend goes live (interim assumption #8 → "Auth = open API in V1").

Shared infra plan (`src/lib/api-mock/group-pas/`):
- `store.ts` — global mutable store cloned from fixtures. Hot-reload safe via `globalThis` so the dev server doesn't reset state on every save.
- `http.ts` — `matchPath`, `ok`, `json`, plus a `proxyIfConfigured` helper.
- `dtos.ts` — entity → DTO mappers (Quote → QuoteDto, Proposal → ProposalDto, Policy → PolicyDto, PolicyMember → PolicyMemberDto, Member → MemberDto, plus the *Json fields the DSL flattens).
- `simulator.ts` — `scheduleTransition` (setTimeout) for the state-transition delays so polling consumers (Pricing tab, send-for-issuance → PAM visibility) see realistic asynchrony. Default cadence aligned with `STANDARD_POLL_SCHEDULE` (delays in the 2–6s window so the first 2s poll catches the change).

State-transition coverage (demo-critical):
- Quote: requestPrice (DRAFT, sets `premium` after delay), submit (→ SUBMITTED), sendToClient (→ SENT_TO_CLIENT), accept (→ ACCEPTED), finalize (→ FINALIZED, then auto-creates Proposal).
- Proposal: submit (DRAFT → SUBMITTED), finalize (→ FINALIZED, then creates Policy + transitions to POLICY_CREATED).
- PolicyMember: priceMember (CREATED → PRICED), sendForIssuance (APPROVED → SENT_FOR_ISSUANCE, then creates PAM Member visibility after delay).
- Census: initiate (creates INITIATED), ingest (→ INGESTED), submit (→ SUBMITTED, then COMPLETED).

Unmatched mutation paths (e.g. updatePolicyDetail, addPlan, updateAggregateCensus, etc.) return 200 echo-success — the demo flows don't gate on them but the backend contract is satisfied. Unmatched GETs return 404 so missing paths surface loudly.

**Files created:**
- `src/lib/api-mock/group-pas/store.ts` — `globalThis`-backed mutable store + `nextId` + `scheduleTransition`.
- `src/lib/api-mock/group-pas/http.ts` — `matchPath`, `dispatch`, `json`, `ok`, `notFound`, `readJson`, `proxyIfConfigured`, `RouteEntry`.
- `src/lib/api-mock/group-pas/dtos.ts` — entity → DTO mappers for Quote, Proposal, PolicyMember, Census(+Row), Client, Policy, Member.
- `src/app/api/quotation/[[...path]]/route.ts` — Quotation catch-all (3 common, 5 quote list/search, 1 quote-by-id, 8 mutators, 8 state transitions). `finalize` schedules an auto-Proposal creation after 4s.
- `src/app/api/issuance/[[...path]]/route.ts` — Issuance catch-all. Proposal CRUD + state transitions. PolicyMember list/by-id/mutators. Census submission lifecycle. `finalize` proposal → auto-Policy creation; `send-for-issuance` PolicyMember → auto-PAM-Member creation (mirrors the W2/W3 cross-module hooks documented in the issuance domain).
- `src/app/api/policy-admin/[[...path]]/route.ts` — PAM catch-all. Client/Policy/Member CRUD + lookups. `pending-breakdown` derives reason tallies client-side per V1 interim assumption #5 (no dedicated backend endpoint).

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- Smoke-tested every category against the dev server already running on :3000:
  - `GET /api/quotation/quotes/list` → 200, payload shape correct (incl. `headcount` + `premiumAmount`).
  - `GET /api/quotation/quotes/QTE-2026-0002` → 200 (specific Quote).
  - `GET /api/quotation/quotes/by-status?status=SUBMITTED` → 200, filtered correctly.
  - `GET /api/quotation/enums/QuoteStatus` → 200, all 8 enum values.
  - `GET /api/issuance/proposals/list` → 200; `proposals/by-quote/QTE-2026-0006` → 200.
  - `GET /api/issuance/policies/POL-2026-0001/members` → 200, returns 20 PolicyMember summaries.
  - `GET /api/issuance/policies/POL-2026-0001/census-submissions` → 200; `census-submissions/CSB-0001/rows` → 200.
  - `GET /api/policy-admin/clients/list`, `clients/CLI-0001`, `policies/list`, `members/by-policy-member/PMB-0010` → all 200.
  - `GET /api/policy-admin/policies/POL-2026-0002/pending-breakdown` → derives `pendingByReason: [PENDING_FLOAT_RESERVATION:1, PENDING_APPROVAL:1, PENDING_POLICY_ACTIVATION:2]` from the live members store.
  - `GET /api/quotation/non-existent` → 404 (loud failure for missing GET paths).
  - `POST /api/quotation/quotes/.../whatever` → 200 (echo-success for unmatched mutations).
  - State-transition simulator: `POST /api/quotation/quotes/QTE-2026-0010/finalize` → 200, then 5s later `GET /api/issuance/proposals/by-quote/QTE-2026-0010` → 200 (auto-Proposal landed).

**Next:** Task 1.2 — API clients (typed wrappers around these endpoints, error-mapper for the Spring default error shape).

### 2026-05-07 (continued) — Task 1.2 — API clients — IN PROGRESS

About to do: typed client functions per endpoint in the three `.api` files, fronted by a thin `request()` wrapper with a bearer-token slot (`configureApiClient({ bearerToken })`) so swapping in real auth later is a config change. Error mapper handles the **Spring default envelope** `{ timestamp, status, error, message, path }` per the locked V1 interim assumption #4 (no field-level errors); on non-OK responses the wrapper throws an `ApiError` carrying the parsed envelope so React Query consumers can render `error.message` directly.

ARCH_TRANSITION's "Error response shape" entry already documents the envelope-upgrade trigger (added in the 2026-05-07 backend-clarifications batch), so no further doc update needed.

Layout:
- `src/lib/api/client.ts` — fetch wrapper, ApiError class, configure hook.
- `src/lib/api/error-mapper.ts` — `parseSpringError(res)`.
- `src/lib/api/quotation.ts` — one function per QuotationApi endpoint.
- `src/lib/api/issuance.ts` — one function per IssuanceApi endpoint (incl. CensusSubmissionAPI).
- `src/lib/api/policy-admin.ts` — one function per PolicyAdminApi endpoint, incl. the by-policy-member cross-ref.
- `src/lib/api/index.ts` — barrel.

Naming: function names mirror the DSL operation names (e.g. `createQuote`, `requestQuotePrice`, `findMembersByPolicy`). Path concatenation is inline; query params built via `URLSearchParams`. All paths are relative — Next.js routes proxy or mock per Task 1.4.

**Files created:**
- `src/lib/api/error-mapper.ts` — `SpringErrorEnvelope`, `ApiError` class (carries `status`, `spring` envelope, `path`), `parseSpringError(res)`.
- `src/lib/api/client.ts` — `configureApiClient`, `api.get/post/put/patch/del`, `QueryParams` (loose `Record<string, unknown>` so endpoint-specific param types compose without explicit index signatures), `buildUrl` with empty-skipping.
- `src/lib/api/quotation.ts` — 26 typed functions covering QuotationCommonAPI, QuoteAPI, MemberQuoteAPI.
- `src/lib/api/issuance.ts` — 24 typed functions covering ProposalAPI, PolicyMemberAPI, CensusSubmissionAPI.
- `src/lib/api/policy-admin.ts` — 22 typed functions covering ClientAPI, PolicyAdminCommonAPI, PolicyAPI, MemberAPI (incl. PAM cross-ref `findMemberByPolicyMember` per the 2026-05-07 backend Q&A) + the `getPolicyPendingBreakdown` derived endpoint.
- `src/lib/api/index.ts` — barrel re-exporting client/error-mapper plus the three module namespaces (`quotation`, `issuance`, `policyAdmin`).

**One small wrapper-ergonomics decision:** `Search*Params` interfaces had to become `type` aliases — TS interfaces don't satisfy `Record<string, unknown>` index signatures structurally even though their fields are compatible. Switching to `type` keeps call sites zero-cast. Documented in the file header comments so the next person doesn't "fix" it back.

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- Live server check: `GET /api/quotation/quotes/list` still returns 200 (Task 1.4 routes unaffected).
- Direct Node smoke skipped — clients call relative paths and require a bundler/TS loader to import. The wire layer was already covered by Task 1.4's smoke tests; the clients are 1:1 thin wrappers around those endpoints, so typecheck is sufficient confidence here.

**ARCH_TRANSITION** "Error response shape" entry already documents the `{ code, message, fieldErrors }` envelope-upgrade trigger — no further docs change needed for V1.

**Next:** Task 1.9 — Role switcher + role-aware action gating (must land before Task 1.3 ActionBar consumes it).

### 2026-05-07 (continued) — Task 1.9 — Role switcher + role-aware gating — IN PROGRESS

About to do: build the V1 demo's UI-only role context + switcher per ARCH_TRANSITION's "Maker-checker UI overlay" entry. Default role is `maker`; localStorage key `group-pas:current-role` so a refresh keeps the demoer's chosen role.

Layout decisions:
- `RoleProvider` mounts in `src/app/layout.tsx` between `Providers` and `AppContextProvider` so the switcher renders before app-config loads (cheap; no network).
- `RoleSwitcher` mounts at the top of `<main>` (right-aligned). Avoids restructuring the layout into a dedicated top-bar; keeps the existing `SidebarTrigger` slot intact.
- WidgetRegistry gets `"role-switcher"` so future schemas can also embed it inline.

Maker-checker UI-overlay state:
- `MockQuote.awaitingApproval` already exists on the fixtures (added in Task 1.5). Adding two UI-only mock routes — `POST /api/quotation/quotes/:quoteId/awaiting-approval` (set true) and `DELETE /api/quotation/quotes/:quoteId/awaiting-approval` (clear) — neither is in the DSL. They're explicitly tagged "UI-only" and will simply not exist when `GROUP_PAS_BACKEND_URL` is set (the proxy will 404 them). When the maker-checker overlay disappears post-V1 (real Keycloak + backend-enforced approval), these routes get deleted.
- `src/lib/maker-checker.ts` exposes `sendForApproval(entityType, id)` and `clearApproval(entityType, id)` calling those routes; ActionBar (Task 1.3) wires its "Send for approval" action to this helper.

The Checker → Approve action calls the real `submitQuote(id)` from Task 1.2 (no special handling needed — once `awaitingApproval` clears, the entity moves through the DSL flow normally).

**Files created:**
- `src/contexts/RoleContext.tsx` — `RoleProvider` + `RoleContext`. Hydration-safe (SSR sees `maker`; effect upgrades to the localStorage value on mount). `STORAGE_KEY = 'group-pas:current-role'`.
- `src/hooks/useRole.ts` — `useRole(): { role, setRole }` with provider-presence guard.
- `src/components/widgets/role/RoleSwitcher.tsx` — top-shell dropdown with all four roles, lucide icons, descriptions; uses existing `dropdown-menu` primitive.
- `src/lib/maker-checker.ts` — `sendForApproval(entity, id)` / `clearApproval(entity, id)` for `'quote' | 'proposal'`. Calls the new mock routes; does nothing else (Checker's Approve calls real `submitQuote` from Task 1.2).

**Files touched:**
- `src/components/registry/WidgetRegistry.tsx` — registered `"role-switcher"`.
- `src/app/layout.tsx` — mounted `RoleProvider` (between `Providers` and `AppContextProvider`) and `RoleSwitcher` in the top-right of `<main>` (`absolute top-4 right-6 z-50`).
- `src/lib/api-mock/group-pas/store.ts` — added `MockProposal = Proposal & { awaitingApproval?: boolean }` and re-typed `proposals` as `MockProposal[]`.
- `src/lib/api-mock/group-pas/dtos.ts` — `MockQuoteDto` + `MockProposalDto` extend the wire DTOs with the optional `awaitingApproval` flag; mappers populate it from the store. Real backend never returns it; field disappears once V1 maker-checker lands.
- `src/app/api/quotation/[[...path]]/route.ts` — added `POST/DELETE /quotes/:quoteId/awaiting-approval` (UI-only, not in DSL).
- `src/app/api/issuance/[[...path]]/route.ts` — added `POST/DELETE /proposals/:proposalId/awaiting-approval`; switched `findProposal` return type to `MockProposal`.

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- Live smoke against existing dev server on :3000:
  - `POST /api/quotation/quotes/QTE-2026-0001/awaiting-approval` → 200; subsequent GET returns `awaitingApproval: true`.
  - `DELETE` → 200; subsequent GET returns `awaitingApproval: false`.
  - Fixture-default `QTE-2026-0002` returns `awaitingApproval: true` immediately (round-trips the seed value).
  - Proposal `POST /api/issuance/proposals/PRO-2026-0001/awaiting-approval` → 200, GET returns `awaitingApproval: true`.
  - `GET /` returns 200 and the rendered HTML references `RoleSwitcher` chunk (mounted in layout).

**Done-criteria deferred to Task 1.3:** ActionBar consumes `useRole()` + `awaitingApproval` to render Maker → Send for approval → Checker → Approve. The infra is in place; gating logic lives in ActionBar per the original task split.

**Next:** Task 1.3 — ActionBar widget (state + role gating, consumed by every detail page).

### 2026-05-07 (continued) — Task 1.3 — ActionBar widget — IN PROGRESS

About to do: schema-driven action bar consumed by every detail page (Quote, Proposal, Policy, PolicyMember). Reads the entity's current `state` + `useRole()` and renders the per-schema action set with disabled buttons + hover tooltip explaining the gate.

Props:
- `state: string` — entity state pulled from the page's data
- `stateActions: Record<string, string[]>` — state → allowed action IDs
- `roleActions?: Record<string, string[]>` — role → allowed action IDs (optional; absence = no role gate)
- `actions: ActionConfig[]` — full set of action configs (from `@/types/widget`)
- `awaitingApproval?: boolean` — UI-only maker-checker flag from the dto; when true, the Maker can't re-submit and the Checker's Approve becomes the primary call-to-action.

Special action types (id-conventional, not new types in `ActionConfig`):
- `id: 'send-for-approval'` and `id: 'clear-approval'` are intercepted before delegating to `useActionHandler` so they call `sendForApproval(entity, id)` / `clearApproval(entity, id)` from `@/lib/maker-checker`. The schema declares `entityType: 'quote' | 'proposal'` + `entityId` via `props`. Everything else flows through the existing `useActionHandler` plumbing unchanged.

Disabled tooltip messages:
- State-disabled: `"Not available in {state}"`
- Role-disabled: `"Requires {allowed roles}"` — computed from which roles allow this action.
- Awaiting-approval lock (Maker editing actions): `"Awaiting checker approval"`.

The widget consumes `useWidgetState()` to optionally pull `state` and `awaitingApproval` from a sibling-published widget state (e.g. the entity-detail dataSource), so the schema can wire it without prop drilling. Falls back to direct props when published state is absent.

Test plan: a Jest unit covering 3 sample states × 3 sample roles, asserting which actions are enabled/disabled and which tooltip message renders.

**Files created:**
- `src/components/widgets/actions/ActionBar.tsx` — schema-driven action bar. Reads `state` + `awaitingApproval` either from props or (when `stateKey` is set) from a sibling-published widget state via `useWidgetState()`. Three gating layers in order: (1) state, (2) role, (3) maker-checker approval lock for `role === 'maker'` when `awaitingApproval=true`. Disabled buttons render through a `<Tooltip>` with the gating reason. Special action ids `'send-for-approval'` and `'clear-approval'` short-circuit `useActionHandler` and call the `@/lib/maker-checker` helpers with `entityType` + `entityId` props. Other action ids flow through the existing `useActionHandler` pipeline unchanged.
- `src/tests/unit/actions/ActionBar.unit.test.tsx` — Jest unit with 6 cases: Maker DRAFT (state-allowed actions enabled, others disabled); Checker SUBMITTED (Approve enabled, Edit state-disabled with right tooltip); Maker DRAFT + awaitingApproval=true (edit/send locked with "Awaiting checker approval"; Approve still state-disabled because state gate wins); Viewer DRAFT (everything role-disabled); Checker click → handleAction dispatch; Maker click on send-for-approval → maker-checker helper called, handleAction NOT called.

**Files touched:**
- `src/components/registry/WidgetRegistry.tsx` — registered `"action-bar"`.

**Done-criteria (Task 1.9 + 1.3 combined):** the maker-checker overlay can now be wired end-to-end on a quote — schemas declare `roleActions: { maker: ['edit', 'send-for-approval'], checker: ['submit', 'send-to-client', 'finalize', 'clear-approval'], ... }` and the ActionBar handles the rest. End-to-end demo wiring lives in the Quote/Proposal detail-page schemas (Phase 2 / 3).

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- `npx jest src/tests/unit/actions/ActionBar.unit.test.tsx` — 6/6 pass.

**Next:** Task 1.8 — StateBadge + ReasonBanner widgets (simple presentational helpers consumed by every list/detail page).

### 2026-05-07 (continued) — Task 1.8 — StateBadge + ReasonBanner — IN PROGRESS

About to do: presentational widgets used by every list cell + detail header to render the entity state and any pending/void/cancellation reason. One canonical map (`state-map.ts`) keeps all label + colour pairs in one place so ActionBar tooltips and list cells share copy.

Coverage matrix:
- 5 entity types: quote, proposal, policyMember, policy, member.
- All states from Task 1.1 enums (8/5/12/4/4 = 33 states total).
- 3 enum reason groups (PolicyPendingReason × 2, MemberPendingReason × 3, MemberVoidReason × 4) + free-text `cancellationReason` (member only) + `Quote.awaitingApproval` UI overlay.

Variant assignments follow a simple convention: terminal-success → `success`; in-progress → `info`; awaiting-something → `warning`; terminal-rejection/cancel → `destructive`; archived → `grey`. Existing Badge variants reused; no new design tokens.

Test plan: snapshot-style test per entity asserting every enum value resolves to a non-empty label + a defined variant; one render test for the cancellation free-text passthrough.

**Files created:**
- `src/components/widgets/state/state-map.ts` — single source of truth. `getStateMeta(entity, state)` covers all 38 enum values across `quote / proposal / policyMember / policy / member / censusSubmission`; `getReasonMeta(group, value)` covers `policyPending`, `memberPending`, `memberVoid`, plus `memberCancellation` (free-text passthrough). `reasonGroupFor(entity, state, hasCancellationReason)` is the convenience the ReasonBanner uses to pick the right map without the schema spelling it out.
- `src/components/widgets/state/StateBadge.tsx` — Badge wrapper supporting both schema-render mode (props on `config.props`) and direct-render mode (column-cell usage). `aria-label` carries the canonical label.
- `src/components/widgets/state/ReasonBanner.tsx` — banner with icon + canonical copy. Reads live entity from `useWidgetState({ stateKey })` falling back to literal props. Returns `null` when no reason group applies.
- `src/tests/unit/state/StateBadge.unit.test.tsx` — Jest unit asserting (a) every state in every entity yields non-empty label + defined variant; (b) unknown state falls back to `outline` variant; (c) every reason enum value resolves to copy that mentions the gating concept; (d) `memberCancellation` passes free text through verbatim; (e) StateBadge renders the right label in both prop modes; (f) ReasonBanner renders the canonical text for PENDING + the verbatim text for CANCELLED, and returns null when no reason applies.

**Files touched:**
- `src/components/registry/WidgetRegistry.tsx` — registered `"state-badge"` and `"reason-banner"`.

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- `npx jest src/tests/unit/state/ src/tests/unit/actions/` — 15/15 pass (9 state + 6 ActionBar).

**Batch 1 complete.** Phase 0 + Phase 1 demo subset done. The widget engine + all foundational primitives, mocks, clients, role + maker-checker plumbing, ActionBar, and StateBadge/ReasonBanner are all in place.

**Next:** Batch 2 — Quote happy path. Tasks 2.1, 2.2, 2.3, 2.4.1 (editable) + 2.4.2/3/4 (read-only) + 2.4.5 (with poll) + 2.4.6 (placeholder). `/build-feature` reserved for the action-bar maker-checker overlay design point in this batch per the locked execution strategy.

### 2026-05-07 (continued) — Batch 2 — Quote happy path — IN PROGRESS

User reported the Quotation card on the dashboard 404s — that's expected (Phase 0 wired the nav target; the page lands now in Batch 2). Starting Task 2.1 first to surface a clickable list, then 2.2 → 2.3 → tabs.

Mechanical execution per the strategy:
- Schema-driven, leveraging existing primitives (`data-table`, `tabs-container`, `form-container`, `key-value-grid`, `action-bar`, `state-badge`, `reason-banner`).
- Saved-view chips (D12) explicitly deferred per execution strategy — list will ship with `filter-bar` for status/policyType filtering, no chip variants.
- Row-level role gating on actions: deferred to D12-equivalent — page-header "New Quote" button gates to Maker; row actions ungate for V1 demo (ActionBar in detail view does the heavy gating).
- Plans / Census / Member-mapping tabs render read-only displays of fixture data per Batch 2 cuts D1/D2/D3.
- Member Quotes tab is the GCL placeholder per cut D5/D8.

**CellRenderer extension:** adding a `state-badge` cell type that dispatches to the canonical `StateBadge` widget so the list table and detail header share copy + variant from `state-map.ts` instead of duplicating valueMapping JSON. Also adding an `awaiting-approval` cell type that renders a small warning badge when the value is truthy.

**Files created:**
- `schemas/quote.json` — list page: page-header, filter-bar (status + policyType), data-table backed by `/api/quotation/quotes/search` with `stateDependencies: ['quote-list-filters']`, columns include `state-badge` cell. Header action `New Quote` opens `create-quote-form` modal. Row actions: View (navigate), Withdraw (api-mutation).
- `schemas/forms/create-quote-form.json` — 2-field form (clientId select sourced from PAM clients/list, policyType static select) → POST `/api/quotation/quotes` → `refreshKey` invalidates the list query.
- `schemas/quote-detail.json` — 5-section page: page-header (title interpolates `{{id}}`), state-summary key-value-grid, action-bar with full state×role matrix per the plan + maker-checker overlay flags, tabs-container with 6 tab refs.
- `schemas/tabs/quote/{key-data,plans,census,member-mapping,pricing,member-quotes-placeholder}.json` — Key Data + read-only Plans/Census/Member-mapping (D1-D3 deferred), GCL placeholder, Pricing tab with `pollSchedule: { initialIntervalMs: 2000, initialDurationMs: 10000, fallbackIntervalMs: 5000, maxDurationMs: 60000 }` + `stopWhen: { '!=': [{ var: 'estimatedPremium.totalAmount' }, 0] }` and a Maker-only "Request price" action.
- `src/app/quotation/page.tsx` — server component, resolves the list schema and renders.
- `src/app/quotation/[id]/page.tsx` — dynamic route mirroring the accounting `[module]/[id]` pattern; resolves schema, substitutes `{{id}}`, renders with `force-dynamic`.

**Files touched:**
- `src/components/widgets/data/CellRenderer.tsx` + `.../DataTable/types.ts` — added `state-badge` and `awaiting-approval` cell types; `entity?: string` field on ColumnConfig.
- `src/components/widgets/actions/ActionBar.tsx` — now reads live entity from three sources (in priority order): explicit `useWidgetState({ stateKey })` slot → `useSmartQuery(config.dataSource)` (auto-fetched when the widget config carries a dataSource) → literal props. Lets a detail-page schema drop an action-bar inline with a dataSource and have it self-fetch live state. React Query dedupes the request with sibling widgets sharing the same key.
- `src/components/widgets/state/ReasonBanner.tsx` — same dataSource-aware extension as ActionBar.
- `src/tests/unit/{state,actions}/*.test.tsx` — wrapped renders in `QueryClientProvider` (required after the dataSource extension); 15/15 pass.

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- `npx jest src/tests/unit/state src/tests/unit/actions` — 15/15.
- Live smoke against existing dev server on :3000:
  - `GET /quotation` → 200; rendered HTML carries the `Quotations` page title and `New Quote` action.
  - `GET /quotation/QTE-2026-0001` → 200; all 6 tabs (Key Data / Plans / Census / Member-to-Plan Mapping / Pricing / Member Quotes) render in the markup; action-bar mounts; header interpolates the id.
  - `GET /api/quotation/quotes/QTE-2026-0001` → 200 with `status: DRAFT, awaitingApproval: false`. Detail page consumers will pull live state from this on hydration.

**Demo verification still TODO** (next session, ideally with the user): walk Maker → Send for approval → switch to Checker → Approve → Send to client → Accept → Finalize → confirm Proposal auto-creates in Issuance.

**Next:** Batch 3 — Issuance + PAM + glue. Tasks 3.1 (light) + 3.2 + 3.3 + 3.4 + 4.1 + 4.2 + 4.3 + 4.4 + 5.1 + 5.3.

### 2026-05-07 (continued) — Batch 3 — Issuance + PAM + glue — IN PROGRESS

About to do (per the locked execution strategy):
- 3.1 light — Clients list only (D9 defers detail page).
- 3.2 — Policies list with status chips.
- 3.3 — Policy detail with client-side derived pending-breakdown + members tab (per V1 interim assumption #5).
- 3.4 — PAM Member detail with `ReasonBanner` for every reason family.
- 4.1 — Proposals list with state chips.
- 4.2 — Proposal detail shell + action bar (state×role from plan table).
- 4.3 — Members tab inside proposal.
- 4.4 — Single-member add form + state-driven PolicyMember detail (the core operational screen). Executes directly per strategy; `/build-feature` reserved for it but the plan task is detailed enough to act as the design doc.
- 5.1 — Cross-module deep-link verification.
- 5.3 — End-to-end demo walkthrough deferred to a session with the user.

Skipped per V1 cuts: 4.5 (D4 census flow — single-member-add covers demo), 5.2 (D5 ops queue index), 5.4 (D6 critical-path tests).

Pattern reuse:
- Three list pages clone the Quote list pattern (filter-bar + data-table + state-badge column + row navigate action).
- Detail pages clone the Quote detail shell (state-summary KVG + ActionBar with dataSource + tabs-container).
- PAM Member detail uses `reason-banner` registered in WidgetRegistry.
- Mock layer already has all the routes Batch 3 needs (Task 1.4).

**Files created:**

PAM (Phase 3):
- `schemas/client.json` + `src/app/policy-admin/clients/page.tsx` — list only per cut D9. Filter-bar + data-table over `/clients/search`.
- `schemas/policy.json` + `src/app/policy-admin/policies/page.tsx` — list with state + policyType filters, state-badge column, link-cell to detail.
- `schemas/policy-detail.json` + `src/app/policy-admin/policies/[id]/page.tsx` — state summary, action-bar (Cancel: PENDING/ACTIVE under Checker), 2 tabs.
- `schemas/tabs/policy/{overview,members}.json` — Overview includes the activation-watch breakdown card (consumes the `/policies/:id/pending-breakdown` route built in Task 1.4 — server-side mock derives the same way the plan describes client-side; matches V1 interim assumption #5). Members tab has state filter + state-badge + pendingReason column rendered as separate text column per the V1 convention (composite cell deferred per ARCH_TRANSITION).
- `schemas/member-detail.json` + `src/app/policy-admin/members/[id]/page.tsx` — read-only with reason-banner widget (auto-picks PENDING/VOID/CANCELLED groups via `reasonGroupFor()`), identity + coverage + cancellation note + additionalAttributesJson sections.

Issuance (Phase 4):
- `schemas/proposal.json` + `src/app/issuance/proposals/page.tsx` — list with state filter, state-badge column.
- `schemas/proposal-detail.json` + `src/app/issuance/proposals/[id]/page.tsx` — state summary, action-bar (Submit/Maker, Finalize/Checker, Cancel/Checker), 2 tabs.
- `schemas/tabs/proposal/{overview,members}.json` — Overview shows carried-from-quote data; Members tab embeds the proposal's PolicyMember list with full state filter + "Add member" header action navigating to /members/new.
- `schemas/forms/add-policy-member-form.json` — single-step add with V1 fields per `CreatePolicyMemberRequest`. Hardcoded to `POL-2026-0001` for the demo (multi-policy multi-tenancy is backend-future).
- `schemas/forms/repair-policy-member-form.json` — repair edit form. Used by the `repair-edit` action on the state-driven PolicyMember detail when the workflow lane is REPAIR.
- `src/app/issuance/proposals/[id]/members/new/page.tsx` — wraps the add form in a stack-layout with a contextual page header.
- `schemas/policy-member-detail.json` + `src/app/issuance/proposals/[id]/members/[memberId]/page.tsx` — single page with state-summary, large action-bar covering the full DSL lifecycle (price / classify / repair-edit / uw-approve / uw-reject / reject / archive / send-for-issuance / pam-link), classification + UW JSON section, and member-data section. State-driven UI is fully expressed through the action bar's state×role gating (no top-level conditional widget rendering needed for V1).

**Engine extensions:** none. Pure schema + route-file work. The earlier ActionBar/ReasonBanner dataSource extension already covered state-driven needs; the `state-badge` cell type covered list rendering.

**Verify:**
- `npx tsc --noEmit` clean (exit 0).
- `npx jest src/tests/unit/{state,actions}/` — 15/15 still pass.
- 10 new pages all return 200 against the live dev server on :3000 (4 lists + 6 detail/create surfaces).
- Cross-module deep-link APIs all 200: `/issuance/proposals/by-quote/QTE-2026-0006`, `/policy-admin/policies/by-proposal/PRO-2026-0001`, `/policy-admin/members/by-policy-member/PMB-0011`.
- `/policies/:id/pending-breakdown` derives the right reason tally from the in-memory store (`PENDING_FLOAT_RESERVATION:1, PENDING_APPROVAL:1, PENDING_POLICY_ACTIVATION:2` for POL-2026-0002).

**Cross-module deep links wired (Task 5.1) — all return 200:**
- Quote detail's `finalize` success message → user follows up by polling `/issuance/proposals/by-quote/<id>` (mock auto-creates Proposal 4s after finalize, per Task 1.4).
- Proposal detail header surfaces `policyId` once POLICY_CREATED; manual navigation suffices for V1 demo.
- PolicyMember detail's `pam-link` action navigates to `/policy-admin/members/MEM-:memberId` (the simulator names PAM members as `MEM-<timestamp>` so the link is approximate for fixture-seeded members; for newly-created PolicyMembers the real created MEM id is `MEM-<base36-ts>` — exact resolution needs a `findMemberByPolicyMember` lookup, deferred to D-cleanup).

**Demo verification (Task 5.3):** deferred to a session with the user. Walking the 9-step happy path is out of scope for the unattended build.

**Skipped per V1 cuts:** 4.5 (D4 census flow), 5.2 (D5 ops queue index), 5.4 (D6 critical-path tests).

**Batch 3 complete. Demo build done.**

### 2026-05-07 (continued) — Post-Batch-3 polish + demo prep (commit-log catch-up)

This entry catches the running log up to actual repo state. Twelve commits landed after the "Batch 3 complete" entry above without being logged at the time. Captured here for resumption fidelity. Source: `git log 6dccea9..HEAD`.

**UI polish (`docs/V1_DEMO_ISSUES.md` Pass 1 + selected Pass 2):**

- `5cd9968` — motion + depth pass per Keystone "Elegance" principle.
- `a88e3c6` — resolved hardcoded IDs + cross-module deep-link gaps (already-fixed list at the bottom of `docs/V1_DEMO_ISSUES.md`).
- `4ead472` (P1.1) — ActionBar hides role-gated actions, keeps state-gated visible-but-disabled per design deck v2.
- `91c2909` (P1.2) — back button on every detail page (`page-header` extended with `backHref`).
- `97a8caa` (P1.3–P1.9) — `KeyValueGrid` nested accessors + raw-JSON cleanup across PAM Member detail, Quote/Proposal overview, Quote census, PolicyMember detail; GCL placeholder tab swapped to a clean empty-state widget.
- `356f995` (P2.2) — DTOs enriched with `clientName` so detail headers surface labels instead of raw IDs.
- `12a91fe` — ActionBar refinement: Checker hides pre-submit actions (Maker-only), Maker retains Withdraw while under approval lock.

**Demo replay infra:**

- `8b7191c` — new `POST /api/dev/reset` endpoint that re-clones fixtures into the in-memory store so the 5.3 walkthrough can replay from clean state without a server restart.

**Demo-prep docs (untracked):**

- `docs/Demo_Script_Day_in_the_Life.md` — minute-by-minute talk track for the live walkthrough.
- `docs/Demo_Prep_Business_Context.md` (committed in `85edb4d`/`a5dc8d1`/`156df2c`/`b2fec97`) — insurance-101 + glossary + finance/regulatory cheatsheet for the demoer.
- `docs/Keystone_UI_Design_Principles.pptx` + `_v2.pptx` + speaker notes (`*_Speaker_Notes.md`) — design-principles deck.
- `docs/generate_slides.js` + `generate_slides_v2.js` — pptx generator scripts.

**Other untracked items not part of demo-prep:**

- `docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md` — companion doc for the older `arch_v0` → `archV1` review captured in `ARCH_REVIEW_SCRATCH.md` (also untracked). Both are scratch/review notes from a parallel branch and unrelated to the Group PAS V1 demo build.
- `backend/` — FastAPI scaffold (alembic + app/{core,routers,tests} + venv + .db) with no source files currently checked in (only `__pycache__/`). Likely the residue of an earlier `/build-backend` exploration on a different branch; not driving any current keystone-ui work and not referenced from the V1 plan.
- `test-results/` — empty directory; safe to ignore.

**Unstaged file:** `context/CORE_MEMORY.md` — adds the "Two distinct rules on rework" build-approach bullets (frontend builds to real-backend contract; mock-backend simulations get deferred). Matches the user's standing feedback memory ("Build to expected scope") and ARCH_TRANSITION's deferral rationale. Not yet committed; leaving it staged-but-unmodified until a logical commit window opens.

**V1_DEMO_ISSUES outstanding (per `docs/V1_DEMO_ISSUES.md`):**

- Pass 1: all P1.1–P1.9 done.
- Pass 2: P2.2 done. **Open:** P2.1 (cancel/reject/archive use a hardcoded reason — wants a confirm-with-input dialog; needs `confirm` action shape extension), P2.3 (Quote → Proposal "open created proposal" navigates to list, not specific proposal — needs chained action handler), P2.4 (no breadcrumbs; back-button considered sufficient for V1), P2.5 (Pricing tab "still working…" banner not implemented), P2.6 (filter-bar empty-state reset on chip clear — verify in walkthrough).
- Pass 3 (D1–D12) post-demo backlog — untouched, as planned.

**Demo target unchanged:** internal demo 2026-05-08 (Friday, tomorrow). Task 5.3 (end-to-end walkthrough) still gated on user session — see HANDOFF Active Workstreams.

**No new code changes in this session.** Read-only reconciliation pass.

**Next:** waiting on user direction. Plausible candidates surfaced from repo state, in rough priority order:
1. Run task 5.3 demo walkthrough together (gated on user attendance).
2. Burn down remaining V1_DEMO_ISSUES Pass 2 (P2.1 confirm-with-input is the highest-impact open item before tomorrow).
3. Decide what to do with the unstaged `CORE_MEMORY.md` rework rules and the untracked design-principles deck / `Demo_Script_Day_in_the_Life.md` (commit, leave, or discard).
4. Triage `backend/` and `ARCH_REVIEW_SCRATCH.md` — both look like residue from parallel work; confirm with user whether to gitignore, archive, or pursue.

### 2026-05-07 (continued) — Backend deployed; investigation pass against `/Users/seriousblack/dev_anaira/group-pas/`

User pointed at the live backend repo. Three-way diff (DSL ↔ deployed OpenAPI ↔ our mock) + code-level investigation against the actual Java/Spring source. Findings drive the day's build decisions.

**Spec ⇔ deployed OpenAPI**: zero drift. 85 group-pas endpoints in DSL, 85 deployed, byte-identical method/path. DTO field counts match (QuoteDto:16, QuoteSummaryDto:6, ProposalDto:11, PolicyDto:17, MemberDto:24, MemberSummaryDto:11, PolicyMemberDto:19).

**Mock ⇔ deployed delta**: our 86 mock endpoints include 7 that won't exist on backend — all expected/UI-only:
- 4 `/awaiting-approval` (UI maker-checker overlay; deletes when backend ships real approval; see below).
- 1 `/policies/:id/pending-breakdown` (V1 interim assumption #5 — derive client-side; backend has no plans for it).
- 2 proposal-scoped `/proposals/:id/members` shortcuts (we resolve to backend's `/policies/:id/members` via the proposal's policyId).

Backend has **6 GCL `MemberQuote` endpoints we deliberately didn't mock** — those are out of V1 demo cuts. **Backend has them all implemented** (`MemberQuoteAPI.java`, `MemberQuoteCommands.java` are real, not stubs). Decision (this turn): build the GCL frontends so the placeholder tab stops being a placeholder.

**Critical backend-status findings (read directly from Java source):**

1. **File upload — NOT WIRED.**
   - `quotation/QuotationCommand/src/main/java/com/anaira/quotation/command/FileUrlCommands.java:21` throws `UnsupportedOperationException("File URL generation not yet wired")` for both upload + download. Comment: `// TODO: wire S3 presigner — cross-cutting infra not in repo yet.`
   - `policyAdmin/PolicyAdminCommand/src/main/java/com/anaira/policyadmin/command/PolicyFileUrlCommands.java` returns a stub URL pointing at `https://policy-files.local/stub/...` — not a real bucket; effectively broken too.
   - **Implication:** D7 (PresignedUploader) stays deferred. D2/D3 (file-flow CRUD on Quote) likewise. Frontend won't build until backend infra lands.

2. **Rule Engine — request-price is a no-op on backend.**
   - `QuoteCommands.java:110` calls `quote.requestPrice()` which emits `QuotePriceRequested` to Kafka. **No listener consumes that event** (verified via grep across `quotation`, `issuance`, `policyAdmin` modules — only test references).
   - DSL has `Quote.updatePremium(premium)` as a domain method but **NO REST endpoint** is exposed for it (`QuotationApi.api` lacks a `PUT /quotes/:id/premium`). So Sales currently has no way to manually set the premium against the real backend.
   - Decision (this turn): **keep "Request price" button** (it's the expected production flow once Rule Engine lands), keep the mock simulator, do NOT add a manual-entry UI today (would require backend exposing `updatePremium` over REST first).

3. **Number generation — sync, in-memory counter.**
   - `policyAdmin/.../NumberGeneratorClient.java`: `ConcurrentMap<String, AtomicLong>` returning `CLI-NNN` / `POL-NNN` / `MEM-NNN` / `CNT-NNN`. Live verified: `POST /clients` returns `clientId` (UUID) + `clientNumber` synchronously.
   - **Implication:** no polling needed for numbers. `CreateClientResponse` carries them.

4. **Float Management — stub, always RESERVED.**
   - `policyAdmin/.../FloatManagementClient.java`: `doReserve` always returns `FloatReservationStatus.RESERVED` with `R-NNN`.
   - `app/src/main/.../MockFloatManagementClient.java`: `deduct` returns a fresh UUID, no ledger.
   - **Implication:** `FLOAT_UNAVAILABLE` void reason and `PENDING_FLOAT_RESERVATION` pending reason can't naturally trigger via real backend. Decision (this turn): drop the `MEM-0009` VOID/`FLOAT_UNAVAILABLE` fixture row to align frontend with backend reality.

5. **Maker-checker on Quote — does NOT exist in spec.**
   - `QuotationDomain.domain:152` comment on `submit()` says "internal approval/QC complete" — meaning the submitter QCs their own work; no separate Checker entity. Verified via grep: zero `approve`/`maker`/`checker` references in `quotation/` source or DSL.
   - PAM module has a "MemberApprovalCompletedListener" but that's for **member-enrollment-time approval** (PAM workflow's `RequestApproval` step routes to a "central Approval module" outside this codebase). Quote-level has no equivalent.
   - **Implication:** the UI-only `awaitingApproval` overlay has no backend counterpart and isn't getting one without an explicit DSL change. Either keep the overlay forever, or escalate to backend for a DSL extension.
   - **Specific question to backend** drafted in this turn (in chat) for the user to forward.

6. **Workflows (Temporal) — running for PAM only.**
   - `policyAdmin/PolicyAdminWorkflow/.../WorkflowRuntimeConfiguration.java` wires Temporal in `app/` profile. PAM's `MemberEnrollmentFlow` and `PolicyActivationFlow` execute on Temporal in production.
   - `issuance-code-review.md` and direct grep: Quote and Proposal workflows are NOT yet running. Quote/Proposal state transitions are direct command handlers, no async workflow.
   - **Implication:** activation cascade demo is real on backend (scenarios.sh proves it); Quote→Proposal handoff is sync on backend; `request-price` polling fiction is mock-only.

7. **Error envelope — actual backend shape differs from V1 assumption #4.**
   - `QuotationExceptionHandler.java` returns `{ "error": "NOT_FOUND" | "BAD_REQUEST", "message": "..." }` for 404/400. NOT the Spring default `{ timestamp, status, error, message, path }`.
   - Other paths fall back to Spring's default 500 envelope.
   - Decision (this turn): update `src/lib/api/error-mapper.ts` to handle both shapes.

8. **Auth on dev — open.** `app/src/main/.../DevSecurityConfiguration.java`: `permitAll()` + synthetic dev-user with tenantId `00000000-0000-0000-0000-000000000001`. No headers needed for V1 demo.

9. **Live data on dev backend (sparse):** 3 clients (Acme Corp ×3 — different reg numbers), 2 quotes (DRAFT), 2 proposals, 1 policy (POL-001), 1 member (MEM-001/PM-001 PENDING). User can re-run `scenarios.sh` against the dev URL for richer demo data, or ask backend to seed.

10. **Known backend bugs surfaced by `issuance-code-review.md`:** census `memberId` silently discarded (synthetic IDs); float-deduct ↔ PAM-add not atomic (orphan reservations possible); `PolicyMember.canUpdate()` guard not invoked; no DB indexes on hot read columns. Not ours to fix; flagged for awareness mid-demo.

**Decisions taken this turn:**
- Drafted file-upload feedback question for backend (precise endpoints + status by module).
- Updating error-mapper to absorb backend's actual `{ error, message }` shape.
- Removing `MEM-0009` VOID/`FLOAT_UNAVAILABLE` fixture row (frontend follows backend stub reality).
- Building GCL frontends (list + detail + create form + sidebar nav update + mock routes) since backend exposes the contract.
- Keep request-price button + mock simulator as-is; defer manual-entry UI until backend exposes `PUT /quotes/:id/premium`.
- Maker-checker overlay stays as permanent V1 fixture pending a backend DSL extension.

**Files about to touch:** `src/lib/api/error-mapper.ts`, `src/mocks/group-pas/policy-admin/members.ts`, new `src/app/quotation/member-quotes/{page.tsx,[id]/page.tsx}`, new `schemas/member-quote.json` + `schemas/member-quote-detail.json` + create form, sidebar nav update.

**Next:** execute the above, verify, commit, push.
