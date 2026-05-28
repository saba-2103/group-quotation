---
id: PROP-0013
title: Ops portal — Ops workbench for member repair
status: draft
proposer: agent:claude
created: 2026-05-13
category: architecture
impact: high
effort: m
evidence:
  - /Users/seriousblack/.claude/plans/read-docs-planning-demo-narrative-gtl-gc-cosmic-dove.md
  - docs/planning/DEMO_NARRATIVE_GTL_GCL.md
related: [PROP-0009, PROP-0010, PROP-0011, PROP-0012]
pr: null
---

## Problem

[docs/planning/DEMO_NARRATIVE_GTL_GCL.md](docs/planning/DEMO_NARRATIVE_GTL_GCL.md) §4 describes the Ops repair path: a member fails classification (data quality issue), state goes to `REPAIR_PENDING`; Ops switches into a workbench, opens the case, fixes the flagged fields, submits → member re-classifies → continues on its LoB path. No Ops surface exists today.

Backend queue endpoint exists (confirmed against live OpenAPI):
- `GET /api/policy-admin/members/search?state=REPAIR_PENDING&page=&size=` — Ops queue

**Repair persistence + re-classification (confirmed 2026-05-13 against group-pas source):** two-step pattern.
1. `PUT /api/issuance/policy-members/{policyMemberId}` with `UpdateMemberRequest` — persists field corrections. ([group-pas/issuance/IssuanceApi/src/main/java/com/anaira/issuance/api/PolicyMemberAPI.java:55-68](file:///Users/seriousblack/dev_anaira/group-pas/group-pas/issuance/IssuanceApi/src/main/java/com/anaira/issuance/api/PolicyMemberAPI.java))
2. `POST /api/issuance/policy-members/{policyMemberId}/send-for-issuance` — re-enters classification. ([same file:109-112](file:///Users/seriousblack/dev_anaira/group-pas/group-pas/issuance/IssuanceApi/src/main/java/com/anaira/issuance/api/PolicyMemberAPI.java))

**Backend gap noted:** domain has `completeMemberRepair(MemberRepairCorrections)` ([AbstractPolicyMember.java:223-231](file:///Users/seriousblack/dev_anaira/group-pas/group-pas/issuance/IssuanceDomain/src-gen/main/java/com/anaira/issuance/domain/AbstractPolicyMember.java)) but no API endpoint exposes it. The UI uses the two-step pattern above; if that gets clunky in practice, request backend to expose `completeMemberRepair` as a single atomic endpoint.

## Proposed change

Create a dedicated `ops` portal under `src/app/ops/`.

**Portal config** — new `appId: "ops"`, menu: Home, Repair queue.

**Routes** (new):
- `/ops` — Dashboard with one Inbox section: "Members flagged for repair" (`data-table`, `visibleRoles: ['ops']`).
- `/ops/members/[policyMemberId]` — repair detail: flagged fields highlighted, editable form for the problem fields, Submit → re-trigger classification (endpoint pending API confirmation).

**Schemas** (new):
- `schemas/ops/dashboard.json`
- `schemas/ops/member-repair.json` — composes existing form widgets, but pre-fills with the member's current data and highlights the flagged fields (data quality hints in the row error from classification).

**Data**:
- Queue: `GET /api/policy-admin/members/search?state=REPAIR_PENDING`
- Detail: `GET /api/policy-admin/members/{memberId}`
- Persist: `PUT /api/issuance/policy-members/{policyMemberId}` (with `UpdateMemberRequest`)
- Re-trigger: `POST /api/issuance/policy-members/{policyMemberId}/send-for-issuance`

**Role:** `ops` role exists in the enum after PROP-0009. ActionBar `roleActions` on the repair schema gates Submit to `ops` only.

## Alternatives considered

- **Surface "Repair" as a tab inside the existing policy-admin member detail page.** Rejected. Ops works a queue across many policies — the queue is the right entry point, not "drill into one policy, then maybe a member is broken."
- **Use the existing add-member form for repair.** Considered. Rejected because the validation hints from classification need to surface inline next to each flagged field; the existing form doesn't have that affordance and bolting it on changes the form for non-repair users too.
- **Skip Ops portal, route Ops users through the existing policy-admin member detail page.** Rejected. Ops actions (resubmit-for-classification) don't belong on the operational detail screen for non-Ops roles, and there's no way to surface the queue.

---

## Project-context fit

Backend mostly ready; the missing endpoint (member field update) is a clarifying question, not a blocker on planning. Same primitive-reuse story as the other portals — relies on PROP-0009.

## Pros
- Closes §4 of the demo narrative honestly.
- Queue is one schema file; detail is one schema file + reuse of existing form widgets.

## Cons
- The "flagged fields highlighted" interaction needs the classification row-error payload to be persisted on the member or fetched from a related entity; confirm shape during CLARIFY.
- Two-step submit (`PUT` then `POST send-for-issuance`) is a small UX awkwardness — atomic if backend exposes the existing `completeMemberRepair` domain operation as an endpoint. Surface this as feedback to the backend team if it bites.

## Recommendation
defer (build after PROP-0009 lands; backend endpoints confirmed).

---

## Implementation notes
