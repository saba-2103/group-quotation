# Runtime Governance And Temporary Bridge Runbook

**Parent:** [`15-MIGRATION-AND-IMPLEMENTATION-PLAN.md`](./15-MIGRATION-AND-IMPLEMENTATION-PLAN.md)

This runbook defines how the named runtime arbiter or runtime review group should decide whether a missing capability belongs in the shared runtime or may be handled with a temporary bridge.

It exists so that migration governance is based on a repeatable process rather than individual preference.

---

## Why This Exists

During the legacy-to-`arch_v0` migration, multiple teams will discover missing runtime capabilities at different times.

Examples:

- a page needs a new binding pattern
- a page needs finer mutation revalidation control
- a team wants direct store access for performance
- a team wants to keep a widget-owned fetch temporarily
- a route wants to stay on the legacy runtime longer than planned

Without a runbook, each of those cases gets handled ad hoc.

That leads to:

- inconsistent runtime boundaries
- repeated one-off workarounds
- unclear removal ownership
- architecture drift

This runbook is the decision process the runtime arbiter or review group must follow.

---

## Scope

Use this runbook whenever a team proposes any of the following during migration:

- a new shared runtime capability
- a temporary compatibility bridge
- an exception to the runtime-store boundary
- an exception to route-manifest or generic-shell usage
- a request to keep widget-owned durable fetches on a migrated page
- a request to keep a page or route on the legacy runtime after migration work has started

This runbook does not replace normal code review. It governs migration exceptions and shared-runtime additions specifically.

---

## Required Inputs For Every Decision

No governance decision should be made without these inputs.

The proposing team must provide:

1. page family and route affected
2. exact missing capability or proposed bridge
3. why the current runtime API is insufficient
4. user impact if no bridge or shared capability is approved now
5. estimated effort for:
   - shared runtime solution
   - temporary bridge
6. blast radius:
   - one page
   - one page family
   - many pages
7. rollback strategy if the proposal causes issues
8. proposed owner
9. proposed removal milestone if a bridge is requested

If this information is missing, the arbiter should send the proposal back for completion rather than making a low-context decision.

---

## Default Decision Principle

Default bias:

- if a capability is reusable across more than one migrated page family, prefer adding it to the shared runtime
- if a need is page-specific, urgent, and genuinely temporary, a bridge may be allowed

This means bridges are allowed, but they are not the default outcome.

---

## Decision Flow

Use this sequence every time.

### Step 1. Classify the request

Classify it as one of:

- shared runtime capability gap
- temporary migration bridge
- policy exception request
- legacy-route retention request

### Step 2. Check whether the proposal violates a hard architectural rule

Reject or escalate immediately if the proposal would:

- reintroduce Worker-based schema delivery
- reintroduce `useFieldConfig()`-style dynamic field config into v0 scope
- create a second long-term runtime graph model outside `system.*` and `graph.*`
- make schema-driven widgets depend directly on Zustand or other runtime internals without approved exception handling
- bypass backend validation as the enforcement point

If the request conflicts with one of those rules, the answer is not “temporary bridge.” It is “not a v0-aligned change unless architecture is explicitly revised.”

### Step 3. Apply the shared-runtime vs temporary-bridge test

Ask these questions in order:

1. Is the capability likely to be needed by more than one migrated page family?
2. Does the capability preserve the `RuntimeGraph` contract cleanly?
3. Would allowing a bridge create a second pattern that other teams are likely to copy?
4. Would a bridge be harder to remove later than adding the runtime capability now?
5. Is the page blocked on a hard delivery date that the shared fix cannot meet?

If the first four answers trend toward reuse and stability, add the capability to the shared runtime.

If the request is genuinely narrow and time-bound, a temporary bridge may be acceptable.

---

## Decision Table

| Situation | Preferred outcome |
|---|---|
| Capability needed across 2+ page families | add to shared runtime |
| Page-specific gap with urgent delivery need | allow temporary bridge |
| Bridge would introduce a likely copy-paste pattern | add to shared runtime |
| Bridge would touch only one page and has a clear removal point | allow temporary bridge |
| Proposal violates core v0 scope boundaries | reject or escalate architecture change |
| Runtime capability exists but API is too coarse for performance | improve runtime API first; direct-store bridge only by explicit exception |

