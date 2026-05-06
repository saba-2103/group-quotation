# Runtime Graph And Context v1

## Purpose

This document defines the runtime graph contract for archV1 — how all application state is declared, scoped, and hydrated.

## The Problem This Solves

Without an explicit runtime graph contract, state ends up scattered across multiple competing models:

- session context owned by auth providers
- global state driven by individual components using ad hoc string keys
- fetch state owned by widgets rather than the page

This is manageable for simple pages. It does not hold for a portfolio shell with workflows, approval chains, and data that must be shared across route boundaries.

## Runtime Graph Shape

Recommended runtime graph:

```ts
interface RuntimeGraph {
  system: {
    userId: string;
    role: string;
    permissions: string[];
    locale: string;
    routeParams: Record<string, string>;
    queryParams: Record<string, string>;
    featureFlags?: Record<string, boolean>;
  };
  app: Record<string, unknown>;
  page: Record<string, unknown>;
}
```

## Scope Semantics

### `system.*`
- readonly
- populated before page hydration
- never directly mutated by schema-authored actions

### `app.*`
- cross-page shell state
- may persist across navigation
- examples:
  - active policy
  - nav expansion state
  - persona-specific shell preferences

### `page.*`
- page-local
- reset on route change unless explicitly persisted
- examples:
  - loaded policy detail
  - filters
  - draft payload
  - workflow transition state

## What Belongs Where

### Examples

**Good**
- `app.activePolicy`
- `page.policy`
- `page.filters`
- `page.memberDraft`
- `page.workflow.addMember`

**Bad**
- `page:mph-policies:filters`
- `widget123State`
- `tabPanelBData`

These are bad because they encode scope, route, and purpose in an arbitrary string convention. There is no declared contract, no declared lifecycle, and no way for the runtime or a reviewer to understand what they hold or when they should be cleared. The point is not just uniqueness — the runtime graph must be able to reason about state, not just store it.

## Namespace Hydration Rules

Namespaces hydrate into either `app.*` or `page.*`. There are four kinds.

### API namespaces

An API namespace fetches data from a backend endpoint and populates a graph path. It may declare dependencies on other namespaces, which controls the order of hydration. It may be eager (fetched as part of the initial page load) or deferred (fetched only when a condition becomes true or an action triggers it).

### Local namespaces

A local namespace stores mutable runtime state. It may be seeded from another namespace path once on initialization — this is a one-time seed, not an ongoing mirror. Changes to the source path after initialization do not automatically update the local namespace. It may declare a persistence policy if the state should survive navigation.

### Inline namespaces

An inline namespace holds static data: option lists, constants, display labels, or configuration values that are known at schema authoring time and do not require a backend call.

### Derived namespaces

A derived namespace is computed from one or more other namespace paths through the bounded transform DSL. It has no independent state — it re-evaluates whenever its source paths change. It cannot be mutated directly.

## Single Writer Rule

No two namespace declarations may target the same path in the runtime graph.

### Why it matters

When two namespaces write to the same path, the graph is no longer predictable. The last writer wins, but callers cannot determine which writer executed most recently. The failure mode typically appears far from the source, making it very hard to diagnose.

### Enforcement

This rule is enforced at two levels.

**Lint time:** The schema validator treats a path conflict between namespaces as a hard error. Publication is blocked. There is no warning-only mode for this rule — a conflict must be resolved before the schema can proceed.

**Runtime (development mode only):** The runtime graph provider asserts on startup that all namespace targets are unique. If a conflict is detected in a development environment, the runtime logs a clear diagnostic identifying both conflicting declarations and halts hydration so the problem cannot be silently ignored.

Production builds do not assert at runtime. They rely on lint and CI gates to block violations before they ship.

## Initialization Rules

Local namespaces support two initialization strategies.

### `initialValue`

A static value that the namespace starts with before any user interaction or API data arrives. Use this for empty form state, default filter values, or initial draft payloads.

### `initialValueFrom`

A one-time seed that copies the value from another graph path at namespace creation. After that initial copy, the two paths are independent — changes to the source do not propagate to the seeded namespace.

