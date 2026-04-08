# Layer 3 — Client Config System

**Layer:** 3 of 4  
**Scope:** Display semantics ownership — labels, translations, badge variants, display flags  
**Status:** Active  

**Child documents:**
- [03a — Config Blob Schema](./03a-CONFIG-BLOB-SCHEMA.md)
- [03b — Schema Bindings](./03b-SCHEMA-BINDINGS.md)
- [03c — Materialisation Service](./03c-MATERIALISATION-SERVICE.md)
- [03d — Key Governance](./03d-KEY-GOVERNANCE.md)

---

## 1. What the Config System Is

The Config System is the single authoritative store for all **display semantics** in Keystone UI. It answers the question: _given a raw domain code produced by the backend, what should a user see?_

The backend emits domain codes — `PENDING_APPROVAL`, `MOTOR_COMPREHENSIVE`, `CLAIM_REJECTED` — because those are stable, programmatic identifiers appropriate for domain logic. The backend has no stake in whether users see "Pending Approval" or "Awaiting Review", whether the badge is amber or orange, or whether a field label reads "Sum Insured" or "Coverage Amount" for a given tenant locale.

The Config System owns those decisions. It stores config blobs keyed by a structured namespace (e.g. `insurance.quotation.status.PENDING_APPROVAL`) and resolves them into browser-ready values (`{ label: "Pending Approval", variant: "warning" }`). The browser never sees the transformation — it receives resolved output only.

### What the Config System is NOT

The Config System is not:
- A feature flag system (use a dedicated flag service for that)
- A runtime translation engine (translations are baked in at materialisation time)
- A component configuration store (components are context-free; config binds at the schema level)
- A backend view-model translator (that pattern is explicitly replaced by this system)

---

## 2. Why It Exists — The Problem It Replaces

Before the Config System, display semantics leaked into three places simultaneously:

1. **Backend view models** — API responses included `statusLabel: "Pending Approval"` baked in English, non-overridable per tenant
2. **Frontend switch statements** — components had `if (status === 'PENDING_APPROVAL') return <Badge variant="warning">...`
3. **Ad-hoc tenant overrides** — one-off props passed down through component trees to handle tenant-specific labelling

This created a maintenance problem: changing a label required coordinating a backend deploy, a frontend deploy, and auditing all the places the enum was rendered. Multi-tenant label overrides were expensive to build and fragile.

The Config System centralises all of this. One config blob save triggers a cascade that updates every affected resolved schema, so the change is live at the CDN edge before the next browser request arrives. No component changes, no backend deploys.

---

## 3. System Responsibilities

The Config System has three primary responsibilities:

### 3.1 CRUD over Config Blobs

The Config System exposes a REST API for creating, reading, updating, and querying config blobs. A config blob is a structured key-value pair with optional tenant and locale scoping. Full data model: see [03a — Config Blob Schema](./03a-CONFIG-BLOB-SCHEMA.md).

Key operations:
- Create a new key with a value (keys are immutable identifiers once created)
- Update a key's value (base or tenant-scoped)
- Deprecate a key (marks it as deprecated without deleting it)
- Query blobs by namespace prefix (e.g. all keys under `insurance.quotation.status`)
- List schemas bound to a key (for migration tooling; see [03d — Key Governance](./03d-KEY-GOVERNANCE.md))

### 3.2 Emit Events on Save

When any config blob value is written, the Config System emits a structured event to the event bus (webhook or queue, both supported — see [03c — Materialisation Service](./03c-MATERIALISATION-SERVICE.md)):

```json
{
  "eventType": "config.blob.saved",
  "configKey": "insurance.quotation.status.PENDING_APPROVAL",
  "namespace": "insurance.quotation.status",
  "affectedTenantIds": ["tenant_base", "tenant_abc"],
  "locale": "en-GB",
  "timestamp": "2026-04-08T10:23:00Z",
  "correlationId": "evt_01hx..."
}
```

This event is the trigger for schema materialisation. The Config System does not itself touch schemas or S3 — it only emits and moves on.

### 3.3 Admin UI Entry Point

The Config System exposes an admin screen within the Keystone UI admin surfaces. This screen is the primary entry point for ops and product teams to manage display semantics without a code deploy.

