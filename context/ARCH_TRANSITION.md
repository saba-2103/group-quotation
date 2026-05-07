# Architecture Transition Notes

Interim patterns that are acceptable for V1 but expected to simplify once a future architecture lands. Each entry captures: what the interim contract is, what risk it carries, and what should simplify when the future architecture arrives.

## State-driven UI via per-schema `stateActions` map

**Interim contract (V1):**
Each list/detail schema that drives lifecycle UI carries a `stateActions: Record<State, ActionId[]>` block. The `ActionBar` widget consumes this to enable/disable actions per current entity state. Action labels and tooltips are also encoded in the schema.

**Risk:**
- The state→actions rules are duplicated between this map and any backend authorization layer (when one exists).
- When a lifecycle gains a new state, every schema that surfaces that entity needs an update.
- Missing-factor / focus-section hints are not modeled — only enable/disable.

**Future architecture (target):**
The PDF spec describes a backend-emitted `frontendProjection` per response: `{ state, allowedActions[], focusSections[], missingFactors[] }`. When backend starts emitting projections, `ActionBar` should accept a projection prop that overrides the schema-side `stateActions` map. Schemas become thinner; backend becomes the single source of truth for state-driven UI.

**Convergence trigger:** backend adds `frontendProjection` to any of the `Get*ByIdQuery` responses.

---

## Mock-first data layer

**Interim contract (V1):**
Mock fixtures under `src/mocks/group-pas/` and catch-all Next API routes under `src/app/api/{quotation,issuance,policy-admin}/[[...path]]/route.ts` serve all reads and echo all writes. Real backend access is gated by a `GROUP_PAS_BACKEND_URL` env var. The same Next.js routes are reused as proxy when the env var is set — no MSW.

**Risk:**
- Fixtures may drift from real backend response shapes.
- Workflow-driven async transitions (price calc, classify, activate) are simulated with timing tricks; behaviour against real backend will differ.

**Future architecture (target):**
Once backend is live, the catch-all routes pass through to real backend. Fixtures stay only for tests. When/if the frontend talks to backend directly (no Next.js proxy), the catch-all routes are dropped.

**Convergence trigger:** backend dev/staging endpoint available for any module; flip env var per-module.

---

## Async transition signalling — polling with backoff + stop-condition

**Interim contract (V1):**
PolicyMember classification, PAM Member enrolment, and policy activation all run async on the backend (Temporal-driven workflows). Frontend polls the relevant `GET` endpoint after triggering the action using the **backend-suggested cadence**: 2s for the first 10s, then 5s out to 60s, then stop. Polling also halts early when the response satisfies a jsonLogic `stopWhen` condition declared on `dataSource` (e.g. `{ "!=": [{ "var": "state" }, "PENDING"] }`). Mock routes flip state on a timer to simulate completion.

