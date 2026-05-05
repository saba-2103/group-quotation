# ADR: Runtime Graph Store Boundary

**Status:** Accepted  
**Owner:** Frontend Platform  
**Date:** 2026-04-29

**Related Docs:**

- [`../archV1/00-SYSTEM-DESIGN.md`](../archV1/00-SYSTEM-DESIGN.md)
- [`../archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md`](../archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md)
- [`../archV1/08-MIGRATION-PLAN.md`](../archV1/08-MIGRATION-PLAN.md)

---

## Decision

The `archV1` runtime graph store will be implemented using Zustand behind a `RuntimeProvider` abstraction.

The public contract for consumers is the runtime graph model and runtime hooks, not raw Zustand APIs.

Schema-driven widgets and migrated page code must access runtime state only through runtime-owned hooks and helpers. They must not import or depend on Zustand directly.

Direct Zustand usage is allowed only inside runtime infrastructure and explicitly approved platform-owned escape hatches.

---

## Context

`archV1` is built around one unified runtime graph:

- `system.*`
- `graph.*`

That graph is the architectural contract the UI should depend on.

The implementation still needs a concrete client-side state mechanism. Zustand is a pragmatic fit for the current repo because:

- the repo already uses Zustand successfully in existing stores such as `useOverlayStore.ts`
- Zustand is lightweight and easy to integrate with React
- Zustand supports selective subscriptions and can be made performant for graph-driven rendering
- the team already accepts Zustand as a dependency, so this is low-friction

However, allowing widgets and feature code to depend directly on Zustand would weaken the architecture boundary.

If widgets imported the runtime store directly, the following would happen over time:

- store structure would become part of the widget contract
- internal state implementation details would leak across the repo
- runtime refactors would become expensive because many widgets would depend on store internals
- the intended architectural contract, `RuntimeGraph`, would stop being the true source of coupling

This ADR keeps the architecture boundary clean while still using a pragmatic implementation.

---

## Architectural Boundary

There are two separate layers.

### 1. Architectural contract

This is what the rest of the system should depend on:

- `RuntimeGraph`
- `RuntimeProvider`
- runtime hooks
- runtime selectors
- runtime actions
- runtime binding and condition helpers

Examples of architectural-level usage:

- read `system.routeParams.quoteId`
- read `graph.quote`
- read `graph.quoteDraft`
- patch `graph.filters`
- revalidate `graph.quote`

### 2. Implementation detail

This is how the runtime graph happens to be stored today:

- Zustand store
- Zustand selectors
- Zustand middleware
- store initialization details
- store instance shape
- `getState`, `setState`, store composition internals

These details belong to runtime infrastructure, not to widgets.

---

## Hard Rule

Consumers must program against the runtime contract, not the store implementation.

The intended dependency direction is:

- widgets depend on runtime hooks
- runtime hooks depend on `RuntimeProvider`
- `RuntimeProvider` depends on Zustand

Not:

- widgets depend on Zustand store directly

---

## Allowed Usage

Direct Zustand usage is allowed in these places:

- `RuntimeProvider` implementation
- runtime store creation module
- runtime-owned hooks such as selector hooks
- runtime hydration code such as `usePageDataGraph`
- runtime mutation and revalidation wiring
- platform-owned infrastructure stores that are not part of the schema-driven runtime, such as overlays

These are platform internals.

---

## Disallowed Usage

Direct Zustand usage is not allowed in these places:

- schema-driven widgets
- migrated page modules
- page-specific feature logic that should depend on `RuntimeGraph`
- condition evaluation consumers
- binding resolution consumers
- form widgets that are part of the `archV1` runtime path
- route-level schema-driven screens

Examples of disallowed behavior:

- importing the runtime Zustand store directly into a widget
- calling raw Zustand selectors from a schema-driven table component
- patching graph state from a page component via store internals instead of runtime actions
- making widget behavior depend on store implementation details instead of runtime graph semantics

---

## Default Access Pattern

The default access path for runtime state is:

- runtime hooks for reads
- runtime actions for writes
- runtime graph selectors owned by the runtime package
- value-source helpers for bindings

Examples of acceptable usage patterns:

- `useRuntimeValue(path)`
- `useRuntimeSelector(selector)`
- `useRuntimeActions()`
- `useValueSource(...)`

The exact hook names may change, but the boundary should not.

---

## Escape Hatch Policy

This decision does not mean nobody can ever use Zustand directly outside runtime internals.

