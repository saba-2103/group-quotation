# Terms And Assumptions

**Purpose:** Shared vocabulary and load-bearing assumptions for the architecture.

This document exists so that common architecture terms mean the same thing everywhere and do not need to be re-explained in every file.

---

## Core Terms

### `schemaId`

The unique identifier of a resolved schema artifact.

In this architecture, schema delivery is by `schemaId`.

Example:

```text
quote-details
admin-user-list
claim-intake-v2
```

If a variant exists, it has its own `schemaId`.

### Resolved schema artifact

The JSON document the browser actually fetches and renders.

It already contains:

- widget tree structure
- display semantics resolved from the Config System
- conditions
- data-source declarations
- inheritance/value-source definitions

It does not contain:

- raw binding declarations
- config keys
- customer-specific business data

### Widget tree

The page structure described in schema.

The architecture treats the page as a tree of widgets. Forms are widgets. Fields are child widgets within form widgets.

### Runtime graph

The single runtime data object the UI reads from.

Reserved roots:

- `system`
- `graph`

`system` is runtime-managed context.

`graph` contains schema-declared namespaces for page state.

Example:

- `system.role`
- `graph.quote`
- `graph.quoteDraft`
- `graph.filters`
- `graph.pageState`

The runtime graph is the read contract for the UI.

### Graph namespace

A schema-declared named branch under `graph.*`.

Examples:

- `graph.quote`
- `graph.quoteDraft`
- `graph.filters`
- `graph.pageState`

The namespace key defines the runtime path.

Example:

- namespace key `quoteDraft` -> runtime path `graph.quoteDraft`

Namespaces must be unique within a schema and should be semantic rather than component-derived.

### Condition

A schema-authored JSONLogic rule that changes UI behavior based on values in the runtime graph.

Typical uses:

- `visibleWhen`
- `requiredWhen`
- `editableWhen`

### Variant

A separate schema artifact used when a UX difference cannot be expressed cleanly and maintainably as a condition.

In this architecture, a variant is not selected by a runtime resolver. It is an explicitly chosen schema artifact with its own `schemaId`.

### Mutation

A backend write operation initiated by the UI.

Examples:

- submit form
- approve action
- save configuration
- update entity

Mutations are always validated by the backend.

### Break-glass hotfix

An emergency production fix applied directly to a published schema artifact outside the normal source -> materialise -> publish path.

Examples:

- directly replacing a bad schema artifact in the resolved schema bucket during an incident
- restoring an older object version as a fast rollback

Break-glass actions are exceptional, temporary, audited, and must be back-ported into the proper source path.

### `correlationId`

A unique identifier used to tie related logs, audit records, and downstream events together across one end-to-end operation.

Example use:

- user clicks Save
- backend receives mutation
- backend writes audit event
- backend triggers materialisation
- CDN purge runs

All of those records should carry the same `correlationId` so operators can trace one action across systems.

### `outcome`

The result of an action recorded in audit or operational events.

Typical values:

- `success`
- `failed`
- `rejected`
- `rolled_back`
- `partial_success`

### Display semantics

User-facing representation details that are not business logic.

Examples:

- labels
- translations
- badge variants
- display lookup maps

These belong to the Config System, not component code.

---

## Load-Bearing Assumptions

### Product assumptions

- most condition logic is known up front from specs
- conditions do not change frequently and independently of schema publication
- the initial deployment does not require workbench-style coherent multi-panel runtime

### Deployment assumptions

- deployment is on-prem and not multi-tenant in the runtime sense
- schemas can be fetched directly from CDN/S3 without a runtime selector
- schema artifacts are non-sensitive metadata

### Engineering assumptions

- schema authoring is engineering-owned
- Config System remains the source of display semantics
- API contracts and resolved schemas can be validated before and during runtime use

---

## If These Assumptions Change

If assumptions stop being true, the architecture should be revised deliberately rather than stretched silently.

Examples:

- if conditions begin changing independently of schema publication often enough to hurt delivery speed, introduce a narrow dynamic rule layer
- if schemas become sensitive or delivery must vary by identity context, introduce protected delivery or a runtime resolver layer
- if workbench-style screens come into scope, introduce a dedicated workbench runtime rather than overloading the standard page model

---

## Related Docs

- architecture baseline: [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
- delivery model: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- runtime model: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- decision summary: [`09-DECISIONS-SUMMARY.md`](./09-DECISIONS-SUMMARY.md)
