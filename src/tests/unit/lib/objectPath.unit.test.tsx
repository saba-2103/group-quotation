import { getNested, setNested } from "@/lib/objectPath";

describe("getNested", () => {
    it("returns the source unchanged when path is empty or undefined", () => {
        const source = { a: 1 };
        expect(getNested(source, "")).toBe(source);
        expect(getNested(source, undefined)).toBe(source);
    });

    it("returns undefined when source is null/undefined", () => {
        expect(getNested(null, "a")).toBeNull();
        expect(getNested(undefined, "a")).toBeUndefined();
    });

    it("reads flat keys", () => {
        expect(getNested({ a: 1, b: 2 }, "a")).toBe(1);
    });

    it("reads dotted paths", () => {
        const source = { amount: { amount: 42, currency: "INR" } };
        expect(getNested(source, "amount.amount")).toBe(42);
        expect(getNested(source, "amount.currency")).toBe("INR");
    });

    it("returns undefined when an intermediate segment is missing", () => {
        expect(getNested({ a: {} }, "a.b.c")).toBeUndefined();
    });

    it("returns undefined when an intermediate segment is a scalar", () => {
        expect(getNested({ a: 42 }, "a.b")).toBeUndefined();
    });

    it("rejects prototype-pollution segments", () => {
        expect(getNested({}, "__proto__")).toBeUndefined();
        expect(getNested({}, "constructor")).toBeUndefined();
        expect(getNested({}, "prototype")).toBeUndefined();
        expect(getNested({ a: { __proto__: {} } }, "a.__proto__")).toBeUndefined();
    });

    it("does not return inherited properties", () => {
        // toString is on Object.prototype but not own — must not resolve.
        expect(getNested({}, "toString")).toBeUndefined();
    });
});

describe("setNested", () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it("returns false and is a no-op for empty path", () => {
        const target: Record<string, unknown> = { a: 1 };
        expect(setNested(target, "", 99)).toBe(false);
        expect(target).toEqual({ a: 1 });
    });

    it("writes flat keys", () => {
        const target: Record<string, unknown> = {};
        expect(setNested(target, "a", 1)).toBe(true);
        expect(target).toEqual({ a: 1 });
    });

    it("writes dotted paths, creating intermediates as plain objects", () => {
        const target: Record<string, unknown> = {};
        expect(setNested(target, "a.b.c", 7)).toBe(true);
        expect(target).toEqual({ a: { b: { c: 7 } } });
    });

    it("round-trips with getNested for flat and dotted paths", () => {
        const target: Record<string, unknown> = {};
        setNested(target, "memberName", "Alice");
        setNested(target, "amount.currency", "INR");
        expect(getNested(target, "memberName")).toBe("Alice");
        expect(getNested(target, "amount.currency")).toBe("INR");
    });

    it("treats null intermediates as absent and overwrites with an object", () => {
        const target: Record<string, unknown> = { a: null };
        expect(setNested(target, "a.b", 1)).toBe(true);
        expect(target).toEqual({ a: { b: 1 } });
    });

    it("refuses to overwrite a scalar intermediate (the join-collision bug)", () => {
        // Models the real scenario: a row has { amount: 42 } and a join column
        // tries to write to "amount.label". The original `42` must survive.
        const target: Record<string, unknown> = { amount: 42 };
        expect(setNested(target, "amount.label", "Gold Plan")).toBe(false);
        expect(target).toEqual({ amount: 42 });
        expect(warnSpy).toHaveBeenCalled();
    });

    it("refuses scalar intermediates of all primitive types", () => {
        for (const scalar of [0, "", false, true, "hi", 1.5]) {
            const target: Record<string, unknown> = { a: scalar };
            expect(setNested(target, "a.b", "x")).toBe(false);
            expect(target).toEqual({ a: scalar });
        }
    });

    it("overwrites a leaf scalar (writing to a leaf is the whole point)", () => {
        const target: Record<string, unknown> = { a: 1 };
        expect(setNested(target, "a", 2)).toBe(true);
        expect(target).toEqual({ a: 2 });
    });

    it("rejects prototype-pollution segments and does not mutate the prototype", () => {
        const target: Record<string, unknown> = {};
        expect(setNested(target, "__proto__.polluted", "x")).toBe(false);
        expect(setNested(target, "constructor.polluted", "x")).toBe(false);
        expect(setNested(target, "a.__proto__.polluted", "x")).toBe(false);
        // The actual security property: an unrelated object must not have
        // inherited the polluted property via the prototype chain. (The
        // intermediate `a = {}` may be created before the forbidden segment
        // is detected, but that's a normal own-property on `target`, not
        // pollution of Object.prototype.)
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(target, "polluted")).toBe(false);
    });
});
