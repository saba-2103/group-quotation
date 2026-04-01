export const dataTableMocks = {
  columns: {
    text: [
      { header: "Client Name", accessorKey: "name", type: "text" },
      { header: "Branch", accessorKey: "branch", type: "text" },
      { header: "Email", accessorKey: "email", type: "text" },
    ],

    link: [
      {
        header: "Quotation No",
        accessorKey: "quotationNumber",
        type: "link",
        linkRoute: "/quotations/:id",
      },
      { header: "Client", accessorKey: "client", type: "text" },
    ],

    badge: [
      { header: "Quotation No", accessorKey: "quotationNumber", type: "text" },
      {
        header: "Status",
        accessorKey: "status",
        type: "badge",
        valueMapping: [
          { value: "Approved", label: "Approved", color: "success" },
          { value: "Pending", label: "Pending", color: "warning" },
          { value: "Rejected", label: "Rejected", color: "error" },
        ],
      },
    ],

    currency: [
      { header: "Policy No", accessorKey: "policyNo", type: "text" },
      { header: "Premium", accessorKey: "premium", type: "currency" },
      { header: "Sum Insured", accessorKey: "sumInsured", type: "currency" },
    ],

    scroll: Array.from({ length: 12 }, (_, i) => ({
      header: `Column ${i + 1}`,
      accessorKey: `col${i + 1}`,
      type: "text",
      width: 150,
    })),

    allTypes: [
      {
        header: "Quotation",
        accessorKey: "quotation",
        type: "link",
        linkRoute: "#",
      },
      { header: "Client", accessorKey: "client", type: "text" },
      {
        header: "Status",
        accessorKey: "status",
        type: "badge",
        valueMapping: [
          { value: "Approved", color: "success" },
          { value: "Pending", color: "warning" },
        ],
      },
      { header: "Premium", accessorKey: "premium", type: "currency" },
      { header: "Lives", accessorKey: "lives", type: "number" },
    ],

    features: [
      { header: "Quotation", accessorKey: "quotation", type: "text" },
      {
        header: "Status",
        accessorKey: "status",
        type: "badge",
        valueMapping: [{ value: "Pending", color: "warning" }],
      },
    ],
  },

  data: {
    text: [
      { id: "1", name: "Acme Corp", branch: "Dubai", email: "acme@corp.com" },
      {
        id: "2",
        name: "GlobalTech",
        branch: "Abu Dhabi",
        email: "info@globaltech.com",
      },
    ],

    link: [{ id: "1", quotationNumber: "Q-2024-001", client: "Acme Corp" }],

    badge: [
      { id: "1", quotationNumber: "Q-2024-001", status: "Approved" },
      { id: "2", quotationNumber: "Q-2024-002", status: "Pending" },
    ],

    currency: [
      { id: "1", policyNo: "POL-001", premium: 12500, sumInsured: 500000 },
    ],

    scroll: [
      {
        id: "1",
        ...Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [
            `col${i + 1}`,
            `Data 1-${i + 1}`,
          ]),
        ),
      },
      {
        id: "2",
        ...Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [
            `col${i + 1}`,
            `Data 2-${i + 1}`,
          ]),
        ),
      },
    ],

    pagination: Array.from({ length: 9 }, (_, i) => ({
      id: String(i + 1),
      name: `Client ${i + 1}`,
      branch: "Dubai",
      email: `client${i + 1}@corp.com`,
    })),

    withActions: [
      { id: "1", quotationNumber: "Q-2024-001", status: "Pending" },
      { id: "2", quotationNumber: "Q-2024-002", status: "Pending" },
    ],

    allTypes: [
      {
        id: "1",
        quotation: "Q-001",
        client: "Acme Corp",
        status: "Approved",
        premium: 12500,
        lives: 450,
      },
      {
        id: "2",
        quotation: "Q-002",
        client: "GlobalTech",
        status: "Pending",
        premium: 8400,
        lives: 120,
      },
    ],

    features: [
      { id: "1", quotation: "Q-001", status: "Pending" },
      { id: "2", quotation: "Q-002", status: "Pending" },
      { id: "3", quotation: "Q-003", status: "Pending" },
    ],
  },

  actions: {
    bulk: [
      {
        id: "bulk-approve",
        type: "trigger-event",
        label: "Approve Selected",
        variant: "default",
        target: "approve",
      },
    ],

    row: [
      {
        id: "view",
        type: "trigger-event",
        label: "View",
        icon: "Eye",
        target: "view",
      },
    ],
  },
};
