"use client";

import { usePathname } from "next/navigation";
import { useAppContext } from "@/components/providers/AppContextProvider";
import { itemMatchesPathname } from "./navHelpers";

/**
 * Wraps the entire RHS column (GlobalHeader + content frame).
 * Adds 12px (pl-3) left padding when there is no secondary (submenu) sidebar.
 */
export function RhsColumn({ children }: { children: React.ReactNode }) {
    const { config } = useAppContext();
    const pathname = usePathname();

    const items = config?.navigation.menuItems ?? [];
    const activeItem = items.find((item) => itemMatchesPathname(pathname, item)) ?? null;
    const hasSubmenu =
        activeItem != null &&
        activeItem.subMenuItems != null &&
        activeItem.subMenuItems.length > 0;

    return (
        <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${hasSubmenu ? '' : 'pl-3'}`}>
            {children}
        </div>
    );
}

/**
 * Wraps the rounded content card with right padding only.
 * Left padding is handled by RhsColumn above.
 */
export function ContentFrameWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 min-h-0 overflow-hidden pr-3">
            {children}
        </div>
    );
}
