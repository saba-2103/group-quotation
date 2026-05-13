---
id: PROP-0011
title: Member portal — MAF landing page with OTP confirmation
status: draft
proposer: agent:claude
created: 2026-05-13
category: architecture
impact: medium
effort: s
evidence:
  - /Users/seriousblack/.claude/plans/read-docs-planning-demo-narrative-gtl-gc-cosmic-dove.md
  - docs/planning/DEMO_NARRATIVE_GTL_GCL.md
related: [PROP-0009, PROP-0010, PROP-0012, PROP-0013]
pr: null
---

## Problem

[docs/planning/DEMO_NARRATIVE_GTL_GCL.md](docs/planning/DEMO_NARRATIVE_GTL_GCL.md) §2B steps 3–5 describe the GCL member confirmation flow: STP members auto-receive a MAF (Member Application Form) link → Member clicks the link → enters any OTP → Confirm → member flips to `ACTIVE`. No member-facing surface exists today.

Backend has the endpoints ready:
- `GET /api/policy-admin/members/by-policy-member/{policyMemberId}` — load enrolment details
- `POST /api/issuance/policy-members/{policyMemberId}/confirm-maf` — OTP confirmation (backend mocks OTP validation per API team)

Without this surface, the GCL demo step where the member self-confirms enrolment has nowhere to land.

## Proposed change

Create a minimal `member` portal — intentionally not a workbench, just a self-service link target.

**Portal**:
- New `appId: "member"` registered in [src/app/api/config/app/route.ts](src/app/api/config/app/route.ts).
- No top-shell menu, no role switcher, no dashboard — a single route.

**Route** (new under `src/app/member/`):
- `/member/maf/[policyMemberId]` — landing page that:
  1. Fetches `GET /api/policy-admin/members/by-policy-member/{policyMemberId}` and shows enrolment summary (name, plan, sum assured, premium).
  2. Renders an OTP input + "Confirm enrolment" button.
  3. On submit → `POST /api/issuance/policy-members/{policyMemberId}/confirm-maf` → success screen → member flips to `ACTIVE` (poll `GET .../by-policy-member/{id}` until state changes, using `STANDARD_POLL_SCHEDULE` from [src/lib/polling.ts](src/lib/polling.ts)).

**Schema** (new):
- `schemas/member/maf-landing.json` — single `stack-layout` with summary card + `member-confirm-form`.
- `schemas/forms/member-confirm-form.json` — single OTP field + submit (`api-mutation` to `confirm-maf` with `onSuccess[]` polling per the existing form-success pattern).

**Role:** the `member` role exists in the enum after PROP-0009. The portal effectively treats every visitor of a `/member/maf/...` URL as the member persona — no role switcher needed.

## Alternatives considered

- **Bolt the MAF UI onto the existing `group-insurance` portal.** Rejected. Brokers and members aren't the same audience; chrome (logo, menu) shouldn't be visible to the member.
- **Inline modal triggered from the broker side ("simulate member confirm").** Rejected. The demo narrative shows the member literally switching in; faking it on the broker screen wastes the realistic two-portal handshake the backend's `confirm-maf` endpoint enables.
- **Build a fully role-switchable portal with member dashboard listing all enrolled members.** Rejected as over-scope. A real member sees one MAF at a time; no need for a list. Revisit if the product later wants a member portal with claims/coverage UI.

---

## Project-context fit

Backend endpoints exist and are wired by [PROP-0003](PROP-0003-post-issuance-add-member-ui.md) into the broker side; this proposal adds the member-facing counterpart. Follows the API-driven-scope rule (CORE_MEMORY 2026-05-13).

## Pros
- Smallest of the deferred portals (~1 page, 2 schemas). Cheap to ship after PROP-0009 lands.
- Closes the GCL demo loop honestly — no faking the OTP step on the broker screen.
- Backend OTP is mocked; no integration risk.

## Cons
- Multi-portal bootstrap cost (shared with PROP-0010..PROP-0013) — but PROP-0010 absorbs it first.
- No deep-link security in V1 (no token validation on the URL) — anyone with the URL can confirm any member. Acceptable for demo; flag for post-auth tightening.

## Recommendation
defer (build after PROP-0009 + PROP-0010 land).

---

## Implementation notes
