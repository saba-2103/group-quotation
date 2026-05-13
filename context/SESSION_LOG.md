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

### 2026-05-07 (continued) — End-of-thread handoff snapshot

Context window filled; new thread starts after this entry. Everything above stays canonical. New thread should read this entry + `context/HANDOFF.md` + `docs/Demo_Prep_Business_Context.md` + the latest commit log. No action lost.

**Commits landed this thread (chronological):**

| SHA | Title | Notes |
|---|---|---|
| `3f30dca` | feat(group-pas): align with deployed backend — error envelope, GCL screens, FLOAT cleanup | Error mapper handles `{ error, message }` + Spring default; `MEM-0009 FLOAT_UNAVAILABLE` fixture removed; full GCL Member Quote frontends built (list / detail / create / set-premium / sidebar nav / 6 mock routes / 3 fixtures / state-map entry). |
| `3abd301` | feat(api-mock): proxy mode wired to live backend with UI-only short-circuits | Set `GROUP_PAS_BACKEND_URL` in `.env.local` → catch-all proxies to backend. `MOCK_ONLY_PATTERNS` keeps `/awaiting-approval`, `/pending-breakdown`, proposal-scoped `/members` local. Approval overlay decoupled to `Map<string, boolean>` so UUIDs work. `.env.example` documents the switch. |

**Verified live (proxy on, against `https://group-pas-dev.anairacloud.com`):**
- All 5 list pages render real backend rows.
- Detail pages with real UUIDs render.
- `POST /quotes` and `POST /member-quotes` create real entities; appear in subsequent reads.
- PAM Member by-policy-member redirect resolves real UUIDs.
- UI-only awaiting-approval works in proxy mode (overlay map keyed by id).
- 16/16 jest tests pass; `tsc --noEmit` clean.

**Known limitations in proxy mode** (documented for the demo, not blockers):
- Backend `QuoteSummaryDto` carries `clientId` but no `clientName` → list pages show UUIDs in proxy mode. Mitigation = build a `useClientNames()` resolver hook (~2h, future polish).
- `request-price` proxies through but backend has no Rule Engine listener — premium never populates. Demo runs in mock mode where the simulator works.
- File upload endpoints throw `UnsupportedOperationException` on backend — D7/D2/D3 stay deferred until backend wires S3.
- Quote-level maker-checker `awaitingApproval` overlay only persists locally — backend doesn't carry the field on its DTOs.

**Architecture decision locked this thread (Quote-level maker-checker):**

User chose **option 1** — backend should own Quote-level approval, frontend overlay is **transitional scaffolding only** (delete when backend ships). The path to send to backend (short version):

> **Subject: Quote-level maker-checker — extend the PAM approval pattern to Quote?**
>
> We're keeping our UI-only `awaitingApproval` overlay only as transitional scaffolding. Real ownership belongs in backend. Can you apply the same pattern you already shipped on PAM (`RequestApprovalCommand` → `MemberApprovalRequested` event → central Approval module → `ApprovalCompletedListener` → `Member.pendingReason = PENDING_APPROVAL`) to Quote?
>
> Concrete ask: a `RequestQuoteApprovalCommand`, a corresponding `QuoteApprovalRequested` event, an in-flight state on Quote (matching whatever shape — flag, enum, or aggregate — you prefer for consistency with Member), a listener back from the Approval module, and Cerbos enforcement on `submit`.
>
> Once your contract lands, we delete the overlay and read your field directly (~half day cleanup on our side). Timeline / priority?

That question hasn't been sent yet (user task). Also outstanding:
- **File upload feedback to backend**: `POST /api/quotation/files/upload-url` and `POST /api/quotation/files/download-url` throw `UnsupportedOperationException` (`group-pas/quotation/QuotationCommand/.../FileUrlCommands.java:21`). PolicyAdmin equivalent returns invalid stub URLs (`https://policy-files.local/stub/...`). All four file-URL endpoints non-functional — needs S3 wiring before D7 unblocks.

**Deploy issue surfaced at end of thread (Cloudflare Workers):**

`npm run deploy` fails — bundle is 8.4 MB, free-tier limit is 3 MiB. Top contributors: `pdfmake` + `vfs_fonts` (1.78 MB + 834 KB), `@vercel/og` (resvg + edge + yoga = 2.2 MB), `xlsx` (402 KB), Next.js runtime + SSR chunk. Three options offered to user (paid tier $5/mo for 10 MB; remove pdfmake+xlsx via dropping table-export feature; aggressive purge). User has not chosen yet.

**Where next thread should start:**

1. **Send the two questions to backend** (maker-checker pattern + file upload status). Both fully drafted in this log entry — copy-paste ready.
2. **Decide deploy path** (pay tier vs prune) before attempting `npm run deploy` again.
3. **Demo walkthrough Task 5.3** still gated on user attendance — not done.
4. **Pass-2 V1_DEMO_ISSUES** still has open items (P2.1 confirm-with-input, P2.5 "still working" banner, P2.6 filter-bar reset).
5. **Optional polish:** `useClientNames()` resolver for proxy-mode list pages (~2h).

**Demo posture at thread close:**
- Mock mode (default `.env.local` flipped off): rich fixture data, full demo path works including request-price simulator and maker-checker overlay. Recommended for Friday.
- Proxy mode (`.env.local` flipped on): real backend wiring proven, gaps documented. Demo as proof of integration, not full walkthrough.
- Switch between modes by editing `.env.local` (1 line, restart `npm run dev`).

**Untouched untracked files** still on disk (same as previous handoff entry, no decision yet):
- `ARCH_REVIEW_SCRATCH.md`, `backend/`, `docs/Demo_Script_Day_in_the_Life.md`, `docs/Keystone_UI_Design_Principles{,.v2}*.{pptx,md}`, `docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md`, `docs/generate_slides{,_v2}.js`, `test-results/`, `.env.local` (gitignored).

### 2026-05-07 (continued) — New tighter mock rule: don't simulate backend-missing behavior

User directive (this turn): "i dont want to mock functionality which are not there in the actual backend, much rather i would show a tooltip that says that backend does not have the functionality."

This is a **stronger** version of the existing build-to-expected-scope rule. Where the prior rule said "don't build mock-route logic real backend will replace," the new rule says: when frontend has an affordance but real backend can't deliver the behavior at all (endpoint missing, throws, fires-and-forgets to no listener, no DSL concept), render the affordance **disabled with a tooltip explaining the gap** rather than mock-simulating the behavior. Honest > demo-pretty. Memory updated: [feedback_build_to_expected_scope.md](../.claude/projects/-Users-seriousblack-dev-anaira-sandbox-keystone-ui/memory/feedback_build_to_expected_scope.md) (rule #6 added).

**Three targets confirmed by user:**

1. **Quote pricing — `request-price` flow.** Backend Kafka event has no Rule Engine listener; mock auto-populates `premium`. Convert: action button visible-but-disabled with tooltip "Pricing engine not yet wired on backend"; drop premium-auto-populate timer; drop "still working" cadence simulator on Pricing tab; replace tab body with explanatory empty state.

