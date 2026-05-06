# Repo Changes And Packaging Required For v1

## Purpose

This document defines the structural changes required to implement `archV1`.

This is not optional cleanup. These are architectural changes.

## What This Implementation Replaces

These are the structural patterns that must be eliminated as archV1 is adopted:

- page wrappers that perform runtime orchestration
- widget-owned data fetching
- ad hoc string-keyed global state with no declared scope
- action definitions too simple for real servicing flows
- auth and header concerns scattered across component code rather than centralized in a single API client

## Required Changes

### 1. Separate schema contracts

The long-term type contract must be split into distinct interfaces for:

- source schema
- resolved schema artifact
- action pipeline definition
- workflow definition
- request policies

One monolithic widget configuration type cannot represent all of these without collapsing their semantics.

### 2. Move data loading to the runtime

Widgets must not own their own data fetching. Data loading is a page-level and runtime-level responsibility. Widgets declare bindings to graph paths and read from the runtime graph. The namespace hydration layer handles all API calls.

### 3. Replace ad hoc global state keys

All cross-page and page-local state must use the declared `app.*` and `page.*` namespace model. Arbitrary string-keyed state stores outside the schema runtime are not permitted in archV1.

### 4. Standardize one API client path

Needed:
- auth and refresh
- request-policy injection
- response validation
- contract error reporting

### 5. Add runtime devtools

Required debugging surfaces:
- graph inspector
- condition inspector
- action pipeline trace
- workflow transition trace
- namespace hydration status

### 6. Add structural runtime features

Needed in renderer/runtime:
- structural child omission
- derived transforms
- action pipeline engine
- workflow engine

### 7. Package boundaries

Recommended long-term split:

- `packages/design-system`
- `packages/schema`
- `packages/runtime`
- `packages/widgets`
- `apps/keystone-demo` or equivalent host app

These must become real package boundaries, not just folder conventions.

## Performance And Code-Splitting

The archV1 runtime assembles several engines at load time: the namespace hydrator, the condition evaluator, the transform engine, the action pipeline engine, and the workflow engine. Loaded together unconditionally, this has a measurable impact on startup time for pages that do not use all of them.

### Runtime startup budget

The runtime must meet the following startup performance targets.

**Time to first meaningful render:** schema fetch, graph hydration, initial condition evaluation, and initial widget tree render must complete within an agreed budget. That budget is set when the Phase 2 baseline is measured. No regression from baseline is acceptable.

**Runtime bundle size:** the full runtime package must not exceed a size budget defined at Phase 2. Exceeding that budget requires explicit team approval and a documented justification.

### Code-splitting strategy

Not every page needs every engine. The runtime should load engines on demand based on what the resolved schema declares.

**Condition evaluator** — always loaded. Conditions appear on almost every page and are required for the initial render pass.

**Transform engine** — loaded lazily when the schema declares at least one `derived` namespace. Pages without derived namespaces do not pay for it.

**Action pipeline engine** — loaded lazily when the schema declares at least one `actions` entry.

**Workflow engine** — loaded lazily when the schema declares at least one `workflows` entry.

The runtime bootstrap inspects the resolved schema before loading engines, and only fetches the modules the schema actually uses.

### Package structure for code-splitting

Each engine should be a separate entry point in the runtime package so that bundlers can split it cleanly:

```
packages/runtime/src/engines/
  condition.ts    ← always bundled with runtime core
  transforms.ts   ← lazy, loaded per schema declaration
  actions.ts      ← lazy, loaded per schema declaration
  workflows.ts    ← lazy, loaded per schema declaration
```

The host application configures its bundler to treat each engine as a separate async chunk. The runtime core uses dynamic import to load them after schema inspection.

### Condition evaluation performance

The condition evaluator re-runs whenever the runtime graph updates. On pages with large widget trees and many declared conditions, this can become expensive if every graph write triggers a full re-evaluation pass.

The evaluator must track which graph paths each condition expression reads. When the graph updates, only expressions that depend on the changed path are re-evaluated. Expressions that read only unchanged paths are served from the evaluation cache.

This dependency tracking is not optional. On pages with complex widget trees, it is required for the runtime to remain responsive under normal interaction patterns.

## Production Telemetry

Devtools (graph inspector, action trace, condition inspector) are dev-time only. Production telemetry is a separate runtime concern that the host application configures at boot.

### Runtime events

The runtime emits structured events at key lifecycle points:

- `runtime.boot` — runtime initialized with schema metadata
- `namespace.hydrated` — namespace successfully populated from its source
- `namespace.failed` — namespace hydration failed and the declared `onHydrationFailure` policy was applied
- `action.started` — action pipeline began execution
- `action.step.completed` — individual pipeline step completed
- `action.completed` — action pipeline finished successfully
- `action.failed` — action pipeline halted on failure
- `workflow.transition` — workflow state changed
- `condition.evaluation.slow` — a condition expression took longer than the configured threshold
- `session.expired` — auth session expired during runtime execution

Each event includes a structured payload with `schemaId`, `correlationId`, timing data, and event-specific fields.

### Subscription contract

Host applications subscribe to runtime events at boot:

```ts
runtime.on("action.failed", (event) => {
  errorReporter.report(event);
});

runtime.on("namespace.failed", (event) => {
  metrics.increment("namespace_failures", { namespace: event.target });
});
```

The runtime does not impose a telemetry vendor. Host apps wire events to whatever observability platform they use — OpenTelemetry, Datadog, Sentry, custom internal tooling, or nothing at all.

### Performance counters

The runtime exposes performance counters through a `runtime.metrics()` snapshot:

- time-to-first-render per page
- namespace hydration latency distribution
- action pipeline duration distribution
- condition evaluation count per render
- cache hit rate for derived transforms

These are sampled by the host app on whatever cadence makes sense for its monitoring strategy.

### Default sampling

The runtime samples 100% of error events and 1% of success events by default. The sampling rate is configurable per event type at boot. High-cardinality events such as per-step completion should be sampled aggressively in production to avoid telemetry cost spikes.

## Final Position

If archV1 is adopted, the repository must evolve into a real platform and runtime structure — not an application with schema features bolted on.
