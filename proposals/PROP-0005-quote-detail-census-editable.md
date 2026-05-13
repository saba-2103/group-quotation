---
id: PROP-0005
title: Make Census tab an editable aggregate breakdown table + file-format editor
status: approved
next_step: /execute-proposal PROP-0005
proposer: agent:claude
created: 2026-05-13
category: spec
impact: high
effort: m
evidence:
  - /Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md
  - schemas/tabs/quote/census.json
  - src/components/widgets/data/EditableTable.tsx
  - src/components/registry/WidgetRegistry.tsx
related:
  - PROP-0001
  - PROP-0004
  - PROP-0006
  - PROP-0007
  - PROP-0008
pr: null
---

## Problem

The Census tab at [schemas/tabs/quote/census.json](schemas/tabs/quote/census.json) shows only the total headcount and a censusFileFormat presence badge. The live API at `GET /api/quotation/quotes/{id}` returns `aggregateCensus.planBreakdown[{planNo, headcount}]` — per-plan headcount allocations — and the backend accepts edits via `PUT /api/quotation/quotes/{id}/aggregate-census` and `PUT /api/quotation/quotes/{id}/census-file-format`. None of that is wired to UI. The broker has no way to see or correct headcount allocations across plans from the quote detail page; they have to round-trip through a backend ticket.

Per the GTL Quotation Module spec, quote-level census is **aggregate only**. Per-member rows belong to the Proposal stage (W3) and are already covered by PROP-0001 — this proposal explicitly does not duplicate that work.

## Proposed change

Replace the body of [schemas/tabs/quote/census.json](schemas/tabs/quote/census.json) with two sections inside a `stack-layout`:

**Section 1 — Aggregate breakdown** (an `editable-table` widget):

- Columns: `Plan #`, `Plan name`, `Headcount`
- Rows derive from `plans[]` joined to `aggregateCensus.planBreakdown[]` by `planNo` (plan name from `plans[i].planName`); plans without a breakdown entry render with headcount 0
- `Headcount` column is `editable: true` with `inputType: 'number'` in DRAFT; read-only text otherwise
- Footer row: auto-summed `Total: N`
- `[Save changes]` button enabled only when dirty → `PUT /api/quotation/quotes/{id}/aggregate-census` with body `{ headcount: <auto-sum>, planBreakdown: [{planNo, headcount}, ...] }`
- Validation: each input ≥ 0, integer

**Section 2 — Census file format** (a `key-value-grid` + `[Edit file format]` action):

- Display: fileType (CSV / XLSX / none), sheetName (XLSX only), schemaJson (summary: N columns mapped, first 3 names), dialectJson (delimiter, encoding)
- `[Edit file format]` opens `schemas/forms/census-file-format-form.json` (new): `fileType` (select CSV/XLSX), `sheetName` (text, conditional on XLSX), `schemaJson` (json-textarea), `dialectJson` (json-textarea). Submit → `PUT /api/quotation/quotes/{id}/census-file-format`

States: loading (3 skeleton rows), empty ("No plans configured — add plans first" with link to Plans tab), non-DRAFT (inputs become read-only; Save and Edit-file-format hidden), dirty-on-tab-change (warn before discarding).

Widget plumbing: `editable-table` is already pre-registered in [src/components/registry/WidgetRegistry.tsx](src/components/registry/WidgetRegistry.tsx) pointing at a stub at [src/components/widgets/data/EditableTable.tsx](src/components/widgets/data/EditableTable.tsx). This proposal replaces the stub with the real implementation: mirror the `data-table` column API but support per-column `editable: true` + `inputType`; manage local row state; expose a `[Save]` action wired to a single PUT.

## Alternatives considered

- **Read-only table + single modal form for the whole aggregate** — rejected. Inline editing is the natural pattern for a small N (1-5 plans) and avoids modal context-switch friction.
- **Per-member rows** — out of scope. Quote DTO is aggregate-only; per-member belongs in PROP-0001 (proposal-stage census).
- **Defer the file-format editor** — rejected. The format is one of the few quote-stage edit surfaces the backend exposes and the broker needs it to fix sheet/dialect mismatches before re-upload.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation

**approve** — user pre-approved via the plan at `/Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md`. Pick up via `/build-feature PROP-0005` or `/execute-proposal PROP-0005`.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
