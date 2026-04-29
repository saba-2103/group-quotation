# Current State To v0 Migration And Implementation Plan

**Status:** Proposed  
**Date:** 2026-04-28  
**Audience:** Frontend platform, module teams, tech leads

---

## Purpose

This document turns the `docs/arch_v0/` target architecture into an implementation plan based on the code that exists today in this repository.

It is intentionally grounded in the current repo, not the ideal system.

---

## Executive Summary

The current codebase already has a usable schema-driven UI runtime, but it is not yet the `arch_v0` architecture.

Today the repo is best described as:

- one Next.js application that imports page schemas directly from `schemas/*.json`
- one recursive widget renderer driven by `src/types/widget.ts`
- widget-level data fetching via `src/hooks/useSmartQuery.ts`
- ad hoc client state via `src/hooks/useWidgetState.ts`
- form-local state via `react-hook-form`
- local API mocks and proxy routes under `src/app/api/*`
- no direct `schemaId -> CDN -> S3` delivery path
- no unified `system.*` plus `graph.*` runtime graph
- no resolved-schema publication pipeline
- no shared authenticated API client with response-contract validation

There is also an important code-doc mismatch:

- `docs/ARCHITECTURE.md` and `docs/KEYSTONE-UI-SYSTEM-DESIGN.md` describe a larger browser architecture with Worker-based schema resolution, `useFieldConfig()`, and `useWorkbenchBootstrap()`
- the code in this repo does not implement that end-to-end architecture
- `arch_v0` is a simplification from that earlier architecture and should now become the only target

The recommended path is not a big-bang rewrite. The safest route is:

1. freeze `arch_v0` as the target contract
2. introduce the new schema/runtime contracts alongside the legacy `WidgetConfig` flow
3. migrate a small number of pages first
4. only then switch schema delivery, config materialisation, and packaging boundaries

---

## Current State Snapshot

| Area | Current repo state | Gap to `arch_v0` |
|---|---|---|
| Page delivery | Pages import local JSON directly in `src/app/test-dashboard/page.tsx`, `src/app/quotations/page.tsx`, `src/app/quotations/[id]/page.tsx`, `src/app/accounting/page.tsx`, and `src/app/payout/page.tsx` | `arch_v0` requires `useViewMetadata(schemaId)` and resolved schema fetch by `schemaId` |
| Schema format | Runtime contract is `WidgetConfig` from `src/types/widget.ts` with `id`, `type`, `props`, `layout`, `dataSource`, `children` | `arch_v0` requires `schemaId`, `version`, `graphNamespaces`, and a widget tree bound to `system.*` and `graph.*` |
| Schema composition | `$ref` stitching is done inside `src/lib/schemaResolver.ts`; forms are pre-inlined into `schemas/forms/index.ts` by `scripts/generate_form_index.mjs` | `arch_v0` is fine with composed source schemas, but it expects the browser-facing artifact to already be resolved by the time `useViewMetadata(schemaId)` fetches it |
| Data loading | `WidgetRenderer` calls `useSmartQuery(config.dataSource)` per widget | `arch_v0` requires page-level graph hydration from declared namespaces |
| Client state | `useWidgetState` is a global string-key store; `FilterBar` uses keys such as `page:quotations:filters` | `arch_v0` requires explicit schema-declared namespaces such as `graph.filters` and `graph.pageState` |
| Form state | `FormContainer` owns form state locally with `react-hook-form` | `arch_v0` treats forms as widgets bound into a unified graph, typically `graph.<name>Draft` |
| Conditions | `src/lib/conditions.ts` evaluates a legacy `{ field, operator, value }` shape, while multiple schemas already author JSONLogic such as `{ "==": [{ "var": "isMasterPolicy" }, "yes"] }` | `arch_v0` standardizes on JSONLogic only |
| Mutations | `useActionHandler` performs direct `fetch()` calls and invalidates query keys with `refreshKey` strings | `arch_v0` requires backend-validated writes with graph-aware revalidation or patch-plus-revalidate semantics |
| API access | Most runtime traffic goes through local Next routes in `src/app/api/*`; some are mocks, others proxy to `localhost:8090` | `arch_v0` targets one shared browser API client and direct backend access where available, but the migration can still use mocks or temporary adapters where backend surfaces are not ready yet |
| Auth | No shared JWT client path is implemented in the current runtime | `arch_v0` requires one authenticated API client path and `system.*` context sourcing |
| Display semantics | Labels, options, and badge semantics are hardcoded in schema JSON and generated form registry files | `arch_v0` requires the browser to consume fully materialised schemas; in early v0 this can be achieved manually or with scripts before a full Config System/materialisation service exists |
| Contracts and ops | There are unit tests and schema tests, but no resolved-schema Zod validation, no schema publication validation, no smoke render pipeline, no artifact size budgets, and no schema delivery observability | `arch_v0` requires all of those |
| Packaging | Repo is a single app, though the layer split is already visible in `src/components/ui`, `src/components/widgets`, `src/components/registry`, `src/hooks`, and `src/lib` | `arch_v0` recommends layered workspace packages plus a reference app |

---

## Migration Principles

