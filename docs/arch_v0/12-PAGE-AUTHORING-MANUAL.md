# Page Authoring Manual

**Audience:** Engineers and AI agents authoring schemas  
**Purpose:** Practical guide for creating pages that conform to the architecture

This document is the usage manual for authoring page schemas.

It explains:

- how to think about a page
- how to declare graph namespaces
- how to build the widget tree
- how to bind data
- how to use conditions
- how to model forms and draft state
- when to use a variant

If you are creating a new page, start here.

---

## The Mental Model

A page schema in this architecture is five things at once:

1. a unique artifact identified by `schemaId`
2. a widget tree
3. a declaration of runtime graph namespaces
4. a set of bindings into those namespaces
5. a set of JSONLogic conditions that shape the UX

The page schema is not:

- a bag of disconnected widgets
- a place to embed business logic enforcement
- a place to hardcode API responses into component props
- a place to invent ad hoc state names without discipline

---

## Authoring Sequence

When creating a page, follow this order.

### 1. Choose a `schemaId`

The `schemaId` is the unique identifier of the resolved schema artifact.

Good examples:

- `quote-details`
- `quote-search`
- `admin-user-list`

Avoid:

- temporary names like `page1`
- implementation names like `newLayoutTest`

### 2. Decide the page's graph namespaces

Before writing widgets, decide what named branches the page needs under `graph.*`.

Typical namespace types:

- domain data: `quote`, `member`, `searchResults`
- draft/form data: `quoteDraft`, `claimIntakeDraft`
- page-local state: `filters`, `pageState`
- options/reference data: `countryOptions`, `statusOptions`

### 3. Build the widget tree

Describe the page as widgets and child widgets.

Remember:

- forms are widgets
- fields are child widgets of forms
- the page is one tree

### 4. Add bindings

Each widget or field should bind to a stable path in `system.*` or `graph.*`.

### 5. Add conditions

Use JSONLogic conditions for UI differences that depend on known state.

### 6. Add variants only if conditions are not enough

A variant is the fallback, not the starting point.

---

## Naming Rules For Graph Namespaces

Namespace names must be:

- unique within a schema
- semantic
- stable enough to be referenced in bindings, conditions, and tests

Good:

- `quote`
- `quoteDraft`
- `filters`
- `pageState`
- `countryOptions`

Bad:

- `data1`
- `temp`
- `widgetA`
- `formWidget12`

### Do not namespace primarily by component

Do not make component names the main state contract.

Avoid this as the primary pattern:

- `graph.summaryCard`
- `graph.formA`
- `graph.leftPanel`

Prefer this instead:

- `graph.quote`
- `graph.quoteDraft`
- `graph.filters`
- `graph.pageState.summaryCard.expanded`

Rule:

- top-level namespaces should be semantic
- component-local details may be nested underneath a semantic namespace if needed

---

## Mini-Spec

Recommended page schema shape for authoring:

```ts
type GraphNamespaceKind = 'api' | 'local' | 'inline';
type GraphNamespaceUsage = 'domain' | 'form' | 'state' | 'options';
type GraphNamespaceMode = 'eager' | 'deferred';

interface PageSchema {
  schemaId: string;
  version: string;
  title?: string;
  graphNamespaces: Record<string, GraphNamespaceDefinition>;
  widgetTree: WidgetNode;
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

Convention:

- namespace key `quote` always maps to runtime path `graph.quote`
- namespace key `quoteDraft` always maps to runtime path `graph.quoteDraft`

Do not redundantly restate those paths in every namespace declaration.

Why this is important:

- `kind: "api"` cannot also legally declare `value`
- `kind: "inline"` cannot also legally declare `endpoint`
- `kind: "local"` cannot also legally declare `method`

The shape should make invalid combinations structurally impossible, not just discouraged in comments.

---

## Full Worked Example

The example below shows all of these together:

- `graphNamespaces`
- widget tree
- conditions
- bindings
- form draft namespace

```json
{
  "schemaId": "quote-details",
  "version": "1.0.0",
  "title": "Quote Details",
  "graphNamespaces": {
    "quote": {
      "kind": "api",
      "usage": "domain",
      "mode": "eager",
      "endpoint": "/v1/quotes/:quoteId",
      "method": "GET"
    },
    "quoteDraft": {
      "kind": "local",
      "usage": "form",
      "initialValueFrom": "graph.quote"
    },
    "filters": {
      "kind": "local",
      "usage": "state",
      "initialValue": {
        "showManualOnly": false
      }
    },
    "pageState": {
      "kind": "local",
      "usage": "state",
      "initialValue": {
        "activeTab": "summary",
        "manualReviewExpanded": false
      }
    },
    "countryOptions": {
      "kind": "api",
      "usage": "options",
      "mode": "deferred",
      "endpoint": "/v1/lookups/countries",
      "method": "GET"
    },
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
  },
  "widgetTree": {
    "type": "Page",
    "children": [
      {
        "type": "SummaryCard",
        "bind": "graph.quote.summary"
      },
      {
        "type": "Section",
        "title": "Manual Review",
        "visibleWhen": {
          "and": [
            {
              "==": [
                { "var": "system.role" },
                "underwriter"
              ]
            },
            {
              "==": [
                { "var": "graph.quote.flags.requiresManualReview" },
                true
              ]
            }
          ]
        },
        "children": [
          {
            "type": "Toggle",
            "bind": "graph.pageState.manualReviewExpanded"
          }
        ]
      },
      {
        "type": "Form",
        "formId": "quoteDetails",
        "bind": "graph.quoteDraft",
        "fields": [
          {
            "type": "TextField",
            "name": "insuredName",
            "bind": "insured.name"
          },
          {
            "type": "SelectField",
            "name": "country",
            "optionsSource": {
              "kind": "dataSource",
              "path": "graph.countryOptions"
            }
          },
          {
            "type": "SelectField",
            "name": "gender",
            "optionsSource": {
              "kind": "dataSource",
              "path": "graph.staticOptions.gender"
            }
          },
          {
            "type": "TextField",
            "name": "guardianName",
            "visibleWhen": {
              "<": [
                { "var": "graph.quote.insured.age" },
                18
              ]
            },
            "requiredWhen": {
              "<": [
                { "var": "graph.quote.insured.age" },
                18
              ]
            }
          }
        ],
        "actions": [
          {
            "type": "SubmitAction",
            "label": "Save Quote"
          }
        ]
      }
    ]
  }
}
```

---

## How To Read The Example

### `graph.quote`

The main domain entity for the page.

Used for:

- summary display
- conditions based on server data
- seeding the draft namespace

### `graph.quoteDraft`

Local mutable state for the form.

This replaces the idea of a special top-level `form.*` store.

### `graph.pageState`

Page-local interaction state.

This replaces the idea of a vague top-level `ui.*` bucket.

### `graph.countryOptions`

Reference/options data loaded separately.

### `graph.staticOptions`

Inline options data.

---

## Binding Rules

Use bindings like this:

### Absolute binding

```json
{ "bind": "graph.quote.summary" }
```

Use when the widget reads directly from a known graph path.

### Relative binding from parent scope

```json
{ "bind": "insured.name" }
```

Use when the parent widget already binds to a namespace like `graph.quoteDraft`.

### Value-source binding

```json
{
  "optionsSource": {
    "kind": "dataSource",
    "path": "graph.countryOptions"
  }
}
```

Use for explicit external options.

---

## Condition Rules

Conditions may reference only:

- `system.*`
- declared `graph.*` namespaces

Good:

```json
{ "var": "system.role" }
{ "var": "graph.quote.state" }
{ "var": "graph.quoteDraft.guardianName" }
```

Bad:

```json
{ "var": "data.quote.state" }
{ "var": "form.quoteDetails.guardianName" }
{ "var": "misc.tempValue" }
```

---

## Forms And Draft State

The preferred pattern is:

1. main domain namespace for server state
2. separate local namespace for mutable draft state

Example:

- `graph.quote` for loaded server data
- `graph.quoteDraft` for user-edited values

Do not write form state back into the domain namespace directly unless the page is explicitly designed that way.

---

## Variants

Use a variant only when the page would become less maintainable through conditions.

A variant means:

- a separate schema artifact
- a separate `schemaId`
- explicit route/config selection

Before introducing one, answer:

1. Why are conditions not enough?
2. Is this truly structural?
3. How will the variant stay in sync with the base schema?

---

## Validation Checklist

Before a page schema is considered ready, check:

1. `schemaId` is stable and meaningful
2. graph namespace names are semantic and unique
3. namespace kinds and usages are valid
4. no namespace collisions exist
5. widget tree is readable
6. JSONLogic conditions are tied clearly to the product spec
7. bindings point only to `system.*` or declared `graph.*`
8. draft/form state is isolated cleanly where needed
9. variant usage, if any, is justified
10. schema passes size and accessibility checks

For machine-checkable versions of these rules, see [`13-SCHEMA-LINT-RULES.md`](./13-SCHEMA-LINT-RULES.md).

---

## Rules For AI Agents

If an AI agent is authoring or proposing a page schema, it should:

1. declare semantic graph namespaces first
2. derive runtime paths from namespace keys, not invent arbitrary paths
3. prefer conditions over variants
4. avoid component-derived top-level namespace names
5. keep JSONLogic readable and bounded
6. keep draft state separate from loaded domain state unless explicitly required otherwise

---

## Related Docs

- runtime model: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- system narrative: [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
- authoring/review process: [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md)
- terms and assumptions: [`10-TERMS-AND-ASSUMPTIONS.md`](./10-TERMS-AND-ASSUMPTIONS.md)
- lint/validation rules: [`13-SCHEMA-LINT-RULES.md`](./13-SCHEMA-LINT-RULES.md)
