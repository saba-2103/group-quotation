# 01a — Cloudflare Worker: Schema Resolution Worker

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Parent doc:** [01-EDGE-SCHEMA-RESOLUTION.md](./01-EDGE-SCHEMA-RESOLUTION.md)  

---

## Overview

The Schema Resolution Worker is a Cloudflare Worker co-deployed with the frontend. Its sole responsibility is to receive a schema request carrying a JWT, extract context from that JWT, locate and select the correct pre-materialised `resolved-schema.json` from S3, and return it with appropriate CDN cache headers.

The Worker does **not** validate JWT signatures. It does **not** assemble or transform schemas. It is a stateless selector that runs at the edge.

---

## Worker Entry Point

The Worker is written in TypeScript and uses Hono as a lightweight routing layer. Hono adds ~13KB to the Worker bundle and provides request/response helpers that keep the handler readable without obscuring the edge semantics.

```typescript
// workers/schema-resolver/src/index.ts

import { Hono } from 'hono';
import { decodeJwtClaims } from './jwt';
import { buildSchemaContext } from './context';
import { resolveSchema } from './resolver';
import { KvSchemaCache } from './kv-cache';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

app.get('/schemas/:viewId', async (c) => {
  const viewId = c.req.param('viewId');

  // 1. Extract JWT claims
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'INVALID_TOKEN', message: 'Authorization header missing.' }, 400);
  }
  const token = authHeader.slice(7);

  let claims: JwtClaims;
  try {
    claims = decodeJwtClaims(token);
  } catch {
    return c.json({ error: 'INVALID_TOKEN', message: 'JWT payload unreadable.' }, 400);
  }

  // 2. Build resolution context
  const ctx = buildSchemaContext(claims);

  // 3. Check KV hot cache
  const kv = new KvSchemaCache(c.env.SCHEMA_KV);
  const kvKey = kv.makeKey(viewId, ctx);
  const cached = await kv.get(kvKey);
  if (cached) {
    return c.json(cached, 200, {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Surrogate-Key': `schema-${viewId} tenant-${ctx.tenantId}`,
      'X-Cache-Source': 'kv',
    });
  }

  // 4. Resolve schema from S3/R2
  let schema: ResolvedSchema;
  try {
    schema = await resolveSchema(viewId, ctx, c.env);
  } catch (err) {
    if (err instanceof SchemaNotFoundError) {
      return c.json({ error: 'SCHEMA_NOT_FOUND', viewId, message: err.message }, 404);
    }
    // S3 / R2 error — let CDN stale-while-revalidate handle it if possible
    console.error('Schema resolution failed', { viewId, ctx, err });
    return c.json(
      { error: 'SCHEMA_UNAVAILABLE', viewId, message: 'Schema store temporarily unavailable.' },
      503,
      { 'Retry-After': '30' },
    );
  }

  // 5. Warm KV cache (fire-and-forget, do not block response)
  c.executionCtx.waitUntil(kv.set(kvKey, schema, { expirationTtl: 90 }));

  return c.json(schema, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'Surrogate-Key': `schema-${viewId} tenant-${ctx.tenantId}`,
    'Vary': 'Authorization',
    'X-Cache-Source': 'origin',
  });
});

export default app;
```

---

## Environment Bindings (`wrangler.toml`)

```toml
# workers/schema-resolver/wrangler.toml

name = "keystone-schema-resolver"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[r2_buckets]]
binding = "SCHEMA_BUCKET"   # R2 bucket — primary schema store
bucket_name = "keystone-resolved-schemas"

[[kv_namespaces]]
binding = "SCHEMA_KV"       # KV namespace — hot cache for resolved schemas
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[vars]
SCHEMA_S3_FALLBACK_BUCKET = "keystone-resolved-schemas"   # used if R2 is unavailable
ENVIRONMENT = "production"

# If using AWS S3 instead of R2, add secrets:
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
# These are set via `wrangler secret put`, never in wrangler.toml
```

