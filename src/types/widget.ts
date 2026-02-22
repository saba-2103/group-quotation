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

export interface BaseActionConfig {
    id?: string;
    label?: string;
    icon?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    refreshKey?: string;
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
);
