# 08 — Pages & routing

This document covers the Next.js side of the framework: how a route maps to a page, how the schema is loaded and resolved, and how route params reach widgets.

---

## Routes, pages, and schemas — the mapping

The framework uses the Next.js App Router. Each URL maps to a `page.tsx` file:

| URL | File | Schema imported |
|-----|------|----------------|
| `/quotations` | `src/app/quotations/page.tsx` | `schemas/quotations.json` |
| `/quotations/[id]` | `src/app/quotations/[id]/page.tsx` | `schemas/quotations-detail.json` |
| `/claims` | `src/app/claims/page.tsx` | `schemas/claims-list.json` |
| `/accounting` | `src/app/accounting/page.tsx` | `schemas/accounting.json` |
| `/payout` | `src/app/payout/page.tsx` | `schemas/payout.json` |

Quotations is the most fully-wired module on `main` (list + `[id]` detail + tabs + forms) — use it as the canonical reference when in doubt. Other modules may not have a detail page yet; check `src/app/<module>/` before assuming a `[id]` route exists.

The pages are thin — typically 30–60 lines each. They import a schema, resolve `$ref`s, substitute route params, and render via `WidgetRenderer`.

---

## Pattern 1 — Simple list page (no dynamic params)

The list page has no route parameters. Just import the schema and render.

**`src/app/quotations/page.tsx`:**

```tsx
import { Suspense } from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import quotationsSchema from '../../../schemas/quotations.json';
import { WidgetConfig } from '@/types/widget';

export default function QuotationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <WidgetRenderer config={quotationsSchema as WidgetConfig} />
      </Suspense>
    </div>
  );
}
```

Notes:
- Schema imported from `schemas/quotations.json` — Next.js bundles it.
- No `$ref` resolution needed at the top level of a list page (tabs are mostly used on detail pages).
- `Suspense` is here as defensive scaffolding for lazy child widgets; not strictly required for static schemas.

---

## Pattern 2 — Detail page with `[id]` (dynamic param)

The detail page reads the route param, resolves `$ref`s on the server, substitutes `{{id}}` in endpoints, then renders.

**`src/app/quotations/[id]/page.tsx`:**

```tsx
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import quotationsDetailSchema from '../../../../schemas/quotations-detail.json';
import { WidgetConfig } from '@/types/widget';
import { resolveSchemaRefs } from '@/lib/schemaResolver';

export default async function QuotationDetailPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  // 1. Resolve all $ref shortcuts
  const resolvedRawSchema = await resolveSchemaRefs(quotationsDetailSchema, process.cwd());

  // 2. Deep-clone (resolveSchemaRefs returns mutable nodes; we mutate next)
  const config = JSON.parse(JSON.stringify(resolvedRawSchema)) as WidgetConfig;

  // 3. Substitute {{id}} in endpoints
  const updateEndpoints = (node: WidgetConfig) => {
    if (node.dataSource?.api?.endpoint?.includes('{{id}}')) {
      node.dataSource.api.endpoint = node.dataSource.api.endpoint.replace('{{id}}', id);
    }
    // Recurse into action endpoints under props.actions
    const actions = (node.props as any)?.actions;
    if (Array.isArray(actions)) {
      actions.forEach((action: any) => {
        if (typeof action.api?.endpoint === 'string' && action.api.endpoint.includes('{{id}}')) {
          action.api.endpoint = action.api.endpoint.replace('{{id}}', id);
        }
      });
    }
    node.children?.forEach(updateEndpoints);
  };
  updateEndpoints(config);

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-8 text-center">Loading Details...</div>}>
        <WidgetRenderer config={config} />
      </Suspense>
    </div>
  );
}
```

Three things happen on the server, before the page hits the client:

### Step 1 — `resolveSchemaRefs`

Walks the imported schema. Wherever it sees `{ "$ref": "schemas/..." }`, dynamically imports the file or looks up the form registry, splices the result in place.

The function is async and recursive — see [`src/lib/schemaResolver.ts`](../../src/lib/schemaResolver.ts).

### Step 2 — Deep clone

`resolveSchemaRefs` returns mutable objects that share structure with the imported schemas. Mutating them directly would mutate the shared module — bad for hot-reload and subsequent requests. So we `JSON.parse(JSON.stringify(...))` to get a fresh tree.

### Step 3 — Template substitution

`{{id}}` is the framework's convention for "replace with the route param". The walker descends the resolved tree and rewrites endpoints.

