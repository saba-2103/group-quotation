# 02c — IDOR Prevention and CORS

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Parent doc:** [02-AUTH-AND-SECURITY.md](./02-AUTH-AND-SECURITY.md)  

---

## Overview

This document covers two related security contracts between the browser and the backend:

1. **IDOR prevention:** Why the backend returns 404 (not 403) for cross-tenant resource access, and what this means for browser error handling.
2. **CORS:** How CORS is configured, who configures it, and what the browser must and must not do.

---

## IDOR Prevention: 404 for Cross-Tenant Access

### What IDOR is

Insecure Direct Object Reference (IDOR) is a class of vulnerability where an attacker manipulates a resource identifier (URL path, query parameter, request body ID) to access resources belonging to another user or tenant.

In a multi-tenant system, the simplest IDOR vector is guessing or enumerating resource IDs and observing the response code:

- `GET /v1/quotations/q-001` → 403 Forbidden  
  → Attacker infers: `q-001` exists, but belongs to a different tenant. Now they know a competitor's quotation reference exists.

- `GET /v1/quotations/q-002` → 404 Not Found  
  → Attacker infers: `q-002` does not exist.

By returning 403 for cross-tenant access, the backend leaks information about **resource existence across tenant boundaries**.

### Why 404 is the Correct Response

The backend platform middleware's `tenantGuard()` returns **404, not 403**, when a resource exists but belongs to a different tenant. From the attacker's perspective:

- `GET /v1/quotations/q-001` → 404 Not Found  
  → Attacker cannot distinguish between "doesn't exist" and "exists but you can't see it."

This is the standard defence against IDOR existence probing. It is often called "IDOR-safe 404" or "security through ambiguity at the existence level."

### What the Browser Does

The browser treats all 404 responses as "resource not found." It does not and cannot distinguish between:
- A resource that genuinely does not exist.
- A resource that exists but belongs to a different tenant.

This is the correct behaviour. The browser should never need to make this distinction. `NotFoundError` is thrown by `createApiClient` in both cases, and the view renders a standard "not found" state.

```typescript
// This is the correct pattern — treat 404 uniformly:
try {
  const quotation = await createApiClient<Quotation>(`/v1/quotations/${id}`);
  renderQuotation(quotation);
} catch (err) {
  if (err instanceof NotFoundError) {
    renderNotFound();  // Could be missing OR cross-tenant — correct either way
    return;
  }
  throw err;
}

// This is WRONG — do not speculate about the reason for 404:
catch (err) {
  if (err instanceof NotFoundError) {
    // Do NOT: "Maybe it belongs to another tenant? Try fetching from admin endpoint..."
    // Do NOT: Log "cross-tenant access attempted" — you cannot know
    renderNotFound();
  }
}
```

### Practical Implication for Deep Links and Bookmarks

A user who bookmarks a quotation URL and later has their tenant changed (or whose account is deactivated) will see a "not found" page rather than an "access denied" page. This is intentional — it reveals less information and is consistent with the 404-for-cross-tenant policy.

If the application needs to differentiate "not found" from "you used to have access," it must do so through application-level mechanisms (e.g. a user-specific history API), not by probing for 403 vs 404.

---

## CORS Configuration

### Who Configures CORS

CORS is configured **entirely by the backend team** via the shared platform middleware package. Every backend service that serves the Keystone UI frontend applies the same CORS middleware from this package. The frontend team does not configure CORS headers.

This centralised approach ensures:
- A new backend service automatically gets the correct CORS headers when it adopts the platform middleware.
- The allowed origin list is maintained in one place.
- CORS misconfigurations at the service level (e.g. `Access-Control-Allow-Origin: *` leaking onto authenticated endpoints) are caught at the middleware level, not per-route.

### Whitelisted Frontend Origins

The platform middleware whitelists the Keystone UI frontend origin(s). The exact values are managed as environment configuration in the backend deployment. The browser team should expect these origins to be included:

| Environment | Origin |
|---|---|
| Production | `https://keystone.example.com` |
| Staging | `https://keystone-staging.example.com` |
| PR preview | `https://keystone-pr-{number}.example.com` (wildcard pattern, if platform supports it) |
| Local development | `http://localhost:5173` (or configured dev port) |

**The frontend team does not need to configure this list.** If a new environment needs CORS access, the backend deployment configuration is updated — not the frontend.

### CORS Response Headers

On a valid cross-origin request, the backend returns:

```
Access-Control-Allow-Origin: https://keystone.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Request-ID
Access-Control-Expose-Headers: X-Request-ID
```

