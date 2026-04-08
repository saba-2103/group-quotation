# 02a — JWT Claims Contract

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Parent doc:** [02-AUTH-AND-SECURITY.md](./02-AUTH-AND-SECURITY.md)  

---

## Overview

This document defines the JWT claims shape that the browser can rely on. It is a contract between the backend auth service and the browser. Changes to this shape require a coordinated release — the browser must be updated before or simultaneously with the backend change.

The browser decodes the JWT payload to read claims. It does not verify the signature — that is performed by every backend service using the shared platform middleware. The browser's decoded claims are used to populate `AppContext` and to drive schema resolution at the CDN edge.

---

## JWT Claims Interface

```typescript
// src/types/auth.ts

/**
 * The decoded payload of an access token issued by the Keystone auth service.
 * This is the contract the browser relies on. Do not add browser logic that
 * depends on claims not listed here without a corresponding backend change.
 */
export interface KeystoneJwtClaims {
  // Standard JWT claims
  sub:  string;   // User ID (UUID)
  iat:  number;   // Issued at (Unix timestamp)
  exp:  number;   // Expiry (Unix timestamp)
  iss:  string;   // Issuer, e.g. "keystone-auth.example.com"
  aud:  string;   // Audience, e.g. "keystone-api"

  // Keystone-specific claims
  tenantId:    string;    // The tenant this user belongs to, e.g. "gi", "zurich"
  role:        string;    // The user's primary role, e.g. "underwriter", "broker", "admin"
  lob:         string | undefined;  // Line of business, e.g. "motor", "property". Absent if role is lob-agnostic (e.g. "admin")
  locale:      string | undefined;  // BCP 47 language tag, e.g. "en-GB", "de-DE". Absent → browser defaults to "en-GB"
  portalType:  string | undefined;  // Portal surface, e.g. "broker", "direct", "admin". Absent → defaults to "broker"
  permissions: string[];            // Flat list of permission strings, e.g. ["quotation:read", "quotation:approve"]
}

/**
 * The AppContext populated from JWT claims. This is the shape used throughout
 * the browser — never read JWT claims directly outside of the auth bootstrap.
 */
export interface AppContext {
  userId:      string;
  tenantId:    string;
  role:        string;
  lob:         string | null;
  locale:      string;          // always present after defaulting
  portalType:  string;          // always present after defaulting
  permissions: string[];
}
```

---

## Required vs Optional Claims

| Claim | Required | Default if absent |
|---|---|---|
| `sub` | Yes | — (400 if missing) |
| `iat` | Yes | — |
| `exp` | Yes | — |
| `iss` | Yes | — |
| `aud` | Yes | — |
| `tenantId` | Yes | — (400 if missing — browser cannot operate without tenant context) |
| `role` | Yes | — (400 if missing) |
| `lob` | No | `null` — user is lob-agnostic (e.g. admin, platform support) |
| `locale` | No | `"en-GB"` |
| `portalType` | No | `"broker"` |
| `permissions` | Yes (may be empty array) | `[]` |

If `tenantId` or `role` are absent, the auth bootstrap throws and redirects to login. The browser cannot construct a valid `AppContext` or request a schema without these.

---

## AppContext Population

`AppContext` is populated once at login and once at each session restore (page reload with valid refresh cookie). It is stored in a React context and accessed via `useAppContext()`.

```typescript
// src/lib/auth.ts

import { decodeJwt } from './jwt';
import type { KeystoneJwtClaims, AppContext } from '@/types/auth';

/**
 * Decodes the access token and builds AppContext.
 * Throws if required claims are absent.
 */
export function buildAppContext(accessToken: string): AppContext {
  const claims = decodeJwt(accessToken) as KeystoneJwtClaims;

  if (!claims.tenantId || !claims.role) {
    throw new Error('JWT missing required claims: tenantId and role are mandatory');
  }

  return {
    userId:      claims.sub,
    tenantId:    claims.tenantId,
    role:        claims.role,
    lob:         claims.lob        ?? null,
    locale:      claims.locale     ?? 'en-GB',
    portalType:  claims.portalType ?? 'broker',
    permissions: claims.permissions ?? [],
  };
}

/**
 * Minimal JWT decode (no signature verification).
 * The browser trusts the server to issue valid JWTs;
 * signature validation is enforced by all backend services.
 */
function decodeJwt(token: string): unknown {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded));
}
```

---

## Token Lifetimes

| Token | Storage | Lifetime | Notes |
|---|---|---|---|
| Access token (JWT) | In-memory (`authStore`) | 15 minutes | Lost on page reload; recovered via refresh |
| Refresh token | HttpOnly cookie | 7 days | Sent automatically by browser; not readable by JS |

The 15-minute access token lifetime is short enough to limit the exposure window if a token were somehow intercepted. The 7-day refresh token lifetime provides a reasonable "stay logged in" experience for daily users without requiring re-authentication each morning.