1. Treat the current app as the reference host, not the target architecture.
2. Keep legacy pages running while the new runtime is introduced.
3. Standardize contracts before migrating content.
4. Move data ownership from widgets to the page runtime graph.
5. Replace legacy condition evaluation before trusting more schema-authored behavior.
6. Introduce resolved-artifact publication early, starting with a manual or script-driven pipeline, then harden it into an operational materialisation service later.
7. Do not reintroduce Worker delivery, `useFieldConfig()`, or `useWorkbenchBootstrap()` into the v0 scope.

---

## Recommended Target Shape Inside This Repo

Before workspace extraction, the repo should converge on these internal boundaries:

- `src/schema/*` or `packages/schema/*`: schema types, Zod validators, lint rules, authoring helpers
- `src/runtime/*` or `packages/runtime/*`: `useViewMetadata`, `usePageDataGraph`, condition engine, value resolution, renderer orchestration
- `src/widgets/*` or `packages/widgets/*`: table, form, layout, and display widgets adapted to the new runtime contract
- `src/components/ui/*` or `packages/design-system/*`: low-level primitives
- `src/app/*` or `apps/keystone-demo/*`: Next host app, providers, route selection, auth integration, and demo pages

The exact extraction can wait until the contracts stabilize, but implementation should move in that direction immediately.

---

## Pre-Sprint Decisions

These decisions should be assigned owners and resolved before the first implementation sprint begins.

### 1. Runtime graph store backing

Decision required:

- what concrete store backs the new runtime graph in early v0?

Recommended v0 decision:

- use a small runtime provider abstraction backed by Zustand initially
- keep Zustand behind runtime-owned interfaces so the public contract is `RuntimeGraph`, not Zustand APIs

Resolved by ADR:

- [`../decisions/ADR-runtime-graph-store-boundary.md`](../decisions/ADR-runtime-graph-store-boundary.md)

Why this is the recommended default:

- the repo already uses Zustand successfully
- migrated pages need graph state that survives across many widget renders
- the runtime may still want to swap backing implementation later without rewriting widgets

Owner:

- frontend/platform runtime owner

Deadline:

- before Workstream 2 implementation starts

### 2. Auth backend readiness

Decision required:

- does Workstream 3 integrate with a real JWT backend immediately, or does early runtime work use a mocked auth context?

Recommended v0 decision:

- build the shared API client against the real auth contract if available
- if backend auth is not ready, provide a mocked auth-context provider that satisfies the same client/runtime interfaces

Resolved by ADR:

- [`../decisions/ADR-runtime-auth-context-source.md`](../decisions/ADR-runtime-auth-context-source.md)

Guardrail:

- the runtime should depend on an auth abstraction, not directly on today’s temporary mock or backend implementation

Owner:

- frontend/platform plus auth/backend owner

Deadline:

- before the first migrated page consumes authenticated APIs

### 3. Backend readiness matrix for pilot pages

Decision required:

- for `test-dashboard`, `claims`, and `quotations`, which namespaces point to real endpoints and which stay mocked initially?

Required output:

- one readiness matrix listing page, namespace, endpoint, owner, and readiness state

Owner:

- module team plus backend owner for each pilot surface

Deadline:

- before the first Phase 3 pilot-page migration begins

### 4. `schemaId` naming convention

Decision required:

- what exact stable naming format do we bless for `schemaId`s?

Recommended v0 decision:

- use lowercase kebab-case page-family identifiers matching the lint rules, for example:
  - `quotations-list`
  - `quotation-details`
  - `claims-list`

Do not:

- encode deployment environment into `schemaId`
- encode file paths into `schemaId`
- mix dotted and path-like naming forms in the same system

Owner:

- schema contract owner

Deadline:

- before route manifest and artifact publication are used for real pages

### 5. Schema bucket and CDN ownership

Decision required:

- who provisions and owns the schema artifact bucket and CDN path?

Required output:

- named platform owner
- target bucket/path naming
- environment list
- deployment and rollback access model

Owner:

- platform/infrastructure owner

Deadline:

- before Phase 5

### 6. Runtime governance during concurrent migrations

Decision required:

- if multiple teams expose missing runtime capabilities at the same time, who decides whether to add capability to the shared runtime or allow a temporary bridge?

Required output:

- one named runtime arbiter or review group
- one rule that all temporary bridges require owner plus removal milestone

Owner:

- frontend/platform lead

Deadline:

- before more than one page family migrates concurrently, and no later than the end of Phase 2

---

## Parallelism Rules

The migration should not be scheduled as if every workstream were sequential.

Recommended concurrency:

- Workstream 1 and Workstream 3 start in parallel on day one
- Workstream 2 can begin with:
  - `useViewMetadata(schemaId)` stub
  - runtime graph container
  - JSONLogic condition engine
  even while Workstream 1 contracts are still stabilizing
- Workstream 4 page conversion starts only after the condition engine, route manifest, and minimum runtime graph path exist
- Workstream 5 publication can begin with local filesystem or `public/` artifacts in parallel with runtime development

Guardrail:

- contract modules must stabilize before multiple page families migrate concurrently

---

## Workstreams

