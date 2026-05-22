# 04 — Data sources

This document covers how widgets fetch data — the `DataSourceConfig` shape, `useSmartQuery`, polling, state dependencies, and the response-shape conventions.

---

## The `DataSourceConfig` shape

```ts
interface DataSourceConfig {
  api?: {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    params?: Record<string, any>;                      // Values may be primitives, objects, or arrays
  };
  refreshInterval?: number;                            // ms; fixed-interval polling
  pollSchedule?: {                                     // tiered backoff polling
    initialIntervalMs: number;
    initialDurationMs: number;
    fallbackIntervalMs: number;
    maxDurationMs?: number;
  };
  stopWhen?: Record<string, unknown>;                  // JSONLogic predicate; stops polling early
  valueKey?: string;                                   // Extract a top-level response property
  dataPath?: string;                                   // Dotted path to drill into the response (consumed by data-table)
  parseJson?: boolean;                                 // JSON.parse the value at dataPath if it's a string
  stateDependencies?: string[];                        // useWidgetState keys that trigger refetch
}
```

A `dataSource` is declarative — you describe what to fetch and when to refetch. The runtime hook ([`useSmartQuery`](../../src/hooks/useSmartQuery.ts)) handles the imperative details.

---

## Basic fetch

The minimum useful `dataSource`:

```json
{
  "id": "claims",
  "type": "data-table",
  "dataSource": { "api": { "endpoint": "/api/v1/claims", "method": "GET" } }
}
```

When the widget mounts:
1. `useSmartQuery({ api: { endpoint: "/api/v1/claims", method: "GET" } })` runs.
2. TanStack Query keys the request by `[endpoint, method, params, dependentState]`.
3. The response body is injected into the widget's props as `data` (and `isLoading`, `error` alongside).

That's it. No imports, no fetch boilerplate, no loading UI plumbing — the widget handles its own loading skeletons.

---

## `valueKey` — extracting a nested response

Backends often wrap responses: `{ data: [...] }`, `{ items: [...], total: 123 }`. Use `valueKey` to drill in:

```json
{
  "dataSource": {
    "api": { "endpoint": "/api/v1/claims", "method": "GET" },
    "valueKey": "items"
  }
}
```

`data-table` (and most other widgets) will consume `response.items` instead of `response`. Without `valueKey`, the widget tries to use the whole response — which for `data-table` only works when the response is a bare array.

⚠️ `valueKey` is **a single property name**, looked up via bracket access (`jsonData[valueKey]`). **Dotted paths (`"data.items"`) are NOT traversed** by `useSmartQuery`. If you need to drill into a deeper path for a data-table, use `dataPath` + `parseJson` instead (next section).

---

## `dataPath` + `parseJson` — drilling into deeper / stringified payloads

`data-table` consumes two extra fields on `DataSourceConfig` (via `useDataTable`):

- **`dataPath`** — a dotted path traversed inside the fetched response to locate the rows array. Mirrors the per-field `accessorKey` walker that `key-value-grid` already uses.
- **`parseJson`** — when true and the value at `dataPath` is a string, the value is `JSON.parse`d before being treated as rows. Backend DTOs that ship escaped JSON (e.g. `estimatedPremium.byPlanJson` on a Quote) become tabular without a custom renderer.

```json
{
  "id": "premium-breakdown",
  "type": "data-table",
  "dataSource": {
    "api":      { "endpoint": "/api/v1/quotes/{{id}}", "method": "GET" },
    "dataPath": "estimatedPremium.byPlanJson",
    "parseJson": true
  },
  "props": { "columns": [...] }
}
```

⚠️ Parse failure is surfaced by `useDataTable` as a `dataError` field on the hook's return — separate from `queryError`. Today the `data-table` consumer doesn't render `dataError` distinctly (the table just shows empty); the hook exposes it so a future consumer (or your custom widget) can surface a loud "response-shape regression" message. Verify with [`src/hooks/useDataTable.ts`](../../src/hooks/useDataTable.ts) and the consuming component on your branch.

