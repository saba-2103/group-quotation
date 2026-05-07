# State Management Guide: Schema-Driven UI

This document provides a deep dive into the architecture, implementation, and capabilities of the **Schema-Driven State Management** system in the Keystone UI platform.

---

## 1. Core Philosophy: UI State vs. Server State

To ensure maintainability, scalability, and predictable performance, we strictly distinguish between two types of state. Mixing these is a common source of bugs in complex UIs.

### A. Server State (Managed by TanStack Query)
Represents data that lives on the server.
- **Examples**: List of quotations, user profile data, search results, lookup tables.
- **Characteristics**: Asynchronous fetching, caching, revalidation, and background synchronization.
- **Ownership**: The `useSmartQuery` hook handles the lifecycle of this data.

### B. UI State (Managed by Zustand via `useWidgetState`)
Represents the ephemeral, interactive state of the interface.
- **Examples**: Search input text, active filter values, selected tab index, expanded accordion sections, form field values.
- **Characteristics**: Synchronous updates, shared across disconnected components, cleared on page refresh (or scoped to page lifecycle).
- **Ownership**: The `useWidgetState` store is the single source of truth for all interactive state.

---

## 2. Technical Implementation

The system is built on a "triumvirate" of core hooks that work together to create a reactive loop.

### 1. `useWidgetState` (The Store)
A lightweight Zustand store that provides a global, namespaced key-value repository.
- **`setValue(key, val)`**: Overwrites a specific key.
- **`patchValue(key, obj)`**: Deep merges a partial object into an existing state (critical for maintaining multiple filters).
- **`getValue(key)`**: Retrieves the current value of a key.

### 2. `useActionHandler` (The Mutator)
User interactions (clicks, changes) trigger **Actions**. The `update-widget-state` action is the primary interface for modifying the store.
- **Decoupling**: The UI component doesn't need to know how the state is stored; it simply "dispatches" an action.

### 3. `useSmartQuery` (The Reactor)
Data-fetching widgets subscribe to state keys via the `stateDependencies` property.
- **Reactivity**: When a dependent key in the `useWidgetState` store changes, `useSmartQuery` automatically recalculates its `queryKey` and triggers a re-fetch.
- **Injection**: It automatically maps current state values into API query parameters.

---

## 3. Simple Connectivity: The Basic Loop

### Example: Search and Filter Results
In this example, a `FilterBar` (Widget A) updates a search string, and a `DataTable` (Widget B) reacts to it.

#### Widget A: Search Input (Updates State)
```json
{
  "id": "global-search",
  "type": "filter-bar",
  "props": {
    "stateKey": "page:search:query",
    "placeholder": "Refine list..."
  }
}
```
**Explanation**: 
- `stateKey`: Tells the widget to store its internal value under the key `page:search:query` in the global store.
- **Impact**: Any keystroke in the input immediately updates the shared store.

#### Widget B: Data Table (Reacts to State)
```json
{
  "id": "quotations-list",
  "type": "data-table",
  "dataSource": {
    "api": { "endpoint": "/api/quotations", "method": "GET" },
    "stateDependencies": ["page:search:query"]
  }
}
```
**Explanation**:
- `stateDependencies`: Explicitly tells the data-fetching engine to "watch" the `page:search:query` key.
- **Impact**: When the user types in the search bar, the UI state changes $\rightarrow$ `useSmartQuery` detects the dependency change $\rightarrow$ the API is called with `?q=...` automatically.

---

## 4. Complex Functionality: Dynamic Logic & Validations

The power of this system is most visible when handling complex form logic and cross-widget dependencies without writing custom React code.

### A. Conditional Field Visibility
What if Field B should only appear if Field A has a specific value?