### 1. Contract Foundation

Build the new source of truth first.

Deliverables:

- `PageSchema` and `ResolvedSchemaArtifact` TypeScript and Zod contracts
- `GraphNamespaceDefinition` union matching `api`, `local`, and `inline`
- JSONLogic subset validator matching `arch_v0`
- binding and path validators for `system.*` and declared `graph.*`
- schema lint rules matching `docs/arch_v0/13-SCHEMA-LINT-RULES.md`

Implementation tasks:

- add a new schema contract module under `src/schema/*` or `packages/schema/*`
- define separate contracts for:
  - source page schema
  - resolved schema artifact
  - route manifest entry
- implement Zod schemas for:
  - `PageSchema`
  - `ResolvedSchemaArtifact`
  - `RouteManifestEntry`
  - JSONLogic expression subset
- encode discriminated unions for `graphNamespaces` so invalid mixed shapes fail structurally rather than through ad hoc checks later
- add semantic validators for:
  - namespace uniqueness
  - bind path validity
  - condition path validity
  - single-writer graph ownership
  - route-manifest ambiguity
- define one canonical widget node contract for the new runtime instead of allowing each widget family to invent local shapes
- implement the JSONLogic subset evaluator and test harness early enough that existing JSONLogic-authored schemas can be validated before the new renderer is finished
- add a validation script such as `validate:schema-contracts` that can be run locally and in CI against source schemas, published artifacts, and route manifests
- add fixture schemas covering:
  - valid page
  - invalid namespace collision
  - invalid condition path
  - invalid route manifest alias

Code areas impacted:

- replace or supersede `src/types/widget.ts`
- add validators instead of relying on untyped JSON imports

Concrete outputs:

- `src/schema/types/*`
- `src/schema/validators/*`
- `src/schema/lint/*`
- `scripts/validate_schemas.*` or equivalent package script
- schema test fixtures under `src/tests/schemas` or `schemas/__fixtures__`
- JSONLogic evaluator tests against real pilot-schema examples

Exit criteria:

- new schemas can be validated locally and in CI
- invalid namespace collisions and invalid condition paths fail before runtime

### 2. Runtime Foundation

Introduce the new runtime alongside the legacy renderer.

Deliverables:

- `useViewMetadata(schemaId)` abstraction
- `usePageDataGraph(schema, context)`
- `ConditionEngine` using JSONLogic only
- `useValueSource()` for absolute, relative, and inline value resolution
- `SchemaRenderer` that reads from the runtime graph

Implementation tasks:

- create a runtime state container that exposes one `RuntimeGraph` with `system` and `graph` roots
- use the Zustand-backed runtime provider abstraction decided in Pre-Sprint Decision #1, and keep the public interface graph-first
- implement `useViewMetadata(schemaId)` against a local artifact path first so the call site stays stable before CDN cutover
- provide a filesystem-backed or `public/`-backed schema loader that satisfies the same `useViewMetadata(schemaId)` interface used later for CDN/S3 fetches
- implement `usePageDataGraph(schema, context)` in this order:
  - read declared namespaces
  - seed `system.routeParams`, `system.role`, and other runtime-managed values
  - initialize `local` namespaces
  - initialize `inline` namespaces
  - hydrate eager `api` namespaces
  - expose deferred namespace loaders
- evolve `useSmartQuery` into a source-loader primitive used by `usePageDataGraph`, not by widgets directly on migrated pages
- implement template/param resolution for API namespace endpoints from `system.routeParams`
- implement `useValueSource()` so it can resolve:
  - absolute bind paths
  - relative scope-based binds
  - inline literal values
  - options sources from declared namespaces
- implement `SchemaRenderer` so it:
  - walks the widget tree
  - evaluates conditions before rendering nodes
  - passes binding scopes downward explicitly
  - logs unsupported condition-key usage instead of crashing
- add runtime error states for:
  - schema fetch failure
  - namespace hydration failure
  - unsupported widget type
- keep the current renderer alive as `legacy` while the new runtime is being proven
- keep the condition engine separately testable from the renderer so schema logic can be proven before full page rendering is complete

Implementation guidance:

- keep `src/components/registry/WidgetRenderer.tsx` as the legacy path temporarily
- create a new renderer path rather than overloading the current one with both contracts
- evolve `src/hooks/useSmartQuery.ts` into a source loader primitive used by graph hydration rather than a widget-owned fetch hook
- replace `src/hooks/useWidgetState.ts` for migrated pages with a graph store that owns `system` and `graph`

Concrete outputs:

- `src/runtime/useViewMetadata.*`
- `src/runtime/usePageDataGraph.*`
- `src/runtime/condition-engine/*`
- `src/runtime/useValueSource.*`
- `src/runtime/SchemaRenderer.*`
- `src/runtime/providers/*`

Exit criteria:

- one pilot page can render entirely from `schemaId`, `graphNamespaces`, and widget bindings
- widgets no longer need to fetch their own domain data on that page

### 3. API Client And Auth

Standardize browser-to-backend access before broad page migration.

Deliverables:

- one shared API client for authenticated reads and writes
- request decoration with Bearer token and correlation ID
- one refresh-and-retry policy
- Zod response validation before data enters the graph
- telemetry hooks for contract failures

