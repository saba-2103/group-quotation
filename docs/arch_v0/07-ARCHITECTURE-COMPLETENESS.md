# Architecture Completeness

**Purpose:** Checklist showing which concerns are covered by this architecture set and where they are specified.

This file makes the architecture self-auditable without relying on any external review document.

---

## Core Architecture Coverage

| Concern | Covered in |
|---|---|
| End-to-end system design | [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md) |
| Direct schema delivery model | [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md) |
| Browser auth and backend validation | [`02-AUTH-AND-SECURITY.md`](./02-AUTH-AND-SECURITY.md) |
| Config System and materialisation | [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md) |
| Runtime graph, widget tree, conditions, and mutation semantics | [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md) |
| Contracts, observability, DR, release model, and hotfixes | [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md) |
| Environment onboarding and lifecycle | [`06-ONBOARDING-AND-LIFECYCLE.md`](./06-ONBOARDING-AND-LIFECYCLE.md) |
| Schema authoring and review process | [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md) |
| Packaging and product-team adoption model | [`14-PACKAGING-AND-ADOPTION-STRATEGY.md`](./14-PACKAGING-AND-ADOPTION-STRATEGY.md) |
| Route-to-schema mapping model | [`16-ROUTE-MANIFEST-AND-SCHEMA-RESOLUTION.md`](./16-ROUTE-MANIFEST-AND-SCHEMA-RESOLUTION.md) |
| Runtime governance and bridge decision process | [`17-RUNTIME-GOVERNANCE-AND-BRIDGE-RUNBOOK.md`](./17-RUNTIME-GOVERNANCE-AND-BRIDGE-RUNBOOK.md) |
| Locked decisions, assumptions, tradeoffs, and FAQ | [`09-DECISIONS-SUMMARY.md`](./09-DECISIONS-SUMMARY.md) |

---

## Operational Coverage

| Concern | Covered in |
|---|---|
| Delivery failure modes | [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md) |
| Schema versioning and rollback | [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md) |
| Hotfix policy | [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md), [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md) |
| CDN purge strategy | [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md) |
| Materialisation recovery | [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md) |
| Contract validation | [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md) |
| Smoke rendering | [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md) |
| Observability metrics and alerting | [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md) |
| Release pipeline and gates | [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md) |
| Environment rollout guardrails | [`06-ONBOARDING-AND-LIFECYCLE.md`](./06-ONBOARDING-AND-LIFECYCLE.md) |

---

## Governance Coverage

| Concern | Covered in |
|---|---|
| Config key rules and ownership | [`03-CONFIG-AND-MATERIALISATION.md`](./03-CONFIG-AND-MATERIALISATION.md) |
| Variant approval standard | [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md) |
| Authoring ownership model | [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md) |
| Accessibility and size guardrails | [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md), [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md) |

---

## Explicit Scope Boundaries

| Not included | Defined in |
|---|---|
| Workbench/bootstrap runtime | [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md), [`09-DECISIONS-SUMMARY.md`](./09-DECISIONS-SUMMARY.md) |
| Dynamic field-rule APIs | [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md), [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md) |
| Runtime schema selection by context | [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md), [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md) |
| Worker-based schema delivery | [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md), [`09-DECISIONS-SUMMARY.md`](./09-DECISIONS-SUMMARY.md) |

---

## Questions This Architecture Answers

This architecture set answers all of these directly:

- how schemas are fetched
- how schemas are published
- what conditions are allowed
- when to use a variant
- how the UI reads data
- how mutations update runtime state
- who authors schemas
- how artifacts are validated
- how delivery failures recover
- how hotfixes and rollbacks work
- what assumptions the architecture depends on
- how browser routes resolve to explicit `schemaId`s

If a question is not answered by this set, it should either be added as a new architecture concern or explicitly declared out of scope.
