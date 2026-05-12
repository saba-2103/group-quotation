"use client";

import { usePathname } from "next/navigation";
import { useAppContext } from "@/components/providers/AppContextProvider";
import { IconRail } from "./IconRail";
import { SubmenuPanel } from "./SubmenuPanel";
import { itemMatchesPathname } from "./navHelpers";

export function DualPanelNav() {
    const { config } = useAppContext();
    const pathname = usePathname();

    if (!config) return null;

    const { navigation, title, logo } = config;
    const items = navigation.menuItems;

    const activeItem =
        items.find((item) => itemMatchesPathname(pathname, item)) ?? items[0] ?? null;
    const activeItemId = activeItem?.id ?? null;
    const showSubmenu =
        activeItem != null &&
        activeItem.subMenuItems != null &&
        activeItem.subMenuItems.length > 0;

    return (
        <>
            <IconRail
                items={items}
                activeItemId={activeItemId}
                title={title}
                logoIconName={logo?.icon}
            />
            {showSubmenu && activeItem && (
                <SubmenuPanel parent={activeItem} pathname={pathname} />
            )}
        </>
    );
}