The cadence is exported as `STANDARD_POLL_SCHEDULE` from [`src/lib/polling.ts`](../src/lib/polling.ts) so all consumers reference one constant. `useSmartQuery` supports `pollSchedule` (backoff with hard cap) + `stopWhen` (early halt) + `refreshInterval` (fixed-interval alternative). Schema example in [docs/STATE_MANAGEMENT_GUIDE.md §8.1](../docs/STATE_MANAGEMENT_GUIDE.md#81-polling-until-an-async-backend-computation-completes).

**Note (2026-05-07):** Quote `requestPrice` was previously a polling consumer of this scheme, simulated via mock auto-populate. Backend has no Rule Engine listener wired (`quote.requestPrice()` emits a Kafka event no consumer reads), so we removed the simulator and the Pricing tab `pollSchedule`/`stopWhen`. The `Request price` action is now rendered visible-but-disabled with a `disabledTooltip` explaining the backend gap. When the Rule Engine ships, restore the polling pattern (it stays valid for genuinely async transitions).

**Risk:**
- Stale UI between transitions (up to 5s in the slow phase).
- Many concurrent polls if a user opens multiple list/detail tabs.
- `stopWhen` is jsonLogic — typo in the condition leads to silent polling-until-cap.

**Future architecture (target):**
SSE or webhook channel that pushes state-changed events. React Query subscribes; polling drops to 0.

**Convergence trigger:** backend ships an event/SSE channel for state transitions.

---

## Quote → Proposal handoff — synchronous auto-create

**Contract (verified against deployed backend, 2026-05-07):**
Backend auto-creates a Proposal **synchronously** inside the `QuoteFinalized` event handler (no Temporal workflow). Mock route mirrors this: `POST /api/quotation/quotes/:id/finalize` creates the Proposal in the same request and returns `{ proposalId }`. Frontend does **not** poll `GET /api/issuance/proposals/by-quote/:quoteId` — the by-quote endpoint stays available (backend exposes it; mock mirrors it) for direct lookup, but the post-finalize path uses the response payload directly.

**Risk:**
- None today. The endpoint is exercised against the deployed backend and matches DSL.

**Future architecture (target):**
If backend later moves Proposal creation into Temporal (matching the PAM workflow style), reintroduce polling with `STANDARD_POLL_SCHEDULE` — but only if the change actually lands. Don't speculate.

**Convergence trigger:** none required; remove this section if the assumption holds permanently.

---

## `send-for-issuance` → PAM Member visibility — async assumption

**Interim contract (V1):**
After `POST /api/issuance/policy-members/{id}/send-for-issuance`, frontend polls `GET /api/policy-admin/members/by-policy-member/{policyMemberId}` until the PAM Member returns 200. Until then, PolicyMember detail shows "Member being created in Policy Admin…" banner.

**Risk:**
- If backend creates the Member synchronously and returns it as part of the send-for-issuance response, our polling is unnecessary (just slow first hit).
- If creation can fail without surfacing on the PolicyMember, user sees an indefinite spinner.

**Future architecture (target):**
Real backend integration confirms timing; if sync, drop the poll. If failure modes exist, surface them on the PolicyMember (`addMemberError?` or similar).

**Convergence trigger:** first end-to-end test against real backend.

---

## Error response shape — Spring default for V1

**Interim contract (V1):**
PAM (and likely the other modules) returns Spring's default error envelope on 4xx: `{ timestamp, status, error, message, path }`. `message` carries the validation reason; **there is no field-level error array in V1**. The single error-mapper module (`src/lib/api/error-mapper.ts`) maps `message` to a top-level form/banner error; per-field hints aren't surfaced.

Backend has offered to add a richer envelope (`{ code, message, fieldErrors: [{ field, code, message }] }`) on request — small lift on the controller-advice side. We hold off on requesting it until a V1 form actually needs field-level feedback (e.g. forms with many validation rules where top-level message is too coarse).

**Risk:**
- Forms with multiple required fields show only the first/most-recent error message at the top, not which field is wrong. Acceptable for the V1 demo where all forms are short and the field is usually obvious from the message text.
- If we ask for the envelope mid-V1, we have to update the mapper + form-error rendering — not painful but adds churn.

**Future architecture (target):**
Backend ships the standardized envelope; mapper + forms use `fieldErrors[]` to render per-field validation messages. Single change in the mapper; consumers untouched if the form-error rendering already accepts an optional `fieldErrors` shape.

**Convergence trigger:** first V1 form where Spring's top-level `message` is too coarse for usable validation UX → ask backend for the envelope.

---

## Member-to-Plan Mapping (DMN ref) — file-only V1

**Interim contract (V1):**
The `memberToPlanMapping` field on a Quote is treated as an opaque file ref (returned from the upload-url flow). UI shows the current ref + a "Replace" button that triggers a fresh presigned upload. No DMN authoring tool, no preview, no validation. Same pattern for `rateCardFile` and `freeCoverLimitFormula` files.

**Risk:**
- Users can upload anything; backend rejects on Quote evaluation. Error surfaces via Pricing tab.

**Future architecture (target):**
A DMN authoring widget (or backend-emitted preview) lets users see and edit the mapping in-app. Probably tied to the `frontendProjection` work since validation needs richer state.

**Convergence trigger:** product asks for in-app DMN authoring.

---

## GCL endpoints — placeholder only

**Interim contract (V1):**
OpenAPI exposes `/api/quotation/member-quotes/...` but per blueprint v3, GCL is post-MVP. We don't fixture them, don't mock them, don't surface them. The `Member Quotes (GCL)` placeholder tab on the Quote detail renders an empty-state with "Coming in a future release".

**Risk:**
- If GCL is unexpectedly demoed, the placeholder is a dead end.

**Future architecture (target):**
Phase 2.x adds the GCL flow when backend signals ready.

**Convergence trigger:** backend confirms GCL is in-scope and has working endpoints.

---

## Auth posture — open API for V1

**Interim contract (V1):**
Backend hasn't deployed Keycloak yet. V1 demo runs against an open API: no bearer required, no multi-tenant header. The frontend's API client is bearer-token-shaped (`Authorization: Bearer …` is sent if a token exists in context) so when auth is wired, only the token-fetch path changes. Keycloak local dev creds (`admin/admin`, `keystone-client`/`keystone-secret`) are noted in OpenAPI for when integration starts.

**Risk:**
- Demo running against a deployed backend that *does* check tokens will 401.
- Multi-tenant data leakage if the API ever enforces tenant scoping later and we're sending no header.

**Future architecture (target):**
Keycloak token flow + `X-Tenant-Id` header (or equivalent). Token captured via OAuth redirect or service account; injected into API client at the auth layer.

**Convergence trigger:** backend turns on auth or multi-tenancy enforcement.

---

## File upload destination — mock-first

**Interim contract (V1):**
`POST /files/upload-url` returns a presigned URL. Until backend deploys the real object store + CORS, the mock route returns a Next.js catch-all URL on the same origin and the `PresignedUploader` widget PUTs to that. End-to-end through fixtures only.

**Risk:**
- Real PUT to S3/MinIO will fail if CORS isn't set for localhost dev origins; we won't catch that until first deploy.

**Future architecture (target):**
Direct PUT to the presigned object-store URL with content-type and upload progress. CORS configured for dev origins.

**Convergence trigger:** backend deploys file-upload endpoints with CORS.

---

## State-conditional siblings via `useWidgetState`

**Interim contract (V1):**
State-driven detail pages (e.g. PolicyMember detail with edit form during REPAIR_PENDING vs read-only banner during CLASSIFYING vs action bar during APPROVED) compose multiple sibling widgets in a stack-layout, each gated via `visibleWhen` against an entity-state field published to `useWidgetState` by a small `state-publisher` widget. Pattern documented in [docs/STATE_MANAGEMENT_GUIDE.md §8.2](../docs/STATE_MANAGEMENT_GUIDE.md#82-state-driven-detail-page-sibling-widgets-gated-by-entity-state).

**Risk:**
- Verbosity tax: every state-driven detail page repeats the publish-then-gate plumbing. If a state value is forgotten or mis-typed, the affected sibling silently never renders.
- Widget-state keys must be kept consistent across the parent and all siblings; rename mistakes cause silent breakage.

**Future architecture (target):**
A `state-conditional-section` widget that takes `cases: Record<State, WidgetConfig>` and routes internally. The schema declares states once; the widget owns the rendering switch. Eliminates the publish-then-gate duplication.

**Convergence trigger:** widget-engine cleanup pass after V1 demo, OR archV1 lands with built-in route-context threading that supersedes the manual publish.

---

## Form-level disable via dual sibling widgets

**Interim contract (V1):**
Forms that should be editable only under specific entity-state × role conditions render two sibling widgets — an editable `form-container` and a read-only `key-value-grid` — and `visibleWhen` switches between them. See [docs/STATE_MANAGEMENT_GUIDE.md §8.3](../docs/STATE_MANAGEMENT_GUIDE.md#83-form-fields-disabled-by-parent-entity-state-or-current-role). Field-level `disabled` (form-state-driven) still works for in-form interactions; the dual-sibling pattern handles the *outer* gating.

**Risk:**
- The two siblings must stay synchronized — if one adds a field, the other must too. Easy drift point.
- ~2× schema weight per editable surface.

**Future architecture (target):**
Add `disabledWhen: VisibilityCondition` to `FieldConfig` (and/or `FormContainerConfig`) and thread parent context (entity state + current role) into children via `WidgetRenderer`. ~50 LOC + a context-injection wrapper.

**Convergence trigger:** widget-engine cleanup pass, post-V1.

---

## Pending-breakdown derived client-side

**Interim contract (V1):**
The Policy detail "Pending breakdown" card (`Map<pendingReason, count>`) has **no dedicated backend endpoint in V1**. Frontend derives it client-side by grouping `MemberSummaryDto.pendingReason` from the members list response. Single fetch (`/api/policy-admin/policies/:policyId/members`) feeds both the breakdown card and the Members tab — share via `useWidgetState` or a small selector hook (`useMemberPendingBreakdown` in `src/lib/group-pas/`).

**Risk:**
- Breaks down for very large member lists where the page only renders a subset (we'd be grouping the slice, not the universe). V1 demo uses small fixtures so this isn't visible, but as soon as backend pagination is consumed, the breakdown number drifts from the real count.
- Reason values could change between the list and detail endpoints if their cache TTLs differ — improbable since both come from the same store, but worth noting if drift surfaces.

**Future architecture (target):**
Backend adds `GET /policies/:policyId/pending-breakdown` (or includes the count map on the Policy DTO). Frontend swaps the client-side groupBy for the server-side number.

**Convergence trigger:** breakdown card shown over a paginated list, OR backend opts to add the aggregate ahead of UX requests because it becomes hot.

---

## Composite cells deferred — two-column rendering for V1

**Interim contract (V1):**
`CellRenderer` is single-type per cell. Where the design wants `state` + `pendingReason` together (e.g. policy → members tab), V1 renders them as **two separate columns**. Reason column stays empty for non-PENDING rows.

**Risk:** mild horizontal-real-estate cost; tables with many states-with-reasons feel chatty.

**Future architecture (target):** add `type: "composite"` to `CellRenderer` config, taking an array of sub-renders. ~20 LOC. When it ships, the policy-members tab schema collapses two columns to one.

**Convergence trigger:** product feedback that two-column rendering looks crowded.

---

## Maker-checker — role-adaptive UI only (no fictional approval-lock state)

**Interim contract (V1):**
Backend has **no Quote-level maker-checker model** — `Quote.submit()` is single-actor in the DSL ("submitter QCs their own work"). Only PAM Member has an approval workflow, via the central Approval module + Cerbos.

We surface what's real and tooltip what isn't:

- **Role switcher** (real UX, kept): top-right widget lets the demo operator switch between roles (Maker / Checker / Ops / Viewer). Current role held in React context (`useRole()`), persisted in `localStorage`. Schemas carry a `roleActions: Record<Role, ActionId[]>` map alongside `stateActions`; ActionBar shows/hides actions per role.
- **Approval-lock state (gone, 2026-05-07):** the previous `awaitingApproval` UI-state, `/awaiting-approval` mock endpoints, lock-overlay UI, and `MOCK_ONLY_PATTERNS` carve-out have been removed. The Quote `Send for approval` action stays in the schema as a visible-but-disabled button with a `disabledTooltip` explaining the gap ("Quote-level approval workflow not yet wired on backend"). The Maker submits directly; both Maker and Checker have `submit` in `roleActions` (matching backend single-actor reality).
- Roles only gate UI affordances; they do not affect what backend accepts (backend remains unrestricted).

**Why removed:** rule "don't simulate behavior backend can't deliver, surface the gap with a tooltip" — see [feedback_build_to_expected_scope.md](../.claude/projects/-Users-seriousblack-dev-anaira-sandbox-keystone-ui/memory/feedback_build_to_expected_scope.md) rule #6.

**Risk:**
- Role-adaptive UI without backend enforcement is purely cosmetic; once a real auth backend ships, the role assignments need to mirror backend authorization or drift will be visible.

**Future architecture (target):**
Option A — backend extends the PAM approval pattern to Quote (`RequestQuoteApprovalCommand` → `QuoteApprovalRequested` event → central Approval module → listener back → Cerbos enforcement on `submit`). Frontend deletes the `disabledTooltip`, replaces `Send for approval` with a real api-mutation calling the new endpoint, and reads any in-flight state from the Quote DTO directly. Question already drafted to backend (in SESSION_LOG end-of-thread snapshot).

Option B — backend ships Cerbos role-aware authorization on `submit` itself (no separate approval state). Frontend `roleActions` becomes a typed mirror of Cerbos rules.

**Convergence trigger:** backend response to the drafted question.
