# Track 4 — API Client & Request Policies

## Goal

Build a `PolicyClient` that wraps the existing `src/lib/api/` client. Every read or write goes through a named request policy declared in the schema. Inject correlation and idempotency headers automatically. Handle 401 refresh once.

## You Own

- `src/lib/runtime/api/`

## Inputs

- Track 1 types: `RequestPolicyDefinition`, `ApiError`
- Existing `src/lib/api/` — wrap it; do not break its current consumers

## Deliverables

### 1. Files

```
src/lib/runtime/api/
├── index.ts
├── PolicyClient.ts         // class, the main entry point
├── policyRegistry.ts       // load/register policies from a schema block
├── headers.ts              // correlation + idempotency generation
├── refresh.ts              // 401 refresh logic
└── api.test.ts
```

### 2. Exact exports

```ts
// index.ts
export { PolicyClient } from "./PolicyClient";
export { createPolicyRegistry, type PolicyRegistry } from "./policyRegistry";
export type { ApiRequest, ApiResponse } from "./PolicyClient";
export type { RequestPolicyDefinition, ApiError } from "../types";
```

### 3. `PolicyClient`

```ts
export interface ApiRequest {
  endpoint: string;                    // e.g. "/api/quotation/quotes/123"
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  correlationId?: string;              // if not supplied, auto-generated
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: ApiError;
  correlationId: string;
}

export class PolicyClient {
  constructor(registry: PolicyRegistry, opts?: { onLogout?: () => void });

  executePolicy<T = unknown>(policyName: string, request: ApiRequest): Promise<ApiResponse<T>>;
  // Resolves the policy from the registry, applies its headers/retry/auth, calls the underlying client,
  // injects Idempotency-Key for non-GET when policy.idempotent !== false,
  // injects X-Correlation-Id always,
  // on 401 attempts ONE refresh then retries the original request once,
  // returns ApiResponse with ok=true on 2xx, ok=false otherwise.

  setOnLogout(cb: () => void): void;   // wired by RuntimeGraphProvider for clearOn=logout
}
```

### 4. `policyRegistry.ts`

```ts
export interface PolicyRegistry {
  get(name: string): RequestPolicyDefinition | undefined;
  has(name: string): boolean;
  size(): number;
}

export function createPolicyRegistry(
  policies: Record<string, RequestPolicyDefinition>
): PolicyRegistry;
```

When `PolicyClient.executePolicy` is called with a name not in the registry, throw `new Error("[runtime:api] Unknown request policy: " + name)` synchronously (before any network call).

### 5. `headers.ts`

```ts
export function generateCorrelationId(): string;  // UUIDv4
export function generateIdempotencyKey(): string; // UUIDv4

export function buildHeaders(
  policy: RequestPolicyDefinition,
  request: ApiRequest,
  context: { correlationId: string; idempotencyKey?: string; userRole?: string; userId?: string }
): Record<string, string>;
```

`buildHeaders` rules:

- Always set `X-Correlation-Id` to `context.correlationId`.
- For non-`GET` when `policy.idempotent !== false`, set `Idempotency-Key` to `context.idempotencyKey`.
- For each name in `policy.includeHeaders`, look up the value:
  - `"X-User-Role"` → `context.userRole`
  - `"X-User-Id"` → `context.userId`
  - other names → pass through from `request.headers` if present
- `policy.auth === "session"` → add `Authorization` header from session (whatever the existing client uses; see reuse note).

### 6. `refresh.ts`

```ts
export async function attemptRefresh(): Promise<{ ok: boolean }>;
```

On the first 401 from any call, `executePolicy` invokes `attemptRefresh`. If `ok`, retry the original request once. If still 401 or `attemptRefresh` returns `ok: false`, call `onLogout` (the callback wired in the constructor) and return the failed response with `error.status === 401`. Do not loop.

For Layer 1, `attemptRefresh` can be a stub that returns `{ ok: false }` — wire the structure correctly and add a TODO comment pointing to where the real refresh endpoint lives.

### 7. Wrapping the existing client

Read `src/lib/api/` first. It likely exports `apiClient` or named functions like `apiGet`, `apiPost`. The wrapping rule:

- `PolicyClient.executePolicy` internally calls the existing client's lowest-level function (probably `fetch`-equivalent).
- Existing callers (widgets, mock setup) continue to work — do **not** change `src/lib/api/`'s public API.
- If you need to read session info (token, user id), use whatever the existing client uses. Add a comment if the wiring is non-obvious.

## Reuse / Do Not Touch

- Must reuse `src/lib/api/` underneath. Do not duplicate or replace.
- Mocks in `src/lib/api-mock/` continue to work — they intercept fetches, not policy calls.
- Do not modify `src/lib/api/`'s exports; only wrap them.

## Edge Cases

- A `GET` request with `policy.idempotent: true` — still no `Idempotency-Key` (idempotency is for non-GET only).
- A 5xx with `policy.retry.attempts > 0` — retry up to `attempts` times with exponential backoff (`backoffMs * 2^n`). Each retry uses the **same** `Idempotency-Key`. Different `X-Correlation-Id` per retry attempt.
- 401 on the retried (refresh-recovered) request — do not refresh again; call `onLogout` and return.
- Network error (fetch rejects) — return `ApiResponse { ok: false, status: 0, error: { status: 0, message: "Network error", correlationId } }`.

## Allowed Deps

- `uuid` — if not already in `package.json`, add via `yarn add uuid @types/uuid`. Or use `crypto.randomUUID()` (browser ≥ Safari 15.4, all modern targets) — prefer this and skip the dep.

## DoD

`yarn test src/lib/runtime/api/` covers:

- Unknown policy name throws synchronously.
- `GET` injects `X-Correlation-Id` but not `Idempotency-Key`.
- `POST` with `policy.idempotent: true` injects both.
- Retry with same `Idempotency-Key` across 5xx attempts.
- 401 triggers one refresh attempt; second 401 calls `onLogout` and returns failed response.
- Existing mock setup in `src/lib/api-mock/` still answers — write one test that goes through `PolicyClient` and asserts the mock returned the expected body.

## References

- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:127](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L127) — "Request Policies": L133 shows a complete example policy block.
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:23](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L23) — "Frontend Runtime Requires": L25 "One authenticated API client path".
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:56](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L56) — "3. Structured mutation contracts": idempotency expectations.
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:66](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L66) — "Recommended Browser Contract": L68 system context, L77 request policies, L81 response validation.
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:85](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L85) — "Recommended Auth Flow": L89 acquisition, L95 refresh, L101 mid-pipeline failure, L113 logout.

Existing code to read before starting:

- [src/lib/api/](../../../src/lib/api/) — read every file; identify the lowest-level fetch wrapper to call from `PolicyClient`.
- [src/lib/api-mock/](../../../src/lib/api-mock/) — confirm the mocks intercept at the same layer your wrapper calls.
