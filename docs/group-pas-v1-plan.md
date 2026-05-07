# Group PAS V1 — Frontend Implementation Plan

Demo target: internal demo by 2026-05-08 (Friday of plan-locked week). AI-assisted coding. Plan is dependency-ordered; same-numbered tasks within a phase run in parallel. Every task carries its own context (inputs, outputs, acceptance) so it can be picked up cold.

## Scope (locked)

**In:** GTL Quotation, Issuance (Proposal + PolicyMember + Census), Policy Admin (Client/Policy/Member, read-mostly). UI-only maker-checker via role-switcher.

**Out:** Real auth (Keycloak), GCL MemberQuote (placeholder IA only), backend-enforced maker-checker, PII/Cerbos UI gating, endorsement/renewal/claims, PDF's UW/RI review states.

**Arch decision:** existing keystone-ui schema-driven arch. No port to `frontendProjection`. State-aware actions via per-schema `stateActions` map + new `ActionBar` widget. Role-aware actions via per-schema `roleActions` map (same widget consumes both).

**Maker-checker (V1, frontend-only):** backend doesn't enforce auth or maker-checker. UI ships a role-switcher (Maker / Checker / Ops / Viewer) and a "pending approval" overlay so the demo shows hand-off without backend changes. Maker prepares; Checker hits real backend `submit`/`finalize`. See [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Maker-checker UI overlay".

---

## Conventions & required reading (load once, reference everywhere)

Every task assumes familiarity with these. Skim before picking up any task.

### Reference-doc precedence (most important)

