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
    id?: string;
    label?: string;
    icon?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    intent?: string;
    display?: "button" | "icon" | "menu-item";
    actionProps?: Record<string, any>;

    // Original keystone-ui fields
    type?: "navigate" | "api-mutation" | "open-modal" | "trigger-event";
    target?: string;
    api?: {
        endpoint: string;
        method: "GET" | "POST" | "PUT" | "DELETE";
        body?: any;
    };
    refreshKey?: string;
    props?: Record<string, any>;
    confirm?: {
        title: string;
        message: string;
    };
}