#### Schema Snippet:
```json
[
  {
    "id": "is-smoker",
    "type": "checkbox",
    "props": {
      "label": "Do you smoke?",
      "onChangeAction": {
        "type": "update-widget-state",
        "props": { 
          "key": "form:smoker:status", 
          "operation": "set" 
        }
      }
    }
  },
  {
    "id": "cigarettes-per-day",
    "layout": {
      "stateDependencies": ["form:smoker:status"]
    },
    "props": {
      "label": "How many per day?",
      "hiddenExpression": "values['form:smoker:status'] !== true" 
    }
  }
]
```
**Implications**: 
- **No Hardcoding**: The "Cigarettes" field is entirely generic. Its visibility rules are metadata, not code.
- **Declarative Power**: You can build an entire multi-step wizard where step visibility is driven by state keys updated in previous steps.

### B. Dynamic Validations
Imagine an "Applied Amount" field that cannot exceed the "Quote Limit" fetched from the server.

#### Schema Snippet:
```json
{
  "id": "applied-amount",
  "type": "number",
  "dataSource": {
    "stateDependencies": ["quotation:current:limit"]
  },
  "props": {
    "validation": {
      "max": "{{state['quotation:current:limit']}}",
      "message": "Amount cannot exceed the limit of {{state['quotation:current:limit']}}"
    }
  }
}
```
**Implications**: 
- **Context-Aware Forms**: Validations aren't static. They adapt to the "Server State" that was previously hydrated into the "UI State".

---

## 5. Persistence & Hydration: The Bridge

The interface where UI State meets Server State is the most critical part of the system.

### A. Hydration (Server $\rightarrow$ UI State)
How do we get existing data into the interactive components?
1. **`defaultValue`**: Static pre-filling from the JSON schema.
2. **`valueKey`**: A parent widget (like a layout container) fetches data and passes it down. The child "saps" this data into its own UI state using a `valueKey` mapping.
3. **`init-widget-state` Action**: A special action that can be defined in a page's `onLoad` lifecycle to fetch user preferences and populate the store before rendering.

### B. Persistence (UI State $\rightarrow$ Server)
How do we save user choices?
1. **Query Params**: `useSmartQuery` automatically injects dependencies into GET params (useful for search/filters).
2. **Explicit Submission**: A "Save" button triggers an `api-mutation` action. The schema defines exactly which state keys should be mapped into the POST body.
```json
{
  "type": "api-mutation",
  "props": {
    "endpoint": "/api/save-quotation",
    "mapping": {
      "status": "page:filters:status",
      "requestedBy": "global:user:id"
    }
  }
}
```

---

## 6. What This Architecture Enables

1. **Pixel-Perfect Parity with Zero Code**: Designers can adjust filtering logic or form dependencies just by editing JSON, without waiting for front-end development cycles.
2. **Platform Reusability**: The same `DataTable` widget can be used for Quotations, Claims, and Users. Only the `stateDependencies` and API endpoints change in the schema.
3. **Complex Cross-Widget Orchestration**: A header widget can influence a sidebar widget, which in turn influences a main content widget—all without complex Prop Drilling or Context Providers.
4. **Improved Debugging**: Since all state is centralized in one store, you can "replay" user interactions or inspect the entire UI state at any point in time.

---

## 7. Best Practices

- **Namespace Religiously**: Use `page:slug:key` for local state and `global:key` for shared cross-page state.
- **Avoid Over-Subscription**: Only add keys to `stateDependencies` that actually change the output of the widget.
- **Snapshot State**: When persisting large forms, use the `set` operation on a dedicated object (e.g., `form:quotation:edit`) rather than updating individual top-level keys.

---

## 8. Patterns the schema-driven engine supports verbosely (V1)

The current widget engine doesn't natively express a couple of patterns the Group PAS V1 plan needs. They work today via composition + `useWidgetState` + jsonLogic conditions, with a verbosity tax. A future widget-engine pass (or `frontendProjection` arch) would make them implicit. Until then, follow the patterns below consistently so every screen reads the same way.

### 8.1 Polling until an async backend computation completes

**Use case:** "Request price" on a Quote, "classify member" on a PolicyMember, "activate policy" — backend kicks off a workflow that populates fields asynchronously. Frontend should keep refetching until the result lands.

