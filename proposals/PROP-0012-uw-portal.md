---
id: PROP-0012
title: UW portal — Underwriter workbench for member review and decisioning
status: draft
proposer: agent:claude
created: 2026-05-13
category: architecture
impact: high
effort: m
evidence:
  - /Users/seriousblack/.claude/plans/read-docs-planning-demo-narrative-gtl-gc-cosmic-dove.md
  - docs/planning/DEMO_NARRATIVE_GTL_GCL.md
related: [PROP-0009, PROP-0010, PROP-0011, PROP-0013]
pr: null
---

## Problem

[docs/planning/DEMO_NARRATIVE_GTL_GCL.md](docs/planning/DEMO_NARRATIVE_GTL_GCL.md) §3 describes the UW path: non-STP members get classified as `REFERRED_TO_UW`; the UW switches into a workbench, opens a flagged member, reviews the reason, and either approves (→ rejoins LoB path) or rejects. No UW surface exists today.

Backend is fully ready (confirmed against live OpenAPI):
- `GET /api/issuance/policy-members/search?state=REFERRED_TO_UW&page=&size=` — the UW queue
- `POST /api/issuance/policy-members/{id}/uw/approve` — approve
- `POST /api/issuance/policy-members/{id}/uw/reject` — reject

Member-detail screens in the existing `group-insurance` portal aren't UW-shaped — they show admin/operational fields, not the medical/financial reason that triggered UW review.

## Proposed change

Create a dedicated `uw` portal under `src/app/uw/`.

**Portal config** — new `appId: "uw"`, menu: Home, Reviews.

**Routes** (new):
- `/uw` — Dashboard with one Inbox section: "Members referred for review" (`data-table`, `visibleRoles: ['uw']`).
- `/uw/members/[policyMemberId]` — UW-shaped member detail: reason-for-referral banner (using existing `ReasonBanner`), key biographical/risk fields, plan/sum-assured context, decision `ActionBar` (Approve / Reject with optional decision note).

**Schemas** (new):
- `schemas/uw/dashboard.json`
- `schemas/uw/member-review.json` — composes existing widgets (state-badge, reason-banner, key-value-grid, action-bar) but presents UW-relevant fields.

**Data**:
- Queue: `GET /api/issuance/policy-members/search?state=REFERRED_TO_UW`
- Detail: `GET /api/issuance/policy-members/{policyMemberId}` (already used in proposal-detail nested route)
- Actions: approve / reject endpoints above.

**Role:** the `uw` role exists in the enum after PROP-0009. ActionBar `roleActions` on the member-review schema gates approve/reject to `uw` only.

## Alternatives considered

- **Add a "UW filter" preset to the existing proposal-detail members table.** Rejected. UW reviews policy-members across many proposals — the queue is its own surface, not a tab inside one proposal.
- **Reuse the existing policy-admin member detail page for UW.** Rejected. UW needs decision actions and reason context that the operational member detail page hides; cluttering one screen with two role-shaped layouts is worse than two screens.
- **Skip the dashboard, single `/uw/queue` page.** Considered. Cosmetic-only saving — the dashboard is one schema file given PROP-0009's primitives.

---

## Project-context fit

Backend is fully built for this; this is wire-up work per the API-driven-scope rule (CORE_MEMORY 2026-05-13). Reuses all of PROP-0009's primitives.

## Pros
- High-impact demo step that's currently impossible to walk.
- Backend fully wired, no API team blockers.
- Reuses primitives — most cost is laying out the UW-shaped member-review schema.

## Cons
- The UW-shaped member-detail layout requires real product input on what UW actually wants to see (which risk fields, evidence attachments, etc.). May need a design checkpoint with the user before build.
- Decision note / referral notes — backend may or may not accept a free-text note on `uw/approve` and `uw/reject`; confirm during CLARIFY phase.

## Recommendation
defer (build after PROP-0009 lands and after product input on UW member-detail layout).

---

## Implementation notes
