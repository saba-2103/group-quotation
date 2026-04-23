# Keystone UI v0 Architecture

**Status:** Proposed v0 target  
**Date:** 2026-04-23  
**Sources merged:**
- [`../KEYSTONE-UI-SYSTEM-DESIGN.md`](../KEYSTONE-UI-SYSTEM-DESIGN.md)
- [`../KEYSTONE-UI-SYSTEM-DESIGN-REVIEW.md`](../KEYSTONE-UI-SYSTEM-DESIGN-REVIEW.md)
- [`../browser-arch/`](../browser-arch/)
- [`../finalArchitecture/`](../finalArchitecture/)

This folder is the complete v0 architecture after merging:

- the original browser-based schema delivery model
- the Config System and materialisation pipeline
- the v0 runtime decisions made after stakeholder review
- the review feedback about gaps, operations, and governance

This README is the top-level story of the whole architecture. The other docs are the detailed references for each area.

## What v0 Is

Keystone UI v0 is a browser-based, metadata-driven UI architecture for standard pages such as dashboards, queues, list-detail views, admin pages, and forms with static conditions.

Every page is described by a schema. The browser fetches that schema from the CDN edge, fetches domain data directly from backend APIs, evaluates schema-authored JSONLogic conditions locally, and renders a widget tree. Display semantics such as labels and badge variants are pre-materialised server-side into the resolved schema before the browser ever sees it.

The main system-design reference is [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md).

## What v0 Is Not

v0 intentionally does **not** include:

- `useWorkbenchBootstrap()`
- a dedicated workbench runtime
- `useFieldConfig()`
- a Field Config API
- backend-driven workflow-capability contracts
- dynamic rule authoring by business users

Those are not accidental omissions. They are scope decisions that keep the architecture coherent for the initial version. The rationale is explained in [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md) and [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md).

## The Core v0 Decisions

1. Schema delivery remains browser-based and edge-resolved.
2. Conditions are static, known from product specs, and authored directly in schema.
3. Conditions use JSONLogic.
4. The UI reads from one unified runtime data graph.
5. Forms are widgets in the widget tree, not a separate runtime category.
6. Conditions are preferred for UX differentiation.
7. Variants are allowed only when a UX difference cannot be expressed cleanly and maintainably as a condition.
8. The backend still validates all mutations and security-sensitive actions.

## The Architecture In One Pass

### 1. Schema delivery happens at the edge

The browser calls `useViewMetadata(viewId)`. That request goes to a Cloudflare Worker at the CDN edge. The Worker decodes JWT claims, selects the right resolved schema artifact from storage, applies inline `$show` / `$hide` filtering where needed, strips those condition markers from the response, and returns the cleaned schema with CDN cache headers.

This keeps the original delivery mechanism intact. Schema artifacts live in `keystone-resolved-schemas`. Binding declarations live privately in `keystone-schema-bindings`. The Worker is a selector and filter, not a schema assembler. Full detail: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md).

### 2. Display semantics are still pre-materialised

Labels, translations, badge variants, and other display mappings are not computed in the browser. They come from the Config System. When config changes, the materialisation service rewrites affected resolved schema artifacts and purges CDN tags so the next schema fetch sees fresh values.

This is one of the strongest parts of the original architecture and remains unchanged in v0. Full detail: [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md).

### 3. The browser reads one runtime data graph

Once the schema arrives, the runtime hydrates named data sources into one unified runtime graph with these namespaces:

- `context`
- `data`
- `form`
- `ui`

Widgets do not read directly from raw endpoint responses. They bind to graph paths. This is the core runtime simplification in v0. Full detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md).

### 4. Conditions are evaluated locally from schema

Conditions are authored in schema from the product specs and evaluated locally in the browser using JSONLogic. That means there is no separate field-rule fetch path in v0.

There are two condition systems and they are different:

- edge `$show` / `$hide` for JWT-context filtering at schema-delivery time
- runtime JSONLogic such as `visibleWhen`, `requiredWhen`, and `editableWhen` for stateful behavior after data has loaded

The boundary between those two systems is defined in [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md), and the schema-delivery side is defined in [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md).

### 5. The renderer mounts a widget tree

The schema is a widget tree. Forms are widgets. Fields are child widgets inside form widgets. Nodes resolve values through:

1. graph bindings
2. parent-scope inheritance
3. inline schema values

This keeps the runtime model uniform across pages. Full detail: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md).

### 6. Conditions first, variants second

