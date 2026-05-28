# Group PAS V1 Plan Verification

This note verifies `docs/group-pas-v1-plan.md` against the current backend-facing references:

- `docs/planning/openapi.json`
- `docs/spec/**`
- `docs/planning/team_nb_blueprint_v3.md`
- `docs/planning/SAMPLE-WORKFLOW.md`
- `docs/planning/GTL Quotation Module (3).md`

## Source precedence for V1

Use the sources in this order when they disagree:

1. `docs/planning/openapi.json` for currently exposed HTTP paths and wire DTO field names.
2. `docs/spec/**` for domain states, workflow intent, and command/query naming.
3. `docs/planning/team_nb_blueprint_v3.md` for architecture and lifecycle intent.
4. `docs/planning/SAMPLE-WORKFLOW.md` and `docs/planning/GTL Quotation Module (3).md` as future-state/business-intent references, not V1 API contracts.

## Verified parts of the V1 plan

- The high-level module split is correct: Quotation -> Issuance -> Policy Admin.
- Treating the large GTL quotation doc as the target end-state is correct.
- Treating `team_nb_blueprint_v3.md` as the current implementation blueprint is correct.
- Keeping the frontend on the existing schema-driven `keystone-ui` architecture is still the right V1 choice.
- Using frontend-managed state/action mappings as an interim step is reasonable for V1. The GTL doc clearly points toward backend-owned orchestration and UI contracts later.
- Quotation quote states are correct in the plan: `DRAFT`, `SUBMITTED`, `SENT_TO_CLIENT`, `ACCEPTED`, `FINALIZED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`.
- PAM activation ownership is correctly reflected by the plan and blueprint: policy activation belongs to Policy Admin, not Issuance.

## Required corrections before implementation

### 1. Quote create flow is overstated in the plan

Actual `CreateQuoteRequest` only accepts:

- `clientId`
- `policyType`

This means Task 2.2 should create a minimal quote first, then capture policy detail through `UpdatePolicyDetail` in the detail flow or key-data tab.

Affected plan area:

- `docs/group-pas-v1-plan.md` Task 2.2

### 2. Quote list/detail fields do not match current DTOs

Current quote summary/detail DTOs do not expose several fields the plan assumes.

`QuoteSummaryDto` currently has:

- `id`
- `clientId`
- `policyType`
- `status`
- `headcount`
- `premiumAmount`

It does not currently expose:

- `quoteNumber`
- `clientName`
- `effectiveDate`
- `updatedAt`

`QuoteDto` also exposes `estimatedPremium`, not `premium`, and uses JSON/ref fields like:

- `memberToPlanMappingJson`
- `censusFileFormatJson`

Implication:

- Task 2.1 columns need to be reduced to contract-backed fields or explicitly marked as mock-only enrichment.
- Task 2.4.5 should read/write `estimatedPremium` semantics, not a top-level `premium` field.

### 3. Quote plan form is missing required formula inputs

`PlanRequest` requires more than plan number, products, benefits, and rate card upload.

It also requires:

- `coverAmountFormula`
- optional `freeCoverLimitFormula`

Implication:

- Task 2.4.2 must include these formula fields or define a V1 placeholder strategy agreed with backend.

### 4. Aggregate census shape is simpler than the plan assumes

Current aggregate census contract is:

- `headcount`
- `planBreakdown[]` with `planNo` and `headcount`

It does not include dependent-count columns.

Implication:

- Task 2.4.3 should not plan dependent-count editing unless backend expands the contract.

### 5. Issuance proposal states in the plan are wrong

Current proposal state model is:

- `DRAFT`
- `SUBMITTED`
- `FINALIZED`
- `POLICY_CREATED`
- `CANCELLED`

The plan currently uses `CREATED` where the contract says `DRAFT`, and it omits `FINALIZED` from the UI state map.

Implication:

- Task 4.1 chips and Task 4.2 action/state mapping need to be corrected.

### 6. Issuance member resource naming is out of sync with actual API

The current shared OpenAPI uses:

- `/api/issuance/proposals/{proposalId}/members`
- `/api/issuance/proposals/{proposalId}/members/by-state`
- `/api/issuance/proposal-members/{proposalMemberId}`
- `/api/issuance/proposal-members/search`

The plan currently assumes `policy-members` paths and treats the issuance-side member entity as `PolicyMember` at the route/API level.

Implication:

- Frontend route copy and API client naming for Phase 4 should align to `ProposalMember` / `proposal-members` for backend calls.
- Internal frontend type aliases can still wrap the underlying state machine if that reduces churn, but the wire contract should follow OpenAPI.

