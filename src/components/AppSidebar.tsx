"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { useAppContext } from "./providers/AppContextProvider";
import * as Icons from "lucide-react";
import { NavigationItem, SideBarType } from "@shared/types";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const { config } = useAppContext();
    const pathname = usePathname();

    if (!config) return null;

    const { navigation, logo, title } = config;

    // Dynamically resolve icon, fallback to LayoutDashboard if not found
    const resolveIcon = (iconName?: string) => {
        if (!iconName) return Icons.Circle;
        // @ts-ignore - indexing lucide icons 
        const IconComponent = Icons[iconName] || Icons.Circle;
        return IconComponent;
    };

    const LogoIcon = resolveIcon(logo?.icon);

    // Helper to check if a route is active
    const isActive = (url?: string) => {
        if (!url) return false;
        // Special handling to not match "/" broadly if doing partial matches
        if (url === "/" && pathname !== "/") return false;
        // Ensure "quotations" is an exact match or partial match correctly
        // e.g. path /quotations?status=pending will have pathname /quotations
        return pathname.startsWith(url.split('?')[0]);
    };

    const renderMenuItem = (item: NavigationItem) => {
        const ItemIcon = resolveIcon(item.icon);

        // Check if any sub-item is active to open the group (if we implement collapsibles later, currently using standard shadcn submenus)
        const isSubActive = item.subMenuItems?.some((sub: NavigationItem) => isActive(sub.url));
        const isMainActive = isActive(item.url) || isSubActive;

        return (
            <SidebarMenuItem key={item.id}>
                {item.url ? (
                    <SidebarMenuButton asChild isActive={isMainActive} tooltip={item.label}>
                        <Link href={item.url}>
                            <ItemIcon />
                            <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                ) : (
                    <SidebarMenuButton isActive={isMainActive} tooltip={item.label}>
                        <ItemIcon />
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                )}

                {item.subMenuItems && item.subMenuItems.length > 0 && (
                    <SidebarMenuSub>
                        {item.subMenuItems.map((subItem: NavigationItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                    <Link href={subItem.url || "#"}>
                                        <span>{subItem.label}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                )}
            </SidebarMenuItem>
        );
    };

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <LogoIcon className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none px-1">
                                    <span className="font-semibold">{title}</span>
                                    <span className="text-xs text-muted-foreground">Portal v2.0</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navigation.sideBarType === SideBarType.NESTED ? (
                    <SidebarGroup>
                        <SidebarGroupLabel>Menu</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navigation.menuItems.map(renderMenuItem)}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ) : (
                    <SidebarGroup>
                        <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navigation.menuItems.map(renderMenuItem)}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}
