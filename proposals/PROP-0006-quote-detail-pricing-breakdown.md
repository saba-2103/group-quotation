---
id: PROP-0006
title: Show per-plan premium breakdown on Pricing tab
status: done
next_step: null
pr: null
proposer: agent:claude
created: 2026-05-13
category: spec
impact: medium
effort: s
evidence:
  - /Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md
  - schemas/tabs/quote/pricing.json
  - docs/openapi/quotation.yaml (GET /api/quotation/quotes/{id} -> estimatedPremium.byPlanJson)
related:
  - PROP-0004
  - PROP-0005
  - PROP-0007
  - PROP-0008
pr: null
---

## Problem

The Pricing tab on the quote detail page (`schemas/tabs/quote/pricing.json`) shows only the total annual premium and currency via a `key-value-grid` against `estimatedPremium.totalAmount` / `estimatedPremium.currency`. The same `GET /api/quotation/quotes/{id}` response carries `estimatedPremium.byPlanJson` — an opaque JSON string with the per-plan breakdown (implied shape `[{ planNo, amount }]` per the blueprint and OpenAPI spec). Today the per-plan amounts are dropped on the floor: the user sees a single aggregate number with no way to verify it against the plan structure on the Plans tab. For a multi-plan quote (the common shape — Executive / Standard / Probation), the broker has no schema-driven way to see how the engine apportioned premium across plans.

**Status update 2026-05-13:** the **schema** for the per-plan breakdown landed in commit `c11efb8` (declares `dataSource.parseJson: true`, `dataSource.dataPath: "estimatedPremium.byPlanJson"`, and a 4-column `data-table` joining `planNo` with `planName` / `amount` / `currency`), but the **`data-table` widget** does not yet support either of those two primitives. Today the schema is forward-declared and the widget falls through to its empty state. This proposal's remaining work is the two widget enhancements that make the declared schema actually render.

## Proposed change

The Pricing tab schema (visual layout) already landed; the remaining work is two `data-table` widget enhancements that mirror primitives already in `key-value-grid`:

### Enhancement 1 — `dataSource.parseJson` + `dataSource.dataPath` on `data-table`

`useDataTable` in `src/hooks/useDataTable.ts` calls `useSmartQuery(dataSource)` and consumes the response as-is. Add the same pre-processing chain `key-value-grid` already has at the field-level (`src/components/widgets/data/KeyValueGrid.tsx:42-63`), lifted to the dataSource-level:

- `dataSource.parseJson?: boolean` — if true and the response is a string, `JSON.parse` it before downstream consumption.
- `dataSource.dataPath?: string` — dotted path to drill into the (possibly parsed) response to find the rows array. Default behavior unchanged (`Object.values(...).find(Array.isArray)`).
- When `dataPath` points to a string field, the pipe order is `getNested → parseJson → use as rows`.

This is conceptually the same lift PROP-0005 did from `KeyValueGrid` → `OverlaidForm` (`sourcePath + sourceParseJson + sourceSubPath`). Future architecture note: when the schema-engine extraction PR #57 lands, consolidate all three (KeyValueGrid, OverlaidForm, data-table) onto a shared `resolveAccessor` utility.

### Enhancement 2 — cross-array join on `data-table` columns

Adds an opt-in column-level join primitive so a column can read its value from a sibling array on the same response, keyed by another column's value:

```jsonc
{
  "id": "planName",
  "label": "Plan name",
  "type": "text",
  "joinSource": "plans",   // sibling array path on the response
  "joinKey": "planNo",     // row's column whose value matches `joinKey` on each sibling
  "joinField": "planName"  // field to pull from the matched sibling row
}
```

Scoped tight: only joins against arrays present on the SAME response payload that `useDataTable` already fetched. No second network call, no recursive joins. When `joinSource`/`joinKey`/`joinField` are all absent, column behavior is unchanged.

### Final per-plan render

```
Pricing                                               [Request price] (DRAFT, maker)
--------------------------------------------------------------------------------
Annual premium (total): INR 482,000      Currency: INR
--------------------------------------------------------------------------------
Per-plan breakdown
--------------------------------------------------------------------------------
Plan #   Plan name             Annual premium    Currency
--------------------------------------------------------------------------------
P01      Executive plan        INR 220,000       INR
P02      Standard plan         INR 250,000       INR
P03      Probation plan        INR 12,000        INR
```

