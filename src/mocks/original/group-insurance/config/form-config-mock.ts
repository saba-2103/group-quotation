import type { FormConfig, FormFieldConfig } from "@shared/types";

// ============================================
// Key Data Form Config
// ============================================

export const keyDataFormConfig: FormConfig = {
  id: "key-data-form",
  title: "Key Data - GPOL-SCR-001 (Common Header-1)",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "quotationOrPolicy",
      name: "quotationOrPolicy",
      label: "Quotation or Policy",
      type: "radio",
      order: 1,
      size: "sm",
      options: [
        { value: "quotation", label: "Quotation" },
        { value: "policy", label: "Policy" }
      ],
      defaultValue: "policy",
      validation: {
        required: true
      }
    },
    {
      id: "policyType",
      name: "policyType",
      label: "Policy Type",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select policy type",
      defaultValue: "Group Credit Life",
      options: [
        { value: "Group Credit Life", label: "Group Credit Life" },
        { value: "Group Term Life", label: "Group Term Life" },
        { value: "Group Health", label: "Group Health" },
        { value: "Group Personal Accident", label: "Group Personal Accident" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "branch",
      name: "branch",
      label: "Branch",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select branch",
      options: [
        { value: "mumbai", label: "Mumbai" },
        { value: "delhi", label: "Delhi" },
        { value: "bangalore", label: "Bangalore" },
        { value: "chennai", label: "Chennai" }
      ],
      validation: {
        required: true
      }
    },
    // Row 2
    {
      id: "policyClassification",
      name: "policyClassification",
      label: "Policy Classification",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select policy classification",
      defaultValue: "Grouped retail (affinity group)",
      options: [
        { value: "Grouped retail (affinity group)", label: "Grouped retail (affinity group)" },
        { value: "Group Corporate", label: "Group Corporate" },
        { value: "Individual", label: "Individual" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "riskTermClassification",
      name: "riskTermClassification",
      label: "Risk Term Classification",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select risk term classification",
      defaultValue: "Long term with no renewals",
      options: [
        { value: "Long term with no renewals", label: "Long term with no renewals" },
        { value: "Short term with renewals", label: "Short term with renewals" },
        { value: "Annual renewable", label: "Annual renewable" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "productMix",
      name: "productMix",
      label: "Product Mix",
      type: "select",
      order: 6,
      size: "sm",
      placeholder: "Select product mix",
      options: [
        { value: "single", label: "Single Product" },
        { value: "multiple", label: "Multiple Products" },
        { value: "bundled", label: "Bundled Products" }
      ],
      validation: {
        required: true
      }
    },
    // Row 3
    {
      id: "masterPolicyNumber",
      name: "masterPolicyNumber",
      label: "Master Policy Number",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "Search or enter master policy number",
      icon: "Search",
      validation: {
        required: false
      }
    },
    {
      id: "effectiveDate",
      name: "effectiveDate",
      label: "Effective Date",
      type: "date",
      order: 8,
      size: "sm",
      defaultValue: "01/12/2025",
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "save-key-data",
      label: "Save Key Data",
      variant: "default",
      actionType: "action",
      submitAction: {
        endpoint: "/api/quotations/key-data",
        method: "POST",
        onSuccessMessage: "Key data saved successfully"
      }
    },
    {
      id: "reset",
      label: "Reset",
      variant: "outline",
      actionType: "interactive"
    }
  ]
};

// ============================================
// Policy Configuration Form Config
// ============================================

export const policyConfigurationFormConfig: FormConfig = {
  id: "policy-configuration-form",
  title: "Policy Configuration",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "unit",
      name: "unit",
      label: "Unit",
      type: "text",
      order: 1,
      size: "sm",
      placeholder: "Enter unit",
      validation: {
        required: false
      }
    },
    {
      id: "policyYearStartDate",
      name: "policyYearStartDate",
      label: "Policy Year - Start Date",
      type: "date",
      order: 2,
      size: "sm",
      defaultValue: "01/12/2025",
      validation: {
        required: true
      }
    },
    {
      id: "policyYearEndDate",
      name: "policyYearEndDate",
      label: "Policy Year - End Date",
      type: "date",
      order: 3,
      size: "sm",
      defaultValue: "30/11/2026",
      validation: {
        required: true
      }
    },
    {
      id: "originalCommencementDate",
      name: "originalCommencementDate",
      label: "Original Commencement Date",
      type: "date",
      order: 4,
      size: "sm",
      helperText: "For renewals/takeovers",
      validation: {
        required: false
      }
    },
    {
      id: "timezoneCalendarMapping",
      name: "timezoneCalendarMapping",
      label: "Timezone / Business Calendar",
      type: "select",
      order: 5,
      size: "sm",
      defaultValue: "IST",
      options: [
        { value: "IST", label: "IST (India Standard Time)" },
        { value: "UTC", label: "UTC (Coordinated Universal Time)" },
        { value: "SGT", label: "SGT (Singapore Time)" },
        { value: "GST", label: "GST (Gulf Standard Time)" }
      ],
      helperText: "For cutoffs",
      validation: {
        required: false
      }
    },
    {
      id: "channel",
      name: "channel",
      label: "Channel",
      type: "select",
      order: 4,
      size: "sm",
      defaultValue: "Broker",
      options: [
        { value: "Broker", label: "Broker" },
        { value: "Agent", label: "Agent" },
        { value: "Direct", label: "Direct" },
        { value: "Online", label: "Online" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "hierarchy",
      name: "hierarchy",
      label: "Hierarchy",
      type: "select",
      order: 5,
      size: "sm",
      defaultValue: "Direct",
      options: [
        { value: "Direct", label: "Direct" },
        { value: "Indirect", label: "Indirect" },
        { value: "Branch", label: "Branch" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "servicingCorporateAgent",
      name: "servicingCorporateAgent",
      label: "Servicing Corporate Agent",
      type: "text",
      order: 6,
      size: "sm",
      placeholder: "Search agent",
      icon: "Search",
      validation: {
        required: false
      }
    },
    {
      id: "servicingPersonalAgent",
      name: "servicingPersonalAgent",
      label: "Servicing Personal Agent",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "Search agent",
      icon: "Search",
      validation: {
        required: false
      }
    },
    {
      id: "servicingStaff",
      name: "servicingStaff",
      label: "Servicing Staff",
      type: "select",
      order: 8,
      size: "sm",
      defaultValue: "Staff001",
      options: [
        { value: "Staff001", label: "Staff001" },
        { value: "Staff002", label: "Staff002" },
        { value: "Staff003", label: "Staff003" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "marketingStaff",
      name: "marketingStaff",
      label: "Marketing Staff",
      type: "select",
      order: 9,
      size: "sm",
      defaultValue: "Marketing001",
      options: [
        { value: "Marketing001", label: "Marketing001" },
        { value: "Marketing002", label: "Marketing002" },
        { value: "Marketing003", label: "Marketing003" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "billingFrequency",
      name: "billingFrequency",
      label: "Billing Frequency",
      type: "select",
      order: 10,
      size: "sm",
      defaultValue: "Annual",
      options: [
        { value: "Annual", label: "Annual" },
        { value: "Semi-Annual", label: "Semi-Annual" },
        { value: "Quarterly", label: "Quarterly" },
        { value: "Monthly", label: "Monthly" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "adjustmentFrequency",
      name: "adjustmentFrequency",
      label: "Adjustment Frequency",
      type: "select",
      order: 11,
      size: "sm",
      defaultValue: "Quarterly",
      options: [
        { value: "Monthly", label: "Monthly" },
        { value: "Quarterly", label: "Quarterly" },
        { value: "Semi-Annual", label: "Semi-Annual" },
        { value: "Annual", label: "Annual" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "collectionFrequency",
      name: "collectionFrequency",
      label: "Collection Frequency",
      type: "select",
      order: 12,
      size: "sm",
      defaultValue: "Monthly",
      options: [
        { value: "Monthly", label: "Monthly" },
        { value: "Quarterly", label: "Quarterly" },
        { value: "Semi-Annual", label: "Semi-Annual" },
        { value: "Annual", label: "Annual" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "premiumPaymentMethod",
      name: "premiumPaymentMethod",
      label: "Premium Payment Method",
      type: "select",
      order: 15,
      size: "sm",
      defaultValue: "NEFT",
      options: [
        { value: "NEFT", label: "NEFT" },
        { value: "NACH", label: "NACH" },
        { value: "Cheque", label: "Cheque" },
        { value: "Cash", label: "Cash" },
        { value: "Portal", label: "Portal" },
        { value: "Others", label: "Others" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "claimPaymentMethod",
      name: "claimPaymentMethod",
      label: "Claim Payment Method",
      type: "select",
      order: 14,
      size: "sm",
      defaultValue: "Direct Credit",
      options: [
        { value: "Direct Credit", label: "Direct Credit" },
        { value: "Check", label: "Check" },
        { value: "Bank Transfer", label: "Bank Transfer" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "defaultClaimPayeeMode",
      name: "defaultClaimPayeeMode",
      label: "Default Claim Payee Mode",
      type: "select",
      order: 17,
      size: "sm",
      defaultValue: "Nominee",
      options: [
        { value: "Nominee", label: "Nominee" },
        { value: "Employer", label: "Employer" },
        { value: "Policyholder", label: "Policyholder" },
        { value: "Lender", label: "Lender" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "gracePeriodDays",
      name: "gracePeriodDays",
      label: "Grace Period (Days)",
      type: "number",
      order: 16,
      size: "sm",
      defaultValue: 30,
      validation: {
        required: true,
        min: 0,
        max: 365
      }
    },
    {
      id: "gracePeriodStartRule",
      name: "gracePeriodStartRule",
      label: "Grace Period Start Rule",
      type: "select",
      order: 19,
      size: "sm",
      defaultValue: "Due date",
      options: [
        { value: "Due date", label: "Due date" },
        { value: "Invoice date", label: "Invoice date" },
        { value: "Posting date", label: "Posting date" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "autoLapseRule",
      name: "autoLapseRule",
      label: "Auto Lapse Rule",
      type: "radio",
      order: 20,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "lapseThresholdDays",
      name: "lapseThresholdDays",
      label: "Lapse Threshold (Days)",
      type: "number",
      order: 21,
      size: "sm",
      defaultValue: 90,
      dependsOn: "autoLapseRule",
      dependsOnValue: "yes",
      validation: {
        required: false,
        min: 1,
        max: 365
      }
    },
    {
      id: "stopBillingGovernance",
      name: "stopBillingGovernance",
      label: "Stop-Billing / Resume-Billing Governance",
      type: "select",
      order: 22,
      size: "sm",
      defaultValue: "Manual",
      options: [
        { value: "Manual", label: "Manual" },
        { value: "Auto on lapse", label: "Auto on lapse" },
        { value: "Auto on grace expiry", label: "Auto on grace expiry" },
        { value: "Disabled", label: "Disabled" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "compliance64VBMode",
      name: "compliance64VBMode",
      label: "64VB Compliance Mode",
      type: "select",
      order: 23,
      size: "sm",
      defaultValue: "Hard stop",
      options: [
        { value: "Hard stop", label: "Hard stop" },
        { value: "Soft stop", label: "Soft stop" },
        { value: "Offline flag", label: "Offline flag" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "subsidiariesEnabled",
      name: "subsidiariesEnabled",
      label: "Subsidiaries Enabled",
      type: "radio",
      order: 24,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "yes",
      validation: {
        required: true
      }
    },
    {
      id: "separateBillPerSubsidiary",
      name: "separateBillPerSubsidiary",
      label: "Separate Bill for Each Subsidiary",
      type: "radio",
      order: 25,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      dependsOn: "subsidiariesEnabled",
      dependsOnValue: "yes",
      validation: {
        required: false
      }
    },
    {
      id: "subsidiaryAllocationRules",
      name: "subsidiaryAllocationRules",
      label: "Subsidiary Allocation Rules",
      type: "select",
      order: 26,
      size: "sm",
      defaultValue: "Headcount",
      options: [
        { value: "Headcount", label: "Subsidiary-wise Headcount" },
        { value: "SI", label: "Subsidiary-wise SI" },
        { value: "Premium split", label: "Premium Split" },
        { value: "Custom", label: "Custom Allocation" }
      ],
      dependsOn: "subsidiariesEnabled",
      dependsOnValue: "yes",
      validation: {
        required: false
      }
    },
    {
      id: "renewalProvisionalBill",
      name: "renewalProvisionalBill",
      label: "Renewal Provisional Bill",
      type: "radio",
      order: 19,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "yes",
      validation: {
        required: true
      }
    },
    {
      id: "whenToSendNormalBill",
      name: "whenToSendNormalBill",
      label: "When to Send Normal Bill?",
      type: "select",
      order: 20,
      size: "sm",
      defaultValue: "30 days before renewal",
      options: [
        { value: "15 days before renewal", label: "15 days before renewal" },
        { value: "30 days before renewal", label: "30 days before renewal" },
        { value: "45 days before renewal", label: "45 days before renewal" },
        { value: "60 days before renewal", label: "60 days before renewal" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "valueOfXDays",
      name: "valueOfXDays",
      label: "Value of x (Days)",
      type: "number",
      order: 21,
      size: "sm",
      defaultValue: 30,
      validation: {
        required: true,
        min: 1,
        max: 365
      }
    },
    {
      id: "whenToSendAdjustmentBill",
      name: "whenToSendAdjustmentBill",
      label: "When to Send Adjustment Bill?",
      type: "select",
      order: 22,
      size: "sm",
      defaultValue: "15 days after adjustment",
      options: [
        { value: "15 days after adjustment", label: "15 days after adjustment" },
        { value: "30 days after adjustment", label: "30 days after adjustment" },
        { value: "45 days after adjustment", label: "45 days after adjustment" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "valueOfXDaysAdjustment",
      name: "valueOfXDaysAdjustment",
      label: "Value of x (Days)",
      type: "number",
      order: 23,
      size: "sm",
      defaultValue: 15,
      validation: {
        required: true,
        min: 1,
        max: 365
      }
    },
    {
      id: "premiumRefundFormula",
      name: "premiumRefundFormula",
      label: "Premium Refund Formula",
      type: "select",
      order: 24,
      size: "sm",
      defaultValue: "Pro-rata",
      options: [
        { value: "Pro-rata", label: "Pro-rata" },
        { value: "Short rate", label: "Short rate" },
        { value: "Custom formula", label: "Custom formula" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "premiumRefundPaymentMethod",
      name: "premiumRefundPaymentMethod",
      label: "Premium Refund Payment Method",
      type: "select",
      order: 25,
      size: "sm",
      defaultValue: "Bank Transfer",
      options: [
        { value: "Bank Transfer", label: "Bank Transfer" },
        { value: "Check", label: "Check" },
        { value: "Credit to account", label: "Credit to account" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "renewalNoticeDueDateDays",
      name: "renewalNoticeDueDateDays",
      label: "Renewal Notice Due Date (x days before Renewal)",
      type: "number",
      order: 26,
      size: "sm",
      defaultValue: 60,
      validation: {
        required: true,
        min: 1,
        max: 365
      }
    },
    {
      id: "correspondenceAddressRule",
      name: "correspondenceAddressRule",
      label: "Correspondence Address Rule",
      type: "select",
      order: 33,
      size: "sm",
      defaultValue: "Both",
      options: [
        { value: "Corporate", label: "Corporate" },
        { value: "Personal", label: "Personal" },
        { value: "Both", label: "Both" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "correspondenceAddressPersonal",
      name: "correspondenceAddressPersonal",
      label: "Correspondence Address - Personal Client",
      type: "text",
      order: 34,
      size: "sm",
      span: 2,
      placeholder: "Search address",
      icon: "Search",
      dependsOn: "correspondenceAddressRule",
      dependsOnValue: "Personal",
      validation: {
        required: false
      }
    },
    {
      id: "correspondenceAddressCorporate",
      name: "correspondenceAddressCorporate",
      label: "Correspondence Address - Corporate Client",
      type: "text",
      order: 35,
      size: "sm",
      span: 2,
      placeholder: "Search address",
      icon: "Search",
      dependsOn: "correspondenceAddressRule",
      dependsOnValue: "Corporate",
      validation: {
        required: false
      }
    },
    {
      id: "documentDeliveryMode",
      name: "documentDeliveryMode",
      label: "Document Delivery Mode",
      type: "select",
      order: 36,
      size: "sm",
      defaultValue: "Email",
      options: [
        { value: "Email", label: "Email" },
        { value: "Portal", label: "Portal" },
        { value: "Physical", label: "Physical" }
      ],
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "save-policy-configuration",
      label: "Save Configuration",
      variant: "default",
      actionType: "action",
      submitAction: {
        endpoint: "/api/quotations/policy-configuration",
        method: "POST",
        onSuccessMessage: "Policy configuration saved successfully"
      }
    },
    {
      id: "reset",
      label: "Reset",
      variant: "outline",
      actionType: "interactive"
    }
  ]
};

// ============================================
// Policy Details Form Config
// ============================================

export const policyDetailsFormConfig: FormConfig = {
  id: "policy-details-form",
  title: "Policy Details",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "startDate",
      name: "startDate",
      label: "Start Date",
      type: "date",
      order: 1,
      size: "sm",
      defaultValue: "01/12/2025",
      validation: {
        required: true
      }
    },
    {
      id: "endDate",
      name: "endDate",
      label: "End Date",
      type: "date",
      order: 2,
      size: "sm",
      defaultValue: "30/11/2026",
      validation: {
        required: true
      }
    },
    {
      id: "quoteVersion",
      name: "quoteVersion",
      label: "Quote Version",
      type: "number",
      order: 3,
      size: "sm",
      defaultValue: 1.0,
      validation: {
        required: true,
        min: 0
      }
    },
    {
      id: "lineOfBusiness",
      name: "lineOfBusiness",
      label: "Line of Business",
      type: "select",
      order: 4,
      size: "sm",
      defaultValue: "Health Insurance",
      options: [
        { value: "Health Insurance", label: "Health Insurance" },
        { value: "Life Insurance", label: "Life Insurance" },
        { value: "Motor Insurance", label: "Motor Insurance" },
        { value: "Property Insurance", label: "Property Insurance" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "agentClassification",
      name: "agentClassification",
      label: "Agent Classification",
      type: "select",
      order: 5,
      size: "sm",
      defaultValue: "Corporate Agent",
      options: [
        { value: "Corporate Agent", label: "Corporate Agent" },
        { value: "Individual Agent", label: "Individual Agent" },
        { value: "Broker", label: "Broker" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "quotationMainStatus",
      name: "quotationMainStatus",
      label: "Quotation Main Status",
      type: "select",
      order: 6,
      size: "sm",
      defaultValue: "Active",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Draft", label: "Draft" },
        { value: "Expired", label: "Expired" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "quotationSecondaryStatus",
      name: "quotationSecondaryStatus",
      label: "Quotation Secondary Status",
      type: "select",
      order: 7,
      size: "sm",
      defaultValue: "Under Review",
      options: [
        { value: "Under Review", label: "Under Review" },
        { value: "Approved", label: "Approved" },
        { value: "Pending", label: "Pending" },
        { value: "Rejected", label: "Rejected" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "policyStatus",
      name: "policyStatus",
      label: "Policy Status",
      type: "select",
      order: 8,
      size: "sm",
      placeholder: "Select policy status",
      helperText: "If converted",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Lapsed", label: "Lapsed" },
        { value: "Renewed", label: "Renewed" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "transactionStatus",
      name: "transactionStatus",
      label: "Transaction Status",
      type: "select",
      order: 9,
      size: "sm",
      defaultValue: "Open",
      options: [
        { value: "Open", label: "Open" },
        { value: "Closed", label: "Closed" },
        { value: "Pending", label: "Pending" },
        { value: "Cancelled", label: "Cancelled" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "pendingEffectiveDate",
      name: "pendingEffectiveDate",
      label: "Pending Effective Date",
      type: "date",
      order: 10,
      size: "sm",
      validation: {
        required: false
      }
    },
    {
      id: "pendingBusinessProcess",
      name: "pendingBusinessProcess",
      label: "Pending Business Process",
      type: "select",
      order: 11,
      size: "sm",
      placeholder: "Select pending process",
      options: [
        { value: "Underwriting", label: "Underwriting" },
        { value: "Approval", label: "Approval" },
        { value: "Documentation", label: "Documentation" },
        { value: "Pricing", label: "Pricing" },
        { value: "None", label: "None" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "originalCommencementDate",
      name: "originalCommencementDate",
      label: "Original Commencement Date",
      type: "date",
      order: 9,
      size: "sm",
      defaultValue: "01/12/2025",
      validation: {
        required: true
      }
    },
    {
      id: "premiumType",
      name: "premiumType",
      label: "Premium Type",
      type: "select",
      order: 13,
      size: "sm",
      defaultValue: "Regular",
      options: [
        { value: "Single", label: "Single" },
        { value: "Regular", label: "Regular" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "rateTypeClassification",
      name: "rateTypeClassification",
      label: "Rate Type Classification",
      type: "select",
      order: 14,
      size: "sm",
      defaultValue: "Level",
      options: [
        { value: "Level", label: "Level" },
        { value: "Decreasing", label: "Decreasing" },
        { value: "Increasing", label: "Increasing" },
        { value: "Age-banded", label: "Age-banded" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "isItTakeover",
      name: "isItTakeover",
      label: "Is it Takeover?",
      type: "radio",
      order: 11,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "previousInsurer",
      name: "previousInsurer",
      label: "Previous Insurer",
      type: "text",
      order: 17,
      size: "sm",
      placeholder: "Enter previous insurer",
      dependsOn: "isItTakeover",
      dependsOnValue: "yes",
      validation: {
        required: false
      }
    },
    {
      id: "priorPlanEquivalenceMapping",
      name: "priorPlanEquivalenceMapping",
      label: "Prior Plan Equivalence Mapping",
      type: "select",
      order: 18,
      size: "sm",
      placeholder: "Select mapping reference",
      dependsOn: "isItTakeover",
      dependsOnValue: "yes",
      options: [
        { value: "PLAN-MAP-001", label: "Standard GTL Mapping" },
        { value: "PLAN-MAP-002", label: "Credit Life Mapping" },
        { value: "PLAN-MAP-003", label: "Custom Mapping" },
        { value: "None", label: "No Prior Mapping" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "introducingCorporateAgent",
      name: "introducingCorporateAgent",
      label: "Introducing Corporate Agent",
      type: "text",
      order: 13,
      size: "sm",
      placeholder: "Search agent",
      defaultValue: "Star Agencies",
      icon: "Search",
      validation: {
        required: false
      }
    },
    {
      id: "introducingPersonalAgent",
      name: "introducingPersonalAgent",
      label: "Introducing Personal Agent",
      type: "text",
      order: 14,
      size: "sm",
      placeholder: "Search agent",
      icon: "Search",
      validation: {
        required: false
      }
    },
    {
      id: "policyCurrency",
      name: "policyCurrency",
      label: "Policy Currency",
      type: "select",
      order: 15,
      size: "sm",
      defaultValue: "INR - Indian Rupee",
      options: [
        { value: "INR - Indian Rupee", label: "INR - Indian Rupee" },
        { value: "USD - US Dollar", label: "USD - US Dollar" },
        { value: "EUR - Euro", label: "EUR - Euro" },
        { value: "GBP - British Pound", label: "GBP - British Pound" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "billingCurrency",
      name: "billingCurrency",
      label: "Billing Currency",
      type: "select",
      order: 16,
      size: "sm",
      defaultValue: "INR - Indian Rupee",
      options: [
        { value: "INR - Indian Rupee", label: "INR - Indian Rupee" },
        { value: "USD - US Dollar", label: "USD - US Dollar" },
        { value: "EUR - Euro", label: "EUR - Euro" },
        { value: "GBP - British Pound", label: "GBP - British Pound" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "ageDefinition",
      name: "ageDefinition",
      label: "Age Definition",
      type: "select",
      order: 23,
      size: "sm",
      defaultValue: "ANB",
      helperText: "Critical for GTL tables + rules",
      options: [
        { value: "ANB", label: "ANB (Age Next Birthday)" },
        { value: "ALB", label: "ALB (Age Last Birthday)" },
        { value: "Nearest", label: "Nearest Birthday" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "ageAsOnDate",
      name: "ageAsOnDate",
      label: "Age As-On Date",
      type: "select",
      order: 24,
      size: "sm",
      defaultValue: "Effective date",
      options: [
        { value: "Effective date", label: "Effective date" },
        { value: "Risk start", label: "Risk start date" },
        { value: "Other", label: "Other" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "ageEligibilityRulePack",
      name: "ageEligibilityRulePack",
      label: "Age Eligibility Rule Pack",
      type: "select",
      order: 25,
      size: "sm",
      defaultValue: "RULE-PACK-001",
      helperText: "Min/max entry age; cessation age",
      options: [
        { value: "RULE-PACK-001", label: "Standard GTL (18-65, cessation 70)" },
        { value: "RULE-PACK-002", label: "Credit Life (18-60, cessation 65)" },
        { value: "RULE-PACK-003", label: "Senior Cover (55-80, cessation 85)" },
        { value: "RULE-PACK-004", label: "Custom Rule Pack" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "retirementExitRule",
      name: "retirementExitRule",
      label: "Retirement/Exit Rule",
      type: "select",
      order: 26,
      size: "sm",
      placeholder: "Select exit rule",
      helperText: "For employer scheme",
      options: [
        { value: "Immediate termination", label: "Immediate termination on retirement" },
        { value: "Grace period", label: "30-day grace period after exit" },
        { value: "Policy end", label: "Continue till policy end" },
        { value: "Conversion option", label: "Conversion to individual policy" },
        { value: "Not applicable", label: "Not applicable" }
      ],
      validation: {
        required: false
      }
    }
  ],
  actions: [
    {
      id: "save-policy-details",
      label: "Save Policy Details",
      variant: "default",
      actionType: "action",
      submitAction: {
        endpoint: "/api/quotations/policy-details",
        method: "POST",
        onSuccessMessage: "Policy details saved successfully"
      }
    },
    {
      id: "reset",
      label: "Reset",
      variant: "outline",
      actionType: "interactive"
    }
  ]
};

// ============================================
// Policy Flags & Governance Form Config
// ============================================

export const policyFlagsGovernanceFormConfig: FormConfig = {
  id: "policy-flags-governance-form",
  title: "Policy Flags & Governance",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "isMicroInsurance",
      name: "isMicroInsurance",
      label: "Is it Micro Insurance?",
      type: "radio",
      order: 1,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "industryCode",
      name: "industryCode",
      label: "Industry Code (Risk Class)",
      type: "select",
      order: 2,
      size: "sm",
      defaultValue: "IND-IT-LOW",
      helperText: "Risk class mapping",
      options: [
        { value: "IND-IT-LOW", label: "IT Services (Low Risk)" },
        { value: "IND-MFG-MED", label: "Manufacturing (Medium Risk)" },
        { value: "IND-HC-MED", label: "Healthcare (Medium Risk)" },
        { value: "IND-BNK-LOW", label: "Banking & Finance (Low Risk)" },
        { value: "IND-RET-LOW", label: "Retail (Low Risk)" },
        { value: "IND-EDU-LOW", label: "Education (Low Risk)" },
        { value: "IND-RE-MED", label: "Real Estate (Medium Risk)" },
        { value: "IND-CON-HIGH", label: "Construction (High Risk)" },
        { value: "IND-MIN-HIGH", label: "Mining (High Risk)" },
        { value: "IND-CHM-HIGH", label: "Chemicals (High Risk)" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "isGSTApplicable",
      name: "isGSTApplicable",
      label: "Is GST Applicable?",
      type: "radio",
      order: 3,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "yes",
      validation: {
        required: true
      }
    },
    {
      id: "isRIInwardBusiness",
      name: "isRIInwardBusiness",
      label: "Is it RI Inward Business?",
      type: "radio",
      order: 4,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "isRIApplicable",
      name: "isRIApplicable",
      label: "Is RI Applicable?",
      type: "radio",
      order: 5,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "yes",
      validation: {
        required: true
      }
    },
    {
      id: "reinsuranceTreatyReference",
      name: "reinsuranceTreatyReference",
      label: "Reinsurance Treaty Reference",
      type: "select",
      order: 6,
      size: "sm",
      placeholder: "Select treaty reference",
      helperText: "Placeholder for RI treaty",
      dependsOn: "isRIApplicable",
      dependsOnValue: "yes",
      options: [
        { value: "TREATY-QS-2024", label: "Quota Share Treaty 2024" },
        { value: "TREATY-XL-2024", label: "Excess of Loss Treaty 2024" },
        { value: "TREATY-FAC-2024", label: "Facultative Treaty 2024" },
        { value: "TREATY-CUSTOM", label: "Custom Treaty" },
        { value: "None", label: "Not Applicable" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "autoLapse",
      name: "autoLapse",
      label: "Auto Lapse?",
      type: "radio",
      order: 7,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "bankGuarantee",
      name: "bankGuarantee",
      label: "Bank Guarantee?",
      type: "radio",
      order: 7,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "extendedFamily",
      name: "extendedFamily",
      label: "Extended Family?",
      type: "radio",
      order: 8,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "yes",
      validation: {
        required: true
      }
    },
    {
      id: "premiumSharing",
      name: "premiumSharing",
      label: "Premium Sharing?",
      type: "radio",
      order: 9,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "flexiScheme",
      name: "flexiScheme",
      label: "Flexi Scheme?",
      type: "radio",
      order: 10,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "separateBillForEachSubsidiary",
      name: "separateBillForEachSubsidiary",
      label: "Separate Bill for Each Subsidiary?",
      type: "radio",
      order: 11,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "isAdministrativeServicesOnly",
      name: "isAdministrativeServicesOnly",
      label: "Is Administrative Services only",
      type: "radio",
      order: 12,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no",
      validation: {
        required: true
      }
    },
    {
      id: "terminationDate",
      name: "terminationDate",
      label: "Termination Date",
      type: "date",
      order: 13,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: false
      }
    },
    {
      id: "reasonForTermination",
      name: "reasonForTermination",
      label: "Reason for Termination",
      type: "select",
      order: 14,
      size: "sm",
      placeholder: "Select reason",
      options: [
        { value: "non-payment", label: "Non-payment of premium" },
        { value: "policy-violation", label: "Policy violation" },
        { value: "customer-request", label: "Customer request" },
        { value: "fraud", label: "Fraud" },
        { value: "other", label: "Other" }
      ],
      validation: {
        required: false
      }
    },
    {
      id: "pendingEffectiveDate",
      name: "pendingEffectiveDate",
      label: "Pending Effective Date",
      type: "date",
      order: 15,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: false
      }
    },
    {
      id: "pendingBusinessProcess",
      name: "pendingBusinessProcess",
      label: "Pending Business Process",
      type: "text",
      order: 16,
      size: "sm",
      placeholder: "Enter pending business process details",
      validation: {
        required: false
      }
    },
    {
      id: "correspondingQuotation",
      name: "correspondingQuotation",
      label: "Corresponding Quotation",
      type: "text",
      order: 17,
      size: "sm",
      placeholder: "Enter corresponding quotation",
      validation: {
        required: false
      }
    },
    {
      id: "correspondingPolicy",
      name: "correspondingPolicy",
      label: "Corresponding Policy",
      type: "text",
      order: 19,
      size: "sm",
      placeholder: "Enter corresponding policy",
      validation: {
        required: false
      }
    },
    // Audit Fields
    {
      id: "makerCheckerState",
      name: "makerCheckerState",
      label: "Maker / Checker State",
      type: "select",
      order: 20,
      size: "sm",
      defaultValue: "Draft",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Submitted", label: "Submitted" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "approvalTrailLink",
      name: "approvalTrailLink",
      label: "Approval Trail",
      type: "text",
      order: 21,
      size: "sm",
      span: 3,
      placeholder: "View approval history",
      helperText: "Who, when, what changed",
      disabled: true,
      validation: {
        required: false
      }
    }
  ],
  actions: [
    {
      id: "save-policy-flags",
      label: "Save Policy Flags",
      variant: "default",
      actionType: "action",
      submitAction: {
        endpoint: "/api/quotations/policy-flags",
        method: "POST",
        onSuccessMessage: "Policy flags saved successfully"
      }
    },
    {
      id: "reset",
      label: "Reset",
      variant: "outline",
      actionType: "interactive"
    }
  ]
};

export const quotationFormConfig: FormConfig = {
  id: "quotation-form",
  title: "Quotation Details",
  layout: {
    type: "grid",
    columns: 2
  },
  sections: [
    {
      id: "basic-info",
      title: "Basic Information",
      description: "Enter the basic quotation details",
      layout: {
        type: "grid",
        columns: 2
      },
      fields: [
        {
          id: "policyType",
          name: "policyType",
          label: "Policy Type",
          type: "select",
          order: 1,
          size: "sm",
          options: [
            { value: "motor", label: "Motor Insurance" },
            { value: "health", label: "Health Insurance" },
            { value: "life", label: "Life Insurance" }
          ],
          validation: {
            required: true
          }
        },
        {
          id: "policyNumber",
          name: "policyNumber",
          label: "Policy Number",
          type: "text" as const,
          order: 2,
          size: "sm",
          icon: "FileText",
          validation: {
            required: true
          }
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          order: 3,
          size: "full",
          icon: "Calendar",
          validation: {
            required: true
          }
        }
      ]
    },
    {
      id: "coverage",
      title: "Coverage Details",
      layout: {
        type: "grid",
        columns: 2
      },
      fields: [
        {
          id: "coverageAmount",
          name: "coverageAmount",
          label: "Coverage Amount",
          type: "number",
          order: 1,
          size: "sm",
          validation: {
            required: true,
            min: 1000
          }
        },
        {
          id: "premium",
          name: "premium",
          label: "Premium",
          type: "number",
          order: 2,
          size: "sm",
          validation: {
            required: true,
            min: 100
          }
        },
        {
          id: "notes",
          name: "notes",
          label: "Additional Notes",
          type: "textarea",
          order: 3,
          size: "full",
          placeholder: "Any additional information..."
        }
      ]
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Save Quotation",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/quotations",
        method: "POST"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Group Insurance Form Config - Raw form example (not in sheet/dialog)
 * Based on the UI design with 3 sections
 */
export const groupInsuranceFormConfig: FormConfig = {
  id: "group-insurance-form",
  title: "Group Insurance Application",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  sections: [
    {
      id: "client-information",
      title: "Client Information",
      icon: "FileText",
      layout: {
        type: "grid",
        columns: 4,
        gap: "md"
      },
      fields: [
        {
          id: "quotationNumber",
          name: "quotationNumber",
          label: "Quotation Number",
          type: "text" as const,
          order: 1,
          size: "sm",
          defaultValue: "QBAG000000000001",
          disabled: true
        },
        {
          id: "clientName",
          name: "clientName",
          label: "Client Name",
          type: "text" as const,
          order: 2,
          size: "md",
          defaultValue: "Reliance Group",
          validation: {
            required: true
          }
        },
        {
          id: "branch",
          name: "branch",
          label: "Branch",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "mumbai", label: "Mumbai" },
            { value: "delhi", label: "Delhi" },
            { value: "bangalore", label: "Bangalore" },
            { value: "chennai", label: "Chennai" }
          ],
          defaultValue: "mumbai",
          validation: {
            required: true
          }
        },
        {
          id: "isMasterPolicy",
          name: "isMasterPolicy",
          label: "Is it Master Policy?",
          type: "select",
          order: 4,
          size: "sm",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" }
          ],
          defaultValue: "no"
        }
      ]
    },
    {
      id: "policy-information",
      title: "Policy Information",
      icon: "Circle",
      layout: {
        type: "grid",
        columns: 3,
        gap: "md"
      },
      fields: [
        {
          id: "policyNumber",
          name: "policyNumber",
          label: "Policy Number",
          type: "text" as const,
          order: 1,
          size: "sm",
          placeholder: "Enter policy number"
        },
        {
          id: "masterPolicyNumber",
          name: "masterPolicyNumber",
          label: "Master Policy Number",
          type: "text" as const,
          order: 2,
          size: "sm",
          defaultValue: "321013"
        },
        {
          id: "transactionNumber",
          name: "transactionNumber",
          label: "Transaction Number",
          type: "text" as const,
          order: 3,
          size: "sm",
          placeholder: "Enter transaction number"
        },
        {
          id: "policyType",
          name: "policyType",
          label: "Policy Type",
          type: "select",
          order: 4,
          size: "md",
          options: [
            { value: "group-term-life", label: "Group Term Life" },
            { value: "group-health", label: "Group Health" },
            { value: "group-accident", label: "Group Accident" }
          ],
          defaultValue: "group-term-life",
          validation: {
            required: true
          }
        },
        {
          id: "policyClassification",
          name: "policyClassification",
          label: "Policy Classification",
          type: "select",
          order: 5,
          size: "full",
          options: [
            { value: "true-group", label: "True Group" },
            { value: "employer-employee", label: "Employer Employee" },
            { value: "non-employer-employee", label: "Non Employer Employee" }
          ],
          defaultValue: "true-group",
          validation: {
            required: true
          }
        }
      ]
    },
    {
      id: "risk-product-details",
      title: "Risk & Product Details",
      icon: "Layers",
      layout: {
        type: "grid",
        columns: 3,
        gap: "md"
      },
      fields: [
        {
          id: "riskTermClassification",
          name: "riskTermClassification",
          label: "Risk Term Classification",
          type: "select",
          order: 1,
          size: "sm",
          options: [
            { value: "yearly-renewable", label: "Yearly renewable" },
            { value: "level-term", label: "Level Term" },
            { value: "decreasing-term", label: "Decreasing Term" }
          ],
          defaultValue: "yearly-renewable",
          validation: {
            required: true
          }
        },
        {
          id: "productMix",
          name: "productMix",
          label: "Product Mix",
          type: "select",
          order: 2,
          size: "md",
          options: [
            { value: "investment-products-only", label: "Investment products only" },
            { value: "protection-products-only", label: "Protection products only" },
            { value: "mixed", label: "Mixed" }
          ],
          defaultValue: "investment-products-only",
          validation: {
            required: true
          }
        },
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          order: 3,
          size: "sm",
          defaultValue: new Date().toISOString().split("T")[0], // Today's date
          validation: {
            required: true
          }
        }
      ]
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/group-insurance",
        method: "POST",
        onSuccessMessage: "Group insurance application saved successfully!"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Create Quotation Form Config - For sheet display
 * 2-column layout optimized for sheet width
 */
export const createQuotationFormConfig: FormConfig = {
  id: "create-quotation-form",
  title: "Create New Quotation",
  description: "Enter quotation details",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    {
      id: "quotationNumber",
      name: "quotationNumber",
      label: "Quotation Number",
      type: "text" as const,
      order: 1,
      size: "sm",
      defaultValue: `QBAG${Date.now()}`, // Dynamic quotation number
      disabled: true
    },
    {
      id: "policyNumber",
      name: "policyNumber",
      label: "Policy Number",
      type: "text" as const,
      order: 2,
      size: "sm",
      placeholder: "Enter policy number"
    },
    {
      id: "clientName",
      name: "clientName",
      label: "Client Name",
      type: "text" as const,
      order: 3,
      size: "full",
      defaultValue: "Reliance Group",
      validation: {
        required: true
      }
    },
    {
      id: "isMasterPolicy",
      name: "isMasterPolicy",
      label: "Is it Master Policy?",
      type: "select",
      order: 4,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no"
    },
    {
      id: "masterPolicyNumber",
      name: "masterPolicyNumber",
      label: "Master Policy Number",
      type: "text" as const,
      order: 5,
      size: "sm",
      placeholder: "Enter master policy number"
    },
    {
      id: "tranno",
      name: "tranno",
      label: "Tranno",
      type: "text" as const,
      order: 6,
      size: "sm",
      placeholder: "Enter transaction number"
    },
    {
      id: "policyType",
      name: "policyType",
      label: "Policy Type",
      type: "select",
      order: 7,
      size: "sm",
      options: [
        { value: "group-term-life", label: "Group Term Life" },
        { value: "group-health", label: "Group Health" },
        { value: "group-accident", label: "Group Accident" }
      ],
      defaultValue: "group-term-life",
      validation: {
        required: true
      }
    },
    {
      id: "branch",
      name: "branch",
      label: "Branch",
      type: "select",
      order: 8,
      size: "sm",
      options: [
        { value: "mumbai", label: "Mumbai" },
        { value: "delhi", label: "Delhi" },
        { value: "bangalore", label: "Bangalore" },
        { value: "chennai", label: "Chennai" }
      ],
      placeholder: "Select branch"
    },
    {
      id: "policyClassification",
      name: "policyClassification",
      label: "Policy Classification",
      type: "select",
      order: 9,
      size: "full",
      options: [
        { value: "true-group", label: "True Group" },
        { value: "employer-employee", label: "Employer Employee" },
        { value: "non-employer-employee", label: "Non Employer Employee" }
      ],
      defaultValue: "true-group",
      validation: {
        required: true
      }
    },
    {
      id: "riskTermClassification",
      name: "riskTermClassification",
      label: "Risk Term Classification",
      type: "select",
      order: 10,
      size: "sm",
      options: [
        { value: "yearly-renewable", label: "Yearly renewable" },
        { value: "level-term", label: "Level Term" },
        { value: "decreasing-term", label: "Decreasing Term" }
      ],
      defaultValue: "yearly-renewable",
      validation: {
        required: true
      }
    },
    {
      id: "productMix",
      name: "productMix",
      label: "Product Mix",
      type: "select",
      order: 11,
      size: "sm",
      options: [
        { value: "investment-products-only", label: "Investment products only" },
        { value: "protection-products-only", label: "Protection products only" },
        { value: "mixed", label: "Mixed" }
      ],
      placeholder: "Select product mix"
    },
    {
      id: "effectiveDate",
      name: "effectiveDate",
      label: "Effective Date",
      type: "date",
      order: 12,
      size: "full",
      defaultValue: new Date().toISOString().split("T")[0], // Today's date
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Create Quotation",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/quotations",
        method: "POST",
        onSuccessMessage: "Quotation created successfully!"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Policy Profile Form - Display Only
 * 3-column layout for policy profile information
 */
export const policyProfileFormConfig: FormConfig = {
  id: "policy-profile-form",
  title: "Policy Profile - Display Only",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "billedToDate",
      name: "billedToDate",
      label: "Billed-to-Date",
      type: "text" as const,
      order: 1,
      size: "sm",
      defaultValue: "30/11/2026",
      disabled: true
    },
    {
      id: "adjustmentToDate",
      name: "adjustmentToDate",
      label: "Adjustment-to-Date",
      type: "text" as const,
      order: 2,
      size: "sm",
      defaultValue: "30/11/2026",
      disabled: true
    },
    {
      id: "collectionToDate",
      name: "collectionToDate",
      label: "Collection-to-Date",
      type: "text" as const,
      order: 3,
      size: "sm",
      defaultValue: "30/11/2026",
      disabled: true
    },
    {
      id: "paidToDate",
      name: "paidToDate",
      label: "Paid-to-Date",
      type: "text" as const,
      order: 4,
      size: "sm",
      defaultValue: "30/11/2026",
      disabled: true
    },
    {
      id: "lastTranno",
      name: "lastTranno",
      label: "Last Tranno",
      type: "text" as const,
      order: 5,
      size: "sm",
      defaultValue: "",
      disabled: true
    },
    {
      id: "lastMemberNumber",
      name: "lastMemberNumber",
      label: "Last Member Number",
      type: "text" as const,
      order: 6,
      size: "sm",
      defaultValue: "00012345",
      disabled: true
    },
    {
      id: "inForceFlag",
      name: "inForceFlag",
      label: "In-Force Flag",
      type: "text" as const,
      order: 7,
      size: "sm",
      defaultValue: "",
      disabled: true
    },
    {
      id: "finalStatusDate",
      name: "finalStatusDate",
      label: "Final Status Date",
      type: "text" as const,
      order: 8,
      size: "sm",
      defaultValue: "",
      disabled: true
    }
  ],
  actions: []
};

// ============================================
// Add Plan Form Config
// ============================================

export const addPlanFormConfig: FormConfig = {
  id: "add-plan-form",
  title: "Add Plan",
  sections: [
    {
      id: "plan-identity",
      title: "Plan Identity",
      icon: "FileText",
      layout: {
        type: "grid",
        columns: 2,
        gap: "md"
      },
      fields: [
        {
          id: "planNumber",
          name: "planNumber",
          label: "Plan Number",
          type: "text" as const,
          order: 1,
          size: "full",
          placeholder: "Enter plan number (e.g., P01)",
          validation: { required: true }
        },
        {
          id: "planDescription",
          name: "planDescription",
          label: "Plan Description",
          type: "text" as const,
          order: 2,
          size: "full",
          placeholder: "Enter plan description",
          validation: { required: true }
        },
        {
          id: "startDate",
          name: "startDate",
          label: "Start Date",
          type: "date",
          order: 3,
          size: "full",
          placeholder: "Select start date",
          validation: { required: true }
        },
        {
          id: "endDate",
          name: "endDate",
          label: "End Date",
          type: "date",
          order: 4,
          size: "full",
          placeholder: "Select end date",
          validation: { required: false }
        }
      ]
    },
    {
      id: "plan-classification",
      title: "Plan Classification",
      icon: "Layers",
      layout: {
        type: "grid",
        columns: 2,
        gap: "md"
      },
      fields: [
        {
          id: "planType",
          name: "planType",
          label: "Plan Type",
          type: "select",
          order: 1,
          size: "full",
          placeholder: "Select plan type",
          validation: { required: true },
          options: [
            { value: "level-term", label: "Level Term" },
            { value: "reducing-term", label: "Reducing Term" },
            { value: "decreasing-term", label: "Decreasing Term" }
          ]
        },
        {
          id: "sumAssuredBasis",
          name: "sumAssuredBasis",
          label: "Sum Assured Basis",
          type: "select",
          order: 2,
          size: "full",
          placeholder: "Select sum assured basis",
          validation: { required: true },
          options: [
            { value: "flat", label: "Flat Amount" },
            { value: "salary-multiple", label: "Salary Multiple" },
            { value: "grade-slab", label: "Grade Slab" },
            { value: "loan-outstanding", label: "Loan Outstanding" }
          ]
        },
        {
          id: "eligibilityPack",
          name: "eligibilityPack",
          label: "Eligibility Pack Reference",
          type: "select",
          order: 3,
          size: "full",
          placeholder: "Select eligibility pack",
          validation: { required: true },
          options: [
            { value: "EP001", label: "EP001 - Standard Employee" },
            { value: "EP002", label: "EP002 - Senior Management" },
            { value: "EP003", label: "EP003 - Borrower Standard" },
            { value: "EP004", label: "EP004 - Spouse Inclusion" }
          ]
        },
        {
          id: "enrollmentType",
          name: "enrollmentType",
          label: "Enrollment Type",
          type: "select",
          order: 4,
          size: "full",
          placeholder: "Select enrollment type",
          validation: { required: true },
          options: [
            { value: "auto", label: "Auto Enrollment" },
            { value: "opt-in", label: "Opt-In" },
            { value: "evidence-based", label: "Evidence-Based" }
          ]
        },
        {
          id: "livesCovered",
          name: "livesCovered",
          label: "Lives Covered Definition",
          type: "select",
          order: 5,
          size: "full",
          placeholder: "Select lives covered",
          validation: { required: true },
          options: [
            { value: "member", label: "Member Only" },
            { value: "member-spouse", label: "Member + Spouse" },
            { value: "member-family", label: "Member + Family" }
          ]
        },
        {
          id: "memberTypeMapping",
          name: "memberTypeMapping",
          label: "Member Type Mapping",
          type: "select",
          order: 6,
          size: "full",
          placeholder: "Select member type",
          validation: { required: true },
          options: [
            { value: "all-employees", label: "All Employees" },
            { value: "staff-only", label: "Staff Only" },
            { value: "workmen-only", label: "Workmen Only" },
            { value: "borrower-segment-a", label: "Borrower Segment A" },
            { value: "borrower-segment-b", label: "Borrower Segment B" }
          ]
        }
      ]
    },
    {
      id: "eligibility-rules",
      title: "Eligibility Rules",
      icon: "Shield",
      layout: {
        type: "grid",
        columns: 2,
        gap: "md"
      },
      fields: [
        {
          id: "minEntryAge",
          name: "minEntryAge",
          label: "Minimum Entry Age",
          type: "number",
          order: 1,
          size: "full",
          placeholder: "Enter minimum age (e.g., 18)",
          validation: { required: true, min: 0, max: 100 }
        },
        {
          id: "maxEntryAge",
          name: "maxEntryAge",
          label: "Maximum Entry Age",
          type: "number",
          order: 2,
          size: "full",
          placeholder: "Enter maximum age (e.g., 65)",
          validation: { required: true, min: 0, max: 100 }
        },
        {
          id: "cessationAge",
          name: "cessationAge",
          label: "Cessation Age",
          type: "number",
          order: 3,
          size: "full",
          placeholder: "Enter cessation age (e.g., 70)",
          validation: { required: true, min: 0, max: 100 }
        },
        {
          id: "spouseInclusion",
          name: "spouseInclusion",
          label: "Spouse Inclusion",
          type: "select",
          order: 4,
          size: "full",
          placeholder: "Select spouse inclusion",
          validation: { required: true },
          options: [
            { value: "not-allowed", label: "Not Allowed" },
            { value: "optional", label: "Optional" },
            { value: "mandatory", label: "Mandatory" }
          ]
        }
      ]
    },
    {
      id: "configuration-references",
      title: "Configuration References",
      icon: "Settings",
      layout: {
        type: "grid",
        columns: 2,
        gap: "md"
      },
      fields: [
        {
          id: "premiumMethod",
          name: "premiumMethod",
          label: "Premium Method",
          type: "select",
          order: 1,
          size: "full",
          placeholder: "Select premium method",
          validation: { required: true },
          options: [
            { value: "PM001", label: "PM001 - Age-Based Rates" },
            { value: "PM002", label: "PM002 - Flat Rate" },
            { value: "PM003", label: "PM003 - Grade-Based Rates" },
            { value: "PM004", label: "PM004 - SI-Based Rates" }
          ]
        },
        {
          id: "benefitTemplate",
          name: "benefitTemplate",
          label: "Benefit Template",
          type: "select",
          order: 2,
          size: "full",
          placeholder: "Select benefit template",
          validation: { required: true },
          options: [
            { value: "BT001", label: "BT001 - Standard Death Benefit" },
            { value: "BT002", label: "BT002 - Death + TPD" },
            { value: "BT003", label: "BT003 - Death + Critical Illness" },
            { value: "BT004", label: "BT004 - Loan Protection" }
          ]
        }
      ]
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Save Plan",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plans",
        method: "POST",
        onSuccessMessage: "Plan saved successfully!"
      }
    }
  ]
};

/**
 * Edit Plan Form Config - For sheet display
 * Pre-populated with existing plan data
 */
export const editPlanFormConfig: FormConfig = {
  ...addPlanFormConfig,
  id: "edit-plan-form",
  title: "Edit Plan",
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Update Plan",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plans",
        method: "PUT",
        onSuccessMessage: "Plan updated successfully!"
      }
    }
  ]
};

// ============================================
// Add Subsidiary Form Config
// ============================================

export const addSubsidiaryFormConfig: FormConfig = {
  id: "add-subsidiary-form",
  title: "Add Subsidiary",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  sections: [
    {
      id: "subsidiary-info",
      title: "Subsidiary Information",
      layout: { type: "grid", columns: 2, gap: "md" },
      fields: [
        {
          id: "subsidiaryCode",
          name: "subsidiaryCode",
          label: "Subsidiary Code",
          type: "text" as const,
          order: 1,
          size: "sm",
          placeholder: "Search subsidiary code",
          validation: { required: true }
        },
        {
          id: "subsidiaryName",
          name: "subsidiaryName",
          label: "Subsidiary Name",
          type: "text" as const,
          order: 2,
          size: "sm",
          placeholder: "Auto-populated from code",
          disabled: true
        }
      ]
    },
    {
      id: "location-billing",
      title: "Location & Billing",
      layout: { type: "grid", columns: 2, gap: "md" },
      fields: [
        {
          id: "locationBranch",
          name: "locationBranch",
          label: "Location/Branch",
          type: "select" as const,
          order: 1,
          size: "sm",
          placeholder: "Select location/branch",
          options: [
            { value: "mumbai", label: "Mumbai" },
            { value: "delhi", label: "Delhi" },
            { value: "bangalore", label: "Bangalore" },
            { value: "chennai", label: "Chennai" },
            { value: "kolkata", label: "Kolkata" },
            { value: "hyderabad", label: "Hyderabad" },
            { value: "pune", label: "Pune" }
          ]
        },
        {
          id: "billingSplitRule",
          name: "billingSplitRule",
          label: "Billing Split Rule",
          type: "select" as const,
          order: 2,
          size: "sm",
          placeholder: "Select billing rule",
          options: [
            { value: "headcount", label: "By Headcount" },
            { value: "si", label: "By Sum Insured" },
            { value: "premium", label: "By Premium" }
          ],
          validation: { required: true },
          helperText: "Determines how billing is split for this subsidiary"
        }
      ]
    },
    {
      id: "effective-period",
      title: "Effective Period",
      layout: { type: "grid", columns: 2, gap: "md" },
      fields: [
        {
          id: "startDate",
          name: "startDate",
          label: "Start Date",
          type: "date" as const,
          order: 1,
          size: "sm",
          placeholder: "Select date",
          validation: { required: true }
        },
        {
          id: "endDate",
          name: "endDate",
          label: "End Date",
          type: "date" as const,
          order: 2,
          size: "sm",
          placeholder: "Select date"
        }
      ]
    }
  ],
  fields: [],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/subsidiaries",
        method: "POST",
        onSuccessMessage: "Subsidiary added successfully!"
      }
    }
  ]
};

export const editSubsidiaryFormConfig: FormConfig = {
  ...addSubsidiaryFormConfig,
  id: "edit-subsidiary-form",
  title: "Edit Subsidiary",
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/subsidiaries",
        method: "PUT",
        onSuccessMessage: "Subsidiary updated successfully!"
      }
    }
  ]
};

/**
 * Request Document Form Config - For requesting documents from clients
 * Single column layout for sheet display
 */
export const requestDocumentFormConfig: FormConfig = {
  id: "request-document-form",
  title: "Request Document",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "documentType",
      name: "documentType",
      label: "Document Type",
      type: "select",
      order: 1,
      size: "full",
      placeholder: "Select document type",
      options: [
        { value: "Proposal Form", label: "Proposal Form" },
        { value: "KYC Documents", label: "KYC Documents" },
        { value: "Member Details", label: "Member Details" },
        { value: "Financial Details", label: "Financial Details" },
        { value: "Medical Data of Members", label: "Medical Data of Members" },
        { value: "Salary Certificates", label: "Salary Certificates" },
        { value: "Board Resolution", label: "Board Resolution" },
        { value: "Previous Policy Copy", label: "Previous Policy Copy" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "requestTo",
      name: "requestTo",
      label: "Request To",
      type: "select",
      order: 2,
      size: "full",
      placeholder: "Select recipient",
      options: [
        { value: "client", label: "Client" },
        { value: "broker", label: "Broker" },
        { value: "lender", label: "Lender" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "dueDate",
      name: "dueDate",
      label: "Due Date",
      type: "date",
      order: 3,
      size: "full",
      placeholder: "Select due date",
      validation: {
        required: true
      }
    },
    {
      id: "priority",
      name: "priority",
      label: "Priority",
      type: "select",
      order: 4,
      size: "full",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "critical", label: "Critical" }
      ],
      defaultValue: "medium",
      validation: {
        required: true
      }
    },
    {
      id: "message",
      name: "message",
      label: "Message",
      type: "textarea",
      order: 5,
      size: "full",
      placeholder: "Add a message for the recipient",
      validation: {
        required: false
      }
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Send Request",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/documents/request",
        method: "POST",
        onSuccessMessage: "Document request sent successfully!"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Verify Document Form Config - For verifying uploaded documents
 * Single column layout for sheet display
 */
export const verifyDocumentFormConfig: FormConfig = {
  id: "verify-document-form",
  title: "Verify Document",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "verificationStatus",
      name: "verificationStatus",
      label: "Verification Status",
      type: "select",
      order: 1,
      size: "full",
      options: [
        { value: "verified", label: "Verified" },
        { value: "pending", label: "Pending Review" },
        { value: "rejected", label: "Rejected" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "verificationNotes",
      name: "verificationNotes",
      label: "Verification Notes",
      type: "textarea",
      order: 2,
      size: "full",
      placeholder: "Add verification notes or comments",
      validation: {
        required: false
      }
    },
    {
      id: "expiryDate",
      name: "expiryDate",
      label: "Document Expiry Date",
      type: "date",
      order: 3,
      size: "full",
      placeholder: "Set or update expiry date",
      validation: {
        required: false
      }
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Submit Verification",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/documents/verify",
        method: "PUT",
        onSuccessMessage: "Document verification updated successfully!"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Reject Document Form Config - For rejecting documents with reason
 * Single column layout for sheet display
 */
export const rejectDocumentFormConfig: FormConfig = {
  id: "reject-document-form",
  title: "Reject Document",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "rejectionReason",
      name: "rejectionReason",
      label: "Rejection Reason",
      type: "select",
      order: 1,
      size: "full",
      placeholder: "Select reason for rejection",
      options: [
        { value: "incomplete", label: "Incomplete Document" },
        { value: "illegible", label: "Illegible / Poor Quality" },
        { value: "expired", label: "Document Expired" },
        { value: "incorrect", label: "Incorrect Document Type" },
        { value: "mismatch", label: "Information Mismatch" },
        { value: "other", label: "Other" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "rejectionDetails",
      name: "rejectionDetails",
      label: "Rejection Details",
      type: "textarea",
      order: 2,
      size: "full",
      placeholder: "Provide detailed reason for rejection",
      validation: {
        required: true
      }
    },
    {
      id: "resubmissionRequired",
      name: "resubmissionRequired",
      label: "Resubmission Required",
      type: "select",
      order: 3,
      size: "full",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "yes",
      validation: {
        required: true
      }
    },
    {
      id: "resubmissionDueDate",
      name: "resubmissionDueDate",
      label: "Resubmission Due Date",
      type: "date",
      order: 4,
      size: "full",
      placeholder: "Set resubmission deadline",
      dependsOn: "resubmissionRequired",
      dependsOnValue: "yes",
      validation: {
        required: false
      }
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Reject Document",
      actionType: "action",
      variant: "destructive",
      submitAction: {
        endpoint: "/api/documents/reject",
        method: "PUT",
        onSuccessMessage: "Document rejected successfully!"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Add Document Form Config - For modal display
 * Single column layout for modal
 */
export const addDocumentFormConfig: FormConfig = {
  id: "add-document-form",
  title: "Add Document",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "documentType",
      name: "documentType",
      label: "Document Type",
      type: "select",
      order: 1,
      size: "full",
      placeholder: "Select document type",
      options: [
        { value: "Proposal Form", label: "Proposal Form" },
        { value: "KYC Documents", label: "KYC Documents" },
        { value: "Member Details", label: "Member Details" },
        { value: "Financial Details", label: "Financial Details" },
        { value: "Medical Data of Members", label: "Medical Data of Members" },
        { value: "Salary Certificates", label: "Salary Certificates" },
        { value: "Board Resolution", label: "Board Resolution" },
        { value: "Previous Policy Copy", label: "Previous Policy Copy" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "documentSource",
      name: "documentSource",
      label: "Document Source",
      type: "select",
      order: 2,
      size: "full",
      placeholder: "Select source",
      options: [
        { value: "client", label: "Client" },
        { value: "broker", label: "Broker" },
        { value: "lender", label: "Lender" },
        { value: "insurer", label: "Insurer" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "linkedEntity",
      name: "linkedEntity",
      label: "Linked To (Policy/Plan/Member)",
      type: "text",
      order: 3,
      size: "full",
      placeholder: "e.g., Policy: POL-2025-001 or Member: MEM-12345",
      helperText: "Specify which policy, plan, or member this document relates to",
      validation: {
        required: true
      }
    },
    {
      id: "effectiveDate",
      name: "effectiveDate",
      label: "Effective Date",
      type: "date",
      order: 4,
      size: "full",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "expiryDate",
      name: "expiryDate",
      label: "Expiry Date",
      type: "date",
      order: 5,
      size: "full",
      placeholder: "Select expiry date",
      helperText: "Leave blank if document does not expire",
      validation: {
        required: false
      }
    },
    {
      id: "dmsReference",
      name: "dmsReference",
      label: "DMS Reference",
      type: "text",
      order: 6,
      size: "full",
      placeholder: "e.g., DMS-2025-001-PF",
      helperText: "Document Management System reference ID",
      validation: {
        required: false
      }
    },
    {
      id: "documentFile",
      name: "documentFile",
      label: "Upload Document",
      type: "file",
      order: 7,
      size: "full",
      accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
      validation: {
        required: true,
        maxFileSize: 10485760,
        acceptedFileTypes: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]
      }
    },
    {
      id: "comments",
      name: "comments",
      label: "Comments / Notes",
      type: "textarea",
      order: 8,
      size: "full",
      placeholder: "Add any relevant notes or comments",
      validation: {
        required: false
      }
    }
  ],
  actions: [
    {
      id: "submit",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/documents",
        method: "POST",
        onSuccessMessage: "Document added successfully!"
      }
    },
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    }
  ]
};

/**
 * Add Exclusion Form Config - For adding new policy exclusions
 * Single column layout for sheet display
 */
export const addExclusionFormConfig: FormConfig = {
  id: "add-exclusion-form",
  title: "Add Exclusion / Clause",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "clausePack",
      name: "clausePack",
      label: "Clause Pack",
      type: "select",
      order: 1,
      size: "full",
      placeholder: "Select clause pack",
      options: [
        { value: "gtl-standard-v2.1", label: "GTL Standard v2.1" },
        { value: "gtl-standard-v2.0", label: "GTL Standard v2.0" },
        { value: "credit-life-v1.5", label: "Credit Life v1.5" },
        { value: "custom", label: "Custom Clause Pack" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "exclusionCode",
      name: "exclusionCode",
      label: "Exclusion Code",
      type: "select",
      order: 2,
      size: "full",
      placeholder: "Select exclusion code",
      options: [
        { value: "EXC001", label: "EXC001 - Pre-existing diseases" },
        { value: "EXC002", label: "EXC002 - Suicide Clause" },
        { value: "EXC003", label: "EXC003 - War and Terrorism" },
        { value: "EXC004", label: "EXC004 - Self-inflicted injuries" },
        { value: "EXC005", label: "EXC005 - Criminal activities" },
        { value: "EXC006", label: "EXC006 - Hazardous activities" },
        { value: "EXC007", label: "EXC007 - Aviation exclusion" },
        { value: "EXC008", label: "EXC008 - Nuclear hazards" },
        { value: "EXC009", label: "EXC009 - Pandemic exclusion" },
        { value: "EXC010", label: "EXC010 - Alcohol/Drug abuse" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "exclusionDescription",
      name: "exclusionDescription",
      label: "Exclusion Description",
      type: "text",
      order: 3,
      size: "full",
      placeholder: "Enter exclusion description",
      helperText: "Brief description of the exclusion",
      validation: {
        required: true
      }
    },
    {
      id: "scope",
      name: "scope",
      label: "Scope",
      type: "select",
      order: 4,
      size: "full",
      placeholder: "Select scope",
      options: [
        { value: "policy", label: "Policy Level" },
        { value: "plan", label: "Plan Level" },
        { value: "member", label: "Member Level" }
      ],
      helperText: "Define at which level this exclusion applies",
      validation: {
        required: true
      }
    },
    {
      id: "category",
      name: "category",
      label: "Category",
      type: "select",
      order: 5,
      size: "full",
      placeholder: "Select category",
      options: [
        { value: "mandatory", label: "Mandatory" },
        { value: "optional", label: "Optional" },
        { value: "conditional", label: "Conditional" }
      ],
      helperText: "Mandatory exclusions are required for compliance",
      validation: {
        required: true
      }
    },
    {
      id: "version",
      name: "version",
      label: "Version",
      type: "text",
      order: 6,
      size: "full",
      placeholder: "e.g., 2.1",
      defaultValue: "2.1",
      helperText: "Version number for this exclusion wording",
      validation: {
        required: true
      }
    },
    {
      id: "effectiveDate",
      name: "effectiveDate",
      label: "Effective Date",
      type: "date",
      order: 7,
      size: "full",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "endDate",
      name: "endDate",
      label: "End Date",
      type: "date",
      order: 8,
      size: "full",
      placeholder: "Select end date",
      helperText: "Leave blank for indefinite duration",
      validation: {
        required: false
      }
    },
    {
      id: "wordingText",
      name: "wordingText",
      label: "Clause Wording Text",
      type: "textarea",
      order: 9,
      size: "full",
      placeholder: "Enter the complete clause wording as it will appear in the policy document",
      helperText: "This is the actual policy wording that will be printed",
      validation: {
        required: true,
        minLength: 50
      }
    },
    {
      id: "regulatoryReference",
      name: "regulatoryReference",
      label: "Regulatory Reference",
      type: "text",
      order: 10,
      size: "full",
      placeholder: "e.g., IRDAI/HLT/REG/001/2024",
      helperText: "Reference to regulatory filing or guideline",
      validation: {
        required: false
      }
    },
    {
      id: "conflictCheck",
      name: "conflictCheck",
      label: "Run Conflict Check",
      type: "checkbox",
      order: 11,
      size: "full",
      defaultValue: true,
      helperText: "Automatically check for conflicting clauses before saving"
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Save Exclusion",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/exclusions",
        method: "POST",
        onSuccessMessage: "Exclusion added successfully!"
      }
    }
  ]
};

/**
 * Edit Exclusion Form Config - For editing existing policy exclusions
 * Single column layout for sheet display, pre-populated with existing data
 */
export const editExclusionFormConfig: FormConfig = {
  id: "edit-exclusion-form",
  title: "Edit Exclusion / Clause",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "clausePack",
      name: "clausePack",
      label: "Clause Pack",
      type: "select",
      order: 1,
      size: "full",
      placeholder: "Select clause pack",
      options: [
        { value: "gtl-standard-v2.1", label: "GTL Standard v2.1" },
        { value: "gtl-standard-v2.0", label: "GTL Standard v2.0" },
        { value: "credit-life-v1.5", label: "Credit Life v1.5" },
        { value: "custom", label: "Custom Clause Pack" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "exclusionCode",
      name: "exclusionCode",
      label: "Exclusion Code",
      type: "select",
      order: 2,
      size: "full",
      placeholder: "Select exclusion code",
      options: [
        { value: "EXC001", label: "EXC001 - Pre-existing diseases" },
        { value: "EXC002", label: "EXC002 - Suicide Clause" },
        { value: "EXC003", label: "EXC003 - War and Terrorism" },
        { value: "EXC004", label: "EXC004 - Self-inflicted injuries" },
        { value: "EXC005", label: "EXC005 - Criminal activities" },
        { value: "EXC006", label: "EXC006 - Hazardous activities" },
        { value: "EXC007", label: "EXC007 - Aviation exclusion" },
        { value: "EXC008", label: "EXC008 - Nuclear hazards" },
        { value: "EXC009", label: "EXC009 - Pandemic exclusion" },
        { value: "EXC010", label: "EXC010 - Alcohol/Drug abuse" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "exclusionDescription",
      name: "exclusionDescription",
      label: "Exclusion Description",
      type: "text",
      order: 3,
      size: "full",
      placeholder: "Enter exclusion description",
      helperText: "Brief description of the exclusion",
      validation: {
        required: true
      }
    },
    {
      id: "scope",
      name: "scope",
      label: "Scope",
      type: "select",
      order: 4,
      size: "full",
      placeholder: "Select scope",
      options: [
        { value: "policy", label: "Policy Level" },
        { value: "plan", label: "Plan Level" },
        { value: "member", label: "Member Level" }
      ],
      helperText: "Define at which level this exclusion applies",
      validation: {
        required: true
      }
    },
    {
      id: "category",
      name: "category",
      label: "Category",
      type: "select",
      order: 5,
      size: "full",
      placeholder: "Select category",
      options: [
        { value: "mandatory", label: "Mandatory" },
        { value: "optional", label: "Optional" },
        { value: "conditional", label: "Conditional" }
      ],
      helperText: "Mandatory exclusions are required for compliance",
      validation: {
        required: true
      }
    },
    {
      id: "version",
      name: "version",
      label: "Version",
      type: "text",
      order: 6,
      size: "full",
      placeholder: "e.g., 2.1",
      helperText: "Version number for this exclusion wording",
      validation: {
        required: true
      }
    },
    {
      id: "status",
      name: "status",
      label: "Status",
      type: "select",
      order: 7,
      size: "full",
      placeholder: "Select status",
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "superseded", label: "Superseded" },
        { value: "archived", label: "Archived" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "effectiveDate",
      name: "effectiveDate",
      label: "Effective Date",
      type: "date",
      order: 8,
      size: "full",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "endDate",
      name: "endDate",
      label: "End Date",
      type: "date",
      order: 9,
      size: "full",
      placeholder: "Select end date",
      helperText: "Leave blank for indefinite duration",
      validation: {
        required: false
      }
    },
    {
      id: "wordingText",
      name: "wordingText",
      label: "Clause Wording Text",
      type: "textarea",
      order: 10,
      size: "full",
      placeholder: "Enter the complete clause wording as it will appear in the policy document",
      helperText: "This is the actual policy wording that will be printed",
      validation: {
        required: true,
        minLength: 50
      }
    },
    {
      id: "regulatoryReference",
      name: "regulatoryReference",
      label: "Regulatory Reference",
      type: "text",
      order: 11,
      size: "full",
      placeholder: "e.g., IRDAI/HLT/REG/001/2024",
      helperText: "Reference to regulatory filing or guideline",
      validation: {
        required: false
      }
    },
    {
      id: "conflictCheck",
      name: "conflictCheck",
      label: "Run Conflict Check",
      type: "checkbox",
      order: 12,
      size: "full",
      defaultValue: true,
      helperText: "Automatically check for conflicting clauses before saving"
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Update Exclusion",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/exclusions/{id}",
        method: "PUT",
        onSuccessMessage: "Exclusion updated successfully!"
      }
    }
  ]
};

// ============================================
// Add Product Form Config
// ============================================

export const addProductFormConfig: FormConfig = {
  id: "add-product-form",
  title: "Add Product",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "productCode",
      name: "productCode",
      label: "Product Code",
      type: "text" as const,
      order: 1,
      size: "full",
      placeholder: "Enter product code",
      validation: {
        required: true
      }
    },
    {
      id: "productDescription",
      name: "productDescription",
      label: "Product Description",
      type: "text" as const,
      order: 2,
      size: "full",
      placeholder: "Enter product description",
      validation: {
        required: true
      }
    },
    {
      id: "riskStartDate",
      name: "riskStartDate",
      label: "Risk Start Date",
      type: "date",
      order: 3,
      size: "full",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "riskEndDate",
      name: "riskEndDate",
      label: "Risk End Date",
      type: "date",
      order: 4,
      size: "full",
      placeholder: "Select date",
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "submit",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-products",
        method: "POST",
        onSuccessMessage: "Product added successfully!"
      }
    }
  ]
};

export const editProductFormConfig: FormConfig = {
  ...addProductFormConfig,
  id: "edit-product-form",
  title: "Edit Product"
};

// ============================================
// S12 - Component Rules Form Config
// ============================================

export const componentRulesFormConfig: FormConfig = {
  id: "component-rules-form",
  title: "Component Rules (S12)",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  sections: [
    {
      id: "coverage-term",
      title: "A) Coverage Term & Timing",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "riskStartDate",
          name: "riskStartDate",
          label: "Risk Start Date",
          type: "date",
          order: 1,
          size: "sm",
          defaultValue: "2025-12-01",
          validation: { required: true }
        },
        {
          id: "riskEndDate",
          name: "riskEndDate",
          label: "Risk End Date",
          type: "date",
          order: 2,
          size: "sm",
          defaultValue: "2026-11-30",
          validation: { required: true }
        },
        {
          id: "riskTerm",
          name: "riskTerm",
          label: "Risk Term (Months)",
          type: "number",
          order: 3,
          size: "sm",
          defaultValue: 12,
          validation: { required: true }
        },
        {
          id: "premiumStartDate",
          name: "premiumStartDate",
          label: "Premium Start Date",
          type: "date",
          order: 4,
          size: "sm",
          defaultValue: "2025-12-01",
          validation: { required: true }
        },
        {
          id: "premiumEndDate",
          name: "premiumEndDate",
          label: "Premium End Date",
          type: "date",
          order: 5,
          size: "sm",
          defaultValue: "2026-11-30",
          validation: { required: true }
        },
        {
          id: "premiumTerm",
          name: "premiumTerm",
          label: "Premium Term (Months)",
          type: "number",
          order: 6,
          size: "sm",
          defaultValue: 12,
          validation: { required: true }
        }
      ]
    },
    {
      id: "participation",
      title: "B) Participation & Experience Features",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "isHeadcount",
          name: "isHeadcount",
          label: "Is Headcount?",
          type: "radio",
          order: 1,
          size: "sm",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" }
          ],
          defaultValue: "no",
          validation: { required: true }
        },
        {
          id: "experienceRefundApplicable",
          name: "experienceRefundApplicable",
          label: "Experience Refund Applicable?",
          type: "radio",
          order: 2,
          size: "sm",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" }
          ],
          defaultValue: "no",
          validation: { required: true }
        },
        {
          id: "noClaimBonusApplicable",
          name: "noClaimBonusApplicable",
          label: "No Claim Bonus Applicable?",
          type: "radio",
          order: 3,
          size: "sm",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" }
          ],
          defaultValue: "no",
          validation: { required: true }
        }
      ]
    },
    {
      id: "eligibility",
      title: "C) Eligibility Rules",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "coverWaitingPeriod",
          name: "coverWaitingPeriod",
          label: "Cover Waiting Period (Days)",
          type: "number",
          order: 1,
          size: "sm",
          defaultValue: 0,
          validation: { required: true }
        },
        {
          id: "waitingPeriodValue",
          name: "waitingPeriodValue",
          label: "Waiting Period Value (x)",
          type: "number",
          order: 2,
          size: "sm",
          defaultValue: 0
        },
        {
          id: "minimumAgeAtEntry",
          name: "minimumAgeAtEntry",
          label: "Minimum Age at Entry",
          type: "number",
          order: 3,
          size: "sm",
          defaultValue: 18,
          validation: { required: true }
        },
        {
          id: "maximumAgeAtEntry",
          name: "maximumAgeAtEntry",
          label: "Maximum Age at Entry",
          type: "number",
          order: 4,
          size: "sm",
          defaultValue: 65,
          validation: { required: true }
        },
        {
          id: "cessationAge",
          name: "cessationAge",
          label: "Cessation Age",
          type: "number",
          order: 5,
          size: "sm",
          defaultValue: 70,
          validation: { required: true }
        },
        {
          id: "employmentEligibility",
          name: "employmentEligibility",
          label: "Employment Eligibility",
          type: "select",
          order: 6,
          size: "sm",
          options: [
            { value: "permanent", label: "Permanent" },
            { value: "contract", label: "Contract" },
            { value: "active-payroll", label: "Active Payroll" },
            { value: "all", label: "All Employment Types" }
          ],
          defaultValue: "permanent",
          validation: { required: true }
        },
        {
          id: "borrowerEligibility",
          name: "borrowerEligibility",
          label: "Borrower Eligibility",
          type: "select",
          order: 7,
          size: "sm",
          options: [
            { value: "loan-active", label: "Loan Active" },
            { value: "not-npa", label: "Not NPA" },
            { value: "loan-active-not-npa", label: "Loan Active & Not NPA" },
            { value: "all", label: "All Borrowers" }
          ],
          defaultValue: "loan-active-not-npa"
        }
      ]
    },
    {
      id: "sum-assured",
      title: "D) Sum Assured Rules",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "minimumSumInsured",
          name: "minimumSumInsured",
          label: "Minimum Sum Insured",
          type: "number",
          order: 1,
          size: "sm",
          defaultValue: 100000,
          validation: { required: true }
        },
        {
          id: "maximumSumInsured",
          name: "maximumSumInsured",
          label: "Maximum Sum Insured",
          type: "number",
          order: 2,
          size: "sm",
          defaultValue: 10000000,
          validation: { required: true }
        },
        {
          id: "sumInsuredBasis",
          name: "sumInsuredBasis",
          label: "Sum Insured Basis",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "default", label: "Default (Fixed)" },
            { value: "derived", label: "Derived" }
          ],
          defaultValue: "default",
          validation: { required: true }
        },
        {
          id: "saBasisFormulaRef",
          name: "saBasisFormulaRef",
          label: "SA Basis Formula Reference",
          type: "select",
          order: 4,
          size: "sm",
          options: [
            { value: "salary-multiple", label: "Salary Multiple" },
            { value: "grade-based", label: "Grade Based" },
            { value: "loan-outstanding", label: "Loan Outstanding" },
            { value: "fixed", label: "Fixed Amount" }
          ],
          defaultValue: "fixed"
        },
        {
          id: "absoluteCap",
          name: "absoluteCap",
          label: "Absolute Cap",
          type: "number",
          order: 5,
          size: "sm",
          defaultValue: 50000000
        },
        {
          id: "capByBorrowerCategory",
          name: "capByBorrowerCategory",
          label: "Cap by Borrower Category",
          type: "text",
          order: 6,
          size: "sm",
          placeholder: "e.g., Category A: 1Cr, Category B: 50L"
        },
        {
          id: "capByLenderProduct",
          name: "capByLenderProduct",
          label: "Cap by Lender Product",
          type: "text",
          order: 7,
          size: "sm",
          placeholder: "e.g., Home Loan: 2Cr, Personal: 25L"
        }
      ]
    },
    {
      id: "uw-hooks",
      title: "E) Underwriting Engine Hooks",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "uwMethodDetailed",
          name: "uwMethodDetailed",
          label: "UW Method",
          type: "select",
          order: 1,
          size: "sm",
          options: [
            { value: "stp", label: "STP (Straight Through Processing)" },
            { value: "nstp", label: "NSTP (Non-STP)" },
            { value: "simplified", label: "Simplified Medical" },
            { value: "full", label: "Full Medical Underwriting" }
          ],
          defaultValue: "stp",
          validation: { required: true }
        },
        {
          id: "fclMode",
          name: "fclMode",
          label: "FCL Mode",
          type: "select",
          order: 2,
          size: "sm",
          options: [
            { value: "none", label: "None" },
            { value: "by-plan", label: "By Plan" },
            { value: "by-category", label: "By Category" },
            { value: "by-grade", label: "By Grade" }
          ],
          defaultValue: "none"
        },
        {
          id: "fclThresholdsRef",
          name: "fclThresholdsRef",
          label: "FCL Thresholds Table Reference",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "fcl-table-01", label: "FCL Table 01 (Standard)" },
            { value: "fcl-table-02", label: "FCL Table 02 (Enhanced)" },
            { value: "fcl-table-03", label: "FCL Table 03 (Credit Life)" }
          ]
        },
        {
          id: "evidenceRequirementPack",
          name: "evidenceRequirementPack",
          label: "Evidence Requirement Pack",
          type: "select",
          order: 4,
          size: "sm",
          options: [
            { value: "eoi-pack-01", label: "EOI Pack 01 (Basic)" },
            { value: "eoi-pack-02", label: "EOI Pack 02 (Standard)" },
            { value: "medical-pack-01", label: "Medical Pack 01 (Full)" },
            { value: "medical-pack-02", label: "Medical Pack 02 (Enhanced)" }
          ]
        }
      ]
    }
  ],
  actions: []
};

// ============================================
// Plan/Product Maintenance Screen 2 Form Config
// ============================================

// ============================================
// S13 - Component Templates Form Config
// ============================================

export const componentTemplatesFormConfig: FormConfig = {
  id: "component-templates-form",
  title: "Component Templates (S13)",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  sections: [
    {
      id: "operational-methods",
      title: "A) Operational Method Selectors",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "premiumMethod",
          name: "premiumMethod",
          label: "Premium Method",
          type: "select",
          order: 1,
          size: "sm",
          options: [
            { value: "PremiumMethod01", label: "PremiumMethod01" },
            { value: "PremiumMethod02", label: "PremiumMethod02" },
            { value: "PremiumMethod03", label: "PremiumMethod03" },
            { value: "PremiumMethod04", label: "PremiumMethod04" },
            { value: "PremiumMethod05", label: "PremiumMethod05" }
          ],
          defaultValue: "PremiumMethod05",
          validation: { required: true }
        },
        {
          id: "uwMethod",
          name: "uwMethod",
          label: "UW Method (Rule Pack ID)",
          type: "select",
          order: 2,
          size: "sm",
          options: [
            { value: "uw-rule-pack-01", label: "UW Rule Pack 01" },
            { value: "uw-rule-pack-02", label: "UW Rule Pack 02" },
            { value: "simplified", label: "Simplified Underwriting" },
            { value: "full", label: "Full Underwriting" }
          ],
          defaultValue: "simplified",
          validation: { required: true }
        },
        {
          id: "enrollmentType",
          name: "enrollmentType",
          label: "Enrollment Type",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "mandatory", label: "Mandatory" },
            { value: "voluntary", label: "Voluntary" },
            { value: "contributory", label: "Contributory" },
            { value: "non-contributory", label: "Non-contributory" }
          ],
          defaultValue: "mandatory",
          validation: { required: true }
        },
        {
          id: "livesCovered",
          name: "livesCovered",
          label: "Lives Covered",
          type: "select",
          order: 4,
          size: "sm",
          options: [
            { value: "all", label: "All Lives" },
            { value: "employee", label: "Employee Only" },
            { value: "dependents", label: "Dependents Only" }
          ],
          defaultValue: "all",
          validation: { required: true }
        },
        {
          id: "memberType",
          name: "memberType",
          label: "Member Type",
          type: "select",
          order: 5,
          size: "sm",
          options: [
            { value: "spouse", label: "Spouse" },
            { value: "child", label: "Child" },
            { value: "parent", label: "Parent" },
            { value: "employee", label: "Employee" }
          ],
          defaultValue: "employee",
          validation: { required: true }
        }
      ]
    },
    {
      id: "grid-references",
      title: "B) Grid References",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "uwGrid01",
          name: "uwGrid01",
          label: "UW Grid-01 Reference",
          type: "select",
          order: 1,
          size: "sm",
          options: [
            { value: "grid-a", label: "Grid A" },
            { value: "grid-b", label: "Grid B" },
            { value: "grid-c", label: "Grid C" }
          ]
        },
        {
          id: "uwGrid02",
          name: "uwGrid02",
          label: "UW Grid-02 Reference",
          type: "select",
          order: 2,
          size: "sm",
          options: [
            { value: "grid-a", label: "Grid A" },
            { value: "grid-b", label: "Grid B" },
            { value: "grid-c", label: "Grid C" }
          ]
        },
        {
          id: "gstType",
          name: "gstType",
          label: "GST Type",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "standard", label: "Standard GST" },
            { value: "exempt", label: "GST Exempt" }
          ],
          defaultValue: "standard",
          validation: { required: true }
        }
      ]
    },
    {
      id: "output-templates",
      title: "C) Output Templates (Document Governance)",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "benefitTemplate",
          name: "benefitTemplate",
          label: "Benefit Template",
          type: "select",
          order: 1,
          size: "sm",
          options: [
            { value: "template01", label: "Template 01" },
            { value: "template02", label: "Template 02" }
          ],
          defaultValue: "template01",
          validation: { required: true }
        },
        {
          id: "benefitLimitTemplate",
          name: "benefitLimitTemplate",
          label: "Benefit Limit Template",
          type: "select",
          order: 2,
          size: "sm",
          options: [
            { value: "standard", label: "Standard" },
            { value: "enhanced", label: "Enhanced" },
            { value: "premium", label: "Premium" },
            { value: "custom", label: "Custom" }
          ]
        },
        {
          id: "memberLiabilityTemplate",
          name: "memberLiabilityTemplate",
          label: "Member Liability Template",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "no-liability", label: "No-liability" },
            { value: "co-payment", label: "Co-payment" },
            { value: "deductibility", label: "Deductibility" },
            { value: "custom", label: "Custom" }
          ]
        },
        {
          id: "termLifeTemplate",
          name: "termLifeTemplate",
          label: "Term Life Template",
          type: "select",
          order: 4,
          size: "sm",
          options: [
            { value: "standard", label: "Standard" },
            { value: "level", label: "Level" },
            { value: "decreasing", label: "Decreasing" },
            { value: "custom", label: "Custom" }
          ]
        },
        {
          id: "creditLifeTemplate",
          name: "creditLifeTemplate",
          label: "Credit Life Template",
          type: "select",
          order: 5,
          size: "sm",
          options: [
            { value: "standard-credit-life", label: "Standard Credit Life" },
            { value: "reducing-balance", label: "Reducing Balance" },
            { value: "level-balance", label: "Level Balance" }
          ]
        },
        {
          id: "quotePackTemplate",
          name: "quotePackTemplate",
          label: "Quote Pack Template",
          type: "select",
          order: 6,
          size: "sm",
          options: [
            { value: "quote-pack-standard", label: "Standard Quote Pack" },
            { value: "quote-pack-detailed", label: "Detailed Quote Pack" },
            { value: "quote-pack-summary", label: "Summary Quote Pack" }
          ]
        },
        {
          id: "coiTemplate",
          name: "coiTemplate",
          label: "COI Template",
          type: "select",
          order: 7,
          size: "sm",
          options: [
            { value: "coi-standard", label: "Standard COI" },
            { value: "coi-detailed", label: "Detailed COI" },
            { value: "coi-compact", label: "Compact COI" }
          ]
        },
        {
          id: "policyScheduleTemplate",
          name: "policyScheduleTemplate",
          label: "Policy Schedule Template",
          type: "select",
          order: 8,
          size: "sm",
          options: [
            { value: "schedule-standard", label: "Standard Schedule" },
            { value: "schedule-detailed", label: "Detailed Schedule" },
            { value: "schedule-summary", label: "Summary Schedule" }
          ]
        },
        {
          id: "deviationAddendumTemplate",
          name: "deviationAddendumTemplate",
          label: "Deviation Addendum Template",
          type: "select",
          order: 9,
          size: "sm",
          options: [
            { value: "deviation-standard", label: "Standard Deviation" },
            { value: "deviation-detailed", label: "Detailed Deviation" }
          ]
        },
        {
          id: "rateCardTemplate",
          name: "rateCardTemplate",
          label: "Rate Card Template",
          type: "select",
          order: 10,
          size: "sm",
          options: [
            { value: "rate-card-standard", label: "Standard Rate Card" },
            { value: "rate-card-detailed", label: "Detailed Rate Card" },
            { value: "rate-card-summary", label: "Summary Rate Card" }
          ]
        }
      ]
    },
    {
      id: "change-governance",
      title: "D) Change Governance",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "effectiveDate",
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
          order: 1,
          size: "sm",
          defaultValue: "2025-12-01",
          validation: { required: true }
        },
        {
          id: "templateVersion",
          name: "templateVersion",
          label: "Template Version",
          type: "text",
          order: 2,
          size: "sm",
          defaultValue: "1.0",
          validation: { required: true }
        },
        {
          id: "approvalState",
          name: "approvalState",
          label: "Approval State",
          type: "select",
          order: 3,
          size: "sm",
          options: [
            { value: "draft", label: "Draft" },
            { value: "pending-approval", label: "Pending Approval" },
            { value: "approved", label: "Approved" },
            { value: "retired", label: "Retired" }
          ],
          defaultValue: "draft",
          validation: { required: true }
        },
        {
          id: "reasonForTermination",
          name: "reasonForTermination",
          label: "Reason for Termination",
          type: "select",
          order: 4,
          size: "sm",
          options: [
            { value: "policy-expired", label: "Policy Expired" },
            { value: "non-payment", label: "Non-payment" },
            { value: "client-request", label: "Client Request" },
            { value: "claim-settlement", label: "Claim Settlement" },
            { value: "superseded", label: "Superseded by New Version" },
            { value: "other", label: "Other" }
          ]
        }
      ]
    }
  ],
  actions: []
};

// ============================================
// Product Constraints Preview Form Config (S11 - Section C)
// ============================================

export const productConstraintsPreviewFormConfig: FormConfig = {
  id: "product-constraints-preview-form",
  title: "Product Constraints Preview",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    {
      id: "riderMinAge",
      name: "riderMinAge",
      label: "Rider Min Age",
      type: "number",
      order: 1,
      size: "sm",
      defaultValue: 18
    },
    {
      id: "riderMaxAge",
      name: "riderMaxAge",
      label: "Rider Max Age",
      type: "number",
      order: 2,
      size: "sm",
      defaultValue: 65
    },
    {
      id: "maxSiMultiple",
      name: "maxSiMultiple",
      label: "Max SI Multiple",
      type: "number",
      order: 3,
      size: "sm",
      defaultValue: 2,
      helperText: "Multiple of base SI"
    },
    {
      id: "waitingPeriod",
      name: "waitingPeriod",
      label: "Waiting Period (Days)",
      type: "number",
      order: 4,
      size: "sm",
      defaultValue: 30
    },
    {
      id: "deferralPeriod",
      name: "deferralPeriod",
      label: "Deferral Period (Days)",
      type: "number",
      order: 5,
      size: "sm",
      defaultValue: 0
    },
    {
      id: "separatePremiumMethod",
      name: "separatePremiumMethod",
      label: "Requires Separate Premium Method?",
      type: "radio",
      order: 6,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      defaultValue: "no"
    }
  ],
  actions: []
};

// ============================================
// Premium Method 05 Form Config
// ============================================

// Section A: Method Header & Governance Form
export const premiumMethod05HeaderFormConfig: FormConfig = {
  id: "premium-method-05-header-form",
  title: "Method Header & Governance",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "premiumMethodCode",
      name: "premiumMethodCode",
      label: "Premium Method Code",
      type: "text",
      order: 1,
      size: "sm",
      placeholder: "Enter method code",
      validation: { required: true },
      disabled: true
    },
    {
      id: "premiumMethodName",
      name: "premiumMethodName",
      label: "Premium Method Name",
      type: "text",
      order: 2,
      size: "sm",
      placeholder: "Enter method name",
      validation: { required: true }
    },
    {
      id: "policyType",
      name: "policyType",
      label: "Policy Type",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select policy type",
      options: [
        { value: "GTL", label: "Group Term Life" },
        { value: "GCL", label: "Group Credit Life" },
        { value: "LOAN-GTL", label: "Loan-linked GTL" }
      ],
      validation: { required: true }
    },
    {
      id: "schemeType",
      name: "schemeType",
      label: "Scheme Type",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select scheme type",
      options: [
        { value: "employer-employee", label: "Employer–Employee" },
        { value: "lender-borrower", label: "Lender–Borrower" },
        { value: "other", label: "Other" }
      ],
      validation: { required: true }
    },
    {
      id: "effectiveFrom",
      name: "effectiveFrom",
      label: "Effective From",
      type: "date",
      order: 5,
      size: "sm",
      placeholder: "Select date",
      validation: { required: true }
    },
    {
      id: "effectiveTo",
      name: "effectiveTo",
      label: "Effective To",
      type: "date",
      order: 6,
      size: "sm",
      placeholder: "Select date"
    },
    {
      id: "versionNo",
      name: "versionNo",
      label: "Version No.",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "e.g., 1.0",
      disabled: true
    },
    {
      id: "versionStatus",
      name: "versionStatus",
      label: "Version Status",
      type: "select",
      order: 8,
      size: "sm",
      placeholder: "Select status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "retired", label: "Retired" }
      ],
      disabled: true
    },
    {
      id: "approver",
      name: "approver",
      label: "Approver",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Approver name",
      disabled: true
    },
    {
      id: "approvedTimestamp",
      name: "approvedTimestamp",
      label: "Approved On",
      type: "date",
      order: 10,
      size: "sm",
      disabled: true
    },
    {
      id: "changeNotes",
      name: "changeNotes",
      label: "Change Notes",
      type: "textarea",
      order: 11,
      size: "full",
      placeholder: "Enter reason for change or notes"
    },
    {
      id: "currency",
      name: "currency",
      label: "Currency",
      type: "select",
      order: 12,
      size: "sm",
      placeholder: "Select currency",
      options: [
        { value: "INR", label: "INR (₹)" },
        { value: "USD", label: "USD ($)" }
      ],
      validation: { required: true }
    },
    {
      id: "taxTreatmentRef",
      name: "taxTreatmentRef",
      label: "Tax Treatment Reference",
      type: "select",
      order: 13,
      size: "sm",
      placeholder: "Select GST type",
      options: [
        { value: "GST-18", label: "GST 18%" },
        { value: "GST-12", label: "GST 12%" },
        { value: "EXEMPT", label: "Exempt" }
      ]
    },
    {
      id: "roundingRule",
      name: "roundingRule",
      label: "Rounding Rule",
      type: "select",
      order: 14,
      size: "sm",
      placeholder: "Select rounding",
      options: [
        { value: "nearest-1", label: "Nearest ₹1" },
        { value: "nearest-10", label: "Nearest ₹10" },
        { value: "nearest-100", label: "Nearest ₹100" }
      ]
    },
    {
      id: "minimumPremium",
      name: "minimumPremium",
      label: "Minimum Premium",
      type: "number",
      order: 15,
      size: "sm",
      placeholder: "Enter minimum premium"
    },
    {
      id: "rateLockPolicy",
      name: "rateLockPolicy",
      label: "Rate Lock Policy",
      type: "select",
      order: 16,
      size: "sm",
      placeholder: "Select lock policy",
      options: [
        { value: "lock-at-quote", label: "Lock at Quote Version" },
        { value: "lock-at-issuance", label: "Lock at Policy Issuance" }
      ],
      helperText: "Determines when rate is frozen for premium calculation"
    }
  ],
  actions: []
};

// Section B: Rating Basis Definition Form
export const premiumMethod05RatingBasisFormConfig: FormConfig = {
  id: "premium-method-05-rating-basis-form",
  title: "Rating Basis Definition",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "ratingBasis",
      name: "ratingBasis",
      label: "Rating Basis",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select rating basis",
      options: [
        { value: "per-1000-sa", label: "₹ per 1,000 Sum Assured" },
        { value: "per-1-sa", label: "₹ per 1 Sum Assured" },
        { value: "flat-per-member", label: "Flat Premium per Member" },
        { value: "percent-sa", label: "% of Sum Assured" }
      ],
      validation: { required: true },
      helperText: "Defines how premium is calculated"
    },
    {
      id: "premiumFrequency",
      name: "premiumFrequency",
      label: "Premium Frequency Supported",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select frequencies",
      options: [
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "half-yearly", label: "Half-yearly" },
        { value: "yearly", label: "Yearly" },
        { value: "single", label: "Single Premium" }
      ]
    },
    {
      id: "billingPremiumBasis",
      name: "billingPremiumBasis",
      label: "Billing Premium Basis",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select basis",
      options: [
        { value: "annualized", label: "Annualized" },
        { value: "modalized", label: "Modalized at Source" }
      ]
    },
    {
      id: "modalFactorMonthly",
      name: "modalFactorMonthly",
      label: "Modal Factor - Monthly",
      type: "number",
      order: 4,
      size: "sm",
      placeholder: "e.g., 0.0875"
    },
    {
      id: "modalFactorQuarterly",
      name: "modalFactorQuarterly",
      label: "Modal Factor - Quarterly",
      type: "number",
      order: 5,
      size: "sm",
      placeholder: "e.g., 0.26"
    },
    {
      id: "modalFactorHalfYearly",
      name: "modalFactorHalfYearly",
      label: "Modal Factor - Half-yearly",
      type: "number",
      order: 6,
      size: "sm",
      placeholder: "e.g., 0.51"
    },
    {
      id: "modalFactorYearly",
      name: "modalFactorYearly",
      label: "Modal Factor - Yearly",
      type: "number",
      order: 7,
      size: "sm",
      placeholder: "e.g., 1.0"
    },
    {
      id: "riskVsGrossPremium",
      name: "riskVsGrossPremium",
      label: "Premium Type",
      type: "radio",
      order: 8,
      size: "sm",
      options: [
        { value: "risk", label: "Risk Premium (Net)" },
        { value: "gross", label: "Gross Premium" }
      ],
      helperText: "Risk premium requires adding loadings/fees to get gross"
    }
  ],
  actions: []
};

// Shared premium method fields for Rate Grid (expanded with all rating dimensions)
const premiumMethod05Fields: FormFieldConfig[] = [
  // Plan & Product
  {
    id: "planNumber",
    name: "planNumber",
    label: "Plan Number",
    type: "text" as const,
    order: 1,
    size: "sm",
    placeholder: "Enter plan number",
    validation: { required: true }
  },
  {
    id: "planDescription",
    name: "planDescription",
    label: "Plan Description",
    type: "text" as const,
    order: 2,
    size: "sm",
    placeholder: "Enter plan description",
    validation: { required: true }
  },
  {
    id: "productCode",
    name: "productCode",
    label: "Product Code",
    type: "text" as const,
    order: 3,
    size: "sm",
    placeholder: "Enter product code",
    validation: { required: true }
  },
  // Effective Dates (row-level)
  {
    id: "effectiveFrom",
    name: "effectiveFrom",
    label: "Effective From",
    type: "date" as const,
    order: 4,
    size: "sm",
    placeholder: "Select date",
    validation: { required: true }
  },
  {
    id: "effectiveTo",
    name: "effectiveTo",
    label: "Effective To",
    type: "date" as const,
    order: 5,
    size: "sm",
    placeholder: "Select date"
  },
  // Age Band
  {
    id: "ageBandFrom",
    name: "ageBandFrom",
    label: "Age Band From",
    type: "number" as const,
    order: 6,
    size: "sm",
    placeholder: "e.g., 18",
    validation: { required: true }
  },
  {
    id: "ageBandTo",
    name: "ageBandTo",
    label: "Age Band To",
    type: "number" as const,
    order: 7,
    size: "sm",
    placeholder: "e.g., 35",
    validation: { required: true }
  },
  // Rating Dimensions
  {
    id: "gender",
    name: "gender",
    label: "Gender",
    type: "select" as const,
    order: 8,
    size: "sm",
    placeholder: "Select gender",
    options: [
      { value: "M", label: "Male" },
      { value: "F", label: "Female" },
      { value: "O", label: "Other" },
      { value: "U", label: "Any/Unspecified" }
    ]
  },
  {
    id: "occupationClass",
    name: "occupationClass",
    label: "Occupation Class",
    type: "select" as const,
    order: 9,
    size: "sm",
    placeholder: "Select class",
    options: [
      { value: "1", label: "Class 1 (Low Risk)" },
      { value: "2", label: "Class 2 (Medium Risk)" },
      { value: "3", label: "Class 3 (High Risk)" },
      { value: "4", label: "Class 4 (Hazardous)" }
    ]
  },
  {
    id: "termBand",
    name: "termBand",
    label: "Term Band",
    type: "select" as const,
    order: 10,
    size: "sm",
    placeholder: "Select term",
    options: [
      { value: "1", label: "1 Year" },
      { value: "2-5", label: "2-5 Years" },
      { value: "6-10", label: "6-10 Years" },
      { value: "11-20", label: "11-20 Years" },
      { value: "20+", label: "20+ Years" }
    ]
  },
  // Sum Insured Band
  {
    id: "sumInsuredFrom",
    name: "sumInsuredFrom",
    label: "SI Band From",
    type: "number" as const,
    order: 11,
    size: "sm",
    placeholder: "e.g., 100000"
  },
  {
    id: "sumInsuredTo",
    name: "sumInsuredTo",
    label: "SI Band To",
    type: "number" as const,
    order: 12,
    size: "sm",
    placeholder: "e.g., 500000"
  },
  // Rates
  {
    id: "memberRate",
    name: "memberRate",
    label: "Member Rate",
    type: "number" as const,
    order: 13,
    size: "sm",
    placeholder: "Enter member rate",
    validation: { required: true }
  },
  {
    id: "spouseRate",
    name: "spouseRate",
    label: "Spouse Rate",
    type: "number" as const,
    order: 14,
    size: "sm",
    placeholder: "Enter spouse rate"
  },
  {
    id: "dependentRate",
    name: "dependentRate",
    label: "Dependent Rate",
    type: "number" as const,
    order: 15,
    size: "sm",
    placeholder: "Enter dependent rate"
  },
  // Rate Metadata
  {
    id: "rateUnit",
    name: "rateUnit",
    label: "Rate Unit",
    type: "select" as const,
    order: 16,
    size: "sm",
    placeholder: "Select unit",
    options: [
      { value: "per-1000-sa", label: "Per ₹1,000 SA" },
      { value: "per-member", label: "Per Member" },
      { value: "percent-sa", label: "% of SA" }
    ],
    validation: { required: true }
  },
  {
    id: "rowPriority",
    name: "rowPriority",
    label: "Row Priority",
    type: "number" as const,
    order: 17,
    size: "sm",
    placeholder: "e.g., 1",
    helperText: "Lower number = higher priority when multiple rows match"
  },
  {
    id: "rowStatus",
    name: "rowStatus",
    label: "Row Status",
    type: "select" as const,
    order: 18,
    size: "sm",
    placeholder: "Select status",
    options: [
      { value: "active", label: "Active" },
      { value: "retired", label: "Retired" }
    ],
    validation: { required: true }
  }
];

export const addPremiumMethod05FormConfig: FormConfig = {
  id: "add-premium-method-05-form",
  title: "Add Premium",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: premiumMethod05Fields,
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-05",
        method: "POST",
        onSuccessMessage: "Premium added successfully"
      }
    }
  ]
};

export const editPremiumMethod05FormConfig: FormConfig = {
  id: "edit-premium-method-05-form",
  title: "Edit Premium",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: premiumMethod05Fields,
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-05",
        method: "PUT",
        onSuccessMessage: "Premium updated successfully"
      }
    }
  ]
};

// ============================================
// Premium Method 06 Form Config
// ============================================

// Section A: Method Header & Governance Form (same as S15)
export const premiumMethod06HeaderFormConfig: FormConfig = {
  id: "premium-method-06-header-form",
  title: "Method Header & Governance",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "premiumMethodCode",
      name: "premiumMethodCode",
      label: "Premium Method Code",
      type: "text",
      order: 1,
      size: "sm",
      placeholder: "Enter method code",
      validation: { required: true },
      disabled: true
    },
    {
      id: "premiumMethodName",
      name: "premiumMethodName",
      label: "Premium Method Name",
      type: "text",
      order: 2,
      size: "sm",
      placeholder: "Enter method name",
      validation: { required: true }
    },
    {
      id: "policyType",
      name: "policyType",
      label: "Policy Type",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select policy type",
      options: [
        { value: "GTL", label: "Group Term Life" },
        { value: "GCL", label: "Group Credit Life" },
        { value: "LOAN-GTL", label: "Loan-linked GTL" }
      ],
      validation: { required: true }
    },
    {
      id: "schemeType",
      name: "schemeType",
      label: "Scheme Type",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select scheme type",
      options: [
        { value: "employer-employee", label: "Employer–Employee" },
        { value: "lender-borrower", label: "Lender–Borrower" },
        { value: "other", label: "Other" }
      ],
      validation: { required: true }
    },
    {
      id: "effectiveFrom",
      name: "effectiveFrom",
      label: "Effective From",
      type: "date",
      order: 5,
      size: "sm",
      placeholder: "Select date",
      validation: { required: true }
    },
    {
      id: "effectiveTo",
      name: "effectiveTo",
      label: "Effective To",
      type: "date",
      order: 6,
      size: "sm",
      placeholder: "Select date"
    },
    {
      id: "versionNo",
      name: "versionNo",
      label: "Version No.",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "e.g., 1.0",
      disabled: true
    },
    {
      id: "versionStatus",
      name: "versionStatus",
      label: "Version Status",
      type: "select",
      order: 8,
      size: "sm",
      placeholder: "Select status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "retired", label: "Retired" }
      ],
      disabled: true
    },
    {
      id: "approver",
      name: "approver",
      label: "Approver",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Approver name",
      disabled: true
    },
    {
      id: "approvedTimestamp",
      name: "approvedTimestamp",
      label: "Approved On",
      type: "date",
      order: 10,
      size: "sm",
      disabled: true
    },
    {
      id: "changeNotes",
      name: "changeNotes",
      label: "Change Notes",
      type: "textarea",
      order: 11,
      size: "full",
      placeholder: "Enter reason for change or notes"
    }
  ],
  actions: []
};

export const addPremiumMethod06FormConfig: FormConfig = {
  id: "add-premium-method-06-form",
  title: "Add Bundle Rate Row",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  sections: [
    {
      id: "plan-product-info",
      title: "Plan & Product Information",
      layout: { type: "grid", columns: 2, gap: "md" },
      fields: [
        {
          id: "planCode",
          name: "planCode",
          label: "Plan Code",
          type: "text" as const,
          order: 1,
          size: "sm",
          placeholder: "Enter plan code",
          validation: { required: true }
        },
        {
          id: "productDescription",
          name: "productDescription",
          label: "Product Description",
          type: "text" as const,
          order: 2,
          size: "sm",
          placeholder: "Enter product description",
          validation: { required: true }
        }
      ]
    },
    {
      id: "effective-dates",
      title: "Effective Period",
      layout: { type: "grid", columns: 2, gap: "md" },
      fields: [
        {
          id: "effectiveFrom",
          name: "effectiveFrom",
          label: "Effective From",
          type: "date" as const,
          order: 1,
          size: "sm",
          placeholder: "Select date",
          validation: { required: true }
        },
        {
          id: "effectiveTo",
          name: "effectiveTo",
          label: "Effective To",
          type: "date" as const,
          order: 2,
          size: "sm",
          placeholder: "Select date"
        }
      ]
    },
    {
      id: "rating-dimensions",
      title: "Rating Dimensions",
      description: "Define age band and sum insured range for rate lookup",
      layout: { type: "grid", columns: 4, gap: "md" },
      fields: [
        {
          id: "ageBandFrom",
          name: "ageBandFrom",
          label: "Age From",
          type: "number" as const,
          order: 1,
          size: "sm",
          placeholder: "e.g., 18",
          validation: { required: true }
        },
        {
          id: "ageBandTo",
          name: "ageBandTo",
          label: "Age To",
          type: "number" as const,
          order: 2,
          size: "sm",
          placeholder: "e.g., 35",
          validation: { required: true }
        },
        {
          id: "sumInsuredFrom",
          name: "sumInsuredFrom",
          label: "SI From",
          type: "number" as const,
          order: 3,
          size: "sm",
          placeholder: "e.g., 100000"
        },
        {
          id: "sumInsuredTo",
          name: "sumInsuredTo",
          label: "SI To",
          type: "number" as const,
          order: 4,
          size: "sm",
          placeholder: "e.g., 500000"
        }
      ]
    },
    {
      id: "bundle-rates",
      title: "Bundle Rates",
      description: "Enter rates for each bundle type",
      layout: { type: "grid", columns: 3, gap: "md" },
      fields: [
        {
          id: "employeeOnlyRate",
          name: "employeeOnlyRate",
          label: "Employee Only",
          type: "number" as const,
          order: 1,
          size: "sm",
          placeholder: "Enter rate",
          validation: { required: true }
        },
        {
          id: "employeeSpouseRate",
          name: "employeeSpouseRate",
          label: "Employee + Spouse",
          type: "number" as const,
          order: 2,
          size: "sm",
          placeholder: "Enter rate"
        },
        {
          id: "employeeChildrenRate",
          name: "employeeChildrenRate",
          label: "Employee + Children",
          type: "number" as const,
          order: 3,
          size: "sm",
          placeholder: "Enter rate"
        },
        {
          id: "familyRate",
          name: "familyRate",
          label: "Family (E+S+C)",
          type: "number" as const,
          order: 4,
          size: "sm",
          placeholder: "Enter rate"
        },
        {
          id: "borrowerOnlyRate",
          name: "borrowerOnlyRate",
          label: "Borrower Only",
          type: "number" as const,
          order: 5,
          size: "sm",
          placeholder: "For loan-linked schemes"
        }
      ]
    },
    {
      id: "row-metadata",
      title: "Row Settings",
      layout: { type: "grid", columns: 2, gap: "md" },
      fields: [
        {
          id: "rowPriority",
          name: "rowPriority",
          label: "Row Priority",
          type: "number" as const,
          order: 1,
          size: "sm",
          placeholder: "e.g., 1",
          helperText: "Lower number = higher priority when multiple rows match"
        },
        {
          id: "rowStatus",
          name: "rowStatus",
          label: "Row Status",
          type: "select" as const,
          order: 2,
          size: "sm",
          placeholder: "Select status",
          options: [
            { value: "active", label: "Active" },
            { value: "retired", label: "Retired" }
          ],
          validation: { required: true }
        }
      ]
    }
  ],
  fields: [],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-06",
        method: "POST",
        onSuccessMessage: "Premium added successfully"
      }
    }
  ]
};

// ============================================
// Premium Method 07 Form Config
// ============================================

export const addPremiumMethod07FormConfig: FormConfig = {
  id: "add-premium-method-07-form",
  title: "Add Premium",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "planNumber",
      name: "planNumber",
      label: "Plan Number",
      type: "text" as const,
      order: 1,
      size: "md",
      placeholder: "Enter plan number",
      validation: { required: true }
    },
    {
      id: "planDescription",
      name: "planDescription",
      label: "Plan Description",
      type: "text" as const,
      order: 2,
      size: "md",
      placeholder: "Enter plan description",
      validation: { required: true }
    },
    // Row 2
    {
      id: "productCode",
      name: "productCode",
      label: "Product Code",
      type: "text" as const,
      order: 3,
      size: "md",
      placeholder: "Enter product code",
      validation: { required: true }
    },
    {
      id: "productDescription",
      name: "productDescription",
      label: "Product Description",
      type: "text" as const,
      order: 4,
      size: "md",
      placeholder: "Enter product description",
      validation: { required: true }
    },
    // Row 3
    {
      id: "sumInsured",
      name: "sumInsured",
      label: "Sum Insured",
      type: "text" as const,
      order: 5,
      size: "full",
      placeholder: "Enter sum insured (optional)"
    },
    // Row 4
    {
      id: "gender",
      name: "gender",
      label: "Gender",
      type: "select",
      order: 6,
      size: "full",
      placeholder: "Select gender",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" }
      ],
      validation: { required: true }
    },
    // Row 5
    {
      id: "fromAge",
      name: "fromAge",
      label: "From Age",
      type: "number",
      order: 7,
      size: "md",
      placeholder: "Enter from age",
      validation: { required: true }
    },
    {
      id: "toAge",
      name: "toAge",
      label: "To Age",
      type: "number",
      order: 8,
      size: "md",
      placeholder: "Enter to age",
      validation: { required: true }
    },
    // Row 6
    {
      id: "premiumRate",
      name: "premiumRate",
      label: "Premium Rate",
      type: "text" as const,
      order: 9,
      size: "full",
      placeholder: "Enter premium rate",
      validation: { required: true }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-07",
        method: "POST",
        onSuccessMessage: "Premium added successfully"
      }
    }
  ]
};

// ============================================
// Premium Method 08 Form Config
// ============================================

export const addPremiumMethod08FormConfig: FormConfig = {
  id: "add-premium-method-08-form",
  title: "Add Premium",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "planNumber",
      name: "planNumber",
      label: "Plan Number",
      type: "text" as const,
      order: 1,
      size: "md",
      placeholder: "Enter plan number",
      validation: { required: true }
    },
    {
      id: "planDescription",
      name: "planDescription",
      label: "Plan Description",
      type: "text" as const,
      order: 2,
      size: "md",
      placeholder: "Enter plan description",
      validation: { required: true }
    },
    // Row 2
    {
      id: "productCode",
      name: "productCode",
      label: "Product Code",
      type: "text" as const,
      order: 3,
      size: "md",
      placeholder: "Enter product code",
      validation: { required: true }
    },
    {
      id: "productDescription",
      name: "productDescription",
      label: "Product Description",
      type: "text" as const,
      order: 4,
      size: "md",
      placeholder: "Enter product description",
      validation: { required: true }
    },
    // Row 3
    {
      id: "sumInsured",
      name: "sumInsured",
      label: "Sum Insured",
      type: "text" as const,
      order: 5,
      size: "full",
      placeholder: "Enter sum insured (optional)"
    },
    // Row 4
    {
      id: "gender",
      name: "gender",
      label: "Gender",
      type: "select",
      order: 6,
      size: "full",
      placeholder: "Select gender",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" }
      ],
      validation: { required: true }
    },
    // Row 5
    {
      id: "occupationalClass",
      name: "occupationalClass",
      label: "Occupational Class",
      type: "select",
      order: 7,
      size: "full",
      placeholder: "Select occupational class",
      options: [
        { value: "class-1", label: "Class 1" },
        { value: "class-2", label: "Class 2" },
        { value: "class-3", label: "Class 3" },
        { value: "class-4", label: "Class 4" }
      ],
      validation: { required: true }
    },
    // Row 6
    {
      id: "age",
      name: "age",
      label: "Age",
      type: "number",
      order: 8,
      size: "full",
      placeholder: "Enter age",
      validation: { required: true }
    },
    // Row 7
    {
      id: "premiumRate",
      name: "premiumRate",
      label: "Premium Rate",
      type: "text" as const,
      order: 9,
      size: "full",
      placeholder: "Enter premium rate",
      validation: { required: true }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-08",
        method: "POST",
        onSuccessMessage: "Premium added successfully"
      }
    }
  ]
};

export const editPremiumMethod06FormConfig: FormConfig = {
  ...addPremiumMethod06FormConfig,
  id: "edit-premium-method-06-form",
  title: "Edit Bundle Rate Row",
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-06",
        method: "PUT",
        onSuccessMessage: "Premium updated successfully"
      }
    }
  ]
};

export const editPremiumMethod07FormConfig: FormConfig = {
  ...addPremiumMethod07FormConfig,
  id: "edit-premium-method-07-form",
  title: "Edit Premium",
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-07",
        method: "PUT",
        onSuccessMessage: "Premium updated successfully"
      }
    }
  ]
};

