# Auth, API, And Contract Boundary v1

## Purpose

This document defines what remains backend-owned and what the frontend runtime requires.

The strong rule is unchanged:

> schema is not a security boundary.

The frontend runtime needs a strong, explicit API and auth contract to match that rule.

## Backend Still Owns

- authentication truth
- authorization enforcement
- policy scope enforcement
- maker-checker enforcement
- mutation validation
- audit logging
- correlation and idempotency semantics

## Frontend Runtime Requires

### 1. One authenticated API client path

Direct raw `fetch()` scattered through widgets and hooks should not remain the steady state.

The runtime needs one client abstraction that can:

- attach auth
- attach context headers
- attach mutation headers
- validate response envelopes
- emit observable contract failures

The current policy workspace implementation had to introduce shared request-header plumbing just to make schema-driven fetches and actions reach the Python backend consistently.

That is evidence, not theory.

### 2. Stable capability-shaped backend facts

Backend teams should expose not only raw domain codes but also valid domain/runtime capability surfaces when appropriate.

Examples:

- action rail eligibility
- tab applicability
- workflow status
- quote/version state

These are not “presentation leakage.”

They are legitimate domain-facing UI contracts.

### 3. Structured mutation contracts

Mutations should advertise:

- required headers
- expected success envelope
- validation envelope
- conflict envelope
- follow-up refresh expectations where relevant

## Recommended Browser Contract

### System context

At minimum the runtime should be able to populate:

- `system.userId`
- `system.role`
- `system.permissions`
- `system.routeParams`

### Request policies

The runtime should reference named request policies rather than manually composing request metadata everywhere.

### Response validation

All API responses entering the runtime graph should be contract-validated.

## Recommended Auth Flow

The runtime auth client follows a session-cookie model by default. The host application may swap this for OAuth or another scheme, but the client contract remains the same.

### Token acquisition

The auth client does not implement login flows. Login is an out-of-band concern handled by the host application's auth pages or an external identity provider. The runtime assumes a session is already established when the schema runtime mounts.

If the runtime mounts and no session is detected, the host app's auth gate should redirect to login before the schema runtime initializes. The runtime does not boot without a populated `system.userId`.

### Token refresh

Token refresh is reactive, not proactive. The auth client intercepts 401 responses, attempts a single refresh, and retries the original request. If the refresh succeeds, the original request resumes transparently. If the refresh fails, the auth client emits a `session-expired` runtime event and stops processing further requests.

This avoids the complexity of timer-based refresh windows and keeps the refresh path on the actual failure boundary.

### Mid-pipeline auth failure

When a 401 fires in the middle of an action pipeline:

1. The auth client attempts a single refresh.
2. If the refresh succeeds, the failed step retries once.
3. If refresh fails, or if the retry still returns 401, the pipeline halts with `failureMode: block` regardless of what the step's declared mode was.
4. In-flight namespace hydrations are cancelled.
5. The runtime emits `session-expired` so the host app can redirect to login.

A schema cannot override this behavior. Auth failure is a runtime concern, not a schema-level decision.

### Logout

Logout is triggered by the host app calling `runtime.logout()`. This:

1. Clears all `app.*` namespaces with `clearOn: ["logout"]`.
2. Clears all `sessionStorage`-backed namespaces.
3. Emits a `logout` runtime event.
4. Calls the configured logout endpoint to invalidate the session server-side.

The runtime does not navigate after logout. The host app handles the post-logout redirect.

## Access Policy Runtime Semantics

The `access` block in a schema declares which roles are permitted to invoke which actions. The runtime applies this declaratively at three points.

### 1. Action invocation

When an action is invoked, the runtime checks the user's role against the action's permitted roles. If the role is not permitted, the action is blocked before the first step runs. The runtime emits an `action-blocked` event for the host app to log or surface as it sees fit.

### 2. Widget rendering

Widgets that bind to a forbidden action automatically render in a disabled state. A button bound to `addMember` for a `Viewer` user renders disabled with no additional schema authoring required. The runtime applies `aria-disabled="true"` so screen readers convey the disabled state correctly.

If the schema author wants different visual treatment — hiding the button instead of disabling it — they should use a `visibleWhen` or `mountWhen` condition that references `system.permissions` directly. Hiding is not the default because it can mask the existence of a feature from users who would benefit from knowing they need additional permissions to use it.

### 3. Lint validation

At lint time, the validator checks that every action referenced by a widget is also declared in the `access` block. An action with no access entry is treated as "all roles permitted" but produces a lint warning, since this is rarely the intended state.

### What `access` does not do

`access` is not a security boundary. The backend enforces actual authorization on every mutation. The frontend `access` block exists to:

- shape the UI without backend round-trips for every visibility decision
- give reviewers a single place to read the role-to-action map for a page
- catch role mismatches at lint time

If the backend rejects a mutation that the frontend `access` block permitted, the action's normal failure handling applies. The mismatch is also surfaced as a runtime contract violation in development mode so the discrepancy can be fixed in the schema.

## Final Position

The backend is still the enforcement point.

But if the frontend runtime does not own a strong authenticated client boundary and a validated data-entry path into the graph, the architecture will fragment immediately.
