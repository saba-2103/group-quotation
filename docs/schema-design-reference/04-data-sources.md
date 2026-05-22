# 04 — Data sources

This document covers how widgets fetch data — the `DataSourceConfig` shape, `useSmartQuery`, polling, state dependencies, and the response-shape conventions.

---

## The `DataSourceConfig` shape

```ts
interface DataSourceConfig {
  api?: {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    params?: Record<string, any>;
  };
  refreshInterval?: number;                            // ms; fixed-interval polling
  pollSchedule?: {                                     // tiered backoff polling
    initialIntervalMs: number;
    initialDurationMs: number;
    fallbackIntervalMs: number;
    maxDurationMs?: number;
  };
  stopWhen?: Record<string, unknown>;                  // JSONLogic predicate; stops polling early
  valueKey?: string;                                   // Extract a nested response property
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

⚠️ `valueKey` supports dotted paths (`"data.items"`) but not array indices (`"items.0"`). For array indexing, dig into the response client-side or change the backend shape.

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

`:id` is by convention the row PK. To use a different PK field, set `rowIdKey` on the data-table:

```json
{ "type": "data-table", "props": { "rowIdKey": "claim_id" } }
```

Now `rowData.claim_id` is what's available as `:id` substitution… actually no. `rowIdKey` tells the table which field to use *as* the id; the substitution still uses the field name verbatim. Use `:claim_id` if you don't rename:

```json
{ "type": "navigate", "target": "/claims/:claim_id" }
```

💡 **Rule of thumb:** the substitution token must match the field name in the row data.

### Page-level parameters: `{{id}}`

For URLs containing route parameters (Next.js dynamic routes like `/claims/[id]`), the schema author uses `{{id}}`:

```json
{ "dataSource": { "api": { "endpoint": "/api/v1/claims/{{id}}", "method": "GET" } } }
```

⚠️ The framework does **not** automatically substitute `{{id}}`. The page (`src/app/claims/[id]/page.tsx`) is responsible for walking the resolved schema and replacing `{{id}}` with the route param. See [08-pages-and-routing.md → Template substitution](08-pages-and-routing.md#template-substitution).

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

This pattern is exported as `STANDARD_POLL_SCHEDULE` from [`src/lib/polling.ts`](../../src/lib/polling.ts) so most schemas just reference the constant via TypeScript helpers (or inline the same values).

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

Spring default (V1 standard):

```json
{
  "timestamp": "2026-05-22T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/claims"
}
```

`useActionHandler` reads `message` first, falls back to `error`, then HTTP statusText. Toast text comes from whichever wins.

For field-level errors, the legacy `backendErrors` shape:

```json
{
  "backendErrors": [
    { "variable_code": "claim_no", "error_code": "REQUIRED", "error_desc": "Claim number is required" }
  ]
}
```

Forms map `variable_code` to field names. See [06-forms.md → Backend errors](06-forms.md#backend-errors).

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
- Cache key: `[endpoint, method, params, dependentState]` (and `role`, depending on the version in your branch).
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
