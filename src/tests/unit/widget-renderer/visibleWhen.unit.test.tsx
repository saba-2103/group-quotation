import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WidgetRenderer } from "@/components/registry/WidgetRenderer";
import { WidgetRegistry } from "@/components/registry/WidgetRegistry";
import { RoleContext, type RoleContextValue } from "@/contexts/RoleContext";
import { useWidgetState } from "@/hooks/useWidgetState";
import type { WidgetConfig } from "@/types/widget";

// ─── Stub widget used by every test ─────────────────────────────────────────
// We register a minimal "test-stub" widget into the live WidgetRegistry rather
// than build a parallel harness — mirrors how the registry is consumed in
// production. Render-counting via the rendered DOM is enough; we don't need
// to spy on useSmartQuery directly because a widget that fails the visibility
// gate never renders and useSmartQuery is short-circuited via the
// `isRoleHidden || isConditionHidden ? undefined : config.dataSource` arg.

const TestStub: React.FC<{ config: WidgetConfig }> = ({ config }) => (
  <div data-testid={`stub-${config.id}`}>stub:{config.id}</div>
);

beforeAll(() => {
  WidgetRegistry["test-stub"] = TestStub;
});

afterAll(() => {
  delete WidgetRegistry["test-stub"];
});

beforeEach(() => {
  useWidgetState.getState().resetAll();
});

// ─── Render helper ──────────────────────────────────────────────────────────

const renderWidget = (
  config: WidgetConfig,
  roleValue: RoleContextValue = { role: "maker", setRole: () => {} },
) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RoleContext.Provider value={roleValue}>
        <WidgetRenderer config={config} />
      </RoleContext.Provider>
    </QueryClientProvider>,
  );

const stub = (overrides: Partial<WidgetConfig> = {}): WidgetConfig => ({
  id: "w1",
  type: "test-stub",
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("WidgetRenderer — visibleWhen gate", () => {
  it("renders when visibleWhen is absent (no-op for the absence path)", () => {
    renderWidget(stub());
    expect(screen.getByTestId("stub-w1")).toBeInTheDocument();
  });

  it("renders when visibleWhen evaluates truthy against useWidgetState", () => {
    useWidgetState.getState().setValue("mode", "edit");
    renderWidget(
      stub({
        visibleWhen: { "==": [{ var: "mode" }, "edit"] },
      }),
    );
    expect(screen.getByTestId("stub-w1")).toBeInTheDocument();
  });

  it("hides (returns null) when visibleWhen evaluates falsy", () => {
    useWidgetState.getState().setValue("mode", "view");
    renderWidget(
      stub({
        visibleWhen: { "==": [{ var: "mode" }, "edit"] },
      }),
    );
    expect(screen.queryByTestId("stub-w1")).not.toBeInTheDocument();
  });

  it("uses stateDependencies to slice eval context — key NOT in deps is invisible to predicate", () => {
    // Store has BOTH a and b. The predicate inspects `b`. With deps=['a'],
    // the eval context is { a: 1 } (b is undefined), so the predicate
    // returns false even though the underlying store value of b would
    // otherwise satisfy it. Proves slicing actually filters context.
    useWidgetState.getState().setValue("a", 1);
    useWidgetState.getState().setValue("b", 2);
    renderWidget(
      stub({
        dataSource: { stateDependencies: ["a"] },
        visibleWhen: { "==": [{ var: "b" }, 2] },
      }),
    );
    expect(screen.queryByTestId("stub-w1")).not.toBeInTheDocument();
  });

  it("uses stateDependencies to slice eval context — key IN deps is visible to predicate", () => {
    // Same store, predicate now inspects `a` which IS in deps. Should render.
    useWidgetState.getState().setValue("a", 1);
    useWidgetState.getState().setValue("b", 2);
    renderWidget(
      stub({
        dataSource: { stateDependencies: ["a"] },
        visibleWhen: { "==": [{ var: "a" }, 1] },
      }),
    );
    expect(screen.getByTestId("stub-w1")).toBeInTheDocument();
  });

  it("defaults to visible when visibleWhen throws (broken predicate)", () => {
    // json-logic-js throws on unrecognized operations. Confirms the try/catch
    // path: hidden-and-wrong is silent and the wrong choice; visible-but-
    // wrong surfaces the bug to whoever wrote the schema.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    renderWidget(
      stub({
        visibleWhen: { badop: [] },
      }),
    );
    expect(screen.getByTestId("stub-w1")).toBeInTheDocument();
    // Dev-mode warning emitted (NODE_ENV in jest is 'test', not 'production').
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("visibleRoles takes precedence — role-hidden skips visibleWhen evaluation", () => {
    // Predicate would throw if evaluated. Asserts the role gate short-
    // circuits before visibleWhen runs (no warning, no render).
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    renderWidget(
      stub({
        visibleRoles: ["checker"], // current role is 'maker'
        visibleWhen: { badop: [] }, // would throw if reached
      }),
    );
    expect(screen.queryByTestId("stub-w1")).not.toBeInTheDocument();
    // No "visibleWhen evaluation threw" warning — the predicate was never
    // evaluated. (Other warnings from unrelated paths are tolerated.)
    const visibleWhenWarn = warnSpy.mock.calls.find((args) =>
      typeof args[0] === "string"
      && args[0].includes("visibleWhen evaluation threw"),
    );
    expect(visibleWhenWarn).toBeUndefined();
    warnSpy.mockRestore();
  });
});
