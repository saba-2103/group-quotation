# 14 — Implementation Execution Plan (Layered, Multi-Agent)

> Companion to `08-MIGRATION-PLAN.md`. That doc is the canonical phased migration plan written from the platform team's perspective. **This doc is the work-breakdown for the first concrete build pass**, organized so multiple AI coding agents can pick up parallel tracks without blocking each other.
>
> Per-track briefings — the actual prompts handed to each AI agent — live under [`docs/archV1/tracks/`](./tracks/). This doc is the overview; the briefings are the execution-ready specs.

## Context

We are building the archV1 runtime now. To keep scope honest:

- **Schema delivery and materialization are out of scope for this pass.** Schemas continue to live in `/schemas/` and are served exactly as today via `src/lib/schemaResolver.ts`. Do not touch the resolver. (`12-ARCHITECTURE-FREEZE-DECISIONS.md` § 5.)
- **Authoring/linting tooling is deferred.** TypeScript types + runtime asserts are sufficient for the first cut. The full lint suite from `06-AUTHORING-LINT-AND-REVIEW.md` lands after the runtime is alive.
- **SSR / server hydration is deferred.** Browser-only runtime, per `02-RUNTIME-GRAPH-AND-CONTEXT.md` § "SSR And Hydration Position".
- **Maker-checker UI overlay (the demo's `src/lib/maker-checker.ts`) is deferred.** It does not become a first-class runtime primitive in this pass. Treat it as legacy code that will be deleted when the backend approval model ships. Do not extend it; do not depend on it from any new track.
- **Runtime inspector / devtools is deferred** to a later phase (`08-MIGRATION-PLAN.md` Phase 4). Tracks should still emit structured console logs at boundaries so that a future inspector can hook in, but no inspector UI in this pass.

What we **are** building, in order:

1. **Layer 1 — Runtime.** Code that reads a v1 schema and renders/operates a working page (workspace setup, types, graph, conditions/transforms/i18n, request-policy client, hydrator, action engine with access enforcement, workflow engine, widget renderer, error surfaces, two staged pilots).
2. **Layer 2 — Schema port.** Convert the existing 26 schemas under `/schemas/` to v1 shape, one domain at a time.
3. **Layer 3 — Delivery & materialization (later).** Out of scope here.

The current repo already has useful raw material: widgets under `src/components/widgets/`, a JSONLogic evaluator at `src/lib/conditions.ts`, a schema resolver at `src/lib/schemaResolver.ts`, an API client under `src/lib/api/`, mocks under `src/lib/api-mock/` and `src/mocks/`, a registry under `src/components/registry/`, and a native toast component (commit `32efd3a`). **Reuse aggressively — do not greenfield what already exists.** Where two paths look reasonable, the per-track briefing makes the call.

---

## Pre-Decided Technical Choices

These decisions are locked before any track starts. AI agents must follow them; do not "escalate" or pick alternatives.

| Decision | Choice | Why |
|---|---|---|
| Graph store implementation | **Zustand** (`zustand@^4`) | Already battle-tested; smallest API surface; easy subscription scoping. Do not write a custom store. |
| Type-validation library at boundaries | **`zod`** | Use for schema load + API response shape checks. Not for internal cross-module types (use TS only there). |
| Test runner | **Vitest** with `@testing-library/react` | Matches existing repo setup. Test files live next to source as `*.test.ts(x)`. |
| E2E test runner | **Playwright** | Repo already has `test-results/` directory. Smoke specs go in `e2e/runtime/*.spec.ts`. |
| Module location for the runtime | **`src/lib/runtime/`** | All Layer 1 code lives here. One subdirectory per track (`graph/`, `expr/`, `actions/`, etc.). |
| Barrel exports | **Wildcard re-export per subdir** — `export * from './graph'` etc. in `src/lib/runtime/index.ts`. Each subdir owns its own `index.ts`. No track edits any other track's barrel. | Eliminates merge conflict on the root index. |
| Existing widgets | **Wrap, do not refactor in this pass.** Track 8 introduces a `WidgetDefinition` adapter that lets existing `src/components/widgets/*` widgets register against the new contract with a thin shim. Refactoring widget internals (e.g., removing widget-owned fetches) is **Layer 2 per-schema work**, not Layer 1. | Keeps Layer 1 focused on runtime, not widget rewrites. |
| Translation strings in pilot | **English-only literal fallback** is acceptable; `$t` resolver returns the key if no translation table exists. Full i18n catalog is out of scope. | The runtime hook must exist so schemas can be authored against it; production catalogs come later. |
| Schema versioning at load | **Runtime accepts `1.x.x` only** in this pass. Any other version is a hard reject with a clear error. | Per `11-SCHEMA-VERSIONING.md`, runtime supports current major + previous; there is no previous major yet. |

---

## Layer 1: Tracks

11 tracks. Foundation tracks (0, 1, 2) unblock everyone else. Parallel tracks (3–9) start once their listed deps land. Integration tracks (10a, 10b) wire everything together in two stages.

Each track below is a one-paragraph summary. The execution-ready briefing for an AI agent is at the linked path.

### Track 0 — Workspace Scaffold  [FOUNDATION]  → [`tracks/00-workspace-scaffold.md`](./tracks/00-workspace-scaffold.md)

Create the `src/lib/runtime/` directory with one empty subfolder per subsequent track, each with a barrel `index.ts`. Wire `src/lib/runtime/index.ts` to wildcard-re-export every subfolder. Add a shared fixtures folder `src/lib/runtime/__fixtures__/` with stubs. Add a `vitest` config entry pointing at `src/lib/runtime/**/*.test.ts` if one isn't already present. **Owners:** 1 agent. **Depends on:** nothing. **Deliverable:** empty scaffold that compiles and runs an empty test suite.

### Track 1 — Schema Contracts, Types, & Version Validator  [FOUNDATION]  → [`tracks/01-schema-types.md`](./tracks/01-schema-types.md)

TypeScript types for the v1 schema language, plus a `zod` schema for boundary validation, plus a `validateSchemaVersion(version: string): { ok: true } | { ok: false; reason: string }` runtime check that rejects anything outside `1.x.x` with a clear error. Also exports the test-harness contracts (`MockGraphProvider`, `createTestSnapshot`, `executeActionForTest`) as empty interfaces filled in by later tracks. **Owners:** 1 agent. **Depends on:** Track 0. **Deliverable:** all types in `src/lib/runtime/types/`; one passing test that loads the fixture schema and validates its version.

### Track 2 — Runtime Graph Provider (4 scopes + persistence)  [FOUNDATION]  → [`tracks/02-runtime-graph.md`](./tracks/02-runtime-graph.md)

The four-scope graph (`system`, `app`, `page`, `flow`) backed by Zustand. Path-level reads (`useGraphPath`), batch reads (`useGraphSnapshot`), namespace-scoped writes (`registerNamespace`, `writePath`), Single Writer enforcement at write time (throws in dev, structured-logs in prod), `app.*` `localStorage` persistence honoring `clearOn` triggers (`logout`, `roleChange`, `orgChange`, `schemaVersionChange`). Exports the typed `RuntimeGraph` interface that every other track consumes. **Owners:** 1 agent. **Depends on:** Tracks 0, 1. **Deliverable:** provider mounts; round-trip path reads/writes work; SWR violation throws; `clearOn=logout` empties `app.*`.

### Track 3 — Conditions, Transforms, Translations & Locale  [PARALLEL]  → [`tracks/03-conditions-transforms-i18n.md`](./tracks/03-conditions-transforms-i18n.md)

Pure evaluator over a graph snapshot. Exports `evaluateCondition`, `evaluateBinding`, `applyTransform`, `resolveTranslation`, `formatLocale`. Wraps (not rewrites) `src/lib/conditions.ts` for JSONLogic. Implements the 11 bounded transform operators: `map`, `filter`, `pick`, `pluck`, `join`, `coalesce`, `formatDate`, `formatCurrency`, `switch`, `groupBy`, `count`. `formatDate` / `formatCurrency` read `system.locale`. `resolveTranslation(key, locale, count?)` returns the key as fallback when no catalog. **Owners:** 1 agent. **Depends on:** Track 1. **Deliverable:** one signature-stable export module with full unit-test coverage per operator and per condition key.

### Track 4 — API Client & Request Policies  [PARALLEL]  → [`tracks/04-api-policy-client.md`](./tracks/04-api-policy-client.md)

`PolicyClient` with `executePolicy(policyName, request)`. Loads policies from a schema's `requestPolicies` block. Injects per-mutation `Idempotency-Key` (UUIDv4) and per-pipeline `X-Correlation-Id`. Handles 401 refresh once. Wraps the existing `src/lib/api/` client without breaking its current consumers. Exports `RequestPolicyClient` interface and `ApiError` shape consumed by Tracks 5, 6, 9. **Owners:** 1 agent. **Depends on:** Track 1. **Deliverable:** policy executor + tests against `src/lib/api-mock/`.

### Track 5 — Namespace Hydrator  [PARALLEL]  → [`tracks/05-namespace-hydrator.md`](./tracks/05-namespace-hydrator.md)

`HydrationOrchestrator` that builds a DAG over namespace dependencies, fetches in topological order via `PolicyClient`, writes into the graph via `RuntimeGraph.writePath`, and honors `onHydrationFailure` (`block` halts dependents and surfaces error; `warn` continues + toast; `silent` continues no UI). Exports `invalidateNamespace(id)` and `hydrationStatus$(id)` (Track 6 listens). **Owners:** 1 agent. **Depends on:** Tracks 2, 4. **Deliverable:** two-namespace fixture hydrates in correct order; failure modes covered.

### Track 6 — Action Engine + Access Enforcement  [PARALLEL]  → [`tracks/06-action-engine.md`](./tracks/06-action-engine.md)

Executes `ActionPipeline`: all step types (`setState`, `patchState`, `apiMutation`, `apiRead`, `invalidateNamespace`, `navigate`, `emitEvent`, `guard`, `confirm`, `resetNamespace`). Honors `onSuccess`/`onFailure` and per-`apiMutation` `failureMode` (`block` / `warn-only` / `continue` / `rollback-and-stop`). **Enforces access policy** — before step 1 runs, checks the action's allowed roles against `system.user.role`; if denied, fires `accessDenied` event and skips the pipeline. Snapshots graph state at pipeline start for rollback. Exports `runPipeline(pipelineId, eventPayload)` and the `ErrorContext` shape consumed by Track 9. **Owners:** 1 agent. **Depends on:** Tracks 2, 3, 4 (5 helpful, not required to start). **Deliverable:** every step type unit-tested; a `patchState → apiMutation → invalidateNamespace → navigate` pipeline runs end-to-end; access denial blocks correctly.

### Track 7 — Workflow Engine  [PARALLEL]  → [`tracks/07-workflow-engine.md`](./tracks/07-workflow-engine.md)

Executes workflow state machines. State stored under `flow.<workflowId>.*` via `RuntimeGraph.writePath` (no direct mutation). On `emitEvent(trigger)`, finds matching transition from current state, evaluates `when` guard, calls `exitActions` → `effects` → `entryActions`. Logs a warning when an `apiMutation` step is not followed by `invalidateNamespace` or `apiRead` unless `reconciliation: "optimistic"` is declared. **Owners:** 1 agent. **Depends on:** Tracks 2, 6. **Deliverable:** add-member workflow from `04-WORKFLOWS-AND-STATE-MACHINES.md` § "Add Member Example" runs `draft → submitted → underReview → approved` against mocks.

### Track 8 — Widget Registry, Renderer, & Accessibility Utilities  [PARALLEL]  → [`tracks/08-widget-registry-renderer.md`](./tracks/08-widget-registry-renderer.md)

`WidgetRegistry` accepts `WidgetDefinition` registrations. `<SchemaRenderer schemaId>` walks the schema's `widgetTree`, evaluates each node's `visibleWhen`/`enabledWhen`/`editableWhen`/`requiredWhen`/`mountWhen`, resolves bindings via Track 3, mounts widgets as fresh instances when `mountWhen` flips true, and wires widget `emit(eventName, payload)` to `runPipeline` from Track 6. Exports `useWidgetGraph(bindings)` and `announce(message, priority)` for widgets. Provides a thin adapter so existing `src/components/widgets/*` can register without refactor. **Owners:** 1 agent. **Depends on:** Tracks 1, 2, 3, 6. **Deliverable:** fixture schema renders; `mountWhen=false` fully unmounts and re-mounts fresh; an emitted event runs an action.

### Track 9 — Error Surfaces & Validation Mapping  [PARALLEL]  → [`tracks/09-error-surfaces.md`](./tracks/09-error-surfaces.md)

`ErrorSurfaceRegistry` with three built-ins: `toast` (reuses commit `32efd3a` native toast), `banner` (new component in `src/components/runtime-banner/`), `modal` (reuses `src/components/ui/` Dialog). Consumes `ErrorContext` from Track 6. Implements `validationMap` that takes a backend validation envelope (`{ errors: [{ path: "members[0].dob", message: "…" }] }`) and routes each error to the widget bound to that path via `validationState` prop. **Owners:** 1 agent. **Depends on:** Tracks 6, 8. **Deliverable:** a `block` mutation lights up the bound form widget's `validationState`; a `warn-only` failure raises a toast.

### Track 10a — Read-Only Pilot  [INTEGRATION, EARLY]  → [`tracks/10a-readonly-pilot.md`](./tracks/10a-readonly-pilot.md)

The first integration check, staged early to catch graph + hydrator + renderer issues before workflow complexity piles on. A new v1 schema for a read-only policy detail page (no actions, no workflows). Mounts the runtime provider, hydrates two namespaces, renders a widget tree with `visibleWhen` and one derived transform. **Owners:** Track 8 agent + light support from Tracks 2, 3, 5. **Depends on:** Tracks 1, 2, 3, 5, 8. **Deliverable:** the route loads against mocks; a Playwright smoke spec at `e2e/runtime/readonly-pilot.spec.ts` passes via `yarn test:e2e -- readonly-pilot`.

### Track 10b — Full Workflow Pilot  [INTEGRATION, LATE]  → [`tracks/10b-workflow-pilot.md`](./tracks/10b-workflow-pilot.md)

Layer the add-member workflow on top of the 10a pilot. Adds `actions`, `workflows`, `requestPolicies`, and a form with backend-mapped validation errors. **Owners:** Track 8 agent + light support from all other tracks. **Depends on:** Track 10a + Tracks 4, 6, 7, 9. **Deliverable:** the route completes `draft → submitted → underReview → approved` against mocks; smoke spec at `e2e/runtime/workflow-pilot.spec.ts` passes; field-level validation error from a mock 422 lights up the bound widget.

### Layer 1 Dependency Graph

```
Track 0 ──► Track 1 ──┬─► Track 2 ──┬────────────────┐
                      │             │                │
                      ├─► Track 3 ──┼──► Track 6 ─┬─► Track 7 ──┐
                      │             │             │             │
                      ├─► Track 4 ──┼─► Track 5 ──┘             ├─► Track 10b
                      │             │                           │
                      └─────────────┴─► Track 8 ──► Track 10a ──┤
                                                                │
                                              Track 9 ─────────►┘
                                            (deps: 6, 8)
```

**Critical path:** 0 → 1 → 2 → 3 → 6 → 7 → 10b. Track 8 + Track 10a is the shortest path to a visible result and should be prioritized for confidence.

**Suggested agent shape:** 1 coordinator agent (handles Tracks 0, 1, 10a, 10b) + 4 worker agents picking up two tracks each from the parallel set. Coordinator merges in track-completion order and runs the integration after each.

### File Ownership (No Cross-Track Writes)

Each track owns exactly one subdirectory under `src/lib/runtime/`. No track edits another track's directory. The root `src/lib/runtime/index.ts` is a wildcard barrel — Track 0 writes it once, no other track touches it.

| Track | Owned directory |
|---|---|
| 0 | (creates all directories + root barrel) |
| 1 | `src/lib/runtime/types/` |
| 2 | `src/lib/runtime/graph/` |
| 3 | `src/lib/runtime/expr/` |
| 4 | `src/lib/runtime/api/` |
| 5 | `src/lib/runtime/hydrate/` |
| 6 | `src/lib/runtime/actions/` |
| 7 | `src/lib/runtime/workflow/` |
| 8 | `src/lib/runtime/render/` + `src/components/runtime-renderer/` |
| 9 | `src/lib/runtime/errors/` + `src/components/runtime-banner/` |
| 10a | `e2e/runtime/readonly-pilot.spec.ts` + one schema file + one route file |
| 10b | `e2e/runtime/workflow-pilot.spec.ts` + extends the 10a schema |

Test files live next to source as `*.test.ts(x)` inside the owned directory. Fixtures shared across tracks live in `src/lib/runtime/__fixtures__/` (Track 0 creates; later tracks append, one file per track, no edits to others' files).

---

## Layer 2: Port the Existing Schemas

Begin **only when Track 10b passes** and the runtime is stable for the workflow pilot.

26 schemas exist today under `/schemas/`. Group by domain and assign one agent per domain:

| Domain | Files (representative) | Owner |
|---|---|---|
| Policy | `policy-detail.json`, `policy-member-detail.json`, `policy-events-detail.json`, `tabs/policy/*` | Agent A |
| Quote / Proposal | `quote-detail.json`, `proposal-detail.json`, `tabs/quote/*`, `tabs/proposal/*` | Agent B |
| Claims | `claims-list.json`, `claim-detail.json`, `tabs/claim/*` | Agent C |
| Accounting / Payouts / Journals | `accounting-*`, `payout-*`, `journal-*` | Agent D |
| Dashboard + forms | `dashboard.json`, `forms/*` | Agent E |

**Per-schema port checklist:**

1. Translate top-level shape to `PageSchemaV1` (`schemaId`, `version: "1.0.0"`, `runtime`, `widgetTree`).
2. Pull data-fetching out of widgets into `runtime.namespaces`.
3. Lift any orchestration currently in route components into `actions` pipelines.
4. Model any multi-step or stateful flow as a `workflow`, not as form behavior.
5. Replace ad-hoc fetch calls with named `requestPolicies`.
6. Add an `access` block where the existing route enforces role-based UI.
7. Run the schema test harness from Track 1's fixtures; add a snapshot test of the widget tree.
8. Flip the route to render via `<SchemaRenderer />`. Delete the bespoke route component.

**Sequencing inside Layer 2:** in each domain, start with the simplest read-only page, then a list page, then a detail page, then a transactional flow.

---

## Layer 3: Schema Delivery & Materialization  (Deferred)

Not started until Layer 1 + Layer 2 are in production and stable. Schemas stay in `/schemas/` and are served via `src/lib/schemaResolver.ts` exactly as today.

---

## Verification

For each track, the DoD in the per-track briefing is the local check. After every track lands, the coordinator runs:

```bash
yarn lint && yarn typecheck && yarn test
```

For Track 10a:

```bash
yarn test:e2e -- readonly-pilot
```

For Track 10b:

```bash
yarn test:e2e -- workflow-pilot
```

Layer 1 is done when both e2e specs pass in CI and the workflow pilot route completes a full `draft → approved` cycle against mocks with zero state living outside the runtime graph and zero direct `fetch()` calls in widgets.

---

## What This Plan Does Not Cover

- Schema lint suite (deferred to after Layer 1).
- Runtime inspector / devtools UI.
- Package extraction (Phase 5 of `08-MIGRATION-PLAN.md`).
- Server-side hydration / SSR for the widget tree.
- Persisted-state migration definitions across schema majors (no previous major exists yet).
- Maker-checker UI overlay as a runtime primitive — the existing `src/lib/maker-checker.ts` is legacy and will be deleted when the backend approval model ships.
- Refactoring widget internals to remove widget-owned fetches — that is per-schema Layer 2 work, not Layer 1.
