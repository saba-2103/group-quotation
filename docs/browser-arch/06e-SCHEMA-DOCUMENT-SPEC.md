# Layer 6e — Schema Document Spec

**Keystone UI Architecture | Browser-Based, No BFF**

Parent: [06 — Client Runtime](./06-CLIENT-RUNTIME.md)

This document defines the schema document format — the JSON that the browser fetches from the CDN edge and uses to drive page rendering. It is the authoritative reference for what keys exist, what they mean, and what is implemented vs planned.

---

## Table of Contents

1. [What a Schema Is](#what-a-schema-is)
2. [Top-Level Shape](#top-level-shape)
3. [The Recursive Tree](#the-recursive-tree)
4. [Widget Node Keys](#widget-node-keys)
5. [dataSource](#datasource)
6. [actions](#actions)
7. [props — Per Widget Type](#props--per-widget-type)
8. [Conditions](#conditions)
9. [bootstrap](#bootstrap)
10. [Implementation Status](#implementation-status)

---

## What a Schema Is

A schema is a JSON document that describes a page: which widgets to render, in what arrangement, with what data sources, columns, actions, and conditions. The browser fetches it from the CDN edge, then uses it to drive rendering. Data is fetched separately by each widget — structure and data never travel together.

The schema is a tree. Every node is a widget. Layout is expressed by nesting — a `stack-layout` contains children, a `grid-layout` contains children, each of those can contain further children. There is no separate top-level layout object. The tree is recursive all the way down.

---

## Top-Level Shape

```jsonc
{
  // Schema spec version. Controls which features the client runtime supports.
  // Increment this when the schema format changes in a breaking way.
  "schemaVersion": "2.1",

  // Optional. Fetch dynamic context at schema load time before any widget renders.
  // The response is injected into the condition evaluator as $context.
  // See: bootstrap section below.
  "bootstrap": { ... },

  // The root widget. This is the top of the recursive tree.
  // Any widget type can be the root — typically stack-layout or grid-layout.
  "type": "stack-layout",

  // Props specific to the root widget type.
  "props": { ... },

  // Actions declared at root level are available to the whole page
  // (e.g. a page-header action bar). Actions can be declared on any widget node.
  "actions": [ ... ],

  // The root widget's children — the recursive tree continues here.
  "children": [ ... ]
}
```

The keys `meta`, `page`, `layout`, and `regions` do not exist. There is no envelope around the tree. The schema document **is** the root widget node with a few extra top-level keys (`schemaVersion`, `bootstrap`).

---

## The Recursive Tree

Every widget node has the same possible keys. Nesting is unlimited.

```jsonc
{
  "id": "risk-section",           // Unique within the schema. Used by actions that
                                  // target refreshWidgets, and for condition references.

  "type": "section-group",        // Widget type — must be registered in WidgetRegistry.

  "props": { ... },               // Config specific to this widget type. See per-type section.

  "dataSource": { ... },          // How this widget fetches its data. Optional.

  "actions": [ ... ],             // Actions scoped to this widget — in its header,
                                  // toolbar, or footer depending on widget type.

  "$show": { ... },               // Condition controlling whether this node renders at all.
                                  // If false, the node and all its children are omitted.

  "children": [                   // Child widgets. Layout widgets use this to build
    { ... },                      // the page structure. Non-layout widgets ignore it.
    { ... }
  ]
}
```

### What each key does

```jsonc
// "id"
// Stable identifier for this widget node within the schema.
// Used by:
//   - action behavior refreshWidgets: ["risk-section"] to trigger a refetch
//   - condition references to server state: $server.risk-section.status
//   - debug tooling and error messages
// Not required on every node but required if any action or condition references it.
"id": "quotations-table"

// "type"
// Maps to a registered component in WidgetRegistry.
// If the type is not registered, WidgetRenderer renders an error boundary.
// Currently registered types: see Implementation Status below.
"type": "data-table"

// "props"
// Everything the widget component needs to render that is not data, actions, or children.
// Column definitions, labels, pagination config, form field definitions, etc.
// Schema for props is per widget type — see the per-type section below.
"props": { "title": "Quotations", "density": "compact" }

// "dataSource"
// Describes how to fetch data for this widget.
// See the dataSource section below.
"dataSource": { "api": { "endpoint": "/v1/quotations", "method": "GET" } }

// "actions"
// Array of action definitions scoped to this widget.
// Where they render (header bar, row, footer) depends on widget type.
// See the actions section below.
"actions": [ { "key": "new-quote", "label": "New Quotation", ... } ]

// "$show"
// Condition evaluated before rendering this node.
// If false, this node and all its children are not rendered.
// See the conditions section below.
"$show": { "field": "role", "operator": "eq", "value": "underwriter" }

// "children"
// Child widget nodes. Recursive — same shape as the parent.
// Layout widgets (stack-layout, grid-layout, tabs-container, section-group) use this.
// Data widgets (data-table, form-container, metric-card) ignore children.
"children": [ { "type": "data-table", ... } ]
```

---

## dataSource

Declares how a widget fetches its data. The `useSmartQuery` hook reads this and manages
the React Query lifecycle.

```jsonc
"dataSource": {
  "api": {
    // HTTP endpoint. Supports route param substitution with {:paramName} syntax.
    // Param values are resolved from the current route context.
    // e.g. "/v1/quotations/{:id}/risks" — :id comes from the URL.
    "endpoint": "/v1/quotations",

    // HTTP method. Defaults to GET.
    "method": "GET",

    // Query params appended to the request. Static values.
    // For dynamic params driven by widget state (filters, pagination), those
    // are merged in by the widget at query time — not declared here.
    "params": {
      "status": "ACTIVE",
      "pageSize": 25
    },

    // Request body for POST requests.
    "body": { }
  },

  // Auto-refresh interval in milliseconds.
  // Passed directly to React Query's refetchInterval.
  // Omit for no polling.
  "refreshInterval": 30000,

  // Widget IDs whose state changes should trigger a refetch of this widget.
  // e.g. when the filter-bar widget updates, the data-table refetches.
  "stateDependencies": ["quotations-filter-bar"]
}
```

### Planned keys (not yet implemented)

```jsonc
"dataSource": {
  "api": {
    // JSONPath into the response to find the data array.
    // Without this, the widget receives the full response object.
    // e.g. response is { data: { items: [...] } } — set "data.items"
    // PLANNED — currently widgets must handle response shape internally.
    "dataPath": "data.items",

    // JSONPath for total record count — used by pagination.
    // PLANNED — currently total count handling varies per widget.
    "totalPath": "data.total"
  }
}
```

---

## actions

Actions can be declared on any widget node. Where they render is a contract between
the widget component and the action array — a `page-header` renders them as a button bar,
a `data-table` renders them as bulk actions or row actions depending on the action's `scope`.

```jsonc
"actions": [
  {
    // Stable key. Used by condition references and analytics.
    "key": "approve-quote",

    // Display label. Already resolved and translated at materialisation time.
    "label": "Approve",

    // Visual variant.
    // "primary" | "secondary" | "ghost" | "destructive" | "icon-only"
    "type": "primary",

    // Icon key from the design system token set.
    "icon": "check",

    // Condition controlling whether this action is visible.
    // Uses the same condition format as $show.
    "$show": { "field": "role", "operator": "eq", "value": "underwriter" },

    // Condition controlling whether this action is enabled (rendered but non-interactive).
    // PLANNED: currently not evaluated — all visible actions are enabled.
    "$enabled": { "field": "status", "operator": "eq", "value": "PENDING_APPROVAL" },

    // What happens when the action is triggered.
    // See behavior types below.
    "behavior": { ... },

    // If present, a confirmation dialog is shown before the behavior runs.
    "confirmation": {
      "title": "Approve quotation?",
      "message": "This will move the quote to Approved status.",
      "confirmLabel": "Approve",
      "cancelLabel": "Cancel",
      "variant": "default"  // "default" | "destructive"
    },

    // For data-table actions: whether this is a row-level or bulk (selection) action.
    // "row" | "bulk" | "toolbar"
    // PLANNED — currently controlled by where in props actions are declared.
    "scope": "row"
  }
]
```

### Behavior types

```jsonc
// Navigate to a route. Supports {:paramName} substitution from route context.
"behavior": { "type": "navigate", "href": "/quotations/{:id}", "target": "_self" }

// Call an API endpoint. On success, optionally redirect or refresh widgets.
"behavior": {
  "type": "api-mutation",
  "endpoint": "/v1/quotations/{:id}/approve",
  "method": "POST",
  "redirectTo": "/quotations/{:id}",    // Optional. Supports param substitution.
  "refreshWidgets": ["quotations-table"] // Widget IDs to refetch on success.
}

// Trigger a file download.
"behavior": { "type": "api-download", "endpoint": "/v1/quotations/{:id}/pdf", "filename": "quote.pdf" }

// Open a modal. The modal content is a schema fragment rendered inline.
"behavior": { "type": "open-modal", "target": "approve-modal" }

// Open a sheet (side drawer).
"behavior": { "type": "open-sheet", "target": "risk-detail-sheet" }

// Update a value in widget state (Zustand). Used for local UI state changes.
"behavior": { "type": "update-widget-state", "widgetId": "filter-bar", "op": "patch", "value": { "status": "ACTIVE" } }
```

---

## props — Per Widget Type

The `props` key is specific to each widget type. Below is the current implemented shape
for each registered widget.

---

### `stack-layout`

Arranges children in a vertical flex column.

```jsonc
"props": {
  "gap": "md"   // Spacing between children. "sm" | "md" | "lg". Default: "md".
}
```

---

### `grid-layout`

Arranges children in a CSS grid.

```jsonc
"props": {
  "columns": 12,  // Grid column count. Default: 12.
  "gap": "md"
}
// Children declare their column span via layout.colSpan on the child node.
// This is a child-level key, not inside props:
// { "type": "metric-card", "layout": { "colSpan": 4 }, "props": { ... } }
```

---

### `page-header`

Page title, description, and primary action bar.

```jsonc
"props": {
  "title": "Quotations",          // Already resolved.
  "description": "All active quotations for this portfolio.",
  "breadcrumbs": [
    { "label": "Home", "href": "/" },
    { "label": "Quotations" }     // Last item — no href.
  ]
}
// Actions for the header bar are declared in the widget's "actions" array, not in props.
```

---

### `section-group`

Titled section container with an optional column layout for its children.

```jsonc
"props": {
  "title": "Risk Details",
  "description": "...",
  "columns": 2,        // Columns for child layout within the section. Default: 1.
  "collapsible": true,
  "defaultCollapsed": false
}
```

---

### `data-table`

The primary data browsing widget.

```jsonc
"props": {
  // Column definitions. Each column describes one data field.
  "columns": [
    {
      "key": "status",          // Data path. Dot notation for nested: "risk.vehicleReg".
      "label": "Status",        // Already resolved.

      // Column display type.
      // Implemented: "text" | "badge" | "currency" | "link" | "number" | "date"
      // Planned: "avatar" | "boolean" | "list" | "custom"
      "type": "badge",

      "sortable": true,
      "filterable": true,
      "filterType": "select",   // "text" | "select" | "date-range" | "number-range"
      "width": "120px",
      "align": "left",          // "left" | "center" | "right"

      // Condition to show/hide this column.
      "$show": { "field": "role", "operator": "eq", "value": "underwriter" },

      // badge type: pre-resolved value map. Keys are raw backend codes.
      "badge": {
        "map": {
          "PENDING_APPROVAL": { "label": "Pending Approval", "variant": "warning" },
          "APPROVED":         { "label": "Approved",         "variant": "success" },
          "DECLINED":         { "label": "Declined",         "variant": "error"   }
        },
        "fallback": { "label": "Unknown", "variant": "default" }
      },

      // currency type
      "currency": {
        "currencyKey": "currency",       // Data path for currency code in the row.
        "currencyDefault": "GBP",
        "locale": "en-GB"
      },

      // date type
      "date": {
        "format": "DD MMM YYYY"          // Already locale-resolved.
      },

      // link type
      "link": {
        "href": "/quotations/{:id}",     // Param substitution from row data.
        "target": "_self"
      }
    }
  ],

  // Pagination config.
  "pagination": {
    "pageSize": 25,
    "pageSizeOptions": [10, 25, 50, 100]
  },

  // Default sort.
  "defaultSort": { "key": "createdAt", "direction": "desc" },

  // Makes the entire row clickable.
  "rowLink": { "href": "/quotations/{:id}" },

  // Row density.
  "density": "default"   // "compact" | "default" | "comfortable"
}
// Row actions and bulk actions are declared in the widget's "actions" array
// using the "scope" key to distinguish: "row" | "bulk" | "toolbar"
```

---

### `filter-bar`

Search and filter UI. Writes filter state to Zustand — data-table widgets declare
`stateDependencies` on the filter-bar's ID to refetch when filters change.

```jsonc
"props": {
  "filters": [
    {
      "key": "search",
      "type": "text",            // "text" | "select" | "date-range" | "multi-select"
      "label": "Search",
      "placeholder": "Reference or insured name..."
    },
    {
      "key": "status",
      "type": "select",
      "label": "Status",
      "options": [
        { "value": "PENDING_APPROVAL", "label": "Pending Approval" },
        { "value": "APPROVED",         "label": "Approved" }
      ]
    }
  ]
}
```

---

### `form-container`

Form with field definitions, validation, and submit behaviour.

```jsonc
"props": {
  "formId": "new-quotation",

  "sections": [
    {
      "id": "insured-details",
      "title": "Insured Details",
      "$show": { ... },
      "fields": [
        {
          "key": "insuredName",
          "type": "text",             // See field types below.
          "label": "Insured Name",
          "placeholder": "Full legal name",
          "hint": "As it appears on the policy schedule",

          // Static required. Or a condition object for conditional required.
          "required": true,

          // Condition to show/hide this field. Evaluated against current form values.
          "visibleWhen": {
            "field": "hasDependents",  // Another field key in this form.
            "operator": "eq",          // "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "notIn"
            "value": true
          },

          // Reference to the Field Config API for server-side JSONLogic rules.
          // PLANNED — not yet wired up.
          "fieldConfigRef": "dependentDOB",

          // For select / radio / checkbox-group
          "options": [
            { "value": "GBP", "label": "GBP" },
            { "value": "USD", "label": "USD" }
          ]
        }
      ]
    }
  ],

  // Field types implemented:
  // "text" | "number" | "email" | "password" | "tel" | "url"
  // "date" | "datetime" | "time"
  // "textarea"
  // "select" | "multiselect"
  // "radio" | "checkbox" | "checkbox-group" | "toggle"
  //
  // Field types planned (not yet implemented):
  // "file" | "rich-text" | "array" | "object" | "address" | "currency" | "custom"

  "submitAction": {
    "label": "Save",
    "endpoint": "/v1/quotations",
    "method": "POST",
    "redirectTo": "/quotations/{:id}"
  },

  "cancelAction": {
    "label": "Cancel",
    "behavior": { "type": "navigate", "href": "/quotations" }
  }
}
```

---

### `metric-card`

Single KPI card.

```jsonc
"props": {
  "label": "Total Premium",          // Already resolved.
  "valueKey": "totalPremium",        // Data path in dataSource response.
  "format": "currency",              // "number" | "currency" | "percentage" | "plain"
  "currency": "GBP",
  "locale": "en-GB",
  "trendKey": "premiumTrend",        // Data path for trend delta value.
  "trendPositiveDirection": "up"     // "up" | "down" — is an increase good?
}
```

---

### `key-value-grid`

Read-only display of key-value pairs. Used for entity detail panels.

```jsonc
"props": {
  "columns": 2,
  "fields": [
    {
      "key": "insuredName",
      "label": "Insured",
      "type": "text"             // Same types as table columns.
    },
    {
      "key": "status",
      "label": "Status",
      "type": "badge",
      "badge": { "map": { ... } }
    }
  ]
}
```

---

### `tabs-container`

Tabbed interface. Each tab's content is a `children` array.

```jsonc
"props": {
  "tabs": [
    {
      "id": "risks",
      "label": "Risks",
      "$show": { ... }
    },
    {
      "id": "documents",
      "label": "Documents"
    }
  ],
  "defaultTab": "risks",
  "variant": "line"    // "line" | "enclosed" | "pills"
}
// Tab content is in children[], each child declares which tab it belongs to:
// { "type": "data-table", "tab": "risks", "props": { ... } }
```

---

### `chart-widget`

Placeholder. The component exists but chart rendering is not implemented.

---

### `quick-links-widget`

Navigation link grid.

```jsonc
"props": {
  "links": [
    { "label": "New Quotation", "href": "/quotations/new", "icon": "plus" },
    { "label": "Claims Queue",  "href": "/claims",          "icon": "list" }
  ]
}
```

---

## Conditions

Conditions appear in `$show` on widget nodes, `$show` on actions, and `visibleWhen` on form fields.

### Current format

A single field comparison:

```jsonc
{
  "field": "role",           // Key in the evaluation context.
  "operator": "eq",          // "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "notIn"
  "value": "underwriter"
}
```

For form field `visibleWhen`, `field` refers to another field key in the same form.

For widget `$show` and action `$show`, `field` refers to... the current implementation
is not consistent. This is under active design — see the condition system design work.

### Planned format

Prefix-scoped variable paths with compound expressions. Not yet implemented.

```jsonc
// $context.*  — JWT claims
// $state.*    — Zustand store
// $server.*   — cached query data  
// $workflow.* — bootstrap workflow contract
// $form.*     — current form values

{ "$and": [
  { "field": "$context.role",          "operator": "eq", "value": "underwriter" },
  { "field": "$state.workflow.stage",  "operator": "eq", "value": "UNDERWRITING_REVIEW" }
]}
```

---

## bootstrap

Declares a fetch that runs at schema load time, before any widget renders.
The response is merged into the condition evaluation context so that `$show`
conditions and field rules can reference values that are not in the JWT.

```jsonc
"bootstrap": {
  // Endpoint to call. Supports {:paramName} substitution from route context.
  "endpoint": "/v1/quotations/{:id}/context",

  // The key under which the response is injected into the condition evaluator.
  // Conditions can then reference values as $context.workflow.stage etc.
  "injectAs": "$context"
}
```

**Status:** Designed, not yet implemented. The shape above is the intended contract.
The current codebase has no `useBootstrap` hook or equivalent.

---

## Implementation Status

### Widget types

| Type | Status |
|---|---|
| `stack-layout` | Implemented |
| `grid-layout` | Implemented (minimal) |
| `page-header` | Implemented |
| `section-group` | Implemented |
| `data-table` | Implemented |
| `filter-bar` | Implemented |
| `form-container` | Implemented |
| `metric-card` | Implemented |
| `key-value-grid` | Implemented |
| `tabs-container` | Implemented |
| `quick-links-widget` | Implemented |
| `chart-widget` | Placeholder — no rendering |

### Column types

| Type | Status |
|---|---|
| `text` | Implemented |
| `badge` | Implemented |
| `currency` | Implemented (USD only — locale support planned) |
| `link` | Implemented |
| `number` | Implemented |
| `date` | Recognised, no specific rendering |
| `avatar` | Planned |
| `boolean` | Planned |
| `list` | Planned |
| `custom` | Planned |

### Form field types

| Type | Status |
|---|---|
| `text`, `number`, `email`, `password`, `tel`, `url` | Implemented |
| `date`, `datetime`, `time` | Implemented |
| `textarea` | Implemented |
| `select`, `multiselect` | Implemented |
| `radio`, `checkbox`, `checkbox-group`, `toggle` | Implemented |
| `file` | Planned |
| `rich-text` | Planned |
| `array` | Planned |
| `object` | Planned |
| `address` | Planned |
| `custom` | Planned |

### Action behavior types

| Type | Status |
|---|---|
| `navigate` | Implemented |
| `api-mutation` | Implemented |
| `api-download` | Implemented |
| `open-modal` | Implemented |
| `open-sheet` | Implemented |
| `update-widget-state` | Implemented |
| `trigger-event` | Stub — logs to console only |
| `custom` | Planned |

### dataSource keys

| Key | Status |
|---|---|
| `api.endpoint` | Implemented |
| `api.method` | Implemented |
| `api.params` | Implemented |
| `api.body` | Implemented |
| `refreshInterval` | Implemented |
| `stateDependencies` | Implemented |
| `api.dataPath` | Planned |
| `api.totalPath` | Planned |

### Schema-level features

| Feature | Status |
|---|---|
| `schemaVersion` | Planned |
| `bootstrap` | Planned |
| `$show` on widget nodes | Partial — evaluator exists, prefix system not implemented |
| `$show` on actions | Partial |
| `$enabled` on actions | Planned |
| `visibleWhen` on form fields | Implemented |
| Route param substitution in endpoints (`{:id}`) | Implemented for navigate actions and link columns |
| Route param substitution in dataSource endpoints | Under investigation |
