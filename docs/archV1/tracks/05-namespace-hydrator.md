# Track 5 — Namespace Hydrator

## Goal

Read a schema's `runtime.namespaces`, build a dependency DAG, fetch each namespace via `PolicyClient` (or use inline/local data), write results into the graph, and honor `onHydrationFailure`. Expose an invalidation API for Track 6 to call.

## You Own

- `src/lib/runtime/hydrate/`

## Inputs

- Track 1 types: `NamespaceDef`, `PageSchemaV1`
- Track 2: `RuntimeGraph` (call its `registerNamespace`, `writePath`)
- Track 4: `PolicyClient`, `ApiResponse`

## Deliverables

### 1. Files

```
src/lib/runtime/hydrate/
├── index.ts
├── HydrationOrchestrator.ts
├── topoSort.ts            // pure: namespace deps → ordered list
├── policies.ts            // onHydrationFailure handlers
├── status.ts              // observable per-namespace status
└── hydrate.test.ts
```

### 2. `NamespaceDef` shape (finalize for Track 1)

Coordinate with Track 1 to lock this shape. Reasonable default:

```ts
export type NamespaceDef =
  | { source: "api"; policy: string; endpoint: string; writeTo: string; dependsOn?: string[]; onHydrationFailure?: "block" | "warn" | "silent" }
  | { source: "local"; storageKey: string; writeTo: string }
  | { source: "inline"; value: unknown; writeTo: string };
```

Add this to `src/lib/runtime/types/namespace.ts` if Track 1 hasn't finalized it.

### 3. Exact exports

```ts
// index.ts
export { HydrationOrchestrator } from "./HydrationOrchestrator";
export { NamespaceStatus } from "./status";
export type { HydrationStatusValue } from "./status";
```

### 4. `HydrationOrchestrator`

```ts
export class HydrationOrchestrator {
  constructor(
    schema: PageSchemaV1,
    graph: RuntimeGraph,
    client: PolicyClient,
    notify: (event: HydrationEvent) => void  // for Track 9 toasts
  );

  // Register namespaces with the graph (ownership) and start hydration in topological order.
  start(): Promise<void>;

  // Mark a namespace stale and re-fetch (called by action engine's invalidateNamespace step).
  invalidateNamespace(namespace: string): Promise<void>;

  // Read status of a namespace.
  status(namespace: string): HydrationStatusValue;

  // Subscribe to status changes for a namespace.
  onStatusChange(namespace: string, cb: (s: HydrationStatusValue) => void): () => void;
}

export type HydrationEvent =
  | { kind: "started"; namespace: string }
  | { kind: "success"; namespace: string }
  | { kind: "failed"; namespace: string; mode: "block" | "warn" | "silent"; error: ApiError };

export type HydrationStatusValue = "idle" | "loading" | "ready" | "failed";
```

### 5. Topo sort

```ts
// topoSort.ts
export function topoSortNamespaces(
  namespaces: Record<string, NamespaceDef>
): { order: string[]; cycles: string[][] };
```

- Kahn's algorithm over `dependsOn` edges.
- If cycles exist, return them so the orchestrator can throw a clear error.

### 6. Hydration semantics

- `start()`: register all namespaces with `graph.registerNamespace(name, [writeTo])`, then iterate in topo order. Independent branches may run in parallel; respect dependencies.
- For each namespace:
  - `inline` → immediately `graph.writePath(name, writeTo, value)`, status `ready`.
  - `local` → read from `localStorage.getItem(storageKey)`, JSON-parse, write. If parse fails, treat as failure.
  - `api` → `client.executePolicy(policy, { endpoint, method: "GET" })`. On `ok: true`, write the data; on `ok: false`, apply `onHydrationFailure`.
- Failure modes:
  - `block` (default): set status `failed`, dependents are also set `failed` (do not run their fetch), `notify({ kind: "failed", mode: "block", … })`.
  - `warn`: set status `failed`, dependents still run, `notify({ kind: "failed", mode: "warn", … })`.
  - `silent`: set status `failed`, dependents still run, no notify.

### 7. `invalidateNamespace`

- Sets the namespace's status to `loading`, re-runs its fetch (same source type), writes new value.
- Does **not** cascade to dependents automatically — Track 6's `invalidateNamespace` action step invalidates the named namespace only. If a schema author wants to invalidate dependents, they list them as separate steps.

### 8. Status

```ts
// status.ts
export class NamespaceStatus {
  set(namespace: string, value: HydrationStatusValue): void;
  get(namespace: string): HydrationStatusValue;
  subscribe(namespace: string, cb: (v: HydrationStatusValue) => void): () => void;
}
```

## Reuse / Do Not Touch

- Use `PolicyClient` for all `api` source fetches. Do not call `fetch` directly.
- Do not write to graph paths owned by another namespace.

## Edge Cases

- Two namespaces declare `writeTo: "page.policy"` → in `start()`, `graph.registerNamespace` will detect this; surface as an error before any fetch.
- A namespace's `dependsOn` references an undeclared namespace → throw with the offending name.
- `invalidateNamespace` called for an unknown namespace → log warning, no-op.
- The graph clears (e.g., logout) while hydration is in flight → in-flight responses must be dropped; check status before writing.

## Allowed Deps

None new.

## DoD

`yarn test src/lib/runtime/hydrate/` covers:

- Topo sort on a 3-namespace chain (A → B → C) returns them in order.
- Cycle detection returns the cycle.
- `start()` writes inline data into the graph at the correct path.
- A failing `api` namespace with `mode: "block"` prevents its dependent from fetching.
- A failing `api` namespace with `mode: "warn"` allows its dependent to fetch.
- `invalidateNamespace` re-runs the fetch and updates the graph.

## References

- [docs/archV1/01-SCHEMA-LANGUAGE.md:110](../01-SCHEMA-LANGUAGE.md#L110) — "Namespace Definitions": shape of `NamespaceDef`; L153 has a complete example.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:79](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L79) — "Namespace Hydration Rules": L83 API, L87 local, L91 inline, L95 derived.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:195](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L195) — "Namespace Hydration Failure Modes": L201 the three modes, L217 worked example, L238 default behavior.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:65](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L65) — "`invalidateNamespace`" step semantics (the action engine's call site).
