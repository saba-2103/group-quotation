# 03a — Config Blob Schema

**Parent:** [03 — Client Config System](./03-CLIENT-CONFIG-SYSTEM.md)  
**Scope:** Data model, key naming convention, value types, per-tenant override model, CRUD API, validation rules, example payloads  

---

## 1. Core Data Model

A config blob is the atomic unit of the Config System. Each blob stores a single keyed display value — a label, a badge mapping, a dropdown list, or a boolean flag — with optional tenant and locale scoping.

```typescript
// ── Core value types ────────────────────────────────────────────────────────

type SemanticVariant =
  | "neutral"
  | "info"
  | "warning"
  | "success"
  | "destructive"
  | "pending";

interface BadgeValue {
  label: string;
  variant: SemanticVariant;
}

// An enumMap config blob value: maps every domain code to a BadgeValue
// e.g. the full value for key insurance.quotation.status
type EnumMapValue = Record<string, BadgeValue>;

// A singleValue config blob value: a plain string or boolean
type SingleValue = string | boolean;

// A valueList config blob value: ordered array of strings (for dropdown options etc.)
type ValueListValue = string[];

// Union of all supported config blob value types
type ConfigBlobValue = SingleValue | BadgeValue | ValueListValue | EnumMapValue;

// ── Config Blob ──────────────────────────────────────────────────────────────

interface ConfigBlob {
  /** Stable UUID. Never changes. */
  id: string;

  /**
   * Structured dot-separated key. Immutable after creation.
   * Convention: {domain}.{subdomain}.{entity}.{attribute}
   * Example: "insurance.quotation.status.PENDING_APPROVAL"
   * Example: "insurance.quotation.list.title"
   * Example: "insurance.quotation.status"   ← namespace-level key for enumMap
   */
  key: string;

  /**
   * The resolved display value for this key.
   * Type must be consistent with the declared mappingType of every binding
   * that references this key. Validated at write time.
   */
  value: ConfigBlobValue;

  /**
   * If present, this blob is a tenant-specific override.
   * If null/absent, this is the base (default) blob for the key.
   * Base blob must exist before tenant overrides can be created.
   */
  tenantId: string | null;

  /**
   * BCP 47 locale tag. If present, this blob applies only for that locale.
   * If null/absent, applies to all locales (unless a more specific locale blob exists).
   */
  locale: string | null;

  /**
   * Monotonically increasing version counter per key+tenantId+locale combination.
   * Incremented on every write. Used for optimistic locking and audit trail.
   */
  version: number;

  /**
   * ISO 8601 timestamp. Set on creation, never updated.
   */
  createdAt: string;

  /**
   * ISO 8601 timestamp. Updated on every write.
   */
  updatedAt: string;

  /**
   * ISO 8601 timestamp. Set when the key is deprecated.
   * Null if the key is not deprecated.
   * A deprecated key still functions and resolves — it just surfaces a warning
   * in the admin UI and gap report.
   */
  deprecatedAt: string | null;

  /**
   * Human-readable description of what this key represents.
   * Required on creation. Immutable.
   */
  description: string;

  /**
   * The team or system that owns this key's namespace.
   * Set from namespace ownership registry at creation time.
   * See 03d for namespace ownership rules.
   */
  ownerTeam: string;
}
```

### Mapping Type Annotation

The Config System also maintains a `ConfigKeyMetadata` record per key (separate from blobs, updated only by key owners). This declares the expected value type and is used to validate blob values at write time:

```typescript
type MappingType = "enumMap" | "singleValue" | "valueList";

interface ConfigKeyMetadata {
  key: string;
  mappingType: MappingType;
  description: string;
  ownerTeam: string;
  createdAt: string;
  deprecatedAt: string | null;
}
```

---

## 2. Key Naming Convention

Config keys follow a strict dot-separated namespace hierarchy. The format is:

```
{domain}.{subdomain}.{entity}.{attribute}
```

Rules (enforced by the Config System API — see Section 5):

| Rule | Detail |
|------|--------|
| Lowercase only | `insurance.quotation.status` — no uppercase |
| Dot separator | Only dots between segments — no hyphens, underscores, or slashes |
| Max 5 segments | `a.b.c.d.e` is the maximum depth |
| Domain segment required | Must begin with a registered domain (see [03d](./03d-KEY-GOVERNANCE.md)) |
| No reserved words | Segments cannot be `base`, `override`, `null`, `undefined` |
| Alphanumeric + dots only | No spaces, no special characters |

### Examples

