import type { RecordListPageConfig } from "@shared/types";

// ============================================
// Auto Claims Portal - Claims Page Config
// ============================================

export const claimsListPageConfig: RecordListPageConfig = {
  pageType: "record-list",
  pageId: "claims",
  entityType: "Claim",
  api: {
    endpoint: "/api/claims",
    method: "GET",
  },
  header: {
    title: "Claims",
    description: "Manage and process auto insurance claims",
    breadcrumbs: [{ label: "Home", href: "/" }, { label: "Claims" }],
    actions: [
      {
        id: "create-claim",
        label: "New Claim",
        icon: "Plus",
        variant: "default",
        intent: "create",
        actionProps: {
          formId: "create-claim-form",
        },
      },
      {
        id: "export",
        label: "Export",
        icon: "Download",
        variant: "outline",
        intent: "export",
        actionProps: {
          api: {
            endpoint: "/api/claims/export",
            method: "GET",
          },
          responseType: "blob",
          successMessage: "Claims exported successfully",
        },
      },
    ],
  },
  filters: [
    {
      id: "lane",
      label: "Lane",
      type: "select",
      field: "lane",
      placeholder: "All Lanes",
      options: [
        { value: "GREEN", label: "Green" },
        { value: "AMBER", label: "Amber" },
        { value: "RED", label: "Red" },
      ], // API for fetching options
    },
    {
      id: "priority",
      label: "Priority",
      type: "select", // select, multi-select, date-range, date, boolean, search
      field: "priority",
      placeholder: "All Priorities",
      options: [
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
        { value: "CRITICAL", label: "Critical" },
      ],
    },
  ],
  table: {
    columns: [
      {
        id: "claimNumber",
        header: "Claim #",
        accessorKey: "claimNumber",
        type: "link",
        sortable: true,
        width: "200px",
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
        type: "text",
        sortable: true,
        width: "200px",
      },
      {
        id: "lane",
        header: "Lane",
        accessorKey: "lane",
        type: "badge",
        sortable: true,
        width: "100px",
        valueMapping: [
          { value: "GREEN", label: "Green", color: "success" },
          { value: "AMBER", label: "Amber", color: "warning" },
          { value: "RED", label: "Red", color: "error" },
        ],
      },
      {
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        type: "currency",
        sortable: true,
        align: "right",
        width: "120px",
      },
      {
        id: "priority",
        header: "Priority",
        accessorKey: "priority",
        type: "badge",
        sortable: true,
        width: "100px",
        valueMapping: [
          { value: "LOW", label: "Low", color: "default" },
          { value: "MEDIUM", label: "Medium", color: "info" },
          { value: "HIGH", label: "High", color: "warning" },
          { value: "CRITICAL", label: "Critical", color: "error" },
        ],
      },
      {
        id: "fraudScore",
        header: "Fraud Score",
        accessorKey: "fraudScore",
        type: "number",
        sortable: true,
        align: "right",
        width: "110px",
      },
      {
        id: "sla",
        header: "SLA",
        accessorKey: "sla",
        type: "text",
        sortable: true,
        width: "120px",
      },
    ],
    rowActions: [
      {
        id: "view",
        label: "View",
        icon: "Eye",
        intent: "view",
        actionProps: {
          route: "/claims/:id",
        },
      },
      {
        id: "edit",
        label: "Edit",
        icon: "Pencil",
        intent: "edit",
        actionProps: {
          formId: "edit-claim-form",
        },
      },
      {
        id: "delete",
        label: "Delete",
        icon: "Trash2",
        variant: "destructive",
        intent: "delete",
        actionProps: {
          confirmationRequired: true,
          confirmationMessage: "Are you sure you want to delete this claim?",
          api: {
            endpoint: "/api/claims/:id",
            method: "DELETE",
          },
          successMessage: "Claim deleted successfully",
        },
      },
    ],
    bulkActions: [
      {
        id: "bulk-assign",
        label: "Assign Selected",
        icon: "UserPlus",
        intent: "assign",
        actionProps: {
          formId: "bulk-assign-form",
        },
      },
      {
        id: "bulk-export",
        label: "Export Selected",
        icon: "Download",
        intent: "export",
        actionProps: {
          api: {
            endpoint: "/api/claims/export",
            method: "POST",
          },
          responseType: "blob",
          successMessage: "Selected claims exported successfully",
        },
      },
    ],
    defaultSort: {
      field: "createdAt",
      direction: "desc",
    },
    pagination: {
      enabled: true,
      pageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    },
    selectable: true,
    searchable: true,
    searchPlaceholder: "Search claims by number, claimant, or policy...",
  },
  emptyState: {
    title: "No claims found",
    description: "There are no claims matching your criteria. Create a new claim to get started.",
    action: {
      id: "create-claim",
      label: "Create New Claim",
      icon: "Plus",
      variant: "default",
      intent: "create",
      actionProps: {
        formId: "create-claim-form",
      },
    },
  },
};