### 7. Issuance member state names in the plan are incomplete and partly wrong

Current issuance member states are:

- `CREATED`
- `PRICED`
- `MAF_PENDING`
- `MAF_CONFIRMED`
- `CLASSIFYING`
- `APPROVED`
- `REPAIR_PENDING`
- `REFERRED_TO_UW`
- `REJECTED`
- `SENT_FOR_ISSUANCE`
- `ADDED`
- `ARCHIVED`

The plan currently uses `REVIEW_PENDING`, which does not match the current state enum. The state that represents UW handling is `REFERRED_TO_UW`.

Implication:

- Task 4.3 queue chips and Task 4.4 state-driven detail rendering must use `REFERRED_TO_UW`.
- Task 4.4 must also explicitly handle `PRICED`, `MAF_CONFIRMED`, `SENT_FOR_ISSUANCE`, and `ARCHIVED`.

### 8. Proposal member create shape needs clarification

Current create-member request includes a `memberId` field in both DSL/OpenAPI.

Implication:

- Before building Task 4.4, confirm whether V1 frontend supplies a business member identifier or whether backend intends to generate one and the contract is lagging.

### 9. Policy/member cross-link terminology changed in actual OpenAPI

The DSL still uses `policyMemberId` on the PAM side, but the generated OpenAPI currently exposes:

- `/api/policy-admin/members/by-proposal-member/{proposalMemberId}`

and `MemberDto` / `MemberSummaryDto` use `proposalMemberId`.

Implication:

- Cross-links in Task 3.4 and Task 5.1 should be built against `proposalMemberId`, not `policyMemberId`, unless backend republishes the contract.

### 10. Policy pending breakdown exists in query spec but is not exposed in API/OpenAPI

`GetPolicyPendingBreakdownQuery` exists in `docs/spec/policy-admin/PolicyAdminQuery.query`, but there is no public API path for it in `PolicyAdminApi.api` or `openapi.json`.

Implication:

- Task 3.3 cannot depend on a backend pending-breakdown endpoint today.
- Either compute the breakdown client-side from member data for V1 or get backend to expose the query.

### 11. Several planned list columns exceed current summary DTOs

Current summary DTOs are thinner than the plan assumes.

Examples:

- `ClientSummaryDto` does not include `businessRegistrationNumber` or `clientCategory`.
- `PolicySummaryDto` does not include `threshold`, `effectiveDate`, `premium`, or `clientName`.
- `QuoteSummaryDto` does not include `clientName`, `quoteNumber`, `effectiveDate`, or `updatedAt`.

Implication:

- Phase 2 and Phase 3 list-page schemas should either use only contract-backed summary fields or explicitly add follow-up enrichment lookups.

### 12. Census submission is defined in DSL but missing from current shared OpenAPI

The DSL contains `CensusSubmissionAPI`, but the current `openapi.json` does not expose census submission endpoints.

Implication:

- Task 4.5 is not contract-safe against the current shared OpenAPI.
- Treat census flow as blocked pending backend OpenAPI alignment, or implement it behind a clearly isolated mock-only adapter until backend republishes.

## Clarified interpretation of the large GTL docs

- `GTL Quotation Module (3).md` describes a richer orchestration-heavy future with backend-owned lifecycle, queue, allowed actions, and UI contract generation.
- `SAMPLE-WORKFLOW.md` also reflects a broader operational quotation journey with sanction, medical, actuarial, and approval steps.
- Neither should be used as the direct source of V1 page fields, states, or paths when they conflict with current OpenAPI and DSL contracts.

For V1, use them to:

- preserve future IA direction,
- avoid painting the UI into a corner,
- identify likely future queue/action screens.

Do not use them to invent fields or endpoints that are absent from current contracts.

## Recommended implementation baseline for the next pass

For the current V1 build, the safest baseline is:

- Quotation: implement full deal-level quote flow against current quote APIs, but keep create minimal and keep list columns contract-backed.
- Issuance: model proposal detail and proposal-member operations against the current `proposal-members` OpenAPI shape.
- Policy Admin: build read views against current summary/detail DTOs and derive pending breakdown client-side unless backend exposes it.
- Census: treat as conditional scope pending OpenAPI publication.

## Open questions to resolve with backend before Phase 4 starts

1. Should proposal-member creation really require frontend-supplied `memberId`?
2. Will backend republish OpenAPI with census submission endpoints?
3. Will backend expose a policy pending-breakdown endpoint, or should frontend derive it?
4. Should PAM stay on `proposalMemberId` in public API, or will it revert to `policyMemberId` naming?
