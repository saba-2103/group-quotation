import {
    isActive,
    itemMatchesPathname,
    firstNavigableUrl,
} from "@/components/navigation/navHelpers";
import { groupSubItems } from "@/components/navigation/groupSubItems";
import type { NavigationItem } from "@shared/types";

describe("isActive", () => {
    it("returns false when url is undefined", () => {
        expect(isActive("/quotation", undefined)).toBe(false);
    });

    it("returns true for an exact match", () => {
        expect(isActive("/quotation", "/quotation")).toBe(true);
    });

    it("matches a child segment", () => {
        expect(isActive("/quotation/123", "/quotation")).toBe(true);
    });

    it("does not match a prefix collision (segment-aware)", () => {
        // Real legacy collision: /quotations (plural) must not match /quotation (singular).
        expect(isActive("/quotations", "/quotation")).toBe(false);
    });

    it("root '/' only matches the root pathname exactly", () => {
        expect(isActive("/", "/")).toBe(true);
        expect(isActive("/quotation", "/")).toBe(false);
    });

    it("ignores the querystring on the base url", () => {
        expect(isActive("/quotation", "/quotation?status=draft")).toBe(true);
    });
});

describe("itemMatchesPathname", () => {
    it("matches when the item url is active", () => {
        const item: NavigationItem = { id: "a", label: "A", url: "/a" };
        expect(itemMatchesPathname("/a", item)).toBe(true);
    });

    it("matches when a sub-item is active", () => {
        const item: NavigationItem = {
            id: "p",
            label: "Policy",
            subMenuItems: [{ id: "c", label: "Clients", url: "/policy-admin/clients" }],
        };
        expect(itemMatchesPathname("/policy-admin/clients", item)).toBe(true);
    });

    it("returns false when neither the item nor children match", () => {
        const item: NavigationItem = {
            id: "p",
            label: "Policy",
            url: "/policy-admin",
            subMenuItems: [{ id: "c", label: "Clients", url: "/policy-admin/clients" }],
        };
        expect(itemMatchesPathname("/accounting", item)).toBe(false);
    });
});

describe("firstNavigableUrl", () => {
    it("returns the item's own url when set", () => {
        const item: NavigationItem = { id: "a", label: "A", url: "/a" };
        expect(firstNavigableUrl(item)).toBe("/a");
    });

    it("falls back to the first navigable descendant", () => {
        const item: NavigationItem = {
            id: "p",
            label: "Policy",
            subMenuItems: [
                { id: "c", label: "Clients", url: "/policy-admin/clients" },
                { id: "p2", label: "Policies", url: "/policy-admin/policies" },
            ],
        };
        expect(firstNavigableUrl(item)).toBe("/policy-admin/clients");
    });

    it("returns undefined when no url is reachable", () => {
        const item: NavigationItem = { id: "x", label: "X" };
        expect(firstNavigableUrl(item)).toBeUndefined();
    });
});

describe("groupSubItems", () => {
    it("buckets items by group, preserving first-seen order", () => {
        const items: NavigationItem[] = [
            { id: "a", label: "A", url: "/a", group: "Manage" },
            { id: "b", label: "B", url: "/b", group: "Reports" },
            { id: "c", label: "C", url: "/c", group: "Manage" },
        ];
        const result = groupSubItems(items);
        expect(result.map((g) => g.group)).toEqual(["Manage", "Reports"]);
        expect(result[0].items.map((i) => i.id)).toEqual(["a", "c"]);
        expect(result[1].items.map((i) => i.id)).toEqual(["b"]);
    });

    it("puts ungrouped items under a single null bucket", () => {
        const items: NavigationItem[] = [
            { id: "a", label: "A", url: "/a" },
            { id: "b", label: "B", url: "/b" },
        ];
        const result = groupSubItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].group).toBeNull();
        expect(result[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    });

    it("preserves item insertion order within a bucket", () => {
        const items: NavigationItem[] = [
            { id: "a", label: "A", url: "/a", group: "G" },
            { id: "b", label: "B", url: "/b", group: "G" },
            { id: "c", label: "C", url: "/c", group: "G" },
        ];
        const result = groupSubItems(items);
        expect(result[0].items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    });
});
