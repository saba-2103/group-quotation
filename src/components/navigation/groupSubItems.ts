import type { NavigationItem } from "@shared/types";

export interface NavigationGroup {
    group: string | null;
    items: NavigationItem[];
}

export function groupSubItems(items: NavigationItem[]): NavigationGroup[] {
    const order: (string | null)[] = [];
    const buckets = new Map<string | null, NavigationItem[]>();

    for (const item of items) {
        const key = item.group ?? null;
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = [];
            buckets.set(key, bucket);
            order.push(key);
        }
        bucket.push(item);
    }

    return order.map((key) => ({ group: key, items: buckets.get(key) ?? [] }));
}
