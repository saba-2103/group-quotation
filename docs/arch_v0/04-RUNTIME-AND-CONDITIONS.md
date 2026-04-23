# Runtime And Conditions

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines the browser runtime model for v0.

---

## Runtime Summary

The browser runtime in v0 has four responsibilities:

1. fetch the resolved schema
2. hydrate a unified runtime data graph from declared data sources
3. evaluate schema-authored JSONLogic conditions locally
4. render the widget tree from bound and inherited values

There is no separate field-rule fetch path and no workbench bootstrap flow.

---

## Primary Hooks

v0 assumes these primary runtime responsibilities.

| Hook / subsystem | Purpose |
|---|---|
| `useViewMetadata(viewId)` | fetch resolved schema from the edge |
| `usePageDataGraph(schema, context)` | hydrate and expose the unified graph |
| `useSmartQuery(sourceDef)` | source-loader primitive for API-backed branches |
| `ConditionEngine` | evaluate JSONLogic conditions |
| `SchemaRenderer` | mount widgets from the widget tree |
| `useValueSource()` | resolve inherited, data-bound, and inline value sources |

`useFieldConfig()` is deliberately absent from this list.

---

## The Widget Tree

The schema is a widget tree.

Rules:

- pages are trees, not separate layout and form contracts
- forms are widgets
- fields are child widgets beneath form widgets
- every node can carry bindings, conditions, and value-source definitions

Example shape:

```json
{
  "viewId": "quote-details",
  "widgetTree": {
    "type": "Page",
    "children": [
      {
        "type": "SummaryCard",
        "bind": "data.quote.summary"
      },
      {
        "type": "Form",
        "formId": "quoteDetails",
        "bind": "data.quote",
        "fields": [
          {
            "type": "TextField",
            "name": "insuredName",
            "bind": "insured.name"
          }
        ]
      }
    ]
  }
}
```

---

## Unified Runtime Data Graph

The UI reads one data graph.

Recommended shape:

```ts
interface RuntimeGraph {
  context: {
    userId: string;
    tenantId: string;
    role: string;
    lob: string | null;
    locale: string | null;
    portalType: string | null;
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

v0 keeps the source model intentionally small.

Supported kinds:

- `api`
- `inline`

Each source writes to an explicit target path in the graph.

Example:

```json
{
  "dataSources": {
    "quote": {
      "kind": "api",
      "endpoint": "/v1/quotes/:quoteId",
      "mode": "eager",
      "target": "data.quote"
    },
    "countries": {
      "kind": "api",
      "endpoint": "/v1/lookups/countries",
      "mode": "deferred",
      "target": "data.lookups.countries"
    },
    "defaults": {
      "kind": "inline",
      "mode": "eager",
      "value": { "currency": "AED" },
      "target": "data.defaults"
    }
  }
}
```

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
- tenant guards
- permission enforcement
- regulated mutation checks

### Allowed JSONLogic subset

Use a bounded subset:

- `==`, `!=`
- `<`, `<=`, `>`, `>=`
- `and`, `or`, `!`
- `in`
- `missing`, `missing_some`
- `var`

If a rule needs more than this, review the design before expanding the condition language.

---

## Two Condition Systems

v0 has two condition mechanisms and they serve different purposes.

| Condition system | Lives in | Evaluated by | Inputs | Timing | Typical use |
|---|---|---|---|---|---|
| Edge condition | `$show` / `$hide` in resolved schema artifact | Cloudflare Worker | JWT-derived context only | once per schema fetch | audience and context shaping by tenant, role, LOB, locale, portal type |
| Runtime condition | `visibleWhen`, `requiredWhen`, `editableWhen` JSONLogic | browser `ConditionEngine` | `context`, `data`, `form`, `ui` from runtime graph | initial render plus re-evaluation on changes | data-state, form-state, and interaction-state behavior |

Rules:

- use edge `$show` / `$hide` for identity and context filtering that should happen before the browser renders the page
- use runtime JSONLogic for behavior that depends on loaded API state, form state, or local UI state
- if the Worker filters a node out at the edge, the runtime never sees it, so any runtime condition on that node is irrelevant
- if both mechanisms are present on one node, both must effectively pass, with edge filtering happening first

Authoring recommendation:

- do not duplicate the same logic in both systems
- use the edge system for claim-based audience selection
- use the runtime system for stateful UI behavior after data has loaded

---

## Conditions Versus Variants

The architecture must remain disciplined here.

### Prefer conditions when

- only a few widgets or fields differ
- the difference depends on known state or context
- the resulting JSONLogic remains readable

### Prefer a variant when

- the widget subtree is materially different
- many nodes would otherwise carry inverse or duplicated conditions
- the variant is clearer to author, review, and maintain

Variant usage must be justified during schema review.

---

## Inheritance And Value Resolution

Each node may resolve values in one of three ways:

1. `inherit`
2. `dataSource`
3. `inline`

Example for options:

```json
{
  "type": "SelectField",
  "name": "country",
  "optionsSource": {
    "kind": "dataSource",
    "path": "data.lookups.countries"
  }
}
```

Or:

```json
{
  "type": "SelectField",
  "name": "country",
  "optionsSource": {
    "kind": "inherit",
    "path": "lookups.countries"
  }
}
```

Or:

```json
{
  "type": "SelectField",
  "name": "gender",
  "optionsSource": {
    "kind": "inline",
    "options": [
      { "label": "Male", "value": "M" },
      { "label": "Female", "value": "F" }
    ]
  }
}
```

---

## Page Boot Sequence

```text
1. Route activates
2. useViewMetadata(viewId) fetches schema from edge
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
- re-hydrate the affected graph paths from fresh backend responses
- re-evaluate all conditions whose dependency paths fall under the updated graph subtree

### Patch locally then revalidate

Allowed when the optimistic update is low risk and the server response still becomes the final truth.

Semantics:

- patch the target graph path optimistically
- re-evaluate conditions affected by the patched subtree immediately
- revalidate against the backend response afterward
- if revalidation disagrees, backend state wins and conditions re-evaluate again

### Form-state behavior after mutation

Form state does not auto-clear by default.

Default behavior after successful submit:

- `form.{formId}` persists until route exit, explicit reset, or explicit discard
- if a page needs reset-on-success behavior, it must declare that intentionally
- if a successful mutation triggers a fresh data reload, form state is only re-initialized from server data when the page explicitly declares that sync behavior

### Condition re-evaluation after mutation

Any mutation that changes a graph subtree must trigger re-evaluation of all runtime conditions depending on that subtree.

Example:

- if `data.quote` is re-fetched
- then any condition reading `data.quote.*` must be re-evaluated

### Graph path ownership

v0 uses a single-writer rule for graph paths.

Rules:

- no two independent data sources may target the same graph path
- overlapping parent/child target paths from different sources are disallowed in v0 unless treated as one coordinated source definition
- schema validation should fail if source targets collide

Either way, backend validation remains the enforcement point.

---

## Why `useFieldConfig()` Is Gone

The earlier system separated field rules into another browser flow. v0 removes that because the product conditions are:

- static
- pre-known from the specs
- naturally part of the page contract

That simplifies the runtime and reduces moving parts without weakening backend validation.

It is also the main architectural bet in v0: if condition rules start changing independently of schema publication often enough to become operationally expensive, the system should reintroduce a dedicated dynamic rule layer rather than forcing that churn through schema indefinitely.
