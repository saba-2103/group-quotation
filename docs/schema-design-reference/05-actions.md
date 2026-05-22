# 05 — Actions

This document covers every kind of action a user can trigger from a schema — navigation, mutations, modals, downloads, state updates, and chained workflows.

If a button, link, row, or form submission does anything in the framework, it does it through an `ActionConfig` dispatched via [`useActionHandler`](../../src/hooks/useActionHandler.ts).

---

## The `ActionConfig` shape

```ts
type ActionConfig = BaseActionConfig & (
  | { type: "navigate";              target: string; }
  | { type: "open-modal" | "open-sheet"; target: string; }
  | { type: "api-mutation";          api: { endpoint, method, body? };
                                     successMessage?: string;
                                     confirm?: { title, message };
                                     onSuccess?: ActionConfig[]; }
  | { type: "api-download";          api: { endpoint, method, body? };
                                     filename?: string; }
  | { type: "trigger-event";         target: string; }
  | { type: "update-widget-state";   props: { key, operation: "set"|"patch"|"toggle", value? }; }
);

interface BaseActionConfig {
  id?: string;
  label?: string;
  icon?: string;                    // Lucide icon name
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  display?: "button" | "icon" | "menu-item";
  refreshKey?: string;              // Cache invalidation
  disabledTooltip?: string;         // If set, action always renders disabled
  props?: Record<string, any>;
}
```

Every action has an optional `id`, `label`, `icon`, and `variant`. The `type` field discriminates the union — the rest of the fields vary by type.

---

## `navigate`

Client-side route change via Next.js `router.push`.

```json
{
  "id": "view",
  "label": "View Details",
  "icon": "Eye",
  "type": "navigate",
  "target": "/claims/:id"
}
```

`target` supports `:param` substitution from row data (in row actions) or from form values (in form actions). For a row action on a `data-table`, `:id` is replaced with `rowData[rowIdKey]` (default `rowData.id`).

**Used in:** row actions, header navigation, page-header back buttons, post-submit redirects (via `onSuccess`).

---

## `api-mutation`

The workhorse of write actions. POSTs, PUTs, PATCHes, DELETEs.

```json
{
  "id": "triage",
  "label": "Triage Claim",
  "icon": "GitBranch",
  "type": "api-mutation",
  "api": { "endpoint": "/api/v1/claims/:id/triage", "method": "POST" },
  "successMessage": "Claim triaged",
  "refreshKey": "/api/v1/claims/"
}
```

**What happens on click:**

1. If `confirm` is set → open `ConfirmationDialog` first (see below).
2. Substitute `:param` tokens in `api.endpoint` using `rowData`.
3. `fetch()` the endpoint with `Content-Type: application/json` and `body: JSON.stringify(api.body)` (unless GET).
4. On 2xx response:
   - If `successMessage` is set, show a success toast.
   - Invalidate every query whose key starts with `refreshKey`.
   - If `onSuccess` is set, dispatch each action sequentially.
5. On non-2xx response:
   - Parse the error envelope (`{ message, error, errorCode }`).
   - Show an error toast.

**Used in:** action-bar buttons, form submits (with `submitAction: true`), confirmation dialogs.

### Confirmation dialogs

Add `confirm` to make an action open a confirmation dialog first:

```json
{
  "id": "withdraw",
  "label": "Withdraw Claim",
  "type": "api-mutation",
  "variant": "destructive",
  "confirm": {
    "title": "Withdraw this claim?",
    "message": "Withdrawal cannot be undone. The claim record will be marked WITHDRAWN."
  },
  "api": { "endpoint": "/api/v1/claims/:id/withdraw", "method": "POST" },
  "refreshKey": "/api/v1/claims/"
}
```

