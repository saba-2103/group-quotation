import type { ComponentType, SVGProps } from "react";
import * as Icons from "lucide-react";
import type { NavigationItem } from "@shared/types";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export function resolveIcon(iconName?: string): IconComponent {
    if (!iconName) return Icons.Circle as unknown as IconComponent;
    // @ts-ignore — indexing lucide icons by string name
    const IconComponent = (Icons[iconName] as unknown) ?? Icons.Circle;
    return IconComponent as IconComponent;
}

export function isActive(pathname: string, url?: string): boolean {
    if (!url) return false;
    const base = url.split("?")[0];
    if (base === "/") return pathname === "/";
    // Segment-aware match — avoids /quotations matching /quotation, etc.
    return pathname === base || pathname.startsWith(base + "/");
}

export function itemMatchesPathname(pathname: string, item: NavigationItem): boolean {
    if (isActive(pathname, item.url)) return true;
    return item.subMenuItems?.some((sub) => itemMatchesPathname(pathname, sub)) ?? false;
}

export function firstNavigableUrl(item: NavigationItem): string | undefined {
    if (item.url) return item.url;
    if (!item.subMenuItems) return undefined;
    for (const child of item.subMenuItems) {
        const url = firstNavigableUrl(child);
        if (url) return url;
    }
    return undefined;
}
