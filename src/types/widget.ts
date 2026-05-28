export type WidgetType = string;

/**
 * Overlay size token. Used by `open-modal` / `open-sheet` actions to override
 * the default container width, and by `useOverlayStore` when persisting the
 * size for an open overlay. Maps to a Tailwind `max-w-*` class inside
 * `OverlayProvider`. Default behaviour (no `size`) is `lg`.
 */
export type OverlaySize =
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl";

export interface WidgetConfig {
    id: string;
    type: WidgetType;
    props?: Record<string, any>;
    layout?: {
        colSpan?: number;
        hidden?: boolean;
        // Add other layout constraints here
    };
    dataSource?: DataSourceConfig;
    children?: WidgetConfig[];
    /**
     * Optional role-visibility filter. When set, `WidgetRenderer` skips this
     * node unless the current role (from `useRole()`) is included. When
     * omitted, the node renders for every role. Role strings are opaque to
     * the framework — they're compared against `RoleContextValue.role` by
     * equality. The gate runs BEFORE `useSmartQuery`, so hidden widgets do
     * not pay fetch / polling cost.
     *
     * **NOT a security boundary — cosmetic gating only.** A user with browser
     * devtools can flip role context and reveal the widget; the underlying
     * API is not blocked here. RBAC must be enforced server-side. Do not use
     * this prop to hide data that the current user is not authorized to see.
     *
     * **Empty array (`[]`) means "no role can see this"** — i.e. the widget
     * is hidden from everyone. This is intentional but inverts the common
     * "empty = no constraint" convention; if you're composing the list from
     * an external source (`[...someList]`), check for empty before assigning
     * or the widget will silently disappear. `WidgetRenderer` logs a dev-mode
     * warning when it encounters an empty array.
     */
    visibleRoles?: string[];
    /**
     * Generic visibility predicate (jsonLogic format). `WidgetRenderer`
     * evaluates this against the shared `useWidgetState` snapshot BEFORE
     * `useSmartQuery`, so hidden widgets skip their own data fetch and
     * polling cost. Evaluation runs only if `visibleRoles` did not already
     * hide the widget.
     *
     * **Evaluation context:** if `dataSource.stateDependencies` is set, only
     * those keys are passed in as the eval context (declarative dependency,
     * cheaper). If absent, the full `useWidgetState.values` snapshot is
     * passed; unbound `var` references resolve to `null` per jsonLogic.
     *
     * **Error handling:** a predicate that throws (malformed jsonLogic, etc.)
     * defaults to *visible* and logs a dev-mode warning. Visible-but-wrong is
     * debuggable; hidden-and-wrong is silent.
     *
     * **Container precedence:** container widgets MAY also evaluate
     * `visibleWhen` on their children against a different context (e.g.
     * `TabsContainer` filters child tabs against its own fetched entity from
     * `dataSource.data`). That's complementary — the renderer-level gate
     * runs on every widget; container-level gates run on direct children
     * only and use their own scope.
     *
     * To trigger visibility from a sibling widget, publish a state key via
     * `useWidgetState.setValue` (or a `state-publisher` dataSource) and
     * reference it in the predicate. See STATE_MANAGEMENT_GUIDE.md §8.2.
     */
    visibleWhen?: Record<string, unknown>;
}

