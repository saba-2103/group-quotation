# Route Manifest And Schema Resolution

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines how the application maps browser routes to `schemaId`s in `arch_v0` without requiring one handwritten host page per schema-driven screen.

---

## Why This Exists

`arch_v0` is explicit about schema delivery:

- browser fetches a resolved schema by `schemaId`
- schema delivery is direct and static

But that still leaves one application concern to define:

- how the host application decides which `schemaId` to fetch for a given URL

This document defines that missing piece.

---

## Decision Summary

For `arch_v0`, route selection should be handled by an explicit route manifest.

The model is:

```text
pathname -> route manifest match -> schemaId + routeParams -> useViewMetadata(schemaId)
```

Rules:

- route-to-schema mapping is explicit
- schema delivery remains `schemaId`-based
- route resolution is an app concern, not a schema-delivery concern
- route resolution must not reintroduce JWT-based schema selection or Worker-time filtering
- variants are selected explicitly by route or configuration, not by a hidden runtime resolver

---

## Core Rule

The application should not require a separate handwritten Next page for every schema-driven page.

Instead, it should support:

- one generic schema page shell
- one route manifest that maps path patterns to `schemaId`s

Handwritten host pages are still allowed when a route truly needs custom non-schema behavior, but they should be the exception.

---

## Route Manifest Contract

Recommended shape:

```ts
interface RouteManifestEntry {
  path: string;
  schemaId: string;
  routeParams?: Record<string, string>;
  priority?: number;
}
```

Where:

- `path` is the browser route pattern
- `schemaId` is the exact resolved schema artifact to fetch
- `routeParams` maps URL params into `system.routeParams` keys if aliasing is needed
- `priority` is optional and only needed when simple path specificity is not enough

Example:

```json
[
  {
    "path": "/quotations",
    "schemaId": "quotations-list"
  },
  {
    "path": "/quotations/:id",
    "schemaId": "quotation-details",
    "routeParams": {
      "quoteId": "id"
    }
  },
  {
    "path": "/claims",
    "schemaId": "claims-list"
  },
  {
    "path": "/claims/:id",
    "schemaId": "claim-details"
  }
]
```

---

## Runtime Output Contract

A successful route match should produce:

```ts
interface ResolvedRoute {
  schemaId: string;
  routeParams: Record<string, string>;
}
```

The runtime then:

1. calls `useViewMetadata(schemaId)`
2. exposes route params under `system.routeParams`
3. allows graph namespaces and bindings to reference those params

Example:

- URL: `/quotations/123`
- matched route: `/quotations/:id`
- resolved output:

```json
{
  "schemaId": "quotation-details",
  "routeParams": {
    "id": "123",
    "quoteId": "123"
  }
}
```

The schema can then use:

- `system.routeParams.id`
- `system.routeParams.quoteId`

---

## Matching Rules

The matcher should stay simple and deterministic.

Recommended rules:

1. exact static path beats parameterized path
2. more specific path beats less specific path
3. if still ambiguous, use explicit `priority`
4. duplicate effective matches are a validation error

Examples:

- `/quotations/new` should beat `/quotations/:id`
- `/claims/:id/documents` should beat `/claims/:id`

The manifest should be validated so route ambiguity fails early in CI rather than at runtime.

---

## Generic Page Shell

Recommended host-app shape for schema-driven pages:

- one catch-all route or small set of generic route shells
- one route resolver
- one schema runtime entry point

Example shape:

```text
src/app/[[...slug]]/page.tsx
  -> resolveRoute(pathname)
  -> { schemaId, routeParams }
  -> render SchemaPageShell(schemaId, routeParams)
```

Responsibilities of the generic shell:

- resolve current path against the route manifest
- return `404` if no manifest entry matches
- call `useViewMetadata(schemaId)`
- inject `system.routeParams`
- render the schema runtime

This keeps route mapping explicit without requiring one host file per schema page.

---

## What This Is Not

This is not the earlier Worker-based schema resolver.

It does not:

- inspect JWT claims to decide which schema to serve
- filter schema nodes at delivery time
- perform multi-tenant context resolution in the CDN path

It only answers:

- for this browser path, which explicit `schemaId` should the app load?

That keeps route resolution operationally simple and consistent with `arch_v0`.

---

## Variants

Variants remain explicit.

That means:

- a variant has its own `schemaId`
- route or configuration chooses that `schemaId`
- route resolution does not contain hidden business logic

Allowed examples:

- `/claims-lite/:id` -> `claim-details-lite`
- `/claims/:id` -> `claim-details`
- route config selects `admin-user-list-compact` rather than `admin-user-list`

Disallowed example:

- route always maps to one path and then runtime silently picks schema variant based on role or JWT context

---

## Where The Manifest Can Live

Any of these are acceptable in `arch_v0`:

1. source-controlled JSON or TypeScript manifest in the repo
2. app config artifact fetched at startup
3. separately published route manifest artifact in S3/CDN

Recommended v0 starting point:

- keep the manifest source-controlled
- validate it in CI
- move it to a managed artifact only if operational needs justify it later

This is the same general `arch_v0` principle used elsewhere:

- start with explicit, simple, operationally boring mechanisms
- add indirection only when there is a real need

---

## Validation Rules

The route manifest should have validation rules from the start.

At minimum:

- every entry must declare a non-empty `path`
- every entry must declare a non-empty `schemaId`
- no duplicate path patterns
- no ambiguous effective matches
- all referenced `schemaId`s must exist in the published schema set
- `routeParams` aliases must reference declared path params

Example invalid entry:

```json
{
  "path": "/quotations/:id",
  "schemaId": "quotation-details",
  "routeParams": {
    "quoteId": "quoteNumber"
  }
}
```

This is invalid because `quoteNumber` is not a path parameter in the route pattern.

---

## Failure Behavior

### No route match

- return `404`
- do not fall back to an arbitrary default schema

### Route match references missing `schemaId`

- fail validation before deployment where possible
- if it still reaches runtime, return a schema-level error state and alert

### Ambiguous match

- fail validation
- do not rely on array order as hidden precedence

---

## Relation To Runtime Graph

Route resolution should feed the runtime graph, not bypass it.

The main integration point is:

- resolved path params become `system.routeParams`

That allows schema-authored graph namespaces to depend on route params cleanly.

Example:

```json
{
  "graphNamespaces": {
    "quote": {
      "kind": "api",
      "endpoint": "/v1/quotes/:quoteId"
    }
  }
}
```

With route mapping:

```json
{
  "path": "/quotations/:id",
  "schemaId": "quotation-details",
  "routeParams": {
    "quoteId": "id"
  }
}
```

The runtime can resolve `:quoteId` from `system.routeParams.quoteId`.

---

## Recommended v0 Implementation Path

1. introduce a route manifest in source control
2. add a route matcher with validation
3. introduce a generic schema page shell
4. inject resolved params into `system.routeParams`
5. migrate manual schema pages onto the generic route path gradually

This gives the app dynamic route-to-schema mapping without reintroducing edge resolution or per-page handwritten route files.

---

## Related Docs

- system design: [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
- schema delivery: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- runtime model: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- migration plan: [`15-MIGRATION-AND-IMPLEMENTATION-PLAN.md`](./15-MIGRATION-AND-IMPLEMENTATION-PLAN.md)
