import type { RecordDetailsPageConfig, TabConfig } from "@shared/types";

// ============================================
// Quotations Detail Page Configuration
// ============================================

const quotationDetailsTabsConfig: TabConfig[] = [
  {
    id: "common-header",
    label: "Common Header",
    icon: "FileText"
  },
  {
    id: "policy-profile",
    label: "Policy Profile",
    icon: "User"
  },
  {
    id: "documents",
    label: "Documents",
    icon: "FileText"
  },
  {
    id: "policy-exclusion",
    label: "Policy Exclusion",
    icon: "XCircle"
  },
  {
    id: "subsidiaries",
    label: "Subsidiaries",
    icon: "Building"
  },
  {
    id: "plans",
    label: "Plans",
    icon: "Layers"
  },
  {
    id: "plan-products",
    label: "Plan / Products",
    icon: "Package"
  },
  {
    id: "plan-product-health",
    label: "Plan / Product Health",
    icon: "Heart"
  },
  {
    id: "plan-product-term-life",
    label: "Plan / Product Term Life",
    icon: "Heart"
  },
  {
    id: "plan-product-credit-life",
    label: "Plan / Product Credit Life",
    icon: "CreditCard"
  },
  {
    id: "plan-product-investment",
    label: "Plan / Product Investment",
    icon: "TrendingUp"
  },
  {
    id: "plan-product-benefits",
    label: "Plan / Product Benefits",
    icon: "Gift"
  },
  {
    id: "plan-product-benefits-health",
    label: "Plan / Product Benefits Health",
    icon: "Heart"
  },
  {
    id: "benefit-investment",
    label: "Benefit Investment",
    icon: "PiggyBank"
  },
  {
    id: "premium-method-05",
    label: "Premium Method 05",
    icon: "Calculator"
  },
  {
    id: "premium-method-06",
    label: "Premium Method 06",
    icon: "Calculator"
  },
  {
    id: "premium-method-07",
    label: "Premium Method 07",
    icon: "Calculator"
  },
  {
    id: "premium-method-08",
    label: "Premium Method 08",
    icon: "Calculator"
  },
  {
    id: "headcount",
    label: "Headcount",
    icon: "Users"
  },
  {
    id: "members",
    label: "Members",
    icon: "Users"
  },
];

export const quotationDetailsPageConfig: RecordDetailsPageConfig = {
  pageType: "record-details",
  pageId: "quotations",
  entityType: "Quotation",
  api: {
    endpoint: "/api/quotations/:id",
    method: "GET",
  },
  header: {
    title: ":data.quotationNumber",
    description: ":data.clientName • :data.quotationClassification",
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Quotations", href: "/quotations" },
      { label: ":data.quotationNumber" },
    ],
    actions: [
      {
        id: "edit-quotation",
        label: "Edit",
        icon: "Edit",
        variant: "default",
        intent: "edit"
      },
      {
        id: "export-pdf",
        label: "Export PDF",
        icon: "Download",
        variant: "outline",
        intent: "export"
      },
      {
        id: "convert-to-policy",
        label: "Convert to Policy",
        icon: "FileCheck",
        variant: "secondary",
        intent: "custom",
        actionProps: {
          formId: "convert-to-policy-form",
        },
      },
    ],
  },
  summary: {
    id: "quotation-summary",
    gridLayout: {
      cols: 4,
      mdCols: 4,
      smCols: 4,
      gap: "md",
    },
    fields: [
      {
        id: "policy-number",
        label: "Policy Number",
        accessorKey: "policyNumber",
        icon: "FileText",
        type: "text",
      },
      {
        id: "master-policy-number",
        label: "Master Policy Number",
        accessorKey: "masterPolicyNumber",
        icon: "FileCheck",
        type: "text",
      },
      {
        id: "is-master-policy",
        label: "Is it Master Policy?",
        accessorKey: "isMasterPolicy",
        icon: "Shield",
        type: "badge",
      },
      {
        id: "tranno",
        label: "Tranno",
        accessorKey: "tranno",
        icon: "Hash",
        type: "text",
      },
      {
        id: "branch",
        label: "Branch",
        accessorKey: "branch",
        icon: "Building",
        type: "text",
      },
      {
        id: "policy-classification",
        label: "Policy Classification",
        accessorKey: "policyClassification",
        icon: "Tag",
        type: "text",
      },
      {
        id: "product-mix",
        label: "Product Mix",
        accessorKey: "productMix",
        icon: "Package",
        type: "text",
      },
      {
        id: "risk-term-classification",
        label: "Risk Term Classification",
        accessorKey: "riskTermClassification",
        icon: "TrendingUp",
        type: "text",
      },
      {
        id: "effective-date",
        label: "Effective Date",
        accessorKey: "effectiveDate",
        icon: "Calendar",
        type: "date",
      },
    ],
  },
  tabs: quotationDetailsTabsConfig,
};

// ============================================
// Quotations Detail Edit Mode Configuration
// ============================================

export const quotationDetailsEditPageConfig: RecordDetailsPageConfig = {
  ...quotationDetailsPageConfig,
  header: {
    ...quotationDetailsPageConfig.header,
    actions: [
      {
        id: "cancel-edit",
        label: "Cancel",
        icon: "X",
        variant: "outline",
        intent: "cancel"
      },
      {
        id: "save-changes",
        label: "Save",
        icon: "Save",
        variant: "default",
        intent: "save"
      }
    ],
  },
};
