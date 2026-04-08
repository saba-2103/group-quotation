# 02b — Backend JWT Validation

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Parent doc:** [02-AUTH-AND-SECURITY.md](./02-AUTH-AND-SECURITY.md)  

---

## Overview

JWT validation, tenant isolation, and permission enforcement are **fully owned by the backend team** via a shared platform middleware package. This document exists from the browser's perspective: it records what error shapes the browser should expect and how `createApiClient` handles each one.

The browser does not need to know how the backend validates tokens, what signing algorithm is used, how tenant IDs are resolved, or how permissions are evaluated. That is intentionally opaque. This document captures the **observable contract** — the HTTP responses that flow back to the browser.

---

## Backend Middleware (for Context Only)

Every backend service that receives requests from Keystone UI applies a standard middleware chain from the shared platform middleware package. The browser does not implement any of this:

```
Request arrives at backend service
  │
  ├── authenticate()
  │     Validates JWT signature, expiry, issuer, audience.
  │     Extracts claims and attaches to request context.
  │     Returns 401 if token is invalid, expired, or malformed.
  │
  ├── tenantGuard()
  │     Checks that the resource being accessed belongs to the tenant
  │     identified in the JWT's tenantId claim.
  │     Returns 404 (not 403) if the resource belongs to a different tenant.
  │     See 02c-IDOR-AND-CORS.md for why 404 is used.
  │
  └── requirePermission(permissionString)
        Checks that the JWT's permissions[] claim includes the required permission.
        Returns 403 if the user lacks the required permission.
```

This chain is applied consistently across all backend services. The browser can rely on these being the only auth-related error responses it will receive from any API.

---

## Error Shapes the Browser Handles

All backend services in the Keystone platform use a consistent error response envelope:

```typescript
// The error shape returned by all backend services on 4xx/5xx responses

interface ApiErrorResponse {
  error: string;          // Machine-readable error code, e.g. "UNAUTHORIZED", "FORBIDDEN"
  message: string;        // Human-readable description (safe to log, do not display to end users)
  requestId?: string;     // Trace ID for log correlation (X-Request-ID header value)
  details?: unknown;      // Optional structured details (validation errors, etc.)
}
```

### 401 Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Token is expired or invalid.",
  "requestId": "req_01hw..."
}
```

**Trigger:** `authenticate()` middleware found the token invalid, expired, missing, or malformed.

**Browser handling:** `createApiClient` catches this, attempts one silent refresh via `POST /auth/refresh`, and retries the original request once. If the refresh fails, the user is redirected to `/login`.

### 403 Forbidden

```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to perform this action.",
  "requestId": "req_01hw..."
}
```

**Trigger:** `requirePermission()` middleware found the user lacks the required permission for the requested operation.

**Browser handling:** `createApiClient` throws `PermissionError`. The calling code is responsible for handling it — typically by showing an inline error state or redirecting to a 403 page. The browser does not retry a 403.

### 404 Not Found

```json
{
  "error": "NOT_FOUND",
  "message": "The requested resource was not found.",
  "requestId": "req_01hw..."
}
```

**Trigger:** Either (a) a genuine resource does not exist, or (b) `tenantGuard()` detected that the resource exists but belongs to a different tenant — **the two cases are intentionally indistinguishable from the browser's perspective.** See [02c-IDOR-AND-CORS.md](./02c-IDOR-AND-CORS.md).

**Browser handling:** `createApiClient` throws `NotFoundError`. The calling code renders a "not found" state. The browser does not retry a 404.

---

## `createApiClient` Error Mapping

```typescript
// src/lib/apiClient.ts

export class PermissionError extends Error {
  readonly status = 403;
  readonly requestId?: string;

  constructor(url: string, requestId?: string) {
    super(`Forbidden: ${url}`);
    this.name = 'PermissionError';
    this.requestId = requestId;
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  readonly requestId?: string;

  constructor(url: string, requestId?: string) {
    super(`Not found: ${url}`);
    this.name = 'NotFoundError';
    this.requestId = requestId;
  }
}

export class AuthError extends Error {
  readonly status: 401 | 0;  // 0 = network error during refresh
  constructor(message: string, status: 401 | 0 = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorResponse, url: string) {
    super(`API error ${status}: ${body.message} (${url})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error;
    this.requestId = body.requestId;
  }
}

async function handleResponse<T>(res: Response, url: string): Promise<T> {
  const requestId = res.headers.get('X-Request-ID') ?? undefined;

  if (res.status === 403) throw new PermissionError(url, requestId);
  if (res.status === 404) throw new NotFoundError(url, requestId);

  if (!res.ok) {
    let body: ApiErrorResponse = { error: 'UNKNOWN', message: res.statusText };
    try { body = await res.json(); } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, body, url);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
```

---

## 401 Retry Flow: Sequence

```
createApiClient('GET /v1/quotations')
  │
  ├─ Attach: Authorization: Bearer <token>
  ├─ fetch()
  └─ res.status === 401
        │
        └─ refreshAccessToken()
              │
              ├─ POST /auth/refresh (HttpOnly cookie auto-attached)
              │
              ├─ 200 OK: new accessToken
              │     ├─ authStore.setToken(newToken)
              │     └─ retry: createApiClient('GET /v1/quotations', retryOnUnauthorized=false)
              │
              └─ 401 / 500 / network error:
                    ├─ authStore.clearToken()
                    ├─ BroadcastChannel: LOGOUT (signals other tabs)
                    └─ window.location.href = '/login'
```

**One retry only.** After a successful refresh, the original request is retried exactly once with `retryOnUnauthorized = false`. If the retry also returns 401 (which should not happen in normal operation), it is thrown as an `AuthError` without further retrying. This prevents infinite loops if the backend is returning 401 for reasons unrelated to token expiry.

---

## What the Browser Must Not Do

- **Never inspect the JWT signature or trust it for security decisions.** The signature is verified by the backend. The browser reads claims only.
- **Never cache permission decisions client-side beyond the current session.** `permissions[]` is reloaded on every token refresh.
- **Never show different UI based on assumed role strings without reading `permissions[]`.** A user's role may have been changed on the backend; the next token refresh will reflect the new permissions.
- **Never re-implement the `tenantGuard` logic.** The browser does not know which tenant a resource belongs to from the resource ID alone. It relies on the backend to return 404 for cross-tenant access.
