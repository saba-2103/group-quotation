---
id: PROP-0010
title: MPH portal — Master Policyholder workbench for proposal acceptance
status: draft
proposer: agent:claude
created: 2026-05-13
category: architecture
impact: high
effort: m
evidence:
  - /Users/seriousblack/.claude/plans/read-docs-planning-demo-narrative-gtl-gc-cosmic-dove.md
  - docs/planning/DEMO_NARRATIVE_GTL_GCL.md
  - src/mocks/original/group-insurance/config/app-config-mock.ts
  - src/app/api/config/app/route.ts:12
related: [PROP-0009, PROP-0011, PROP-0012, PROP-0013]
pr: null
---

## Problem

[docs/planning/DEMO_NARRATIVE_GTL_GCL.md](docs/planning/DEMO_NARRATIVE_GTL_GCL.md) §1 step 4 says "Partner switches in → MPH Portal → Accept" — the master policyholder accepts the offer sent by Sales. Today there is no MPH portal. The `group-insurance` portal is the broker/insurer surface; MPH is a separate identity in the backend (confirmed by API team) and needs a dedicated portal app.

Without it, the demo's "Sales submits → Partner accepts → Sales finalizes" handshake collapses into "Sales clicks Accept on their own screen as the wrong role," which is dishonest and doesn't represent the real MPH-side surface that customers will see.

**Backend investigation (2026-05-13):** Acceptance lives at the **Quote** level, not Proposal: `POST /api/quotation/quotes/{quoteId}/accept` ([group-pas/quotation/QuotationApi/src/main/java/com/anaira/quotation/api/QuoteAPI.java:117-120](file:///Users/seriousblack/dev_anaira/group-pas/group-pas/quotation/QuotationApi/src/main/java/com/anaira/quotation/api/QuoteAPI.java)) transitions a Quote from `SENT_TO_CLIENT` → `ACCEPTED`. The Proposal is created *after* Quote acceptance (no `SENT_TO_CLIENT` state on Proposal). So the MPH portal's "Accept" action operates on the Quote that's awaiting the MPH's sign-off, not on a Proposal. Update the demo narrative to read accordingly when the MPH portal is built.

## Proposed change

Create a new `mph` portal app under `src/app/` (sibling to the current `group-insurance` portal). The portal is intentionally narrow — MPH only does a handful of things.

**Portal config** ([src/mocks/original/mph/config/app-config-mock.ts](src/mocks/original/mph/config/app-config-mock.ts) — new):
- Single-app branding; menu items: Home, Proposals.
- `appId: "mph"` registered in [src/app/api/config/app/route.ts](src/app/api/config/app/route.ts) alongside `group-insurance` and `auto-claims`.

**Routes** (new under `src/app/mph/`):
- `/mph` — Dashboard with Inbox: "Quotes awaiting your acceptance" (`data-table`, `visibleRoles: ['mph']`).
- `/mph/quotes/[id]` — Quote detail (read-only summary + Accept `ActionBar`).

**Schemas** (new):
- `schemas/mph/dashboard.json` — uses the same `visibleRoles` + `section-group` primitives PROP-0009 introduces.
- `schemas/mph/quote-detail.json` — reuses existing quote widgets where possible; restricts to MPH-relevant fields (no internal pricing breakdown / underwriter notes).

**Data**:
- Inbox: `GET /api/quotation/quotes/search?status=SENT_TO_CLIENT` (filter further by MPH identity once auth lands).
- Detail: `GET /api/quotation/quotes/{quoteId}`.
- Accept: `POST /api/quotation/quotes/{quoteId}/accept` — transitions Quote `SENT_TO_CLIENT` → `ACCEPTED`. Confirmed in backend at [group-pas/quotation/QuotationApi/src/main/java/com/anaira/quotation/api/QuoteAPI.java:117-120](file:///Users/seriousblack/dev_anaira/group-pas/group-pas/quotation/QuotationApi/src/main/java/com/anaira/quotation/api/QuoteAPI.java).
- Reject: backend exposure to confirm during CLARIFY (Quote state machine should expose a counterpart; otherwise scope reject to a follow-up).

**Role:** the `mph` role exists in the enum after PROP-0009. This portal's role switcher (if any) only lists `mph`.

## Alternatives considered

- **Add an MPH section inside the `group-insurance` portal.** Rejected. MPH is a different legal identity; mixing surfaces blurs the demo and creates auth confusion later when JWTs route users to the wrong portal.
- **Build a single bespoke `/mph/accept/[id]` page (no dashboard, no inbox).** Considered as a slimmer V1. Rejected because the narrative explicitly shows Partner "switching in" to a portal — a dashboard is the cheapest way to demonstrate that, and PROP-0009's primitives mean the dashboard costs ~1 schema file.
- **Have MPH accept a Proposal (matching the demo narrative literally).** Rejected — backend has no `accept` endpoint on Proposal and no `SENT_TO_CLIENT` state on it. Adding one would be backend scope creep; the existing Quote-level accept already covers the demo handshake, just with a small narrative re-wording.

---

## Project-context fit

Aligns with the post-auth direction: separate identities → separate portals, each consuming `/api/config/app` filtered by JWT-derived role. Reuses every primitive PROP-0009 ships: 6-role enum, `visibleRoles`, role-aware app-config route.

## Pros
- Honest demo of the cross-org handshake (Sales-side submit ↔ MPH-side accept) without faking it on a single screen.
- Tiny surface: one dashboard + one detail page. Most of the work is reusing PROP-0009 primitives.
- Sets the pattern for the other deferred portals (PROP-0011..PROP-0013).

## Cons
- The demo narrative says "Accept the Proposal" but backend accept is on the Quote — narrative needs a small re-wording when the build lands (Quote acceptance precedes Proposal creation). Not a blocker.
- Multi-portal routing in Next.js needs a small bootstrap pattern (separate root layout per portal); first portal-split pays the setup cost.
- Reject path on Quote needs CLARIFY-time confirmation; otherwise scope reject to a follow-up.

## Recommendation
defer (build after PROP-0009 lands; backend is ready — accept endpoint confirmed at the Quote level).

---

## Implementation notes
