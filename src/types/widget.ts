import type { Role } from '@/types/group-pas/roles';

export type WidgetType = string;

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
     * omitted, the node renders for every role. Used by the Dashboard Inbox
     * to scope each `data-table` section to one persona (PROP-0009).
     */
    visibleRoles?: Role[];
    /**
     * Optional data-conditioned visibility (json-logic). Currently honored by
     * `TabsContainer`: when the container declares a `dataSource`, it fetches
     * the entity and skips any child whose `visibleWhen` evaluates false
     * against the response. Used to hide LoB-specific tabs (e.g. GCL Member
     * Quotes on a GTL quote-detail page).
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
     * value as the rows array. Mirrors the per-field `accessorKey` pattern
     * already used by KeyValueGrid. When unset, consumers fall back to their
     * existing default discovery (e.g. data-table picks the first array-typed
     * top-level value).
     */
    dataPath?: string;
    /**
     * When true and the value resolved at `dataPath` is a string, the
     * consumer JSON.parses it before consuming. Pairs with `dataPath` to
     * drill into stringified-JSON entity fields (e.g. estimatedPremium.byPlanJson).
     * Mirrors KeyValueGrid's per-field `parseJson` flag. Parse failure surfaces
     * as a render-error on widgets that opt into the loud failure mode.
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
