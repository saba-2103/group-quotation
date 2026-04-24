# Contracts, Observability, And Operations

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines contract enforcement, observability, release controls, and operational policy for the architecture.

---

## Contract Enforcement

v0 keeps the same two-layer contract model.

### 1. Pact in CI

- frontend defines API expectations
- backend verifies compatibility before deployment
- incompatible backend changes fail CI instead of breaking production users

### 2. Zod in the browser

- all API responses validated before entering the runtime graph
- contract violations reported to Sentry and Datadog
- typed errors surface failures quickly

### 3. Resolved schema validation

Resolved schemas also need contract validation.

v0 requires:

- a Zod schema for resolved schema artifacts
- validation at schema fetch time
- publication-time validation before a resolved schema artifact is written

### 4. Smoke rendering

The architecture includes smoke rendering:

- fetch latest resolved schemas from a staging bucket or staging artifact store
- render them in a headless smoke harness
- fail CI if render contract breaks

---

## Observability Model

### Schema delivery

- schema fetch latency
- CDN hit ratio
- origin fetch latency on cache miss
- schema `404` count
- schema `503` count
- stale schema served count

### Config and materialisation

- config save rate
- materialisation duration
- queue depth and oldest event age
- purge latency
- schema freshness lag (`now - resolvedAt`)
- config gap count

### Client runtime

- API contract violations
- resolved schema contract violations
- condition evaluation failures
- graph hydration latency per source
- mutation failure rate

### Alerting thresholds

- repeated schema `503` beyond 5 minutes -> page platform on-call
- queue age above freshness SLO -> config/materialisation on-call
- any resolved-schema contract violation in production -> immediate alert

---

## Release Pipeline

There are two publication paths in v0:

1. **Source-managed path** for schema, binding, and application changes
2. **Admin-managed config path** for display-semantic changes in the Config System

```mermaid
flowchart TB
    A["Schema / binding / app source changes"] --> B["Schema validation"]
    B --> C["Binding validation"]
    C --> D["Resolved schema contract validation"]
    D --> E["API Pact verification"]
    E --> F["Smoke render latest schemas"]
    F --> G["Publish source changes"]
    G --> H["Materialisation Service writes resolved schema artifacts"]
    H --> I["CDN purge by schema tags"]
    I --> J["Post-publish monitors check freshness and error rate"]

    K["Admin config edit"] --> L["Config key / value validation"]
    L --> H
```

### Deployment gates

Do not publish if any of these fail:

- schema contract validation
- binding validation
- resolved-schema Zod validation
- Pact verification
- smoke render
- artifact size budget
- accessibility schema checks

---

## Disaster Recovery

### If CDN or storage fails

- serve stale schema where available
- return `503` only when no stale response exists
- monitor schema fetch error rate and stale-serving rate

### If materialisation lags or fails

- keep serving last-known-good schema object versions
- replay queue messages
- restore prior object versions if needed

### If bad schema reaches production

Recovery order:

1. fast rollback to prior object version
2. purge affected schema tags
3. back-port source correction
4. re-materialise and republish

---

## Hotfix Policy

Direct edits to resolved schema artifacts are break-glass only.

Requirements:

- active incident or severe customer impact
- named incident owner
- named approver
- audit trail captured
- source back-port within one working day

---

## Audit And Compliance Notes

### Required controls

- no PII in schema artifacts
- token scope minimised to claims actually needed by the browser
- raw payload logging truncated and sanitized
- config changes fully audited
- mutation endpoints audited according to domain severity

### Retention and evidence

The architecture requires that:

- schema publication events are traceable
- config changes are attributable
- break-glass actions are separately marked

### Delivery assumption

Because schema delivery is direct, this architecture assumes schema artifacts are non-sensitive metadata. If that assumption breaks, the delivery model must change.

---

## Scope Notes

This architecture does not include workbench/bootstrap runtime.

The relevant delivery/runtime budgets are instead:

- resolved schema artifact size
- data-source count per page
- eager versus deferred source budgets
