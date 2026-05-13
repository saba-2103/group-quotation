---
id: PROP-0003
title: Wire post-issuance AddMember UI on live policy
status: in-progress
next_step: /execute-proposal PROP-0003
proposer: agent:claude
created: 2026-05-13
category: spec
impact: medium
effort: s
evidence:
  - /Users/seriousblack/.claude/plans/do-you-have-repo-clever-diffie.md
  - docs/planning/team_nb_blueprint_v3.md:222
  - docs/planning/team_nb_blueprint_v3.md:439
  - docs/planning/team_nb_blueprint_v3.md:475
  - docs/planning/team_nb_blueprint_v3.md:660
  - src/lib/api/policy-admin.ts:173-211
related:
  - PROP-0001
pr: null
---

## Problem

PAM exposes `POST /api/policy-admin/policies/{policyId}/members` (`AddMemberCommand`) and the frontend has a typed client wrapper at [src/lib/api/policy-admin.ts:173-211](src/lib/api/policy-admin.ts), but **no UI** drives it. The only way a member can reach a policy today is via Issuance W3 (proposal → policy-member → ADDED), which is for new-business enrollment. Mid-policy additions — a late joiner, a corrected enrollment, an ops repair — have no path through the UI.

Backend blueprint ([docs/planning/team_nb_blueprint_v3.md](docs/planning/team_nb_blueprint_v3.md)):
- §2 line 222 — `AddMemberCommand` handler: NumberGen → `MemberFactory.enroll` → starts `MemberEnrollmentFlow`. Returns synchronously with `memberId + memberNumber`. Member is PENDING at sync response.
- §4 line 439 — "Members come exclusively via `AddMember` calls (one per member, after each ProposalMember reaches APPROVED in PIM W3)." But the API itself is generic — it accepts any caller, not just PIM.
- §4 line 462 — Member is **always** created PENDING; `MemberEnrollmentFlow` drives PENDING → ACTIVE (float reserve, optional UW/RI/CXO gates, activation) or PENDING → CANCELLED.
- §6.6 line 660 — `MemberEnrollmentFlow` runs independently of how the AddMember was triggered, so a direct ops-initiated call is workflow-safe.

Member detail/search UI exists (read-only) but the policy detail screen has no "Add member" action.

Unwired endpoint:
- `POST /api/policy-admin/policies/{policyId}/members` — `addMember` (currently ◐: wrapper exists, no UI)

## Proposed change

Add an "Add member" action to the policy detail screen in the Policy Admin module, plus a polling-aware result state.

**Pages / actions** (extend existing):
- `/policy-admin/policies/[id]` — add an "Add member" CTA in the members section header (visible only when policy state is `ACTIVE` or `PENDING`)
- Clicking it opens a form with: identity (name, dob, gender, salary, occupation), PII (mobile, email, govId type/number), planNo (resolved from policy's available plans), sumInsured, structured `premium: MemberPremium`, optional `uwDecision: MemberUwDecision`, optional `transactionRefs[]`, optional `additionalAttributesJson`
- On submit → POST → close form, optimistically insert the new member into the list at status `PENDING`, then poll `/members/{id}` until state ≠ PENDING (timeout: 30s, then fall back to manual refresh hint)

**Schemas** (new files under [src/schemas/](src/schemas/)):
- `forms/add-policy-admin-member-form.json` — mirrors the wire shape from blueprint §1 line 138 (`proposalMemberId` omitted for direct ops add)
- `tabs/policy/members.json` — add the action button + handler reference

**Client wrappers**: confirm `addMember(policyId, body)` at [src/lib/api/policy-admin.ts](src/lib/api/policy-admin.ts) accepts the structured `MemberPremium` and optional `MemberUwDecision` shapes, and adjust types if needed.

**Permissions**: gate the action behind the policy-admin maker role (existing role check pattern).

## Alternatives considered

- **Route the add through a fake Issuance W3 path** — rejected. W3 expects a proposal context (ProposalMember → APPROVED → ADDED). Faking that for a mid-policy add is the kind of workflow-state hack blueprint §6.6 explicitly warns against; the AddMember endpoint exists precisely so callers don't have to do that.
- **Bulk-only via the census submission flow (PROP-0001)** — viable for some scenarios but bulk upload is overkill for adding one or two late joiners and the validation/ingest detour adds friction. Both surfaces should exist; this proposal handles the single-add path.
- **Defer indefinitely** — rejected. Customer ops *will* need to add members to a live policy mid-term; without this, every such case becomes a backend ticket.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit

The endpoint is "Public" per blueprint ([docs/planning/team_nb_blueprint_v3.md:475](docs/planning/team_nb_blueprint_v3.md)) and the wrapper exists at [src/lib/api/policy-admin.ts:173-211](src/lib/api/policy-admin.ts), but the use case the proposal describes — *mid-policy* member addition to a live policy — is conceptually an **endorsement**, which is explicitly out of V1 per [CORE_MEMORY.md:78](context/CORE_MEMORY.md) and [docs/group-pas-v1-plan.md:9](docs/group-pas-v1-plan.md) ("Out: ... endorsement/renewal/claims"). V1 plan Task 4.4 at [docs/group-pas-v1-plan.md:520](docs/group-pas-v1-plan.md) already covers single-member add inside the *proposal* flow (pre-issuance). PAM is currently read-mostly per the V1 in-scope statement at [docs/group-pas-v1-plan.md:7](docs/group-pas-v1-plan.md). PROP-0001 covers the proposal-stage bulk path; PROP-0003 specifically targets policy-stage add, which is the disputed surface.

## Pros

- Closes a real ops gap once endorsement is in scope — late joiners on a live policy have no UI path today.
- Endpoint and types already exist; cost is moderate (one form + one action + polling on PENDING → ACTIVE).
- Blueprint §6.6 confirms `MemberEnrollmentFlow` runs independently of caller, so a direct ops-add is workflow-safe at the backend layer.

## Cons

- Stepping into endorsement territory ahead of an endorsement-scope decision invites half-built features (no audit trail UI, no premium pro-ration, no cancellation symmetry) that imply "endorsement support" without delivering it.
- Risks user confusion: same "Add member" affordance on a live policy could imply full mid-term lifecycle support that isn't there.
- The V1 demo-deferred backlog (D1–D12) doesn't list this, so it's net-new scope, not picked-up backlog.

## Recommendation

**approve.** User resolved the escalation on 2026-05-13: API exists, behaviour is understood (`AddMemberCommand` is Public per blueprint §4 line 475; `MemberEnrollmentFlow` handles activation regardless of caller), so the UI ships. New API-driven-scope rule in [CORE_MEMORY.md](context/CORE_MEMORY.md) makes "this is endorsement-shaped" a non-blocker. Pick up via `/build-feature PROP-0003`. The cons listed (implies fuller endorsement support) are real UX risks — handle in CLARIFY by scoping the affordance copy and disabling adjacent endorsement-shaped actions until those endpoints land.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
