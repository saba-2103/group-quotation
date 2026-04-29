# Keystone UI — System Design v0

**Status:** Proposed  
**Date:** 2026-04-23  
**Audience:** Tech leadership, frontend platform, module teams  
**Detail docs:** [`./`](./README.md)

---

## What This System Is

Keystone UI is a metadata-driven UI architecture for the initial on-prem deployment.

Every page is described by a resolved schema identified by a unique `schemaId`. The browser fetches that schema directly from CDN/S3, fetches domain data directly from backend APIs, evaluates schema-authored JSONLogic conditions against a unified runtime data graph, and renders a widget tree.

This architecture uses:

- browser-based UI assembly
- pre-materialised display semantics in schema
- direct backend integration from the browser
- contract validation and observability around API responses

It intentionally excludes:

- no `useFieldConfig()` flow because conditions are static and pre-known
- no `useWorkbenchBootstrap()` flow because workbench pages are out of scope
- no context-based schema selection service because schemas are fetched directly by unique `schemaId`

---

## The v0 Shape

The architecture has three browser-side flows and one server-side publication flow.

### Browser flows

1. **Schema delivery** via `useViewMetadata(schemaId)`
2. **Page data loading** into one unified runtime data graph
3. **Mutations** against backend APIs, with backend validation on every write

### Server-side publication flow

4. **Config save -> materialisation -> CDN purge -> fresh resolved schema artifact**

---

## Full System

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        direction TB
        UVM["useViewMetadata(schemaId)"]
        UDG["usePageDataGraph()"]
        SR["SchemaRenderer"]
        CE["JSONLogic Condition Engine"]
        subgraph ClientRuntime["Client Runtime"]
            Graph["Unified Runtime Data Graph"]
            Stores["React Query · Zustand · AppContext"]
        end
        UVM --> SR
        UDG --> Graph
        Stores --> Graph
        Graph --> CE
        CE --> SR
    end

    subgraph CDN["CDN"]
        Cache["CDN Cache\nmax-age + stale-while-revalidate"]
    end

    subgraph SchemaStore["Schema Storage"]
        RS[("keystone-resolved-schemas\n{schemaId}.json")]
        SB[("keystone-schema-bindings\nprivate binding declarations")]
    end

    subgraph Backend["Backend Services"]
        APIs["Domain APIs"]
        Mut["Mutation Endpoints"]
        Auth["Auth / JWT Middleware"]
    end

    subgraph ConfigSys["Client Config System"]
        Admin["Admin UI"]
        CRUD["Config CRUD"]
        Queue["Webhook / Queue"]
        MS["Materialisation Service"]
    end

    UVM -->|"GET /schemas/{schemaId}.json"| Cache
    Cache -->|"origin fetch on miss"| RS
    UDG -->|"Bearer JWT"| APIs
    SR -->|"submit / mutate"| Mut

    Admin --> CRUD
    CRUD --> Queue
    Queue --> MS
    MS --> SB
    MS --> RS
    MS -->|"purge schema-{schemaId}"| Cache
