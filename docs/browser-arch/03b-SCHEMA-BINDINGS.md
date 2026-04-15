# 03b — Schema Bindings

**Parent:** [03 — Client Config System](./03-CLIENT-CONFIG-SYSTEM.md)  
**Scope:** Binding declaration format, mapping types, path targeting, authoring workflow, examples  

---

## 1. What a Config Binding Is

A config binding is a declaration that connects a field in a raw schema to a key in the Config System. It is the instruction that tells the Materialisation Service: "when resolving this schema, look up this config key and write the result to this path."

Bindings are authored once, at schema creation time, and are not touched again unless the schema structure changes or the config key is being migrated (see [03d](./03d-KEY-GOVERNANCE.md)). They are **not** component-level configuration — they are schema-level declarations. Components are context-free; the schema carries all business context.

A binding declaration does not appear in the browser. The browser receives only the output: the resolved value that the binding pointed at. The binding file is a server-side authoring artefact, consumed exclusively by the Materialisation Service.

---

## 2. Where Bindings Live in S3

Config binding files live under a **separate S3 prefix** from resolved schemas. The resolved schemas are read by the CDN and served to browsers. The binding files are read only by the Materialisation Service at materialisation time.

```
S3 bucket: keystone-schema-bindings   ← private, Materialisation Service access only
  {viewId}/
    config-bindings.json
  e.g.:
    keystone-schema-bindings/quotations-list/config-bindings.json
    keystone-schema-bindings/claims-list/config-bindings.json
    keystone-schema-bindings/policy-detail/config-bindings.json

S3 bucket: keystone-resolved-schemas  ← CDN-accessible, browser-facing
  {viewId}/
    default.json                       ← universal fallback schema
    {tenantId}.json                    ← one file per tenant (base + partials)
  e.g.:
    keystone-resolved-schemas/quotations-list/default.json
    keystone-resolved-schemas/quotations-list/gi.json
    keystone-resolved-schemas/quotations-list/zurich.json
```

These are **two separate S3 buckets** with different IAM policies. The Cloudflare Worker (CDN edge) has read access only to `keystone-resolved-schemas`. The Materialisation Service has read access to `keystone-schema-bindings` and write access to `keystone-resolved-schemas`. The browser never interacts with either bucket directly.

The binding file is **per viewId**, not per tenant. One binding file covers all tenants for the same view. The Materialisation Service uses it when materialising any tenant's schema file for that view.

---

## 3. Binding Declaration Format

```typescript
// ── Mapping type ────────────────────────────────────────────────────────────

/**
 * enumMap:    configKey is a namespace-level key holding Record<string, BadgeValue>.
 *             The entire map is written to the target schema path.
 *             e.g. configKey: "insurance.quotation.status" →
 *               { DRAFT: { label, variant }, PENDING_APPROVAL: { label, variant }, ... }
 *
 * singleValue: configKey points to a scalar: string, boolean, or BadgeValue.
 *             The value is written directly to the target schema path.
 *             e.g. configKey: "insurance.quotation.list.title" → "Quotations"
 *
 * valueList:  configKey points to string[].
 *             The array is written to the target schema path.
 *             e.g. configKey: "insurance.claim.rejection.reasons" → ["Theft", ...]
 */
type MappingType = "enumMap" | "singleValue" | "valueList";

// ── Single binding entry ─────────────────────────────────────────────────────

interface BindingEntry {
  /**
   * The config key (or namespace prefix for enumMap) in the Config System.
   * Must be a registered key. Validated at authoring time.
   */
  configKey: string;

  /**
   * How to interpret the configKey's value and how to write it to the schema.
   * Must match the mappingType declared for the configKey in the Config System.
   */
  mapping: MappingType;

  /**
   * Optional: for enumMap mappings, an explicit list of domain codes expected.
   * If provided, the Materialisation Service validates that the config blob
   * contains values for all listed codes. Any missing code triggers a gap event
   * and writes the fallback { label: "<raw_value>", variant: "neutral" }.
   * If omitted, the service resolves whatever codes the config blob contains.
   */
  expectedCodes?: string[];

  /**
   * Optional: if the config blob value is a scalar string and you want to
   * apply a static prefix or suffix to it at resolution time.
   * e.g. { prefix: "Policy: " } → "Policy: Motor Comprehensive"
   * Kept minimal — prefer full labels in the config blob itself.
   */
  transform?: {
    prefix?: string;
    suffix?: string;
  };
}

// ── Config bindings file ─────────────────────────────────────────────────────

/**
 * The shape of config-bindings.json.
 * Keys are JSONPath-style dotted paths into the raw schema.
 * Values are BindingEntry declarations.
 */
type ConfigBindingsFile = Record<string, BindingEntry>;
```

