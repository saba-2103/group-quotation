# 09 — API routes

This document covers the API layer — mock routes for local development, proxy patterns to a real backend, error envelope conventions, and response shapes the framework expects.

---

## The two modes

1. **Mock mode (local dev, demo).** Routes under `src/app/api/...` serve fixture data via Next.js route handlers. Used for fast iteration and design demos.
2. **Proxy mode (real backend).** A catch-all route forwards `/api/v1/*` (or similar prefix) to an external backend. Used for QA and production.

Most modules use mock mode in local dev and switch to proxy mode when the real backend is deployed. The schema doesn't change — only the route file does.

---

## Mock route conventions

### Basic structure

A mock route is a TypeScript file exporting one or more HTTP method handlers:

**`src/app/api/v1/claims/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { claimsData } from './fixtures';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let filtered = [...claimsData];

  // Apply query-param filters
  const stateFilter = searchParams.get('state');
  if (stateFilter) {
    filtered = filtered.filter(c => c.state === stateFilter);
  }

  return NextResponse.json({
    items: filtered,
    total: filtered.length
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newClaim = {
    ...body,
    claim_id: `C-${Date.now()}`,
    state: 'FNOL_SUBMITTED',
    created_at: new Date().toISOString()
  };
  claimsData.push(newClaim);
  return NextResponse.json(newClaim, { status: 201 });
}
```

### Single-entity routes

**`src/app/api/v1/claims/[id]/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { claimsData } from '../fixtures';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = claimsData.find(c => c.claim_id === id);
  if (!claim) {
    return NextResponse.json(
      { status: 404, error: 'Not Found', message: `Claim ${id} not found` },
      { status: 404 }
    );
  }
  return NextResponse.json(claim);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const idx = claimsData.findIndex(c => c.claim_id === id);
  if (idx === -1) return NextResponse.json({ status: 404, message: 'Not found' }, { status: 404 });
  claimsData[idx] = { ...claimsData[idx], ...body, updated_at: new Date().toISOString() };
  return NextResponse.json(claimsData[idx]);
}
```

### Action endpoints

For mutations that change entity state (triage, approve, withdraw):

**`src/app/api/v1/claims/[id]/triage/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { claimsData } from '../../fixtures';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = claimsData.find(c => c.claim_id === id);
  if (!claim) return NextResponse.json({ status: 404, message: 'Not found' }, { status: 404 });

  if (claim.state !== 'FNOL_SUBMITTED') {
    return NextResponse.json(
      { status: 400, message: `Cannot triage from state ${claim.state}` },
      { status: 400 }
    );
  }

  claim.state = 'TRIAGED';
  claim.updated_at = new Date().toISOString();
  return NextResponse.json(claim);
}
```

---

## Catch-all proxy routes

When the real backend is deployed, replace the mock routes with a catch-all proxy:

**`src/app/api/v1/[[...path]]/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = `${process.env.BACKEND_URL ?? 'https://api.example.com'}/api/v1`;

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handleProxy(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const pathString = path?.join('/') ?? '';
  const search = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_BASE_URL}/${pathString}${search ? `?${search}` : ''}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  // Forward selected headers
  const passthrough = ['x-user-id', 'x-roles', 'x-tenant-id', 'x-correlation-id'];
  passthrough.forEach(h => {
    const val = request.headers.get(h);
    if (val) headers[h] = val;
  });

  const opts: RequestInit = { method: request.method, headers };
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const text = await request.text();
    if (text) opts.body = text;
  }

  try {
    const res = await fetch(targetUrl, opts);
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const text = await res.text();
    if (!text) return new NextResponse(null, { status: res.status });
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Proxy failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) { return handleProxy(req, ctx); }
export async function POST(req: NextRequest, ctx: RouteContext) { return handleProxy(req, ctx); }
export async function PUT(req: NextRequest, ctx: RouteContext) { return handleProxy(req, ctx); }
export async function PATCH(req: NextRequest, ctx: RouteContext) { return handleProxy(req, ctx); }
export async function DELETE(req: NextRequest, ctx: RouteContext) { return handleProxy(req, ctx); }
```

