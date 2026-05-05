# ADR: Runtime Auth Context Source

**Status:** Accepted  
**Owner:** Frontend Platform  
**Date:** 2026-04-29  
**Target Real Auth Integration Date:** 2026-05-29

**Related Docs:**

- [`../archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md`](../archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md)
- [`../archV1/08-MIGRATION-PLAN.md`](../archV1/08-MIGRATION-PLAN.md)
- [`ADR-runtime-graph-store-boundary.md`](./ADR-runtime-graph-store-boundary.md)

---

## Decision

Early `archV1` runtime development will use a mocked auth provider behind a runtime auth abstraction.

The runtime must depend only on the auth abstraction, not on:

- the mocked implementation details
- direct JWT parsing in page/runtime code
- a specific backend auth client implementation

The real auth backend integration target date is **2026-05-29**.

---

## Why This Decision Exists

The runtime needs stable values for:

- `system.userId`
- `system.role`
- `system.permissions`

Those values are required before:

- condition evaluation using `system.*`
- authenticated API calls through the shared API client
- realistic page runtime testing

The architecture target is clear in `archV1`:

- short-lived JWT access token
- `HttpOnly` refresh cookie
- shared API client
- backend-validated requests

But the runtime should not block on the final auth backend integration if the rest of the runtime can progress safely behind a stable boundary.

---

## Chosen Approach

Use:

- a `RuntimeAuthProvider` abstraction as the public runtime-facing contract
- a mocked implementation first
- a real backend implementation later

The runtime consumes only the contract.

That means the runtime code should not care whether auth comes from:

- `MockRuntimeAuthProvider`
- `RealRuntimeAuthProvider`

---

## Public Contract

The runtime-facing auth contract should expose the minimum values needed for `archV1` runtime behavior.

Recommended shape:

```ts
interface RuntimeAuthContextValue {
  isAuthenticated: boolean;
  userId: string;
  role: string;
  permissions: string[];
  accessToken: string | null;
  refresh?: () => Promise<void>;
}
```

Notes:

- `userId`, `role`, and `permissions` are the fields required to populate `system.*`
- `accessToken` may be a mock token initially, but the field must exist in the same place and shape as the real implementation
- `refresh` is optional during the mocked phase, but the real implementation must support the real refresh flow

The exact type name may differ, but the contract must remain stable across mock and real implementations.

---

## Mocked Implementation Requirements

The mocked auth implementation must:

- satisfy the same contract as the real implementation
- populate `system.userId`, `system.role`, and `system.permissions` through the same runtime path the real implementation will use
- be injectable at the provider level rather than hardcoded in page code
- support realistic role/permission scenarios needed by pilot pages

The mocked implementation must not:

- introduce a second runtime-only shape for auth state
- require widgets to know they are using mocked auth
- bake fake auth assumptions directly into `usePageDataGraph`, `SchemaRenderer`, or condition logic

---

## Real Implementation Requirements

The real implementation must align with the architecture docs:

- short-lived JWT access token
- refresh token in `HttpOnly` cookie
- shared API client attaches bearer token
- refresh-and-retry path implemented in the API client

The runtime itself should still depend only on the auth abstraction.

That means swapping from mocked auth to real auth should require:

- provider wiring changes
- auth client integration changes

But should not require:

- widget changes
- schema changes
- runtime graph contract changes

---

## Population Of `system.*`

During the mocked phase:

- `system.userId` comes from the mocked auth provider
- `system.role` comes from the mocked auth provider
- `system.permissions` comes from the mocked auth provider

During the real phase:

- `system.userId` comes from decoded JWT claims or equivalent authenticated session context
- `system.role` comes from decoded JWT claims or equivalent authenticated session context
- `system.permissions` comes from decoded JWT claims or equivalent authenticated session context

In both cases, the path into runtime state must be identical from the perspective of the runtime.

---

## Consequences

### Benefits

- unblocks runtime development before real auth backend integration is complete
- preserves the `system.*` contract for the runtime from day one
- avoids coupling runtime code to temporary mock details
- keeps the future swap to real auth localized to provider and client wiring

### Costs

- requires maintaining a mock provider temporarily
- requires discipline so teams do not build logic around mock-only behavior
- requires a time-bound commitment so the mock does not become permanent by accident

---

## Guardrails

1. Runtime code must depend on the auth abstraction only.
2. Widgets must never access mock auth data directly.
3. Shared API client design must assume the eventual real auth contract even if early requests are mocked.
4. The mocked phase ends no later than **2026-05-29** unless a new explicit decision record supersedes this one.

---

## Acceptance Criteria

This decision is complete when all of the following are true:

- this decision record is committed
- `docs/archV1/15-MIGRATION-AND-IMPLEMENTATION-PLAN.md` Pre-Sprint Decision #2 links to it
- the mocked auth interface is defined and matches the runtime-facing contract expected by the future real implementation
- early runtime code reads auth only through the abstraction
- the real auth integration target date is recorded as 2026-05-29
