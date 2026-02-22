export enum SideBarType {
    NESTED = 'NESTED',
    UNGROUPED = 'UNGROUPED',
}

export interface NavigationItem {
    id: string;
    label: string;
    url?: string;
    icon?: string;
    subMenuItems?: NavigationItem[];
}

export interface AppConfig {
    title: string;
    description: string;
    logo?: {
        icon?: string;
        size?: number;
    };
    navigation: {
        sideBarType: SideBarType;
        menuItems: NavigationItem[];
    };
}
