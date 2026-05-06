# Group PAS V1 — Frontend Implementation Plan

Demo target: internal demo by Friday. AI-assisted coding. Plan is dependency-ordered; same-numbered tasks within a phase run in parallel. Every task carries its own context (inputs, outputs, acceptance) so it can be picked up cold.

## Scope (locked)

**In:** GTL Quotation, Issuance (Proposal + PolicyMember + Census), Policy Admin (Client/Policy/Member, read-mostly).

**Out:** Auth/roles, GCL MemberQuote (placeholder IA only), maker-checker, PII/Cerbos UI gating, endorsement/renewal/claims, PDF's UW/RI review states.

**Arch decision:** existing keystone-ui schema-driven arch. No port to `frontendProjection`. State-aware actions via per-schema `stateActions` map + new `ActionBar` widget.

---

## Conventions & required reading (load once, reference everywhere)

Every task assumes familiarity with these. Skim before picking up any task:

- **Architecture overview & module-creation walkthrough:** [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md) — schema-driven model, file layout, form registration, API route pattern, nav config.
- **State patterns:** [docs/STATE_MANAGEMENT_GUIDE.md](docs/STATE_MANAGEMENT_GUIDE.md).
- **Widget engine:** [src/components/registry/WidgetRegistry.tsx](src/components/registry/WidgetRegistry.tsx), [src/components/registry/WidgetRenderer.tsx](src/components/registry/WidgetRenderer.tsx).
- **Data hooks:** [src/hooks/useSmartQuery.ts](src/hooks/useSmartQuery.ts) (reads), [src/hooks/useActionHandler.ts](src/hooks/useActionHandler.ts) (writes/navigation/modals), [src/hooks/useWidgetState.ts](src/hooks/useWidgetState.ts).
- **Schema layout:** schemas live at repo-root `/schemas/`, not `src/schemas/`. Page schemas at `schemas/<module>.json`, tab schemas under `schemas/tabs/<module>/`, form schemas under `schemas/forms/` and exported from [schemas/forms/index.ts](schemas/forms/index.ts).
- **Mock layer:** [src/mocks/original/group-insurance/](src/mocks/original/group-insurance/) — `config/` (app + page configs), `data/` (fixtures), `index.ts`, `page-config-service.ts`.
- **Schema resolver:** [src/lib/schemaResolver.ts](src/lib/schemaResolver.ts) resolves `$ref`.
- **Backend specs (read-only reference):** `/Users/seriousblack/dev_anaira/group-pas/spec/{quotation,issuance,policy-admin,common}/` and `/Users/seriousblack/dev_anaira/group-pas/plans/team_nb_blueprint_v3.md`. The `.api` files are the authoritative endpoint contracts.
- **Reference templates (do NOT delete):** accounting module is the cleanest schema-driven module to mirror — [schemas/accounting.json](schemas/accounting.json), [schemas/tabs/accounting/](schemas/tabs/accounting/), [src/app/accounting/](src/app/accounting/), [src/app/api/accounting/](src/app/api/accounting/).

State-action coding convention (used throughout): every list/detail schema that drives lifecycle UI carries a `stateActions: Record<State, ActionId[]>` block. The new `ActionBar` widget consumes this. See Task 1.3.

---

## Process & workflow (mandatory for every task)

Start of every session, regardless of which task you pick up:

1. Read [context/HANDOFF.md](../context/HANDOFF.md) — single resume entry point. It points to core memory, session log, and active workstreams.
2. Read [context/CORE_MEMORY.md](../context/CORE_MEMORY.md) — standing execution preferences (build approach, schema architecture, branch hygiene, V1 scope locks).
3. Read the latest entries in [context/SESSION_LOG.md](../context/SESSION_LOG.md) so you know what just happened.
4. Then proceed with the task.

**Mandatory logging protocol:**
- Before starting a non-trivial task, append a dated entry to `context/SESSION_LOG.md` saying what's about to be done and which task ID (e.g. "Task 2.4.2 — Plans tab").
- After completing it, edit that entry with: results, files touched, tests run, next steps.
- If a phase or workstream changes status, update the table in `context/HANDOFF.md` Active Workstreams in the same commit.
- This is not optional — stale context causes other AIs to redo or contradict completed work.

**Architecture transitions:**
If a task introduces an interim pattern that the future architecture is expected to simplify (e.g. the `stateActions` map vs backend `frontendProjection`), add a note to [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) capturing the interim contract, the risk, and the convergence trigger.

**Pipeline skills (preferred way to execute non-trivial work):**

The repo has skills under [.claude/skills/](../.claude/skills/). Use them rather than freelancing:

