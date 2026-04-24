# Runtime And Conditions

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines the browser runtime model for the initial POC.

---

## Runtime Summary

The browser runtime in v0 has four responsibilities:

1. fetch the resolved schema by `schemaId`
2. hydrate a unified runtime data graph from declared data sources
3. evaluate schema-authored JSONLogic conditions locally
4. render the widget tree from bound and inherited values

There is no field-rule fetch path and no workbench/bootstrap flow.

---

## Primary Hooks

| Hook / subsystem | Purpose |
|---|---|
| `useViewMetadata(schemaId)` | fetch resolved schema from CDN |
| `usePageDataGraph(schema, context)` | hydrate and expose the unified graph |
| `useSmartQuery(sourceDef)` | source-loader primitive for API-backed branches |
| `ConditionEngine` | evaluate JSONLogic conditions |
| `SchemaRenderer` | mount widgets from the widget tree |
| `useValueSource()` | resolve inherited, data-bound, and inline value sources |

`useFieldConfig()` is deliberately absent.

---

## The Widget Tree

The schema is a widget tree.

Rules:

- pages are trees, not separate layout and form contracts
- forms are widgets
- fields are child widgets beneath form widgets
- every node can carry bindings, conditions, and value-source definitions

---

## Unified Runtime Data Graph

The UI reads one data graph.

Recommended shape:

```ts
interface RuntimeGraph {
  context: {
    userId: string;
    role: string;
    permissions: string[];
    routeParams: Record<string, string>;
  };
  data: Record<string, unknown>;
  form: Record<string, Record<string, unknown>>;
  ui: Record<string, unknown>;
}
```

Namespaces:

- `context`: identity and route context
- `data`: API and inline source outputs
- `form`: mutable form state
- `ui`: transient local interaction state

---

## Data Sources

Supported kinds in the POC:

- `api`
- `inline`

Each source writes to an explicit target path in the graph.

No two independent sources may target the same graph path.

---

## Conditions

Conditions are static JSONLogic authored in schema from product specs.

Example:

```json
{
  "visibleWhen": {
    "<": [
      { "var": "data.quote.insured.age" },
      18
    ]
  }
}
```

### What conditions may control

- widget visibility
- field visibility
- field editability
- required-state
- non-security presentation logic tied to loaded state

### What conditions may not replace

- backend validation
- permission enforcement
- regulated mutation checks

### Allowed JSONLogic subset

- `==`, `!=`
- `<`, `<=`, `>`, `>=`
- `and`, `or`, `!`
- `in`
- `missing`, `missing_some`
- `var`

If a rule needs more than this, review the design before expanding the condition language.

---

## Active Condition Model In The POC

There is only one active condition system in this POC architecture:

- runtime JSONLogic such as `visibleWhen`, `requiredWhen`, and `editableWhen`

There is no delivery-time edge filtering because there is no Worker.

That means:

- no active `$show` / `$hide` evaluation at schema fetch time
- no JWT-based pre-filtering of schema nodes
- all active UI behavior is evaluated in the browser against the runtime graph

If a future version reintroduces a resolver layer, an edge condition system can be added back deliberately.

---

## Conditions Versus Variants

### Prefer conditions when

- only a few widgets or fields differ
- the difference depends on known state or role/context already available in the runtime graph
- the resulting JSONLogic remains readable

### Prefer a variant when

- the widget subtree is materially different
- many nodes would otherwise carry inverse or duplicated conditions
- the variant is clearer to author, review, and maintain

For the POC, a variant is a separate schema artifact with its own `schemaId`. It is selected explicitly by route or configuration.

---

## Inheritance And Value Resolution

Each node may resolve values in one of three ways:

1. `inherit`
2. `dataSource`
3. `inline`

That contract applies uniformly across widgets and fields.

---

## Page Boot Sequence

```text
1. Route activates
2. useViewMetadata(schemaId) fetches schema from CDN
3. Runtime reads schema.dataSources
4. usePageDataGraph hydrates eager graph branches
5. Condition engine evaluates JSONLogic rules
6. SchemaRenderer mounts visible widget nodes
7. Deferred sources hydrate later as needed
8. Mutations patch or revalidate graph branches
```

---

## Mutations

v0 allows two mutation update patterns.

### Re-fetch affected sources

Preferred when backend computes multiple downstream changes.

Semantics:

- invalidate the owning source or sources
- re-hydrate affected graph paths from fresh backend responses
- re-evaluate all conditions depending on the updated graph subtree

### Patch locally then revalidate

Allowed when the optimistic update is low risk and the server response still becomes the final truth.

Semantics:

- patch the target graph path optimistically
- re-evaluate affected conditions immediately
- revalidate against the backend response afterward
- if revalidation disagrees, backend state wins and conditions re-evaluate again

### Form-state behavior after mutation

Form state does not auto-clear by default.

Default behavior after successful submit:

- `form.{formId}` persists until route exit, explicit reset, or explicit discard
- if a page needs reset-on-success behavior, it must declare that intentionally
- if a mutation triggers a fresh data reload, form state is only re-initialized from server data when the page explicitly declares that sync behavior

### Graph path ownership

The POC uses a single-writer rule for graph paths.

Rules:

- no two independent data sources may target the same graph path
- overlapping parent/child target paths from different sources are disallowed unless treated as one coordinated source definition
- schema validation should fail if source targets collide

Either way, backend validation remains the enforcement point.

---

## Why Conditions Live In Schema

Conditions live directly in schema because the product conditions are:

- static
- pre-known from the specs
- naturally part of the page contract

That simplifies the runtime and reduces moving parts without weakening backend validation.

It is also the main architectural bet in v0: if condition rules start changing independently of schema publication often enough to become operationally expensive, the system should reintroduce a dedicated dynamic rule layer rather than force that churn through schema indefinitely.