This matters for workflow drafts. When `page.memberDraft` seeds from `page.member`, the user starts editing from the current member data. If `page.member` is later refreshed from the backend, it does not silently overwrite draft edits the user has made. An explicit action step is required to sync them if that behavior is intended.

## Persistence Model

Persistence must be declared, not improvised in components.

### Supported persistence providers

- `none` — state is ephemeral and does not survive navigation or page reload
- `sessionStorage` — state survives navigation within the browser session but is cleared on tab close or logout
- `localStorage` — state survives browser sessions

A durable server-backed preference store will be added in a later phase once the `app.*` contract has stabilized.

The `strategy` field controls write timing. `write-through` means the value is written to the persistence provider immediately on every update, not batched or deferred.

### Example

```json
{
  "activePolicy": {
    "scope": "app",
    "kind": "local",
    "usage": "state",
    "persist": {
      "provider": "localStorage",
      "key": "active_policy",
      "strategy": "write-through"
    }
  }
}
```

### Invalidation with `clearOn`

Persisted `app.*` state must declare when it should be invalidated.

Without this, a user who logs out and back in as a different role — or switches to a different organization — will see stale shell state from a previous session. That is a correctness problem, not only a UX issue.

Every persisted namespace must include a `clearOn` array. If it is omitted, the authoring lint rule flags it as an error.

Supported `clearOn` triggers:

- `logout` — invalidated when the session ends
- `roleChange` — invalidated when `system.role` changes
- `orgChange` — invalidated when the active organization changes
- `schemaVersionChange` — invalidated when the persisted value was written by an older schema version than what is currently loaded

Example:

```json
{
  "activePolicy": {
    "scope": "app",
    "kind": "local",
    "usage": "state",
    "persist": {
      "provider": "localStorage",
      "key": "active_policy",
      "strategy": "write-through",
      "clearOn": ["logout", "orgChange"]
    }
  }
}
```

## Namespace Hydration Failure Modes

When a namespace fails to hydrate, the page must behave according to an explicit policy.

A namespace that silently fails leaves the page in an undefined state. Widgets bound to that namespace may render empty, show stale fallback values, or throw errors depending on widget implementation. None of those outcomes are acceptable without a declared intent from the schema author.

### Failure policy options

Each namespace declares its failure behavior through `onHydrationFailure`. The supported values are:

**`block-render`**

The page does not render. An error boundary is shown instead. Use this for load-bearing namespaces where the page cannot function without the data.

**`render-degraded`**

The page renders with the failed namespace treated as empty. Any widget bound to that namespace must handle empty state gracefully. Use this for supplementary data where the page can still function without it.

**`skip`**

The namespace is omitted silently and treated as not present. Use only for optional enrichment data where absence is not user-visible.

### Example

```json
{
  "policy": {
    "scope": "page",
    "kind": "api",
    "usage": "domain",
    "endpoint": "/api/mph/policies/{{system.routeParams.policyId}}",
    "onHydrationFailure": "block-render"
  },
  "benefitSummary": {
    "scope": "page",
    "kind": "api",
    "usage": "domain",
    "endpoint": "/api/mph/policies/{{system.routeParams.policyId}}/benefit-summary",
    "onHydrationFailure": "render-degraded"
  }
}
```

### Default behavior

If `onHydrationFailure` is not declared on an `api` namespace, the runtime defaults to `block-render`.

This default is strict by design. An undeclared failure mode means the author has not considered the failure case. The runtime treats that as a signal to fail safe rather than render partial or unpredictable data silently.

### Lint requirement

The authoring lint rules must produce a warning when an `api` namespace does not declare `onHydrationFailure`. Authors should make their intent explicit so reviewers can assess whether the chosen policy is appropriate for the data.

## The `event.*` Scope

In addition to `system.*`, `app.*`, and `page.*`, action pipelines have access to a fourth scope: `event.*`. This scope holds the payload that triggered the action.

### Lifecycle

`event.*` exists only for the duration of an action pipeline execution. It is created when the runtime invokes the pipeline and discarded when the pipeline completes or fails. It is not part of the persistent runtime graph and cannot be subscribed to outside of a running action.

### Source

The contents of `event.*` come from whatever triggered the action.