On click, instead of firing the mutation, the handler opens `<ConfirmationDialog />` via `useOverlayStore`. The user sees title + message and a confirm button. On confirm, the same action re-dispatches without `confirm` (so it doesn't re-open).

💡 Use `confirm` for any destructive operation (`withdraw`, `repudiate`, `delete`, `cancel`) or any state transition the user might do by accident.

### Chained actions — `onSuccess`

After a mutation completes, dispatch follow-up actions:

```json
{
  "id": "submit",
  "type": "api-mutation",
  "submitAction": true,
  "api": { "endpoint": "/api/v1/claims", "method": "POST" },
  "successMessage": "Claim created",
  "onSuccess": [
    { "type": "trigger-event", "target": "create-claim-form" },
    { "type": "navigate", "target": "/claims" }
  ]
}
```

The chain runs **sequentially** through `useActionHandler.dispatch`. Common patterns:

- Close the modal that contained the form: `{ "type": "trigger-event", "target": "<modal-id>" }`
- Navigate to the new entity: `{ "type": "navigate", "target": "/claims/:id" }` (`:id` is filled from the mutation response)
- Refresh a specific cache: shouldn't usually be needed — `refreshKey` handles this — but `update-widget-state` can patch state if you need to drive a sibling.

⚠️ `onSuccess` is fire-and-forget. If a chain action throws, the user sees an error toast but the rest of the chain continues. Don't put critical "must-happen" logic in `onSuccess` — bake it into the backend response or a follow-up mutation.

### Refresh keys

`refreshKey` is the contract between mutations and queries. It's a prefix string; the handler invalidates every query whose `queryKey[0]` (the endpoint string) starts with `refreshKey`.

| `refreshKey` | What invalidates |
|---|---|
| `"/api/v1/claims"` | List, detail, summary — everything starting with `/api/v1/claims` |
| `"/api/v1/claims/"` | Detail, summary — anything *under* a specific claim id, plus list endpoint that starts with same prefix |
| `"/api/v1/claims/C-001"` | Only that specific claim's queries |

💡 Add a trailing slash when you want to scope to "anything under this resource." Without it, partial-prefix matches can sweep in adjacent endpoints.

---

## `open-modal` / `open-sheet`

Open an overlay. `target` is the overlay's id — usually a form id from the forms registry.

```json
{
  "id": "edit-claim",
  "label": "Edit",
  "icon": "Edit",
  "type": "open-modal",
  "target": "edit-claim-form"
}
```

**What happens on click:**

1. The handler calls `useOverlayStore.open("edit-claim-form", "modal", rowData)`.
2. `OverlayProvider` (mounted globally in `layout.tsx`) renders `<OverlaidForm formId="edit-claim-form" />` inside a `Dialog`.
3. `OverlaidForm` looks up the form schema in `forms_registry` and renders a `form-container` with `rowData` as default field values.

**`open-modal` vs `open-sheet`:** identical except the container — modal is a centred dialog, sheet slides in from the side. Use sheet for longer forms.

See [06-forms.md → Overlaid forms](06-forms.md#overlaid-forms) for the full lifecycle.

---

## `api-download`

Trigger a file download. The browser fetches the endpoint as a blob and offers a Save As.

```json
{
  "id": "export-claims",
  "label": "Export CSV",
  "icon": "Download",
  "type": "api-download",
  "api": { "endpoint": "/api/v1/claims/export?format=csv", "method": "GET" },
  "filename": "claims-2026-05.csv"
}
```

If `filename` is omitted, the browser uses whatever the `Content-Disposition` header suggests.

💡 For client-side exports (CSV/Excel/PDF from a `data-table` without a backend round-trip), use the `data-table`'s built-in `headerActions` export buttons — they call `useTableExport` and produce the file in the browser.

---

## `trigger-event`

Emit a host-level event. Today this primarily means "close an overlay" — `target` is the overlay id.

```json
{
  "id": "cancel",
  "label": "Cancel",
  "type": "trigger-event",
  "target": "edit-claim-form"
}
```

Used inside forms for the Cancel button. Also used by `tabs-container` for save/complete events on workflow tabs.

---

## `update-widget-state`

Mutate the shared `useWidgetState` store directly. Use sparingly — most state changes should flow through a backend mutation, not a UI-only toggle.

```json
{
  "id": "expand-details",
  "label": "Expand",
  "type": "update-widget-state",
  "props": {
    "key": "claim-details-expanded",
    "operation": "toggle"
  }
}
```

**Operations:**
- `set` — replace the value at `key` with `value`.
- `patch` — shallow-merge `value` into the existing object at `key`.
- `toggle` — flip a boolean.

A sibling widget with `layout.visibleWhen: { "var": "claim-details-expanded" }` would react.

⚠️ Don't use this for entity state. If the user clicks "Approve", the resulting state must come from the backend (the API response), not a client-side flip — otherwise the badge says ACTIVE before the database knows about it.

---

## How actions get dispatched

Actions are dispatched through `useActionHandler`. The hook is hooked everywhere a click happens:

- **`data-table` row actions** — `RowActions.tsx` calls `handler.dispatch(action, rowData)` per row.
- **`data-table` header actions** — `DataTable/index.tsx` dispatches with `rowData = undefined`.
- **`form-container` actions** — `useFormContainer` dispatches `submitAction: true` actions with form values as `body`.
- **`action-bar` buttons** — `ActionBar.tsx` dispatches with the live entity as `rowData`.
- **`page-header` actions** — `PageHeader/index.tsx` dispatches with no `rowData`.
- **`quick-links-widget` links** — `QuickLinksWidget.tsx` dispatches per link.
- **`onSuccess` chains** — `useActionHandler` recursively dispatches each chain entry.

In all cases the call site is:

```tsx
const handleAction = useActionHandler();
// later, on click:
handleAction(action, rowData);
```

You don't need to know this if you're writing schemas — but it's helpful when debugging "why isn't this action firing?" The path always ends at `useActionHandler`.

---

## Disabled actions and `disabledTooltip`

To render an action visibly disabled with a hover tooltip explaining why:

```json
{
  "id": "send-for-approval",
  "label": "Send for Approval",
  "type": "api-mutation",
  "api": { ... },
  "disabledTooltip": "Approval workflow not yet enabled on this backend"
}
```

When `disabledTooltip` is set, the action **always renders disabled** with the tooltip on hover. This pattern exists for honest UX — when backend support is missing, the user sees the button exists but understands why it doesn't work, rather than guessing.

Inside `action-bar`, `disabledTooltip` has additional semantics: it interacts with state/role gating. See [02-widget-catalog.md → action-bar](02-widget-catalog.md#action-bar) for the precise rules.

---

## Variants and icons

The `variant` field maps to button styles (from `src/components/ui/variants/`):

| Variant | When to use |
|---------|-------------|
| `default` | Primary action |
| `outline` | Secondary action |
| `secondary` | Tertiary / context action |
| `ghost` | Subtle, no border (often icons) |
| `destructive` | Deletion / repudiation / withdrawal |
| `link` | Looks like a hyperlink |

Icons are [Lucide](https://lucide.dev) names — `"Eye"`, `"Edit"`, `"Trash"`, `"Send"`, `"Download"`, etc. Misspelled icon names render nothing (no error).

---

## A worked example — a full action lifecycle

User is on `/claims/C-001`. They see:

```
┌──────────────────────────────────────────────────┐
│ Claim C-001  [Triaged]    [Triage] [Withdraw]    │
├──────────────────────────────────────────────────┤
│ Claim No: MOT-12345                              │
│ State:    TRIAGED                                │
│ ...                                              │
└──────────────────────────────────────────────────┘
```

The "Triage" button is an `api-mutation`:

```json
{
  "id": "triage",
  "label": "Triage",
  "type": "api-mutation",
  "confirm": { "title": "Triage this claim?", "message": "..." },
  "api": { "endpoint": "/api/v1/claims/:id/triage", "method": "POST" },
  "successMessage": "Claim triaged",
  "refreshKey": "/api/v1/claims/",
  "onSuccess": [{ "type": "navigate", "target": "/claims/:id/assessment" }]
}
```

**The lifecycle:**

1. User clicks **Triage**.
2. `ActionBar` calls `handleAction(triageAction, { id: "C-001", state: "TRIAGED", ... })`.
3. `confirm` set → handler opens `ConfirmationDialog` via `useOverlayStore.open("confirm-triage", "dialog", { action, rowData })`.
4. User clicks Confirm in the dialog.
5. Dialog re-dispatches the action with `confirm: undefined`.
6. Handler reaches `api-mutation` branch:
   - Substitute `:id` → `/api/v1/claims/C-001/triage`
   - `fetch("/api/v1/claims/C-001/triage", { method: "POST", ... })`
7. Backend returns 200 with the updated claim DTO.
8. Handler shows toast: "Claim triaged".
9. Handler invalidates queries with prefix `/api/v1/claims/` — the `key-value-grid` (which fetches `/api/v1/claims/C-001`) and `ActionBar`'s own dataSource (also `/api/v1/claims/C-001`) refetch.
10. Handler iterates `onSuccess`:
    - `navigate` action → substitute `:id` → `router.push("/claims/C-001/assessment")`.

The user lands on the assessment page; the underlying claim entity is now `ASSESSMENT_IN_PROGRESS`, surfaced via the refetched entities.

---

## Common mistakes

1. **Missing `refreshKey`.** Mutation succeeds, toast shows, but the page doesn't reflect the change. Add a `refreshKey` matching the queries that should reload.

2. **`refreshKey` too narrow.** Mutation refreshes the detail view but the list page still shows the old state. Broaden the prefix.

3. **Putting `body` inside an action that doesn't take one.** Only `api-mutation` accepts `api.body`. For form submissions, the form's field values become the body automatically — don't override `api.body` unless you have a reason to ignore the form values.

4. **Confirming everything.** Confirmation dialogs are friction. Reserve them for destructive or irreversible operations.

5. **Using `:id` in a URL that isn't row-scoped.** A header action with `target: "/claims/:id"` has no `rowData` — the `:id` stays as a literal. Use page-level template substitution (`{{id}}`) for header-level URLs.

6. **Chaining mutations in `onSuccess`.** If you need a second mutation after the first, the second should probably be a backend concern (do A and B in one endpoint). Doing it client-side via `onSuccess` works but is fragile — the first succeeds, the second fails, and you have inconsistent state.

7. **Forgetting `successMessage`.** Toasts are the user's only feedback that something happened. Always set `successMessage` on mutations — silence is interpreted as failure.

---

**Next:** [06-forms.md](06-forms.md) — the forms deep dive.
