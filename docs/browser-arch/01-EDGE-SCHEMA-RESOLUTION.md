# Layer 1 — Edge Schema Resolution

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Layer:** 1 of 6  

---

## Overview

The Edge Schema Resolution layer is the mechanism by which the browser obtains a fully resolved, tenant- and context-specific view schema without making any requests to an application server. A Cloudflare Worker sits at the CDN edge, co-deployed with the frontend bundle. It intercepts schema requests, extracts context from the user's JWT, selects the most specific pre-materialised schema from S3, and returns it with a long CDN TTL.

The browser never sees raw schema fragments, config declarations, or binding instructions. By the time a `resolved-schema.json` is written to S3, the Materialisation Service has already baked in all config-derived values (labels, badge variants, display mappings). The edge function is purely a selector and cache layer — it performs no schema assembly at request time.

---

## System Diagram

```
Browser
  │
  │  GET /schemas/{viewId}
  │  Authorization: Bearer <access-token>
  │
  ▼
Cloudflare Worker  (edge, co-deployed with frontend)
  │
  ├─ 1. Extract JWT claims (decode only — no re-validation)
  │      tenantId, role, lob, locale, portalType
  │
  ├─ 2. Check KV hot cache  →  HIT: return immediately
  │
  ├─ 3. GET {viewId}/{tenantId}.json from S3
  │      (falls back to {viewId}/default.json if not found)
  │
  ├─ 4. Filter items by $show/$hide conditions (applyConditions)
  │
  └─ 5. Return filtered schema (conditions stripped from output)
  │
  └─ 6. Return with Cache-Control headers + Surrogate-Key
         └─► CDN caches at edge node
               └─► subsequent requests: CDN HIT, Worker not invoked
```

---

## What `useViewMetadata(viewId)` Does

`useViewMetadata` is the single React hook that triggers schema resolution. It is called at the top of every metadata-driven view component.

