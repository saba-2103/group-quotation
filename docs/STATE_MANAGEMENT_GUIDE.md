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