export const editPremiumMethod08FormConfig: FormConfig = {
  ...addPremiumMethod08FormConfig,
  id: "edit-premium-method-08-form",
  title: "Edit Premium",
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-08",
        method: "PUT",
        onSuccessMessage: "Premium updated successfully"
      }
    }
  ]
};

// ============================================
// Upload Members Form Config
// ============================================

export const uploadMembersFormConfig: FormConfig = {
  id: "upload-members-form",
  title: "Upload Members",
  description: "Upload a CSV file containing member data",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "membersFile",
      name: "membersFile",
      label: "Members CSV File",
      type: "file",
      order: 1,
      size: "full",
      placeholder: "Select a CSV file",
      validation: {
        required: true
      },
      fileConfig: {
        accept: ".csv",
        maxSize: 10485760,
        maxFiles: 1
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "upload",
      label: "Upload",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/members/upload",
        method: "POST",
        onSuccessMessage: "Members uploaded successfully"
      }
    }
  ]
};

// ============================================
// Bulk Import Rates Form Config
// ============================================

export const bulkImportRatesFormConfig: FormConfig = {
  id: "bulk-import-rates-form",
  title: "Bulk Import Rates",
  description: "Upload a CSV file containing rate grid data",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "ratesFile",
      name: "ratesFile",
      label: "Rates CSV File",
      type: "file",
      order: 1,
      size: "full",
      placeholder: "Select a CSV file",
      validation: {
        required: true
      },
      fileConfig: {
        accept: ".csv",
        maxSize: 10485760,
        maxFiles: 1
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "upload",
      label: "Upload",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-05/bulk-import",
        method: "POST",
        onSuccessMessage: "Rates imported successfully"
      }
    }
  ]
};

