# Layer 2 — Auth and Security

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Layer:** 2 of 6  

---

## Overview

Auth is implemented by the backend team using a shared platform middleware package. This document does not re-specify backend JWT validation, tenant guard logic, or permission checking — those are owned by the backend and documented in the platform middleware package.

This document covers what the **browser relies on**: the JWT contract it receives, how it holds and uses the access token, how `createApiClient` handles authentication transparently, and the CORS and IDOR patterns that the frontend must understand to operate correctly.

---

## What the Browser Receives

On successful login, the backend auth service provides:

1. **Access token (JWT):** Returned in the login response body. Short-lived (~15 minutes). The browser stores this **in memory only** — never in `localStorage`, `sessionStorage`, or a cookie accessible to JavaScript. XSS cannot read it.

2. **Refresh token:** Set by the server as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. The browser cannot read it via JavaScript. It is automatically sent on requests to the `/auth/refresh` endpoint.

3. **JWT claims:** The access token payload contains the claims that drive the entire browser context: `tenantId`, `role`, `lob`, `locale`, `portalType`, `permissions[]`. See [02a-JWT-CLAIMS-CONTRACT.md](./02a-JWT-CLAIMS-CONTRACT.md) for the full interface.

---

## JWT Lifecycle in the Browser

```
Login
  │
  ├─ POST /auth/login → { accessToken, user }
  │
  ├─ authStore.setToken(accessToken)  ← in-memory only
  │
  ├─ AppContext populated from decoded JWT claims
  │
  └─ Refresh token set as HttpOnly cookie by server (not handled in JS)

During session (every API call)
  │
  ├─ createApiClient attaches: Authorization: Bearer {accessToken}
  │
  └─ If 401 received:
        └─ Silent refresh: POST /auth/refresh (uses HttpOnly cookie automatically)
              ├─ Success: new accessToken stored in memory, original request retried
              └─ Failure: authStore.clearToken(), redirect to /login

Access token expiry (15 min)
  │
  └─ authStore detects exp approaching (e.g. within 2 min)
        └─ Proactive silent refresh before token expires
              (avoids 401 on in-flight requests)

Page reload
  │
  └─ In-memory token is gone
        └─ App bootstraps: POST /auth/refresh (HttpOnly cookie present)
              ├─ Success: new accessToken in memory, session restored
              └─ Failure (cookie expired after 7 days): redirect to /login
```

---

## `createApiClient` Overview

All HTTP requests to backend APIs go through `createApiClient`. It is the single place where:
- The Bearer token is attached to requests.
- 401 responses trigger a silent token refresh.
- After a successful refresh, the original request is retried once.
- 403 and 404 errors are mapped to typed errors that the calling code can handle.

```typescript
// src/lib/apiClient.ts  (abbreviated — full implementation in the source file)

import { useAuthStore } from './authStore';

class PermissionError extends Error { constructor(msg: string) { super(msg); this.name = 'PermissionError'; } }
class NotFoundError   extends Error { constructor(msg: string) { super(msg); this.name = 'NotFoundError';   } }
class AuthError       extends Error { constructor(msg: string) { super(msg); this.name = 'AuthError';       } }

async function refreshAccessToken(): Promise<string> {
  // POST /auth/refresh — HttpOnly refresh cookie is sent automatically by browser
  const res = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new AuthError('Refresh token expired or invalid');
  const { accessToken } = await res.json();
  useAuthStore.getState().setToken(accessToken);
  return accessToken;
}

export async function createApiClient<T>(
  url: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const token = useAuthStore.getState().getToken();

  const res = await fetch(url, {
    ...options,
    credentials: 'include',  // ensures HttpOnly cookie is sent on same-origin requests
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401 && retryOnUnauthorized) {
    // Attempt silent refresh once, then retry the original request
    try {
      await refreshAccessToken();
    } catch {
      useAuthStore.getState().clearToken();
      window.location.href = '/login';
      throw new AuthError('Session expired. Redirecting to login.');
    }
    return createApiClient<T>(url, options, false /* no further retries */);
  }

  if (res.status === 403) {
    throw new PermissionError(`Forbidden: ${url}`);
  }

  if (res.status === 404) {
    // May be a genuine not-found OR a cross-tenant IDOR 404.
    // From the browser's perspective, these are indistinguishable — correct behaviour.
    throw new NotFoundError(`Not found: ${url}`);
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}
```

