# 04a — Pact Contract Testing

**Parent:** [Layer 4 — Contract Enforcement](./04-CONTRACT-ENFORCEMENT.md)  
**Type:** Leaf document — implementation reference

---

## What Consumer-Driven Contracts Mean in Practice

In a traditional integration test, one team spins up both the consumer (frontend) and the provider (backend) and tests them together. This is expensive, slow, and creates strong coupling between deploy pipelines.

Consumer-driven contract testing inverts the relationship:

1. The **frontend team** writes a test that describes what it expects from the API — the request shape it will send and the response shape it needs. This expectation is called a **Pact** (a contract).
2. That contract is published to the **Pact Broker** (a central contract registry).
3. The **backend CI** pipeline pulls the published contract and verifies that the real backend can satisfy it — without the frontend needing to be running.
4. If the backend cannot satisfy the contract (e.g., a field was renamed, a required field was dropped, a type changed), **backend CI fails** and the backend cannot deploy.

The frontend team owns the contract. The backend team is notified of a breakage before their change reaches any environment. No users are affected.

---

## Writing a Pact Consumer Test

### File location and naming convention

Pact tests live in `src/contracts/`. The naming convention is:

```
{consumer}_{provider}_{endpoint}.pact.ts
```

Examples:
- `keystoneui_quotations-api_get-quotation.pact.ts`
- `keystoneui_quotations-api_post-quotation.pact.ts`
- `keystoneui_config-cdn_resolved-schema.pact.ts`

The consumer name is always `keystoneui`. The provider name matches the backend service name as registered in the Pact Broker.

### Example: `GET /v1/quotations/:id`

```typescript
// src/contracts/keystoneui_quotations-api_get-quotation.pact.ts

import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { createApiClient } from "@/api/createApiClient";
import { QuotationSchema } from "@/api/schemas/QuotationSchema";

const { like, string, number, boolean, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: "keystoneui",
  provider: "quotations-api",
  // pactfileWriteMode: "overwrite" in local dev; "merge" in CI
  dir: "./pacts",
});

describe("GET /v1/quotations/:id", () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it("returns a quotation when it exists", async () => {
    await provider
      .given("quotation QT-001 exists for tenant acme")
      .uponReceiving("a request for quotation QT-001")
      .withRequest({
        method: "GET",
        path: "/v1/quotations/QT-001",
        headers: {
          Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9..."),
          Accept: "application/json",
        },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: like({
          id: string("QT-001"),
          tenantId: string("acme"),
          lob: string("motor"),
          status: string("DRAFT"),
          sumInsured: number(500000),
          fields: eachLike({
            fieldId: string("vehicleReg"),
            value: like("MH01AB1234"),
          }),
          createdAt: string("2026-04-08T10:00:00Z"),
          updatedAt: string("2026-04-08T10:00:00Z"),
        }),
      })
      .executeTest(async (mockServer) => {
        // Use the real createApiClient so the Pact test exercises the same
        // code path that production uses — including Zod parsing.
        const fetchQuotation = createApiClient({
          baseUrl: mockServer.url,
          schema: QuotationSchema,
        });

        const result = await fetchQuotation("/v1/quotations/QT-001", {
          method: "GET",
        });

        expect(result.id).toBe("QT-001");
        expect(result.tenantId).toBe("acme");
      });
  });

  it("returns 404 when the quotation does not exist", async () => {
    await provider
      .given("quotation QT-999 does not exist")
      .uponReceiving("a request for a non-existent quotation")
      .withRequest({
        method: "GET",
        path: "/v1/quotations/QT-999",
        headers: {
          Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9..."),
        },
      })
      .willRespondWith({
        status: 404,
        body: like({
          error: string("QUOTATION_NOT_FOUND"),
          message: string("Quotation QT-999 not found"),
        }),
      })
      .executeTest(async (mockServer) => {
        const fetchQuotation = createApiClient({
          baseUrl: mockServer.url,
          schema: QuotationSchema,
        });

        await expect(
          fetchQuotation("/v1/quotations/QT-999", { method: "GET" })
        ).rejects.toThrow();
      });
  });
});
```

### Key points about this test

- `like(value)` tells Pact "the type and structure must match, not the exact value." Use it for IDs, timestamps, and any value that changes per record.
- `string(...)`, `number(...)`, `boolean(...)` assert type only — the example value is written to the Pact file as documentation, not as a constraint.
- `eachLike({...})` asserts that the field is an array where each element matches the given shape.
- The test calls the real `createApiClient` against the Pact mock server. This ensures the contract test also validates that the Zod schema can parse the agreed response shape — catching mismatches between the Pact contract and the Zod schema at test time, not at runtime.

---

## The Resolved Schema Pact Contract

The Config System's CDN edge is also a provider that must be covered by a Pact contract. The consumer name is `keystoneui` and the provider name is `config-cdn`.

