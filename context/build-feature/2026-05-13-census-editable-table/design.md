# Design — PROP-0005: Census tab editable aggregate breakdown + file-format editor

run-id: 2026-05-13-census-editable-table
proposal: [proposals/PROP-0005-quote-detail-census-editable.md](../../../proposals/PROP-0005-quote-detail-census-editable.md)

## Goal

Replace the Census tab's metadata-only view with two surfaces:
1. **Aggregate breakdown** — an editable table joining `plans[]` with `aggregateCensus.planBreakdown[]`, one numeric input per plan, total auto-summed, single Save commits the whole AggregateCensus via PUT.
2. **Census file format** — read-only display of fileType / sheetName / schema / dialect, with an Edit modal that PUTs the whole CensusFileFormat.

## In scope

1. **`editable-table` widget** — bespoke for the aggregate-census join shape. Registered (stub already present); this run replaces the stub.
2. **Census tab schema rewrite** — `stack-layout` with the table + file-format display sections.
3. **`json-textarea` field type** — small additive entry in `FieldRenderer.tsx`. Monospace `<Textarea>`.
4. **`json` validation rule** — small additive entry in `utils.ts` (`VALIDATION_APPLIERS`). Wraps `z.string()` with `.refine(JSON.parse)`.
5. **`census-file-format-form.json`** — FormContainer form with `fileType` (select), `sheetName` (text), `schemaJson` (json-textarea + json validation), `dialectJson` (json-textarea + json validation). Submits `PUT /api/quotation/quotes/:id/census-file-format`.

## Out of scope

- **Per-member census rows** at the quote stage — Quote DTO carries only aggregate; PROP-0001 covers proposal-stage bulk member upload.
- **Multi-column inline editing** — V1 edits a single numeric per row. Future widening (e.g. edit multiple columns at once) is a follow-up.
- **CSV / XLSX re-upload** — file refs use the upload-url endpoint, which isn't deployed (see CORE_MEMORY interim assumption #9). V1 just edits the format metadata.
- **A generic discriminated-union sub-form helper** — `fileType: CSV` vs `XLSX` triggers `sheetName` show/hide, which the existing scalar `visibleWhen` covers — no new helper needed.

## Architecture Transition Note

`EditableTable` is deliberately narrow ("join-shaped numeric edit"). It does NOT generalize `DataTable`'s read-side machinery, and it doesn't try to be a generic inline-editing engine. Two reasons:

1. **`DataTable` is wide** — paginate, sort, filter, export, bulk actions, row actions, frozen columns. Adding editability touches all of them and increases blast radius on the most-used widget in the repo. Out of scope for this lane.
2. **Aggregate-census is a narrow shape** — N rows (~3–6 plans), one numeric per row, single PUT body. The widget's contract matches that shape precisely.

**Future architecture (target):**
When a second use case for "edit one numeric per row of a join" emerges (or any need for inline-editable DataTable cells appears), one of two things happens:
- The same pattern lands inside `DataTable` (`column.editable: true`, table-level `saveAction`, body-builder). `EditableTable` becomes a thin facade or retires.
- A small `editable-cell` cell-renderer extension to `DataTable` is sufficient for the simple cases.

**Convergence trigger:** any second consumer of cell-level editing in the repo. Logged to `context/ARCH_TRANSITION.md` as part of BUILD.

## Data shapes (DSL canon — `docs/spec/common/CommonData.data`)

```
AggregateCensus { headcount: int, planBreakdown: list<PlanHeadcount> }
PlanHeadcount   { planNo: string, headcount: int }
CensusFileFormat {
  fileType: CensusFileType    // CSV | XLSX
  sheetName?: string
  schemaJson: string          // JSON-stringified column schema
  dialectJson?: string        // JSON-stringified dialect (delimiter, encoding, etc.)
}
```

On the wire: `aggregateCensus` is either absent (no planBreakdown set yet — verified live: quote `170ea9b1…` returns no `aggregateCensus` field) or a populated object. `censusFileFormatJson` is a stringified JSON of the whole CensusFileFormat. PlanCard's parse-on-render pattern reused here.

## API surface (already proxied)

- `GET /api/quotation/quotes/{id}` — drives both sections; aggregateCensus + censusFileFormatJson read here
- `PUT /api/quotation/quotes/{id}/aggregate-census` — body `{ headcount, planBreakdown: [{planNo, headcount}] }`
- `PUT /api/quotation/quotes/{id}/census-file-format` — body `{ fileType, sheetName?, schemaJson, dialectJson? }`

Both require `isDraft`. Server rejects with `QUO_PRE_001` if quote isn't DRAFT; toast surfaces it (existing useActionHandler error path).

## Components / files

### New

- `src/components/widgets/data/EditableTable.tsx` — bespoke join-shaped editable widget. Replaces the stub.
- `schemas/forms/census-file-format-form.json` — file-format edit form (FormContainer + json-textarea).

### Modified

- `schemas/tabs/quote/census.json` — rewrite into two sections.
- `src/components/widgets/forms/formContainer/FieldRenderer.tsx` — add `json-textarea` field type.
- `src/components/widgets/forms/formContainer/utils.ts` — add `json` rule to `VALIDATION_APPLIERS`.
- `context/ARCH_TRANSITION.md` — append EditableTable transition note.

