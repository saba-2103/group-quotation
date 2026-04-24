# API Team Contract

**Audience:** Backend and platform API teams  
**Purpose:** A shareable summary of what the UI architecture needs from backend APIs.

This is the backend-facing contract for the current architecture.

It is intentionally short and practical.

---

## Executive Summary

The frontend:

- fetches schemas directly from CDN/S3 by `schemaId`
- fetches domain data directly from backend APIs
- evaluates UI conditions in the browser using schema-authored JSONLogic
- validates API responses with Pact and Zod
- depends on backend APIs to validate every mutation server-side

The frontend does **not** need backend teams to provide:

- a Field Config API
- a workbench/bootstrap API
- workflow-capability payloads like `canApprove`
- a schema-selection API

---

## What We Need From API Teams

### 1. Stable authenticated read APIs

Backend APIs must:

- accept Bearer JWT access tokens
- validate JWTs server-side on every request
- support refresh-token-based browser sessions through the auth flow
- allow the frontend origin through CORS
- return stable response shapes suitable for Zod and Pact validation

### 2. Domain state in ordinary responses

The frontend evaluates conditions from ordinary API state.

That means responses should expose the domain facts the UI needs, for example:

- lifecycle state
- status values
- business flags
- booleans or codes that represent meaningful state

Examples:

- `quote.state = "PENDING_APPROVAL"`
- `quote.insured.age = 17`
- `quote.flags.requiresManualReview = true`

The backend does **not** need to tell the UI what to show. It just needs to expose the relevant state cleanly.

### 3. Strong server-side mutation validation

Backend APIs must:

- validate submitted mutations server-side
- reject invalid or unauthorized writes even if the UI exposed the action incorrectly
- return clear success/failure responses
- keep mutation semantics stable enough for typed frontend handling

Important rule:

**frontend conditions are presentation logic, not enforcement.**

### 4. Contract-friendly error behavior

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

## What We Do Not Need Right Now

To avoid over-building, backend teams do **not** need to provide these for the current architecture:

### No Field Config API

Conditions are static and authored in schema.

### No Workbench Bootstrap API

The current architecture does not include workbench runtime.

### No Workflow-Capability Contract

The backend does not need to send payloads like `canApprove`, `canIssue`, or similar UI capability maps.

### No Schema Resolver API

Schemas are fetched directly by `schemaId` from CDN/S3, not selected by backend logic.

---

## Delivery Assumption You Should Know

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

Not needed from backend:

```json
{
  "showManualReviewSection": true,
  "canApprove": false
}
```

The frontend will use the ordinary domain state and schema conditions to decide presentation.

The backend still validates the mutation if the user submits an action.

---

## References

- auth and security assumptions: [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)
- runtime model and conditions: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- contract validation and operations: [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md)
- shared terms and assumptions: [`10-TERMS-AND-ASSUMPTIONS.md`](./10-TERMS-AND-ASSUMPTIONS.md)
