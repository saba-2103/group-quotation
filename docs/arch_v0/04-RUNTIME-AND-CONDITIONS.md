# Runtime And Conditions

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines the browser runtime model for the initial POC.

---

## Runtime Summary

The browser runtime in v0 has four responsibilities:

1. fetch the resolved schema by `schemaId`
2. hydrate a unified runtime data graph from declared data sources
3. evaluate schema-authored JSONLogic conditions locally
4. render the widget tree from bound, scope-resolved, and inline values

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
| `useValueSource()` | resolve scope-based, data-bound, and inline value sources |

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
  system: {
    userId: string;
    role: string;
    permissions: string[];
    routeParams: Record<string, string>;
  };
  graph: Record<string, unknown>;
}
```

Reserved roots:

- `system`: runtime-managed read-only context
- `graph`: schema-declared namespaces for all page state

### Schema-declared namespaces

The schema declares the branches it needs under `graph`.

The namespace key itself defines the storage path. If the schema declares a namespace named `quoteDraft`, its runtime path is `graph.quoteDraft`.

That means the path is derived by convention rather than repeated manually.

### Mini-spec

Recommended schema contract:

```ts
type GraphNamespaceKind = 'api' | 'local' | 'inline';
type GraphNamespaceUsage = 'domain' | 'form' | 'state' | 'options';
type GraphNamespaceMode = 'eager' | 'deferred';

interface GraphNamespaceMap {
  [namespaceName: string]: GraphNamespaceDefinition;
}

type GraphNamespaceDefinition =
  | ApiGraphNamespace
  | LocalGraphNamespace
  | InlineGraphNamespace;

interface ApiGraphNamespace {
  kind: 'api';
  usage?: GraphNamespaceUsage;
  mode?: GraphNamespaceMode;
  endpoint: string;
  method?: 'GET' | 'POST';
  dependsOn?: string[];
}

interface LocalGraphNamespace {
  kind: 'local';
  usage?: GraphNamespaceUsage;
  initialValue?: unknown;
  initialValueFrom?: string;
}

interface InlineGraphNamespace {
  kind: 'inline';
  usage?: GraphNamespaceUsage;
  value: unknown;
}
```

Rules:

- namespace names are unique within a schema
- runtime path is always `graph.<namespaceName>`
- `kind: "api"` namespaces must provide `endpoint` and may provide only `usage`, `mode`, `method`, and `dependsOn`
- `kind: "local"` namespaces may provide only `usage`, `initialValue`, and `initialValueFrom`
- `kind: "inline"` namespaces must provide `value` and may provide only `usage` and `value`
- `usage` is optional metadata, but when present it should use the bounded set above

Recommended defaults:

- `usage: "domain"` for API-backed entity state
- `usage: "form"` for mutable draft/form state
- `usage: "state"` for page-local interaction state
- `usage: "options"` for inline or loaded option sets
- `mode: "eager"` if omitted for `api`

Example:

```json
{
  "graphNamespaces": {
    "quote": {
      "kind": "api",
      "usage": "domain",
      "mode": "eager",
      "endpoint": "/v1/quotes/:quoteId"
    },
    "quoteDraft": {
      "kind": "local",
      "usage": "form",
      "initialValueFrom": "graph.quote"
    },
    "filters": {
      "kind": "local",
      "usage": "state",
      "initialValue": {}
    },
    "pageState": {
      "kind": "local",
      "usage": "state",
      "initialValue": {
        "activeTab": "summary"
      }
    },
    "countryOptions": {
      "kind": "inline",
      "usage": "options",
      "value": []
    }
  }
}
```

The schema and conditions then bind to:

- `system.role`
- `graph.quote.insured.age`
- `graph.quoteDraft.guardianName`
- `graph.filters.status`
- `graph.pageState.activeTab`

### Properties of this model

- forms stop being a special storage class
- page-local UI state is explicitly named through declared namespaces
- schema authors get a declared naming contract
- validation can detect namespace collisions early
- paths are derived from namespace names instead of repeated manually

---

## Data Sources

In this model, the namespace definition is also the source definition.

Supported kinds in the POC:

- `api`
- `local`
- `inline`

Additional namespace usages may be declared by the schema, such as:

- `usage: "form"`
- `usage: "state"`

Each source writes to an explicit target path in the graph.

In practice, that target path is derived from the namespace key:

- namespace `quote` -> `graph.quote`
- namespace `quoteDraft` -> `graph.quoteDraft`
- namespace `pageState` -> `graph.pageState`

No two independent sources may target the same graph path.

### Namespace naming rules

Namespace names must:

- be unique within a schema
- be semantic rather than technical
- remain stable enough to be referenced from bindings and conditions

Good names:

- `quote`
- `quoteDraft`
- `filters`
- `pageState`
- `countryOptions`

Bad names:

- `data1`
- `temp`
- `misc`

### Should namespaces be component-based?

Not by default.

Using component-derived namespaces like `graph.summaryCard` or `graph.formA` as the main state model is brittle because component refactors then become state-contract changes.

Preferred rule:

- use semantic, page-level namespaces as the primary state contract
- allow component IDs only for clearly local/internal branches if needed

So the architecture should prefer:

- `graph.quoteDraft`
- `graph.filters`
- `graph.pageState`

over:

- `graph.formWidget12`
- `graph.sidebarComponent`

The goal is not just uniqueness. The goal is uniqueness **plus** readability and long-term stability.

Preferred way to model component-local state when needed:

- nest it under a semantic namespace

For example, prefer:

- `graph.pageState.summaryCard.expanded`

over:

- `graph.summaryCard`

---

## Conditions

Conditions are static JSONLogic authored in schema from product specs.

### Condition type

At the runtime level, a condition is just a JSONLogic expression.

```ts
type ConditionExpr = Record<string, unknown>;
```

Recommended attachment interfaces:

```ts
interface CommonConditionProps {
  visibleWhen?: ConditionExpr;
}

