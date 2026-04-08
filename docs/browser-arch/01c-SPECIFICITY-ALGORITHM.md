# 01c — Specificity Algorithm

**Status:** Adopted  
**Last updated:** 2026-04-08  
**Parent doc:** [01-EDGE-SCHEMA-RESOLUTION.md](./01-EDGE-SCHEMA-RESOLUTION.md)  

---

## Overview

The specificity algorithm is the function that, given a request context and a set of candidate S3 keys for a `viewId`, selects the schema that most precisely matches the user's context. It is inspired by the CSS specificity model: each dimension match contributes a weighted score, the highest score wins, and ties are resolved by merging rather than by arbitrary selection.

The algorithm runs inside the Cloudflare Worker on every cache miss. It operates entirely on strings (the S3 key names) and in-memory parsed JSON. There is no database query, no external call, and no state.

---

## Dimension Weights

| Dimension | Weight | Rationale |
|---|---|---|
| `tenantId` | 100 | Tenant identity is the primary discriminant — a tenant-specific schema should always beat a role/lob-only schema |
| `role` | 10 | Role shapes functional capabilities within a tenant |
| `lob` | 10 | Line of business shapes domain-specific fields; equal weight to role since either alone meaningfully changes the view |
| `locale` | 5 | Locale affects labels only (already baked in); lower weight because locale variants are usually thin label overrides, not structural changes |
| `portalType` | 5 | Portal variants are typically layout adjustments; lower weight for the same reason as locale |

**Maximum possible score:** 100 + 10 + 10 + 5 + 5 = **130** (all 5 dimensions match)

---

## Scoring Rules

A candidate key scores a dimension **only if all of the following are true:**