// ============================================
// Bulk Import Bundle Rates Form Config
// ============================================

export const bulkImportBundleRatesFormConfig: FormConfig = {
  id: "bulk-import-bundle-rates-form",
  title: "Bulk Import Bundle Rates",
  description: "Upload a CSV file containing bundle rate grid data",
  layout: {
    type: "grid",
    columns: 1,
    gap: "md"
  },
  fields: [
    {
      id: "bundleRatesFile",
      name: "bundleRatesFile",
      label: "Bundle Rates CSV File",
      type: "file",
      order: 1,
      size: "full",
      placeholder: "Select a CSV file",
      validation: {
        required: true
      },
      fileConfig: {
        accept: ".csv",
        maxSize: 10485760,
        maxFiles: 1
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "upload",
      label: "Upload",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/premium-method-06/bulk-import",
        method: "POST",
        onSuccessMessage: "Bundle rates imported successfully"
      }
    }
  ]
};

// ============================================
// Add Headcount Form Config
// ============================================

export const addHeadcountFormConfig: FormConfig = {
  id: "add-headcount-form",
  title: "Add Headcount",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "headcountNumber",
      name: "headcountNumber",
      label: "Headcount Number",
      type: "text" as const,
      order: 1,
      size: "full",
      placeholder: "Auto-generated",
      disabled: true
    },
    // Row 2
    {
      id: "planNumber",
      name: "planNumber",
      label: "Plan Number",
      type: "text" as const,
      order: 2,
      size: "md",
      placeholder: "Enter plan number",
      validation: {
        required: true
      }
    },
    {
      id: "planDescription",
      name: "planDescription",
      label: "Plan Description",
      type: "text" as const,
      order: 3,
      size: "md",
      placeholder: "Auto-populated",
      disabled: true
    },
    // Row 3
    {
      id: "productCode",
      name: "productCode",
      label: "Product Code",
      type: "text" as const,
      order: 4,
      size: "md",
      placeholder: "Enter product code",
      validation: {
        required: true
      }
    },
    {
      id: "productDescription",
      name: "productDescription",
      label: "Product Description",
      type: "text" as const,
      order: 5,
      size: "md",
      placeholder: "Auto-populated",
      disabled: true
    },
    // Row 4
    {
      id: "memberCount",
      name: "memberCount",
      label: "Member Count",
      type: "number",
      order: 6,
      size: "md",
      placeholder: "Enter member count",
      validation: {
        required: true
      }
    },
    {
      id: "totalSumInsured",
      name: "totalSumInsured",
      label: "Total Sum Insured",
      type: "text" as const,
      order: 7,
      size: "md",
      placeholder: "Enter total sum insured",
      validation: {
        required: true
      }
    },
    // Row 5
    {
      id: "subsidiary",
      name: "subsidiary",
      label: "Subsidiary",
      type: "select",
      order: 8,
      size: "md",
      placeholder: "Select subsidiary (optional)",
      options: [
        { value: "SUB001", label: "Subsidiary 001" },
        { value: "SUB002", label: "Subsidiary 002" },
        { value: "SUB003", label: "Subsidiary 003" }
      ]
    },
    {
      id: "averageAge",
      name: "averageAge",
      label: "Average Age",
      type: "number",
      order: 9,
      size: "md",
      placeholder: "Enter average age",
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/headcount",
        method: "POST",
        onSuccessMessage: "Headcount added successfully"
      }
    }
  ]
};

