# Layer 6a — State Management

**Keystone UI Architecture | Browser-Based, No BFF**

Parent: [06 — Client Runtime](./06-CLIENT-RUNTIME.md)

This document is the authoritative reference for the three state stores used in Layer 6: React Query (server state), Zustand (interaction state), and React Context / AppContext (identity state). It covers configuration, TypeScript interfaces, key conventions, mutation patterns, and how the three stores interact.

---

## Table of Contents

1. [React Query — Server State](#react-query--server-state)
2. [Zustand — Interaction State](#zustand--interaction-state)
3. [AppContext — Identity State](#appcontext--identity-state)
4. [Cross-Store Interaction Patterns](#cross-store-interaction-patterns)

---

## React Query — Server State

React Query is the exclusive owner of all data fetched from APIs. No API response is stored in Zustand or Context.

### QueryClient Setup

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes — data is fresh for 5 min, no refetch
      gcTime: 10 * 60 * 1000,     // 10 minutes — unused cache entries survive 10 min
      retry: 2,                    // retry failed requests twice before erroring
      refetchOnWindowFocus: true,  // refetch when user returns to tab
      refetchOnReconnect: true,    // refetch after network reconnect
    },
    mutations: {
      retry: 0,                    // mutations do not retry by default — explicit is safer
    },
  },
});
```

Workbench pages override `staleTime: 0` at the hook call site (never the QueryClient default) to force a fresh snapshot on every focus. Standard pages use the default.

### QueryClient Provider

```typescript
// src/main.tsx  (or App.tsx)

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        {/* rest of the app */}
      </AppContextProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

ReactQueryDevtools are injected only in `DEV` mode. They are never bundled in production builds.

### Query Key Conventions

All query keys follow the `[entity, filters]` pattern. The entity is a string constant from `src/constants/queryKeys.ts`. Filters is a plain object — React Query deep-compares it.

```typescript
// src/constants/queryKeys.ts

export const QueryKeys = {
  QUOTATIONS:       'quotations',
  POLICIES:         'policies',
  CLAIMS:           'claims',
  TASKS:            'tasks',
  MEMBERS:          'members',
  ENDORSEMENTS:     'endorsements',
  DOCUMENTS:        'documents',
  AUDIT_LOG:        'auditLog',
  WORKFLOW:         'workflow',
  WORKBENCH:        'workbench',
  VIEW_METADATA:    'viewMetadata',
} as const;

export type QueryKey = typeof QueryKeys[keyof typeof QueryKeys];
```

```typescript
// Examples of well-formed query keys

// List query — entity + filters object
['quotations', { status: 'pending', page: 1, tenantId: 'ACME' }]

// Detail query — entity + id
['quotations', { id: 'QT-2024-0042' }]

// Nested resource — entity + parent id + child entity
['quotations', { id: 'QT-2024-0042' }, 'endorsements']

// Workbench bootstrap — specific domain + entityId
['workbench', { domain: 'quotation', entityId: 'QT-2024-0042' }]

// View metadata — viewId from route
['viewMetadata', { viewId: 'quotation-cockpit' }]
```

**Rules:**
- Never use bare strings as full keys: `['quotations']` is too broad and causes over-invalidation.
- Always include `tenantId` in multi-tenant queries — even if the API endpoint already scopes by JWT, including it in the key prevents cross-tenant cache collisions.
- Never include runtime timestamps or random IDs in keys — this defeats caching.

### useSmartQuery

The standard data-fetching hook. Wraps `useQuery` with the key convention and default options applied.

```typescript
// src/hooks/useSmartQuery.ts

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAppContext } from './useAppContext';

interface SmartQueryOptions<TData> {
  entity: string;
  filters?: Record<string, unknown>;
  endpoint: string;
  queryOptions?: Partial<UseQueryOptions<TData>>;
}

export function useSmartQuery<TData>({
  entity,
  filters = {},
  endpoint,
  queryOptions = {},
}: SmartQueryOptions<TData>) {
  const { tenantId } = useAppContext();

  // tenantId is always part of the key — prevents cross-tenant cache collisions
  const queryKey = [entity, { ...filters, tenantId }];

  return useQuery<TData>({
    queryKey,
    queryFn: () => apiClient.get<TData>(endpoint, { params: filters }),
    ...queryOptions,
  });
}
```

Usage in a widget:

```typescript
const { data: quotations, isLoading, error } = useSmartQuery<QuotationListResponse>({
  entity: QueryKeys.QUOTATIONS,
  filters: { status: activeFilters.status, page: pagination.page },
  endpoint: '/v1/quotations',
});
```

### Mutation Invalidation Patterns

After a mutation succeeds, invalidate the affected query key families. Use `queryClient.invalidateQueries` — do not manually update the cache unless you have a specific reason (optimistic updates for single-item edits).

```typescript
// src/hooks/mutations/useSubmitQuote.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { QueryKeys } from '../../constants/queryKeys';

export function useSubmitQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) =>
      apiClient.post(`/v1/quotations/${quoteId}/submit`),

    onSuccess: (_, quoteId) => {
      // Invalidate the specific quote detail
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.QUOTATIONS, { id: quoteId }],
      });

      // Invalidate the list (status has changed, list must refetch)
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.QUOTATIONS],
        exact: false,   // matches all keys starting with 'quotations'
      });

      // Invalidate the workbench bootstrap for this entity —
      // workflow stage has advanced
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.WORKBENCH, { domain: 'quotation', entityId: quoteId }],
      });
    },

    onError: (error) => {
      // Log to error reporting — do not swallow
      console.error('[useSubmitQuote] mutation failed', error);
    },
  });
}
```

**Invalidation rules:**

| Mutation | Queries to invalidate |
|---|---|
| Submit / status transition | Entity detail + entity list + workbench bootstrap |
| Field edit (PATCH) | Entity detail only (list entries rarely depend on field-level data) |
| Upload document | `documents` key for this entity |
| Approve/reject workflow action | Entity detail + workbench bootstrap + tasks list |
| Endorse policy | Policy detail + endorsements + workbench bootstrap |

### Reading Server State in Conditions

`WidgetCondition` with `type: "serverState"` calls `queryClient.getQueryData()` synchronously during condition evaluation. This reads from the in-memory cache — it does not trigger a network request.

```typescript
// Inside the WidgetCondition evaluator (src/runtime/conditionEvaluator.ts)

import { queryClient } from '../lib/queryClient';
import { get } from 'lodash-es';

function evaluateServerStateCondition(condition: ServerStateCondition): boolean {
  const cached = queryClient.getQueryData(condition.queryKey);
  if (cached === undefined) {
    // Data not in cache yet — treat as condition not met (widget stays hidden until data loads)
    return false;
  }
  const value = get(cached, condition.path);
  return applyOperator(value, condition.operator, condition.value);
}
```

If the cache entry does not exist, the condition returns `false` (widget hidden). This is the safe default — it prevents widgets from briefly rendering with incorrect data while the cache warms up.

---

## Zustand — Interaction State

Zustand manages all transient, synchronous UI state that does not come from an API. Selection state, search text, open/closed panels, active filters, loading indicators for non-query operations.

### Store Structure and TypeScript Interface

```typescript
// src/stores/types.ts

// --- Table slice ---
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface TableState {
  selectedRows: string[];         // selected row IDs
  sortState: SortState | null;
  pagination: PaginationState;
}

export interface TableActions {
  setSelectedRows: (ids: string[]) => void;
  toggleRowSelection: (id: string) => void;
  clearSelection: () => void;
  setSortState: (sort: SortState | null) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  resetTableState: () => void;
}

// --- Filter slice ---
export type FilterValue = string | string[] | number | boolean | null;

export interface FilterState {
  activeFilters: Record<string, FilterValue>;
  searchText: string;
  isDirty: boolean;   // true when filters differ from the last applied set
}

export interface FilterActions {
  setFilter: (key: string, value: FilterValue) => void;
  setSearchText: (text: string) => void;
  applyFilters: () => void;        // marks isDirty = false, triggers query refetch
  resetFilters: () => void;
}

// --- UI slice ---
export interface UIState {
  openPanels: Record<string, boolean>;    // panelId → open
  openModals: Record<string, boolean>;    // modalId → open
  loadingStates: Record<string, boolean>; // operationId → loading
}

export interface UIActions {
  openPanel: (panelId: string) => void;
  closePanel: (panelId: string) => void;
  togglePanel: (panelId: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  setLoading: (operationId: string, loading: boolean) => void;
}

// --- Combined store ---
export interface PageStore extends TableState, TableActions, FilterState, FilterActions, UIState, UIActions {}
```

