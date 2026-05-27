import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { ParentDataSourceContext } from "@/contexts/ParentDataSourceContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fresh QueryClient per test so cache state doesn't bleed. */
const newClient = () =>
    new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

const buildWrapper = (
    client: QueryClient,
    parentKey: readonly unknown[] | null = null,
) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>
            <ParentDataSourceContext.Provider value={parentKey}>
                {children}
            </ParentDataSourceContext.Provider>
        </QueryClientProvider>
    );
    Wrapper.displayName = "SmartQueryTestWrapper";
    return Wrapper;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSmartQuery — select", () => {
    it("returns the full payload when `select` is omitted", async () => {
        const envelope = { policy: { id: "P-1" }, plans: [{ planNo: "A" }] };
        const client = newClient();
        const parentKey: unknown[] = ["/api/policies/P-1", "GET", undefined, {}];
        client.setQueryData(parentKey, envelope);

        const { result } = renderHook(
            () =>
                useSmartQuery({
                    fromParent: true,
                }),
            { wrapper: buildWrapper(client, parentKey) },
        );

        await waitFor(() => expect(result.current.data).toEqual(envelope));
    });

    it("extracts the selected slice via dotted path", async () => {
        const envelope = {
            policy: { id: "P-1" },
            plans: [{ planNo: "A" }, { planNo: "B" }],
        };
        const client = newClient();
        const parentKey: unknown[] = ["/api/policies/P-1", "GET", undefined, {}];
        client.setQueryData(parentKey, envelope);

        const { result } = renderHook(
            () =>
                useSmartQuery({
                    fromParent: true,
                    select: "plans",
                }),
            { wrapper: buildWrapper(client, parentKey) },
        );

        await waitFor(() =>
            expect(result.current.data).toEqual([
                { planNo: "A" },
                { planNo: "B" },
            ]),
        );
    });

    it("returns undefined when the select path doesn't resolve", async () => {
        const envelope = { policy: { id: "P-1" } };
        const client = newClient();
        const parentKey: unknown[] = ["/api/policies/P-1", "GET", undefined, {}];
        client.setQueryData(parentKey, envelope);

        const { result } = renderHook(
            () =>
                useSmartQuery({
                    fromParent: true,
                    select: "nonexistent.path",
                }),
            { wrapper: buildWrapper(client, parentKey) },
        );

        await waitFor(() => expect(result.current.data).toBeUndefined());
    });
});

describe("useSmartQuery — fromParent", () => {
    it("does not call fetch", async () => {
        const fetchSpy = jest.fn();
        const originalFetch = global.fetch;
        global.fetch = fetchSpy as unknown as typeof fetch;

        try {
            const envelope = { plans: [] };
            const client = newClient();
            const parentKey: unknown[] = ["/api/policies/P-1", "GET", undefined, {}];
            client.setQueryData(parentKey, envelope);

            renderHook(
                () =>
                    useSmartQuery({
                        fromParent: true,
                        select: "plans",
                    }),
                { wrapper: buildWrapper(client, parentKey) },
            );

            // Give React a tick to settle; nothing should have hit fetch.
            await new Promise((r) => setTimeout(r, 10));
            expect(fetchSpy).not.toHaveBeenCalled();
        } finally {
            global.fetch = originalFetch;
        }
    });

    it("returns undefined data + warns when no ancestor key is in scope", async () => {
        const warnSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => undefined);
        const client = newClient();

        try {
            const { result } = renderHook(
                () =>
                    useSmartQuery({
                        fromParent: true,
                        select: "plans",
                    }),
                { wrapper: buildWrapper(client, null) },
            );

            await waitFor(() => expect(result.current.data).toBeUndefined());
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("no ancestor"),
            );
        } finally {
            warnSpy.mockRestore();
        }
    });

    it("warns when own-fetch fields are set alongside fromParent", async () => {
        const warnSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => undefined);
        const client = newClient();
        const parentKey: unknown[] = ["/api/policies/P-1", "GET", undefined, {}];
        client.setQueryData(parentKey, { plans: [] });

        try {
            renderHook(
                () =>
                    useSmartQuery({
                        fromParent: true,
                        select: "plans",
                        // These should all be ignored and produce a warning.
                        api: { endpoint: "/api/x", method: "GET" },
                        refreshInterval: 1000,
                    }),
                { wrapper: buildWrapper(client, parentKey) },
            );

            await waitFor(() =>
                expect(warnSpy).toHaveBeenCalledWith(
                    expect.stringContaining("ignoring"),
                ),
            );
        } finally {
            warnSpy.mockRestore();
        }
    });

    it("exposes the effective queryKey on the hook's return", () => {
        const client = newClient();
        const parentKey: unknown[] = ["/api/policies/P-1", "GET", undefined, {}];

        const { result } = renderHook(
            () =>
                useSmartQuery({
                    fromParent: true,
                    select: "plans",
                }),
            { wrapper: buildWrapper(client, parentKey) },
        );

        expect(result.current.queryKey).toEqual(parentKey);
    });

    it("own-fetch widgets expose their own computed queryKey", () => {
        const client = newClient();

        const { result } = renderHook(
            () =>
                useSmartQuery({
                    api: { endpoint: "/api/things", method: "GET" },
                }),
            { wrapper: buildWrapper(client, null) },
        );

        expect(result.current.queryKey).toEqual([
            "/api/things",
            "GET",
            undefined,
            {},
        ]);
    });
});
