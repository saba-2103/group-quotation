import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormContainer } from "../../../components/widgets/forms/formContainer";
import { WidgetConfig } from "@/types/widget";

// ─── Mock dependencies ────────────────────────────────────────────────────────
// jest.mock is hoisted by Jest — must stay at module level, cannot be inside a function.

const mockHandleAction = jest.fn();
jest.mock("@/hooks/useActionHandler", () => ({
  useActionHandler: () => mockHandleAction,
}));

const makeConfig = (props: Record<string, any> = {}): WidgetConfig => ({
  id: "test-form",
  type: "form-container",
  props,
});

const renderForm = (config: WidgetConfig, actionSpy?: jest.Mock) => {
  if (actionSpy) {
    mockHandleAction.mockImplementation((...args) => actionSpy(...args));
  }
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FormContainer config={config} />
    </QueryClientProvider>,
  );
};

const submitAction = {
  id: "submit",
  label: "Submit",
  variant: "default",
  type: "api-mutation",
  submitAction: true,
  api: { endpoint: "/api/test", method: "POST" },
};

const cancelAction = {
  id: "cancel",
  label: "Cancel",
  variant: "outline",
  submitAction: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FormContainer — unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Field Type Rendering ──────────────────────────────────────────────────

  describe("Field Type Rendering", () => {
    const field = (overrides: Record<string, any>) => ({
      id: "f1",
      name: "f1",
      label: "Test Field",
      order: 1,
      ...overrides,
    });

    it("renders a text field as input[type=text]", () => {
      renderForm(makeConfig({ fields: [field({ type: "text" })] }));
      expect(screen.getByLabelText(/Test Field/i)).toHaveAttribute(
        "type",
        "text",
      );
    });

    it("renders a textarea field as a <textarea> element", () => {
      renderForm(makeConfig({ fields: [field({ type: "textarea" })] }));
      expect(screen.getByRole("textbox").tagName.toLowerCase()).toBe(
        "textarea",
      );
    });

    it("renders a select field as a combobox", () => {
      renderForm(
        makeConfig({
          fields: [
            field({
              type: "select",
              options: [
                { value: "a", label: "Option A" },
                { value: "b", label: "Option B" },
              ],
            }),
          ],
        }),
      );
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders radio options as radio inputs", () => {
      renderForm(
        makeConfig({
          fields: [
            field({
              type: "radio",
              options: [
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ],
            }),
          ],
        }),
      );
      expect(screen.getAllByRole("radio")).toHaveLength(2);
    });

    it("renders a checkbox field as a checkbox input", () => {
      renderForm(makeConfig({ fields: [field({ type: "checkbox" })] }));
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("renders disabled field as disabled", () => {
      renderForm(
        makeConfig({ fields: [field({ type: "text", disabled: true })] }),
      );
      expect(screen.getByLabelText(/Test Field/i)).toBeDisabled();
    });
  });

  // ── 2. Default Values ────────────────────────────────────────────────────────

  describe("Default Values", () => {
    it("pre-fills a text field with defaultValue", () => {
      renderForm(
        makeConfig({
          fields: [
            {
              id: "name",
              name: "name",
              label: "Name",
              type: "text",
              order: 1,
              defaultValue: "John Doe",
            },
          ],
        }),
      );
      expect(screen.getByLabelText(/Name/i)).toHaveValue("John Doe");
    });

    it("pre-selects a select field with defaultValue", () => {
      renderForm(
        makeConfig({
          fields: [
            {
              id: "status",
              name: "status",
              label: "Status",
              type: "select",
              order: 1,
              defaultValue: "active",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ],
        }),
      );
      const matches = screen.getAllByText("Active");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("checkbox defaults to unchecked when no defaultValue", () => {
      renderForm(
        makeConfig({
          fields: [
            {
              id: "agree",
              name: "agree",
              label: "Agree",
              type: "checkbox",
              order: 1,
            },
          ],
        }),
      );
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("checkbox is checked when defaultValue is true", () => {
      renderForm(
        makeConfig({
          fields: [
            {
              id: "agree",
              name: "agree",
              label: "Agree",
              type: "checkbox",
              order: 1,
              defaultValue: true,
            },
          ],
        }),
      );
      expect(screen.getByRole("checkbox")).toBeChecked();
    });
  });

  // ── 3. Column Layout ─────────────────────────────────────────────────────────

  describe("Column Layout", () => {
    it("applies col-span-2 wrapper when field has span: 2", () => {
      renderForm(
        makeConfig({
          columns: 2,
          fields: [
            {
              id: "desc",
              name: "desc",
              label: "Description",
              type: "text",
              order: 1,
              span: 2,
            },
          ],
        }),
      );
      expect(
        screen.getByLabelText(/Description/i).closest(".col-span-2"),
      ).toBeInTheDocument();
    });
  });

  // ── 4. Validation Rules ───────────────────────────────────────────────────────

  describe("Validation Rules", () => {
    const submitBtn = { id: "s", label: "Submit", submitAction: true };

    it("shows required error for an empty text field on submit", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "email",
              name: "email",
              label: "Email",
              type: "text",
              order: 1,
              validations: [{ rule: "required", message: "Email is required" }],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("shows required error for an empty select field on submit", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "type",
              name: "type",
              label: "Type",
              type: "select",
              order: 1,
              options: [{ value: "a", label: "A" }],
              validations: [{ rule: "required", message: "Type is required" }],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Type is required")).toBeInTheDocument();
      });
    });

    it("shows required error for an unselected radio field on submit", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "choice",
              name: "choice",
              label: "Choice",
              type: "radio",
              order: 1,
              options: [
                { value: "y", label: "Yes" },
                { value: "n", label: "No" },
              ],
              validations: [
                { rule: "required", message: "Choice is required" },
              ],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Choice is required")).toBeInTheDocument();
      });
    });

    it("shows min-length error when text input is too short", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "code",
              name: "code",
              label: "Code",
              type: "text",
              order: 1,
              validations: [
                { rule: "min", value: 5, message: "Min 5 characters" },
              ],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.type(screen.getByLabelText(/Code/i), "ab");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Min 5 characters")).toBeInTheDocument();
      });
    });

    it("shows max-length error when text input is too long", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "tag",
              name: "tag",
              label: "Tag",
              type: "text",
              order: 1,
              validations: [
                { rule: "max", value: 3, message: "Max 3 characters" },
              ],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.type(screen.getByLabelText(/Tag/i), "toolong");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Max 3 characters")).toBeInTheDocument();
      });
    });

    it("shows min error when number field is below minimum", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "age",
              name: "age",
              label: "Age",
              type: "number",
              order: 1,
              validations: [
                { rule: "min", value: 18, message: "Must be at least 18" },
              ],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.type(screen.getByLabelText(/Age/i), "5");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Must be at least 18")).toBeInTheDocument();
      });
    });

    it("shows max error when number field exceeds maximum", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "score",
              name: "score",
              label: "Score",
              type: "number",
              order: 1,
              validations: [
                { rule: "max", value: 100, message: "Must be at most 100" },
              ],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.type(screen.getByLabelText(/Score/i), "999");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Must be at most 100")).toBeInTheDocument();
      });
    });

    it("does not show error for an optional text field left empty", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "notes",
              name: "notes",
              label: "Notes",
              type: "text",
              order: 1,
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
      expect(mockHandleAction).toHaveBeenCalled();
    });

    it("clears required error after typing in the field", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "name",
              name: "name",
              label: "Name",
              type: "text",
              order: 1,
              validations: [{ rule: "required", message: "Name is required" }],
            },
          ],
          actions: [submitBtn],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));
      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Name/i), "Alice");
      await waitFor(() => {
        expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
      });
    });
  });

  // ── 5. Form Submission & Actions ─────────────────────────────────────────────

  describe("Form Submission & Actions", () => {
    it("submit action calls handleAction with typed form data", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            { id: "name", name: "name", label: "Name", type: "text", order: 1 },
          ],
          actions: [submitAction],
        }),
      );

      await user.type(screen.getByLabelText(/Name/i), "Alice");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockHandleAction).toHaveBeenCalledWith(
          expect.objectContaining({
            api: expect.objectContaining({
              endpoint: "/api/test",
              method: "POST",
              body: expect.objectContaining({ name: "Alice" }),
            }),
          }),
        );
      });
    });

    it("non-submit action calls handleAction immediately without form validation", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "name",
              name: "name",
              label: "Name",
              type: "text",
              order: 1,
              validations: [{ rule: "required", message: "Name is required" }],
            },
          ],
          actions: [cancelAction],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Cancel/i }));

      expect(mockHandleAction).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cancel", submitAction: false }),
      );
      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });

    it("missing required fields block submission and handleAction is not called", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "name",
              name: "name",
              label: "Name",
              type: "text",
              order: 1,
              validations: [{ rule: "required", message: "Name is required" }],
            },
          ],
          actions: [submitAction],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });
      expect(mockHandleAction).not.toHaveBeenCalled();
    });

    it("empty actions array renders no buttons", () => {
      renderForm(makeConfig({ fields: [], actions: [] }));
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("form with no submitAction logs to console, does not call handleAction", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [{ id: "n", name: "n", label: "N", type: "text", order: 1 }],
          actions: [cancelAction],
        }),
      );

      const form = document.querySelector("form")!;
      await act(async () => {
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Form Submitted (No Endpoint configured):",
          expect.any(Object),
        );
      });
      expect(mockHandleAction).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── 6. visibleWhen Operators ──────────────────────────────────────────────────

  describe("visibleWhen Operators", () => {
    const makeVisibleWhenConfig = (
      triggerType: "select" | "text",
      visibleWhen: Record<string, any>,
    ) =>
      makeConfig({
        fields: [
          {
            id: "trigger",
            name: "trigger",
            label: "Trigger",
            type: triggerType,
            order: 1,
            ...(triggerType === "select"
              ? {
                  options: [
                    { value: "a", label: "Option A" },
                    { value: "b", label: "Option B" },
                    { value: "c", label: "Option C" },
                  ],
                }
              : {}),
          },
          {
            id: "dependent",
            name: "dependent",
            label: "Dependent Field",
            type: "text",
            order: 2,
            visibleWhen,
          },
        ],
        actions: [submitAction],
      });

    it("eq: shows field when trigger equals expected value", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("select", {
          "==": [{ var: "trigger" }, "b"],
        }),
      );

      expect(
        screen.queryByLabelText(/Dependent Field/i),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("combobox", { name: /Trigger/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Option B" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Option B" }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("eq: hides field when trigger does not equal expected value", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("select", {
          "==": [{ var: "trigger" }, "b"],
        }),
      );

      await user.click(screen.getByRole("combobox", { name: /Trigger/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Option A" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Option A" }));

      expect(
        screen.queryByLabelText(/Dependent Field/i),
      ).not.toBeInTheDocument();
    });

    it("neq: shows field when trigger does NOT equal excluded value", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("select", {
          "!=": [{ var: "trigger" }, "a"],
        }),
      );

      await user.click(screen.getByRole("combobox", { name: /Trigger/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Option A" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Option A" }));

      expect(
        screen.queryByLabelText(/Dependent Field/i),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("combobox", { name: /Trigger/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Option B" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Option B" }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("gt: shows field when trigger value is greater than threshold", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("text", {
          ">": [{ var: "trigger" }, 5],
        }),
      );

      expect(
        screen.queryByLabelText(/Dependent Field/i),
      ).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(/Trigger/i), "6");

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("lt: shows field when trigger value is less than threshold", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("text", {
          "<": [{ var: "trigger" }, 5],
        }),
      );

      await user.type(screen.getByLabelText(/Trigger/i), "4");

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("gte: shows field when trigger value equals threshold", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("text", {
          ">=": [{ var: "trigger" }, 5],
        }),
      );

      await user.type(screen.getByLabelText(/Trigger/i), "5");

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("lte: shows field when trigger value equals threshold", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("text", {
          "<=": [{ var: "trigger" }, 5],
        }),
      );

      await user.type(screen.getByLabelText(/Trigger/i), "5");

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("in: shows field when trigger value is in the allowed list", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("select", {
          in: [{ var: "trigger" }, ["a", "b"]],
        }),
      );

      await user.click(screen.getByRole("combobox", { name: /Trigger/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Option A" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Option A" }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("notIn: shows field when trigger value is NOT in the excluded list", async () => {
      const user = userEvent.setup();
      renderForm(
        makeVisibleWhenConfig("select", {
          "!": { in: [{ var: "trigger" }, ["a"]] },
        }),
      );

      await user.click(screen.getByRole("combobox", { name: /Trigger/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Option B" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Option B" }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Dependent Field/i)).toBeInTheDocument();
      });
    });

    it("hidden field value is excluded from submission body", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "status",
              name: "status",
              label: "Status",
              type: "select",
              order: 1,
              defaultValue: "draft",
              options: [
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
              ],
            },
            {
              id: "secret",
              name: "secret",
              label: "Secret Field",
              type: "text",
              order: 2,
              defaultValue: "hidden-value",
              visibleWhen: { "==": [{ var: "status" }, "active"] },
            },
          ],
          actions: [submitAction],
        }),
      );

      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() => {
        expect(mockHandleAction).toHaveBeenCalledWith(
          expect.objectContaining({
            api: expect.objectContaining({
              body: expect.not.objectContaining({ secret: expect.anything() }),
            }),
          }),
        );
      });
    });
  });

  // ── 7. View Mode — ViewField Display ─────────────────────────────────────────

  describe("View Mode — ViewField Display", () => {
    const viewField = (overrides: Record<string, any>) => ({
      id: "f1",
      name: "f1",
      label: "My Field",
      order: 1,
      ...overrides,
    });

    it("shows text value as static text", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [viewField({ type: "text", defaultValue: "John Doe" })],
        }),
      );
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("text value is not editable (no input element)", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [viewField({ type: "text", defaultValue: "John Doe" })],
        }),
      );
      expect(screen.queryByDisplayValue("John Doe")).not.toBeInTheDocument();
    });

    it("empty text field renders as em dash", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [viewField({ type: "text" })],
        }),
      );
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("select field shows option label, not raw value", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [
            viewField({
              type: "select",
              defaultValue: "active",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            }),
          ],
        }),
      );
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.queryByText("active")).not.toBeInTheDocument();
    });

    it("yes/no select renders as a Badge (not a <p>)", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [
            viewField({
              type: "select",
              defaultValue: "yes",
              options: [
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ],
            }),
          ],
        }),
      );
      const yesEl = screen.getByText("Yes");
      expect(yesEl).toBeInTheDocument();
      expect(yesEl.closest("p")).toBeNull();
    });

    it("non-yes/no select renders as plain text in a <p>", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [
            viewField({
              type: "select",
              defaultValue: "foo",
              options: [
                { value: "foo", label: "Foo Option" },
                { value: "bar", label: "Bar Option" },
              ],
            }),
          ],
        }),
      );
      expect(screen.getByText("Foo Option").tagName.toLowerCase()).toBe("p");
    });

    it("checkbox true renders Yes as a Badge", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [viewField({ type: "checkbox", defaultValue: true })],
        }),
      );
      expect(screen.getByText("Yes")).toBeInTheDocument();
    });

    it("checkbox false renders No as a Badge", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [viewField({ type: "checkbox", defaultValue: false })],
        }),
      );
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("date field renders formatted date (dd/mm/yyyy)", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [viewField({ type: "date", defaultValue: "2024-06-15" })],
        }),
      );
      expect(screen.getByText(/15\/06\/2024/)).toBeInTheDocument();
    });

    it("no action buttons are rendered in view mode", () => {
      renderForm(
        makeConfig({
          mode: "view",
          fields: [],
          actions: [submitAction, cancelAction],
        }),
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  // ── 8. Field Input Interactions ───────────────────────────────────────────────

  describe("Field Input Interactions", () => {
    it("selecting an option from a select dropdown updates the displayed value", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "city",
              name: "city",
              label: "City",
              type: "select",
              order: 1,
              options: [
                { value: "delhi", label: "Delhi" },
                { value: "mumbai", label: "Mumbai" },
              ],
            },
          ],
        }),
      );

      await user.click(screen.getByRole("combobox", { name: /City/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Mumbai" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("option", { name: "Mumbai" }));

      await waitFor(() => {
        expect(screen.getAllByText("Mumbai").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("clicking a radio option selects it", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "choice",
              name: "choice",
              label: "Choice",
              type: "radio",
              order: 1,
              options: [
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ],
            },
          ],
        }),
      );

      const yesRadio = screen.getByRole("radio", { name: /Yes/i });
      await user.click(yesRadio);
      expect(yesRadio).toBeChecked();
    });

    it("clicking a checkbox toggles it on", async () => {
      const user = userEvent.setup();
      renderForm(
        makeConfig({
          fields: [
            {
              id: "agree",
              name: "agree",
              label: "Agree",
              type: "checkbox",
              order: 1,
            },
          ],
        }),
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  // ── 9. Edge Cases ─────────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("field without defaultValue defaults to empty string", () => {
      renderForm(
        makeConfig({
          fields: [
            { id: "f", name: "f", label: "Field", type: "text", order: 1 },
          ],
        }),
      );
      expect(screen.getByLabelText(/Field/i)).toHaveValue("");
    });

    it("renders multiple fields", () => {
      renderForm(
        makeConfig({
          fields: [
            { id: "a", name: "a", label: "Alpha", type: "text", order: 1 },
            { id: "b", name: "b", label: "Beta", type: "text", order: 2 },
          ],
        }),
      );
      expect(screen.getByLabelText(/Alpha/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beta/i)).toBeInTheDocument();
    });

    it("renders multiple action buttons", () => {
      renderForm(
        makeConfig({
          fields: [],
          actions: [submitAction, cancelAction],
        }),
      );
      expect(
        screen.getByRole("button", { name: /Submit/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i }),
      ).toBeInTheDocument();
    });
  });
});
