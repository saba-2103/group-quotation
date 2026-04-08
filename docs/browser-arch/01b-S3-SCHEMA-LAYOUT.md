# 01b — S3 / R2 Schema Layout

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Parent doc:** [01-EDGE-SCHEMA-RESOLUTION.md](./01-EDGE-SCHEMA-RESOLUTION.md)  

---

## Overview

This document is the authoritative specification for how `resolved-schema.json` files are stored in S3 (or Cloudflare R2). The key naming convention is the contract between:

1. The **Schema Materialisation Service** — which writes files to S3 after a config change or schema deploy.
2. The **Cloudflare Worker** — which reads files from S3 to serve schema requests.
3. The **specificity algorithm** — which parses key names to score candidates.

Any change to this convention must be coordinated across all three.

---

## Bucket Structure

```
keystone-resolved-schemas/                      ← primary resolved-schema bucket
  {viewId}/
    base.json
    tenant={tenantId}.json
    role={role}.json
    lob={lob}.json
    locale={locale}.json
    portalType={portalType}.json
    tenant={tenantId}+role={role}.json
    tenant={tenantId}+lob={lob}.json
    tenant={tenantId}+locale={locale}.json
    tenant={tenantId}+portalType={portalType}.json
    role={role}+lob={lob}.json
    role={role}+locale={locale}.json
    role={role}+portalType={portalType}.json
    lob={lob}+locale={locale}.json
    lob={lob}+portalType={portalType}.json
    locale={locale}+portalType={portalType}.json
    tenant={tenantId}+role={role}+lob={lob}.json
    ... (further combinations as needed — see full table below)

keystone-schema-bindings/              ← separate bucket, NOT read by the Worker
  {viewId}/
    config-bindings.json               ← consumed only by Materialisation Service
```

**Critical separation:** `keystone-schema-bindings` and `keystone-resolved-schemas` are two separate S3 buckets with different IAM policies. The Worker only has read access to `keystone-resolved-schemas`. The `keystone-schema-bindings` bucket is accessible only to the Materialisation Service. No binding declarations, config keys, or transformation rules exist in the CDN-accessible bucket.

---

## The Five Context Dimensions

| Dimension | JWT Claim | Example Values | Notes |
|---|---|---|---|
| `tenantId` | `tenantId` | `gi`, `zurich`, `hiscox` | Primary discriminator. Every tenant has a base schema or inherits from `base.json`. |
| `role` | `role` | `underwriter`, `broker`, `admin`, `claims-handler` | Reflects the user's functional role within the tenant. |
| `lob` | `lob` | `motor`, `property`, `liability`, `marine` | Line of business. A user's role may be lob-agnostic (null lob claim). |
| `locale` | `locale` | `en-GB`, `de-DE`, `fr-FR` | BCP 47 language tag. Used for label overrides (the Materialisation Service bakes translated labels in). |
| `portalType` | `portalType` | `broker`, `direct`, `admin`, `mta` | Which portal surface the user is accessing. Drives layout and action visibility differences. |

---

## Key Naming Specification

### Rules

1. **Key format:** `{viewId}/{dimensionPart}.json`  
2. **Base key:** `{viewId}/base.json` — matches any context; used as fallback.  
3. **Dimension encoding:** `{name}={value}` for each dimension present in the file.  
4. **Multi-dimension separator:** `+` (plus sign, URL-safe, readable in S3 console).  
5. **Dimension ordering in filename:** fixed order, always written in this sequence:
   ```
   tenant → role → lob → locale → portalType
   ```
   A file encoding tenant and lob (skipping role) is written as:
   ```
   tenant=gi+lob=motor.json
   ```
   Never `lob=motor+tenant=gi.json`. The ordering is enforced by the Materialisation Service.  
6. **Character set:** dimension values must match `[a-z0-9\-]`. Values with uppercase are normalised to lowercase before use in key names. The JWT claim value `en-GB` becomes `locale=en-gb` in the key name.  
7. **No URL-encoding needed:** `+` is the only special character in key names and it is the literal separator, not a URL-encoded space.  
8. **Length limit:** S3 keys have a 1024-byte limit. The longest possible key (all 5 dimensions, maximum value lengths) stays well below this.  

### Key Name Examples

```
quotations-list/base.json
quotations-list/tenant=gi.json
quotations-list/tenant=gi+role=underwriter.json
quotations-list/tenant=gi+role=underwriter+lob=motor.json
quotations-list/tenant=gi+role=underwriter+lob=motor+locale=en-gb.json
quotations-list/tenant=gi+role=underwriter+lob=motor+locale=en-gb+portaltype=broker.json
quotations-list/role=broker.json
quotations-list/lob=motor+locale=en-gb.json
```

---

## Full Combination Table

This table shows the complete set of key patterns from least to most specific. In practice, the Materialisation Service only creates keys for which a schema variant has been authored — it does not create empty files for theoretical combinations.