⚠️ **Mock routes and the catch-all proxy can't coexist easily.** A more-specific mock route under `/api/v1/foo/route.ts` will shadow the catch-all for that path; but a less-specific catch-all may shadow mock routes depending on Next.js resolution. Pick one mode per module, or scope the catch-all (e.g., `/api/v2/[[...path]]` for claims while quotes uses `/api/v1/quotes/...` mocks).

---

## Response shape conventions

### List endpoints

**Option A — bare array (preferred for simple cases):**

```json
[
  { "id": "1", "name": "..." },
  { "id": "2", "name": "..." }
]
```

The data-table consumes this directly (no `valueKey` needed).

**Option B — enveloped (when you need pagination metadata):**

```json
{
  "items": [...],
  "total": 1234,
  "page": 1,
  "pageSize": 20
}
```

Schema sets `dataSource.valueKey: "items"`.

### Single entity

A bare object:

```json
{
  "claim_id": "C-001",
  "claim_no": "MOT-12345",
  "state": "TRIAGED",
  "claimed_amount": 50000,
  "created_at": "2026-05-22T10:30:00Z"
}
```

### Error responses

**Standard V1 shape (Spring default):**

```json
{
  "timestamp": "2026-05-22T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/claims"
}
```

`useActionHandler` reads `message` first, falls back to `error`. Toast displays whatever wins.

**Field-level errors (legacy `backendErrors` shape):**

```json
{
  "backendErrors": [
    { "variable_code": "claim_no", "error_code": "DUPLICATE", "error_desc": "Already exists" }
  ]
}
```

Forms map `variable_code` to field `name` for inline display.

⚠️ For new endpoints, return both shapes when possible — top-level `message` for the toast, `backendErrors` array for field-level details.

---

## Naming conventions

| Pattern | Use for |
|---------|---------|
| `/api/v1/<resource>` GET | List the resource |
| `/api/v1/<resource>` POST | Create a new instance |
| `/api/v1/<resource>/:id` GET | Read one |
| `/api/v1/<resource>/:id` PATCH | Partial update |
| `/api/v1/<resource>/:id` PUT | Full replace |
| `/api/v1/<resource>/:id` DELETE | Delete |
| `/api/v1/<resource>/:id/<action>` POST | Action verb (triage, approve, withdraw) |
| `/api/v1/<resource>/:id/<subresource>` GET | Related subresource |

Use snake_case for path segments (`claim-actions` not `claimActions`), and prefer plural resources (`claims` not `claim`).

---

## Date formats

Use ISO 8601 strings everywhere:

- Date only: `"2026-05-22"`
- Date + time: `"2026-05-22T10:30:00Z"` (UTC) or `"2026-05-22T16:00:00+05:30"`

The framework's `date` field type and `DateDisplay` widget parse these. Don't use Unix timestamps, Excel serial numbers, or DD/MM/YYYY strings — they'll render wrong.

---

## Currency

Numbers, not strings:

```json
{ "claimed_amount": 50000 }
```

The `currency` field type and `CellRenderer` format via `Intl.NumberFormat` (locale-aware). Don't pre-format on the backend; let the renderer handle display.

---

## Booleans

Native booleans:

```json
{ "is_active": true }
```

Some legacy fields ship booleans as strings (`"true"` / `"false"`). The `badge` field type with `valueMapping` handles both — `String(value) === mapping.value` covers both shapes.

---

## Auth headers

The framework forwards selected headers from the browser to the backend via the proxy. The standard set:

| Header | Purpose |
|--------|---------|
| `X-User-Id` | Acting user (from role mapping) |
| `X-Roles` | Comma-separated role list |
| `X-Tenant-Id` | Tenant scope |
| `X-Correlation-Id` | For request tracing |
| `If-Match` / `X-Expected-Version` | Optimistic locking |

Today (V1), there's no real auth — these headers are populated client-side from the active role via `CLAIMS_ROLE_HEADER_MAP` or similar mapping. When real auth lands, the mapping is replaced with token-based identity.

⚠️ Header injection logic lives in two places: `useSmartQuery` and `useActionHandler`. If you add a new auth scheme, you have to update both. Long-term these should consolidate into a single header-injection point.

---

## CORS and cookies

For local dev hitting `localhost:3000` for both UI and API, CORS is moot. When proxying to a real backend:

- Cookies aren't forwarded by default — the proxy only sets headers it's told to forward.
- CORS preflight is handled by the proxy if needed (`OPTIONS` handler), but Next.js usually doesn't require this for same-origin proxy routes.