⚠️ **The walker is page-specific.** Each `page.tsx` that needs `{{id}}` substitution defines its own walker. If a widget puts endpoints in non-standard locations (e.g., direct props like `pendingTicketEndpoint` on a custom widget), this walker won't find them. Extend the walker for each new endpoint location, or — better — move substitution into `useSmartQuery` / `useActionHandler` at fetch time (proposed change; not shipped at time of writing).

### `export const dynamic = 'force-dynamic'`

Without this, Next.js may try to statically generate the page at build time, which fails because `params` is async. `force-dynamic` makes the page server-rendered per request.

---

## Pattern 3 — List + filter + table

A list page with a filter bar and a data table sharing state:

**`src/app/claims/page.tsx`:**

```tsx
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import claimsSchema from '../../../schemas/claims-list.json';
import { WidgetConfig } from '@/types/widget';

export default function ClaimsListPage() {
  return (
    <div className="min-h-screen bg-background">
      <WidgetRenderer config={claimsSchema as WidgetConfig} />
    </div>
  );
}
```

**`schemas/claims-list.json`:**

```json
{
  "id": "claims-list-page",
  "type": "stack-layout",
  "props": { "gap": 4, "className": "p-6" },
  "children": [
    {
      "id": "header",
      "type": "page-header",
      "props": { "title": "Claims", "description": "Manage open claims" }
    },
    {
      "id": "claims-filters",
      "type": "filter-bar",
      "props": {
        "stateKey": "page:claims:filters",
        "filters": [...]
      }
    },
    {
      "id": "claims-table",
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

No server logic needed — the schema describes the whole thing, the filter-bar publishes state, the data-table subscribes.

---

## Template substitution rules

The framework supports two distinct substitution mechanisms. Don't confuse them.

### `{{id}}` — page-level route params

Used in **schema-authored endpoints**. The page walker replaces these once, at page-render time, with the route param value.

**Schema:**
```json
{ "dataSource": { "api": { "endpoint": "/api/v1/claims/{{id}}", "method": "GET" } } }
```

**Page:**
```tsx
const { id } = params;
// updateEndpoints walks the tree replacing {{id}} → "C-001"
```

### `:paramName` — row-data substitution

Used in **action endpoints** and **link routes**. The framework substitutes at action-dispatch time, using row data (for row actions) or form values (for form actions).

**Schema:**
```json
{ "type": "navigate", "target": "/claims/:id" }
```

**Runtime:**
```tsx
substituteEndpointParams("/claims/:id", { id: "C-001" })  // → "/claims/C-001"
```

The function lives at [`src/lib/endpointUtils.ts`](../../src/lib/endpointUtils.ts).

### When to use which

| Token | Substituted by | Use for |
|-------|---------------|---------|
| `{{id}}` | Page walker (server-side, once per page load) | Endpoints that need the route param — `dataSource.api.endpoint`, action endpoints in tabs |
| `:id`, `:claim_id`, etc. | `substituteEndpointParams` (client-side, per action dispatch) | Row actions, link routes, form action endpoints (when rowData prefilled the form) |

⚠️ Mixing them up is a common bug. `:id` in a `dataSource.api.endpoint` doesn't get substituted unless rendered in a per-row context — which `dataSource` isn't.

---

## The page walker — current and future

The walker is the most fragile piece of the routing layer. It currently lives **in each page.tsx** and a typical implementation recurses through:

1. `node.dataSource?.api?.endpoint`
2. `node.props?.actions?.[].api?.endpoint`
3. `node.children?.forEach(walker)`

It does **not** recurse through:
- `node.props.headerActions[].api.endpoint` (header actions on data-tables)
- `node.props.rowActions[].api.endpoint` (row actions)
- Arbitrary widget-prop endpoints (e.g., a custom widget's direct `*Endpoint` props)
- `node.dataSource.api.params` values
- Children stored under non-standard paths (`props.items[].children` is sometimes used by feature-branch widgets like `accordion-group`)

If you're adding a new widget that holds endpoints in non-standard locations, extend the page walker accordingly **and** document it inline.

💡 The long-term fix is to move `{{id}}` substitution into `useSmartQuery` and `useActionHandler` — substitute at fetch time, in one place. This is a proposed change; if you're reading this and it's already shipped, the page walker is gone.

---

## Server vs client components

Pages are **server components** by default. They:
- Run on the server, per request (when `dynamic = 'force-dynamic'`).
- Can `await` async operations (params, schema resolution).
- Can't use hooks (`useState`, `useEffect`, custom hooks).
- Can use server-only libraries.

`WidgetRenderer` and all widgets are **client components** (`"use client"`). They:
- Run in the browser.
- Use hooks.
- Receive serialised props from the server.

The boundary is: the page imports the schema, resolves refs, substitutes params (all server) → passes the resolved JSON to `WidgetRenderer` (client). The schema must be JSON-serialisable across the boundary.

⚠️ Don't try to put React components inside a schema. Schemas are JSON; functions don't serialise. If a widget needs a custom renderer, that custom renderer must be a separately-registered widget.

---

## Loading states and Suspense

Two layers of loading state:

1. **Page-level Suspense.** Wrap `WidgetRenderer` in `<Suspense fallback={...}>` for the brief server-render → client-hydrate window. Optional but recommended.
2. **Widget-level loading skeletons.** Most widgets that fetch data have built-in skeletons (`data-table`, `key-value-grid`, `info-card`, etc.) — they handle `isLoading` themselves.

You shouldn't need to write your own loading UI for schema-driven screens.

---

## Error boundaries

Next.js automatically provides error boundaries via `error.tsx` files in route folders. Add one per route group:

**`src/app/claims/error.tsx`:**

```tsx
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">Try again</button>
    </div>
  );
}
```

This catches rendering errors (broken schema, unknown widget, etc.). For data-fetch errors, the widget's own `ErrorState` handles it.

---

## Navigation menu — how routes appear in the sidebar

Routes don't auto-register in the navigation. The nav is data-driven via `/api/config/app?appId=<app>`.

The endpoint returns:

```json
{
  "title": "Group Insurance",
  "navigation": {
    "menuItems": [
      {
        "id": "claims",
        "title": "Claims",
        "url": "/claims",
        "icon": "FileCheck",
        "subMenuItems": [
          { "id": "claims-list", "title": "All Claims", "url": "/claims" }
        ]
      }
    ]
  }
}
```

The mock lives at `src/mocks/original/<app>/config/app-config-mock.ts` (e.g. `src/mocks/original/group-insurance/config/app-config-mock.ts`). To add a new module to the sidebar, edit that file.

`<AppContextProvider>` fetches this on mount; `<DualPanelNav />` renders from it.

---

## Common patterns

### A new module from scratch

1. Add the schema files:
   - `schemas/<module>.json` (list page)
   - `schemas/<module>-detail.json` (detail page)
   - `schemas/tabs/<module>/*.json` (detail tabs)
   - `schemas/forms/<form>.json` (any forms)
2. Run `npm run predev` to regenerate the forms registry.
3. Add the pages:
   - `src/app/<module>/page.tsx`
   - `src/app/<module>/[id]/page.tsx`
4. Add the API mock routes:
   - `src/app/api/<resource>/route.ts`
   - `src/app/api/<resource>/[id]/route.ts`
5. Add the menu item in `app-config-mock`.

See [11-cookbook.md → New module from scratch](11-cookbook.md) for the end-to-end walkthrough.

### A new tab on an existing detail page

1. Add the tab schema: `schemas/tabs/<module>/<tab-name>.json`.
2. Add the `$ref` in the parent detail schema's `tabs-container.children`.

No code changes. No page edits. No registry updates.

### A new form on an existing module

1. Add `schemas/forms/<form-id>.json`.
2. Run `npm run predev`.
3. Trigger it via an `open-modal` action: `{ "type": "open-modal", "target": "<form-id>" }`.

No page edits.

---

## Common mistakes

1. **Forgetting `dynamic = 'force-dynamic'` on `[id]` pages.** Build-time generation fails because `params` is async. Add the export.

2. **Forgetting `JSON.parse(JSON.stringify(...))` after `resolveSchemaRefs`.** Mutating shared schema modules causes weird cross-request bugs in dev. Always deep-clone before mutating.

3. **Extending the page walker incompletely.** Add a new endpoint location, walker missed it, `{{id}}` stays as a literal. Test by checking the Network tab — the URL should have the resolved id.

4. **Using `[id]` route segment but `{{claimId}}` in the schema.** They must match. If your route is `[claimId]`, your schema uses `{{claimId}}` and the walker is updated accordingly.

5. **Trying to use server-side hooks.** `useRouter`, `useState`, `useEffect` don't exist in server components. If you need them, move logic into a `"use client"` component.

6. **Importing schemas at the wrong path.** Relative paths break if you move the page file. Use `import schema from '../../../schemas/foo.json'` carefully — the dots have to match the actual depth.

7. **Registering the route in the menu but not creating `page.tsx`.** The sidebar link 404s. Add both, or neither.

---

**Next:** [09-api-routes.md](09-api-routes.md) — mock API conventions, error envelopes, proxy patterns.