export const editHeadcountFormConfig: FormConfig = {
  ...addHeadcountFormConfig,
  id: "edit-headcount-form",
  title: "Edit Headcount",
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/headcount/:id",
        method: "PUT",
        onSuccessMessage: "Headcount updated successfully"
      }
    }
  ]
};

// ============================================
// Plan/Product Health Form Config
// ============================================

// Externalized options for better maintainability
const HEALTH_PLAN_TYPES = [
  { value: "HMO", label: "HMO" },
  { value: "PPO", label: "PPO" },
  { value: "EPO", label: "EPO" },
  { value: "POS", label: "POS" }
];

const FLOAT_PLAN_NUMBERS = [
  { value: "FLOAT001", label: "FLOAT001" },
  { value: "FLOAT002", label: "FLOAT002" },
  { value: "FLOAT003", label: "FLOAT003" }
];

const PROVIDER_NETWORKS = [
  { value: "network1", label: "Network 1" },
  { value: "network2", label: "Network 2" },
  { value: "network3", label: "Network 3" }
];

const PRIMARY_PHYSICIANS_1 = [
  { value: "physician1", label: "Dr. Smith" },
  { value: "physician2", label: "Dr. Johnson" },
  { value: "physician3", label: "Dr. Williams" }
];

const PRIMARY_PHYSICIANS_2 = [
  { value: "physician1", label: "Dr. Brown" },
  { value: "physician2", label: "Dr. Davis" },
  { value: "physician3", label: "Dr. Miller" }
];

