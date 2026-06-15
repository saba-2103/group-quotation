"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppContext } from "@/components/providers/AppContextProvider";
import { useBreadcrumbStore } from "@/stores/breadcrumbStore";
import type { NavigationItem } from "@shared/types";

interface Crumb {
    label: string;
    href: string;
    current: boolean;
}

/** Look up an exact path in the nav config (parent or child level). */
function findNavLabel(path: string, items: NavigationItem[]): string | undefined {
    for (const item of items) {
        if (item.url === path) return item.label;
        for (const sub of item.subMenuItems ?? []) {
            if (sub.url === path) return sub.label;
        }
    }
    return undefined;
}

/** Format a URL segment into a human-readable label. */
function formatSegment(segment: string): string {
    // ID-like segment (e.g. rfq-001, plan-abc-1): uppercase it
    if (/^[a-z]+-\d/.test(segment)) return segment.toUpperCase();
    // Slug: title-case each word
    return segment.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Build a breadcrumb trail, optionally injecting virtual crumbs after specific segments. */
function buildCrumbs(
    pathname: string,
    items: NavigationItem[],
    storeLabels: Record<string, string> = {},
    insertAfterMap: Record<string, { label: string; href: string }> = {},
): Crumb[] {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: Crumb[] = [];
    const lastIdx = segments.length - 1;
    segments.forEach((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const label = storeLabels[seg] ?? findNavLabel(path, items) ?? formatSegment(seg);
        crumbs.push({ label, href: path, current: i === lastIdx });
        // Inject a virtual crumb after this segment if one is registered
        // (only when there's a following segment, so it's never the last item)
        const extra = insertAfterMap[seg];
        if (extra && i < lastIdx) {
            crumbs.push({ label: extra.label, href: extra.href, current: false });
        }
    });
    return crumbs;
}

export function BreadcrumbBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { config } = useAppContext();
    const items = config?.navigation.menuItems ?? [];
    const storeLabels = useBreadcrumbStore((s) => s.labels);
    const insertAfterMap = useBreadcrumbStore((s) => s.insertAfter);

    const crumbs = buildCrumbs(pathname, items, storeLabels, insertAfterMap);

    return (
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-border/40">
            {/* LHS — back/fwd + breadcrumb */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => router.back()}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled
                        className="opacity-50"
                        aria-label="Go forward"
                    >
                        <ArrowRight className="size-4" />
                    </Button>
                </div>

                {crumbs.length > 0 && (
                    <Breadcrumb>
                        <BreadcrumbList>
                            {crumbs.map((crumb, i) => (
                                <BreadcrumbItem key={crumb.href}>
                                    {i > 0 && <BreadcrumbSeparator />}
                                    {crumb.current ? (
                                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={crumb.href}>{crumb.label}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                )}
            </div>
        </div>
    );
}
