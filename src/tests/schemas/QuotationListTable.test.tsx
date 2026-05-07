import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataTable } from "../../components/widgets/data/DataTable";
import { WidgetConfig } from "@/types/widget";
import quotationsPageSchema from "../../../schemas/quotations.json";

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockHandleAction = jest.fn();
const mockPush = jest.fn();
const mockSearchParams = { current: new URLSearchParams() };

jest.mock("@/hooks/useActionHandler", () => ({
  useActionHandler: () => mockHandleAction,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/quotations",
  useSearchParams: () => mockSearchParams.current,
}));

// ─── Schema extraction ────────────────────────────────────────────────────────

// Pull the data-table child directly from the page schema
const tableSchema = (quotationsPageSchema as any).children.find(
  (c: any) => c.id === "quotations-table",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/** Builds a WidgetConfig from the real quotations-table schema with optional prop overrides. */
const makeConfig = (propsOverride: Record<string, any> = {}): WidgetConfig => ({
  id: tableSchema.id,
  type: tableSchema.type,
  props: {
    ...tableSchema.props,
    ...propsOverride,
  },
});

/** Sample rows that match the schema's accessorKeys. */
const mockRows = [
  {
    id: "q1",
    quotationNumber: "QT-001",
    effectiveDate: "2024-01-15",
    quotationType: "New Business",
    clientName: "Acme Corp",
    quotationClassification: "Group Term Life",
    riskTermClassification: "Yearly Renewable",
    quoteVersion: "V1",
    mainStatus: "Pending",
    secondaryStatus: "Draft",
    lineOfBusiness: "Group Life",
    transactionStatus: "Open",
    channel: "Broker",
    agentName: "John Doe",
    brokerName: "ABC Brokers",
    censusStatus: "Uploaded",
    membersCount: 120,
    plansCount: 3,
    fclStatus: "Computed",
    uwLoad: "Standard",
    payeeMode: "Annual",
    lastActivity: "2024-03-01",
    slaAge: 5,
  },
  {
    id: "q2",
    quotationNumber: "QT-002",
    effectiveDate: "2024-02-20",
    quotationType: "Renewal",
    clientName: "Beta Ltd",
    quotationClassification: "Group Credit Life",
    riskTermClassification: "Yearly Renewable",
    quoteVersion: "V2",
    mainStatus: "Pending",
    secondaryStatus: "Submitted",
    lineOfBusiness: "Group Life",
    transactionStatus: "Closed",
    channel: "Agent",
    agentName: "Jane Smith",
    brokerName: "XYZ Financial",
    censusStatus: "Approved",
    membersCount: 85,
    plansCount: 2,
    fclStatus: "Not computed",
    uwLoad: "Extra",
    payeeMode: "Monthly",
    lastActivity: "2024-03-10",
    slaAge: 12,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DataTable — quotations-table schema", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Schema Extraction ─────────────────────────────────────────────────────

  describe("Schema extraction", () => {
    it("extracts the quotations-table widget from the page schema", () => {
      expect(tableSchema).toBeDefined();
      expect(tableSchema.type).toBe("data-table");
      expect(tableSchema.id).toBe("quotations-table");
    });

    it("schema has 22 columns defined", () => {
      expect(tableSchema.props.columns).toHaveLength(22);
    });

    it("schema has 4 row actions defined", () => {
      expect(tableSchema.props.rowActions).toHaveLength(4);
    });
  });

  // ── Column Headers ────────────────────────────────────────────────────────

  describe("Column Headers", () => {
    it("renders all column headers from the schema", () => {
      render(<DataTable config={makeConfig()} />, { wrapper: createWrapper() });

      const expectedHeaders = [
        "Quotation Number",
        "Effective Date",
        "Quotation Type",
        "Client Name",
        "Quotation Classification",
        "Risk Term Classification",
        "Quote Version",
        "Main Status",
        "Secondary Status",
        "Line of Business",
        "Transaction Status",
        "Channel",
        "Agent Name",
        "Broker Name",
        "Census Status",
        "Members Count",
        "Plans Count",
        "FCL Status",
        "UW Load",
        "Payee Mode",
        "Last Activity",
        "SLA Age (Days)",
      ];

      expectedHeaders.forEach((header) => {
        expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
      });
    });

    it("renders Actions column header when rowActions exist", () => {
      render(<DataTable config={makeConfig()} />, { wrapper: createWrapper() });

      expect(screen.getByRole("columnheader", { name: /actions/i })).toBeInTheDocument();
    });

    it("renders select-all checkbox when selectable=true in schema", () => {
      render(<DataTable config={makeConfig()} />, { wrapper: createWrapper() });

      expect(screen.getByRole("checkbox", { name: /select all/i })).toBeInTheDocument();
    });
  });

  // ── Empty State ───────────────────────────────────────────────────────────

  describe("Empty State", () => {
    it("shows emptyState title from schema when data is empty", () => {
      render(<DataTable config={makeConfig({ data: [] })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("No pending quotations")).toBeInTheDocument();
    });

    it("shows emptyState description from schema when data is empty", () => {
      render(<DataTable config={makeConfig({ data: [] })} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText(
          "There are no pending quotations. Create a new quotation to get started.",
        ),
      ).toBeInTheDocument();
    });

    it("shows fallback empty text when no data prop provided", () => {
      render(<DataTable config={makeConfig()} />, { wrapper: createWrapper() });

      expect(screen.getByText("No pending quotations")).toBeInTheDocument();
    });
  });

  // ── Loading State ─────────────────────────────────────────────────────────

  describe("Loading State", () => {
    it("renders skeleton rows when isLoading=true", () => {
      const { container } = render(
        <DataTable config={makeConfig({ isLoading: true })} />,
        { wrapper: createWrapper() },
      );

      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });

    it("does not render data rows when isLoading=true", () => {
      render(
        <DataTable config={makeConfig({ isLoading: true, data: mockRows })} />,
        { wrapper: createWrapper() },
      );

      expect(screen.queryByText("QT-001")).not.toBeInTheDocument();
    });
  });

  // ── Error State ───────────────────────────────────────────────────────────

  describe("Error State", () => {
    it("shows error message when error=true", () => {
      render(<DataTable config={makeConfig({ error: true })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Error loading data")).toBeInTheDocument();
    });

    it("does not render table when error=true", () => {
      render(<DataTable config={makeConfig({ error: true })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  // ── Data Rendering ────────────────────────────────────────────────────────

  describe("Data Rendering", () => {
    it("renders a row for each data item", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      const rows = screen.getAllByRole("row");
      // +1 for header row
      expect(rows.length).toBe(mockRows.length + 1);
    });

    it("renders quotationNumber as a clickable link button", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      const linkBtn = screen.getByRole("button", { name: "QT-001" });
      expect(linkBtn).toBeInTheDocument();
    });

    it("clicking quotationNumber link calls navigate action with resolved route", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByRole("button", { name: "QT-001" }));

      expect(mockHandleAction).toHaveBeenCalledWith({
        type: "navigate",
        target: "/quotations/q1",
      });
    });

    it("renders text columns (clientName, quotationType, channel) correctly", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("New Business")).toBeInTheDocument();
      expect(screen.getByText("Broker")).toBeInTheDocument();
    });

    it("renders number columns (membersCount, plansCount, slaAge) correctly", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("120")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("renders mainStatus badge using valueMapping label", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      // Both rows have mainStatus = "Pending"
      const badges = screen.getAllByText("Pending");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it("renders censusStatus badge — Uploaded and Approved from schema valueMapping", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Uploaded")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("renders fclStatus badge — Computed and Not computed from schema valueMapping", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Computed")).toBeInTheDocument();
      expect(screen.getByText("Not computed")).toBeInTheDocument();
    });

    it("renders dash placeholder for null/undefined cell values", () => {
      const rowWithNull = [{ ...mockRows[0], agentName: null, brokerName: undefined }];
      render(<DataTable config={makeConfig({ data: rowWithNull })} />, {
        wrapper: createWrapper(),
      });

      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Row Actions ───────────────────────────────────────────────────────────

  describe("Row Actions", () => {
    it("renders dropdown trigger (MoreHorizontal) because schema has 4 row actions (> 2 inline limit)", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      // One per row
      const menuButtons = screen.getAllByRole("button", { name: /open menu/i });
      expect(menuButtons).toHaveLength(mockRows.length);
    });

    it("opens dropdown and shows all 4 row action labels from schema", async () => {
      const user = userEvent.setup();
      render(<DataTable config={makeConfig({ data: [mockRows[0]] })} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("button", { name: /open menu/i }));

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /open/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /clone/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /version/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /withdraw/i })).toBeInTheDocument();
      });
    });

    it("schema rowActions contain correct action types", () => {
      const actionTypes = tableSchema.props.rowActions.map((a: any) => a.type);
      expect(actionTypes).toContain("navigate");
      expect(actionTypes).toContain("api-mutation");
    });

    it("schema Withdraw action has confirm dialog config", () => {
      const withdrawAction = tableSchema.props.rowActions.find(
        (a: any) => a.id === "withdraw",
      );
      expect(withdrawAction.confirm).toBeDefined();
      expect(withdrawAction.confirm.title).toBe("Withdraw Action");
      expect(withdrawAction.variant).toBe("destructive");
    });
  });

  // ── Row Selection ─────────────────────────────────────────────────────────

  describe("Row Selection", () => {
    it("renders individual checkboxes for each row", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      // select-all + one per row
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(mockRows.length + 1);
    });

    it("checking select-all selects all rows on current page", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      const selectAll = screen.getByRole("checkbox", { name: /select all/i });
      fireEvent.click(selectAll);

      const rowCheckboxes = screen
        .getAllByRole("checkbox")
        .filter((cb) => cb !== selectAll);
      rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());
    });

    it("shows bulk action bar with item count after selecting rows", () => {
      render(
        <DataTable
          config={makeConfig({
            data: mockRows,
            bulkActions: [{ id: "export", label: "Export", type: "api-mutation" }],
          })}
        />,
        { wrapper: createWrapper() },
      );

      const selectAll = screen.getByRole("checkbox", { name: /select all/i });
      fireEvent.click(selectAll);

      expect(screen.getByText(/2 items selected/i)).toBeInTheDocument();
    });

    it("Clear selection button deselects all rows", () => {
      render(
        <DataTable
          config={makeConfig({
            data: mockRows,
            bulkActions: [{ id: "export", label: "Export", type: "api-mutation" }],
          })}
        />,
        { wrapper: createWrapper() },
      );

      const selectAll = screen.getByRole("checkbox", { name: /select all/i });
      fireEvent.click(selectAll);

      fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));

      expect(screen.queryByText(/items selected/i)).not.toBeInTheDocument();
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  describe("Pagination", () => {
    it("schema has pagination enabled with pageSize 20", () => {
      expect(tableSchema.props.pagination.enabled).toBe(true);
      expect(tableSchema.props.pagination.pageSize).toBe(20);
    });

    it("schema pageSizeOptions are [10, 20, 50, 100]", () => {
      expect(tableSchema.props.pagination.pageSizeOptions).toEqual([10, 20, 50, 100]);
    });

    it("does not show pagination controls when data has fewer rows than pageSize", () => {
      render(<DataTable config={makeConfig({ data: mockRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    });

    it("shows Previous/Next buttons when data exceeds pageSize", () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        ...mockRows[0],
        id: `q${i + 1}`,
        quotationNumber: `QT-${String(i + 1).padStart(3, "0")}`,
      }));

      render(<DataTable config={makeConfig({ data: manyRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("Previous button is disabled on page 1", () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        ...mockRows[0],
        id: `q${i + 1}`,
        quotationNumber: `QT-${String(i + 1).padStart(3, "0")}`,
      }));

      render(<DataTable config={makeConfig({ data: manyRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    });

    it("shows page indicator text on paginated data", () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        ...mockRows[0],
        id: `q${i + 1}`,
        quotationNumber: `QT-${String(i + 1).padStart(3, "0")}`,
      }));

      render(<DataTable config={makeConfig({ data: manyRows })} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });

    it("clicking Next navigates to page 2", () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        ...mockRows[0],
        id: `q${i + 1}`,
        quotationNumber: `QT-${String(i + 1).padStart(3, "0")}`,
      }));

      render(<DataTable config={makeConfig({ data: manyRows })} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
      // Next is now disabled on last page
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });
  });

  // ── Schema Config Integrity ───────────────────────────────────────────────

  describe("Schema Config Integrity", () => {
    it("quotationNumber column has linkRoute pointing to /quotations/:id", () => {
      const col = tableSchema.props.columns.find(
        (c: any) => c.id === "quotationNumber",
      );
      expect(col.type).toBe("link");
      expect(col.linkRoute).toBe("/quotations/:id");
    });

    it("mainStatus column has type=badge with Pending valueMapping", () => {
      const col = tableSchema.props.columns.find((c: any) => c.id === "mainStatus");
      expect(col.type).toBe("badge");
      expect(col.valueMapping).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "Pending", color: "warning" }),
        ]),
      );
    });

    it("censusStatus column has all 4 valueMapping entries", () => {
      const col = tableSchema.props.columns.find((c: any) => c.id === "censusStatus");
      expect(col.valueMapping).toHaveLength(4);
      const values = col.valueMapping.map((m: any) => m.value);
      expect(values).toEqual(
        expect.arrayContaining(["Not started", "Uploaded", "Exceptions", "Approved"]),
      );
    });

    it("fclStatus column has all 3 valueMapping entries", () => {
      const col = tableSchema.props.columns.find((c: any) => c.id === "fclStatus");
      expect(col.valueMapping).toHaveLength(3);
      const values = col.valueMapping.map((m: any) => m.value);
      expect(values).toEqual(
        expect.arrayContaining(["Not computed", "Computed", "Evidence pending"]),
      );
    });

    it("defaultSort is on effectiveDate descending", () => {
      expect(tableSchema.props.defaultSort).toEqual({
        field: "effectiveDate",
        direction: "desc",
      });
    });

    it("searchable is true and searchPlaceholder matches schema", () => {
      expect(tableSchema.props.searchable).toBe(true);
      expect(tableSchema.props.searchPlaceholder).toBe(
        "Search quotations by number or client...",
      );
    });

    it("selectable is true in schema", () => {
      expect(tableSchema.props.selectable).toBe(true);
    });

    it("emptyState action label is Create New Quotation", () => {
      expect(tableSchema.props.emptyState.action.label).toBe("Create New Quotation");
    });

    it("dataSource API endpoint is /api/quotations with GET method", () => {
      expect(tableSchema.dataSource.api.endpoint).toBe("/api/quotations");
      expect(tableSchema.dataSource.api.method).toBe("GET");
    });
  });
});