const PRE_AUTH_CODES = [
  { value: "AUTH001", label: "AUTH001" },
  { value: "AUTH002", label: "AUTH002" },
  { value: "AUTH003", label: "AUTH003" }
];

const DEDUCTIBLE_OPTIONS = [
  { value: "claim", label: "Per Claim" },
  { value: "policy", label: "Per Policy" },
  { value: "member", label: "Per Member" }
];

const CARD_TYPES = [
  { value: "physical", label: "Physical Card" },
  { value: "digital", label: "Digital Card" },
  { value: "both", label: "Both" }
];

const ROOM_TYPES = [
  { value: "private", label: "Private Room" },
  { value: "semi-private", label: "Semi-Private Room" },
  { value: "general", label: "General Ward" },
  { value: "deluxe", label: "Deluxe Room" }
];

export const planProductHealthFormConfig: FormConfig = {
  id: "plan-product-health-form",
  title: "Plan / Product - Additional Data for Health",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "healthPlanType",
      name: "healthPlanType",
      label: "Health Plan Type",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Health Plan Type",
      options: HEALTH_PLAN_TYPES,
      validation: {
        required: true
      }
    },
    {
      id: "mainFloatPlanNumber",
      name: "mainFloatPlanNumber",
      label: "Main Float Plan Number",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Main Float Plan Number",
      options: FLOAT_PLAN_NUMBERS
    },
    {
      id: "percentOfFloat",
      name: "percentOfFloat",
      label: "% of Float",
      type: "text" as const,
      order: 3,
      size: "sm",
      placeholder: "Enter percentage"
    },
    // Row 2
    {
      id: "providerNetwork",
      name: "providerNetwork",
      label: "Provider Network",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Provider Network",
      options: PROVIDER_NETWORKS,
      validation: {
        required: true
      }
    },
    {
      id: "gateKeeping",
      name: "gateKeeping",
      label: "Gate Keeping ?",
      type: "radio",
      order: 5,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "primaryPhysicianCare1",
      name: "primaryPhysicianCare1",
      label: "Primary Physician Care-1",
      type: "select",
      order: 6,
      size: "sm",
      placeholder: "Select Primary Physician Care-1",
      options: PRIMARY_PHYSICIANS_1
    },
    // Row 3
    {
      id: "primaryPhysicianCare2",
      name: "primaryPhysicianCare2",
      label: "Primary Physician Care-2",
      type: "select",
      order: 7,
      size: "sm",
      placeholder: "Select Primary Physician Care-2",
      options: PRIMARY_PHYSICIANS_2
    },
    {
      id: "claimWaitingPeriod",
      name: "claimWaitingPeriod",
      label: "Claim Waiting Period",
      type: "text" as const,
      order: 8,
      size: "sm",
      placeholder: "Enter waiting period",
      validation: {
        required: true
      }
    },
    {
      id: "cashlessAdmission",
      name: "cashlessAdmission",
      label: "Cashless Admission ?",
      type: "radio",
      order: 9,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    // Row 4
    {
      id: "preAuthorisationCode",
      name: "preAuthorisationCode",
      label: "Pre-authorisation Code",
      type: "select",
      order: 10,
      size: "sm",
      placeholder: "Select Pre-authorisation Code",
      options: PRE_AUTH_CODES,
      validation: {
        required: true
      }
    },
    {
      id: "applyDeductibleOn",
      name: "applyDeductibleOn",
      label: "Apply Deductible On",
      type: "select",
      order: 11,
      size: "sm",
      placeholder: "Select Apply Deductible On",
      options: DEDUCTIBLE_OPTIONS
    },
    {
      id: "annualAggregateDeductible",
      name: "annualAggregateDeductible",
      label: "Annual Aggregate Deductible",
      type: "text" as const,
      order: 12,
      size: "sm",
      placeholder: "Enter amount"
    },
    // Row 5
    {
      id: "cardType",
      name: "cardType",
      label: "Card Type",
      type: "select",
      order: 13,
      size: "sm",
      placeholder: "Select Card Type",
      options: CARD_TYPES
    },
    {
      id: "roomType",
      name: "roomType",
      label: "Room Type",
      type: "select",
      order: 14,
      size: "sm",
      placeholder: "Select Room Type",
      options: ROOM_TYPES
    },
    {
      id: "preExistingBefore",
      name: "preExistingBefore",
      label: "Pre-existing Before",
      type: "text" as const,
      order: 15,
      size: "sm",
      placeholder: "Enter period",
      validation: {
        required: true
      }
    },
    // Row 6
    {
      id: "preExistingAfter",
      name: "preExistingAfter",
      label: "Pre-existing After",
      type: "text" as const,
      order: 16,
      size: "sm",
      placeholder: "Enter period",
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-product-health",
        method: "POST",
        onSuccessMessage: "Plan/Product Health data saved successfully"
      }
    }
  ]
};

