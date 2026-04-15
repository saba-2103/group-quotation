# 01b — S3 / R2 Schema Layout

**Status:** Adopted  
**Last updated:** 2026-04-09  
**Parent doc:** [01-EDGE-SCHEMA-RESOLUTION.md](./01-EDGE-SCHEMA-RESOLUTION.md)

---

## Overview

This document is the authoritative specification for how schema files are stored in S3 (or Cloudflare R2). The key naming convention is the contract between:

1. The **Schema Materialisation Service** — which writes files to S3 after a config change or schema deploy.
2. The **Cloudflare Worker** — which reads files from S3 to serve schema requests.

Any change to this convention must be coordinated across both.

---

## Bucket Structure

```
keystone-resolved-schemas/              ← CDN-accessible; read by the Worker
  {viewId}/
    default.json                        ← Universal fallback for tenants with no explicit schema
    {tenantId}.json                     ← One file per tenant per view

keystone-schema-bindings/              ← Private; accessible only to the Materialisation Service
  {viewId}/
    config-bindings.json               ← Authoring-time binding declarations; never read by Worker or browser
```

**Critical separation:** `keystone-resolved-schemas` and `keystone-schema-bindings` are two separate S3 buckets with different IAM policies. The Worker has read access to `keystone-resolved-schemas` only. No binding declarations, config keys, or transformation rules exist in the CDN-accessible bucket.

---

## File Naming Rules

1. **Tenant file:** `{viewId}/{tenantId}.json` — the complete schema for a specific tenant. Contains `base` schema and all `partials` for that tenant. See [01c-CONDITIONAL-PARTIALS](./01c-SPECIFICITY-ALGORITHM.md) for the file format.
2. **Default file:** `{viewId}/default.json` — fallback schema for tenants with no explicit file. Should represent a minimal working schema for new onboardings.
3. **Tenant ID normalisation:** Tenant IDs are lowercased. `tenantId=GI` in the JWT becomes `gi.json` on disk.
4. **No subdirectories beyond viewId:** The full key is always exactly `{viewId}/{tenantId}.json`. No nesting.

---

## How the Worker Uses This Layout

On a cache miss, the Worker performs at most **two `GetObject` calls:**

```
1. Attempt:  keystone-resolved-schemas/{viewId}/{tenantId}.json
             → found: apply partials, return
             → not found: continue

2. Attempt:  keystone-resolved-schemas/{viewId}/default.json
             → found: apply inline conditions, return
             → not found: return 404 SCHEMA_NOT_FOUND
```

There is no `ListObjects`. There is no scoring. The Worker reads one file, filters out items whose `$show`/`$hide` conditions don't match the user's JWT claims, and returns the cleaned document.

The KV hot cache key is `{viewId}:{contextHash}` — keying the resolved (post-filter) output per user context.

---

## File Format

Each file is a flat schema document with inline conditions. There is no `base`/`partials` split — the schema is the complete picture, with `$show`/`$hide` annotations on items that are conditional. Full specification in [01c — Inline Conditions](./01c-SPECIFICITY-ALGORITHM.md).

```json
{
  "schemaId": "{viewId}",
  "tenantId": "{tenantId}",
  "version": "{semver}",
  "resolvedAt": "{ISO-8601}",
  "layout": { ... },
  "columns": [
    { "key": "...", "label": "...", "type": "..." },
    { "key": "...", "label": "...", "type": "...", "$show": { "{claim-key}": "{claim-value}" } }
  ],
  "actions": [
    { "key": "...", "label": "..." },
    { "key": "...", "label": "...", "$show": { "{claim-key}": "{claim-value}" } }
  ]
}
```

Items with no `$show` or `$hide` are always included. Items that are conditional carry the condition directly on themselves — no separate overrides block. The `$show`/`$hide` keys are stripped from the output before the document is returned to the browser.

---

## How the Materialisation Service Writes to This Layout

The Materialisation Service is a backend service (not browser-facing). It runs when:

1. A schema is authored or updated in the schema editor.
2. A config blob is saved in the Client Config System (triggers re-materialisation of all schemas that bind to the changed config key).
3. A manual re-materialise is triggered (e.g. after a bulk config import).

**Write procedure for a single view-tenant schema:**

```
1. Read the schema definition for the view-tenant combination from the schema store.
   The schema is already a flat document with $show/$hide conditions on items.

2. Read config-bindings.json for this viewId from:
      keystone-schema-bindings/{viewId}/config-bindings.json

3. For each binding declaration:
   a. Resolve the config key against the Client Config System
   b. Apply the resolved value to the schema at the declared JSON path
      (bindings target any field in the flat document — conditions are preserved)

4. Produce the resolved flat document (all config values baked in, $show/$hide intact)

5. Write atomically to S3:
      keystone-resolved-schemas/{viewId}/{tenantId}.json

6. Emit CDN purge event:  Surrogate-Key = schema-{viewId}
```