- **`/build-feature <task-id-or-description>`** — multi-stage CLARIFY → DESIGN → BUILD pipeline with user gates. Best fit for any individual task in Phases 2–5. Writes a per-run design doc under `context/build-feature/<run-id>/design.md` and stage logs under `agent_logs/build-feature/<run-id>/`. Run-id format: `<YYYY-MM-DD>-<short-slug>`. The skill enforces user approval before code is written.
- **`/propose`** — file a `proposals/PROP-NNNN-<slug>.md` when you spot a recurring problem worth fixing at the system level (missing component, repeated reviewer fix, spec pattern not handled). The V1 plan in this doc supersedes proposals for already-scoped work; proposals are for changes outside the locked plan.
- **`/review-proposals`** — triage drafts and decide approve/reject/defer. Humans (or `--auto` under threshold) gate `approved` / `rejected`.
- **`/execute-proposal PROP-NNNN`** — pick up an approved proposal, branch, implement, push PR.
- **`/build-backend`** — backend-only execution path (mostly N/A for this V1, since backend lives in `group-pas/`).
- **`/preview-and-deploy`** — lint + test + preview gate. Use as the verify step at the end of any UI task.
- Spec/test helpers: `/specs-to-draft`, `/refine-specs-to-draft`, `/specs-to-tests`, `/extract-usecase`, `/design-system`.

**When to use which:**
- Picking up a planned V1 task → `/build-feature <task-id>` (reads this plan as the spec).
- Spotting an out-of-plan need (new shared widget, infra change, cross-cutting refactor) → `/propose` first, then once approved, `/execute-proposal`.
- One-line fixes (typo, dead import) → just do them; no proposal.

**Branch hygiene:** stay on the current branch and commit sequentially. Do NOT create a new branch per task unless the user asks or the working tree is dirty when starting. The `/build-feature` and `/execute-proposal` skills enforce this automatically.

---

## Phase 0 — Teardown (sequential; blocks all later phases)

### Task 0.1 — Delete existing quotations module

**Context to load:**
- Survey what depends on the module: `grep -r "quotations" src/ schemas/ --include="*.ts" --include="*.tsx" --include="*.json"` before deleting.
- The existing quotations module is the *legacy* one being replaced; it does not match the backend spec.

**Files to delete:**
- `src/app/quotations/` (page + detail routes)
- `src/app/api/quotations/` (all sub-routes: route.ts, [id]/route.ts, [id]/{plans,exclusions,subsidiaries,members,documents,summary}/route.ts)
- `schemas/quotations.json`, `schemas/quotations-detail.json`
- Quotation-specific tab schemas under `schemas/tabs/`: `headcount.json`, `subsidiaries.json`, `members.json`, `documents.json`, `qtn-detail-help-sheet.json`, `policy-exclusion.json` (and any others tied to legacy quotation IA — verify each by grep before deleting; some plan-product-* schemas may belong to other modules).
- Quotation-specific forms under `schemas/forms/`: `create-quotation-form.json`, `key-data-form.json`, `add-headcount-form.json`, `add-subsidiary-form.json`, `edit-subsidiary-form.json`, `add-document-form.json`, `request-document-form.json`, `verify-document-form.json`, `bulk-verify-form.json`, `dummy-member-form.json`, `add-dependent-form.json`, `edit-member-form.json`, `cancel-member-form.json`, `surrender-member-form.json`, `member-exclusions-form.json`, `add-exclusion-form.json`, `edit-exclusion-form.json`, `pre-existing-conditions-form.json`, `resolve-conflict-form.json`, `upload-members-form.json`, `policy-flags-governance-form.json`, `policy-profile-form.json`. Keep accounting/payout/claims forms.
- Update [schemas/forms/index.ts](schemas/forms/index.ts) to remove deleted form imports.
- Quotation tests: [src/tests/schemas/QuotationListTable.test.tsx](src/tests/schemas/QuotationListTable.test.tsx), [src/tests/schemas/CreateQuotationForm.test.tsx](src/tests/schemas/CreateQuotationForm.test.tsx) and any others under `src/tests/` referencing quotations.
- Quotation mocks under `src/mocks/original/group-insurance/data/` — verify each file's purpose and delete only quotation-tied ones.

**Done when:** `npm run build` and `npm test` both pass with the module removed and nav not yet updated (broken link is acceptable, fixed in 0.2).

### Task 0.2 — Update navigation config

**Context to load:**
- [src/mocks/original/group-insurance/config/](src/mocks/original/group-insurance/config/) — find the app-config-mock file (likely `app-config-mock.ts`).
- [src/components/AppSidebar.tsx](src/components/AppSidebar.tsx) for nav rendering.