```typescript
// src/hooks/useViewMetadata.ts  (reference — authoritative source is the file itself)

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/authStore';

export interface ResolvedSchema {
  viewId: string;
  version: string;
  resolvedAt: string;          // ISO timestamp of when Materialisation Service wrote this
  layout: LayoutConfig;
  columns?: ColumnConfig[];
  actions?: ActionConfig[];
  widgets?: WidgetConfig[];
  // ... view-type-specific fields
}

export function useViewMetadata(viewId: string) {
  const { getAccessToken } = useAuthStore();

  return useQuery<ResolvedSchema>({
    queryKey: ['schema', viewId],
    queryFn: async () => {
      const token = getAccessToken();   // reads from in-memory store, never localStorage
      const res = await fetch(`/schemas/${viewId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (res.status === 404) {
        throw new SchemaNotFoundError(viewId);
      }
      if (res.status === 503) {
        throw new SchemaUnavailableError(viewId);
      }
      if (!res.ok) {
        throw new Error(`Schema fetch failed: ${res.status}`);
      }

      return res.json() as Promise<ResolvedSchema>;
    },
    staleTime: 5 * 60 * 1000,    // 5 minutes — treat cached schema as fresh
    gcTime:    10 * 60 * 1000,   // 10 minutes — keep in memory after unmount
    retry: (failureCount, error) => {
      // Do not retry schema-not-found — it will not recover without a deploy
      if (error instanceof SchemaNotFoundError) return false;
      return failureCount < 2;
    },
  });
}
```

The `staleTime: 5min` matches the CDN `max-age=300`. React Query will not re-fetch within this window, so a component remount or route change gets an in-memory response. After 5 minutes, the next access triggers a background revalidation — the component continues to render the stale schema until the new one arrives (`stale-while-revalidate` equivalent in the browser).

---

## JWT Context Extraction at the Edge

The Worker decodes the JWT to read claims — it does **not** re-validate the signature. Signature validation is performed by the backend services' shared middleware. The Worker trusts that if the CDN accepted the request, the token is structurally valid.

Claims extracted from the JWT payload:

| Claim | Type | Used for |
|---|---|---|
| `tenantId` | `string` | Selects which schema file to load (`{viewId}/{tenantId}.json`) |
| `role` | `string` | Matched against partial conditions within the schema file |
| `lob` | `string` | Matched against partial conditions within the schema file |
| `locale` | `string` | Matched against partial conditions within the schema file |
| `portalType` | `string` | Matched against partial conditions within the schema file |

If a claim is absent from the JWT payload, any partial whose condition references that claim will not match. The user receives the base schema plus any partials whose conditions are fully satisfied by the claims they do have.

Full claim extraction and context construction is documented in [01a-CLOUDFLARE-WORKER.md](./01a-CLOUDFLARE-WORKER.md).

---

## S3 File Loading

The Worker performs at most **two `GetObject` calls** per cache miss — no `ListObjects`, no candidate scoring:

1. **`GetObject {viewId}/{tenantId}.json`** — tenant-specific schema file (primary).
2. **`GetObject {viewId}/default.json`** — universal fallback, only attempted if the tenant file is not found.

Full S3 key naming convention and file format are documented in [01b-S3-SCHEMA-LAYOUT.md](./01b-S3-SCHEMA-LAYOUT.md).

---

## Resolution Algorithm (Overview)

Once the schema file is fetched, the Worker filters its items by the user's context.

**Core rule:** The schema file is a flat document. Items within arrays (columns, actions, widgets, tabs) may carry a `$show` or `$hide` condition. The Worker walks the document and removes any item whose condition doesn't match the user's JWT claims. Items with no condition are always included. `$show`/`$hide` keys are stripped from the output — the browser receives a clean document.

**Condition matching:**
- All keys in a condition must match the corresponding JWT claim value (case-insensitive).
- A missing JWT claim (null) never satisfies a condition key.
- There is no scoring, no merging, and no ordering — the schema is already the complete picture.

**Fallback:** If no tenant file and no default file exist for the `viewId`, the Worker returns 404.

Full inline conditions specification, TypeScript implementation, and worked resolution traces are in [01c — Inline Conditions](./01c-SPECIFICITY-ALGORITHM.md).

---

## Response Format and Cache Headers

The Worker returns the resolved schema with the following headers:

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: public, max-age=300, stale-while-revalidate=3600
Surrogate-Key: schema-{viewId} tenant-{tenantId}
Vary: Authorization
ETag: "{s3-etag}"
```

**`Cache-Control` rationale:**
- `max-age=300` (5 min): CDN serves from cache without re-running the Worker. Matches `staleTime` in React Query.
- `stale-while-revalidate=3600` (1 hour): After 5 minutes, CDN serves the stale response immediately and revalidates in the background. Users loading a view between deploys never see a cold fetch.

**`Surrogate-Key` header:**
- `schema-{viewId}` — used to purge all edge nodes when any variant of a view is redeployed.
- `tenant-{tenantId}` — used to purge all schemas for a specific tenant on a tenant config change.
- Both keys can be targeted in a single CDN purge API call. Schema deploy hooks issue these purges automatically.

**`Vary: Authorization`:**
- Ensures CDN does not serve a schema cached for one user's context to a request with a different JWT. In practice, since the Worker extracts context from the JWT and the schema path does not include user identity, this header prevents stale-context serving.

---

## Error Handling

### Schema Not Found (404)

If neither `{viewId}/{tenantId}.json` nor `{viewId}/default.json` exists in S3:

```
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "SCHEMA_NOT_FOUND",
  "viewId": "quotations-list",
  "message": "No schema found for this view and context combination."
}
```

The browser hook (`useViewMetadata`) catches this as `SchemaNotFoundError` and does not retry. The view renders an error boundary fallback. This error state should be surfaced to the platform team — it indicates a missing Materialisation Service write.

### S3 Unavailable (503)

