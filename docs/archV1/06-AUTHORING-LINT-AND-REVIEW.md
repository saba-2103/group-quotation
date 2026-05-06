# Authoring, Lint, And Review v1

## Purpose

This document defines how engineers should author and review `archV1` schemas.

Because the schema language is stronger, review discipline must also become stronger.

## Who Authors Schemas

Schema authoring is engineering-owned.

Typical ownership split:

- platform: runtime, contracts, schema linting, shared actions, shared workflows
- module teams: page schemas, workflow definitions, domain-specific conditions
- backend teams: API contracts and capability payload alignment

## Required Authoring Inputs

Before writing a schema, the author should know:

1. route and `schemaId`
2. required runtime scopes and namespaces
3. domain APIs involved
4. workflow states and transitions
5. role/scope behavior
6. derived view-model needs

If those are not understood, the author is too early to write a stable schema.

## Required Lint / Validation Categories

1. identity rules
2. namespace rules
3. binding rules
4. structural condition rules
5. transform DSL rules
6. action pipeline rules
7. workflow transition rules
8. request policy rules
9. accessibility rules

## New Rules v1 Must Add

### Global state discipline

App-scoped namespaces must declare a persistence policy explicitly.

A namespace without a `persist` declaration behaves as ephemeral. If that is the intent, declare `"provider": "none"` to make it explicit. If persistence is intended, declare the provider and the `clearOn` triggers. Implicit fallback behavior is not acceptable for shell-level state that survives navigation.

### Structural condition discipline

`mountWhen` is allowed only on node types where structural omission is explicitly supported by the renderer.

Not every widget type supports being structurally absent. Using `mountWhen` on an unsupported type results in undefined behavior. The lint rule must validate that the target node type supports structural omission before allowing `mountWhen` on it.

### Action pipeline discipline

Action steps must reference only known, declared step types. Unknown step types are a hard lint error.

A `navigate` step cannot appear before required blocking mutation steps unless the transition is explicitly annotated as non-blocking. A user navigating away before a required mutation completes is a correctness failure, not just a user experience issue.

### Workflow discipline

Transitions cannot reference states that are not declared in the workflow definition. This must be a hard lint error, not a warning.

Terminal states cannot have outgoing transitions unless the transition is explicitly flagged with `"exceptional": true`. Exceptional transitions should be reserved for administrative override or error recovery paths only — not normal user flows.

### Transform discipline

Only the approved transform operators from the bounded DSL vocabulary are allowed in `derived` namespaces.

Arbitrary JavaScript, embedded functions, and inline code expressions are not permitted inside transforms. If a use case cannot be expressed with approved operators, the author must either use a `$expr` binding with an explicit review note, or raise an operator proposal with the platform team as described in the transform governance section.

## Review Questions

Reviewers should ask:

1. Is state in the right scope (`system`, `app`, `page`)?
2. Is orchestration logic hidden inside widget props or variant definitions instead of being declared as an explicit action pipeline?
3. Are derived transforms readable and bounded?
4. Are actions expressed as pipelines where needed, not one-off hacks?
5. Is workflow state explicit, or being implied by form behavior?
6. Is a variant really justified, or is the author escaping missing language features?

## Schema Testing Guide

Schemas require their own testing strategy. Type-checking and lint rules verify structural validity. They do not verify that a schema produces the correct runtime behavior for the business cases it is meant to cover.

### What to test

**Namespace hydration**

Test that each namespace hydrates from the correct source and that the resulting graph shape matches the expected contract. Use a mock runtime hydrator that returns controlled API responses. Verify both the success path and the declared `onHydrationFailure` behavior.

**Condition evaluation**

Test that `visibleWhen`, `enabledWhen`, `mountWhen`, and related conditions evaluate correctly given representative graph states. Cover both the true and false cases for every declared condition — not only the happy path.

**Derived transforms**

Test each derived namespace transform against representative input data. Verify the output shape and values match what the widget tree expects. Transforms that involve `filter` must include a test case for empty source data.

**Action pipeline behavior**

Test that action pipelines execute the expected sequence of steps given a starting graph state. Verify that `guard` conditions branch correctly and that `onFailure` paths are reachable with controlled mutation errors.

**Workflow transitions**

Test that workflow transitions move between the correct states given the declared `when` conditions. Test both the allowed path and the blocked path for every conditional transition. Verify that the post-mutation reconciliation step fires and that the frontend state matches the reconciled backend response.

### Test harness expectations

The platform team owns building this harness. It must be available before Phase 3 pilots begin.

The platform runtime package must export a test harness with:

- a mock `RuntimeGraphProvider` that accepts a partial graph as initial state
- a `hydrateNamespace` utility that executes namespace hydration against a mock API client
- an `evaluateCondition` utility that runs a condition expression against a provided graph snapshot
- an `executeAction` utility that runs an action pipeline against a mock graph and returns the resulting graph state

### Schema snapshot tests

Schemas should also have snapshot tests. A schema snapshot test renders the widget tree in a headless runtime, captures the evaluated tree, and asserts it matches the stored snapshot.

Snapshot tests catch unintended structural changes when schema edits affect the evaluated output in ways the author did not anticipate. They are especially useful for schemas with many conditional branches.

### When to write tests

Tests should be written before the schema is marked ready for review. The authoring checklist must include:

- at least one test per declared namespace verifying its hydrated shape and failure path
- at least one test per declared condition covering both evaluation outcomes
- at least one test per workflow transition covering both conditional branches where applicable
- a snapshot test for the evaluated widget tree on the default graph state

A schema submitted for review without these tests should be returned to the author.

## Final Position

If review does not become stricter as schema power increases, the platform will end up with unreadable JSON instead of maintainable architecture.