### Store Factory Pattern

Keystone UI does **not** use a single global Zustand store. Each page (or major page section) creates its own store instance via a factory. This prevents state from bleeding between navigations and makes store resets trivial.

```typescript
// src/stores/createPageStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { PageStore, TableState, FilterState, UIState } from './types';

const initialTableState: TableState = {
  selectedRows: [],
  sortState: null,
  pagination: { page: 1, pageSize: 20 },
};

const initialFilterState: FilterState = {
  activeFilters: {},
  searchText: '',
  isDirty: false,
};

const initialUIState: UIState = {
  openPanels: {},
  openModals: {},
  loadingStates: {},
};

export function createPageStore(storeName: string) {
  return create<PageStore>()(
    devtools(
      (set, get) => ({
        // --- Table state ---
        ...initialTableState,

        setSelectedRows: (ids) => set({ selectedRows: ids }, false, 'setSelectedRows'),

        toggleRowSelection: (id) =>
          set(
            (state) => ({
              selectedRows: state.selectedRows.includes(id)
                ? state.selectedRows.filter((r) => r !== id)
                : [...state.selectedRows, id],
            }),
            false,
            'toggleRowSelection',
          ),

        clearSelection: () => set({ selectedRows: [] }, false, 'clearSelection'),

        setSortState: (sort) => set({ sortState: sort }, false, 'setSortState'),

        setPagination: (pagination) =>
          set(
            (state) => ({ pagination: { ...state.pagination, ...pagination } }),
            false,
            'setPagination',
          ),

        resetTableState: () => set(initialTableState, false, 'resetTableState'),

        // --- Filter state ---
        ...initialFilterState,

        setFilter: (key, value) =>
          set(
            (state) => ({
              activeFilters: { ...state.activeFilters, [key]: value },
              isDirty: true,
            }),
            false,
            'setFilter',
          ),

        setSearchText: (text) =>
          set({ searchText: text, isDirty: true }, false, 'setSearchText'),

        applyFilters: () =>
          set({ isDirty: false }, false, 'applyFilters'),

        resetFilters: () =>
          set({ ...initialFilterState }, false, 'resetFilters'),

        // --- UI state ---
        ...initialUIState,

        openPanel: (panelId) =>
          set(
            (state) => ({ openPanels: { ...state.openPanels, [panelId]: true } }),
            false,
            'openPanel',
          ),

        closePanel: (panelId) =>
          set(
            (state) => ({ openPanels: { ...state.openPanels, [panelId]: false } }),
            false,
            'closePanel',
          ),

        togglePanel: (panelId) =>
          set(
            (state) => ({
              openPanels: { ...state.openPanels, [panelId]: !state.openPanels[panelId] },
            }),
            false,
            'togglePanel',
          ),

        openModal: (modalId) =>
          set(
            (state) => ({ openModals: { ...state.openModals, [modalId]: true } }),
            false,
            'openModal',
          ),

        closeModal: (modalId) =>
          set(
            (state) => ({ openModals: { ...state.openModals, [modalId]: false } }),
            false,
            'closeModal',
          ),

        setLoading: (operationId, loading) =>
          set(
            (state) => ({
              loadingStates: { ...state.loadingStates, [operationId]: loading },
            }),
            false,
            'setLoading',
          ),
      }),
      { name: storeName },
    ),
  );
}
```

### Using the Store Factory in a Page

```typescript
// src/pages/QuotationQueue/store.ts

import { createPageStore } from '../../stores/createPageStore';

// Store is created at module level — stable reference, not recreated on re-render
export const useQuotationQueueStore = createPageStore('quotation-queue');
```

```typescript
// In a component inside the page

import { useQuotationQueueStore } from './store';

function QuotationTable() {
  // Granular subscriptions — component only re-renders when selectedRows changes
  const selectedRows = useQuotationQueueStore((s) => s.selectedRows);
  const clearSelection = useQuotationQueueStore((s) => s.clearSelection);

  // ...
}
```

### Selectors and Subscription Patterns

Always subscribe to specific slices of the store using selector functions. Subscribing to the entire store causes every component to re-render on any state change.

```typescript
// CORRECT — subscribes only to what this component needs
const selectedRowCount = useQuotationQueueStore((s) => s.selectedRows.length);
const isDetailPanelOpen = useQuotationQueueStore((s) => s.openPanels['detailPanel'] ?? false);

// INCORRECT — subscribes to the whole store
const store = useQuotationQueueStore();
```

