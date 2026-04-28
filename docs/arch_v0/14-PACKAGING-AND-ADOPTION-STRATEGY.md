# Packaging And Adoption Strategy

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)  
**Status:** Recommendation for engineering review

This document describes how Keystone UI should be packaged so it can be reused by platform teams and product teams without turning the whole application into one tightly coupled artifact.

It also addresses a practical product goal: product teams should be able to build early demo screens on top of Keystone infrastructure and design primitives, while the platform team can later take over, harden, and evolve those screens incrementally.

---

## Problem Statement

We need to decide what the reusable unit of Keystone UI should be.

There are three obvious choices:

1. package only the low-level components
2. package the entire Keystone UI application
3. package Keystone as layered reusable modules plus a reference app

This choice matters because it affects:

- how easily product teams can build demo apps
- how much architectural drift we allow
- how much of the runtime contract is actually reused
- how easy it is for the platform team to take over product-built screens later

---

## Current Shape Of The Codebase

The current repository is still structured as a single application, but it already contains multiple architectural layers.

Representative layers in the current codebase:

- `src/components/ui/*`: low-level design-system primitives
- `src/components/widgets/*`: higher-level schema-driven widgets
- `src/components/registry/*`, `src/types/widget.ts`, `src/lib/conditions.ts`, `src/hooks/useSmartQuery.ts`: schema/runtime/renderer logic
- `src/app/*`, `src/components/providers.tsx`: Next application shell and app wiring

These layers have different stability and reuse profiles, so they should not all be distributed as one package.

---

## Options

### Option 1. Package only the components

Example shape:

- one package such as `@keystone/design-system`
- product teams import buttons, cards, inputs, tables, and layout primitives

Benefits:

- simple to explain
- easiest package to stabilize
- useful even for non-schema-driven pages
- good for visual consistency

Problems:

- product teams still rebuild their own runtime and page orchestration
- schema-driven behavior is not reused
- condition evaluation, graph wiring, bindings, and widget contracts drift between teams
- takeover by the platform team is harder because only the look is shared, not the architecture

Conclusion:

Packaging only the components is useful, but not enough.

### Option 2. Package the whole Keystone UI app

Example shape:

- one large package such as `keystone-ui`
- product teams consume the entire application stack as one dependency

Benefits:

- fastest way to reproduce the current app behavior somewhere else
- one install gives teams everything

Problems:

- app shell, routing, auth, data fetching, providers, widgets, and design primitives become tightly coupled
- Next-specific assumptions leak everywhere
- product teams have weak boundaries between stable APIs and internals
- versioning becomes difficult because almost every change becomes platform-wide
- teams will either depend on too much or fork around the package

Conclusion:

Packaging the whole app is too coarse. It optimizes for copying, not for long-term reuse.

### Option 3. Layered reusable packages plus a reference app

Example shape:

- reusable internal packages for design system, schema contracts, runtime, and widgets
- one demo/reference app that wires those packages together

Benefits:

- product teams get real reuse, not just visual primitives
- platform controls the runtime and schema contract centrally
- teams can build quickly using the reference app and standard widgets
- the platform team can take over incrementally because the runtime boundaries stay shared
- package boundaries make ownership clearer

Costs:

- requires up-front package boundary work
- requires discipline around public APIs
- workspace tooling becomes more important

Conclusion:

This is the best fit for Keystone UI.

---

## Recommendation

Do **not** package the entire Keystone UI application as one npm package.

Do **not** stop at a components-only package.

The recommended model is:

1. a reusable design-system package
2. a reusable schema/contracts package
3. a reusable runtime package
4. a reusable widgets package
5. both a starter/reference app and a CLI scaffolder for product teams

This gives product teams enough leverage to build early screens quickly while preserving the architecture the platform team actually wants to scale.

---

## Recommended Package Boundaries

### 1. `@keystone/design-system`

Owns:

- low-level UI primitives such as `Button`, `Input`, `Card`, `Tabs`, `Badge`
- layout primitives and shared visual patterns
- design tokens, variants, and theme conventions
- Storybook and component documentation

Should not own:

- schema contracts
- runtime graph logic
- API orchestration
- product-specific widget behavior

This is the most stable and broadly reusable package.

### 2. `@keystone/schema`

Owns:

- schema types
- widget config contracts
- graph namespace contracts
- condition/binding/value-source contracts
- schema validation and linting helpers

Should not own:

- React rendering logic
- app routing
- backend API clients

This package is the shared source of truth for authoring and validation.

### 3. `@keystone/runtime`

Owns:

- widget rendering orchestration
- registry interfaces
- runtime graph resolution
- condition evaluation
- data-source orchestration interfaces
- action and mutation execution interfaces
- provider abstractions needed by the schema runtime

Should not own:

- Next app routing decisions
- product screen definitions
- deployment-specific auth implementation details when those can be injected

This is the most important reusable package because it preserves the actual metadata-driven architecture.

### 4. `@keystone/widgets`

Owns:

- standard higher-level widgets such as form containers, tables, metric cards, filter bars, tabs, and layout widgets
- default widget registry entries
- widget implementations built on top of `@keystone/design-system` and `@keystone/runtime`

Should not own:

- product-specific flows that only one team needs
- app shell responsibilities

This package is how teams get a fast path to building schema-driven screens.

### 5. Starter app and CLI scaffolder

Owns:

- a supported reference app such as `apps/keystone-demo`
- a CLI scaffolder such as `create-keystone-app`
- the example Next application shell
- provider wiring
- auth integration example
- shared API client example
- example routes and example schemas
- a baseline development experience for product teams

The starter app is the canonical working reference implementation.

The CLI scaffolder exists to give product teams a fast way to start from that reference shape without copying the repository by hand.