---

## 4. Path Targeting Syntax

The keys of a `ConfigBindingsFile` are **JSONPath-style dotted paths** targeting locations in the resolved schema output. They describe where the resolved config value should be placed.

### Path Syntax Rules

| Rule | Example |
|------|---------|
| Dot-separated property names | `header.title` |
| Array index notation for specific elements | `columns[2].valueMap` |
| Wildcard `[*]` to target a field on all array elements | `columns[*].valueMap` |
| Paths must be valid within the raw schema's structure | Validated at authoring time |

### Path Examples

| Path | What it targets |
|------|----------------|
| `header.title` | The `title` string in the schema's header section |
| `columns.status.valueMap` | The `valueMap` of the `status` column object |
| `columns[*].valueMap` | The `valueMap` of every column (applies enumMap to all) |
| `filters.status.options` | The `options` array of the status filter |
| `header.statusBadge` | A standalone badge in the header |
| `summary.lobLabel` | A label field in the summary section |

### How the Materialisation Service Uses Paths

The Materialisation Service performs a JSONPath write on the schema object:

1. Start with the raw schema (structure only, no display values)
2. For each binding path, resolve the config value (with tenant + locale specificity)
3. Set `schema[path] = resolvedValue`
4. Write the fully resolved schema to S3

The raw schema never contains display values. It contains structure, column definitions, field types, and binding placeholders. Binding paths point to where display values should be written. The final resolved schema has all binding paths populated with resolved values.

---

## 5. The Three Mapping Types in Detail

### 5.1 `enumMap`

The `configKey` points to a namespace-level key whose value is a `Record<string, BadgeValue>`. The entire map is written to the schema path.

Use this when a column or field needs to render different badges for different domain codes.

Config blob (key: `insurance.quotation.status`, type: `enumMap`):
```json
{
  "DRAFT":            { "label": "Draft",            "variant": "neutral"     },
  "PENDING_APPROVAL": { "label": "Pending Approval", "variant": "warning"     },
  "APPROVED":         { "label": "Approved",          "variant": "success"     },
  "REJECTED":         { "label": "Rejected",          "variant": "destructive" },
  "EXPIRED":          { "label": "Expired",           "variant": "pending"     }
}
```

Binding declaration (in `config-bindings.json`):
```json
{
  "columns.status.valueMap": {
    "configKey": "insurance.quotation.status",
    "mapping": "enumMap",
    "expectedCodes": ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "EXPIRED"]
  }
}
```

Result in resolved schema at path `columns.status.valueMap`:
```json
{
  "DRAFT":            { "label": "Draft",            "variant": "neutral"     },
  "PENDING_APPROVAL": { "label": "Pending Approval", "variant": "warning"     },
  "APPROVED":         { "label": "Approved",          "variant": "success"     },
  "REJECTED":         { "label": "Rejected",          "variant": "destructive" },
  "EXPIRED":          { "label": "Expired",           "variant": "pending"     }
}
```

The browser renders `valueMap[row.status]` — no switch statements, no conditionals.

### 5.2 `singleValue`

The `configKey` points to a scalar config blob: a `string`, `boolean`, or `BadgeValue`. The scalar is written directly to the schema path.

Use this for labels, titles, button text, and individual-code badge values.

Config blob (key: `insurance.quotation.list.title`, type: `singleValue`):
```json
"Quotations"
```

Binding declaration:
```json
{
  "header.title": {
    "configKey": "insurance.quotation.list.title",
    "mapping": "singleValue"
  }
}
```

Result in resolved schema at path `header.title`:
```json
"Quotations"
```

Config blob (key: `insurance.motor.lob.label`, type: `singleValue`) with transform:
```json
"Motor Comprehensive"
```