For derived values that combine multiple state fields, use a selector:

```typescript
// Selector defined outside the component (stable reference)
const selectHasActiveFilters = (s: PageStore) =>
  Object.values(s.activeFilters).some((v) => v !== null && v !== '') || s.searchText !== '';

function FilterIndicator() {
  const hasActiveFilters = useQuotationQueueStore(selectHasActiveFilters);
  return hasActiveFilters ? <ActiveFilterBadge /> : null;
}
```

---

## AppContext — Identity State

AppContext holds the current user's identity, extracted from the JWT on login. It is immutable for the lifetime of the session. If a user's role changes (e.g., they are elevated to a manager), they must re-authenticate to pick up the new claims.

### TypeScript Interface

```typescript
// src/context/AppContext.types.ts

export type UserRole =
  | 'underwriter'
  | 'underwriting_manager'
  | 'claims_handler'
  | 'claims_manager'
  | 'broker'
  | 'policyholder'
  | 'finance_ops'
  | 'compliance_officer'
  | 'system_admin';

export type LineOfBusiness = 'motor' | 'property' | 'health' | 'life' | 'liability' | 'marine';

export type PortalType = 'internal' | 'broker' | 'employer' | 'policyholder';

export interface AppContextValue {
  // Identity
  userId: string;
  tenantId: string;
  role: UserRole;
  lob: LineOfBusiness | null;      // null for roles that span all LOBs (e.g. system_admin)
  locale: string;                  // BCP 47 tag, e.g. 'en-GB', 'hi-IN'
  portalType: PortalType;

  // Permissions — coarse-grained, from JWT claims
  // Fine-grained permissions are resolved at API level; these drive UI visibility only
  permissions: string[];           // e.g. ['quote:create', 'claim:approve', 'report:view']
}
```

### Provider Setup

```typescript
// src/context/AppContext.tsx

import React, { createContext, useContext, useMemo } from 'react';
import { parseJwt } from '../lib/auth/parseJwt';
import { AppContextValue } from './AppContext.types';

const AppContext = createContext<AppContextValue | null>(null);

interface AppContextProviderProps {
  children: React.ReactNode;
  token: string;   // JWT, passed from the auth layer after login
}

export function AppContextProvider({ children, token }: AppContextProviderProps) {
  // Parse the JWT once. The token does not change during a session.
  const value = useMemo<AppContextValue>(() => {
    const claims = parseJwt(token);
    return {
      userId:      claims.sub,
      tenantId:    claims['ks:tenantId'],
      role:        claims['ks:role'],
      lob:         claims['ks:lob'] ?? null,
      locale:      claims['ks:locale'] ?? 'en-GB',
      portalType:  claims['ks:portalType'] ?? 'internal',
      permissions: claims['ks:permissions'] ?? [],
    };
  }, [token]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

The `useMemo` dependency on `token` means: if the token string changes (e.g., after a re-login or token refresh), the context value updates. Token refresh that does not change the user's claims is handled by the auth library without changing the token string seen by AppContext.

### useAppContext Hook

```typescript
// src/hooks/useAppContext.ts

import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AppContextValue } from '../context/AppContext.types';

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error(
      'useAppContext must be called inside <AppContextProvider>. ' +
      'Ensure AppContextProvider wraps the component tree at the app root.'
    );
  }
  return ctx;
}
```

### Key Rules for AppContext

1. **Never mutate AppContext during a session.** No `setState` equivalent exists. If identity changes, the user re-authenticates and the provider re-mounts with the new token.
2. **Never store server-fetched data in AppContext.** Permissions in context are JWT claims for UI visibility only. Actual access control is enforced by the API.
3. **Always include `tenantId` from AppContext in query keys.** This prevents a user switching tenants (via re-login) from seeing another tenant's cached data.
4. **The `$context` variable in JSONLogic field rules refers to AppContext values.** The `useFieldConfig` hook injects `{ role, tenantId, lob, locale }` as `$context` when evaluating field rules.

---

## Cross-Store Interaction Patterns

The three stores are independent by design, but conditions and derived state often need to read from more than one. Here is how that works in practice.

### Diagram

```
         AppContext              Zustand Store              React Query Cache
         (identity)            (interaction state)           (server state)
              │                       │                            │
              │                       │                            │
              └───────────┬───────────┘                            │
                          │                                        │
                  WidgetCondition                                  │
                  Evaluator reads                                  │
                  from both ─────────────────────────────────────▶│
                                                                   │
                                                          reads cache synchronously
                                                         (queryClient.getQueryData)
