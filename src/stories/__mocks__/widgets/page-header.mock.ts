export const pageHeaderMocks = {
  configs: {
    minimal: {
      title: "Dashboard",
    },

    settings: {
      title: "Settings",
      description: "Manage your application preferences and configurations.",
    },

    default: {
      title: "Quotation Details",
      description: "Manage and review the submitted quotation details here.",
    },

    withActions: {
      title: "Client Management",
      description: "Overview of all registered clients in the system.",
      actions: [
        {
          id: "export",
          type: "trigger-event",
          label: "Export",
          icon: "Download",
          variant: "outline",
          target: "export",
        },
        {
          id: "create",
          type: "trigger-event",
          label: "Create Client",
          icon: "Plus",
          variant: "default",
          target: "create",
        },
      ],
    },

    userManagement: {
      title: "User Management",
      description:
        "Add, revoke, or modify user access across the organization.",
      actions: [
        {
          id: "filter",
          type: "trigger-event",
          label: "Filter",
          icon: "Filter",
          variant: "outline",
          target: "filter",
        },
        {
          id: "invite",
          type: "trigger-event",
          label: "Invite User",
          icon: "Plus",
          variant: "default",
          target: "invite",
        },
      ],
    },
  },
};
