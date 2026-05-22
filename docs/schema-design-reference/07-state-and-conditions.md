# 07 — State & conditions

This document covers the cross-cutting state model: `useWidgetState`, the role system, and JSONLogic conditions for visibility and polling control.

---

## The state model in one paragraph

The framework has a single, app-wide, in-memory key-value store called `useWidgetState`. Anyone can read, anyone can write. Widgets publish to it via `stateKey`; queries refetch based on it via `stateDependencies`; conditions read it via `{ "var": "key" }`. The role context publishes the current role to a well-known key (`"global:current-role"`). This store does *not* persist across reloads — for cross-session state, use the backend.

---

## `useWidgetState`

[Source](../../src/hooks/useWidgetState.ts) — a zustand store with five operations:

```ts
const { values, setValue, patchValue, getValue, resetKey, resetAll } = useWidgetState();
```

| Method | Purpose |
|--------|---------|
| `values` | The full state object (read-only access) |
| `setValue(key, value)` | Replace the value at `key` |
| `patchValue(key, value)` | Shallow-merge `value` into the object at `key` (replaces if not an object) |
| `getValue(key, default?)` | Read with optional fallback |
| `resetKey(key)` | Delete a key |
| `resetAll()` | Clear everything |

Schema authors don't call these directly — the framework calls them on your behalf when:

- A `filter-bar` widget publishes its filter state.
- A `useSmartQuery` reads `stateDependencies`.
- An `update-widget-state` action fires.
- The `RoleProvider` publishes the current role.

But knowing the API helps you understand where state lives.

---

## Publishing state — `stateKey`

Widgets that produce shared state declare a `stateKey`. The widget writes its state there; sibling widgets subscribe by listing the key in `stateDependencies`.

**Example: filter-bar publishing, data-table subscribing.**

```json
{
  "id": "claims-filters",
  "type": "filter-bar",
  "props": {
    "stateKey": "page:claims:filters",
    "filters": [
      { "id": "state", "type": "select", "options": [...] }
    ]
  }
},
{
  "id": "claims-table",
  "type": "data-table",
  "dataSource": {
    "api": { "endpoint": "/api/v1/claims", "method": "GET" },
    "stateDependencies": ["page:claims:filters"]
  }
}
```

When the user toggles a filter:
1. `filter-bar` calls `setValue("page:claims:filters", { state: "TRIAGED" })`.
2. `useSmartQuery` for `claims-table` sees `page:claims:filters` in its dependency list.
3. The state snapshot becomes part of the React Query key — cache miss → refetch.
4. Before fetching, the runtime injects state into `api.params` (GET) or `api.body` (POST).
5. The server returns filtered results; the table re-renders.

### Naming conventions

Pick a `stateKey` that describes the scope and what's stored:

| Pattern | Use for |
|---------|---------|
| `page:<module>:filters` | Filter state on a list page |
| `entity:<id>:draft` | In-progress edit form values |
| `wizard:<id>:step` | Current step in a multi-step flow |
| `ui:<widgetId>:expanded` | UI-only state (toggles, expansion) |
| `global:<purpose>` | Cross-page state (e.g. `global:current-role`) |

The framework doesn't enforce these — but consistent naming makes "which widget owns this state?" findable.

---

## The role system

Roles are user-permission identifiers — `claims_adjuster`, `claims_supervisor`, etc. The framework treats them as opaque strings; what each role can do is decided per-schema via `roleActions` on an `action-bar`.

### How the role flows

1. **Initial load:** `RoleProvider` ([source](../../src/contexts/RoleContext.tsx)) reads `localStorage.getItem("keystone:current-role")`, validates against the known role list, defaults to `"maker"` if invalid.
2. **Available via hook:** `useRole()` returns `{ role, setRole }`.
3. **Available in state:** The provider publishes the current role to `useWidgetState` under the key `"global:current-role"`. Conditions can read it via `{ "var": "global:current-role" }`.
4. **Switching:** `<RoleSwitcher />` (mounted in `layout.tsx`) calls `setRole`. The new role persists to localStorage and is republished to widget state.

### Role-gating actions

The canonical use is `action-bar.roleActions`:

```json
{
  "type": "action-bar",
  "props": {
    "actions": [
      { "id": "approve", "label": "Approve", "type": "api-mutation", ... }
    ],
    "roleActions": {
      "checker": ["approve"],
      "maker":   []
    }
  }
}
```

