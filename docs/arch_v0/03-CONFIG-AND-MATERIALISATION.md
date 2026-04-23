# Config And Materialisation

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document covers the display-semantic side of the architecture that remains unchanged in v0.

---

## Overview

The Config System owns display semantics:

- labels
- translations
- badge variants
- display lookup maps
- other non-business display mappings

The backend owns domain codes. The Config System owns what those codes look like to users.

---

## Why This Still Exists In v0

Even though v0 removes `useFieldConfig()` and `useWorkbenchBootstrap()`, the Config System remains essential because it solves a different problem:

- display changes without frontend deploys
- multi-tenant display overrides
- pre-resolved schema artifacts served from CDN

This boundary remains one of the strongest parts of the original architecture and should be preserved.

---

## Data Model

Config blobs are keyed values under governed namespaces.

Examples:

```text
insurance.quotation.status.PENDING_APPROVAL
insurance.quotation.status.DRAFT
ui.common.empty_state.no_results
```

Values may be base, tenant-specific, or locale-specific.

---

## Publication Flow

```mermaid
flowchart LR
    A["Admin edits config"] --> B["Config CRUD validates and saves"]
    B --> C["config.blob.saved event"]
    C --> D["Materialisation Service"]
    D --> E["Read bindings"]
    D --> F["Read schema source"]
    D --> G["Resolve config values"]
    G --> H["Write resolved schema objects"]
    H --> I["Purge CDN surrogate tags"]
    I --> J["Next browser schema fetch gets fresh artifact"]
```

---

## Materialisation Rules

The materialisation service:

- consumes config save events
- finds affected bindings
- resolves all referenced config values
- writes fresh resolved schema artifacts atomically
- emits monitoring and completion events
- triggers CDN purge by tags

It does not:

- serve browser traffic
- leak binding declarations to the browser
- write partial or in-progress schema files

---

## CDN Purge Strategy

The review explicitly asked how purge batching is handled. v0 defines it.

### Purge keys

- `schema-{viewId}`
- `tenant-{tenantId}` where needed

### Batching policy

- collect all affected schema keys for one materialisation batch
- collapse duplicate purge tags before submitting purge requests
- send purge requests in bounded batches
- apply jitter between very large purge batches to avoid thundering herds

### Why this is safe

Because responses are served with `stale-while-revalidate`, users keep receiving last-known-good schema during the revalidation window rather than stampeding the origin.

### Monitoring

Track:

- purge request count
- purge batch size
- purge latency
- schema fetch miss rate after purge
- queue depth during large fan-out events

---

## Governance Summary

The architecture review flagged missing governance detail. v0 adopts the following summary.

### Key rules

- config keys are immutable identifiers
- keys follow governed naming conventions
- namespace ownership is explicit
- key renames are migrations, not edits
- unknown values fall back safely and emit alerts

### Approval workflow

Protected namespaces require owner approval for production changes. At minimum:

- namespace owner approves key creation in protected domains
- production config edits are recorded with actor, key, and diff
- break-glass edits are called out separately in the event log

### Multi-region resilience

The config datastore and resolved schema storage must support:

- object versioning
- point-in-time recovery or equivalent for config data
- cross-region replication for resolved schema artifacts in production

This closes the review gap around governance and resilience.

---

## Unknown Value Fallback

If a config mapping is missing for a new domain code, the materialisation output should fall back to:

```json
{ "label": "<raw_value>", "variant": "neutral" }
```

And emit:

- config gap event
- alert for config owners

This prevents broken rendering while still making gaps visible.

---

## Disaster Recovery For Materialisation Failure

The review asked what happens if materialisation fails mid-run. v0 defines the answer.

### Guarantees

- schema objects are replaced atomically
- last-known-good schema remains available because old object versions still exist
- failed events stay visible through queue age and retry metrics

### Watchdogs

Monitor:

- oldest unprocessed config event age
- materialisation error rate
- schema `resolvedAt` freshness by tenant and view
- count of artifacts older than freshness threshold after a config save

### Recovery path

1. replay failed event
2. re-materialise affected views
3. purge affected cache tags again
4. if replay cannot recover quickly, restore prior schema object version and open incident

---

## Hotfix Tolerance

The review asked whether direct hotfixes are allowed in the resolved schema bucket.

Policy:

- normal path: no direct edits
- break-glass path: allowed under incident procedure only
- all break-glass edits must be back-ported to schema source and bindings

That gives the system operational tolerance without normalizing drift between source-of-truth and served artifacts.
