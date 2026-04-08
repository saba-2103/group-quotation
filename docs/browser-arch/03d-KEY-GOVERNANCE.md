# 03d — Key Governance

**Parent:** [03 — Client Config System](./03-CLIENT-CONFIG-SYSTEM.md)  
**Scope:** Immutability rule, naming conventions, deprecation lifecycle, migration tooling, namespace ownership, key creation policy, gap reporting  

---

## 1. The Immutability Rule

**Config keys are permanent identifiers. A key, once created, can never be renamed.**

This is not a soft preference — it is a hard constraint enforced by the Config System API. The rename endpoint does not exist. The PATCH key endpoint accepts only `description` and `deprecatedAt` updates. The `key` field is immutable after creation.

### Why Keys Are Immutable

Config keys are referenced by `config-bindings.json` files stored in S3, potentially across many schema variants. A rename of a key would require a coordinated atomic update of:
1. The config blob in the Config System datastore
2. Every `config-bindings.json` in `keystone-schema-bindings/` that references the key
3. A re-materialisation of every affected schema variant

There is no atomic transaction that spans all of these. A rename that fails halfway leaves bindings pointing at a non-existent key, causing the Materialisation Service to emit gap events for every affected schema until the migration is complete.

Immutability removes this class of partial-failure entirely. The key name is treated as a stable, permanent foreign key used by bindings.

### What CAN Change

| Property | Mutable? | Notes |
|----------|---------|-------|
| `key` | No | Immutable after creation |
| `value` | Yes | Updated via PUT /api/v1/config/blobs/{key} |
| `description` | Yes | Can be updated by namespace owner |
| `deprecatedAt` | Yes (one-way) | Can be set (deprecated); cannot be un-deprecated |
| `tenantId` scoping | N/A | Covered by adding/removing override blobs |
| `locale` scoping | N/A | Covered by adding/removing locale blobs |

---

## 2. Key Naming Conventions

The following naming rules are **enforced by the Config System API** at key creation time. Attempts to create a key that violates these rules return `422 Unprocessable Entity`.

### 2.1 Format Rules

| Rule | Valid example | Invalid example | Reason |
|------|--------------|----------------|--------|
| Lowercase only | `insurance.quotation.status` | `Insurance.Quotation.Status` | Prevents case-collision keys |
| Dot separator only | `insurance.quotation.status` | `insurance_quotation_status`, `insurance/quotation/status` | Canonical separator for namespace hierarchy |
| Minimum 2 segments | `insurance.quotation` | `insurance` | Bare domain is not a valid key |
| Maximum 5 segments | `a.b.c.d.e` | `a.b.c.d.e.f` | Prevents unbounded nesting |
| Alphanumeric segments only | `insurance.motor.lob.label` | `insurance.motor lob.label`, `insurance.motor-lob.label` | No spaces or hyphens within segments |
| Must start with a registered domain | `insurance.*`, `claims.*`, `ui.*` | `invoicing.*` (not registered) | Domain registration required before first key |
| Segments are alphanumeric + underscores | `insurance.claim.status.UNDER_REVIEW` | `insurance.claim.status.under-review` | Underscores permitted in leaf segments for domain codes |

### 2.2 Segment Semantics

The four-segment convention is `{domain}.{subdomain}.{entity}.{attribute}`. Not all keys need four segments — the minimum is two. Use judgment to find the appropriate depth:

| Segments | Pattern | Example |
|----------|---------|---------|
| 2 | `{domain}.{concept}` | `ui.common` (used as namespace, not leaf) |
| 3 | `{domain}.{entity}.{attribute}` | `insurance.motor.label` |
| 4 | `{domain}.{subdomain}.{entity}.{attribute}` | `insurance.quotation.status.DRAFT` |
| 5 | `{domain}.{subdomain}.{entity}.{attribute}.{variant}` | `insurance.quotation.status.DRAFT.compact` |

Use the simplest structure that accurately models the concept. Do not add segments for the sake of depth.