| Specificity | # Dimensions | Pattern | Score* |
|---|---|---|---|
| Base | 0 | `base.json` | 0 |
| Single | 1 | `tenant={t}.json` | 100 |
| Single | 1 | `role={r}.json` | 10 |
| Single | 1 | `lob={l}.json` | 10 |
| Single | 1 | `locale={lo}.json` | 5 |
| Single | 1 | `portalType={p}.json` | 5 |
| Double | 2 | `tenant={t}+role={r}.json` | 110 |
| Double | 2 | `tenant={t}+lob={l}.json` | 110 |
| Double | 2 | `tenant={t}+locale={lo}.json` | 105 |
| Double | 2 | `tenant={t}+portaltype={p}.json` | 105 |
| Double | 2 | `role={r}+lob={l}.json` | 20 |
| Double | 2 | `role={r}+locale={lo}.json` | 15 |
| Double | 2 | `role={r}+portaltype={p}.json` | 15 |
| Double | 2 | `lob={l}+locale={lo}.json` | 15 |
| Double | 2 | `lob={l}+portaltype={p}.json` | 15 |
| Double | 2 | `locale={lo}+portaltype={p}.json` | 10 |
| Triple | 3 | `tenant={t}+role={r}+lob={l}.json` | 120 |
| Triple | 3 | `tenant={t}+role={r}+locale={lo}.json` | 115 |
| Triple | 3 | `tenant={t}+role={r}+portaltype={p}.json` | 115 |
| Triple | 3 | `tenant={t}+lob={l}+locale={lo}.json` | 115 |
| Triple | 3 | `tenant={t}+lob={l}+portaltype={p}.json` | 115 |
| Triple | 3 | `tenant={t}+locale={lo}+portaltype={p}.json` | 110 |
| Triple | 3 | `role={r}+lob={l}+locale={lo}.json` | 25 |
| Triple | 3 | `role={r}+lob={l}+portaltype={p}.json` | 25 |
| Triple | 3 | `role={r}+locale={lo}+portaltype={p}.json` | 20 |
| Triple | 3 | `lob={l}+locale={lo}+portaltype={p}.json` | 20 |
| Quad | 4 | `tenant={t}+role={r}+lob={l}+locale={lo}.json` | 125 |
| Quad | 4 | `tenant={t}+role={r}+lob={l}+portaltype={p}.json` | 125 |
| Quad | 4 | `tenant={t}+role={r}+locale={lo}+portaltype={p}.json` | 120 |
| Quad | 4 | `tenant={t}+lob={l}+locale={lo}+portaltype={p}.json` | 120 |
| Quad | 4 | `role={r}+lob={l}+locale={lo}+portaltype={p}.json` | 30 |
| Full | 5 | `tenant={t}+role={r}+lob={l}+locale={lo}+portaltype={p}.json` | 130 |

*Score = sum of weights of matched dimensions (tenantId=100, role=10, lob=10, locale=5, portalType=5)

---

## How the Materialisation Service Writes to This Layout

The Materialisation Service is a backend service (not browser-facing). It runs when:

1. A schema variant is authored or updated in the schema editor.
2. A config blob is saved in the Client Config System (triggers re-materialisation of all schemas that bind to the changed config key).
3. A manual re-materialise is triggered (e.g. after a bulk config import).

**Write procedure for a single variant:**

```
1. Read the schema definition for the variant (e.g. tenant=gi + role=underwriter + lob=motor)
2. Read the config-bindings.json for the viewId from keystone-schema-bindings/{viewId}/config-bindings.json
3. For each binding declaration:
   a. Resolve the config key against the Client Config System
   b. Apply the resolved value to the schema at the declared path
4. Produce resolved-schema.json (schema + all config values baked in)
5. Write to S3: keystone-resolved-schemas/{viewId}/tenant=gi+role=underwriter+lob=motor.json
6. If writing R2: same key, same content
7. Emit a CDN purge event: Surrogate-Key = schema-{viewId}
```

**What the Materialisation Service never does:**
- Write to `keystone-resolved-schemas/{viewId}/config-bindings.json` — config bindings live only in the separate `keystone-schema-bindings` bucket.
- Write partial or in-progress schemas — the file is written atomically (S3 PUT replaces the object).
- Create combination keys that have no authored variant — it only writes keys for variants that exist in the schema editor.

---

## `config-bindings.json` Files

Config bindings are stored separately from resolved schemas:

```
keystone-schema-bindings/
  quotations-list/
    config-bindings.json
  claims-list/
    config-bindings.json
  policy-detail/
    config-bindings.json
```

**Structure:**

```json
// keystone-schema-bindings/quotations-list/config-bindings.json
{
  "version": "1",
  "viewId": "quotations-list",
  "bindings": {
    "columns.status.valueMap": {
      "configKey": "insurance.quotation.status",
      "mapping": "enum-to-display",
      "fallback": { "label": "Unknown", "variant": "neutral" }
    },
    "header.title": {
      "configKey": "insurance.quotation.list.title",
      "mapping": "string",
      "fallback": "Quotations"
    },
    "columns.lob.valueMap": {
      "configKey": "insurance.lob",
      "mapping": "enum-to-display",
      "fallback": { "label": "Unknown", "variant": "neutral" }
    }
  }
}
```

