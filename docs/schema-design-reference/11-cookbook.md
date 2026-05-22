# 11 — Cookbook

Step-by-step recipes for the common tasks you'll do in this framework. Each recipe assumes you've read [01-architecture.md](01-architecture.md) and skimmed [02-widget-catalog.md](02-widget-catalog.md).

---

## Recipes

1. [New module from scratch](#recipe-1--new-module-from-scratch)
2. [Add a list page with filters](#recipe-2--list-page-with-filters)
3. [Add a detail page with tabs](#recipe-3--detail-page-with-tabs)
4. [Standalone form (not in a modal)](#recipe-4--standalone-form-not-in-a-modal)
5. [Add an edit form (overlay)](#recipe-5--edit-form-overlay)
6. [Add a workflow action with confirmation](#recipe-6--workflow-action-with-confirmation)
7. [Add role-gated actions](#recipe-7--role-gated-actions)
8. [Add a tab to an existing detail page](#recipe-8--add-a-tab-to-an-existing-detail-page)
9. [Add polling for async backend operations](#recipe-9--polling-for-async-operations)
10. [Add a metric card to a dashboard](#recipe-10--metric-card-on-a-dashboard)
11. [Register a new widget](#recipe-11--register-a-new-widget)
12. [Register a new action type](#recipe-12--register-a-new-action-type)
13. [Wire shared filter state](#recipe-13--wire-shared-filter-state)
14. [Conditional field visibility](#recipe-14--conditional-field-visibility)
15. [Multi-step form workflow](#recipe-15--multi-step-form-workflow)

---

## Recipe 1 — New module from scratch

Build a "Vendors" module: list page + detail page + create form.

### Step 1 — Add the schemas

**`schemas/vendors.json`** (list page):

```json
{
  "id": "vendors-page",
  "type": "stack-layout",
  "props": { "gap": 4, "className": "p-6" },
  "children": [
    {
      "id": "header",
      "type": "page-header",
      "props": {
        "title": "Vendors",
        "description": "Manage vendor accounts",
        "actions": [
          {
            "id": "new-vendor",
            "label": "Add Vendor",
            "icon": "Plus",
            "type": "open-modal",
            "target": "create-vendor-form"
          }
        ]
      }
    },
    {
      "id": "vendors-table",
      "type": "data-table",
      "dataSource": { "api": { "endpoint": "/api/v1/vendors", "method": "GET" } },
      "props": {
        "rowIdKey": "vendor_id",
        "columns": [
          { "id": "name",      "header": "Name",   "accessorKey": "name" },
          { "id": "category",  "header": "Category", "accessorKey": "category", "type": "badge", "valueMapping": [
            { "value": "GARAGE", "label": "Garage", "color": "info" },
            { "value": "SURVEYOR", "label": "Surveyor", "color": "info" }
          ]},
          { "id": "status",    "header": "Status", "accessorKey": "status", "type": "badge", "valueMapping": [
            { "value": "ACTIVE",   "label": "Active",   "color": "success" },
            { "value": "INACTIVE", "label": "Inactive", "color": "secondary" }
          ]},
          { "id": "created",   "header": "Created", "accessorKey": "created_at", "type": "date" }
        ],
        "rowActions": [
          { "id": "view", "label": "View", "icon": "Eye", "type": "navigate", "target": "/vendors/:vendor_id" }
        ],
        "pagination": { "enabled": true, "pageSize": 20 }
      }
    }
  ]
}
```

**`schemas/vendors-detail.json`** (detail page):

```json
{
  "id": "vendor-detail-page",
  "type": "stack-layout",
  "props": { "gap": 6, "className": "p-6" },
  "children": [
    {
      "id": "header",
      "type": "page-header",
      "props": {
        "title": "Vendor Details",
        "breadcrumbs": [
          { "label": "Vendors", "href": "/vendors" },
          { "label": "Detail" }
        ]
      }
    },
    {
      "id": "vendor-summary",
      "type": "key-value-grid",
      "dataSource": { "api": { "endpoint": "/api/v1/vendors/{{id}}", "method": "GET" } },
      "props": {
        "columns": 3,
        "fields": [
          { "id": "name",    "label": "Name",    "accessorKey": "name" },
          { "id": "phone",   "label": "Phone",   "accessorKey": "phone" },
          { "id": "email",   "label": "Email",   "accessorKey": "email" }
        ]
      }
    }
  ]
}
```

**`schemas/forms/create-vendor-form.json`**:

```json
{
  "id": "create-vendor-form",
  "type": "form-container",
  "props": {
    "title": "Add Vendor",
    "columns": 2,
    "fields": [
      { "id": "name", "name": "name", "label": "Name", "type": "text",
        "validations": [{ "rule": "required", "message": "Required" }] },
      { "id": "category", "name": "category", "label": "Category", "type": "select",
        "options": [
          { "value": "GARAGE", "label": "Garage" },
          { "value": "SURVEYOR", "label": "Surveyor" }
        ],
        "validations": [{ "rule": "required", "message": "Required" }] },
      { "id": "phone", "name": "phone", "label": "Phone", "type": "text" },
      { "id": "email", "name": "email", "label": "Email", "type": "email" }
    ],
    "actions": [
      { "id": "submit", "label": "Add", "type": "api-mutation", "submitAction": true,
        "api": { "endpoint": "/api/v1/vendors", "method": "POST" },
        "successMessage": "Vendor added",
        "refreshKey": "/api/v1/vendors",
        "onSuccess": [{ "type": "trigger-event", "target": "create-vendor-form" }] },
      { "id": "cancel", "label": "Cancel", "type": "trigger-event", "target": "create-vendor-form", "variant": "ghost" }
    ]
  }
}
```

### Step 2 — Regenerate the forms registry

```bash
npm run predev
# or
node scripts/generate_form_index.mjs
```

### Step 3 — Add the pages

**`src/app/vendors/page.tsx`:**

```tsx
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import schema from '../../../schemas/vendors.json';
import { WidgetConfig } from '@/types/widget';

export default function VendorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <WidgetRenderer config={schema as WidgetConfig} />
    </div>
  );
}
```

**`src/app/vendors/[id]/page.tsx`:**

```tsx
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import schema from '../../../../schemas/vendors-detail.json';
import { WidgetConfig } from '@/types/widget';

export default async function VendorDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const resolved = await resolveSchemaRefs(schema, process.cwd());
  const config = JSON.parse(JSON.stringify(resolved)) as WidgetConfig;

  const updateEndpoints = (node: WidgetConfig) => {
    if (node.dataSource?.api?.endpoint?.includes('{{id}}')) {
      node.dataSource.api.endpoint = node.dataSource.api.endpoint.replace('{{id}}', id);
    }
    const actions = (node.props as any)?.actions;
    if (Array.isArray(actions)) {
      actions.forEach((a: any) => {
        if (typeof a.api?.endpoint === 'string') {
          a.api.endpoint = a.api.endpoint.replace('{{id}}', id);
        }
      });
    }
    node.children?.forEach(updateEndpoints);
  };
  updateEndpoints(config);

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-8">Loading…</div>}>
        <WidgetRenderer config={config} />
      </Suspense>
    </div>
  );
}
```

### Step 4 — Add the mock API routes

**`src/app/api/v1/vendors/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server';

const vendors: any[] = [
  { vendor_id: 'V-001', name: 'Acme Garage', category: 'GARAGE', phone: '...', email: '...', status: 'ACTIVE', created_at: '2026-05-01' }
];

export async function GET() {
  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const vendor = { ...body, vendor_id: `V-${Date.now()}`, status: 'ACTIVE', created_at: new Date().toISOString() };
  vendors.push(vendor);
  return NextResponse.json(vendor, { status: 201 });
}
```

**`src/app/api/v1/vendors/[id]/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { vendors } from '../route';  // or shared fixtures module

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = vendors.find(x => x.vendor_id === id);
  if (!v) return NextResponse.json({ status: 404, message: 'Not found' }, { status: 404 });
  return NextResponse.json(v);
}
```

### Step 5 — Add the menu entry

Edit `src/mocks/original/<app>/config/app-config-mock.ts` (e.g. `group-insurance` or `auto-claims`) and append to `navigation.menuItems`:

```ts
{ id: 'vendors', title: 'Vendors', url: '/vendors', icon: 'Building2' }
```

### Step 6 — Run it

```bash
npm run dev
```

Navigate to `/vendors`. You should see the list, "Add Vendor" button, modal form. Submit creates a vendor; the table refetches via `refreshKey` and the new row appears. Click a row → goes to `/vendors/V-…`; you see the detail page.

---

## Recipe 2 — List page with filters

Wire a `filter-bar` to share state with a `data-table`:

```json
{
  "id": "claims-list",
  "type": "stack-layout",
  "children": [
    {
      "id": "filters",
      "type": "filter-bar",
      "props": {
        "stateKey": "page:claims:filters",
        "filters": [
          { "id": "state", "label": "State", "type": "select", "field": "state", "options": [
            { "value": "TRIAGED", "label": "Triaged" },
            { "value": "SETTLED", "label": "Settled" }
          ]},
          { "id": "lane", "label": "Lane", "type": "select", "field": "lane", "options": [...] }
        ]
      }
    },
    {
      "id": "table",
      "type": "data-table",
      "dataSource": {
        "api": { "endpoint": "/api/v1/claims", "method": "GET" },
        "stateDependencies": ["page:claims:filters"]
      },
      "props": { "columns": [...] }
    }
  ]
}
```

On the API side, the GET endpoint reads filter values from query params (the framework flattens the state object into URL params for GET requests).

---

## Recipe 3 — Detail page with tabs

Use `tabs-container` with per-tab `$ref` files:

```json
{
  "id": "claim-detail",
  "type": "stack-layout",
  "children": [
    { "$ref": "schemas/tabs/claims/header.json" },
    {
      "id": "tabs",
      "type": "tabs-container",
      "children": [
        { "$ref": "schemas/tabs/claims/overview.json" },
        { "$ref": "schemas/tabs/claims/coverage.json" },
        { "$ref": "schemas/tabs/claims/decisions.json" },
        { "$ref": "schemas/tabs/claims/audit.json" }
      ]
    }
  ]
}
```

Each tab file is a `tab-panel`:

```json
{
  "id": "claims-overview-tab",
  "type": "tab-panel",
  "props": { "label": "Overview", "icon": "LayoutDashboard" },
  "children": [
    { "id": "summary", "type": "key-value-grid", "dataSource": { ... }, "props": { "fields": [...] } }
  ]
}
```

---

## Recipe 4 — Standalone form (not in a modal)

Most forms are overlaid (Recipe 5). Sometimes you want a form *on the page itself* — a search form, a configuration screen, a settings page.

```json
{
  "id": "vendor-search-page",
  "type": "stack-layout",
  "props": { "className": "p-6", "gap": 6 },
  "children": [
    {
      "id": "header",
      "type": "page-header",
      "props": { "title": "Vendor Search" }
    },
    {
      "id": "search-form",
      "type": "form-container",
      "props": {
        "columns": 3,
        "fields": [
          { "id": "name", "name": "name", "label": "Vendor Name", "type": "text" },
          { "id": "category", "name": "category", "label": "Category", "type": "select", "options": [
            { "value": "GARAGE", "label": "Garage" },
            { "value": "SURVEYOR", "label": "Surveyor" }
          ]},
          { "id": "active_only", "name": "active_only", "label": "Active only", "type": "checkbox" }
        ],
        "actions": [
          { "id": "search", "label": "Search", "type": "update-widget-state", "submitAction": true,
            "props": { "key": "page:vendors:search-criteria", "operation": "set" } }
        ]
      }
    },
    {
      "id": "results",
      "type": "data-table",
      "dataSource": {
        "api": { "endpoint": "/api/v1/vendors/search", "method": "POST" },
        "stateDependencies": ["page:vendors:search-criteria"]
      },
      "props": { "columns": [ ... ] }
    }
  ]
}
```

Differences from an overlaid form:
- No `open-modal` trigger — the form is part of the page.
- The submit action writes to `useWidgetState` (or fires a mutation that updates the URL), and a sibling widget consumes the result via `stateDependencies`.
- No `onSuccess: trigger-event` — there's no overlay to close.

⚠️ For overlaid create forms (the more common case), use Recipe 5.

---

## Recipe 5 — Edit form (overlay)

Reuse the same form schema for create and edit. The difference: edit uses the existing entity's PK in the action endpoint.

The trigger from a row action:

```json
{
  "rowActions": [
    { "id": "edit", "label": "Edit", "icon": "Edit", "type": "open-modal", "target": "edit-vendor-form" }
  ]
}
```

The form opens with `rowData` injected as default field values. Its submit action uses `:id` substitution:

```json
"actions": [
  { "id": "submit", "type": "api-mutation", "submitAction": true,
    "api": { "endpoint": "/api/v1/vendors/:vendor_id", "method": "PATCH" },
    "successMessage": "Updated",
    "refreshKey": "/api/v1/vendors" }
]
```

If your edit form differs structurally from create (extra fields, etc.), create a separate form schema. Otherwise reuse.

---

## Recipe 6 — Workflow action with confirmation

A destructive or irreversible action:

```json
{
  "id": "withdraw",
  "label": "Withdraw Claim",
  "icon": "Ban",
  "variant": "destructive",
  "type": "api-mutation",
  "confirm": {
    "title": "Withdraw this claim?",
    "message": "Once withdrawn, the claim cannot be reopened. This will be logged for audit."
  },
  "api": { "endpoint": "/api/v1/claims/:id/withdraw", "method": "POST" },
  "successMessage": "Claim withdrawn",
  "refreshKey": "/api/v1/claims/"
}
```

The framework opens a confirmation dialog automatically when `confirm` is set.

---

## Recipe 7 — Role-gated actions

Use an `action-bar` with `roleActions`:

```json
{
  "id": "claim-actions",
  "type": "action-bar",
  "dataSource": { "api": { "endpoint": "/api/v1/claims/:id", "method": "GET" } },
  "props": {
    "stateField": "state",
    "stateActions": {
      "TRIAGED": ["triage", "approve", "withdraw"]
    },
    "roleActions": {
      "claims_adjuster": ["triage"],
      "claims_supervisor": ["approve", "withdraw"]
    },
    "actions": [
      { "id": "triage",   "label": "Triage",   "type": "api-mutation", "api": {...} },
      { "id": "approve",  "label": "Approve",  "type": "api-mutation", "api": {...} },
      { "id": "withdraw", "label": "Withdraw", "type": "api-mutation", "variant": "destructive", "confirm": {...}, "api": {...} }
    ]
  }
}
```

Only actions in both `stateActions[currentState]` AND `roleActions[currentRole]` render. Adjusters see Triage when state is TRIAGED; supervisors see Approve and Withdraw.

---

## Recipe 8 — Add a tab to an existing detail page

1. Create the tab file: `schemas/tabs/<module>/<new-tab>.json`:

```json
{
  "id": "claims-<new-tab>",
  "type": "tab-panel",
  "props": { "label": "<Label>", "icon": "<Lucide>" },
  "children": [
    { "id": "content", "type": "<widget>", "dataSource": {...}, "props": {...} }
  ]
}
```

2. Add the `$ref` in the detail schema's `tabs-container.children`:

```json
"children": [
  { "$ref": "schemas/tabs/claims/overview.json" },
  { "$ref": "schemas/tabs/claims/<new-tab>.json" }  // ← added
]
```

3. (Optional) Add API mock routes if the tab needs new endpoints.

That's it. No code changes.

---

## Recipe 9 — Polling for async operations

Backend kicks off an async job (pricing engine, member enrolment, …). Frontend polls until done:

```json
{
  "id": "quote-summary",
  "type": "key-value-grid",
  "dataSource": {
    "api": { "endpoint": "/api/v1/quotes/{{id}}", "method": "GET" },
    "pollSchedule": {
      "initialIntervalMs": 2000,
      "initialDurationMs": 10000,
      "fallbackIntervalMs": 5000,
      "maxDurationMs": 60000
    },
    "stopWhen": { "!=": [{ "var": "premium" }, null] }
  },
  "props": { ... }
}
```

The widget polls every 2s for the first 10s, then every 5s up to 60s. Stops as soon as `premium` is populated. After 60s with no premium, gives up.

⚠️ Always set a `maxDurationMs` or `stopWhen` (preferably both). Unbounded polling is a battery/bandwidth hazard.

---

## Recipe 10 — Metric card on a dashboard

```json
{
  "id": "kpi-row",
  "type": "grid-layout",
  "props": { "columns": 4, "gap": 4 },
  "children": [
    {
      "id": "total-claims",
      "type": "metric-card",
      "dataSource": { "api": { "endpoint": "/api/dashboard/metrics/total-claims", "method": "GET" } },
      "props": { "label": "Total Claims", "icon": "FileCheck", "showTrend": true }
    },
    {
      "id": "open-claims",
      "type": "metric-card",
      "dataSource": { "api": { "endpoint": "/api/dashboard/metrics/open-claims", "method": "GET" } },
      "props": { "label": "Open", "icon": "Clock", "priority": "primary" }
    }
  ]
}
```

Endpoint returns `{ value: 1234, trend: 12.5 }`. The card shows `1,234 ↑12.5%`.

---

## Recipe 11 — Register a new widget

When an existing widget genuinely can't be composed to do what you need, register a new one.

### Step 1 — Decide the widget's contract

Before writing code, write the schema you'd want to use. What `type` string? What props? Does it have `dataSource`? Does it accept `children`?

```json
{
  "id": "claim-timeline",
  "type": "timeline",
  "dataSource": { "api": { "endpoint": "/api/v1/claims/:id/timeline", "method": "GET" } },
  "props": {
    "eventTypeKey": "event_type",
    "timestampKey": "timestamp",
    "actorKey": "actor"
  }
}
```

### Step 2 — Build the component

Create `src/components/widgets/<category>/Timeline.tsx`:

```tsx
"use client";

import React from "react";
import { WidgetConfig } from "@/types/widget";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

interface TimelineProps {
  eventTypeKey?: string;
  timestampKey?: string;
  actorKey?: string;
}

export const Timeline: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const {
    eventTypeKey = "event_type",
    timestampKey = "timestamp",
    actorKey = "actor"
  } = (config.props ?? {}) as TimelineProps;

  const { data, isLoading, error } = useSmartQuery(config.dataSource);

  if (isLoading) return <Skeleton className="h-48" />;
  if (error) return <ErrorState message="Failed to load timeline" />;

  const items: Array<Record<string, string>> = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-muted-foreground p-4">No events.</p>;

  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="border-l-2 border-border pl-4">
          <p className="text-sm font-semibold">{item[eventTypeKey]}</p>
          <p className="text-xs text-muted-foreground">
            {item[timestampKey]} by {item[actorKey]}
          </p>
        </li>
      ))}
    </ol>
  );
};
```

### Step 3 — Register it

Edit `src/components/registry/WidgetRegistry.tsx`:

```tsx
import { Timeline } from "../widgets/items/Timeline";

export const WidgetRegistry: Record<string, React.FC<any>> = {
  // ... existing widgets ...
  "timeline": Timeline
};
```

### Step 4 — Use it

```json
{ "id": "claim-timeline", "type": "timeline", "dataSource": {...}, "props": {...} }
```

### Conventions for new widgets

- **Take `config: WidgetConfig` as the only prop.** Read everything from `config.props` and `config.dataSource`.
- **Use `useSmartQuery(config.dataSource)`** if you need to fetch — don't reach for `fetch()` directly.
- **Use `useActionHandler()`** if you need to fire actions — don't reach for `router.push()` directly.
- **Handle loading/error/empty states.** Every widget that fetches needs all three.
- **Keep it parametrised, not feature-specific.** `Timeline` accepts `eventTypeKey`, not hardcoded "event_type". The next module to use it shouldn't have to fork.
- **Document any new prop in this catalog.** Add a section to [02-widget-catalog.md](02-widget-catalog.md).

⚠️ **Don't register widgets that are one-off feature components.** If a "widget" only ever appears on one schema, it's feature code, not framework infra. Build it as a composition of existing widgets, or — if that fails — file a proposal explaining what generalised primitive it should become.

---

## Recipe 12 — Register a new action type

Rare. The existing types (`navigate`, `api-mutation`, `open-modal`, `api-download`, `trigger-event`, `update-widget-state`) cover almost everything.

When you genuinely need a new type:

1. Add the variant to the `ActionConfig` union in `src/types/widget.ts`.
2. Add the case to the switch in `useActionHandler.ts`.
3. Document in [05-actions.md](05-actions.md).
4. Update any existing schemas that should use it.

If you're tempted, ask whether the new behaviour can compose:
- "Run two mutations" → use `api-mutation` with `onSuccess` chain
- "Show a toast" → already covered by `successMessage` on `api-mutation`
- "Open a custom dialog" → it's probably a form schema; use `open-modal`

If composition doesn't work, file a proposal first.

---

## Recipe 13 — Wire shared filter state

The publish/subscribe pattern between a `filter-bar` and a `data-table`:

```json
{
  "id": "filters",
  "type": "filter-bar",
  "props": {
    "stateKey": "page:vendors:filters",
    "filters": [
      { "id": "category", "label": "Category", "type": "select", "field": "category", "options": [...] },
      { "id": "status",   "label": "Status",   "type": "select", "field": "status",   "options": [...] }
    ]
  }
},
{
  "id": "vendors-table",
  "type": "data-table",
  "dataSource": {
    "api": { "endpoint": "/api/v1/vendors", "method": "GET" },
    "stateDependencies": ["page:vendors:filters"]
  },
  "props": { "columns": [...] }
}
```

**What happens:**

1. User picks a filter. `filter-bar` calls `setValue("page:vendors:filters", { category: "GARAGE" })`.
2. `useSmartQuery` sees `page:vendors:filters` in `stateDependencies`. The state snapshot becomes part of the React Query key.
3. The query refetches. State values are flattened into GET params: `/api/v1/vendors?category=GARAGE`.
4. Backend returns filtered list; table re-renders.

**Naming conventions for `stateKey`:**

- `page:<module>:filters` for list-page filter state
- `entity:<id>:draft` for in-progress entity edits
- `wizard:<id>:step` for multi-step flows

**Clearing state:** filter state persists until reload by default. If you want a Clear button:

```json
{
  "id": "clear",
  "label": "Clear filters",
  "type": "update-widget-state",
  "props": { "key": "page:vendors:filters", "operation": "set", "value": {} }
}
```

---

## Recipe 14 — Conditional field visibility

Show the "Vehicle Make" field only for motor claims:

```json
{
  "id": "loss_type",
  "name": "loss_type",
  "label": "Loss Type",
  "type": "select",
  "options": [
    { "value": "MOTOR", "label": "Motor" },
    { "value": "HEALTH", "label": "Health" }
  ]
},
{
  "id": "vehicle_make",
  "name": "vehicle_make",
  "label": "Vehicle Make",
  "type": "text",
  "visibleWhen": { "==": [{ "var": "loss_type" }, "MOTOR"] }
}
```

The `loss_type` field's `name` is referenced in the JSONLogic var. Hidden fields are excluded from the submit payload.

See [07-state-and-conditions.md → JSONLogic](07-state-and-conditions.md#jsonlogic) for more operators.

---

## Recipe 15 — Multi-step form workflow

Use `tabs-container` with `hasWorkflow: true`:

```json
{
  "id": "policy-setup",
  "type": "tabs-container",
  "props": { "hasWorkflow": true, "confirmNavigation": true },
  "children": [
    {
      "id": "step-1",
      "type": "tab-panel",
      "props": { "label": "Plan Selection" },
      "children": [
        { "id": "plan-form", "type": "form-container", "props": { ... } }
      ]
    },
    {
      "id": "step-2",
      "type": "tab-panel",
      "props": { "label": "Members" },
      "children": [...]
    },
    {
      "id": "step-3",
      "type": "tab-panel",
      "props": { "label": "Review" },
      "children": [...]
    }
  ]
}
```

`hasWorkflow: true` renders Prev / Next / Complete buttons. `confirmNavigation: true` prompts if the user tries to switch tabs with unsaved changes.

The Complete button on the last tab fires a `trigger-event` action — wire your overlay or page to listen for it (typically through a follow-up mutation that finalises the workflow).

For non-trivial workflows, prefer **one form with conditional fields** over **multi-step tabs**. The framework gives you `field.visibleWhen` for this exact case; tabs add navigation overhead.

---

## When a feature doesn't fit

If you find yourself fighting the framework — building 10 custom React components, branching schemas with copy-paste, juggling refs to coordinate widgets — stop. Three options:

1. **Compose differently.** Often the cleanest solution is recombining existing widgets. Sketch the schema with `key-value-grid` + `data-table` + `action-bar` first.
2. **Add a widget.** If the visual primitive is genuinely missing (e.g., a real timeline view), follow [Recipe 11](#recipe-11--register-a-new-widget). Make it generic, not feature-specific.
3. **Propose a framework change.** If the missing piece is structural (e.g., the page walker should auto-substitute `:id` in all endpoint locations), file under `proposals/` — see [the proposal flow](../../proposals/).

What you should *not* do: write a `"use client"` component inside `src/app/<module>/page.tsx` that bypasses `WidgetRenderer`. The next dev maintaining the module won't know to look there.

---

**Next:** [12-troubleshooting.md](12-troubleshooting.md) — symptoms, diagnoses, fixes.
