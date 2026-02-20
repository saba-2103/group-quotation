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
    refreshInterval?: number;
    valueKey?: string; // Key to extract from response or context
}

export interface ActionConfig {
    type: "navigate" | "api-mutation" | "open-modal" | "trigger-event";
    target?: string; // URL, Modal ID, or Event Name
    api?: {
        endpoint: string;
        method: "POST" | "PUT" | "DELETE";
        body?: any;
    };
    refreshKey?: string; // Query key to invalidate after success
    props?: Record<string, any>; // Extra props for the action (e.g. modal props)
    confirm?: {
        title: string;
        message: string;
    };
}