Admin screen features:
- Browse config keys by namespace tree
- Inline edit values with live preview of resolved badge/label
- Per-tenant override editor (set a tenant-specific value that overrides the base)
- Deprecation workflow (mark key deprecated, see migration path)
- Gap report: shows all schema bindings that reference a key with no registered value for some context
- Key creation form (enforces naming conventions; see [03d — Key Governance](./03d-KEY-GOVERNANCE.md))

---

## 4. Full Event Flow

The following describes the complete path from an admin saving a config value to the browser receiving the resolved output.

```
┌─────────────────────────────────────────────────────────┐
│                    Admin saves config blob               │
│     e.g. insurance.quotation.status.PENDING_APPROVAL     │
│           → { label: "Pending Approval", variant: "warning" }│
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Config System API                      │
│  - Validates key format and value type                   │
│  - Writes blob to Config System datastore                │
│  - Emits config.blob.saved event                        │
│    { configKey, namespace, affectedTenantIds, locale }  │
└────────────────────────┬────────────────────────────────┘
                         │
              webhook / queue message
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│             Schema Materialisation Service               │
│                                                          │
│  Step 1: Receive event                                   │
│  Step 2: Scan keystone-schema-bindings/ in S3           │
│          → Find all config-bindings.json files that      │
│            reference configKey or its namespace          │
│  Step 3: For each matched viewId:                        │
│          → Determine which schema variants are affected  │
│            (tenant context matches affectedTenantIds)    │
│  Step 4: For each variant:                               │
│          → Load raw schema                               │
│          → Load config-bindings.json                     │
│          → Fetch all referenced config blobs             │
│            (with tenant + locale specificity)            │
│          → Resolve all binding paths                     │
│          → Write resolved-schema.json to S3              │
│  Step 5: Emit CDN purge request for each written key     │
│  Step 6: Emit config.materialisation.complete event      │
└────────────────────────┬────────────────────────────────┘
                         │
                  S3 write + CDN purge
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               CDN Edge (CloudFront / Fastly)             │
│  Serves resolved-schema.json from cache                  │
│  Cache invalidated by materialisation service            │
│  Next browser request fetches fresh resolved schema      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
│  Fetches resolved-schema.json                            │
│  Schema already contains:                               │
│    columns.status.valueMap: {                            │
│      "PENDING_APPROVAL": {                               │
│        label: "Pending Approval",                        │
│        variant: "warning"                                │
│      },                                                  │
│      "DRAFT": { label: "Draft", variant: "neutral" }    │
│    }                                                     │
│  No raw domain codes. No binding declarations.           │
│  No transformation logic executed in the browser.        │
└─────────────────────────────────────────────────────────┘
```

### Event-Driven Fan-Out

A single config blob save can fan out to many schema re-materialisations. If the key `insurance.quotation.status.PENDING_APPROVAL` is referenced by 12 schema variants (e.g. `quotations-list` across 6 tenants × 2 locales), all 12 are re-materialised in the same batch triggered by that one event.

This is intentional: the cost of re-materialisation is paid at write time (save), not at read time (browser request). Browser requests are always served resolved output from CDN — no per-request transformation overhead.

---

## 5. Config Specificity and Schema Specificity

Config specificity uses the same conceptual algorithm as schema specificity (Layer 2). When the Materialisation Service resolves a binding for a given schema variant context, it finds the _most specific_ config blob for that context.

### Specificity Dimensions

| Dimension | Less Specific | More Specific |
|-----------|--------------|---------------|
| Tenant | base (no tenantId) | tenant-specific (tenantId: "tenant_abc") |
| Locale | base (no locale) | locale-specific (locale: "ar-AE") |

Resolution order (highest specificity wins):
1. `tenantId = tenant_abc` + `locale = ar-AE`
2. `tenantId = tenant_abc` + `locale = null`
3. `tenantId = null` + `locale = ar-AE`
4. `tenantId = null` + `locale = null` (base)

The Materialisation Service performs this lookup for every config binding when computing a schema variant. The resolved variant already encodes the correct value for that specific tenant × locale combination.