// ============================================
// Plan/Product Term Life Form Config
// ============================================

// Externalized configuration options
const SALARY_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" }
];

const SUM_INSURED_FORMULA_OPTIONS = [
  { value: "salary-multiple", label: "Salary Multiple" },
  { value: "fixed-amount", label: "Fixed Amount" },
  { value: "percentage-salary", label: "Percentage of Salary" },
  { value: "age-based", label: "Age Based" }
];

const RELATED_PRODUCT_CODES = [
  { value: "TERM001", label: "TERM001" },
  { value: "TERM002", label: "TERM002" },
  { value: "TERM003", label: "TERM003" },
  { value: "LIFE001", label: "LIFE001" },
  { value: "LIFE002", label: "LIFE002" }
];

export const planProductTermLifeFormConfig: FormConfig = {
  id: "plan-product-term-life-form",
  title: "Plan / Product - Additional Data for Term Life",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "salaryFrequency",
      name: "salaryFrequency",
      label: "Salary Frequency",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Salary Frequency",
      options: SALARY_FREQUENCY_OPTIONS,
      validation: {
        required: true
      }
    },
    {
      id: "sumInsuredFormula",
      name: "sumInsuredFormula",
      label: "Sum Insured Formula",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Sum Insured Formula",
      options: SUM_INSURED_FORMULA_OPTIONS
    },
    {
      id: "multiplicationFactor",
      name: "multiplicationFactor",
      label: "Multiplication Factor",
      type: "number",
      order: 3,
      size: "sm",
      placeholder: "Enter Multiplication Factor",
      validation: {
        min: 0,
        max: 100
      }
    },
    // Row 2
    {
      id: "percentSumInsuredValue",
      name: "percentSumInsuredValue",
      label: "% of Sum Insured Value",
      type: "number",
      order: 4,
      size: "sm",
      placeholder: "Enter % of Sum Insured (0-100)",
      validation: {
        required: true,
        min: 0,
        max: 100
      }
    },
    {
      id: "relatedProductCode",
      name: "relatedProductCode",
      label: "Related Product Code",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Related Product Code",
      options: RELATED_PRODUCT_CODES
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-product-term-life",
        method: "POST",
        onSuccessMessage: "Plan/Product Term Life data saved successfully"
      }
    }
  ]
};

// ============================================
// Plan/Product Credit Life Form Config
// ============================================

// Credit Life configuration options
const RCD_DATE_RULES = [
  { value: "loan-start", label: "Loan Start Date" },
  { value: "policy-start", label: "Policy Start Date" },
  { value: "custom", label: "Custom Rule" }
];

const LOAN_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-yearly", label: "Half-Yearly" },
  { value: "annually", label: "Annually" }
];

