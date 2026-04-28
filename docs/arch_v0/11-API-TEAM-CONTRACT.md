# API Team Contract

**Audience:** Backend and platform API teams  
**Purpose:** The concrete browser-to-backend contract the UI architecture depends on.

This is the backend-facing contract for the current architecture.

It focuses on the concrete things backend teams must provide so the browser can authenticate, read user context, fetch domain data, call mutations, and integrate with the Config System/materialisation model.

---

## Architecture Context

For this architecture:

- the browser calls backend APIs directly; there is no BFF proxy
- schemas are fetched separately from CDN/S3 by `schemaId`
- UI conditions are evaluated in the browser from runtime state
- backend APIs remain the enforcement point for auth and mutation validation

---

## What We Need From API Teams

### 1. Session and auth contract

For the initial architecture, we assume the auth flow behaves like this even if endpoint names differ:

- successful sign-in returns a short-lived JWT access token in the response body
- successful sign-in also sets a refresh token using `Set-Cookie`
- refresh token cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`
- refresh endpoint reads the refresh cookie and returns a fresh access token in the response body
- refresh endpoint may rotate the refresh cookie
- logout or session revoke clears the refresh cookie server-side

The browser decodes JWT claims into `AppContext`.

Required claims:

- `userId`
- `role`
- `permissions[]`

Optional claims when stable and small:

- `locale`
- `lob`
- deployment-specific context that affects normal page behavior

If more user context is needed than should reasonably live in the JWT, backend teams should provide a small authenticated endpoint such as `/me` with a stable contract.

That endpoint should return ordinary user/domain context such as:

- user profile summary
- effective roles
- effective permission codes
- locale or deployment context

That endpoint should not become a UI-capability map such as:

- `canApprove`
- `canEditSectionX`
- `showManualReviewSection`

Authenticated APIs must also:

- Bearer access token on authenticated requests
- `401` on expired or missing access token
- refresh flow that allows one refresh attempt and one retry
- server-side JWT validation on every authenticated request

---

### 2. CORS and browser access requirements

Because the browser calls backend APIs directly, every browser-facing service must be configured correctly for cross-origin access where applicable.

Minimum expectations:

- allow the frontend origin explicitly; do not rely on `*` for authenticated routes
- answer `OPTIONS` preflight requests correctly
- allow `Authorization` and `Content-Type` headers
- allow `X-Correlation-Id` if the platform expects the client to send or forward it
- allow credentials on auth endpoints that rely on the refresh-token cookie
- keep allowed methods aligned with actual browser usage such as `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`

If a service is missing CORS support, the fix belongs in that service or shared gateway/middleware configuration, not in frontend workarounds.

---

### 3. Read API contract

The frontend evaluates conditions from ordinary API state.

Responses should expose the domain facts the UI needs, for example:

- lifecycle state
- status values
- business flags
- booleans or codes that represent meaningful state

Examples:

- `quote.state = "PENDING_APPROVAL"`
- `quote.insured.age = 17`
- `quote.flags.requiresManualReview = true`

Backend APIs should:

- return stable response shapes suitable for Zod and Pact validation
- document required headers, identifiers, and response semantics clearly
- expose domain state, not presentation decisions

That state will be hydrated into schema-declared graph namespaces such as `graph.quote`, `graph.quoteDraft`, or `graph.filters`.

The backend does not need to tell the UI what to show. It just needs to expose the relevant state cleanly.

### 4. Mutation, error, and audit contract

Backend APIs must:

- validate submitted mutations server-side
- reject invalid or unauthorized writes even if the UI exposed the action incorrectly
- return clear success/failure responses
- keep mutation semantics stable enough for typed frontend handling

Important rule:

**frontend conditions are presentation logic, not enforcement.**

Minimum expectations:

- `401` for unauthenticated access
- `403` or domain-appropriate auth error behavior where applicable
- `404` where resource absence is correct
- structured validation errors for rejected mutations
- stable error envelope conventions where the platform has one

### 5. Audit logging and rate limiting

Backend teams are expected to provide:

- audit records for authentication events
- audit records for regulated or financially material mutations
- audit records for break-glass operational actions where applicable
- rate limiting for auth endpoints and mutation endpoints

Minimum audit fields:

- `userId`
- endpoint or relevant key
- `actionType`
- `timestamp`
- `correlationId`
- `outcome`

Definitions for `correlationId`, `outcome`, and other shared terms are in [`10-TERMS-AND-ASSUMPTIONS.md`](./10-TERMS-AND-ASSUMPTIONS.md).

---

### 6. Config System and materialisation touchpoints

The proposed Config System owns display semantics such as labels, translations, badge variants, and display lookup maps. The browser should receive those values already materialised into the resolved schema artifact.

Backend and platform teams help by:

- return stable raw domain codes and identifiers that config can map cleanly
- avoid making display labels the only meaning-bearing value in API responses
- avoid embedding UI-specific presentation instructions when a domain code is the real contract
- document enum/code sets that will need config coverage
- coordinate introduction of new domain codes with config owners so materialised schemas are not missing display mappings at release time

Helpful patterns from API/platform teams:

- publish stable enum or code-set documentation for values like quote status, claim state, or reason codes
- provide change notice when a new code value is introduced
- if backend/platform teams are involved in the Config System itself, provide CRUD validation, audit logging, and change events that can drive materialisation

The proposed Config System and materialisation flow are described in [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md). That document is a proposal, not a finished subsystem, but backend/platform input is needed there.

---

## Delivery Assumption

Schema artifacts are delivered directly from CDN/S3 by `schemaId`.

That means:

- backend APIs are not involved in selecting schemas
- backend APIs should not assume schema delivery is auth-context-sensitive
- if backend teams believe schemas must become sensitive or identity-scoped, that is an architecture discussion, not just an API implementation detail

---

## Good Backend Behavior In One Example

If the UI needs to show a section only when a quote is pending approval:

Good backend response:

```json
{
  "quote": {
    "id": "Q-1024",
    "state": "PENDING_APPROVAL",
    "insured": {
      "age": 17
    },
    "flags": {
      "requiresManualReview": true
    }
  }
}
```

The frontend will use the ordinary domain state and schema conditions to decide presentation.

The backend still validates the mutation if the user submits an action.

---

## References

- auth and security assumptions: [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)
- config and materialisation proposal: [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md)
- runtime model and conditions: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- contract validation and operations: [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md)
- shared terms and assumptions: [`10-TERMS-AND-ASSUMPTIONS.md`](./10-TERMS-AND-ASSUMPTIONS.md)
