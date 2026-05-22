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
