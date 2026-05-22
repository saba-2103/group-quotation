# 02 — Widget catalog

Every registered widget, what it accepts, what it renders, when to use it.

The registry lives in [`src/components/registry/WidgetRegistry.tsx`](../../src/components/registry/WidgetRegistry.tsx). To use a widget in a schema, set `"type": "<widget-key>"` and pass its config under `props`.

This catalog is grouped by category. Skim the index, jump to the widget you need.

---

## Index

**Layout** — composition primitives
- [`stack-layout`](#stack-layout) — flex container (column or row)
- [`grid-layout`](#grid-layout) — CSS grid container
- [`section-group`](#section-group) — titled section with grid children
- [`page-header`](#page-header) — page title, breadcrumbs, actions

**Container** — navigation between content groups
- [`tabs-container`](#tabs-container) — tabbed content, optional workflow nav

**Data display** — read-only data rendering
- [`data-table`](#data-table) — sortable / filterable / paginated table
- [`key-value-grid`](#key-value-grid) — read-only entity-summary grid

**Forms** — user input
- [`form-container`](#form-container) — the dynamic form
- [`overlaid-form`](#overlaid-form) (overlay-only) — form rendered in a modal/sheet
- [`confirmation-dialog`](#confirmation-dialog) (overlay-only) — confirm-then-mutate dialog

**Item display** — small reusable display elements
- [`metric-card`](#metric-card) — KPI with optional trend
- [`chart-widget`](#chart-widget) — bar / line / pie via Recharts
- [`quick-links-widget`](#quick-links-widget) — link/CTA cards
- [`error-banner`](#error-banner) — dismissable error list
- [`context-help-tooltip`](#context-help-tooltip) — wrapper adding a help tooltip

**Controls** — interactive primitives used outside forms
- [`filter-bar`](#filter-bar) (alias `search-bar`) — search + filter pills
- [`date-widget`](#date-widget) — single / range / display date picker
- [`searchable-dropdown`](#searchable-dropdown) — searchable single-select

**State & role** — lifecycle and gating
- [`action-bar`](#action-bar) — state- and role-gated button group
- [`state-badge`](#state-badge) — entity lifecycle badge
- [`reason-banner`](#reason-banner) — pending/voided/cancelled reason banner
- [`role-switcher`](#role-switcher) — demo role selector

---

## Conventions used in this catalog

For each widget you'll find:

- **`type` string** — exactly what to put in the schema.
- **Source** — implementation file path.
- **Use when** — the canonical use case.
- **`props` shape** — what to pass under `"props": { ... }`.
- **`dataSource`** — whether it consumes one, and what response shape it expects.
- **`children`** — whether it renders nested widgets, and where they live in the config.
- **Example** — a minimal working schema snippet.
- **Gotchas** — non-obvious behaviour the docs need to warn about.

Field types in `props` are simplified for readability. The authoritative types live next to each component in TypeScript.

---

## Layout

### `stack-layout`

**Use when** you need a flex container — a vertical stack of cards, a horizontal row of buttons, anything one-dimensional.

**Source:** [`src/components/widgets/layout/StackLayout.tsx`](../../src/components/widgets/layout/StackLayout.tsx)

**Props:**
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `direction` | `"row" \| "column"` | `"column"` | |
| `gap` | `1-8` | `4` | Maps to Tailwind `gap-N` |
| `align` | `"start" \| "center" \| "end" \| "stretch"` | `"stretch"` | Cross-axis |
| `justify` | `"start" \| "center" \| "between" \| "end"` | `"start"` | Main-axis |
| `className` | string | — | Escape hatch |

**Children:** Renders each child via `WidgetRenderer`.

**Example:**
```json
{
  "id": "page",
  "type": "stack-layout",
  "props": { "gap": 6 },
  "children": [
    { "$ref": "schemas/tabs/header.json" },
    { "id": "summary", "type": "key-value-grid", "props": { ... } }
  ]
}
```

**Gotchas:**
- ⚠️ Default `align: "stretch"` makes children fill cross-axis. Set `align: "start"` if cards shouldn't expand.
- `gap` is constrained to integers 1–8; non-integer values silently fail (no class generated).

---

### `grid-layout`

**Use when** you need a multi-column responsive grid — a 3-column row of metric cards, a 4-column field grid, a card dashboard.

**Source:** [`src/components/widgets/layout/GridLayout.tsx`](../../src/components/widgets/layout/GridLayout.tsx)

**Props:**
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `columns` | number | `1` | Static columns; uses inline `gridTemplateColumns` for dynamic values |
| `gap` | number | `4` | Tailwind `gap-N` |
| `gridTemplateColumns` | string | — | Override (e.g. `"65fr 35fr"` for asymmetric) |
| `className` | string | — | |

**Children:** Renders each child in a grid cell. Each child can opt into a multi-column span via its own `layout.colSpan`.

**Example:**
```json
{
  "id": "metrics-row",
  "type": "grid-layout",
  "props": { "columns": 4, "gap": 4 },
  "children": [
    { "id": "m1", "type": "metric-card", "dataSource": { ... } },
    { "id": "m2", "type": "metric-card", "dataSource": { ... } }
  ]
}
```

**Gotchas:**
- ⚠️ `WidgetRenderer` only generates `col-span-N` for `colSpan` ∈ {1,2,3,4}. Larger spans need `gridTemplateColumns` override + manual width.
- For asymmetric splits (e.g. 65/35) use `gridTemplateColumns: "65fr 35fr"`, not `columns`.

---

### `section-group`

**Use when** you need a titled section with grid children — "Policy Details", "Customer", "Vehicle" on a detail page.

**Source:** [`src/components/widgets/layout/SectionGroup.tsx`](../../src/components/widgets/layout/SectionGroup.tsx)

**Props:**
| Prop | Type | Default |
|------|------|---------|
| `title` | string | — |
| `columns` | `1 \| 2 \| 3 \| 4` | `1` |

**Children:** Each child renders inside a CSS grid (1 column on mobile, N on `md+`).

**Example:**
```json
{
  "id": "policy-section",
  "type": "section-group",
  "props": { "title": "Policy", "columns": 2 },
  "children": [
    { "id": "policy-card", "type": "key-value-grid", "dataSource": { ... } },
    { "id": "policy-history", "type": "data-table", "dataSource": { ... } }
  ]
}
```

**Gotchas:**
- Breakpoint is hardcoded at `md`. There's no fine-grained breakpoint control.
- Empty `title` still renders an empty heading row — omit the prop if you don't need a title.

---

### `page-header`

**Use when** you need a page top with title, description, breadcrumbs, and actions — the canonical opener for every detail page.

**Source:** [`src/components/widgets/layout/PageHeader/index.tsx`](../../src/components/widgets/layout/PageHeader/index.tsx)

**Props:**
| Prop | Type | Notes |
|------|------|-------|
| `title` | string | |
| `description` | string | |
| `breadcrumbs` | `Array<{ label: string; href?: string }>` | Last item has no `href` and renders as current page |
| `actions` | `ActionConfig[]` | Button group on the right |
| `validActions` | `Array<{ code, label }>` | Dropdown of state-transition options (rare; legacy) |
| `tranStatus` | `{ label, variant }` | Optional status pill next to title |
| `backendErrors` | `Array<{ error_code, error_desc }>` | Inline error banner |

**Example:**
```json
{
  "id": "header",
  "type": "page-header",
  "props": {
    "title": "Claim Details",
    "description": "View and manage this motor claim",
    "breadcrumbs": [
      { "label": "Home", "href": "/" },
      { "label": "Claims", "href": "/claims" },
      { "label": "Details" }
    ],
    "actions": [
      { "id": "refresh", "label": "Refresh", "icon": "RefreshCw", "type": "api-mutation", "api": { "endpoint": "/api/v1/claims/:id", "method": "GET" }, "refreshKey": "/api/v1/claims/" }
    ]
  }
}
```

---

## Container

### `tabs-container`

**Use when** you need tabs — sub-sections of a detail page, multi-step workflows.

**Source:** [`src/components/widgets/container/TabsContainer.tsx`](../../src/components/widgets/container/TabsContainer.tsx)

**Props:**
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `hasWorkflow` | boolean | `false` | Renders Prev / Next / Complete buttons |
| `confirmNavigation` | boolean | `false` | Guard against unsaved-changes loss when switching tabs |
| `prevLabel` | string | `"Prev"` | |
| `nextLabel` | string | `"Next"` | |
| `completeLabel` | string | `"Complete"` | |

**Children:** Each child must be a `tab-panel`. The `tab-panel` is *not* in the registry separately — it's just a widget config with `type: "tab-panel"` used inside `tabs-container`. Child props:
- `label` (string) — trigger label
- `icon` (Lucide icon name)
- `deleteAction` (`ActionConfig`)
- `children` (`WidgetConfig[]`) — tab content

**Example:**
```json
{
  "id": "claim-tabs",
  "type": "tabs-container",
  "children": [
    {
      "id": "overview-tab",
      "type": "tab-panel",
      "props": { "label": "Overview", "icon": "LayoutDashboard" },
      "children": [
        { "$ref": "schemas/tabs/claims/overview.json" }
      ]
    },
    {
      "id": "audit-tab",
      "type": "tab-panel",
      "props": { "label": "Audit", "icon": "ScrollText" },
      "children": [
        { "$ref": "schemas/tabs/claims/audit.json" }
      ]
    }
  ]
}
```

**Gotchas:**
- ⚠️ Icon names must match Lucide exactly. Bad names render nothing (no error).
- `confirmNavigation` prompts on any tab change. Useful inside forms, intrusive otherwise.
- `hasWorkflow` is for sequential flows (quote setup wizard, member-add steps). Don't enable on detail-page tabs.

---

## Data display

### `data-table`

**Use when** you need a sortable, filterable, paginated table — the workhorse of every list page.

**Source:** [`src/components/widgets/data/DataTable/index.tsx`](../../src/components/widgets/data/DataTable/index.tsx)

**DataSource:** Usually yes. Response can be:
- A bare array (most common): `[{ ... }, { ... }]`
- An object with `valueKey`-able array: `{ items: [...] }` + `dataSource.valueKey: "items"`

**Props (the important ones):**
| Prop | Type | Notes |
|------|------|-------|
| `columns` | `ColumnConfig[]` | See below |
| `rowIdKey` | string | Default `"id"`. Override when row PK isn't `id` (e.g. `"claim_id"`) |
| `rowActions` | `RowActionConfig[]` | Per-row action menu |
| `headerActions` | `ActionConfig[]` | Toolbar buttons above the table (e.g. "Add Claim", export buttons) |
| `bulkActions` | `RowActionConfig[]` | Appear when `selectable: true` and rows are checked |
| `selectable` | boolean | Enables row checkboxes |
| `pagination` | `{ enabled, pageSize, pageSizeOptions? }` | |
| `defaultSort` | `{ field, direction }` | |
| `emptyState` | `{ title, description, action? }` | |
| `onRowClick` | `ActionConfig` | Fires on row click (often a navigate) |
| `isScrollable` | boolean | Required when using frozen columns |

**Column shape (`ColumnConfig`):**
```ts
{
  id: string;
  header: string;
  accessorKey: string;             // Plain key. Dotted-path / array-index support depends on table version — verify with the schema you're adapting.
  type?: "badge" | "status" | "currency" | "number" | "date" | "link" | "state-badge";
  cellType?: ...;                  // Alias for type in some configs
  valueMapping?: BadgeValueMapping[];  // Required for type: "badge" | "status"
  linkRoute?: string;              // For type: "link" — supports :id substitution from row data
  entity?: "quote" | "proposal" | "policy" | "member";  // For type: "state-badge"
  currency?: string;               // Override for type: "currency" (default "USD")
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select" | "date";
  frozen?: "left" | "right";
  align?: "left" | "center" | "right";
  helpText?: string;
}
```

**BadgeValueMapping:**
```ts
{ value: string; label: string; color?: "success" | "warning" | "error" | "info" | "secondary" | "default"; variant?: string }
```

⚠️ `color` only matches the keys in `BADGE_COLOR_TO_VARIANT` ([src/components/widgets/data/DataTable/constants.ts](../../src/components/widgets/data/DataTable/constants.ts)). Unmapped values (`"grey"`, `"teal"`, etc.) fall back to `outline`. Either use one of the listed colours or extend the constant.

**Per-row action visibility:** Row actions can carry a `visible` JSONLogic predicate evaluated against the row's data. Useful for "delete is only visible on non-archived rows", etc.

```json
"rowActions": [
  { "id": "delete", "label": "Delete", "type": "api-mutation",
    "visible": { "!=": [{ "var": "status" }, "ARCHIVED"] },
    "api": { ... } }
]
```

**Example:**
```json
{
  "id": "claims-table",
  "type": "data-table",
  "dataSource": { "api": { "endpoint": "/api/v1/claims", "method": "GET" }, "valueKey": "items" },
  "props": {
    "rowIdKey": "claim_id",
    "rowActions": [
      { "id": "view", "label": "View", "icon": "Eye", "type": "navigate", "target": "/claims/:id" }
    ],
    "columns": [
      { "id": "claim-no", "header": "Claim No", "accessorKey": "claim_no" },
      { "id": "customer", "header": "Customer", "accessorKey": "claimants.0.name" },
      { "id": "state", "header": "State", "accessorKey": "state", "type": "badge", "valueMapping": [
        { "value": "TRIAGED", "label": "Triaged", "color": "info" },
        { "value": "SETTLED", "label": "Settled", "color": "success" },
        { "value": "CLOSED",  "label": "Closed",  "color": "secondary" }
      ]},
      { "id": "amount", "header": "Amount", "accessorKey": "claimed_amount", "type": "currency" }
    ],
    "pagination": { "enabled": true, "pageSize": 20 }
  }
}
```

**Gotchas:**
- ⚠️ Nested accessors (`vehicle.registration_no`, `claimants.0.name`) need DataTable's nested-accessor support — present in some branches, absent in others. Verify against [`src/components/widgets/data/DataTable/index.tsx`](../../src/components/widgets/data/DataTable/index.tsx) on your branch. If you render nothing, check the response shape in DevTools.
- `linkRoute` and `rowActions[].target` both support `:paramName` substitution from row data (via [`substituteEndpointParams`](../../src/lib/endpointUtils.ts)). Use `:id` for the row PK, or `:claim_id` etc. for non-`id` PKs.
- Filters only appear if columns have `filterable: true` AND a `filters` prop is set on the table.
- Mobile (`<md`) auto-swaps to a card list view.
- 💡 Pagination: `useDataTable` wires TanStack Table's `getPaginationRowModel()`, so the page-size selector and page navigation work over whatever rows came back. Whether that's a single page (backend already sliced) or the whole list (backend returned everything) depends on your endpoint — pick one model per table and document it on the endpoint.
- 💡 **Exports come free.** Every data-table renders CSV / XLSX / PDF export buttons in its header. Implemented by [`useTableExport`](../../src/hooks/useTableExport.ts) — no schema flag to opt in.

---

### `key-value-grid`

**Use when** you need a read-only entity summary — "Policy Details" with policy_no / start_date / end_date in a grid.

**Source:** [`src/components/widgets/data/KeyValueGrid.tsx`](../../src/components/widgets/data/KeyValueGrid.tsx)

**DataSource:** Usually yes. Response is a single object (the entity).

**Props:**
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `fields` | `KeyValueField[]` | | The grid contents |
| `columns` | number | `4` | Grid columns |
| `loadingMessage` | string | | |
| `errorMessage` | string | | |
| `data` | object | | Static override (skips fetch) |

**Field shape (`KeyValueField`):**
```ts
{
  id: string;
  label: string;
  accessorKey: string;             // Dotted path
  fallbackKey?: string;            // Used when accessorKey is empty
  type?: "text" | "badge" | "date" | "currency" | "count" | "list" | "presence";
  valueMapping?: BadgeValueMapping[];
  parseJson?: boolean;             // Parse a JSON-encoded string at accessorKey
  subPath?: string;                // After parseJson, drill in
  nestedParseAt?: string;          // Parse a nested JSON field in place
  itemPath?: string;               // For type: "list" — extract a property per item
  unit?: string;
  unitPlural?: string;
  icon?: string;                   // Lucide icon name
}
```

**Example:**
```json
{
  "id": "claim-summary",
  "type": "key-value-grid",
  "dataSource": { "api": { "endpoint": "/api/v1/claims/:id", "method": "GET" } },
  "props": {
    "columns": 4,
    "fields": [
      { "id": "claim-no", "label": "Claim No", "accessorKey": "claim_no" },
      { "id": "state", "label": "State", "accessorKey": "state", "type": "badge", "valueMapping": [
        { "value": "TRIAGED", "label": "Triaged", "color": "info" }
      ]},
      { "id": "claimed", "label": "Claimed", "accessorKey": "claimed_amount", "type": "currency" },
      { "id": "created", "label": "Created", "accessorKey": "created_at", "type": "date" }
    ]
  }
}
```

**Gotchas:**
- Empty/null/undefined renders as `"—"`. Don't try to suppress it — it's intentional.
- `parseJson` + `subPath` exist for backend DTOs that ship escaped JSON (e.g. `productsJson`). Use them; don't custom-render around the issue.
- `type: "presence"` renders "Configured" / "Not configured" — useful for "do we have this attached?" displays.

---

### Feature-branch widgets — not on main

Some feature branches add domain-specific widgets (e.g. `card-grid`, `plan-card`, `activation-counter`, `editable-table`, `dmn-decision-table`, `info-card`, `accordion-group`, `communications-card-group`, `maker-checker-panel`). These are not registered on `main` and won't render if you reference them. If you need one, read the component source on its originating branch and propose it through `/propose` for inclusion in the framework — see the [propose flow](../../proposals/).

---

## Forms

### `form-container`

**Use when** you need any form — create, edit, search, configure. **This is the widget you'll use most after `data-table`.**

**Source:** [`src/components/widgets/forms/formContainer/index.tsx`](../../src/components/widgets/forms/formContainer/index.tsx)

**DataSource:** Optional — typically forms don't fetch their own data (overlay forms get row data from the modal payload). Individual fields can have a `dataSource` to populate dropdown options dynamically.

**Props:**
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `title` | string | | |
| `description` | string | | |
| `fields` | `FormFieldConfig[]` | | The form fields |
| `actions` | `FormAction[]` | | Submit + cancel buttons |
| `columns` | number | `3` | Field grid columns |
| `mode` | `"view" \| "edit"` | `"edit"` | View mode renders read-only |
| `disabled` | boolean | `false` | All fields disabled |
| `showReset` | boolean | `false` | Show reset-to-defaults button |

**See [06-forms.md](06-forms.md)** for the full deep dive on field types, validations, dynamic options, conditional visibility, and form actions.

**Example (minimal):**
```json
{
  "id": "create-claim-form",
  "type": "form-container",
  "props": {
    "title": "Register Claim",
    "columns": 2,
    "fields": [
      { "id": "claim_no", "name": "claim_no", "label": "Claim Number", "type": "text", "validations": [{ "rule": "required", "message": "Required" }] },
      { "id": "amount", "name": "amount", "label": "Amount", "type": "number" }
    ],
    "actions": [
      { "id": "submit", "label": "Submit", "type": "api-mutation", "submitAction": true, "api": { "endpoint": "/api/v1/claims", "method": "POST" }, "successMessage": "Claim created" }
    ]
  }
}
```

---

### `overlaid-form`

**Use when** you need a form in a modal/sheet (i.e., 95% of the time when "open form" is the user gesture).

You don't write this widget in a schema directly. You trigger it via an `open-modal` or `open-sheet` action with `target` set to a form id; the runtime renders an `OverlaidForm` that fetches the form schema by id, injects the rowData as defaults, and submits.

**See [06-forms.md → Overlaid forms](06-forms.md#overlaid-forms)** for details.

---

### `confirmation-dialog`

**Use when** an `api-mutation` action needs confirmation before firing — destructive operations, state transitions.

You don't write this in a schema. You add `confirm: { title, message }` to an `api-mutation` action. The handler opens the dialog automatically.

**See [05-actions.md → Confirmation](05-actions.md#confirmation-dialogs)** for details.

---

## Item display

### `metric-card`

**Use when** you need a KPI tile — "Total Claims: 1,234 ↑12%".

**Source:** [`src/components/widgets/items/MetricCard.tsx`](../../src/components/widgets/items/MetricCard.tsx)

**DataSource:** Yes. Response shape: `{ value: number, trend?: number }`.

**Props:**
| Prop | Type | Default |
|------|------|---------|
| `label` | string | — |
| `icon` | string (Lucide) | — |
| `showTrend` | boolean | `false` |
| `priority` | `"default" \| "primary" \| "secondary"` | `"default"` |
| `trendUnit` | string | `"%"` |

**Example:**
```json
{
  "id": "claims-kpi",
  "type": "metric-card",
  "dataSource": { "api": { "endpoint": "/api/dashboard/metrics/total-claims", "method": "GET" } },
  "props": { "label": "Total Claims", "icon": "FileCheck", "showTrend": true }
}
```

---

### `chart-widget`

**Use when** you need a bar/line/pie chart — dashboards, trend reports.

**Source:** [`src/components/widgets/items/ChartWidget.tsx`](../../src/components/widgets/items/ChartWidget.tsx)

**DataSource:** Yes. Response: `Array<{ name: string, [dataKey]: number }>`.

**Props:**
| Prop | Type |
|------|------|
| `title` | string |
| `chartType` | `"bar" \| "line" \| "pie"` |
| `dataKey` | string (the y-axis field) |
| `color` | string (hex) for bar/line |
| `colors` | string[] for pie |

---

### `quick-links-widget`

**Use when** you need a row of CTAs or navigation shortcuts.

**Source:** [`src/components/widgets/items/QuickLinksWidget.tsx`](../../src/components/widgets/items/QuickLinksWidget.tsx)

**Props:**
| Prop | Type |
|------|------|
| `title` | string |
| `layout` | `"grid" \| "flex"` |
| `links` | `Array<{ id, label, icon?, description?, type?: "card" \| "button", action?: ActionConfig }>` |

---

### `error-banner`

**Use when** you need to surface backend errors (e.g., the `backendErrors` array from a Spring validation failure).

**Source:** [`src/components/widgets/items/ErrorBanner.tsx`](../../src/components/widgets/items/ErrorBanner.tsx)

**Props:** `{ errors: Array<{ error_code, error_desc }> }`.

Errors are individually dismissable.

---

### `context-help-tooltip`

**Use when** you need an inline help icon next to a field or section.

**Props:** `{ helpText: string, delayMs?: number }`.

**Children:** Wraps the element it explains. Renders the child + a small `?` trigger that shows `helpText` on hover.

---

## Controls

### `filter-bar` / `search-bar`

**Use when** you need a search box + filter pills above a data-table.

**Source:** [`src/components/widgets/controls/FilterBar.tsx`](../../src/components/widgets/controls/FilterBar.tsx)

The widget publishes its state to `useWidgetState` under `stateKey` (default: `config.id`). A sibling `data-table` declares `stateDependencies: [stateKey]` and refetches when filters change.

**Props:**
| Prop | Type |
|------|------|
| `filters` | `Array<{ id, label, type: "text" \| "select", field?, placeholder?, options? }>` |
| `stateKey` | string (default: `config.id`) |
| `searchKey` | string (default: `"q"`) |
| `searchPlaceholder` | string |

**Example:**
```json
{
  "id": "claims-filters",
  "type": "filter-bar",
  "props": {
    "stateKey": "page:claims:filters",
    "filters": [
      { "id": "state", "label": "State", "type": "select", "field": "state", "options": [
        { "label": "Triaged", "value": "TRIAGED" }
      ]}
    ]
  }
}
```

Paired data-table:
```json
{
  "id": "claims-table",
  "type": "data-table",
  "dataSource": {
    "api": { "endpoint": "/api/v1/claims", "method": "GET" },
    "stateDependencies": ["page:claims:filters"]
  }
}
```

---

### `date-widget`

**Use when** you need a standalone date control (single date, range, or read-only display) outside a form.

**Props:**
| Prop | Type |
|------|------|
| `mode` | `"single" \| "range" \| "display"` |
| `value` | ISO date string (for `single`/`display`) |
| `from`, `to` | ISO date strings (for `range`) |

Inside forms, use a field with `type: "date"` instead — see [06-forms.md](06-forms.md).

---

### `searchable-dropdown`

**Use when** you need a searchable single-select with a fixed option set, outside a form.

Inside forms, use a field with `type: "select"` instead.

---

## State & role

### `action-bar`

**Use when** you need entity-action buttons that are gated by lifecycle state and/or user role.

**Source:** [`src/components/widgets/actions/ActionBar.tsx`](../../src/components/widgets/actions/ActionBar.tsx)

**DataSource:** Usually yes — the bar reads the live entity to know its current state.

**Props:**
| Prop | Type | Notes |
|------|------|-------|
| `actions` | `ActionConfig[]` | All possible actions |
| `stateActions` | `Record<state, string[]>` | Map of state → allowed action ids |
| `roleActions` | `Record<role, string[]>` | Map of role → allowed action ids |
| `stateField` | string | Default `"state"`. Quote uses `"status"`. |
| `stateKey` | string | If set, reads live entity from `useWidgetState[stateKey]` instead of dataSource |

**Gating rules (current behaviour):**
1. **Role-gated** (action not in `roleActions[currentRole]`) → action is **hidden entirely**.
2. **State-gated** (action not in `stateActions[currentState]`) → action is **hidden entirely**.
3. **Backend-gap** (action has `disabledTooltip` and IS in the current state's allowed list) → action renders **disabled with tooltip**.

**Example:**
```json
{
  "id": "claim-actions",
  "type": "action-bar",
  "dataSource": { "api": { "endpoint": "/api/v1/claims/:id", "method": "GET" } },
  "props": {
    "stateField": "state",
    "stateActions": {
      "FNOL_SUBMITTED": ["triage", "withdraw"],
      "TRIAGED": ["assign-surveyor", "start-assessment", "withdraw"]
    },
    "roleActions": {
      "claims_adjuster": ["triage", "start-assessment"],
      "claims_supervisor": ["triage", "withdraw"]
    },
    "actions": [
      { "id": "triage", "label": "Triage", "type": "api-mutation", "api": { "endpoint": "/api/v1/claims/:id/triage", "method": "POST" }, "refreshKey": "/api/v1/claims/" },
      { "id": "withdraw", "label": "Withdraw", "type": "api-mutation", "confirm": { "title": "Withdraw?", "message": "This cannot be undone." }, "api": { ... } }
    ]
  }
}
```

**Gotchas:**
- ⚠️ The `stateField` default of `"state"` doesn't work for Quote (which exposes `status`). Override per entity.
- ⚠️ Behaviour for state-gated actions has changed across versions — some branches hide, others disable-with-tooltip. Read [`src/components/widgets/actions/ActionBar.tsx`](../../src/components/widgets/actions/ActionBar.tsx) on your branch to confirm what's shipping.
- `disabledTooltip` exists for explicit "backend doesn't support this yet" messages. Don't reuse it for state gating.

---

### `state-badge`

**Use when** you need to render an entity's lifecycle state as a coloured pill — inline, in tables, in headers.

**Props:** `{ entity?: "quote"|"proposal"|"policy"|"member", state?: string, value?: string }`.

State → colour mapping is hardcoded per entity in `src/components/widgets/state/state-map.ts`. Unknown states render as a grey "Unknown" badge.

---

### `reason-banner`

**Use when** you need to explain why an entity is in a pending / voided / cancelled state — e.g., showing the reason a policy was cancelled.

**Props:** `{ entity: "policy"|"member", state?, pendingReason?, voidReason?, cancellationReason? }`.

Renders `null` if there's nothing to explain.

---

### `role-switcher`

**Use when** … you almost never need to put this in a schema. It's rendered globally in `layout.tsx`. Kept here for completeness.

---

## Where to go next

- **Build a screen** → [11-cookbook.md](11-cookbook.md)
- **Understand the JSON shape** → [03-schemas.md](03-schemas.md)
- **Wire fetches** → [04-data-sources.md](04-data-sources.md)
- **Wire actions** → [05-actions.md](05-actions.md)
- **Build forms** → [06-forms.md](06-forms.md)
- **Add a new widget** → [11-cookbook.md → Register a new widget](11-cookbook.md)