If the S3 `GetObject` call fails with a network error or a 5xx from S3, the Worker checks whether a stale response is available at the CDN edge node:

- **Stale available:** Serve the stale cached response with `Warning: 110 - "Response is Stale"` header. This is automatic when `stale-while-revalidate` is in effect; the Worker only needs to handle the case where the CDN cache has expired entirely.
- **No stale available:** Return 503.

```
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
Retry-After: 30

{
  "error": "SCHEMA_UNAVAILABLE",
  "viewId": "quotations-list",
  "message": "Schema store is temporarily unavailable. Please retry."
}
```

The browser hook retries up to 2 times on 503 (with exponential backoff) before entering an error state.

### Malformed JWT (400)

If the `Authorization` header is absent or the JWT payload cannot be decoded:

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "INVALID_TOKEN",
  "message": "Authorization header missing or JWT payload unreadable."
}
```

The browser auth layer intercepts this before `useViewMetadata` sees it — if `getAccessToken()` returns null, the hook is not enabled and the auth system redirects to login.

---

## React Query Integration

The following query configuration is the baseline for all schema queries. View-specific hooks extend it but must not reduce `staleTime` or `gcTime` below these values:

```typescript
const SCHEMA_QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime:    10 * 60 * 1000,  // 10 minutes after all subscribers unmount
  refetchOnWindowFocus: false, // schema changes are deploy-gated, not realtime
  refetchOnReconnect: false,   // same rationale
} as const;
```

**Why `refetchOnWindowFocus: false`:** Schema changes require a Materialisation Service run and a CDN purge. They are not realtime. Refetching on focus would produce unnecessary Worker invocations without meaningful freshness benefit.

**Query key structure:**

```typescript
// Single-view query
queryKey: ['schema', viewId]

// If context needs to be part of the cache key (future: multi-tenant admin switching)
queryKey: ['schema', viewId, tenantId]
```

**Cache invalidation on deploy:** When the Schema Materialisation Service writes a new file and the deploy hook fires a CDN purge, the browser's React Query cache is not automatically invalidated. The stale data will be served for up to 5 more minutes. This is acceptable for schema changes (display-only, not transactional). If immediate propagation is required (e.g. urgent label fix), the platform team can force-reload clients via a service worker broadcast or a short-lived schema version header that the browser checks on reconnect.

---

## Cold-Start Latency Mitigation

On a cold CDN edge node (Worker has not seen this `viewId + context` combination):

1. **KV lookup miss:** ~1ms
2. **S3 `GetObject` (tenant file):** 5–15ms (R2) / 30–80ms (cross-region S3)
3. **Partial application:** <1ms (CPU-only — array iteration, O(n) partials)

**Worst-case cold path: ~100ms** (S3 fallback path: two `GetObject` calls). R2 reduces this to ~30ms. Mitigations:

- **Pre-warming on deploy:** `wrangler deploy` hook fires a `GET /schemas/{viewId}` request for the most common contexts of each known tenant, warming the KV cache and CDN before real traffic arrives.
- **`stale-while-revalidate`:** After the first warm request, all subsequent requests within the `stale-while-revalidate` window are served from CDN without invoking the Worker.
- **React Query in-memory cache:** Within the same browser session, all hook calls for the same `viewId` are served from memory after the first fetch — zero network round trips.

---

## Child Documents

| Document | Content |
|---|---|
| [01a-CLOUDFLARE-WORKER.md](./01a-CLOUDFLARE-WORKER.md) | Worker script structure, environment bindings, KV cache, pre-warming, error shapes |
| [01b-S3-SCHEMA-LAYOUT.md](./01b-S3-SCHEMA-LAYOUT.md) | S3 key naming spec, full combination table, versioning, rollback |
| [01c — Inline Conditions](./01c-SPECIFICITY-ALGORITHM.md) | `$show`/`$hide` condition spec, `applyConditions` implementation, worked resolution traces |
