---
id: PROP-0007
title: Show full Member-to-Plan DMN mapping with blob-replace flow
status: approved
next_step: /execute-proposal PROP-0007
proposer: agent:claude
created: 2026-05-13
category: spec
impact: medium
effort: s
evidence:
  - /Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md
  - schemas/tabs/quote/member-mapping.json
  - src/components/widgets/forms/formContainer/FieldRenderer.tsx
related:
  - PROP-0004
  - PROP-0005
  - PROP-0006
  - PROP-0008
pr: null
---

## Problem

The Member-to-Plan Mapping tab at [schemas/tabs/quote/member-mapping.json](schemas/tabs/quote/member-mapping.json) extracts a few lists (hit policy, rule count, condition strings, target plan strings) from `memberToPlanMappingJson`. The user sees disconnected lists, not the rule table — they cannot read off "which condition routes to which plan" without mental zipping. The backend accepts a full replace via `PUT /api/quotation/quotes/{id}/member-to-plan-mapping` body `{ mapping: "<stringified JSON>" }`, but the UI provides no entry point.

Per the GTL Quotation spec §5: "DMN authoring out of scope; replace flow deferred to D3." This proposal ships only the blob-replace flow, not a structured rule editor (the latter can land as a future PROP-0010 once a multi-row repeater widget exists).

## Proposed change

Rewrite [schemas/tabs/quote/member-mapping.json](schemas/tabs/quote/member-mapping.json) into a `stack-layout`:

**Section 1 — Header block** (`key-value-grid`, existing primitive):

- `Hit policy:` from `memberToPlanMappingJson.hits`
- `Rules:` count from `memberToPlanMappingJson.rules`

**Section 2 — Rules table** (`data-table`):

- Columns: `#` (row number), `Condition (if)` (monospace), `Target plan (then)`
- Rows derive from `memberToPlanMappingJson.rules[]` parsed via `parseJson: true`. Joined `if` clauses render verbatim.

**Section 3 — Replace action** (DRAFT, checker only):

- `[Replace mapping]` opens `schemas/forms/member-mapping-replace-form.json` (new), single `json-textarea` field `mapping` pre-filled with the current DMN JSON
- Submit → `PUT /api/quotation/quotes/{id}/member-to-plan-mapping` body `{ mapping: "<stringified JSON>" }`

States: loading (skeleton table), empty (no rules — "No mapping configured. The pricing engine cannot route members until a mapping is set." + Replace button), non-DRAFT or non-checker (hide Replace).

New form-field type `json-textarea`: thin wrapper around the existing `textarea` field at [src/components/widgets/forms/formContainer/FieldRenderer.tsx](src/components/widgets/forms/formContainer/FieldRenderer.tsx). Monospace font, on-submit `JSON.parse` validation that rejects invalid JSON with an inline error. Register the new field type in `FieldRenderer.tsx`; add type definition to `types.ts` in the same folder if needed.

## Alternatives considered

- **Structured rule editor** — out of scope per spec §5. File as PROP-0010 once multi-row form repeater exists.
- **Read-only table without Replace** — rejected. Replace is the only quote-stage write the backend exposes for mapping; without it brokers cannot fix bad DMN refs.
- **Use a plain `textarea` field** — viable but doesn't validate JSON before PUT; a one-line wrapper that adds parse validation is small and pays for itself by catching typos at the form layer.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation

**approve** — user pre-approved via the plan at `/Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md`. Pick up via `/build-feature PROP-0007` or `/execute-proposal PROP-0007`.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