export interface DataSourceConfig {
    api?: {
        endpoint: string;
        method: "GET" | "POST" | "PUT" | "DELETE";
        params?: Record<string, any>;
    };
    /**
     * Dotted path on the response payload to drill into before treating the
     * value as the consumer-shaped result. Mirrors the per-field `accessorKey`
     * pattern used by KeyValueGrid. Used by `data-table` (and any widget that
     * accepts `dataPath`) to extract a rows array from a nested envelope.
     */
    dataPath?: string;
    /**
     * When true and the value resolved at `dataPath` (or at the top of the
     * response) is a string, the consumer JSON.parses it before consuming.
     * Pairs with `dataPath` to drill into stringified-JSON entity fields
     * (e.g. estimatedPremium.byPlanJson). Parse failure surfaces as a render-
     * error on widgets that opt in.
     */
    parseJson?: boolean;
    /**
     * Fixed-interval polling. If set, the query refetches every N ms.
     * For backoff polling (e.g. backend's suggested 2s → 5s schedule),
     * use `pollSchedule` instead. `pollSchedule` takes precedence when both
     * are set.
     */
    refreshInterval?: number;
    /**
     * Schedule-based polling: fast at first, then back off to a slower
     * interval, with a hard maximum duration. Modeled on the backend-
     * suggested cadence for async actions: poll fast (2s) for the first
     * 10s, then 5s out to 60s, then give up.
     *
     * Example:
     *   pollSchedule: {
     *     initialIntervalMs: 2000,
     *     initialDurationMs: 10000,
     *     fallbackIntervalMs: 5000,
     *     maxDurationMs: 60000
     *   }
     *
     * `stopWhen` still halts polling early when the response is satisfied.
     */
    pollSchedule?: {
        initialIntervalMs: number;
        initialDurationMs: number;
        fallbackIntervalMs: number;
        maxDurationMs?: number;
    };
    /**
     * jsonLogic condition evaluated against the latest fetched data.
     * When truthy, polling stops (refetchInterval returns false). Works
     * with both `refreshInterval` and `pollSchedule`.
     *
     * Example: poll a quote until premium populates —
     *   pollSchedule: { initialIntervalMs: 2000, initialDurationMs: 10000,
     *                   fallbackIntervalMs: 5000, maxDurationMs: 60000 },
     *   stopWhen: { "!=": [{ "var": "premium" }, null] }
     */
    stopWhen?: Record<string, unknown>;
    valueKey?: string; // Key to extract from response or context
    stateDependencies?: string[]; // Keys in useWidgetState that trigger re-fetch
    /**
     * Dotted path applied to the fetched response via TanStack Query's
     * `select`. Subscribers only re-render when *this slice* changes by
     * reference, not when an unrelated part of the envelope changes.
     *
     * Pairs with `fromParent` for the page-envelope pattern: one widget owns
     * the fetch, sibling widgets each declare `select: "<slice>"` to pull
     * just their part. Works alone too — two widgets fetching the same
     * endpoint (TanStack dedupes by queryKey) can each request a different
     * slice and re-render independently.
     *
     * Walks the response via the shared `getNested` helper, so the same
     * prototype-pollution-safe semantics apply. If the path doesn't resolve,
     * the subscriber receives `undefined`. Applied AFTER `valueKey` (which
     * runs inside the queryFn and shapes the cached value).
     */
    select?: string;
    /**
     * When true, this widget does NOT fetch on its own — it subscribes to
     * the cache entry of the nearest ancestor widget that owns a `dataSource`
     * (the "page envelope" pattern). `select` is the recommended companion:
     * the ancestor caches the fat read DTO; each `fromParent` child picks a
     * slice via `select`.
     *
     * When `fromParent` is set, the following fields are ignored (and a dev
     * warning is logged if they're present): `api`, `valueKey`,
     * `refreshInterval`, `pollSchedule`, `stopWhen`, `stateDependencies`.
     * These belong on the ancestor that owns the fetch.
     *
     * If there is no ancestor with a dataSource in scope, the widget receives
     * `data: undefined` and a dev warning is logged — `fromParent` is then a
     * misconfiguration, not an error state.
     */
    fromParent?: boolean;
}

export interface BaseActionConfig {
    id?: string;
    label?: string;
    icon?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    display?: "button" | "icon" | "menu-item";
    refreshKey?: string;
    // When set, the action renders as visible-but-disabled with this tooltip,
    // overriding state-gating. Used to surface backend gaps honestly (e.g.
    // "Pricing engine not yet wired on backend") rather than mock-simulating
    // a behavior the real backend can't deliver. Role gating still applies.
    disabledTooltip?: string;
    props?: Record<string, any>;
}

export type ActionConfig = BaseActionConfig & (
    | {
        type: "navigate";
        target: string;
    }
    | {
        type: "open-modal" | "open-sheet";
        target: string;
        /**
         * Optional width override for the overlay shell. Maps to a Tailwind
         * `max-w-*` class on the DialogContent / SheetContent. Default is
         * `lg` (~512px). Use larger sizes for forms rendering wide content
         * (e.g. editable tables).
         */
        size?: OverlaySize;
    }
    | {
        type: "api-mutation";
        api: {
            endpoint: string;
            method: "GET" | "POST" | "PUT" | "DELETE";
            body?: any;
        };
        successMessage?: string;
        confirm?: {
            title: string;
            message: string;
        };
        // Actions to run sequentially after the mutation resolves. The success
        // toast and refreshKey invalidation fire first, then each entry here is
        // dispatched through the same action handler. Used to close the host
        // overlay (`trigger-event`) or navigate back to a list (`navigate`).
        onSuccess?: ActionConfig[];
        // Two-step file-upload semantics for api-mutation submit actions
        // (PROP-0001). When set, the FormContainer's submit handler:
        //   1. POSTs the form JSON (with the named file field omitted) to
        //      `api.endpoint` and expects { submissionId, uploadUrl, ... } back;
        //   2. PUTs the named File field value to the returned `uploadUrl`;
        //   3. Dispatches `onSuccess[]` with the initiate response merged into
        //      rowData so downstream actions can interpolate {{submissionId}}.
        // Engine-side keeps the schema declarative; future presigned-upload
        // forms reuse the same primitive.
        uploadField?: string;
    }
    | {
        type: "api-download";
        api: {
            endpoint: string;
            method: "GET" | "POST";
            body?: any;
        };
        filename?: string;
    }
    | {
        type: "trigger-event";
        target: string;
    }
    | {
        type: "update-widget-state";
        props: {
            key: string;
            operation: "set" | "patch" | "toggle";
            value?: any;
        };
    }
);