**Output:**
- Replace legacy quotations nav entry with three new top-level entries: **Quotation**, **Issuance**, **Policy Admin**. Each entry's URL should resolve once Phase 2/3/4 ships; for now they point to placeholder routes.
- Under Quotation, add a disabled child item "Member Quotes (GCL)" labelled "Coming soon" so the IA stays stable when GCL ships later.
- Pick lucide icons (e.g. `FileText`, `Building2`, `ShieldCheck`).

**Done when:** sidebar renders the three modules; clicking each navigates to a placeholder page (404 acceptable until pages exist).

---

## Phase 1 — Shared infrastructure (all parallel; blocks Phases 2–4)

### Task 1.1 — TypeScript domain types

**Context to load:**
- Domain entities: `/Users/seriousblack/dev_anaira/group-pas/spec/quotation/QuotationDomain.domain` and `QuotationData.data`
- `/Users/seriousblack/dev_anaira/group-pas/spec/issuance/IssuanceDomain.domain` and `IssuanceData.data`
- `/Users/seriousblack/dev_anaira/group-pas/spec/policy-admin/PolicyAdminDomain.domain` and `PolicyAdminData.data`
- `/Users/seriousblack/dev_anaira/group-pas/spec/common/CommonData.data` and `CommonDomain.domain`
- DTOs in the `.query` files (response shapes).

**Output:**
- `src/types/group-pas/quotation.ts` — `Quote`, `QuoteSummaryDto`, `QuoteDto`, `Plan`, `MemberQuote`, `QuotePremium`, status/type enums.
- `src/types/group-pas/issuance.ts` — `Proposal`, `ProposalDto`, `PolicyMember`, `PolicyMemberSummaryDto`, `CensusSubmission`, `CensusSubmissionRow`, state enums, `ClassificationLane`.
- `src/types/group-pas/policy-admin.ts` — `Client`, `Policy`, `Member`, summary DTOs, state enums, `pendingReason`/`voidReason` enums.
- `src/types/group-pas/common.ts` — `Money`, `MemberData`, `MemberPremium`, shared value objects.
- `src/types/group-pas/index.ts` re-exports.

**Done when:** types compile; consumed by Tasks 1.2 and 1.5.

### Task 1.2 — API clients

**Context to load:**
- Endpoint contracts: `QuotationApi.api`, `IssuanceApi.api`, `PolicyAdminApi.api`. These are the source of truth for path, method, request/response.
- Existing `fetch`-based pattern in [src/app/api/](src/app/api/) — there is no central fetch wrapper. Build a thin one only if shared concerns (auth header, base URL) emerge.
- React Query usage: [src/hooks/useSmartQuery.ts](src/hooks/useSmartQuery.ts).

**Output:**
- `src/lib/api/quotation.ts` — function per endpoint in `QuotationApi.api`. Typed via Task 1.1 types.
- `src/lib/api/issuance.ts` — function per endpoint in `IssuanceApi.api`.
- `src/lib/api/policy-admin.ts` — function per endpoint in `PolicyAdminApi.api`.
- All three call relative paths (`/api/quotation/*` etc.); the Next API routes (Task 1.4) proxy to the real backend or return mocks.

**Done when:** every endpoint in the three `.api` files has a typed client function; clients can be imported and called from a sample page.

### Task 1.3 — `ActionBar` widget

**Context to load:**
- Widget pattern: [src/components/registry/WidgetRegistry.tsx](src/components/registry/WidgetRegistry.tsx) — how widgets are registered.
- Action handling: [src/hooks/useActionHandler.ts](src/hooks/useActionHandler.ts) — supports `navigate`, `api-mutation`, `open-modal`, etc.
- Existing button patterns under [src/components/ui/](src/components/ui/) for visual consistency with `feat/design-system-pass-a`.

**Output:**
- `src/components/widgets/actions/ActionBar.tsx` — props: `state: string`, `stateActions: Record<string, string[]>`, `actions: Action[]` (action shape mirrors what `useActionHandler` consumes).
- Behaviour: filters `actions` by `stateActions[state]`; non-listed actions render disabled with hover tooltip "Not available in <state>".
- Register `"action-bar"` in `WidgetRegistry`.
- Storybook story or unit test demonstrating state-driven enable/disable.

**Done when:** `<ActionBar>` consumed via schema renders correctly across at least three sample states.

### Task 1.4 — Mock API route handlers

**Context to load:**
- Existing template: [src/app/api/accounting/[[...path]]/route.ts](src/app/api/accounting/[[...path]]/route.ts) — catch-all proxy/mock pattern.
- Endpoints to mock: every endpoint in the three `.api` files.

**Output (parallel sub-tasks per module):**
- `src/app/api/quotation/[[...path]]/route.ts` — catch-all returning fixtures from Task 1.5 for GETs, echo-success for POST/PUT/DELETE.
- `src/app/api/issuance/[[...path]]/route.ts` — same.
- `src/app/api/policy-admin/[[...path]]/route.ts` — same.
- A toggle (env var `GROUP_PAS_BACKEND_URL`) that, when set, proxies to real backend instead of returning fixtures.

