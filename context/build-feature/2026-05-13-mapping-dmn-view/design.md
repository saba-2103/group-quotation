# Design — PROP-0007: Member-to-Plan DMN view + blob-replace

run-id: 2026-05-13-mapping-dmn-view
proposal: [proposals/PROP-0007-quote-detail-mapping-view.md](../../../proposals/PROP-0007-quote-detail-mapping-view.md)

## Goal

Surface the parsed DMN decision table on the Member-to-Plan Mapping tab as a real header + rules table (today's schema shows disconnected lists that don't even render against the live shape). Add a single Replace-mapping affordance that PUTs the whole DMN JSON blob — no rule editor.

## In scope

1. **`dmn-decision-table` widget** — bespoke read-only renderer for a DMN decision table. Parses `memberToPlanMappingJson`, drills `decisionTable.*`, renders:
   - Header: hit policy + rules count + inputs / outputs chips.
   - Rules table: one row per rule; columns = inputs (rendered as `when[input.id]`) + outputs (rendered as `then[output.id]`). Dynamic column set.
2. **Census-tab Mapping tab schema rewrite** — `stack-layout`: `dmn-decision-table` + `action-bar` with a single Replace action.
3. **Replace flow** — `schemas/forms/member-mapping-replace-form.json`. Single `json-textarea` field `mapping`, pre-filled from `memberToPlanMappingJson` (the raw string — user edits the stringified JSON directly). Submits `PUT /quotation/quotes/{id}/member-to-plan-mapping` with `{ mapping: <user-string> }`. `json` validation rule rejects malformed JSON on submit.
4. **Role gating**: DRAFT state + checker role for the Replace action, per CLARIFY answer.

## Out of scope

- **Structured DMN rule editor** — spec §5 defers ("DMN authoring out of scope; replace flow deferred to D3"). PROP-0010 (not filed yet) could revisit when a multi-row repeater widget exists.
- **Per-rule edit / add-row / delete-row affordances** — replace-only.
- **DMN file upload via `/quotation/files/upload-url`** — backend's presigned URL endpoints aren't deployed (CORE_MEMORY interim assumption #9). Defer until they ship.

## Architecture transition

`dmn-decision-table` is bespoke for the DMN shape returned by group-pas. Two reasons it's not a generic widget:

1. **DMN-specific structure** — `inputs[]` + `outputs[]` + `rules[]` with `when` and `then` keyed by id. Not a generic "render N rows × M columns".
2. **Read-only view, no editing** — pairs with the modal-driven blob-replace, not an inline editor.

**Convergence path:** when (if) the structured DMN editor lands (PROP-0010+), `dmn-decision-table` extends to support `editable` mode with add-row / remove-row affordances, OR the editor lives in a separate widget that takes over the same tab. ARCH_TRANSITION entry tracks the contract.

## Data shape (live, via group-pas-dev)

```json
// On the wire: memberToPlanMappingJson is a STRINGIFIED JSON.
{
  "decisionTable": {
    "hitPolicy": "FIRST",
    "inputs":  [{"id": "salary", "label": "Annual Salary", "typeRef": "number"}],
    "outputs": [{"id": "planNo", "label": "Plan",          "typeRef": "string"}],
    "rules": [
      {"when": {"salary": ">= 2000000"}, "then": {"planNo": "P2"}},
      {"when": {"salary": "< 2000000"},  "then": {"planNo": "P1"}}
    ]
  }
}
```

The proposal text said `hits` and top-level `rules`; design follows the live shape (DSL says it's opaque, so the live data is authoritative).

## API surface (already proxied)

- `GET /api/quotation/quotes/{id}` → `memberToPlanMappingJson: string`
- `PUT /api/quotation/quotes/{id}/member-to-plan-mapping` body `{ mapping: string }`

`isDraft + hasCensusFileFormat` precondition; backend toast on violation.

## Components / files

### New

- `src/components/widgets/data/DmnDecisionTable.tsx` — bespoke DMN view widget.
- `schemas/forms/member-mapping-replace-form.json` — single-field form for the blob replace.

### Modified

- `schemas/tabs/quote/member-mapping.json` — rewrite.
- `src/components/registry/WidgetRegistry.tsx` — register `dmn-decision-table`.
- `context/ARCH_TRANSITION.md` — append entry.

### Touched in passing

- `proposals/PROP-0007-quote-detail-mapping-view.md` — status `in-progress` → `done`, implementation notes appended.

## Design preview — Mapping tab composition

```
┌─ Member-to-Plan mapping ──────────────────────────────────┐
│ Hit policy   FIRST                                        │
│ Rules        2                                            │
│ Inputs       [salary · Annual Salary · number]            │
│ Outputs      [planNo · Plan · string]                     │
├───────────────────────────────────────────────────────────┤
│ #   salary             planNo                             │
│ 1   >= 2000000         P2                                 │
│ 2   < 2000000          P1                                 │
├───────────────────────────────────────────────────────────┤
│                                  [Replace mapping]        │
│                                  (DRAFT, checker)         │
└───────────────────────────────────────────────────────────┘
```

Empty / malformed: empty-state card. "No mapping configured. The pricing engine cannot route members until a mapping is set." + Replace button (when role allows).

## Design preview — Replace modal

```
┌─ Replace member-to-plan mapping ─────────────── [×] ─┐
│                                                       │
│ DMN JSON (full blob — replaces whole decisionTable)   │
│ ┌─────────────────────────────────────────────────┐   │
│ │ {                                               │   │
│ │   "decisionTable": {                            │   │
│ │     "hitPolicy": "FIRST",                       │   │
│ │     "inputs":  [...],                           │   │
│ │     "outputs": [...],                           │   │
│ │     "rules":   [...]                            │   │
│ │   }                                             │   │
│ │ }                                               │   │
│ └─────────────────────────────────────────────────┘   │
│ (helper) JSON must parse. The whole blob is replaced. │
│                                                       │
│                                 [Cancel]  [Replace]   │
└───────────────────────────────────────────────────────┘
```

Single `json-textarea` field. `json` validation rule blocks submit on malformed input. `required` so an empty submit is rejected.

## Edge cases

1. `memberToPlanMappingJson` is null / empty → empty-state card with Replace button (when role allows).
2. Stringified blob fails JSON.parse on the read side → empty-state with a "Could not parse current mapping" message; Replace button still works.
3. `decisionTable.rules` empty → header renders; rules table replaced by "No rules" message.
4. New DMN has different inputs/outputs than the old one → next page render rebuilds columns from the new inputs/outputs.
5. Submit on non-DRAFT → backend rejects with 412; existing useActionHandler toast surfaces the message.

## Test plan

- Browser smoke: open DRAFT quote → Mapping tab renders the DMN shape live; Replace modal opens with the stringified JSON pre-filled; tamper with JSON → submit blocked; valid edit → submit succeeds → tab re-renders new rules.
- Unit tests deferred for batch speed; same call as PROP-0004/0005.

## Verification gates

- `npx tsc --noEmit`
- `npx eslint` on touched files
- Live browser smoke via the running dev server.

## Commit plan

1. `feat(quote-detail): member-to-plan DMN view + blob-replace (PROP-0007)` — src + schemas only.
2. `docs(context): log PROP-0007 done` — context + proposal status. All paths-ignore.

## Approval

Adds:
- One bespoke widget (`dmn-decision-table`) — read-only, dynamic columns.
- One form schema, one tab schema rewrite.
- One ARCH_TRANSITION entry.

~4 files touched. Estimated time-to-VERIFY: ~1.5 hours.

**Awaiting explicit approval to enter BUILD.** Hard gate.
