---
id: PROP-0015
title: Add activation counter ({active}/{threshold}) to Master Policy detail header
status: done
next_step: null
pr: null
proposer: agent:claude
created: 2026-05-13
category: spec
impact: medium
effort: s
evidence:
  - schemas/policy-detail.json
  - schemas/tabs/policy/overview.json
  - docs/spec/policy-admin/PolicyAdminData.data (PolicyDto.activationThreshold + pendingReason)
  - context/SESSION_LOG.md (backend answer 2026-05-13)
related:
  - PROP-0009
pr: null
---

## Problem

The Master Policy detail page header today shows only `state / policyNumber / clientName / premium`. There's no at-a-glance signal of how close the policy is to activation. The Overview tab has the data — `activationThreshold` on the policy DTO and `activeMembers` on the pending-breakdown endpoint — but the user has to scroll past the header to reach it. Per the backend (2026-05-13 Slack): the FE composes the counter as `{breakdown.activeMembers} / {policy.activationThreshold}` from two existing endpoints; no new API call needed.

## Proposed change

Add a small `activation-counter` widget to the page header in `schemas/policy-detail.json`, slotted between the `policy-state-summary` grid and the `policy-actions` action-bar. Renders a compact tile:

```
Activation
  3 / 10           [Pending] [AWAITING_MIN_MEMBERS]
   ^active   ^threshold     ^state-badge   ^pending-reason chip
```

- Fetches both endpoints in parallel via two `useSmartQuery` calls:
  - `GET /api/policy-admin/policies/{id}` → `activationThreshold` + `state` + `pendingReason`
  - `GET /api/policy-admin/policies/{id}/pending-breakdown` → `activeMembers`
- No new endpoints. Both already proxied. Both already consumed elsewhere — this widget just composes them into one tile.
- Pure read-only display. No role gating, no actions. Visible to everyone with access to the policy detail page.
- When `activationThreshold` is null/missing, render `{activeMembers}` only with a subtle "(threshold not set)" hint.
- When `pendingReason` is null, omit the chip.

Schema-wise, the widget needs no props beyond an optional `policyId` (resolved from the page template `{{id}}`).

## Alternatives considered

- **Two adjacent key-value-grids in the header** — rejected. Each grid fetches one endpoint, so the user reads `activeMembers` and `activationThreshold` separately and mentally composes the `3/10`. Worse UX than a single tile.
- **Extend `key-value-grid` to support per-field dataSource** — rejected for V1. Bigger lift; the schema-engine extraction PR is the right place to consolidate accessor patterns. A small bespoke widget unblocks the header today without that refactor.
- **Render only on the Overview tab and skip the header** — rejected. Tab-deferred status is the current state; the gap is precisely that the activation signal isn't visible from the page entry point.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation

**approve** — user pre-approved in conversation 2026-05-13 after the backend confirmed both fields are returned by existing endpoints. Builds parallel to PROP-0010..0013 (the 4 portal proposals) with zero file overlap (those add `src/app/{mph,member,uw,ops}/` and `schemas/{mph,member,uw,ops}/`; this touches only `schemas/policy-detail.json` and adds one new widget under `src/components/widgets/data/`).

---

<!-- Filled by /execute-proposal. -->

## Implementation notes

Built 2026-05-13. Files:
- `src/components/widgets/data/ActivationCounter.tsx` — new bespoke widget. Calls `useSmartQuery` twice (policies/{id} + /pending-breakdown), prefers PolicyDto fields with fallback to breakdown's mirror, renders compact `{active}/{threshold} · state · pendingReason` tile. Handles null/loading gracefully ("—" + "Activation threshold not set" hint).
- `src/components/registry/WidgetRegistry.tsx` — register `activation-counter`.
- `schemas/policy-detail.json` — slot the counter between `policy-state-summary` and `policy-actions`.

Backend during build: `/policies/{id}` was returning 502 from the live backend at build time. `/policies/{id}/pending-breakdown` is in MOCK_ONLY_PATTERNS (CORE_MEMORY interim assumption #5) so it always serves from local mock. Widget rendered with breakdown-derived state/active and fallback "threshold not set" — proves the resilience path. When backend recovers, threshold + pendingReason populate from policy DTO without code changes.

Verified live (localhost dev server, screenshot in chat):
- Counter renders in policy-detail header: `6 / — members`, "Activation threshold not set" hint, state badge `ACTIVE`.
- Page header composition unchanged; counter slotted between state-summary and action-bar.

No file collision with PROP-0010..0013 (the 4 portal proposals being built in parallel): those add new dirs under `src/app/{mph,member,uw,ops}/` and `schemas/{mph,member,uw,ops}/`. This run touches only policy-detail.json header + one new widget file.

tsc clean. ESLint clean on new file; pre-existing `any` in WidgetRegistry left untouched per skill rule.
