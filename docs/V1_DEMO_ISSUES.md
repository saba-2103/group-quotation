# V1 Demo — Pre-walkthrough Issue Log

**Status:** Live during the pre-demo polish pass on 2026-05-07.
**Owner:** AI build session + soumyadip review pass.
**Cross-refs:** [docs/group-pas-v1-plan.md](group-pas-v1-plan.md), [docs/Keystone_UI_Design_Principles_v2_Speaker_Notes.md](Keystone_UI_Design_Principles_v2_Speaker_Notes.md), [context/SESSION_LOG.md](../context/SESSION_LOG.md).

---

## Spec conflict resolved here

**ActionBar — disabled vs hidden:**

- **Plan Task 1.3** says: "Disabled actions render with hover tooltip indicating the gating reason ('Not available in <state>' / 'Requires <role> role')."
- **Design Principles deck v2 (Slide 2)** says: "A Maker sees 'Create' and 'Edit.' They never see an Approve button — it doesn't exist in their world."

The deck is the customer-facing pitch and the more recent + more authoritative source for UX direction. **Resolution:**
- **Role-gated** → action is **hidden** entirely (matches the deck's "structural adaptation" claim).
- **State-gated** → action is **rendered disabled** with a tooltip ("Not available in <state>"), so users understand the lifecycle and what's coming next.
- **Awaiting-approval lock** (maker-checker overlay) → action is **rendered disabled** with a tooltip ("Awaiting checker approval"), since the lock is temporary.

This keeps the deck's narrative (role-adaptive UI) while preserving the educational value of state lifecycle visibility.

---

## Pass 1 — Critical for demo (this session)

| # | Issue | Where | Severity | Fix |
|---|---|---|---|---|
| P1.1 | Action bar shows all role-gated actions disabled — clutters every screen | every detail page action bar | high | Hide role-gated, keep state-gated disabled. |
| P1.2 | No back button anywhere — user gets stuck on detail pages | every `*Detail` route | high | Extend `page-header` widget with optional `backHref` prop; add to every detail schema. |
| P1.3 | `additionalAttributesJson` shows raw JSON string on PAM Member detail | `member-detail.json` | medium | Hide section by default; render parsed JSON in a collapsible if non-empty. |
| P1.4 | `memberToPlanMappingJson` shows raw JSON on Quote/Proposal detail | `quote/member-mapping.json`, `proposal/overview.json` | medium | Show truncated preview + "Show JSON" toggle (deferred to D3 fully); for V1, show "Configured" / "Not configured" indicator. |
| P1.5 | `censusFileFormatJson` shows raw JSON | `quote/census.json` | medium | Same approach: "Configured" / "Not configured" indicator. |
| P1.6 | `classificationResultJson`, `uwDecisionJson` show raw JSON on PolicyMember detail | `policy-member-detail.json` | medium | Drop the JSON fields; render the parsed values inline as labelled fields (lane, errors, decision, exclusions). |
| P1.7 | `plansSummary` field shows literal `plans.length` token | `quote/plans.json`, `proposal/overview.json` | low | Use proper count rendering or replace with a list view. |
| P1.8 | Cancellation note section always renders even for non-CANCELLED members | `member-detail.json` | low | Use `key-value-grid` `visibleWhen` if available, OR hide section in the schema once we have conditional rendering. For V1 — drop section; the `ReasonBanner` already shows the cancellation reason. |
| P1.9 | Member Quotes (GCL) placeholder tab uses key-value-grid + valueMapping hack | `quote/member-quotes-placeholder.json` | low | Replace with a clean empty-state widget. |

## Pass 2 — Polish (if time before demo)

| # | Issue | Where | Severity | Fix |
|---|---|---|---|---|
| P2.1 | Cancel / reject / archive actions use a hardcoded reason string | `quote-detail.json`, `proposal-detail.json`, `policy-member-detail.json`, `policy-detail.json` | medium | Replace with a confirm-with-input dialog (needs a small extension to the `confirm` action shape). |
| P2.2 | Foreign-key IDs shown as raw codes (clientId, proposalId, policyId) instead of human labels | every detail page header | medium | Cheap path — leave as ID + add a lookup in the route handler that joins client name. Defer until needed. |
| P2.3 | "Open created proposal" navigates to /issuance/proposals (list) instead of the specific proposal | Quote detail action bar | low | Needs an action handler that can chain (fetch proposalId by quoteId → navigate). Defer; list filter shows the right one. |
| P2.4 | Detail headers have no breadcrumb to parent (e.g. PolicyMember → Proposal → Proposals list) | every detail page | low | Pair with the back button (P1.2) — back button + page title is usually enough for V1. |
| P2.5 | Pricing tab "still working…" banner not implemented (plan asked for it once initial-cadence phase ends) | `quote/pricing.json` | low | Defer — the polling itself works; the banner is a polish add. |
| P2.6 | Filter-bar empty state doesn't reset when chips cleared (stale dependentState) | every list page filter | low | Verify in walkthrough; defer if it works. |

## Pass 3 — Post-demo backlog (D1–D12 in `docs/group-pas-v1-plan.md`)

Don't touch in this session. Document only.

- D1–D3: Plans / Census / Member-mapping editable CRUD
- D4: Bulk census flow
- D5: Operational queue index
- D6: Critical-path test suite
- D7: PresignedUploader widget
- D8: useEnum hook
- D9: Clients detail page
- D10: UW review queue surface
- D11: Polished WITHDRAWN / EXPIRED / REJECTED Quote screens
- D12: Saved-view chip variants

---

## Deferred infrastructure (post-demo)

- **Pre-commit hook (lint + typecheck + test)** — requested during the 2026-05-11 audit pass but deferred. Current state of the suite when attempted:
  - `npm run typecheck` ✅ clean (script added — `tsc --noEmit`).
  - `npm run lint` ❌ 5,083 errors / 70,127 warnings on existing code (mostly `@typescript-eslint/no-explicit-any` + Storybook `no-renderer-packages`). `next lint` is also deprecated in Next 16 — must call `eslint .` directly.
  - `npm test` ❌ 56 failing / 68 passing.
  - Gating commits on these today would force `--no-verify` on every commit. Re-enable only after lint/test debt is brought down, or wire lint-staged for staged-files-only and fix tests first.

## Already-fixed (from the audit pass committed in `a88e3c6`)

- Hardcoded `POL-2026-0001` in `proposal/members.json` and `add-policy-member-form.json`.
- Repair-form `:id` substitution flow.
- `pam-link` deep link via `/policy-admin/members/by-policy-member/[policyMemberId]` redirect page.
- Quote → Proposal navigation hint via FINALIZED-state action.
- Proposal-scoped GET `?state=` filter.