**Backend-suggested cadence:** poll fast at first, then back off, then give up. `2s for the first 10s, then 5s up to 60s` is the default for any V1 polling consumer. This is exported as `STANDARD_POLL_SCHEDULE` from [`src/lib/polling.ts`](../src/lib/polling.ts) — use that constant rather than hardcoding the numbers per widget.

**Engine support:** `useSmartQuery` accepts the following on `DataSourceConfig`:

- `pollSchedule: { initialIntervalMs, initialDurationMs, fallbackIntervalMs, maxDurationMs? }` — backoff schedule.
- `refreshInterval: number` — fixed-cadence alternative; ignored if `pollSchedule` is also set.
- `stopWhen: jsonLogicCondition` — halts polling early when the latest response satisfies the condition.

When `stopWhen` evaluates truthy against the latest response, polling stops. When `pollSchedule.maxDurationMs` elapses without `stopWhen` firing, polling also stops (hard cap). The next time the component remounts, the schedule restarts fresh.

**Schema example — Pricing tab on Quote detail:**

```json
{
  "id": "quote-pricing",
  "type": "stack-layout",
  "dataSource": {
    "api": {
      "endpoint": "/api/quotation/quotes/{{id}}",
      "method": "GET"
    },
    "pollSchedule": {
      "initialIntervalMs": 2000,
      "initialDurationMs": 10000,
      "fallbackIntervalMs": 5000,
      "maxDurationMs": 60000
    },
    "stopWhen": { "!=": [{ "var": "premium" }, null] }
  },
  "children": [ /* premium summary card consumes the data */ ]
}
```

In code, prefer reading from the constant:

```ts
import { STANDARD_POLL_SCHEDULE } from "@/lib/polling";

const dataSource = {
  api: { endpoint: `/api/quotation/quotes/${id}`, method: "GET" },
  pollSchedule: STANDARD_POLL_SCHEDULE,
  stopWhen: { "!=": [{ var: "premium" }, null] },
};
```

**UI hint during the slow phase:** once elapsed time crosses `initialDurationMs` (10s), surface a "still working…" banner so users understand the action is in flight. Component-owned: read elapsed time off a local timer, or check whether the query has had ≥1 fetch with `data.<resultField>` still null.

### 8.2 State-driven detail page (sibling widgets gated by entity state)

**Use case:** PolicyMember detail renders **different sibling widgets** depending on the member's lifecycle state — read-only banner during `CREATED`/`MAF_PENDING`/`CLASSIFYING`, an editable form during `REPAIR_PENDING`, an action bar during `APPROVED`, terminal copy during `ADDED`/`REJECTED`. Same route, same fetch, different sub-views.

**Pattern:**

1. **Parent widget** fetches the entity once via `useSmartQuery`.
2. **Parent publishes** the field that drives gating (e.g. `state`) to `useWidgetState` under a known key — typically via a small wrapper widget that reads from its own dataSource and writes to widget state on data change. Convention: `page:<slug>:entity-state` (e.g. `page:policy-member-detail:state`).
3. **Each sibling sub-view** declares `stateDependencies: ["page:policy-member-detail:state"]` so it re-evaluates when the parent re-fetches, and uses `visibleWhen` jsonLogic against that key to render itself only in the right state.

**Schema example — PolicyMember detail (abridged):**