Implementation tasks:

- add a shared client module such as `src/lib/api/client.ts`
- split the client into explicit layers:
  - request assembly
  - auth header injection
  - refresh-and-retry handling
  - JSON parsing
  - optional Zod parsing helper
  - telemetry/reporting hook
- define one request helper for reads and one for mutations so the runtime and action layer do not use raw `fetch()`
- add a small auth-context abstraction that can provide:
  - access token
  - refresh capability
  - decoded user claims for `system.*`
- define typed error classes for:
  - unauthenticated
  - unauthorized
  - validation failure
  - contract violation
  - network failure
- migrate `useActionHandler` to call the shared client instead of raw `fetch()`
- identify which current `src/app/api/*` routes are:
  - permanent demo mocks
  - temporary compatibility adapters
  - removable once real backend endpoints exist
- add one migration rule: no newly migrated page may introduce new direct `fetch()` usage outside the shared client

Implementation guidance:

- `useActionHandler` should stop calling raw `fetch()` directly for migrated flows
- local Next routes under `src/app/api/*` should be classified as either:
  - dev/demo mocks
  - temporary compatibility adapters or proxies
  - genuinely required app-local endpoints
- prefer direct browser-to-backend access for the steady-state path, but allow mocks/adapters during migration where backend capabilities are not ready yet

Concrete outputs:

- `src/lib/api/client.*`
- `src/lib/api/errors.*`
- `src/lib/api/contracts/*`
- updated `src/hooks/useActionHandler.ts`
- route classification table or runbook for `src/app/api/*`

Exit criteria:

- migrated pages call backend APIs through one client path
- response parsing and validation are centralized

### 4. Schema Authoring Conversion

Convert schema content to the new authoring model.

Required changes:

- move from root `WidgetConfig` documents to page schemas with `schemaId`, `version`, `graphNamespaces`, and `widgetTree`
- move widget-owned `dataSource` declarations into page-owned namespaces where possible
- replace ad hoc `stateKey` strings such as `page:quotations:filters` with declared `graph.filters`
- model form state as explicit local namespaces such as `graph.quoteDraft`
- standardize conditions on JSONLogic and ban the legacy `{ field, operator, value }` shape

Implementation tasks:

- create a source-schema directory layout that distinguishes:
  - page schemas
  - reusable fragments
  - form schemas
  - route manifest
- for each pilot page, produce a conversion worksheet with:
  - current imported schema file
  - target `schemaId`
  - required `graphNamespaces`
  - widgets that still fetch privately
  - route params needed by API namespaces
  - legacy condition patterns that must be rewritten
- convert schemas page by page rather than widget by widget so graph ownership stays coherent
- move per-widget `dataSource` declarations into page namespaces when they represent durable page state
- keep widget-local or purely presentational inline values in the widget tree instead of artificially lifting everything into namespaces
- convert filter and tab state into explicit local namespaces such as:
  - `graph.filters`
  - `graph.pageState`
- convert forms by introducing draft namespaces and rebinding fields relative to the draft scope
- replace any lingering legacy condition objects with JSONLogic during conversion rather than supporting both syntaxes long term
- record variant justification at conversion time if a page family needs more than one artifact

Implementation guidance:

- keep authoring-time composition if useful, but resolve it before publication
- `src/lib/schemaResolver.ts` and `scripts/generate_form_index.mjs` can remain authoring/build/publication tools, but the steady-state browser delivery path should fetch an already resolved artifact

Concrete outputs:

- migrated source schemas for `test-dashboard`, `claims`, and `quotations`
- authoring/build helpers for fragment resolution
- a conversion checklist template used per page family

Exit criteria:

- pilot schemas validate against the new contracts
- no migrated schema depends on legacy condition syntax or undeclared state paths

### 5. Resolved Artifact Publication And Later Materialisation

Implement the thinnest viable publication path first.

Important scope note:

- v0 does not need the full Config System admin experience on day one
- the immediate requirement is that browser-fetched schemas are already fully materialised
- manual curation or engineer-run scripts that publish resolved artifacts to S3/CDN are acceptable for early v0
- config bindings and event-driven materialisation can follow later without changing the browser contract

Phase 1 deliverables:

- source-managed resolved schemas or source schemas plus a script-driven resolution step
- local or CI publication script that emits resolved artifacts
- resolved artifact validation before write
- output directory or bucket layout keyed by `schemaId`

Implementation tasks:

- decide one source-of-truth layout for early v0:
  - fully resolved checked-in source files, or
  - source files plus a deterministic build step that emits resolved artifacts
- create a publication script that:
  - reads source schemas
  - resolves any allowed composition
  - injects final display semantics
  - stamps metadata such as `schemaId`, `version`, and `resolvedAt`
  - validates the final artifact
  - writes the artifact to a local publish directory or S3 target
- provide a single developer command from day one, for example `yarn schemas:dev`, that:
  - rebuilds resolved artifacts on source-schema changes
  - writes them to the local fetch path used by `useViewMetadata(schemaId)`
  - keeps the local development loop aligned with the eventual publication contract
