# Track 0 — Workspace Scaffold

## Goal

Create the empty directory + barrel skeleton under `src/lib/runtime/` so every subsequent track can land its code in an owned subfolder with zero merge conflicts on the root barrel.

## You Own

- `src/lib/runtime/` (the whole directory tree, freshly created)
- One root `src/lib/runtime/index.ts`
- Empty subfolder skeletons (each with a one-line `index.ts`)
- `src/lib/runtime/__fixtures__/` with one stub file

You do **not** write actual runtime logic. That is each subsequent track's job.

## Inputs

None. This is the very first track.

## Deliverables

### 1. Directory tree

```
src/lib/runtime/
├── index.ts
├── types/
│   └── index.ts
├── graph/
│   └── index.ts
├── expr/
│   └── index.ts
├── api/
│   └── index.ts
├── hydrate/
│   └── index.ts
├── actions/
│   └── index.ts
├── workflow/
│   └── index.ts
├── render/
│   └── index.ts
├── errors/
│   └── index.ts
└── __fixtures__/
    └── trivial.ts
```

### 2. Root barrel `src/lib/runtime/index.ts`

```ts
export * from "./types";
export * from "./graph";
export * from "./expr";
export * from "./api";
export * from "./hydrate";
export * from "./actions";
export * from "./workflow";
export * from "./render";
export * from "./errors";
```

### 3. Each subfolder `index.ts`

```ts
// src/lib/runtime/<subdir>/index.ts
export {};
```

Empty re-export. Each track later replaces this file with its real exports.

### 4. `src/lib/runtime/__fixtures__/trivial.ts`

```ts
// Placeholder. Track 1 fills this in with a real PageSchemaV1 fixture.
export const TRIVIAL_FIXTURE_PLACEHOLDER = true;
```

### 5. One smoke test `src/lib/runtime/runtime.test.ts`

```ts
import { describe, it, expect } from "vitest";
import * as runtime from "./index";

describe("runtime scaffold", () => {
  it("exports without error", () => {
    expect(runtime).toBeDefined();
  });
});
```

## Reuse / Do Not Touch

- Do not edit `package.json` unless Vitest is not already configured. If it is configured, you are done. If it is not, add `"test": "vitest run"` to `scripts`. Confirm with the user before adding a dep.
- Do not edit `tsconfig.json` unless `src/lib/runtime/**/*` is not picked up by the current `include`. If it is already picked up via `src/**/*`, you are done.

## Edge Cases

- If `src/lib/runtime/` already exists, do **not** delete or overwrite. Inspect, report state, stop.
- Wildcard re-exports require no name collisions across subfolders. There are none at this stage because subfolders are empty.

## Allowed Deps

None. Use only what's already in `package.json`.

## DoD

- `yarn typecheck` clean.
- `yarn test src/lib/runtime/runtime.test.ts` passes.
- The directory tree above exists and the root barrel imports cleanly.

## References

- [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md:118](../14-IMPLEMENTATION-EXECUTION-PLAN.md#L118) — "File Ownership (No Cross-Track Writes)": confirms the one-track-per-subdirectory model.
- [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md:27](../14-IMPLEMENTATION-EXECUTION-PLAN.md#L27) — "Pre-Decided Technical Choices": Vitest is the test runner; wildcard barrels per subdir; no merge contention on root index.
