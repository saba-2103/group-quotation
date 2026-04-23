# Auth And Security

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document describes the browser-side security assumptions and operating rules for v0.

---

## Security Model Summary

The browser talks directly to backend APIs. There is no BFF proxy. Security comes from:

- short-lived JWT access tokens in memory only
- refresh token in an `HttpOnly` cookie
- backend JWT validation on every API request
- tenant guards and permission checks in backend middleware
- schema treated as a display contract, never a security boundary

---

## Browser Token Handling

### Access token

- JWT
- short-lived, approximately 15 minutes
- stored in memory only
- never written to `localStorage`, `sessionStorage`, or JS-readable cookies

### Refresh token

- `HttpOnly`, `Secure`, `SameSite=Strict` cookie
- used only through refresh endpoint
- not readable from JavaScript

### AppContext

Browser code decodes JWT claims into `AppContext`.

Relevant claims:

- `tenantId`
- `role`
- `lob`
- `locale`
- `portalType`
- `permissions[]`

These claims drive view context and condition evaluation inputs. They do not replace backend validation for writes.

---

## API Client Rules

All authenticated API calls must go through one API client path.

Responsibilities:

- attach Bearer token
- handle 401 -> refresh -> retry once
- parse JSON
- validate response with Zod
- emit observable contract violations

Direct `fetch()` to application APIs is banned except inside the fetch wrapper itself.

---

## Direct Backend Access

The browser knows backend URLs. This is acceptable because:

- the security boundary is JWT validation, not URL obscurity
- tenant guards and permission checks run in backend middleware
- cross-tenant reads return `404`, not `403`, to avoid IDOR leakage

---

## Backend Validation Still Matters in v0

Because v0 moves state-shaped UI behavior into schema conditions, one rule must remain explicit:

**schema conditions are not enforcement.**

If a schema hides a button for a state or role, the backend must still reject any invalid request sent directly.

This applies even though there is no dedicated workflow-capability contract in v0.

---

## CORS

All backend services called by the browser must allow the frontend origin via the shared platform middleware.

If a service is missing CORS configuration, the fix belongs in that service, not in frontend workarounds.

---

## Schema Endpoint Auth Behavior

The schema endpoint follows authenticated access rules.

- missing Bearer token -> `401 SCHEMA_UNAUTHORIZED`
- malformed or undecodable JWT -> `401 SCHEMA_UNAUTHORIZED`
- valid token with no matching artifact -> normal schema lookup and possible `404 SCHEMA_NOT_FOUND`

The Worker should not serve an anonymous default schema when auth is missing.

---

## Audit Logging and Rate Limiting

The architecture review called out missing coverage here. v0 makes the backend responsibilities explicit.

### Audit logging

The backend must audit at least:

- authentication events
- config changes in the Config System
- mutation requests on regulated or financially material endpoints
- break-glass hotfix actions affecting schema artifacts

Each audit event should capture:

- `userId`
- `tenantId`
- endpoint or config key
- action type
- timestamp
- correlation ID
- outcome

### Rate limiting

Direct browser access means rate limiting belongs at API gateway and backend middleware layers.

Minimum expectations:

- auth endpoints rate-limited per IP and per user
- mutation endpoints rate-limited by tenant and user
- schema endpoint rate-limited only for abuse protection, not normal page navigation

---

## Compliance And Data Handling

The review also called out regulator-facing concerns. v0 defines the following rules.

### PII in schema

PII must never be embedded in resolved schema artifacts.

Allowed in schema:

- labels
- display mappings
- widget definitions
- condition rules
- static option lists

Not allowed in schema:

- customer data
- claim details
- quote values specific to a case
- document contents

### JWT scope minimisation

Only claims needed for frontend context and backend auth checks should be present. Avoid adding business-sensitive case state or large entitlement payloads to the token.

### Logging retention

- client contract violations may include only truncated payload excerpts
- raw full payloads containing possible PII must not be stored in browser telemetry
- retention should follow the platform security standard, not ad hoc frontend policy

---

## Browser Security Rules

These rules are mandatory.

| Rule | Why |
|---|---|
| Never store access tokens in browser storage | Prevent XSS token theft |
| Never put tokens in query params | Prevent leakage via logs and history |
| Never log tokens to console or monitoring | Prevent credential exposure |
| Always use the shared API client | Keep auth refresh and validation consistent |
| Never treat schema as a security boundary | Schema is display logic only |
| Never depend on hidden buttons as permission checks | Backend validation is the real gate |

---

## Residual Risk Acknowledgement

The Worker decodes JWT claims without verifying signature. This is acceptable only because:

- backend APIs re-validate JWTs
- schema delivery is read-only
- stale schema delivery is a lower-severity failure than unauthorized data access

This should still be documented for auditors and operators as an intentional design choice.
