"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import type { NavigationItem } from "@shared/types";
import { firstNavigableUrl, resolveIcon } from "./navHelpers";

interface IconRailProps {
    items: NavigationItem[];
    activeItemId: string | null;
    title?: string;
    logoIconName?: string;
    /** When true, ignore the desktop-only `hidden md:flex` and the
     * Ctrl+B collapse state — the rail is rendered inside a mobile Sheet
     * and should always be visible and fully expanded. */
    forceVisible?: boolean;
    onItemClick?: () => void;
}

export function IconRail({
    items,
    activeItemId,
    title,
    logoIconName,
    forceVisible = false,
    onItemClick,
}: IconRailProps) {
    const { state } = useSidebar();
    const collapsed = !forceVisible && state === "collapsed";
    const LogoIcon = resolveIcon(logoIconName);

    return (
        <aside
            data-rail-state={collapsed ? "collapsed" : "expanded"}
            className={cn(
                "shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-linear",
                forceVisible ? "flex" : "hidden md:flex",
                collapsed ? "w-12" : "w-20",
            )}
        >
            <div className="flex items-center justify-center h-14 border-b border-sidebar-border">
                <Link
                    href="/"
                    title={title}
                    className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                >
                    <LogoIcon className="size-4" />
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
                <ul className="flex flex-col items-stretch gap-1 px-1">
                    {items.map((item) => {
                        const ItemIcon = resolveIcon(item.icon);
                        const href = firstNavigableUrl(item) ?? "#";
                        const isActiveItem = item.id === activeItemId;

                        return (
                            <li key={item.id}>
                                <Link
                                    href={href}
                                    title={item.label}
                                    aria-current={isActiveItem ? "page" : undefined}
                                    onClick={onItemClick}
                                    className={cn(
                                        "group flex flex-col items-center justify-center rounded-md py-2 px-1 text-xs gap-1 transition-colors",
                                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                        isActiveItem &&
                                            "bg-background text-foreground shadow-sm ring-1 ring-sidebar-border",
                                    )}
                                >
                                    <ItemIcon className="size-5" />
                                    {!collapsed && (
                                        <span className="text-[11px] leading-tight text-center line-clamp-2">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
