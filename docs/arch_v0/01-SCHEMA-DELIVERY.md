# Schema Delivery

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines how schemas are stored, selected, filtered, cached, versioned, and recovered in v0.

The delivery mechanism intentionally remains aligned with the existing edge-resolution architecture.

---

## Overview

Schema delivery is an edge concern, not an application-server concern.

The path is:

1. browser requests `/schemas/:viewId`
2. Cloudflare Worker decodes JWT claims
3. Worker reads the resolved schema artifact from storage
4. Worker applies inline `$show` / `$hide` filtering where required
5. Worker returns the clean schema with CDN cache headers

The Worker is a selector and filter. It does not materialise config bindings and does not assemble schemas from fragments.

---

## Storage Layout

Storage layout remains compatible with the current browser-arch design.

```text
keystone-resolved-schemas/
  {viewId}/
    default.json
    {tenantId}.json

keystone-schema-bindings/
  {viewId}/
    config-bindings.json
```

Rules:

- `keystone-resolved-schemas` is CDN-accessible through the Worker
- `keystone-schema-bindings` is private to the materialisation service
- Worker never reads binding declarations
- browser never sees binding declarations or config keys

---

## What a Resolved Schema Contains

A resolved schema contains:

- metadata like `viewId`, `version`, and `resolvedAt`
- widget tree definition
- resolved display semantics
- inline `$show` / `$hide` conditions where needed
- optional variants if a UX difference cannot be expressed cleanly as a condition

The browser receives the post-filtered schema response, not the authoring-time inputs.

---

## Condition and Variant Policy

This is the primary v0 rule.

### Use conditions by default

Use inline conditions when the UX difference is:

- tied to known state, role, LOB, locale, portal type, or fetched data
- readable in JSONLogic
- localized to widgets, fields, actions, or small subtrees

### Use variants only when conditions are insufficient

Use a variant only when the UX difference cannot be expressed cleanly and maintainably as a condition.

Examples that may justify a variant:

- a substantially different subtree shape that would require many inverse conditions
- a tenant-specific UX divergence that is structural rather than conditional
- a page with two materially different layouts that are clearer as separate artifacts

Non-examples:

- a field shown only for underwriters
- a section visible only when `data.quote.state = PENDING_APPROVAL`
- a button hidden for a broker role

### Variant guardrail

If a variant is introduced, the schema author must be able to explain why a condition-based approach would be less maintainable.

---

## Worker Behavior

The Worker performs these steps:

1. read `Authorization: Bearer <token>`
2. decode JWT claims without re-validating the signature
3. build schema context from claims
4. check KV or CDN hot cache
5. attempt `GetObject {viewId}/{tenantId}.json`
6. if missing, attempt `GetObject {viewId}/default.json`
7. apply inline `$show` / `$hide` filters using the JWT-derived context
8. strip condition keys from returned output
9. return with cache headers and surrogate tags

This preserves the existing delivery path while narrowing the runtime model.

### Missing or malformed JWT handling

Schema delivery is authenticated in v0.

- missing `Authorization` header -> return `401 SCHEMA_UNAUTHORIZED`
- malformed or unreadable JWT payload -> return `401 SCHEMA_UNAUTHORIZED`
- validly decoded JWT with no matching artifact -> continue normal lookup and possible `404 SCHEMA_NOT_FOUND`

The Worker should not serve an anonymous default schema when auth is missing or malformed.

---

## Cache Headers

Worker responses should use:

```text
Cache-Control: public, max-age=300, stale-while-revalidate=3600
Surrogate-Key: schema-{viewId} tenant-{tenantId}
Vary: Authorization
ETag: {object-etag}
```

Rationale:

- `max-age=300`: five-minute fresh cache window
- `stale-while-revalidate=3600`: one-hour stale serving during background revalidation
- `Surrogate-Key`: enables grouped purge by view or tenant
- `Vary: Authorization`: prevents context crossover at the CDN layer

---

## Failure Modes

The original review called out missing edge failure planning. v0 defines explicit behavior.

### Schema not found

If neither tenant file nor default file exists:

- Worker returns `404 SCHEMA_NOT_FOUND`
- browser does not retry infinitely
- page renders a schema-level error state
- alert is emitted to platform monitoring because this is a publication failure, not a transient backend failure

### Missing or malformed JWT

If the request has no Bearer token or the JWT cannot be decoded into the minimum required claims shape:

- Worker returns `401 SCHEMA_UNAUTHORIZED`
- browser treats this as an auth/session failure rather than a schema publication failure
- normal token refresh or login redirect flow applies

### Storage unavailable

If storage is unavailable:

- serve stale cached response where available
- otherwise return `503 SCHEMA_UNAVAILABLE`
- include `Retry-After: 30`
- emit edge error metric and alert if sustained

### Corrupt schema artifact

If the stored object is not valid against the resolved-schema Zod contract:

- Worker returns `503 SCHEMA_INVALID`
- current object version is marked unhealthy
- platform alert fires immediately
- rollback or break-glass hotfix procedure is triggered

### Materialisation lag

If config was saved but fresh schema artifacts are delayed:

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

There are three rollback mechanisms:

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

The review raised concern about excessive artifact size. v0 defines budgets.

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

## What Changes From the Earlier Delivery Story

The edge delivery mechanism stays.

What changes is what the browser does after schema arrives:

- no `useFieldConfig()` fetch path
- no workbench/bootstrap runtime
- conditions are evaluated from schema against local runtime graph
- variants are secondary to conditions, not the primary strategy