| Key | Type | Meaning |
|-----|------|---------|
| `insurance.quotation.status` | `enumMap` | Full status code → display mapping for quotation statuses |
| `insurance.quotation.status.PENDING_APPROVAL` | `singleValue` (BadgeValue) | Display value for one specific status code |
| `insurance.quotation.list.title` | `singleValue` (string) | Page/section title label |
| `insurance.motor.lob.label` | `singleValue` (string) | Line of business display label |
| `insurance.claim.rejection.reasons` | `valueList` | Ordered list of rejection reason labels for dropdown |
| `ui.common.actions.save` | `singleValue` (string) | Label for the Save action button |
| `ui.common.actions.cancel` | `singleValue` (string) | Label for the Cancel action button |

### enumMap vs Per-Code Keys

There are two valid ways to model enum display semantics:

**Option A — namespace-level enumMap key** (preferred for status/type fields with many values):
```
Key:   insurance.quotation.status
Type:  enumMap
Value: {
  "DRAFT":             { "label": "Draft",             "variant": "neutral"     },
  "PENDING_APPROVAL":  { "label": "Pending Approval",  "variant": "warning"     },
  "APPROVED":          { "label": "Approved",           "variant": "success"     },
  "REJECTED":          { "label": "Rejected",           "variant": "destructive" },
  "EXPIRED":           { "label": "Expired",            "variant": "pending"     }
}
```

**Option B — per-code scalar keys** (used when individual codes have different tenant overrides):
```
Key:   insurance.quotation.status.PENDING_APPROVAL
Type:  singleValue (BadgeValue)
Value: { "label": "Pending Approval", "variant": "warning" }

Key:   insurance.quotation.status.DRAFT
Type:  singleValue (BadgeValue)
Value: { "label": "Draft", "variant": "neutral" }
```

The binding declaration in `config-bindings.json` specifies which pattern is used via the `mapping` field (`"enumMap"` or `"singleValue"`). See [03b](./03b-SCHEMA-BINDINGS.md) for binding declarations.

Option A is preferred when all enum values are typically overridden together (e.g. tenant rebrands the whole status vocabulary). Option B is preferred when individual values have independent tenant override lifecycles.

---

## 3. Value Types in Detail

### 3.1 `string` (singleValue)

Plain display string. Used for labels, titles, button text.

```json
"Motor Comprehensive"
```

### 3.2 `boolean` (singleValue)

Feature display flag. Controls whether a UI element is shown. Not a feature flag system — use this only for display-layer visibility controlled by the config team.

```json
true
```

### 3.3 `BadgeValue` (singleValue for individual enum codes)

A label + semantic variant pair, rendering as a badge component.

```typescript
interface BadgeValue {
  label: string;
  variant: SemanticVariant; // "neutral" | "info" | "warning" | "success" | "destructive" | "pending"
}
```

```json
{ "label": "Pending Approval", "variant": "warning" }
```

### 3.4 `string[]` (valueList)

Ordered array of display strings. Used for dropdown option lists, filter chip labels, ordered radio button labels.

```json
["Theft", "Accident", "Natural Disaster", "Third Party Liability", "Other"]
```

### 3.5 `Record<string, BadgeValue>` (enumMap)

Maps every domain code in an enum namespace to a `BadgeValue`. The materialisation service expands this into the schema's `valueMap` field.

```json
{
  "DRAFT":             { "label": "Draft",             "variant": "neutral"     },
  "PENDING_APPROVAL":  { "label": "Pending Approval",  "variant": "warning"     },
  "APPROVED":          { "label": "Approved",           "variant": "success"     },
  "REJECTED":          { "label": "Rejected",           "variant": "destructive" },
  "EXPIRED":           { "label": "Expired",            "variant": "pending"     }
}
```

---

## 4. Per-Tenant Override Model

The Config System implements a **base + override** layering model. Every config key has exactly one base blob (no `tenantId`). Tenants may have zero or one override blob per key (with their `tenantId` set).

