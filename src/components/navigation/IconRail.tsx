"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import type { NavigationItem } from "@shared/types";
import { firstNavigableUrl, resolveIcon } from "./navHelpers";
import { useAuth } from "@/hooks/useAuth";

interface IconRailProps {
    items: NavigationItem[];
    activeItemId: string | null;
    title?: string;
    logoIconName?: string;
    forceVisible?: boolean;
    onItemClick?: () => void;
}

function UserAvatarButton() {
    const { user } = useAuth();
    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <Link
            href="/profile"
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-accent text-foreground text-sm font-semibold",
                "hover:ring-2 hover:ring-border transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label={`${user.name} — profile`}
        >
            {initials}
        </Link>
    );
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
    const mainItems = items.filter((i) => !i.bottomRail);
    const bottomItems = items.filter((i) => i.bottomRail);

    return (
        <aside
            data-rail-state={collapsed ? "collapsed" : "expanded"}
            className={cn(
                "shrink-0 flex-col bg-background",
                "w-16",
                forceVisible ? "flex" : "hidden md:flex",
            )}
        >
            {/* Logo — 52px tall, no pill background */}
            <div className="flex h-[52px] items-center justify-center shrink-0">
                <Link href="/" title={title} className="flex items-center justify-center">
                    <img src="/logo.svg" alt={title ?? 'Logo'} className="h-6 w-auto" />
                </Link>
            </div>

            {/* Module icons — vertical layout */}
            <nav className="flex-1 overflow-y-auto">
                <ul className="flex flex-col items-center">
                    {mainItems.map((item) => {
                        const ItemIcon = resolveIcon(item.icon);
                        const href = firstNavigableUrl(item) ?? "#";
                        const isActiveItem = item.id === activeItemId;

                        return (
                            <li key={item.id} className="w-full">
                                <Link
                                    href={href}
                                    aria-current={isActiveItem ? "page" : undefined}
                                    onClick={onItemClick}
                                    className="flex flex-col items-center justify-center gap-1 h-16 w-full"
                                >
                                    {/* Icon pill */}
                                    <div className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                                        isActiveItem
                                            ? "bg-foreground text-background"
                                            : "text-muted-foreground",
                                    )}>
                                        <ItemIcon className={cn(
                                            "shrink-0",
                                            isActiveItem ? "size-5" : "size-4",
                                        )} />
                                    </div>
                                    {/* Label */}
                                    <span className={cn(
                                        "text-[11px] leading-tight text-center px-1",
                                        isActiveItem
                                            ? "text-foreground font-medium"
                                            : "text-muted-foreground font-normal",
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom — bottom-rail modules + Settings + Avatar */}
            <div className="flex flex-col items-center shrink-0 pb-3">
                {bottomItems.length > 0 && (
                    <>
                        <div className="w-8 h-px bg-border/40 my-1" />
                        {bottomItems.map((item) => {
                            const ItemIcon = resolveIcon(item.icon);
                            const href = firstNavigableUrl(item) ?? "#";
                            const isActiveItem = item.id === activeItemId;
                            return (
                                <Link
                                    key={item.id}
                                    href={href}
                                    aria-current={isActiveItem ? "page" : undefined}
                                    onClick={onItemClick}
                                    className="flex flex-col items-center justify-center gap-1 h-16 w-full"
                                >
                                    <div className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                                        isActiveItem
                                            ? "bg-foreground text-background"
                                            : "text-muted-foreground",
                                    )}>
                                        <ItemIcon className={cn(
                                            "shrink-0",
                                            isActiveItem ? "size-5" : "size-4",
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "text-[11px] leading-tight text-center px-1",
                                        isActiveItem
                                            ? "text-foreground font-medium"
                                            : "text-muted-foreground font-normal",
                                    )}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </>
                )}
                {/* Settings */}
                <Link
                    href="/config"
                    className="flex flex-col items-center justify-center gap-1 h-16 w-full"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
                        <Settings className="size-4" />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight text-center">
                        Settings
                    </span>
                </Link>

                {/* Avatar */}
                <div className="flex h-16 items-center justify-center w-full">
                    <UserAvatarButton />
                </div>
            </div>
        </aside>
    );
}