2. **Quote-level maker-checker approval-lock.** Backend has no Quote-level approval concept. Convert: approval-related actions (request-approval / approve / reject) visible-but-disabled with tooltip "Quote approval not yet wired on backend"; remove `awaitingApproval` UI-state, the `/awaiting-approval` mock endpoints, the lock overlay, and the `MOCK_ONLY_PATTERNS` carve-out for them. **Keep** role-switcher widget + role-aware action gating in schemas (that's real UX, not a fiction).

3. **Quote → Proposal handoff polling.** Backend creates Proposal synchronously; mock fakes async with 4s timer + frontend polling. Convert: mock returns Proposal immediately on `POST /quotes/:id/finalize` (response includes `proposalId`); frontend stops polling `/proposals/by-quote/:id`; "Open created proposal" action navigates straight to the new id (resolves P2.3).

**Not changing** (already honest): file upload (no UI exists), Plans/Census/Member-Mapping (read-only "Configured/Not configured"), Float reservation (already aligned), pending-breakdown (frontend-only derivation), PAM Member async (real on backend).

**Demo impact** (1 day before demo, accepted by user):
- Pricing tab story is reduced from "watch it compute" to "explanation of where pricing fits when backend wires Rule Engine."
- Maker-checker narrative is reduced from "Maker prepares → Checker approves" to "role-adaptive UI with the approval handoff disabled (deck shows the future state).""
- Quote → Proposal handoff is sharper (sync), no polling banner.

**Plan for execution (this turn):**
1. Audit current locations (mock routes, schemas, ActionBar/tooltip plumbing, overlay components, polling consumers).
2. Convert #1 pricing → tooltip.
3. Convert #2 maker-checker overlay → tooltip + scrub.
4. Convert #3 Q→P → sync.
5. Update tests, ARCH_TRANSITION entries, this log, HANDOFF.
6. `tsc --noEmit` + jest + dev-server smoke against the changed routes.
7. Commit.

**Outcome (this turn):**

- **New schema field** `disabledTooltip?: string` on `BaseActionConfig` (`src/types/widget.ts`). Set on a schema action → ActionBar renders the button visible-but-disabled with that tooltip, **overriding state-gating**. Role-gating still applies (so the right roles see the gap explanation). One mechanism, three uses today: pricing button, approval-flow buttons.
- **Pricing tab (`schemas/tabs/quote/pricing.json`):** dropped `pollSchedule` + `stopWhen`; rewrote tab description to explain backend gap; `request-price` action now carries `disabledTooltip`. Mock route `POST /quotes/:id/request-price` is now a no-op (matches backend's Kafka-emit-no-listener). `QuotePremium` import dropped from the route file.
- **Maker-checker overlay scrub:**
  - `src/lib/maker-checker.ts` — deleted.
  - `quote-detail.json` — removed `clear-approval` action; `send-for-approval` converted to api-mutation with `disabledTooltip`; `submit` added to maker's `roleActions`; `Approve & submit` label simplified to `Submit`. `entityType`/`entityId` props removed from both `quote-detail.json` and `proposal-detail.json` (no longer needed without the maker-checker code path).
  - `src/lib/api-mock/group-pas/store.ts` — removed `approvalOverlay` map, `setApprovalOverlay`/`getApprovalOverlay` exports, `MockProposal.awaitingApproval` field; `MockProposal` is now an alias of `Proposal`.
  - `src/lib/api-mock/group-pas/dtos.ts` — `awaitingApproval` dropped from `MockQuoteDto`/`MockProposalDto` shape and field copy.
  - `src/lib/api-mock/group-pas/http.ts` — `MOCK_ONLY_PATTERNS` regex for `/awaiting-approval` removed; comment updated.
  - `src/app/api/{quotation,issuance}/[[...path]]/route.ts` — `/awaiting-approval` POST/DELETE handlers removed; unused `setApprovalOverlay` import dropped.
  - `src/mocks/group-pas/quotation/quotes.ts` — `MockQuote` is now an alias of `Quote`; `awaitingApproval: true` fixture flag on `QTE-2026-0002` removed.
  - `src/components/widgets/data/CellRenderer.tsx` — `case "awaiting-approval"` removed (was unused after schema cleanup).
  - `src/components/widgets/actions/ActionBar.tsx` — full strip of `awaitingApproval`/`SEND_FOR_APPROVAL_ID`/`CLEAR_APPROVAL_ID` codepath; new `disabledTooltip` rendering logic added.
  - `src/components/widgets/role/RoleSwitcher.tsx` — Maker/Checker descriptions updated to drop the "submits for approval / approves submissions" wording (now "submits to advance state" / "sends to client, accepts, rejects, finalizes").
  - `.env.example` — comment updated to drop `awaiting-approval` from the MOCK_ONLY list.
- **Q→P handoff sync:** `autoCreateProposalFromQuote()` now returns the new (or existing, idempotent) `proposalId`; `quotes/:id/finalize` mock route returns `{ proposalId }` synchronously; `scheduleTransition` import dropped from the quotation route. Quote-detail finalize `successMessage` updated to "Quote finalized; Proposal created in Issuance."
- **Tests:** `src/tests/unit/actions/ActionBar.unit.test.tsx` rewritten — 7 tests covering role-hide, disabledTooltip override, state-gated default tooltip, dispatch behaviour. `npx tsc --noEmit` clean (exit 0). `npx jest src/tests/unit/actions` 7/7 pass.
- **Pre-existing test failures** in `DataTable.unit.test.tsx` and `FormContainer.unit.test.tsx` (56 failures total) confirmed to fail on clean HEAD too — not introduced by this change. Untouched.
- **Docs:** `ARCH_TRANSITION.md` — "Async transition signalling" updated to remove pricing simulator reference; "Quote → Proposal handoff" rewritten as "synchronous"; "Maker-checker UI overlay" rewritten as "Maker-checker — role-adaptive UI only". `CORE_MEMORY.md` — V1 scope-locks + interim-assumptions sections updated to match. `HANDOFF.md` — Active Workstreams gains a "Honesty pass" row; demo posture updated to drop simulator/overlay mentions.

**Memory updated:** `feedback_build_to_expected_scope.md` — rule #6 added: "If the frontend affordance exists but the real backend can't deliver the behavior yet, render disabled with a tooltip explaining the backend gap rather than building a mock simulator."

**Files touched** (commit candidates):
- Code/schemas: `src/types/widget.ts`, `src/components/widgets/actions/ActionBar.tsx`, `src/components/widgets/data/CellRenderer.tsx`, `src/components/widgets/role/RoleSwitcher.tsx`, `src/lib/api-mock/group-pas/{store,dtos,http}.ts`, `src/app/api/{quotation,issuance}/[[...path]]/route.ts`, `src/mocks/group-pas/quotation/quotes.ts`, `src/tests/unit/actions/ActionBar.unit.test.tsx`, `schemas/quote-detail.json`, `schemas/proposal-detail.json`, `schemas/tabs/quote/pricing.json`, `.env.example`. Deleted: `src/lib/maker-checker.ts`.
- Docs: `context/HANDOFF.md`, `context/CORE_MEMORY.md`, `context/ARCH_TRANSITION.md`, this log.

**Demo readiness check** (mock mode, default): unchanged — happy path still works through Quote → Proposal → Policy → PolicyMember. Pricing tab now correctly shows zero premium with a tooltip explaining why. Maker → submit → checker → finalize narrative still works (Maker can submit because backend doesn't actually distinguish, role-switcher adapts the rest of the buttons).

**Next thread should pick up from:**
1. Demo walkthrough Task 5.3 (still gated on user attendance).
2. Two backend questions (full text in earlier "End-of-thread handoff snapshot" entry) — still unsent. The maker-checker question is now extra-relevant since we've explicitly chosen to wait on backend rather than fake the workflow.
3. Cloudflare deploy decision — still open.
4. Pass-2 V1_DEMO_ISSUES open items: **P2.1 confirm-with-input dialog** is the highest-value remaining; P2.5 (still-working banner) is moot now that the polling story is gone; P2.6 (filter-bar reset) verify in walkthrough.
5. Optional polish: `useClientNames()` resolver for proxy-mode list pages.

### 2026-05-07 (continued) — Backend seed script

User wanted scripted seeding so proxy-mode demos aren't stuck with the 3-Acme-Corp / 2-DRAFT-quote skeleton the dev environment ships with. Wrote `scripts/seed-backend.ts` (TypeScript via tsx).

**Constraints surfaced while writing the script (probed live against the dev backend):**

- `POST /quotes` returns a DRAFT quote shell. Decorating it requires a strict order: PUT `/policy-detail` and PUT `/census-file-format` first; only then POST `/plans` (PUT `/plans/:planNo` updates an existing plan and returns "Plan not found" if used to add); finally PUT `/aggregate-census` and PUT `/member-to-plan-mapping`. Wrong order returns confusing "Census file format must be set before submitting" errors on the plan/mapping endpoints.
- `POST /quotes/:id/submit` requires premium ("Estimated premium must be calculated before submitting"). The Rule Engine has no listener (`requestPrice` Kafka emit is a no-op); `Quote.updatePremium()` is a domain method with **no REST endpoint**. **Net: no live quote can transition past DRAFT.** The seed leaves all 9 quotes in DRAFT and skips the submit/finalize chain. Same gap surfaced in UI as disabled-with-tooltip.
- `POST /api/policy-admin/policies` works for direct PAM policy creation (used by backend's own scenarios.sh). Bypasses the Quote → Proposal → Policy workflow entirely. Required body fields: clientId, proposalId (synthetic ok — backend stores verbatim), policyType, dates, premium type, plans, estimatedPremium. Returns `{ policyId, policyNumber }`.
- `POST /api/policy-admin/policies/:id/cancel` works with `{ reason }` body, returns 204.
- `POST /api/policy-admin/policies/:id/members` works with the AddMember body shape from DSL. Returns `{ memberId, memberNumber }`. Members come back PENDING with no premium (Float Management stub), regardless of input — that's a backend stub gap, surfaced in mock fixtures the same way.
- Activation workflow on dev backend: not observed firing for `activationThreshold: 1` policy with 8 members. Either Temporal worker isn't running on dev, or the workflow takes longer than the seed's runtime. Documented in script as "may auto-activate".

**Seed shape (matches local mock fixtures `src/mocks/group-pas/`):**
- 6 clients (Acme Industries / Brightline Tech / Caravel Logistics / Deltawave Solutions / Evergreen Foods / FinHealth — varied industries, mirrors `CLIENTS` mock).
- 9 quotes, all DRAFT, fully decorated (plans, census-file-format, aggregate-census, member-to-plan-mapping, policy-detail). Spread across the 6 clients with varied plan/census shapes.
- 5 PAM policies (1 low-threshold "active intent", 2 PENDING with thresholds 30/50, 1 CREATED, 1 immediately CANCELLED).
- 20 PAM members spread across 3 of the 5 policies (deltawave-CREATED and brightline-CANCEL deliberately empty).

**Run end-to-end against `https://group-pas-dev.anairacloud.com`:** all 40 entities created, all calls 200/201/204. Verified via `GET /quotes/list` (16 total = 5 pre-existing + 2 probe + 9 seeded), `GET /policies/list` (10 total = 5 pre-existing + 5 seeded incl. POL-010 CANCELLED), `GET /policies/<active>/members` (8 members on the active policy).

**Idempotency:** timestamp-suffixed reg numbers (`ACME-{TS_SUFFIX}` etc.) and synthetic proposalIds, so re-runs add fresh entities without uniqueness collisions. Backend exposes no delete-client endpoint, so the seed is append-only — long-term cleanup needs a backend-side tenant flush or DB reset.

**Logs:** every request/response written to `/tmp/keystone-seed/seed-<ISO-timestamp>/<NNN>-<label>.json` for debugging.

**New dev dependency:** `tsx@^4.21.0` (added to `package.json`). New npm script: `seed:backend`.

**Files touched:** `scripts/seed-backend.ts` (new, ~470 LOC), `package.json` + `package-lock.json` (tsx dep + script), `context/HANDOFF.md` (Demo posture section gains a seeding note), this log.

**`tsc --noEmit`:** clean.

**Next thread:** unchanged from earlier — demo walkthrough, backend questions, deploy decision, P2.1 dialog, useClientNames polish. Seed script means proxy-mode demo is now actually demo-able for the Quotation list and PAM modules; Issuance module stays sparse (no Proposals seeded since the only path is via finalized Quotes which we can't produce).

### 2026-05-11 — Schema-driven forms: close modal / navigate back after success (`onSuccess`)

**Bug surfaced by user during a demo run-through:**
1. Create Quote — toast "Quote created" fired but the modal stayed open and the quote table didn't visibly refresh.
2. Issuance → Add Member — toast "Policy member created" fired but the user was left sitting on `/issuance/proposals/<id>/members/new` instead of being returned to the proposal.

**Root cause:** every schema-driven form submits via [`useActionHandler`](../src/hooks/useActionHandler.ts) → `api-mutation` case, which fires `toast.success` + `queryClient.invalidateQueries` but had no schema hook to express "what to do next on success." So the modal couldn't be closed, the user couldn't be navigated, and the pattern was systemic across **27 form schemas** under `schemas/forms/` (initial scan said 19; a follow-up sweep caught 8 more accounting/journal forms with `submitAction: true, type: "api-mutation"` but no `successMessage`).

**Fix (commit `37adbad`):**
- [`src/types/widget.ts`](../src/types/widget.ts) — `api-mutation` variant of `ActionConfig` gains `onSuccess?: ActionConfig[]`. Optional; existing schemas keep working unchanged.
- [`src/hooks/useActionHandler.ts`](../src/hooks/useActionHandler.ts) — anonymous returned dispatcher hoisted to `const dispatch = async (...)` so it can recurse. After the existing `toast.success` + `invalidateQueries` block, loops `action.onSuccess` and `await dispatch(next)` for each entry. Lives inside the same `try` so the existing `catch` keeps error-path semantics untouched — `onSuccess` only fires on resolved mutations.
- 27 `schemas/forms/*.json` — every form with an `api-mutation` submit action got an `onSuccess` entry:
  - Modal/sheet-mounted forms (26): `[{ "type": "trigger-event", "target": "<form-id>" }]`. Overlay id matches form id in [`OverlayProvider.tsx`](../src/components/providers/OverlayProvider.tsx), so `close(target)` dismisses the modal.
  - Page-mounted form (`add-policy-member-form`): `[{ "type": "navigate", "target": "/issuance/proposals/{{proposalId}}" }]`. Page substitutes `{{proposalId}}` server-side in [`src/app/issuance/proposals/[id]/members/new/page.tsx`](../src/app/issuance/proposals/[id]/members/new/page.tsx).

**Why not magic auto-close in the handler:** form-id ↔ overlay-id is a convention, not a guarantee — `add-policy-member-form` already breaks it (page-mounted, not modal). And the page case needs a target route the handler can't infer. Declarative `onSuccess` keeps the contract in the schema, consistent with the rest of the codebase.

**Why not also `onError`:** explicitly chose no — every current form wants "stay open + show backend message" on failure, which already happens. Symmetric API surface with zero callers is the kind of speculative scaffolding [`feedback_build_to_expected_scope.md`](../../../.claude/projects/-Users-seriousblack-dev-anaira-sandbox-keystone-ui/memory/feedback_build_to_expected_scope.md) flags against. Decision recorded in user dialogue this session; trivial to add later if a real `onError` case shows up.

**Verification (preview against mock mode):**
- Quote create: `POST /api/quotation/quotes → 200` immediately followed by `GET /api/quotation/quotes/search → 200` (cache invalidated), and `role="dialog"` gone from DOM. Full success path proven.
- Error path: add-member POST returned `400 "proposal has no policy yet"`; URL stayed on `/members/new`, no toast spam — `onSuccess` correctly skipped on failure.
- Add-member success path: code-path equivalent to the verified quote case (same `dispatch` function, different switch arm). Couldn't drive a 2xx end-to-end without a proposal in `POLICY_CREATED` state; left for the demo walkthrough.
- `tsc --noEmit`: clean. `npm run lint` errors out because the repo script `next lint` interprets its CLI as a directory — pre-existing repo issue, not caused by this change.

**Files touched (commit `37adbad`):**
- Code: `src/types/widget.ts`, `src/hooks/useActionHandler.ts`.
- Schemas (27): all `schemas/forms/*-form.json` files with an `api-mutation` submit action — see `git show 37adbad --stat`.

**Auto-generated artifact:** `schemas/forms/index.ts` is regenerated on `predev`/`prebuild` via [`scripts/generate_form_index.mjs`](../scripts/generate_form_index.mjs) and is gitignored. No manual touch needed; next `npm run dev` picks up the schema edits.

**Next thread should pick up from:** unchanged from prior entries (demo walkthrough, backend questions, deploy decision, P2.1 dialog). This fix unblocks every form-driven create/edit flow in the demo — modals now actually close, the issuance add-member flow now actually returns to the proposal.

### 2026-05-11 — archV1 layered execution plan + per-track AI agent briefings

User asked to convert the archV1 design (`docs/archV1/00..13`) into an executable build plan that can be parallelized across multiple AI coding agents, with schema delivery / materialization explicitly deferred — schemas keep being served from `/schemas/` via `src/lib/schemaResolver.ts` as today. Drafted plan, ran 4 review agents in parallel (completeness vs archV1, task distribution / merge-risk, per-task AI context sufficiency, clarity / ambiguity), then rewrote the plan against their findings.

**What changed:**
- New plan at [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md](../docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md). Pre-decided technical choices (Zustand, zod, Vitest, Playwright, wildcard barrels per subdir, wrap-don't-refactor existing widgets), 11 tracks, staged pilot (10a read-only → 10b full workflow), file-ownership table guaranteeing no cross-track writes.
- 12 self-contained per-track briefings under [docs/archV1/tracks/](../docs/archV1/tracks/), each with exact TS signatures it exports, worked examples, edge cases, allowed deps, DoD with concrete `yarn test ...` commands, and spec references cited as `file:line` for verifiability.
- Kickoff prompt template at [docs/archV1/tracks/AGENT-KICKOFF-TEMPLATE.md](../docs/archV1/tracks/AGENT-KICKOFF-TEMPLATE.md) — wraps each briefing with hard constraints (owned-dir-only, no new deps, no `any` in exports, no skip-to-green), STOP conditions, and DoD reiteration.
- README/index at [docs/archV1/tracks/README.md](../docs/archV1/tracks/README.md).

**Gaps the review agents caught that the final plan addresses:**
- Missing cross-track interface specs (every track now publishes the exact TS shape downstream tracks consume).
- Missing scope items from archV1: `flow.*` scope, access policy enforcement, schema version validator, `$t` + locale formatters, `announce()`, persistence `clearOn` triggers, test-harness contracts. All folded into the relevant tracks.
- Pilot too ambitious as a single integration: split into 10a (read-only) and 10b (workflow).
- Root `src/lib/runtime/index.ts` merge contention: wildcard re-export, written once by Track 0, untouched after.
- Maker-checker overlay (`src/lib/maker-checker.ts` — already deleted in honesty pass) and runtime devtools explicitly listed as out-of-scope.

**What this is NOT yet:** code. This commit ships the build plan only. Layer 1 implementation hasn't begun. Layer 2 (porting the 26 existing schemas) only starts after Track 10b passes. Layer 3 (schema delivery / materialization) is deferred.

**Files committed in `6e91be8` (pushed to origin `feat/new-buisiness`):** 15 new files under `docs/archV1/`, +2533 lines, no code changes. Other in-flight working-tree changes (the V1 demo schema edits, widget tweaks, the untracked `12-ARCHITECTURE-FREEZE-DECISIONS.md`) left alone.

**Next thread (archV1 stream specifically):** hand `tracks/00-workspace-scaffold.md` through the kickoff template to an agent to lay the `src/lib/runtime/` scaffold, then fan out Tracks 1–9 per the dependency graph at [14:99](../docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md#L99). Coordinator owns Tracks 0, 1, 10a, 10b. The Group PAS V1 demo stream is unchanged — both streams now run in parallel.

### 2026-05-11 (continued) — Audit pass + maker-checker overlay restored

User asked for an audit on Group PAS V1 against the Keystone design deck v2 and the V1 issues backlog. Five parallel Explore agents covered ActionBar state/role gating, detail-page structure, mock-vs-proxy honesty, empty/loading/error state coverage, and design-token drift. Findings synthesized into a 14-item P1/P2/P3 punch list; user applied inline calls on every item; landed as 5 grouped commits on `feat/new-buisiness`.

**Single biggest reversal:** the 2026-05-07 honesty-pass removal of the maker-checker overlay (this log → "New tighter mock rule" entry) was undone for the Quote/Proposal flow. Rationale from user: with real auth (Keycloak/Cerbos) not shipping, the role-switcher + `awaitingApproval` overlay is the only way to demo segregation-of-duties on the Quote workflow. The "don't simulate behavior backend can't deliver" rule still holds in principle — the overlay is restored as **transitional scaffolding** with a documented removal trigger (backend extends the PAM approval pattern to Quote via `RequestQuoteApprovalCommand` + central Approval module, or Cerbos lands and `Quote.submit()` becomes role-aware on the server). Surface fully grep-able for the eventual deletion. See [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md) → "Maker-checker — UI-only overlay (transitional, until auth lands)" — the section documents both the 2026-05-07 removal and 2026-05-11 restoration so the reasoning trail stays intact.

**Restored surface (commit `a26feac`):** `src/lib/maker-checker.ts` (new helper), `awaitingApproval` field on `MockQuote`/`MockProposal` + carried through DTOs, standalone `approvalOverlay` Map keyed by `entity:id` in `src/lib/api-mock/group-pas/store.ts` (globalThis-pinned), `/awaiting-approval` POST/DELETE handlers in both module routes, `MOCK_ONLY_PATTERNS` carve-out so it works in proxy mode, `awaiting-approval` cell renderer back with a pulsing warning dot, ActionBar overlay branches (Maker locked with "Awaiting checker approval" except Withdraw / Clear; Checker's approval-flow actions hidden until Maker sends), RoleSwitcher copy referencing "approval", QTE-2026-0002 seeded with `awaitingApproval:true` for the demo. ActionBar unit tests rewritten — 8/8 pass.

**Other audit items shipped:**
- **Commit `b6f0396` — refactor(tokens):** added `--warning` / `--warning-foreground` and `--success` / `--success-foreground` semantic tokens to [src/app/globals.css](../src/app/globals.css) (light + dark + `@theme inline`). Swapped hardcoded palettes in `ErrorBanner` (red-* → destructive), `MetricCard` trend (green/red → success/destructive). `Stack`/`Grid` layouts moved from inline `style={{ gap: \`${gap*0.25}rem\` }}` to a static `gapClass()` lookup (new `src/components/widgets/layout/gap-tokens.ts`) so the Tailwind JIT can resolve. Primitive cleanup: `badge` `text-[11px]` → `text-xs`, `tooltip` `rounded-[2px]` → `rounded-sm`.
- **Commit `138d225` — fix(group-pas):** `schemas/tabs/quote/pricing.json` ActionBar previously hardcoded `state: "DRAFT"`, would have shown the Request-price button as DRAFT-state on any quote; now reads live state via `dataSource` + `stateField:"status"`. `schemas/policy-member-detail.json` `archive` action added to Checker roleActions (Task 1.9 table assigns Reject + Archive to both Checker and Ops; was previously Ops-only).
- **Commit `a26feac` also bundles:** `expire` action added to Quote `SENT_TO_CLIENT` stateActions (spec'd in plan Task 2.3, was missing). `view-proposal` moved out of the ActionBar's `FINALIZED` stateActions and into the page-header's `actions` array as "Open in Issuance" — FINALIZED is now truly terminal in the action map, matching the role-action-table spec. Fetch-error surfacing added to `ActionBar` and `ReasonBanner`: when the widget owns its `useSmartQuery` and `.error` is truthy, render an inline alert instead of a half-populated shell. Verified by hitting `/quotation/QTE-NONEXISTENT` → "Actions unavailable — Failed to fetch: Not Found".
- **Commit `63c4b08` — feat(group-pas):** empty-state config added to `schemas/tabs/proposal/members.json` and `schemas/tabs/policy/members.json` (same shape used by the top-level list pages). New shared `<DetailPageSkeleton>` component at `src/components/layout/DetailPageSkeleton.tsx` replaces six per-route `<Suspense fallback="Loading…">` strings — gives the page-header + key-value-grid + action-bar shape a coherent skeleton.
- **Commit `acb89c6` — chore:** `npm run typecheck` script added (`tsc --noEmit`). Audit also asked for a pre-commit hook running lint + typecheck + test; **deferred** because the existing lint surface has 5,083 errors / 70k warnings (mostly `@typescript-eslint/no-explicit-any` + Storybook renderer-import) and the test suite has 56 pre-existing failures. Gating commits today would force `--no-verify` on every commit. Tracked in [docs/V1_DEMO_ISSUES.md](../docs/V1_DEMO_ISSUES.md) "Deferred infrastructure" for pickup once the lint/test debt is brought down or `lint-staged` is wired.

**Verification:** `tsc --noEmit` clean throughout. `npm test`: 56 pre-existing failures unchanged, 69 passing (was 68 — gained one from the rewritten ActionBar overlay tests). No new regressions. Manual smoke against fixtures in mock mode (`.env.local` temporarily moved aside, restored after) via Claude Preview MCP — confirmed:
- Maker on QTE-2026-0002 sees Edit + Send-for-approval locked with "Awaiting checker approval"; Withdraw enabled.
- Checker sees Clear-approval + Approve & submit enabled; state-locked actions tooltipped; Maker-only actions hidden.
- Mark-expired present in Checker bar (state-disabled in DRAFT, would enable in SENT_TO_CLIENT).
- "Open in Issuance" in page-header instead of ActionBar.
- Pricing tab Request-price renders with `disabledTooltip` text (proves `stateField` resolved state correctly — otherwise we'd see the generic "Not available in this state").
- `/quotation/QTE-NONEXISTENT` surfaces the error inline rather than rendering an empty/half toolbar.
- Archive enabled for Checker on REPAIR_PENDING PolicyMember.
- ReasonBanner computed styles confirm `border-warning/40 bg-warning/10 text-warning-foreground` resolving to the new tokens with correct contrast.

**Order matters in the commit graph:** design-token additions (`b6f0396`) had to land before the overlay restore (`a26feac`) because the restored `awaiting-approval` cell renderer uses `bg-warning`, which only resolves once the token exists in `@theme inline`. Dependency order: `acb89c6` (chore) → `b6f0396` (tokens) → `a26feac` (overlay + errors) → `138d225` (pricing + archive) → `63c4b08` (empty-state + skeleton).

**Notable new files:** `src/lib/maker-checker.ts`, `src/components/widgets/layout/gap-tokens.ts`, `src/components/layout/DetailPageSkeleton.tsx`. **Doc updates:** `context/ARCH_TRANSITION.md` (maker-checker section rewritten), `docs/V1_DEMO_ISSUES.md` (Deferred-infrastructure section added).

**No Playwright in the repo.** User asked for Playwright tests; flagged honestly that `playwright` is installed as a dep but there's no `playwright.config.ts`, no `.spec.ts` files. Did the smoke via Claude Preview MCP instead. Pre-commit hook + Playwright bootstrap are both queued in the deferred-infrastructure section.

**Next thread should pick up from:** demo walkthrough Task 5.3 still gated on user attendance. Backend questions (Quote-level approval pattern, file upload S3 wiring) still drafted. Cloudflare deploy decision still pending. Pass-2 polish items (P2.1, P2.5, P2.6). New backlog from this pass: pre-commit hook + the lint/test cleanup it implies; Playwright bootstrap.

### 2026-05-11 → 2026-05-12 — Off Cloudflare, onto AWS (K3s + ECR + Helm), auto-deploy live

Cloudflare Workers deploy was blocked: the OpenNext build emits an 8.4 MB worker, free-tier limit is 3 MiB. Migrated UI to a container-on-K3s setup using existing Anaira infra (the same K3s box hosting the backend). Site now live at https://keystone-ui-dev.anairacloud.com, auto-deployed on every push to `feat/new-buisiness`.

**Path chosen:** cherry-pick the deploy artifacts from saigita's stalled [PR #28 (`deployment/ci-cd`)](https://github.com/Anaira-AI/keystone-ui/pull/28) (Docker + Helm + ECR push workflow), drop the bits that were quality-debt or out of scope, and fix the one real bug (env-var plumbing). Rebuild-from-scratch was rejected — deadline was today/tomorrow and saigita's chart had already been iterated on for a month.

**What did NOT come over from PR #28:** the eslint rule relaxation (errors → warnings, `no-explicit-any` off, etc.), the `|| true`-masked CI steps, the `useFormContainer.ts` edit, the deletion of `wrangler.jsonc` / `open-next.config.ts` / `cloudflare-env.d.ts` / the `deploy`/`upload`/`preview`/`cf-typegen` scripts — Cloudflare files kept as fallback per user direction until AWS deploy is verified live (it now is; cleanup is a separate decision).

**Commit `6bf8e62` — feat(deploy): AWS container deploy path (Docker + Helm + ECR)**
- `Dockerfile` (multi-stage Node 24-alpine, standalone Next.js), `.dockerignore`, `docker-compose.yml`.
- `helm/keystone-ui/`: `Chart.yaml`, `templates/{deployment,service,ingress,_helpers.tpl}`, single `values.yaml` (no env split — user asked for one env for now).
- `.github/workflows/publish.yml` (workflow_dispatch only at this point).
- `next.config.ts`: `output: 'standalone'` (required for the Dockerfile's `.next/standalone` copy); CF dev import guarded behind `NODE_ENV === 'development' && !DOCKER_BUILD` with a soft-fail catch so a slim runtime image without `@opennextjs/cloudflare` still works.
- `package.json`: `docker:up`/`docker:down`/`docker:logs`/`docker:rebuild` scripts added; CF scripts kept.
- **One real bug fix on top of saigita's chart:** the Helm chart only injected `NODE_ENV`/`PORT`/`HOSTNAME`. `GROUP_PAS_BACKEND_URL` is server-side (see [`src/lib/api-mock/group-pas/http.ts:78`](../src/lib/api-mock/group-pas/http.ts#L78) + the three catch-all proxy routes) — without it, pods would silently serve mock data in prod. Now baked into `values.yaml` (`https://group-pas-dev.anairacloud.com`) and rendered in `deployment.yaml`.
- **`NEXT_PUBLIC_BASE_URL` removed entirely** rather than plumbed: the sole consumer (`src/app/policy-admin/members/by-policy-member/[policyMemberId]/page.tsx`) constructed an absolute URL because Node's server-side `fetch()` has no default origin. Replaced with `headers()` to derive origin from the incoming request (`x-forwarded-proto` + `host`). No config needed in dev, Docker, or behind ALB.

**Commit `91348df` — ci(publish): trigger on push + pull_request, not just workflow_dispatch**
- `workflow_dispatch` alone requires the workflow file on the default branch to appear in the Actions UI. Added `push: [main, feat/new-buisiness]` + `pull_request: [main]` so the build fires without first landing on main. Image-tag step rewritten to fall back to `github.head_ref` / `pull_request.head.sha` (on pull_request, `GITHUB_REF`/`GITHUB_SHA` are the merge-test ref/commit, useless as a tag).
- First successful image: `149916142454.dkr.ecr.ap-south-1.amazonaws.com/anaira/keystone-ui:feat-new-buisiness_91348dfd`. DevOps deployed it manually that day.

**Commit `acba003` — ci(deploy): add deploy-dev job + values-dev.yaml for K3s dev environment** (next morning)
DevOps sent [`docs/planning/keystone-ui-deployment-guide.md`](../docs/planning/keystone-ui-deployment-guide.md) — "Option A: self-managed CD" — with the exact `values-dev.yaml` template and a `deploy-dev` job pattern that uses a `K3S_KUBECONFIG` GitHub secret (set by infra on 2026-05-12) instead of AWS IAM/OIDC for cluster auth.
- `helm/keystone-ui/values-dev.yaml` new: `service.type: NodePort` (required for ALB `target-type=instance` — overrides the `ClusterIP` in base `values.yaml`); ALB ingress annotations including `group.name: anaira-dev-tools` (shared ALB), wildcard ACM cert ARN, `healthcheck-path: /`, `success-codes: "200,302"`; hostname `keystone-ui-dev.anairacloud.com`; `ecr-secret` for `imagePullSecrets`.
- `.github/workflows/publish.yml` → renamed to `ci-cd.yml`. `build` job now exports `image_tag` as a step output. New `deploy-dev` job: installs helm, writes `K3S_KUBECONFIG` to `~/.kube/config`, `helm upgrade --install keystone-ui ./helm/keystone-ui --namespace dev-env -f helm/keystone-ui/values-dev.yaml --set image.tag=${{ needs.build.outputs.image_tag }}`, then a `curl -w "%{http_code}"` smoke test against the URL. Gated to `github.event_name == 'push' && github.ref == 'refs/heads/feat/new-buisiness'` (no PR deploys, no main deploys until promotion is wired).
- First end-to-end run: build 3m31s → deploy 30s → smoke 200 in 16s. Wall-clock 4m14s. Image `feat-new-buisiness_acba0036` deployed, helm release `keystone-ui` REVISION 2 in namespace `dev-env`.

**GitHub repo configuration that was already in place (set 2026-04-16 by saigita while iterating PR #28):**
- `vars.ECR_AWS_REGION = ap-south-1`
- `vars.ECR_REGISTRY = 149916142454.dkr.ecr.ap-south-1.amazonaws.com`
- `vars.ECR_REPOSITORY = anaira/keystone-ui`
- `vars.STAGING_AWS_IAM_ROLE_ARN = arn:aws:iam::149916142454:role/GitHubActions-Nonprod` (used only by the build job for ECR push)
- `secrets.K3S_KUBECONFIG` (added 2026-05-12 by infra) — kubeconfig file content; deploy job writes it to `~/.kube/config` and helm just works. No AWS creds needed for the deploy step.

**AWS-side infra (owned by the DevOps head, no per-deploy work needed):**
- K3s single-node, EC2 `i-0360bd69f2a893af4`, namespace `dev-env`.
- AWS Load Balancer Controller installed; shared ALB tagged `anaira-dev-tools` — each service adds its own host rule to the existing ALB via the group annotation rather than provisioning a new one (~$20/mo saved per service).
- ACM wildcard cert `*.anairacloud.com` — anything `*.anairacloud.com` pointed at the ALB is HTTPS automatically.
- Route53 A-alias `keystone-ui-dev.anairacloud.com` → shared ALB.
- `ecr-secret` (kubernetes.io/dockerconfigjson) pre-created in `dev-env` namespace.

**Rollback path:** `helm rollback keystone-ui -n dev-env` (release history is kept by helm; revisions are durable). Or push a known-good commit to retrigger forward. ECR tags are immutable so old images stay available; tag pattern is `feat-new-buisiness_<short-sha>`.

**Migration note from the deployment guide:** infra team plans to replace this "self-managed CD" path with reusable `devops-platform` workflows that handle ECR push + helm deploy + smoke + environment promotion + SonarQube + pre-commit hooks. **No action needed now — infra will guide the migration.** When that lands, expect `.github/workflows/ci-cd.yml` to be replaced by a `uses:` reference.

**Cloudflare files kept on `feat/new-buisiness` for now (intentionally not deleted):** `wrangler.jsonc`, `open-next.config.ts`, `cloudflare-env.d.ts`, `@opennextjs/cloudflare` dep, `deploy`/`upload`/`preview`/`cf-typegen` scripts in `package.json`. Now that AWS is verified live, removing them is a low-risk follow-up but the option is being left open in case AWS needs to be paused.

**Branch dance worth noting for the next AI:** mid-session the user switched local working branches (`feat/new-buisiness` → `extract/schema-engine`) while another change was underway. The deploy-related edits I'd staged on the wrong branch were stashed, then recreated cleanly on `feat/new-buisiness` (rather than popping the stash, since `next.config.ts` had diverged on the two branches). Lesson: when the user shares a deployment-guide-style doc, double-check `git branch` before editing — particularly when multiple workstreams are interleaved.

**Files committed (3 commits, all on `feat/new-buisiness`, pushed):** `6bf8e62`, `91348df`, `acba003`. Together: 16 new files + 3 edits.

**Next thread should pick up from:** Cloudflare-cleanup decision (delete the leftover files / scripts / dep, or keep as fallback indefinitely). PR #56 (`feat/new-buisiness` → `main`) is open and now has a working CD pipeline gating on it. The CI workflow's lint/test masking (`|| true`, tests commented out) is unrelated to deploy and still pending. Infra team's planned migration to `devops-platform` reusable workflows will replace `.github/workflows/ci-cd.yml` eventually.

**Follow-up (same day):**
- Commit `26fba8d` — added `paths-ignore` to both `push` and `pull_request` triggers in `.github/workflows/ci-cd.yml` for `**/*.md`, `docs/**`, `context/**`, `proposals/**`, `.gitignore`, `LICENSE`. Docs-only commits no longer fire the ~4-min build+deploy cycle.
- **Stop hook installed at `.claude/settings.json`** (gitignored per repo convention — personal scope, not team-shared) that emits `{"decision":"block","reason":...}` when there are commits on the current branch since the last commit to `context/SESSION_LOG.md` that touched files outside `context/`. Silent on uncommitted-only work and on pure Q&A turns. Reason text points the AI back to the resume protocol in `context/HANDOFF.md`. Invariant: hook fires after code is committed but before logs are updated; goes silent again once a follow-up commit touches `context/SESSION_LOG.md`. Replaces the manual "update repo context logs" nudge in every session.

### 2026-05-12 — Two-panel navigation (icon rail + grouped submenu) — Commit 1 of 2

Designer mockup (Motor Insurance "Decisions" screen) showed a VSCode-style two-tier nav: narrow icon rail + wider submenu panel with uppercase section headers. User asked to adopt the **pattern**, not the mockup's specific items. Replaced the single nested `AppSidebar` with a new dual-panel chrome and migrated both mocked portals (group-insurance, auto-claims) to it.

**Approach decisions captured during planning** (via AskUserQuestion):
- Two-panel rail + grouped submenu — replaces single nested sidebar (no `SideBarType.NESTED` consumers left).
- `group?: string` field on `NavigationItem` for the eventual section labels (kept ungrouped for this commit — see below).
- Both portals migrate now (no opt-in fallback), since they're mocks anyway.
- Rail expanded by default, Ctrl+B still collapses to icon-only.
- Rail items follow the V1 spec modules — **not** the mockup's labels. Rationale: user pushed back on the first plan that invented group labels and rail items off-screenshot. Spec-aligned rail uses Home / Quotation / Issuance / Policy Admin / Accounting (from [docs/group-pas-v1-plan.md:119](../docs/group-pas-v1-plan.md) Task 0.2 + [docs/spec/](../docs/spec/) domains).

**Grouping deferred:** the `group` field exists on the type and is honored by `SubmenuPanel`, but no mock config sets it yet. The open question is whether module-detail tabs (e.g. Quotation → Proposal → Members) should appear as submenu rows under uppercase group labels — answered in a separate session once that pattern is decided. For now the submenu is a flat list per rail item.

**Commit-strategy decision:** split into two sequential commits on `feat/new-buisiness` so dev deploys can live-test each independently. Commit 1 is purely additive on the runtime path (old `AppSidebar.tsx` is left in the tree unreferenced) — if a regression shows up on dev, a single revert undoes it without touching the legacy component. Commit 2 deletes `AppSidebar.tsx`, removes `SideBarType.NESTED` / `UNGROUPED`, and is held until Commit 1 is live-verified.

**Commit `4de1efd` — feat(nav): two-panel navigation (icon rail + submenu):**
- [src/shared/types.ts](../src/shared/types.ts): added `SideBarType.DUAL_PANEL` and optional `group?: string` on `NavigationItem`. `NESTED` / `UNGROUPED` kept for Commit 2.
- New folder [src/components/navigation/](../src/components/navigation/):
  - `DualPanelNav.tsx` — top-level shell, derives active rail item from `usePathname()` via `itemMatchesPathname`, renders `<IconRail/>` + (when the active item has `subMenuItems`) `<SubmenuPanel/>`. Owns no state.
  - `IconRail.tsx` — 80px expanded / 48px collapsed (reads `useSidebar().state`). Icon stacked over label. Active item gets `bg-background shadow-sm ring-1` over `bg-sidebar`.
  - `SubmenuPanel.tsx` — 240px column. Uses `groupSubItems` helper to bucket items by `group` (preserving first-seen order); rail items without any `group` set render as a single ungrouped list.
  - `groupSubItems.ts` — pure helper, easy to unit-test.
  - `navHelpers.ts` — `resolveIcon`, `isActive`, `itemMatchesPathname`, `firstNavigableUrl`. `IconComponent = ComponentType<SVGProps<SVGSVGElement>>` type used to avoid the lucide `createLucideIcon`-factory leakage TS hit on the first attempt.
- [src/app/layout.tsx](../src/app/layout.tsx): swapped `<AppSidebar />` → `<DualPanelNav />`. `SidebarProvider` left untouched — `IconRail` still uses the existing Ctrl+B collapse state.
- [src/mocks/original/group-insurance/config/app-config-mock.ts](../src/mocks/original/group-insurance/config/app-config-mock.ts): replaced 250+ lines of placeholder menu (Workflow, Corporate Clients, Channel Maintenance, System Management, Approval — none had backing routes) with the spec-aligned rail. `sideBarType: DUAL_PANEL`.
- [src/mocks/original/auto-claims/config/app-config-mock.ts](../src/mocks/original/auto-claims/config/app-config-mock.ts): same shape, 4 flat rail items (Home, Claims, Reports, Settings). `sideBarType: DUAL_PANEL`. Aspirational routes preserved — only `/claims` exists today.

**Verification via Claude Preview MCP at 1280×800:**
- Rail rendered all 5 group-insurance items; "Home" active with white-tile treatment on `/`.
- `/quotation` → submenu (240px) shows Quotations + Member Quotes; "Quotation" active on rail, "Quotations" active in submenu.
- `/policy-admin/policies` deep-link → "Policy Admin" active on rail, "Policies" active in submenu, Clients also listed.
- `/accounting` → submenu shows Accounting + Payout.
- Ctrl+B keydown collapses rail to 48px, labels hidden; second press restores to 80px.
- Auto-claims config fetched via `/api/config/app?appId=auto-claims` returns `sideBarType: DUAL_PANEL` + 4 items, confirmed.
- Layout fits viewport: rail 80 + submenu 240 + main 954 = 1274px in a 1280px viewport.
- `tsc --noEmit` clean (after one fix on the IconComponent type).
- No console warnings or errors during navigation.

**Files NOT touched in this commit (per plan, removed in Commit 2):** `src/components/AppSidebar.tsx` (left unreferenced), `SideBarType.NESTED` / `UNGROUPED` enum members.

**Next:** Commit 2 once https://keystone-ui-dev.anairacloud.com renders the new chrome correctly. Commit 2 scope: delete `AppSidebar.tsx`, remove the two stale enum members, sweep references in [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](../docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md) and [docs/group-pas-v1-plan.md:116](../docs/group-pas-v1-plan.md). After Commit 2 is live-tested clean, merging `feat/new-buisiness` → `main` becomes a separate piece of work.

**Open question for the next session (intentionally deferred per user):** does Quotation detail's tab structure (Plans / Census / Mapping / Pricing) belong in the submenu panel under uppercase group labels, or stay as in-page tabs? Today's commit assumes in-page tabs and leaves the submenu flat with module-list links only.

### 2026-05-12 (continued) — Commit-hygiene rule + two-panel nav Commit 2

After Commit 1 (`4de1efd`) deployed cleanly to https://keystone-ui-dev.anairacloud.com (live-verified via `gh run view 25720296930` — both `build` and `deploy-dev` jobs green in 2m51s; and via `curl` of the dev URL HTML, which references the new `DualPanelNav` client component and no `AppSidebar`), user flagged a workflow concern: when docs/context updates get bundled with src changes, the CI deploy graph becomes ambiguous (a follow-up docs-only push doesn't move the deploy SHA, so "what's live" requires walking back the commit history). Asked me to make this a standing rule.

**Commit `92dd2b6` — docs(context): split src and docs commits — no mixed deploy/no-op:**
- New "Commit hygiene — split src from docs" section in [context/CORE_MEMORY.md](CORE_MEMORY.md): never bundle `paths-ignore` paths (`docs/**`, `context/**`, `proposals/**`, `**/*.md`, `.gitignore`, `LICENSE`) with non-ignored changes (`src/**`, `schemas/**`, `helm/**`, `.github/**`, root configs) in the same commit. Land context updates as separate follow-up commits — they'll be skipped by `paths-ignore` as designed, keeping the deploy graph readable.
- Carve-out preserved: the existing "in the same commit" guidance under Mandatory logging protocol still applies to keeping `proposals/PROP-*.md` frontmatter grouped with `HANDOFF.md` (both are under `paths-ignore` — that group is fine).

**Commit `7d8a913` — chore(nav): remove legacy AppSidebar; collapse SideBarType enum** (src-only, triggers deploy):
- Deleted `src/components/AppSidebar.tsx` (no remaining importers).
- [src/shared/types.ts](../src/shared/types.ts): removed `SideBarType` enum entirely. Since `DUAL_PANEL` was the only consumer, the `sideBarType` field on `AppConfig.navigation` was also removed — the runtime always uses `DualPanelNav`. Net: 7 lines removed from the type file.
- Both mock configs ([group-insurance](../src/mocks/original/group-insurance/config/app-config-mock.ts), [auto-claims](../src/mocks/original/auto-claims/config/app-config-mock.ts)) dropped the `SideBarType` import and the `sideBarType:` line.
- Pre-commit sweep: `grep -rn "AppSidebar|SideBarType|sideBarType" src schemas docs` returned zero hits.
- Verification: `tsc --noEmit` clean; preview server still renders rail (80px, 5 items) + submenu (240px) on `/quotation` with active states on both rail and submenu; no console / server errors.

**Commit (this one, docs-only) — docs(context): log Commit 2 + sweep AppSidebar refs in docs:**
- This entry in [context/SESSION_LOG.md](SESSION_LOG.md) and the Active Workstreams row in [context/HANDOFF.md](HANDOFF.md).
- [docs/CODEBASE_OVERVIEW.md](../docs/CODEBASE_OVERVIEW.md): file-tree comment updated from `AppSidebar.tsx` → `navigation/`.
- [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md): two references at Task 0.2 (line 116) and Task 1.9 (line 266) repointed from `src/components/AppSidebar.tsx` to `src/components/navigation/`.

**Two-panel nav workstream status:** Commit 1 (feat) and Commit 2 (cleanup) both shipped and live on `feat/new-buisiness`. Merging to `main` is a separate decision (not blocked by anything in this stream). Open design question about module-detail tabs in the submenu still deferred to a future session per user.

### 2026-05-12 (continued) — Two-panel nav cherry-picked to main as PR #58

User asked for a clean PR against `main` carrying just the two-panel nav change. First attempt (`git cherry-pick 4de1efd 7d8a913` onto a fresh `feat/two-panel-nav` branch off `origin/main`) hit conflicts in `src/app/layout.tsx` and the group-insurance mock config — because `feat/new-buisiness` is 64 commits ahead of `main` and the nav commits were authored alongside unrelated changes (`RoleProvider`, `RoleSwitcher`, `Toaster`, animation wrapper). Pulling those in would have polluted the PR. Aborted and rebuilt the change manually against `main`.

**PR #58 — feat(nav): two-panel navigation (icon rail + grouped submenu)** — single clean commit `025e719` on `feat/two-panel-nav` (off `origin/main`):
- `src/shared/types.ts`: `NavigationItem` gains `group?: string`; `SideBarType` enum + `sideBarType` field removed entirely (one variant only).
- New `src/components/navigation/` folder copied verbatim from feat branch (`DualPanelNav`, `IconRail`, `SubmenuPanel`, `groupSubItems`, `navHelpers`).
- `src/app/layout.tsx`: minimal two-line edit — import swap + `<AppSidebar />` → `<DualPanelNav />`. Everything else on main's layout (no `RoleProvider`/`Toaster` yet) stays untouched.
- Both mock configs (`group-insurance`, `auto-claims`) replaced with the spec-aligned versions.
- `src/components/AppSidebar.tsx` deleted.
- Doc refs in `docs/CODEBASE_OVERVIEW.md` and `docs/group-pas-v1-plan.md` repointed from `AppSidebar.tsx` → `navigation/`.
- `tsc --noEmit` clean after wiping stale `.next/dev/types/validator.ts` cache (the validator had references to routes only on the feat branch).
- Preview verified at 1280×800: rail renders all 5 group-insurance items, Home active.

**Diff stats:** 12 files, +290 / −362 (net −72; the legacy mock had 200+ placeholder menu items that never had backing routes).

**Heads-up flagged in PR description:** the spec-aligned rail points at `/quotation`, `/issuance/proposals`, `/policy-admin/clients`, `/policy-admin/policies` — none of which exist on `main` today. The V1 plan ([Task 0.2](../docs/group-pas-v1-plan.md)) explicitly accepts this: "clicking each navigates to a placeholder page (404 acceptable until pages exist)." IA lands first so Phases 2/3/4 can ship into it. Routes that DO work post-merge on main: `/` and `/accounting` (+ Payout via Accounting's submenu).

**PR URL:** https://github.com/Anaira-AI/keystone-ui/pull/58

**Process note worth keeping:** when the feature branch is far ahead of `main` and you only want a slice on main, **don't** `git cherry-pick` — it drags in conflicts from unrelated changes that happen to touch the same files. **Do** create a fresh branch off `origin/main`, copy the relevant files via `git show <feat-sha>:path > path`, manually apply the minimal source edits (import + JSX swap), and commit as one focused commit. That keeps the PR diff aligned with what a reviewer expects to see for the feature.

### 2026-05-12 (continued) — Schema-engine extraction PR #57 (separate from #58)

Second slice taken to `main` in the same session: the schema-runtime / widget-engine extensions that piggybacked on `feat/new-buisiness` for Group PAS V1 but are useful to any future schema-driven module. User asked for these to land separately so other teams can adopt the engine without inheriting Group PAS mocks, role overlay, or in-flight state machine. Plan file: `~/.claude/plans/read-the-context-logs-starry-sketch.md`.

**Branch:** `extract/schema-engine` off `origin/main` (03c9b7d). 13 commits, **+1591 / −85** across 55 files, all engine-layer. Negative-leakage check passes (no files under `src/lib/api-mock/`, `src/mocks/group-pas/`, `src/types/group-pas/`, `src/lib/api/{quotation,issuance,policy-admin}.ts`, `src/lib/maker-checker.ts`).

**Scope (per user decision):** "pure-engine commits only" widened to also carry the new schema-driven widgets (`ActionBar`, `StateBadge`, `ReasonBanner`, `RoleSwitcher`) with light refactors so they ship domain-agnostic — see refactor commits below.

**Layer 1 — runtime extensions (cherry-pick with conflict surgery):**
- `bba4b67` (`5b4b0ab` ← `useSmartQuery.stopWhen` + widget types). Dropped doc payload (`docs/spec/**`, `docs/planning/**`, `context/*`).
- `c30ba14` (`17e4efc` ← poll backoff + Spring-default errors + STANDARD_POLL_SCHEDULE).
- `5097867` (`483f93b` ← `select.dataSource` + `optionLabel`/`optionValue`).
- `7a5582e` (`f1611f6` ← KeyValueGrid `parseJson`/`subPath`/`nestedParseAt`/`list`/`presence` cell types). Dropped Group PAS `schemas/tabs/quote/*.json` hunks.
- `4f81a4f` (`97a8caa` ← KeyValueGrid nested accessors + raw-JSON cleanup). Dropped all Group PAS `schemas/*` hunks.
- `947b79e` (`b6f0396` ← semantic warning/success tokens + `gap-tokens.ts`).
- `4710fe1` (`32efd3a` ← native `<Toaster />` + `useActionHandler` toast wiring + Spring error envelope parsing).
- `0077520` (`37adbad` ← `onSuccess[]` chaining on `api-mutation` + 19 accounting/event/journal/period/posting/payout form schemas). Dropped 4 Group PAS form hunks (`add-policy-member-form.json`, `create-member-quote-form.json`, `create-quote-form.json`, `edit-quote-policy-detail-form.json`, `repair-policy-member-form.json`, `set-member-quote-premium-form.json`).

**Layer 2 — schema-driven widgets:**
- `021c811` — role-switcher + RoleContext + useRole. Refactored inline to drop `@/types/group-pas/roles` → new generic `@/types/role`. Storage key renamed `group-pas:current-role` → `keystone:current-role`.
- `50cf515` (`23bc0a6` ← ActionBar widget). Cherry-picked; `@/types/group-pas/roles` import rewritten to `@/types/role`.
- `0ad1d5a` — StateBadge + ReasonBanner + state-map. **Refactored state-map** into a generic registry (`registerStateMap` / `registerReasonMap` / `registerReasonGroupResolver`) with empty default maps. Group PAS data file stays on feat branch.
- `558f9b6` — combined commit replacing ActionBar with its post-bfc292c state (no maker-checker overlay, `disabledTooltip` field, `stateField` override) + applies 5cd9968's motion/depth pass on ui primitives + adds `state-badge` cell type to CellRenderer + `ColumnConfig.entity`. ActionBar unit test refreshed from bfc292c snapshot (7/7 pass). The full cherry-pick of `5cd9968` / `bcd1c99` / `bfc292c` was abandoned for being too entangled with intermediate ActionBar commits (`23bc0a6 → 4ead472 → 12a91fe → 5cd9968 → a88e3c6 → bcd1c99 → bfc292c → a26feac`); taking the post-bfc292c snapshot directly was simpler than chaining 7 cherry-picks with conflict surgery.

**Layer 3 — cleanup:**
- `9722a37` — drop unused `FieldValue` import in KeyValueGrid.
- `d969827` — PR #57 review feedback (see below).

**PR #57 review feedback addressed in `d969827`:**
Two reviewers (Copilot bot + nishanthbs1998, `CHANGES_REQUESTED`). 9 fixes landed in one commit:
- **Must-fix (3):** dropped `throw err` from `useActionHandler.api-mutation` (toast is the user surface; rethrow was producing unhandled-promise rejections at every caller); added defensive try/catch in `ActionBar.onClick` + switched `rowData` to `liveEntity ?? fetchedEntity`; replaced in-place mutation in `KeyValueGrid.resolveFieldValue` with a new `immutableSet()` helper that clones the path so the React Query cache isn't corrupted.
- **Should-fix (4):** `state-map.__resetRegistriesForTests()` for Jest test pollution; `types/role.ROLES` const array drives `readStoredRole` validation (adding a Role member automatically extends the guard); renamed dead `RoleContext` interface in `types/role.ts` → `RoleClaimPayload` (future Keycloak claims slot) to resolve name collision with the React context object; `gap-tokens.gapClass()` now returns `undefined` + dev `console.warn` for unmapped values instead of silently rendering `gap-4`.
- **Copilot extras (2):** `useSmartQuery` resets `pollStartRef` via `useEffect` when queryKey inputs (endpoint/method/params/dependent state/pollSchedule on/off) change so a mounted component flipping entity id starts a fresh backoff cycle; `RoleProvider` write-throughs to `useWidgetState` under `global:current-role`, matching what STATE_MANAGEMENT_GUIDE.md §8.4 documents.
- **Nits (2):** trailing newline on `useSmartQuery.ts`; `catch (e)` → bare `catch` in `useActionHandler` (unused-binding lint).
- **Declined:** layout entry-animation re-fires on every navigation — design call, kept matching `feat/new-buisiness` behavior; moved-into-per-page wrapper deferred to a follow-up if design confirms.

Verified: `tsc --noEmit` clean; `ActionBar.unit.test.tsx` 7/7 pass; baseline test failures (`92 failed / 113 passed`) match `origin/main` baseline byte-for-byte — no regressions.

**Merge-back impact for `feat/new-buisiness`:** documented in PR body. Rebase will silently skip Layer 1 commits (identical patches) via patch-id matching. Friction expected on Layer 2 / surgical-subset commits where hunks were dropped during extraction — `git checkout --ours` resolves those. Layer 3 refactors (Role type move, state-map registry split) need feat branch to repoint `@/types/group-pas/roles` → `@/types/role` and ship a `state-map.group-pas.ts` data file that registers the maps at module load.

**PR URL:** https://github.com/Anaira-AI/keystone-ui/pull/57
**Reviewer reply:** https://github.com/Anaira-AI/keystone-ui/pull/57#issuecomment-4431040695

**Process note:** combining 7 messy cherry-picks (`23bc0a6` through `bfc292c`) into a single "snapshot-the-end-state" commit was the right move once it became clear the intermediate commits churned the same file repeatedly with maker-checker add/restore noise. Same lesson as PR #58's process note — when chained cherry-picks fight you, take the final state directly and write one focused commit.

### 2026-05-13 — Group PAS API coverage audit + PROP-0001/2/3 approved + scope policy shift

**Trigger:** user asked whether the keystone-ui frontend uses every endpoint in `https://group-pas-dev.anairacloud.com/v3/api-docs`, suspecting Member GCL existed in backend but not in UI.

**Audit findings** (full report at `/Users/seriousblack/.claude/plans/do-you-have-repo-clever-diffie.md`):
- 21 + 11 + 9 + 13 + 7 + 3 + 3 = 67 endpoints across `quote/proposal/policy/policy-member/client/commons/catalog` — all wired.
- 6 `census-submission-api` endpoints — **0 UI wired**. Biggest gap; same scope as V1 plan Task 4.5 (deferred-from-demo backlog D4).
- 6 `member-quote-api` endpoints — client wrappers + types + form schemas exist; no pages.
- 1 `policy-admin.addMember` endpoint — wrapper exists, no UI for post-issuance member add.
- ~30 accounting endpoints — entire domain unwired. Out of scope per user.

**Proposals filed:**
- [proposals/PROP-0001-census-submission-ui.md](../proposals/PROP-0001-census-submission-ui.md) — Census Submission UI · high · l · **approved**
- [proposals/PROP-0002-member-quote-gcl-ui.md](../proposals/PROP-0002-member-quote-gcl-ui.md) — Member-Quote (GCL/W4) UI · medium · m · **approved**
- [proposals/PROP-0003-post-issuance-add-member-ui.md](../proposals/PROP-0003-post-issuance-add-member-ui.md) — Post-issuance AddMember UI · medium · s · **approved**

**Policy shift (user, 2026-05-13):** scope-lock list at [CORE_MEMORY.md "Group PAS V1 — scope locks"](CORE_MEMORY.md) had GCL MemberQuote and (implicitly) post-issuance AddMember in "Out of V1". User decision: **"if backend API exists and behaviour is understood, build the UI"** — don't gate on conceptual buckets like GCL / endorsement / post-issuance when the API surface is there.

**CORE_MEMORY changes:**
- New principle "API-driven scope (2026-05-13)" added to Group PAS V1 — scope locks.
- "Out of V1" trimmed to backend-absent capabilities only: real auth (Keycloak), backend-enforced maker-checker, PII/Cerbos UI gating, PDF's UW/RI review states. GCL MemberQuote and post-issuance AddMember moved in-scope.
- Interim assumption #7 "GCL endpoints" rewritten — endpoints are DSL-canonical at [docs/spec/quotation/MemberQuoteWorkflow.workflow](../docs/spec/quotation/MemberQuoteWorkflow.workflow); UI builds, runtime-stub behaviour surfaced via disabled-with-tooltip pattern.

**Next steps:**
- `/build-feature PROP-0001` first (largest impact, replaces V1 plan D4 tracking).
- Update [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md) D4/Task 4.5 to point at PROP-0001 to avoid duplicate tracking.
- PROP-0002 build needs to remove the `member-quotes-placeholder` tab (Task 2.4.6) as part of CLARIFY.
- PROP-0003 build needs CLARIFY pass on affordance copy so "Add member" doesn't imply full endorsement-lifecycle support.

**Files changed (docs-only — separate commit per [commit-hygiene rule](CORE_MEMORY.md#commit-hygiene--split-src-from-docs)):**
- [context/CORE_MEMORY.md](CORE_MEMORY.md) — scope-lock policy update
- [context/SESSION_LOG.md](SESSION_LOG.md) — this entry
- [context/HANDOFF.md](HANDOFF.md) — Active Workstreams updated
- `proposals/PROP-0001-census-submission-ui.md` (new, approved)
- `proposals/PROP-0002-member-quote-gcl-ui.md` (new, approved)
- `proposals/PROP-0003-post-issuance-add-member-ui.md` (new, approved)
- `proposals/_index.md` (new)

---

## 2026-05-13 — Quotation Detail tab expansion (PROP-0004..0008): plan + first lane

### Planning

Plan written at `/Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md`. Five proposals filed to lift the demo cuts D1/D2/D3 plus surface API data the schemas were dropping on the floor:

- PROP-0004 — Plans tab card grid + structured plan editor
- PROP-0005 — Census tab aggregate breakdown editable table + file-format editor
- PROP-0006 — Pricing tab per-plan premium breakdown
- PROP-0007 — Member-to-Plan mapping DMN view + blob-replace flow
- PROP-0008 — Split monolithic action-bar Edit into per-tab edit ownership

Parallelism plan: file footprints disjoint except for `WidgetRegistry.tsx` (PROP-0004/0005 both register a new widget) → pre-register stubs in a setup step so the parallel lanes don't collide.

### Setup commit (`c11efb8`)

- Pre-registered `card-grid` and `editable-table` widget types in `WidgetRegistry.tsx` with stub components at `src/components/widgets/data/{CardGrid,EditableTable}.tsx`.
- Folded in Lane A's earlier PROP-0006 work on `schemas/tabs/quote/pricing.json` (per-plan breakdown via `data-table` against `estimatedPremium.byPlanJson`).

### Proposals commit (`4f42cf9`)

- Five new proposal markdowns under `proposals/`. Status: `approved`. Pre-existing PROP-0001..0003 + `_index.md` left untracked (other workstreams).

### PROP-0004 BUILD (`b1718a6`) — via `/build-feature` skill

Run-id `2026-05-13-plans-cards-grid`. Followed the CLARIFY → DESIGN → BUILD → VERIFY pipeline.

CLARIFY decisions (user):
1. Branch: stay on `feat/new-buisiness`, sequential commits split src vs context.
2. Per-card Edit affordance: wire pre-fill plumbing in this lane.
3. Plan edit form: structured editor for products/benefits/formula now (not raw JSON).

DESIGN doc at `context/build-feature/2026-05-13-plans-cards-grid/design.md` — bespoke `PlanForm` widget escape hatch to avoid the recursive form-container refactor. Arch transition note appended to `context/ARCH_TRANSITION.md`.

BUILD: 7 files changed, +1331/-58.
- `src/components/widgets/data/CardGrid.tsx` — stub replaced; iterates array at `arrayPath` from `dataSource`, renders a registered card widget per item with `item` + `parent` props.
- `src/components/widgets/data/PlanCard.tsx` — new; parses wire's stringified `productsJson` / `coverAmountFormulaJson` / `freeCoverLimitFormulaJson`. Edit/Delete buttons DRAFT + maker gated.
- `src/components/widgets/forms/PlanForm.tsx` — new; bespoke structured editor for the nested Plan shape (products[] repeater with nested benefits/exclusions, AmountFormulaField for cover and FCL).
- `src/components/widgets/forms/AmountFormulaField.tsx` — new; discriminated-union sub-form switching by `AmountFormulaType`.
- `schemas/tabs/quote/plans.json` — rewritten to `action-bar` + `card-grid`.
- `schemas/forms/plan-edit-form.json` — new; registers `plan-form` for OverlaidForm.
- `src/components/registry/WidgetRegistry.tsx` — register `plan-card` + `plan-form`.

Deviations from design:
- OverlaidForm pre-fill plumbing **not needed** — `injectRowData` already handles scalar pre-fill, and PlanForm reads `useOverlayStore` directly for the nested shape it owns. Zero changes to OverlaidForm / useFormContainer.
- `disabledTooltip` removed from Add Plan during VERIFY — it forces always-disabled per ActionBar contract; precondition `hasCensusFileFormat` now surfaces via server-toast on submit (CORE_MEMORY honesty pattern).

VERIFY:
- `tsc --noEmit` PASS.
- ESLint clean on new files. Pre-existing `any` in `WidgetRegistry.tsx:23` left untouched.
- Live browser smoke test against `https://group-pas-dev.anairacloud.com` via dev proxy: quote `170ea9b1-2eeb-4a88-934b-07afa4112ea4` (2 plans) renders both cards with full product/benefit/formula detail; Edit modal pre-fills nested fields; Add Plan enabled in DRAFT+maker.
- Coverage gap: no Jest tests added (deferred follow-up).

PROP-0004 status: `done`.

### Files changed

- `src/components/registry/WidgetRegistry.tsx` (setup + PROP-0004)
- `src/components/widgets/data/CardGrid.tsx` (new, real impl)
- `src/components/widgets/data/EditableTable.tsx` (new stub, awaiting PROP-0005)
- `src/components/widgets/data/PlanCard.tsx` (new)
- `src/components/widgets/forms/PlanForm.tsx` (new)
- `src/components/widgets/forms/AmountFormulaField.tsx` (new)
- `schemas/tabs/quote/plans.json` (rewritten)
- `schemas/tabs/quote/pricing.json` (Lane A, PROP-0006)
- `schemas/forms/plan-edit-form.json` (new)
- `proposals/PROP-0004..0008-*.md` (new)
- `proposals/PROP-0004-quote-detail-plans-cards.md` (status → done, implementation notes)
- `context/ARCH_TRANSITION.md` (new entry: bespoke plan-form widget)
- `agent_logs/build-feature/2026-05-13-plans-cards-grid/` (discover/clarify/verify logs)
- `context/build-feature/2026-05-13-plans-cards-grid/design.md` (design doc)

### Next steps

PROP-0005 (Census), PROP-0007 (Mapping), PROP-0008 (Edit-bar split) remain. Each is a separate `/build-feature` run. PROP-0006 (Pricing) already shipped via the setup commit; can flip its proposal status to `done` when the registry/widget gaps it noted are filed as their own follow-ups.