- define the published artifact path contract, for example `dist/resolved-schemas/{schemaId}.json`
- add a manifest or index of published `schemaId`s for validation and deployment checks
- document the manual/operator flow for early v0 publication, including:
  - validate
  - publish
  - verify fetch
  - rollback
- treat the current form registry generator as input to the build if useful, but not as the browser-facing delivery contract
- define the exit trigger for manual curation of display semantics:
  - once more than 3 page families are live on published artifacts, or
  - once one display-semantics change requires more than 1 working day to republish,
  manual curation is no longer acceptable and explicit bindings plus repeatable materialisation become mandatory backlog work

Phase 2 deliverables:

- config bindings as a first-class authoring concept
- event-driven materialisation
- artifact versioning and rollback
- CDN purge by `schemaId`
- freshness monitoring via `resolvedAt`

Phase 2 implementation tasks:

- introduce explicit binding declarations once display semantics are no longer manually embedded everywhere
- add schema-to-binding dependency tracking so one config change knows which artifacts to republish
- add artifact versioning policy and restore tooling
- implement targeted CDN purge by `schemaId`
- add a freshness checker that compares current time to `resolvedAt`

Important note:

- the current generated `schemas/forms/index.ts` registry is not the target delivery model
- it can inform the initial CLI/manual publication step, but it should not become the long-term artifact system

Concrete outputs:

- `scripts/publish_resolved_schemas.*`
- `dist/resolved-schemas/*` or equivalent build output
- publication runbook for early v0
- later: binding files and event-driven republish path

Exit criteria:

- a schema edit can produce a new resolved artifact through a deterministic pipeline
- if display semantics remain manual in early v0, there is still one clear publication path for pushing the updated resolved artifact to S3/CDN

### 6. Route Manifest And Generic Page Shell

Make route-to-schema mapping explicit so the app does not require one handwritten host page per schema-driven route.

Deliverables:

- route manifest contract for `path -> schemaId + routeParams`
- route matcher with validation for ambiguity and missing `schemaId`s
- generic schema page shell that resolves the current path and renders the runtime
- injection of resolved params into `system.routeParams`

Temporary migration extension:

- route manifest may also carry a temporary `runtime: "legacy" | "v0"` field during the dual-runtime period so cutover state is explicit and testable
- if the field is omitted during the migration window, default to `"v0"`; `"legacy"` must be explicit

Implementation tasks:

- add a source-controlled route manifest file and validator
- choose one route matching implementation and keep it deterministic and testable
- if dual runtime support is needed, validate that every manifest entry declares which runtime owns it during the migration window
- add route tests covering:
  - static path precedence
  - parameterized path precedence
  - ambiguity rejection
  - alias mapping into `system.routeParams`
- create a generic schema shell component that accepts:
  - `schemaId`
  - resolved `routeParams`
  - optional host-app extras such as breadcrumbs or auth guards
- replace manual route-specific schema imports with route manifest entries as pages migrate
- explicitly list which routes remain custom host pages because they are not fully schema-driven yet
- add a route-cutover rollback rule for migrated pages:
  - if a route is switched to the generic shell and the resolved artifact is missing or invalid in a target environment, revert the manifest entry to `legacy` or restore the prior route mapping as the first rollback option before editing runtime code

Implementation guidance:

- keep route mapping explicit and source-controlled at first
- do not reintroduce Worker-time or JWT-based schema selection
- allow a small number of custom host pages where truly needed, but make the generic schema shell the default path

Concrete outputs:

- `src/routes/manifest.*`
- `src/routes/resolveRoute.*`
- `src/app/[[...slug]]/page.tsx` or equivalent generic shell
- route-manifest tests
- optional dual-runtime manifest flag during migration

Exit criteria:

- migrated schema-driven pages no longer require one manual Next route file per page
- route params are available in the runtime through `system.routeParams`

### 7. Delivery Path

Introduce the real `schemaId` fetch contract only after resolved artifacts exist.

Recommended sequence:

1. start with `useViewMetadata(schemaId)` reading local published artifacts in development
2. switch the same hook to CDN/S3 once publication is live
3. update routes to choose explicit `schemaId`s

Implementation tasks:

- add environment-aware schema base URL configuration
- define the local dev fetch path and the deployed CDN fetch path behind the same hook
- add fetch-time resolved-schema validation before the artifact enters the runtime
- add standard schema error states for:
  - `404 SCHEMA_NOT_FOUND`
  - `503 SCHEMA_UNAVAILABLE`
  - `503 SCHEMA_INVALID`
- add simple verification tooling that fetches a list of critical `schemaId`s after publish and confirms:
  - artifact reachable
  - artifact valid
  - `resolvedAt` freshness acceptable
- wire cache headers and, later, purge tags around the published path contract

Implementation guidance:

- the abstraction boundary matters more than the initial backing store
- do not tie pages directly to local JSON imports once migration starts
- do not rebuild a Worker-based resolver; `arch_v0` explicitly removes it

Concrete outputs:

- schema base URL config
- fetch-time artifact validator
- post-publish verification script
- deployment notes for CDN/S3 integration

Exit criteria:

- migrated pages no longer import page schema JSON directly from route files

### 8. Contracts, CI, And Operations

Add operational controls before broad adoption.

Deliverables:

- resolved-schema Zod validation at publication and fetch time
- schema lint CI
- smoke rendering against published artifacts
- size and widget-count budgets
- accessibility publication checks
- metrics for schema fetch latency, graph hydration latency, condition failures, and contract violations

Implementation tasks:

- add CI scripts for:
  - schema contract validation
  - route manifest validation
  - artifact validation
  - smoke render
- define how Pact fits the current migration stage and which endpoints must be covered first
- add smoke-render fixtures for pilot pages using published artifacts, not raw source schemas
- add size-budget checks to the publish pipeline
- add accessibility checks that can fail publication for structurally invalid schemas
- instrument runtime telemetry for:
  - schema fetch outcome
  - namespace hydration duration
  - condition evaluation failures
  - contract parsing failures
- document alert ownership and escalation targets for schema delivery versus client contract failures

Concrete outputs:

- CI jobs or scripts for validation and smoke rendering
- publish-time size and accessibility checks
- telemetry integration points and alert definitions

Exit criteria:

- publication can fail safely before users see broken artifacts
- runtime contract failures are observable

### 9. Packaging And Workspace Extraction

After at least one page family is stable on the new runtime, extract packages in the order recommended by `docs/arch_v0/14-PACKAGING-AND-ADOPTION-STRATEGY.md`.

Recommended order:

1. `@keystone/design-system`
2. `@keystone/schema`
3. `@keystone/runtime`
4. `@keystone/widgets`
5. reference app and scaffolder

Implementation tasks:

- add workspace boundaries without changing behavior first
- move low-level UI imports behind a `design-system` package boundary
- move schema contracts and validators next, then redirect imports incrementally
- extract runtime only after the new runtime path is the default for at least one page family
- extract widgets after runtime contracts settle so widget package APIs do not thrash
- keep auth client and Next-specific integration app-local until their boundaries are proven reusable

Concrete outputs:

- workspace root updates
- `apps/keystone-demo`
- `packages/design-system`
- `packages/schema`
- `packages/runtime`
- `packages/widgets`

Do not extract the runtime package before its public contracts settle.

---

## Per-Page Migration Template

Every page-family migration should follow the same implementation sequence.

This prevents each team from inventing its own conversion path.

Canonical reusable template:

- `docs/templates/PAGE_MIGRATION_CHECKLIST.md`

### Required inputs before starting

- current route or routes
- current source schema file or files
- target `schemaId`
- required backend endpoints
- expected route params
- product-approved condition rules

### Step-by-step page conversion flow

1. create the route manifest entry for the target page
2. assign the final `schemaId` and versioning convention
3. inventory every current widget data dependency on the page
4. declare target `graphNamespaces`
5. decide which namespaces are `api`, `local`, or `inline`
6. map current route params into `system.routeParams`
7. move widget-owned fetch definitions into page-owned namespaces where appropriate
8. rebind the widget tree to `system.*` and `graph.*`
9. convert filter, tab, and local interaction state into named `graph.*` local namespaces
10. convert form state into draft namespaces such as `graph.quoteDraft`
11. rewrite all conditions into the allowed JSONLogic subset
12. validate the source schema and route manifest
13. publish a resolved artifact locally or to the target artifact store
14. run smoke render and regression checks against the resolved artifact
15. switch the route to the generic schema shell
16. remove the legacy schema import path for that page

### Files typically touched for one page migration

- route manifest file
- source page schema file
- optional fragment files used by that page
- schema tests for that page
- smoke-render fixture or artifact snapshot
- generic runtime code only if the page exposes a missing runtime capability

### Page-level acceptance checklist

- route resolves to the intended `schemaId`
- resolved artifact validates
- page renders without legacy `WidgetRenderer`
- no widget on the migrated page owns its own durable data fetch outside the runtime graph
- all conditions read only from `system.*` or declared `graph.*`
- form submit behavior uses the shared client and graph-aware refresh semantics
- route params are visible under `system.routeParams`
- no local JSON import remains in the route file

---

## Migration Bridge Rules

The migration will temporarily run old and new runtime paths in the same repo.

To keep that safe, follow these rules:

1. no newly migrated page may add new usage of the legacy condition DSL
2. no newly migrated page may add new widget-owned durable fetches
3. if a capability is missing in the new runtime, add it there rather than falling back to `useWidgetState` or route-level schema imports
4. legacy pages may stay on the old renderer temporarily, but migrated pages should not mix old and new state models on the same page without a documented bridge
5. any temporary compatibility adapter must have an owner and a removal milestone

---

## Phased Delivery Plan

### Phase 0 - Freeze The Target And Inventory The Legacy Path

Goals:

- declare `arch_v0` the only target architecture
- stop adding new features to the legacy condition/state model
- inventory which schemas are actually active and which are placeholders

Key actions:

- identify all routes still importing schemas directly
- identify which current routes can collapse into a generic schema route shell
- classify all `src/app/api/*` routes as mock, proxy, or keeper
- mark old architecture docs as superseded where appropriate
- automate the inventory generation instead of maintaining it by hand
- annotate current `src/app/api/*` files with a machine-checkable route class comment or equivalent metadata if the team chooses that convention

