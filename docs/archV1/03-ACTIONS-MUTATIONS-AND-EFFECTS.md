# Actions, Mutations, And Effects v1

## Purpose

This document defines how business actions should be represented in `archV1`.

The schema action model must be expressive enough for real servicing flows. A minimal action model that only supports `navigate`, `api-mutation`, `api-download`, and `update-widget-state` is not sufficient. Real servicing actions are usually multi-step pipelines that combine state updates, backend calls, and navigation in a declared sequence.

## Why This Matters

Consider a common servicing action like switching the active policy. That is not one step. It requires:

1. update shell state
2. persist state
3. patch backend context
4. navigate

When the schema language cannot express that sequence, orchestration moves into wrappers and hooks.

That is exactly what this architecture is trying to prevent.

## Action Model

Recommended model:

```ts
interface ActionPipeline {
  id: string;
  steps: ActionStep[];
  onSuccess?: ActionStep[];
  onFailure?: ActionStep[];
}

type ActionStep =
  | SetStateStep
  | PatchStateStep
  | ApiMutationStep
  | ApiReadStep
  | InvalidateNamespaceStep
  | NavigateStep
  | EmitEventStep
  | GuardStep
  | ConfirmStep
  | ResetNamespaceStep;
```

## Allowed Step Types

### `setState`

Replaces a target graph path with a new value. The value may be a literal or a binding expression. Use `setState` when replacing the entire value at a path — for example, setting the active policy to a newly selected one.

### `patchState`

Merges an object into an existing graph path. Unlike `setState`, which replaces the value entirely, `patchState` applies a partial update. Use this for updating individual fields within a draft or filter object without overwriting the rest.

### `apiMutation`

Submits a write request through the shared API client using a named request policy. This is the only permitted way to perform backend writes from a schema action. The step must declare a `failureMode` to control what happens if the request fails.

### `apiRead`

Performs an explicit read request and writes the result to a graph path. Unlike namespace hydration, which is automatic, `apiRead` is used inside action pipelines when a read must happen at a specific point in a sequence — for example, fetching updated status immediately after a mutation.

### `invalidateNamespace`

Marks one or more namespaces as stale and triggers the runtime to re-hydrate them. Use this after mutations that change data the page is already displaying. It is the preferred reconciliation mechanism because it delegates the re-fetch to the runtime's normal hydration logic.

### `navigate`

Performs a client-side route change. A `navigate` step that appears before required blocking mutations is a lint error unless explicitly annotated as non-blocking.

### `emitEvent`

Emits a named runtime event that other parts of the system can respond to — for example, triggering an overlay to open, notifying a parent workflow step, or signalling readiness to a child widget coordinator.

### `guard`

A conditional branch inside the pipeline. If the declared condition is false, the step can either halt the pipeline or redirect execution to an `else` branch. Use `guard` to express conditional logic that is too dynamic for a static `when` condition on the action itself.

### `confirm`

Pauses the pipeline and presents a confirmation dialog or material warning to the user. Execution continues only if the user confirms. Use for destructive or financially material actions where silent execution is unacceptable.

### `resetNamespace`

Clears the value of a local, draft, or page-scoped namespace. Use when an action intentionally discards in-progress state — for example, cancelling a wizard and clearing all draft data.

## Example: Policy switch

```json
{
  "actions": {
    "switchPolicy": {
      "id": "switchPolicy",
      "steps": [
        {
          "type": "setState",
          "target": "app.activePolicy",
          "value": { "$bind": "event.selectedPolicy" }
        },
        {
          "type": "apiMutation",
          "request": {
            "endpoint": "/api/mph/policies/{{event.selectedPolicy.id}}/context",
            "method": "PATCH",
            "policy": "authenticatedMutation",
            "body": {
              "last_policy_id": { "$bind": "event.selectedPolicy.id" },
              "context_data": {
                "policy_no": { "$bind": "event.selectedPolicy.policy_no" }
              }
            },
            "failureMode": "warn-only"
          }
        },
        {
          "type": "navigate",
          "to": "/mph/policies/{{event.selectedPolicy.id}}"
        }
      ]
    }
  }
}
```

## Request Policies

Mutations should never manually re-specify auth/correlation/idempotency logic at every callsite.

They should reference named request policies.

### Example

```json
{
  "requestPolicies": {
    "authenticatedRead": {
      "transport": "apiClient",
      "auth": "session",
      "includeHeaders": ["X-User-Role", "X-User-Id"]
    },
    "authenticatedMutation": {
      "transport": "apiClient",
      "auth": "session",
      "includeHeaders": ["X-User-Role", "X-User-Id", "X-Correlation-Id", "Idempotency-Key"],
      "retry": "refresh-once"
    }
  }
}
```

## Mutation Semantics

The runtime supports two explicit strategies. The strategy must be declared on the action, not left as an implicit default.

### Strategy A: invalidate and rehydrate

