export const filterBarMocks = {
  filters: {
    status: [
      {
        id: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "expired", label: "Expired" },
        ],
      },
    ],

    multiple: [
      {
        id: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "expired", label: "Expired" },
        ],
      },
      {
        id: "branch",
        label: "Branch",
        type: "select",
        options: [
          { value: "dubai", label: "Dubai" },
          { value: "abu-dhabi", label: "Abu Dhabi" },
          { value: "sharjah", label: "Sharjah" },
        ],
      },
      {
        id: "type",
        label: "Policy Type",
        type: "select",
        options: [
          { value: "health", label: "Health" },
          { value: "life", label: "Life" },
          { value: "auto", label: "Auto" },
        ],
      },
    ],
  },
};
