# Track 8 — Widget Registry, Renderer, & Accessibility Utilities

## Goal

A schema-driven renderer that walks `widgetTree`, evaluates conditions and bindings, mounts widgets on `mountWhen`, wires `emit` to action pipelines, and exposes `useWidgetGraph` + `announce` utilities to widgets. Existing `src/components/widgets/*` components register via a thin adapter.

## You Own

- `src/lib/runtime/render/`
- `src/components/runtime-renderer/` (new top-level component package)

## Inputs

- Track 1 types: `WidgetNode`, `WidgetDefinition`, `BindExpr`, `PageSchemaV1`
- Track 2: `useGraphPath`, `useGraphSnapshot`, `useRuntimeGraph`
- Track 3: `evaluateBinding`, `evaluateCondition`, `applyTransform`
- Track 6: `ActionEngine.runPipeline`

## Deliverables

### 1. Files

```
src/lib/runtime/render/
├── index.ts
├── WidgetRegistry.ts
├── useWidgetGraph.ts
├── announce.ts
├── adapter.ts                 // wraps existing widgets without refactor
├── mount.ts                   // mountWhen lifecycle helper
└── render.test.tsx

src/components/runtime-renderer/
├── SchemaRenderer.tsx
├── WidgetNodeRenderer.tsx     // recursive, evaluates conditions, mounts widget
└── index.ts
```

### 2. Exact exports

```ts
// src/lib/runtime/render/index.ts
export { WidgetRegistry, registerWidget } from "./WidgetRegistry";
export { useWidgetGraph } from "./useWidgetGraph";
export { announce } from "./announce";
export { adaptLegacyWidget } from "./adapter";

// src/components/runtime-renderer/index.ts
export { SchemaRenderer } from "./SchemaRenderer";
```

### 3. `WidgetRegistry`

```ts
export class WidgetRegistry {
  register(def: WidgetDefinition<any, any>): void;
  get(type: string): WidgetDefinition | undefined;
  has(type: string): boolean;
}

// Convenience: module-level singleton for widget authors
export const widgetRegistry: WidgetRegistry;
export function registerWidget(def: WidgetDefinition<any, any>): void;
```

`WidgetDefinition` (from Track 1):

```ts
interface WidgetDefinition<Props, Events> {
  type: string;
  schema: WidgetSchemaContract;
  component: React.ComponentType<WidgetRenderProps<Props, Events>>;
  supportsMountOmission: boolean;
  defaultProps?: Partial<Props>;
}

interface WidgetRenderProps<Props, Events> {
  props: Props;             // already-resolved bindings (no $bind/$value/$expr in here)
  emit: (event: keyof Events, payload?: unknown) => void;
  announce: (message: string, priority?: "polite" | "assertive") => void;
  validationState?: { errors: Array<{ path: string; message: string }> };
}
```

### 4. `SchemaRenderer`

```tsx
interface SchemaRendererProps {
  schemaId: string;
  // Internal: how the schema is loaded — for Layer 1, use the existing src/lib/schemaResolver.ts
  loader?: (schemaId: string) => Promise<PageSchemaV1>;
}

export function SchemaRenderer({ schemaId, loader }: SchemaRendererProps): JSX.Element;
```

Behavior:

1. Load the schema via `loader ?? defaultLoader` (the default reads from `src/lib/schemaResolver.ts`).
2. `validateSchemaVersion(schema.version)` — on failure, render a clear error and stop.
3. Create the runtime stack:
   - `<RuntimeGraphProvider initialSystem={…} clearOnTriggers={schema.runtime.scopes?.app?.clearOn}>`
   - `<HydrationOrchestrator schema={…}>` — uses an internal context; not a literal React component if it's a class (wire via `useEffect`).
   - Construct `PolicyClient`, `ActionEngine`, `WorkflowEngine`. Provide via React context.
4. Render `<WidgetNodeRenderer node={schema.widgetTree} />`.
5. Handle loading state (spinner) while hydration namespaces with `onHydrationFailure: "block"` are not yet `ready`.

### 5. `WidgetNodeRenderer`

For each `WidgetNode`:

1. Evaluate `mountWhen` — if false, render nothing (omit from tree).
2. Evaluate `visibleWhen` — if false, render an empty wrapper with `aria-hidden`.
3. Evaluate `enabledWhen`, `editableWhen`, `requiredWhen` — pass as props on the resolved props object.
4. Resolve each prop:
   - If `$bind`/`$value`/`$expr`/`$t` → `evaluateBinding`
   - If a `TransformExpr` → `applyTransform`
   - Plain value → pass through
5. Look up `WidgetDefinition` from `widgetRegistry`. If unknown, render `<div role="alert">Unknown widget: {type}</div>` and `console.error`.
6. Render `<def.component props={resolvedProps} emit={handleEmit} announce={announce} validationState={validationFor(node.id)} />`.
7. Recursively render children.

`handleEmit`: looks up the event-to-action binding from the node (e.g., `node.events?.click === "submitQuote"`), then calls `actionEngine.runPipeline(actionId, payload)`.

### 6. `mountWhen` lifecycle

