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
