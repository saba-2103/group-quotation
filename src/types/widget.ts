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
}

export interface DataSourceConfig {
    api?: {
        endpoint: string;
        method: "GET" | "POST" | "PUT" | "DELETE";
        params?: Record<string, any>;
    };
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
