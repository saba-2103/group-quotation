import type { Meta, StoryObj } from "@storybook/react";
import { FormContainer } from "../../components/widgets/forms/formContainer";

const meta: Meta<typeof FormContainer> = {
  title: "Widgets/FormContainer",
  component: FormContainer,
  tags: ["autodocs"],
  parameters: {
    nextjs: { appDirectory: true }
  }
};

export default meta;
type Story = StoryObj<typeof FormContainer>;

// ── Edit Form ─────────────────────────────────────────────────────────────────
// Standard editable form. Save button stays disabled until all required fields
// are filled. Backend drives required state via validations[].

export const EditForm: Story = {
  name: "Edit — Standard Form",
  args: {
    config: {
      id: "form-edit",
      type: "form-container",
      props: {
        columns: 2,
        fields: [
          {
            name: "policyNumber",
            label: "Policy Number",
            type: "text",
            placeholder: "e.g. POL-2026-001",
            disabled: true,
            validations: [{ rule: "required", message: "Policy number is required" }]
          },
          {
            name: "policyName",
            label: "Policy Name",
            type: "text",
            placeholder: "e.g. Group Life Cover",
            validations: [{ rule: "required", message: "Policy name is required" }]
          },
          {
            name: "effectiveDate",
            label: "Effective Date",
            type: "date",
            placeholder: "Select date"
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            placeholder: "Select status",
            options: [
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" }
            ]
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            placeholder: "Any additional notes..."
          }
        ],
        actions: [
          {
            id: "save",
            label: "Save",
            submitAction: true,
            type: "api-mutation",
            api: { endpoint: "/api/policies", method: "PUT" }
          }
        ],
        showReset: true
      }
    }
  }
};

// ── View Mode ─────────────────────────────────────────────────────────────────
// Backend sends mode: "view" — form is fully read-only, action bar is hidden.
// displayStyle drives how each field is presented.

export const ViewMode: Story = {
  name: 'View Mode — Read-Only (mode: "view")',
  args: {
    config: {
      id: "form-view",
      type: "form-container",
      props: {
        mode: "view",
        columns: 2,
        fields: [
          {
            name: "policyNumber",
            label: "Policy Number",
            type: "text",
            defaultValue: "POL-2026-001"
          },
          {
            name: "policyName",
            label: "Policy Name",
            type: "text",
            defaultValue: "Group Life Cover"
          },
          {
            name: "effectiveDate",
            label: "Effective Date",
            type: "date",
            defaultValue: "2026-01-01",
            displayStyle: "date"
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            defaultValue: "active",
            displayStyle: "badge",
            options: [
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" }
            ]
          },
          {
            name: "isVerified",
            label: "Verified",
            type: "checkbox",
            defaultValue: true,
            displayStyle: "badge"
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: "Reviewed and approved by compliance team."
          }
        ],
        actions: []
      }
    }
  }
};

// ── Disabled Form ─────────────────────────────────────────────────────────────
// Backend sends disabled: true — identical behaviour to mode: "view".
// Demonstrates the second path to read-only that the backend can use.

export const DisabledForm: Story = {
  name: "Disabled — Top-Level disabled: true",
  args: {
    config: {
      id: "form-disabled",
      type: "form-container",
      props: {
        disabled: true,
        columns: 2,
        fields: [
          {
            name: "policyNumber",
            label: "Policy Number",
            type: "text",
            defaultValue: "POL-2026-001"
          },
          {
            name: "policyName",
            label: "Policy Name",
            type: "text",
            defaultValue: "Group Life Cover"
          }
        ],
        actions: [
          {
            id: "save",
            label: "Save",
            submitAction: true,
            type: "api-mutation",
            api: { endpoint: "/api/policies", method: "PUT" }
          }
        ]
      }
    }
  }
};

// ── Multi-Column Layout ───────────────────────────────────────────────────────
// columns: 4 — previously silently fell back to 3-col.
// Now uses inline gridTemplateColumns, accepting any count the backend sends.

