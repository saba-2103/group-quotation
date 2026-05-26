import type { RecordDetailsPageConfig, TabConfig } from "@shared/types";

// ============================================
// Auto Claims Portal - Claims Detail Page Config
// ============================================

// Auto Claims - Claim Detail Tabs
const claimDetailsTabsConfig: TabConfig[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "LayoutDashboard"
  },
  {
    id: "coverage-policy",
    label: "Coverage & Policy",
    icon: "Shield"
  },
  {
    id: "truth-view",
    label: "Truth View",
    icon: "Eye"
  },
  {
    id: "evidence",
    label: "Evidence",
    icon: "FileCheck"
  },
  {
    id: "kyc-risk",
    label: "KYC & Risk",
    icon: "ShieldAlert"
  },
  {
    id: "estimate",
    label: "Estimate",
    icon: "Calculator"
  },
  {
    id: "deviations",
    label: "Deviations",
    icon: "AlertTriangle"
  },
  {
    id: "decision",
    label: "Decision",
    icon: "CheckCircle"
  },
  {
    id: "comms",
    label: "Comms",
    icon: "MessageSquare"
  },
  {
    id: "audit",
    label: "Audit",
    icon: "History"
  }
];

export const claimsDetailPageConfig: RecordDetailsPageConfig = {
  pageType: "record-details",
  pageId: "claims",
  entityType: "Claim",
  api: {
    endpoint: "/api/claims/:id",
    method: "GET",
  },
  header: {
    title: "CLM-2024-001234",
    description: "John Smith • Auto Insurance Claim",
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Claims", href: "/claims" },
      { label: "CLM-2024-001234" },
    ],
    actions: [
      {
        id: "edit-claim",
        label: "Edit",
        icon: "Pencil",
        variant: "secondary",
        intent: "edit",
        actionProps: {
          formId: "edit-claim-form",
        },
      },
      {
        id: "approve-claim",
        label: "Approve",
        icon: "CheckCircle",
        variant: "default",
        intent: "approve",
        actionProps: {
          api: {
            endpoint: "/api/claims/:id/approve",
            method: "POST",
          },
          confirmationRequired: true,
          confirmationMessage: "Are you sure you want to approve this claim?",
          successMessage: "Claim approved successfully",
        },
      },
    ],
  },
  summary: {
    id: "claim-summary",
    gridLayout: {
      cols: 4,
      mdCols: 4,
      smCols: 2,
      gap: "md",
    },
    fields: [
      {
        id: "claim-number",
        label: "Claim Number",
        accessorKey: "claimNumber",
        icon: "FileText",
        type: "text",
      },
      {
        id: "customer",
        label: "Customer",
        accessorKey: "customer",
        icon: "User",
        type: "text",
      },
      {
        id: "lane",
        label: "Lane",
        accessorKey: "lane",
        icon: "AlertCircle",
        type: "badge",
      },
      {
        id: "amount",
        label: "Claim Amount",
        accessorKey: "amount",
        icon: "DollarSign",
        type: "currency",
      },
      {
        id: "priority",
        label: "Priority",
        accessorKey: "priority",
        icon: "Flag",
        type: "badge",
      },
      {
        id: "fraud-score",
        label: "Fraud Score",
        accessorKey: "fraudScore",
        icon: "Shield",
        type: "number",
      },
      {
        id: "sla",
        label: "SLA Status",
        accessorKey: "sla",
        icon: "Clock",
        type: "text",
      },
      {
        id: "status",
        label: "Status",
        accessorKey: "status",
        icon: "CheckCircle",
        type: "badge",
      },
    ],
  },
  tabs: claimDetailsTabsConfig,
};
