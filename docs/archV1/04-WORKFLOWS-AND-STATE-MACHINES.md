# Workflows And State Machines v1

## Purpose

This document defines how approval-heavy and multi-step workflows should be modeled in schema.

This is necessary because the product is not just page-driven. It is workflow-driven.

Examples from the PRD:

- add member
- remove member via LWD
- claim initiation and query response
- renewal census and acceptance
- setup journeys

## Core Position

Workflows should be first-class runtime contracts.

They should not depend only on:

- hidden assumptions in form widgets
- page wrapper state
- local component booleans
- backend status strings passed through without a state model

Without a workflow contract, workflow rules get reinvented per feature. Draft state, step completion gating, file upload readiness, and maker-checker logic end up scattered across widget-local booleans and page wrapper conditions. That makes the rules invisible to reviewers and impossible to test as a unit.

## Workflow Definition Shape

```ts
interface WorkflowDefinition {
  initialState: string;
  states: Record<string, WorkflowStateDefinition>;
  transitions: WorkflowTransition[];
}

interface WorkflowStateDefinition {
  label: string;
  terminal?: boolean;
  entryActions?: string[];
  exitActions?: string[];
}

interface WorkflowTransition {
  id: string;
  from: string | string[];
  to: string;
  trigger: string;
  when?: ConditionExpr;
  effects?: string[];
}
```

## Add Member Example

```json
{
  "workflows": {
    "addMember": {
      "initialState": "draft",
      "states": {
        "draft": { "label": "Draft" },
        "pendingApproval": { "label": "Pending Approval" },
        "submitted": { "label": "Submitted" },
        "queryRaised": { "label": "Query Raised" },
        "completed": { "label": "Completed", "terminal": true },
        "rejected": { "label": "Rejected", "terminal": true }
      },
      "transitions": [
        {
          "id": "submit-with-approval",
          "from": "draft",
          "to": "pendingApproval",
          "trigger": "submit",
          "when": { "==": [{ "var": "page.org.makerCheckerEnabled" }, true] },
          "effects": ["submitAddMemberRequest"]
        },
        {
          "id": "submit-direct",
          "from": "draft",
          "to": "submitted",
          "trigger": "submit",
          "when": { "==": [{ "var": "page.org.makerCheckerEnabled" }, false] },
          "effects": ["submitAddMemberRequest"]
        }
      ]
    }
  }
}
```

## Step Model

Multi-step forms should not be only a UI concern.

Recommended step contract:

```ts
interface WorkflowStep {
  id: string;
  label: string;
  namespace: string;
  readyWhen?: ConditionExpr;
  visibleWhen?: ConditionExpr;
  reviewProjection?: string;
}
```

This makes it possible to declare:

- when a step is visible
- when a step is complete
- what should appear in review

## Async Child Widgets

Child widgets must publish their readiness and progress into shared runtime state. Parent workflow steps gate transitions based on that published state — not by inspecting widget internals or relying on component callbacks.

This makes the readiness contract explicit and testable.

Example:

```json
{
  "steps": [
    {
      "id": "documents",
      "label": "Documents",
      "namespace": "page.memberDraft.documents",
      "readyWhen": {
        "and": [
          { "==": [{ "var": "page.uploadState.declarationAccepted" }, true] },
          { ">=": [{ "var": "page.uploadState.completedMandatoryFiles" }, 3] }
        ]
      }
    }
  ]
}
```

## Review And Projection

Review pages should not try to infer every value automatically from arbitrary widgets.

Each workflow should declare review projections explicitly.

That keeps review deterministic and auditable.

## Query / Response Loops

Many servicing workflows follow the same pattern: a submitted request gets a query raised against it, the submitter responds to the query, and the case is resubmitted for review. This sequence must be modeled as a declared workflow pattern, not rebuilt from scratch in each feature.

The standard states for this pattern are `queryRaised`, `queryResponded`, and the re-entry back into the review state. Any workflow that has a query-response loop should use these state names consistently and declare the permitted transitions explicitly, rather than leaving the loop implicit in form behavior.

## Post-Mutation Reconciliation Rule

Any workflow transition that executes an `apiMutation` step must be followed by a reconciliation step that re-anchors the frontend workflow state against the backend.

### Why this is required

The workflow state machine is declared in schema and runs on the frontend. The backend is the authoritative source of workflow state. After a mutation, the two can diverge if the backend applies additional rules, rejects the transition, or moves the workflow into an unexpected state.

Without explicit reconciliation, the frontend can display a state the backend has already moved past or rejected. In approval workflows — where the state a user sees affects what actions they can take — this is a correctness failure, not just a display inconsistency.

### Required reconciliation patterns

After a state-changing `apiMutation` step in a workflow transition, the action pipeline must include one of:

**`invalidateNamespace` followed by re-hydration**

The namespace that holds workflow or entity state is marked stale. The runtime re-fetches it from the backend. The workflow state on the frontend is then derived from the refreshed data.

```json
{ "type": "invalidateNamespace", "target": "page.claimStatus" }
```

**`apiRead` for an explicit re-fetch**

A follow-up read step fetches the updated state directly after the mutation confirms success.

```json
{
  "type": "apiRead",
  "namespace": "page.claimStatus",
  "endpoint": "/api/claims/{{page.claimStatus.id}}/status"
}
```

### Lint rule

Workflow transitions that contain `apiMutation` steps but no subsequent `invalidateNamespace` or `apiRead` step must produce a lint warning.

Authors who intentionally skip reconciliation — for example, in an optimistic UI case — must annotate the transition with `"reconciliation": "optimistic"` to suppress the warning and make the intent visible to reviewers.

### Optimistic transitions

Optimistic updates are allowed. When a transition uses optimistic state, the schema must declare it explicitly:

```json
{
  "id": "approve-claim",
  "from": "queryRaised",
  "to": "submitted",
  "trigger": "approve",
  "effects": ["approveClaimMutation"],
  "reconciliation": "optimistic"
}
```

The runtime applies the state transition immediately on the frontend and reconciles with the backend result when it arrives. If the backend returns a different state, the runtime corrects the frontend state and re-renders.

## Final Position

If the product is workflow-heavy, the architecture must be workflow-literate.

Otherwise the schema can describe forms, but not the servicing system the product actually is.
