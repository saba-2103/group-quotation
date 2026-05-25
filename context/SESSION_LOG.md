# Session Log — Group PAS V1 Frontend

This file is the running record of plans, decisions, and actions for the Group PAS V1 frontend build.
Update it before stopping work so any AI tool (or human) can pick up where we left off.

## How to use this log

- Before starting any non-trivial task, append a dated entry stating what you are about to do.
- After completing it, edit the entry with results, tests run, files touched, and next steps.
- If a task spans multiple sessions, add a continuation note rather than overwriting.
- When status of a phase or proposal changes, update [context/HANDOFF.md](HANDOFF.md) Active Workstreams in the same commit.

---

## Context

**Repo:** keystone-ui
**Branch:** feat/design-system-pass-a (current; all V1 work happens on this branch unless explicitly branched)
**Product:** Group PAS — Quotation, Issuance (Proposal + PolicyMember + Census), Policy Admin (Client/Policy/Member)
**Backend specs:** `<group-pas-repo>/spec/` — see [HANDOFF.md → Local environment](HANDOFF.md#local-environment) for how to resolve `<group-pas-repo>` on your machine.
**Backend blueprint:** `<group-pas-repo>/plans/team_nb_blueprint_v3.md`
**V1 implementation plan:** [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md)

---

## Actions taken

### 2026-05-06 — Plan locked, process scaffolding transferred

- Backend specs and blueprint reviewed; plan written at [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md) with per-task context, outputs, and acceptance criteria.
- Architecture decision: stay on existing keystone-ui schema-driven arch for V1; defer the PDF spec's `frontendProjection` pattern. State-aware actions handled via per-schema `stateActions` map + new `ActionBar` widget.
- Process scaffolding transferred from `feature/2026-05-02-auth-module-2`:
  - `.claude/skills/` — full skill set copied as-is.
  - `proposals/TEMPLATE.md` and `proposals/README.md` copied; auth-specific PROP-NNNN files intentionally left out.
  - Fresh `context/HANDOFF.md`, `context/SESSION_LOG.md` (this file), `context/CORE_MEMORY.md`, `context/ARCH_TRANSITION.md` — process preserved, contents reset for group-pas V1.
- Next: kickoff Phase 0 (teardown of legacy quotations module).

### 2026-05-22 — Cherry-pick core-arch from feat/new-buisiness to main

- **Branch:** `chore/cherry-pick-core-arch` (off `origin/main` @ `37772c00`).
- **Trigger:** the schema-design-reference docs (PR for `docs/schema-design-reference`) document widgets/hooks/utilities that exist on `feat/new-buisiness` but not on `main`. User asked for a cherry-pick PR to bring the framework-level (non-domain) infrastructure forward.
- **Multi-agent pipeline:**
  - **Survey** agent identified 32 candidate commits touching core-arch files (excluding domain widgets + mock backend).
  - **Code review** agent flagged 15+ items including: `useSmartQuery` queryKey missing `pollSchedule`/`stopWhen`, `useActionHandler` recursive dispatch with no cycle guard, `WidgetRenderer` fetching for hidden widgets, `lib/api/client.ts` Bearer token no CR/LF validation, `useDataTable.getNested` vulnerable to prototype pollution, etc.
  - **Feasibility** agent (in an isolated worktree) discovered that **many of the surveyed commits had already been forward-ported to main with subsequent refinements** — cherry-picking by SHA would have regressed main (e.g. main's `useSmartQuery.ts` has a `pollResetSignal` block that the branch lacks).
- **Strategy change:** abandon cherry-pick by SHA, do a file-level port of genuinely-new primitives with the code-review polish baked in.
- **Files brought over** (with polish): `src/lib/api/{client,error-mapper,index}.ts` (new), `src/components/layout/DetailPageSkeleton.tsx` (new), overlay `size` plumbing across `useOverlayStore`/`OverlayProvider`/`useActionHandler`/`types/widget.ts`, `WidgetRenderer` `visibleRoles` gate (before `useSmartQuery`), `schemaResolver` `tables/`/`views/` `$ref` prefixes with path-traversal validation, `useSmartQuery` array-valued params (preserving main's `pollResetSignal`), `useDataTable` `parseJson`/`dataPath` + cross-array join with `Map` index + prototype-pollution defence, type additions on `WidgetConfig`/`DataSourceConfig`/`ActionConfig`/`ColumnConfig`.
- **Deliberately NOT brought** (with reasons inline in PR body): `useRole.ts` changes (main is better — throws on missing context), navigation files (main current), `layout.tsx` (domain-coupled), `WidgetRegistry.tsx` additions (domain widgets), per-role menu key in `AppContextProvider`, domain API modules, mock backend, domain pages, 9 domain widgets.
- **Polish applied during port** (from code review):
  - Bearer token validated against JWT charset (CR/LF header-injection defence)
  - Response `JSON.parse` wrapped in try/catch — non-JSON responses become `ApiError`, not `SyntaxError`
  - `delete` REST verb instead of `del`
  - Empty-string query params preserved (only `undefined`/`null` skipped)
  - Cross-array join uses `Map` index (O(siblings) once) instead of `.find` per row
  - `getNested` uses `hasOwnProperty.call` and rejects `__proto__`/`constructor`/`prototype`
  - `$ref` filename validated against `/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.json$/` (rejects `..` and absolute paths; allows `subdir/file.json`)
  - `useOverlayStore.OverlayOptions` typed against shared `OverlaySize` union
  - `visibleRoles` evaluated before `useSmartQuery` so hidden widgets don't fetch
- **Verification:**
  - `npx tsc --noEmit` — clean
  - `npx eslint` — same 15 errors as main baseline (pre-existing `any` usage; zero regressions)
  - `npm run build` — `✓ Compiled successfully`
  - `npm test` — 5 failed suites / 92 failed tests, identical to main's pre-change baseline
- **Commit:** `4c065f87 chore(core-arch): port framework-level changes from feat/new-buisiness` (517 +, 32 −, 17 files)
- **PR:** https://github.com/Anaira-AI/keystone-ui/pull/72
- **Follow-ups:**
  - Cross-cutting consolidations flagged by code review (two error-envelope parsers, two query-param serializers, two `getNested` walkers in `useDataTable` and `KeyValueGrid`) — out of scope here; worth a follow-up cleanup PR.
  - The 13 domain widgets (`info-card`/`accordion-group`/`card-grid`/`plan-card`/`editable-table`/etc.) remain on their feature branches by design; bring them across module-scoped when needed on main.
- **Same-day related:** also pushed `50a519a6` on `docs/schema-design-reference` (the docs PR) which references feat/new-buisiness widgets and lib/api with paths so developers know where to find them until they land on main.

### 2026-05-22 — Consolidate PR #65 into PR #72 (round 2 on chore/cherry-pick-core-arch)

- **Trigger:** noticed PR #65 (`chore/v0-uplift-from-new-buisiness`) was doing substantially the same work — older, broader scope (also includes `CardGrid` + `PollingBanner` + type extensions + GIT_SAFETY docs), and had received 21 Copilot bot inline review comments. After comparing scope file-by-file, decided to consolidate on PR #72 rather than blind-close one in favour of the other.
- **Why #72 not #65:** my code-review pipeline had already excluded three regressions that Copilot independently flagged on #65 — silent `useRole` fallback, `useActionHandler` re-throw after toast, removed `useSmartQuery.pollResetSignal`. Plus #72 had polish #65 lacked: CR/LF token validation, JSON.parse try/catch on success, `delete` verb, empty-string-preserving query params, path-traversal regex on `$ref`, `WidgetRenderer.visibleRoles` evaluated before `useSmartQuery`, Map-indexed cross-array joins, prototype-pollution defence in `getNested`.
- **Round-2 commit** `51ba9be0 chore(core-arch): polish + broader scope from PR #65 — consolidate` (10 files, 368+, 30−):
  - **New files:**
    - `src/lib/objectPath.ts` — shared `getNested` with prototype-pollution defence (eliminates the duplication Copilot flagged on #65 — four near-identical copies).
    - `src/components/widgets/data/CardGrid.tsx` — ported with Copilot fix: looks up `WidgetRegistry[cardWidgetType]` once and emits a single "unknown card widget type" notice instead of N "Unknown Widget" fallbacks.
    - `src/components/widgets/state/PollingBanner.tsx` — ported with two Copilot fixes: `isMissing(0)` now returns false (zero is a present value, not pending); `pendingWhenMissing` memoized against a JSON-stable signature so the effect doesn't churn.
  - **Polish on round-1 files:**
    - `useDataTable.ts` — drop local `getNested`, import from `@/lib/objectPath`. Stabilise memo deps to scalar derivations so the resolver doesn't re-run every render when callers pass fresh inline `dataSource`/`columns`.
    - `lib/api/error-mapper.ts` — `parseSpringError` guards against non-object JSON bodies before reading `.message`.
    - `lib/api/client.ts` — `buildUrl` repeats keys for arrays (`?state=A&state=B`) matching `useSmartQuery`'s convention.
    - `DataTable/index.tsx` — consumes `dataError` so `dataPath`/`parseJson` resolver failures render the error state.
    - `WidgetRegistry.tsx` — registers `card-grid` and `polling-banner`.
  - **Type extensions:** `KeyValueField.fallbackKey` (data/types.ts); `FormFieldValue | File | null` + `FormFieldConfig.accept` (formContainer/types.ts).
- **Deliberately NOT brought from #65** (would regress main; Copilot also flagged these): silent `useRole` fallback, `useActionHandler` re-throw, removal of `pollResetSignal`, role-keyed `AppContextProvider` query (server doesn't read role + no encodeURIComponent), personal-history `GIT_SAFETY.md`/`SESSION_LOG.md` noise.
- **Verification:** `tsc --noEmit` clean; `npm run build` ✓; `npm test` 5 failed / 92 failed — identical to main's pre-change baseline. Zero new regressions.
- **Next:** close PR #65 with link to #72 as the consolidated path.

### 2026-05-25 — PR #72 review round (Copilot inline + multi-agent deep review)

- **Trigger:** user asked for review of Copilot feedback on PR #72, then for an `/ultrareview`-equivalent in-depth review.
- **Round 1 — Copilot inline comments (commit `d6fddd3b`):** three valid inline review comments addressed:
  - `src/lib/api/error-mapper.ts:3` — dropped personal `/Users/...` filesystem path from header comment.
  - `src/hooks/useDataTable.ts:175` — select-filter option derivation switched from `row[col.accessorKey]` to `getNested(row, col.accessorKey)` so dotted accessorKeys produce the same options the cells render.
  - `src/hooks/useDataTable.ts:112` — join enrichment switched from flat `enriched[accessorKey] = …` to a new `setNested` helper in `src/lib/objectPath.ts`, so dotted accessorKeys round-trip with the `accessorFn + getNested` read path. Replied inline on each thread with the commit SHA per the PR-review-replies feedback in memory.
- **Round 2 — in-depth multi-agent review (commit `42294325`):** spawned three parallel reviewers (correctness, security, architecture) against `origin/main...HEAD`. No blockers found. Landed the five high-leverage items the reviewers converged on:
  1. **`setNested` scalar-collision defence** — refuses to overwrite a non-null non-object intermediate (e.g. row `{ amount: 42 }` with join target `amount.label`). Dev-mode `console.warn` + skip preserves the original field. Return type changed `void → boolean` so callers can detect skipped writes.
  2. **`useDataTable` empty-accessorKey guard** in the join loop — defensive, since `getNested("")` returns the row but `setNested("")` is a no-op (asymmetric).
  3. **`visibleRoles` doc + dev warning** — JSDoc now explicitly states "NOT a security boundary, RBAC must be enforced server-side" and documents that `[]` means "no role can see it" (inverts the codebase's usual "empty = no constraint" convention). `WidgetRenderer` logs a dev warning when it sees an empty array — catches the "composed `[...someList]` came up empty" footgun.
  4. **`_placeholder.json` documentation** — added a paragraph to `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` explaining the Webpack dynamic `$ref`-import template needs at least one matching `.json` at build time in each `schemas/<dir>/` referenced from a `$ref` — and "do not delete the placeholder when cleaning up empty folders" (would silently break prod).
  5. **`src/tests/unit/lib/objectPath.unit.test.tsx`** — 17 unit tests for `getNested` + `setNested` covering flat/dotted round-trip, scalar-intermediate refusal, prototype-pollution rejection, empty-path handling, inherited-property safety. All passing. First tests for these primitives.
- **Verification:** `tsc --noEmit` clean; 17/17 new tests pass; full suite shows pre-existing branch failures (92 fail) unchanged by my edits — confirmed by stash-and-compare.
- **Follow-ups deliberately not committed** (worth filing as proposals if/when they bite):
  - Three parallel fetch paths (`useSmartQuery`, `useActionHandler.mutateAsync`, `lib/api/client`) need to converge on a single transport with shared auth-header handling before Keycloak lands.
  - Virtual-column model for cross-array joins (read straight from the index, no row mutation).
  - `KeyValueGrid` still has its own `getNested` — flip to `@/lib/objectPath`.
  - `useActionHandler.mutateAsync` reimplements `parseSpringError` inline.
  - `PollingBanner` stale-data flash on re-trigger (TanStack cache returns previous response for one render).
- **Commits:** `d6fddd3b` (Copilot fixes), `42294325` (multi-agent review fixes). Both pushed to `chore/cherry-pick-core-arch`. PR #72 still open.

### 2026-05-25 — Page-envelope pattern: `dataSource.select` + `fromParent`

- **Trigger:** conversation explaining the backend's CQRS model (the `group-pas` spec layout — `.command` / `.query` / `.event` / `.projection` files; `PolicySummaryDto` flattens `clientName`/`clientNumber` from the Client aggregate). User then asked for an architectural eval of `docs/schema-design-reference/` against a CQRS backend, then drilled in on recommendation #1 (page-envelope: one root fetch, children slice).
- **Eval verdict in chat:** the schema-driven framework is **structurally well-aligned** with CQRS — `dataSource` vs `ActionConfig` mirrors the backend's `query-set` vs `command-set` split, polling primitives already address read-after-write lag, `frontendProjection` evolution is already planned in [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md). Real seams (per-widget fetching encouraging N+1, URL-shaped `refreshKey` vs aggregate-shaped invalidation, `stateActions` duplicating backend authorization, manual `{{id}}` substitution, no event-stream primitive) are evolution targets, not deal-breakers.
- **Drill-in:** the recommended **page-envelope** pattern was *not* a docs-only change — `WidgetRenderer` pipes fetched data only to the widget that *owns* the `dataSource`; descendants get no inherited data path. `dataPath` today is widget-local (drills into the widget's own response), not parent-relative. Required real framework code.
- **Design eval — TanStack Query dedup vs React Context:**
  - Naive Context is *slower* than TanStack dedup unless you (a) memoise the Provider value and (b) ship `use-context-selector` for fine-grained subscription.
  - TanStack dedup loses on **silent N+1 risk** (a typo in `params` breaks dedup with no warning) and **explicitness** (no schema marker saying "I consume the ancestor envelope").
  - Picked the **hybrid**: small Context carrying only the parent's `queryKey`; children with `fromParent: true` subscribe to the same cache entry via their own `useQuery`. Loading/error granularity stays per-widget; refresh-key invalidation, polling, `stopWhen` all continue to work because it's the same cache entry.
- **Commit** `45c972f4 feat(core-arch): page-envelope pattern — dataSource.select + fromParent` (5 files, 467+, 78−):
  - **New** [src/contexts/ParentDataSourceContext.tsx](../src/contexts/ParentDataSourceContext.tsx) — `createContext<readonly unknown[] | null>(null)`. JSDoc explains the page-envelope contract.
  - **Modified** [src/types/widget.ts](../src/types/widget.ts) — `select?: string` (dotted path, applied via TanStack's `select`, memoised so structural sharing keeps unchanged slices referentially equal → no re-render on unrelated envelope updates) and `fromParent?: boolean` (subscribe to nearest ancestor's cache; documents the ignored-fields list: `api`, `valueKey`, polling, `stateDependencies`).
  - **Modified** [src/hooks/useSmartQuery.ts](../src/hooks/useSmartQuery.ts) — single `useQuery` call with branched config (queryFn throws on `fromParent` as a safety net, never reached because `enabled: false` gates it); `selectFn` memoised against the `select` string; effective queryKey returned to the renderer; dev-mode `console.warn`s for orphan `fromParent` and ignored-fields misconfigurations. Trade-off documented inline: spreading `useQuery`'s result to attach `queryKey` defeats TanStack's tracked-queries optimisation — at most one extra re-render per polling tick at page-detail scale; acceptable, revisit if a hot widget profiles badly.
  - **Modified** [src/components/registry/WidgetRenderer.tsx](../src/components/registry/WidgetRenderer.tsx) — wraps the rendered component in `ParentDataSourceContext.Provider` only when this widget owns its fetch (`api && !fromParent`); `fromParent` widgets are transparent so the context naturally falls through to the real ancestor → implicit "nearest ancestor with a dataSource" semantics with no extra plumbing.
  - **New tests** [src/tests/unit/lib/useSmartQuery.parentEnvelope.unit.test.tsx](../src/tests/unit/lib/useSmartQuery.parentEnvelope.unit.test.tsx) — 8 tests: full payload when select omitted, dotted-path slice extraction, undefined for unresolved paths, fromParent does not call fetch (global.fetch spy), orphan warning, ignored-fields warning, queryKey exposure for both fromParent and own-fetch widgets.
- **Verification:** `tsc --noEmit` clean (one fix during dev: cast `select`'s return back to `any` so `data` doesn't narrow from `any` to `unknown` and break string-indexed access at every existing call site — `getNested` returns `unknown` and TanStack infers TData from select's return); full `npm test` shows 145 → 153 passing (+8 new), 92 → 92 failing (pre-existing branch state unchanged; verified by stash-and-compare); ESLint on changed files clean for code I introduced (8 pre-existing `any` errors in untouched lines).
- **Schema example unlocked:** one root `dataSource` on a `stack-layout`, children declare `dataSource: { fromParent: true, select: "<slice>" }`. One HTTP fetch, N slice-scoped subscribers, per-subscriber re-renders only when their slice's reference changes.
- **Status:** committed locally on `chore/cherry-pick-core-arch` (1 ahead of origin, **not pushed**). User did not ask for a push.
- **Follow-ups worth filing as proposals if they come up:**
  - Promote the page-envelope pattern to default story in [docs/schema-design-reference/04-data-sources.md](../docs/schema-design-reference/04-data-sources.md) — it's currently undocumented post-commit. Lives on the `docs/schema-design-reference` branch, not here.
  - Aggregate-shaped `refreshAggregates` alongside the URL-shaped `refreshKey` so a mutation can invalidate "the Policy aggregate" without listing every projection URL.
  - Pushing `{{id}}` substitution into `useSmartQuery` (already mentioned in the data-sources doc as proposed) — removes the per-page walker and aligns with how `fromParent` works (framework-resolved, not page-resolved).