**What the Materialisation Service never does:**
- Write to `keystone-resolved-schemas/{viewId}/config-bindings.json` — bindings live only in the private bucket.
- Write partial or in-progress files — the PUT replaces the object atomically.
- Evaluate or strip `$show`/`$hide` conditions — that is the Worker's job at request time.
- Create a schema file for a tenant that has not been explicitly onboarded.

---

## Concrete Example: `quotations-list` View

```
keystone-resolved-schemas/quotations-list/
│
├── default.json
│     ← Minimal universal schema for tenants with no explicit file.
│       Columns: [reference, status, premium]. Actions: [view].
│       No $show conditions — same for everyone.
│
├── gi.json
│     ← GI tenant schema — flat document, conditions inline on items.
│       All columns present; conditional ones annotated with $show:
│         client-reference   $show: { role: "broker" }
│         risk-summary       $show: { role: "underwriter" }
│         tech-rating        $show: { role: "underwriter" }
│         vehicle-reg        $show: { role: "underwriter", lob: "motor" }
│         ncb                $show: { role: "underwriter", lob: "motor" }
│         property-address   $show: { role: "underwriter", lob: "property" }
│         sum-insured        $show: { role: "underwriter", lob: "property" }
│         admin-tenant-col   $show: { portalType: "admin" }
│       bulk-approve action  $show: { role: "underwriter" }
│
└── zurich.json
      ← Zurich tenant schema — same structure, different branding, Zurich column set.
         Zurich-specific conditions on Zurich-specific items.
```

**Resolution for a GI underwriter on motor:**

```
JWT: { tenantId: "gi", role: "underwriter", lob: "motor" }
File fetched: quotations-list/gi.json

Columns filtered:
  reference          — no condition                                   → included
  status             — no condition                                   → included
  premium            — no condition                                   → included
  client-reference   — $show { role: broker }        → no match      → excluded
  risk-summary       — $show { role: underwriter }   → match         → included
  tech-rating        — $show { role: underwriter }   → match         → included
  vehicle-reg        — $show { role: underwriter, lob: motor } → match → included
  ncb                — $show { role: underwriter, lob: motor } → match → included
  property-address   — $show { role: underwriter, lob: property } → no match → excluded
  sum-insured        — $show { role: underwriter, lob: property } → no match → excluded

Result: [reference, status, premium, risk-summary, tech-rating, vehicle-reg, ncb]
        bulk-approve action included
```

---

## S3 Object Versioning Policy

S3 versioning is **enabled** on both buckets. Each `PUT` creates a new version of the object.

**Retention policy:** Keep the last 20 versions per object. S3 lifecycle rule expires older versions.

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

The `NoncurrentDays: 1` is the minimum required by S3; effectively the rule retains 20 non-current versions and marks older ones for expiry after 1 day.

---

## Rollback Procedure

To roll back a schema file to a previous version:

```bash
# 1. List versions of the target key
aws s3api list-object-versions \
  --bucket keystone-resolved-schemas \
  --prefix "quotations-list/gi.json" \
  --query 'Versions[*].{VersionId:VersionId,LastModified:LastModified}' \
  --output table

# 2. Copy the desired version to make it the current HEAD
aws s3api copy-object \
  --bucket keystone-resolved-schemas \
  --copy-source "keystone-resolved-schemas/quotations-list/gi.json?versionId=abc123" \
  --key "quotations-list/gi.json"

# 3. Purge CDN cache for this view
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {cf_token}" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["schema-quotations-list"]}'
```

**After CDN purge:** the next request fetches the rolled-back version from S3 and re-caches it. The React Query in-memory cache in active browser sessions will serve stale data for up to 5 minutes (matching `staleTime`). For an urgent rollback, append `?_schema_bust=1` to schema requests (the Worker treats this as a cache bypass) or issue a broader CDN purge by tenant tag.

---

## `config-bindings.json` Files

Config bindings are stored separately and are never read by the Worker or the browser:

```
keystone-schema-bindings/
  quotations-list/
    config-bindings.json
  claims-list/
    config-bindings.json
  policy-detail/
    config-bindings.json
```

**Structure example:**

```json
{
  "version": "1",
  "viewId": "quotations-list",
  "bindings": {
    "base.columns.status.valueMap": {
      "configKey": "insurance.quotation.status",
      "mapping": "enum-to-display",
      "fallback": { "label": "Unknown", "variant": "neutral" }
    },
    "base.layout.title": {
      "configKey": "insurance.quotation.list.title",
      "mapping": "string",
      "fallback": "Quotations"
    },
    "partials[id=role-underwriter-lob-motor].overrides.columns.status.valueMap": {
      "configKey": "insurance.quotation.status.motor",
      "mapping": "enum-to-display",
      "fallback": { "label": "Unknown", "variant": "neutral" }
    }
  }
}
```

Binding paths use dot notation. Paths into partials use the `partials[id={partial-id}]` prefix to target a specific partial's overrides. **This file is never read by the Worker or the browser.** It is consumed only by the Materialisation Service at schema write time.
