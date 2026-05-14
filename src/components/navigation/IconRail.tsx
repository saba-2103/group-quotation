"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import type { NavigationItem } from "@shared/types";
import { firstNavigableUrl, resolveIcon } from "./navHelpers";

interface IconRailProps {
    items: NavigationItem[];
    activeItemId: string | null;
    title?: string;
    logoIconName?: string;
}

export function IconRail({ items, activeItemId, title }: IconRailProps) {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";

    return (
        <aside
            data-rail-state={collapsed ? "collapsed" : "expanded"}
            className={cn(
                "hidden md:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-linear",
                collapsed ? "w-12" : "w-20",
            )}
        >
            <div className="flex items-center justify-center h-14 border-b border-sidebar-border">
                <Link
                    href="/"
                    title={title ?? "Anaira"}
                    aria-label={title ?? "Anaira"}
                    className="flex aspect-square size-9 items-center justify-center"
                >
                    <Image
                        src="/anaira-logomark.svg"
                        alt=""
                        width={32}
                        height={32}
                        priority
                        className="size-8"
                    />
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
