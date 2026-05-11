# Track 2 — Runtime Graph Provider

## Goal

Implement the four-scope graph (`system`, `app`, `page`, `flow`) on top of Zustand. Provide path-level reads and namespace-scoped writes with Single Writer enforcement. Persist `app.*` to `localStorage` and clear it on declared triggers.

## You Own

- `src/lib/runtime/graph/`

## Inputs

- Track 1 types — especially `RuntimeGraph`, `GraphSnapshot`, `GraphPath`, `GraphScope`, `ClearTrigger`.

## Deliverables

### 1. Files

```
src/lib/runtime/graph/
├── index.ts
├── store.ts              // Zustand store, internal
├── RuntimeGraphProvider.tsx
├── useGraph.ts           // useGraphPath, useGraphSnapshot
├── singleWriter.ts       // namespace → ownedPaths registry
├── persistence.ts        // app.* localStorage + clearOn
└── graph.test.ts
```

### 2. Exact exports from `src/lib/runtime/graph/index.ts`

```ts
export { RuntimeGraphProvider } from "./RuntimeGraphProvider";
export { useGraphPath, useGraphSnapshot, useRuntimeGraph } from "./useGraph";

// Re-export the RuntimeGraph interface from types so consumers can import everything from "@/lib/runtime"
export type { RuntimeGraph, GraphSnapshot, GraphPath, GraphScope } from "../types";
```

### 3. `RuntimeGraphProvider`

```tsx
interface RuntimeGraphProviderProps {
  children: React.ReactNode;
  initialSystem?: Record<string, unknown>;     // e.g. { user: {...}, locale: "en-US", route: {...} }
  persistKey?: string;                          // localStorage key prefix; default "keystone:runtime"
  clearOnTriggers?: ClearTrigger[];             // from schema runtime.scopes.app.clearOn
}
```

- Creates a Zustand store internally.
- Exposes a context with a stable `RuntimeGraph` implementation.
- On mount, hydrates `app.*` from `localStorage[persistKey + ":app"]` if present.
- On unmount or trigger fire, calls `clear(trigger)`.

### 4. Hooks

```ts
// returns the value at path; re-renders only when that path changes
function useGraphPath<T = unknown>(path: GraphPath): T | undefined;

// returns a stable snapshot reader; does NOT subscribe
function useGraphSnapshot(): GraphSnapshot;

// returns the full RuntimeGraph for imperative use (writes, registerNamespace, subscribe)
function useRuntimeGraph(): RuntimeGraph;
```

Implementation note: implement `useGraphPath` via Zustand's selector subscription — `useStore(state => readByPath(state, path))`.

### 5. Single Writer enforcement

`registerNamespace(namespace, ownedPaths)` records each path under that namespace. `writePath(namespace, path, value)` and `patchPath(namespace, path, value)`:

- If `path` is registered to a *different* namespace, in dev `throw new Error("[runtime:graph] Single Writer violation: namespace X cannot write to path Y owned by Z")`. In prod, log via `console.error` with the same message and proceed (do not silently drop the write — log + write).
- If `path` is not registered to any namespace, allow the write but emit a `console.warn` (this catches genuine bugs, but doesn't block during early dev).
- A namespace may own a path **prefix** — registering `page.policy` covers `page.policy.policy_no`, `page.policy.insured.name`, etc.

### 6. Persistence

`persistence.ts`:

```ts
export function persistAppScope(graph: RuntimeGraph, key: string): () => void;
// subscribes to all app.* writes, writes to localStorage on each change, returns unsubscribe.

export function loadPersistedApp(key: string): Record<string, unknown> | null;

export function attachClearTriggers(graph: RuntimeGraph, triggers: ClearTrigger[]): void;
// wires up listeners:
//   - "logout"               → window.addEventListener("storage", …) for an auth-event key (TODO leave a comment for Track 4)
//   - "roleChange"           → subscribe to system.user.role
//   - "orgChange"            → subscribe to app.activeOrg
//   - "schemaVersionChange"  → subscribe to system.schemaVersion
// on fire, calls graph.clear(trigger).
```

Persistence uses **structured-clone-safe JSON** (`JSON.stringify` after running through a `replacer` that drops functions and `undefined`). Do not persist `page.*`, `flow.*`, or `system.*`.

### 7. `clear(trigger)` behavior

```ts
function clear(trigger: ClearTrigger): void
```

- `logout` → empties `app.*` AND `page.*` AND `flow.*`; preserves `system.*`.
- `roleChange` → empties `page.*` AND `flow.*`; preserves `app.*` and `system.*`.
- `orgChange` → empties `page.*` AND `flow.*` AND clears `app.*` keys *not* tagged `crossOrg: true` (for v1, ignore the tag — clear all of `app.*`).
- `schemaVersionChange` → empties `app.*`, `page.*`, `flow.*`; preserves `system.*`.

After clear, also wipes the corresponding `localStorage` keys.

## Reuse / Do Not Touch

- Do not touch `src/lib/conditions.ts`.
- Do not touch `src/lib/api/`.
- You may add a comment in `persistence.ts` referencing where Track 4 will emit the `logout` signal; do not implement Track 4 here.

## Edge Cases

- Writing to a path whose parent does not exist: auto-create the parent objects (e.g., `writePath(ns, "page.policy.insured.name", "x")` creates `page.policy` and `page.policy.insured` as empty objects if they don't exist).
- Reading a path that doesn't exist: return `undefined`.
- A subscriber on `page.policy` should be notified when `page.policy.policy_no` changes (prefix subscription). Implement by comparing the read result before vs after each write.
- `clear("logout")` called twice in a row — second call is a no-op, no error.

## Allowed Deps

- `zustand` — add via `yarn add zustand` if not present.

## DoD

`yarn test src/lib/runtime/graph/` must cover:

1. Provider mounts with `initialSystem` and `useGraphPath("system.user.id")` returns the value.
2. `useGraphPath` returns `undefined` for an unwritten path.
3. After `writePath("policy", "page.policy.policy_no", "POL-1")`, `useGraphPath("page.policy.policy_no")` re-renders the subscriber once.
4. A second namespace writing to `page.policy.foo` throws in dev (force `NODE_ENV=development` in test).
5. Prefix subscription: subscriber on `page.policy` is notified when `page.policy.insured.name` changes.
6. `app.*` persisted to `localStorage` survives provider unmount/remount.
7. `clear("logout")` empties `app.*`, `page.*`, `flow.*`; `system.*` survives.

## References

- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:37](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L37) — "Scope Semantics": L39 `system.*`, L44 `app.*`, L52 `page.*`.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:99](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L99) — "Single Writer Rule": L107 "Enforcement" describes throw-in-dev / log-in-prod.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:117](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L117) — "Initialization Rules": L121 `initialValue`, L125 `initialValueFrom`.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:131](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L131) — "Persistence Model": L135 providers, L162 `clearOn` triggers.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:315](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L315) — "Graph Reactivity Model": path-level subscription requirements.
- [docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md:63](../12-ARCHITECTURE-FREEZE-DECISIONS.md#L63) — "3. Runtime Scope Model": the four scopes; L88 `flow.*` semantics.
- [docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md:260](../12-ARCHITECTURE-FREEZE-DECISIONS.md#L260) — "11. Persisted Workflow State Location": where workflow instance state lives.

Existing code to read before starting:

- [src/lib/conditions.ts](../../../src/lib/conditions.ts) — only relevant if its shape implies a snapshot/context model you need to match.