**`Access-Control-Allow-Credentials: true`** is required because `createApiClient` uses `credentials: 'include'` to ensure the `HttpOnly` refresh token cookie is sent on requests to the auth service. Without this header, the browser will block credentialed cross-origin requests.

**`Access-Control-Allow-Origin` must be a specific origin, not `*`**, when `credentials: true` is set. This is enforced by the browser — a wildcard origin with credentials is rejected.

### Pre-flight Request Handling (OPTIONS)

For requests that trigger a CORS pre-flight (e.g. `POST` with `Content-Type: application/json`, requests with `Authorization` header), the browser sends an `OPTIONS` request before the actual request.

The backend platform middleware handles `OPTIONS` requests automatically, responding with:

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://keystone.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Request-ID
Access-Control-Max-Age: 86400
```

**`Access-Control-Max-Age: 86400`** (24 hours) caches the pre-flight result in the browser, reducing the number of round trips for repeated same-type requests to the same endpoint.

The frontend does not need to implement any pre-flight handling — the browser manages this automatically. If a pre-flight fails (the backend is not configured with the platform middleware, or the middleware is misconfigured), the browser will log a CORS error and the actual request will be blocked. The fix is always on the backend.

### CORS and the Cloudflare Worker

The Schema Resolution Worker (Layer 1) serves responses on the same origin as the frontend (`/schemas/*` path). These are same-origin requests from the browser's perspective — CORS does not apply. The Worker does not set CORS headers.

If the Worker is ever deployed on a separate subdomain (e.g. `https://schemas.keystone.example.com`), CORS headers must be added to the Worker responses. This is a deployment change that requires frontend team coordination.

---

## What the Browser Must Not Do

These are hard rules for all frontend code in this repository.

### Token Storage

| Rule | Reason |
|---|---|
| Never store the access token in `localStorage` | Readable by any JavaScript on the page, including third-party scripts and XSS payloads |
| Never store the access token in `sessionStorage` | Same reason as `localStorage` — accessible to JavaScript |
| Never store the access token in a cookie set by JavaScript (`document.cookie`) | JavaScript-readable; same exposure as localStorage |
| Never store the access token in a non-HttpOnly cookie | Same reason |
| The refresh token must only exist as an HttpOnly cookie set by the backend | The browser cannot set or read it; the server controls its lifecycle |

**In-memory storage is the only acceptable location for the access token.** The `authStore` (Zustand) holds it in module-level state. It is lost on page reload — session restore via the HttpOnly cookie handles this case.

### Third-Party Script Isolation

| Rule | Reason |
|---|---|
| Never pass the access token to third-party analytics, monitoring, or error reporting scripts | Any SDK that receives the token can exfiltrate it |
| Never include the access token in error report payloads | Error reports are sent to third-party services (e.g. Sentry) which are outside the trust boundary |
| Never include the access token in `fetch` calls to third-party URLs | The Authorization header would be sent to an external origin |

**Practical application:** When configuring error monitoring (e.g. Sentry), ensure that request breadcrumbs do not capture the `Authorization` header. This should be configured in the Sentry `beforeSend` hook:

```typescript
Sentry.init({
  // ...
  beforeSend(event) {
    // Scrub Authorization headers from all request breadcrumbs
    if (event.breadcrumbs?.values) {
      event.breadcrumbs.values.forEach((breadcrumb) => {
        if (breadcrumb.data?.['Authorization']) {
          breadcrumb.data['Authorization'] = '[Filtered]';
        }
      });
    }
    return event;
  },
});
```

### URL Parameters

Never include the access token, any part of a JWT, or any other credential in a URL query parameter or path segment. URLs are:
- Logged by CDN access logs, server access logs, and browser history.
- Sent in the `Referer` header to third-party requests on the same page.
- Visible in browser developer tools network panels that may be shared in bug reports.

```typescript
// WRONG
fetch(`/v1/quotations?token=${accessToken}`);

// CORRECT — token goes in Authorization header only
fetch('/v1/quotations', { headers: { Authorization: `Bearer ${accessToken}` } });
```

### Content Security Policy

A Content Security Policy (CSP) should be set to restrict what third-party scripts can execute on the page. This is the final defence against an XSS payload that attempts to read the in-memory access token. CSP configuration is a deployment concern (set via response headers from the CDN or a meta tag) but the frontend team owns the policy values.

Minimum recommended directives for Keystone UI:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  connect-src 'self' https://api.keystone.example.com;
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
```

`script-src 'self'` prevents inline script injection and third-party script loading — the most direct XSS vector against an in-memory token.
