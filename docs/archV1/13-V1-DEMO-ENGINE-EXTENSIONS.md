# V1 Demo — Engine Extensions to Analyse

**Status:** Notes — to be reviewed against archV1 freeze decisions.
**Date:** 2026-05-07
**Audience:** Frontend platform reviewers; the next AI/engineer touching the widget engine.

## Purpose

While building the Group PAS V1 demo on the existing keystone-ui schema-driven engine, several small extensions were made to the runtime, widgets, and contract layer. They are tactical and ship-with-the-demo by intent — none of them required architectural review at the time, and most are documented in `context/ARCH_TRANSITION.md` with a convergence trigger.

This document collects them in one place so an architecture review against archV1 can:

1. Decide which extensions belong in the schema language going forward.
2. Decide which should retract once archV1 ships first-class equivalents.
3. Surface implicit assumptions that the demo-time fast path baked in.

**Cross-references:**
- `context/ARCH_TRANSITION.md` — interim contracts with risks + convergence triggers.
- `context/CORE_MEMORY.md` — V1 scope-locks and reference-doc precedence.
- `docs/group-pas-v1-plan.md` — the plan these extensions were built against.

---

## 1. `useSmartQuery` — backoff polling + stop predicate

**What:** `DataSourceConfig` gained two fields:

- `pollSchedule?: { initialIntervalMs, initialDurationMs, fallbackIntervalMs, maxDurationMs? }`
- `stopWhen?: VisibilityCondition`

`useSmartQuery` consumes them via TanStack's function-form `refetchInterval`, switching from `initialIntervalMs` to `fallbackIntervalMs` after `initialDurationMs` and halting either at `maxDurationMs` or once `stopWhen` evaluates truthy against the latest data. A `STANDARD_POLL_SCHEDULE` constant in `src/lib/polling.ts` (2s for 10s, then 5s out to 60s) is the single tuning point used by every consumer.

**Why:** Backend confirmed the suggested cadence for async transitions; the Pricing tab and the send-for-issuance → PAM Member visibility flow both need it.

**For archV1 review:**
- Is "schedule + stop predicate on every dataSource" the right shape, or should this become a named workflow primitive (`waitFor`, `pollUntil`)?
- The current shape leaks polling concerns into every screen schema that needs an async transition. A dedicated `async-transition` widget could absorb this.
- `stopWhen` uses the same `VisibilityCondition` shape as `visibleWhen`. Consistent — but archV1's structural conditional rendering may want a sharper distinction between "is this visible" and "have we reached a steady state".

**Files:** `src/hooks/useSmartQuery.ts`, `src/types/widget.ts`, `src/lib/polling.ts`.

---

## 2. ActionBar widget — state × role × overlay gating

**What:** `src/components/widgets/actions/ActionBar.tsx` registered as `"action-bar"`. Three gating layers (state → role → V1 maker-checker approval-lock). Reads live entity from three sources in priority order:

1. `useWidgetState({ stateKey })` — sibling-published state slot.
2. `useSmartQuery(config.dataSource)` — self-fetch when the widget config carries a dataSource. React Query dedupes across siblings sharing the same key.
3. Literal `state` / `awaitingApproval` props.

Disabled buttons render through `<Tooltip>` with the gating reason. Special action ids `'send-for-approval'` / `'clear-approval'` short-circuit `useActionHandler` and call `@/lib/maker-checker` helpers directly.

**Why:** Every detail page needs uniform state-aware actions; without this, each page re-implements the gating.

**For archV1 review:**
- The "self-fetch via dataSource" path was added to avoid building a parent state-publisher widget. archV1's first-class derived view-model transforms (per `00-SYSTEM-DESIGN.md`) likely supersede this — the action bar should consume a derived selector, not run its own fetch.
- The role layer (`useRole`) is **UI-only for V1** (no Keycloak in scope-locks). The action bar's role gating should plug into archV1's auth contract once it lands; the convention `roleActions: Record<role, actionId[]>` is a deliberately minimal stand-in.
- The maker-checker special action ids hardcode `'quote' | 'proposal'`. Once backend-enforced approval ships, these short-circuits and `maker-checker.ts` get deleted. See `ARCH_TRANSITION.md → "Maker-checker UI overlay"`.
- Action `props.entityType` + `props.entityId` are loose strings on the schema. archV1's entity-aware schema probably should make these structural, not free-form.

