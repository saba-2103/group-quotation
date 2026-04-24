# API Team Contract

**Purpose:** Shared document for backend/API teams describing what the frontend architecture expects from them.

This is the frontend contract for the backend in the current architecture.

It is intentionally practical: what the API team must provide, what they do not need to provide, and what constraints must remain true for the UI architecture to hold.

---

## What The Frontend Expects

The frontend expects backend APIs to support four things well:

1. authenticated data reads
2. validated mutations
3. stable response contracts
4. observability and auditability

The frontend does **not** expect backend APIs to provide:

- field-rule APIs
- workbench/bootstrap APIs
- workflow-capability contracts
- runtime schema selection

Those are not part of the current architecture.

---

## 1. Authentication And Access

Backend APIs must support direct browser access.

Required behavior:

- accept Bearer JWT access tokens
- validate JWTs server-side on every request
- support refresh-token-based session renewal through the auth flow
- enforce permission checks server-side
- apply CORS rules for the frontend origin

Reference:
- [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)

---

## 2. Data Reads

The frontend reads domain state directly from backend APIs and hydrates a unified runtime graph.

What this means for API design:

- endpoints should return domain data cleanly without assuming a BFF layer
- responses should be stable enough to validate with Zod and Pact
- state needed for UI conditions should be present in ordinary API responses
- the frontend should not need a special rule endpoint just to decide field/widget behavior

Important:

- if the UI needs to show/hide something based on current business state, that state should be available in the ordinary domain response the page already uses
- the backend does not need to decide presentation rules for the frontend

Reference:
- [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)

---

## 3. Mutations

The frontend may hide or show controls using schema conditions, but backend APIs remain the enforcement point.

Required behavior:

- validate submitted mutations server-side
- reject invalid or unauthorized writes even if the UI exposed the action incorrectly
- return clear success/failure responses
- keep mutation semantics stable enough for typed frontend handling

Important:

- do not assume “button hidden in UI” equals “operation impossible”
- do not rely on frontend conditions as permission enforcement

Reference:
- [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
- [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)

---

## 4. Response Contracts

The frontend architecture depends on contract validation.

Required behavior:

- endpoints should have stable, documented response shapes
- breaking response changes should go through contract verification
- frontend and backend teams should use Pact or equivalent CI contract checks for important APIs

The frontend will:

- validate responses with Zod
- surface contract violations to monitoring

Reference:
- [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md)

---

## 5. What APIs Do Not Need To Do

To avoid over-building, backend teams do **not** need to provide these for the current architecture:

### No Field Config API

Conditions are static and authored in schema. The frontend does not need runtime rule fetches for field visibility/editability/required-state.

### No Workbench Bootstrap API

The current deployment does not include workbench runtime.

### No Workflow-Capability Contract

The backend does not need to send `canApprove` / `canIssue` style capability payloads for the current architecture.

### No Schema Resolver API

Schemas are fetched directly by `schemaId` from CDN/S3, not through backend selection logic.

---

## 6. What Data The Frontend Needs In Ordinary APIs

Because presentation rules are schema-authored, the frontend needs enough domain state to evaluate those conditions.

Examples of useful ordinary response fields:

- entity lifecycle state
- status values
- flags that represent business facts
- summary booleans or codes that the UI can bind to

Examples:

- `quote.state = "PENDING_APPROVAL"`
- `quote.insured.age = 17`
- `quote.flags.requiresManualReview = true`

The backend does not need to say “show widget X”. It just needs to expose the state the frontend conditions rely on.

---

## 7. Error Behavior The Frontend Expects

Minimum expectations:

- `401` for unauthenticated API access
- `403` or domain-appropriate auth error behavior where applicable
- `404` where resource absence is the correct behavior
- structured validation errors for rejected mutations
- stable error envelope conventions if the platform has one

The frontend benefits from consistent machine-readable error shapes, even if it maps them to simpler user-facing messages.

---

## 8. Audit And Rate Limiting Expectations

Backend teams are expected to provide:

- audit records for authentication events
- audit records for regulated or financially material mutations
- audit records for break-glass operational actions where applicable
- rate limiting for auth endpoints and mutation endpoints

Audit records should include at minimum:

- `userId`
- endpoint or relevant key
- `actionType`
- `timestamp`
- `correlationId`
- `outcome`

Reference:
- [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)
- [`10-TERMS-AND-ASSUMPTIONS.md`](./10-TERMS-AND-ASSUMPTIONS.md)

---

## 9. Delivery Assumption The API Team Should Know

Schema artifacts are delivered directly from CDN/S3 by `schemaId`.

That means:

- backend APIs are not involved in selecting schemas
- backend APIs should not assume schema delivery is auth-context-sensitive
- if backend teams believe schemas must become sensitive or identity-scoped, that is an architecture discussion, not an API implementation detail

Reference:
- [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)

---

## 10. Summary For API Teams

What we need from backend teams:

1. stable authenticated read APIs
2. strong server-side mutation validation
3. contract-friendly response shapes
4. ordinary domain state exposed clearly enough for frontend JSONLogic conditions
5. audit logging and rate limiting

What we do **not** need right now:

1. field-rule APIs
2. workbench/bootstrap APIs
3. workflow-capability payloads
4. schema-selection APIs

If any of those non-required items become necessary later, that should be treated as an architecture change, not quietly added ad hoc.