```

For the current repo implementation, the recommended interpretation of the store layer is:

- React Query for API fetch/cache concerns
- a Zustand-backed runtime graph store behind a runtime provider abstraction
- AppContext for auth/session-derived browser context

The architectural contract is the unified runtime graph, not direct dependence on a specific store library API from widgets.

---

## Walking Through the System

### Step 1 — The browser fetches the resolved schema

The browser calls `useViewMetadata(schemaId)`. The request goes directly to CDN. On a cache miss, CDN fetches `keystone-resolved-schemas/{schemaId}.json` from storage and returns it to the browser.

There is no Worker in the delivery path, no JWT decode at schema-fetch time, and no runtime schema-selection service.

The delivery mechanism is intentionally simple:

- one resolved schema artifact per `schemaId`
- one CDN path per artifact
- no delivery-time filtering or context matching
- browser never sees raw binding declarations or config keys

### Step 2 — The runtime builds one namespaced graph for the page

The schema declares named namespaces and data sources. The runtime hydrates those sources into one unified runtime graph. Widgets do not read directly from raw endpoint responses. They bind to declared graph paths.

That gives the page one read contract even if many API calls are needed.

### Step 3 — Schema conditions are evaluated locally

Conditions are static JSONLogic rules authored in schema from the product specs. They are evaluated locally against the runtime data graph.

Conditions may shape:

- widget visibility
- field visibility
- field required-state
- field editability
- convenience UI behavior tied to known state

Conditions are the preferred mechanism for UX differences. Variants are allowed only when a UX difference cannot be modeled cleanly and maintainably as a condition.

### Step 4 — The renderer mounts the widget tree

The schema is a widget tree. Forms are widgets. Fields are child widgets within form widgets.

Nodes resolve data in three ways:

1. bind to a graph path
2. resolve relative to parent scope
3. read inline schema values

### Step 5 — Backend APIs validate writes

The backend does not provide a dedicated workflow contract in v0. State-driven UI behavior is described in schema and evaluated against ordinary API state.

But the backend still validates every write.

The rule is:

**schema shapes the UX for known states; backend APIs remain the enforcement point for submitted mutations.**

### Step 6 — Display semantics are still pre-materialised

Labels, translations, badge variants, and other display mappings remain in the Config System. When config changes, the materialisation service rewrites affected resolved schema artifacts and purges CDN cache tags.

This is how display semantics are delivered in the architecture.

---

## What Is In Scope

This architecture is designed for:

- dashboards
- queues
- admin pages
- list-detail pages
- lightweight and medium-complexity forms
- schema-driven UX shaped mainly by static conditions

## What Is Out of Scope

This architecture does not include:

- dedicated workbench runtime
- bootstrap APIs for coherent multi-panel screens
- field-rule fetch APIs
- backend-driven workflow capability contracts
- dynamic rule authoring by business users
- multi-tenant schema selection and filtering

---

## Core Design Principles

**Schema is the page contract.** It declares the widget tree, data bindings, scope-resolution rules, initialization rules, and variants where necessary.

**Conditions first, variants second.** If a UX difference can be expressed cleanly as a condition, use a condition. Introduce a variant only when the difference cannot be expressed cleanly and maintainably that way.

**Variants are explicit schema artifacts in the POC.** If a variant exists, it has its own `schemaId` and is selected explicitly by route or configuration rather than by a runtime resolver.

**Display semantics are server-resolved.** The browser receives ready-to-render labels and display mappings.

**The UI reads one namespaced runtime graph.** Even when data comes from many sources, the consumer contract is one graph with reserved `system.*` and schema-declared `graph.*` namespaces, where namespace keys define runtime paths by convention.

**Backend validation remains authoritative.** Schema logic can shape presentation but not replace server-side mutation validation.

**Keep v0 intentionally narrow.** Avoid reintroducing generic workflow engines, dynamic field-rule systems, or unconstrained schema execution.

---

## Decision Index

This section is the one-line summary of the main implementation decisions in `arch_v0`.

- **Schema delivery is direct by `schemaId`.** The browser fetches one resolved artifact directly from CDN/S3 with no Worker or runtime selector. Detail: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- **Route-to-schema mapping is explicit.** Browser paths resolve to `schemaId`s through a route manifest and generic schema page shell, not identity-based delivery logic. Detail: [`16-ROUTE-MANIFEST-AND-SCHEMA-RESOLUTION.md`](./16-ROUTE-MANIFEST-AND-SCHEMA-RESOLUTION.md)
- **Resolved artifacts are the browser contract.** Source schemas may be composed however we like, but the browser fetches an already resolved artifact. Detail: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- **The UI reads one runtime graph.** The runtime contract is one graph with reserved `system.*` and schema-declared `graph.*` namespaces. Detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- **`system.*` is runtime-managed context.** Route params come from route resolution; user identity and permissions come from auth context. Detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md), [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)
- **Conditions use JSONLogic only.** Active UI conditions are schema-authored JSONLogic in the allowed subset; legacy condition DSLs are not part of v0. Detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md), [`13-SCHEMA-LINT-RULES.md`](./13-SCHEMA-LINT-RULES.md)
- **Forms are widgets, not a separate runtime class.** Mutable form state lives in explicit draft namespaces such as `graph.quoteDraft`. Detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md), [`12-PAGE-AUTHORING-MANUAL.md`](./12-PAGE-AUTHORING-MANUAL.md)
- **Conditions come before variants.** Variants are allowed only when a structural difference is less maintainable as conditions, and each variant has its own `schemaId`. Detail: [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md), [`09-DECISIONS-SUMMARY.md`](./09-DECISIONS-SUMMARY.md)
- **Backend validation remains authoritative.** Schema shapes UX, but reads and writes still depend on backend auth and validation. Detail: [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md), [`11-API-TEAM-CONTRACT.md`](./11-API-TEAM-CONTRACT.md)
- **Display semantics are delivered pre-materialised.** The browser receives display-ready schema artifacts; manual/scripted publication is acceptable before the full Config System exists. Detail: [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md), [`15-MIGRATION-AND-IMPLEMENTATION-PLAN.md`](./15-MIGRATION-AND-IMPLEMENTATION-PLAN.md)
- **All browser API access goes through one shared client path.** Direct raw `fetch()` is not the steady-state contract for migrated runtime code. Detail: [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md), [`11-API-TEAM-CONTRACT.md`](./11-API-TEAM-CONTRACT.md)
- **The runtime graph store is Zustand-backed behind an abstraction.** Consumers depend on `RuntimeGraph` and runtime hooks, not raw Zustand APIs. Detail: [`../decisions/ADR-runtime-graph-store-boundary.md`](../decisions/ADR-runtime-graph-store-boundary.md)
- **Early runtime auth uses a mocked provider behind an abstraction.** Runtime code depends on an auth contract now and swaps to the real JWT/cookie implementation later. Detail: [`../decisions/ADR-runtime-auth-context-source.md`](../decisions/ADR-runtime-auth-context-source.md)
- **`schemaId`s use lowercase kebab-case semantic names.** New IDs are approved through the schema contract ownership path, not invented ad hoc. Detail: [`../decisions/ADR-schemaid-naming-and-registration.md`](../decisions/ADR-schemaid-naming-and-registration.md)
- **Migration exceptions follow a runbook.** Shared-runtime additions and temporary bridges are decided through a runtime governance process, not individual preference. Detail: [`17-RUNTIME-GOVERNANCE-AND-BRIDGE-RUNBOOK.md`](./17-RUNTIME-GOVERNANCE-AND-BRIDGE-RUNBOOK.md)

---

## Operational Guarantees

This architecture adopts the following operating targets for the deployment model.

| Area | Target | Notes |
|---|---|---|
| Schema fetch, warm CDN | p95 < 30ms | CDN hit path |
| Schema fetch, cold origin | p95 < 150ms | CDN miss plus S3 fetch |
| Schema availability | 99.9% monthly | Last-known-good schema served where possible |
| Config save to fresh schema availability | p95 < 120s | Includes materialisation and CDN purge |
| Unknown config gap alerting | < 1 min | Gap event to monitoring pipeline |
| Contract violation alerting | < 5 min | Sentry/Datadog/PagerDuty path |
| Hotfix rollback execution | < 15 min | Break-glass and versioned object restore |

These are targets, not guarantees of zero incidents. They are the basis for monitoring and escalation.

---

## Major Tradeoffs

**Schema becomes more load-bearing.** This is acceptable in v0 because conditions are stable and product-specified.

**Runtime graph discipline becomes critical.** Without explicit namespace naming and binding conventions, the graph will drift and the simplification will erode.

**Variant sprawl is a real risk.** The architecture explicitly prefers conditions to prevent exploding numbers of schema artifacts.

**No workbench support in v0 is a conscious scope cut.** The architecture is coherent because it refuses that complexity rather than pretending to support it partially.

**Static conditions are the principal architectural bet.** v0 assumes most condition logic is stable, known from specs, and can move through the schema publication cycle. If that assumption breaks and rule changes begin happening frequently and independently of schema publication, the next step should be a narrowly scoped dynamic rule layer rather than stretching schema conditions indefinitely.

**Direct schema delivery assumes schemas are non-sensitive metadata.** If that assumption changes, schema delivery will need signed or otherwise protected access rather than a static CDN path.

---

## Documents In This Set

```text
docs/arch_v0/
  README.md
  00-SYSTEM-DESIGN.md
  01-SCHEMA-DELIVERY.md
  02-AUTH-AND-SECURITY.md
  03-CONFIG-AND-MATERIALISATION.md
  04-RUNTIME-AND-CONDITIONS.md
  05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md
  06-ONBOARDING-AND-LIFECYCLE.md
  07-ARCHITECTURE-COMPLETENESS.md
  08-SCHEMA-AUTHORING-AND-REVIEW.md
  09-DECISIONS-SUMMARY.md
  10-TERMS-AND-ASSUMPTIONS.md
  11-API-TEAM-CONTRACT.md
  12-PAGE-AUTHORING-MANUAL.md
  13-SCHEMA-LINT-RULES.md
```