**Files:** `src/components/widgets/actions/ActionBar.tsx`, registered in `src/components/registry/WidgetRegistry.tsx`.

---

## 3. Widget dataSource auto-fetch (ActionBar + ReasonBanner)

**What:** Both `ActionBar` and `ReasonBanner` accept an optional `config.dataSource` and call `useSmartQuery` themselves. The fetched entity is then used as the source for `state` / `awaitingApproval` / `pendingReason` / `voidReason` / `cancellationReason` when no `stateKey`-published state is found.

**Why:** Detail pages need multiple widgets reading the same entity (header summary, action bar, reason banner). Without a state-publisher widget pattern, the simplest path was for each consumer to fetch via the same key — React Query dedupes the network request automatically.

**For archV1 review:**
- This pushes data-fetching responsibility into presentational widgets. archV1's "widget-owned data fetching" friction is one of the explicit motivations for the new architecture (see `README.md`). A clean state-publisher pattern (or the derived view-model transform) should replace this.
- React Query's dedupe is invisible — a future maintainer might think there are N requests for one entity. This is a documentation gap waiting to bite.
- Convention: when `stateKey`-published state exists it wins over the self-fetched data. This is brittle if both are stale at different rates.

**Files:** `src/components/widgets/actions/ActionBar.tsx`, `src/components/widgets/state/ReasonBanner.tsx`.

---

## 4. CellRenderer — `state-badge` and `awaiting-approval` cell types

**What:** `CellRenderer.tsx` got two new column types:

- `state-badge` — delegates to the `StateBadge` widget with the column's `entity` prop. Shares copy + variant from `state-map.ts` so list cells and detail headers stay in sync.
- `awaiting-approval` — small `warning` chip when the value is truthy.

`ColumnConfig` gained `entity?: string`.

**Why:** Repeating valueMapping JSON in every list column for the 38 enum values was the alternative. A canonical map keeps copy DRY.

**For archV1 review:**
- The "delegate to a registered widget" pattern for cell types is a reasonable bridge. archV1's structural conditional rendering may want columns to be full widgets, not pre-baked types.
- `state-map.ts` is currently centralised in the widgets folder. archV1 may prefer it co-located with the entity schemas.

**Files:** `src/components/widgets/data/CellRenderer.tsx`, `src/components/widgets/data/DataTable/types.ts`.

---

## 5. Role context as global state

**What:** `RoleProvider` (in `src/contexts/RoleContext.tsx`) — React context backed by `localStorage` (key `group-pas:current-role`). Hydration-safe (SSR sees the default; effect upgrades to the stored value on first client render). Consumed via `useRole()` and exposed in the schema layer via the `role-switcher` widget plus the `roleActions` prop on `ActionBar`.

**Why:** V1 scope-locks rule out backend auth; the demo still needs to show maker → checker hand-off. The role switcher is the V1-only stand-in.

**For archV1 review:**
- This entire layer goes away once Keycloak ships. The `useRole()` hook should be replaced by the auth contract's role-claims reader without changing call sites in `ActionBar`.
- `STORAGE_KEY = 'group-pas:current-role'` ties the role layer to this product — fine for V1, but the namespace should move to a shell-wide convention as soon as another module needs roles.
- The `role-switcher` widget is registered in `WidgetRegistry` but only mounted in `app/layout.tsx`. archV1 should decide whether the shell or the schema owns top-bar slots.

**Files:** `src/contexts/RoleContext.tsx`, `src/hooks/useRole.ts`, `src/components/widgets/role/RoleSwitcher.tsx`, `src/lib/maker-checker.ts`.

---

## 6. Mock layer — `awaitingApproval` UI overlay routes

**What:** Two non-DSL mock routes per entity:

- `POST   /api/quotation/quotes/:id/awaiting-approval`
- `DELETE /api/quotation/quotes/:id/awaiting-approval`

(plus the proposal pair). Mutates the in-memory `MockQuote / MockProposal` store fields and is exposed via `MockQuoteDto / MockProposalDto` so the client can poll the same endpoint and see the flag.

