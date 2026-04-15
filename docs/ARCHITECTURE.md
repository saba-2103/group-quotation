# Keystone UI Architecture

**Status:** Adopted  
**Date:** 2026-04-08  
**Supersedes:** `BROWSER_ARCHITECTURE_COUNTERPROPOSAL.md`, `ADR-003-bff-vs-browser-assembly.md`

---

## What This Is

Keystone UI is a metadata-driven, multi-tenant insurance platform. This document is the single authoritative reference for how the UI is assembled, rendered, and kept consistent across tenants, roles, lines of business, and locales.

The architecture is browser-based: the browser fetches schemas and data directly, with no Backend-for-Frontend middleware server. Schema resolution runs at the CDN edge. Display config is owned by a dedicated Client Config System that pre-materialises translations before the browser ever sees them. Conditional field logic is served as JSONLogic from the backend and evaluated locally.

There is also a distinction the product assessment makes explicit and this architecture respects: metadata drives the **shell** (layout, standard widgets, configurable surfaces). It does not drive **workbench interaction** (staged decisions, workflow state, domain-specific dense UIs). Both layers are defined here.

---

## System at a Glance

```
Browser
  │
  ├─ useViewMetadata()
  │     └─► CDN Edge Function
  │              └─► S3: resolved-schema.json
  │                  (schema + config bindings already materialised)
  │
  ├─ useSmartQuery() / useWorkbenchBootstrap()
  │     └─► Backend APIs (/v1/...)
  │              JWT Bearer auth
  │              Domain data only — no display semantics
  │
  ├─ useFieldConfig()
  │     └─► Field Config API (/v1/field-config/batch)
  │              JWT Bearer auth
  │              Returns JSONLogic rules, evaluated in browser
  │
  └─ [Workbench pages only]
        useWorkbenchBootstrap()
        └─► Bootstrap API (/v1/{domain}/bootstrap)
                 Returns: case header, entities, action capabilities,
                          workflow contract (stage, blockers, draft state),
                          pending jobs, region payloads

Config System (server-side, not browser-facing directly)
  ├─ Stores config blobs (labels, translations, display mappings)
  ├─ On save → emits event → Schema Materialisation Service
  └─ Schema Materialisation Service writes resolved-schema.json to S3
```

---

## The UI Model: Four Layers

Before the technical layers, a structural point from the product assessment that shapes everything.

The architecture has four distinct layers of UI concern:

| Layer | What It Owns | Driven By |
|---|---|---|
| **A — Metadata Shell** | Layout, regions, tabs, standard widgets, columns, standard actions, label display, tenant/role/LOB variants | Schema (resolved, from S3 via CDN edge) |
| **B — Workflow Contract** | Stage, allowed actions, blockers, required evidence, draft state, async jobs, audit rules | Orchestration API response |
| **C — Domain Widget Contracts** | Props for coded widgets, event contracts, region-specific view models, diff/compare payloads | Bootstrap API response |
| **D — Domain Logic** | Business truth, persistence, workflow progression, validation, transactional integrity | Backend / orchestration services |

The browser arch technical layers (1–6 below) are the implementation substrate. Layers A through D are the design model that tells you what belongs where.

**Schema context is for slow-changing dimensions only:** tenant, role, LOB, locale, portal type, product family. Volatile transactional state (quote status, endorsement subtype, claim severity) must not drive schema variants — it creates an unmanageable combination matrix. Transactional state drives workflow contracts and action capabilities, not schema resolution.

---

## Layer 1 — Edge Schema Resolution

The CDN edge function is a stateless worker (Cloudflare Worker or equivalent) co-deployed with the frontend. It does not provision, scale, or maintain any application server.

**What it does:**

1. Reads the user's JWT context: `tenantId`, `role`, `lob`, `locale`, `portalType`
2. Fetches the schema file for the tenant from S3 (`{viewId}/{tenantId}.json`, falling back to `{viewId}/default.json`)
3. Applies the schema's conditional partials: overrides whose conditions match the user's JWT claims are deep-merged onto the base, in declared order
4. Returns the resolved schema (which already has config values baked in — see Layer 3)
5. Serves the result with a long CDN TTL (`Cache-Control: public, max-age=300, stale-while-revalidate=3600`)