---

## Silent Refresh Flow

The browser proactively refreshes the access token before it expires. This prevents in-flight API requests from hitting a 401 mid-session.

```typescript
// src/lib/authStore.ts  (Zustand store)

import { create } from 'zustand';
import { buildAppContext } from './auth';

const REFRESH_BUFFER_MS = 2 * 60 * 1000; // refresh 2 minutes before expiry

interface AuthState {
  accessToken: string | null;
  appContext:  AppContext | null;
  expiresAt:   number | null;  // Unix ms
  refreshTimer: ReturnType<typeof setTimeout> | null;

  setToken:   (token: string) => void;
  clearToken: () => void;
  getToken:   () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken:  null,
  appContext:   null,
  expiresAt:    null,
  refreshTimer: null,

  setToken: (token: string) => {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const expiresAt = claims.exp * 1000; // convert to ms
    const appContext = buildAppContext(token);

    // Cancel any existing refresh timer
    const existing = get().refreshTimer;
    if (existing) clearTimeout(existing);

    // Schedule proactive refresh
    const msUntilRefresh = expiresAt - Date.now() - REFRESH_BUFFER_MS;
    const refreshTimer = msUntilRefresh > 0
      ? setTimeout(() => silentRefresh(), msUntilRefresh)
      : null;

    set({ accessToken: token, appContext, expiresAt, refreshTimer });
  },

  clearToken: () => {
    const existing = get().refreshTimer;
    if (existing) clearTimeout(existing);
    set({ accessToken: null, appContext: null, expiresAt: null, refreshTimer: null });
  },

  getToken: () => get().accessToken,
}));

async function silentRefresh(): Promise<void> {
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include', // sends HttpOnly cookie
    });
    if (!res.ok) throw new Error('Refresh failed');
    const { accessToken } = await res.json();
    useAuthStore.getState().setToken(accessToken);
  } catch {
    // Silent refresh failed — do not redirect yet.
    // The next API call will get a 401 and trigger the createApiClient
    // error handler, which will attempt one more refresh before redirecting.
    useAuthStore.getState().clearToken();
  }
}
```

---

## Page Reload: Session Restore

On every page load, the app bootstraps by attempting a silent refresh using the HttpOnly cookie:

```typescript
// src/app/bootstrap.ts  (called from root app component)

export async function bootstrapSession(): Promise<boolean> {
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;  // refresh cookie expired or absent

    const { accessToken } = await res.json();
    useAuthStore.getState().setToken(accessToken);
    return true;
  } catch {
    return false;
  }
}
```

If `bootstrapSession()` returns false, the app redirects to `/login`. The user is not shown any intermediate state — the login redirect is immediate.

---

## What Happens if Refresh Fails

| Scenario | Token state | Browser action |
|---|---|---|
| Refresh succeeds | New token in memory, new timer scheduled | Continue normally |
| Refresh returns 401 (cookie expired or revoked) | Token cleared | Redirect to `/login` |
| Refresh returns 500 (server error) | Token cleared | Redirect to `/login` with `?error=server` |
| Refresh network error (offline) | Token cleared if expired; kept if still valid | If token valid: continue (short offline tolerance). If expired: redirect to `/login` |
| User logs out on another tab | HttpOnly cookie deleted by server-side logout | Next refresh attempt fails; redirect to `/login` |

**Logout across tabs:** The browser cannot directly observe `HttpOnly` cookie deletion. The next proactive refresh attempt (within 13 minutes for a 15-minute token, triggered 2 minutes before expiry) will fail and redirect to login. For immediate cross-tab logout, the app uses a `BroadcastChannel`:

```typescript
// In the logout handler:
const logoutChannel = new BroadcastChannel('keystone-logout');
logoutChannel.postMessage({ type: 'LOGOUT' });

// In every tab (initialised at app start):
const channel = new BroadcastChannel('keystone-logout');
channel.onmessage = (event) => {
  if (event.data.type === 'LOGOUT') {
    useAuthStore.getState().clearToken();
    window.location.href = '/login';
  }
};
```

---

## Permissions Checking

The `permissions[]` claim contains a flat list of permission strings. Route guards and component-level guards use `hasPermission()`:

```typescript
// src/lib/permissions.ts

export function hasPermission(ctx: AppContext, permission: string): boolean {
  return ctx.permissions.includes(permission);
}

// Usage in a route guard:
if (!hasPermission(appContext, 'quotation:approve')) {
  return <Forbidden />;
}
```

**Permission strings are additive.** A user either has a permission or does not. There is no negation. Role-based defaults are managed by the backend — the browser only checks presence in the `permissions[]` array.

**Permissions are a UX gate only.** The backend enforces all permissions independently via `requirePermission` middleware. A user who calls an API endpoint without the required permission will receive a 403 regardless of what `permissions[]` claims the browser has cached.