When the active role is `maker`, the Approve button is **hidden** (per the action-bar gating rules). When it's `checker`, the button renders.

### Role-gating widgets

⚠️ **Widget-level role gating is a known gap on `main`.** There's no working `layout.visibleWhen` predicate that hides a whole `section-group` based on role. Today, the two options are:

1. **Gate the actions inside the section** via `action-bar.roleActions` — render the section unconditionally, but show no actions for roles that shouldn't act.
2. **Branch in `page.tsx`** — read the role server-side (or via a server action) and render a different schema per role.

For a future-friendly schema-only solution, this is one of the proposed framework changes — see [the proposal flow](../../proposals/).

⚠️ Don't put security-sensitive logic in the frontend role-gate. The backend still has to enforce permissions — the frontend hides UI, the backend rejects requests. **Both layers, always.**

---

## JSONLogic

The framework uses [json-logic-js](https://jsonlogic.com) for declarative predicates. Three places consume it on `main`:

1. `field.visibleWhen` — conditional form field visibility (against form values). Filtered fields are excluded from the submit payload.
2. `rowAction.visible` — per-row visibility on `data-table` row actions (against row data).
3. `dataSource.stopWhen` — early stop for polling (against fetched data).

The wrapper is [`evaluateCondition(condition, contextData)`](../../src/lib/conditions.ts) — returns `true` if `condition` is null/undefined (default-visible), otherwise the JSONLogic result.

⚠️ **`layout.visibleWhen` is NOT implemented on `main`.** Some feature branches add a `visibleWhen` check inside `WidgetRenderer`, but the version on `main` only honours `layout.hidden`. If you write a widget config with `layout.visibleWhen`, the widget always renders. For widget-level conditional rendering today, gate at the schema level (omit the widget) or via `layout.hidden` toggled by a sibling action. The proposed `layout.visibleWhen` is tracked under `proposals/`.

### Basic syntax

A condition is a JSON object where the key is an operator and the value is the operand(s):

```json
{ "==": [{ "var": "policy_type" }, "MOTOR"] }
```

Read aloud: "the value of `policy_type` equals `MOTOR`".

### Operators

| Operator | Example | Meaning |
|----------|---------|---------|
| `==` | `{ "==": [{"var":"x"}, 5] }` | Equal (loose) |
| `===` | `{ "===": [{"var":"x"}, 5] }` | Equal (strict) |
| `!=` | `{ "!=": [{"var":"x"}, 5] }` | Not equal (loose) |
| `<` / `>` / `<=` / `>=` | `{ ">": [{"var":"age"}, 18] }` | Comparison |
| `and` | `{ "and": [<cond1>, <cond2>] }` | All true |
| `or` | `{ "or": [<cond1>, <cond2>] }` | Any true |
| `!` | `{ "!": <cond> }` | Negation |
| `in` | `{ "in": [{"var":"x"}, ["A","B","C"]] }` | Membership in array |
| `var` | `{ "var": "x" }` | Read context value |
| `missing` | `{ "missing": ["x", "y"] }` | List missing keys |
| `if` | `{ "if": [<cond>, <then>, <else>] }` | Conditional value |

For the complete reference see [json-logic.com](https://jsonlogic.com).

### Context — what's available in `{ "var": "..." }`

The available variables depend on where the condition is evaluated:

| Used in | Context contains |
|---------|------------------|
| `field.visibleWhen` | Current form values: `{ "policy_type": "MOTOR", "amount": 5000, ... }` |
| `rowAction.visible` | The row data for the row this action belongs to |
| `dataSource.stopWhen` | The latest fetched data |

### Worked examples

**Show "Vehicle Make" only for motor claims:**
```json
{ "visibleWhen": { "==": [{ "var": "loss_type" }, "MOTOR"] } }
```

**Hide a "Delete" row action when the row is already archived:**
```json
{
  "id": "delete",
  "label": "Delete",
  "type": "api-mutation",
  "visible": { "!=": [{ "var": "status" }, "ARCHIVED"] }
}
```

**Show approval row action only when amount exceeds threshold:**
```json
{
  "id": "approve",
  "label": "Approve",
  "visible": { ">": [{ "var": "amount" }, 100000] },
  "type": "api-mutation"
}
```

**Stop polling when the quote has a premium:**
```json
{ "stopWhen": { "!=": [{ "var": "premium" }, null] } }
```

**Stop polling when state reaches a terminal value:**
```json
{ "stopWhen": { "in": [{ "var": "state" }, ["ACTIVE", "FAILED", "CANCELLED"]] } }
```

### Role-gating without `layout.visibleWhen`

Since widget-level `visibleWhen` is not implemented on `main`, role-gating happens through `action-bar.roleActions` for action buttons (see [02-widget-catalog.md → action-bar](02-widget-catalog.md#action-bar)). For role-specific sections (e.g. "SIU only"), the canonical approach today is either:
- Render the section unconditionally and gate the actions inside it via `roleActions`, or
- Branch in the page-level `page.tsx` based on a server-side role read.

### Debugging conditions

If a condition isn't behaving:

1. **Drop a `console.log` in `evaluateCondition`** temporarily — log the `condition` and `contextData` it receives. Most "why isn't this firing" issues are wrong context (variable not in scope).
2. **Test the condition in isolation** at [jsonlogic.com](https://jsonlogic.com/play.html) — paste the condition and a mock context.
3. **Check string vs number types.** `{ "==": [{"var":"x"}, "5"] }` doesn't match if `x` is `5` (number) — use `===` carefully, or normalise.

---

## When NOT to use shared state

Putting state in `useWidgetState` is the wrong tool when:

- **The state is local to one widget.** A form's field values, a modal's open/close — these live in the widget's own hooks. Don't pollute the global store.
- **The state changes more often than ~10× per second.** It's React-rendered on every change. Don't use it for animations or drag positions.
- **The state needs to persist across reloads.** Use the backend, or `localStorage` directly. The store is in-memory.

Use it when:

- Two widgets need to share data without going through the backend (filter-bar → data-table).
- A condition needs to know about role or current state.
- An overlay needs context (rowData) from where it was opened.

---

## State + conditions together — the canonical pattern

**Setup:** A quote detail page where a "Send to SIU" button is only available for `siu_officer` role *and* when the quote is in `TRIAGED` state.

```json
{
  "id": "quote-actions",
  "type": "action-bar",
  "dataSource": { "api": { "endpoint": "/api/quotes/:id", "method": "GET" } },
  "props": {
    "stateField": "state",
    "stateActions": {
      "TRIAGED": ["send-to-siu", "start-assessment"]
    },
    "roleActions": {
      "siu_officer":     ["send-to-siu"],
      "claims_adjuster": ["start-assessment"]
    },
    "actions": [ ... ]
  }
}
```

The action-bar combines state-gating (state → allowed actions) with role-gating (role → allowed actions); only actions in both sets render. There's no separate "visible only in state X" section widget on `main` today — if you need section-level state gating, the conventional answer is to embed it as a tab (so the tab itself is always present but its content is empty / shows a hint when the state doesn't apply).

---

## Common mistakes

1. **Forgetting role lives under `"global:current-role"`, with the colon.** Type it exactly. A typo silently makes the condition fail (variable not found = undefined = falsy).

2. **Expecting `layout.visibleWhen` to work.** It's documented in some feature branches and proposals but is **not** implemented in `WidgetRenderer` on `main`. Use `field.visibleWhen` (forms), `rowAction.visible` (table rows), or `action-bar.roleActions`/`stateActions` (action buttons). Section-level conditional rendering is a known gap.

3. **Conditions referencing variables not in scope.** `field.visibleWhen` only sees form values; `rowAction.visible` only sees row data. There's no way to reach a sibling widget's data from inside a JSONLogic predicate.

4. **State stored in widget-local React state instead of `useWidgetState`.** If two widgets need to coordinate, the state must be shared. Don't try to wire callbacks between schemas — there's no API for that.

5. **Long-lived state with no cleanup.** Filter state, draft form values, modal payloads — these accumulate. If you set state on a list page and the user navigates away, the state persists until reload. For most cases this is fine (cheap memory); for sensitive data, call `resetKey` on unmount via the appropriate hook.

6. **Conflating role with permission.** Roles in the framework are UI hints — they decide *which buttons render*. They are not authorization. Backend enforcement is mandatory.

---

**Next:** [08-pages-and-routing.md](08-pages-and-routing.md) — Next.js wiring, schema resolution, template substitution.