**Done when:** every endpoint in the three `.api` files responds 200 with realistic-shaped data. Curl smoke-test all list endpoints.

### Task 1.5 — Mock fixtures

**Context to load:**
- Workflow files for realistic state distribution: `QuoteWorkflow.workflow`, `MemberLifecycleFlow.workflow`, `PolicyActivationFlow.workflow`, `MemberEnrollmentFlow.workflow`.
- Existing mock pattern: [src/mocks/original/group-insurance/data/](src/mocks/original/group-insurance/data/).

**Output:**
- `src/mocks/group-pas/quotation/quotes.ts` — ~10 quotes spread across all 8 statuses (DRAFT, SUBMITTED, SENT_TO_CLIENT, ACCEPTED, FINALIZED, REJECTED, WITHDRAWN, EXPIRED). Each has plans, census, and a couple have priced premiums.
- `src/mocks/group-pas/issuance/proposals.ts` — ~5 proposals (CREATED, POLICY_CREATED).
- `src/mocks/group-pas/issuance/policy-members.ts` — ~20 members covering every PolicyMember state (CREATED, MAF_PENDING, MAF_CONFIRMED, CLASSIFYING, APPROVED, REPAIR_PENDING, REVIEW_PENDING, REJECTED, ADDED). At least one in REPAIR_PENDING with classification errors.
- `src/mocks/group-pas/issuance/census.ts` — 2 submissions, one INGESTED with mixed-status rows, one COMPLETED.
- `src/mocks/group-pas/policy-admin/clients.ts` — ~5 clients ACTIVE.
- `src/mocks/group-pas/policy-admin/policies.ts` — ~5 policies (PENDING with various pendingReasons, ACTIVE, CANCELLED).
- `src/mocks/group-pas/policy-admin/members.ts` — ~15 members (PENDING with various pendingReasons, ACTIVE, VOID with various voidReasons).
- All fixtures use Task 1.1 types.

**Done when:** Task 1.4 mock routes return these fixtures and screens render realistic data.

### Task 1.6 — `PresignedUploader` widget

**Context to load:**
- File URL endpoint contracts in all three `.api` files: `/files/upload-url` and `/files/download-url`.
- Action handler: [src/hooks/useActionHandler.ts](src/hooks/useActionHandler.ts) for the `api-mutation` pattern that returns a URL to follow.

**Output:**
- `src/components/widgets/files/PresignedUploader.tsx` — props: `module: 'quotation'|'issuance'|'policy-admin'`, `onUploaded(fileRef)`. Two-step: POST `/files/upload-url`, then PUT to returned URL with progress.
- Download variant: `PresignedDownloadButton.tsx`.
- Register `"presigned-uploader"` and `"presigned-download"` in WidgetRegistry.

**Done when:** uploader works against a mocked upload URL endpoint; consumed by census + rate card flows in later phases.

### Task 1.7 — `useEnum` hook

**Context to load:**
- `/api/<module>/enums/:enumType?search=` endpoint signatures in the `.api` files.
- React Query setup in [src/hooks/useSmartQuery.ts](src/hooks/useSmartQuery.ts).

**Output:**
- `src/hooks/useEnum.ts` — `useEnum(module, enumType, search?)`. Long stale time (5 min). Returns `string[]`.
- Wire into select-field rendering so a schema can declare `"options": { "enum": "policyType", "module": "quotation" }`.

**Done when:** at least one form field in a Phase 2 schema is populated via `useEnum`.

### Task 1.8 — State-badge helpers

**Context to load:**
- Status enums from Task 1.1 types.
- Existing badge component [src/components/ui/badge.tsx](src/components/ui/badge.tsx) and `feat/design-system-pass-a` colour conventions.

**Output:**
- `src/components/widgets/state/StateBadge.tsx` — single badge component taking `entity` ('quote'|'proposal'|'policyMember'|'policy'|'member') and `state`. Maps to colour + label.
- Internal map: `src/components/widgets/state/state-map.ts` exporting all label/colour pairs (also imported by ActionBar tooltips and lists).
- Register `"state-badge"` in WidgetRegistry so schemas can use it as a column renderer.

**Done when:** every lifecycle state across all three modules has a defined label + colour.

---

## Phase 2 — Quotation module (parallel with Phase 3)

Sub-tasks 2.4.x are parallel after the shell (2.3) lands.

### Task 2.1 — Quote list page

