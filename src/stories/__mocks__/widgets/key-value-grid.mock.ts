export const keyValueGridMocks = {
  fields: {
    policy: [
      {
        id: "1",
        label: "Policy Number",
        accessorKey: "policyNo",
        icon: "FileText",
      },
      {
        id: "2",
        label: "Inception Date",
        accessorKey: "inceptionDate",
        icon: "Calendar",
      },
      {
        id: "3",
        label: "Expiry Date",
        accessorKey: "expiryDate",
        icon: "Calendar",
      },
      { id: "4", label: "Insured", accessorKey: "insured", icon: "User" },
      { id: "5", label: "Status", accessorKey: "status", type: "badge" },
    ],
  },

  data: {
    active: {
      policyNo: "POL-999-001",
      inceptionDate: "01 Jan 2024",
      expiryDate: "31 Dec 2024",
      insured: "Acme Corporation",
      status: "Active",
    },

    expired: {
      policyNo: "POL-000-002",
      inceptionDate: "01 Jan 2023",
      expiryDate: "31 Dec 2023",
      insured: "GlobalTech Inc",
      status: "Expired",
    },
  },
};