The default way to produce different UX for different roles, tenants, states, or lines of business is to use conditions.

Variants are still allowed, but only when a UX difference cannot be represented cleanly and maintainably as a condition. This is an explicit guardrail to prevent variant sprawl. The authoring and approval standard for this is defined in [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md).

### 7. Backend validation remains authoritative

v0 does not rely on schema as an enforcement mechanism. Schema can shape the user experience for known states. Backend APIs still validate submitted mutations.

There is no dedicated workflow contract in v0, but there is still backend enforcement. Security and mutation-validation assumptions are described in [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md).

## Why This Changed From The Old Design

Compared with [`../KEYSTONE-UI-SYSTEM-DESIGN.md`](../KEYSTONE-UI-SYSTEM-DESIGN.md), v0 makes two major scope cuts:

- remove the workbench/bootstrap path
- remove the field-rule fetch path

Those cuts are principled:

- workbench pages are out of scope for v0
- conditions are static and pre-known from specs, so they belong in schema rather than a runtime rule service

At the same time, v0 keeps the parts of the old design that were already strong:

- edge schema delivery
- Config System and materialisation
- browser-to-backend integration
- contract validation
- multi-tenant schema delivery and filtering

## The Main Architectural Bet

The biggest bet in v0 is that most condition logic is stable enough to move through the schema publication cycle.

That is the right trade for v0, but it is still a trade. If rule changes begin happening frequently and independently of schema publication, the correct next step is not to stretch schema conditions into a pseudo-rule engine. The correct next step is to introduce a narrowly scoped dynamic rule layer. This bet is called out explicitly in [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md) and operationalized in [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md).

## Operational Story

The original system design was strong conceptually but thin operationally. v0 closes that gap.

This doc set now explicitly covers:

- schema fetch SLOs and operational guarantees in [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
- edge failure modes, rollback, hotfixes, object versioning, and size guardrails in [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- audit logging, rate limiting, JWT handling, and security assumptions in [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md)
- CDN purge batching, governance, and materialisation recovery in [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md)
- Pact, Zod, resolved-schema validation, smoke rendering, observability, release pipeline, and DR in [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md)
- tenant onboarding and rollout discipline in [`06-ONBOARDING-AND-LIFECYCLE.md`](./06-ONBOARDING-AND-LIFECYCLE.md)

## Authoring Story

One of the important improvements in this doc set is that it explains not only how schemas are consumed, but also how they are authored.

In v0:

- schema authoring is engineering-owned
- display semantics remain operationally editable through the Config System
- variant usage requires explicit justification
- review must check condition clarity, graph-path ownership, inheritance, and accessibility/size constraints

That is all captured in [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md).

## Review Closure

This architecture set was also written to close the gaps called out in [`../KEYSTONE-UI-SYSTEM-DESIGN-REVIEW.md`](../KEYSTONE-UI-SYSTEM-DESIGN-REVIEW.md).

The traceability map is in [`07-REVIEW-COVERAGE.md`](./07-REVIEW-COVERAGE.md). It shows:

- which original strengths were retained
- which review gaps are now explicitly covered
- which old open questions now have concrete v0 answers
- which review items are no longer applicable because they were removed from v0 scope

## Document Map

- [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md): complete end-to-end architecture
- [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md): edge worker, storage layout, conditions vs variants at delivery, failure modes, rollback, hotfixes
- [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md): JWT handling, browser security rules, CORS, IDOR, audit and rate limiting assumptions
- [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md): Config System, bindings, materialisation, purge strategy, governance, recovery
- [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md): widget tree, runtime graph, JSONLogic conditions, edge-vs-runtime condition boundary, mutation semantics
- [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md): contract enforcement, smoke rendering, SLOs, release pipeline, DR, hotfixes, observability
- [`06-ONBOARDING-AND-LIFECYCLE.md`](./06-ONBOARDING-AND-LIFECYCLE.md): tenant onboarding, schema lifecycle, rollout and rollback
- [`07-REVIEW-COVERAGE.md`](./07-REVIEW-COVERAGE.md): mapping from review findings into the v0 architecture
- [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md): schema authoring ownership, review flow, tooling, and variant approval

## Where To Start

- If you want the full narrative, read [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md).
- If you are implementing schema fetch or Worker behavior, read [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md).
- If you are implementing runtime behavior, read [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md).
- If you are operating config/materialisation, read [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md) and [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md).
- If you are authoring schemas, read [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md).
