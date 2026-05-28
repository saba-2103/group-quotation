# Design — PROP-0006: data-table dataSource parseJson + cross-array join

run-id: 2026-05-13-datatable-parsejson-join
proposal: [proposals/PROP-0006-quote-detail-pricing-breakdown.md](../../../proposals/PROP-0006-quote-detail-pricing-breakdown.md)

## Goal

Lift two existing primitives from KeyValueGrid (per-field `parseJson + subPath`) up to the `data-table` widget at the dataSource layer, plus add a small cross-array join primitive on columns. With both landed, the forward-declared Pricing tab schema in `schemas/tabs/quote/pricing.json` renders the per-plan premium breakdown live without further changes.

## In scope

1. **`useDataTable` data resolver upgrade** — replace the three-step auto-discovery with an explicit pipeline:
   - resolve at `dataSource.dataPath` (dotted, optional)
   - optionally `JSON.parse` if `dataSource.parseJson === true`
   - if both unset, fall back to existing auto-discovery
   - errors surface as a render error (per CLARIFY Q1)

2. **`useDataTable` join enrichment** — pre-enrich rows so columns declaring `joinSource + joinKey + joinField` get their values from the matching sibling row on the response root. No match → undefined → existing renderer shows `—`.

3. **Type extensions:**
   - `DataSourceConfig` gains `parseJson?: boolean` and `dataPath?: string`.
   - `ColumnConfig` gains `joinSource?: string`, `joinKey?: string`, `joinField?: string`.

## Out of scope

- A shared `resolveAccessor` utility consolidating KeyValueGrid / OverlaidForm / data-table — flagged for the Layer 1 runtime extraction PR #57 / ARCH_TRANSITION convergence.
- Multi-level joins (joining via a chain of two arrays).
- Joins against a separate API endpoint (the join sibling must be on the same response payload).
- Editable cells.

## Architecture transition

These two enhancements duplicate the KeyValueGrid `parseJson + subPath` pattern at a new layer. The duplication is intentional for V1; a shared utility lifts cleanly once the schema-engine extraction PR lands.

Already tracked in `context/ARCH_TRANSITION.md` under "OverlaidForm per-field sourcePath pre-fill" — same convergence trigger applies. I will append a one-line cross-ref note rather than a full new entry.

## Data shapes touched

The Pricing tab schema (already on disk):

```jsonc
{
  "type": "data-table",
  "dataSource": {
    "api": { "endpoint": "/api/quotation/quotes/{{id}}", "method": "GET" },
    "dataPath": "estimatedPremium.byPlanJson",   // ← Enhancement 1
    "parseJson": true                             // ← Enhancement 1
  },
  "props": {
    "data": [],                                    // ← drop after Enhancement 1 lands
    "columns": [
      { "id": "planNo",   "accessorKey": "planNo",   "label": "Plan #",          "type": "text" },
      {
        "id": "planName",
        "accessorKey": "planName",                  // ← join target
        "label": "Plan name",
        "type": "text",
        "joinSource": "plans",                      // ← Enhancement 2
        "joinKey": "planNo",                        // ← Enhancement 2
        "joinField": "planName"                     // ← Enhancement 2
      },
      { "id": "amount", "accessorKey": "amount", "label": "Annual premium", "type": "currency", "currency": "INR", "align": "right" },
      { "id": "currency", "accessorKey": "currency", "label": "Currency", "type": "text" }
    ],
    "emptyState": { "title": "Pricing not yet computed", "description": "..." }
  }
}
```

`byPlanJson` is opaque per OpenAPI — implied shape `[{ planNo, amount, currency }]`. Verified against live data during VERIFY.

## API surface

No API change. Same `GET /api/quotation/quotes/{id}` already used everywhere.

## Components / files

### Modified

- `src/hooks/useDataTable.ts` — refactor `rawData` resolver to use new dataSource fields; pre-enrich rows with join lookups; expose a derived `dataError` for parse failures.
- `src/components/widgets/data/DataTable/index.tsx` — render `ErrorState` for the new `dataError` the same way it does for `queryError` (or combine into one `error` value).
- `src/components/widgets/data/DataTable/types.ts` — extend `ColumnConfig` with optional join fields.
- `src/types/widget.ts` — extend `DataSourceConfig` with optional `parseJson` + `dataPath`.
- `schemas/tabs/quote/pricing.json` — remove the now-obsolete `"data": []` fallback. The auto-discovery was bypassed by that empty array; once the resolver works, the schema should rely on `dataSource.dataPath + parseJson`.
- `context/ARCH_TRANSITION.md` — append a one-line cross-ref under the existing "OverlaidForm sourcePath" entry.

