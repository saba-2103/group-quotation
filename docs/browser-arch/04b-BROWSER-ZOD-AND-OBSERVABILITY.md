# 04b — Browser Zod and Observability

**Parent:** [Layer 4 — Contract Enforcement](./04-CONTRACT-ENFORCEMENT.md)  
**Type:** Leaf document — implementation reference

---

## The `createApiClient` Factory

### Overview

`createApiClient` is the single function through which every API call in the application must flow. It returns a typed fetch function pre-configured for a specific endpoint schema. Calling it directly on `fetch` is banned by the `no-raw-fetch` ESLint rule.

### File location

```
src/api/createApiClient.ts
```

### Full implementation

```typescript
// src/api/createApiClient.ts

import { z, ZodSchema, ZodError } from "zod";
import * as Sentry from "@sentry/react";
import { getTokenStore } from "@/auth/tokenStore";
import { refreshAccessToken } from "@/auth/refreshAccessToken";

// ─── Error types ────────────────────────────────────────────────────────────

export class ZodContractViolationError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly schemaName: string,
    public readonly zodError: ZodError,
    public readonly rawPayload: unknown
  ) {
    super(
      `Contract violation on ${endpoint} (schema: ${schemaName}): ` +
        zodError.issues.map((i) => `${i.path.join(".")} — ${i.message}`).join("; ")
    );
    this.name = "ZodContractViolationError";
  }
}

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: unknown
  ) {
    super(`HTTP ${status} from ${endpoint}`);
    this.name = "ApiHttpError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Absolute base URL, e.g. "https://api.anaira.io" */
  baseUrl: string;
  /** Zod schema used to validate the response body */
  schema: ZodSchema;
  /**
   * Human-readable name for the schema. Used in Sentry events and Datadog
   * metrics. Defaults to schema._def.typeName if not provided.
   */
  schemaName?: string;
  /**
   * Number of times to retry after a 401 → token refresh cycle.
   * Defaults to 1. Set to 0 to disable retry (e.g., in tests).
   */
  maxRetries?: number;
}

export type TypedFetchFn<T> = (
  path: string,
  init?: RequestInit
) => Promise<T>;

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createApiClient<TSchema extends ZodSchema>(
  config: ApiClientConfig & { schema: TSchema }
): TypedFetchFn<z.infer<TSchema>> {
  const {
    baseUrl,
    schema,
    schemaName = schema.description ?? "UnnamedSchema",
    maxRetries = 1,
  } = config;

  return async function typedFetch(
    path: string,
    init: RequestInit = {}
  ): Promise<z.infer<TSchema>> {
    const endpoint = `${baseUrl}${path}`;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const token = getTokenStore().getAccessToken();

      const response = await fetch(endpoint, { // eslint-disable-line keystone/no-raw-fetch -- This IS the fetch wrapper
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...init.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // ── 401 handling: silent refresh + retry ─────────────────────────────
      if (response.status === 401 && attempt < maxRetries) {
        attempt++;
        try {
          await refreshAccessToken();
          continue; // retry with the new token
        } catch (refreshError) {
          // Refresh itself failed — surface to the caller as an auth error.
          // The auth layer (AppContext) will redirect to login.
          throw new ApiHttpError(401, endpoint, { refreshFailed: true });
        }
      }

      // ── Non-2xx responses ─────────────────────────────────────────────────
      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = await response.text();
        }
        throw new ApiHttpError(response.status, endpoint, body);
      }

      // ── Parse and validate response body ─────────────────────────────────
      let rawPayload: unknown;
      try {
        rawPayload = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse JSON from ${endpoint}: ${parseError}`);
      }

      const result = schema.safeParse(rawPayload);

      if (!result.success) {
        const violation = new ZodContractViolationError(
          endpoint,
          schemaName,
          result.error,
          rawPayload
        );

        reportContractViolation(violation, endpoint, schemaName);
        throw violation;
      }

      return result.data;
    }

    // Should never be reached (loop exits via return or throw), but TypeScript
    // requires this for exhaustive analysis.
    throw new Error(`createApiClient: exhausted retries for ${endpoint}`);
  };
}

// ─── Violation reporting ─────────────────────────────────────────────────────

function reportContractViolation(
  violation: ZodContractViolationError,
  endpoint: string,
  schemaName: string
): void {
  const tenantId = getTenantIdFromToken();

  // Report to Sentry
  Sentry.captureException(violation, {
    level: "error",
    tags: {
      contract_violation: "true",
      endpoint,
      schema_name: schemaName,
      tenant_id: tenantId ?? "unknown",
    },
    extra: {
      zodIssues: violation.zodError.issues,
      // Include a truncated raw payload for debugging — do not log the full
      // payload in case it contains PII. Cap at 2 KB.
      rawPayloadExcerpt: truncatePayload(violation.rawPayload, 2048),
    },
  });

  // Increment Datadog metric
  incrementDatadogMetric("api.contract_violation", {
    endpoint: normalizeEndpointForMetric(endpoint),
    schema_name: schemaName,
    tenant_id: tenantId ?? "unknown",
  });
}

