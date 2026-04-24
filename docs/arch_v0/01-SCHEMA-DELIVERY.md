# Schema Delivery

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines how schemas are stored, published, cached, versioned, and recovered in the initial on-prem POC.

---

## Overview

Schema delivery is static and direct.

The path is:

1. browser requests schema by `schemaId`
2. CDN serves `keystone-resolved-schemas/{schemaId}.json`
3. on cache miss, CDN fetches that object from storage
4. browser receives the resolved schema artifact as-is

There is no Worker, no edge resolver, no JWT-based schema selection, and no delivery-time filtering.

---

## Storage Layout

```text
keystone-resolved-schemas/
  {schemaId}.json

keystone-schema-bindings/
  {schemaId}/
    config-bindings.json
```

Rules:

- `keystone-resolved-schemas` is CDN-backed and browser-fetchable
- `keystone-schema-bindings` is private to the materialisation service
- browser never sees binding declarations or config keys

---

## Fetch Contract

The browser fetches schema by unique identifier.

Recommended path:

```text
GET /schemas/{schemaId}.json
```

`schemaId` is the complete lookup key for the POC.

There is no:

- tenant-specific lookup
- default tenant fallback
- role/LOB/locale context matching
- edge condition filter

---

## What a Resolved Schema Contains

A resolved schema contains:

- metadata like `schemaId`, `version`, and `resolvedAt`
- widget tree definition
- resolved display semantics
- runtime JSONLogic conditions such as `visibleWhen`, `requiredWhen`, and `editableWhen`
- optional variants, if the route/config explicitly points to another schema artifact

The browser receives the published artifact directly.

---

## Condition and Variant Policy

This is the primary v0 rule.

### Use conditions by default

Use conditions when the UX difference is:

- tied to known business state or user context already available in the runtime graph
- readable in JSONLogic
- localized to widgets, fields, actions, or small subtrees

### Use variants only when conditions are insufficient

Use a variant only when the UX difference cannot be expressed cleanly and maintainably as a condition.

For the POC, a variant is a separate resolved schema artifact with its own `schemaId`.

Examples that may justify a variant:

- a materially different widget subtree
- a page with two clearly different layouts that would become unreadable through conditions alone

Non-examples:

- a field shown only for a role
- a section visible only when `data.quote.state = PENDING_APPROVAL`
- a button hidden for a given state

### Variant guardrail

If a variant is introduced, the schema author must explain why a condition-based approach would be less maintainable.

---

## Cache Headers

Schema responses should use headers like:

```text
Cache-Control: public, max-age=300, stale-while-revalidate=3600
ETag: {object-etag}
```

Optional CDN tagging:

```text
Surrogate-Key: schema-{schemaId}
```

Rationale:

- `max-age=300`: five-minute fresh cache window
- `stale-while-revalidate=3600`: one-hour stale serving while origin refresh happens
- `Surrogate-Key`: allows targeted purge per schema artifact

There is no `Vary: Authorization` because schema delivery is not auth-context-sensitive in the POC.

---

## Failure Modes

The review called out missing delivery failure planning. The POC defines explicit behavior.

### Schema not found

If `{schemaId}.json` does not exist:

- return `404 SCHEMA_NOT_FOUND`
- browser does not retry infinitely
- page renders a schema-level error state
- alert is emitted because this is a publication failure, not an API/data failure

### Storage or CDN origin unavailable

If storage is unavailable:

- serve stale cached response where available
- otherwise return `503 SCHEMA_UNAVAILABLE`
- include `Retry-After: 30`
- emit delivery error metric and alert if sustained

### Corrupt schema artifact

If the object is not valid against the resolved-schema Zod contract:

- return `503 SCHEMA_INVALID`
- mark current object version unhealthy
- platform alert fires immediately
- rollback or break-glass hotfix procedure is triggered

### Materialisation lag

If config was saved but the fresh schema artifact is delayed:

- last-known-good schema remains served from CDN and object versioning
- watchdog checks `resolvedAt` age against expected freshness windows
- queue depth and oldest-event age are monitored

---

## Schema Versioning and Rollback

Versioning is mandatory on the resolved schema bucket.

Rules:

- every write creates a new object version
- last 20 non-current versions are retained
- object version list is the rollback source of truth
- rollback creates a new current version from a prior object version rather than deleting history

### Rollback sources

1. **Normal rollback:** re-run materialisation from corrected source inputs
2. **Fast rollback:** restore a previous object version in the resolved schema bucket
3. **Break-glass hotfix:** manually patch a resolved schema artifact only under the hotfix policy below

### Hotfix policy

Direct edits in `keystone-resolved-schemas` are not the normal operating model.

They are allowed only as break-glass hotfixes when:

- production impact is active
- the materialisation path cannot restore service quickly enough
- an incident owner and one approver are named
- the hotfix is back-ported into source artifacts within one working day

Every hotfix must produce:

- incident ID
- approver
- changed keys/objects
- timestamp
- back-port reference

---

## Object Size Guardrails

Budgets:

- resolved schema target: <= 250 KB compressed, <= 1 MB uncompressed
- single variant subtree target: <= 30% of page artifact unless justified
- widget count warning: > 250 nodes per page requires review

Enforcement:

- materialisation emits size metrics per artifact
- CI validates schema size for checked-in source artifacts
- admin tooling warns before publishing materially oversized pages

---

## Accessibility Guardrails For Schema Publication

Schema publication should fail or warn on:

- icon-only actions with no accessible label
- missing labels for interactive form widgets
- unsupported design-token references
- missing translation fallback for user-visible strings

Accessibility is not only a component concern. Since schema controls UI composition, the publication pipeline must reject structurally inaccessible configurations.

---

## What Changed From the Earlier Delivery Story

What stays:

- CDN-backed schema delivery
- resolved schema artifacts
- materialisation and purge model

What changes:

- no Worker
- no JWT-based schema resolution
- no tenant-specific schema files
- no delivery-time filtering
- no active edge condition system in the POC

The only active condition system in the POC is runtime JSONLogic in the browser.
