import type { RecordListPageConfig } from "@shared/types";

// ============================================
// Quotations List Page Configuration
// ============================================

export const quotationsListPageConfig: RecordListPageConfig = {
  pageType: "record-list",
  pageId: "quotations",
  entityType: "Quotation",
  api: {
    endpoint: "/api/quotations",
    method: "GET"
  },
  header: {
    title: "Quotations",
    description: "Manage and process quotations",
    breadcrumbs: [{ label: "Home", href: "/" }, { label: "Quotations" }],
    actions: [
      {
        id: "create-quotation",
        label: "Create New Quotation",
        variant: "default",
        intent: "create",
        actionProps: {
          formId: "create-quotation-form"
        }
      },
      {
        id: "import-from-prior",
        label: "Import from Prior",
        variant: "outline",
        intent: "custom",
        icon: "Upload",
        actionProps: {
          formId: "import-quotation-form"
        }
      },
      {
        id: "version-quote",
        label: "Version Quote",
        variant: "outline",
        intent: "custom",
        icon: "GitBranch",
        actionProps: {
          formId: "version-quotation-form"
        }
      },
      {
        id: "assign-owner",
        label: "Assign Owner",
        variant: "outline",
        intent: "assign",
        icon: "UserPlus",
        actionProps: {
          formId: "assign-owner-form"
        }
      }
    ]
  },
  filters: [
    {
      id: "effectiveDateFrom",
      label: "Effective Date From",
      type: "date",
      field: "effectiveDateFrom",
      placeholder: "Select date"
    },
    {
      id: "effectiveDateTo",
      label: "Effective Date To",
      type: "date",
      field: "effectiveDateTo",
      placeholder: "Select date"
    },
    {
      id: "createdDateFrom",
      label: "Created Date From",
      type: "date",
      field: "createdDateFrom",
      placeholder: "Select date"
    },
    {
      id: "createdDateTo",
      label: "Created Date To",
      type: "date",
      field: "createdDateTo",
      placeholder: "Select date"
    },
    {
      id: "branch",
      label: "Branch",
      type: "select",
      field: "branch",
      placeholder: "All Branches",
      options: [
        { value: "Mumbai", label: "Mumbai" },
        { value: "Delhi", label: "Delhi" },
        { value: "Bangalore", label: "Bangalore" },
        { value: "Chennai", label: "Chennai" },
        { value: "Kolkata", label: "Kolkata" }
      ]
    },
    {
      id: "channel",
      label: "Channel",
      type: "select",
      field: "channel",
      placeholder: "All Channels",
      options: [
        { value: "Broker", label: "Broker" },
        { value: "Agent", label: "Agent" },
        { value: "Direct", label: "Direct" }
      ]
    },
    {
      id: "intermediary",
      label: "Intermediary",
      type: "select",
      field: "intermediary",
      placeholder: "All Intermediaries",
      options: [
        { value: "INT001", label: "ABC Insurance Brokers" },
        { value: "INT002", label: "XYZ Financial Services" },
        { value: "INT003", label: "PQR Insurance Agents" }
      ]
    },
    {
      id: "schemeType",
      label: "Scheme Type",
      type: "select",
      field: "schemeType",
      placeholder: "All Scheme Types",
      options: [
        { value: "Employer-Employee", label: "Employer–Employee" },
        { value: "Lender-Borrower", label: "Lender–Borrower" },
        { value: "Other", label: "Other" }
      ]
    },
    {
      id: "policyType",
      label: "Policy Type",
      type: "select",
      field: "policyType",
      placeholder: "All Policy Types",
      options: [
        { value: "Group Term", label: "Group Term" },
        { value: "Group Credit Life", label: "Group Credit Life" },
        { value: "Loan-linked GTL", label: "Loan-linked GTL" }
      ]
    },
    {
      id: "quotationType",
      label: "Quotation Type",
      type: "select",
      field: "quotationType",
      placeholder: "All Types",
      options: [
        { value: "New Business", label: "New Business" },
        { value: "Renewal", label: "Renewal" }
      ]
    },
    {
      id: "quotationClassification",
      label: "Classification",
      type: "select",
      field: "quotationClassification",
      placeholder: "All Classifications",
      options: [
        { value: "Group Term Life", label: "Group Term Life" },
        { value: "Group Credit Life", label: "Group Credit Life" }
      ]
    },
    {
      id: "mainStatus",
      label: "Main Status",
      type: "select",
      field: "mainStatus",
      placeholder: "All Statuses",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "In Progress", label: "In Progress" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" }
      ]
    },
    {
      id: "secondaryStatus",
      label: "Secondary Status",
      type: "select",
      field: "secondaryStatus",
      placeholder: "All Secondary Statuses",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Submitted", label: "Submitted" },
        { value: "Under Review", label: "Under Review" },
        { value: "Awaiting Documents", label: "Awaiting Documents" }
      ]
    },
    {
      id: "transactionStatus",
      label: "Transaction Status",
      type: "select",
      field: "transactionStatus",
      placeholder: "All Transaction Statuses",
      options: [
        { value: "Open", label: "Open" },
        { value: "Closed", label: "Closed" },
        { value: "Cancelled", label: "Cancelled" }
      ]
    },
    {
      id: "stuckReason",
      label: "Stuck Reason",
      type: "select",
      field: "stuckReason",
      placeholder: "All Reasons",
      options: [
        { value: "Docs pending", label: "Docs pending" },
        { value: "Pricing pending", label: "Pricing pending" },
        { value: "UW pending", label: "UW pending" },
        { value: "Approval pending", label: "Approval pending" }
      ]
    }
  ],
  table: {
    columns: [
      {
        id: "quotationNumber",
        header: "Quotation Number",
        accessorKey: "quotationNumber",
        type: "link",
        sortable: true,
        width: "180px",
        linkRoute: "/quotations/:id"
      },
      {
        id: "effectiveDate",
        header: "Effective Date",
        accessorKey: "effectiveDate",
        type: "date",
        sortable: true,
        width: "120px"
      },
      {
        id: "quotationType",
        header: "Quotation Type",
        accessorKey: "quotationType",
        type: "text",
        sortable: true,
        width: "130px"
      },
      {
        id: "clientName",
        header: "Client Name",
        accessorKey: "clientName",
        type: "text",
        sortable: true,
        width: "200px"
      },
      {
        id: "quotationClassification",
        header: "Quotation Classification",
        accessorKey: "quotationClassification",
        type: "text",
        sortable: true,
        width: "170px"
      },
      {
        id: "riskTermClassification",
        header: "Risk Term Classification",
        accessorKey: "riskTermClassification",
        type: "text",
        sortable: true,
        width: "180px"
      },
      {
        id: "quoteVersion",
        header: "Quote Version",
        accessorKey: "quoteVersion",
        type: "text",
        sortable: true,
        width: "120px"
      },
      {
        id: "mainStatus",
        header: "Main Status",
        accessorKey: "mainStatus",
        type: "badge",
        sortable: true,
        width: "120px",
        valueMapping: [{ value: "Pending", label: "Pending", color: "warning" }]
      },
      {
        id: "secondaryStatus",
        header: "Secondary Status",
        accessorKey: "secondaryStatus",
        type: "text",
        sortable: true,
        width: "200px"
      },
      {
        id: "lineOfBusiness",
        header: "Line of Business",
        accessorKey: "lineOfBusiness",
        type: "text",
        sortable: true,
        width: "140px"
      },
      {
        id: "transactionStatus",
        header: "Transaction Status",
        accessorKey: "transactionStatus",
        type: "text",
        sortable: true,
        width: "140px"
      },
      {
        id: "channel",
        header: "Channel",
        accessorKey: "channel",
        type: "text",
        sortable: true,
        width: "100px"
      },
      {
        id: "agentName",
        header: "Agent Name",
        accessorKey: "agentName",
        type: "text",
        sortable: true,
        width: "180px"
      },
      {
        id: "brokerName",
        header: "Broker Name",
        accessorKey: "brokerName",
        type: "text",
        sortable: true,
        width: "180px"
      },
      // Intelligence Columns
      {
        id: "censusStatus",
        header: "Census Status",
        accessorKey: "censusStatus",
        type: "badge",
        sortable: true,
        width: "140px",
        valueMapping: [
          { value: "Not started", label: "Not started", color: "default" },
          { value: "Uploaded", label: "Uploaded", color: "info" },
          { value: "Exceptions", label: "Exceptions", color: "warning" },
          { value: "Approved", label: "Approved", color: "success" }
        ]
      },
      {
        id: "membersCount",
        header: "Members Count",
        accessorKey: "membersCount",
        type: "number",
        sortable: true,
        width: "120px"
      },
      {
        id: "plansCount",
        header: "Plans Count",
        accessorKey: "plansCount",
        type: "number",
        sortable: true,
        width: "110px"
      },
      {
        id: "fclStatus",
        header: "FCL Status",
        accessorKey: "fclStatus",
        type: "badge",
        sortable: true,
        width: "140px",
        valueMapping: [
          { value: "Not computed", label: "Not computed", color: "default" },
          { value: "Computed", label: "Computed", color: "success" },
          { value: "Evidence pending", label: "Evidence pending", color: "warning" }
        ]
      },
      {
        id: "uwLoad",
        header: "UW Load",
        accessorKey: "uwLoad",
        type: "text",
        sortable: true,
        width: "200px"
      },
      {
        id: "payeeMode",
        header: "Payee Mode",
        accessorKey: "payeeMode",
        type: "text",
        sortable: true,
        width: "160px"
      },
      {
        id: "lastActivity",
        header: "Last Activity",
        accessorKey: "lastActivity",
        type: "date",
        sortable: true,
        width: "130px"
      },
      {
        id: "slaAge",
        header: "SLA Age (Days)",
        accessorKey: "slaAge",
        type: "number",
        sortable: true,
        width: "120px"
      }
    ],
    rowActions: [
      {
        id: "open",
        label: "Open",
        icon: "ExternalLink",
        intent: "view",
        actionProps: {
          // Endpoint can be changed
          route: "/quotations/:id"
        }
      },
      {
        id: "clone",
        label: "Clone",
        icon: "Copy",
        intent: "custom",
        actionProps: {
          api: {
            endpoint: "/api/quotations/:id/clone",
            method: "POST"
          },
          successMessage: "Quotation cloned successfully"
        }
      },
      {
        id: "version",
        label: "Version",
        icon: "GitBranch",
        intent: "custom",
        actionProps: {
          api: {
            endpoint: "/api/quotations/:id/version",
            method: "POST"
          },
          successMessage: "New version created successfully"
        }
      },
      {
        id: "withdraw",
        label: "Withdraw",
        icon: "XCircle",
        variant: "destructive",
        intent: "custom",
        actionProps: {
          confirmationRequired: true,
          confirmationMessage: "Are you sure you want to withdraw this quotation?",
          api: {
            endpoint: "/api/quotations/:id/withdraw",
            method: "POST"
          },
          successMessage: "Quotation withdrawn successfully"
        }
      }
    ],
    defaultSort: {
      field: "effectiveDate",
      direction: "desc"
    },
    pagination: {
      enabled: true,
      pageSize: 20,
      pageSizeOptions: [10, 20, 50, 100]
    },
    selectable: true,
    searchable: true,
    searchPlaceholder: "Search quotations by number or client..."
  },
  emptyState: {
    title: "No pending quotations",
    description: "There are no pending quotations. Create a new quotation to get started.",
    action: {
      id: "create-quotation",
      label: "Create New Quotation",
      icon: "Plus",
      variant: "default",
      intent: "create",
      actionProps: {
        formId: "create-quotation-form"
      }
    }
  }
};