export const planProductCreditLifeFormConfig: FormConfig = {
  id: "plan-product-credit-life-form",
  title: "Plan / Product - Additional Data-1 for Credit Life",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "rcdDateRule",
      name: "rcdDateRule",
      label: "RCD Date Rule",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select RCD Date Rule",
      options: RCD_DATE_RULES,
      validation: {
        required: true
      }
    },
    {
      id: "loanStartDate",
      name: "loanStartDate",
      label: "Loan Start Date",
      type: "date",
      order: 2,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "loanEndDate",
      name: "loanEndDate",
      label: "Loan End Date",
      type: "date",
      order: 3,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    // Row 2
    {
      id: "loanTermMonths",
      name: "loanTermMonths",
      label: "Loan Term (Months)",
      type: "number",
      order: 4,
      size: "sm",
      placeholder: "Enter Loan Term in Months",
      validation: {
        required: true,
        min: 1,
        max: 360
      }
    },
    {
      id: "loanDecreasingFrequency",
      name: "loanDecreasingFrequency",
      label: "Loan Decreasing Frequency",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Loan Decreasing Frequency",
      options: LOAN_FREQUENCY_OPTIONS
    },
    {
      id: "insuranceStartMiddleLoan",
      name: "insuranceStartMiddleLoan",
      label: "Does Insurance Start in Middle of Loan?",
      type: "radio",
      order: 6,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    // Row 3
    {
      id: "isTopUpLoan",
      name: "isTopUpLoan",
      label: "Is it Top-up Loan?",
      type: "radio",
      order: 7,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "loanTakenBefore",
      name: "loanTakenBefore",
      label: "Loan Taken Before?",
      type: "radio",
      order: 8,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "loanInterestRate",
      name: "loanInterestRate",
      label: "Loan Interest Rate",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Enter Interest Rate",
      validation: {
        required: true
      }
    },
    // Row 4
    {
      id: "loanType",
      name: "loanType",
      label: "Loan Type",
      type: "select",
      order: 10,
      size: "sm",
      placeholder: "Select Loan Type",
      options: [
        { value: "personal", label: "Personal Loan" },
        { value: "home", label: "Home Loan" },
        { value: "auto", label: "Auto Loan" },
        { value: "business", label: "Business Loan" },
        { value: "education", label: "Education Loan" }
      ]
    },
    {
      id: "loanNature",
      name: "loanNature",
      label: "Loan Nature",
      type: "select",
      order: 11,
      size: "sm",
      placeholder: "Select Loan Nature",
      options: [
        { value: "secured", label: "Secured" },
        { value: "unsecured", label: "Unsecured" },
        { value: "semi-secured", label: "Semi-Secured" }
      ]
    },
    {
      id: "moratoriumMonths",
      name: "moratoriumMonths",
      label: "Moratorium in Months",
      type: "number",
      order: 12,
      size: "sm",
      placeholder: "Enter Moratorium in Months"
    },
    // Row 5
    {
      id: "interestPayableDuringMoratorium",
      name: "interestPayableDuringMoratorium",
      label: "Is Interest Payable During Moratorium?",
      type: "radio",
      order: 13,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "loanMix",
      name: "loanMix",
      label: "Loan Mix",
      type: "select",
      order: 14,
      size: "sm",
      placeholder: "Select Loan Mix",
      options: [
        { value: "single", label: "Single Product" },
        { value: "mixed", label: "Mixed Portfolio" },
        { value: "bundled", label: "Bundled Package" }
      ]
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-product-credit-life",
        method: "POST",
        onSuccessMessage: "Plan/Product Credit Life data saved successfully"
      }
    }
  ]
};

// ============================================
// Benefit Investment Form Config
// ============================================

export const benefitInvestmentFormConfig: FormConfig = {
  id: "benefit-investment-form",
  title: "Plan / Product / Benefit Maintenance (Investment Products)",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Benefit Code",
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Critical Illness" },
        { value: "DIS01", label: "DIS01 - Disability Benefit" },
        { value: "MAT01", label: "MAT01 - Maturity Benefit" },
        { value: "SUR01", label: "SUR01 - Surrender Benefit" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "exitFromPolicy",
      name: "exitFromPolicy",
      label: "Exit from Policy",
      type: "radio",
      order: 2,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "formulaBenefitAmountPayable",
      name: "formulaBenefitAmountPayable",
      label: "Formula for Benefit Amount Payable",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select Formula for Benefit Amount Payable",
      options: [
        { value: "sum-assured", label: "Sum Assured" },
        { value: "fund-value", label: "Fund Value" },
        { value: "higher-of-both", label: "Higher of Sum Assured and Fund Value" },
        { value: "lower-of-both", label: "Lower of Sum Assured and Fund Value" },
        { value: "percentage-fund", label: "Percentage of Fund Value" }
      ],
      validation: {
        required: true
      }
    },
    // Row 2
    {
      id: "benefitPaymentSettlementMode",
      name: "benefitPaymentSettlementMode",
      label: "Benefit Payment Settlement Mode",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Benefit Payment Settlement Mode",
      options: [
        { value: "lump-sum", label: "Lump Sum" },
        { value: "installments", label: "Installments" },
        { value: "annuity", label: "Annuity" },
        { value: "partial-withdrawal", label: "Partial Withdrawal" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "vestingRule",
      name: "vestingRule",
      label: "Vesting Rule",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Vesting Rule",
      options: [
        { value: "immediate", label: "Immediate Vesting" },
        { value: "graded", label: "Graded Vesting" },
        { value: "cliff", label: "Cliff Vesting" },
        { value: "none", label: "No Vesting" }
      ]
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/benefit-investment",
        method: "POST",
        onSuccessMessage: "Benefit Investment data saved successfully"
      }
    }
  ]
};

// ============================================
// Plan/Product Investment Form Config
// ============================================

export const planProductInvestmentFormConfig: FormConfig = {
  id: "plan-product-investment-form",
  title: "Plan / Product - Additional Data for Investment Products",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    // Row 1
    {
      id: "benefitDesign",
      name: "benefitDesign",
      label: "Benefit Design",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Benefit Design",
      options: [
        { value: "unit-linked", label: "Unit Linked" },
        { value: "traditional", label: "Traditional" },
        { value: "hybrid", label: "Hybrid" },
        { value: "with-profits", label: "With Profits" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "investmentFundMix",
      name: "investmentFundMix",
      label: "Investment Fund Mix",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Investment Fund Mix",
      options: [
        { value: "equity", label: "Equity Fund" },
        { value: "debt", label: "Debt Fund" },
        { value: "balanced", label: "Balanced Fund" },
        { value: "liquid", label: "Liquid Fund" },
        { value: "multi-asset", label: "Multi Asset Fund" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "contributionRule",
      name: "contributionRule",
      label: "Contribution Rule",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select Contribution Rule",
      options: [
        { value: "regular", label: "Regular Premium" },
        { value: "single", label: "Single Premium" },
        { value: "flexible", label: "Flexible Premium" },
        { value: "limited", label: "Limited Premium" }
      ],
      validation: {
        required: true
      }
    },
    // Row 2
    {
      id: "investmentStrategyLevel",
      name: "investmentStrategyLevel",
      label: "Investment Strategy Level",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Investment Strategy Level",
      options: [
        { value: "conservative", label: "Conservative" },
        { value: "moderate", label: "Moderate" },
        { value: "aggressive", label: "Aggressive" },
        { value: "balanced", label: "Balanced" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "investmentStrategy",
      name: "investmentStrategy",
      label: "Investment Strategy",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Investment Strategy",
      options: [
        { value: "growth", label: "Growth Strategy" },
        { value: "income", label: "Income Strategy" },
        { value: "value", label: "Value Strategy" },
        { value: "index", label: "Index Strategy" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "unitAllocationBasis",
      name: "unitAllocationBasis",
      label: "Unit Allocation / De-allocation Basis",
      type: "select",
      order: 6,
      size: "sm",
      placeholder: "Select Unit Allocation / De-allocation Basis",
      options: [
        { value: "nav", label: "NAV Based" },
        { value: "bid-offer", label: "Bid-Offer Based" },
        { value: "fixed-price", label: "Fixed Price" },
        { value: "market-price", label: "Market Price" }
      ],
      validation: {
        required: true
      }
    },
    // Row 3
    {
      id: "unitLinkedBasisRule",
      name: "unitLinkedBasisRule",
      label: "Unit Linked Basis Rule",
      type: "select",
      order: 7,
      size: "sm",
      placeholder: "Select Unit Linked Basis Rule",
      options: [
        { value: "standard", label: "Standard Rule" },
        { value: "enhanced", label: "Enhanced Rule" },
        { value: "custom", label: "Custom Rule" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "unitBidOfferIndicator",
      name: "unitBidOfferIndicator",
      label: "Unit Bid/Offer Indicator",
      type: "radio",
      order: 8,
      size: "sm",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "feeScaleLevel",
      name: "feeScaleLevel",
      label: "Fee Scale Level",
      type: "select",
      order: 9,
      size: "sm",
      placeholder: "Select Fee Scale Level",
      options: [
        { value: "basic", label: "Basic" },
        { value: "premium", label: "Premium" },
        { value: "corporate", label: "Corporate" },
        { value: "vip", label: "VIP" }
      ],
      validation: {
        required: true
      }
    },
    // Row 4
    {
      id: "feeScale",
      name: "feeScale",
      label: "Fee Scale",
      type: "select",
      order: 10,
      size: "sm",
      placeholder: "Select Fee Scale",
      options: [
        { value: "percentage", label: "Percentage Based" },
        { value: "fixed", label: "Fixed Amount" },
        { value: "tiered", label: "Tiered Structure" },
        { value: "sliding", label: "Sliding Scale" }
      ],
      validation: {
        required: true
      }
    },
    {
      id: "retirementAgeRule",
      name: "retirementAgeRule",
      label: "Retirement Age Rule",
      type: "select",
      order: 11,
      size: "sm",
      placeholder: "Select Retirement Age Rule",
      options: [
        { value: "fixed-60", label: "Fixed at 60" },
        { value: "fixed-65", label: "Fixed at 65" },
        { value: "flexible", label: "Flexible" },
        { value: "policy-term", label: "End of Policy Term" }
      ],
      validation: {
        required: true
      }
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-product-investment",
        method: "POST",
        onSuccessMessage: "Plan/Product Investment data saved successfully"
      }
    }
  ]
};

// ============================================
// Member Search Form Config
// ============================================

export const memberSearchFormConfig: FormConfig = {
  id: "member-search-form",
  title: "Search Members",
  sections: [
    {
      id: "identifiers",
      title: "Member Identifiers",
      icon: "IdCard",
      layout: {
        type: "grid",
        columns: 4,
        gap: "md"
      },
      fields: [
        {
          id: "memberNumber",
          name: "memberNumber",
          label: "Member Number",
          type: "text" as const,
          order: 1,
          size: "sm",
          placeholder: "MEM-XXXX-XXX"
        },
        {
          id: "employeeNumber",
          name: "employeeNumber",
          label: "Employee Number",
          type: "text" as const,
          order: 2,
          size: "sm",
          placeholder: "EMP-XXXXX"
        },
        {
          id: "borrowerNumber",
          name: "borrowerNumber",
          label: "Borrower Number",
          type: "text" as const,
          order: 3,
          size: "sm",
          placeholder: "BRW-XXXX-XXX"
        },
        {
          id: "loanNumber",
          name: "loanNumber",
          label: "Loan Number",
          type: "text" as const,
          order: 4,
          size: "sm",
          placeholder: "LN-XXXX-XXXXX"
        }
      ]
    },
    {
      id: "personal",
      title: "Personal Details",
      icon: "User",
      layout: {
        type: "grid",
        columns: 4,
        gap: "md"
      },
      fields: [
        {
          id: "memberName",
          name: "memberName",
          label: "Member Name",
          type: "text" as const,
          order: 1,
          size: "sm",
          placeholder: "Enter name"
        },
        {
          id: "dateOfBirth",
          name: "dateOfBirth",
          label: "Date of Birth",
          type: "date",
          order: 2,
          size: "sm",
          placeholder: "Select date"
        },
        {
          id: "mobileNumber",
          name: "mobileNumber",
          label: "Mobile Number",
          type: "text" as const,
          order: 3,
          size: "sm",
          placeholder: "+91 XXXXX XXXXX"
        },
        {
          id: "email",
          name: "email",
          label: "Email",
          type: "text" as const,
          order: 4,
          size: "sm",
          placeholder: "email@example.com"
        }
      ]
    },
    {
      id: "coverage",
      title: "Coverage & Plan",
      icon: "Shield",
      layout: {
        type: "grid",
        columns: 3,
        gap: "md"
      },
      fields: [
        {
          id: "planNumber",
          name: "planNumber",
          label: "Plan Number",
          type: "select",
          order: 1,
          size: "sm",
          placeholder: "Select plan",
          options: [
            { value: "P01", label: "P01 - Base Death Benefit" },
            { value: "P02", label: "P02 - Accidental Death" },
            { value: "P03", label: "P03 - Critical Illness" }
          ]
        },
        {
          id: "subsidiaryCode",
          name: "subsidiaryCode",
          label: "Subsidiary",
          type: "select",
          order: 2,
          size: "sm",
          placeholder: "Select subsidiary",
          options: [
            { value: "SUB-MUM-001", label: "Mumbai HQ" },
            { value: "SUB-MUM-002", label: "Mumbai Branch" },
            { value: "SUB-DEL-001", label: "Delhi" },
            { value: "SUB-BLR-001", label: "Bangalore" },
            { value: "SUB-CHN-001", label: "Chennai" },
            { value: "SUB-HYD-001", label: "Hyderabad" }
          ]
        },
        {
          id: "status",
          name: "status",
          label: "Member Status",
          type: "select",
          order: 3,
          size: "sm",
          placeholder: "Select status",
          options: [
            { value: "active", label: "Active" },
            { value: "terminated", label: "Terminated" },
            { value: "lapsed", label: "Lapsed" },
            { value: "pending", label: "Pending" }
          ]
        }
      ]
    },
    {
      id: "intelligence",
      title: "Intelligence Filters",
      icon: "Brain",
      layout: {
        type: "grid",
        columns: 3,
        gap: "md"
      },
      fields: [
        {
          id: "fclStatus",
          name: "fclStatus",
          label: "FCL Status",
          type: "select",
          order: 1,
          size: "sm",
          placeholder: "Select FCL status",
          options: [
            { value: "within", label: "Within FCL" },
            { value: "above", label: "Above FCL" },
            { value: "not-computed", label: "Not Computed" }
          ]
        },
        {
          id: "uwStatus",
          name: "uwStatus",
          label: "UW Status",
          type: "select",
          order: 2,
          size: "sm",
          placeholder: "Select UW status",
          options: [
            { value: "not-required", label: "Not Required" },
            { value: "required", label: "Required" },
            { value: "in-progress", label: "In Progress" },
            { value: "cleared", label: "Cleared" }
          ]
        },
        {
          id: "evidenceStatus",
          name: "evidenceStatus",
          label: "Evidence Status",
          type: "select",
          order: 3,
          size: "sm",
          placeholder: "Select evidence status",
          options: [
            { value: "none", label: "None" },
            { value: "pending", label: "Pending" },
            { value: "received", label: "Received" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" }
          ]
        },
        {
          id: "pricingStatus",
          name: "pricingStatus",
          label: "Pricing Status",
          type: "select",
          order: 4,
          size: "sm",
          placeholder: "Select pricing status",
          options: [
            { value: "rated", label: "Rated" },
            { value: "unrated", label: "Unrated" },
            { value: "override-pending", label: "Override Pending" }
          ]
        },
        {
          id: "exceptionTag",
          name: "exceptionTag",
          label: "Exception Tag",
          type: "select",
          order: 5,
          size: "sm",
          placeholder: "Select exception",
          options: [
            { value: "missing-dob", label: "Missing DOB" },
            { value: "missing-salary", label: "Missing Salary" },
            { value: "invalid-loan-status", label: "Invalid Loan Status" },
            { value: "missing-kyc", label: "Missing KYC" },
            { value: "invalid-age", label: "Invalid Age" },
            { value: "missing-nominee", label: "Missing Nominee" }
          ]
        }
      ]
    }
  ],
  actions: [
    {
      id: "reset",
      label: "Reset Filters",
      actionType: "action",
      variant: "outline",
      icon: "RotateCcw"
    },
    {
      id: "search",
      label: "Search Members",
      actionType: "action",
      variant: "default",
      icon: "Search",
      submitAction: {
        endpoint: "/api/policy/members/search",
        method: "POST",
        onSuccessMessage: "Search completed"
      }
    }
  ]
};

// ============================================
// Add Benefit Form Config
// ============================================

export const addBenefitFormConfig: FormConfig = {
  id: "add-benefit-form",
  title: "Add Benefit",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "text",
      order: 1,
      size: "sm",
      placeholder: "Enter benefit code",
      validation: {
        required: true
      }
    },
    {
      id: "benefitDescription",
      name: "benefitDescription",
      label: "Benefit Description",
      type: "text",
      order: 2,
      size: "sm",
      placeholder: "Enter benefit description",
      validation: {
        required: true
      }
    },
    {
      id: "scope",
      name: "scope",
      label: "Scope",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select scope",
      options: [
        { value: "base", label: "Base" },
        { value: "rider", label: "Rider" }
      ],
      validation: {
        required: true
      },
      helperText: "Base benefits are core coverage, Riders are optional add-ons"
    },
    {
      id: "startDate",
      name: "startDate",
      label: "Start Date",
      type: "date",
      order: 4,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "endDate",
      name: "endDate",
      label: "End Date",
      type: "date",
      order: 5,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "applicabilityRules",
      name: "applicabilityRules",
      label: "Applicability Rules",
      type: "select",
      order: 6,
      size: "full",
      placeholder: "Select applicable member types/categories",
      options: [
        { value: "all-members", label: "All Members" },
        { value: "primary-insured", label: "Primary Insured" },
        { value: "spouse", label: "Spouse" },
        { value: "dependent-child", label: "Dependent Child" },
        { value: "employee", label: "Employee" },
        { value: "retiree", label: "Retiree" }
      ],
      helperText: "Define which member types or categories this benefit applies to"
    },
    {
      id: "constraintsReference",
      name: "constraintsReference",
      label: "Constraints Reference",
      type: "select",
      order: 7,
      size: "full",
      placeholder: "Search and select constraint",
      options: [
        { value: "CON001", label: "Age Limit Constraint" },
        { value: "CON002", label: "Sum Assured Limit" },
        { value: "CON003", label: "Waiting Period Constraint" },
        { value: "CON004", label: "Pre-existing Disease Exclusion" }
      ],
      helperText: "Link to benefit constraints from the Constraints Registry"
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-product-benefits",
        method: "POST",
        onSuccessMessage: "Benefit added successfully!"
      }
    }
  ]
};

// ============================================
// Edit Benefit Form Config
// ============================================

export const editBenefitFormConfig: FormConfig = {
  id: "edit-benefit-form",
  title: "Edit Benefit",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "text",
      order: 1,
      size: "sm",
      placeholder: "Enter benefit code",
      validation: {
        required: true
      }
    },
    {
      id: "benefitDescription",
      name: "benefitDescription",
      label: "Benefit Description",
      type: "text",
      order: 2,
      size: "sm",
      placeholder: "Enter benefit description",
      validation: {
        required: true
      }
    },
    {
      id: "scope",
      name: "scope",
      label: "Scope",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select scope",
      options: [
        { value: "base", label: "Base" },
        { value: "rider", label: "Rider" }
      ],
      validation: {
        required: true
      },
      helperText: "Base benefits are core coverage, Riders are optional add-ons"
    },
    {
      id: "startDate",
      name: "startDate",
      label: "Start Date",
      type: "date",
      order: 4,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "endDate",
      name: "endDate",
      label: "End Date",
      type: "date",
      order: 5,
      size: "sm",
      placeholder: "Select date",
      validation: {
        required: true
      }
    },
    {
      id: "applicabilityRules",
      name: "applicabilityRules",
      label: "Applicability Rules",
      type: "select",
      order: 6,
      size: "full",
      placeholder: "Select applicable member types/categories",
      options: [
        { value: "all-members", label: "All Members" },
        { value: "primary-insured", label: "Primary Insured" },
        { value: "spouse", label: "Spouse" },
        { value: "dependent-child", label: "Dependent Child" },
        { value: "employee", label: "Employee" },
        { value: "retiree", label: "Retiree" }
      ],
      helperText: "Define which member types or categories this benefit applies to"
    },
    {
      id: "constraintsReference",
      name: "constraintsReference",
      label: "Constraints Reference",
      type: "select",
      order: 7,
      size: "full",
      placeholder: "Search and select constraint",
      options: [
        { value: "CON001", label: "Age Limit Constraint" },
        { value: "CON002", label: "Sum Assured Limit" },
        { value: "CON003", label: "Waiting Period Constraint" },
        { value: "CON004", label: "Pre-existing Disease Exclusion" }
      ],
      helperText: "Link to benefit constraints from the Constraints Registry"
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/plan-product-benefits",
        method: "PUT",
        onSuccessMessage: "Benefit updated successfully!"
      }
    }
  ]
};

// ============================================
// Add Benefit Limit Form Config
// ============================================

export const addBenefitLimitFormConfig: FormConfig = {
  id: "add-benefit-limit-form",
  title: "Add Benefit Limit",
  layout: {
    type: "grid",
    columns: 2,
    gap: "md"
  },
  fields: [
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Benefit Code",
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Cancer of Specified Severity" },
        { value: "CI002", label: "CI002 - Myocardial Infarction" },
        { value: "CI003", label: "CI003 - Stroke" },
        { value: "CI004", label: "CI004 - Kidney Failure" }
      ]
    },
    {
      id: "benefitGroup",
      name: "benefitGroup",
      label: "Benefit Group",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Benefit Group",
      options: [
        { value: "death", label: "Death Benefits" },
        { value: "ci", label: "Critical Illness" },
        { value: "accident", label: "Accidental Death" },
        { value: "disability", label: "Disability" }
      ]
    },
    {
      id: "diagnosisClass",
      name: "diagnosisClass",
      label: "Diagnosis Class",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select Diagnosis Class",
      options: [
        { value: "primary", label: "Primary Diagnosis" },
        { value: "secondary", label: "Secondary Diagnosis" },
        { value: "chronic", label: "Chronic Conditions" },
        { value: "acute", label: "Acute Conditions" }
      ]
    },
    {
      id: "networkLevel",
      name: "networkLevel",
      label: "Network Level",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Network Level",
      validation: {
        required: true
      },
      options: [
        { value: "tier1", label: "Tier 1 - Premium Network" },
        { value: "tier2", label: "Tier 2 - Standard Network" },
        { value: "tier3", label: "Tier 3 - Basic Network" },
        { value: "outofnetwork", label: "Out of Network" }
      ]
    },
    {
      id: "claimType",
      name: "claimType",
      label: "Claim Type",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Claim Type",
      validation: {
        required: true
      },
      options: [
        { value: "inpatient", label: "Inpatient" },
        { value: "outpatient", label: "Outpatient" },
        { value: "emergency", label: "Emergency" },
        { value: "preventive", label: "Preventive" }
      ]
    },
    {
      id: "limitType",
      name: "limitType",
      label: "Limit Type",
      type: "select",
      order: 6,
      size: "sm",
      placeholder: "Select Limit Type",
      validation: {
        required: true
      },
      options: [
        { value: "annual", label: "Annual" },
        { value: "lifetime", label: "Lifetime" },
        { value: "perclaim", label: "Per Claim" },
        { value: "pervisit", label: "Per Visit" },
        { value: "monthly", label: "Monthly" }
      ]
    },
    {
      id: "amountLifeTime",
      name: "amountLifeTime",
      label: "Amount/Life Time",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "Enter Amount/Life Time"
    },
    {
      id: "amountYear",
      name: "amountYear",
      label: "Amount/Year",
      type: "text",
      order: 8,
      size: "sm",
      placeholder: "Enter Amount/Year"
    },
    {
      id: "amountMonth",
      name: "amountMonth",
      label: "Amount/Month",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Enter Amount/Month"
    },
    {
      id: "visitsLifeTime",
      name: "visitsLifeTime",
      label: "Visits/Life Time",
      type: "text",
      order: 10,
      size: "sm",
      placeholder: "Enter Visits/Life Time"
    },
    {
      id: "visitsPerYear",
      name: "visitsPerYear",
      label: "Visits per Year",
      type: "text",
      order: 11,
      size: "sm",
      placeholder: "Enter Visits per Year"
    },
    {
      id: "visitsMonth",
      name: "visitsMonth",
      label: "Visits/Month",
      type: "text",
      order: 12,
      size: "sm",
      placeholder: "Enter Visits/Month"
    },
    {
      id: "amountDay",
      name: "amountDay",
      label: "Amount/Day",
      type: "text",
      order: 13,
      size: "sm",
      placeholder: "Enter Amount/Day"
    },
    {
      id: "visitsDay",
      name: "visitsDay",
      label: "Visits/Day",
      type: "text",
      order: 14,
      size: "sm",
      placeholder: "Enter Visits/Day"
    },
    {
      id: "amountVisit",
      name: "amountVisit",
      label: "Amount/Visit",
      type: "text",
      order: 15,
      size: "sm",
      placeholder: "Enter Amount/Visit"
    },
    {
      id: "daysVisit",
      name: "daysVisit",
      label: "Days/Visit",
      type: "text",
      order: 16,
      size: "sm",
      placeholder: "Enter Days/Visit"
    },
    {
      id: "preExistingDiseasesLimit",
      name: "preExistingDiseasesLimit",
      label: "Pre Existing Diseases Limit",
      type: "text",
      order: 17,
      size: "sm",
      placeholder: "Enter Pre Existing Diseases Limit"
    },
    {
      id: "typeOfSurgeryLimit",
      name: "typeOfSurgeryLimit",
      label: "Type of Surgery Limit",
      type: "select",
      order: 18,
      size: "sm",
      placeholder: "Select Type of Surgery Limit",
      options: [
        { value: "major", label: "Major Surgery" },
        { value: "minor", label: "Minor Surgery" },
        { value: "cosmetic", label: "Cosmetic Surgery" },
        { value: "emergency", label: "Emergency Surgery" },
        { value: "elective", label: "Elective Surgery" }
      ]
    },
    {
      id: "amountPerProcedure",
      name: "amountPerProcedure",
      label: "Amount per Procedure",
      type: "text",
      order: 19,
      size: "sm",
      placeholder: "Enter Amount per Procedure"
    },
    {
      id: "relatedBenefitCode",
      name: "relatedBenefitCode",
      label: "Related Benefit Code",
      type: "select",
      order: 20,
      size: "sm",
      placeholder: "Select Related Benefit Code",
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Cancer of Specified Severity" },
        { value: "CI002", label: "CI002 - Myocardial Infarction" },
        { value: "BAAD", label: "BAAD - Accidental Death" },
        { value: "BAGT", label: "BAGT - Group Term" }
      ]
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/benefit-limits",
        method: "POST",
        onSuccessMessage: "Benefit limit added successfully!"
      }
    }
  ]
};

