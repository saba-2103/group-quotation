# Narrative coverage — 2026-05-14

Generated from `playwright-report/narrative-beats.jsonl` (17 beats recorded).

**Bottom line: 8/17 beats walkable, 8 gaps, 1 failures.**

Compare against [`docs/planning/DEMO_NARRATIVE_GTL_GCL.md`](../../docs/planning/DEMO_NARRATIVE_GTL_GCL.md).

## GTL

| Beat | Description | Outcome | Note |
|---|---|---|---|
| 1.1 | Sales reaches /quotation and sees New Quote | ✅ pass |  |
| 1.2 | Create GTL DRAFT quote via modal | ✅ pass | quoteId=b1563105-8051-4b57-9ec2-0590380e03d3 |
| 1.3 | 5 tabs present on quote detail | ✅ pass | tabs found: key-data, plans, census, member-mapping, pricing |
| 1.4 | Request Pricing returns a premium | ✅ pass |  |
| 1.5 | Submit and Send to Client | 🟡 gap | Submit click did not advance state — "Send to client" still: Not available in DRAFT |
| 1.6 | MPH accepts the quote | 🟡 gap | "Mark accepted" disabled: Not available in DRAFT (quote state likely not SENT_TO_CLIENT) |
| 1.7 | Quote.finalize creates a Proposal | ❌ fail | "Finalize" disabled: Not available in DRAFT |
| 3 | UW approve action reachable | 🟡 gap | detail route stripped UW actions (PROP-0010 gap) |
| 4 | Ops "Edit & re-classify" reachable | 🟡 gap |  |

## GCL

| Beat | Description | Outcome | Note |
|---|---|---|---|
| 1.1 | Sales reaches /quotation | ✅ pass |  |
| 1.2 | Create GCL DRAFT quote | ✅ pass | quoteId=3385e72c-63d0-4dda-95e9-bd74cdc2b3ea |
| 1.3 | 5 tabs render on GCL quote detail | ✅ pass | tabs found: key-data, plans, census, member-mapping, pricing |
| 1.4 | Request Pricing returns a premium | ✅ pass |  |
| 1.5 | Submit and Send to Client | 🟡 gap | Submit click did not advance state — "Send to client" still: Not available in DRAFT |
| 1.6 | MPH accepts the GCL quote | 🟡 gap | "Mark accepted" disabled: Not available in DRAFT (quote state likely not SENT_TO_CLIENT) |
| 1.7 | Quote.finalize creates a GCL Proposal | 🟡 gap | "Finalize" disabled: Not available in DRAFT |
| 2B.2 | Member confirm-enrolment reachable | 🟡 gap | "Confirm enrolment" not visible |

## Gap summary

- **GCL 1.5** — Submit and Send to Client: Submit click did not advance state — "Send to client" still: Not available in DRAFT
- **GCL 1.6** — MPH accepts the GCL quote: "Mark accepted" disabled: Not available in DRAFT (quote state likely not SENT_TO_CLIENT)
- **GCL 1.7** — Quote.finalize creates a GCL Proposal: "Finalize" disabled: Not available in DRAFT
- **GCL 2B.2** — Member confirm-enrolment reachable: "Confirm enrolment" not visible
- **GTL 1.5** — Submit and Send to Client: Submit click did not advance state — "Send to client" still: Not available in DRAFT
- **GTL 1.6** — MPH accepts the quote: "Mark accepted" disabled: Not available in DRAFT (quote state likely not SENT_TO_CLIENT)
- **GTL 1.7** — Quote.finalize creates a Proposal: "Finalize" disabled: Not available in DRAFT
- **GTL 3** — UW approve action reachable: detail route stripped UW actions (PROP-0010 gap)
- **GTL 4** — Ops "Edit & re-classify" reachable: (no note)