Binding declaration with prefix transform:
```json
{
  "summary.lobHeading": {
    "configKey": "insurance.motor.lob.label",
    "mapping": "singleValue",
    "transform": { "prefix": "Coverage: " }
  }
}
```

Result in resolved schema at path `summary.lobHeading`:
```json
"Coverage: Motor Comprehensive"
```

### 5.3 `valueList`

The `configKey` points to a `string[]` blob. The ordered array is written to the schema path.

Use this for dropdown option lists, filter chip labels, and ordered radio button labels.

Config blob (key: `insurance.claim.rejection.reasons`, type: `valueList`):
```json
[
  "Policy not active at time of incident",
  "Claim submitted outside coverage period",
  "Damage pre-exists policy start date",
  "Insufficient documentation provided",
  "Incident not covered under policy type",
  "Duplicate claim for same incident",
  "Other"
]
```

Binding declaration:
```json
{
  "filters.rejectionReason.options": {
    "configKey": "insurance.claim.rejection.reasons",
    "mapping": "valueList"
  }
}
```

Result in resolved schema at path `filters.rejectionReason.options`:
```json
[
  "Policy not active at time of incident",
  "Claim submitted outside coverage period",
  "Damage pre-exists policy start date",
  "Insufficient documentation provided",
  "Incident not covered under policy type",
  "Duplicate claim for same incident",
  "Other"
]
```

---

## 6. How the Materialisation Service Uses Bindings

The Materialisation Service reads `config-bindings.json` during every materialisation triggered by a config save event. The sequence:

```
1. Receive config.blob.saved event
   { configKey: "insurance.quotation.status.PENDING_APPROVAL", ... }

2. Scan keystone-schema-bindings/ for all config-bindings.json files
   that reference a configKey matching the event's key or its namespace prefix.

   Match logic:
     event.configKey = "insurance.quotation.status.PENDING_APPROVAL"
     namespace prefix = "insurance.quotation.status"

     A binding matches if:
       binding.configKey === event.configKey  (exact match)
       OR event.configKey.startsWith(binding.configKey + ".")  (event key is a child of binding namespace)
       OR binding.configKey.startsWith(event.namespace + ".")  (binding is a child of the event namespace)

3. For each matching config-bindings.json → extract the viewId from its S3 path.

4. For that viewId, determine which schema variants are affected
   (all variants whose tenantId is in event.affectedTenantIds, or all variants if base blob changed).

5. For each affected variant: run materialisation.
   See 03c for full materialisation algorithm.
```

The Materialisation Service does not interpret the binding semantics itself — it delegates to a resolver per `mapping` type:
- `enumMap`: fetch the namespace-level config blob, resolve per-tenant specificity, write the full map
- `singleValue`: fetch the scalar config blob, apply any transform, write the scalar
- `valueList`: fetch the array config blob, write the array

---

## 7. Authoring Workflow — Declaring Bindings for a New Schema

When a new schema is created (new viewId, new page), follow this workflow:

### Step 1 — Identify the display semantics

List every field in the schema that requires a config-managed display value:
- Fields with enum values that need labels/badges → `enumMap` or `singleValue`
- Text labels, titles, headings → `singleValue`
- Dropdown or filter option lists → `valueList`

### Step 2 — Check the Config System for existing keys

For each field, check whether an appropriate config key already exists:

```
GET /api/v1/config/blobs?namespace=insurance.quotation.status
```

If it exists and the `mappingType` matches your needs, use it.

### Step 3 — Register new keys if needed

If no key exists for a field, register it before writing the binding:

```
POST /api/v1/config/keys
{
  "key": "insurance.quotation.new-field.label",
  "mappingType": "singleValue",
  "description": "Display label for the new field on quotations list",
  "ownerTeam": "insurance-frontend"
}
```

Write the initial blob immediately after:
```
PUT /api/v1/config/blobs/insurance.quotation.new-field.label
{ "value": "New Field Label" }
```

### Step 4 — Author config-bindings.json

Create or update the `config-bindings.json` file for the viewId. Example:

```json
{
  "header.title": {
    "configKey": "insurance.quotation.list.title",
    "mapping": "singleValue"
  },
  "columns.status.valueMap": {
    "configKey": "insurance.quotation.status",
    "mapping": "enumMap",
    "expectedCodes": ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "EXPIRED"]
  },
  "columns.lob.label": {
    "configKey": "insurance.motor.lob.label",
    "mapping": "singleValue"
  }
}
```