### Same Resolution Pass

The key architectural point: config resolution is not a separate pass. The Materialisation Service resolves schema specificity (which raw schema to use) and config specificity (which config blob value to use) together in a single materialisation pass per variant. The output is a fully resolved schema — every binding replaced by its resolved value, every domain code translated.

---

## 6. What the Browser Sees

The browser receives `resolved-schema.json` via CDN. This file is the output of the materialisation pass. It contains only resolved values — no binding declarations, no config keys, no raw domain codes.

Example fragment of a resolved schema (compare to the binding declaration in [03b](./03b-SCHEMA-BINDINGS.md)):

```json
{
  "viewId": "quotations-list",
  "tenantId": "tenant_abc",
  "locale": "en-GB",
  "resolvedAt": "2026-04-08T10:23:45Z",
  "header": {
    "title": "Quotations"
  },
  "columns": [
    {
      "id": "status",
      "label": "Status",
      "type": "badge",
      "valueMap": {
        "PENDING_APPROVAL": { "label": "Pending Approval", "variant": "warning" },
        "DRAFT":            { "label": "Draft",            "variant": "neutral" },
        "APPROVED":         { "label": "Approved",         "variant": "success" },
        "REJECTED":         { "label": "Rejected",         "variant": "destructive" },
        "EXPIRED":          { "label": "Expired",          "variant": "pending" }
      }
    }
  ]
}
```

The browser-side rendering layer reads `valueMap[row.status]` and renders the badge directly. No switch statements. No config key lookups. No transformation logic.

### Fallback Behaviour

If the Materialisation Service encounters an enum value with no registered config blob (e.g. the backend adds a new status code before the config team registers it), it writes:

```json
{ "label": "<raw_value>", "variant": "neutral" }
```

and emits a `config.gap.detected` monitoring event. The browser will render the raw value as a neutral badge — visible but not broken. The monitoring event creates an alert for the config team to register the missing blob.

---

## 7. The Admin Screen

The Config System admin surfaces are part of the existing Keystone UI admin module. Engineers and ops teams interact with the Config System through this screen — it is the _only_ supported way to create or modify config blobs outside of direct API calls.

Key admin screens (existing in current project):

| Screen | Path | Purpose |
|--------|------|---------|
| Config Key Browser | `/admin/config` | Browse all keys by namespace, view current values |
| Key Editor | `/admin/config/:key` | Edit base value, add tenant overrides, view bound schemas |
| Gap Report | `/admin/config/gaps` | Shows bindings with missing config values |
| Deprecation Manager | `/admin/config/deprecations` | Active deprecations, migration progress |
| Event Log | `/admin/config/events` | Recent materialisation events, status, latency |

The admin screen enforces all governance rules at the UI level (key naming, value type validation, namespace ownership). It surfaces the gap report and deprecation state so config gaps are caught before they reach production.

---

## 8. Key Constraints and Invariants

These constraints are enforced by the Config System and are not optional:

| Constraint | Enforcement |
|-----------|-------------|
| Config keys are immutable identifiers | API rejects rename operations; deprecation is the only exit |
| Key naming follows `{domain}.{subdomain}.{entity}.{attribute}` convention | API validates format on create |
| Values must match the declared mapping type of the binding | Materialisation validates at write time |
| Unknown enum values fall back to `{ label: "<raw_value>", variant: "neutral" }` | Materialisation Service; gap alert emitted |
| Namespace ownership controls who can create keys | API enforces team ownership per namespace prefix |

---

## 9. Child Document Index

| Doc | Topic |
|-----|-------|
| [03a — Config Blob Schema](./03a-CONFIG-BLOB-SCHEMA.md) | Data model, key naming, value types, CRUD API, example payloads |
| [03b — Schema Bindings](./03b-SCHEMA-BINDINGS.md) | Binding declaration format, mapping types, path targeting, authoring workflow |
| [03c — Materialisation Service](./03c-MATERIALISATION-SERVICE.md) | Service design, algorithm, resolution, error handling, monitoring |
| [03d — Key Governance](./03d-KEY-GOVERNANCE.md) | Immutability, naming rules, deprecation lifecycle, namespace ownership |
