---
id: PROP-0008
title: Split monolithic action-bar Edit into per-tab edit ownership
status: approved
next_step: /execute-proposal PROP-0008
proposer: agent:claude
created: 2026-05-13
category: spec
impact: medium
effort: s
evidence:
  - /Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md
  - schemas/quote-detail.json
  - schemas/tabs/quote/key-data.json
related:
  - PROP-0004
  - PROP-0005
  - PROP-0006
  - PROP-0007
pr: null
---

## Problem

The action bar at the top of the quote detail page ([schemas/quote-detail.json:170-176](schemas/quote-detail.json)) carries a single monolithic `Edit` button that always opens `edit-quote-policy-detail-form` — the policy-detail form. This is misleading on every tab except Key Data: a user on the Plans tab clicks `Edit` and gets a form to change `effectiveDate`, not to edit plans. The action bar holds nine actions today, of which one (`edit`) is a UI affordance and eight are state transitions. They have different lifecycles and don't belong together.

Per the GTL Quotation spec, each section has its own command: `UpdatePolicyDetail`, `UpdatePlan`, `UpdateRateCard`, `UpdateAggregateCensus`, `UpdateMemberToPlanMapping`. PROP-0004 / 0005 / 0007 each ship per-tab edit affordances inside their owning tab. This proposal removes the misleading top-level Edit and adds a dedicated `Edit policy detail` button inside the Key Data tab.

## Proposed change

1. Remove the `edit` action from [schemas/quote-detail.json](schemas/quote-detail.json):
   - Remove the action object at lines 170-176
   - Remove `"edit"` from `stateActions.DRAFT` (line 68)
   - Remove `"edit"` from `roleActions.maker` (line 78)

After this change the top action bar carries only state-transition actions: `submit`, `send-for-approval`, `clear-approval`, `send-to-client`, `accept`, `reject`, `finalize`, `withdraw`, `expire`.

2. Add a contextual edit action inside [schemas/tabs/quote/key-data.json](schemas/tabs/quote/key-data.json) using an inline `action-bar` widget below the existing `key-value-grid`. Single action `edit-policy-detail` with:
   - `stateActions.DRAFT: ["edit-policy-detail"]`
   - `roleActions.maker: ["edit-policy-detail"]`
   - Action: `type: "open-modal"`, `target: "edit-quote-policy-detail-form"` (existing form, unchanged)

Net result: every tab owns its own edit affordances. Key Data → policy detail. Plans (PROP-0004) → per-card plan edit. Census (PROP-0005) → inline headcount + file-format edit. Mapping (PROP-0007) → blob replace. The action bar at the top is purely for state transitions.

**Sequencing:** Land this proposal **last** so users never see both a top Edit button and a per-tab Edit at the same time. PROP-0004 / 0005 / 0007 are independently shippable; PROP-0008 closes the loop.

## Alternatives considered

- **Keep the top Edit and make it tab-context-aware** (switches which form it opens by active tab) — rejected. Introduces router-state coupling to the action bar and is more code than splitting cleanly. Also leaves a single button label `Edit` that means different things depending on tab — bad affordance design.
- **Rename the top Edit to `Edit policy details` and leave it where it is** — rejected. Still mixes a UI affordance with state transitions in the same bar. Per-tab ownership is the spec-aligned model.
- **Defer until all per-tab edits land** — viable, and reflected in the sequencing note. This proposal can be merged any time after PROP-0004 / 0005 / 0007 ship, or together with them as a single integration step.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation

**approve** — user pre-approved via the plan at `/Users/seriousblack/.claude/plans/quotation-detail-pages-view-happy-bee.md`. Pick up via `/build-feature PROP-0008` or `/execute-proposal PROP-0008` last in the sequence.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