**Binding notes:**

- **`SCHEMA_BUCKET` (R2):** Cloudflare R2 is the primary schema store. R2 is co-located with the Worker runtime, eliminating egress fees and reducing `GetObject` latency to ~5–15ms vs ~30–80ms for cross-region S3. The key layout is identical to the S3 layout documented in [01b-S3-SCHEMA-LAYOUT.md](./01b-S3-SCHEMA-LAYOUT.md).
- **`SCHEMA_KV`:** Cloudflare Workers KV. Used as a hot cache for fully-resolved schemas keyed by `{viewId}:{contextHash}`. TTL set to 90 seconds — shorter than the CDN `max-age=300` so that KV entries expire before the CDN TTL, allowing background revalidation to stay fresh.
- **AWS S3 fallback:** If R2 is not in use (e.g. the team migrates schemas to S3 for tooling compatibility), the `@aws-sdk/client-s3` package is used. It must be bundled into the Worker — `nodejs_compat` flag enables Node.js APIs needed by the AWS SDK.

---

## JWT Claim Extraction

The Worker decodes the JWT payload (base64url decode of the second segment). It does **not** verify the signature — signature validation is performed by every backend service using the shared platform middleware. The Worker only needs the claims to select the right schema file.

```typescript
// workers/schema-resolver/src/jwt.ts

export interface JwtClaims {
  sub: string;
  tenantId: string;
  role: string;
  lob?: string;
  locale?: string;
  portalType?: string;
  permissions: string[];
  exp: number;
  iat: number;
}

/**
 * Decodes a JWT payload without verifying the signature.
 * The Worker runs after the CDN has already passed the request through;
 * backend services will re-validate the signature on API calls.
 */
export function decodeJwtClaims(token: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT: expected 3 segments');
  }

  // Base64url → base64 → JSON
  const payload = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);

  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    throw new Error('JWT payload segment is not valid base64url');
  }

  let claims: unknown;
  try {
    claims = JSON.parse(decoded);
  } catch {
    throw new Error('JWT payload is not valid JSON');
  }

  // Runtime shape check — fail fast if backend changes the claims contract
  if (
    typeof claims !== 'object' ||
    claims === null ||
    typeof (claims as any).tenantId !== 'string' ||
    typeof (claims as any).role !== 'string'
  ) {
    throw new Error('JWT payload missing required claims: tenantId, role');
  }

  return claims as JwtClaims;
}
```

**Important:** The Worker does not check `exp`. An expired token will have been rejected by the backend API layer on the data requests that accompany any schema-driven view. If the Worker is called with an expired token, the worst outcome is serving the correct (still-valid) schema for the user's former context — a benign read-only edge case that the silent refresh flow (see [02-AUTH-AND-SECURITY.md](./02-AUTH-AND-SECURITY.md)) prevents in practice.

---

## Context Object Construction

```typescript
// workers/schema-resolver/src/context.ts

export interface SchemaContext {
  tenantId: string;
  role: string;
  lob: string | null;
  locale: string | null;
  portalType: string | null;
}

/**
 * Builds the resolution context from JWT claims.
 * Optional dimensions default to null — the specificity algorithm
 * treats null dimensions as wildcards (they cannot match a file
 * that explicitly encodes that dimension).
 */
export function buildSchemaContext(claims: JwtClaims): SchemaContext {
  return {
    tenantId:   claims.tenantId,
    role:       claims.role,
    lob:        claims.lob       ?? null,
    locale:     claims.locale    ?? null,
    portalType: claims.portalType ?? null,
  };
}

/**
 * Produces a stable, deterministic string key for this context.
 * Used as the KV cache key suffix.
 */
export function contextHash(ctx: SchemaContext): string {
  // Sort keys for determinism; omit null dimensions
  const parts: string[] = [
    `tenant=${ctx.tenantId}`,
    `role=${ctx.role}`,
  ];
  if (ctx.lob)        parts.push(`lob=${ctx.lob}`);
  if (ctx.locale)     parts.push(`locale=${ctx.locale}`);
  if (ctx.portalType) parts.push(`portalType=${ctx.portalType}`);
  return parts.join(':');
}
```