**Context to load:**
- Endpoints: `QuotationApi.api` — `/api/quotation/quotes/search`, `/quotes/list`, `/quotes/by-status`, `/quotes/by-client`. Query: `SearchQuotesQuery` in `QuotationQuery.query`.
- Template: [schemas/accounting.json](schemas/accounting.json) and an accounting tab using `data-table`, e.g. [schemas/tabs/accounting/](schemas/tabs/accounting/).

**Output:**
- `schemas/quote.json` — page with `data-table` driven by Task 1.2 client. Columns: quoteNumber, clientName, policyType, status (renders `state-badge`), effectiveDate, premium total, updatedAt. Filters: status, policyType, clientId. Saved-view chips for: Drafts, Submitted, Sent to client, Accepted, Ready to finalize. Row actions: View, Edit (DRAFT only), Withdraw.
- `src/app/quotation/page.tsx` — server component loading the schema (mirror [src/app/accounting/page.tsx](src/app/accounting/page.tsx) if it exists, or the existing accounting page entry).

**Done when:** list renders fixtures from Task 1.5; saved-view chips switch the underlying status filter; row actions wired.

### Task 2.2 — Quote create form

**Context to load:**
- Command: `CreateQuoteCommand` in `QuotationCommand.command`. Required fields per `CreateQuoteRequest`.
- Form pattern walkthrough: [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md) Step 3.
- Form registration: [schemas/forms/index.ts](schemas/forms/index.ts).

**Output:**
- `schemas/forms/create-quote-form.json` — fields: clientId (lookup or select), policyType (`useEnum`), premiumType (`useEnum`), effectiveDate, expiryDate, inceptionDate, lineOfBusiness, riskTermClassification, ageDefinitionRule.
- Register form in `schemas/forms/index.ts`.
- "New Quote" header action on the list page (Task 2.1) opens form as modal; on submit, calls `CreateQuoteCommand` and navigates to `/quotation/[id]`.

**Done when:** form validates, submits, redirects to detail page (which 404s until 2.3 ships).

### Task 2.3 — Quote detail shell

**Context to load:**
- Endpoint: `GET /api/quotation/quotes/:quoteId` → `QuoteDto`.
- Template: existing detail-with-tabs route, e.g. [src/app/accounting/](src/app/accounting/) sub-routes if multi-level, or look at how `[id]/page.tsx` was done in legacy quotations before deletion (capture the pattern in Phase 0 notes).

**Output:**
- `schemas/quote-detail.json` — page with header (StateBadge, key meta: quoteNumber, client, policyType, dates), `ActionBar` driven by `stateActions`, then `tabs-layout` referencing six tab schemas (key-data, plans, census, member-mapping, pricing, member-quotes-placeholder).
- `stateActions` map for Quote (encode in schema):
  - `DRAFT` → `submit`, `withdraw`
  - `SUBMITTED` → `sendToClient`, `withdraw`
  - `SENT_TO_CLIENT` → `accept`, `reject`, `withdraw`, `expire`
  - `ACCEPTED` → `finalize`, `withdraw`
  - `FINALIZED`/`REJECTED`/`WITHDRAWN`/`EXPIRED` → `[]`
- Each action mapped to its endpoint: Submit → `POST /quotes/:id/submit`, etc.
- `src/app/quotation/[id]/page.tsx` — loads schema, substitutes `{{id}}`.

**Done when:** detail page renders, state badge correct, action bar shows correct buttons per state across all 8 statuses (verify with mock fixtures from Task 1.5).

### Task 2.4.1 — Key Data tab

**Context to load:**
- Command: `UpdatePolicyDetailCommand` (`UpdatePolicyDetailRequest`).
- Editable only when `status === 'DRAFT'` — encode via `disabledStates`.

**Output:**
- `schemas/tabs/quote/key-data.json` — form-container with editable fields matching `UpdatePolicyDetailRequest`. Read-only when not DRAFT.
- Register form schema if separated.

**Done when:** editing a DRAFT quote persists; non-DRAFT shows read-only.

### Task 2.4.2 — Plans tab

**Context to load:**
- Commands: `AddPlanCommand`, `UpdatePlanCommand`, `RemovePlanCommand`.
- Plan structure: `Plan` and nested products/benefits in `QuotationDomain.domain`.

**Output:**
- `schemas/tabs/quote/plans.json` — data-table of plans with columns: planNo, products (count or summary), benefits (count or summary), rateCardFile (download link via `presigned-download`). Header action "Add Plan" opens `add-plan-form`.
- `schemas/forms/add-plan-form.json` — plan number, products multi-select, benefits per product, rate-card upload via `PresignedUploader` widget. Register in `schemas/forms/index.ts`.
- Edit/remove row actions.

**Done when:** add/edit/remove plan persists in DRAFT; locked otherwise.

### Task 2.4.3 — Census tab