⚠️ `dataPath` is consumed by `data-table` only. Other widgets (e.g. `key-value-grid`) have their own field-level `parseJson` mechanism — see [02-widget-catalog.md](02-widget-catalog.md).

---

## Array-valued GET params

When a `stateDependencies` filter (or `api.params` value) is an array, `useSmartQuery` repeats the key per value rather than serialising the array as a string:

```json
{ "stateDependencies": ["page:claims:filters"] }
```

…and the filter state writes `{ state: ["DRAFT", "SUBMITTED"] }` → the request becomes `?state=DRAFT&state=SUBMITTED` (the convention most Spring `@RequestParam List<String>` endpoints expect).

Empty entries (`undefined` / `null` / `""`) are skipped silently.

---

## Endpoint parameters

Two distinct mechanisms — don't confuse them.

### Row-data parameters: `:paramName`

For URLs containing per-row identifiers (e.g., row action endpoints, link routes), use the `:param` syntax. The framework substitutes via [`substituteEndpointParams(endpoint, rowData)`](../../src/lib/endpointUtils.ts):

```json
{ "type": "navigate", "target": "/claims/:id" }
{ "type": "api-mutation", "api": { "endpoint": "/api/v1/claims/:id/triage", "method": "POST" } }
```

When the action fires, `rowData.id` (or `rowData.<paramName>`) replaces the token. Missing values leave the token intact.

💡 **Rule of thumb:** the substitution token must match the field name in the row data. `:id` requires `rowData.id`; `:claim_id` requires `rowData.claim_id`.

`rowIdKey` on a `data-table` (default `"id"`) is a separate setting — it tells the table which field to use as the React key per row. It does NOT rename the substitution token. So with `rowIdKey: "claim_id"` and a response where each row has `claim_id` but no `id`, your row action target must read `:claim_id`:

```json
{
  "type": "data-table",
  "props": {
    "rowIdKey": "claim_id",
    "rowActions": [
      { "id": "view", "type": "navigate", "target": "/claims/:claim_id" }
    ]
  }
}
```

### Page-level parameters: `{{id}}`

For URLs containing route parameters (Next.js dynamic routes like `[id]`), the schema author uses `{{id}}`:

```json
{ "dataSource": { "api": { "endpoint": "/api/v1/quotes/{{id}}", "method": "GET" } } }
```