```typescript
// src/contracts/keystoneui_config-cdn_resolved-schema.pact.ts

import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { createApiClient } from "@/api/createApiClient";
import { WidgetConfigSchema } from "@/api/schemas/WidgetConfigSchema";

const { like, string, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: "keystoneui",
  provider: "config-cdn",
  dir: "./pacts",
});

describe("GET /v1/config/resolved (CDN edge)", () => {
  it("returns a valid resolved schema for motor/acme/en-IN context", async () => {
    await provider
      .given("resolved schema exists for tenant=acme lob=motor locale=en-IN")
      .uponReceiving("a request for the resolved schema")
      .withRequest({
        method: "GET",
        path: "/v1/config/resolved",
        query: {
          tenantId: "acme",
          lob: "motor",
          locale: "en-IN",
        },
        headers: {
          Authorization: like("Bearer eyJhbGciOiJSUzI1NiJ9..."),
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // Cache-Control is public for the resolved schema (CDN-cacheable)
          "Cache-Control": like("public, max-age=300, s-maxage=3600"),
        },
        body: like({
          version: string("2026-04-08T10:00:00Z"),
          tenantId: string("acme"),
          lob: string("motor"),
          locale: string("en-IN"),
          widgets: eachLike({
            widgetId: string("vehicleDetails"),
            type: string("form-section"),
            label: string("Vehicle Details"),
            fields: eachLike({
              fieldId: string("vehicleReg"),
              label: string("Registration Number"),
              type: string("text"),
            }),
          }),
        }),
      })
      .executeTest(async (mockServer) => {
        const fetchConfig = createApiClient({
          baseUrl: mockServer.url,
          schema: WidgetConfigSchema,
        });

        const result = await fetchConfig(
          "/v1/config/resolved?tenantId=acme&lob=motor&locale=en-IN",
          { method: "GET" }
        );

        expect(result.tenantId).toBe("acme");
        expect(result.widgets).toBeInstanceOf(Array);
      });
  });
});
```

---

## The Pact Broker

The Pact Broker is the central registry for all contracts. It is hosted internally (URL: `https://pact-broker.internal.anaira.io`).

### Publishing contracts (frontend CI)

After the frontend Pact tests run successfully, the CI step publishes the generated `.pact` files:

```bash
npx pact-broker publish ./pacts \
  --broker-base-url https://pact-broker.internal.anaira.io \
  --consumer-app-version "$GIT_SHA" \
  --branch "$GIT_BRANCH" \
  --tag "$DEPLOY_ENV"
```

The `--consumer-app-version` is the full Git SHA so that each published contract is traceable to an exact commit.

### Backend verification

The backend service's CI pipeline includes a "can-i-deploy" check and a verification step. The backend pulls the latest contract for the `main` branch of the consumer and verifies it against the real implementation:

```bash
# In the backend (quotations-api) CI:
npx pact-provider-verifier \
  --provider quotations-api \
  --provider-base-url http://localhost:8080 \
  --broker-url https://pact-broker.internal.anaira.io \
  --consumer-version-selectors '[{"branch":"main"},{"deployed":true}]' \
  --publish-verification-results \
  --provider-app-version "$GIT_SHA"
```

If any contract cannot be verified, the backend CI pipeline fails and the backend cannot deploy.

---

## CI Step Order

The full sequence that ensures contracts are verified before any code deploys:

```
Frontend CI
───────────
1. npm run test:unit          # unit tests
2. npm run test:pact          # Pact consumer tests — generates ./pacts/*.json
3. pact-broker publish        # uploads pact files to Pact Broker
4. (frontend deploy proceeds independently — it is the consumer,
    not the provider. Pact only blocks the provider deploy.)

Backend CI (quotations-api, field-config-api, config-cdn, etc.)
────────────────────────────────────────────────────────────────
1. unit + integration tests
2. pact-provider-verifier     # pulls contracts from Broker, verifies against
                              # this backend's running test server
   ↓ FAILS HERE if field was renamed, type changed, required field dropped
3. pact-broker can-i-deploy   # final check: is this version safe to deploy?
4. deploy to environment
```

The frontend can deploy even if a backend Pact verification is pending (the frontend is a consumer — it adapts to the backend). The backend cannot deploy if it fails to satisfy any published consumer contract.

---

## What Triggers a Pact Failure

A backend CI Pact verification fails when the backend's actual response does not satisfy the consumer's declared expectation. Common causes:

| Cause | Example |
|---|---|
| Field renamed | `sumInsured` → `coverageAmount` |
| Field dropped | Response no longer includes `status` field |
| Type changed | `sumInsured` changed from `number` to `string` |
| Nullable change | Field previously always present, now sometimes `null` |
| New required field added to request | Backend now requires `X-Request-ID` header |
| Enum value removed | `status` no longer supports `"DRAFT"` value |

### What to do when Pact fails

1. **Do not bypass the CI check.** The failure is protecting users.
2. Check the Pact Broker UI for the diff: `https://pact-broker.internal.anaira.io`
3. If the backend change is intentional (e.g., a planned migration):
   - The frontend team must update the Pact consumer test to reflect the new contract
   - Publish the updated contract
   - The backend then re-runs verification against the updated contract
   - Both sides deploy together (coordinate with the backend team)
4. If the backend change is unintentional (a regression):
   - The backend team reverts or fixes the change before deploying
5. Slack channel for contract issues: `#keystone-api-contracts`
6. Backend team contacts: see `CODEOWNERS` in the quotations-api and field-config-api repositories

---

## Quick Reference

```
src/contracts/
├── keystoneui_quotations-api_get-quotation.pact.ts
├── keystoneui_quotations-api_post-quotation.pact.ts
├── keystoneui_field-config-api_batch.pact.ts
├── keystoneui_config-cdn_resolved-schema.pact.ts
└── ... (one file per provider endpoint)

pacts/                         # generated — do not edit
└── keystoneui-quotations-api.json
```

Run Pact tests locally:

```bash
npm run test:pact
# or for a single file:
npx vitest src/contracts/keystoneui_quotations-api_get-quotation.pact.ts
```