interface FieldConditionProps extends CommonConditionProps {
  editableWhen?: ConditionExpr;
  requiredWhen?: ConditionExpr;
}
```

Interpretation:

- `visibleWhen` is generic and may appear on any widget node
- `editableWhen` is only for editable input/field widgets
- `requiredWhen` is only for form-field widgets that participate in submit payloads

### Condition attachment model

Conditions are not all applicable to every node type.

Recommended contract:

```ts
interface CommonConditionProps {
  visibleWhen?: ConditionExpr;
}

interface FieldConditionProps extends CommonConditionProps {
  editableWhen?: ConditionExpr;
  requiredWhen?: ConditionExpr;
}
```

Interpretation:

- `visibleWhen` is the generic condition and may appear on any widget node, including sections, forms, fields, and actions
- `editableWhen` is specific to editable input/field widgets
- `requiredWhen` is specific to form-field widgets that contribute submitted values

This means the architecture does **not** treat every condition key as universally valid on every node.

Example:

```json
{
  "visibleWhen": {
    "<": [
      { "var": "graph.quote.insured.age" },
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

### Recommended attachment points

| Condition key | Applies to | Notes |
|---|---|---|
| `visibleWhen` | any widget node | generic visibility control |
| `editableWhen` | input / field widgets | not for non-editable display widgets |
| `requiredWhen` | form-field widgets | only for fields that participate in submit payloads |

If a node type does not support a condition key, schema validation should reject it.

### Runtime behavior for invalid condition usage

Invalid condition-key usage should not crash the site if it reaches runtime.

Runtime should:

- log a contract/authoring violation with node type, key, and schema ID
- ignore the unsupported condition key
- continue rendering the page using safe defaults

Examples:

- `requiredWhen` on `SummaryCard` -> log and ignore `requiredWhen`
- `editableWhen` on a non-editable display widget -> log and ignore `editableWhen`

The preferred place to catch this is validation and CI. Runtime handling is a resilience fallback.

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
- conditions may only reference `system.*` or declared `graph.*` namespaces

If a future version reintroduces a resolver layer, an edge condition system can be added back deliberately.

---

## Conditions Versus Variants

### Prefer conditions when

- only a few widgets or fields differ
- the difference depends on known state or role/context already available in `system.*` or `graph.*`
- the resulting JSONLogic remains readable

### Prefer a variant when

- the widget subtree is materially different
- many nodes would otherwise carry inverse or duplicated conditions
- the variant is clearer to author, review, and maintain

For the POC, a variant is a separate schema artifact with its own `schemaId`. It is selected explicitly by route or configuration.

---

## Value Resolution Model

Each node may resolve values in four ways:

1. absolute graph-path binding
2. relative scope-based binding
3. explicit initialization from another path
4. inline literal value

This model is narrower and clearer than a generic "inherit" concept.

### 1. Absolute graph-path binding

Example:

```json
{ "bind": "graph.quote.summary" }
```

Use when the node reads directly from a known path.

### 2. Relative scope-based binding

Example:

```json
{ "bind": "insured.name" }
```

If the parent scope is `graph.quoteDraft`, this resolves to `graph.quoteDraft.insured.name`.

### 3. Explicit initialization from another path

Example:

```json
{
  "quoteDraft": {
    "kind": "local",
    "usage": "form",
    "initialValueFrom": "graph.quote"
  }
}
```

This is initialization, not ongoing inheritance.

### 4. Inline literal value

Example:

```json
{
  "staticOptions": {
    "kind": "inline",
    "usage": "options",
    "value": {
      "gender": [
        { "label": "Male", "value": "M" },
        { "label": "Female", "value": "F" }
      ]
    }
  }
}
```

### Important rule

The architecture should avoid a vague generic `inherit` source kind.

The system behavior should stay explicit:

- relative scope resolution
- explicit path binding
- explicit initialization
- inline value

---

## Page Boot Sequence

```text
1. Route activates
2. useViewMetadata(schemaId) fetches schema from CDN
3. Runtime reads schema-declared graph namespaces and sources
4. usePageDataGraph hydrates eager graph branches under `graph.*`
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

- the namespace bound to the form, such as `graph.quoteDraft`, persists until route exit, explicit reset, or explicit discard
- if a page needs reset-on-success behavior, it must declare that intentionally
- if a mutation triggers a fresh data reload, form state is only re-initialized from server data when the page explicitly declares that sync behavior

### Graph path ownership

The POC uses a single-writer rule for graph paths.

Rules:

- no two independent data sources may target the same graph path
- overlapping parent/child target paths from different sources are disallowed unless treated as one coordinated source definition
- schema validation should fail if source targets collide
- namespace names must be unique within a schema
- runtime path is derived from namespace name as `graph.<namespaceName>`
- conditions and bindings may only reference declared namespaces under `graph.*`

Either way, backend validation remains the enforcement point.

---

## Why Conditions Live In Schema

Conditions live directly in schema because the product conditions are:

- static
- pre-known from the specs
- naturally part of the page contract

That simplifies the runtime and reduces moving parts without weakening backend validation.

It is also the main architectural bet in v0: if condition rules start changing independently of schema publication often enough to become operationally expensive, the system should reintroduce a dedicated dynamic rule layer rather than force that churn through schema indefinitely.
