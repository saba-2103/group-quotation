"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@shared/types";
import { groupSubItems } from "./groupSubItems";
import { isActive, resolveIcon } from "./navHelpers";

interface SubmenuPanelProps {
    parent: NavigationItem;
    pathname: string;
    /** When true, ignore the desktop-only `hidden md:flex` — rendered inside a mobile Sheet. */
    forceVisible?: boolean;
    onItemClick?: () => void;
}

export function SubmenuPanel({ parent, pathname, forceVisible = false, onItemClick }: SubmenuPanelProps) {
    const groups = groupSubItems(parent.subMenuItems ?? []);

    return (
        <aside
            className={cn(
                "w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
                forceVisible ? "flex" : "hidden md:flex",
            )}
        >
            <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
                <h2 className="text-sm font-semibold truncate">{parent.label}</h2>
            </div>

            <nav className="flex-1 overflow-y-auto py-3">
                {groups.map((group, idx) => (
                    <div key={group.group ?? `__ungrouped_${idx}`} className="mb-3">
                        {group.group && (
                            <div className="px-3 pb-1 text-[11px] font-medium text-sidebar-foreground/70 uppercase tracking-wider">
                                {group.group}
                            </div>
                        )}
                        <ul className="flex flex-col gap-0.5 px-2">
                            {group.items.map((item) => {
                                const ItemIcon = resolveIcon(item.icon);
                                const active = isActive(pathname, item.url);
                                return (
                                    <li key={item.id}>
                                        <Link
                                            href={item.url ?? "#"}
                                            aria-current={active ? "page" : undefined}
                                            onClick={onItemClick}
                                            className={cn(
                                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                active &&
                                                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
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
            </nav>
        </aside>
    );
}
