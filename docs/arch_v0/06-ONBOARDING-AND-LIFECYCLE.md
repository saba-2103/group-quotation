# Onboarding And Lifecycle

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document covers tenant onboarding, schema lifecycle, and rollout policy.

---

## Tenant Onboarding Checklist

The architecture review called out the absence of an onboarding checklist. v0 defines one.

### Identity and auth

- tenant ID issued and normalized
- JWT contains required claims for frontend context
- backend middleware recognizes tenant
- frontend origin whitelisted in backend CORS middleware

### Schema setup

- `default.json` exists for required views
- tenant-specific schema artifact created where needed
- schema conditions reviewed against product spec
- any introduced variant is justified in review

### Config setup

- required config keys created
- base blobs populated
- tenant overrides populated where needed
- bindings validated against registered keys

### Publication and runtime checks

- materialisation run completed
- schema artifact passes contract validation
- smoke render passes
- CDN pre-warm run completed for critical views

### Operational readiness

- tenant-specific dashboards and alerts visible
- schema freshness monitoring shows healthy state
- rollback owner and incident path known

---

## Schema Lifecycle

### 1. Author

Create or update schema source and bindings.

### 2. Validate

Run:

- schema contract validation
- JSONLogic subset validation
- binding validation
- size checks
- accessibility checks

### 3. Materialise

Produce resolved schema artifacts with display values baked in.

### 4. Publish

Write resolved artifacts, purge CDN tags, confirm freshness.

### 5. Observe

Watch:

- schema fetch error rate
- freshness lag
- contract violations

### 6. Roll back if needed

Restore prior object version or republish corrected artifacts.

---

## Variant Lifecycle

Because variants are allowed only as a fallback, they need explicit discipline.

Before introducing a variant, document:

- why a condition-based approach is insufficient
- what audience or state the variant serves
- whether the difference is structural or only presentational
- how the variant will be tested and kept in sync with the base page

When a variant is no longer needed, it should be removed rather than left as dormant complexity.

---

## Rollout Strategy

Recommended rollout order for v0:

1. admin pages
2. queues and dashboards
3. list-detail pages
4. forms with static conditions

Do not begin with heavy workbench-style modules. They are outside v0 scope by definition.

Rollout guardrail:

- do not onboard a second tenant until the first tenant has completed a full config-change cycle in a real environment, including materialisation, CDN purge, freshness verification, and alert-path validation

The materialisation and freshness path is the highest operational-risk part of the architecture and should be proven before scaling tenant count.

---

## Pre-Warm Strategy

On deploy or major schema publish:

- pre-fetch critical views through the Worker for major tenants
- warm CDN and KV for top traffic pages
- verify `resolvedAt` freshness after purge

This reduces the cold-path latency spike after publication.

---

## Success Criteria

v0 is considered healthy when:

- schema delivery is stable and cache-efficient
- Config System publishes cleanly without manual intervention
- pages render from one runtime graph
- conditions stay static and spec-driven
- variant count remains low and justified
- no hidden reintroduction of workbench or field-rule fetch complexity occurs
