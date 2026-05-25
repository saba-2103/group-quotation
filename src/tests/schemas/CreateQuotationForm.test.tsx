import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormContainer } from "../../components/widgets/forms/formContainer";
import { WidgetConfig } from "@/types/widget";
import createQuotationSchema from "../../../schemas/forms/create-quotation-form.json";

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockHandleAction = jest.fn();
jest.mock("@/hooks/useActionHandler", () => ({
  useActionHandler: () => mockHandleAction,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/**
 * Builds a WidgetConfig from the real create-quotation-form.json schema.
 * Accepts optional prop overrides so individual tests can narrow the config
 * (e.g. replace fields, columns, mode) without inventing data.
 */
const makeConfig = (propsOverride: Record<string, any> = {}): WidgetConfig => ({
  id: "create-quotation-form",
  type: createQuotationSchema.type,
  props: {
    ...createQuotationSchema.props,
    ...propsOverride,
  },
});

/**
 * Build a config where the date-typed fields have a defaultValue, so
 * submission flow tests don't have to drive the popover-based date picker
 * (testing-library can't `user.type()` into a button). The date picker's
 * own UX is covered by dedicated CalendarDatePicker tests.
 */
const makeConfigWithDateDefaults = (
  dateDefaults: Record<string, string> = { effectiveDate: "2024-06-01" },
  propsOverride: Record<string, any> = {},
): WidgetConfig => {
  const baseFields = (createQuotationSchema.props as any).fields ?? [];
  const fields = baseFields.map((f: any) =>
    f.type === "date" && dateDefaults[f.name]
      ? { ...f, defaultValue: dateDefaults[f.name] }
      : f,
  );
  return makeConfig({ ...propsOverride, fields });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FormContainer — create-quotation-form", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Field Rendering ──────────────────────────────────────────────────────────

  describe("Field Rendering", () => {
    it("renders all fields from the real schema", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText(/Client Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Policy Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tranno/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Effective Date/i)).toBeInTheDocument();
    });

    it("renders disabled Quotation Number field", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText(/Quotation Number/i)).toBeDisabled();
    });

    it("renders placeholder text on text fields", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByPlaceholderText("Enter client name"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter policy number"),
      ).toBeInTheDocument();
      // Master Policy Number is hidden by default
      expect(
        screen.queryByPlaceholderText("Enter master policy number"),
      ).not.toBeInTheDocument();
    });

    it("renders select fields (Policy Type, Branch, etc.) as comboboxes", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      // isMasterPolicy, policyType, branch, policyClassification, riskTermClassification, productMix
      const combos = screen.getAllByRole("combobox");
      expect(combos.length).toBeGreaterThanOrEqual(5);
    });

    it("renders Create Quotation and Cancel action buttons", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByRole("button", { name: /Create Quotation/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i }),
      ).toBeInTheDocument();
    });
  });

  // ── Default Values ───────────────────────────────────────────────────────────

  describe("Default Values", () => {
    it('pre-selects Policy Type as "Group Term Life" (defaultValue from schema)', () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      // Radix Select renders the label in the trigger span AND a hidden <option>; check at least one visible span
      const matches = screen.getAllByText("Group Term Life");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('pre-selects Is Master Policy as "No" (defaultValue from schema)', () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const matches = screen.getAllByText("No");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('pre-selects Policy Classification as "True Group" (defaultValue from schema)', () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const matches = screen.getAllByText("True Group");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('pre-selects Risk Term Classification as "Yearly Renewable" (defaultValue from schema)', () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const matches = screen.getAllByText("Yearly Renewable");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Column Layout ────────────────────────────────────────────────────────────

  describe("Column Layout", () => {
    it("applies 2-column grid from schema columns=2", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const grid = document.querySelector(".md\\:grid-cols-2");
      expect(grid).toBeInTheDocument();
      expect(grid).not.toHaveClass("lg:grid-cols-3");
    });

    it("Client Name field has col-span-2 (span: 2 in schema)", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const formItem = screen
        .getByLabelText(/Client Name/i)
        .closest(".col-span-2");
      expect(formItem).toBeInTheDocument();
    });

    it("Effective Date field has col-span-2 (span: 2 in schema)", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const formItem = screen
        .getByLabelText(/Effective Date/i)
        .closest(".col-span-2");
      expect(formItem).toBeInTheDocument();
    });
  });

  // ── Validation ───────────────────────────────────────────────────────────────

  describe("Validation", () => {
    it('shows "Client name is required" when submitting without client name', async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      await user.click(
        screen.getByRole("button", { name: /Create Quotation/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Client name is required")).toBeInTheDocument();
      });
    });

    it("does NOT call action handler when required fields are missing", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      await user.click(
        screen.getByRole("button", { name: /Create Quotation/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Client name is required")).toBeInTheDocument();
      });
      expect(mockHandleAction).not.toHaveBeenCalled();
    });
  });

  // ── Form Submission ──────────────────────────────────────────────────────────

  describe("Form Submission", () => {
    it("calls action handler with api-mutation and POST to /api/quotations on valid submit", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfigWithDateDefaults()} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/Client Name/i), "Acme Corp");
      await user.click(
        screen.getByRole("button", { name: /Create Quotation/i }),
      );

      await waitFor(() => {
        expect(mockHandleAction).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "api-mutation",
            api: expect.objectContaining({
              endpoint: "/api/quotations",
              method: "POST",
              body: expect.objectContaining({ clientName: "Acme Corp" }),
            }),
          }),
        );
      });
    });

    it("includes all user-entered field values in the submission body", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfigWithDateDefaults()} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/Client Name/i), "Test Client");
      await user.type(screen.getByLabelText(/Policy Number/i), "POL-123");
      await user.type(screen.getByLabelText(/Tranno/i), "TRN-456");
      await user.click(
        screen.getByRole("button", { name: /Create Quotation/i }),
      );

      await waitFor(() => {
        expect(mockHandleAction).toHaveBeenCalledWith(
          expect.objectContaining({
            api: expect.objectContaining({
              body: expect.objectContaining({
                clientName: "Test Client",
                policyNumber: "POL-123",
                tranno: "TRN-456",
              }),
            }),
          }),
        );
      });
    });

    it("cancel button calls action handler with cancel action config", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("button", { name: /Cancel/i }));

      expect(mockHandleAction).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cancel", submitAction: false }),
      );
    });
  });

  // ── visibleWhen — Master Policy Number ──────────────────────────────────────

  describe("visibleWhen — Master Policy Number", () => {
    it("hides Master Policy Number when Is Master Policy = No (default)", () => {
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.queryByLabelText(/Master Policy Number/i),
      ).not.toBeInTheDocument();
    });

    it("shows Master Policy Number when Is Master Policy is changed to Yes", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      await user.click(
        screen.getByRole("combobox", { name: /Is it Master Policy/i }),
      );
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Yes" })).toBeInTheDocument();
      });
      await user.click(screen.getByRole("option", { name: "Yes" }));

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Master Policy Number/i),
        ).toBeInTheDocument();
      });
    });

    it("hides Master Policy Number again when reverted back to No", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      // Open and select Yes
      await user.click(
        screen.getByRole("combobox", { name: /Is it Master Policy/i }),
      );
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Yes" })).toBeInTheDocument();
      });
      await user.click(screen.getByRole("option", { name: "Yes" }));
      await waitFor(() => {
        expect(
          screen.getByLabelText(/Master Policy Number/i),
        ).toBeInTheDocument();
      });

      // Open again and select No
      await user.click(
        screen.getByRole("combobox", { name: /Is it Master Policy/i }),
      );
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "No" })).toBeInTheDocument();
      });
      await user.click(screen.getByRole("option", { name: "No" }));
      await waitFor(() => {
        expect(
          screen.queryByLabelText(/Master Policy Number/i),
        ).not.toBeInTheDocument();
      });
    });

    it("excludes Master Policy Number from submission body when hidden", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfigWithDateDefaults()} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/Client Name/i), "Acme Corp");
      await user.click(
        screen.getByRole("button", { name: /Create Quotation/i }),
      );

      await waitFor(() => {
        expect(mockHandleAction).toHaveBeenCalledWith(
          expect.objectContaining({
            api: expect.objectContaining({
              body: expect.not.objectContaining({
                masterPolicyNumber: expect.anything(),
              }),
            }),
          }),
        );
      });
    });

    it("includes Master Policy Number in submission body when visible and filled", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfigWithDateDefaults()} />, {
        wrapper: createWrapper(),
      });

      const combos = screen.getAllByRole("combobox");
      await user.click(combos[0]);
      await user.click(screen.getByRole("option", { name: "Yes" }));

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Master Policy Number/i),
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByLabelText(/Master Policy Number/i),
        "MASTER-001",
      );
      await user.type(screen.getByLabelText(/Client Name/i), "Acme Corp");
      await user.click(
        screen.getByRole("button", { name: /Create Quotation/i }),
      );

      await waitFor(() => {
        expect(mockHandleAction).toHaveBeenCalledWith(
          expect.objectContaining({
            api: expect.objectContaining({
              body: expect.objectContaining({
                isMasterPolicy: "yes",
                masterPolicyNumber: "MASTER-001",
              }),
            }),
          }),
        );
      });
    });
  });

  // ── Field Input Interactions ─────────────────────────────────────────────────

  describe("Field Input Interactions", () => {
    it("does not allow typing in disabled Quotation Number field", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      const disabledInput = screen.getByLabelText(/Quotation Number/i);
      await user.type(disabledInput, "QBAG999");

      expect(disabledInput).toHaveValue("");
    });

    it("allows selecting Mumbai from the Branch dropdown", async () => {
      const user = userEvent.setup();
      render(<FormContainer config={makeConfig()} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole("combobox", { name: /Branch/i }));
      await waitFor(() => {
        expect(
          screen.getByRole("option", { name: "Mumbai" }),
        ).toBeInTheDocument();
      });
      await user.click(screen.getByRole("option", { name: "Mumbai" }));

      await waitFor(() => {
        expect(screen.getAllByText("Mumbai").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("does not render action section when actions array is empty", () => {
      render(<FormContainer config={makeConfig({ actions: [] })} />, {
        wrapper: createWrapper(),
      });

      // Field-level controls (e.g. the date picker's popover trigger) may
      // still render buttons even when no actions are configured. Narrow the
      // assertion to the named action buttons from the schema.
      const schemaActions = (createQuotationSchema as any).props?.actions ?? [];
      schemaActions.forEach((act: { label?: string }) => {
        if (act.label) {
          expect(
            screen.queryByRole("button", { name: new RegExp(act.label, "i") }),
          ).not.toBeInTheDocument();
        }
      });
      expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });
  });
});
