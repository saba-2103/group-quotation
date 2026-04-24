# Deployment Onboarding And Lifecycle

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document covers environment onboarding, schema lifecycle, and rollout policy for the on-prem POC.

---

## Environment Onboarding Checklist

### Auth and backend setup

- auth flow operational in target environment
- backend middleware recognizes required roles and permissions
- frontend origin whitelisted in backend CORS configuration

### Schema setup

- required `schemaId` artifacts exist
- schema conditions reviewed against product specs
- any introduced variant is justified in review

### Config setup

- required config keys created
- base values populated
- bindings validated against registered keys

### Publication and runtime checks

- materialisation run completed
- schema artifact passes contract validation
- smoke render passes
- CDN pre-warm run completed for critical schemas

### Operational readiness

- delivery and materialisation dashboards visible
- schema freshness monitoring healthy
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
- what route or configuration chooses this variant `schemaId`
- whether the difference is structural or only presentational
- how the variant will be tested and kept in sync with the base schema

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

- do not expand to additional environments or larger schema families until the first environment has completed a full config-change cycle, including materialisation, CDN purge, freshness verification, and alert-path validation

The materialisation and freshness path is the highest operational-risk part of the POC and should be proven before scale.

---

## Pre-Warm Strategy

On deploy or major schema publish:

- pre-fetch critical schema URLs through CDN
- warm top traffic pages
- verify `resolvedAt` freshness after purge

---

## Success Criteria

v0 is considered healthy when:

- schema delivery is stable and cache-efficient
- Config System publishes cleanly without manual intervention
- pages render from one runtime graph
- conditions stay static and spec-driven
- variant count remains low and justified
- no hidden reintroduction of resolver/worker or field-rule fetch complexity occurs