function getTenantIdFromToken(): string | null {
  try {
    return getTokenStore().getClaims()?.tenantId ?? null;
  } catch {
    return null;
  }
}

function normalizeEndpointForMetric(endpoint: string): string {
  // Strip the base URL and replace path parameters with placeholders so
  // metrics don't explode cardinality (e.g., /v1/quotations/QT-001 → /v1/quotations/:id)
  return endpoint
    .replace(/^https?:\/\/[^/]+/, "")           // remove origin
    .replace(/\/[0-9a-f-]{8,}/gi, "/:id")       // UUID-like segments
    .replace(/\/[A-Z]{2}-\d+/g, "/:id")         // e.g., QT-001
    .replace(/\?.*$/, "");                       // remove query string
}

function truncatePayload(payload: unknown, maxBytes: number): string {
  const str = JSON.stringify(payload) ?? String(payload);
  if (str.length <= maxBytes) return str;
  return str.slice(0, maxBytes) + "…[truncated]";
}

// ── Datadog browser SDK shim ────────────────────────────────────────────────
// The real Datadog RUM SDK is initialised in src/monitoring/datadog.ts.
// This thin wrapper avoids importing the SDK in every file that reports metrics.

declare global {
  interface Window {
    DD_RUM?: {
      addAction: (name: string, context?: Record<string, unknown>) => void;
    };
  }
}

function incrementDatadogMetric(
  metricName: string,
  dimensions: Record<string, string>
): void {
  window.DD_RUM?.addAction(metricName, dimensions);
}
```

---

## Zod Schema Locations

All Zod schemas for API responses live in:

```
src/api/schemas/
├── QuotationSchema.ts
├── PolicySchema.ts
├── FieldConfigResponseSchema.ts     # see Layer 5
├── WidgetConfigSchema.ts            # Config System resolved schema
└── index.ts                         # re-exports all schemas
```

### Schema naming convention

- One file per API response type
- Schema variable name matches the file name: `QuotationSchema` in `QuotationSchema.ts`
- Each schema should have a `.describe(...)` string — this becomes the `schemaName` in Sentry/Datadog if not overridden

```typescript
// src/api/schemas/QuotationSchema.ts
import { z } from "zod";

export const QuotationFieldSchema = z.object({
  fieldId: z.string(),
  value: z.unknown().nullable(),
});

export const QuotationSchema = z
  .object({
    id: z.string(),
    tenantId: z.string(),
    lob: z.string(),
    status: z.enum(["DRAFT", "SUBMITTED", "BOUND", "CANCELLED"]),
    sumInsured: z.number(),
    fields: z.array(QuotationFieldSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .describe("QuotationSchema");

export type Quotation = z.infer<typeof QuotationSchema>;
```

---

## `WidgetConfigSchema`

The `WidgetConfigSchema` validates the document returned by the CDN edge for the Config System's resolved schema endpoint. It must be kept in sync with the Pact contract in `src/contracts/keystoneui_config-cdn_resolved-schema.pact.ts`.

```typescript
// src/api/schemas/WidgetConfigSchema.ts
import { z } from "zod";

const FieldConfigSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  type: z.string(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
});

const WidgetSchema = z.object({
  widgetId: z.string(),
  type: z.string(),
  label: z.string(),
  fields: z.array(FieldConfigSchema),
  metadata: z.record(z.unknown()).optional(),
});

export const WidgetConfigSchema = z
  .object({
    version: z.string(),
    tenantId: z.string(),
    lob: z.string(),
    locale: z.string(),
    widgets: z.array(WidgetSchema),
  })
  .describe("WidgetConfigSchema");

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
```

Usage in the Config System's fetch call:

```typescript
import { createApiClient } from "@/api/createApiClient";
import { WidgetConfigSchema } from "@/api/schemas/WidgetConfigSchema";

const fetchWidgetConfig = createApiClient({
  baseUrl: process.env.VITE_CONFIG_CDN_BASE_URL!,
  schema: WidgetConfigSchema,
});

// In the React Query hook:
const { data } = useQuery({
  queryKey: ["widgetConfig", tenantId, lob, locale],
  queryFn: () =>
    fetchWidgetConfig(
      `/v1/config/resolved?tenantId=${tenantId}&lob=${lob}&locale=${locale}`
    ),
  staleTime: 5 * 60 * 1000,
});
```

---

## The `no-raw-fetch` ESLint Rule

### Configuration

The rule is a custom local ESLint rule in `eslint-rules/no-raw-fetch.js`:

```javascript
// eslint-rules/no-raw-fetch.js
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct fetch() calls — use createApiClient() instead.",
      category: "Keystone Contract Enforcement",
      recommended: true,
    },
    messages: {
      noRawFetch:
        "Direct fetch() call is not allowed. Use createApiClient() to ensure " +
        "JWT attachment, 401 retry, and Zod contract validation. " +
        "(keystone/no-raw-fetch)",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        // catch: fetch(...) and window.fetch(...)
        const isBareCall =
          callee.type === "Identifier" && callee.name === "fetch";
        const isWindowCall =
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "window" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "fetch";

        if (isBareCall || isWindowCall) {
          context.report({ node, messageId: "noRawFetch" });
        }
      },
    };
  },
};
```

Register it in `.eslintrc.js`:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ["keystone"],
  rules: {
    "keystone/no-raw-fetch": "error",
  },
  // ...
};
```

