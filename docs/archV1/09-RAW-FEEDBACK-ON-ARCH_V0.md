# Raw Feedback On `arch_v0`

## Executive Verdict

`arch_v0` is disciplined and directionally right, but it is not sufficient for this repo's real workflow pressure.

It is a strong baseline for:

- schema delivery
- route manifests
- runtime graph naming discipline
- JSONLogic standardization
- validation and publication governance

It is underpowered for:

- cross-page shell state
- declarative action orchestration
- workflow/state-machine semantics
- derived view-model transforms
- structural child omission

## What `arch_v0` Gets Right

1. direct, explicit route-to-schema mapping
2. namespaced runtime graph discipline
3. conditions-first policy
4. schema/publication/lint seriousness
5. clear statement that backend validation remains authoritative

## Where `arch_v0` Is Too Thin

### 1. It is still too page-centric

The repo already needs shell-level state and cross-page behavior.

`arch_v0` under-specifies that.

### 2. It underestimates orchestration needs

The policy workspace build required ordered side effects. `arch_v0` does not make action pipelines first-class.

### 3. It lacks a transform layer

Real pages need derived rows, cards, and summaries from nested API payloads.

Without a schema-native transform DSL, wrapper code returns.

### 4. It is too optimistic about static conditions being enough

That may hold for some pages.

It is much less convincing for:
- scheme-specific workflows
- servicing transitions
- approval gates
- product-specific document logic

### 5. It cuts workbench/runtime concepts too aggressively

The product may not call them workbenches, but several modules behave like them.

If the architecture bans that class of runtime concern too hard, the implementation will reintroduce it informally.

## Bottom Line

`arch_v0` should not be thrown away.

It should be treated as:
- a strong delivery/runtime baseline
- missing the orchestration and workflow expressiveness this repo actually needs

That is why `archV1` extends it rather than rejecting it outright.