**Why:** Backend has no maker-checker model in V1; the UI-only overlay needs somewhere to persist the flag.

**For archV1 review:**
- These routes have **no DSL counterpart**. They will 404 against the real backend the moment `GROUP_PAS_BACKEND_URL` is set. Delete cleanly when V1 maker-checker lands.
- Mixing UI-only flags into the wire DTOs (via the `MockXxxDto` extensions) is convenient for the demo but bad hygiene. archV1's schema language should express UI-overlay state as a derived view-model field, not a wire DTO field.

**Files:** `src/app/api/quotation/[[...path]]/route.ts`, `src/app/api/issuance/[[...path]]/route.ts`, `src/lib/api-mock/group-pas/store.ts`, `src/lib/api-mock/group-pas/dtos.ts`, `src/mocks/group-pas/quotation/quotes.ts`.

---

## 7. State-driven sibling pattern (interim)

**What:** Several detail-page schemas use the dual-sibling pattern from `STATE_MANAGEMENT_GUIDE.md §8.3` (editable form vs read-only key-value-grid, gated by `visibleWhen`) instead of a single form with a `disabledWhen` per field. The Quote detail tabs in particular render read-only key-value-grids for V1 demo tabs that the plan ultimately wants editable.

**Why:** `disabledWhen` on `FieldConfig` doesn't exist yet — `WidgetRenderer` would need to thread parent context to children to evaluate it. Out of scope for the demo build.

**For archV1 review:**
- Recorded already in `context/ARCH_TRANSITION.md → "Form-level disable via dual sibling widgets"` and in the V1 plan's "Future widget-engine cleanups" section.
- archV1's structural conditional rendering should make this trivial; the convention to retire is "two siblings + visibleWhen".

---

## 8. Composite cells deferred — two-column rendering

**What:** Where the V1 plan called for a composite "state + reason" cell (e.g. on the policy → members tab), the actual implementation renders state and reason as two separate columns.

**Why:** Adding a `composite` cell type would have been ~20 LOC of CellRenderer extension; saved for archV1.

**For archV1 review:** Recorded in `context/ARCH_TRANSITION.md → "Composite cells deferred"` and the plan's future-cleanups section. archV1 widgets-as-cells supersede this.

---

## 9. `stateDependencies` on dataSource — filter-bar → data-table wiring

**What:** Already supported by `useSmartQuery` before this work; explicitly used by the Quote list page. Schema:

```json
{ "stateDependencies": ["quote-list-filters"] }
```

The named slot is published by the `filter-bar` widget; `useSmartQuery` merges its values into the URL on the next fetch.

**Why:** Standard cross-widget state plumbing — the right pattern; not new.

**For archV1 review:**
- This is the closest existing primitive to a "derived view-model" — any archV1 abstraction over cross-widget state should subsume this without breaking it.
- Naming is loose: nothing today validates that `quote-list-filters` exists. archV1's structural typing of state slots would catch typos.

---

## Summary table

| # | Extension | Layer | Convergence |
|---|---|---|---|
| 1 | `pollSchedule` + `stopWhen` | runtime + widget config | replace with workflow `pollUntil` primitive |
| 2 | `ActionBar` (state × role × overlay gating) | widget | keep; rebind to archV1 auth contract; drop maker-checker special-cases |
| 3 | dataSource auto-fetch in `ActionBar` / `ReasonBanner` | widget | replace with state-publisher / derived view-model |
| 4 | `state-badge` / `awaiting-approval` cell types | widget | reconsider once cells can be widgets |
| 5 | `RoleProvider` + `useRole` + `role-switcher` | shell + widget | delete once Keycloak claims are available |
| 6 | UI-only `/awaiting-approval` mock routes | mock + dto | delete once backend maker-checker lands |
| 7 | dual-sibling form-vs-readonly | schema convention | replace with `disabledWhen` on FieldConfig |
| 8 | two-column "state + reason" rendering | schema convention | replace with `composite` cell or widget cells |
| 9 | `stateDependencies` (pre-existing) | runtime | absorb into archV1 cross-widget state |

Each row should land as either an explicit kept-for-archV1 decision or a planned removal during the migration.