### Step 5 — Upload to S3

```
s3://keystone-schema-bindings/{viewId}/config-bindings.json
```

### Step 6 — Trigger initial materialisation

After uploading the binding file, trigger an initial materialisation for all variants of the new viewId. This writes the first resolved schemas to S3.

Use the admin API:
```
POST /api/v1/admin/materialise
{ "viewId": "quotations-list", "reason": "initial schema creation" }
```

### Validation at Authoring Time

The Config System CLI (run before S3 upload) validates:
- All binding paths correspond to valid paths in the raw schema
- All `configKey` values are registered keys in the Config System
- The `mapping` type matches the declared `mappingType` of the key
- `expectedCodes` (if present) are valid strings

```bash
npx keystone-schema validate-bindings \
  --schema-file ./quotations-list/schema.json \
  --bindings-file ./quotations-list/config-bindings.json
```

---

## 8. Example: `quotations-list` Config Bindings

Full `config-bindings.json` for the quotations list view:

```json
{
  "header.title": {
    "configKey": "insurance.quotation.list.title",
    "mapping": "singleValue"
  },
  "header.createButtonLabel": {
    "configKey": "insurance.quotation.list.createButton",
    "mapping": "singleValue"
  },
  "columns.status.valueMap": {
    "configKey": "insurance.quotation.status",
    "mapping": "enumMap",
    "expectedCodes": [
      "DRAFT",
      "PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED"
    ]
  },
  "columns.lob.valueMap": {
    "configKey": "insurance.lob.display",
    "mapping": "enumMap",
    "expectedCodes": [
      "MOTOR_COMPREHENSIVE",
      "MOTOR_THIRD_PARTY",
      "HOME_CONTENTS",
      "HOME_BUILDINGS",
      "TRAVEL_SINGLE",
      "TRAVEL_ANNUAL"
    ]
  },
  "filters.status.options": {
    "configKey": "insurance.quotation.status.filterOptions",
    "mapping": "valueList"
  },
  "emptyState.message": {
    "configKey": "insurance.quotation.list.emptyMessage",
    "mapping": "singleValue"
  }
}
```

---

## 9. Example: `claims-list` Config Bindings

Full `config-bindings.json` for the claims list view:

```json
{
  "header.title": {
    "configKey": "insurance.claim.list.title",
    "mapping": "singleValue"
  },
  "columns.status.valueMap": {
    "configKey": "insurance.claim.status",
    "mapping": "enumMap",
    "expectedCodes": [
      "OPEN",
      "UNDER_REVIEW",
      "PENDING_DOCUMENTS",
      "APPROVED",
      "REJECTED",
      "CLOSED",
      "WITHDRAWN"
    ]
  },
  "columns.type.valueMap": {
    "configKey": "insurance.claim.type",
    "mapping": "enumMap",
    "expectedCodes": [
      "THEFT",
      "ACCIDENT",
      "NATURAL_DISASTER",
      "THIRD_PARTY",
      "MEDICAL",
      "OTHER"
    ]
  },
  "filters.status.options": {
    "configKey": "insurance.claim.status.filterOptions",
    "mapping": "valueList"
  },
  "filters.rejectionReason.options": {
    "configKey": "insurance.claim.rejection.reasons",
    "mapping": "valueList"
  },
  "bulkActions.reject.label": {
    "configKey": "insurance.claim.actions.bulkReject",
    "mapping": "singleValue"
  },
  "emptyState.message": {
    "configKey": "insurance.claim.list.emptyMessage",
    "mapping": "singleValue"
  }
}
```

---

## 10. Validation Summary

| Validation | When enforced | Owner |
|-----------|--------------|-------|
| All binding paths are valid in the raw schema | CLI validate-bindings command; also checked by Materialisation Service | Schema author |
| All configKeys are registered in the Config System | CLI validate-bindings command; also checked by Materialisation Service | Schema author |
| `mapping` type matches declared `mappingType` | Config System API at blob write time; Materialisation Service at resolution | Config System |
| `expectedCodes` values are present in the enum config blob | Materialisation Service at resolution time; gap event emitted if missing | Materialisation Service |
| Binding file exists before materialisation is triggered | Materialisation Service startup check | Schema author |