⚠️ The framework does **not** automatically substitute `{{id}}`. The page (`src/app/<module>/[id]/page.tsx`) is responsible for walking the resolved schema and replacing `{{id}}` with the route param. See [08-pages-and-routing.md → Template substitution](08-pages-and-routing.md#template-substitution) — `src/app/quotations/[id]/page.tsx` is the reference implementation on `main`.

The walker pattern that's emerged:

```tsx
const updateEndpoints = (node: WidgetConfig) => {
  if (node.dataSource?.api?.endpoint?.includes('{{id}}')) {
    node.dataSource.api.endpoint = node.dataSource.api.endpoint.replace('{{id}}', id);
  }
  // Action endpoints under props.actions
  const actions = (node.props as any)?.actions;
  if (Array.isArray(actions)) {
    actions.forEach((action: any) => {
      if (typeof action.api?.endpoint === 'string') {
        action.api.endpoint = action.api.endpoint.replace('{{id}}', id);
      }
    });
  }
  node.children?.forEach(updateEndpoints);
};
```

⚠️ The walker is module-specific and easy to break. If a widget puts endpoints in non-standard locations (e.g., direct props like `pendingTicketEndpoint`), the walker needs an extension *or* the substitution should move into `useSmartQuery` itself (proposed; not yet shipped).

### Query parameters via `api.params`

For static query parameters:

```json
{
  "dataSource": {
    "api": {
      "endpoint": "/api/claims",
      "method": "GET",
      "params": { "include": "vehicle,claimants", "limit": 50 }
    }
  }
}
```

For GET, the params are stringified and appended to the URL. For POST/PUT/PATCH, they go into the JSON body.

---

## State dependencies — refetching when state changes

To refetch when shared state changes (e.g., when a sibling `filter-bar` updates filters):

```json
{
  "dataSource": {
    "api": { "endpoint": "/api/v1/claims", "method": "GET" },
    "stateDependencies": ["page:claims:filters"]
  }
}
```

The runtime:
1. Reads `useWidgetState.values["page:claims:filters"]` (an object like `{ state: "TRIAGED", q: "foo" }`).
2. Flattens it into the request: GET params, POST body, etc.
3. Adds the dependent state snapshot to the React Query key, so any change invalidates the cache.

💡 The publisher (`filter-bar`) and subscriber (`data-table`) agree on the key. Convention: `page:<module>:filters` for filter state, `entity:<id>:draft` for entity drafts.

See [07-state-and-conditions.md](07-state-and-conditions.md) for the full state model.

---

## Polling

Two flavours, used for different patterns.

### Fixed-interval polling — `refreshInterval`

```json
{
  "dataSource": {
    "api": { "endpoint": "/api/dashboard/metrics/total-claims", "method": "GET" },
    "refreshInterval": 30000
  }
}
```

The query refetches every 30 seconds for as long as the widget is mounted. Use for dashboard tiles, live counters, anything where "show me the latest" is the only requirement.

### Tiered backoff polling — `pollSchedule`

For async backend operations where you want fast feedback initially, then back off:

```json
{
  "dataSource": {
    "api": { "endpoint": "/api/quotes/:id", "method": "GET" },
    "pollSchedule": {
      "initialIntervalMs": 2000,
      "initialDurationMs": 10000,
      "fallbackIntervalMs": 5000,
      "maxDurationMs": 60000
    },
    "stopWhen": { "!=": [{ "var": "premium" }, null] }
  }
}
```

Reading top to bottom:
- Poll every **2 seconds** for the first **10 seconds**.
- Then poll every **5 seconds** up to **60 seconds total**.
- At 60 seconds, give up.
- **Or** stop earlier — as soon as the JSONLogic predicate `stopWhen` evaluates true against the latest response.

This exact cadence is defined as `STANDARD_POLL_SCHEDULE` in [`src/lib/polling.ts`](../../src/lib/polling.ts). JSON schemas can't import the constant directly, so the convention is to **inline these four numbers verbatim** in the schema. If the cadence ever changes, update both the constant and the schemas that copied it.

💡 Use `pollSchedule + stopWhen` for: pricing engine runs, async member enrolment, policy activation — anything where the backend says "give me a few seconds."

### Stop conditions — `stopWhen`

`stopWhen` is a JSONLogic predicate evaluated against the latest fetched data. When it's truthy, polling halts.

Common patterns:

```json
"stopWhen": { "!=": [{ "var": "premium" }, null] }
// Stop when premium is populated

"stopWhen": { "==": [{ "var": "state" }, "ACTIVE"] }
// Stop when state reaches ACTIVE

"stopWhen": { "in": [{ "var": "state" }, ["ACTIVE", "FAILED", "CANCELLED"]] }
// Stop on any terminal state
```

See [07-state-and-conditions.md → JSONLogic](07-state-and-conditions.md#jsonlogic) for the full operator reference.

---

## When a widget skips the fetch

`useSmartQuery` returns immediately with `enabled: false` when:
- `dataSource` is absent
- `dataSource.api` is absent

That's why widgets that don't fetch (layout widgets, static items) pay zero cost beyond the hook call. You don't need to conditionally include `dataSource` — just omit it.

---

## Response shape conventions

The framework is agnostic — it injects whatever the endpoint returns. But across the codebase, two response shapes have stabilised:

### List endpoints

```json
[
  { "id": "1", ... },
  { "id": "2", ... }
]
```

A bare JSON array. No envelope. `data-table` consumes this directly.

If you need pagination metadata, switch to an enveloped shape and set `valueKey`:

```json
{
  "items": [...],
  "total": 1234,
  "page": 1,
  "pageSize": 20
}
```

```json
{ "dataSource": { "api": {...}, "valueKey": "items" } }
```

### Single-entity endpoints

```json
{
  "id": "C-001",
  "claim_no": "MOT-12345",
  "state": "TRIAGED",
  ...
}
```

A bare object. Used by `key-value-grid`, single-entity headers, and as the source for `action-bar` state.

### Error responses

For envelope shapes (Spring default + the legacy field-level `backendErrors` envelope), see the canonical reference in [09-api-routes.md → Error responses](09-api-routes.md#error-responses). The short summary: `useActionHandler` reads `message`, then `errorCode`, then `error`, then falls back to HTTP statusText. Forms additionally map a `backendErrors[]` array to field-level errors via `variable_code` (see [06-forms.md → Backend errors](06-forms.md#backend-errors)).

---

## Mocking endpoints

For local development the mock routes under `src/app/api/...` are part of Next.js. See [09-api-routes.md](09-api-routes.md) for the full mock conventions. The short version:

- Create `src/app/api/<path>/route.ts`
- Export `GET`, `POST`, `PUT`, `DELETE` functions
- Return `NextResponse.json(...)` with appropriate status

The schema doesn't know whether it's hitting a mock or a real backend — just point `dataSource.api.endpoint` at the URL.

---

## Caching, invalidation, refetching

TanStack Query under the hood:

- Default `staleTime: 60000` (60s) — see `src/components/providers.tsx`.
- Cache key on `main`: `[endpoint, method, params, dependentState]`. Role is **not** included in the key directly; if your widget needs to refetch on role change, declare `stateDependencies: ["global:current-role"]` (the role is published to widget state — see [07-state-and-conditions.md](07-state-and-conditions.md)).
- Manual invalidation: `action.refreshKey`. The handler invalidates all queries whose `queryKey[0]` starts with the refreshKey string.

To invalidate only `/api/v1/claims/<id>`:

```json
{ "refreshKey": "/api/v1/claims/" }
```

(Trailing slash matters — `/api/v1/claims` would also match `/api/v1/claims-archive`.)

To invalidate everything claims-related (list + detail + summaries):

```json
{ "refreshKey": "/api/v1/claims" }
```

💡 **Pick refresh keys at the granularity of "what the user expects to see updated after this mutation."** Too narrow misses related views (state badge in the table doesn't change). Too broad refetches the world (the dashboard reloads after every claim update).

---

## Common mistakes

1. **Hardcoding the row id in an endpoint.** If you write `"/api/v1/claims/C-001/triage"` instead of `"/api/v1/claims/:id/triage"`, the action will only work for that claim. Always use `:param` for row-level identifiers.

2. **Using `{{id}}` in row actions.** `{{id}}` is for the page-level route param. Inside a `data-table`'s row action, use `:id` (the row PK).

3. **Putting `valueKey` outside `dataSource`.** It's `dataSource.valueKey`, not `props.valueKey`. Common typo.

4. **Polling forever.** Always set either `stopWhen` or `maxDurationMs` (preferably both). An accidental "poll every 2s, forever" leaks battery and bandwidth.

5. **Refetching too aggressively via `refreshInterval`.** If the data doesn't change every N seconds, don't poll every N seconds. Use a mutation's `refreshKey` to invalidate on demand.

6. **Stale `stateDependencies`.** If the data-table no longer needs filters but you left the dependency in, it re-keys (and refetches) on irrelevant changes. Prune when the contract shifts.

---

**Next:** [05-actions.md](05-actions.md) — every action type the runtime understands.