**Context to load:**
- Commands: `UpdateCensusFileFormatCommand`, `UpdateAggregateCensusCommand`.
- Aggregate census shape (per-plan headcount breakdown): `QuotationDomain.domain` → `aggregateCensus`.
- Census file format is a Frictionless Table Schema JSON — render as JSON editor or upload.

**Output:**
- `schemas/tabs/quote/census.json` — two sub-sections.
  - File format: upload (`PresignedUploader`) or paste-JSON for `censusFileFormat`. Save calls `UpdateCensusFileFormatCommand`.
  - Aggregate counts: editable grid keyed by planNo, columns for total headcount + dependent counts. Save calls `UpdateAggregateCensusCommand`.

**Done when:** both sub-sections persist and survive page reload.

### Task 2.4.4 — Member-to-Plan Mapping tab

**Context to load:**
- Command: `UpdateMemberToPlanMappingCommand`. The mapping is an opaque DMN ref string (file in object store).

**Output:**
- `schemas/tabs/quote/member-mapping.json` — display current ref, "Replace" action triggers `PresignedUploader` for DMN; on success calls `UpdateMemberToPlanMappingCommand` with the returned ref.

**Done when:** upload + persist round-trips.

### Task 2.4.5 — Pricing tab

**Context to load:**
- Command: `RequestQuotePriceCommand` (POST `/quotes/:id/request-price`).
- Premium shape: `QuotePremium` (total + byPlan breakdown) on `QuoteDto`.
- Async behaviour: backend computes via Rule Engine; frontend polls.

**Output:**
- `schemas/tabs/quote/pricing.json` — "Request price" button (disabled if not DRAFT). On click: call command, then refetch quote every 5s until `premium` populated or 30s timeout. Show in-progress banner during poll. Display total + per-plan breakdown card.

**Done when:** action triggers refetch loop; mock route can flip a quote's premium after first refetch to validate.

### Task 2.4.6 — Member Quotes (GCL) placeholder tab

**Context to load:** none — this is intentional UI deferral.

**Output:**
- `schemas/tabs/quote/member-quotes-placeholder.json` — empty-state widget reading "GCL Member Quotes — coming in a future release". No actions.

**Done when:** tab renders.

---

## Phase 3 — Policy Admin read views (parallel with Phase 2)

### Task 3.1 — Clients list + detail

**Context to load:**
- Endpoints: `PolicyAdminApi.api` — `/clients/search`, `/clients/list`, `/clients/:clientId`.
- Queries: `SearchClientsQuery`, `GetClientByIdQuery`.

**Output:**
- `schemas/client.json` — list page (data-table). Columns: clientNumber, name, businessRegistrationNumber, clientCategory, industryCategory, countryCode, state, isVip flag.
- `schemas/client-detail.json` — read-only detail page.
- `src/app/policy-admin/clients/page.tsx`, `src/app/policy-admin/clients/[id]/page.tsx`.

**Done when:** lists and detail render fixtures from Task 1.5.

### Task 3.2 — Policies list

**Context to load:**
- Endpoints: `/policies/search`, `/policies/by-state`, `/policies/list`.
- Query: `SearchPoliciesQuery`.

**Output:**
- `schemas/policy.json` — data-table with columns policyNumber, clientName, policyType, state (StateBadge), threshold, effectiveDate, premium. Saved-view chips: Pending, Active, Cancelled.
- `src/app/policy-admin/policies/page.tsx`.

**Done when:** list + chip filtering work.

### Task 3.3 — Policy detail

**Context to load:**
- Endpoints: `/policies/:policyId`, `/policies/:policyId/members`, `GetPolicyPendingBreakdownQuery`.
- Pending breakdown semantics: `PolicyAdminQuery.query` → counts grouped by `pendingReason`.
- Workflow: `PolicyActivationFlow.workflow` to understand when/why members are pending.

**Output:**
- `schemas/policy-detail.json` — tabs:
  - Overview: state, threshold, dates, premium, links to source proposal & quote.
  - Pending breakdown card showing `Map<pendingReason, count>`.
  - Members tab embedding `schemas/tabs/policy/members.json` (next).
- `schemas/tabs/policy/members.json` — list of members for this policy with state filter, saved-view chips: Pending, Active, Void.
- `ActionBar` with `stateActions`: PENDING/ACTIVE → `cancel`. Otherwise none.
- `src/app/policy-admin/policies/[id]/page.tsx`.

**Done when:** detail renders, pending breakdown card matches fixtures, member tab filters work, cancel action wired.

### Task 3.4 — Member detail (PAM)

