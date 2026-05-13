---
id: PROP-0006
title: Show per-plan premium breakdown on Pricing tab
status: approved
next_step: /execute-proposal PROP-0006
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

## Proposed change

Extend `schemas/tabs/quote/pricing.json` with a `data-table` BELOW the existing total/currency `key-value-grid` (keep the existing widgets unchanged):

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

- Rows source: `estimatedPremium.byPlanJson` parsed via `parseJson: true`. Per the OpenAPI it is an opaque JSON string returned by `GET /api/quotation/quotes/{id}`. Implied shape from spec/blueprint: `[{ planNo, amount }]`.
- Plan name comes from joining `plans[]` (same response) by `planNo`.
- Currency column: uses the existing DataTable `type: "currency"` cell renderer (cf. `schemas/tabs/proposal/members.json` — `annualPremiumAmount` column with `type: "currency", "currency": "INR"`).
- Empty state (no `estimatedPremium`): inline message "Pricing not yet computed. Press Request price to invoke the Rule Engine." Keeps the existing note about the engine not being wired on backend.
- Non-DRAFT: rendered the same minus the Request-price button (handled by the existing action-bar `stateActions` gating; this proposal does not change action-bar wiring).

## Alternatives considered

- **A `key-value-grid` list of plan-name=amount pairs** — rejected. Works for 2-3 plans but loses tabular alignment, has no built-in currency formatter, and degrades sharply past three rows. The breakdown is inherently tabular (planNo / name / amount / currency); use the right primitive.
- **A new custom widget for the breakdown** — rejected. `data-table` already covers the shape; introducing a new widget for one tab violates the parsimony principle and is out-of-scope for this lane.
- **Do nothing, leave the total-only view** — rejected. Multi-plan quotes are the dominant case; broker cannot reconcile the total against the plan structure without the breakdown.

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

Schema authored at `schemas/tabs/quote/pricing.json`. The `data-table` widget today has two gaps that block the spec from rendering live data:

1. **No `parseJson` support on `dataSource`.** `useDataTable` (`src/hooks/useDataTable.ts`) consumes either an array directly or auto-discovers the first array-typed value on the response object via `Object.values(...).find(Array.isArray)`. `estimatedPremium.byPlanJson` is a **string**, so without `parseJson` the table cannot parse it; worse, the auto-discovery would pick up the unrelated `plans[]` array from the same response and render wrong rows. The schema declares `dataSource.dataPath: "estimatedPremium.byPlanJson"` + `parseJson: true` to record the intent, plus `props.data: []` so the widget reliably falls through to the empty state until the widget is enhanced. The empty-state copy is honest about why no rows show.

2. **No cross-array join.** The widget cannot join parsed `byPlanJson` rows with `plans[]` on `planNo` to fill `planName`. The schema declares the `planName` column so the spec is captured; until widget support lands the column renders blank. Spec calls out the documented fallback ("show only planNo and amount") — that is the live behaviour once gap 1 is closed even without join support.

Follow-ups (file as separate proposals if not already open):
- Add `parseJson` + `dataPath` support to `data-table` `dataSource` (mirroring the `key-value-grid` pattern at `src/components/widgets/data/KeyValueGrid`).
- Add a column-level `joinSource` / `joinKey` primitive to `data-table` columns, scoped to joining against arrays on the same response payload.

Action-bar wiring untouched; PROP-0006 only adds the breakdown widget.
