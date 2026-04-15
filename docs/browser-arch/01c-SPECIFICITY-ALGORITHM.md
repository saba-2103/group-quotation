# 01c — Inline Conditions

**Status:** Adopted  
**Last updated:** 2026-04-09  
**Parent doc:** [01-EDGE-SCHEMA-RESOLUTION.md](./01-EDGE-SCHEMA-RESOLUTION.md)  
**Decision record:** [ADR-003](../ADR-003-schema-partials-replace-specificity.md) — why specificity was removed; inline conditions rationale within

---

## Overview

A schema file is a single unified document. It describes the complete schema for a tenant — columns, actions, widgets, layout — with visibility conditions annotated directly on the items that have them. There is no separate "base" block or "overrides" array. You read the file top-to-bottom and see exactly what exists and when each item appears.

The Cloudflare Worker reads the file and filters the document: any item whose `$show` condition does not match the user's JWT claims is removed before the document is returned. Items with no condition are always included.

---

## The `$show` and `$hide` Conditions

Any item within a schema array (a column, an action, a widget, a tab) may carry a `$show` or `$hide` condition.

```typescript
// Applicable to any object within a schema array
interface ConditionalItem {
  /**
   * Item is included ONLY IF all condition keys match the JWT claims.
   * A null/absent JWT claim never satisfies a condition key.
   * Comparison is case-insensitive.
   */
  $show?: Record<string, string>;

  /**
   * Item is excluded IF all condition keys match the JWT claims.
   * Inverse of $show. Use when the default is "show" and you want to hide
   * for a specific context. Less common than $show.
   */
  $hide?: Record<string, string>;
}
```

**Rules:**
- All keys in `$show` / `$hide` must match for the condition to apply. `{ "role": "underwriter", "lob": "motor" }` matches only when both claims match.
- If neither `$show` nor `$hide` is present, the item is always included.
- If both are present on the same item, `$show` takes precedence.
- `$show` and `$hide` are stripped from the output — the browser receives a clean document with no condition metadata.
- Conditions apply to the item itself, not recursively to its children. A column with `$show` that passes is included in full; its own child fields are not re-evaluated (unless they also carry conditions).

---

## Resolution Algorithm

```typescript
// workers/schema-resolver/src/conditions.ts

/**
 * Walks the schema document and removes any items whose $show/$hide condition
 * does not match the request context. Strips $show/$hide keys from the output.
 *
 * Objects are walked recursively. Arrays are filtered then recursed.
 * Scalars and null are returned unchanged.
 */
export function applyConditions(
  schema: TenantSchema,
  ctx: SchemaContext,
): ResolvedSchema {
  return deepFilter(schema, ctx) as ResolvedSchema;
}

function deepFilter(value: unknown, ctx: SchemaContext): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => isVisible(item, ctx))
      .map((item) => deepFilter(item, ctx));
  }

  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '$show' || k === '$hide') continue;   // strip — never sent to browser
      out[k] = deepFilter(v, ctx);
    }
    return out;
  }

  return value;  // scalar — return as-is
}

/**
 * Returns true if the item should be included in the output.
 * Non-object values (scalars, null) are always visible.
 */
function isVisible(item: unknown, ctx: SchemaContext): boolean {
  if (typeof item !== 'object' || item === null) return true;

  const obj = item as Record<string, unknown>;

  if (obj.$show != null) {
    return conditionMatches(obj.$show as Record<string, string>, ctx);
  }
  if (obj.$hide != null) {
    return !conditionMatches(obj.$hide as Record<string, string>, ctx);
  }
  return true;
}

/**
 * Returns true if every key in the condition matches the JWT context value.
 * A null/undefined context value never matches.
 */
function conditionMatches(
  condition: Record<string, string>,
  ctx: SchemaContext,
): boolean {
  const ctxMap: Record<string, string | null | undefined> = {
    role:       ctx.role,
    lob:        ctx.lob,
    locale:     ctx.locale,
    portalType: ctx.portalType,
  };
  return Object.entries(condition).every(([key, value]) => {
    const ctxValue = ctxMap[key];
    if (ctxValue == null) return false;
    return ctxValue.toLowerCase() === value.toLowerCase();
  });
}
```

**Why filter instead of merge:**  
The previous design (flat partials array + deep merge) required the Worker to understand override semantics — later partials win at conflicting paths, arrays replace not concatenate. This was necessary because overrides lived separately from the base. With inline conditions, the document already contains the full picture. The Worker only needs to decide: is this item in or out. No merge logic, no conflict resolution.

---

## Example Schema File: `quotations-list/gi.json`