```ts
// mount.ts
export function useMountWhen(condition: ConditionExpr | undefined, snapshot: GraphSnapshot): {
  shouldMount: boolean;
  instanceKey: number;  // increments on each false→true transition, forcing fresh React instance
};
```

When `condition` flips false → true, the `instanceKey` increments. The renderer uses it as the React `key` so a *fresh* component instance mounts (per `10-WIDGET-CONTRACT.md` § "Mount Lifecycle").

### 7. `useWidgetGraph`

```ts
export function useWidgetGraph<T extends Record<string, BindExpr>>(bindings: T): { [K in keyof T]: unknown };
```

Subscribes only to paths inside the bindings. For widgets that need to react to graph changes beyond what's in their props. Most widgets won't use this — the renderer's prop resolution is enough.

### 8. `announce`

```ts
export function announce(message: string, priority?: "polite" | "assertive"): void;
```

Maintains a singleton ARIA live region in the DOM (`<div role="status" aria-live="polite">` and `<div role="alert" aria-live="assertive">`). Inserts message text; clears after 2s.

### 9. `adaptLegacyWidget`

```ts
export function adaptLegacyWidget<P>(
  legacyComponent: React.ComponentType<P>,
  contract: WidgetSchemaContract,
  type: string,
  propsMap: (resolved: Record<string, unknown>, runtime: { emit: Function; announce: Function }) => P,
): WidgetDefinition;
```

Lets existing widgets in `src/components/widgets/*` register with the runtime without internal refactor. Track 10a uses this to register at least one read-only widget. Track 10b adds a form widget.

## Reuse / Do Not Touch

- Existing `src/components/widgets/*` — wrap via `adaptLegacyWidget`. Do **not** modify their internals.
- Existing `src/components/registry/*` — leave untouched. The new `WidgetRegistry` lives in `src/lib/runtime/render/` and is separate.
- Existing toast (commit `32efd3a`) — reused by Track 9, not by Track 8.

## Edge Cases

- A node whose `type` is unknown — render an error inline, do not crash the tree.
- `mountWhen` evaluates to `undefined` (no condition declared) → treat as `true` (always mount).
- A widget that calls `announce` before the live region exists — the function lazily inserts the region.
- Two widgets with the same `node.id` — `validationFor(id)` could be ambiguous; warn at render time.

## Allowed Deps

None new.

## DoD

`yarn test src/lib/runtime/render/` covers:

- Registering a widget and reading it back.
- `SchemaRenderer` mounts the trivial fixture and renders the expected text from `$bind`.
- `visibleWhen: false` hides the widget.
- `mountWhen: false → true` mounts a fresh instance (assert via a `useEffect` counter on a stub widget).
- An emitted event triggers `actionEngine.runPipeline` (mock the engine).
- An unknown widget type renders an inline error.
- `announce("hello")` inserts text into the live region.

## References

- [docs/archV1/10-WIDGET-CONTRACT.md:9](../10-WIDGET-CONTRACT.md#L9) — "Widget Definition": `WidgetDefinition` shape.
- [docs/archV1/10-WIDGET-CONTRACT.md:25](../10-WIDGET-CONTRACT.md#L25) — "Schema Contract": `props` and `events`.
- [docs/archV1/10-WIDGET-CONTRACT.md:50](../10-WIDGET-CONTRACT.md#L50) — "Reading From The Graph": `useWidgetGraph()` subscription semantics.
- [docs/archV1/10-WIDGET-CONTRACT.md:62](../10-WIDGET-CONTRACT.md#L62) — "Emitting Events": `emit(eventName, payload)` and runtime mapping.
- [docs/archV1/10-WIDGET-CONTRACT.md:74](../10-WIDGET-CONTRACT.md#L74) — "Mount Lifecycle": fresh-instance rule for `mountWhen`.
- [docs/archV1/10-WIDGET-CONTRACT.md:82](../10-WIDGET-CONTRACT.md#L82) — "Form Widget Subcontract": L86 controlled binding, L92 validation surface.
- [docs/archV1/10-WIDGET-CONTRACT.md:106](../10-WIDGET-CONTRACT.md#L106) — "Accessibility Requirements": L110 focus, L114 `announce()`, L128 ARIA.
- [docs/archV1/10-WIDGET-CONTRACT.md:143](../10-WIDGET-CONTRACT.md#L143) — "Widget Registration".
- [docs/archV1/01-SCHEMA-LANGUAGE.md:226](../01-SCHEMA-LANGUAGE.md#L226) — "Condition Model": the 5 keys evaluated per node.
- [docs/archV1/12-ARCHITECTURE-FREEZE-DECISIONS.md:220](../12-ARCHITECTURE-FREEZE-DECISIONS.md#L220) — "9. Structural Condition Semantics": `mountWhen` is structural, not conditional rendering.

Existing code to read before starting:

- [src/components/widgets/](../../../src/components/widgets/) — pick the smallest text/container widgets first; do not modify.
- [src/components/registry/](../../../src/components/registry/) — leave untouched; the new `WidgetRegistry` is separate.
- [src/lib/schemaResolver.ts](../../../src/lib/schemaResolver.ts) — read to understand the existing schemaId→file mapping for the default loader.