**S3 schema layout:**

```
s3://keystone-resolved-schemas/
  {viewId}/
    default.json             ← universal fallback for tenants with no explicit schema
    {tenantId}.json          ← one file per tenant; flat schema with inline $show/$hide conditions
```

Each file is a flat schema document — columns, actions, widgets, all in one place, with `$show`/`$hide` conditions annotated directly on conditional items. All config binding values are already materialised by the Schema Materialisation Service. The browser never fetches raw bindings or config blobs.

The `config-bindings.json` files (the declarations of what config keys a schema needs) are authoring-time artefacts stored separately in `keystone-schema-bindings/` and consumed only by the Materialisation Service. They are never in the CDN-accessible bucket.

**Inline conditions:** Schema items carry their own visibility conditions — `$show` or `$hide` annotated directly on any column, action, or widget that is conditional. The Worker filters the document at request time: items whose condition doesn't match the JWT claims are removed before the response is sent. There is no separate overrides block, no merge logic, no ordering concerns. See [ADR-003](ADR-003-schema-partials-replace-specificity.md) for why specificity scoring was replaced and why inline conditions were chosen over a flat partials array.

**Cold-fetch latency:** The first schema request to a cold CDN edge node involves two `GetObject` calls at most — approximately 30–60ms. Mitigated by `stale-while-revalidate`, pre-warming on deploy, and React Query in-memory caching making this the cold path only.

→ *Detail doc to be written: `browser-arch/01-EDGE-SCHEMA-RESOLUTION.md`*

---

## Layer 2 — Auth and Security

**JWT lifecycle:**

- Access token: short-lived, held in memory only (never `localStorage`). XSS cannot steal it.
- Refresh token: `HttpOnly` cookie. Enables silent re-authentication across page loads without exposing the token to JavaScript.

**Backend JWT validation:**