**Context to load:**
- Endpoint: `/members/:memberId` and `/members/by-policy-member/:policyMemberId`.
- Domain: `Member` in `PolicyAdminDomain.domain` — note `pendingReason`, `voidReason`, `floatReservationId`, `transactionRefs`, `additionalAttributesJson`.
- Workflow: `MemberEnrollmentFlow.workflow` so the UI text matches the workflow gates.

**Output:**
- `schemas/member-detail.json` — read-only. Header with StateBadge + reason-banner (e.g. "Pending: awaiting policy activation"). Sections: identity, plan + sumInsured, premium breakdown, transactionRefs list, floatReservationId, additionalAttributesJson rendered as key/value table.
- `src/app/policy-admin/members/[id]/page.tsx`.

**Done when:** detail renders for fixture members across PENDING (every reason), ACTIVE, VOID (every reason).

---

## Phase 4 — Issuance module (depends on Phase 3 routes existing for cross-links)

### Task 4.1 — Proposals list

**Context to load:** `IssuanceApi.api` `/proposals/search`, `/proposals/by-state`, `/proposals/list`.

**Output:**
- `schemas/proposal.json` — data-table: proposalId, quoteId link, clientName, state (StateBadge), policyType, createdAt. Saved-view chips: Created, Policy created.
- `src/app/issuance/proposals/page.tsx`.

**Done when:** list renders, chip filtering works, links to detail.

### Task 4.2 — Proposal detail shell

**Context to load:**
- Endpoint `/proposals/:proposalId` → `ProposalDto`.
- Commands: `SubmitProposalCommand`, `FinalizeProposalCommand`, `CancelProposalCommand`.
- Workflow: `ProposalFlow.workflow` (W2) — short-lived; FinalizeProposal triggers PAM CreatePolicy.

**Output:**
- `schemas/proposal-detail.json` — header (StateBadge, proposalId, source quote link, policyId link if POLICY_CREATED), `ActionBar` with `stateActions` { CREATED: [submit, cancel], SUBMITTED: [finalize, cancel], POLICY_CREATED: [], CANCELLED: [] }, then tabs:
  - Overview (read-only data copied from quote: plans, aggregate census, estimated premium)
  - Members (Task 4.3)
  - Census (Task 4.5)
- `src/app/issuance/proposals/[id]/page.tsx`.

**Done when:** action bar transitions correctly; cancel modal collects reason; finalize navigates to created policy on success.

### Task 4.3 — Members tab + list inside proposal

**Context to load:**
- Endpoints: `/policies/:policyId/members`, `/policies/:policyId/members/by-state`, `/policy-members/search`.
- States: full PolicyMember lifecycle from `IssuanceDomain.domain`.

**Output:**
- `schemas/tabs/proposal/members.json` — data-table of policy members. Columns: name, planNo, state (StateBadge), classification lane, premium. State filter + saved-view chips: All, Repair queue (REPAIR_PENDING), UW review (REVIEW_PENDING), Approved, Added, Rejected.
- Header actions: "Add member" → opens single-add form (Task 4.4); "Bulk upload (census)" → navigates to census flow (Task 4.5).

**Done when:** chip filters return correct subsets from fixtures; queue chips show counts.

### Task 4.4 — Single-member create + state-driven detail (the core operational screen)

**Context to load:**
- Commands: `CreatePolicyMemberCommand`, `UpdateMemberCommand`, `PriceMemberCommand`, `SendMemberForIssuanceCommand`, `RejectMemberCommand`, `ArchiveMemberCommand`.
- Endpoint: `/policy-members/:policyMemberId`.
- Lifecycle reference: `MemberLifecycleFlow.workflow` (W3) — read carefully; this drives the state-aware UI.
- Classification result shape: `ClassifyMemberResult` with `lane: STP|REPAIR|REVIEW|REJECT` and `errors`.