export const FourColumnLayout: Story = {
  name: "Layout — 4-Column Grid",
  args: {
    config: {
      id: "form-4col",
      type: "form-container",
      props: {
        columns: 4,
        fields: [
          { name: "firstName", label: "First Name", type: "text", placeholder: "John" },
          { name: "lastName", label: "Last Name", type: "text", placeholder: "Doe" },
          { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
          { name: "phone", label: "Phone", type: "tel", placeholder: "+1 555 000 0000" },
          {
            name: "country",
            label: "Country",
            type: "select",
            placeholder: "Select country",
            options: [
              { value: "za", label: "South Africa" },
              { value: "us", label: "United States" },
              { value: "gb", label: "United Kingdom" }
            ]
          },
          { name: "city", label: "City", type: "text", placeholder: "Cape Town" },
          { name: "postalCode", label: "Postal Code", type: "text", placeholder: "8001" },
          { name: "idNumber", label: "ID Number", type: "text", placeholder: "8001010001083" }
        ],
        actions: [
          {
            id: "save",
            label: "Save",
            submitAction: true,
            type: "api-mutation",
            api: { endpoint: "/api/members", method: "POST" }
          }
        ]
      }
    }
  }
};

// ── Conditional Fields ────────────────────────────────────────────────────────
// visibleWhen: field "paymentMethod" controls visibility of "bankAccount".

export const WithConditionalFields: Story = {
  name: "Conditional — visibleWhen",
  args: {
    config: {
      id: "form-conditional",
      type: "form-container",
      props: {
        columns: 2,
        fields: [
          {
            name: "paymentMethod",
            label: "Payment Method",
            type: "select",
            placeholder: "Select method",
            validations: [{ rule: "required" }],
            options: [
              { value: "debit", label: "Debit Order" },
              { value: "cash", label: "Cash" },
              { value: "eft", label: "EFT" }
            ]
          },
          {
            name: "bankAccount",
            label: "Bank Account Number",
            type: "text",
            placeholder: "e.g. 000012345678",
            visibleWhen: { field: "paymentMethod", operator: "in", value: ["debit", "eft"] },
            validations: [{ rule: "required", message: "Bank account is required for this payment method" }]
          },
          {
            name: "amount",
            label: "Amount",
            type: "number",
            placeholder: "0.00",
            validations: [{ rule: "required" }, { rule: "min", value: 1, message: "Amount must be greater than 0" }]
          }
        ],
        actions: [
          {
            id: "save",
            label: "Submit",
            submitAction: true,
            type: "api-mutation",
            api: { endpoint: "/api/payments", method: "POST" }
          }
        ]
      }
    }
  }
};

// ── displayStyle showcase ─────────────────────────────────────────────────────
// View mode with all three displayStyle values explicitly set by the backend.

export const DisplayStyles: Story = {
  name: "View — displayStyle: badge / date / text",
  args: {
    config: {
      id: "form-display-styles",
      type: "form-container",
      props: {
        mode: "view",
        columns: 3,
        fields: [
          {
            name: "claimStatus",
            label: "Claim Status",
            type: "select",
            defaultValue: "approved",
            displayStyle: "badge",
            options: [
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" }
            ]
          },
          {
            name: "submittedDate",
            label: "Submitted Date",
            type: "date",
            defaultValue: "2026-03-01",
            displayStyle: "date"
          },
          {
            name: "claimReference",
            label: "Claim Reference",
            type: "text",
            defaultValue: "CLM-2026-04821",
            displayStyle: "text"
          },
          {
            name: "isUrgent",
            label: "Urgent",
            type: "checkbox",
            defaultValue: true,
            displayStyle: "badge"
          },
          {
            name: "resolvedDate",
            label: "Resolved Date",
            type: "date",
            defaultValue: "2026-03-15",
            displayStyle: "date"
          },
          {
            name: "assignedTo",
            label: "Assigned To",
            type: "text",
            defaultValue: "Jane Smith"
          }
        ],
        actions: []
      }
    }
  }
};