Neither should be treated as the main reusable package.

---

## Why Components Alone Are Not Enough

If we package only primitives, teams will still reimplement or bypass:

- schema loading
- runtime graph rules
- condition evaluation
- widget registry behavior
- action/mutation conventions
- schema validation expectations

That would create visual consistency without architectural consistency.

For Keystone, the main asset is not only the component library. It is the combination of:

- schema contract
- runtime contract
- widget model
- design system

That full stack is what makes takeover and standardization possible.

---

## Why The Whole App Should Not Be The Package

If we publish the entire app as one dependency, we lock consumers into:

- one routing model
- one app shell
- one provider stack
- one auth wiring shape
- one deployment assumption set

That makes the package heavy, hard to version, and difficult for product teams to adopt selectively.

It also makes it harder to draw a line between:

- stable platform APIs
- app-specific implementation details

That boundary needs to be explicit if multiple teams are going to build on top of Keystone safely.

---

## Product-Team Adoption Model

The intended product-team experience should be:

1. start from a Keystone starter app or generate a new app from the CLI scaffolder
2. use the shared design system and standard widgets
3. author schemas using the shared schema contract
4. build product-specific screens with as little custom runtime code as possible
5. contribute schemas, small widgets, and product-specific requirements back into the shared model

This supports a useful division of responsibility.

Product teams can contribute directly to:

- schema-authored pages
- page composition
- product-specific configuration needs
- small product widgets where justified

Platform should retain ownership of:

- runtime graph semantics
- condition engine behavior
- schema contract and validation
- core widget library
- design-system primitives
- auth and API-client conventions

This model gives product teams freedom at the page level without fragmenting the platform layer.

---

## Proposed Workspace Shape

The safest near-term shape is an internal monorepo workspace.

Example:

```text
apps/
  keystone-demo/

packages/
  design-system/
  schema/
  runtime/
  widgets/
```

Optional later additions:

```text
packages/
  next-adapter/
  api-client/
```

Notes:

- `next-adapter` only becomes useful if multiple apps need the same Next-specific wiring
- `api-client` should become a package only if the auth, retry, telemetry, and contract-validation layer is stable enough to share directly

---

## Suggested Dependency Direction

Recommended dependency flow:

```text
design-system <- widgets
schema <- runtime
runtime <- widgets
design-system <- apps/keystone-demo
schema <- apps/keystone-demo
runtime <- apps/keystone-demo
widgets <- apps/keystone-demo
```

Interpretation:

- `widgets` depends on `design-system`, `schema`, and `runtime`
- the app depends on all reusable layers
- lower-level packages should not depend on the app

This keeps the reusable core independent from any one host application.

---

## Publishing Strategy

Do not start with public npm publishing as the first step.

Recommended sequence:

1. keep one repository and convert it into a workspace
2. move code into internal packages while keeping everything versioned together
3. stabilize public APIs and internal ownership boundaries
4. publish to an internal package registry only after the boundaries prove durable

This avoids premature versioning and packaging churn while the architecture is still settling.

---

## Migration Strategy From The Current Repo

### Phase 1. Introduce workspace boundaries

- keep the current repo
- add `apps/*` and `packages/*`
- move the existing application into `apps/keystone-demo`
- preserve current behavior while imports are redirected gradually

### Phase 2. Extract the most stable layer first

Move low-level UI primitives into `@keystone/design-system` first.

Why first:

- easiest to define
- lowest runtime coupling
- immediately useful to other teams

### Phase 3. Extract contracts and validation

Move schema types, validation helpers, and lint rules into `@keystone/schema`.

Why next:

- it defines the authoring contract
- it gives product teams guardrails early

### Phase 4. Extract runtime orchestration

Move renderer, registry interfaces, condition logic, and runtime graph behavior into `@keystone/runtime`.

Why later:

- it is the most architecture-critical layer
- it needs clearer interfaces before extraction

### Phase 5. Extract shared widgets

Move form containers, tables, layout widgets, and other shared schema-driven widgets into `@keystone/widgets`.

### Phase 6. Create a supported starter app experience

Provide both a supported reference app and a CLI scaffolder built from the same recommended shape.

The reference app should include:

- providers wired
- auth model demonstrated
- shared API client shown
- example routes and example schemas included

The CLI scaffolder should generate a minimal but standard host application using the same package boundaries and conventions.

---

## Contribution And Ownership Model

To make this packaging strategy work, ownership boundaries need to be explicit.

| Concern | Preferred owner |
|---|---|
| design primitives and tokens | frontend/platform |
| schema contract and validation | frontend/platform |
| runtime graph, renderer, conditions | frontend/platform |
| standard widget library | frontend/platform with module input |
| product schemas and page composition | module/product teams |
| product-specific widgets | module/product teams, with later platform promotion if reused |
| starter app, CLI scaffolder, and adoption path | frontend/platform |

This encourages product contribution without allowing each product to invent a private runtime.

---

## Decision Summary

The recommended packaging strategy is:

- not a single giant `keystone-ui` package
- not a components-only package
- a layered platform made of reusable packages plus both a starter/reference app and a CLI scaffolder

This is the best fit if the goals are:

- fast product-team demo development
- reuse of design system and infrastructure
- direct product contribution to early screens
- easy platform takeover and incremental hardening later

---

## Open Questions For Engineering Review

Before implementation starts, these questions should be answered explicitly:

1. What should the first CLI scaffold generate: a fully wired demo shell or a more minimal host app?
2. Should auth and API client behavior stay app-local at first, or become a shared package early?
3. Which current widgets are stable enough to promote into `@keystone/widgets` now, and which are still app-specific?
4. Do we want a strict public API review for each package before internal publishing?
5. What internal package registry and versioning model do we want once the workspace boundaries stabilize?
