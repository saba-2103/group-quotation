# Track 6 — Action Engine + Access Enforcement

## Goal

Execute `ActionPipeline` definitions: run each step type, honor `failureMode`, snapshot for rollback, check access policy before step 1. Emit structured `ErrorContext` events for Track 9 to surface.

## You Own

- `src/lib/runtime/actions/`

## Inputs

- Track 1 types: `ActionPipeline`, `ActionStep` (all variants), `FailureMode`, `ErrorContext`, `AccessPolicy`
- Track 2: `RuntimeGraph` (`writePath`, `patchPath`, `subscribe`, `snapshot`)
- Track 3: `evaluateBinding`, `evaluateCondition`, `applyTransform`
- Track 4: `PolicyClient`
- Track 5: `HydrationOrchestrator.invalidateNamespace`

## Deliverables

### 1. Files

```
src/lib/runtime/actions/
├── index.ts
├── ActionEngine.ts            // top-level runPipeline
├── rollback.ts                // snapshot/restore for rollback-and-stop
├── access.ts                  // accessAllowed check
├── steps/
│   ├── setState.ts
│   ├── patchState.ts
│   ├── apiMutation.ts
│   ├── apiRead.ts
│   ├── invalidateNamespace.ts
│   ├── navigate.ts
│   ├── emitEvent.ts
│   ├── guard.ts
│   ├── confirm.ts
│   └── resetNamespace.ts
└── actions.test.ts
```

### 2. Exact exports

```ts
// index.ts
export { ActionEngine } from "./ActionEngine";
export type { RunPipelineResult, ConfirmHandler, NavigateHandler } from "./ActionEngine";
```

### 3. `ActionEngine`

```ts
export interface RunPipelineResult {
  ok: boolean;
  error?: ErrorContext;
  emittedEvents: Array<{ event: string; payload: unknown }>; // Track 7 consumes for workflow triggers
}

export type ConfirmHandler = (message: string, opts: { confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
export type NavigateHandler = (to: string) => void;

export class ActionEngine {
  constructor(deps: {
    graph: RuntimeGraph;
    policyClient: PolicyClient;
    hydrator: HydrationOrchestrator;
    accessPolicy?: AccessPolicy;
    currentRole: () => string | undefined;  // reads from system.user.role
    confirm: ConfirmHandler;
    navigate: NavigateHandler;
    onError: (ctx: ErrorContext) => void;   // Track 9 listens
  });

  registerPipelines(pipelines: Record<string, ActionPipeline>): void;

  runPipeline(pipelineId: string, eventPayload?: unknown): Promise<RunPipelineResult>;
}
```

### 4. Pipeline execution flow

```
1. Resolve pipeline by id. If unknown: return { ok: false, error: { actionId: id, stepIndex: -1, message: "Unknown pipeline", retryable: false } }.
2. Check access:
     allowed = accessAllowed(pipeline, accessPolicy, currentRole())
     If not allowed: onError({...}), emit "accessDenied" event, return { ok: false }.
3. Take graph snapshot for potential rollback.
4. For each step i in pipeline.steps:
     a. Run step. Each step returns { ok: boolean, error?: ErrorContext, emit?: {event, payload} }.
     b. If step.ok === false:
          - If step is apiMutation with failureMode === "rollback-and-stop": restore snapshot, run onFailure, return { ok: false, error }.
          - If failureMode === "block": run onFailure, return { ok: false, error }.
          - If failureMode === "warn-only": collect error, continue (onError called for toast).
          - If failureMode === "continue": ignore error, continue.
          - For non-apiMutation step failures: same as "block".
5. Run onSuccess steps if all primary steps succeeded.
6. Return { ok: true, emittedEvents }.
```

### 5. `access.ts`

```ts
export function accessAllowed(
  pipeline: ActionPipeline,
  policy: AccessPolicy | undefined,
  role: string | undefined
): boolean {
  // Pipeline-level allowedRoles wins if present.
  if (pipeline.allowedRoles) {
    return role !== undefined && pipeline.allowedRoles.includes(role);
  }
  // Otherwise check schema-level access policy: role's permitted action ids include this pipeline.id.
  if (!policy || !role) return true; // no policy = open; no role = anonymous, blocked only if policy exists
  const allowed = policy[role] ?? [];
  return allowed.includes(pipeline.id);
}
```

### 6. Step implementations (signatures)

```ts
// steps/setState.ts
export async function runSetState(
  step: Extract<ActionStep, { type: "setState" }>,
  ctx: StepContext,
): Promise<StepResult>;

// each step file follows the same shape.

export interface StepContext {
  graph: RuntimeGraph;
  policyClient: PolicyClient;
  hydrator: HydrationOrchestrator;
  confirm: ConfirmHandler;
  navigate: NavigateHandler;
  pipelineId: string;
  stepIndex: number;
  eventPayload: unknown;          // available at runtime; bound as "event.*" in expressions
  correlationId: string;
}

export interface StepResult {
  ok: boolean;
  error?: ErrorContext;
  emit?: { event: string; payload: unknown };
}
```