```

### Example: A Condition That Reads from AppContext AND React Query

Scenario: Show the "Approve Quote" button widget only if the current user is an underwriting manager AND the quote is in `PENDING_APPROVAL` status.

**Schema (view metadata JSON):**

```json
{
  "widgetId": "approve-quote-btn",
  "type": "ActionButton",
  "condition": {
    "type": "and",
    "conditions": [
      {
        "type": "identity",
        "field": "role",
        "operator": "eq",
        "value": "underwriting_manager"
      },
      {
        "type": "serverState",
        "queryKey": ["quotations", { "id": "{{entityId}}" }],
        "path": "data.status",
        "operator": "eq",
        "value": "PENDING_APPROVAL"
      }
    ]
  }
}
```

**Evaluator logic (simplified):**

```typescript
// src/runtime/conditionEvaluator.ts

import { queryClient } from '../lib/queryClient';
import { AppContextValue } from '../context/AppContext.types';
import { PageStore } from '../stores/types';
import { get } from 'lodash-es';
import { WidgetCondition } from './conditionTypes';

interface EvaluationContext {
  identity: AppContextValue;
  store: PageStore;
  interpolatedParams?: Record<string, string>; // e.g. { entityId: 'QT-2024-0042' }
}

export function evaluateCondition(
  condition: WidgetCondition,
  ctx: EvaluationContext,
): boolean {
  switch (condition.type) {
    case 'and':
      // short-circuit: stops as soon as one is false
      return condition.conditions.every((c) => evaluateCondition(c, ctx));

    case 'or':
      // short-circuit: stops as soon as one is true
      return condition.conditions.some((c) => evaluateCondition(c, ctx));

    case 'identity': {
      const actual = ctx.identity[condition.field];
      return applyOperator(actual, condition.operator, condition.value);
    }

    case 'serverState': {
      // Interpolate any template params in the query key
      const resolvedKey = resolveQueryKey(condition.queryKey, ctx.interpolatedParams);
      const cached = queryClient.getQueryData(resolvedKey);
      if (cached === undefined) return false;
      const value = get(cached, condition.path);
      return applyOperator(value, condition.operator, condition.value);
    }

    case 'interactionState': {
      const value = get(ctx.store, condition.path);
      return applyOperator(value, condition.operator, condition.value);
    }

    default:
      return true;
  }
}

function applyOperator(actual: unknown, operator: string, expected?: unknown): boolean {
  switch (operator) {
    case 'eq':        return actual === expected;
    case 'neq':       return actual !== expected;
    case 'gt':        return typeof actual === 'number' && actual > (expected as number);
    case 'lt':        return typeof actual === 'number' && actual < (expected as number);
    case 'in':        return Array.isArray(expected) && expected.includes(actual);
    case 'exists':    return actual !== null && actual !== undefined;
    case 'notExists': return actual === null || actual === undefined;
    default:          return false;
  }
}
```

**Key points:**
- `evaluateCondition` is a pure function given its `EvaluationContext`. It is synchronous and cheap.
- Server state is read from the React Query cache synchronously — no `await`, no `useQuery` call inside the evaluator.
- If the server state for a condition is not in cache (e.g., the widget data query hasn't resolved yet), the condition returns `false` and the widget stays hidden. The widget will appear on the next render after the cache populates.
- AppContext is passed in as `identity` — it is read directly, not via a hook, because the evaluator is not a React component.

### Example: Interaction State + Identity

Show a "Bulk Assign" button only when at least one row is selected AND the user is an `underwriting_manager`:

```json
{
  "type": "and",
  "conditions": [
    {
      "type": "interactionState",
      "storeKey": "quotation-queue",
      "path": "selectedRows",
      "operator": "exists"
    },
    {
      "type": "identity",
      "field": "role",
      "operator": "eq",
      "value": "underwriting_manager"
    }
  ]
}
```

The `storeKey` is the name passed to `createPageStore`. The condition evaluator resolves it to the correct store instance.

---

*Last updated: 2026-04-08 | Architecture branch*