It means direct access is an exception that must be explicit and reviewed.

Direct Zustand access outside runtime internals is allowed only if all of the following are true:

- there is a real technical reason
- the runtime-owned hooks are insufficient for the use case
- the engineer documents why the runtime API is insufficient
- the runtime owner approves the exception
- the exception has an owner
- the exception has a removal milestone if it is temporary

Typical reasons an escape hatch might be approved:

- performance-critical subscription granularity that the runtime hook layer cannot yet express
- short-lived migration bridge needed to keep delivery moving
- runtime infrastructure code temporarily living in an app-local location during extraction

Typical reasons an escape hatch should not be approved:

- convenience
- familiarity with Zustand
- avoiding the effort of adding the right runtime hook
- "we might need this flexibility later"

---

## Performance Guidance

One legitimate concern with abstraction layers is accidental over-rendering.

To avoid that, runtime hooks must be designed with subscription granularity in mind.

Good patterns:

- selector-based hooks
- path-scoped hooks
- explicit read helpers for small graph slices
- actions separated from read subscriptions

Bad patterns:

- hooks that return the entire graph to most widgets
- hooks that force unrelated subtrees to re-render
- exposing raw store access because the hook layer was too coarse

If engineers feel forced to bypass the abstraction for basic performance reasons, that is usually a sign the runtime API needs better selectors, not that the boundary itself was a mistake.

---

## Debugging Guidance

A good way to think about the flow is:

- widget
- runtime hook
- `RuntimeProvider`
- Zustand-backed store

That is acceptable as long as the layers are explicit and named well.

The runtime package should provide:

- clear hook names
- clear ownership of read and write paths
- logging around hydration and mutation flows where helpful
- a small number of stable entry points instead of many ad hoc helpers

The architecture should not hide the fact that Zustand exists. It should simply keep the dependency boundary disciplined.

---

## Migration Guidance

During the legacy-to-v1 migration, the repo will temporarily have both old and new patterns.

The rule during migration is:

- newly migrated pages must use runtime hooks only
- newly migrated widgets must not import Zustand directly
- legacy code can continue to use its existing stores until migrated
- temporary bridges must be documented and owned

This keeps the new runtime clean even while the repo is mixed overall.

---

## Consequences

### Benefits

- keeps `RuntimeGraph` as the real architectural contract
- protects widgets from store implementation churn
- makes future store replacement possible without rewriting widget code
- keeps platform-owned runtime semantics centralized
- supports incremental extraction into `@keystone/runtime`
- fits the current repo because Zustand is already accepted and understood

### Costs

- adds an abstraction layer that must be designed and maintained
- requires discipline to prevent boundary leaks
- can make debugging slightly less direct
- needs well-designed runtime hooks to avoid performance complaints
- requires runtime-owner review of exceptions

### Why The Trade Is Worth It

The cost of the abstraction is smaller than the cost of letting store internals leak into schema-driven widgets.

This architecture depends on a strong runtime boundary. If the graph store shape becomes a widget dependency, the architecture erodes quickly and future refactors become much more expensive.

---

## Enforcement

This decision should be enforced in three ways.

### 1. Code review rule

Reviewers should reject changes where:

- schema-driven widgets import Zustand directly
- migrated page code imports the runtime store directly
- direct store access is used without documented runtime-owner approval

### 2. Import boundary rule

Add linting or equivalent repo enforcement so that:

- runtime internals may import Zustand
- schema-driven widgets may not import Zustand
- app code outside approved infra modules may not import the runtime store directly

### 3. Runtime API ownership

The runtime owner is responsible for:

- keeping the public runtime hooks small and useful
- reviewing escape hatch requests
- converting repeated exceptions into better public runtime APIs where appropriate

---

## Accepted Default

The accepted default for `archV1` is:

- Zustand-backed runtime store
- `RuntimeProvider` abstraction
- widgets access graph through runtime hooks only
- no direct Zustand access from schema-driven widgets or migrated page code

---

## Acceptance Criteria

This decision is complete when all of the following are true:

- this decision record is committed
- `docs/archV1/15-MIGRATION-AND-IMPLEMENTATION-PLAN.md` Pre-Sprint Decision #1 links to it
- runtime implementation uses Zustand behind a provider abstraction
- runtime hooks are the only supported graph access path for migrated widgets and pages
- direct Zustand imports are disallowed outside runtime infrastructure unless explicitly approved
