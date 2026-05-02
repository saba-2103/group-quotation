# Migration Plan To v1

## Purpose

This document defines the safest adoption path for implementing `archV1`.

This should not be a big-bang rewrite.

## Migration Principles

1. stabilize contracts first
2. introduce runtime alongside legacy behavior
3. migrate one page family at a time
4. move orchestration into runtime only when the schema language can actually express it cleanly

## Phase 1 — Contract Foundation

**Owner:** Platform team
**Estimated duration:** 4–6 weeks

Deliver:
- v1 schema contracts (TypeScript interfaces)
- schema validators
- authoring lint rules (all categories from doc 06)
- request policy contracts
- workflow contracts
- schema versioning rules (per doc 11)

Exit criteria:
- invalid schemas fail at lint time before reaching runtime
- a sample schema for one trivial page validates end to end
- the schema test harness is available for module teams

Success metric: 100% of new schemas pass validation before publication.

## Phase 2 — Runtime Foundation

**Owner:** Platform team
**Estimated duration:** 6–8 weeks
**Depends on:** Phase 1 complete

Deliver:
- runtime graph provider with Single Writer Rule enforcement
- namespace hydrator with `onHydrationFailure` policies
- `event.*` scope handling
- structural condition handling including `mountWhen`
- action pipeline engine with all step types
- basic derived transform engine
- error surface registry (toast, banner, modal defaults)
- auth client with reactive 401 refresh
- widget contract registration (per doc 10)

Exit criteria:
- one pilot page can run without widget-owned fetching
- the pilot page passes its full schema test suite
- runtime startup performance baseline is measured and documented

Success metric: pilot page time-to-first-render is within 10% of the legacy implementation.

## Phase 3 — Pilot Migrations

**Owner:** Platform team + module teams (paired)
**Estimated duration:** 8–12 weeks per pilot

Recommended order:

1. **policy workspace shell** — proves global shell state and action orchestration
2. **document center** — proves request policies and access-controlled read patterns
3. **claims list/detail** — proves workflow and query-response behavior
4. **add member workflow** — proves state machine plus child-widget readiness contracts

Each pilot has its own exit criteria:
- the migrated page renders without any wrapper code outside the schema runtime
- the schema passes lint at the strictest level (no warning suppressions)
- contract validation in CI is green
- production telemetry shows no regression in error rate or latency

Success metric for the phase: at least three of the four pilots ship to production with no rollbacks attributable to archV1.

## Phase 4 — Runtime Hardening

**Owner:** Platform team
**Estimated duration:** 4–6 weeks
**Depends on:** Phase 3 has at least two pilots in production

Deliver:
- inspector and devtools (graph, condition, action trace, workflow trace, namespace status)
- publication checks integrated with CI
- smoke rendering tests in CI
- response and schema contract validation in CI
- production telemetry event surface (per doc 07)

Exit criteria:
- a developer can debug any production schema using the devtools alone
- a broken schema cannot reach production through the publication pipeline

## Phase 5 — Packaging And Adoption

**Owner:** Platform team + release management
**Estimated duration:** 4–6 weeks
**Depends on:** Phase 4 complete and contract churn has stabilized

Extract stable packages once runtime contracts stop moving weekly. Targeted package boundaries are listed in doc 07.

Exit criteria:
- packages publish to internal registry with stable semver
- all module teams consume the runtime through the package, not direct source imports
- the migration plan is closed and the architecture transitions to maintenance mode

## Temporary Bridges

Temporary bridges are allowed only when:
- a page is blocked
- the runtime contract is not ready
- owner and removal milestone are explicit

The runtime should not silently accumulate permanent bridges.

## Final Position

The migration should optimize for reducing future wrapper code, not just quickly porting widgets into a new JSON shape.
