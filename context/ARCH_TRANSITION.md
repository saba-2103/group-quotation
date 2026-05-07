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

## Async transition signalling — polling

**Interim contract (V1):**
`RequestQuotePrice`, `ProposalMember` classification, and policy/member activation all run async on the backend. Frontend polls the relevant `GET` endpoint on a 5s interval after triggering the action, with a 30s overall timeout that surfaces a "still working" banner. Mock routes flip state on a timer to simulate completion.

**Risk:**
- Stale UI between transitions (up to 5s).
- Many concurrent polls if a user opens multiple list/detail tabs.

**Future architecture (target):**
SSE or webhook channel that pushes state-changed events. React Query subscribes; polling drops to 0.

**Convergence trigger:** backend ships an event/SSE channel for state transitions.

---

## Quote → Proposal handoff — auto-create assumption

**Interim contract (V1):**
We assume backend auto-creates a Proposal on `POST /quotation/quotes/{id}/finalize` (matching the W2 trigger described in blueprint v3). Frontend polls `GET /api/issuance/proposals/by-quote/{quoteId}` until the proposal appears, then deep-links to it.

**Risk:**
- If backend actually requires the frontend to make a separate `POST /api/issuance/proposals` call, finalize will succeed but no proposal will ever appear and polling will time out.

**Future architecture (target):**
Confirm with backend on first integration test. If frontend-triggered, the Finalize action chains a follow-up `createProposal` call (one extra dispatch in `useActionHandler`).

**Convergence trigger:** first end-to-end test against real backend.

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

## Error response shape — Spring-style assumption

**Interim contract (V1):**
We assume backend returns 4xx errors as `{ message: string, errors?: [{ field: string, message: string }] }`. Forms use the `errors[]` array to render per-field validation; toplevel `message` shown in a banner. Single error-mapper module per API client (`src/lib/api/error-mapper.ts`).

**Risk:**
- If backend returns a different shape (RFC 7807 problem-details, plain text, custom envelope), forms render generic errors.

**Future architecture (target):**
Confirmed shape on first integration. Mapper updated once; consumers untouched.

**Convergence trigger:** first 4xx response seen against real backend.

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

## Maker-checker UI overlay (V1 demo, frontend-only)

**Interim contract (V1):**
Backend doesn't implement auth or maker-checker enforcement, but the V1 demo needs to *show* the maker → checker hand-off. We implement this purely on the frontend:

- A **role switcher** widget in the top-right of the app shell lets the demo operator switch between roles (Maker / Checker / Ops, plus Viewer for read-only).
- Current role is held in a React context (`useRole()`), persisted in `localStorage`.
- Schemas carry an additional `roleActions: Record<Role, ActionId[]>` map alongside `stateActions`. The `ActionBar` widget enables an action only if the current role is permitted AND the current state allows it.
- A UI-only "pending approval" overlay state sits between the user's "Send for approval" click and the real backend submit:
  - Maker fills entity → clicks **Send for approval** → entity is locally tagged `awaitingApproval: true` (mock-route persisted, never hits backend submit).
  - Checker switches role → sees the entity with a "Pending approval (submitted by Maker)" banner → clicks **Approve** (which calls the real backend `submit`/`finalize` endpoint) or **Reject** (clears the local flag, returns to DRAFT).
- Roles only gate UI affordances; they do not affect what backend accepts (backend remains unrestricted).

**Risk:**
- Operator confusion if roles aren't visually obvious — the role switcher must be prominent and the active role must be unambiguous on every screen.
- The overlay is fiction; if a real auth backend ships and disagrees with our role model, we have to rebuild this.
- Two sources of truth for "what's allowed": frontend role/state map vs eventual backend authorization. Drift risk.

**Future architecture (target):**
Backend ships maker-checker as proper workflow states (e.g. `Quote: PENDING_APPROVAL` between DRAFT and SUBMITTED) plus role-aware authorization. The role switcher is replaced by real auth context (the current user's role from the token). The `roleActions` map either disappears (because backend's `frontendProjection` carries `allowedActions` per the role) or becomes a typed mirror of the backend's authorization model.

**Convergence trigger:** backend implements maker-checker states + auth.
