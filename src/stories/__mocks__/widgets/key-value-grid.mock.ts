import { DataSourceConfig } from "@/types/widget";

const buildDataSource = (endpoint: string): DataSourceConfig => ({
  api: { endpoint, method: "GET" },
});

// Field definitions mirror quotations-detail.json core schema
const quotationSummaryFields = [
  { id: "policy-number", label: "Policy Number", accessorKey: "policyNumber", icon: "FileText", type: "text" },
  { id: "master-policy-number", label: "Master Policy Number", accessorKey: "masterPolicyNumber", icon: "FileCheck", type: "text" },
  { id: "is-master-policy", label: "Is it Master Policy?", accessorKey: "isMasterPolicy", icon: "Shield", type: "badge" },
  { id: "tranno", label: "Tranno", accessorKey: "tranno", icon: "Hash", type: "text" },
  { id: "branch", label: "Branch", accessorKey: "branch", icon: "Building", type: "text" },
  { id: "policy-classification", label: "Policy Classification", accessorKey: "policyClassification", icon: "Tag", type: "text" },
  { id: "product-mix", label: "Product Mix", accessorKey: "productMix", icon: "Package", type: "text" },
  { id: "risk-term-classification", label: "Risk Term Classification", accessorKey: "riskTermClassification", icon: "TrendingUp", type: "text" },
  { id: "effective-date", label: "Effective Date", accessorKey: "effectiveDate", icon: "Calendar", type: "date" },
];

export const keyValueGridMocks = {
  // Static field config — mirrors props.fields in quotations-detail.json
  configs: {
    quotationSummary: {
      fields: quotationSummaryFields,
    },
  },

  // API source config — mirrors dataSource.api in quotations-detail.json
  dataSources: {
    active: buildDataSource("/api/quotations/active/summary"),
    expired: buildDataSource("/api/quotations/expired/summary"),
  },
};