The safest default. After the mutation succeeds, the relevant namespaces are marked stale and the runtime re-fetches them from the backend. Use this when the backend computes downstream changes the frontend cannot predict — for example, a submission that triggers status changes, recalculations, or audit entries.

### Strategy B: optimistic patch then reconcile

Allowed for low-risk flows where latency would harm the user experience. The UI updates immediately with the assumed post-mutation state. When the backend responds, the runtime reconciles the actual state and corrects any discrepancy. This strategy must still revalidate against backend truth — it is not a bypass of reconciliation, only a deferral.

### Example

```json
{
  "request": {
    "endpoint": "/api/mph/members/{{page.member.id}}/exit",
    "method": "POST",
    "policy": "authenticatedMutation",
    "reconcile": {
      "mode": "invalidate",
      "targets": ["page.member", "page.memberHistory"]
    }
  }
}
```

## Failure Handling

Every `apiMutation` step must declare what happens if the request fails.

### `block`

The pipeline halts and the failure is surfaced to the user as an error. No subsequent steps execute. Use this for mutations where success is required before the user can proceed — for example, submitting a member addition or a claim.

### `warn-only`

The pipeline continues after the failure, but the user is shown a non-blocking warning. Use this for best-effort mutations where the failure does not invalidate the primary intent — for example, a context-update that improves analytics but is not critical to the user's task.

### `continue`

The pipeline continues silently. No warning is shown. Use only for fire-and-forget steps where failure is truly inconsequential and the user does not need to be aware of it.

### `rollback-and-stop`

The pipeline halts and any preceding `setState` or `patchState` steps in the same pipeline are reversed. Use this when local state was updated optimistically before the mutation and must be reverted if the mutation fails.

## Error UX Strategy

Failure modes determine pipeline behavior. They do not determine how errors surface to the user. The runtime provides a default error surface that schemas can override.

### Default surfaces

The runtime ships with three default error surfaces.

**Toast** — Used for `warn-only` failures and other non-blocking notifications. Toasts appear in a fixed position, auto-dismiss after a configurable duration, and stack if multiple fire in sequence.

**Inline banner** — Used for `block` failures on actions tied to a specific page region. The banner attaches to the region the action was bound to (the form, the table, the workflow step) and remains until the user dismisses it or the underlying state changes.

**Modal** — Used for `block` failures on destructive or critical actions where the user must explicitly acknowledge the failure before proceeding. Modals are reserved for cases where ignoring the error would lead to data loss or workflow corruption.

### Choosing the surface

The action pipeline declares its error surface explicitly:

```json
{
  "type": "apiMutation",
  "request": { "endpoint": "/api/mph/members", "method": "POST" },
  "failureMode": "block",
  "errorSurface": "inline-banner"
}
```

If `errorSurface` is omitted, the runtime picks a default based on `failureMode`:

- `block` defaults to `inline-banner`
- `warn-only` defaults to `toast`
- `continue` has no surface
- `rollback-and-stop` defaults to `inline-banner`

### Validation error mapping

When `apiMutation` returns a structured validation envelope with field-level errors, the runtime maps the errors to bound form widgets automatically. Each field error is delivered to the widget through its `validationState` prop.

The mapping uses the binding path. A validation error keyed `member.dateOfBirth` is delivered to the widget bound to `page.memberDraft.member.dateOfBirth`. If no widget is bound to that path, the error appears in the inline banner with the field name so the user is not left without feedback.

### Custom error components

Host applications can replace the default surfaces by registering custom error components at runtime initialization:

```ts
runtime.registerErrorSurface("toast", CustomToast);
runtime.registerErrorSurface("inline-banner", CustomBanner);
runtime.registerErrorSurface("modal", CustomModal);
```

The custom components must accept the same props as the defaults. Schemas reference surfaces by name and remain agnostic to the implementation.

### Error context payload

Every error surface receives a structured payload:

```ts
interface ErrorContext {
  actionId: string;
  step: number;
  message: string;
  validation?: ValidationEnvelope;
  correlationId?: string;
  retryable: boolean;
}
```

This is enough information for the surface to decide whether to offer a retry button, link to support with the correlation ID, or simply display the message.

## Confirmations And Material Warnings

The PRD repeatedly calls for warnings before destructive or financially material actions.

This should be action-level declarative policy.

```json
{
  "type": "confirm",
  "title": "Remove member from cover?",
  "message": "This action may affect premium, claims eligibility, and audit history."
}
```

## Eventing For Child Widgets

Actions must interoperate with async child widgets.

This matters for:

- upload widgets
- bulk validation
- workflow gating

The runtime should support event-based or state-based child readiness publication as a formal action/effect concern, not an accidental widget convention.

## Final Position

If actions remain underspecified, the architecture will always regress into wrapper code.

The action engine is not optional for this repo. It is the bridge between schemas that describe intent and a runtime that can actually execute servicing behavior.
