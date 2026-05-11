# Track 10b — Full Workflow Pilot

## Goal

Extend the Track 10a read-only pilot with the add-member workflow. Adds `requestPolicies`, `actions`, `workflows`, an `access` block, and a form widget. Exercises every Layer 1 subsystem end-to-end.

This is the **final integration check** for Layer 1. When this passes, Layer 2 (schema porting) can begin.

## You Own

- `schemas/runtime-pilot/workflow.v1.json` (extends the readonly schema; can be a fresh file or amend readonly — choose fresh to keep 10a runnable)
- `src/app/runtime-pilot/workflow/page.tsx`
- `e2e/runtime/workflow-pilot.spec.ts`
- New mocks for the workflow's endpoints
- One adapted form widget (e.g., `src/components/widgets/forms/<Existing>` wrapped via `adaptLegacyWidget`)

## Inputs

- Track 10a complete and merged.
- Tracks 4, 6, 7, 9 complete.

## Deliverables

### 1. The schema

`schemas/runtime-pilot/workflow.v1.json` should include:

- The same `runtime.namespaces` as 10a, plus a `members` namespace listing existing members.
- `requestPolicies`: `authedRead` and `authedMutation` (both with session auth; mutation declares `idempotent: true`).
- `access`: `{ "broker": ["addMember"], "viewer": [] }`.
- `actions`:
  - `addMember`: a pipeline with steps `patchState` (collect form into `flow.addMember.data.draft`) → `confirm` → `apiMutation` (POST `/api/policies/POL-1/members`, `failureMode: "rollback-and-stop"`) → `invalidateNamespace: "members"` → `emitEvent: "memberAdded"`.
  - `submitForReview`: `apiMutation` to a status endpoint → `emitEvent: "submit"`.
- `workflows.addMember`: states `draft` → `submitted` → `underReview` → `approved`, with transitions on triggers `submit`, `approve`. Include `effects` on transitions and one `entryAction` on `underReview` that toasts.
- `widgetTree`: container with a form (member name, date of birth) plus a "Submit" button that emits `submit` (mapping to the `submitForReview` action), and a status badge bound to `flow.addMember.current`.

Lock the exact JSON against Track 1's finalized types; the structure above is the spec.

### 2. The route

```tsx
// src/app/runtime-pilot/workflow/page.tsx
import { SchemaRenderer } from "@/components/runtime-renderer";
export default function WorkflowPilotPage() {
  return <SchemaRenderer schemaId="runtime.pilot.workflow" />;
}
```

### 3. Mocks

- `GET /api/policies/POL-1/members` → `[{ id: 1, name: "Alice" }]`
- `POST /api/policies/POL-1/members` →
  - When body has `dob` missing or invalid → 422 with `{ errors: [{ path: "dob", message: "DOB is required" }] }`
  - Otherwise → 201 with `{ id: 2, name: body.name }`
- `POST /api/policies/POL-1/members/2/submit` → 200
- `POST /api/policies/POL-1/members/2/approve` → 200

Add idempotency-key handling in the mock if the mock framework supports it (return the same 201 for repeated keys). Otherwise skip.

### 4. Form widget adapter

Find an existing form widget in `src/components/widgets/forms/`. Adapt with `adaptLegacyWidget`, mapping `props.validationState` through to whatever validation prop the existing widget uses (likely `errors` or `fieldErrors`). If no existing widget fits, write a minimal one in `src/components/runtime-renderer/widgets/MemberForm.tsx` (≤80 lines).

### 5. The smoke spec

`e2e/runtime/workflow-pilot.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("workflow pilot completes draft → approved with validation along the way", async ({ page }) => {
  await page.goto("/runtime-pilot/workflow");
  await expect(page.getByText("draft")).toBeVisible();           // state badge

  // Submit with missing DOB → validation error surfaces on the field
  await page.getByLabel("Name").fill("Bob");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();   // confirm step
  await expect(page.getByText("DOB is required")).toBeVisible(); // validationState routed to widget

  // Fix and resubmit
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("submitted")).toBeVisible();

  // Approve (admin-style trigger — simulate by clicking the approve button rendered when state === "submitted")
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("approved")).toBeVisible();
});
```

Adjust selectors to match the widgets you adapted.

### 6. Role for access enforcement

The pilot's `access` block requires a `broker` role. Seed `system.user.role = "broker"` in `RuntimeGraphProvider`'s `initialSystem`. Add a second test (optional) that seeds `"viewer"` and asserts the Submit button does not fire the action (or is disabled if widgets read `enabledWhen` keyed off role).

## Reuse / Do Not Touch

- Reuse Track 10a's mocks where applicable.
- Reuse existing form widget if one fits.
- Do not refactor existing widget internals.

## Edge Cases

- The `apiMutation` fails with 5xx → `rollback-and-stop` reverts the `patchState` write; state should be back to `draft` after retry button shown in banner.
- User cancels the `confirm` dialog → no state advance, no error toast.
- Two rapid Submit clicks → idempotency key prevents double-create (verify via mock log if possible).
- The page is left and revisited → because `flow.*` is not persisted by default, the workflow restarts at `draft`. This is correct for v1.

## DoD

- `yarn dev`, navigate to `/runtime-pilot/workflow`, complete the full happy path.
- `yarn test:e2e -- workflow-pilot` passes.
- `yarn lint && yarn typecheck && yarn test` clean.
- Zero direct `fetch()` calls anywhere in the page.
- No domain state in React `useState` — everything reads from / writes to the graph.
- Field-level validation error from the 422 response is visible on the bound widget (not just in a toast).

## When This Passes

Layer 1 is **done**. Begin Layer 2: schema porting per the table in `14-IMPLEMENTATION-EXECUTION-PLAN.md` § "Layer 2".

## References

- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:56](../04-WORKFLOWS-AND-STATE-MACHINES.md#L56) — "Add Member Example": exact state machine to implement.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:157](../04-WORKFLOWS-AND-STATE-MACHINES.md#L157) — "Post-Mutation Reconciliation Rule": L167 patterns the pipeline must follow.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:181](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L181) — "Failure Handling": L197 `rollback-and-stop` semantics used by this pilot.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:235](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L235) — "Validation error mapping": the 422 → widget-prop flow the test asserts.
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:56](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L56) — "3. Structured mutation contracts": where idempotency is required.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:501](../01-SCHEMA-LANGUAGE.md#L501) — "Access Policy": shape of the `access` block this pilot uses.
- [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md:95](../14-IMPLEMENTATION-EXECUTION-PLAN.md#L95) — "Track 10b" summary.
- [docs/archV1/14-IMPLEMENTATION-EXECUTION-PLAN.md:141](../14-IMPLEMENTATION-EXECUTION-PLAN.md#L141) — "Layer 2: Port the Existing Schemas": what unlocks once this passes.