Concrete implementation outputs:

- one inventory table listing every current schema-driven route and its source schema file
- one inventory table listing every `src/app/api/*` route and its classification
- one decision record that marks `arch_v0` as the implementation target over the older browser-arch docs
- one inventory script that regenerates both tables from the repo

Definition of done:

- team agreement that Worker resolution, field-config APIs, and workbench bootstrap are out of v0 scope
- old architecture docs are marked as superseded or explicitly non-target for implementation
- generated inventory artifacts are committed to the repo

### Phase 1 - Add New Contracts And Validation

Goals:

- make the new schema format real in code and CI

Key actions:

- add schema and artifact contracts
- add JSONLogic subset validation
- add lint rules for namespace, path, and condition integrity
- add route manifest contract and validation rules
- land the standalone JSONLogic evaluator and tests before page migration begins

Concrete implementation outputs:

- schema and route-manifest contract modules added to the repo
- validation script wired into `package.json`
- failing fixtures proving CI catches invalid paths, namespaces, and routes

Definition of done:

- at least one new-format schema can be validated in CI without touching the legacy renderer

### Phase 2 - Build The New Runtime In Parallel

Goals:

- prove the new runtime without breaking existing pages

Key actions:

- build `useViewMetadata(schemaId)` backed by local artifacts first
- build route manifest resolution and generic schema page shell
- build `usePageDataGraph`
- build `SchemaRenderer`
- build a new condition engine and binding resolver

Concrete implementation outputs:

- one generic schema shell route in the app
- one pilot runtime path that does not use legacy `WidgetRenderer`
- one pilot page fetching a locally published resolved artifact
- one filesystem-backed schema loader satisfying the same interface as the future CDN-backed loader

Definition of done:

- one pilot page renders on the new runtime path end to end

### Phase 3 - Migrate Low-Complexity Pages First

Recommended initial order in this repo:

1. `test-dashboard`
2. `claims`
3. `quotations`

Why these first:

- smaller schema graphs
- limited form complexity
- fewer deep `$ref` chains
- easier to validate graph namespace patterns
- easiest place to prove route-manifest driven page resolution

Do not start with:

- `quotations/[id]`
- `accounting`
- `payout`

Those pages are more composition-heavy and will hide runtime problems behind content volume.

Concrete migration order inside each pilot page:

1. create route manifest entry
2. assign final `schemaId`
3. declare `graphNamespaces`
4. convert widget binds to `system.*` and `graph.*`
5. replace legacy state keys
6. replace legacy conditions
7. publish resolved artifact
8. switch route to generic schema shell

Optional migration control during the dual-runtime window:

- mark the manifest entry `runtime: "legacy"` before conversion
- change it to `runtime: "v0"` only after artifact validation and smoke render pass

Definition of done:

- first page family uses `schemaId`, runtime graph namespaces, JSONLogic, and the shared API client

### Phase 4 - Migrate Detail Pages And Forms

Goals:

- convert the deeper form-heavy flows after the runtime is proven

Key actions:

- introduce draft namespaces such as `graph.quoteDraft`
- migrate form submit/revalidate behavior away from `refreshKey` strings
- convert tabbed detail pages from runtime `$ref` stitching to published resolved artifacts

Concrete implementation outputs:

- one form runtime pattern for draft initialization, submit, and revalidation
- one detail-page pattern for large tabbed schemas resolved before fetch time
- one documented mutation pattern for re-fetch versus patch-plus-revalidate
- one rollback pattern for switching a detail route back to legacy if the published artifact fails post-cutover

Definition of done:

- quotation detail and at least one complex form family run on the new model

### Phase 5 - Turn On Real Publication And Delivery

Goals:

- move from local artifact fetch to real published artifacts

Key actions:

- publish resolved artifacts by `schemaId`
- wire CDN/S3 delivery
- implement purge, rollback, and freshness checks

Concrete implementation outputs:

- deployed schema bucket layout
- CDN path and cache-header configuration
- rollback runbook tested against at least one pilot artifact
- post-publish verification check for critical `schemaId`s
- tested route rollback procedure for one page switched from generic shell back to legacy ownership
- packaging open questions from `14-PACKAGING-AND-ADOPTION-STRATEGY.md` resolved and assigned owners before WS9 starts

Definition of done:

- the app fetches migrated schemas from the published artifact location rather than repo imports

### Phase 6 - Package And Harden

Goals:

- make the architecture reusable and operable

Key actions:

- extract workspace packages
- add smoke render and publication gates
- document ownership and onboarding

Concrete implementation outputs:

- workspace package boundaries in the repo
- smoke-render CI job against published artifacts
- onboarding checklist updated for the new runtime and publication path
- packaging gate decision recorded after at least 2 page families have run on the new runtime for 2 weeks in staging without rollback

Definition of done:

- the repo behaves like a layered platform plus reference app, not one inseparable application

---

## Codebase-Level Change Map

