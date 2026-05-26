import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilterBar } from "../../../components/widgets/controls/FilterBar";
import { WidgetConfig } from "@/types/widget";
import quotationsPageSchema from "../../../../schemas/quotations.json";

// ─── Mock dependencies ────────────────────────────────────────────────────────
// The current FilterBar dispatches `update-widget-state` actions through
// useActionHandler instead of pushing URL query params via next/router. These
// tests assert against that contract.

const mockHandleAction = jest.fn();
jest.mock("@/hooks/useActionHandler", () => ({
  useActionHandler: () => mockHandleAction,
}));

// Mutable backing store for useWidgetState — lets tests preload active filter
// values to simulate "URL params were already present" scenarios.
const mockState: { values: Record<string, Record<string, unknown>> } = { values: {} };

jest.mock("@/hooks/useWidgetState", () => ({
  useWidgetState: () => ({
    getValue: (key: string, defaultValue?: unknown) =>
      mockState.values[key] ?? defaultValue ?? {},
    setValue: (key: string, value: Record<string, unknown>) => {
      mockState.values[key] = value;
    },
    patchValue: (key: string, value: Record<string, unknown>) => {
      mockState.values[key] = { ...(mockState.values[key] ?? {}), ...value };
    },
    resetKey: (key: string) => {
      delete mockState.values[key];
    },
    resetAll: () => {
      mockState.values = {};
    },
  }),
}));

// ─── Schema extraction ────────────────────────────────────────────────────────

const filtersSchema = (quotationsPageSchema as any).children.find(
  (c: any) => c.id === "quotations-filters",
);
const allFilters: any[] = filtersSchema.props.filters;
const selectFilters = allFilters.filter((f: any) => f.type === "select" && f.options);
const dateFilters = allFilters.filter((f: any) => f.type === "date");
const stateKey: string = filtersSchema.props.stateKey ?? filtersSchema.id;
const searchKey: string = filtersSchema.props.searchKey ?? "q";

