import type { Role } from "@/types/group-pas/roles";

export interface NavigationItem {
    id: string;
    label: string;
    url?: string;
    icon?: string;
    group?: string;
    subMenuItems?: NavigationItem[];
    /**
     * Optional per-item RBAC filter. When set, the `/api/config/app` route
     * filters this item out for roles not in the list before the response
     * reaches the client. When omitted, the item is visible to every role.
     * Server-side filtering matches the post-auth posture (JWT → menu).
     */
    allowedRoles?: Role[];
    /**
     * Optional URL prefix — item is also highlighted as active when the
     * current pathname starts with this string (e.g. '/rfq2/rfq-').
     */
    activePrefix?: string;
    badge?: string | number;
    /**
     * When true, this item renders in the fixed bottom section of the primary
     * rail (above Settings) instead of the main scrollable nav area.
     */
    bottomRail?: boolean;
    /** When true, the item is visible but non-navigable (coming soon / access restricted). */
    disabled?: boolean;
}

export interface AppConfig {
    title: string;
    description: string;
    logo?: {
        icon?: string;
        size?: number;
    };
    navigation: {
        menuItems: NavigationItem[];
    };
}
