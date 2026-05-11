# Track 10a — Read-Only Pilot

## Goal

The first integration: a brand-new v1 schema for a read-only policy detail page. Loads through `<SchemaRenderer />`, hydrates two namespaces from mocks, renders a small widget tree with `visibleWhen` and one derived transform. No actions, no workflows, no form submission yet.

This track de-risks the graph + hydrator + renderer stack before Track 10b adds actions and workflows.

## You Own

- `schemas/runtime-pilot/readonly.v1.json` (new schema file)
- `src/app/runtime-pilot/readonly/page.tsx` (new Next route — or whatever the routing convention is in this repo; inspect `src/app/` first)
- `e2e/runtime/readonly-pilot.spec.ts` (new Playwright spec)
- One new mock response under `src/lib/api-mock/` if needed
- Up to two existing widgets adapted via `adaptLegacyWidget` (no widget internal changes)

## Inputs

- All of Tracks 1, 2, 3, 5, 8 complete. Tracks 4, 6, 7, 9 *may* still be in flight but are not used by this pilot.

## Deliverables

### 1. The schema

`schemas/runtime-pilot/readonly.v1.json`:

```jsonc
{
  "schemaId": "runtime.pilot.readonly",
  "version": "1.0.0",
  "metadata": { "title": "Runtime Pilot — Read-Only", "owner": "platform" },
  "runtime": {
    "scopes": { "page": {} },
    "namespaces": {
      "policy": {
        "source": "api",
        "policy": "anonRead",
        "endpoint": "/api/quotation/policies/POL-1",
        "writeTo": "page.policy"
      },
      "insured": {
        "source": "api",
        "policy": "anonRead",
        "endpoint": "/api/quotation/policies/POL-1/insured",
        "writeTo": "page.insured",
        "dependsOn": ["policy"]
      }
    },
    "derived": {
      "fullName": {
        "op": "join",
        "input": {
          "op": "pluck",
          "input": { "$bind": "page.insured.members" },
          "args": { "key": "name" }
        },
        "args": { "separator": ", " }
      }
    }
  },
  "requestPolicies": {
    "anonRead": { "auth": "anonymous", "includeHeaders": [] }
  },
  "widgetTree": {
    "type": "Container",
    "id": "root",
    "children": [
      { "type": "Text", "id": "title", "props": { "value": { "$bind": "page.policy.policy_no" } } },
      {
        "type": "Text",
        "id": "members",
        "visibleWhen": { "!=": [{ "var": "page.insured.members.length" }, 0] },
        "props": { "value": { "$bind": "derived.fullName" } }
      }
    ]
  }
}
```

(Adjust to the exact `NamespaceDef` and `WidgetNode` shapes Track 1 finalized. The structure above is illustrative.)

### 2. The route

```tsx
// src/app/runtime-pilot/readonly/page.tsx
import { SchemaRenderer } from "@/components/runtime-renderer";

export default function ReadonlyPilotPage() {
  return <SchemaRenderer schemaId="runtime.pilot.readonly" />;
}
```

If the existing schemaResolver (`src/lib/schemaResolver.ts`) loads schemas by `schemaId`, ensure your new schema file is discoverable. Read the resolver first; add a registration if needed.

### 3. Mocks

Find the existing mocks setup. There is `src/lib/api-mock/` and `src/mocks/group-pas/quotation/quotes.ts` and similar. Add (or reuse) mocks for:

- `GET /api/quotation/policies/POL-1` → `{ policy_no: "POL-1", status: "active", … }`
- `GET /api/quotation/policies/POL-1/insured` → `{ members: [{ name: "Alice" }, { name: "Bob" }] }`

### 4. Widget adapters

Pick the smallest existing widget that renders text (likely `src/components/widgets/data/CellRenderer.tsx` or similar). Wrap with `adaptLegacyWidget`:

```ts
// in a setup file imported by SchemaRenderer, or in src/lib/runtime/render/registerLegacyWidgets.ts
import { registerWidget, adaptLegacyWidget } from "@/lib/runtime";
import { TextCell } from "@/components/widgets/data/CellRenderer"; // adjust to actual export

registerWidget(adaptLegacyWidget(
  TextCell,
  { props: { value: { bindable: true, type: "string", required: true } }, events: {} },
  "Text",
  (resolved) => ({ children: String(resolved.value ?? "") }),
));
```

If no suitable existing widget exists, write a tiny `<TextWidget>` directly in `src/components/runtime-renderer/widgets/Text.tsx`. Keep it under 30 lines.

Same approach for `Container` (a `<div>` with children).

### 5. The smoke spec

`e2e/runtime/readonly-pilot.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("readonly pilot renders policy and members from hydrated namespaces", async ({ page }) => {
  await page.goto("/runtime-pilot/readonly");
  await expect(page.getByText("POL-1")).toBeVisible();
  await expect(page.getByText("Alice, Bob")).toBeVisible();
});
```

If Playwright is not yet wired in the repo, set it up first: `yarn add -D @playwright/test`, `npx playwright install --with-deps chromium`, add a `playwright.config.ts` minimal config that runs `yarn dev` as the webserver and targets `http://localhost:3000`.

## Reuse / Do Not Touch

- Do not modify any track's owned directory under `src/lib/runtime/`.
- Do not modify existing widget internals — only adapt them.
- Do not change `src/lib/schemaResolver.ts` unless schema discovery requires it; if it does, the change should be additive (a new schemaId mapping).

## Edge Cases

- The hydrator fails to fetch `/api/quotation/policies/POL-1` — the page should show the block-banner. Verify by temporarily breaking the mock; revert before merging.
- The schema version is bumped to `"2.0.0"` — `SchemaRenderer` should render a version-mismatch error. Cover this with a unit test against the loader.

## DoD

- `yarn dev`, navigate to `/runtime-pilot/readonly`, see policy number and member list.
- `yarn test:e2e -- readonly-pilot` passes.
- `yarn lint && yarn typecheck && yarn test` clean.
- Zero direct `fetch()` calls in the route or adapted widgets — all goes through `PolicyClient` via the hydrator.
- Zero React state holding domain data — all state lives in the graph.

## References

- [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md:91](../14-IMPLEMENTATION-EXECUTION-PLAN.md#L91) — "Track 10a" summary.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:43](../01-SCHEMA-LANGUAGE.md#L43) — "Top-Level Schema Shape": exact field layout for the pilot schema.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:110](../01-SCHEMA-LANGUAGE.md#L110) — "Namespace Definitions": L153 worked example.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:264](../01-SCHEMA-LANGUAGE.md#L264) — "Derived Values And Transforms": for the `join`/`pluck` chain in the pilot.
- [docs/archV1/02-RUNTIME-GRAPH-AND-CONTEXT.md:79](../02-RUNTIME-GRAPH-AND-CONTEXT.md#L79) — "Namespace Hydration Rules": confirm dependency ordering applies here.

Existing code to read before starting:

- [src/app/](../../../src/app/) — confirm routing convention (Next.js app router; one `page.tsx` per route).
- [src/lib/schemaResolver.ts](../../../src/lib/schemaResolver.ts) — verify how the new schemaId is discovered.
- [src/lib/api-mock/](../../../src/lib/api-mock/) — pattern for adding mocks.
- [src/components/widgets/data/CellRenderer.tsx](../../../src/components/widgets/data/CellRenderer.tsx) — likely candidate for the text widget adapter.
