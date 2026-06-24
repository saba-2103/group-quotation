"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@shared/types";
import { groupSubItems } from "./groupSubItems";
import { isActive, resolveIcon } from "./navHelpers";

interface SubmenuPanelProps {
    parent: NavigationItem;
    pathname: string;
    orgName?: string;
    /** When true, ignore the desktop-only `hidden md:flex` — rendered inside a mobile Sheet. */
    forceVisible?: boolean;
    onItemClick?: () => void;
}

export function SubmenuPanel({ parent, pathname, orgName, forceVisible = false, onItemClick }: SubmenuPanelProps) {
    const groups = groupSubItems(parent.subMenuItems ?? []);
    const headerName = orgName ?? parent.label;

    return (
        <aside
            className={cn(
                "w-60 shrink-0 flex-col bg-sidebar",
                forceVisible ? "flex" : "hidden md:flex",
            )}
        >
            {/* Header — org/space name */}
            <div className="flex h-[52px] items-center px-3 shrink-0">
                <span className="text-lg font-semibold text-foreground truncate">
                    {headerName}
                </span>
            </div>

            {/* Nav groups */}
            <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-3">
                <div className="flex flex-col gap-6">
                    {groups.map((group, idx) => (
                        <div key={group.group ?? `__ungrouped_${idx}`} className="flex flex-col gap-2">
                            {/* Section label */}
                            {group.group && (
                                <p className="px-3 text-xs font-normal uppercase tracking-wide text-muted-foreground">
                                    {group.group}
                                </p>
                            )}

                            {/* Items */}
                            <ul className="flex flex-col gap-1">
                                {group.items.map((item) => {
                                    const ItemIcon = resolveIcon(item.icon);
                                    const active = isActive(pathname, item.url)
                                        || (!!item.activePrefix && pathname.startsWith(item.activePrefix));
                                    if (item.disabled) {
                                        return (
                                            <li key={item.id}>
                                                <span className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs text-foreground/30 cursor-not-allowed select-none">
                                                    <ItemIcon className="size-4 shrink-0" />
                                                    <span className="truncate">{item.label}</span>
                                                </span>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li key={item.id}>
                                            <Link
                                                href={item.url ?? "#"}
                                                aria-current={active ? "page" : undefined}
                                                onClick={onItemClick}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-sm text-xs transition-colors",
                                                    active
                                                        ? "bg-border text-foreground font-medium"
                                                        : "text-foreground/60 hover:bg-sidebar-accent hover:text-foreground",
                                                )}
                                            >
                                                <ItemIcon className="size-4 shrink-0" />
                                                <span className="truncate">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </nav>
        </aside>
    );
}

