# Track 3 — Conditions, Transforms & i18n

## Goal

Pure-function evaluators that take a `GraphSnapshot` (from Track 2) plus an expression and return a value. No React, no side effects. Covers binding resolution, JSONLogic conditions, the 11 bounded transforms, and translation/locale formatting.

## You Own

- `src/lib/runtime/expr/`

## Inputs

- Track 1 types: `BindExpr`, `ConditionExpr`, `TransformExpr`, `TransformOperator`
- Track 2 type: `GraphSnapshot` (interface; you do not need Track 2's implementation to start — write against the interface)
- Existing `src/lib/conditions.ts` — wrap, don't rewrite

## Deliverables

### 1. Files

```
src/lib/runtime/expr/
├── index.ts
├── evaluate.ts        // evaluateBinding, evaluateCondition (the public entry points)
├── jsonlogic.ts       // thin adapter over src/lib/conditions.ts
├── transforms.ts      // applyTransform + 11 operator implementations
├── i18n.ts            // resolveTranslation, formatLocale
└── expr.test.ts
```

### 2. Exact exports

```ts
// evaluate.ts
export function evaluateBinding(expr: BindExpr, snapshot: GraphSnapshot, opts?: { parentScope?: string }): unknown;
export function evaluateCondition(expr: ConditionExpr, snapshot: GraphSnapshot): boolean;

// transforms.ts
export function applyTransform(expr: TransformExpr, snapshot: GraphSnapshot): unknown;

// i18n.ts
export function resolveTranslation(key: string, locale: string, count?: number): string;
export function formatLocale(value: unknown, opts: { kind: "date" | "currency" | "number"; locale: string; [k: string]: unknown }): string;
```

`evaluateBinding` dispatch:

- `{ $bind: "page.x.y" }` → `snapshot.read("page.x.y")`
- `{ $bind: "x.y" }` and `opts.parentScope = "page.policy"` → `snapshot.read("page.policy.x.y")` (relative paths)
- `{ $value: v }` → `v`
- `{ $expr: logic }` → `evaluateJsonLogic(logic, snapshot)` from `jsonlogic.ts`
- `{ $t: key, count }` → `resolveTranslation(key, snapshot.read("system.locale") ?? "en-US", count)`

`evaluateCondition` always returns a strict boolean. Truthy non-boolean inputs from JSONLogic must be coerced. `undefined` and `null` → `false`.

### 3. Transform operators (exact behavior)

Each operator receives `input` (already-resolved) and `args` from the `TransformExpr`. All operators are pure; never mutate input.

| Op | Signature (semantics) | Args |
|---|---|---|
| `map` | array → array, applies sub-expr to each item | `each: TransformExpr \| BindExpr` (item bound under `__item__` path in a derived snapshot) |
| `filter` | array → array, keeps items where `where` is truthy | `where: ConditionExpr` (item under `__item__`) |
| `pick` | object → object, keeps named keys | `keys: string[]` |
| `pluck` | array of objects → array of values | `key: string` |
| `join` | array of strings → string | `separator: string` (default `", "`) |
| `coalesce` | array of values → first non-null/non-undefined | `values: (BindExpr \| TransformExpr)[]` (overrides `input`) |
| `formatDate` | ISO date string → formatted | `format: "short" \| "medium" \| "long" \| string` (Intl options or pattern); reads `system.locale` |
| `formatCurrency` | number → formatted | `currency: string` (ISO code, e.g. "USD"); reads `system.locale` |
| `switch` | value → mapped value | `cases: { when: unknown; then: BindExpr \| TransformExpr }[]; default?: BindExpr \| TransformExpr` |
| `groupBy` | array of objects → record<key, items[]> | `key: string` |
| `count` | array → number | none |

Unknown operator → `throw new Error("[runtime:expr] Unknown transform op: " + op)`. No silent fallback.

For `map` and `filter` item access, implement by wrapping the snapshot:

```ts
function withItem(snapshot: GraphSnapshot, item: unknown): GraphSnapshot {
  return {
    read(path) {
      if (path === "__item__" || path.startsWith("__item__.")) {
        return getByPath(item, path.slice("__item__".length).replace(/^\./, ""));
      }
      return snapshot.read(path);
    },
  };
}
```

### 4. `jsonlogic.ts`

Wrap `src/lib/conditions.ts`. **Read that file first** to understand its export shape — it likely exports an `evaluate` function over a context object. Adapt:

```ts
import { evaluateJsonLogic as legacy } from "@/lib/conditions"; // adjust import to whatever the file exports

export function evaluateJsonLogic(expr: unknown, snapshot: GraphSnapshot): unknown {
  // Build a plain context object from the snapshot for legacy to consume.
  // Snapshot is path-based; legacy expects nested objects. Materialize on demand:
  const proxyCtx = new Proxy({}, {
    get(_t, prop: string) { return snapshot.read(prop as string); }
  });
  return legacy(expr, proxyCtx);
}
```

If `src/lib/conditions.ts` has a different shape, write an adapter that uses whatever evaluate function it provides; do not reimplement JSONLogic.

### 5. i18n

```ts
// i18n.ts
const FALLBACK_CATALOG: Record<string, string> = {}; // empty for now; populated later

export function resolveTranslation(key: string, locale: string, count?: number): string {
  // For Layer 1: return the key itself if no catalog entry exists. Plural form: append "_plural" key check if count !== 1.
  const pluralKey = count !== undefined && count !== 1 ? `${key}_plural` : key;
  return FALLBACK_CATALOG[pluralKey] ?? FALLBACK_CATALOG[key] ?? key;
}

export function formatLocale(value, { kind, locale, ...rest }): string {
  if (value === null || value === undefined) return "";
  switch (kind) {
    case "date":     return new Intl.DateTimeFormat(locale, rest as Intl.DateTimeFormatOptions).format(new Date(value as string));
    case "currency": return new Intl.NumberFormat(locale, { style: "currency", currency: rest.currency as string, ...rest }).format(Number(value));
    case "number":   return new Intl.NumberFormat(locale, rest).format(Number(value));
  }
}
```

## Reuse / Do Not Touch

- **Must reuse** `src/lib/conditions.ts` (do not reimplement JSONLogic).
- Do not touch `src/lib/runtime/graph/`.

## Edge Cases

- Relative `$bind` with no `parentScope` → treat as absolute (don't prepend anything).
- `evaluateBinding` on a `$bind` to a non-existent path → return `undefined` (not error).
- Empty array into `count` → `0`; into `groupBy` → `{}`.
- `coalesce` with all null/undefined → `null`.
- `formatDate` on invalid input → return empty string, do not throw.
- `switch` with no matching case and no default → `undefined`.

## Allowed Deps

None new. `Intl` is built into the platform.

## DoD

`yarn test src/lib/runtime/expr/` covers:

- Each of the 11 transforms with at least one happy path and one edge case
- `evaluateBinding` with all 4 forms (`$bind`, `$value`, `$expr`, `$t`)
- Relative `$bind` with `parentScope`
- `evaluateCondition` with a JSONLogic expression reading from the snapshot
- `resolveTranslation` fallback to key
- `formatLocale` for date and currency, with the locale pulled from `system.locale`

## References

- [docs/archV1/01-SCHEMA-LANGUAGE.md:188](../01-SCHEMA-LANGUAGE.md#L188) — "Binding Model": L192 absolute paths, L198 relative paths, L206 inline value, L212 `$expr`.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:226](../01-SCHEMA-LANGUAGE.md#L226) — "Condition Model": the 5 condition keys; L239 explains `mountWhen` rationale.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:264](../01-SCHEMA-LANGUAGE.md#L264) — "Derived Values And Transforms": L270 lists the 11 operators; L283 has a worked example.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:314](../01-SCHEMA-LANGUAGE.md#L314) — "Transform DSL Governance": L338 `$expr` escape hatch rules.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:446](../01-SCHEMA-LANGUAGE.md#L446) — "Internationalization": L450 `$t` key bindings, L466 locale-aware formatters, L483 pluralization.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:315](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L315) — "Graph Reactivity Model": confirms snapshots are read-only views.

Existing code to read before starting:

- [src/lib/conditions.ts](../../../src/lib/conditions.ts) — read its full export surface before writing the JSONLogic adapter.
