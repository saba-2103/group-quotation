# Schema Authoring And Review

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)

This document defines who authors schemas in the POC, what tooling they use, and how schema changes are reviewed.

---

## Who Authors Schemas

In the POC, schema authoring is engineering-owned.

Typical authors:

- frontend platform engineers for shared schema patterns and primitives
- module engineers for page-specific widget trees and conditions
- engineers introducing justified schema variants with separate `schemaId`s

Business users do not author widget trees or runtime conditions directly.

They influence schemas through:

- product specs
- design review
- acceptance criteria
- display-semantic changes in the Config System

---

## What Is Authored Where

### Source-managed schema artifacts

Authored in source-managed schema files:

- widget tree structure
- `visibleWhen`, `requiredWhen`, `editableWhen` JSONLogic
- data-source declarations
- inheritance and value-source definitions
- variants where justified

### Config System admin tooling

Authored operationally in admin tooling:

- labels
- translations
- badge/display mappings

Structural UI and behavioral conditions remain engineering-managed. Display semantics remain operationally editable.

---

## Authoring Tooling

### Required tooling

- schema source files in version-controlled source or schema repository
- binding files in version-controlled source or schema repository
- validation CLI or CI checks for schema contract, bindings, JSONLogic subset, size, and accessibility
- preview environment or smoke-render harness for rendered schema verification

### Optional tooling

- schema editor UI for engineers
- schema diff viewer
- condition explorer or dependency visualizer

---

## Authoring Flow

1. product and design finalize required page behavior
2. engineer authors or updates the widget tree
3. engineer adds JSONLogic conditions from the product spec
4. engineer declares data sources and bindings
5. engineer chooses conditions over variants unless a variant is clearly justified
6. schema and bindings pass validation
7. smoke render validates the rendered result
8. reviewer approves the change
9. schema is published and materialised

---

## Review Rules

Reviewers should explicitly check:

1. Is the widget tree readable and structurally sensible?
2. Are conditions clearly tied to the product spec?
3. Are data-source target paths explicit and collision-free?
4. Is inheritance shallow and understandable?
5. If a variant exists, is there a real justification for not using conditions?
6. Does the schema remain within size and accessibility guardrails?

---

## Variant Approval Standard

A variant should not be merged without answering:

- what exact UX difference requires the variant?
- why is a condition-based approach less maintainable?
- what route or configuration selects this variant `schemaId`?
- is this truly structural, or just a few conditional nodes?
- how will this variant stay in sync with the base schema over time?

If those answers are weak, the change should probably be conditions-first instead.

---

## Ownership Model

| Concern | Owner |
|---|---|
| schema contract and widget tree | frontend/platform plus module engineering |
| product-rule interpretation into schema conditions | module engineering with product review |
| display semantics and translations | Config System owners / ops / product operations |
| runtime and renderer behavior | frontend platform |
| auth, permissions, mutation validation | backend/platform |

This keeps schema authoring visible, reviewable, and explicitly owned.
