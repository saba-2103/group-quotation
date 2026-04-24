# Keystone UI v0 Architecture

**Status:** Architecture baseline  
**Date:** 2026-04-23

This folder is the complete architecture for the initial on-prem deployment.

It intentionally uses a simplified delivery model:

- no multi-tenant runtime
- no context-based schema selection service
- no Cloudflare Worker or edge resolver
- no `useFieldConfig()`
- no `useWorkbenchBootstrap()`

## The Whole Story

Every page is described by a resolved schema identified by a unique `schemaId`.

The browser fetches that schema directly from CDN/S3 using the `schemaId`, fetches domain data directly from backend APIs, evaluates schema-authored JSONLogic conditions locally against a unified runtime data graph, and renders a widget tree.

Display semantics such as labels, translations, and badge variants are still produced server-side by the Config System and materialised into the resolved schema artifact before publication.

The architecture therefore has four main moving parts:

1. **Static schema delivery**: `schemaId -> CDN -> S3 artifact`
2. **Unified page runtime**: one runtime graph for all page state
3. **Server-side config materialisation**: display semantics resolved before browser fetch
4. **Backend mutation validation**: schema shapes UX, backend validates writes

## Core v0 Decisions

1. Schema delivery is direct and static by `schemaId`.
2. Conditions are static, known from product specs, and authored directly in schema.
3. Conditions use JSONLogic.
4. The UI reads from one unified runtime data graph.
5. Forms are widgets in the widget tree, not a separate runtime category.
6. Conditions are preferred for UX differentiation.
7. Variants are allowed only when a UX difference cannot be expressed cleanly and maintainably as a condition.
8. Variants, when used, are separate schema artifacts with their own `schemaId`s and are selected explicitly by application code or configuration, not by a runtime resolver.
9. The backend still validates all mutations and security-sensitive actions.

## Delivery Model

The browser calls `useViewMetadata(schemaId)` and fetches a resolved schema artifact directly from CDN/S3. There is no Worker in the path, no JWT decode at delivery time, and no context-based filtering before the browser receives the schema.

This keeps the deployment model operationally simple:

- one schema artifact per `schemaId`
- one CDN path per artifact
- no edge runtime
- no context hash keys
- no delivery-time filtering logic

Full detail: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md).

## Runtime Model

After schema fetch, the browser hydrates a single runtime data graph with these namespaces:

- `context`
- `data`
- `form`
- `ui`

Conditions are evaluated locally against that graph using JSONLogic. The schema is a widget tree. Forms are widgets. Fields are child widgets within form widgets. Data bindings, inheritance, and inline value sources are all resolved within that runtime.

Full detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md).

## Conditions Versus Variants

Conditions are the default tool for UX differences.

Use a condition when the difference is localized, readable, and driven by known state.

Use a variant only when the difference is structural enough that a condition-based approach would become less maintainable.

In this POC, because there is no runtime schema resolver, a variant means a separate schema artifact with its own `schemaId`. That `schemaId` must be chosen explicitly by route or configuration.

This rule is enforced in authoring and review. Full detail: [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md).

## Config And Materialisation

The Config System still owns display semantics.

When a config value changes:

1. config is saved
2. materialisation resolves bindings
3. new resolved schema artifacts are written
4. CDN purge runs
5. the next browser fetch gets the fresh artifact

This is deployment-wide.

Full detail: [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md).

## Security Model

The browser still talks directly to backend APIs using the shared API client and JWT-based auth. Backend validation remains the enforcement point for writes.

The important simplification is that schema delivery itself is no longer an authenticated edge-resolution flow. The POC assumes schema artifacts are non-sensitive metadata and can be served directly via CDN. If that assumption changes later, schema delivery will need signed/private access rather than a static public path.

Full detail: [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md).

## Operational Story

These docs cover:

- schema delivery failure modes, rollback, hotfixes, and artifact size budgets in [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- config governance, purge strategy, and materialisation recovery in [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md)
- Pact, Zod, resolved-schema validation, smoke rendering, release pipeline, DR, and observability in [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md)
- rollout discipline and lifecycle checks in [`06-ONBOARDING-AND-LIFECYCLE.md`](./06-ONBOARDING-AND-LIFECYCLE.md)

## The Main Architectural Bet

The biggest bet in v0 is that most condition logic is stable enough to move through the schema publication cycle.

That is the right trade for the current deployment, but it is still a trade. If rules begin changing frequently and independently of schema publication, the right next step is a narrowly scoped dynamic rule layer, not increasingly procedural schema logic.

## Completeness

Architecture coverage is summarized in [`07-ARCHITECTURE-COMPLETENESS.md`](./07-ARCHITECTURE-COMPLETENESS.md).

## Document Map

- [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md): full end-to-end architecture
- [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md): direct `schemaId -> CDN -> S3` delivery, variants, failure modes, rollback, hotfixes
- [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md): browser auth, backend validation, direct API access, audit/rate limiting, schema sensitivity assumptions
- [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md): display semantics, bindings, materialisation, purge strategy, governance
- [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md): widget tree, runtime graph, JSONLogic conditions, variants, mutation semantics
- [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md): contract enforcement, smoke rendering, SLOs, release pipeline, DR, hotfixes, observability
- [`06-ONBOARDING-AND-LIFECYCLE.md`](./06-ONBOARDING-AND-LIFECYCLE.md): environment/deployment onboarding, schema lifecycle, rollout and rollback
- [`07-ARCHITECTURE-COMPLETENESS.md`](./07-ARCHITECTURE-COMPLETENESS.md): architecture coverage checklist and resolved questions
- [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md): schema authoring ownership, review flow, tooling, and variant approval
- [`09-DECISIONS-SUMMARY.md`](./09-DECISIONS-SUMMARY.md): locked decisions, principles, assumptions, tradeoffs, and quick answers to likely questions
