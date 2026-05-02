# Keystone UI v1 System Design

**Status:** Proposed  
**Date:** 2026-05-02

## Executive Summary

Keystone UI v1 is a declarative application runtime where resolved schemas do not merely describe widgets. They describe:

- the widget tree
- the runtime state model
- data hydration rules
- action orchestration
- workflow transitions
- request policy
- UX-level access behavior

The browser runtime executes those contracts against a unified runtime graph. Backend APIs remain authoritative for security and mutation validation.

The motivating constraint is that page wrappers should not need to compensate for limitations in the schema language.

The most important v1 decision is:

> orchestration must become a first-class schema/runtime concern, not a page-wrapper workaround.

## What This System Is

`archV1` is a metadata-driven runtime for business applications with:

- resolved schemas fetched by `schemaId`
- a unified runtime graph with explicit scope boundaries
- declarative actions and effect pipelines
- declarative workflows / state machines
- schema-native derived view models
- strict schema and runtime validation

It is for:

- list-detail pages
- admin surfaces
- dashboard shells
- transactional wizards
- approval-heavy operational workflows
- policy-aware and role-aware servicing portals

It is **not** a dynamic arbitrary-code execution system.

## What the Baseline Approach Leaves Out

The baseline schema-driven approach already solves part of the problem well:

- route-to-schema mapping
- namespaced runtime state
- JSONLogic conditions
- server-resolved display semantics

But that baseline under-solves the actual workflow pressure.

The policy workspace build already required:

- global active policy context
- persisted shell state
- request-header plumbing outside schema
- structural tab pruning
- derived view-model transforms
- imperative action sequencing

Those are not edge cases. They are normal for this product.

## Core Design Principles

1. **Schema is the page and workflow contract.**
   Structure, bindings, transforms, conditions, action semantics, and workflow transitions belong in schema.

2. **Backend remains the enforcement point.**
   Schema may shape UX aggressively, but never replaces server-side auth, scope checks, or mutation validation.

3. **One runtime graph, multiple scopes.**
   The UI should not read from arbitrary component state silos. All meaningful state should live in declared runtime scopes.

4. **Actions are declarative pipelines.**
   Real business actions usually mean more than one side effect. The architecture should model that explicitly.

5. **Derived view models are runtime responsibilities.**
   If the UI repeatedly reshapes domain payloads for cards, grids, tabs, and summaries, the schema/runtime should own that transform layer.

6. **Workflows are first-class.**
   Approval, draft, query-response, and submission state should not be encoded only as ad hoc component behavior.

7. **Conditions first, variants second.**
   Variants are still allowed, but only when structure truly diverges.

8. **The runtime must be observable.**
   Declarative systems fail opaquely unless engineers can inspect graph state, condition evaluation, and action execution.

## Runtime Shape

The v1 browser runtime has five responsibilities:

1. fetch a resolved schema by `schemaId`
2. hydrate declared runtime scopes and namespaces
3. evaluate conditions and derived expressions
4. execute action pipelines and workflow transitions
5. render the widget tree from the evaluated graph

## Main Components

### 1. Schema delivery
- route manifest resolves `pathname -> schemaId`
- browser fetches resolved schema artifact

### 2. Runtime graph
- holds `system.*`, `app.*`, and `page.*`
- owns lifecycle and subscriptions

### 3. Data hydrator
- populates namespaces from `api`, `local`, `inline`, and derived sources
- manages dependencies and invalidation

### 4. Condition and expression engine
- JSONLogic for conditions
- bounded transform DSL for derived data

### 5. Action engine
- executes ordered effect pipelines
- integrates request policy, mutations, state patches, and navigation

### 6. Workflow engine
- executes declared state transitions
- coordinates draft, approval, query, completion, and resume behavior

### 7. Schema renderer
- renders widgets from evaluated graph state
- applies structural omission, not just cosmetic hiding

## Primary Runtime Scopes

The runtime uses three explicit scopes:

- `system.*`
  - readonly runtime-managed context
  - auth/session, route params, feature flags, deployment info
- `app.*`
  - cross-page mutable state
  - active policy, active org, user preferences, shell state
- `page.*`
  - page-local data, drafts, filters, transient UI state, workflow instances

This is explained in detail in [`02-RUNTIME-GRAPH-AND-CONTEXT.md`](./02-RUNTIME-GRAPH-AND-CONTEXT.md).

## Primary Schema Sections

A v1 resolved schema should have these conceptual sections:

- metadata (`schemaId`, `version`, ownership)
- route contract assumptions
- runtime scope declarations
- namespaces / sources
- derived values
- access policy
- workflow declarations
- action definitions
- widget tree

This is defined concretely in [`01-SCHEMA-LANGUAGE.md`](./01-SCHEMA-LANGUAGE.md).

## Example: Why This Matters

The policy switcher problem from `PROP-0004` is a good example.

Without declarative action pipelines, this requires custom code to:

1. update active policy context
2. persist it to local storage
3. send a best-effort backend context patch
4. navigate to a detail route

In v1, that should be one declarative action pipeline attached to the switcher interaction.

That is the kind of shift this architecture is trying to make.

## Explicit Non-Goals

`archV1` still does **not** mean:

- arbitrary JavaScript inside schemas
- business-user-authored procedural logic
- frontend enforcement replacing backend checks
- unbounded custom operators
- a second application framework hidden inside JSON

The language remains bounded, typed, validated, and reviewable.

## Success Criteria

The architecture is successful when:

- new Tier 1 and Tier 2 screens need little or no custom wrapper orchestration
- global shell behavior is represented as schema/runtime contracts rather than bespoke page logic
- action and workflow semantics are reusable across features
- engineers can inspect and debug runtime decisions without reverse-engineering React wrappers
- backend teams still see a clean, explicit contract for reads, writes, and enforcement

## Document References

- schema language: [`01-SCHEMA-LANGUAGE.md`](./01-SCHEMA-LANGUAGE.md)
- runtime graph: [`02-RUNTIME-GRAPH-AND-CONTEXT.md`](./02-RUNTIME-GRAPH-AND-CONTEXT.md)
- action pipelines: [`03-ACTIONS-MUTATIONS-AND-EFFECTS.md`](./03-ACTIONS-MUTATIONS-AND-EFFECTS.md)
- workflows: [`04-WORKFLOWS-AND-STATE-MACHINES.md`](./04-WORKFLOWS-AND-STATE-MACHINES.md)
- repo implications: [`07-REPO-CHANGES-AND-PACKAGING.md`](./07-REPO-CHANGES-AND-PACKAGING.md)
