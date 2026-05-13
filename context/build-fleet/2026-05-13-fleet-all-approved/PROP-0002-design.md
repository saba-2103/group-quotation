---
proposal: PROP-0002
run_id: 2026-05-13-fleet-all-approved
goal: Close the audited gap on Member-Quote (GCL) UI — export the missing wrapper so the set-premium modal works end-to-end, and add `policyId` + `status` filter chips to the list page.
golden_path: Navigate to `/quotation/member-quotes` → confirm new `policyId` and `status` filter chips render and filter the list → open a DRAFT MemberQuote on the detail page → click "Set premium" → submit modal → wrapper call succeeds → membar-quote refreshes with the new premium → click "Submit" → state goes SUBMITTED → click "Finalize" → state goes FINALIZED.
golden_path_route: /quotation/member-quotes
files_touched:
  - src/lib/api/quotation.ts                                                  # add `updateMemberPremium` to the export block (function is defined at lines 176–179 but not exported)
  - schemas/member-quote.json                                                 # add policyId + status filter chips to the filter-bar block; backend supports both per findMemberQuotes
out_of_scope:
  - Any new pages
  - Wider audit of existing schemas
  - Member-quote fixtures (already seeded at src/mocks/group-pas/quotation/member-quotes.ts)
  - Mock-mode work
---

# PROP-0002 — Member-Quote (GCL) audit closure

## Audit findings (CLARIFY skipped; baked in)

Survey during plan phase confirmed:
- Pages, schemas, forms, mock routes, fixtures, and nav menu entry **all exist and work**.
- The only concrete gap: [src/lib/api/quotation.ts:176–179](src/lib/api/quotation.ts) defines `updateMemberPremium` but the file does not export it. The set-premium modal therefore can't call through the typed wrapper.
- `schemas/member-quote.json` filter block: verify presence of `policyId` and `status` chips; add if missing. Backend's `findMemberQuotes` accepts both per [docs/spec/quotation/MemberQuoteWorkflow.workflow](docs/spec/quotation/MemberQuoteWorkflow.workflow).

## Decisions

1. Add the export. If the function signature uses internal types not currently re-exported, mirror neighboring wrappers' style.
2. Add the filter chips inline in the existing filter-bar; no new widget.
3. No new tests required — existing test surface covers the wrappers.
