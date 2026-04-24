# Auth And Security

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document describes the browser-side security assumptions and operating rules for the initial on-prem POC.

---

## Security Model Summary

The browser talks directly to backend APIs. There is no BFF proxy. Security comes from:

- short-lived JWT access tokens in memory only
- refresh token in an `HttpOnly` cookie
- backend JWT validation on every API request
- permission checks in backend middleware
- schema treated as a display contract, never a security boundary

Schema delivery itself is simplified in the POC and is not used as an auth decision point.

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

Relevant claims for the POC:

- `userId`
- `role`
- `permissions[]`

Optional claims such as `lob`, `locale`, or deployment-specific context may still exist, but they are not part of schema delivery in this POC.

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
- permission checks run in backend middleware
- mutation validation remains server-side

---

## Backend Validation Still Matters in v0

Because v0 moves state-shaped UI behavior into schema conditions, one rule must remain explicit:

**schema conditions are not enforcement.**

If a schema hides a button for a state or role, the backend must still reject any invalid request sent directly.

---

## Schema Delivery Security Assumption

In the POC, schema artifacts are assumed to be non-sensitive metadata and are delivered directly from CDN/S3 by `schemaId`.

That means:

- schema delivery does not require JWT-based runtime selection
- there is no Worker decoding tokens at delivery time
- there is no auth-dependent default-schema fallback behavior to define

If this assumption changes later, schema delivery will need signed/private access or a resolver layer.

---

## CORS

All backend services called by the browser must allow the frontend origin via the shared platform middleware or equivalent environment configuration.

If a service is missing CORS configuration, the fix belongs in that service, not in frontend workarounds.

---

## Audit Logging and Rate Limiting

### Audit logging

The backend must audit at least:

- authentication events
- config changes in the Config System
- mutation requests on regulated or financially material endpoints
- break-glass hotfix actions affecting schema artifacts

Each audit event should capture:

- `userId`
- endpoint or config key
- action type
- timestamp
- correlation ID
- outcome

### Rate limiting

Direct browser access means rate limiting belongs at API gateway and backend middleware layers.

Minimum expectations:

- auth endpoints rate-limited per IP and per user
- mutation endpoints rate-limited per user and endpoint class
- schema delivery path protected against abuse at CDN level if necessary

---

## Compliance And Data Handling

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

Only claims needed for frontend context and backend auth checks should be present.

### Logging retention

- client contract violations may include only truncated payload excerpts
- raw full payloads containing possible PII must not be stored in browser telemetry
- retention should follow platform policy, not ad hoc frontend policy

---

## Browser Security Rules

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

The POC assumes schema artifacts are safe to deliver directly over CDN because they contain metadata, not customer data.

This must remain true. If schema contents ever become sensitive, the delivery model must change.