For widget-triggered actions — a button click, a row select, a form submit — `event.*` holds the data the widget passed when it emitted the trigger. A table widget that emits a `rowSelect` event populates `event.row` with the selected row. A form widget that emits a `submit` event populates `event.values` with the submitted form values.

For workflow-triggered actions, `event.*` holds the transition payload — the source state, the target state, and any data the transition definition declared.

For system-triggered actions such as route changes or focus changes, `event.*` holds runtime-supplied context relevant to the trigger.

### Read-only

`event.*` is read-only. Action steps may bind values from `event.*` into other scopes via `setState` or `apiMutation`, but they cannot write to `event.*`. The trigger payload is immutable for the duration of the pipeline.

### Example

```json
{
  "actions": {
    "selectPolicy": {
      "steps": [
        {
          "type": "setState",
          "target": "app.activePolicy",
          "value": { "$bind": "event.row" }
        },
        {
          "type": "navigate",
          "to": "/mph/policies/{{event.row.id}}"
        }
      ]
    }
  }
}
```

When the user clicks a row in a table widget, the table emits the row data as the trigger payload. The action pipeline reads it from `event.row` and uses it to update shell state and navigate.

### Lint requirement

Bindings to `event.*` must be validated at lint time against the trigger contract declared by the widget or workflow that invokes the action. A binding to `event.foo` where the trigger does not provide `foo` is a hard lint error. Each widget's schema contract declares the events it emits and the shape of their payloads — see the widget contract document for details.

## Route And Query Param Integration

Route params and query params belong in `system.*`.

Example:

```json
{
  "system": {
    "routeParams": { "policyId": "123" },
    "queryParams": { "tab": "benefit-summary" }
  }
}
```

Namespaces and actions may reference those values explicitly.

## Graph Reactivity Model

The runtime should use a single subscription model:

- graph updates trigger subscribed consumers
- expressions and conditions re-evaluate against current graph snapshot
- structural nodes are added/removed according to current evaluation

The engine should not rely on every widget owning its own fetch lifecycle.

## Global Context Versus Page Context

This distinction is non-negotiable.

Some business state is shell-wide by nature — active organization, user preferences, cross-page navigation context. Treating that state as page-local forces engineers to create React contexts outside the schema runtime, which recreates exactly the split architecture this design is trying to prevent.

## SSR And Hydration Position

The archV1 runtime is browser-first. The runtime graph hydration model assumes a live JavaScript environment with access to `localStorage`, `sessionStorage`, and active subscriptions.

### What is supported

The host application is free to render an initial HTML shell server-side using whatever framework it chooses. The schema runtime takes over once the JavaScript bundle hydrates on the client. Static rendering of page chrome — logo, navigation skeleton, loading state — is supported because it does not depend on the runtime graph.

### What is not supported

Server-side namespace hydration is not supported in v1. API namespaces do not fetch on the server. Local namespaces do not initialize from `localStorage` on the server. Conditions do not evaluate on the server. The fully evaluated widget tree is only available after client-side hydration completes.

### What this means for host apps

A host app using Next.js, Remix, or a similar framework should:

- render the page chrome and a runtime loading state on the server
- mount the schema runtime on the client
- show the runtime's loading state until namespace hydration completes
- avoid emitting fully-rendered application content from the server, since the runtime will replace it on hydration

This trades initial paint speed for runtime simplicity. The trade is intentional. Full SSR for a declarative runtime with persistent client state has subtle correctness pitfalls — particularly around hydration mismatches when persisted client state diverges from server-rendered output — that are not worth the complexity at this stage.

### Future direction

Server-side hydration may be added in a future major version. Doing so will require a server-side persistence shim (since `localStorage` is not available), a hydration mismatch detection layer, and an explicit contract for which namespaces are server-eligible.

This is an explicit non-goal for v1.

## Runtime Devtools Requirement

The runtime must expose inspector support for:

- current graph snapshot
- namespace hydration status
- source dependency ordering
- persistence reads/writes
- condition evaluation results

Without this, debugging declarative behavior will become guesswork.

## Final Position

The runtime graph is not just a storage detail.

It is the core application contract.

If that contract is not explicit, the schema language cannot safely own business-facing UI logic.
