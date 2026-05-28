# Design — PROP-0008: Action-bar Edit split

run-id: 2026-05-13-edit-bar-split
proposal: [proposals/PROP-0008-quote-detail-edit-split.md](../../../proposals/PROP-0008-quote-detail-edit-split.md)

## Goal

Remove the monolithic `Edit` button from the Quote Detail action bar (it always opened the policy-detail form regardless of active tab — misleading from every tab except Key Data) and add a dedicated Edit button inside the Key Data tab. After this lands, the top action bar carries only state-transition actions (`submit`, `send-for-approval`, `clear-approval`, `send-to-client`, `accept`, `reject`, `finalize`, `withdraw`, `expire`). Each tab owns its own write affordances.

This is the sequencing-last lane that closes the Quote Detail tab-expansion loop — PROP-0004 / 0005 / 0006 / 0007 already shipped per-tab affordances; PROP-0008 retires the duplicate top-level Edit.

## In scope

1. **Remove** `"edit"` action from `schemas/quote-detail.json`:
   - From `stateActions.DRAFT`
   - From `roleActions.maker`
   - The action object itself (lines 170-176)

2. **Add** an `action-bar` widget to `schemas/tabs/quote/key-data.json` below the existing `key-value-grid`. Single action `edit-policy-detail` that opens the existing `edit-quote-policy-detail-form` modal. Gated to DRAFT + maker.

3. **Refresh the description** of the Key Data tab's `key-value-grid` to drop the now-obsolete "Maker-only edit lands in D-edit" line.

## Out of scope

- Any change to `schemas/forms/edit-quote-policy-detail-form.json` — same form, same fields, same submit endpoint.
- Any change to the ActionBar widget code.
- Any new widget or new action type.

## Components / files

### Modified

- `schemas/quote-detail.json` — three deletions.
- `schemas/tabs/quote/key-data.json` — add inline `action-bar` child + drop the stale description.

### Untouched

- `schemas/forms/edit-quote-policy-detail-form.json`
- All `*.tsx` files (no source changes).

## Design preview — Key Data tab composition

```
[key-value-grid]                                       [Edit policy details] (DRAFT+maker)
─────────────────────────────────────────────────────────────────────────────
Quote ID:        170ea9b1-...
Client:          —
Policy type:     GTL
Premium type:    ANNUAL
Line of business: GROUP
Risk term classification: YEARLY_RENEWABLE
Age definition rule: ALB
Effective date:  12/05/2026
Expiry date:     11/05/2027
Inception date:  12/05/2026
─────────────────────────────────────────────────────────────────────────────
```

## Design preview — top action-bar after the split

```
[Status badge] Draft   Client —   Policy type GTL   Headcount 198

[Send for approval] [Withdraw]                       (Maker, DRAFT)
[Approve & submit] [Clear approval] [Withdraw]       (Checker, DRAFT)
```

No `Edit` button anywhere in the top bar after this lane.

## Edge cases

1. Non-DRAFT state on Key Data tab → the action-bar's state-gating hides the Edit button; same behavior the rest of the tabs already have.
2. Non-maker role → role-gating hides the Edit button.
3. The OverlaidForm pre-fill for `edit-quote-policy-detail-form` already works for scalar entity fields (`injectRowData` is the original V1 path). No changes needed there.

## Verification

- `npx tsc --noEmit` — JSON-only changes, should be clean.
- ESLint — no source touched.
- Browser smoke: confirm the top action bar no longer shows `Edit`; confirm the Key Data tab's new Edit button opens the existing form modal pre-filled with the quote's policy details.

## Commit plan (one src commit + one context commit)

1. `feat(quote-detail): split monolithic action-bar Edit into per-tab ownership (PROP-0008)` — schemas only.
2. `docs(context): log PROP-0008 done — Quotation Detail tab expansion complete` — proposal status + SESSION_LOG entry (no ARCH_TRANSITION entry needed — this lane just retires the legacy top-Edit, no new interim contract introduced).

## Approval

~2 files modified, no source code. Estimated time-to-VERIFY: ~30 minutes.

**Awaiting explicit approval to enter BUILD.** Hard gate.