### Untouched (no widening)

- `DataTable` and its hooks — keep DataTable focused on read-side concerns.
- `FormContainer` core types — `FormFieldValue` stays scalar; `json-textarea` value is a string, no recursive shape change needed.

## Design Preview — Census tab composition

```
[Aggregate census]                                  [Save changes] (DRAFT+maker+dirty)
─────────────────────────────────────────────────────────────────────────────
Plan #   Plan name              Headcount
─────────────────────────────────────────────────────────────────────────────
P01      Executive plan          [   42  ]   (numeric input, DRAFT)
P02      Standard plan           [  156  ]
P03      Probation plan          [    8  ]
─────────────────────────────────────────────────────────────────────────────
                            Total: 206  (auto-sum, derived)
─────────────────────────────────────────────────────────────────────────────

[Census file format]                                [Edit file format] (DRAFT+maker)
─────────────────────────────────────────────────────────────────────────────
File type:        CSV
Sheet name:       (n/a)
Schema:           8 columns mapped (memberId, name, planNo, …)
Dialect:          delimiter=",", hasHeader=true
─────────────────────────────────────────────────────────────────────────────
```

**States**
- Loading: skeleton 3-row table.
- Empty plans: hide the table, show "No plans configured — add plans on the Plans tab first" with a link to that tab.
- Non-DRAFT: inputs become read-only text; Save and Edit-file-format hidden.
- Dirty + tab change: simple browser-level `beforeunload` is unnecessary at this scope; V1 doesn't warn on tab switch (Tabs are intra-page; Save is one click away).

## Design Preview — Edit file format modal

```
┌─ Edit census file format ─────────────────────── [×] ─┐
│ File type           [ CSV  ▼]                          │
│ Sheet name          [                ]  (XLSX only)    │
│ Schema (JSON)       [ {"columns":[...]}              ] │
│                     [                                 ] │
│ Dialect (JSON)      [ {"delimiter":",", ...}         ] │
│                     [                                 ] │
│                                                        │
│                              [Cancel]  [Save format]   │
└────────────────────────────────────────────────────────┘
```

- `fileType` is a select (`CSV` / `XLSX`).
- `sheetName` is shown only when `fileType === 'XLSX'` (existing `visibleWhen` primitive).
- `schemaJson` and `dialectJson` use the new `json-textarea` field type with the `json` validation rule. Invalid JSON blocks submit with a per-field error.

## Edge cases

1. **`aggregateCensus` is null / absent.** Widget renders the table with `headcount: 0` per plan. Save sends a fully-populated AggregateCensus on first commit.
2. **Plan deleted between page load and Save.** The PUT replaces the whole AggregateCensus; missing planNos drop their entries. UI builds rows from the latest `plans[]` snapshot.
3. **Negative or non-integer input.** Input is `type="number"` with `step="1"` and `min="0"`. Save button validates each row is a non-negative integer; rejects with field-level red border.
4. **Empty plans array.** Empty-state message; Save hidden.
5. **`censusFileFormatJson` is a string with deeply-nested JSON (live: `schemaJson` is itself stringified inside).** Display renders parsed `fileType` and counts columns from `schemaJson` after parsing twice; edit form receives the outer parsed object with `schemaJson` left as the inner string (so the user edits raw JSON, not a re-stringified blob). Submit sends the user's input back as-is.
6. **Server returns 412 on stale state.** Toast surfaces the message; user reloads page (next refresh-key invalidation does this).

## Test plan

Unit (Jest):
- `EditableTable` — renders rows from join of two arrays; defaults missing values to 0; dirty-detection flips Save enabled; submit builds canonical body; integer-min validation.
- `json` validation rule — `.refine` passes on valid JSON, fails on garbage.
- `json-textarea` field type — renders as `<Textarea>` with `font-mono`.

Interaction (browser smoke):
- Open a DRAFT quote, navigate to Census tab.
- Edit headcount on the first plan, verify total auto-sums, Save enabled.
- Click Save → toast → refetched response reflects the new value.
- Open Edit file format modal → invalid JSON in schemaJson blocks submit → fix → submit succeeds → toast → modal closes.

## Verification gates

- `npx tsc --noEmit`
- `npx eslint` on touched files
- Browser smoke against `https://group-pas-dev.anairacloud.com` via local dev proxy.

## Commit plan (CORE_MEMORY split rule)

Two commits:
1. `feat(quote-detail): census tab editable aggregate breakdown + file-format editor (PROP-0005)` — `src/**` + `schemas/**` only.
2. `docs(context): log PROP-0005 done + editable-table arch transition note` — `context/**`, `proposals/PROP-0005…md`, `agent_logs/**`. All paths-ignore.

## Approval needed

Adds:
- One bespoke widget (`editable-table`) — narrow contract, ARCH_TRANSITION note for convergence.
- One field type + one validation rule (`json-textarea`, `json`) — small additive form-system extension.
- One new form schema + one rewritten tab schema.

~6 files touched. Estimated time-to-VERIFY: ~3-4 hours.

**Awaiting explicit approval to enter BUILD.** Hard gate.