```json
{
  "schemaId": "quotations-list",
  "tenantId": "gi",
  "version": "2.1.0",
  "resolvedAt": "2026-04-09T10:00:00Z",
  "layout": { "type": "data-table", "title": "Quotations" },
  "columns": [
    {
      "key": "reference",
      "label": "Reference",
      "type": "text"
    },
    {
      "key": "status",
      "label": "Status",
      "type": "badge",
      "valueMap": {
        "DRAFT":            { "label": "Draft",            "variant": "neutral" },
        "PENDING_APPROVAL": { "label": "Pending Approval", "variant": "warning" },
        "APPROVED":         { "label": "Approved",         "variant": "success" }
      }
    },
    {
      "key": "premium",
      "label": "Premium",
      "type": "currency"
    },
    {
      "key": "client-reference",
      "label": "Your Reference",
      "type": "text",
      "$show": { "role": "broker" }
    },
    {
      "key": "risk-summary",
      "label": "Risk Summary",
      "type": "text",
      "$show": { "role": "underwriter" }
    },
    {
      "key": "tech-rating",
      "label": "Tech Rating",
      "type": "text",
      "$show": { "role": "underwriter" }
    },
    {
      "key": "vehicle-reg",
      "label": "Vehicle Reg",
      "type": "text",
      "$show": { "role": "underwriter", "lob": "motor" }
    },
    {
      "key": "ncb",
      "label": "NCB",
      "type": "percent",
      "$show": { "role": "underwriter", "lob": "motor" }
    }
  ],
  "actions": [
    { "key": "view",          "label": "View" },
    { "key": "new-quotation", "label": "New Quotation" },
    {
      "key": "bulk-approve",
      "label": "Bulk Approve",
      "$show": { "role": "underwriter" }
    }
  ]
}
```

Reading this file top-to-bottom you can see the entire schema and precisely when each item appears. No mental merging required.

---

## Worked Resolution Traces

### GI underwriter, motor LOB

```
JWT: { tenantId: "gi", role: "underwriter", lob: "motor" }
File: quotations-list/gi.json

columns filtered:
  reference          — no condition           → INCLUDED
  status             — no condition           → INCLUDED
  premium            — no condition           → INCLUDED
  client-reference   — $show { role: broker } → role=underwriter ≠ broker  → EXCLUDED
  risk-summary       — $show { role: underwriter } → MATCH                 → INCLUDED
  tech-rating        — $show { role: underwriter } → MATCH                 → INCLUDED
  vehicle-reg        — $show { role: underwriter, lob: motor } → MATCH     → INCLUDED
  ncb                — $show { role: underwriter, lob: motor } → MATCH     → INCLUDED

actions filtered:
  view           — no condition                           → INCLUDED
  new-quotation  — no condition                           → INCLUDED
  bulk-approve   — $show { role: underwriter } → MATCH   → INCLUDED

Result: [reference, status, premium, risk-summary, tech-rating, vehicle-reg, ncb]
        actions: [view, new-quotation, bulk-approve]
```

### GI broker, any LOB

```
JWT: { tenantId: "gi", role: "broker", lob: "property" }
File: quotations-list/gi.json

columns filtered:
  reference          → INCLUDED
  status             → INCLUDED
  premium            → INCLUDED
  client-reference   — $show { role: broker } → MATCH   → INCLUDED
  risk-summary       — $show { role: underwriter } → no match → EXCLUDED
  tech-rating        → EXCLUDED
  vehicle-reg        — $show { role: underwriter, lob: motor } → no match → EXCLUDED
  ncb                → EXCLUDED

actions filtered:
  view           → INCLUDED
  new-quotation  → INCLUDED
  bulk-approve   — $show { role: underwriter } → no match → EXCLUDED

Result: [reference, status, premium, client-reference]
        actions: [view, new-quotation]
```

### New tenant — fallback to default

```
JWT: { tenantId: "newclient", role: "broker" }

Worker tries: quotations-list/newclient.json → not found
Worker tries: quotations-list/default.json   → found

Applies same condition filtering against default.json
```

---

## Value-Level Variation (Different `valueMap` for Different Contexts)

`$show` / `$hide` handle **inclusion** — whether an item is in the output or not. They do not handle **value overrides** — changing the content of an item that is already included.

The primary mechanism for value-level variation is the **Config System**: different config keys per context. If motor underwriters need `"APPROVED"` to display as `"On Cover"` rather than `"Approved"`, the correct approach is:

1. Register a separate config key: `insurance.quotation.status.motor`
2. In `config-bindings.json`, declare a binding that targets `insurance.quotation.status.motor` for the motor column

When a value override within a single column is genuinely needed (same column key, different content), the pattern is **two items with complementary conditions**:

```json
{ "key": "status", "type": "badge",
  "$hide": { "lob": "motor" },
  "valueMap": { "APPROVED": { "label": "Approved",  "variant": "success" } }
},
{ "key": "status", "type": "badge",
  "$show": { "lob": "motor" },
  "valueMap": { "APPROVED": { "label": "On Cover",  "variant": "success" } }
}
```

The renderer receives exactly one `status` column (the non-motor user gets the first, the motor user gets the second). Each has its own config binding resolved at materialisation time. This pattern is explicit and readable at the cost of duplication for that field.

---

## Edge Cases

| Case | Behaviour |
|---|---|
| No conditions match for any item | All unconditioned items are returned; schema is the base set |
| JWT has no `lob` claim | Any `$show` with `lob` key evaluates to false — those items excluded |
| `$show` with unknown condition key | Unknown key is not in `ctxMap`, resolves to null → condition false → item excluded; Worker logs a warning |
| Nested arrays (e.g. tabs containing columns) | `deepFilter` recurses into all arrays at any depth |
| `$show` on a non-array item (e.g. top-level field) | `$show` has no effect on objects outside arrays — conditions only filter array items |
| `default.json` missing and tenant file missing | Worker returns 404 `SCHEMA_NOT_FOUND` |