Sources disagree in places. When they do, follow this order. Higher entries win. Mirror in [context/CORE_MEMORY.md](../context/CORE_MEMORY.md#reference-doc-precedence-group-pas-v1).

1. **DSL specs (canon):** [docs/spec/](spec/) — `quotation/`, `issuance/`, `policy-admin/`, `common/`. Backend has confirmed all DSL values are stable. The `.api` files are the authoritative endpoint contracts.
2. **V1 blueprint:** [docs/planning/team_nb_blueprint_v3.md](planning/team_nb_blueprint_v3.md) — V1 narrative + scope.
3. **Original product spec:** [docs/planning/GTL Quotation Module (3).md](<planning/GTL Quotation Module (3).md>) — long-term direction; V1 is a subset.
4. **OpenAPI snapshot (stale):** [docs/planning/openapi.json](planning/openapi.json) — disagrees with DSL in places (e.g. `ProposalMember` vs DSL's `PolicyMember`). Useful for cross-checking shapes; trust DSL on conflict.
5. **Future-state workflow:** [docs/planning/SAMPLE-WORKFLOW.md](planning/SAMPLE-WORKFLOW.md) — what we build toward, not V1.

### Frontend conventions

- **Architecture overview & module-creation walkthrough:** [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](NEW_MODULE_IMPLEMENTATION_GUIDE.md) — schema-driven model, file layout, form registration, API route pattern, nav config.
- **State patterns:** [docs/STATE_MANAGEMENT_GUIDE.md](STATE_MANAGEMENT_GUIDE.md).
- **Widget engine:** [src/components/registry/WidgetRegistry.tsx](../src/components/registry/WidgetRegistry.tsx), [src/components/registry/WidgetRenderer.tsx](../src/components/registry/WidgetRenderer.tsx).
- **Data hooks:** [src/hooks/useSmartQuery.ts](../src/hooks/useSmartQuery.ts) (reads), [src/hooks/useActionHandler.ts](../src/hooks/useActionHandler.ts) (writes/navigation/modals), [src/hooks/useWidgetState.ts](../src/hooks/useWidgetState.ts).
- **Schema layout:** schemas live at repo-root `/schemas/`, not `src/schemas/`. Page schemas at `schemas/<module>.json`, tab schemas under `schemas/tabs/<module>/`, form schemas under `schemas/forms/` and exported from [schemas/forms/index.ts](../schemas/forms/index.ts).
- **Mock layer:** [src/mocks/original/group-insurance/](../src/mocks/original/group-insurance/) — `config/` (app + page configs), `data/` (fixtures), `index.ts`, `page-config-service.ts`.
- **Schema resolver:** [src/lib/schemaResolver.ts](../src/lib/schemaResolver.ts) resolves `$ref`.
- **Reference templates (do NOT delete):** accounting module is the cleanest schema-driven module to mirror — [schemas/accounting.json](../schemas/accounting.json), [schemas/tabs/accounting/](../schemas/tabs/accounting/), [src/app/accounting/](../src/app/accounting/), [src/app/api/accounting/](../src/app/api/accounting/).

### Coding conventions used throughout

- **State-action map:** every list/detail schema that drives lifecycle UI carries a `stateActions: Record<State, ActionId[]>` block. The new `ActionBar` widget consumes this. See Task 1.3.
- **Role-action map:** alongside `stateActions`, schemas may carry `roleActions: Record<Role, ActionId[]>`. The `ActionBar` enables an action only if both maps allow it for current state + role. See Task 1.9.
- **Reason banners:** entities with `pendingReason` / `voidReason` / `cancellationReason` show a banner above the detail header explaining *why* an entity is in its current state. Mapping in `state-map.ts` (Task 1.8).
- **State-driven sibling widgets, polling-with-stop, form-edit-vs-readonly switching, role as a widget-state key:** see [docs/STATE_MANAGEMENT_GUIDE.md §8](STATE_MANAGEMENT_GUIDE.md#8-patterns-the-schema-driven-engine-supports-verbosely-v1) for the canonical patterns. Every state-driven detail page and editable-by-state form follows §8.2 / §8.3 — don't reinvent.
- **Composite cells (state + reason in one column):** *not* used in V1 — render state and reason as **separate columns**. Composite cell type deferred (see Open items).

---

## Process & workflow (mandatory for every task)

Start of every session, regardless of which task you pick up:

1. Read [context/HANDOFF.md](../context/HANDOFF.md) — single resume entry point.
2. Read [context/CORE_MEMORY.md](../context/CORE_MEMORY.md) — standing execution preferences (logging protocol, build approach, schema architecture, branch hygiene, V1 scope locks, **reference-doc precedence**, **V1 interim assumptions**).
3. Read the latest entries in [context/SESSION_LOG.md](../context/SESSION_LOG.md) so you know what just happened.
4. Then proceed with the task.

**Mandatory logging protocol:**
- Before starting a non-trivial task, append a dated entry to `context/SESSION_LOG.md` saying what's about to be done and which task ID (e.g. "Task 2.4.2 — Plans tab").
- After completing it, edit that entry with: results, files touched, tests run, next steps.
- If a phase or workstream changes status, update the table in `context/HANDOFF.md` Active Workstreams in the same commit.

**Architecture transitions:**
If a task introduces an interim pattern that the future architecture is expected to simplify (e.g. polling vs SSE), add or update an entry in [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) capturing the interim contract, the risk, and the convergence trigger.

**Pipeline skills:**

The repo has skills under [.claude/skills/](../.claude/skills/). Use them rather than freelancing:

- **`/build-feature <task-id-or-description>`** — multi-stage CLARIFY → DESIGN → BUILD pipeline with user gates. Best fit for any individual task in Phases 2–5. Writes a per-run design doc under `context/build-feature/<run-id>/design.md` and stage logs under `agent_logs/build-feature/<run-id>/`.
- **`/propose`** — file a `proposals/PROP-NNNN-<slug>.md` when you spot a recurring problem outside the locked plan.
- **`/review-proposals`** — triage drafts and decide approve/reject/defer.
- **`/execute-proposal PROP-NNNN`** — pick up an approved proposal, branch, implement, push PR.
- **`/preview-and-deploy`** — lint + test + preview gate. Use as the verify step at the end of any UI task.
- Spec/test helpers: `/specs-to-draft`, `/refine-specs-to-draft`, `/specs-to-tests`, `/extract-usecase`, `/design-system`.

**Branch hygiene:** stay on the current branch and commit sequentially. Do NOT create a new branch per task unless the user asks.

---

## Phase 0 — Teardown (sequential; blocks all later phases)

### Task 0.1 — Delete legacy quotations module + auth-branch zombie forms

**Context to load:**
- Survey what depends on the modules: `grep -r "quotations" src/ schemas/ --include="*.ts" --include="*.tsx" --include="*.json"` before deleting.
- The legacy quotations module pre-dates the new backend and will conflict on naming.
- Several auth-branch forms (`add-member-form`, `bulk-upload-form`, etc.) are *bundled* in [schemas/forms/index.ts](../schemas/forms/index.ts) but reference a `stepper-form` widget that isn't in `src/components/widgets/forms/` on this branch — dead code.

**Files to delete:**

Legacy quotations:
- `src/app/quotations/` (page + detail routes)
- `src/app/api/quotations/` (all sub-routes: route.ts, [id]/route.ts, [id]/{plans,exclusions,subsidiaries,members,documents,summary}/route.ts)
- `schemas/quotations.json`, `schemas/quotations-detail.json`
- Quotation-specific tab schemas under `schemas/tabs/`: `headcount.json`, `subsidiaries.json`, `members.json`, `documents.json`, `qtn-detail-help-sheet.json`, `policy-exclusion.json` (and any others tied to legacy quotation IA — verify each by grep).
- Quotation-specific forms under `schemas/forms/`: `create-quotation-form.json`, `key-data-form.json`, `add-headcount-form.json`, `add-subsidiary-form.json`, `edit-subsidiary-form.json`, `add-document-form.json`, `request-document-form.json`, `verify-document-form.json`, `bulk-verify-form.json`, `dummy-member-form.json`, `add-dependent-form.json`, `edit-member-form.json`, `cancel-member-form.json`, `surrender-member-form.json`, `member-exclusions-form.json`, `add-exclusion-form.json`, `edit-exclusion-form.json`, `pre-existing-conditions-form.json`, `resolve-conflict-form.json`, `upload-members-form.json`, `policy-flags-governance-form.json`, `policy-profile-form.json`. Keep accounting/payout/claims forms.
- Quotation tests: [src/tests/schemas/QuotationListTable.test.tsx](../src/tests/schemas/QuotationListTable.test.tsx), [src/tests/schemas/CreateQuotationForm.test.tsx](../src/tests/schemas/CreateQuotationForm.test.tsx) and any others under `src/tests/` referencing quotations.
- Quotation mocks under `src/mocks/original/group-insurance/data/` — verify each file's purpose and delete only quotation-tied ones.

Auth-branch zombies (bundled into [schemas/forms/index.ts](../schemas/forms/index.ts) but their widget isn't on this branch):
- The `add-member-form` and `bulk-upload-form` JSON entries in `schemas/forms/index.ts` (and any sibling `mph-*` entries that reference `stepper-form` or `file-upload` widgets that aren't registered here).
- Any `src/app/api/mph/...` route stubs if they exist.

**After deletions:** update [schemas/forms/index.ts](../schemas/forms/index.ts) to remove deleted form imports. Run `npm run build` to surface broken refs.

**Done when:** `npm run build` and `npm test` pass with the modules removed and nav not yet updated (broken link is acceptable, fixed in 0.2).

### Task 0.2 — Update navigation config

**Context to load:**
- [src/mocks/original/group-insurance/config/](../src/mocks/original/group-insurance/config/) — find the app-config-mock file (likely `app-config-mock.ts`).
- [src/components/AppSidebar.tsx](../src/components/AppSidebar.tsx) for nav rendering.

**Output:**
- Replace legacy quotations nav entry with three new top-level entries: **Quotation**, **Issuance**, **Policy Admin**. Each entry's URL should resolve once Phase 2/3/4 ships; for now they point to placeholder routes.
- Under Quotation, add a disabled child item "Member Quotes (GCL)" labelled "Coming soon" so the IA stays stable when GCL ships later.
- Pick lucide icons (e.g. `FileText`, `Building2`, `ShieldCheck`).

**Done when:** sidebar renders the three modules; clicking each navigates to a placeholder page (404 acceptable until pages exist).

---

## Phase 1 — Shared infrastructure (all parallel; blocks Phases 2–4)

### Task 1.1 — TypeScript domain types

**Context to load:**
- Domain entities (DSL, canon): [docs/spec/quotation/QuotationDomain.domain](spec/quotation/QuotationDomain.domain) and `QuotationData.data`
- [docs/spec/issuance/IssuanceDomain.domain](spec/issuance/IssuanceDomain.domain) and `IssuanceData.data`
- [docs/spec/policy-admin/PolicyAdminDomain.domain](spec/policy-admin/PolicyAdminDomain.domain) and `PolicyAdminData.data`
- [docs/spec/common/CommonData.data](spec/common/CommonData.data) and `CommonDomain.domain`
- DTOs in the `.query` files (response shapes).
- Latest PAM additions: `MemberDto.cancellationReason?: string`; `MemberSummaryDto.pendingReason?: MemberPendingReason`; cross-ref renamed to `policyMemberId` everywhere.

**Output:**
- `src/types/group-pas/quotation.ts` — `Quote`, `QuoteSummaryDto`, `QuoteDto`, `Plan`, `MemberQuote`, `QuotePremium`, status enum (`DRAFT | SUBMITTED | SENT_TO_CLIENT | ACCEPTED | FINALIZED | REJECTED | WITHDRAWN | EXPIRED`).
- `src/types/group-pas/issuance.ts` — `Proposal`, `ProposalDto`, `PolicyMember`, `PolicyMemberSummaryDto`, `CensusSubmission`, `CensusSubmissionRow`, state enums, `ClassificationLane: 'STP' | 'REPAIR' | 'REVIEW' | 'REJECT'`.
- `src/types/group-pas/policy-admin.ts` — `Client`, `Policy`, `Member` (with `pendingReason?`, `voidReason?`, `cancellationReason?`), summary DTOs (`MemberSummaryDto.pendingReason?`), state enums (`PolicyState`, `MemberState`), reason enums:
  - `PolicyPendingReason: AWAITING_MIN_MEMBERS | AWAITING_COMPLIANCE`
  - `MemberPendingReason: PENDING_FLOAT_RESERVATION | PENDING_APPROVAL | PENDING_POLICY_ACTIVATION`
  - `MemberVoidReason: FLOAT_UNAVAILABLE | APPROVAL_REJECTED | POLICY_CANCELLED | WITHDRAWN_BY_PROPOSER`
- `src/types/group-pas/common.ts` — `Money`, `MemberData`, `MemberPremium`, shared value objects.
- `src/types/group-pas/roles.ts` — `Role: 'maker' | 'checker' | 'ops' | 'viewer'` + `RoleContext` shape.
- `src/types/group-pas/index.ts` re-exports.

**Done when:** types compile; consumed by Tasks 1.2 and 1.5.

### Task 1.2 — API clients

**Context to load:**
- Endpoint contracts (DSL, canon): [docs/spec/quotation/QuotationApi.api](spec/quotation/QuotationApi.api), [docs/spec/issuance/IssuanceApi.api](spec/issuance/IssuanceApi.api), [docs/spec/policy-admin/PolicyAdminApi.api](spec/policy-admin/PolicyAdminApi.api). Source of truth for path, method, request/response.
- Existing `fetch`-based pattern in [src/app/api/](../src/app/api/) — there is no central fetch wrapper. Build a thin one with optional bearer-token slot (so swapping in real auth later is a config change, not a rewrite).
- React Query usage: [src/hooks/useSmartQuery.ts](../src/hooks/useSmartQuery.ts).

**Output:**
- `src/lib/api/quotation.ts` — function per endpoint in `QuotationApi.api`. Typed via Task 1.1 types.
- `src/lib/api/issuance.ts` — function per endpoint in `IssuanceApi.api` (including `CensusSubmissionAPI` endpoints).
- `src/lib/api/policy-admin.ts` — function per endpoint in `PolicyAdminApi.api`. Note PAM cross-ref endpoint is `/members/by-policy-member/:policyMemberId`.
- `src/lib/api/error-mapper.ts` — single mapper for the assumed Spring-style error shape `{ message, errors?: [{ field, message }] }`. See [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Error response shape".
- All three call relative paths (`/api/quotation/*` etc.); the Next API routes (Task 1.4) proxy to the real backend or return mocks.

**Done when:** every endpoint in the three `.api` files has a typed client function; clients can be imported and called from a sample page.

### Task 1.3 — `ActionBar` widget

**Context to load:**
- Widget pattern: [src/components/registry/WidgetRegistry.tsx](../src/components/registry/WidgetRegistry.tsx) — how widgets are registered.
- Action handling: [src/hooks/useActionHandler.ts](../src/hooks/useActionHandler.ts) — supports `navigate`, `api-mutation`, `open-modal`, etc.
- Existing button patterns under [src/components/ui/](../src/components/ui/) for visual consistency with the design-system pass.
- Role context (Task 1.9) — `useRole()` hook.

**Output:**
- `src/components/widgets/actions/ActionBar.tsx` — props: `state: string`, `stateActions: Record<string, string[]>`, `roleActions?: Record<string, string[]>`, `actions: Action[]`. Action enabled iff `state` ∈ stateActions for it AND (no roleActions OR `currentRole` ∈ roleActions for it). Disabled actions render with hover tooltip indicating the gating reason ("Not available in <state>" / "Requires <role> role").
- Register `"action-bar"` in `WidgetRegistry`.
- Storybook story or unit test demonstrating state-driven + role-driven enable/disable.

**Done when:** `<ActionBar>` consumed via schema renders correctly across at least three sample states × three sample roles.

### Task 1.4 — Mock API route handlers

**Context to load:**
- Existing template: [src/app/api/accounting/[[...path]]/route.ts](../src/app/api/accounting/[[...path]]/route.ts) — catch-all proxy/mock pattern.
- Endpoints to mock: every endpoint in the three `.api` files in [docs/spec/](spec/).

**Output (parallel sub-tasks per module):**
- `src/app/api/quotation/[[...path]]/route.ts` — catch-all returning fixtures from Task 1.5 for GETs, echo-success for POST/PUT/DELETE.
- `src/app/api/issuance/[[...path]]/route.ts` — same.
- `src/app/api/policy-admin/[[...path]]/route.ts` — same.
- A toggle (env var `GROUP_PAS_BACKEND_URL`) that, when set, proxies to real backend instead of returning fixtures. Same handler doubles as proxy — no MSW.
- Workflow simulator hook: routes for `request-price`, `submit`, `finalize`, `send-for-issuance`, classification etc. flip the relevant entity's state on a delay so polling consumers see realistic transitions.

**Done when:** every endpoint in the three `.api` files responds 200 with realistic-shaped data. Curl smoke-test all list endpoints.

### Task 1.5 — Mock fixtures

**Context to load:**
- Workflow files for realistic state distribution: [docs/spec/quotation/QuoteWorkflow.workflow](spec/quotation/QuoteWorkflow.workflow), [docs/spec/issuance/MemberLifecycleFlow.workflow](spec/issuance/MemberLifecycleFlow.workflow), [docs/spec/policy-admin/PolicyActivationFlow.workflow](spec/policy-admin/PolicyActivationFlow.workflow), [docs/spec/policy-admin/MemberEnrollmentFlow.workflow](spec/policy-admin/MemberEnrollmentFlow.workflow).
- Existing mock pattern: [src/mocks/original/group-insurance/data/](../src/mocks/original/group-insurance/data/).

**Output:**
- `src/mocks/group-pas/quotation/quotes.ts` — ~10 quotes spread across all 8 statuses. Each has plans, census, and a couple have priced premiums. At least one in `awaitingApproval: true` UI-overlay state for the maker-checker demo.
- `src/mocks/group-pas/issuance/proposals.ts` — ~5 proposals (CREATED, POLICY_CREATED).
- `src/mocks/group-pas/issuance/policy-members.ts` — ~20 PolicyMembers covering every state (CREATED, MAF_PENDING, MAF_CONFIRMED, CLASSIFYING, APPROVED, REPAIR_PENDING, REVIEW_PENDING, REJECTED, ADDED). At least one in REPAIR_PENDING with classification errors.
- `src/mocks/group-pas/issuance/census.ts` — 2 submissions: one INGESTED with mixed-status rows, one COMPLETED.
- `src/mocks/group-pas/policy-admin/clients.ts` — ~5 clients ACTIVE.
- `src/mocks/group-pas/policy-admin/policies.ts` — ~5 policies (PENDING with various pendingReasons, ACTIVE, CANCELLED).
- `src/mocks/group-pas/policy-admin/members.ts` — ~15 members:
  - PENDING samples covering every `MemberPendingReason` (PENDING_FLOAT_RESERVATION, PENDING_APPROVAL, PENDING_POLICY_ACTIVATION).
  - ACTIVE samples.
  - VOID samples covering every `MemberVoidReason` (FLOAT_UNAVAILABLE, APPROVAL_REJECTED, POLICY_CANCELLED, WITHDRAWN_BY_PROPOSER).
  - At least one CANCELLED with a `cancellationReason` free-text value.
  - Summary fixtures (for list endpoints) carry `pendingReason` so the policy → members tab can render reason badges inline.
- All fixtures use Task 1.1 types.

**Done when:** Task 1.4 mock routes return these fixtures and screens render realistic data.

### Task 1.6 — `PresignedUploader` widget

**Context to load:**
- File URL endpoint contracts in all three `.api` files: `/files/upload-url` and `/files/download-url`.
- Action handler: [src/hooks/useActionHandler.ts](../src/hooks/useActionHandler.ts) for the `api-mutation` pattern that returns a URL to follow.

**Output:**
- `src/components/widgets/files/PresignedUploader.tsx` — props: `module: 'quotation'|'issuance'|'policy-admin'`, `onUploaded(fileRef)`. Two-step: POST `/files/upload-url`, then PUT to returned URL with progress.
- Download variant: `PresignedDownloadButton.tsx`.
- Register `"presigned-uploader"` and `"presigned-download"` in WidgetRegistry.
- V1 PUT target is the same-origin Next.js mock route (per [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "File upload destination").

**Done when:** uploader works against a mocked upload URL endpoint; consumed by census + rate card + DMN flows in later phases.

### Task 1.7 — `useEnum` hook

**Context to load:**
- `/api/<module>/enums/:enumType?search=` endpoint signatures in the `.api` files.
- React Query setup in [src/hooks/useSmartQuery.ts](../src/hooks/useSmartQuery.ts).

**Output:**
- `src/hooks/useEnum.ts` — `useEnum(module, enumType, search?)`. Long stale time (5 min). Returns `string[]`.
- Wire into select-field rendering so a schema can declare `"options": { "enum": "policyType", "module": "quotation" }`.

**Done when:** at least one form field in a Phase 2 schema is populated via `useEnum`.

### Task 1.8 — State-badge helpers + reason banners

**Context to load:**
- Status enums from Task 1.1 types.
- Existing badge component [src/components/ui/badge.tsx](../src/components/ui/badge.tsx) and design-system colour conventions.
- All three reason enums (PolicyPendingReason, MemberPendingReason, MemberVoidReason) plus the free-text `cancellationReason`.

**Output:**
- `src/components/widgets/state/StateBadge.tsx` — single badge component taking `entity` (`'quote' | 'proposal' | 'policyMember' | 'policy' | 'member'`) and `state`. Maps to colour + label.
- `src/components/widgets/state/ReasonBanner.tsx` — banner component shown above detail headers when an entity carries a `pendingReason`, `voidReason`, or `cancellationReason`. Uses the canonical label per enum value.
- Internal map: `src/components/widgets/state/state-map.ts` exporting all label/colour pairs + reason copy. Imported by `ActionBar` tooltips, `StateBadge`, `ReasonBanner`, and list cells.
- Register `"state-badge"` and `"reason-banner"` in WidgetRegistry so schemas can use them as column renderers / detail-header sub-widgets.

**Done when:** every lifecycle state across all three modules has a defined label + colour; every reason enum value has a banner copy; CANCELLED member with `cancellationReason` renders the free-text correctly.

### Task 1.9 — Role switcher + role-aware action gating (NEW)

**Context to load:**
- [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Maker-checker UI overlay" — the interim contract.
- Existing top-shell component (likely [src/components/AppSidebar.tsx](../src/components/AppSidebar.tsx) plus a header/topbar; locate during DISCOVER) for placement.
- Role-actions convention: per-schema `roleActions: Record<Role, ActionId[]>` map, consumed by `ActionBar` (Task 1.3).

**Output:**
- `src/contexts/RoleContext.tsx` — provider holding current role; reads/writes `localStorage` key `group-pas:current-role`. Default role: `maker`.
- `src/hooks/useRole.ts` — `useRole()` returning `{ role, setRole }`.
- `src/components/widgets/role/RoleSwitcher.tsx` — top-bar widget showing the active role and a dropdown to switch. Renders the role's display label (e.g. "Maker — Sales") and an icon (lucide).
- Register `"role-switcher"` in WidgetRegistry; mount in the top shell so it's visible across all routes.
- `src/lib/maker-checker.ts` — small helper exposing the UI-only "send for approval" overlay state. Wraps mock-route persistence of `awaitingApproval: true` on Quote/Proposal records.
- Default role-actions per V1 demo flow (encoded into each module's schemas — see Phases 2–4):

| Action | Maker | Checker | Ops | Viewer |
|---|---|---|---|---|
| Quote: Edit / Add plan / Set census / Upload mapping / Request price | ✓ | | | |
| Quote: Send for approval (UI-only) | ✓ | | | |
| Quote: Approve (= real backend `submit`) | | ✓ | | |
| Quote: Reject (= revert to DRAFT) | | ✓ | | |
| Quote: Send to client / Finalize | | ✓ | | |
| Quote: Withdraw | ✓ | ✓ | | |
| Proposal: Submit | ✓ | | | |
| Proposal: Finalize / Cancel | | ✓ | | |
| PolicyMember: Add / Edit (REPAIR_PENDING) | ✓ | | ✓ | |
| PolicyMember: Send for issuance | | ✓ | | |
| PolicyMember: Reject / Archive | | ✓ | ✓ | |
| Policy: Cancel | | ✓ | | |
| Anything | (read) | (read) | (read) | (read) |

**Done when:** RoleSwitcher visible in top shell; switching role updates `useRole()` consumers in real time; ActionBar correctly gates buttons across at least one quote in each lifecycle state under each role; the maker-checker overlay flow can be demoed end-to-end on a quote (Maker → Send for approval → Checker switches role → Approve → real submit fires).

---

## Phase 2 — Quotation module (parallel with Phase 3)

Sub-tasks 2.4.x are parallel after the shell (2.3) lands.

### Task 2.1 — Quote list page

**Context to load:**
- Endpoints: [docs/spec/quotation/QuotationApi.api](spec/quotation/QuotationApi.api) — `/api/quotation/quotes/search`, `/quotes/list`, `/quotes/by-status`, `/quotes/by-client`. Query: `SearchQuotesQuery` in `QuotationQuery.query`.
- Template: [schemas/accounting.json](../schemas/accounting.json) and an accounting tab using `data-table`, e.g. [schemas/tabs/accounting/](../schemas/tabs/accounting/).

**Output:**
- `schemas/quote.json` — page with `data-table` driven by Task 1.2 client. Columns: quoteNumber, clientName, policyType, status (renders `state-badge`), `awaitingApproval` flag (renders a "pending approval" badge when set, for the maker-checker overlay), effectiveDate, premium total, updatedAt. Filters: status, policyType, clientId. Saved-view chips: Drafts, Submitted, Sent to client, Accepted, Ready to finalize, **Pending approval (mine)**, **Pending approval (queue)**.
- Row actions: View, Edit (DRAFT only, Maker only), Withdraw. `roleActions` map gates Edit/Withdraw to Maker; View visible to all.
- `src/app/quotation/page.tsx` — server component loading the schema (mirror [src/app/accounting/page.tsx](../src/app/accounting/page.tsx) if it exists, or the existing accounting page entry).

**Done when:** list renders fixtures from Task 1.5; saved-view chips switch the underlying status filter; row actions wired; role gating verified by switching the RoleSwitcher.

### Task 2.2 — Quote create form

**Context to load:**
- Command: `CreateQuoteCommand` in [docs/spec/quotation/QuotationCommand.command](spec/quotation/QuotationCommand.command). Required fields per `CreateQuoteRequest`.
- Form pattern walkthrough: [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](NEW_MODULE_IMPLEMENTATION_GUIDE.md) Step 3.
- Form registration: [schemas/forms/index.ts](../schemas/forms/index.ts).

**Output:**
- `schemas/forms/create-quote-form.json` — fields: clientId (lookup or select), policyType (`useEnum`), premiumType (`useEnum`), effectiveDate, expiryDate, inceptionDate, lineOfBusiness, riskTermClassification, ageDefinitionRule.
- Register form in `schemas/forms/index.ts`.
- "New Quote" header action on the list page (Task 2.1) opens form as modal; on submit, calls `CreateQuoteCommand` and navigates to `/quotation/[id]`. Maker-only via `roleActions`.

**Done when:** form validates, submits, redirects to detail page (which 404s until 2.3 ships); button hidden under Checker/Ops/Viewer roles.

### Task 2.3 — Quote detail shell

**Context to load:**
- Endpoint: `GET /api/quotation/quotes/:quoteId` → `QuoteDto`.
- Template: existing detail-with-tabs route (e.g. accounting sub-routes if multi-level).
- Maker-checker overlay: [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Maker-checker UI overlay".

**Output:**
- `schemas/quote-detail.json` — page with header (StateBadge, key meta: quoteNumber, client, policyType, dates, plus a "Pending approval (submitted by …)" banner when `awaitingApproval` is set), `ActionBar` driven by `stateActions` + `roleActions`, then `tabs-layout` referencing six tab schemas (key-data, plans, census, member-mapping, pricing, member-quotes-placeholder).
- `stateActions` map for Quote (encode in schema):
  - `DRAFT` & `awaitingApproval=false` → `sendForApproval`, `withdraw`
  - `DRAFT` & `awaitingApproval=true` → `approve`, `reject`, `withdraw`
  - `SUBMITTED` → `sendToClient`, `withdraw`
  - `SENT_TO_CLIENT` → `accept`, `reject`, `withdraw`, `expire`
  - `ACCEPTED` → `finalize`, `withdraw`
  - `FINALIZED`/`REJECTED`/`WITHDRAWN`/`EXPIRED` → `[]`
- `roleActions` map (matches Task 1.9 table). Note: `approve` action is the real backend `POST /quotes/:id/submit`; `sendForApproval` is mock-layer-only (sets `awaitingApproval: true`).
- `src/app/quotation/[id]/page.tsx` — loads schema, substitutes `{{id}}`.

**Done when:** detail page renders, state badge correct, action bar shows correct buttons per state × role across all 8 statuses (verify with mock fixtures from Task 1.5); maker-checker hand-off demoable end-to-end.

### Task 2.4.1 — Key Data tab

**Context to load:**
- Command: `UpdatePolicyDetailCommand` (`UpdatePolicyDetailRequest`).
- Editable only when `status === 'DRAFT'` AND `awaitingApproval === false` AND `role === 'maker'`.

**Output:**
- `schemas/tabs/quote/key-data.json` — form-container with editable fields matching `UpdatePolicyDetailRequest`. Read-only when state/role/overlay disqualifies edit.
- Register form schema if separated.

**Done when:** editing a DRAFT quote persists under Maker role; non-DRAFT or non-Maker shows read-only.

### Task 2.4.2 — Plans tab

**Context to load:**
- Commands: `AddPlanCommand`, `UpdatePlanCommand`, `RemovePlanCommand`.
- Plan structure: `Plan` and nested products/benefits in `QuotationDomain.domain`.

**Output:**
- `schemas/tabs/quote/plans.json` — data-table of plans with columns: planNo, products (count or summary), benefits (count or summary), rateCardFile (download link via `presigned-download`). Header action "Add Plan" opens `add-plan-form` (Maker only via roleActions).
- `schemas/forms/add-plan-form.json` — plan number, products multi-select, benefits per product, rate-card upload via `PresignedUploader` widget. Register in `schemas/forms/index.ts`.
- Edit/remove row actions (Maker only, DRAFT only).

**Done when:** add/edit/remove plan persists in DRAFT under Maker; locked otherwise.

### Task 2.4.3 — Census tab

**Context to load:**
- Commands: `UpdateCensusFileFormatCommand`, `UpdateAggregateCensusCommand`.
- Aggregate census shape (per-plan headcount breakdown): `QuotationDomain.domain` → `aggregateCensus` and `UpdateAggregateCensusRequest` shape.
- Census file format: per DSL, a Frictionless Table Schema JSON.

**Output:**
- `schemas/tabs/quote/census.json` — two sub-sections (Maker-only edits, DRAFT-only):
  - File format: upload (`PresignedUploader`) or paste-JSON for `censusFileFormat`. Save calls `UpdateCensusFileFormatCommand`.
  - Aggregate counts: editable grid keyed by planNo, columns for total headcount + dependent counts. Save calls `UpdateAggregateCensusCommand`.

**Done when:** both sub-sections persist and survive page reload.

### Task 2.4.4 — Member-to-Plan Mapping tab

**Context to load:**
- Command: `UpdateMemberToPlanMappingCommand`. Per [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Member-to-Plan Mapping (DMN ref)", V1 = file ref only, no authoring UI.

**Output:**
- `schemas/tabs/quote/member-mapping.json` — display current ref, "Replace" action triggers `PresignedUploader` for DMN; on success calls `UpdateMemberToPlanMappingCommand` with the returned ref. Maker-only, DRAFT-only.

**Done when:** upload + persist round-trips.

### Task 2.4.5 — Pricing tab

**Context to load:**
- Command: `RequestQuotePriceCommand` (POST `/quotes/:id/request-price`).
- Premium shape: `QuotePremium` (total + byPlan breakdown) on `QuoteDto`.
- Async behaviour: backend computes via Rule Engine; frontend polls per [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Async transition signalling".
- **Polling pattern:** [docs/STATE_MANAGEMENT_GUIDE.md §8.1](STATE_MANAGEMENT_GUIDE.md#81-polling-until-an-async-backend-computation-completes). Use `dataSource.refreshInterval` + `dataSource.stopWhen` (already supported by `useSmartQuery`).

**Output:**
- `schemas/tabs/quote/pricing.json` — "Request price" button (Maker only, DRAFT only). On click: trigger the action, then poll the Quote endpoint every 5s with `stopWhen: { "!=": [{ "var": "premium" }, null] }`. Component-level 30s hard timeout flips a "still working" banner. Display total + per-plan breakdown card.

**Done when:** action triggers refetch loop; polling stops when premium populates; mock route flips a quote's premium after first refetch to validate.

### Task 2.4.6 — Member Quotes (GCL) placeholder tab

**Context to load:** none — intentional UI deferral per [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "GCL endpoints".

**Output:**
- `schemas/tabs/quote/member-quotes-placeholder.json` — empty-state widget reading "GCL Member Quotes — coming in a future release". No actions.

**Done when:** tab renders.

---

## Phase 3 — Policy Admin read views (parallel with Phase 2)

### Task 3.1 — Clients list + detail

**Context to load:**
- Endpoints: [docs/spec/policy-admin/PolicyAdminApi.api](spec/policy-admin/PolicyAdminApi.api) — `/clients/search`, `/clients/list`, `/clients/:clientId`.
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
- Pending breakdown semantics: [docs/spec/policy-admin/PolicyAdminQuery.query](spec/policy-admin/PolicyAdminQuery.query) → counts grouped by `pendingReason`.
- Workflow: [docs/spec/policy-admin/PolicyActivationFlow.workflow](spec/policy-admin/PolicyActivationFlow.workflow) to understand when/why members are pending.
- New: `MemberSummaryDto.pendingReason?` is now exposed — surface it in the members list inline.

**Output:**
- `schemas/policy-detail.json` — tabs:
  - Overview: state, threshold, dates, premium, links to source proposal & quote.
  - Pending breakdown card showing `Map<pendingReason, count>`.
  - Members tab embedding `schemas/tabs/policy/members.json` (next).
- `schemas/tabs/policy/members.json` — list of members for this policy with state filter, saved-view chips: Pending, Active, Void, **Cancelled**. Render `state` and `pendingReason` as **two separate columns** (per V1 convention — composite cell type is deferred; see Open items). PENDING rows show both badges side by side; non-PENDING rows leave the reason column empty.
- `ActionBar` with `stateActions`: PENDING/ACTIVE → `cancel` (Checker only). Otherwise none.
- `src/app/policy-admin/policies/[id]/page.tsx`.

**Done when:** detail renders, pending breakdown card matches fixtures, member tab filters work (incl. CANCELLED chip), reason badges visible on pending rows, cancel action wired (Checker only).

### Task 3.4 — Member detail (PAM)

**Context to load:**
- Endpoint: `GET /api/policy-admin/members/:memberId` and **`GET /api/policy-admin/members/by-policy-member/:policyMemberId`** (renamed from `by-proposal-member` — backend confirmed).
- Domain: `Member` in [docs/spec/policy-admin/PolicyAdminDomain.domain](spec/policy-admin/PolicyAdminDomain.domain) — note `pendingReason`, `voidReason`, `cancellationReason`, `floatReservationId`, `transactionRefs`, `additionalAttributesJson`.
- Workflow: [docs/spec/policy-admin/MemberEnrollmentFlow.workflow](spec/policy-admin/MemberEnrollmentFlow.workflow) so the UI text matches the workflow gates.
- Reason banner: Task 1.8's `ReasonBanner` component; one banner per reason family (PENDING + pendingReason, VOID + voidReason, CANCELLED + cancellationReason).

**Output:**
- `schemas/member-detail.json` — read-only. Header with StateBadge + ReasonBanner. Sections: identity, plan + sumInsured, premium breakdown, transactionRefs list, floatReservationId, `cancellationReason` (when CANCELLED), `additionalAttributesJson` rendered as key/value table.
- `src/app/policy-admin/members/[id]/page.tsx`.

**Done when:** detail renders for fixture members across PENDING (every reason), ACTIVE, VOID (every reason), CANCELLED (with `cancellationReason` shown as free text).

---

## Phase 4 — Issuance module (depends on Phase 3 routes existing for cross-links)

### Task 4.1 — Proposals list

**Context to load:** [docs/spec/issuance/IssuanceApi.api](spec/issuance/IssuanceApi.api) — `/proposals/search`, `/proposals/by-state`, `/proposals/list`.

**Output:**
- `schemas/proposal.json` — data-table: proposalId, quoteId link, clientName, state (StateBadge), policyType, createdAt. Saved-view chips: Created, Policy created.
- `src/app/issuance/proposals/page.tsx`.

**Done when:** list renders, chip filtering works, links to detail.

### Task 4.2 — Proposal detail shell

**Context to load:**
- Endpoint `/proposals/:proposalId` → `ProposalDto`.
- Commands: `SubmitProposalCommand`, `FinalizeProposalCommand`, `CancelProposalCommand`.
- Workflow: [docs/spec/issuance/ProposalFlow.workflow](spec/issuance/ProposalFlow.workflow) (W2) — short-lived; `FinalizeProposal` triggers PAM `CreatePolicy`.
- Quote → Proposal handoff is auto-create per [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) — frontend polls for the new proposal after Quote `finalize`.

**Output:**
- `schemas/proposal-detail.json` — header (StateBadge, proposalId, source quote link, policyId link if POLICY_CREATED), `ActionBar` with `stateActions` { CREATED: [submit, cancel], SUBMITTED: [finalize, cancel], POLICY_CREATED: [], CANCELLED: [] }, `roleActions` { submit: maker, finalize: checker, cancel: checker }, then tabs:
  - Overview (read-only data copied from quote: plans, aggregate census, estimated premium)
  - Members (Task 4.3)
  - Census (Task 4.5)
- `src/app/issuance/proposals/[id]/page.tsx`.

**Done when:** action bar transitions correctly under each role; cancel modal collects reason; finalize navigates to created policy on success.

### Task 4.3 — Members tab + list inside proposal

**Context to load:**
- Endpoints (per DSL — note: `/policies/:policyId/...` paths because PIM scopes by the policy created at W2 step 1): `/policies/:policyId/members`, `/policies/:policyId/members/by-state`, `/policy-members/search`.
- States: full PolicyMember lifecycle from [docs/spec/issuance/IssuanceDomain.domain](spec/issuance/IssuanceDomain.domain).

**Output:**
- `schemas/tabs/proposal/members.json` — data-table of policy members. Columns: name, planNo, state (StateBadge), classification lane, premium. State filter + saved-view chips: All, Repair queue (REPAIR_PENDING), UW review (REVIEW_PENDING), Approved, Added, Rejected.
- Header actions: "Add member" (Maker) → opens single-add form (Task 4.4); "Bulk upload (census)" (Maker) → navigates to census flow (Task 4.5).

**Done when:** chip filters return correct subsets from fixtures; queue chips show counts; role gating verified.

### Task 4.4 — Single-member create + state-driven detail (the core operational screen)

**Context to load:**
- Commands: `CreatePolicyMemberCommand`, `UpdateMemberCommand`, `PriceMemberCommand`, `SendMemberForIssuanceCommand`, `RejectMemberCommand`, `ArchiveMemberCommand` — all in [docs/spec/issuance/IssuanceCommand.command](spec/issuance/IssuanceCommand.command).
- Endpoint: `/policy-members/:policyMemberId`.
- Lifecycle reference: [docs/spec/issuance/MemberLifecycleFlow.workflow](spec/issuance/MemberLifecycleFlow.workflow) (W3) — read carefully; this drives the state-aware UI.
- Classification result shape: `ClassifyMemberResult` with `lane: STP | REPAIR | REVIEW | REJECT` and `errors`.

**Output:**
- `schemas/forms/add-policy-member-form.json` — single-step `form-container` with V1 fields per `CreatePolicyMemberRequest`: memberId, planNo (select from proposal's plans), name, dob, gender, salary, occupation, sumInsured. Register in `schemas/forms/index.ts`. Maker-only.
  - *Note:* the auth-branch `add-member-form.json` (5-step stepper) is over-spec'd for V1 (wrong fields, MPH endpoint). We start fresh with a single-step form-container.
- `src/app/issuance/proposals/[id]/members/new/page.tsx` — opens the form.
- `schemas/policy-member-detail.json` — single page; content varies by state via per-state schema sections (use the schema's conditional rendering pattern):
  - `CREATED`/`MAF_PENDING`/`CLASSIFYING` → read-only card + in-progress banner.
  - `REPAIR_PENDING` → **edit form** (`UpdateMemberCommand`) prefilled, with `classificationResult.errors` rendered as field-level errors. Submit re-classifies. Editable by Maker or Ops.
  - `REVIEW_PENDING` → read-only "with UW" banner, no actions.
  - `APPROVED` → read-only + ActionBar with `sendForIssuance` (Checker only).
  - `ADDED` → terminal, deep link to PAM Member detail (Task 3.4) via `/members/by-policy-member/:policyMemberId`.
  - `REJECTED` → terminal with reason.
- `stateActions` + `roleActions` maps cover all states (per Task 1.9 table).
- `src/app/issuance/proposals/[id]/members/[memberId]/page.tsx`.

**Done when:** every state in fixtures renders correctly; repair edit form submits and updates fixtures; APPROVED → SendForIssuance triggers correctly under Checker; ADDED links to PAM member via `by-policy-member` path.

### Task 4.5 — Census flow

**Context to load:**
- Commands: `InitiateCensusSubmissionCommand`, `IngestCensusFileCommand`, `SubmitCensusSubmissionCommand`.
- Endpoints (DSL, [docs/spec/issuance/IssuanceApi.api](spec/issuance/IssuanceApi.api) lines 201–232): `/policies/:policyId/census-submissions` (POST + GET list), `/census-submissions/:submissionId` (GET), `/census-submissions/:submissionId/rows`, `/census-submissions/:submissionId/ingest`, `/census-submissions/:submissionId/submit`.
- Domain: `CensusSubmission` with status lifecycle INITIATED → INGESTED → SUBMITTED → COMPLETED/FAILED.
- *Note:* the OpenAPI snapshot doesn't include these endpoints (it's stale). DSL is canon.

**Output:**
- Three stitched screens (all Maker-only):
  1. `src/app/issuance/proposals/[id]/census/new/page.tsx` driven by `schemas/census-new.json` — initiates submission, then `PresignedUploader` posts file, then triggers `IngestCensusFileCommand`. Redirects to detail page on completion.
  2. `src/app/issuance/proposals/[id]/census/[submissionId]/page.tsx` driven by `schemas/census-detail.json` — status banner, counts (totalRows / acceptedRows / rejectedRows / createdMemberCount), row table from `ListCensusSubmissionRowsQuery` with per-row error column, "Submit" action when status is INGESTED.
  3. On COMPLETED status, link to filtered members list (Task 4.3 with filter to this `censusSubmissionId`).

**Done when:** end-to-end census flow works against mocks: upload → ingest → row review → submit → members appear in tab 4.3.

---

## Phase 5 — Cross-cutting polish (sequential, after Phases 2–4)

### Task 5.1 — Cross-module deep links

**Context to load:** the cross-module touchpoints summarised in this doc and in [docs/planning/team_nb_blueprint_v3.md](planning/team_nb_blueprint_v3.md).

**Output:** ensure these links work end-to-end:
- Quote detail → Proposal (after FINALIZED, polled via `/api/issuance/proposals/by-quote/:quoteId`)
- Proposal detail → Policy (PAM) once `policyId` populated
- PolicyMember (ADDED) detail → Member (PAM) via **`/api/policy-admin/members/by-policy-member/:policyMemberId`** (renamed)
- Policy detail → source Proposal (`/api/issuance/proposals/by-quote/:quoteId` or proposalId on Policy)
- Bidirectional badges in headers.

**Done when:** clicking through the demo path lands on the right pages without dead-end.

### Task 5.2 — Operational queue index

**Context to load:** the saved-view URLs from Tasks 2.1, 3.2, 3.3, 4.1, 4.3.

**Output:**
- A small landing page or sidebar section grouping ops queues: Quote queues (drafts/submitted/sent/accepted/pending-approval), Repair queue (REPAIR_PENDING), UW review queue (REVIEW_PENDING, read-only), Activation watch (Policies PENDING with breakdown), Member enrollment watch (Members PENDING by reason).

**Done when:** Maker / Checker / Ops users can each reach their own operational queues from one screen.

### Task 5.3 — Demo happy-path validation

**Context to load:** Demo script in [docs/Demo_Script_Day_in_the_Life.md](Demo_Script_Day_in_the_Life.md) (review for narrative alignment).

**Path to validate manually end-to-end (use RoleSwitcher between steps):**
1. **As Maker:** Create quote → fill key data → add plan → upload census format → set aggregate census → upload mapping → request price.
2. **As Maker:** Send for approval (UI overlay).
3. **As Checker:** Switch role → see pending approval → Approve (real backend `submit`) → Send to client → Accept → Finalize.
4. (Auto) Proposal created → poll picks it up → land on Proposal detail.
5. **As Maker:** Add a member (single form) → bulk-upload census → review rows → submit submission.
6. (Auto) One member lands in REPAIR_PENDING.
7. **As Ops:** edit member → re-classify → APPROVED.
8. **As Checker:** SendForIssuance → ADDED → deep-link to PAM Member.
9. (Auto) Policy reaches threshold → ACTIVE → Members ACTIVE.

**Done when:** every step works end-to-end against mocks; bugs filed/fixed.

### Task 5.4 — Critical-path tests

**Context to load:** test patterns at [src/tests/unit/table/DataTable.unit.test.tsx](../src/tests/unit/table/DataTable.unit.test.tsx).

**Output (minimum):**
- Quote list renders + chip filter switches data.
- Quote detail action visibility per (state × role) — at least one combination per cell of the Task 1.9 role-actions table.
- Maker-checker overlay: Send for approval → Approve flow flips to backend submit.
- PolicyMember state-driven detail switches form vs read-only correctly.
- Census row table renders error rows with errors visible.
- ActionBar widget unit test (already in Task 1.3).
- ReasonBanner renders correct copy for each reason enum value (Task 1.8).

**Done when:** `npm test` passes and the above scenarios are covered.

---

## Open items to resolve as we go

- Backend deployment readiness — flip `GROUP_PAS_BACKEND_URL` per-module as endpoints come online; replace assumptions in `context/ARCH_TRANSITION.md` with confirmed contracts as integration tests run.
- `additionalAttributesJson` UX — opaque JSON field on Member. V1: render as key/value table, no schema validation.
- Workflow polling cadence — 5s default; revisit if it feels wrong in demo.
- Whether Quote detail header should embed the action bar inline or as a sticky footer — design call after Task 2.3 lands.
- Role expansion — V1 ships Maker/Checker/Ops/Viewer. If demo needs UW-as-distinct-role (not just "read-only of REVIEW_PENDING"), add it to Task 1.9's role list.

## Future widget-engine cleanups (not in V1)

These were identified during the V1 architectural audit. They're solvable today via the patterns in [STATE_MANAGEMENT_GUIDE.md §8](STATE_MANAGEMENT_GUIDE.md#8-patterns-the-schema-driven-engine-supports-verbosely-v1) and don't block any V1 task. Re-evaluate when the future archV1 lands; if archV1 doesn't make them implicit, file them as proposals.

- **Composite cell type** — render multiple sub-elements (e.g. `state` + `pendingReason` badges) in one column. Skipped for V1 (use two columns). ~20 LOC when needed.
- **`state-conditional-section` widget** — wraps a `cases: Record<State, WidgetConfig>` map and routes internally, so detail pages don't repeat the publish-then-gate plumbing per state. Replaces the verbose §8.2 pattern.
- **`disabledWhen` on form fields** — add to `FieldConfig`, evaluate against parent context (entity state + role) so a form can be edit-or-read-only with one schema instead of two siblings (§8.3). Requires `WidgetRenderer` to thread parent context to children.
- **`state-publisher` convenience widget** — small helper that fetches via `dataSource` and writes one field to `useWidgetState`. Built when first needed (PolicyMember detail) per §8.2; reused after.
