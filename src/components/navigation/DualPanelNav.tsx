"use client";

import { usePathname } from "next/navigation";
import { useAppContext } from "@/components/providers/AppContextProvider";
import { useSidebar } from "@/components/ui/sidebar";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { IconRail } from "./IconRail";
import { SubmenuPanel } from "./SubmenuPanel";
import { itemMatchesPathname } from "./navHelpers";

export function DualPanelNav() {
    const { config } = useAppContext();
    const pathname = usePathname();
    const { isMobile, openMobile, setOpenMobile } = useSidebar();

    if (!config) return null;

    const { navigation, title, logo } = config;
    const items = navigation.menuItems;

    const activeItem =
        items.find((item) => itemMatchesPathname(pathname, item)) ?? null;
    const activeItemId = activeItem?.id ?? null;
    const showSubmenu =
        activeItem != null &&
        activeItem.subMenuItems != null &&
        activeItem.subMenuItems.length > 0;

    if (isMobile) {
        const closeOnNav = () => setOpenMobile(false);
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetContent side="left" className="flex p-0 w-auto max-w-[90vw] [&>button]:hidden">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation</SheetTitle>
                        <SheetDescription>Application navigation menu</SheetDescription>
                    </SheetHeader>
                    <IconRail
                        items={items}
                        activeItemId={activeItemId}
                        title={title}
                        logoIconName={logo?.icon}
                        forceVisible
                        onItemClick={closeOnNav}
                    />
                    {showSubmenu && activeItem && (
                        <SubmenuPanel
                            parent={activeItem}
                            pathname={pathname}
                            forceVisible
                            onItemClick={closeOnNav}
                        />
                    )}
                </SheetContent>
            </Sheet>
        );
    }

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