### 2.3 Registered Domains

The following domains are registered. Only keys under these domains can be created:

| Domain | Owner team | Description |
|--------|-----------|-------------|
| `insurance` | insurance-backend | Core insurance domain — quotations, policies, claims, endorsements |
| `claims` | claims-backend | Claims-specific sub-domain (alternative to `insurance.claim.*`) |
| `ui` | frontend-platform | Shared UI primitives — actions, empty states, common labels |
| `admin` | admin-platform | Admin panel specific labels and display values |
| `accounting` | accounting-backend | Accounting and finance domain |

To register a new domain, submit a pull request updating the namespace registry in the Config System configuration. This requires approval from the architecture team.

---

## 3. Deprecation Lifecycle

When a config key needs to be replaced (concept renamed, structure changed), the following 4-step lifecycle governs the transition. **Do not skip steps** — skipping step 2 leaves bindings pointing at the old key and will generate gap events.

### Step 1 — Create the New Key

Register the new key with the correct naming and value. It must have a base blob before any schema can bind to it.

```bash
# Create the new key
POST /api/v1/config/keys
{
  "key": "insurance.quotation.approval.status",
  "mappingType": "enumMap",
  "description": "Renamed from insurance.quotation.status — new canonical key",
  "ownerTeam": "insurance-backend"
}

# Write the initial base blob (copy value from old key)
PUT /api/v1/config/blobs/insurance.quotation.approval.status
{
  "value": {
    "DRAFT":            { "label": "Draft",            "variant": "neutral"  },
    "PENDING_APPROVAL": { "label": "Pending Approval", "variant": "warning"  }
    // ... etc
  }
}
```

The old key continues to function normally at this point. No production impact.

### Step 2 — Migrate Bindings to the New Key

Use the migration tool to update every `config-bindings.json` that references the old key:

```bash
npx keystone-schema migrate-bindings \
  --old-key insurance.quotation.status \
  --new-key insurance.quotation.approval.status \
  --dry-run         # Preview which files would change

# After reviewing dry-run output:
npx keystone-schema migrate-bindings \
  --old-key insurance.quotation.status \
  --new-key insurance.quotation.approval.status \
  --apply           # Write updated binding files to S3
  --trigger-rematerialise  # Trigger rematerialisation for all affected viewIds
```

The migration tool:
1. Lists all `config-bindings.json` files in `keystone-schema-bindings/` that reference the old key
2. Replaces the `configKey` in each binding entry with the new key
3. Uploads the updated binding files to S3
4. Optionally triggers re-materialisation for each affected viewId

After this step, all bindings reference the new key. The old key still exists and has blobs — it is no longer referenced by any binding.

### Step 3 — Mark the Old Key as Deprecated

```bash
POST /api/v1/config/keys/insurance.quotation.status/deprecate
```

This sets `deprecatedAt` on the key. Effects:
- The Config System admin shows a deprecation warning banner on the key's detail page
- The gap report excludes deprecated keys from its counts
- The key still resolves normally if anything references it (safety net)
- Monitoring alerts are suppressed for deprecated keys

### Step 4 — Confirm Migration and Remove Binding References