| Current area | Planned role in `arch_v0` migration |
|---|---|
| `src/types/widget.ts` | legacy contract to be replaced or wrapped by new schema contracts |
| `src/lib/conditions.ts` | replace with JSONLogic engine; legacy evaluator should be removed from migrated pages |
| `src/hooks/useSmartQuery.ts` | keep as low-level fetch primitive, but move ownership to page graph hydration |
| `src/hooks/useWidgetState.ts` | deprecate for migrated pages in favor of runtime graph store |
| `src/components/registry/WidgetRenderer.tsx` | preserve as legacy path; new runtime should use a separate renderer |
| `src/components/registry/WidgetRegistry.tsx` | likely survives, but should resolve widget implementations for the new renderer contract |
| `src/components/widgets/forms/FormContainer.tsx` | adapt to graph-bound form namespaces, `requiredWhen`, and `editableWhen` |
| `src/hooks/useActionHandler.ts` | route through shared API client and graph-aware invalidation |
| `src/lib/schemaResolver.ts` | acceptable as an authoring/build resolver; avoid making browser-facing delivery depend on per-request stitching |
| `scripts/generate_form_index.mjs` | acceptable as an authoring/build helper; long-term concern is resolved artifact publication, not banning composition |
| `src/app/test-dashboard/page.tsx`, `src/app/quotations/page.tsx`, `src/app/quotations/[id]/page.tsx`, `src/app/accounting/page.tsx`, `src/app/payout/page.tsx` | collapse gradually behind a route manifest plus generic schema page shell where the route is fully schema-driven |
| `src/app/api/forms/[id]/route.ts` | remove after direct schema delivery exists |
| `src/app/api/config/app/route.ts` | dev/demo bootstrap only unless real config service is introduced |
| `src/app/api/accounting/[[...path]]/route.ts` and `src/app/api/moneyout/[...path]/route.ts` | treat as temporary proxy adapters; `arch_v0` target is direct browser-to-backend access |
| `schemas/**/*` | split into source schemas, bindings, and resolved artifacts |

---

## Major Risks And Mitigations

### Risk 1 - Condition behavior is already inconsistent

Evidence:

- current evaluator in `src/lib/conditions.ts` is legacy-shaped
- current schemas already include JSONLogic

Mitigation:

- replace condition evaluation early, before broad page migration
- add contract tests that evaluate real migrated schemas

### Risk 2 - Widget-owned data fetching fights the runtime graph model

Mitigation:

- do not try to keep page graph hydration and widget-owned fetches permanently mixed
- allow a temporary bridge, but migrated pages should have one page-owned data graph

### Risk 3 - Runtime graph store decision blocks Workstream 2

Mitigation:

- assign one owner and deadline in the Pre-Sprint Decisions section
- use the recommended provider abstraction backed by Zustand unless a contrary decision is made before runtime work starts

### Risk 4 - Temporary mock or proxy routes become accidental long-term architecture

Mitigation:

- label each Next API route as dev-only, compatibility-only, or permanent
- set a removal milestone for compatibility proxies

### Risk 5 - Page migration starts with the hardest content

Mitigation:

- start with dashboard and list pages
- leave quotation detail, accounting, and payout until the runtime contracts are proven

### Risk 6 - Config/materialisation is deferred too long

Mitigation:

- build a thin CLI materialiser early
- do not wait for a full admin UI before fixing the browser contract

### Risk 7 - Partially migrated route has no rollback path

Mitigation:

- keep route ownership explicit during the dual-runtime window
- test both artifact rollback and route rollback before production cutover of a pilot page

---

## What Not To Do

- do not attempt a full-schema big-bang conversion
- do not keep both legacy condition DSL and JSONLogic as long-term supported formats
- do not extract packages before the new contracts stabilize
- do not build a new Worker resolver because the old docs mentioned one
- do not let migrated pages continue depending on stringly typed state buckets such as `page:*`

---

## Definition Of Done For The v0 Migration

The migration should be considered complete only when all of the following are true for the migrated surface area:

1. Pages fetch resolved schemas by explicit `schemaId` through `useViewMetadata(schemaId)`.
2. Schema-driven routes resolve to `schemaId`s through an explicit route manifest or equivalent explicit app configuration.
3. Resolved schemas validate at publication time and fetch time.
4. All active conditions are JSONLogic in the agreed subset.
5. The UI reads one runtime graph with reserved `system.*` and declared `graph.*` namespaces.
6. Forms are widgets bound to explicit graph namespaces.
7. Backend reads and writes flow through one shared client path with contract validation.
8. Display semantics reach the browser via resolved artifacts, not runtime component logic.
9. Publication is observable, versioned, and reversible.
10. The repo has clear package boundaries or package-ready internal boundaries matching `arch_v0`.

---

## Recommended Immediate Next Steps

1. Create the new schema contracts and validators.
2. Replace the legacy condition engine with JSONLogic support.
3. Define the route manifest contract and generic schema page shell.
4. Build `useViewMetadata(schemaId)` and a local artifact-backed `SchemaRenderer` path.
5. Migrate `test-dashboard` as the first pilot page.
6. After the pilot works, convert `claims` and `quotations` before touching quotation detail or heavy form trees.
