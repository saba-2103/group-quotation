export const quickLinksMocks = {
  links: {
    buttons: [
      {
        id: "1",
        label: "Create Quotation",
        icon: "Plus",
        type: "button",
        action: { type: "navigate", target: "/quotations/new" },
      },
      {
        id: "2",
        label: "View Reports",
        icon: "BarChart",
        type: "button",
        action: { type: "navigate", target: "/reports" },
      },
      {
        id: "3",
        label: "Settings",
        icon: "Settings",
        type: "button",
        action: { type: "navigate", target: "/settings" },
      },
    ],

    cards: [
      {
        id: "1",
        label: "New Quotation",
        description: "Create a new insurance quotation",
        icon: "FileText",
        type: "card",
        action: { type: "navigate", target: "/quotations/new" },
      },
      {
        id: "2",
        label: "Manage Policies",
        description: "View and manage active policies",
        icon: "Shield",
        type: "card",
        action: { type: "navigate", target: "/policies" },
      },
      {
        id: "3",
        label: "Claims Processing",
        description: "Process and review claims",
        icon: "AlertCircle",
        type: "card",
        action: { type: "navigate", target: "/claims" },
      },
    ],
  },

  configs: {
    buttonLayout: {
      title: "Quick Actions",
      layout: "list" as const,
    },

    cardLayout: {
      title: "Main Actions",
      layout: "grid" as const,
    },
  },
};