After confirming that all bindings have been migrated (use the key's bound schemas listing) and all resolved schemas have been re-materialised, the old key can be left deprecated indefinitely. It is not deleted — keys are never deleted. The value is preserved in the datastore as an audit record.

```bash
# Confirm no bindings remain on old key
GET /api/v1/config/keys/insurance.quotation.status/bindings
# Expected: { "boundSchemas": [] }
```

If `boundSchemas` is empty, the migration is complete.

---

## 4. Migration Tooling

The `keystone-schema` CLI provides tooling for config key migrations. It is the only supported way to bulk-update bindings.

### 4.1 `list-bindings-for-key`

Lists all schema binding files that reference a config key.

```bash
npx keystone-schema list-bindings-for-key \
  --key insurance.quotation.status

Output:
  Found 4 schema(s) with bindings referencing "insurance.quotation.status":

  quotations-list
    Path: keystone-schema-bindings/quotations-list/config-bindings.json
    Binding path: columns.status.valueMap
    Mapping: enumMap

  quotation-detail
    Path: keystone-schema-bindings/quotation-detail/config-bindings.json
    Binding path: header.statusBadge
    Mapping: singleValue

  quotation-search
    Path: keystone-schema-bindings/quotation-search/config-bindings.json
    Binding path: filters.status.options
    Mapping: enumMap

  policy-summary
    Path: keystone-schema-bindings/policy-summary/config-bindings.json
    Binding path: sections.quotation.status
    Mapping: singleValue
```

### 4.2 `migrate-bindings`

Migrates all binding references from an old key to a new key.

```bash
npx keystone-schema migrate-bindings \
  --old-key insurance.quotation.status \
  --new-key insurance.quotation.approval.status \
  [--dry-run | --apply] \
  [--trigger-rematerialise]
```

Options:
- `--dry-run` — print what would change, make no writes (default if neither flag given)
- `--apply` — write updated binding files to S3
- `--trigger-rematerialise` — after applying, POST to `/api/v1/admin/materialise` for each affected viewId

### 4.3 `validate-bindings`

Validates a binding file against the Config System — checks key registration, mapping type consistency, schema path validity.

```bash
npx keystone-schema validate-bindings \
  --schema-file ./schemas/quotations-list/schema.json \
  --bindings-file ./schemas/quotations-list/config-bindings.json
```

### 4.4 Admin Config Key Browser

The admin UI at `/admin/config/:key` surfaces migration tooling in the browser:

- **Bound schemas panel** — shows all schemas currently referencing the key, with one-click navigation to the binding file
- **Migrate binding** button — opens a migration wizard that runs `migrate-bindings` for selected schemas
- **Deprecation panel** — shows deprecation status, date, and remaining bound schemas
- **Gap report link** — links to the gap report filtered to this key

---

## 5. Namespace Ownership

Each key namespace is owned by a specific team. Only that team can create new keys under the namespace. Ownership is enforced by the Config System API using the caller's service identity (JWT `team` claim).

### Ownership Registry

| Namespace prefix | Owner team | Notes |
|-----------------|-----------|-------|
| `insurance.*` | `insurance-backend` | Core insurance domain |
| `insurance.quotation.*` | `insurance-backend` | Quotation sub-domain |
| `insurance.claim.*` | `claims-backend` | Claim sub-domain (claims team is sub-owner) |
| `insurance.policy.*` | `insurance-backend` | Policy sub-domain |
| `insurance.motor.*` | `insurance-backend` | Motor product |
| `insurance.home.*` | `insurance-backend` | Home product |
| `claims.*` | `claims-backend` | Claims top-level namespace |
| `ui.*` | `frontend-platform` | Shared UI namespace |
| `ui.common.*` | `frontend-platform` | Common UI labels |
| `ui.forms.*` | `frontend-platform` | Form-level UI labels |
| `admin.*` | `admin-platform` | Admin panel namespace |
| `accounting.*` | `accounting-backend` | Accounting domain |

**Sub-namespace ownership:** A team can own a sub-namespace under a parent namespace owned by another team (e.g. `claims-backend` owns `insurance.claim.*` under `insurance.*` owned by `insurance-backend`). Sub-namespace ownership must be explicitly registered.

**Ownership escalation:** If a team needs to create a key in a namespace they don't own, they must request the owning team to create the key, or request a sub-namespace grant. Self-service key creation outside owned namespaces is not permitted.

### Ownership in Practice

When a team member attempts to create a key via the API:
1. The API extracts the `team` claim from the caller's JWT
2. It matches the proposed key's namespace prefix against the ownership registry
3. If the caller's team does not own the longest matching prefix, the request is rejected with `403 Forbidden`
4. The error message identifies the owning team: `"Namespace insurance.quotation.* is owned by team insurance-backend"`

---

## 6. Key Creation Policy

Creating a new key requires:

1. **Namespace ownership** — the caller must own the namespace (see Section 5)
2. **Human-readable description** — `description` field is required and must be non-trivial (min 20 characters, validated)
3. **Confirmed base blob** — the base blob must be written before any schema can bind to the key. The API does not enforce this at creation time, but the CLI `validate-bindings` command does.
4. **No duplication** — the key must not already exist (exact match) or be a renamed version of an existing key. The naming review process checks this.

### Key Creation Checklist

Before creating a new key, verify:

- [ ] No existing key covers this concept (check `GET /api/v1/config/blobs?namespace=your.namespace`)
- [ ] The key name follows the naming convention (see Section 2)
- [ ] The `mappingType` is correct for the value type (`enumMap`, `singleValue`, or `valueList`)
- [ ] A base blob value is ready to be written immediately after key creation
- [ ] Tenant-specific overrides (if any) are planned and ready
- [ ] The description clearly explains what the key controls

### Prohibited Key Patterns

The following patterns are explicitly prohibited:

| Pattern | Example | Reason |
|---------|---------|--------|
| Duplicating an existing key | `insurance.quotation.state` when `insurance.quotation.status` exists | Creates ambiguity |
| Generic/non-specific names | `insurance.quotation.value` | Too broad — "value" means nothing |
| Implementation details | `insurance.quotation.ui.reactComponent` | Config keys are display semantics, not component references |
| Temporary/debug keys | `insurance.quotation.temp.debugLabel` | Keys are permanent; no temporary keys |
| Encoding the value in the key | `insurance.quotation.status.PENDING_APPROVAL.warningVariant` | The variant is the value, not part of the key |

---

## 7. Gap Reporting

A config gap is any situation where a schema binding references a config key but the Config System has no registered blob for a particular combination of (key, tenantId, locale).

Gaps are surfaced in two places:

### 7.1 Real-Time Gap Events

Gaps detected during materialisation emit `config.gap.detected` events (see [03c §5.1](./03c-MATERIALISATION-SERVICE.md#51-missing-config-blob-gap)). These feed the monitoring alert system and the admin gap report in near-real-time.

### 7.2 Admin Gap Report

The gap report at `/admin/config/gaps` shows all known gaps:

| Column | Description |
|--------|-------------|
| Config Key | The key with no registered blob |
| Binding Path | The schema path that references the key |
| View ID | The schema that contains the binding |
| Tenant | The tenant variant where the gap was detected |
| Locale | The locale where the gap was detected |
| First Detected | When the gap was first detected |
| Status | `open` (no blob yet) or `resolved` (blob now exists) |

The gap report is automatically filtered to exclude deprecated keys. Gaps on deprecated keys are expected (bindings not yet migrated) and handled by the deprecation workflow.

### 7.3 Pre-Production Gap Check

Before deploying a new schema to production, run the gap check command:

```bash
npx keystone-schema check-gaps \
  --view-id quotations-list \
  --environments staging,production

Output:
  Checking gaps for quotations-list across 8 tenant × locale variants...

  GAPS FOUND:
  ┌─────────────────────────────────────────┬───────────────────────────┬───────────┬────────┐
  │ Config Key                              │ Binding Path              │ Tenant    │ Locale │
  ├─────────────────────────────────────────┼───────────────────────────┼───────────┼────────┤
  │ insurance.quotation.status.REINSTATED   │ columns.status.valueMap   │ base      │ null   │
  │ insurance.quotation.list.title          │ header.title              │ tenant_xy │ ar-AE  │
  └─────────────────────────────────────────┴───────────────────────────┴───────────┴────────┘

  2 gap(s) detected. Resolve before promoting to production.
```

Gaps in production are not blocking (the Materialisation Service writes fallback values) but they degrade display quality. The pre-production check makes gaps visible before they affect users.