All backend services validate the JWT using a shared platform middleware package. The middleware exposes three guards: `authenticate` (token validity), `tenantGuard` (claim matches the requested resource's tenant), `requirePermission` (role/permission check).

Cross-tenant access returns `404`, not `403`. This prevents resource existence leakage (IDOR) — an attacker cannot confirm whether a resource exists for another tenant by observing the response code.

**CORS:** Without a same-origin BFF proxy, every backend endpoint must configure CORS for the frontend origin. Managed by the shared platform middleware package — one-time setup per service, not per endpoint.

**Capability flags are backend-enforced, not config-driven:** Action capabilities (`canApprove`, `canIssue`, `canPost`, `canSettle`) are evaluated by the orchestration backend and returned in the workflow contract. They are not derived from browser-held config. The Client Config System (Layer 3) is for display — it cannot grant or restrict action authority.

→ *Detail doc to be written: `browser-arch/02-AUTH-AND-SECURITY.md`*

---

## Layer 3 — Client Config System

This is the new layer that replaces the backend view model translation convention from the previous architecture. It is the most significant departure from earlier designs.

### The Core Idea

All display semantics — labels, translations, badge variants, flags — are owned by the Config System, not by the backend. The backend owns domain codes (`PENDING_APPROVAL`, `MOTOR_COMPREHENSIVE`). The Config System owns what those codes mean to the user.

When the browser renders a schema, it never sees a raw domain code or a `{field}Display` view model convention. It sees a resolved schema: a schema file where config-derived display values have already been baked in at the time the config was last saved.

### Config System Responsibilities

The Client Config System is a standalone service with full CRUD over config blobs:

```
Config blob key:   insurance.quotation.status.PENDING_APPROVAL
Config blob value: { label: "Pending Approval", variant: "warning" }

Config blob key:   insurance.quotation.status.DRAFT
Config blob value: { label: "Draft", variant: "neutral" }

Config blob key:   insurance.motor.lob.label
Config blob value: "Motor Comprehensive"
```

Config blobs are multi-dimensional: a blob can have a base value and per-tenant overrides. Config specificity inherits from schema specificity — the same resolution pass that selects the schema variant for `tenantId=gi+role=underwriter` also resolves config values for that variant. One algorithm, one materialized output.

**Backend coordination policy:** If the backend introduces a new enum value or domain code, it must register the display mapping in the Config System before the code is used in production. This is a workflow policy, not a technical enforcement. Enforcement is via the fallback contract (see below).

### Schema-Level Config Bindings

Config bindings are declared at the schema level, not the component level. Components are context-free (a `Badge` component doesn't know if it's rendering a quotation status or a claims status). The schema is the unit of business context.

```json
// quotations-list/config-bindings.json  (authored when schema is created)
{
  "columns.status.valueMap": {
    "configKey": "insurance.quotation.status",
    "mapping": "enum → { label, variant }"
  },
  "header.title": {
    "configKey": "insurance.quotation.list.title"
  }
}
```

```json
// claims-list/config-bindings.json
{
  "columns.status.valueMap": {
    "configKey": "insurance.claims.status",
    "mapping": "enum → { label, variant }"
  }
}
```

The same `Badge` component renders both. The schema declares what it binds to. The component is reusable.

### Pre-Materialisation at Save Time

Transformations run **server-side at config save time**, not in the browser. The browser never receives transformation logic — only the resolved output.

When a config blob is saved:
1. The Config System emits a save event (via webhook call or queue message)
2. The Schema Materialisation Service receives the event
3. It identifies all schema variants whose bindings reference the changed config key
4. For each affected variant: resolves all config bindings against current config → produces a new `resolved-schema.json`
5. Writes the resolved file to S3
6. CDN cache for the affected schema paths is invalidated

The browser fetches the resolved schema. It sees `{ label: "Pending Approval", variant: "warning" }` directly in the schema payload — not a domain code to be interpreted.

### Event-Driven Fan-Out

The save hook is a server-side mechanism — a pre-registered API endpoint called when a config save event fires, or a message pushed to a queue polled by the Materialisation Service. There is no browser-side observer, no React hook, no global pub-sub in the client.

Fan-out is handled async. If 50 schemas bind to a widely-used config key, all 50 are queued for recomputation. The browser sees eventually-consistent data — the last-known-good resolved schema is served via `stale-while-revalidate` while new files are being written.

### Fallback Contract

If a config key has no entry for a particular enum value (new backend code not yet registered), the Materialisation Service renders:

```json
{ "label": "<raw_value>", "variant": "neutral" }
```

The raw domain code is shown as-is, styled neutrally. No component breaks. A monitoring alert fires on any unknown config key resolution — this is the visibility mechanism that surfaces config gaps before users notice.

If the resolved schema fetch fails entirely, components must render with sensible structural defaults (empty state, not broken layout). The same defensive contract that existed for the CDN cold-fetch applies here.

### Config Key Governance

- Config keys are **immutable by default**. New values use new keys; existing keys are not renamed.
- A migration tool (part of the authoring admin) finds all schema bindings that reference a given key before it can be deprecated.
- Key deprecation is a two-step process: add new key → migrate bindings → mark old key deprecated → remove after all bindings migrated.
- Config key renames that skip this process are breaking changes — the Materialisation Service will produce unknown-key fallbacks for any binding that references the old key.

### Authoring Tooling

The admin screen (the current project's admin surfaces) is the user-facing entry point for the Config System. It must include:

- A config key browser: browse available keys, see current values, see which schemas bind to each key
- A binding declaration editor: when creating or editing a schema, declare what config keys it needs
- A preview mode: show the resolved schema output for a given context before committing
- A gap report: list config keys referenced by schemas that have no registered value

This tooling is load-bearing. Without it, config key errors and binding mismatches will be discovered in production rather than at authoring time.

→ *Detail doc to be written: `browser-arch/03-CLIENT-CONFIG-SYSTEM.md`*

---

## Layer 4 — Contract Enforcement

Two-layer defence, unchanged from the previous browser arch:

**1. Pact (CI — pre-deployment)**

Consumer-driven contract tests define the shape the frontend expects from backend APIs. Backend CI verifies its responses match. A field rename blocks deployment before any user is affected.

All API calls go through `createApiClient`, a factory that:
- Attaches the JWT Bearer token
- Handles 401 → silent token refresh → retry
- Parses the response against a Zod schema
- Reports violations immediately to Sentry and Datadog

A `no-raw-fetch` ESLint rule bans direct `fetch()` calls. Adding a new API endpoint cannot accidentally omit validation — the developer must provide a Zod schema to use the factory.

**2. Browser Zod (runtime — safety net)**

Catches edge cases Pact doesn't cover. An alert fires on any production Zod violation. Pact is the early-warning system; Zod is the fallback.

**Config schema changes and Pact:** The Client Config System introduces resolved schema as an artifact that must also be contract-tested. The resolved schema format (what fields get materialised, what their types are) should have its own Zod schema validated at schema fetch time. Config system changes that alter the resolved schema format must pass through the same Pact CI gate as backend API changes.

→ *Detail doc to be written: `browser-arch/04-CONTRACT-ENFORCEMENT.md`*

---

## Layer 5 — Field Config API (Conditional Logic)

The backend serves field-level conditional logic as JSONLogic expressions via `POST /v1/field-config/batch`. The browser fetches the rules once per form (cached 5 minutes) and evaluates them locally on every form value change — no server round-trip per keystroke.

Rules can express: field visibility, editability, required state, dynamic option lists, and validation.

The `$context` namespace (role, tenantId, lob, locale) is populated from the JWT — server-verified, not from form input. A user cannot spoof their role by manipulating form state.

**Relationship to Config System:** The Field Config API handles orchestration-level conditional logic — what the backend knows about business rules. The Config System handles display config — what things are called. These are distinct concerns. A field being conditionally visible is backend logic. What its label says is config.

**Backend coordination policy for capabilities:** Action capabilities (`canApprove`, `canIssue`, etc.) come from the workflow contract (Layer 6B), not from JSONLogic rules in the Field Config API. JSONLogic drives field-level UI behaviour within a form. It does not gate business-critical actions.

→ *Detail doc to be written: `browser-arch/05-FIELD-CONFIG-API.md`*

---

## Layer 6 — Client Runtime

### 6A — State Management

Three stores, each with a defined scope:

| Store | Technology | What lives here |
|---|---|---|
| Server state | React Query | API responses, mutations, background refetches |
| Interaction state | Zustand | Selected rows, search text, panel open/closed, active filters |
| Identity | React Context (`AppContext`) | `userId`, `role`, `tenantId`, `lob`, `locale` — from JWT |

`WidgetCondition` (widget visibility) reads from any of the three stores. `RowCondition` (row action visibility) evaluates against the row's own data. `useFieldConfig` evaluates JSONLogic against local form state. No prop drilling; server state conditions read directly from the React Query global cache via `queryClient.getQueryData()`.

### 6B — Workbench Runtime (Workflow-Aware Pages)

For pages that are part of a business process — quotation workbenches, PAS servicing cockpits, claims desks, accounting recon consoles — the client runtime extends with a workflow-aware layer.

**Workbench Bootstrap Pattern:**

Standard pages (dashboards, queues, list-detail) fetch schema once, then data per widget. This is fine.

Workbench pages need a coherent snapshot. Per-widget fetches produce inconsistent timing, partial stale states, and hard-to-reproduce race conditions. Instead:

```
1. fetch schema                       (CDN-cached, Layer 1)
2. fetch workbench bootstrap payload  (1 call, coherent snapshot)
3. hydrate all major regions from snapshot
4. selective child refresh for subpanels after initial render
```

The bootstrap response includes: case header, stage, workflow info, summary cards, primary entities, action capabilities, evidence status, pending jobs, region-level payloads for key widgets.

**Workflow Contract:**

The workflow contract is returned in the bootstrap response. It answers:

- What stage is this case in
- Who owns this task
- What actions are allowed right now (explicit list, not derived from cache)
- What blockers exist
- What evidence is required
- What jobs are running
- Whether draft exists

```json
{
  "workflow": {
    "stage": "UNDERWRITING_REVIEW",
    "caseId": "QT-2024-0042",
    "taskOwner": "underwriter",
    "status": "IN_PROGRESS",
    "blockers": [],
    "actions": {
      "approveQuote":   { "enabled": false, "reasons": ["pricing_not_finalized"] },
      "referDecision":  { "enabled": true },
      "requestEvidence":{ "enabled": true }
    },
    "jobs": [],
    "draftState": { "exists": false }
  }
}
```

Action capabilities are evaluated by the orchestration backend, not derived from browser state. Hiding an action in the UI is convenience; the backend enforces the actual gate.

**Client runtime modules for workbench pages:**

- `WorkflowRuntime` — consumes the workflow contract, exposes action availability and blockers
- `DraftRuntime` — autosave, restore, conflict detection, compare against published state
- `JobRuntime` — async job status, progressive updates, retry/replay controls
- `AuditRuntime` — reason capture, evidence linkage for regulated actions

### 6C — Widget Registry

The `WidgetRegistry` maps schema `type` strings to React components. Any component that satisfies a declared prop contract can be registered. The registry is type-agnostic — it does not classify components.

Schema is the business entity. Components are UI. The registry is the binding between them. What a component renders internally is not an architecture concern.

→ [`browser-arch/06d-WIDGET-REGISTRY.md`](browser-arch/06d-WIDGET-REGISTRY.md)

---

## What Replaced What

| Previous architecture element | Status in this architecture |
|---|---|
| Backend `{field}Display` view model convention | **Replaced** by Config System pre-materialisation |
| `valueMapping` in schema columns | **Replaced** by schema-level config binding declarations |
| `TENANT_LABEL_OVERRIDES` in backend | **Replaced** by Config System per-tenant config blobs |
| CDN edge function (Layer 1) | **Updated** — specificity algorithm replaced with schema-level conditional partials (see ADR-003) |
| Field Config API / JSONLogic (Layer 5) | **Unchanged** |
| Pact + Browser Zod contract enforcement (Layer 4) | **Unchanged, extended** to cover resolved schema format |
| Three client state stores (Layer 6) | **Unchanged** |
| BFF middleware server | **Absent** — never existed in this architecture |

---

## Key Design Decisions

**1. Config pre-materialised server-side, not transformed in the browser.**
The browser fetches resolved data. No transformation logic executes in the browser. No executable config. No arbitrary code paths from the config store.

**2. Schema-level config binding, not component-level.**
Components are context-free. Schemas carry business context. The same `Badge` component works in a quotation list and a claims list because the binding to the right config key is declared in the schema, not the component.

**3. Config values are co-located with the schema variant they apply to.**
Each tenant's schema file contains its own partials, and config values are materialised into those partials at write time. Tenant A's label overrides live inside Tenant A's schema file. There is no cross-tenant resolution pass.

**4. Backend owns domain codes. Config System owns display semantics.**
When the backend introduces a new enum value, it registers the display mapping in the Config System before using the code in production. The Materialisation Service falls back to `{ label: value, variant: "neutral" }` with a monitoring alert for any unregistered code.

**5. Event-driven recomputation via webhooks or queues, not browser-side observers.**
The Materialisation Service is a server-side consumer of config save events. Fan-out is async. The browser sees eventually-consistent data with `stale-while-revalidate` bridging the recomputation window.

**6. Action capabilities come from the orchestration backend, not from config or browser state.**
`canApprove`, `canIssue`, `canPost` are returned in the workflow contract from backend evaluation. They are not derived from cached widget state, not stored in config, not computed in the browser.

**7. Metadata drives the shell. Workflow contracts and domain widgets drive workbenches.**
The metadata layer is the right tool for configurable surfaces: portals, queues, list-detail, admin screens. For staged business processes, the workflow contract layer is load-bearing. Domain widgets handle dense interactions that metadata cannot adequately represent.

---

## Honest Trade-offs

**Config change latency.** When a config blob is saved, the browser sees the new labels after the Materialisation Service writes new resolved schemas and CDN cache is invalidated. This window is seconds to low minutes. For a label change this is acceptable. Not acceptable for anything time-critical — but labels and display config are not time-critical.

**Schema authoring is now two artefacts.** A developer creating a new schema must also declare its config bindings. Without tooling (the admin config key browser), this is a friction point. Tooling is therefore not optional — it is a first-class deliverable.

**Config key renames are breaking changes.** The immutability policy and migration tooling mitigate this but do not eliminate the coordination cost. Teams must treat config keys as versioned public contracts.

**Fan-out at scale.** A widely-used config key change triggers recomputation of many schema variants. This is async and bounded, but at large scale (hundreds of schema variants) it needs queue depth monitoring and backpressure handling.

**Workbench bootstrap payload size.** A single coherent bootstrap payload for a complex workbench page can be large. It must be optimised: lazy-load region payloads, redact sensitive fields based on role, compress at the CDN edge. First meaningful render time is the metric to track.

---

## Document Tree

```
docs/ARCHITECTURE.md                          ← this document (start here)
│
├── browser-arch/01-EDGE-SCHEMA-RESOLUTION.md       (to be written)
│   ├── browser-arch/01a-CLOUDFLARE-WORKER.md
│   ├── browser-arch/01b-S3-SCHEMA-LAYOUT.md
│   └── browser-arch/01c-SPECIFICITY-ALGORITHM.md
│
├── browser-arch/02-AUTH-AND-SECURITY.md            (to be written)
│   ├── browser-arch/02a-JWT-CLAIMS-CONTRACT.md
│   ├── browser-arch/02b-BACKEND-JWT-VALIDATION.md
│   └── browser-arch/02c-IDOR-AND-CORS.md
│
├── browser-arch/03-CLIENT-CONFIG-SYSTEM.md         (to be written)
│   ├── browser-arch/03a-CONFIG-BLOB-SCHEMA.md
│   ├── browser-arch/03b-SCHEMA-BINDINGS.md
│   ├── browser-arch/03c-MATERIALISATION-SERVICE.md
│   └── browser-arch/03d-KEY-GOVERNANCE.md
│
├── browser-arch/04-CONTRACT-ENFORCEMENT.md         (to be written)
│   ├── browser-arch/04a-PACT-CONTRACT-TESTING.md
│   └── browser-arch/04b-BROWSER-ZOD-AND-OBSERVABILITY.md
│
├── browser-arch/05-FIELD-CONFIG-API.md             (to be written)
│   ├── browser-arch/05a-API-SPECIFICATION.md
│   └── browser-arch/05b-JSONLOGIC-PATTERNS.md
│
└── browser-arch/06-CLIENT-RUNTIME.md
    ├── browser-arch/06a-STATE-MANAGEMENT.md
    ├── browser-arch/06b-WIDGET-AND-FIELD-CONDITIONS.md
    ├── browser-arch/06c-WORKBENCH-RUNTIME.md
    └── browser-arch/06d-WIDGET-REGISTRY.md
```

---

## Where to Start

| You are... | Start here |
|---|---|
| New to the codebase | This document, then `06-CLIENT-RUNTIME.md` |
| Adding a new page / schema | `01-EDGE-SCHEMA-RESOLUTION.md` → `01b-S3-SCHEMA-LAYOUT.md`, then `03-CLIENT-CONFIG-SYSTEM.md` → `03b-SCHEMA-BINDINGS.md` |
| Adding or editing config labels / translations | `03-CLIENT-CONFIG-SYSTEM.md` → admin tooling → config key browser |
| Adding a new API endpoint | `04-CONTRACT-ENFORCEMENT.md` → `04a` (Pact test) + `04b` (Zod schema + createApiClient) |
| Adding form field logic | `05-FIELD-CONFIG-API.md` → `05a` + `05b` |
| Backend engineer adding a new status code | Register in Config System first → `03-CLIENT-CONFIG-SYSTEM.md` |
| Building a workbench page | `06-CLIENT-RUNTIME.md` → `06c-WORKBENCH-RUNTIME.md` — bootstrap pattern, workflow contract shape |
| Reviewing auth or security | `02-AUTH-AND-SECURITY.md` |