---

## Rules For Temporary Bridges

Every temporary bridge must have all of the following.

### Required fields

- bridge name
- affected page family
- reason the shared runtime path is insufficient today
- owner
- approval date
- removal milestone
- explicit rollback plan

### Required quality bar

- bridge is isolated to the smallest reasonable scope
- bridge does not change the public runtime contract unless explicitly intended
- bridge does not require widgets to depend directly on internal runtime implementation details unless separately approved
- bridge is documented in the migration record for that page family

### Non-negotiable rule

No temporary bridge may be approved without:

- a named owner
- a removal milestone

If either is missing, the bridge is not approved.

---

## Rules For Shared Runtime Additions

When the decision is “add capability to the shared runtime,” the arbiter should require:

- a short contract note for the new runtime capability
- explicit owner for the implementation
- at least one usage target beyond the first page if reuse is the justification
- tests or validation coverage for the new capability

The point is to prevent the shared runtime from becoming a dumping ground for page-specific hacks disguised as platform features.

---

## Review SLA

Recommended response time:

- acknowledge request within 1 working day
- make decision within 2 working days for standard cases
- escalate immediately if the request touches a hard architectural boundary

The arbiter should optimize for clarity and speed. Long indecision creates the same drift as no governance at all.

---

## Escalation Path

If the proposing team and the runtime arbiter disagree:

1. runtime arbiter records the reason for rejection or requested change
2. proposing team responds with impact and timeline risk
3. unresolved cases escalate to the frontend/platform lead
4. if the dispute affects scope boundaries, escalate to the architecture owner or tech lead group

Escalation should be about tradeoffs, not personal preference.

The escalation record should capture:

- proposal summary
- rejected option
- chosen option
- rationale
- follow-up action

---

## Decision Output Template

Every decision should produce a small recorded outcome in PR, issue, or decision log.

Recommended template:

```text
Request type:
Affected page family:
Summary:

Decision:
- shared runtime capability / temporary bridge / rejected / escalated

Rationale:

Owner:

Removal milestone (if bridge):

Rollback plan:

Follow-up actions:
```

---

## Examples

### Example 1. Reusable binding capability

Problem:

- `claims` and `quotations-list` both need the same new options-source binding behavior

Decision:

- add the capability to the shared runtime

Why:

- reusable across multiple page families
- bridge would create duplicate patterns immediately

### Example 2. Page-specific legacy route retention

Problem:

- one detail page cannot cut over because a critical resolved artifact path is still unstable

Decision:

- allow temporary route-level `runtime: "legacy"`

Required bridge record:

- owner
- removal milestone
- rollback note

### Example 3. Direct store access request

Problem:

- a team wants direct runtime-store access from a widget for performance

Default decision:

- do not approve direct widget-level store access immediately
- first ask whether the runtime hook layer can expose a more granular selector safely

Only approve direct access as a temporary exception if:

- performance need is proven
- runtime hook improvement cannot land in time
- owner and removal milestone are explicit

---

## Anti-Patterns

The arbiter should reject these patterns by default:

- “just for now” bridge with no removal milestone
- page-specific workaround copied into runtime as if it were a general platform feature
- direct widget dependency on runtime internals for convenience
- long-lived mock or proxy path with no owner
- using a bridge to avoid making a straightforward shared runtime improvement

---

## Relation To Migration Plan

This runbook operationalizes Pre-Sprint Decision #6 in:

- [`15-MIGRATION-AND-IMPLEMENTATION-PLAN.md`](./15-MIGRATION-AND-IMPLEMENTATION-PLAN.md)

The arbiter or review group named by that decision should use this runbook as the default operating procedure.

---

## Success Criteria

This runbook is being followed successfully when:

- bridge approvals are recorded consistently
- every bridge has an owner and removal milestone
- shared runtime additions are reusable and justified
- teams can predict how governance decisions will be made
- concurrent migrations do not fragment the runtime contract
