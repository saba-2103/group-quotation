# Track 9 — Error Surfaces & Validation Mapping

## Goal

A registry of error surfaces (toast, banner, modal) that consume `ErrorContext` from the action engine and route field-level validation errors to bound form widgets via the `validationState` prop.

## You Own

- `src/lib/runtime/errors/`
- `src/components/runtime-banner/` (a new banner component if one doesn't exist)

## Inputs

- Track 1 types: `ErrorContext`, `ApiError`
- Track 6: `ActionEngine` — its `onError` callback is wired to this track
- Track 8: `SchemaRenderer` — passes `validationState` down to widgets
- Existing native toast from commit `32efd3a`
- Existing `src/components/ui/` Dialog primitives for `modal`

## Deliverables

### 1. Files

```
src/lib/runtime/errors/
├── index.ts
├── ErrorSurfaceRegistry.ts
├── surfaces/
│   ├── toast.tsx                // wraps existing toast (commit 32efd3a)
│   ├── banner.tsx               // renders <RuntimeBanner />
│   └── modal.tsx                // wraps existing Dialog
├── validationMap.ts             // routes ApiError.validation entries to widget bindings
├── ErrorRouter.tsx              // React-level wiring; subscribes to ActionEngine errors
└── errors.test.tsx

src/components/runtime-banner/
├── RuntimeBanner.tsx
└── index.ts
```

### 2. Exact exports

```ts
// src/lib/runtime/errors/index.ts
export { ErrorSurfaceRegistry, errorSurfaceRegistry } from "./ErrorSurfaceRegistry";
export type { ErrorSurface, ErrorSurfaceRender } from "./ErrorSurfaceRegistry";
export { ErrorRouter } from "./ErrorRouter";
export { validationMap, useValidationState } from "./validationMap";
```

### 3. `ErrorSurfaceRegistry`

```ts
export type ErrorSurfaceRender = (ctx: ErrorContext) => void;

export interface ErrorSurface {
  name: string;             // "toast" | "banner" | "modal" | custom
  render: ErrorSurfaceRender;
}

export class ErrorSurfaceRegistry {
  register(surface: ErrorSurface): void;
  get(name: string): ErrorSurface | undefined;
  default(): ErrorSurface;   // returns "toast"
}

export const errorSurfaceRegistry: ErrorSurfaceRegistry;
```

Built-in registrations at module load:

```ts
errorSurfaceRegistry.register({ name: "toast", render: renderToast });
errorSurfaceRegistry.register({ name: "banner", render: renderBanner });
errorSurfaceRegistry.register({ name: "modal", render: renderModal });
```

### 4. Surface selection

Default mapping per archV1 doc:

- `failureMode: "warn-only"` → `toast`
- `failureMode: "block"` → `banner` AND `validationState` on bound widgets (both, not one or the other)
- Action step `type: "confirm"` → `modal` (handled by ActionEngine.confirm directly; not via this registry)

Schema can override by setting `surface` on an `apiMutation` step. For v1, support the default mapping only; honor an optional `surface` field if Track 1 includes it.

### 5. `validationMap.ts`

```ts
export interface ValidationEnvelope {
  errors: Array<{ path: string; message: string }>;
}

// Maps validation paths to widget-binding paths.
// A widget bound to "page.members[0].dob" with an error at path "members[0].dob" gets the error.
export function validationMap(
  envelope: ValidationEnvelope,
  graphScope: "page" | "flow" = "page",
): Record<string /* graphPath */, Array<{ path: string; message: string }>>;
```

The map keys are full graph paths (with the scope prefix). Track 8's renderer uses `useValidationState(nodeId)` to read from a context that this track maintains.

```ts
export function useValidationState(graphPath: string): { errors: Array<{ path: string; message: string }> } | undefined;
```

Path matching rule: a widget bound to `page.members[0].dob` matches a server validation entry whose `path` equals `members[0].dob` (the scope prefix is stripped before comparison). If the server emits paths with the scope prefix included, strip the first segment before matching.

### 6. `ErrorRouter`

A top-level React component placed inside `SchemaRenderer` (Track 8 mounts it). Subscribes to `ActionEngine`'s `onError`:

- For `ErrorContext` with `validation`: build a validation map, write it into a React context that `useValidationState` reads.
- For all errors: pick a surface (warn-only → toast, block → banner) and invoke `surface.render(ctx)`.
- Clears validation state on the next successful pipeline for the same `actionId`.

```tsx
<ErrorRouter />
// internally:
//   const [validation, setValidation] = useState<...>({});
//   useEffect(() => actionEngine.subscribeError(onErr), [actionEngine]);
//   return <ValidationContext.Provider value={validation}>{children}</ValidationContext.Provider>;
```

### 7. Surfaces

```tsx
// surfaces/toast.tsx
import { toast } from "@/components/toast"; // or whatever the 32efd3a commit named it — read first
export const renderToast: ErrorSurfaceRender = (ctx) => {
  toast({ kind: "error", message: ctx.message, correlationId: ctx.correlationId });
};

// surfaces/banner.tsx
import { showBanner } from "@/components/runtime-banner";
export const renderBanner: ErrorSurfaceRender = (ctx) => {
  showBanner({ message: ctx.message, retryable: ctx.retryable, correlationId: ctx.correlationId });
};

// surfaces/modal.tsx
// Used only for confirm-style flows. Not invoked from onError path in v1.
```

### 8. `RuntimeBanner`

A page-level banner rendered above the widget tree by `SchemaRenderer`. Shows the most recent block-level error, with a retry button if `retryable`, and a dismiss button. Module exposes:

```ts
export function showBanner(opts: { message: string; retryable: boolean; correlationId?: string }): void;
export function dismissBanner(): void;
```

Implementation: a small Zustand store local to this module.

## Reuse / Do Not Touch

- **Must reuse** the native toast from commit `32efd3a`. Find it (likely `src/components/ui/toast/` or `src/components/toast/`). Read its API before writing `surfaces/toast.tsx`.
- **Must reuse** Dialog primitives from `src/components/ui/` for the modal surface.
- Do not modify any existing widget to add validation prop handling — Track 8's renderer passes `validationState` already; widgets just need to read it (existing widgets are wrapped by `adaptLegacyWidget`, which can map the prop in).

## Edge Cases

- A validation envelope with zero entries → no widget gets `validationState`, no banner.
- A validation envelope whose paths match no widget → log a warning with the unmatched paths; still raise a banner with the summary.
- Multiple errors for the same path → group; widget gets all of them in its `errors[]`.
- Two consecutive `block` errors from the same action → second replaces first in the banner.

## Allowed Deps

- `zustand` (already added by Track 2).

## DoD

`yarn test src/lib/runtime/errors/` covers:

- A `warn-only` `ErrorContext` invokes `renderToast`.
- A `block` `ErrorContext` invokes `renderBanner` AND populates `useValidationState`.
- A widget bound to `page.members[0].dob` reads the error after a mock validation envelope with `path: "members[0].dob"`.
- Successful re-run of the same `actionId` clears the previous validation state.
- Unmatched validation paths log a warning.

## References

- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:201](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L201) — "Error UX Strategy": L205 default surfaces, L215 surface selection, L241 custom error components.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:235](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L235) — "Validation error mapping": the path→widget routing algorithm.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:253](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L253) — "Error context payload": the `ErrorContext` shape Track 6 emits and you consume.
- [docs/archV1/10-WIDGET-CONTRACT.md:82](../10-WIDGET-CONTRACT.md#L82) — "Form Widget Subcontract": L92 "Validation surface" — the `validationState` prop contract.

Existing code to read before starting:

- Toast component added in commit `32efd3a` — run `git show 32efd3a --stat` to list the files; read each before wiring `surfaces/toast.tsx`.
- [src/components/ui/](../../../src/components/ui/) — find the Dialog primitive for `surfaces/modal.tsx`.