// ============================================
// Edit Benefit Limit Form Config
// ============================================

export const editBenefitLimitFormConfig: FormConfig = {
  id: "edit-benefit-limit-form",
  title: "Edit Benefit Limit",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Benefit Code",
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Cancer of Specified Severity" },
        { value: "CI002", label: "CI002 - Myocardial Infarction" },
        { value: "CI003", label: "CI003 - Stroke" },
        { value: "CI004", label: "CI004 - Kidney Failure" }
      ]
    },
    {
      id: "benefitGroup",
      name: "benefitGroup",
      label: "Benefit Group",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Benefit Group",
      options: [
        { value: "death", label: "Death Benefits" },
        { value: "ci", label: "Critical Illness" },
        { value: "accident", label: "Accidental Death" },
        { value: "disability", label: "Disability" }
      ]
    },
    {
      id: "diagnosisClass",
      name: "diagnosisClass",
      label: "Diagnosis Class",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select Diagnosis Class",
      options: [
        { value: "primary", label: "Primary Diagnosis" },
        { value: "secondary", label: "Secondary Diagnosis" },
        { value: "chronic", label: "Chronic Conditions" },
        { value: "acute", label: "Acute Conditions" }
      ]
    },
    {
      id: "networkLevel",
      name: "networkLevel",
      label: "Network Level",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Network Level",
      validation: {
        required: true
      },
      options: [
        { value: "tier1", label: "Tier 1 - Premium Network" },
        { value: "tier2", label: "Tier 2 - Standard Network" },
        { value: "tier3", label: "Tier 3 - Basic Network" },
        { value: "outofnetwork", label: "Out of Network" }
      ]
    },
    {
      id: "claimType",
      name: "claimType",
      label: "Claim Type",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Claim Type",
      validation: {
        required: true
      },
      options: [
        { value: "inpatient", label: "Inpatient" },
        { value: "outpatient", label: "Outpatient" },
        { value: "emergency", label: "Emergency" },
        { value: "preventive", label: "Preventive" }
      ]
    },
    {
      id: "limitType",
      name: "limitType",
      label: "Limit Type",
      type: "select",
      order: 6,
      size: "sm",
      placeholder: "Select Limit Type",
      validation: {
        required: true
      },
      options: [
        { value: "annual", label: "Annual" },
        { value: "lifetime", label: "Lifetime" },
        { value: "perclaim", label: "Per Claim" },
        { value: "pervisit", label: "Per Visit" },
        { value: "monthly", label: "Monthly" }
      ]
    },
    {
      id: "amountLifeTime",
      name: "amountLifeTime",
      label: "Amount/Life Time",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "Enter Amount/Life Time"
    },
    {
      id: "amountYear",
      name: "amountYear",
      label: "Amount/Year",
      type: "text",
      order: 8,
      size: "sm",
      placeholder: "Enter Amount/Year"
    },
    {
      id: "amountMonth",
      name: "amountMonth",
      label: "Amount/Month",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Enter Amount/Month"
    },
    {
      id: "visitsLifeTime",
      name: "visitsLifeTime",
      label: "Visits/Life Time",
      type: "text",
      order: 10,
      size: "sm",
      placeholder: "Enter Visits/Life Time"
    },
    {
      id: "visitsPerYear",
      name: "visitsPerYear",
      label: "Visits per Year",
      type: "text",
      order: 11,
      size: "sm",
      placeholder: "Enter Visits per Year"
    },
    {
      id: "visitsMonth",
      name: "visitsMonth",
      label: "Visits/Month",
      type: "text",
      order: 12,
      size: "sm",
      placeholder: "Enter Visits/Month"
    },
    {
      id: "amountDay",
      name: "amountDay",
      label: "Amount/Day",
      type: "text",
      order: 13,
      size: "sm",
      placeholder: "Enter Amount/Day"
    },
    {
      id: "visitsDay",
      name: "visitsDay",
      label: "Visits/Day",
      type: "text",
      order: 14,
      size: "sm",
      placeholder: "Enter Visits/Day"
    },
    {
      id: "amountVisit",
      name: "amountVisit",
      label: "Amount/Visit",
      type: "text",
      order: 15,
      size: "sm",
      placeholder: "Enter Amount/Visit"
    },
    {
      id: "daysVisit",
      name: "daysVisit",
      label: "Days/Visit",
      type: "text",
      order: 16,
      size: "sm",
      placeholder: "Enter Days/Visit"
    },
    {
      id: "preExistingDiseasesLimit",
      name: "preExistingDiseasesLimit",
      label: "Pre Existing Diseases Limit",
      type: "text",
      order: 17,
      size: "sm",
      placeholder: "Enter Pre Existing Diseases Limit"
    },
    {
      id: "typeOfSurgeryLimit",
      name: "typeOfSurgeryLimit",
      label: "Type of Surgery Limit",
      type: "select",
      order: 18,
      size: "sm",
      placeholder: "Select Type of Surgery Limit",
      options: [
        { value: "major", label: "Major Surgery" },
        { value: "minor", label: "Minor Surgery" },
        { value: "cosmetic", label: "Cosmetic Surgery" },
        { value: "emergency", label: "Emergency Surgery" },
        { value: "elective", label: "Elective Surgery" }
      ]
    },
    {
      id: "amountPerProcedure",
      name: "amountPerProcedure",
      label: "Amount per Procedure",
      type: "text",
      order: 19,
      size: "sm",
      placeholder: "Enter Amount per Procedure"
    },
    {
      id: "relatedBenefitCode",
      name: "relatedBenefitCode",
      label: "Related Benefit Code",
      type: "select",
      order: 20,
      size: "sm",
      placeholder: "Select Related Benefit Code",
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Cancer of Specified Severity" },
        { value: "CI002", label: "CI002 - Myocardial Infarction" },
        { value: "BAAD", label: "BAAD - Accidental Death" },
        { value: "BAGT", label: "BAGT - Group Term" }
      ]
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/benefit-limits",
        method: "PUT",
        onSuccessMessage: "Benefit limit updated successfully!"
      }
    }
  ]
};

// ============================================
// Add Member Liability Form Config
// ============================================

export const addMemberLiabilityFormConfig: FormConfig = {
  id: "add-member-liability-form",
  title: "Add Member Liability",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Benefit Code",
      validation: {
        required: true
      },
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Cancer of Specified Severity" },
        { value: "CI002", label: "CI002 - Myocardial Infarction" },
        { value: "CI003", label: "CI003 - Stroke" },
        { value: "CI004", label: "CI004 - Kidney Failure" }
      ]
    },
    {
      id: "providerCapacity",
      name: "providerCapacity",
      label: "Provider Capacity",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Provider Capacity",
      validation: {
        required: true
      },
      options: [
        { value: "primary", label: "Primary Care Provider" },
        { value: "specialist", label: "Specialist" },
        { value: "hospital", label: "Hospital" },
        { value: "emergency", label: "Emergency Services" },
        { value: "pharmacy", label: "Pharmacy" }
      ]
    },
    {
      id: "claimType",
      name: "claimType",
      label: "Claim Type",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select Claim Type",
      validation: {
        required: true
      },
      options: [
        { value: "inpatient", label: "Inpatient" },
        { value: "outpatient", label: "Outpatient" },
        { value: "emergency", label: "Emergency" },
        { value: "preventive", label: "Preventive" },
        { value: "prescription", label: "Prescription" }
      ]
    },
    {
      id: "networkLevel",
      name: "networkLevel",
      label: "Network Level",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Network Level",
      validation: {
        required: true
      },
      options: [
        { value: "tier1", label: "Tier 1 - Premium Network" },
        { value: "tier2", label: "Tier 2 - Standard Network" },
        { value: "tier3", label: "Tier 3 - Basic Network" },
        { value: "outofnetwork", label: "Out of Network" }
      ]
    },
    {
      id: "memberIndicator",
      name: "memberIndicator",
      label: "Member/Spouse/Child Indicator",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Indicator",
      validation: {
        required: true
      },
      options: [
        { value: "member", label: "Member" },
        { value: "spouse", label: "Spouse" },
        { value: "child", label: "Child" },
        { value: "dependent", label: "Dependent" }
      ]
    },
    {
      id: "referralsRequired",
      name: "referralsRequired",
      label: "Referrals Required",
      type: "radio",
      order: 6,
      size: "sm",
      validation: {
        required: true
      },
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ]
    },
    {
      id: "copaymentFirstXVisits",
      name: "copaymentFirstXVisits",
      label: "Copayment % First X Visits",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "Enter Copayment % First X Visits"
    },
    {
      id: "copaymentAfterXVisits",
      name: "copaymentAfterXVisits",
      label: "Copayment % After X Visits",
      type: "text",
      order: 8,
      size: "sm",
      placeholder: "Enter Copayment % After X Visits"
    },
    {
      id: "valueOfX",
      name: "valueOfX",
      label: "Value of X",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Enter Value of X"
    },
    {
      id: "deductibleFirstYVisits",
      name: "deductibleFirstYVisits",
      label: "Deductible First Y Visits",
      type: "text",
      order: 10,
      size: "sm",
      placeholder: "Enter Deductible First Y Visits"
    },
    {
      id: "deductibleAfterYVisits",
      name: "deductibleAfterYVisits",
      label: "Deductible After Y Visits",
      type: "text",
      order: 11,
      size: "sm",
      placeholder: "Enter Deductible After Y Visits"
    },
    {
      id: "valueOfY",
      name: "valueOfY",
      label: "Value of Y",
      type: "text",
      order: 12,
      size: "sm",
      placeholder: "Enter Value of Y"
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/member-liabilities",
        method: "POST",
        onSuccessMessage: "Member liability added successfully!"
      }
    }
  ]
};

// ============================================
// Edit Member Liability Form Config
// ============================================

export const editMemberLiabilityFormConfig: FormConfig = {
  id: "edit-member-liability-form",
  title: "Edit Member Liability",
  layout: {
    type: "grid",
    columns: 3,
    gap: "md"
  },
  fields: [
    {
      id: "benefitCode",
      name: "benefitCode",
      label: "Benefit Code",
      type: "select",
      order: 1,
      size: "sm",
      placeholder: "Select Benefit Code",
      validation: {
        required: true
      },
      options: [
        { value: "DTH02", label: "DTH02 - Death Benefit" },
        { value: "CI001", label: "CI001 - Cancer of Specified Severity" },
        { value: "CI002", label: "CI002 - Myocardial Infarction" },
        { value: "CI003", label: "CI003 - Stroke" },
        { value: "CI004", label: "CI004 - Kidney Failure" }
      ]
    },
    {
      id: "providerCapacity",
      name: "providerCapacity",
      label: "Provider Capacity",
      type: "select",
      order: 2,
      size: "sm",
      placeholder: "Select Provider Capacity",
      validation: {
        required: true
      },
      options: [
        { value: "primary", label: "Primary Care Provider" },
        { value: "specialist", label: "Specialist" },
        { value: "hospital", label: "Hospital" },
        { value: "emergency", label: "Emergency Services" },
        { value: "pharmacy", label: "Pharmacy" }
      ]
    },
    {
      id: "claimType",
      name: "claimType",
      label: "Claim Type",
      type: "select",
      order: 3,
      size: "sm",
      placeholder: "Select Claim Type",
      validation: {
        required: true
      },
      options: [
        { value: "inpatient", label: "Inpatient" },
        { value: "outpatient", label: "Outpatient" },
        { value: "emergency", label: "Emergency" },
        { value: "preventive", label: "Preventive" },
        { value: "prescription", label: "Prescription" }
      ]
    },
    {
      id: "networkLevel",
      name: "networkLevel",
      label: "Network Level",
      type: "select",
      order: 4,
      size: "sm",
      placeholder: "Select Network Level",
      validation: {
        required: true
      },
      options: [
        { value: "tier1", label: "Tier 1 - Premium Network" },
        { value: "tier2", label: "Tier 2 - Standard Network" },
        { value: "tier3", label: "Tier 3 - Basic Network" },
        { value: "outofnetwork", label: "Out of Network" }
      ]
    },
    {
      id: "memberIndicator",
      name: "memberIndicator",
      label: "Member/Spouse/Child Indicator",
      type: "select",
      order: 5,
      size: "sm",
      placeholder: "Select Indicator",
      validation: {
        required: true
      },
      options: [
        { value: "member", label: "Member" },
        { value: "spouse", label: "Spouse" },
        { value: "child", label: "Child" },
        { value: "dependent", label: "Dependent" }
      ]
    },
    {
      id: "referralsRequired",
      name: "referralsRequired",
      label: "Referrals Required",
      type: "radio",
      order: 6,
      size: "sm",
      validation: {
        required: true
      },
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" }
      ]
    },
    {
      id: "copaymentFirstXVisits",
      name: "copaymentFirstXVisits",
      label: "Copayment % First X Visits",
      type: "text",
      order: 7,
      size: "sm",
      placeholder: "Enter Copayment % First X Visits"
    },
    {
      id: "copaymentAfterXVisits",
      name: "copaymentAfterXVisits",
      label: "Copayment % After X Visits",
      type: "text",
      order: 8,
      size: "sm",
      placeholder: "Enter Copayment % After X Visits"
    },
    {
      id: "valueOfX",
      name: "valueOfX",
      label: "Value of X",
      type: "text",
      order: 9,
      size: "sm",
      placeholder: "Enter Value of X"
    },
    {
      id: "deductibleFirstYVisits",
      name: "deductibleFirstYVisits",
      label: "Deductible First Y Visits",
      type: "text",
      order: 10,
      size: "sm",
      placeholder: "Enter Deductible First Y Visits"
    },
    {
      id: "deductibleAfterYVisits",
      name: "deductibleAfterYVisits",
      label: "Deductible After Y Visits",
      type: "text",
      order: 11,
      size: "sm",
      placeholder: "Enter Deductible After Y Visits"
    },
    {
      id: "valueOfY",
      name: "valueOfY",
      label: "Value of Y",
      type: "text",
      order: 12,
      size: "sm",
      placeholder: "Enter Value of Y"
    }
  ],
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      actionType: "action",
      variant: "outline"
    },
    {
      id: "save",
      label: "Save",
      actionType: "action",
      variant: "default",
      submitAction: {
        endpoint: "/api/policy/member-liabilities",
        method: "PUT",
        onSuccessMessage: "Member liability updated successfully!"
      }
    }
  ]
};

// Form config registry for lookup
const formConfigRegistry: Record<string, FormConfig> = {
  "key-data-form": keyDataFormConfig,
  "policy-configuration-form": policyConfigurationFormConfig,
  "policy-details-form": policyDetailsFormConfig,
  "policy-flags-governance-form": policyFlagsGovernanceFormConfig,
  "quotation-form": quotationFormConfig,
  "group-insurance-form": groupInsuranceFormConfig,
  "create-quotation-form": createQuotationFormConfig,
  "policy-profile-form": policyProfileFormConfig,
  "add-product-form": addProductFormConfig,
  "component-rules-form": componentRulesFormConfig,
  "component-templates-form": componentTemplatesFormConfig,
  "product-constraints-preview-form": productConstraintsPreviewFormConfig,
  "add-plan-form": addPlanFormConfig,
  "edit-plan-form": editPlanFormConfig,
  "add-subsidiary-form": addSubsidiaryFormConfig,
  "edit-subsidiary-form": editSubsidiaryFormConfig,
  "add-document-form": addDocumentFormConfig,
  "request-document-form": requestDocumentFormConfig,
  "verify-document-form": verifyDocumentFormConfig,
  "reject-document-form": rejectDocumentFormConfig,
  "add-exclusion-form": addExclusionFormConfig,
  "edit-exclusion-form": editExclusionFormConfig,
  "edit-product-form": editProductFormConfig,
  "plan-product-health-form": planProductHealthFormConfig,
  "plan-product-term-life-form": planProductTermLifeFormConfig,
  "plan-product-credit-life-form": planProductCreditLifeFormConfig,
  "benefit-investment-form": benefitInvestmentFormConfig,
  "plan-product-investment-form": planProductInvestmentFormConfig,
  "premium-method-05-header-form": premiumMethod05HeaderFormConfig,
  "premium-method-05-rating-basis-form": premiumMethod05RatingBasisFormConfig,
  "add-premium-method-05-form": addPremiumMethod05FormConfig,
  "edit-premium-method-05-form": editPremiumMethod05FormConfig,
  "premium-method-06-header-form": premiumMethod06HeaderFormConfig,
  "add-premium-method-06-form": addPremiumMethod06FormConfig,
  "edit-premium-method-06-form": editPremiumMethod06FormConfig,
  "add-premium-method-07-form": addPremiumMethod07FormConfig,
  "edit-premium-method-07-form": editPremiumMethod07FormConfig,
  "add-premium-method-08-form": addPremiumMethod08FormConfig,
  "edit-premium-method-08-form": editPremiumMethod08FormConfig,
  "upload-members-form": uploadMembersFormConfig,
  "bulk-import-rates-form": bulkImportRatesFormConfig,
  "bulk-import-bundle-rates-form": bulkImportBundleRatesFormConfig,
  "member-search-form": memberSearchFormConfig,
  "add-headcount-form": addHeadcountFormConfig,
  "edit-headcount-form": editHeadcountFormConfig,
  "add-benefit-form": addBenefitFormConfig,
  "edit-benefit-form": editBenefitFormConfig,
  "add-benefit-limit-form": addBenefitLimitFormConfig,
  "edit-benefit-limit-form": editBenefitLimitFormConfig,
  "add-member-liability-form": addMemberLiabilityFormConfig,
  "edit-member-liability-form": editMemberLiabilityFormConfig
};

/**
 * Mock API to fetch form config by ID
 */
export const getFormConfigMock = (formId: string): Promise<FormConfig | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(formConfigRegistry[formId] ?? null);
    }, 200);
  });
};