- Rows source: `estimatedPremium.byPlanJson` resolved via `dataSource.dataPath + dataSource.parseJson` (Enhancement 1).
- Plan name: joined via `joinSource: "plans" / joinKey: "planNo" / joinField: "planName"` (Enhancement 2).
- Currency column: existing DataTable `type: "currency"` cell renderer.
- Empty state (no `estimatedPremium`): existing schema-declared empty-state copy.
- Non-DRAFT: existing `action-bar` `stateActions` gating handles the Request-price button visibility.

## Alternatives considered

- **A `key-value-grid` list of plan-name=amount pairs** — rejected. Works for 2-3 plans but loses tabular alignment, has no built-in currency formatter, and degrades sharply past three rows. The breakdown is inherently tabular (planNo / name / amount / currency); use the right primitive.
- **A new custom widget for the breakdown** — rejected. `data-table` already covers the shape; the two missing primitives are small enough to lift into `data-table` rather than fork another widget.
- **Do nothing, leave the total-only view** — rejected. Multi-plan quotes are the dominant case; broker cannot reconcile the total against the plan structure without the breakdown.
- **Bespoke widget like PROP-0004's `plan-form` / PROP-0007's `dmn-decision-table`** — rejected. The aggregate-census case (PROP-0005's `EditableTable`) and the DMN case (PROP-0007) went bespoke because their underlying shapes don't compose into existing primitives. The pricing breakdown IS just rows of a flat array — `data-table` is the right primitive, the two missing pieces are small generic lifts, and they help every other consumer that currently parses stringified JSON or joins sibling arrays.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation

**approve** — user pre-approved via the plan at `/Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md`. Pick up via `/execute-proposal PROP-0006`. The widget-side enhancements called out in Implementation notes below should be filed as separate proposals if not already covered by an open ticket.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes

Built via `/build-feature PROP-0006` on 2026-05-13 in two passes:

**Pass 1 — schema (`c11efb8`, 2026-05-13 morning):** authored `schemas/tabs/quote/pricing.json` with the per-plan breakdown declared but documented as forward-declared (the two widget gaps below kept it falling through to empty state).

**Pass 2 — widget enhancements (`9e37194`):** lifted KeyValueGrid's parse/drill pattern up to the data-table dataSource layer and added a cross-array column join. Run-id `2026-05-13-datatable-parsejson-join`.

Files modified in Pass 2:
- `src/types/widget.ts` — added optional `parseJson?: boolean` and `dataPath?: string` on `DataSourceConfig`.
- `src/components/widgets/data/DataTable/types.ts` — added optional `joinSource`, `joinKey`, `joinField` on `ColumnConfig`.
- `src/hooks/useDataTable.ts` — new resolver pipeline: drill `dataPath` → optionally `JSON.parse` if `parseJson` → fall back to existing auto-discovery if neither set → enrich rows with cross-array joins. Returns `dataError` on parse failure.
- `src/components/widgets/data/DataTable/index.tsx` — surface `dataError` via existing ErrorState path; merge `config.dataSource` into the props it hands `useDataTable` (WidgetRenderer flattens props but not dataSource); add `cellValue` helper for dotted accessorKey.
- `schemas/tabs/quote/pricing.json` — drop stale `"data": []`; switch to dotted `amount.amount` / `amount.currency` accessors to match the DSL Money shape; wire the `planName` column's join.

CLARIFY decisions:
1. parseJson failure mode: **throw** — surface as ErrorState (loud).
2. Join miss: **leave cell empty / dash** (existing renderer behavior).

Bugs caught during VERIFY:
- `useDataTable` reads `dataSource` from `props`, but WidgetRenderer puts it on `config.dataSource`, not `config.props.dataSource`. Fixed at the DataTable call site.
- TanStack table doesn't auto-nest dotted `accessorKey`. Added `accessorFn` in the columnDef builder AND a `cellValue` helper for the explicit row lookups; both code paths now share dot-notation semantics.

Architecture transition: see `context/ARCH_TRANSITION.md` "OverlaidForm sourcePath" entry — the same convergence trigger (a shared `resolveAccessor` utility as part of the Layer 1 runtime / PR #57) covers this lift. Cross-ref appended.

Verified live against `https://group-pas-dev.anairacloud.com`: per-plan rows render `P1 / Standard Cover / ₹24,192,000 / INR` and `P2 / Enhanced Cover / ₹134,784,000 / INR`; total `158,976,000` matches the sum.

Logs: `agent_logs/build-feature/2026-05-13-datatable-parsejson-join/{discover,clarify,verify}.log` + design at `context/build-feature/2026-05-13-datatable-parsejson-join/design.md`.