const filterConfig: WidgetConfig = {
  id: filtersSchema.id,
  type: filtersSchema.type,
  props: filtersSchema.props,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderFilters = (initialActiveValues: Record<string, unknown> = {}) => {
  mockState.values = { [stateKey]: initialActiveValues };
  return render(<FilterBar config={filterConfig} />, { wrapper: createWrapper() });
};

const expectPatchAction = (filterId: string, value: string) =>
  expect(mockHandleAction).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "update-widget-state",
      props: expect.objectContaining({
        key: stateKey,
        operation: "patch",
        value: expect.objectContaining({ [filterId]: value }),
      }),
    }),
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FilterBar — unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.values = {};
  });

  // ── 1. Rendering ──────────────────────────────────────────────────────────

  describe("Rendering", () => {
    it("renders search input", () => {
      renderFilters();
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders Filter trigger button", () => {
      renderFilters();
      expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument();
    });

    it("does not show applied filter chips when no params are active", () => {
      renderFilters();
      expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
    });
  });

  // ── 2. Filter Dropdown — Labels ───────────────────────────────────────────

  describe("Filter Dropdown — Labels from schema", () => {
    it("shows all select filter labels from schema when dropdown is opened", async () => {
      const user = userEvent.setup();
      renderFilters();

      await user.click(screen.getByRole("button", { name: /filter/i }));

      await waitFor(() => {
        selectFilters.forEach((f: any) => {
          expect(screen.getByText(f.label)).toBeInTheDocument();
        });
      });
    });

    it("does not show date filter labels inside the dropdown", async () => {
      const user = userEvent.setup();
      renderFilters();

      await user.click(screen.getByRole("button", { name: /filter/i }));
      await waitFor(() =>
        expect(screen.getByText(selectFilters[0].label)).toBeInTheDocument(),
      );

      dateFilters.forEach((f: any) => {
        expect(screen.queryByText(f.label)).not.toBeInTheDocument();
      });
    });
  });

  // ── 3. Filter Dropdown — Options ─────────────────────────────────────────

  describe("Filter Dropdown — Options from schema", () => {
    it("each select filter shows all its options from schema when opened", async () => {
      const user = userEvent.setup();

      for (const filter of selectFilters) {
        const { unmount } = renderFilters();

        await user.click(screen.getByRole("button", { name: /filter/i }));
        await waitFor(() => expect(screen.getByText(filter.label)).toBeInTheDocument());
        const subTrigger = screen.getByText(filter.label);
        await act(async () => {
          subTrigger.focus();
        });
        fireEvent.keyDown(subTrigger, { key: "ArrowRight" });

        await waitFor(() => {
          filter.options.forEach((opt: any) => {
            expect(screen.getByText(opt.label)).toBeInTheDocument();
          });
        });

        unmount();
      }
    });
  });

  // ── 4. Filter Selection → dispatches widget-state patch ──────────────────

  describe("Filter Selection", () => {
    it("dispatches a patch action with key=value when an option is selected", async () => {
      const user = userEvent.setup();
      const firstFilter = selectFilters[0];
      const firstOption = firstFilter.options[0];

      renderFilters();

      await user.click(screen.getByRole("button", { name: /filter/i }));
      await waitFor(() => expect(screen.getByText(firstFilter.label)).toBeInTheDocument());
      const subTrigger = screen.getByText(firstFilter.label);
      await act(async () => {
        subTrigger.focus();
      });
      fireEvent.keyDown(subTrigger, { key: "ArrowRight" });
      await waitFor(() => expect(screen.getByText(firstOption.label)).toBeInTheDocument());
      await user.click(screen.getByText(firstOption.label));

      await waitFor(() => expectPatchAction(firstFilter.id, firstOption.value));
    });

    it("dispatches a patch for each select filter's first option", async () => {
      const user = userEvent.setup();

      for (const filter of selectFilters) {
        jest.clearAllMocks();
        const firstOption = filter.options[0];
        const { unmount } = renderFilters();

        await user.click(screen.getByRole("button", { name: /filter/i }));
        await waitFor(() => expect(screen.getByText(filter.label)).toBeInTheDocument());
        const subTrigger = screen.getByText(filter.label);
        await act(async () => {
          subTrigger.focus();
        });
        fireEvent.keyDown(subTrigger, { key: "ArrowRight" });
        await waitFor(() => expect(screen.getByText(firstOption.label)).toBeInTheDocument());
        await user.click(screen.getByText(firstOption.label));

        await waitFor(() => expectPatchAction(filter.id, firstOption.value));

        unmount();
      }
    });
  });

  // ── 5. Applied Filter Chips ───────────────────────────────────────────────

  describe("Applied Filter Chips", () => {
    it("shows chip with label matching schema filter label and option label", () => {
      const filter = selectFilters[0];
      const option = filter.options[0];

      renderFilters({ [filter.id]: option.value });

      expect(
        screen.getByText(`${filter.label}: ${option.label}`),
      ).toBeInTheDocument();
    });

    it("shows chips for all active filter params", () => {
      const active: Record<string, unknown> = {};
      selectFilters.slice(0, 2).forEach((f: any) => {
        active[f.id] = f.options[0].value;
      });

      renderFilters(active);

      selectFilters.slice(0, 2).forEach((f: any) => {
        expect(
          screen.getByText(`${f.label}: ${f.options[0].label}`),
        ).toBeInTheDocument();
      });
    });

    it("shows Clear all button when any filter param is active", () => {
      const filter = selectFilters[0];
      renderFilters({ [filter.id]: filter.options[0].value });
      expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
    });

    it("clicking Clear all dispatches a `set` action with empty value", async () => {
      const user = userEvent.setup();
      const filter = selectFilters[0];
      renderFilters({ [filter.id]: filter.options[0].value });

      await user.click(screen.getByRole("button", { name: /clear all/i }));

      expect(mockHandleAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "update-widget-state",
          props: expect.objectContaining({
            key: stateKey,
            operation: "set",
            value: {},
          }),
        }),
      );
    });

    it("clicking chip X dispatches a patch that clears that filter's value", async () => {
      const user = userEvent.setup();
      const filter = selectFilters[0];
      renderFilters({ [filter.id]: filter.options[0].value });

      // The chip label is e.g. "Branch: Mumbai" — the X button is inside the same Badge element
      const chipLabel = screen.getByText(`${filter.label}: ${filter.options[0].label}`);
      const chipBadge = chipLabel.closest("div");
      const removeBtn = chipBadge!.querySelector("button");
      await user.click(removeBtn!);

      await waitFor(() => expectPatchAction(filter.id, ""));
    });
  });

  // ── 6. Search Input ───────────────────────────────────────────────────────

  describe("Search Input", () => {
    it("dispatches a patch with the search key when user types in search", () => {
      renderFilters();

      // fireEvent.change sends the full value in one event, avoiding per-keystroke calls
      fireEvent.change(screen.getByPlaceholderText("Search..."), {
        target: { value: "acme" },
      });

      // Search may be debounced — wait briefly then check the most recent call.
      return waitFor(
        () => {
          expect(mockHandleAction).toHaveBeenCalledWith(
            expect.objectContaining({
              type: "update-widget-state",
              props: expect.objectContaining({
                key: stateKey,
                operation: "patch",
                value: expect.objectContaining({ [searchKey]: "acme" }),
              }),
            }),
          );
        },
        { timeout: 2000 },
      );
    });

    it("reflects existing search-key value in the search input", () => {
      renderFilters({ [searchKey]: "test" });
      expect(screen.getByPlaceholderText("Search...")).toHaveValue("test");
    });
  });

  // ── 7. Schema Integrity ───────────────────────────────────────────────────

  describe("Schema Integrity", () => {
    it("has correct total filter count from schema", () => {
      expect(allFilters.length).toBe(dateFilters.length + selectFilters.length);
    });

    it("all select filters have at least one option", () => {
      selectFilters.forEach((f: any) => {
        expect(f.options.length).toBeGreaterThan(0);
      });
    });

    it("all select filter options have non-empty value and label", () => {
      selectFilters.forEach((f: any) => {
        f.options.forEach((opt: any) => {
          expect(opt.value).toBeTruthy();
          expect(opt.label).toBeTruthy();
        });
      });
    });

    it("all date filters have a field and placeholder defined", () => {
      dateFilters.forEach((f: any) => {
        expect(f.field).toBeTruthy();
        expect(f.placeholder).toBeTruthy();
      });
    });
  });
});
