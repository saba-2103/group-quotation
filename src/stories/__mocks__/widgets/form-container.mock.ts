export const formContainerMocks = {
  fields: {
    simple: [
      {
        id: "name",
        name: "name",
        label: "Full Name",
        type: "text",
        validations: [{ rule: "required", message: "Name is required" }],
      },
      {
        id: "email",
        name: "email",
        label: "Email",
        type: "text",
        validations: [{ rule: "required", message: "Email is required" }],
      },
    ],

    complete: [
      {
        id: "policyNumber",
        name: "policyNumber",
        label: "Policy Number",
        type: "text",
        validations: [{ rule: "required", message: "Required" }],
      },
      {
        id: "policyType",
        name: "policyType",
        label: "Policy Type",
        type: "select",
        options: [
          { value: "health", label: "Health" },
          { value: "life", label: "Life" },
          { value: "auto", label: "Auto" },
        ],
        validations: [{ rule: "required", message: "Required" }],
      },
      {
        id: "premium",
        name: "premium",
        label: "Premium Amount",
        type: "number",
        validations: [
          { rule: "required", message: "Required" },
          { rule: "min", value: 0, message: "Must be positive" },
        ],
      },
      {
        id: "startDate",
        name: "startDate",
        label: "Start Date",
        type: "date",
        validations: [{ rule: "required", message: "Required" }],
      },
      {
        id: "terms",
        name: "terms",
        label: "I agree to terms and conditions",
        type: "checkbox",
        validations: [{ rule: "required", message: "You must accept terms" }],
      },
    ],
  },

  data: {
    simple: {
      name: "John Doe",
      email: "john.doe@example.com",
    },

    complete: {
      policyNumber: "POL-2024-001",
      policyType: "health",
      premium: 5000,
      startDate: "2024-01-01",
      terms: true,
    },
  },

  actions: {
    simple: [
      { id: "cancel", label: "Cancel", type: "button", variant: "outline" },
      { id: "submit", label: "Submit", type: "submit", variant: "default" },
    ],

    multiple: [
      { id: "reset", label: "Reset", type: "button", variant: "ghost" },
      {
        id: "save-draft",
        label: "Save Draft",
        type: "button",
        variant: "outline",
      },
      { id: "submit", label: "Submit", type: "submit", variant: "default" },
    ],
  },
};