For SSO and real auth, plan separately — the current proxy is a thin pass-through, not an auth gateway.

---

## Mock data conventions

### Where to put fixtures

```
src/app/api/v1/
├── claims/
│   ├── route.ts                 # GET (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts             # GET, PATCH, DELETE
│   │   ├── triage/route.ts      # Action endpoints
│   │   └── ...
│   └── fixtures.ts              # Mock data store (in-memory)
```

Or for shared fixtures across modules:

```
src/mocks/
├── claims-fixtures.ts
└── quotes-fixtures.ts
```

Either pattern works. The route files import from the fixtures.

### In-memory vs reset-on-reload

Fixtures are JavaScript module-level state — they persist across requests **within a dev server lifetime**, but reset on `npm run dev` restart. That means:

- POST creates persist for the session.
- Edits via PATCH persist.
- HMR (hot module reload) on the route file *might* reset the fixture array (depends on file changes). Don't rely on it.

For "always-fresh" demos, reset fixtures on each request or on a known endpoint:

```ts
// src/app/api/v1/admin/reset/route.ts
import { claimsData, resetClaims } from '../../claims/fixtures';

export async function POST() {
  resetClaims();
  return NextResponse.json({ ok: true });
}
```

### Simulating latency

For testing loading skeletons:

```ts
await new Promise(r => setTimeout(r, 800));
return NextResponse.json(data);
```

Don't ship this in committed code — wrap behind a `?slow=true` query param if needed.

### Simulating async transitions

For backend operations that take time to settle (e.g., claim assessment completing in the background):

```ts
let triagedAt: number | null = null;

export async function POST(/* triage */) {
  triagedAt = Date.now();
  return NextResponse.json({ ...claim, state: 'TRIAGED' });
}

export async function GET(/* get claim */) {
  let state = 'FNOL_SUBMITTED';
  if (triagedAt) {
    state = Date.now() - triagedAt > 5000 ? 'ASSESSMENT_IN_PROGRESS' : 'TRIAGED';
  }
  return NextResponse.json({ ...claim, state });
}
```

Pair this with `pollSchedule + stopWhen` on the consuming widget — see [04-data-sources.md → Polling](04-data-sources.md#polling).

---

## Special-purpose endpoints

### `/api/config/app`

Returns the app's navigation and metadata. Fetched once by `<AppContextProvider>` on mount:

```json
{
  "title": "Group Insurance",
  "logo": { "icon": "Shield" },
  "navigation": {
    "menuItems": [
      { "id": "claims", "title": "Claims", "url": "/claims", "icon": "FileCheck" }
    ]
  }
}
```

Mock lives in `src/mocks/<app>/config/app-config-mock.ts`.

### `/api/forms/[id]`

Endpoint that returns a form schema by id. Used by overlaid forms when they need a fresh load instead of the bundled registry. Most cases use the registry — this endpoint is for rare dynamic forms.

---

## Common mistakes

1. **Returning wrong status codes.** A failed mutation returning 200 with `{ error: "..." }` confuses the action handler — it thinks success and shows the success toast. Use 4xx/5xx.

2. **Forgetting to handle 204.** Empty 200 bodies parse-fail in some clients. Use 204 No Content for write-without-response.

3. **Inconsistent ID fields.** One endpoint returns `id`, another returns `claim_id`. The data-table needs `rowIdKey` overridden, the row actions use `:id` or `:claim_id` — pick one shape and stick with it.

4. **Date strings that aren't ISO 8601.** `"22/05/2026"` doesn't parse correctly across locales. Always use ISO.

5. **Booleans as strings inconsistently.** Some fields `true`, some `"true"`. `valueMapping` handles both via `String(value)`, but other consumers might not. Normalise.

6. **Catch-all proxy left in place when adding a specific mock.** The proxy wins for paths it covers; your mock never runs. Either remove the proxy for that path or scope it (e.g., proxy `/api/v2/*` only).

7. **Mutating fixture objects in place across requests.** `claimsData[idx] = { ...claimsData[idx], ...body }` is fine. `claimsData[idx].state = "..."` works but mutates the import — subtle bugs if other modules import the same data.

---

**Next:** [10-design-system.md](10-design-system.md) — tokens, Tailwind, theming.