### 7. Per-step behaviors

- `setState`: resolve `value` via `evaluateBinding`/`applyTransform`, then `graph.writePath(<owning-namespace>, path, value)`. The owning namespace defaults to a synthetic `"_action_" + pipelineId` registered on first write.
- `patchState`: same but `graph.patchPath`. Value must resolve to an object.
- `apiMutation`: resolve `body`, call `policyClient.executePolicy(policy, { endpoint, method: "POST", body })`. If `!ok`, build `ErrorContext { actionId: pipelineId, stepIndex, message, validation, correlationId, retryable: response.status >= 500 }`.
- `apiRead`: same shape as apiMutation but `method: "GET"`; on success, write the response data to `writeTo`.
- `invalidateNamespace`: call `hydrator.invalidateNamespace(step.namespace)`.
- `navigate`: call `navigate(step.to)`.
- `emitEvent`: return `{ ok: true, emit: { event, payload: evaluateBinding(step.payload, snapshot) } }`. Pipeline collects these to return to caller.
- `guard`: evaluate `step.when`. If true, recursively run `step.then` steps as a sub-sequence; else `step.else ?? []`.
- `confirm`: `const ok = await confirm(message, { confirmLabel, cancelLabel })`. If `false`, abort with `{ ok: false, error: { ..., retryable: false, message: "User cancelled" } }` but **do not** rollback (cancellation is not failure).
- `resetNamespace`: call `hydrator.invalidateNamespace` followed by a graph-level clear of that namespace's owned paths.

### 8. `rollback.ts`

```ts
export interface GraphSnapshotForRollback {
  paths: Map<GraphPath, unknown>;     // captured paths and values
}

export function snapshotForRollback(graph: RuntimeGraph, paths: GraphPath[]): GraphSnapshotForRollback;
export function restoreSnapshot(graph: RuntimeGraph, snapshot: GraphSnapshotForRollback): void;
```

Track which paths each step writes; the rollback snapshot captures those paths' pre-write values. On `rollback-and-stop`, restore those paths.

## Reuse / Do Not Touch

- All API calls go through `PolicyClient`. No direct fetch.
- All graph writes go through `RuntimeGraph` methods. No store mutations.

## Edge Cases

- A `guard` step with neither `then` nor matching `else` evaluates as a no-op success.
- An action pipeline references an unknown `policy` → step fails with a clear error; surfaces as `block` by default.
- A pipeline has no steps (empty array) → succeeds immediately.
- `confirm` called without a confirm handler wired → throw at engine construction time, not at run time.

## Allowed Deps

None new.

## DoD

`yarn test src/lib/runtime/actions/` covers:

- Each of the 10 step types in isolation.
- Access denied: pipeline does not run, `accessDenied` event emitted.
- A 4-step pipeline `patchState → apiMutation (mock) → invalidateNamespace → navigate` runs end-to-end against mocks.
- `rollback-and-stop` restores the graph to its pre-pipeline state.
- `warn-only` continues past a failed mutation; `onError` called with correct `ErrorContext`.
- `guard` branches correctly true/false.
- `confirm` returning false aborts without rollback.

## References

- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:22](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L22) — "Action Model": pipeline shape.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:47](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L47) — "Allowed Step Types": L49 setState, L53 patchState, L57 apiMutation, L61 apiRead, L65 invalidateNamespace, L69 navigate, L73 emitEvent, L77 guard, L81 confirm, L85 resetNamespace.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:89](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L89) — "Example: Policy switch": end-to-end pipeline.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:153](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L153) — "Mutation Semantics": L157 invalidate-and-rehydrate, L161 optimistic patch.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:181](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L181) — "Failure Handling": L185 block, L189 warn-only, L193 continue, L197 rollback-and-stop.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:201](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L201) — "Error UX Strategy": L205 default surfaces, L235 validation mapping, L253 `ErrorContext` payload.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:270](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L270) — "Confirmations And Material Warnings": `confirm` step rationale.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:501](../01-SCHEMA-LANGUAGE.md#L501) — "Access Policy": the schema-level `access` block.
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:124](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L124) — "Access Policy Runtime Semantics": L128 action invocation, L132 widget rendering, L142 "what `access` does not do".
- [docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md:98](../12-ARCHITECTURE-FREEZE-DECISIONS.md#L98) — "4. Action Concurrency And Reentrancy": L104 frozen rules, L112 lock scopes.