**This file is never read by the Worker or the browser.** It is an authoring-time contract between the schema editor and the Materialisation Service. The resolved output bakes these values into the `resolved-schema.json` before it is written to S3.

---

## S3 Object Versioning Policy

S3 versioning is **enabled** on the `keystone-resolved-schemas` bucket. The `keystone-schema-bindings` bucket also has versioning enabled — binding file history is kept for audit purposes. Each `PUT` creates a new version of the object.

**Retention policy:**
- Keep the **last 20 versions** of each object.
- Versions older than the 20th are expired by an S3 lifecycle rule.
- This provides approximately 20 schema deploys of rollback history per key.

**S3 lifecycle rule (applied to the bucket):**

```json
{
  "Rules": [
    {
      "ID": "expire-old-schema-versions",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "NoncurrentVersionExpiration": {
        "NewerNoncurrentVersions": 20,
        "NoncurrentDays": 1
      }
    }
  ]
}
```

The `NoncurrentDays: 1` is a minimum required by S3; effectively the rule keeps 20 non-current versions and marks older ones for expiry after 1 day.

---

## Rollback Procedure

To roll back a schema to a previous version:

```bash
# 1. List versions of the target key
aws s3api list-object-versions \
  --bucket keystone-resolved-schemas \
  --prefix "quotations-list/tenant=gi+role=underwriter+lob=motor.json" \
  --query 'Versions[*].{VersionId:VersionId,LastModified:LastModified}' \
  --output table

# 2. Copy the desired version to make it the current HEAD
aws s3api copy-object \
  --bucket keystone-resolved-schemas \
  --copy-source "keystone-resolved-schemas/quotations-list/tenant=gi+role=underwriter+lob=motor.json?versionId=abc123" \
  --key "quotations-list/tenant=gi+role=underwriter+lob=motor.json"

# 3. Purge CDN cache for this view
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {cf_token}" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["schema-quotations-list"]}'
```

**After CDN purge:** the next request to the Worker will fetch the rolled-back version from S3 and cache it. The React Query in-memory cache in browser clients will serve stale data for up to 5 minutes (matching `staleTime`). For an urgent rollback, append `?_schema_bust=1` to schema requests (the Worker treats this as a cache bypass) or issue a broader CDN purge by tenant tag.

---

## Concrete Examples: `quotations-list` View

The following illustrates which S3 keys would exist for a realistic deployment involving two tenants, each with role and lob variants.

```
keystone-resolved-schemas/quotations-list/
├── base.json
│     ← Default schema for all tenants/roles/lobs.
│       Contains: standard columns (reference, status, premium, insured, created),
│       standard actions (view, new-quotation), default title "Quotations"
│
├── tenant=gi.json
│     ← GI tenant override.
│       Adds GI-specific branding classes, overrides title to "GI Quotations",
│       adds a "GI Reference" column not in base.
│
├── tenant=gi+role=underwriter.json
│     ← GI underwriter override.
│       Adds bulk-approve action, expander row with risk summary,
│       shows additional technical columns hidden from brokers.
│
├── tenant=gi+role=underwriter+lob=motor.json
│     ← GI underwriter working on motor.
│       Adds vehicle registration column, NCB column,
│       overrides status valueMap with motor-specific statuses.
│
├── tenant=gi+role=underwriter+lob=property.json
│     ← GI underwriter working on property.
│       Adds property address column, sum insured column,
│       overrides status valueMap with property-specific statuses.
│
├── tenant=gi+role=broker.json
│     ← GI broker.
│       Removes internal pricing columns, adds client reference column.
│
├── tenant=gi+portaltype=admin.json
│     ← GI admin portal.
│       Adds tenant management columns, removes end-user actions.
│
├── tenant=zurich.json
│     ← Zurich tenant override.
│       Different title, different branding, Zurich-specific column order.
│
└── tenant=zurich+role=underwriter+lob=motor.json
      ← Zurich underwriter / motor.
        Zurich-specific motor columns, Zurich status labels.
```

**Resolution for a GI underwriter on motor:**

Request context: `tenantId=gi, role=underwriter, lob=motor, locale=en-gb, portalType=broker`

Candidates and scores:
```
base.json                                          → score 0
tenant=gi.json                                     → score 100
tenant=gi+role=underwriter.json                    → score 110
tenant=gi+role=underwriter+lob=motor.json          → score 120  ← WINNER
tenant=gi+role=broker.json                         → score 110 (role=broker ≠ underwriter, disqualified)
tenant=gi+portaltype=admin.json                    → score 105 (portalType=admin ≠ broker, disqualified)
tenant=zurich.json                                 → score 0   (tenant=zurich ≠ gi, disqualified)
tenant=zurich+role=underwriter+lob=motor.json      → score 0   (tenant mismatch, disqualified)
```

Result: `tenant=gi+role=underwriter+lob=motor.json` is served.
