---
id: PROP-0014
title: Proposal Members tab hits non-existent backend routes — repoint to policy-member endpoints
status: draft
proposer: agent:claude
created: 2026-05-13
category: spec
impact: high
effort: s
evidence:
  - tests/e2e/interactions.spec.ts:87 (failing test)
  - schemas/tabs/proposal/members.json:39
  - schemas/forms/add-policy-member-form.json (POST endpoint)
  - https://group-pas-dev.anairacloud.com/v3/api-docs (live OpenAPI)
related: []
pr: null
---

## Problem

The Proposal Members tab and the Add Member form both wire to backend routes that don't exist:

- **GET** `schemas/tabs/proposal/members.json:39` calls `/api/issuance/proposals/{{id}}/members` → live backend returns **404**.
- **POST** `add-policy-member-form.json` (action submitAdd) calls `/api/issuance/proposals/{{proposalId}}/members` → no such route exists.

Verified directly against the live OpenAPI at https://group-pas-dev.anairacloud.com/v3/api-docs — only `GET /api/issuance/proposals/search` exists under `/proposals/`; everything member-related is wired to a `/policies/{policyId}` path:

- `GET /api/issuance/policies/{policyId}/members`
- `POST /api/issuance/policies/{policyId}/members`
- `GET /api/issuance/policy-members/search?proposalId=...&state=...`

The frontend was likely written expecting a proposal-scoped members endpoint that was renamed (or never shipped) on the backend.

This is pre-existing and unrelated to PROP-0009 — surfaced when the new Playwright `interactions.spec.ts` started clicking "Add member" on a proposal detail page.

## Proposed change

Two endpoint repoints + a small data-flow change:

1. **List proposal members** — `schemas/tabs/proposal/members.json:39` — change endpoint from `/api/issuance/proposals/{{id}}/members` to `/api/issuance/policy-members/search?proposalId={{id}}` (the search endpoint accepts `proposalId` per OpenAPI). Or alternatively resolve the proposal's `policyId` and call `/api/issuance/policies/{policyId}/members`. The search route is simpler since it doesn't require an upstream policy fetch.

2. **Add member to proposal** — `schemas/forms/add-policy-member-form.json` — change POST endpoint from `/api/issuance/proposals/{{proposalId}}/members` to `/api/issuance/policies/{{policyId}}/members`. This requires the form to know `policyId` not `proposalId`. Either:
   - **(a)** Resolve `policyId` from the proposal at form open time (preferred — the proposal detail page can pass `policyId` down)
   - **(b)** Move the form to a policy-scoped route (`/policy-admin/policies/[id]/members/new`) — possible but breaks the Proposal → Members → Add flow.

   Recommend **(a)**.

3. **Member detail navigation** — `schemas/tabs/proposal/members.json:62,75` use `linkRoute: "/issuance/proposals/{{id}}/members/:id"` — the page at that path exists ([src/app/issuance/proposals/[id]/members/[memberId]/page.tsx](../src/app/issuance/proposals/[id]/members/[memberId]/page.tsx)) and works. No change needed for navigation.

## Alternatives considered

- **Add the missing routes to the backend.** Rejected — the backend deliberately scopes member endpoints under `policies/{policyId}`, since a policy is the unit a member belongs to after issuance. Re-introducing proposal-scoped endpoints would duplicate the surface for an edge case (members visible during proposal authoring).
- **Mock the proposal-scoped endpoints in `src/app/api/`.** Rejected — the project's "honesty pass" rule (CORE_MEMORY 2026-05-07) prohibits mock simulators for backend-absent endpoints. Adding mocks would mask the misalignment.

---

## Project-context fit

Aligns with the "API-driven scope" rule (CORE_MEMORY 2026-05-13) — if the backend has an endpoint and the behaviour is understood, the UI builds against it. The fix is to repoint to the real endpoint, not to wait for the wrong one to ship.

## Pros
- Closes a demo-blocking gap in the Proposal → Members flow (currently 404).
- Small scope — two endpoint URLs + one policyId pass-through.
- The post-issuance Add Member proposal ([PROP-0003](PROP-0003-post-issuance-add-member-ui.md)) already established the policy-scoped pattern; this aligns proposal-stage with that.

## Cons
- Requires the proposal-detail page to fetch + pass `policyId` to the Add Member form (small change in `proposal-detail.json` schema + `add-policy-member-form.json`).
- Risk of missed call sites — search the codebase for any other reference to `/api/issuance/proposals/.+/members` before shipping.

## Recommendation
approve. `/build-feature PROP-0014` or `/execute-proposal PROP-0014` after CLARIFY (1 question: policyId pass-through path).

---

## Implementation notes