---

## S3 / R2 Access Pattern

```typescript
// workers/schema-resolver/src/resolver.ts

import { runSpecificityAlgorithm } from './specificity';
import type { Env } from './env';

export class SchemaNotFoundError extends Error {
  constructor(viewId: string) {
    super(`No schema found for viewId: ${viewId}`);
    this.name = 'SchemaNotFoundError';
  }
}

/**
 * Lists all candidate objects for viewId, runs the specificity algorithm,
 * fetches the winning object from R2.
 */
export async function resolveSchema(
  viewId: string,
  ctx: SchemaContext,
  env: Env,
): Promise<ResolvedSchema> {
  // List all keys under viewId/
  const listed = await env.SCHEMA_BUCKET.list({ prefix: `${viewId}/` });
  const candidateKeys = listed.objects.map((o) => o.key);

  if (candidateKeys.length === 0) {
    throw new SchemaNotFoundError(viewId);
  }

  // Run specificity algorithm — returns the winning key (or merged result)
  const { winnerKey, mergeKeys } = runSpecificityAlgorithm(candidateKeys, ctx);

  if (!winnerKey) {
    throw new SchemaNotFoundError(viewId);
  }

  if (mergeKeys.length === 0) {
    // Single winner — fetch and return directly
    const obj = await env.SCHEMA_BUCKET.get(winnerKey);
    if (!obj) throw new SchemaNotFoundError(viewId);
    return obj.json<ResolvedSchema>();
  }

  // Tie: fetch all merge candidates in parallel
  const objects = await Promise.all(
    mergeKeys.map((key) => env.SCHEMA_BUCKET.get(key))
  );

  const schemas = objects.map((obj, i) => {
    if (!obj) throw new Error(`R2 object disappeared: ${mergeKeys[i]}`);
    return obj.json<ResolvedSchema>();
  });

  const resolved = await Promise.all(schemas);
  return mergeSchemas(resolved); // mergeSchemas: more-specific fields win
}
```

---

## CDN Cache Strategy

```
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

| Directive | Value | Rationale |
|---|---|---|
| `public` | — | Response may be stored by shared CDN caches |
| `max-age` | 300s (5 min) | CDN serves without re-invoking Worker |
| `stale-while-revalidate` | 3600s (1 hr) | After 5 min, serve stale + background refresh |

**CDN key:** The CDN caches responses keyed by the full request URL + `Authorization` header value (because `Vary: Authorization` is set). Each unique JWT produces its own cache entry. This is correct behaviour — different contexts produce different schemas.

**Practical flow:**
1. First request for `tenantId=gi, role=underwriter` on a given edge node: Worker runs, schema fetched from R2, response cached.
2. Next 5 minutes: CDN serves from cache, Worker not invoked.
3. Minutes 5–65: CDN serves stale immediately, triggers background revalidation.
4. After 65 minutes with no traffic: Cache entry evicted. Next request is a cold path.

---

## Surrogate Keys and CDN Purge

The `Surrogate-Key` response header enables targeted CDN purge on schema deploy:

```
Surrogate-Key: schema-quotations-list tenant-gi
```

Multiple keys are space-separated. The Materialisation Service deploy hook issues purge calls:

```bash
# Purge all cached schemas for a specific view (all tenants)
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {cf_token}" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["schema-quotations-list"]}'

