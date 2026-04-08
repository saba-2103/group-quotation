# Layer 4: Contract Enforcement

**Layer:** 4 of 5 in the Keystone UI browser architecture  
**Scope:** Guarantees that every API call the browser makes is structurally correct and that any backend schema change that would break the UI is caught before it reaches production users.

---

## Why Two Layers

Contract enforcement in Keystone UI is a two-layer defence. The layers are complementary — they catch different classes of problem at different points in time.

| | Pact (CI) | Zod (browser runtime) |
|---|---|---|
| **When it runs** | During CI, before deployment | In the user's browser, after deployment |
| **What it catches** | Planned API changes that violate the agreed contract | Unplanned drift, mismatches that slipped through, environment-specific issues |
| **Who it blocks** | Blocks the deploy pipeline | Blocks bad data from reaching application state; reports to Sentry/Datadog |
| **Cost of failure** | A failed CI pipeline — cheap, immediate | A production error for a real user — expensive |
| **Coverage** | Every contract test written by the frontend team | Every API call made through `createApiClient` |

The goal is: **Pact catches planned changes before they deploy. Zod catches anything that Pact missed at runtime.**

Neither layer is optional. Removing Pact means relying on runtime detection — users see errors. Removing Zod means Pact gaps cause silent data corruption.

---

## The Single Enforcement Point: `createApiClient`

Every API call in the application — including the Config System's resolved schema fetch — goes through the `createApiClient` factory. This is the single enforcement point for all contract validation.

`createApiClient`:

1. Attaches the JWT Bearer token from the application's token store
2. Handles `401` responses by calling the silent refresh endpoint and retrying the original request once
3. Parses the successful response body through a Zod schema
4. If the Zod parse fails (schema violation), throws a `ZodContractViolationError`, reports the violation to Sentry, and increments the `api.contract_violation` Datadog metric

No part of the application should call `fetch()` directly. See [the `no-raw-fetch` ESLint rule](#the-no-raw-fetch-eslint-rule) below.

Full implementation details and code: [04b — Browser Zod and Observability](./04b-BROWSER-ZOD-AND-OBSERVABILITY.md)

---

## The `no-raw-fetch` ESLint Rule

To enforce the "all calls through `createApiClient`" policy, the repository includes a custom ESLint rule named `no-raw-fetch`.

The rule flags any direct call to `fetch(...)` or `window.fetch(...)` anywhere in application source code. It produces an error (not a warning) so it fails CI.

```
error  Direct fetch() call is not allowed. Use createApiClient() to ensure
       JWT attachment, 401 retry, and Zod contract validation.
       keystone/no-raw-fetch
```

The one legitimate exception is the `createApiClient` implementation itself, which is the only file permitted to call `fetch` directly. That file disables the rule with an inline comment:

```typescript
// eslint-disable-next-line keystone/no-raw-fetch -- This IS the fetch wrapper
const response = await fetch(url, options);
```

No other file in the codebase should carry this disable comment. If you find one during code review, treat it as a contract enforcement breach.

Configuration details: [04b — Browser Zod and Observability](./04b-BROWSER-ZOD-AND-OBSERVABILITY.md#the-no-raw-fetch-eslint-rule)

---

## Coverage: Config System Resolved Schema

The contract enforcement layers do not only cover REST API endpoints. The Config System's resolved schema — fetched from the CDN edge — is also covered:

- **Pact:** A Pact consumer test verifies that the CDN edge returns a valid resolved schema document for a given `tenantId` / `lob` / `locale` context. This catches cases where the schema publisher changes the document structure without updating the consumer.
- **Zod:** The resolved schema fetch goes through `createApiClient` with the `WidgetConfigSchema` Zod validator. If the CDN returns a document that does not match the expected shape, it is treated identically to any other contract violation — Sentry event, Datadog metric, error boundary shown to user.

This means the Config System's schema format is a first-class API contract, not informal JSON.

---

## Alerting Strategy

The alerting strategy for production contract violations is deliberately aggressive:

- **Threshold:** Any single `api.contract_violation` event in production triggers an alert. The threshold is `> 0` in any 5-minute window.
- **Rationale:** A contract violation in production means a user received data that the application could not safely parse. Even one occurrence indicates a real problem — either a backend deploy has diverged from the contract, or there is an edge case the Pact tests do not cover.
- **Action:** PagerDuty alert fires. On-call engineer checks Sentry for the violation detail (endpoint, schema name, error path, raw payload excerpt). If the violation is from a backend change, the backend team should roll back or publish a new Pact contract and re-run verification.

Metric dimensions and Sentry event shape are detailed in [04b — Browser Zod and Observability](./04b-BROWSER-ZOD-AND-OBSERVABILITY.md#datadog-metrics-and-alerting).

---

## Child Documents

| Document | Contents |
|---|---|
| [04a — Pact Contract Testing](./04a-PACT-CONTRACT-TESTING.md) | How to write Pact consumer tests, the Pact Broker workflow, CI step order, what to do when a Pact test fails |
| [04b — Browser Zod and Observability](./04b-BROWSER-ZOD-AND-OBSERVABILITY.md) | `createApiClient` full implementation, Zod schema locations, `no-raw-fetch` rule configuration, Sentry event shape, Datadog metrics, PagerDuty alert rule |

---

## Quick Reference

```
┌──────────────────────────────────────────────────────────────────┐
│                     Contract Enforcement                         │
│                                                                  │
│  CI Pipeline                    Browser Runtime                  │
│  ──────────────                 ───────────────                  │
│  Frontend writes Pact test  →   createApiClient wraps fetch()    │
│  Publish to Pact Broker     →   Attach JWT                       │
│  Backend CI verifies        →   401 → refresh → retry            │
│  Fail = block deploy        →   Parse with Zod schema            │
│                             →   Violation → Sentry + Datadog     │
│                             →   Alert if count > 0 / 5 min       │
└──────────────────────────────────────────────────────────────────┘
```
