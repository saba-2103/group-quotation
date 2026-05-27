# 12 — Troubleshooting

Common symptoms in this framework, mapped to causes and fixes. Skim this when you're stuck.

---

## Schema not rendering at all

### Symptom: blank page, no errors in console

**Diagnosis:** the schema's top-level node has an unknown `type`, or the file isn't being imported.

**Fix:**
1. Verify `WidgetRegistry.tsx` has a key for `config.type`.
2. Open the imported schema file — confirm `type` and `id` are at the root, not nested under `props`.
3. Check the page's import path against the actual file location.

### Symptom: "Component is not a function" error

**Diagnosis:** the widget's component is undefined — usually because the file path in the registry import doesn't match the actual file.

**Fix:** verify the import in `WidgetRegistry.tsx`. Run `npm run typecheck` to surface broken imports.

### Symptom: "Unknown widget type: foo" warning

**Diagnosis:** schema references a widget that's not registered.

**Fix:** either fix the typo in `type` or register the widget. See [11-cookbook.md → Register a new widget](11-cookbook.md#recipe-11--register-a-new-widget).

---

## Data not fetching

### Symptom: widget renders skeleton forever

**Diagnosis:** the fetch fired but never resolved. Usually a network error, a wrong endpoint, or a malformed `dataSource`.

**Fix:**
1. Open browser DevTools → Network tab. Find the request.
2. If 404 → wrong endpoint. Check `dataSource.api.endpoint` against the actual route file.
3. If 500 → backend error. Check the API route's console output.
4. If no request appears → `dataSource` is malformed (missing `api.endpoint` or `api.method`).

### Symptom: widget renders empty state ("—" everywhere)

**Diagnosis:** the fetch succeeded but the response shape doesn't match what the widget expects.

**Fix:**
1. Inspect the response in Network tab.
2. If the response is enveloped (`{ items: [...] }`) but the widget needs a bare array, add `dataSource.valueKey: "items"`.
3. If accessor keys don't match the response — e.g., schema says `accessorKey: "claim_no"` but response has `claimNo` — fix one or the other.

### Symptom: `{{id}}` literal appears in the URL

**Diagnosis:** the page-level template substitution walker didn't reach this endpoint.

**Fix:** the page walker in `src/app/<module>/[id]/page.tsx` only recurses into `dataSource.api.endpoint`, `props.actions[].api.endpoint`, and `node.children`. If your widget puts the endpoint elsewhere (e.g., a direct prop like `pendingTicketEndpoint`), extend the walker. See [08-pages-and-routing.md → Template substitution](08-pages-and-routing.md#template-substitution).

### Symptom: `:id` literal appears in a URL

**Diagnosis:** `substituteEndpointParams` ran but the row data didn't have the expected key, or the action fired outside a row context.

**Fix:**
1. Check that the action is a row action (or form action with prefilled data), not a header/page-level action.
2. Confirm the row data field name matches the `:param` token — `:id` requires `rowData.id`, `:claim_id` requires `rowData.claim_id`.
3. For non-default PK, set `rowIdKey` on the data-table.

---

## Mutations not refreshing the UI

### Symptom: mutation succeeds, toast shows, but the data on screen doesn't update

**Diagnosis:** `refreshKey` doesn't match any cached query key, so nothing invalidates.

**Fix:**
1. Check the React Query DevTools — what's the cache key of the query that should refetch? It's the endpoint string (first key segment).
2. Set `refreshKey` to a prefix that matches. `/api/v1/claims/` (with trailing slash) invalidates everything under `/api/v1/claims/...` plus the list endpoint that starts with the same prefix.

### Symptom: too many refetches (whole page reloads after every action)

**Diagnosis:** `refreshKey` is too broad.

**Fix:** narrow the prefix. `/api/v1/claims/C-001` invalidates only that claim's queries.

---

## Forms not submitting

### Symptom: clicking Submit does nothing

**Diagnosis:** validation is failing silently, or no action has `submitAction: true`.

**Fix:**
1. Open DevTools console — Zod validation errors usually log there.
2. Check the form schema for exactly one `"submitAction": true` action.
3. Confirm field-level `validations` use the array form (`[{ rule: "required", ... }]`), not `props.required`.

### Symptom: backend errors show as toasts, not next to fields

**Diagnosis:** the response uses the top-level `message` shape, not the `backendErrors` array shape. Forms only map field errors from the `backendErrors[].variable_code` field.

**Fix:** return both:

```json
{
  "message": "Validation failed",
  "backendErrors": [
    { "variable_code": "claim_no", "error_code": "DUPLICATE", "error_desc": "Already exists" }
  ]
}
```

### Symptom: a form field's `visibleWhen` never matches

**Diagnosis:** the JSONLogic var references the wrong field name.

**Fix:** the var name in `visibleWhen` must match the `name` (not `id`) of the form field it depends on. `{ "var": "loss_type" }` requires a field with `"name": "loss_type"`.

### Symptom: edits to a form schema don't appear in the UI

**Diagnosis:** the forms registry is stale.

**Fix:**
```bash
npm run predev
# or directly:
node scripts/generate_form_index.mjs
# then restart dev server
```

---

## Tabs / `$ref` issues

### Symptom: tab content is empty

**Diagnosis:** the `$ref` path didn't resolve.

**Fix:**
1. Check the path: `schemas/tabs/<module>/<file>.json` — exact, including `.json`, from repo root.
2. Check that `resolveSchemaRefs` ran. The page should `await resolveSchemaRefs(schema, ...)` before passing to `WidgetRenderer`.
3. Check the imported file is valid JSON (`node -e "JSON.parse(require('fs').readFileSync('schemas/...'))"`).

### Symptom: `__error` field appears in DevTools console

**Diagnosis:** `resolveSchemaRefs` caught an error and attached it to the node for debugging.

**Fix:** the error message is in the `__error` field. Usually a bad `$ref` path or a form id not in the registry. Check the path and regenerate the registry.

---

## Actions not firing

### Symptom: clicking a button does nothing

**Diagnosis:** the action is gated by state or role and rendering disabled (or hidden).

**Fix:**
1. Inspect the rendered button — is it `disabled`? Hover for the tooltip.
2. Check `stateActions[currentState]` and `roleActions[currentRole]` in the schema. The action's `id` must appear in both lists (within action-bar) to render.
3. For a top-level button (page-header, header action on table), there's no gating — it's a different bug. Check the console for handler errors.

### Symptom: action has `disabledTooltip` but isn't disabled

**Diagnosis:** `disabledTooltip` is being interpreted as a regular `tooltip` because of how the widget passes props.

**Fix:** `disabledTooltip` is only honoured by ActionBar (and ConfirmationDialog re-uses the same logic). On a header action or row action, the prop is ignored — use a different mechanism to hide the action.

### Symptom: `api-mutation` runs but doesn't show a toast

**Diagnosis:** `successMessage` is missing.

**Fix:** add `"successMessage": "..."` to the action. The mutation runs silently otherwise.

---

## State and conditions

### Symptom: `visibleWhen` doesn't react to filter changes

**Diagnosis:** the condition references the wrong key.

**Fix:** check the publisher's `stateKey` matches the subscriber's reference. If `filter-bar` writes to `page:claims:filters`, a condition using `{ "var": "filters" }` won't find it — use `{ "var": "page:claims:filters.state" }` for nested access.

### Symptom: role-gated section visible to all roles

**Diagnosis:** the section is using `layout.visibleWhen` or some other JSONLogic predicate that the renderer doesn't honour for role-gating.

**Fix:** use `visibleRoles` directly on the `WidgetConfig` — this is the renderer-honoured role gate on `main` (PR #72). Empty array hides for everyone; omit the prop to render for every role.

```json
{
  "id": "siu-section",
  "type": "section-group",
  "visibleRoles": ["siu_officer"],
  "children": [ ... ]
}
```

For per-button gating inside an `action-bar`, use `action-bar.roleActions` (`Record<role, action-id[]>`) — see [02-widget-catalog.md → action-bar](02-widget-catalog.md#action-bar).

---

## Polling

### Symptom: widget never stops polling

**Diagnosis:** `stopWhen` predicate never evaluates true.

**Fix:**
1. Test the predicate at [jsonlogic.com](https://jsonlogic.com/play.html) with a mock response.
2. Check field types — `{ "==": [{"var":"x"}, "5"] }` vs `{ "==": [{"var":"x"}, 5] }` matters if `x` is a number.
3. Set `maxDurationMs` as a hard limit if `stopWhen` can't be relied upon.

### Symptom: polling fires too frequently

**Diagnosis:** `refreshInterval` (or `pollSchedule.initialIntervalMs`) is set too low.

**Fix:** check the values. 2000ms is a sensible floor for the fast phase; 5000ms for the slow phase.

---

## Overlays / modals

### Symptom: clicking a button opens an empty modal

**Diagnosis:** the modal target doesn't match a form in the registry.

**Fix:**
1. The action's `target` is the form's `id` (which matches the form file name without `.json`).
2. Confirm the form file exists in `schemas/forms/`.
3. Confirm the forms registry was regenerated.

### Symptom: closing the modal also navigates the page

**Diagnosis:** an `onSuccess` chain includes both `trigger-event` (close modal) and `navigate` — but the order is wrong, or both fired.

**Fix:** check the order in `onSuccess`. Usually you want `trigger-event` first (close), then `navigate`. If you don't want navigation, remove the `navigate` action.

### Symptom: modal data isn't prefilled

**Diagnosis:** the row data didn't flow through. The `open-modal` action passes the row data as the overlay payload; the `OverlaidForm` uses it as field defaults.

**Fix:**
1. Confirm the action is a row action (or has a known data context).
2. Confirm the form field names match the row data keys.
3. Inspect `useOverlayStore` state in React DevTools — the data should be in `openOverlays[<formId>].data`.

---

## Design / styling

### Symptom: a colour change doesn't apply

**Diagnosis:** the widget uses a hardcoded class instead of a token.

**Fix:** widgets should use tokens (`bg-primary`, `text-foreground`). If you change `--primary` and nothing updates, find the widget hardcoding `bg-[#0070f3]` or similar and fix.

### Symptom: dark mode looks broken

**Diagnosis:** hardcoded colours don't flip, or `.dark` overrides aren't defined for a token.

**Fix:**
1. Confirm tokens are used everywhere (`bg-card`, not `bg-white`).
2. Confirm the `.dark` block in `globals.css` defines an override for every token used.

### Symptom: icons don't render

**Diagnosis:** typo in the Lucide icon name.

**Fix:** Lucide names are case-sensitive PascalCase. Check [lucide.dev/icons](https://lucide.dev/icons). `FileText` ≠ `Filetext` ≠ `file-text`.

---

## TypeScript / build errors

### Symptom: type errors after editing a schema

**Diagnosis:** TypeScript imports JSON with strict typing; you've added a field the type doesn't know about.

**Fix:** widgets typically cast `config.props` to a local interface (`as MyWidgetProps`). The cast hides type errors at the widget boundary. If the cast fails (e.g., `value as never` complaint), the actual `WidgetConfig` shape is being violated — usually a misplaced field.

### Symptom: `dynamic = 'force-dynamic'` missing error

**Diagnosis:** Next.js tries to statically generate a page with async `params`.

**Fix:** add `export const dynamic = 'force-dynamic';` at the top of the page file.

---

## Performance

### Symptom: page loads slowly, lots of fetches in Network tab

**Diagnosis:** every widget with a `dataSource` fires a fetch. Multiple widgets hitting the same endpoint should dedupe via React Query — but only if the cache key matches.

**Fix:**
1. Inspect React Query DevTools — confirm queries with the same endpoint share a key.
2. If the same endpoint has different query keys per widget (e.g., one passes `valueKey`, another doesn't — same key actually), they should dedupe. If they don't, check `stateDependencies` — different dependencies create different keys.
3. Consolidate fetches: one widget fetches, siblings consume via `useWidgetState` instead of their own dataSource.

### Symptom: filtering is laggy

**Diagnosis:** filter changes refetch on every keystroke.

**Fix:** the `filter-bar` debounces by 300ms by default. If you're seeing every-keystroke fetches, something is wrong — check the bar's `stateKey` change frequency.

### Symptom: dashboard refresh is jank

**Diagnosis:** every metric card fetches every 30s independently, causing a render storm.

**Fix:**
- Stagger `refreshInterval` (`30000`, `35000`, `40000`) so they don't fire simultaneously.
- Consider a single dashboard endpoint that returns all metrics, consumed by a custom widget.

---

## When the issue isn't in this list

1. **Read [01-architecture.md](01-architecture.md) again.** Most surprises come from misunderstanding the render pipeline.
2. **Reproduce in isolation.** Create a minimal schema with just the failing widget and confirm the bug. If it doesn't reproduce, the bug is in interaction with other widgets — bisect the schema.
3. **Check the React Query DevTools.** Cache state explains most data-flow bugs.
4. **Search the repo for the widget type.** Other modules may have already hit the same issue and solved it.
5. **Ask in `#engineering`** or file under `proposals/` with a `bug:` prefix.

---

**Next:** [13-glossary.md](13-glossary.md) — terms used throughout this reference.
