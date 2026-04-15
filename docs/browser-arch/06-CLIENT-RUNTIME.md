# Layer 6 — Client Runtime

**Keystone UI Architecture | Browser-Based, No BFF**

This document is the parent reference for Layer 6. It describes the runtime execution model: how the browser assembles UI from metadata, coordinates state across three stores, and renders widgets. Read this first, then follow the links to the leaf documents for implementation detail.

---

## Table of Contents

1. [Overview](#overview)
2. [Three State Stores](#three-state-stores)
3. [Rendering Pipeline](#rendering-pipeline)
4. [Page Types: Standard vs Workbench](#page-types-standard-vs-workbench)
5. [Hook Inventory](#hook-inventory)
6. [Condition System](#condition-system)
7. [Widget Registry](#widget-registry)
8. [Child Documents](#child-documents)

---

## Overview

Layer 6 is the browser-side execution layer. It receives schema from Layer 1 (CDN-cached view metadata) and data from Layer 2–4 APIs, then assembles, conditions, and renders the UI at runtime. There is no server-side rendering and no BFF. All assembly decisions happen in the browser.

The runtime has three concerns:

1. **State** — where data lives and how long it stays fresh
2. **Conditions** — which widgets and row actions are visible or enabled
3. **Rendering** — translating schema + data into mounted React components

These concerns are deliberately separated. Conditions read from state; renderers read from conditions and data. Nothing in the renderer owns state directly.

---

## Three State Stores

Layer 6 uses three distinct state mechanisms, each with a specific scope and lifetime. They do not overlap.

| Store | Library | What it holds | Lifetime |
|---|---|---|---|
| Server state | React Query | API responses, mutations, background refetch results | `staleTime: 5min`, `gcTime: 10min` |
| Interaction state | Zustand | Selected rows, search text, open panels, active filters | Session (page lifetime) |
| Identity state | React Context (`AppContext`) | `userId`, `role`, `tenantId`, `lob`, `locale` from JWT | Login session (immutable until re-login) |

**Why three stores, not one?**

Server state, interaction state, and identity state have fundamentally different invalidation semantics. React Query's cache invalidation model (based on query keys and mutation side effects) is the right tool for server data but wrong for transient UI toggles. Zustand's synchronous, non-async store is the right tool for interaction state but has no concept of staleness. AppContext is immutable per session, which neither React Query nor Zustand naturally models.

Mixing them into a single store would require either over-engineering one store or accepting that different slices have different rules — which is exactly what three stores already provide cleanly.

Full detail: [06a — State Management](./06a-STATE-MANAGEMENT.md)

---

## Rendering Pipeline

The rendering pipeline is the path from a page URL to mounted React components. It has four stages:

```
URL / route params
       │
       ▼
useViewMetadata(viewId)
  ├─ Fetches view schema from CDN (Layer 1)
  ├─ Returns: layout, widget list, widget configs
  └─ Cached aggressively (CDN + React Query)
       │
       ▼
WidgetRenderer (per widget in schema)
  ├─ Evaluates WidgetCondition (should this widget render at all?)
  ├─ Calls useSmartQuery(widget.dataSource) to fetch widget data
  └─ Passes { schema, data } to WidgetRegistry.resolve(widget.type)
       │
       ▼
WidgetRegistry.resolve(type)
  └─ returns the registered React component for this type string
       │
       ▼
Mounted React component
  ├─ Renders using data from React Query cache
  ├─ Reads interaction state from Zustand
  └─ Reads identity from AppContext
```

`WidgetRenderer` is the critical intermediary. It is the only place where condition evaluation gates rendering. Components themselves do not contain condition logic — they render unconditionally given their props. This keeps components testable in isolation.

---

## Page Types: Standard vs Workbench

Not all pages use the same data-fetching strategy. The two types differ in how many network calls they make on load and how they handle state coherence.

### Standard Pages

Dashboards, queue views, list-detail views.

- Fetch the view schema once via `useViewMetadata`.
- Each widget fetches its own data independently via `useSmartQuery`.
- Widgets can load and refresh independently — partial renders are acceptable.
- No cross-widget coherence requirement.

```
Page mount
  ├─ useViewMetadata() → schema
  ├─ Widget A → useSmartQuery('quotations', filters) → data
  ├─ Widget B → useSmartQuery('tasks', filters) → data
  └─ Widget C → useSmartQuery('kpis', {}) → data
```

### Workbench Pages

Quotation cockpit, PAS servicing, claims desk, accounting reconciliation.

These pages display multiple regions that must represent the same logical moment in time — e.g., the case header, the risk entities, the workflow stage, and the pricing breakdown must all be consistent with each other. Fetching them independently creates timing windows where a mutation in-flight could leave two regions in different states.

The workbench uses a bootstrap call pattern:

```
Page mount
  ├─ useViewMetadata() → schema (CDN, Layer 1)
  └─ useWorkbenchBootstrap(domainPath, entityId) → single coherent snapshot
       ├─ caseHeader
       ├─ entities
       ├─ workflow
       ├─ jobs
       └─ regionPayloads (pre-hydrates all major regions)
            │
            └─ After initial render: selective child refresh
               ├─ Subpanel A refreshes its own data
               └─ Subpanel B refreshes its own data
```

The bootstrap call is always `staleTime: 0` on workbench pages — the snapshot must be current on every focus. Stale workbench data is worse than a loading spinner.

Full detail: [06c — Workbench Runtime](./06c-WORKBENCH-RUNTIME.md)

---

## Hook Inventory

These are the primary runtime hooks. Each is defined in `src/hooks/`.

| Hook | Purpose |
|---|---|
| `useViewMetadata(viewId)` | Fetches and caches the view schema (layout + widget list) from the CDN. Returns the full view definition. |
| `useSmartQuery(dataSource, params)` | Standard data-fetching hook for widget data. Wraps React Query with the `[entity, filters]` key convention and applies default stale/gc times. |
| `useFieldConfig(fieldId, formState)` | Evaluates JSONLogic field rules against current form state and `$context` from AppContext. Returns `{ visible, required, disabled, readOnly }`. Used in form rendering. |
| `useWorkbenchBootstrap(domainPath, entityId)` | Fetches the workbench coherent snapshot in a single call. Always stale (`staleTime: 0`). Returns the full bootstrap payload including workflow contract. |
| `useWorkflowContract()` | Reads workflow state from the bootstrap result. Returns the current stage, actions map, blockers, and jobs. |
| `useWorkflowAction(actionKey)` | Returns `{ enabled, reasons, execute }` for a specific workflow action. Blocks execution if `enabled === false`. |
| `useDraft(draftKey)` | Manages autosave, restore, and conflict detection for workbench forms. |
| `useJobStatus(jobId)` | Polls job status with exponential backoff. Updates React Query cache with partial results as the job progresses. |
| `useAuditCapture()` | Prompts for an audit reason before regulated actions. Attaches reason to the mutation request as `X-Audit-Reason`. |
| `useAppContext()` | Returns the current identity context (`userId`, `role`, `tenantId`, `lob`, `locale`). Read-only. |

---

## Condition System

Conditions control whether a widget renders and whether a row-level action button appears. They are evaluated by `WidgetRenderer` before any component is mounted. Conditions read from any of the three state stores.

### WidgetCondition

Controls widget-level visibility. Evaluated once per render of the containing layout. Can reference:

- **Server state** — query cache values (e.g., hide this widget when the quote status is not `ACTIVE`)
- **Identity state** — role, tenantId, lob (e.g., show this widget only for `role=underwriter`)
- **Interaction state** — Zustand store values (e.g., show this panel only when a row is selected)

Conditions compose with `and` / `or` combinators. Evaluation short-circuits.

### RowCondition

Controls row-level action visibility inside `DataTable`. Same structure as `WidgetCondition` but evaluated against `{ row: RowData }` — the row's own data fields. Not evaluated against the store.

Example: show a "Review" action button only on rows where `row.status === "PENDING_APPROVAL"`.

### useFieldConfig

Bridges Layer 5 (field logic, JSONLogic rules in schema) into Layer 6 rendering. Given a field's schema rules and the current form state, returns `{ visible, required, disabled, readOnly }`. This is how form fields conditionally appear or change behaviour in response to user input without hardcoded component logic.

Full detail, TypeScript interfaces, and 5 worked examples: [06b — Widget and Field Conditions](./06b-WIDGET-AND-FIELD-CONDITIONS.md)

---

## Widget Registry

All widgets are registered in a central `WidgetRegistry`. `WidgetRenderer` calls `WidgetRegistry.resolve(type)` to look up the correct React component for any `type` string found in a schema.

The registry is type-agnostic: any React component that satisfies a declared prop contract can be registered and used from a schema. What a component renders internally is not an architecture concern — the architecture defines the contract between schema and component, not the component's implementation.

Schema is the business entity. Components are UI. The registry is the binding between them.

See [06d — Widget Registry](./06d-WIDGET-REGISTRY.md) for the registration API, prop contract declaration pattern, versioning rules, and contract testing requirements.

---

## Child Documents

| Document | Scope |
|---|---|
| [06a — State Management](./06a-STATE-MANAGEMENT.md) | React Query config, Zustand store structure, AppContext interface, cross-store interaction patterns |
| [06b — Widget and Field Conditions](./06b-WIDGET-AND-FIELD-CONDITIONS.md) | WidgetCondition and RowCondition TypeScript interfaces, evaluation order, useFieldConfig bridge, 5 worked examples |
| [06c — Workbench Runtime](./06c-WORKBENCH-RUNTIME.md) | Bootstrap hook, WorkflowRuntime, DraftRuntime, JobRuntime, AuditRuntime |
| [06d — Widget Registry](./06d-WIDGET-REGISTRY.md) | Registration API, prop contract declaration, versioning rules, contract testing |
| [06e — Schema Document Spec](./06e-SCHEMA-DOCUMENT-SPEC.md) | Full schema key reference, per-widget props, dataSource, actions, conditions, implementation status |

---

*Last updated: 2026-04-08 | Architecture branch*