# Purge all schemas for a specific tenant (all views)
curl -X POST ... -d '{"tags": ["tenant-gi"]}'
```

Surrogate key purge is only available on Cloudflare Enterprise and above. On lower tiers, use URL-based purge or the `wrangler` CLI:

```bash
wrangler pages deployment tail  # see active deployments
wrangler r2 object put keystone-resolved-schemas/quotations-list/base.json --file ./base.json
# Then purge via CF API or wrangler cache purge
```

---

## Pre-Warming on Deploy

A post-deploy hook warms the KV cache and CDN for the most common context combinations before real traffic arrives. This eliminates cold-start latency for the initial wave of users after each deploy.

```typescript
// scripts/prewarm-schemas.ts  (run as part of wrangler deploy hook)

const VIEWS_TO_PREWARM = [
  'quotations-list',
  'quotation-detail',
  'claims-list',
  'claim-detail',
  'policy-list',
];

const CONTEXTS_TO_PREWARM = [
  { tenantId: 'gi',     role: 'underwriter', lob: 'motor' },
  { tenantId: 'gi',     role: 'broker',      lob: 'motor' },
  { tenantId: 'gi',     role: 'underwriter', lob: 'property' },
  { tenantId: 'zurich', role: 'underwriter', lob: 'motor' },
  // extend as tenant roster grows
];

async function prewarm() {
  const prewarmToken = process.env.PREWARM_JWT; // a long-lived service JWT for prewarm only
  for (const viewId of VIEWS_TO_PREWARM) {
    for (const ctx of CONTEXTS_TO_PREWARM) {
      await fetch(`https://keystone.example.com/schemas/${viewId}`, {
        headers: { Authorization: `Bearer ${prewarmToken}` },
      });
    }
  }
}

prewarm().catch(console.error);
```

The prewarm script runs after `wrangler deploy` completes, targeting the production Worker URL. Since the Worker is global, a single prewarm HTTP request warms the CDN PoP nearest to the prewarm script's origin; full global warming requires either a distributed prewarm runner or reliance on `stale-while-revalidate` to propagate warmth lazily.

---

## Worker CPU and Memory Limits

Cloudflare Workers have the following limits on the free and paid tiers:

| Resource | Free | Bundled (paid) |
|---|---|---|
| CPU time per request | 10ms | 50ms |
| Memory | 128MB | 128MB |
| Subrequest duration | — | 30s |
| Worker bundle size | 1MB | 10MB |

**Impact on the specificity algorithm:**

The algorithm is O(n) where n = number of candidate files for a view. A view should never have more than 50 candidate files (2^5 combinations = 32 maximum, in practice far fewer because not every dimension combination is materialised). The algorithm itself runs in <1ms. The limiting factor is always the R2 `GetObject` call (~5–15ms for R2, up to 80ms for cross-region S3).

**Total Worker CPU budget per request:**
- JWT decode: ~0.1ms
- Context build: <0.1ms
- KV lookup: ~1ms
- Specificity algorithm: <1ms
- R2 `GetObject` (counted against subrequest time, not CPU): 5–15ms
- JSON serialisation: ~0.5ms

**Well within the 10ms CPU limit.** The 10ms budget is CPU-only; waiting on subrequests (KV, R2) does not consume CPU time.

---

## Error Response Shapes

All error responses follow this structure:

```typescript
interface WorkerErrorResponse {
  error: 'INVALID_TOKEN' | 'SCHEMA_NOT_FOUND' | 'SCHEMA_UNAVAILABLE';
  viewId?: string;          // present on SCHEMA_NOT_FOUND, SCHEMA_UNAVAILABLE
  message: string;          // human-readable, safe to display in dev tooling
  requestId?: string;       // CF-Ray header value, for log correlation
}
```

| HTTP Status | `error` value | Trigger |
|---|---|---|
| 400 | `INVALID_TOKEN` | Missing/malformed Authorization header; JWT not parseable |
| 404 | `SCHEMA_NOT_FOUND` | No candidate files for viewId, or no matching context + no base.json |
| 503 | `SCHEMA_UNAVAILABLE` | R2/S3 error; CDN has no stale entry to serve |

The `CF-Ray` header value is always present on Cloudflare responses. The browser should include this in any error reports to support log correlation in the Cloudflare dashboard.