### Untouched

- `src/components/widgets/data/KeyValueGrid.tsx` — its field-level parseJson/subPath stays; no consolidation in this lane.
- `OverlaidForm.tsx` — same.
- The Pricing tab's `key-value-grid` (total + currency) and `action-bar` (request-price) widgets.

## Design preview — useDataTable resolver pipeline

```typescript
// New resolution pipeline (pseudo-code)
const sourceData = props?.data ?? fetchedData;
let parseError: Error | null = null;
let rows: TableRow[] = [];

if (dataSource?.dataPath) {
  let value = getNested(sourceData, dataSource.dataPath);
  if (dataSource.parseJson && typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (e) {
      parseError = new Error(`Failed to parse JSON at "${dataSource.dataPath}": ${e.message}`);
    }
  }
  if (parseError == null) {
    rows = Array.isArray(value) ? value : [];
  }
} else if (Array.isArray(sourceData)) {
  rows = sourceData;
} else if (sourceData && typeof sourceData === 'object') {
  const arr = Object.values(sourceData).find(Array.isArray);
  rows = arr ?? [];
}

// Join enrichment pass
const joinColumns = (columns ?? []).filter((c) => c.joinSource && c.joinKey && c.joinField);
if (joinColumns.length > 0 && sourceData && typeof sourceData === 'object') {
  rows = rows.map((row) => {
    const enriched: TableRow = { ...row };
    for (const col of joinColumns) {
      const siblings = getNested(sourceData, col.joinSource);
      if (!Array.isArray(siblings)) continue;
      const key = (row as Record<string, unknown>)[col.joinKey];
      const match = siblings.find((s) => (s as Record<string, unknown>)[col.joinKey] === key);
      if (match) enriched[col.accessorKey] = (match as Record<string, unknown>)[col.joinField];
    }
    return enriched;
  });
}
```

## Edge cases

1. **`dataPath` resolves to null/undefined.** Treated as empty array; existing empty-state renders. Not an error.
2. **`dataPath` resolves to a non-string non-array (e.g. an object).** No `parseJson` → treated as empty. With `parseJson` → no parse attempted (only strings get parsed); also empty.
3. **`parseJson === true` but value at `dataPath` is already an array.** Skip the parse; use the array directly. Lenient for callers that may receive shape variations from different backends.
4. **`joinSource` resolves to a non-array.** Skip the join silently; rows fall back to the original `accessorKey` value (or undefined).
5. **`joinKey` value is null/undefined on the row.** Skip the row (don't try to match null against the sibling list).
6. **Two columns target the same `accessorKey`.** Last one wins. Schema authors are expected to avoid this; not enforced.
7. **`props.data` is explicitly set (caller-provided rows).** Highest priority — skips both `dataPath` resolution and `parseJson`. The existing override path is preserved.

## Test plan

- Browser smoke: open a DRAFT quote that has a non-null `estimatedPremium.byPlanJson` (likely needs a price-request kick first; will surface via VERIFY).
- Confirm rows render with `planNo`, `planName` (joined from `plans[]`), `amount` (currency-formatted), `currency`.
- Negative case: hand-craft a quote response (via dev console fetch) with a malformed `byPlanJson` and confirm ErrorState renders.
- Unit tests deferred for batch speed; same call as PROP-0004/0005/0007.

## Verification gates

- `npx tsc --noEmit`
- `npx eslint` on touched files
- Live browser smoke against `https://group-pas-dev.anairacloud.com` via the local dev server. If no quote has a non-null pricing breakdown, mock locally via `window.fetch` interception OR confirm the empty state still renders (proving the absence path works).

## Commit plan (CORE_MEMORY split rule)

Two commits:
1. `feat(data-table): dataSource parseJson + dataPath + cross-array column join (PROP-0006)` — src + schemas only.
2. `docs(context): log PROP-0006 done + cross-ref data-table resolver into ARCH_TRANSITION` — proposal + SESSION_LOG + ARCH_TRANSITION cross-ref. paths-ignore.

## Approval

Adds:
- Two type-extension fields on `DataSourceConfig`.
- Three type-extension fields on `ColumnConfig`.
- One pre-processing pass in `useDataTable` (resolver + join).
- One ErrorState surface in `DataTable`.

~5 files modified, ~80-120 LOC change. Estimated time-to-VERIFY: ~1.5 hours.

**Awaiting explicit approval to enter BUILD.** Hard gate.