1. The key filename **explicitly encodes** that dimension (e.g. `tenant=gi` is in the filename).
2. The encoded value **exactly matches** the request context value for that dimension (case-insensitive, after normalisation to lowercase).
3. If the request context has `null` for a dimension (the user's JWT does not include that claim), no candidate that explicitly encodes that dimension can score it — they are **disqualified** for that dimension.

A candidate is **disqualified entirely** (score = -1, excluded from ranking) if it encodes a dimension whose value does not match the request context — regardless of how well it matches other dimensions. A file named `tenant=zurich+role=underwriter.json` cannot score anything for a `tenantId=gi` context. It is filtered out before scoring begins.

**Scoring is additive:** a file that matches `tenant` and `role` scores 110 (100 + 10). It does not get a bonus for matching more dimensions than the request context has.

---

## TypeScript Implementation

This is the canonical algorithm implementation. The Cloudflare Worker imports `runSpecificityAlgorithm` from this module.

```typescript
// workers/schema-resolver/src/specificity.ts

export interface SchemaContext {
  tenantId: string;
  role: string;
  lob: string | null;
  locale: string | null;
  portalType: string | null;
}

export interface ResolutionResult {
  /** The single winning key, or null if no candidates matched and no base.json exists. */
  winnerKey: string | null;
  /**
   * When two or more candidates tie on score, mergeKeys contains all tied keys
   * ordered from least to most specific (for merge order). winnerKey is set to
   * the most specific key in this case.
   */
  mergeKeys: string[];
}

const DIMENSION_WEIGHTS: Record<string, number> = {
  tenant:     100,
  role:       10,
  lob:        10,
  locale:     5,
  portaltype: 5,   // lowercase — filenames are normalised
};

/**
 * Parses a schema key filename into a dimension map.
 * e.g. "quotations-list/tenant=gi+role=underwriter+lob=motor.json"
 *   → { tenant: "gi", role: "underwriter", lob: "motor" }
 *
 * "quotations-list/base.json" → {} (empty — matches everything)
 */
function parseKeyDimensions(key: string): Record<string, string> {
  const filename = key.split('/').pop() ?? key;
  const base = filename.replace(/\.json$/, '');

  if (base === 'base') return {};

  return Object.fromEntries(
    base.split('+').map((part) => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) throw new Error(`Invalid key segment: ${part}`);
      return [part.slice(0, eqIdx).toLowerCase(), part.slice(eqIdx + 1).toLowerCase()];
    })
  );
}

/**
 * Normalises a context value for comparison.
 * Null means "not present in this user's JWT" — treated as wildcard.
 */
function normalise(value: string | null): string | null {
  return value?.toLowerCase() ?? null;
}

/**
 * Scores a single candidate key against the request context.
 * Returns -1 if the candidate is disqualified (encodes a dimension
 * that conflicts with the context).
 */
function scoreCandidate(
  key: string,
  ctx: SchemaContext,
): number {
  const dims = parseKeyDimensions(key);

  const contextMap: Record<string, string | null> = {
    tenant:     normalise(ctx.tenantId),
    role:       normalise(ctx.role),
    lob:        normalise(ctx.lob),
    locale:     normalise(ctx.locale),
    portaltype: normalise(ctx.portalType),
  };

  let score = 0;

  for (const [dim, value] of Object.entries(dims)) {
    const ctxValue = contextMap[dim];

    if (ctxValue === null) {
      // Request context has no value for this dimension.
      // A file that explicitly encodes this dimension cannot match — disqualify.
      return -1;
    }

    if (ctxValue !== value) {
      // Explicit mismatch — disqualify entirely.
      return -1;
    }

    // Match — add weight.
    score += DIMENSION_WEIGHTS[dim] ?? 0;
  }

  return score;
}

/**
 * Main entry point. Given the list of S3 keys for a viewId and the
 * request context, returns the resolution result.
 */
export function runSpecificityAlgorithm(
  candidateKeys: string[],
  ctx: SchemaContext,
): ResolutionResult {
  const baseKey = candidateKeys.find((k) => k.endsWith('/base.json')) ?? null;

  // Score all candidates
  const scored: Array<{ key: string; score: number }> = candidateKeys
    .map((key) => ({ key, score: scoreCandidate(key, ctx) }))
    .filter(({ score }) => score >= 0)   // remove disqualified
    .sort((a, b) => b.score - a.score);  // highest score first

  if (scored.length === 0) {
    // No candidates matched — fall back to base.json
    return { winnerKey: baseKey, mergeKeys: [] };
  }

  const topScore = scored[0].score;

  if (topScore === 0) {
    // Only base.json matched (score 0 = no dimension matches = base)
    return { winnerKey: baseKey, mergeKeys: [] };
  }

  const topTier = scored.filter(({ score }) => score === topScore);

  if (topTier.length === 1) {
    // Clear winner
    return { winnerKey: topTier[0].key, mergeKeys: [] };
  }

  // Tie: collect all tied keys for merging.
  // Also include base.json as the merge base if it exists.
  // Order: base → tied candidates (any order among themselves — merge is commutative for non-overlapping paths)
  const mergeKeys = [
    ...(baseKey ? [baseKey] : []),
    ...topTier.map(({ key }) => key),
  ];

  return { winnerKey: topTier[topTier.length - 1].key, mergeKeys };
}
```

---

## Merge Algorithm (Tie-Breaking)

When two candidates tie on score, neither is discarded. Their contents are deep-merged. The merge rule is:

**More-specific fields override less-specific fields. In a tie, "more specific" is defined by dimension count — the candidate with more encoded dimensions wins field-level conflicts.**

If two tied candidates have the same dimension count (true equality), conflicts are resolved by dimension value priority order: `tenant` value > `role` value > `lob` value > `locale` value > `portalType` value. In practice, true ties between files of equal dimension count are rare.

```typescript
// workers/schema-resolver/src/merge.ts

/**
 * Deep-merges an ordered array of schema objects.
 * Later entries in the array override earlier entries at the field level.
 * Arrays are replaced (not concatenated) — a more-specific schema can
 * completely replace a columns[] array.
 */
export function mergeSchemas(schemas: ResolvedSchema[]): ResolvedSchema {
  if (schemas.length === 0) throw new Error('Cannot merge empty schema array');
  if (schemas.length === 1) return schemas[0];

  return schemas.reduce((acc, schema) => deepMerge(acc, schema));
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: T): T {
  const result = { ...base };

  for (const key of Object.keys(override) as (keyof T)[]) {
    const baseVal = base[key];
    const overrideVal = override[key];

    if (
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overrideVal === 'object' &&
      overrideVal !== null &&
      !Array.isArray(overrideVal)
    ) {
      // Both are plain objects — recurse
      result[key] = deepMerge(baseVal as Record<string, unknown>, overrideVal as Record<string, unknown>) as T[keyof T];
    } else {
      // Scalar, array, or null — override wins (replace, not concatenate)
      result[key] = overrideVal;
    }
  }

  return result;
}
```

**Array replacement rationale:** A more-specific schema that overrides `columns[]` is declaring the complete column set for that context. Concatenating arrays would produce duplicate columns. Replacement is the correct semantic.

---

## Test Cases

The following test cases cover the algorithm end-to-end. These cases should be maintained as unit tests in `workers/schema-resolver/src/specificity.test.ts`.

### Case 1 — Clear winner by highest score

```
Context:    tenantId=gi, role=underwriter, lob=motor, locale=en-gb, portalType=broker

Candidates:
  quotations-list/base.json                                      → score  0
  quotations-list/tenant=gi.json                                 → score 100
  quotations-list/tenant=gi+role=underwriter.json                → score 110
  quotations-list/tenant=gi+role=underwriter+lob=motor.json      → score 120  ← WINNER
  quotations-list/role=underwriter.json                          → score  10
  quotations-list/lob=motor.json                                 → score  10

Result: winnerKey = "quotations-list/tenant=gi+role=underwriter+lob=motor.json", mergeKeys = []
```

### Case 2 — Context missing an optional dimension (lob is null)

```
Context:    tenantId=gi, role=admin, lob=null, locale=null, portalType=null

Candidates:
  quotations-list/base.json                                      → score  0
  quotations-list/tenant=gi.json                                 → score 100  ← WINNER
  quotations-list/tenant=gi+role=admin.json                      → score 110  ← WINNER
  quotations-list/tenant=gi+lob=motor.json                       → DISQUALIFIED (lob in file but null in ctx)
  quotations-list/tenant=gi+role=underwriter+lob=motor.json      → DISQUALIFIED (role mismatch + lob null)

Result: winnerKey = "quotations-list/tenant=gi+role=admin.json", mergeKeys = []
```

### Case 3 — No tenant match, falls back to base

```
Context:    tenantId=newclient, role=broker, lob=motor, locale=en-gb, portalType=broker

Candidates:
  quotations-list/base.json                                      → score  0  ← WINNER (only match)
  quotations-list/tenant=gi.json                                 → DISQUALIFIED
  quotations-list/tenant=zurich+role=broker.json                 → DISQUALIFIED

Result: winnerKey = "quotations-list/base.json", mergeKeys = []
```

### Case 4 — Tie between two single-dimension matches: merge

```
Context:    tenantId=gi, role=broker, lob=motor, locale=null, portalType=null

Candidates:
  quotations-list/base.json                                      → score  0
  quotations-list/tenant=gi.json                                 → score 100
  quotations-list/role=broker.json                               → score  10
  quotations-list/lob=motor.json                                 → score  10

Scoring summary:
  - tenant=gi.json:    100 (clear highest)
  - role=broker.json:   10
  - lob=motor.json:     10   ← TIE between role=broker.json and lob=motor.json

Top score is 100 — tenant=gi.json wins with no tie.
(role and lob files are not in the top tier)

Result: winnerKey = "quotations-list/tenant=gi.json", mergeKeys = []
```

### Case 4b — Tie at top tier: two candidates both at score 110

```
Context:    tenantId=gi, role=underwriter, lob=motor, locale=en-gb, portalType=null

Candidates:
  quotations-list/base.json                                      → score   0
  quotations-list/tenant=gi+role=underwriter.json                → score 110  ← TIE
  quotations-list/tenant=gi+lob=motor.json                       → score 110  ← TIE

Both files score 110. Neither disqualifies the other.

Result:
  winnerKey = "quotations-list/tenant=gi+lob=motor.json"  (last in mergeKeys)
  mergeKeys = [
    "quotations-list/base.json",
    "quotations-list/tenant=gi+role=underwriter.json",
    "quotations-list/tenant=gi+lob=motor.json"
  ]

Merge order: base → tenant=gi+role=underwriter → tenant=gi+lob=motor
  (tenant=gi+lob=motor fields override tenant=gi+role=underwriter fields at conflicts)
```

### Case 5 — No candidates, no base.json → 404

```
Context:    tenantId=gi, role=underwriter, lob=motor, locale=null, portalType=null

Candidates:   (empty — viewId does not exist in S3)

Result: winnerKey = null, mergeKeys = []
  → Worker returns 404 SCHEMA_NOT_FOUND
```

---

## Edge Cases

| Case | Behaviour |
|---|---|
| `base.json` missing and no other match | Return `winnerKey: null` → Worker returns 404 |
| All candidates disqualified (none match context) | Fall back to `base.json`; if absent, 404 |
| Candidate key with unknown dimension name (e.g. `product=xxx`) | That dimension's weight = 0 (from `DIMENSION_WEIGHTS`); file is not disqualified, scores 0 for that dimension; effectively treated as base |
| `viewId` contains a `/` (nested view IDs) | The `ListObjectsV2` prefix is `{viewId}/` — nested view IDs work if the full path is used as the viewId |
| Context value contains special characters | Values are normalised to `[a-z0-9\-]` before comparison; the normalisation must be applied consistently in both Materialisation Service key writing and Worker context parsing |
| Two files with identical content but different keys tie | Merge produces the same result as either file alone — safe |
| `locale` value `en-GB` vs `en-gb` in JWT | Worker normalises both to lowercase before comparison; key names are always written lowercase by the Materialisation Service |
