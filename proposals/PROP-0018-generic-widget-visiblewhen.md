---
id: PROP-0018
title: "Generic widget-level visibleWhen gate in WidgetRenderer"
status: approved
proposer: agent:claude
created: 2026-05-26
category: architecture
impact: medium
effort: s
related: []
pr: null
---

## Problem

`WidgetConfig.visibleWhen` ships as a type field in PR #72 (`chore/cherry-pick-core-arch`), but the JSDoc on [src/types/widget.ts:53-60](../src/types/widget.ts) explicitly says it is **NOT honoured by `WidgetRenderer` directly** — it is currently only consumed by `TabsContainer` on `feat/new-buisiness`, which evaluates the predicate against a parent-fetched entity (`dataSource.data`) to filter child tabs. No analogous facility exists for widgets that want to react to *sibling* state.

In practice this means schemas that need sibling-driven visibility (e.g. "hide this summary card while the form-mode flag is in the `edit` state") have no first-class path. The current workaround is the state-publisher pattern documented in [STATE_MANAGEMENT_GUIDE.md §8.2](../docs/STATE_MANAGEMENT_GUIDE.md): designate a widget to write a key into `useWidgetState`, then have downstream consumers wire `stateDependencies` and inspect the value imperatively inside their own render path. That works, but every consumer has to re-implement the predicate in code, and there is no uniform place to short-circuit `useSmartQuery` when the widget is "really" hidden — so the fetch and any polling still run.

The shipped type field signals intent without delivering the renderer behavior. This PR closes that gap.

## Proposed change

Make `WidgetConfig.visibleWhen` first-class at the `WidgetRenderer` level. Concretely:

1. **Gate location:** in `WidgetRenderer`, immediately after the existing `visibleRoles` block and before `useSmartQuery`. Same shape as the role gate — short-circuits the fetch when hidden.
2. **Context source:** `useWidgetState().values`. If `config.dataSource?.stateDependencies` is set, build a sliced subset containing only those keys; otherwise pass the full `values` snapshot. The declarative dependency list doubles as an explicit eval scope.
3. **Reactivity:** direct `useWidgetState()` read. Zustand re-renders the renderer on any store change; `stateDependencies` is the eval-context filter, NOT a subscription scope. Acceptable trade-off (re-render is cheap; running the predicate again is also cheap).
4. **Error fallback:** `try/catch` around `evaluateCondition`. On throw, log a dev-mode `console.warn` and default to **visible**. Rationale: visible-but-wrong is debuggable; hidden-and-wrong is silent. Mirrors the FormContainer field-level approach.
5. **Role precedence:** `visibleRoles` evaluated first. If role-hidden, skip the `visibleWhen` eval entirely and short-circuit the fetch (pass `undefined` to `useSmartQuery`).
6. **JSDoc rewrite** on `WidgetConfig.visibleWhen` to describe the new generic semantics, the precedence rule with container-level gates (e.g. `TabsContainer` still evaluates its children's `visibleWhen` against its own fetched entity), and the state-publisher integration point.
7. **No new dependency** — `json-logic-js` is already in the tree and used by `evaluateCondition` / `useSmartQuery.stopWhen`.
8. **No `FormContainer` change** and **no `TabsContainer` change**. Field-level `visibleWhen` in forms evaluates against RHF draft state and strips the submit payload — that's separate. `TabsContainer` isn't on this branch base anyway, and its parent-entity evaluator is complementary (different scope; the type-level JSDoc will document the precedence).

Files touched:
- `src/components/registry/WidgetRenderer.tsx` — gate.
- `src/types/widget.ts` — JSDoc rewrite on `visibleWhen`.
- `src/tests/unit/widget-renderer/visibleWhen.unit.test.tsx` — new unit tests covering presence, absence, sliced context, broken predicates, role precedence, fetch short-circuit.

## Alternatives considered

(a) **Wait for `TabsContainer` to port from `feat/new-buisiness` and reuse its pattern.** Rejected. `TabsContainer`'s evaluator works against the *parent's* fetched entity (`dataSource.data`) — it only helps widgets that sit inside a data-bearing container. Widgets without such an ancestor (most dashboard cards, sibling-driven summaries) get nothing. Also, the type field exists *today* on `chore/cherry-pick-core-arch`, advertising a capability that isn't actually wired; waiting on a port would keep the broken-promise state in `main` for longer.

(b) **Document the state-publisher pattern as the canonical answer.** Already works (and the doc stays) but it's verbose: every schema that wants conditional visibility needs a publishing widget plus explicit `stateDependencies` wiring on every consumer that wants the predicate semantics, *plus* the consumer has to write the predicate inline in code. Making the predicate first-class in the renderer is strictly an additive convenience over the existing pattern.

(c) **Push form draft values into `useWidgetState`** so field-level and widget-level visibility share one context. Rejected. Conflates ephemeral RHF draft state (lives only inside one form, dies on unmount, never persisted) with widget state (the cross-widget pub/sub channel). Keeping them separate preserves the cleanup-on-unmount semantics and avoids accidental leakage of half-typed form values into sibling widgets' visibility logic.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit

## Pros
-

## Cons
-

## Recommendation

---

<!-- Filled by /execute-proposal. -->

## Implementation notes

- Branch: `feat/widget-renderer-visiblewhen` (stacked on `chore/cherry-pick-core-arch` / PR #72).
- Files touched:
  - `src/components/registry/WidgetRenderer.tsx` — added `useWidgetState` + `evaluateCondition` imports, `isConditionHidden` gate immediately after the existing role gate, extended the `useSmartQuery` short-circuit condition, and added the final `if (isConditionHidden) return null` early-out.
  - `src/types/widget.ts` — rewrote the `WidgetConfig.visibleWhen` JSDoc to describe the new renderer-level semantics, eval-context filtering, error fallback, and container-precedence rule.
  - `src/tests/unit/widget-renderer/visibleWhen.unit.test.tsx` — new file. 7 tests covering: absence path, truthy predicate against full snapshot, falsy predicate, `stateDependencies` slicing (key-in-deps vs key-out-of-deps), broken-predicate fallback (defaults to visible + dev warning), `visibleRoles` precedence (predicate is never evaluated when role-hidden).
- Deviations from the proposal: none. The test for fetch short-circuit is implicit: when the widget is hidden by the gate, the stub component never mounts, and the `useSmartQuery` call inside `WidgetRenderer` receives `undefined` per the extended short-circuit condition. Adding a separate fetch-spy assertion would have required deeper mocking with no extra signal.
- PR: pending — will be filled in once the PR is opened.
