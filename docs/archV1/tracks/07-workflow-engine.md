# Track 7 — Workflow Engine

## Goal

Execute schema-declared state machines. State lives under `flow.<workflowId>.*` in the graph. Transitions fire on `emitEvent` triggers, run `exitActions → effects → entryActions`, and produce a `reconciliation` warning when `apiMutation` is not followed by `invalidateNamespace` or `apiRead`.

## You Own

- `src/lib/runtime/workflow/`

## Inputs

- Track 1 types: `WorkflowDefinition`, `WorkflowStateDefinition`, `WorkflowTransition`, `WorkflowStep`
- Track 2: `RuntimeGraph` (writes to `flow.*`)
- Track 3: `evaluateCondition` (for `when` guards)
- Track 6: `ActionEngine.runPipeline`

## Deliverables

### 1. Files

```
src/lib/runtime/workflow/
├── index.ts
├── WorkflowEngine.ts
├── reconciliation.ts        // lint-style check + warn
└── workflow.test.ts
```

### 2. Exact exports

```ts
// index.ts
export { WorkflowEngine } from "./WorkflowEngine";
export type { WorkflowInstanceState } from "./WorkflowEngine";
```

### 3. `WorkflowEngine`

```ts
export interface WorkflowInstanceState {
  workflowId: string;
  current: string;             // current state id
  history: { from: string; to: string; trigger: string; at: string }[];
  data: Record<string, unknown>; // step-collected data, lives at flow.<workflowId>.data
}

export class WorkflowEngine {
  constructor(deps: {
    graph: RuntimeGraph;
    actionEngine: ActionEngine;
    pipelines: Record<string, ActionPipeline>; // for reconciliation lint
  });

  registerWorkflows(workflows: Record<string, WorkflowDefinition>): void;

  // Initialize a workflow instance at its initial state. Called once per page mount.
  startWorkflow(workflowId: string): void;

  // Process a trigger. Called by ActionEngine after each emitEvent step.
  handleTrigger(workflowId: string, trigger: string, payload?: unknown): Promise<void>;

  // Read current state.
  currentState(workflowId: string): string | undefined;
}
```

### 4. Wiring

`WorkflowEngine` is wired into `ActionEngine` so that whenever `runPipeline` collects `emittedEvents`, the engine forwards each one to `handleTrigger(workflowId, event, payload)` for every registered workflow. The convention: trigger names should be globally unique across workflows on a page, OR a workflow's transition's `trigger` may be prefixed with the workflow id (`addMember.submit`).

Simplification for v1: trigger names are global. If two workflows have the same trigger, both transitions fire (this is intentional — schemas should disambiguate).

### 5. `startWorkflow`

```
1. Reserve graph namespace "flow.<workflowId>" via graph.registerNamespace.
2. Write initial state: graph.writePath(ns, "flow.<id>.current", workflow.initialState).
3. Write empty history and data: "flow.<id>.history" = [], "flow.<id>.data" = {}.
4. Run entryActions of the initial state, if any.
```

### 6. `handleTrigger`

```
1. Read current state from graph.
2. Find first transition where:
   - trigger matches AND
   - (Array.isArray(from) ? from.includes(current) : from === current) AND
   - (when === undefined OR evaluateCondition(when, snapshot) === true)
3. If no transition matches: log debug "no transition for trigger X from state Y", return.
4. Otherwise execute in order:
   a. Run exitActions of the from state (each is an action pipeline id → actionEngine.runPipeline).
   b. Run transition.effects (action pipeline ids).
   c. Write new state: graph.writePath(ns, "flow.<id>.current", transition.to).
   d. Append to history.
   e. Run entryActions of the to state.
5. If the to state is terminal, do nothing special (state stays; future triggers find no transition).
```

If any action pipeline returns `{ ok: false }` during the transition, **do not** advance the state. Log the failure (via `console.error`) and stop. The action's own `failureMode` already decided rollback semantics for graph writes.

### 7. `reconciliation.ts`

```ts
export function checkReconciliation(
  workflows: Record<string, WorkflowDefinition>,
  pipelines: Record<string, ActionPipeline>,
): { transitionId: string; pipelineId: string; reason: string }[];
```

For each transition's `effects`, for each pipeline:

- Find the last `apiMutation` step.
- If there is one and it is **not** followed (within the same pipeline OR within subsequent effects) by an `invalidateNamespace` or `apiRead` step,
- AND `transition.reconciliation !== "optimistic"`,
- record a warning with the reason `"apiMutation in pipeline X is not followed by invalidate/apiRead; declare reconciliation: 'optimistic' if intentional"`.

The engine constructor calls this on `registerWorkflows` and logs each warning via `console.warn`. Does **not** fail loading — these are advisory.

## Reuse / Do Not Touch

- All state writes go through `RuntimeGraph`. No direct mutations.
- All side effects go through `ActionEngine.runPipeline`. No bypassing.

## Edge Cases

- A trigger arrives before `startWorkflow` → log warning, ignore.
- Two transitions match the same trigger from the same state — `when` guards should disambiguate; if both match, the **first** declared wins. Log a warning at registration if two are unguarded.
- `from: ["a", "b"]` arrays correctly match from either state.
- A workflow with no transitions → only its initial state's entryActions run.
- Terminal state → no further transitions found; this is correct (do not error).

## Allowed Deps

None new.

## DoD

`yarn test src/lib/runtime/workflow/` covers:

- The add-member workflow from `04-WORKFLOWS-AND-STATE-MACHINES.md` § "Add Member Example" runs `draft → submitted → underReview → approved` driven by triggers.
- `when` guard prevents an otherwise-matching transition.
- `from: ["a", "b"]` array matches.
- An effect action returning `{ ok: false }` keeps the workflow in the current state.
- `checkReconciliation` flags a missing invalidate/apiRead; declaring `optimistic` silences it.
- Terminal state ignores further triggers.

## References

- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:17](../04-WORKFLOWS-AND-STATE-MACHINES.md#L17) — "Core Position": why workflows are first-class.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:30](../04-WORKFLOWS-AND-STATE-MACHINES.md#L30) — "Workflow Definition Shape": the TS shapes.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:56](../04-WORKFLOWS-AND-STATE-MACHINES.md#L56) — "Add Member Example": the canonical example this track must run.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:94](../04-WORKFLOWS-AND-STATE-MACHINES.md#L94) — "Step Model": multi-step form wiring.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:117](../04-WORKFLOWS-AND-STATE-MACHINES.md#L117) — "Async Child Widgets": readiness gates.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:143](../04-WORKFLOWS-AND-STATE-MACHINES.md#L143) — "Review And Projection": `reviewProjection`.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:151](../04-WORKFLOWS-AND-STATE-MACHINES.md#L151) — "Query / Response Loops".
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:157](../04-WORKFLOWS-AND-STATE-MACHINES.md#L157) — "Post-Mutation Reconciliation Rule": L161 why, L167 required patterns, L191 lint rule, L197 optimistic exception.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:37](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L37) — "Scope Semantics": for how scopes interact with namespaces.
- [docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md:63](../12-ARCHITECTURE-FREEZE-DECISIONS.md#L63) — "3. Runtime Scope Model": L88 `flow.*` semantics.
- [docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md:260](../12-ARCHITECTURE-FREEZE-DECISIONS.md#L260) — "11. Persisted Workflow State Location".
