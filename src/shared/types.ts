export interface NavigationItem {
    id: string;
    label: string;
    url?: string;
    icon?: string;
    group?: string;
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
        menuItems: NavigationItem[];
    };
}
