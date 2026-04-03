import { DataSourceConfig } from "@/types/widget";
import { BadgeValueMapping, KeyValueField } from "@/components/widgets/data/types";

const buildDataSource = (endpoint: string): DataSourceConfig => ({
  api: { endpoint, method: "GET" },
});

// ── Value mappings ────────────────────────────────────────────────────────────

export const transactionStatusValueMapping: BadgeValueMapping[] = [
  { value: "Draft",            label: "Draft",            variant: "grey"        },
  { value: "Completed",        label: "Completed",        variant: "info"        },
  { value: "Review",           label: "Review",           variant: "warning"     },
  { value: "Review Completed", label: "Review Completed", variant: "teal"        },
  { value: "Active",           label: "Active",           variant: "success"     },
  { value: "Active Draft",     label: "Active Draft",     variant: "amber"       },
  { value: "In-Active",        label: "In-Active",        variant: "destructive" },
];

export const transactionStatusLabels = [
  "Draft",
  "Completed",
  "Review",
  "Review Completed",
  "Active",
  "Active Draft",
  "In-Active",
] as const;

// ── API seed data (keyed by endpoint) ─────────────────────────────────────────

export const keyValueGridApiSeedData: Record<string, Record<string, string>> = {
  "/api/quotations/active/summary": {
    policyNumber:           "POL-2026-00123",
    masterPolicyNumber:     "MPOL-2026-001",
    isMasterPolicy:         "Yes",
    tranno:                 "TXN-001",
    branch:                 "Mumbai",
    policyClassification:   "Group Term Life",
    productMix:             "Standard",
    riskTermClassification: "Yearly Renewable",
    effectiveDate:          "2026-01-01",
  },
  "/api/quotations/expired/summary": {
    policyNumber:           "POL-2024-00456",
    masterPolicyNumber:     "MPOL-2024-002",
    isMasterPolicy:         "No",
    tranno:                 "TXN-002",
    branch:                 "Delhi",
    policyClassification:   "Group Credit Life",
    productMix:             "Enhanced",
    riskTermClassification: "Long Term No Renewals",
    effectiveDate:          "2024-01-01",
  },
  "/api/mock/policy-summary": {
    policyNumber:  "POL-2026-00123",
    clientName:    "Reliance Group",
    effectiveDate: "2026-01-01",
    expiryDate:    "2026-12-31",
    tranStatus:    "Active",
    channel:       "Broker",
    sumInsured:    "5,000,000",
    renewable:     "Yes",
  },
};

// ── Field definitions ─────────────────────────────────────────────────────────

// Quotation summary fields — mirror quotations-detail.json core schema
const quotationSummaryFields: KeyValueField[] = [
  { id: "policy-number",            label: "Policy Number",            accessorKey: "policyNumber",           icon: "FileText",   type: "text"  },
  { id: "master-policy-number",     label: "Master Policy Number",     accessorKey: "masterPolicyNumber",     icon: "FileCheck",  type: "text"  },
  { id: "is-master-policy",         label: "Is it Master Policy?",     accessorKey: "isMasterPolicy",         icon: "Shield",     type: "badge" },
  { id: "tranno",                   label: "Tranno",                   accessorKey: "tranno",                 icon: "Hash",       type: "text"  },
  { id: "branch",                   label: "Branch",                   accessorKey: "branch",                 icon: "Building",   type: "text"  },
  { id: "policy-classification",    label: "Policy Classification",    accessorKey: "policyClassification",   icon: "Tag",        type: "text"  },
  { id: "product-mix",              label: "Product Mix",              accessorKey: "productMix",             icon: "Package",    type: "text"  },
  { id: "risk-term-classification", label: "Risk Term Classification", accessorKey: "riskTermClassification", icon: "TrendingUp", type: "text"  },
  { id: "effective-date",           label: "Effective Date",           accessorKey: "effectiveDate",          icon: "Calendar",   type: "date"  },
];

// Policy detail fields — used in component variant stories
const policyDetailField = {
  policyNumber:  { id: "policyNumber",  label: "Policy Number",  accessorKey: "policyNumber"  } satisfies KeyValueField,
  clientName:    { id: "clientName",    label: "Client Name",    accessorKey: "clientName"    } satisfies KeyValueField,
  effectiveDate: { id: "effectiveDate", label: "Effective Date", accessorKey: "effectiveDate", type: "date"  } satisfies KeyValueField,
  expiryDate:    { id: "expiryDate",    label: "Expiry Date",    accessorKey: "expiryDate",    type: "date"  } satisfies KeyValueField,
  tranStatus:    { id: "tranStatus",    label: "Status",         accessorKey: "tranStatus",    type: "badge", valueMapping: transactionStatusValueMapping } satisfies KeyValueField,
  channel:       { id: "channel",       label: "Channel",        accessorKey: "channel"       } satisfies KeyValueField,
  sumInsured:    { id: "sumInsured",    label: "Sum Insured",    accessorKey: "sumInsured"    } satisfies KeyValueField,
};

// ── Mocks export ──────────────────────────────────────────────────────────────

export const keyValueGridMocks = {
  configs: {
    quotationSummary: { fields: quotationSummaryFields },
    policyEmptyPreview: {
      fields: [
        policyDetailField.policyNumber,
        policyDetailField.clientName,
        policyDetailField.effectiveDate,
        policyDetailField.tranStatus,
      ],
    },
    policyBasicText: {
      fields: [
        policyDetailField.policyNumber,
        policyDetailField.clientName,
        policyDetailField.channel,
        policyDetailField.sumInsured,
      ],
    },
    policyWithDates: {
      fields: [
        policyDetailField.policyNumber,
        policyDetailField.effectiveDate,
        policyDetailField.expiryDate,
        policyDetailField.channel,
      ],
    },
    policyWithStatus: {
      fields: [
        policyDetailField.policyNumber,
        policyDetailField.clientName,
        policyDetailField.tranStatus,
        policyDetailField.channel,
      ],
    },
    policyStatusShowcase: {
      fields: [
        policyDetailField.policyNumber,
        policyDetailField.clientName,
        policyDetailField.tranStatus,
        policyDetailField.effectiveDate,
      ],
    },
    policyAllFields: {
      fields: [
        policyDetailField.policyNumber,
        policyDetailField.clientName,
        policyDetailField.effectiveDate,
        policyDetailField.expiryDate,
        policyDetailField.tranStatus,
        policyDetailField.channel,
        policyDetailField.sumInsured,
      ],
    },
  },
  dataSources: {
    active:       buildDataSource("/api/quotations/active/summary"),
    expired:      buildDataSource("/api/quotations/expired/summary"),
    policyDetail: buildDataSource("/api/mock/policy-summary"),
  },
};