Full error handling contract is in [02b-BACKEND-JWT-VALIDATION.md](./02b-BACKEND-JWT-VALIDATION.md).

---

## AppContext Population

On login (and on refresh-based session restore), the JWT claims are decoded and loaded into `AppContext`:

```typescript
// src/lib/appContext.ts  (abbreviated)

import { decodeJwt } from './jwt';
import type { AppContext } from '@/types/auth';

export function buildAppContext(accessToken: string): AppContext {
  const claims = decodeJwt(accessToken); // decode, no verify — browser trusts server
  return {
    userId:     claims.sub,
    tenantId:   claims.tenantId,
    role:       claims.role,
    lob:        claims.lob       ?? null,
    locale:     claims.locale    ?? 'en-GB',
    portalType: claims.portalType ?? 'broker',
    permissions: claims.permissions ?? [],
  };
}
```

`AppContext` drives:
- Which views are rendered (route guards check `permissions[]`).
- Which `viewId`s `useViewMetadata` requests (LOB-specific views are selected from context).
- The schema resolution context passed to the edge function via the JWT.

`AppContext` does **not** drive action capabilities (`canApprove`, `canIssue`, etc.). Those come from the workflow contract returned by the orchestration API. See ARCHITECTURE.md Layer B.

---

## CORS

CORS is configured by the backend platform middleware package. The browser does not configure CORS. The frontend origin is whitelisted by the backend — no action required on the frontend side beyond using `credentials: 'include'` on same-origin API requests.

If a backend service is not covered by the shared middleware (e.g. a new service added by a team that hasn't onboarded the middleware), the browser will see a CORS error. The resolution is to add the shared middleware to that service, not to add an exception in the frontend.

Full CORS and IDOR documentation is in [02c-IDOR-AND-CORS.md](./02c-IDOR-AND-CORS.md).

---

## Action Capabilities Are Backend-Evaluated

The browser must never derive action authority from browser-held config, schema fields, or role strings in the JWT. Action capabilities (`canApprove`, `canIssue`, `canPost`, `canSettle`, etc.) are:

1. Evaluated by the orchestration backend based on current workflow state, role, permissions, and business rules.
2. Returned in the bootstrap response as part of the workflow contract.
3. Used by the browser to show or hide action buttons — nothing more.

A button that is hidden because `canApprove: false` still cannot be invoked via a direct API call — the backend enforces the permission independently. The browser capability flags are a UX affordance, not a security boundary.

---

## Security Rules for Browser Code

These rules apply to all browser code in this codebase. They are not guidelines — they are constraints:

| Rule | Rationale |
|---|---|
| Never write the access token to `localStorage` or `sessionStorage` | XSS can read these. In-memory storage is wiped on tab close. |
| Never write the access token to a non-HttpOnly cookie | Same as above — JavaScript can read document.cookie. |
| Never log the access token to the console | Console output may be captured by error monitoring tools. |
| Never expose the access token to third-party scripts | Third-party scripts run in the same origin; use CSP to restrict what scripts can execute. |
| Always use `createApiClient` for authenticated requests | Manual `fetch` calls bypass the 401 refresh flow and token attachment. |
| Never include token in URL query parameters | URLs are logged by servers, CDNs, and browser history. |
| Never derive security decisions from schema fields | Schema is a display contract, not a security boundary. |

---

## Child Documents

| Document | Content |
|---|---|
| [02a-JWT-CLAIMS-CONTRACT.md](./02a-JWT-CLAIMS-CONTRACT.md) | JWT shape, AppContext population, access/refresh token lifecycle, silent refresh flow |
| [02b-BACKEND-JWT-VALIDATION.md](./02b-BACKEND-JWT-VALIDATION.md) | Backend middleware overview, error shapes the browser handles, `createApiClient` error mapping |
| [02c-IDOR-AND-CORS.md](./02c-IDOR-AND-CORS.md) | Why 404 for cross-tenant access, CORS config, pre-flight handling, storage rules |