In `package.json`, point the plugin at the local rules directory:

```json
{
  "eslintConfig": {
    "plugins": [
      ["keystone", { "rulesDir": "./eslint-rules" }]
    ]
  }
}
```

### What the error looks like

```
error  Direct fetch() call is not allowed. Use createApiClient() to ensure
       JWT attachment, 401 retry, and Zod contract validation.
       keystone/no-raw-fetch

  42 |   const response = await fetch(`${API_BASE}/v1/quotations/${id}`);
                                ^^^^^
```

### The one legitimate disable

Only `src/api/createApiClient.ts` is allowed to carry a disable comment:

```typescript
// eslint-disable-next-line keystone/no-raw-fetch -- This IS the fetch wrapper
const response = await fetch(endpoint, options);
```

If you need to write a low-level test that directly exercises HTTP behaviour, place it in `src/api/__tests__/createApiClient.test.ts` and add a file-level override **only for that file**:

```typescript
/* eslint-disable keystone/no-raw-fetch -- low-level HTTP test for the wrapper itself */
```

No other file in the codebase should disable this rule. Treat any other disable comment as a code review blocker.

---

## Sentry Integration

### Violation event shape

Every `ZodContractViolationError` produces a Sentry event with this shape:

```json
{
  "level": "error",
  "exception": {
    "type": "ZodContractViolationError",
    "value": "Contract violation on https://api.anaira.io/v1/quotations/QT-001 (schema: QuotationSchema): status — Invalid enum value. Expected 'DRAFT' | 'SUBMITTED' | 'BOUND' | 'CANCELLED', received 'LAPSED'"
  },
  "tags": {
    "contract_violation": "true",
    "endpoint": "https://api.anaira.io/v1/quotations/QT-001",
    "schema_name": "QuotationSchema",
    "tenant_id": "acme"
  },
  "extra": {
    "zodIssues": [
      {
        "code": "invalid_enum_value",
        "path": ["status"],
        "message": "Invalid enum value. Expected 'DRAFT' | 'SUBMITTED' | 'BOUND' | 'CANCELLED', received 'LAPSED'",
        "received": "LAPSED",
        "options": ["DRAFT", "SUBMITTED", "BOUND", "CANCELLED"]
      }
    ],
    "rawPayloadExcerpt": "{\"id\":\"QT-001\",\"tenantId\":\"acme\",\"status\":\"LAPSED\"...}"
  }
}
```

### Querying violations in Sentry

Filter by `tags.contract_violation = true` to see all contract violations in one view. You can further filter by `schema_name` to isolate a specific endpoint's violations.

---

## Datadog Metrics and Alerting

### Metric name and dimensions

```
api.contract_violation
```

| Dimension | Value | Notes |
|---|---|---|
| `endpoint` | `/v1/quotations/:id` | Normalised — no actual IDs |
| `schema_name` | `QuotationSchema` | Matches the Zod schema description |
| `tenant_id` | `acme` | From JWT claims |

The metric is an **increment** (counter), reported via the Datadog RUM Browser SDK `addAction` call. Each violation increments the counter by 1.

### Alert rule

In Datadog, configure the following monitor:

```
Monitor type:    Metric alert
Query:           sum(last_5m):sum:api.contract_violation{env:production}.as_count() > 0
Alert threshold: 0  (any occurrence triggers)
Message:         "Contract violation in production. Check Sentry tag contract_violation=true.
                  Endpoint: {{endpoint.name}}  Schema: {{schema_name.name}}"
Notification:    @pagerduty-keystone-oncall
```

**The threshold is `> 0`.** A single contract violation in production means a real user received structurally invalid data. There is no acceptable violation rate. When this fires:

1. Check Sentry for the full violation detail (endpoint, Zod issue path, raw payload excerpt)
2. Determine whether the violation is from a backend change or an edge case in the Pact tests
3. If from a backend change: engage the backend team to roll back or update the contract
4. If from a gap in Pact coverage: add a Pact test case that covers this scenario and re-run the full CI pipeline

Staging and development environments use the same metric but with a `> 5 in 5 min` threshold to reduce noise during active development.
