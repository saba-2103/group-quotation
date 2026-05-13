---
id: PROP-0004
title: Render Plans tab as card grid with products, benefits, formulas
status: approved
next_step: /execute-proposal PROP-0004
proposer: agent:claude
created: 2026-05-13
category: spec
impact: high
effort: m
evidence:
  - /Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md
  - schemas/tabs/quote/plans.json
  - src/components/widgets/data/CardGrid.tsx
  - src/components/registry/WidgetRegistry.tsx
related:
  - PROP-0002
  - PROP-0005
  - PROP-0006
  - PROP-0007
  - PROP-0008
pr: null
---

## Problem

The Plans tab at [schemas/tabs/quote/plans.json](schemas/tabs/quote/plans.json) is a `key-value-grid` that extracts a few flat lists (plan numbers, names, rate-card files) from `plans[]` on the `GET /api/quotation/quotes/{id}` response. The QuotePlanDto carries far more: `productsJson` (products → benefits → exclusions), `coverAmountFormulaJson` (formula type with factor / lookup / fixed / DMN reference), `freeCoverLimitFormulaJson`, `rateCardFile`. All of that is dropped on the floor. The broker cannot inspect plan composition from the UI today, and there is no Add/Edit/Delete affordance even though `POST/PUT/DELETE /api/quotation/quotes/{id}/plans` exists on the live backend at https://group-pas-dev.anairacloud.com.

## Proposed change

Replace the body of [schemas/tabs/quote/plans.json](schemas/tabs/quote/plans.json) with a `card-grid` widget that iterates `plans[]` and renders one card per plan, plus an `[+ Add plan]` action (DRAFT-only) and an empty state. Per-card content:

- Header: `Plan {{planNo}} · {{planName}}` with `[Edit]` `[Delete]` buttons (DRAFT, maker only)
- Products section (parsed from `productsJson`): each product's code/name/type, benefits as chips with mandatory star, exclusions as chips
- Cover formula (parsed from `coverAmountFormulaJson`): renders by `type` — `MULTIPLE_OF_MEMBER_ATTRIBUTE` (factor × attribute), `LOOKUP_ON_MEMBER_ATTRIBUTE`, `FIXED`, `DMN_TABLE`
- Free cover limit formula (same render shape, optional)
- Rate card file link

Interactions:
- `[+ Add plan]` → opens `schemas/forms/plan-edit-form.json` empty → `POST /api/quotation/quotes/{id}/plans`
- `[Edit]` → same form pre-filled via `open-modal` action's `rowData` → `PUT /api/quotation/quotes/{id}/plans/{planNo}`
- `[Delete]` → confirm dialog → `DELETE /api/quotation/quotes/{id}/plans/{planNo}`

States: loading (3 skeleton cards), empty ("No plans configured yet"), non-DRAFT (read-only — no Add/Edit/Delete), error (`error-banner` at top).

New form `schemas/forms/plan-edit-form.json`: `planNo` (number, disabled on edit), `planName` (text), `rateCardFile` (text — V1 manual entry until upload widget exists), `productsJson` (json-textarea), `coverAmountFormulaJson` (json-textarea), `freeCoverLimitFormulaJson` (json-textarea, optional). Structured product/benefit editor deferred to a future PROP-0009.

Widget plumbing: `card-grid` is already pre-registered in [src/components/registry/WidgetRegistry.tsx](src/components/registry/WidgetRegistry.tsx) pointing at a stub at [src/components/widgets/data/CardGrid.tsx](src/components/widgets/data/CardGrid.tsx). This proposal replaces the stub with the real implementation: props `dataSource`, `arrayPath`, `columns`, `cardSchema`; resolves the array, iterates, recursively renders `cardSchema` per item with `{{item}}` template binding.

If `open-modal` does not already pre-fill from `rowData` (uncertain per registry inventory), this proposal adds that plumbing — or, if the change is large, defers the per-card Edit affordance to a follow-up and ships read-only cards + Add only in V1.

## Alternatives considered

- **Static `grid-layout` with hard-coded child cards** — rejected. `grid-layout` only accepts static children; plans count varies per quote.
- **Reuse `data-table` for plans** — rejected. Nested products/benefits/exclusions and formula-typed unions don't fit a flat tabular row.
- **Defer until a structured product/benefit editor lands** — rejected. The read-side gap (broker cannot see plan composition) is the loudest pain; V1 ships the card view + raw-JSON edit for the write side, structured editor follows.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation

**approve** — user pre-approved via the plan at `/Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md`. Pick up via `/build-feature PROP-0004` or `/execute-proposal PROP-0004`.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
