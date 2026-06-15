"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavigationItem } from "@shared/types";
import { firstNavigableUrl, resolveIcon } from "./navHelpers";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_SWITCHER_PERSONAS } from "@/types/group-pas/roles";
import { useRole } from "@/hooks/useRole";

interface IconRailProps {
    items: NavigationItem[];
    activeItemId: string | null;
    title?: string;
    logoIconName?: string;
    forceVisible?: boolean;
    onItemClick?: () => void;
}

function UserAvatarButton() {
    const { user, switchPersona } = useAuth();
    const { currentRole, salesLevel } = useRole();

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const currentPersonaId = (() => {
        if (currentRole !== 'SALES') return currentRole.toLowerCase();
        return `sales-l${salesLevel}`;
    })();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        "bg-accent text-foreground text-sm font-semibold",
                        "hover:ring-2 hover:ring-border transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`${user.name} — switch role`}
                >
                    {initials}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="right" align="end" className="w-64 mb-1">
                <DropdownMenuLabel className="pb-1">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground pb-1">
                    Switch persona
                </DropdownMenuLabel>
                {ROLE_SWITCHER_PERSONAS.map((p) => {
                    const isCurrent = currentPersonaId === p.id;
                    const initials2 = p.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
                    return (
                        <DropdownMenuItem
                            key={p.id}
                            onSelect={() => switchPersona(p)}
                            className={cn(
                                "flex items-center gap-2 text-sm",
                                isCurrent && "bg-accent font-medium",
                            )}
                        >
                            <span className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                isCurrent
                                    ? "bg-foreground text-background"
                                    : "bg-muted text-muted-foreground",
                            )}>
                                {initials2}
                            </span>
                            <div className="flex flex-col leading-tight">
                                <span>{p.label}</span>
                                <span className="text-xs text-muted-foreground font-normal">{p.name}</span>
                            </div>
                            {isCurrent && (
                                <span className="ml-auto text-xs text-primary font-medium">active</span>
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
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
                    {items.map((item) => {
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
                                        "text-[11px] leading-none text-center",
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

            {/* Bottom — Settings + Avatar */}
            <div className="flex flex-col items-center shrink-0 pb-3">
                {/* Settings */}
                <Link
                    href="/config"
                    className="flex flex-col items-center justify-center gap-1 h-16 w-full"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
                        <Settings className="size-4" />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-none text-center">
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


