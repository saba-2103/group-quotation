export const cardMocks = {
  data: {
    metrics: [
      {
        title: "Total Claims",
        value: 40,
        badge: { label: "Active", variant: "success" },
      },
      {
        title: "Pending Quotations",
        value: 80,
        badge: { label: "Pending", variant: "warning" },
      },
      {
        title: "Active Policies",
        value: 120,
        badge: { label: "Active", variant: "success" },
      },
    ],

    basic: {
      title: "Card Title",
      description: "Card description goes here.",
      content: "This is the card content area.",
    },

    withFooter: {
      title: "Create Quotation",
      description: "Enter the basic details to start a new quotation.",
      content: "Form fields would appear here.",
    },

    metric: {
      title: "Total Claims",
      value: 120,
      badge: { label: "+12% this month", variant: "success" },
    },
  },
};
