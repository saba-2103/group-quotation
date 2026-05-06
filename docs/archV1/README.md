# Keystone UI Architecture v1

**Status:** Proposed architecture direction  
**Date:** 2026-05-02  
**Audience:** Frontend platform, module engineers, backend engineers, tech leads, AI agents authoring schemas

This folder defines the next architecture step for Keystone UI.

It reflects implementation pressure that surfaced as the product grew:

- multi-page workflows with approval chains and maker-checker requirements
- shell-wide state that crossed page boundaries
- repeated friction around schema expressiveness, action orchestration, and widget-owned data fetching

The goal of `archV1` is not to make schema merely describe screens.

The goal is to make schema the **primary declarative contract for business-facing UI logic**, while keeping backend validation authoritative and keeping the runtime disciplined enough that product teams do not drift back into handwritten page orchestration.

## Why v1 Exists

Experience with schema-driven UI already proves three things:

1. A schema-driven widget tree is useful.
2. A schema language that cannot express orchestration, transforms, or workflows is too weak for non-trivial servicing flows.
3. When the schema language is too weak, engineers push orchestration into wrapper components and hooks.

That wrapper code is not always wrong. But if left untreated, it becomes a second architecture.

`archV1` exists to prevent that split.

## What v1 Changes

`archV1` adds first-class support for:

- cross-page shell state
- structural conditional rendering
- action/effect pipelines
- derived view-model transforms
- workflow/state-machine declarations
- request/mutation policy contracts
- runtime-owned namespace hydration instead of widget-owned fetch sprawl

## Core Position

The strong position of `archV1` is:

- schema should own page structure
- schema should own binding and view-model logic
- schema should own workflow/state transitions
- schema should own action orchestration rules
- backend should still own mutation enforcement and security

This is not a no-code fantasy.

It is a controlled declarative runtime with explicit contracts, bounded operators, strict lint rules, and observable failure modes.

## Document Map

- [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
  - end-to-end architecture and the main design decisions
- [`01-SCHEMA-LANGUAGE.md`](./01-SCHEMA-LANGUAGE.md)
  - the actual schema language shape, top-level sections, and examples
- [`02-RUNTIME-GRAPH-AND-CONTEXT.md`](./02-RUNTIME-GRAPH-AND-CONTEXT.md)
  - runtime data graph, global/page/workflow state, and hydration rules
- [`03-ACTIONS-MUTATIONS-AND-EFFECTS.md`](./03-ACTIONS-MUTATIONS-AND-EFFECTS.md)
  - declarative action pipelines, request policies, and mutation semantics
- [`04-WORKFLOWS-AND-STATE-MACHINES.md`](./04-WORKFLOWS-AND-STATE-MACHINES.md)
  - how approval-heavy and multi-step workflows should be authored in schema
- [`05-AUTH-API-AND-CONTRACT-BOUNDARY.md`](./05-AUTH-API-AND-CONTRACT-BOUNDARY.md)
  - what remains backend-owned, what the runtime requires, and the browser/API contract
- [`06-AUTHORING-LINT-AND-REVIEW.md`](./06-AUTHORING-LINT-AND-REVIEW.md)
  - how engineers should author, review, lint, and publish schemas safely
- [`07-REPO-CHANGES-AND-PACKAGING.md`](./07-REPO-CHANGES-AND-PACKAGING.md)
  - the concrete repo refactors required to implement this architecture here
- [`08-MIGRATION-PLAN.md`](./08-MIGRATION-PLAN.md)
  - phased adoption plan for implementing `archV1`
- [`09-RAW-FEEDBACK-ON-ARCH_V0.md`](./09-RAW-FEEDBACK-ON-ARCH_V0.md)
  - baseline analysis and design decisions inherited from the prior architecture direction
- [`10-WIDGET-CONTRACT.md`](./10-WIDGET-CONTRACT.md)
  - the contract every widget must implement to participate in the runtime
- [`11-SCHEMA-VERSIONING.md`](./11-SCHEMA-VERSIONING.md)
  - schema version format, compatibility rules, deprecation path, and migration tooling

## Main Architectural Bet

`archV1` makes one explicit bet:

> The right answer to wrapper-code sprawl is not to abandon schema, but to make the schema language and runtime materially more expressive.

If that bet is wrong, the platform should stop pretending it wants schema-owned business logic and instead bless a hybrid application-code architecture explicitly.

This document set assumes the bet is right and designs accordingly.