At materialisation time, the Materialisation Service resolves the most specific blob using priority order: tenant-specific blob wins over base blob (see [03c §4](./03c-MATERIALISATION-SERVICE.md#4-config-blob-resolution-priority)). It never merges blobs — the winning blob's `value` is used in full.

### Example: Tenant Override

Base blob:
```json
{
  "key": "insurance.quotation.status.PENDING_APPROVAL",
  "tenantId": null,
  "locale": null,
  "value": { "label": "Pending Approval", "variant": "warning" }
}
```

Tenant ABC override (different label, same variant):
```json
{
  "key": "insurance.quotation.status.PENDING_APPROVAL",
  "tenantId": "tenant_abc",
  "locale": null,
  "value": { "label": "Awaiting Review", "variant": "warning" }
}
```

Tenant ABC Arabic locale override:
```json
{
  "key": "insurance.quotation.status.PENDING_APPROVAL",
  "tenantId": "tenant_abc",
  "locale": "ar-AE",
  "value": { "label": "في انتظار المراجعة", "variant": "warning" }
}
```

When materialising the schema for `tenant_abc` + `ar-AE`, the third blob wins. When materialising for `tenant_abc` + `en-GB`, the second blob wins. When materialising for `tenant_xyz` + `en-GB` (no override), the base blob wins.

---

## 5. CRUD API Shape

The Config System exposes a REST API. All endpoints require authentication and namespace ownership authorization (see [03d](./03d-KEY-GOVERNANCE.md)).

### 5.1 Create a Config Key

```
POST /api/v1/config/keys

Request body:
{
  "key": "insurance.quotation.status",
  "mappingType": "enumMap",
  "description": "Display mapping for all quotation status codes",
  "ownerTeam": "insurance-backend"
}

Response 201:
{
  "key": "insurance.quotation.status",
  "mappingType": "enumMap",
  "description": "...",
  "ownerTeam": "insurance-backend",
  "createdAt": "2026-04-08T10:00:00Z",
  "deprecatedAt": null
}

Errors:
  409 Conflict — key already exists
  422 Unprocessable — key format invalid
  403 Forbidden — caller does not own the namespace
```

### 5.2 Write (Create or Update) a Config Blob

```
PUT /api/v1/config/blobs/{key}

Query params:
  tenantId  (optional) — if omitted, writes the base blob
  locale    (optional) — if omitted, applies to all locales

Request body:
{
  "value": { "label": "Pending Approval", "variant": "warning" }
}

Response 200 (update) or 201 (first write):
{
  "id": "blob_01hx...",
  "key": "insurance.quotation.status.PENDING_APPROVAL",
  "tenantId": null,
  "locale": null,
  "value": { "label": "Pending Approval", "variant": "warning" },
  "version": 3,
  "createdAt": "2026-01-15T09:00:00Z",
  "updatedAt": "2026-04-08T10:23:00Z",
  "deprecatedAt": null
}

Errors:
  404 Not Found — key not registered
  422 Unprocessable — value type does not match declared mappingType
  403 Forbidden — caller does not own the namespace
```

### 5.3 Read a Config Blob

```
GET /api/v1/config/blobs/{key}

Query params:
  tenantId  (optional)
  locale    (optional)

Response 200:
{ ... ConfigBlob }

Response 404: No blob found for the exact tenantId + locale combination.
Note: this endpoint returns the exact requested blob, not the resolved blob.
Use GET /api/v1/config/resolve/{key} for resolved (specificity-applied) value.
```

### 5.4 Resolve a Config Value (Specificity Applied)

```
GET /api/v1/config/resolve/{key}

Query params:
  tenantId  (required)
  locale    (required)

Response 200:
{
  "key": "insurance.quotation.status.PENDING_APPROVAL",
  "resolvedValue": { "label": "Awaiting Review", "variant": "warning" },
  "resolvedFrom": {
    "tenantId": "tenant_abc",
    "locale": null,
    "blobId": "blob_01hz..."
  }
}
```

### 5.5 List Blobs by Namespace

```
GET /api/v1/config/blobs

Query params:
  namespace  (required) — prefix match, e.g. "insurance.quotation.status"
  tenantId   (optional)
  locale     (optional)

Response 200:
{
  "blobs": [ ...ConfigBlob[] ],
  "total": 12
}
```

### 5.6 List Schemas Bound to a Key

```
GET /api/v1/config/keys/{key}/bindings

Response 200:
{
  "key": "insurance.quotation.status",
  "boundSchemas": [
    { "viewId": "quotations-list", "bindingPath": "columns.status.valueMap" },
    { "viewId": "quotation-detail", "bindingPath": "header.statusBadge" }
  ]
}
```

### 5.7 Deprecate a Key

```
POST /api/v1/config/keys/{key}/deprecate

Response 200:
{
  "key": "insurance.quotation.status.CANCELLED",
  "deprecatedAt": "2026-04-08T10:30:00Z"
}
```

---

## 6. Validation Rules at Write Time

The Config System API enforces the following rules synchronously at write time. Materialisation is never triggered for invalid writes.

### Key Format Validation (on key creation)

| Rule | Example pass | Example fail |
|------|-------------|-------------|
| Lowercase only | `insurance.quotation.status` | `Insurance.Quotation.Status` |
| Dot-separated segments | `insurance.quotation.status` | `insurance/quotation/status` |
| 2–5 segments | `insurance.quotation.status` (3) | `a` (1) or `a.b.c.d.e.f` (6) |
| Alphanumeric segments | `insurance.motor.lob.label` | `insurance.motor lob.label` |
| Registered domain prefix | `insurance.*` | `invoicing.*` (not registered) |

### Value Type Validation (on blob write)

The value in the PUT body must match the `mappingType` declared for the key:

| Declared mappingType | Accepted value type |
|---------------------|-------------------|
| `singleValue` | `string`, `boolean`, or `BadgeValue` (`{ label: string, variant: SemanticVariant }`) |
| `enumMap` | `Record<string, BadgeValue>` — all values must be valid `BadgeValue` |
| `valueList` | `string[]` — non-empty array of strings |

The `variant` field in `BadgeValue` must be one of the six `SemanticVariant` members. Unknown variants are rejected.

### Tenant Override Prerequisite

A tenant-specific blob (`tenantId != null`) can only be created if a base blob (`tenantId = null`) already exists for the same key and locale combination. This ensures every key always has a fallback.

---

## 7. Example Payloads

### 7.1 enumMap — Quotation Status

```json
{
  "id": "blob_01hx_qstatus_base",
  "key": "insurance.quotation.status",
  "tenantId": null,
  "locale": null,
  "value": {
    "DRAFT":             { "label": "Draft",             "variant": "neutral"     },
    "PENDING_APPROVAL":  { "label": "Pending Approval",  "variant": "warning"     },
    "APPROVED":          { "label": "Approved",           "variant": "success"     },
    "REJECTED":          { "label": "Rejected",           "variant": "destructive" },
    "EXPIRED":           { "label": "Expired",            "variant": "pending"     },
    "CANCELLED":         { "label": "Cancelled",          "variant": "neutral"     }
  },
  "version": 4,
  "createdAt": "2025-11-01T09:00:00Z",
  "updatedAt": "2026-03-15T14:22:00Z",
  "deprecatedAt": null,
  "description": "Display labels and badge variants for all quotation lifecycle status codes",
  "ownerTeam": "insurance-backend"
}
```

### 7.2 singleValue (string) — Page Title

```json
{
  "id": "blob_02hz_qtitle_base",
  "key": "insurance.quotation.list.title",
  "tenantId": null,
  "locale": null,
  "value": "Quotations",
  "version": 1,
  "createdAt": "2025-11-01T09:00:00Z",
  "updatedAt": "2025-11-01T09:00:00Z",
  "deprecatedAt": null,
  "description": "Header title for the quotations list view",
  "ownerTeam": "insurance-frontend"
}
```

Tenant override (different branding):
```json
{
  "id": "blob_02hz_qtitle_abc",
  "key": "insurance.quotation.list.title",
  "tenantId": "tenant_abc",
  "locale": null,
  "value": "My Quotes",
  "version": 2,
  "createdAt": "2025-12-10T11:00:00Z",
  "updatedAt": "2026-01-20T08:45:00Z",
  "deprecatedAt": null,
  "description": "Tenant ABC override for quotations list title",
  "ownerTeam": "insurance-frontend"
}
```

### 7.3 singleValue (string) — Line of Business Label

```json
{
  "id": "blob_03hx_lob_motor",
  "key": "insurance.motor.lob.label",
  "tenantId": null,
  "locale": null,
  "value": "Motor Comprehensive",
  "version": 1,
  "createdAt": "2025-11-01T09:00:00Z",
  "updatedAt": "2025-11-01T09:00:00Z",
  "deprecatedAt": null,
  "description": "Display label for the Motor Comprehensive line of business",
  "ownerTeam": "insurance-backend"
}
```

### 7.4 valueList — Claim Rejection Reasons

```json
{
  "id": "blob_04hx_claimreject_base",
  "key": "insurance.claim.rejection.reasons",
  "tenantId": null,
  "locale": null,
  "value": [
    "Policy not active at time of incident",
    "Claim submitted outside coverage period",
    "Damage pre-exists policy start date",
    "Insufficient documentation provided",
    "Incident not covered under policy type",
    "Duplicate claim for same incident",
    "Other"
  ],
  "version": 2,
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2026-02-01T09:30:00Z",
  "deprecatedAt": null,
  "description": "Ordered list of rejection reason options shown in the claim rejection dropdown",
  "ownerTeam": "claims-backend"
}
```

### 7.5 singleValue (BadgeValue) — Individual Claim Status Code

```json
{
  "id": "blob_05hx_claimstatus_open",
  "key": "insurance.claim.status.OPEN",
  "tenantId": null,
  "locale": null,
  "value": { "label": "Open", "variant": "info" },
  "version": 1,
  "createdAt": "2025-11-01T09:00:00Z",
  "updatedAt": "2025-11-01T09:00:00Z",
  "deprecatedAt": null,
  "description": "Display badge for the OPEN claim status code",
  "ownerTeam": "claims-backend"
}
```