```json
{
  "id": "policy-member-detail",
  "type": "stack-layout",
  "children": [
    {
      "id": "fetch-and-publish",
      "type": "state-publisher",
      "props": { "writeKey": "page:policy-member-detail:state", "valuePath": "state" },
      "dataSource": { "api": { "endpoint": "/api/issuance/policy-members/{{id}}", "method": "GET" } }
    },
    {
      "id": "in-progress-banner",
      "type": "page-header",
      "props": { "title": "Member processing — please wait" },
      "stateDependencies": ["page:policy-member-detail:state"],
      "layout": { "hidden": false },
      "visibleWhen": {
        "in": [
          { "var": "page:policy-member-detail:state" },
          ["CREATED", "MAF_PENDING", "CLASSIFYING"]
        ]
      }
    },
    {
      "id": "repair-edit-form",
      "type": "form-container",
      "stateDependencies": ["page:policy-member-detail:state"],
      "visibleWhen": {
        "==": [{ "var": "page:policy-member-detail:state" }, "REPAIR_PENDING"]
      },
      "props": { /* edit form schema */ }
    },
    {
      "id": "approved-actions",
      "type": "action-bar",
      "stateDependencies": ["page:policy-member-detail:state"],
      "visibleWhen": {
        "==": [{ "var": "page:policy-member-detail:state" }, "APPROVED"]
      },
      "props": { /* sendForIssuance action */ }
    }
  ]
}
```

**Note:** the `state-publisher` widget shown here is a tiny convenience — it reads `dataSource` and writes one field to `useWidgetState`. If a `state-publisher` doesn't already exist in the registry, build it as part of the first task that needs it (PolicyMember detail) and reuse it.

**Verbosity cost:** every state-driven detail screen repeats the publish-then-gate pattern. Acceptable for V1 (3–4 screens). A future cleanup is a `state-conditional-section` widget that takes `cases: Record<State, WidgetConfig>` and routes internally.

### 8.3 Form fields disabled by parent entity state or current role

**Use case:** Quote Key Data tab is editable only when `status === 'DRAFT'` AND `role === 'maker'`. Otherwise read-only. Same for the repair edit form, plan editing, etc.

**Engine support today:** field-level `disabled` works for form-state-driven disable, but not for "disable based on parent entity state or current role". V1 uses two sibling widgets and switches via `visibleWhen`:

1. An **editable** `form-container` wrapped in `visibleWhen: <editable condition>`.
2. A **read-only** `key-value-grid` wrapped in `visibleWhen: <not editable>`.

Both consume the same fetched entity data, but only one renders at a time.

**Schema example — Quote Key Data tab:**

```json
{
  "id": "quote-key-data",
  "type": "stack-layout",
  "children": [
    {
      "id": "key-data-edit",
      "type": "form-container",
      "stateDependencies": [
        "page:quote-detail:state",
        "page:quote-detail:awaitingApproval",
        "global:current-role"
      ],
      "visibleWhen": {
        "and": [
          { "==": [{ "var": "page:quote-detail:state" }, "DRAFT"] },
          { "==": [{ "var": "page:quote-detail:awaitingApproval" }, false] },
          { "==": [{ "var": "global:current-role" }, "maker"] }
        ]
      },
      "props": { /* editable form */ }
    },
    {
      "id": "key-data-readonly",
      "type": "key-value-grid",
      "stateDependencies": [
        "page:quote-detail:state",
        "page:quote-detail:awaitingApproval",
        "global:current-role"
      ],
      "visibleWhen": {
        "or": [
          { "!=": [{ "var": "page:quote-detail:state" }, "DRAFT"] },
          { "==": [{ "var": "page:quote-detail:awaitingApproval" }, true] },
          { "!=": [{ "var": "global:current-role" }, "maker"] }
        ]
      },
      "props": { /* read-only grid */ }
    }
  ]
}
```

**Why two siblings instead of a single form with `disabledWhen`:** the engine doesn't yet thread parent-context (state, role) into form fields' disable evaluation. Adding a `disabledWhen` field config + a context plumbing change in `WidgetRenderer` is a future ~50 LOC simplification — see [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Form-level disable via dual sibling widgets".

### 8.4 Role context as a global state key

**Convention:** the `RoleContext` provider (Task 1.9) writes the current role to `useWidgetState` under `global:current-role` whenever it changes. This makes role available to any schema via `stateDependencies` + `visibleWhen` without each widget having to consume the React context directly. Keep this convention so role-gated visibility uses the same plumbing as state-driven visibility.