**Output:**
- `schemas/forms/add-policy-member-form.json` — identity + plan + sumInsured. Register in `schemas/forms/index.ts`.
- `src/app/issuance/proposals/[id]/members/new/page.tsx` — opens the form.
- `schemas/policy-member-detail.json` — single page; content varies by state via per-state schema sections (use the schema's conditional rendering pattern):
  - `CREATED`/`MAF_PENDING`/`CLASSIFYING` → read-only card + in-progress banner.
  - `REPAIR_PENDING` → **edit form** (`UpdateMemberCommand`) prefilled, with `classificationResult.errors` rendered as field-level errors. Submit re-classifies.
  - `REVIEW_PENDING` → read-only "with UW" banner, no actions.
  - `APPROVED` → read-only + ActionBar with `sendForIssuance`.
  - `ADDED` → terminal, deep link to PAM Member detail (Task 3.4).
  - `REJECTED` → terminal with reason.
- `stateActions` map covers all states.
- `src/app/issuance/proposals/[id]/members/[memberId]/page.tsx`.

**Done when:** every state in fixtures renders correctly; repair edit form submits and updates fixtures; APPROVED → SendForIssuance triggers correctly; ADDED links to PAM member.

### Task 4.5 — Census flow

**Context to load:**
- Commands: `InitiateCensusSubmissionCommand`, `IngestCensusFileCommand`, `SubmitCensusSubmissionCommand`.
- Endpoints: `/policies/:policyId/census-submissions` (POST + GET list), `/census-submissions/:submissionId` (GET), `/census-submissions/:submissionId/rows`, `/census-submissions/:submissionId/ingest`, `/census-submissions/:submissionId/submit`.
- Domain: `CensusSubmission` with status lifecycle INITIATED → INGESTED → SUBMITTED → COMPLETED/FAILED.

**Output:**
- Three stitched screens:
  1. `src/app/issuance/proposals/[id]/census/new/page.tsx` driven by `schemas/census-new.json` — initiates submission, then `PresignedUploader` posts file, then triggers `IngestCensusFileCommand`. Redirects to detail page on completion.
  2. `src/app/issuance/proposals/[id]/census/[submissionId]/page.tsx` driven by `schemas/census-detail.json` — status banner, counts (totalRows / acceptedRows / rejectedRows / createdMemberCount), row table from `ListCensusSubmissionRowsQuery` with per-row error column, "Submit" action when status is INGESTED.
  3. On COMPLETED status, link to filtered members list (Task 4.3 with filter to this `censusSubmissionId`).

**Done when:** end-to-end census flow works against mocks: upload → ingest → row review → submit → members appear in tab 4.3.

---

## Phase 5 — Cross-cutting polish (sequential, after Phases 2–4)

### Task 5.1 — Cross-module deep links

**Context to load:** the cross-module touchpoints summarised in this doc and in [team_nb_blueprint_v3.md](../../group-pas/plans/team_nb_blueprint_v3.md).

**Output:** ensure these links work end-to-end:
- Quote detail → Proposal (after FINALIZED, by `/proposals/by-quote/:quoteId`)
- Proposal detail → Policy (PAM) once `policyId` populated
- PolicyMember (ADDED) detail → Member (PAM) by `/members/by-policy-member/:policyMemberId`
- Policy detail → source Proposal (`/proposals/by-quote/:quoteId` or proposalId on Policy)
- Bidirectional badges in headers.

**Done when:** clicking through the demo path lands on the right pages without dead-end.

### Task 5.2 — Operational queue index

**Context to load:** the saved-view URLs from Tasks 2.1, 3.2, 3.3, 4.1, 4.3.

**Output:**
- A small landing page or sidebar section grouping ops queues: Quote queues (drafts/submitted/sent/accepted), Repair queue (REPAIR_PENDING), UW review queue (REVIEW_PENDING, read-only), Activation watch (Policies PENDING with breakdown), Member enrollment watch (Members PENDING by reason).

**Done when:** ops user can reach every operational queue from one screen.

### Task 5.3 — Demo happy-path validation

**Context to load:** Demo script in [docs/Demo_Script_Day_in_the_Life.md](docs/Demo_Script_Day_in_the_Life.md) (review for narrative alignment).

**Path to validate manually end-to-end:**
1. Create quote → fill key data → add plan → upload census format → set aggregate census → upload mapping → request price.
2. Submit → Send to client → Accept → Finalize.
3. Proposal auto-created → add a member single-form → bulk-upload census → review rows → submit submission.
4. One member lands in REPAIR_PENDING → edit form → re-classify → APPROVED.
5. APPROVED member → SendForIssuance → ADDED.
6. Policy reaches threshold → ACTIVE → Members ACTIVE.

**Done when:** every step works end-to-end against mocks; bugs filed/fixed.

### Task 5.4 — Critical-path tests

**Context to load:** test patterns at [src/tests/unit/table/DataTable.unit.test.tsx](src/tests/unit/table/DataTable.unit.test.tsx).

**Output (minimum):**
- Quote list renders + chip filter switches data.
- Quote detail action visibility per state (test all 8 statuses).
- PolicyMember state-driven detail switches form vs read-only correctly.
- Census row table renders error rows with errors visible.
- ActionBar widget unit test (already in Task 1.3).

**Done when:** `npm test` passes and the above scenarios are covered.

---

## Open items to resolve as we go

- Backend mock readiness — confirm which endpoints the backend has stubbed; gate fixture realism against it.
- `additionalAttributesJson` UX — opaque JSON field on Member. V1: render as key/value table, no schema validation.
- Workflow polling cadence — 5s default in Task 2.4.5; revisit if it feels wrong in demo.
- Whether Quote detail header should embed the action bar inline or as a sticky footer — design call after Task 2.3 lands.
