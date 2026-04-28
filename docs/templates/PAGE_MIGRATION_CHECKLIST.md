# Page Migration Checklist

Use this file as a copyable checklist for one page family migrating from the legacy runtime to `arch_v0`.

Do not edit this canonical template for page-specific work. Copy it into a page-family-specific location and check off the copied version.

---

## Page Metadata

- Page family:
- Owner:
- Reviewer:
- Current route(s):
- Target route manifest entry:
- Current source schema file(s):
- Target `schemaId`:
- Expected route params:
- Backend owner(s):
- Auth requirement: mock / real
- Current runtime owner: `legacy`
- Target runtime owner: `v0`

---

## Readiness Inputs

- [ ] Product-approved condition rules available
- [ ] Required backend endpoints listed
- [ ] Backend readiness per namespace reviewed
- [ ] Route params identified
- [ ] Variant need reviewed
- [ ] Display semantics source identified

---

## Route And Identity

- [ ] Route manifest entry created
- [ ] Final `schemaId` assigned
- [ ] `schemaId` matches naming convention
- [ ] Route params mapped into `system.routeParams`
- [ ] If dual-runtime period is active, route manifest entry marked with `runtime: "legacy"`

Notes:

- Custom host-page reason, if not using generic shell immediately:

---

## Namespace Design

- [ ] All required `graphNamespaces` declared
- [ ] Each namespace classified as `api`, `local`, or `inline`
- [ ] Namespace names reviewed for semantic naming
- [ ] Single-writer ownership checked
- [ ] Draft namespace declared where forms exist
- [ ] Page-local state moved out of ad hoc keys such as `page:*`

Namespace map:

| Namespace | Kind | Usage | Endpoint / Initializer | Owner |
|---|---|---|---|---|
| | | | | |

---

## Data Fetch Migration

- [ ] Current widget-owned fetches inventoried
- [ ] Durable widget-owned fetches moved into page-owned namespaces
- [ ] Endpoint templates resolve from `system.routeParams` where needed
- [ ] Eager vs deferred hydration decided per namespace
- [ ] Any temporary bridge fetches documented with owner and removal milestone

Current widget fetch inventory:

| Widget | Current endpoint | Target namespace | Status |
|---|---|---|---|
| | | | |

---

## Widget Tree Conversion

- [ ] Widget tree converted to new page schema contract
- [ ] Absolute binds updated to `system.*` or `graph.*`
- [ ] Relative binds reviewed against parent scope
- [ ] Options sources point at declared namespaces
- [ ] Inline values kept inline where appropriate
- [ ] Unsupported node-level condition keys removed

---

## Condition Conversion

- [ ] Legacy `{ field, operator, value }` conditions removed
- [ ] All conditions expressed in allowed JSONLogic subset
- [ ] Conditions reference only `system.*` or declared `graph.*`
- [ ] Repeated condition patterns reviewed for refactor or variant need
- [ ] Complex conditions reviewed for readability budget

Condition notes:

- Repeated patterns:
- Any condition requiring special review:

---

## Form And Mutation Conversion

- [ ] Form state moved to draft namespace such as `graph.*Draft`
- [ ] Field bindings rebased relative to draft scope
- [ ] Submit path uses shared API client
- [ ] Mutation refresh semantics chosen:
  - [ ] re-fetch owning namespaces
  - [ ] patch locally then revalidate
- [ ] Reset-on-success behavior decided explicitly
- [ ] Backend validation/error envelope reviewed

Mutation table:

| Action | Endpoint | Refresh strategy | Notes |
|---|---|---|---|
| | | | |

---

## Validation And Publication

- [ ] Source schema passes contract validation
- [ ] Route manifest passes validation
- [ ] JSONLogic subset validation passes
- [ ] Namespace/path collision validation passes
- [ ] Accessibility checks pass
- [ ] Size budget checks pass
- [ ] Resolved artifact published locally or to target store
- [ ] Published artifact validates as resolved schema

Artifact details:

- Published artifact path:
- `resolvedAt` check:
- Publication command used:

---

## Smoke Render And Runtime Checks

- [ ] Smoke render passes against resolved artifact
- [ ] Route resolves to intended `schemaId`
- [ ] Schema fetch succeeds through `useViewMetadata(schemaId)`
- [ ] Page renders through new runtime path
- [ ] Conditions behave correctly with real or representative data
- [ ] Route params visible in `system.routeParams`
- [ ] No legacy schema import remains in the route file

---

## Cutover

- [ ] Generic schema shell enabled for the route
- [ ] If dual-runtime period is active, route manifest entry switched to `runtime: "v0"`
- [ ] Legacy route/schema path removed or explicitly retained for rollback only
- [ ] Post-cutover verification run completed

Cutover date:

- 

---

## Rollback Plan

- [ ] Artifact rollback path documented
- [ ] Route rollback path documented
- [ ] Owner named for rollback decision

Rollback steps:

1. 
2. 
3. 

---

## Completion Checklist

- [ ] Route resolves through explicit manifest
- [ ] Page fetches resolved schema by `schemaId`
- [ ] Page reads one runtime graph
- [ ] Page no longer depends on legacy condition DSL
- [ ] Page no longer depends on ad hoc `page:*` state keys
- [ ] Durable data is page-owned, not widget-owned
- [ ] Forms use explicit draft namespaces where applicable
- [ ] Backend reads/writes use shared client path
- [ ] Page passed smoke render and publication validation
- [ ] Rollback plan tested or reviewed
