import type { TabContentConfig, RowData } from "@shared/types";
import { getMembersFromStorage } from "../../../services/member-service";

// ============================================
// Common Header Tab Config (with nested tabs)
// ============================================

export const commonHeaderTabConfig: TabContentConfig = {
  id: "common-header",
  tabs: [
    { id: "key-data", label: "Key Data" },
    { id: "policy-configuration", label: "Policy Configuration" },
    { id: "policy-details", label: "Policy Details" },
    { id: "policy-flags-governance", label: "Policy Flags & Governance" }
  ],
  sections: []
};

// ============================================
// Key Data Sub-Tab Config
// ============================================

export const keyDataTabConfig: TabContentConfig = {
  id: "key-data",
  sections: [
    {
      id: "key-data-form",
      order: 1,
      contentType: "form",
      title: "Key Data Information",
      content: {
        formId: "key-data-form"
      }
    }
  ]
};

// ============================================
// Policy Configuration Sub-Tab Config
// ============================================

export const policyConfigurationTabConfig: TabContentConfig = {
  id: "policy-configuration",
  sections: [
    {
      id: "policy-configuration-form",
      order: 1,
      contentType: "form",
      title: "Policy Configuration Settings",
      content: {
        formId: "policy-configuration-form"
      }
    }
  ]
};

// ============================================
// Policy Details Sub-Tab Config
// ============================================

export const policyDetailsTabConfig: TabContentConfig = {
  id: "policy-details",
  sections: [
    {
      id: "policy-details-form",
      order: 1,
      contentType: "form",
      title: "Policy Details Information",
      content: {
        formId: "policy-details-form"
      }
    }
  ]
};

// ============================================
// Policy Flags & Governance Sub-Tab Config
// ============================================

export const policyFlagsGovernanceTabConfig: TabContentConfig = {
  id: "policy-flags-governance",
  sections: [
    {
      id: "policy-flags-governance-form",
      order: 1,
      contentType: "form",
      title: "Policy Flags & Governance Settings",
      content: {
        formId: "policy-flags-governance-form"
      }
    }
  ]
};

// ============================================
// Documents Tab Config
// ============================================

export const documentsTabConfig: TabContentConfig = {
  id: "documents",
  sections: [
    {
      id: "documents-requirements-header",
      order: 1,
      contentType: "actions",
      title: "Document Requirements & Progress",
      content: {
        widget: {
          id: "document-requirements-widget",
          widgetType: "quick-links",
          title: "Required Documents Pack - Completion: 62% (5 of 8)",
          layout: "grid",
          links: [
            {
              id: "completion-percentage",
              label: "Completion Progress",
              type: "card",
              icon: "FileCheck",
              description: "62% - 5 of 8 required documents submitted",
              action: {
                id: "view-completion",
                label: "View Progress",
                icon: "FileCheck",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "required-docs",
              label: "Required Documents",
              type: "card",
              icon: "FileText",
              description: "8 documents based on scheme type & UW method",
              action: {
                id: "view-required",
                label: "View Requirements",
                icon: "FileText",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "submitted-docs",
              label: "Submitted",
              type: "card",
              icon: "Upload",
              description: "5 documents uploaded",
              action: {
                id: "view-submitted",
                label: "View Submitted",
                icon: "Upload",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "missing-docs",
              label: "Missing",
              type: "card",
              icon: "CircleAlert",
              description: "3 documents - Requires immediate attention",
              action: {
                id: "view-missing",
                label: "View Missing",
                icon: "CircleAlert",
                variant: "destructive",
                intent: "view"
              }
            },
            {
              id: "verified-docs",
              label: "Verified",
              type: "card",
              icon: "CircleCheck",
              description: "3 documents approved for UW",
              action: {
                id: "view-verified",
                label: "View Verified",
                icon: "CircleCheck",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "expired-docs",
              label: "Expired",
              type: "card",
              icon: "Clock",
              description: "1 document needs resubmission",
              action: {
                id: "view-expired",
                label: "View Expired",
                icon: "Clock",
                variant: "destructive",
                intent: "view"
              }
            }
          ]
        }
      }
    },
    {
      id: "documents-alerts",
      order: 2,
      contentType: "actions",
      title: "Document Intelligence & Blockers",
      content: {
        widget: {
          id: "document-alerts-widget",
          widgetType: "quick-links",
          title: "Missing & Expired Documents - Action Required",
          layout: "grid",
          links: [
            {
              id: "blocker-medical-data",
              label: "BLOCKER: Medical Data Missing",
              type: "card",
              icon: "ShieldAlert",
              description:
                "Medical examination reports required for members above 45 years. Policy issuance blocked until submitted.",
              action: {
                id: "request-medical-data",
                label: "Request Document",
                icon: "Send",
                variant: "destructive",
                intent: "custom",
                actionProps: {
                  formId: "request-document-form",
                  interaction: "sheet"
                }
              }
            },
            {
              id: "alert-kyc-expired",
              label: "KYC Documents Expired",
              type: "card",
              icon: "TriangleAlert",
              description: "KYC documents expired on 2025-01-01. Valid documents required within 7 days.",
              action: {
                id: "request-kyc-renewal",
                label: "Request Renewal",
                icon: "RefreshCw",
                variant: "outline",
                intent: "custom",
                actionProps: {
                  formId: "request-document-form",
                  interaction: "sheet"
                }
              }
            },
            {
              id: "alert-financial-pending",
              label: "Financial Details Pending Verification",
              type: "card",
              icon: "Clock",
              description: "Financial statements uploaded but awaiting underwriter verification.",
              action: {
                id: "verify-financial",
                label: "Verify Now",
                icon: "CircleCheck",
                variant: "outline",
                intent: "custom",
                actionProps: {
                  formId: "verify-document-form",
                  interaction: "sheet"
                }
              }
            }
          ]
        }
      }
    },
    {
      id: "documents-table",
      order: 3,
      contentType: "table",
      title: "Document Registry",
      headerActions: [
        {
          id: "add-document",
          label: "Add Document",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-document-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/documents",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "documentType",
              header: "Document Type",
              accessorKey: "documentType",
              type: "text",
              sortable: true,
              width: "200px"
            },
            {
              id: "documentSource",
              header: "Source",
              accessorKey: "documentSource",
              type: "badge",
              sortable: true,
              width: "120px",
              valueMapping: [
                { value: "client", label: "Client", color: "default" },
                { value: "broker", label: "Broker", color: "info" },
                { value: "lender", label: "Lender", color: "warning" },
                { value: "insurer", label: "Insurer", color: "success" }
              ]
            },
            {
              id: "linkedEntity",
              header: "Linked To",
              accessorKey: "linkedEntity",
              type: "text",
              sortable: true,
              width: "180px"
            },
            {
              id: "effectiveDate",
              header: "Effective Date",
              accessorKey: "effectiveDate",
              type: "date",
              sortable: true,
              width: "140px"
            },
            {
              id: "expiryDate",
              header: "Expiry Date",
              accessorKey: "expiryDate",
              type: "date",
              sortable: true,
              width: "140px"
            },
            {
              id: "uploadedBy",
              header: "Uploaded By",
              accessorKey: "uploadedBy",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "uploadedDate",
              header: "Uploaded Date",
              accessorKey: "uploadedDate",
              type: "date",
              sortable: true,
              width: "140px"
            },
            {
              id: "verificationStatus",
              header: "Verification",
              accessorKey: "verificationStatus",
              type: "status",
              sortable: true,
              width: "140px",
              valueMapping: [
                { value: "pending", label: "Pending", color: "warning" },
                { value: "verified", label: "Verified", color: "success" },
                { value: "rejected", label: "Rejected", color: "error" },
                { value: "expired", label: "Expired", color: "error" },
                { value: "requested", label: "Requested", color: "info" }
              ]
            },
            {
              id: "documentStatus",
              header: "Status",
              accessorKey: "documentStatus",
              type: "status",
              sortable: true,
              width: "130px",
              valueMapping: [
                { value: "pending", label: "Pending", color: "warning" },
                { value: "approved", label: "Approved", color: "success" },
                { value: "rejected", label: "Rejected", color: "error" },
                { value: "expired", label: "Expired", color: "error" },
                { value: "resubmit", label: "Resubmit", color: "warning" }
              ]
            },
            {
              id: "dmsReference",
              header: "DMS Reference",
              accessorKey: "dmsReference",
              type: "text",
              sortable: true,
              width: "160px"
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "add-document-form",
                interaction: "sheet"
              }
            },
            {
              id: "view",
              label: "View",
              icon: "Eye",
              intent: "view",
              actionProps: {
                interaction: "modal"
              }
            },
            {
              id: "download",
              label: "Download",
              icon: "Download",
              intent: "custom"
            },
            {
              id: "verify",
              label: "Verify",
              icon: "CircleCheck",
              intent: "custom",
              variant: "outline",
              actionProps: {
                formId: "verify-document-form",
                interaction: "sheet"
              }
            },

            {
              id: "request-again",
              label: "Request Again",
              icon: "RefreshCw",
              intent: "custom",
              variant: "outline",
              actionProps: {
                formId: "request-document-form",
                interaction: "sheet"
              }
            },
            {
              id: "reject",
              label: "Reject",
              icon: "CircleX",
              intent: "custom",
              variant: "destructive",
              actionProps: {
                formId: "reject-document-form",
                interaction: "sheet"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "bulk-verify",
              label: "Verify Selected",
              icon: "CircleCheck",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to verify the selected documents?"
              }
            },
            {
              id: "bulk-download",
              label: "Download Selected",
              icon: "Download",
              variant: "outline",
              intent: "custom"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true
        }
      }
    },
    {
      id: "documents-audit-trail",
      order: 4,
      contentType: "table",
      title: "Document Audit Trail",
      content: {
        api: {
          endpoint: "/api/documents/audit-trail",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "timestamp",
              header: "Timestamp",
              accessorKey: "timestamp",
              type: "date",
              sortable: true,
              width: "180px"
            },
            {
              id: "documentType",
              header: "Document",
              accessorKey: "documentType",
              type: "text",
              sortable: true,
              width: "200px"
            },
            {
              id: "action",
              header: "Action",
              accessorKey: "action",
              type: "badge",
              sortable: true,
              width: "140px",
              valueMapping: [
                { value: "uploaded", label: "Uploaded", color: "info" },
                { value: "verified", label: "Verified", color: "success" },
                { value: "rejected", label: "Rejected", color: "error" },
                { value: "requested", label: "Requested", color: "warning" },
                { value: "downloaded", label: "Downloaded", color: "default" },
                { value: "deleted", label: "Deleted", color: "error" }
              ]
            },
            {
              id: "performedBy",
              header: "Performed By",
              accessorKey: "performedBy",
              type: "text",
              sortable: true,
              width: "180px"
            },
            {
              id: "comments",
              header: "Comments",
              accessorKey: "comments",
              type: "text",
              sortable: false
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 5,
            pageSizeOptions: [5, 10, 20]
          },
          selectable: false,
          searchable: false
        }
      }
    }
  ]
};

// ============================================
// Policy Exclusion Tab Config
// ============================================

export const policyExclusionTabConfig: TabContentConfig = {
  id: "policy-exclusion",
  sections: [
    {
      id: "clause-pack-selector",
      order: 1,
      contentType: "actions",
      title: "Clause Pack & Wording Governance",
      content: {
        widget: {
          id: "clause-pack-widget",
          widgetType: "quick-links",
          title: "Active Clause Pack: GTL Standard v2.1 (Effective: 2025-01-01)",
          layout: "grid",
          links: [
            {
              id: "clause-pack-template",
              label: "Clause Pack Template",
              type: "card",
              icon: "FileText",
              description: "GTL Standard - Group Term Life Insurance",
              action: {
                id: "view-clause-pack",
                label: "View Details",
                icon: "Eye",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "clause-pack-version",
              label: "Version 2.1",
              type: "card",
              icon: "GitBranch",
              description: "Current active version - Last updated: 2025-01-01",
              action: {
                id: "view-version-history",
                label: "Version History",
                icon: "History",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "scheme-type",
              label: "Scheme Type",
              type: "card",
              icon: "Layers",
              description: "GTL (Group Term Life) - Standard Coverage",
              action: {
                id: "change-scheme",
                label: "Change Scheme",
                icon: "Settings",
                variant: "outline",
                intent: "custom"
              }
            },
            {
              id: "effective-dating",
              label: "Effective Dating Rule",
              type: "card",
              icon: "Calendar",
              description: "Policy term aligned - Supports endorsements",
              action: {
                id: "configure-dating",
                label: "Configure",
                icon: "Settings",
                variant: "outline",
                intent: "custom"
              }
            }
          ]
        }
      }
    },
    {
      id: "exclusion-intelligence",
      order: 2,
      contentType: "actions",
      title: "Clause Intelligence & Compliance",
      content: {
        widget: {
          id: "exclusion-intelligence-widget",
          widgetType: "quick-links",
          title: "Wording Governance & Compliance Status",
          layout: "grid",
          links: [
            {
              id: "conflict-detector",
              label: "Conflicting Clauses Detected",
              type: "card",
              icon: "TriangleAlert",
              description: "2 potential conflicts found - EXC001 and EXC007 may overlap",
              action: {
                id: "resolve-conflicts",
                label: "Resolve Conflicts",
                icon: "AlertOctagon",
                variant: "destructive",
                intent: "custom",
                actionProps: {
                  formId: "resolve-conflict-form",
                  interaction: "sheet"
                }
              }
            },
            {
              id: "mandatory-checklist",
              label: "Mandatory Exclusions",
              type: "card",
              icon: "ListChecks",
              description: "8 of 10 mandatory exclusions applied - 2 pending",
              action: {
                id: "view-checklist",
                label: "View Checklist",
                icon: "ClipboardList",
                variant: "outline",
                intent: "view",
                actionProps: {
                  interaction: "modal"
                }
              }
            },
            {
              id: "compliance-status",
              label: "Product Filing Compliance",
              type: "card",
              icon: "ShieldCheck",
              description: "Compliant with IRDAI filing requirements",
              action: {
                id: "view-compliance",
                label: "View Report",
                icon: "FileCheck",
                variant: "outline",
                intent: "view"
              }
            }
          ]
        }
      }
    },
    {
      id: "policy-exclusion-table",
      order: 3,
      contentType: "table",
      title: "Policy Exclusions & Clause Registry",
      headerActions: [
        {
          id: "add-exclusion",
          label: "Add Exclusion",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-exclusion-form",
            interaction: "sheet"
          }
        },
        {
          id: "manage-clause-pack",
          label: "Manage Clause Pack",
          icon: "Package",
          variant: "outline",
          intent: "custom",
          actionProps: {
            formId: "manage-clause-pack-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/exclusions",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "exclusionCode",
              header: "Exclusion Code",
              accessorKey: "exclusionCode",
              type: "text",
              sortable: true,
              width: "140px"
            },
            {
              id: "exclusionDescription",
              header: "Exclusion Description",
              accessorKey: "exclusionDescription",
              type: "text",
              sortable: true,
              width: "250px"
            },
            {
              id: "scope",
              header: "Scope",
              accessorKey: "scope",
              type: "badge",
              sortable: true,
              width: "120px",
              valueMapping: [
                { value: "policy", label: "Policy", color: "default" },
                { value: "plan", label: "Plan", color: "info" },
                { value: "member", label: "Member", color: "warning" }
              ]
            },
            {
              id: "category",
              header: "Category",
              accessorKey: "category",
              type: "badge",
              sortable: true,
              width: "130px",
              valueMapping: [
                { value: "mandatory", label: "Mandatory", color: "error" },
                { value: "optional", label: "Optional", color: "default" },
                { value: "conditional", label: "Conditional", color: "warning" }
              ]
            },
            {
              id: "version",
              header: "Version",
              accessorKey: "version",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "effectiveDate",
              header: "Effective Date",
              accessorKey: "effectiveDate",
              type: "date",
              sortable: true,
              width: "140px"
            },
            {
              id: "endDate",
              header: "End Date",
              accessorKey: "endDate",
              type: "date",
              sortable: true,
              width: "140px"
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              type: "status",
              sortable: true,
              width: "120px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "superseded", label: "Superseded", color: "warning" },
                { value: "archived", label: "Archived", color: "default" },
                { value: "draft", label: "Draft", color: "info" }
              ]
            },
            {
              id: "createdBy",
              header: "Created By",
              accessorKey: "createdBy",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "modifiedDate",
              header: "Modified Date",
              accessorKey: "modifiedDate",
              type: "date",
              sortable: true,
              width: "140px"
            }
          ],
          rowActions: [
            {
              id: "view",
              label: "View",
              icon: "Eye",
              intent: "view",
              actionProps: {
                interaction: "modal"
              }
            },
            {
              id: "preview-wording",
              label: "Preview Wording",
              icon: "FileText",
              intent: "view",
              actionProps: {
                interaction: "sheet"
              }
            },
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-exclusion-form",
                interaction: "sheet"
              }
            },
            {
              id: "version",
              label: "Create New Version",
              icon: "GitBranch",
              intent: "custom",
              variant: "outline",
              actionProps: {
                interaction: "api-call",
                api: {
                  endpoint: "/api/policy/exclusions/version",
                  method: "POST"
                },
                successMessage: "New version created successfully!"
              }
            },
            {
              id: "clone",
              label: "Clone",
              icon: "Copy",
              intent: "custom",
              variant: "outline",
              actionProps: {
                interaction: "api-call",
                api: {
                  endpoint: "/api/policy/exclusions/clone",
                  method: "POST"
                },
                successMessage: "Exclusion cloned successfully!"
              }
            },
            {
              id: "view-history",
              label: "View History",
              icon: "History",
              intent: "view",
              actionProps: {
                interaction: "sheet"
              }
            },
            {
              id: "archive",
              label: "Archive",
              icon: "Archive",
              intent: "custom",
              variant: "outline",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage:
                  "Are you sure you want to archive this exclusion? Archived exclusions will no longer be active on the policy."
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "bulk-terminate",
              label: "Terminate",
              icon: "CircleX",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage:
                  "Are you sure you want to terminate the selected exclusions? This action will end their validity."
              }
            },
            {
              id: "bulk-lapse",
              label: "Lapse",
              icon: "Clock",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected exclusions?"
              }
            },
            {
              id: "bulk-version-update",
              label: "Version",
              icon: "GitBranch",
              variant: "outline",
              intent: "custom",
              actionProps: {
                formId: "bulk-version-update-form",
                interaction: "sheet"
              }
            },
            {
              id: "bulk-export",
              label: "Export Selected",
              icon: "Download",
              variant: "outline",
              intent: "export"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true
        }
      }
    },
    {
      id: "exclusion-version-history",
      order: 4,
      contentType: "table",
      title: "Exclusion Version History & Audit Trail",
      content: {
        api: {
          endpoint: "/api/policy/exclusions/version-history",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "timestamp",
              header: "Timestamp",
              accessorKey: "timestamp",
              type: "date",
              sortable: true,
              width: "180px"
            },
            {
              id: "exclusionCode",
              header: "Exclusion Code",
              accessorKey: "exclusionCode",
              type: "text",
              sortable: true,
              width: "140px"
            },
            {
              id: "version",
              header: "Version",
              accessorKey: "version",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "action",
              header: "Action",
              accessorKey: "action",
              type: "badge",
              sortable: true,
              width: "140px",
              valueMapping: [
                { value: "created", label: "Created", color: "success" },
                { value: "updated", label: "Updated", color: "info" },
                { value: "versioned", label: "Versioned", color: "warning" },
                { value: "archived", label: "Archived", color: "default" },
                { value: "superseded", label: "Superseded", color: "warning" }
              ]
            },
            {
              id: "performedBy",
              header: "Performed By",
              accessorKey: "performedBy",
              type: "text",
              sortable: true,
              width: "180px"
            },
            {
              id: "changes",
              header: "Changes",
              accessorKey: "changes",
              type: "text",
              sortable: false
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 5,
            pageSizeOptions: [5, 10, 20]
          },
          selectable: false,
          searchable: false
        }
      }
    }
  ]
};

// ============================================
// Policy Profile Tab Config
// ============================================

export const policyProfileTabConfig: TabContentConfig = {
  id: "policy-profile",
  sections: [
    {
      id: "policy-profile-form",
      order: 1,
      contentType: "form",
      title: "Policy Profile - Display Only",
      content: {
        formId: "policy-profile-form"
      }
    },
    {
      id: "plan-profile-table",
      order: 2,
      contentType: "table",
      title: "Plan Profile Details",
      content: {
        api: {
          endpoint: "/api/policy/plan-profiles",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "planNumber",
              header: "Plan Number",
              accessorKey: "planNumber",
              width: "120px",
              type: "link"
            },
            {
              id: "planDescription",
              header: "Plan Description",
              accessorKey: "planDescription",
              width: "250px",
              type: "text"
            },
            {
              id: "fromAge",
              header: "From Age",
              accessorKey: "fromAge",
              width: "100px",
              type: "text",
              align: "right"
            },
            {
              id: "toAge",
              header: "To Age",
              accessorKey: "toAge",
              width: "100px",
              type: "text",
              align: "right"
            },
            {
              id: "maleMemberCount",
              header: "Male Member Count",
              accessorKey: "maleMemberCount",
              width: "150px",
              type: "text",
              align: "right"
            },
            {
              id: "femaleMemberCount",
              header: "Female Member Count",
              accessorKey: "femaleMemberCount",
              width: "160px",
              type: "text",
              align: "right"
            },
            {
              id: "dependentAdultCount",
              header: "Dependent Adult Count",
              accessorKey: "dependentAdultCount",
              width: "180px",
              type: "text",
              align: "right"
            },
            {
              id: "dependentChildrenCount",
              header: "Dependent Children Count",
              accessorKey: "dependentChildrenCount",
              width: "200px",
              type: "text",
              align: "right"
            },
            {
              id: "totalSumInsured",
              header: "Total Sum Insured",
              accessorKey: "totalSumInsured",
              width: "160px",
              type: "text",
              align: "right"
            },
            {
              id: "averageAge",
              header: "Average Age",
              accessorKey: "averageAge",
              width: "120px",
              type: "text",
              align: "right"
            },
            {
              id: "averageSumInsured",
              header: "Average Sum Insured",
              accessorKey: "averageSumInsured",
              width: "180px",
              type: "text",
              align: "right"
            },
            // Red Flag Columns
            {
              id: "missingDobPercent",
              header: "Missing DOB %",
              accessorKey: "missingDobPercent",
              width: "140px",
              type: "badge",
              align: "right",
              valueMapping: [
                { value: "0%", label: "0%", color: "success" },
                { value: "low", label: "<5%", color: "success" },
                { value: "medium", label: "5-15%", color: "warning" },
                { value: "high", label: ">15%", color: "error" }
              ]
            },
            {
              id: "missingSalaryPercent",
              header: "Missing Salary %",
              accessorKey: "missingSalaryPercent",
              width: "160px",
              type: "badge",
              align: "right",
              valueMapping: [
                { value: "0%", label: "0%", color: "success" },
                { value: "low", label: "<5%", color: "success" },
                { value: "medium", label: "5-15%", color: "warning" },
                { value: "high", label: ">15%", color: "error" }
              ]
            },
            {
              id: "missingLoanFieldsPercent",
              header: "Missing Loan Fields %",
              accessorKey: "missingLoanFieldsPercent",
              width: "180px",
              type: "badge",
              align: "right",
              valueMapping: [
                { value: "0%", label: "0%", color: "success" },
                { value: "low", label: "<5%", color: "success" },
                { value: "medium", label: "5-15%", color: "warning" },
                { value: "high", label: ">15%", color: "error" }
              ]
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10
          },
          selectable: false,
          searchable: false
        }
      }
    },
    {
      id: "policy-profile-navigation",
      order: 3,
      contentType: "actions",
      title: "Quick Navigation",
      content: {
        widget: {
          id: "policy-navigation-links",
          widgetType: "quick-links",
          title: "Jump to Section",
          layout: "inline",
          links: [
            {
              id: "jump-to-plans",
              label: "Plans",
              type: "card",
              icon: "FileText",
              description: "View and manage plans",
              action: {
                id: "jump-to-plans-action",
                label: "Plans",
                icon: "FileText",
                variant: "outline",
                intent: "view",
                actionProps: {
                  route: "#plans"
                }
              }
            },
            {
              id: "jump-to-premium-methods",
              label: "Premium Methods",
              type: "card",
              icon: "CreditCard",
              description: "View premium methods",
              action: {
                id: "jump-to-premium-methods-action",
                label: "Premium Methods",
                icon: "CreditCard",
                variant: "outline",
                intent: "view",
                actionProps: {
                  route: "#premium-methods"
                }
              }
            },
            {
              id: "jump-to-members",
              label: "Members",
              type: "card",
              icon: "Users",
              description: "View members list",
              action: {
                id: "jump-to-members-action",
                label: "Members",
                icon: "Users",
                variant: "outline",
                intent: "view",
                actionProps: {
                  route: "#members"
                }
              }
            },
            {
              id: "jump-to-uw-queue",
              label: "UW Queue",
              type: "card",
              icon: "ClipboardList",
              description: "View underwriting queue",
              action: {
                id: "jump-to-uw-queue-action",
                label: "UW Queue",
                icon: "ClipboardList",
                variant: "outline",
                intent: "view",
                actionProps: {
                  route: "#uw-queue"
                }
              }
            }
          ]
        }
      }
    }
  ]
};

// ============================================
// Plans Tab Config
// ============================================

export const plansTabConfig: TabContentConfig = {
  id: "plans",
  sections: [
    {
      id: "plan-portfolio-intelligence",
      order: 1,
      contentType: "actions",
      title: "Plan Portfolio Overview",
      content: {
        widget: {
          id: "plan-portfolio-widget",
          widgetType: "quick-links",
          title: "Plan Portfolio Summary - 4 Active Plans",
          layout: "grid",
          links: [
            {
              id: "total-plans",
              label: "Total Plans",
              type: "card",
              icon: "Layers",
              description: "4 active plans configured",
              action: {
                id: "view-all-plans",
                label: "View All",
                icon: "Eye",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "total-members",
              label: "Total Members",
              type: "card",
              icon: "Users",
              description: "1,250 members across all plans",
              action: {
                id: "view-members",
                label: "View Members",
                icon: "Users",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "total-sum-insured",
              label: "Total Sum Insured",
              type: "card",
              icon: "DollarSign",
              description: "₹12.5 Cr total coverage",
              action: {
                id: "view-coverage",
                label: "View Details",
                icon: "FileText",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "plan-completeness",
              label: "Plan Completeness",
              type: "card",
              icon: "CheckCircle2",
              description: "3 of 4 plans fully configured",
              action: {
                id: "view-incomplete",
                label: "View Issues",
                icon: "AlertCircle",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "level-term-plans",
              label: "Level Term Plans",
              type: "card",
              icon: "TrendingFlat",
              description: "2 plans - 800 members",
              action: {
                id: "filter-level-term",
                label: "Filter",
                icon: "Filter",
                variant: "outline",
                intent: "view"
              }
            },
            {
              id: "reducing-term-plans",
              label: "Reducing Term Plans",
              type: "card",
              icon: "TrendingDown",
              description: "2 plans - 450 members",
              action: {
                id: "filter-reducing-term",
                label: "Filter",
                icon: "Filter",
                variant: "outline",
                intent: "view"
              }
            }
          ]
        }
      }
    },
    {
      id: "plans-table",
      order: 2,
      contentType: "table",
      title: "Plans Listing",
      headerActions: [
        {
          id: "add-plan",
          label: "Add Plan",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-plan-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/plans",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "planNumber",
              header: "Plan Number",
              accessorKey: "planNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "planDescription",
              header: "Plan Description",
              accessorKey: "planDescription",
              type: "text",
              sortable: true,
              width: "220px"
            },
            {
              id: "planType",
              header: "Plan Type",
              accessorKey: "planType",
              type: "badge",
              sortable: true,
              width: "140px",
              valueMapping: [
                { value: "level-term", label: "Level Term", color: "default" },
                { value: "reducing-term", label: "Reducing Term", color: "info" },
                { value: "decreasing-term", label: "Decreasing Term", color: "warning" }
              ]
            },
            {
              id: "sumAssuredBasis",
              header: "SA Basis",
              accessorKey: "sumAssuredBasis",
              type: "badge",
              sortable: true,
              width: "150px",
              valueMapping: [
                { value: "flat", label: "Flat", color: "default" },
                { value: "salary-multiple", label: "Salary Multiple", color: "info" },
                { value: "grade-slab", label: "Grade Slab", color: "warning" },
                { value: "loan-outstanding", label: "Loan Outstanding", color: "error" }
              ]
            },
            {
              id: "enrollmentType",
              header: "Enrollment",
              accessorKey: "enrollmentType",
              type: "badge",
              sortable: true,
              width: "130px",
              valueMapping: [
                { value: "auto", label: "Auto", color: "success" },
                { value: "opt-in", label: "Opt-in", color: "info" },
                { value: "evidence-based", label: "Evidence", color: "warning" }
              ]
            },
            {
              id: "livesCovered",
              header: "Lives Covered",
              accessorKey: "livesCovered",
              type: "text",
              sortable: true,
              width: "140px"
            },
            {
              id: "memberCount",
              header: "Members",
              accessorKey: "memberCount",
              type: "number",
              sortable: true,
              width: "100px",
              align: "right"
            },
            {
              id: "totalSumInsured",
              header: "Total SI",
              accessorKey: "totalSumInsured",
              type: "currency",
              sortable: true,
              width: "140px",
              align: "right"
            },
            {
              id: "completenessScore",
              header: "Completeness",
              accessorKey: "completenessScore",
              type: "badge",
              sortable: true,
              width: "130px",
              valueMapping: [
                { value: "100", label: "100%", color: "success" },
                { value: "75", label: "75%", color: "warning" },
                { value: "50", label: "50%", color: "error" },
                { value: "25", label: "25%", color: "error" }
              ]
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              type: "status",
              sortable: true,
              width: "110px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "inactive", label: "Inactive", color: "default" },
                { value: "terminated", label: "Terminated", color: "error" }
              ]
            },
            {
              id: "startDate",
              header: "Start Date",
              accessorKey: "startDate",
              type: "date",
              sortable: true,
              width: "130px"
            },
            {
              id: "endDate",
              header: "End Date",
              accessorKey: "endDate",
              type: "date",
              sortable: true,
              width: "130px"
            }
          ],
          rowActions: [
            {
              id: "view",
              label: "View Details",
              icon: "Eye",
              intent: "view",
              actionProps: {
                interaction: "modal"
              }
            },
            {
              id: "view-members",
              label: "View Members",
              icon: "Users",
              intent: "view",
              actionProps: {
                route: "/members?planId={id}"
              }
            },
            {
              id: "configure-rules",
              label: "Configure Rules",
              icon: "Settings",
              intent: "custom",
              variant: "outline",
              actionProps: {
                formId: "configure-plan-rules-form",
                interaction: "sheet"
              }
            },
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "add-plan-form",
                interaction: "sheet"
              }
            },
            {
              id: "clone",
              label: "Clone Plan",
              icon: "Copy",
              intent: "custom",
              variant: "outline",
              actionProps: {
                interaction: "api-call",
                api: {
                  endpoint: "/api/policy/plans/clone",
                  method: "POST"
                },
                successMessage: "Plan cloned successfully!"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "terminate",
              label: "Terminate",
              icon: "CircleX",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate the selected plans?"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "Clock",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected plans?"
              }
            },
            {
              id: "bulk-export",
              label: "Export Selected",
              icon: "Download",
              variant: "outline",
              intent: "export"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true
        }
      }
    }
  ]
};

// ============================================
// Subsidiaries Tab Config
// ============================================

export const subsidiariesTabConfig: TabContentConfig = {
  id: "subsidiaries",
  sections: [
    // Section A & B: Subsidiary Listing Grid
    {
      id: "subsidiaries-table",
      order: 1,
      contentType: "table",
      title: "Subsidiaries Listing",
      headerActions: [
        {
          id: "add-subsidiary",
          label: "Add Subsidiary",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-subsidiary-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/subsidiaries",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "subsidiaryCode",
              header: "Subsidiary Code",
              accessorKey: "subsidiaryCode",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "subsidiaryName",
              header: "Subsidiary Name",
              accessorKey: "subsidiaryName",
              type: "text",
              sortable: true,
              width: "200px"
            },
            {
              id: "locationBranch",
              header: "Location/Branch",
              accessorKey: "locationBranch",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "billingSplitRule",
              header: "Billing Split Rule",
              accessorKey: "billingSplitRule",
              type: "badge",
              sortable: true,
              width: "130px",
              valueMapping: [
                { value: "headcount", label: "Headcount", color: "default" },
                { value: "si", label: "Sum Insured", color: "info" },
                { value: "premium", label: "Premium", color: "success" }
              ]
            },
            {
              id: "startDate",
              header: "Start Date",
              accessorKey: "startDate",
              type: "date",
              sortable: true,
              width: "120px"
            },
            {
              id: "endDate",
              header: "End Date",
              accessorKey: "endDate",
              type: "date",
              sortable: true,
              width: "120px"
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              type: "badge",
              sortable: true,
              width: "100px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "terminated", label: "Terminated", color: "error" },
                { value: "lapsed", label: "Lapsed", color: "warning" }
              ]
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-subsidiary-form",
                interaction: "sheet"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "Clock",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse this subsidiary?"
              }
            },
            {
              id: "terminate",
              label: "Terminate",
              icon: "XCircle",
              intent: "custom",
              variant: "destructive",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate this subsidiary?"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "terminate",
              label: "Terminate",
              icon: "XCircle",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate the selected subsidiaries?"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "Clock",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected subsidiaries?"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search by subsidiary code or name..."
        }
      }
    },
    // Section C: Controls
    {
      id: "subsidiaries-controls",
      order: 2,
      contentType: "actions",
      title: "Subsidiary Controls",
      content: {
        widget: {
          id: "subsidiary-controls-widget",
          widgetType: "quick-links",
          title: "Billing & Transfer Rules",
          layout: "grid",
          links: [
            {
              id: "billing-enforcement",
              label: "Separate Bill per Subsidiary",
              type: "card",
              icon: "Receipt",
              description: "Preview and configure billing separation rules for each subsidiary",
              action: {
                id: "view-billing-enforcement",
                label: "View Billing Rules",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "subsidiary-billing-rules-form"
                }
              }
            },
            {
              id: "member-transfer-rules",
              label: "Member Transfer Rules",
              type: "card",
              icon: "ArrowLeftRight",
              description: "Configure rules for transferring members between subsidiaries",
              action: {
                id: "manage-transfer-rules",
                label: "Manage Transfer Rules",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "member-transfer-rules-form"
                }
              }
            }
          ]
        }
      }
    }
  ]
};

// ============================================
// Policy Exclusion Mock Data
// ============================================

const policyExclusionMockData: RowData[] = [
  {
    id: "1",
    exclusionCode: "EXC001",
    exclusionDescription: "Pre-existing diseases",
    scope: "policy",
    category: "mandatory",
    version: "2.1",
    effectiveDate: "2025-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdBy: "Underwriter - Mike Johnson",
    modifiedDate: "2025-01-01"
  },
  {
    id: "2",
    exclusionCode: "EXC002",
    exclusionDescription: "Suicide Clause (12 months)",
    scope: "policy",
    category: "mandatory",
    version: "2.1",
    effectiveDate: "2025-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdBy: "Legal - Emma Davis",
    modifiedDate: "2025-01-01"
  },
  {
    id: "3",
    exclusionCode: "EXC003",
    exclusionDescription: "War and Terrorism",
    scope: "policy",
    category: "mandatory",
    version: "2.1",
    effectiveDate: "2025-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdBy: "Underwriter - Mike Johnson",
    modifiedDate: "2025-01-01"
  },
  {
    id: "4",
    exclusionCode: "EXC004",
    exclusionDescription: "Self-inflicted injuries",
    scope: "policy",
    category: "mandatory",
    version: "2.1",
    effectiveDate: "2025-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdBy: "Underwriter - Mike Johnson",
    modifiedDate: "2025-01-01"
  },
  {
    id: "5",
    exclusionCode: "EXC005",
    exclusionDescription: "Criminal activities",
    scope: "policy",
    category: "mandatory",
    version: "2.1",
    effectiveDate: "2025-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdBy: "Legal - Emma Davis",
    modifiedDate: "2025-01-01"
  }
];

// ============================================
// Exclusion Version History Mock Data
// ============================================

const exclusionVersionHistoryMockData: RowData[] = [
  {
    id: "1",
    timestamp: "2025-01-01 10:00:00",
    exclusionCode: "EXC001",
    version: "2.1",
    action: "versioned",
    performedBy: "Underwriter - Mike Johnson",
    changes: "Updated wording to align with IRDAI guidelines 2025 - clarified pre-existing disease definition"
  },
  {
    id: "2",
    timestamp: "2024-12-31 16:30:00",
    exclusionCode: "EXC001",
    version: "2.0",
    action: "superseded",
    performedBy: "System - Auto",
    changes: "Version 2.0 superseded by version 2.1"
  },
  {
    id: "3",
    timestamp: "2025-01-01 09:45:00",
    exclusionCode: "EXC007",
    version: "2.1",
    action: "created",
    performedBy: "Underwriter - Mike Johnson",
    changes: "New aviation exclusion added for non-commercial flights"
  },
  {
    id: "4",
    timestamp: "2024-12-15 14:20:00",
    exclusionCode: "EXC006",
    version: "2.0",
    action: "updated",
    performedBy: "Product Manager - Sarah Wilson",
    changes: "Updated hazardous activities list to include extreme sports"
  },
  {
    id: "5",
    timestamp: "2024-03-01 11:00:00",
    exclusionCode: "EXC009",
    version: "1.0",
    action: "archived",
    performedBy: "Risk Manager - John Smith",
    changes: "Pandemic exclusion archived as COVID-19 emergency period ended"
  },
  {
    id: "6",
    timestamp: "2025-01-01 10:15:00",
    exclusionCode: "EXC002",
    version: "2.1",
    action: "updated",
    performedBy: "Legal - Emma Davis",
    changes: "Suicide clause period clarified - 12 months from policy inception"
  },
  {
    id: "7",
    timestamp: "2024-06-01 09:00:00",
    exclusionCode: "EXC006",
    version: "2.0",
    action: "created",
    performedBy: "Product Manager - Sarah Wilson",
    changes: "Hazardous activities exclusion added for specific plans"
  },
  {
    id: "8",
    timestamp: "2025-01-01 10:30:00",
    exclusionCode: "EXC008",
    version: "2.1",
    action: "created",
    performedBy: "Legal - Emma Davis",
    changes: "Nuclear hazards exclusion added as per regulatory requirement"
  }
];

// ============================================
// Documents Mock Data
// ============================================

const documentsMockData: RowData[] = [
  {
    id: "1",
    documentType: "Proposal Form",
    documentSource: "broker",
    linkedEntity: "Policy: POL-2025-001",
    effectiveDate: "2025-01-12",
    expiryDate: "2026-01-12",
    uploadedBy: "John Broker",
    uploadedDate: "2025-01-12",
    verificationStatus: "verified",
    documentStatus: "approved",
    dmsReference: "DMS-2025-001-PF"
  },
  {
    id: "2",
    documentType: "KYC Documents",
    documentSource: "client",
    linkedEntity: "Policy: POL-2025-001",
    effectiveDate: "2024-12-01",
    expiryDate: "2025-01-01",
    uploadedBy: "Sarah Client",
    uploadedDate: "2024-12-15",
    verificationStatus: "expired",
    documentStatus: "expired",
    dmsReference: "DMS-2024-089-KYC"
  },
  {
    id: "3",
    documentType: "Member Details",
    documentSource: "client",
    linkedEntity: "Policy: POL-2025-001",
    effectiveDate: "2025-01-12",
    expiryDate: "2026-01-12",
    uploadedBy: "Sarah Client",
    uploadedDate: "2025-01-10",
    verificationStatus: "verified",
    documentStatus: "approved",
    dmsReference: "DMS-2025-002-MD"
  },
  {
    id: "4",
    documentType: "Financial Details",
    documentSource: "lender",
    linkedEntity: "Policy: POL-2025-001",
    effectiveDate: "2025-01-12",
    expiryDate: "2026-01-12",
    uploadedBy: "Bank Officer",
    uploadedDate: "2025-01-11",
    verificationStatus: "pending",
    documentStatus: "pending",
    dmsReference: "DMS-2025-003-FD"
  },
  {
    id: "5",
    documentType: "Medical Data of Members",
    documentSource: "client",
    linkedEntity: "Member: MEM-45678",
    effectiveDate: "2025-01-12",
    expiryDate: "2026-01-12",
    uploadedBy: "Sarah Client",
    uploadedDate: "2025-01-08",
    verificationStatus: "rejected",
    documentStatus: "resubmit",
    dmsReference: "DMS-2025-004-MED"
  },
  {
    id: "6",
    documentType: "Salary Certificates",
    documentSource: "client",
    linkedEntity: "Plan: P01",
    effectiveDate: "2025-01-12",
    expiryDate: "2025-07-12",
    uploadedBy: "HR Manager",
    uploadedDate: "2025-01-09",
    verificationStatus: "verified",
    documentStatus: "approved",
    dmsReference: "DMS-2025-005-SAL"
  },
  {
    id: "7",
    documentType: "Board Resolution",
    documentSource: "client",
    linkedEntity: "Policy: POL-2025-001",
    effectiveDate: "2025-01-05",
    expiryDate: "2026-01-05",
    uploadedBy: "Company Secretary",
    uploadedDate: "2025-01-05",
    verificationStatus: "verified",
    documentStatus: "approved",
    dmsReference: "DMS-2025-006-BR"
  },
  {
    id: "8",
    documentType: "Previous Policy Copy",
    documentSource: "insurer",
    linkedEntity: "Policy: POL-2025-001",
    effectiveDate: "2024-01-01",
    expiryDate: "2025-01-01",
    uploadedBy: "Underwriter",
    uploadedDate: "2025-01-06",
    verificationStatus: "verified",
    documentStatus: "approved",
    dmsReference: "DMS-2025-007-PPC"
  }
];

// ============================================
// Documents Audit Trail Mock Data
// ============================================

const documentsAuditTrailMockData: RowData[] = [
  {
    id: "1",
    timestamp: "2025-01-12T14:30:00Z",
    documentType: "Proposal Form",
    action: "verified",
    performedBy: "Underwriter - Mike Johnson",
    comments: "All details verified and approved for underwriting"
  },
  {
    id: "2",
    timestamp: "2025-01-12T10:15:00Z",
    documentType: "Proposal Form",
    action: "uploaded",
    performedBy: "Broker - John Broker",
    comments: "Initial proposal form submitted by broker"
  },
  {
    id: "3",
    timestamp: "2025-01-11T16:45:00Z",
    documentType: "Financial Details",
    action: "uploaded",
    performedBy: "Lender - Bank Officer",
    comments: "Financial statements and loan details uploaded"
  },
  {
    id: "4",
    timestamp: "2025-01-10T11:20:00Z",
    documentType: "Medical Data of Members",
    action: "rejected",
    performedBy: "Medical Underwriter - Dr. Smith",
    comments: "Medical reports incomplete - missing ECG reports for 3 members above 50 years"
  },
  {
    id: "5",
    timestamp: "2025-01-10T09:30:00Z",
    documentType: "Member Details",
    action: "verified",
    performedBy: "Operations - Sarah Wilson",
    comments: "Member data validated against scheme requirements"
  },
  {
    id: "6",
    timestamp: "2025-01-09T15:00:00Z",
    documentType: "Salary Certificates",
    action: "verified",
    performedBy: "Underwriter - Mike Johnson",
    comments: "Salary certificates verified for premium calculation"
  },
  {
    id: "7",
    timestamp: "2025-01-08T14:00:00Z",
    documentType: "Medical Data of Members",
    action: "uploaded",
    performedBy: "Client - Sarah Client",
    comments: "Medical examination reports uploaded"
  },
  {
    id: "8",
    timestamp: "2025-01-06T10:00:00Z",
    documentType: "KYC Documents",
    action: "requested",
    performedBy: "System - Auto Request",
    comments: "KYC documents expired - renewal requested from client"
  },
  {
    id: "9",
    timestamp: "2025-01-05T16:30:00Z",
    documentType: "Board Resolution",
    action: "verified",
    performedBy: "Legal - Emma Davis",
    comments: "Board resolution verified and approved"
  },
  {
    id: "10",
    timestamp: "2025-01-05T14:00:00Z",
    documentType: "Board Resolution",
    action: "uploaded",
    performedBy: "Client - Company Secretary",
    comments: "Board resolution for group insurance policy uploaded"
  }
];

// ============================================
// Policy Profile Mock Data
// ============================================

const policyProfileMockData: RowData[] = [
  {
    id: "1",
    planNumber: "P01",
    planDescription: "Base Death Benefit",
    fromAge: "18",
    toAge: "60",
    maleMemberCount: "450",
    femaleMemberCount: "350",
    dependentAdultCount: "200",
    dependentChildrenCount: "150",
    totalSumInsured: "4,00,00,000",
    averageAge: "35",
    averageSumInsured: "5,00,000",
    missingDobPercent: "0%",
    missingSalaryPercent: "low",
    missingLoanFieldsPercent: "0%"
  },
  {
    id: "2",
    planNumber: "P02",
    planDescription: "Base Death Benefit with Critical Illness (10)",
    fromAge: "18",
    toAge: "65",
    maleMemberCount: "200",
    femaleMemberCount: "180",
    dependentAdultCount: "100",
    dependentChildrenCount: "80",
    totalSumInsured: "3,00,00,000",
    averageAge: "38",
    averageSumInsured: "7,50,000",
    missingDobPercent: "medium",
    missingSalaryPercent: "medium",
    missingLoanFieldsPercent: "low"
  },
  {
    id: "3",
    planNumber: "P03",
    planDescription: "Base Death Benefit with Critical Illness (25)",
    fromAge: "60",
    toAge: "80",
    maleMemberCount: "80",
    femaleMemberCount: "70",
    dependentAdultCount: "50",
    dependentChildrenCount: "20",
    totalSumInsured: "1,50,00,000",
    averageAge: "68",
    averageSumInsured: "10,00,000",
    missingDobPercent: "high",
    missingSalaryPercent: "0%",
    missingLoanFieldsPercent: "high"
  }
];

// ============================================
// Plan / Products Tab Config (with nested tabs)
// ============================================

export const planProductsTabConfig: TabContentConfig = {
  id: "plan-products",
  tabs: [
    { id: "plan-products-listing", label: "Listing" },
    { id: "component-rules", label: "Component Rules" },
    { id: "component-templates", label: "Component Templates" }
  ],
  sections: []
};

// ============================================
// Plan / Products - Listing Tab Config
// ============================================

export const planProductsListingTabConfig: TabContentConfig = {
  id: "plan-products-listing",
  sections: [
    {
      id: "plan-context-header",
      order: 1,
      contentType: "actions",
      title: "Plan Context",
      content: {
        widget: {
          id: "plan-context-widget",
          widgetType: "quick-links",
          layout: "inline",
          links: [
            {
              id: "quote-number",
              label: "Quote #: Q-2025-001234",
              type: "icon-link",
              icon: "FileText",
              action: {
                id: "view-quote",
                label: "View Quote",
                intent: "view"
              }
            },
            {
              id: "plan-number",
              label: "Plan #: P01",
              type: "icon-link",
              icon: "Layers",
              action: {
                id: "view-plan",
                label: "View Plan",
                intent: "view"
              }
            },
            {
              id: "plan-description",
              label: "Base Death Benefit",
              type: "icon-link",
              icon: "Shield",
              action: {
                id: "view-description",
                label: "View Description",
                intent: "view"
              }
            },
            {
              id: "effective-date",
              label: "Effective: 01-Dec-2025",
              type: "icon-link",
              icon: "Calendar",
              action: {
                id: "view-effective",
                label: "View Effective Date",
                intent: "view"
              }
            }
          ]
        }
      }
    },
    {
      id: "plan-products-table",
      order: 2,
      contentType: "table",
      title: "Plan / Product Listing",
      headerActions: [
        {
          id: "add-product",
          label: "Add Product",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-product-form"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/plan-products",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "productCode",
              header: "Product Code",
              accessorKey: "productCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "productDescription",
              header: "Product Description",
              accessorKey: "productDescription",
              type: "text",
              sortable: true
            },
            {
              id: "riskStartDate",
              header: "Risk Start Date",
              accessorKey: "riskStartDate",
              type: "date",
              sortable: true,
              width: "130px"
            },
            {
              id: "riskEndDate",
              header: "Risk End Date",
              accessorKey: "riskEndDate",
              type: "date",
              sortable: true,
              width: "130px"
            },
            {
              id: "riderFlag",
              header: "Type",
              accessorKey: "riderFlag",
              type: "badge",
              sortable: true,
              width: "100px",
              valueMapping: [
                { value: "base", label: "Base", color: "default" },
                { value: "rider", label: "Rider", color: "info" }
              ]
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-product-form"
              }
            },
            {
              id: "view-constraints",
              label: "View Constraints",
              icon: "Settings",
              intent: "custom",
              actionProps: {
                interaction: "sheet",
                formId: "product-constraints-preview-form"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "terminate",
              label: "Terminate",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate the selected products?"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected products?"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: false
        }
      }
    },
    {
      id: "product-constraints-preview",
      order: 3,
      contentType: "form",
      title: "Product Constraints Preview",
      content: {
        formId: "product-constraints-preview-form"
      }
    }
  ]
};

// ============================================
// S12 - Component Rules Tab Config
// ============================================

export const componentRulesTabConfig: TabContentConfig = {
  id: "component-rules",
  sections: [
    {
      id: "component-rules-form",
      order: 1,
      contentType: "form",
      title: "Component Rules",
      content: {
        formId: "component-rules-form"
      }
    }
  ]
};

// ============================================
// S13 - Component Templates Tab Config
// ============================================

export const componentTemplatesTabConfig: TabContentConfig = {
  id: "component-templates",
  sections: [
    {
      id: "component-templates-form",
      order: 1,
      contentType: "form",
      title: "Component Templates",
      content: {
        formId: "component-templates-form"
      }
    }
  ]
};

// ============================================
// Premium Method 05 Tab Config
// ============================================

export const premiumMethod05TabConfig: TabContentConfig = {
  id: "premium-method-05",
  sections: [
    // Section A: Method Header & Governance
    {
      id: "premium-method-05-header",
      order: 1,
      contentType: "form",
      title: "Method Header & Governance",
      content: {
        formId: "premium-method-05-header-form"
      }
    },
    // Section B: Rating Basis Definition
    {
      id: "premium-method-05-rating-basis",
      order: 2,
      contentType: "form",
      title: "Rating Basis Definition",
      content: {
        formId: "premium-method-05-rating-basis-form"
      }
    },
    // Section C & D: Rate Grid (Rating Dimensions + Rate Card)
    {
      id: "premium-method-05-table",
      order: 3,
      contentType: "table",
      title: "Rate Grid",
      headerActions: [
        {
          id: "add-rate-row",
          label: "Add Rate Row",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-premium-method-05-form",
            interaction: "sheet"
          }
        },
        {
          id: "bulk-import",
          label: "Bulk Import",
          icon: "Upload",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "sheet",
            formId: "bulk-import-rates-form"
          }
        },
        {
          id: "validate-rate-card",
          label: "Validate",
          icon: "CheckCircle",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "api-call",
            api: {
              endpoint: "/api/policy/premium-method-05/validate",
              method: "POST"
            },
            successMessage: "Rate card validated successfully!"
          }
        },
        {
          id: "simulate-premium",
          label: "Simulate",
          icon: "Calculator",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "api-call",
            api: {
              endpoint: "/api/policy/premium-method-05/simulate",
              method: "POST"
            },
            successMessage: "Simulation completed successfully!"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/premium-method-05",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "planNumber",
              header: "Plan No.",
              accessorKey: "planNumber",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "planDescription",
              header: "Plan Description",
              accessorKey: "planDescription",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "productCode",
              header: "Product",
              accessorKey: "productCode",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "effectiveFrom",
              header: "Effective From",
              accessorKey: "effectiveFrom",
              type: "date",
              sortable: true,
              width: "110px"
            },
            {
              id: "effectiveTo",
              header: "Effective To",
              accessorKey: "effectiveTo",
              type: "date",
              sortable: true,
              width: "110px"
            },
            {
              id: "ageBandFrom",
              header: "Age From",
              accessorKey: "ageBandFrom",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "ageBandTo",
              header: "Age To",
              accessorKey: "ageBandTo",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "gender",
              header: "Gender",
              accessorKey: "gender",
              type: "badge",
              sortable: true,
              width: "80px",
              valueMapping: [
                { value: "M", label: "Male", color: "default" },
                { value: "F", label: "Female", color: "info" },
                { value: "O", label: "Other", color: "warning" },
                { value: "U", label: "Any", color: "default" }
              ]
            },
            {
              id: "occupationClass",
              header: "Occ. Class",
              accessorKey: "occupationClass",
              type: "text",
              sortable: true,
              width: "90px"
            },
            {
              id: "termBand",
              header: "Term",
              accessorKey: "termBand",
              type: "text",
              sortable: true,
              width: "70px"
            },
            {
              id: "sumInsuredFrom",
              header: "SI From",
              accessorKey: "sumInsuredFrom",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "sumInsuredTo",
              header: "SI To",
              accessorKey: "sumInsuredTo",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "memberRate",
              header: "Member Rate",
              accessorKey: "memberRate",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "spouseRate",
              header: "Spouse Rate",
              accessorKey: "spouseRate",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "dependentRate",
              header: "Dep. Rate",
              accessorKey: "dependentRate",
              type: "text",
              sortable: true,
              width: "90px"
            },
            {
              id: "rateUnit",
              header: "Rate Unit",
              accessorKey: "rateUnit",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "rowPriority",
              header: "Priority",
              accessorKey: "rowPriority",
              type: "text",
              sortable: true,
              width: "70px"
            },
            {
              id: "rowStatus",
              header: "Status",
              accessorKey: "rowStatus",
              type: "badge",
              sortable: true,
              width: "90px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "retired", label: "Retired", color: "error" }
              ]
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-premium-method-05-form",
                interaction: "sheet"
              }
            },
            {
              id: "retire",
              label: "Retire",
              icon: "Archive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to retire this rate row?"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "bulk-edit",
              label: "Bulk Edit",
              icon: "Pencil",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "sheet",
                formId: "bulk-edit-rates-form"
              }
            },
            {
              id: "bulk-retire",
              label: "Retire Selected",
              icon: "Archive",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to retire the selected rate rows?"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50, 100]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search by plan, product, age band..."
        }
      }
    },
    // Section E: Loadings, Discounts & Overrides
    {
      id: "premium-method-05-loadings-discounts",
      order: 4,
      contentType: "actions",
      title: "Loadings, Discounts & Overrides",
      content: {
        widget: {
          id: "loadings-discounts-widget",
          widgetType: "quick-links",
          title: "Pricing Adjustments",
          layout: "grid",
          links: [
            {
              id: "loading-types",
              label: "Loading Types",
              type: "card",
              icon: "TrendingUp",
              description: "Medical evidence, Occupation, Industry, Adverse claims, Rider loadings",
              action: {
                id: "manage-loadings",
                label: "Manage Loadings",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "manage-loadings-form"
                }
              }
            },
            {
              id: "discount-types",
              label: "Discount Types",
              type: "card",
              icon: "TrendingDown",
              description: "Large group, Broker/channel, Persistency/renewal discounts",
              action: {
                id: "manage-discounts",
                label: "Manage Discounts",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "manage-discounts-form"
                }
              }
            },
            {
              id: "caps-floors",
              label: "Caps & Floors",
              type: "card",
              icon: "Gauge",
              description: "Max loading %, max discount %, minimum premium rules",
              action: {
                id: "manage-caps-floors",
                label: "Configure Limits",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "manage-caps-floors-form"
                }
              }
            },
            {
              id: "override-governance",
              label: "Override Governance",
              type: "card",
              icon: "Shield",
              description: "Override permissions, approval workflow, reason codes",
              action: {
                id: "manage-overrides",
                label: "Configure Overrides",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "manage-overrides-form"
                }
              }
            }
          ]
        }
      }
    },
    // Section F: Pricing Trace / Explainability
    {
      id: "premium-method-05-pricing-trace",
      order: 5,
      contentType: "actions",
      title: "Pricing Trace / Explainability",
      content: {
        widget: {
          id: "pricing-trace-widget",
          widgetType: "quick-links",
          title: "Premium Calculation Audit Trail",
          layout: "grid",
          links: [
            {
              id: "input-snapshot",
              label: "Input Snapshot",
              type: "card",
              icon: "FileInput",
              description: "Age, SI, term, plan, member type, scheme type inputs",
              action: {
                id: "view-inputs",
                label: "View Inputs",
                intent: "view"
              }
            },
            {
              id: "matched-rows",
              label: "Matched Rate Rows",
              type: "card",
              icon: "TableProperties",
              description: "Row IDs and dimensions that matched the lookup",
              action: {
                id: "view-matched-rows",
                label: "View Matches",
                intent: "view"
              }
            },
            {
              id: "calculation-breakdown",
              label: "Calculation Breakdown",
              type: "card",
              icon: "Calculator",
              description: "Base rate → Modal factor → Loadings → Discounts → Net → Gross",
              action: {
                id: "view-breakdown",
                label: "View Breakdown",
                intent: "view"
              }
            },
            {
              id: "version-references",
              label: "Version References",
              type: "card",
              icon: "GitBranch",
              description: "Rule/row versions and quote version that consumed this rate",
              action: {
                id: "view-versions",
                label: "View Versions",
                intent: "view"
              }
            }
          ]
        }
      }
    },
    // Section G: Workflow Actions
    {
      id: "premium-method-05-workflow",
      order: 6,
      contentType: "actions",
      title: "Rate Card Workflow",
      content: {
        widget: {
          id: "workflow-actions-widget",
          widgetType: "quick-links",
          title: "Approval & Governance",
          layout: "inline",
          links: [
            {
              id: "submit-for-approval",
              label: "Submit for Approval",
              type: "link",
              action: {
                id: "submit-approval-action",
                label: "Submit for Approval",
                icon: "Send",
                variant: "default",
                intent: "custom",
                actionProps: {
                  interaction: "modal",
                  confirmationRequired: true,
                  confirmationMessage: "Submit this rate card version for approval?"
                }
              }
            },
            {
              id: "approve-rate-card",
              label: "Approve",
              type: "link",
              action: {
                id: "approve-action",
                label: "Approve",
                icon: "CheckCircle",
                variant: "default",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "approve-rate-card-form"
                }
              }
            },
            {
              id: "reject-rate-card",
              label: "Reject",
              type: "link",
              action: {
                id: "reject-action",
                label: "Reject",
                icon: "XCircle",
                variant: "destructive",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "reject-rate-card-form"
                }
              }
            },
            {
              id: "retire-version",
              label: "Retire Version",
              type: "link",
              action: {
                id: "retire-version-action",
                label: "Retire Version",
                icon: "Archive",
                variant: "outline",
                intent: "custom",
                actionProps: {
                  interaction: "modal",
                  formId: "retire-version-form"
                }
              }
            }
          ]
        }
      }
    }
  ]
};

// ============================================
// Premium Method 05 Mock Data
// ============================================

const premiumMethod05MockData: RowData[] = [
  {
    id: "1",
    planNumber: "P01",
    planDescription: "Base Death Benefit",
    productCode: "BAGT",
    productDescription: "Bharti Axa Group Term Insurance - Employer Employee",
    sumInsured: "₹5,00,000",
    memberRate: "₹1,250.50",
    spouseRate: "₹950.75",
    dependentRate: "₹650.25"
  },
  {
    id: "2",
    planNumber: "P01",
    planDescription: "Base Death Benefit",
    productCode: "BAGT",
    productDescription: "Bharti Axa Group Term Insurance - Employer Employee",
    sumInsured: "₹10,00,000",
    memberRate: "₹2,450.00",
    spouseRate: "₹1,850.00",
    dependentRate: "₹1,250.00"
  },
  {
    id: "3",
    planNumber: "P01",
    planDescription: "Base Death Benefit",
    productCode: "BAAD",
    productDescription: "Bharti AXA Life Group Accidental Death Benefit Rider",
    sumInsured: "₹15,00,000",
    memberRate: "₹3,650.75",
    spouseRate: "₹2,750.50",
    dependentRate: "₹1,850.25"
  },
  {
    id: "4",
    planNumber: "P02",
    planDescription: "Base Death Benefit with Accidental Cover",
    productCode: "BAGT",
    productDescription: "Bharti Axa Group Term Insurance - Employer Employee",
    sumInsured: "₹20,00,000",
    memberRate: "₹4,850.00",
    spouseRate: "₹3,650.00",
    dependentRate: "₹2,450.00"
  },
  {
    id: "5",
    planNumber: "P02",
    planDescription: "Base Death Benefit with Accidental Cover",
    productCode: "BAAD",
    productDescription: "Bharti AXA Life Group Accidental Death Benefit Rider",
    sumInsured: "₹25,00,000",
    memberRate: "₹6,050.25",
    spouseRate: "₹4,550.75",
    dependentRate: "₹3,050.50"
  }
];

// ============================================
// Premium Method 06 Mock Data
// ============================================

const premiumMethod06MockData: RowData[] = [
  {
    id: "1",
    planCode: "P01",
    productDescription: "GTL Employer-Employee Bundle Plan",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-12-31",
    ageBandFrom: "18",
    ageBandTo: "35",
    sumInsuredFrom: "₹1,00,000",
    sumInsuredTo: "₹5,00,000",
    employeeOnlyRate: "₹1,200.00",
    employeeSpouseRate: "₹1,850.00",
    employeeChildrenRate: "₹1,650.00",
    familyRate: "₹2,400.00",
    borrowerOnlyRate: "-",
    rowPriority: "1",
    rowStatus: "active"
  }
];

// ============================================
// Premium Method 06 Tab Config
// ============================================

export const premiumMethod06TabConfig: TabContentConfig = {
  id: "premium-method-06",
  sections: [
    // Section A: Method Header & Governance (same structure as S15)
    {
      id: "premium-method-06-header",
      order: 1,
      contentType: "form",
      title: "Method Header & Governance",
      content: {
        formId: "premium-method-06-header-form"
      }
    },
    // Section B: Bundle Definition
    {
      id: "premium-method-06-bundle-definition",
      order: 2,
      contentType: "actions",
      title: "Bundle Definition",
      content: {
        widget: {
          id: "bundle-definition-widget",
          widgetType: "quick-links",
          title: "Bundle Composition & Eligibility Rules",
          layout: "grid",
          links: [
            {
              id: "bundle-composition",
              label: "Bundle Composition Rules",
              type: "card",
              icon: "Users",
              description: "Employee only, E+Spouse, E+Children, Family, Borrower-only configurations",
              action: {
                id: "manage-bundle-composition",
                label: "Configure Bundles",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "bundle-composition-form"
                }
              }
            },
            {
              id: "child-rules",
              label: "Child Count Rules",
              type: "card",
              icon: "Baby",
              description: "Max children count, age definition for dependent child",
              action: {
                id: "manage-child-rules",
                label: "Configure Rules",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "child-rules-form"
                }
              }
            },
            {
              id: "spouse-eligibility",
              label: "Spouse Eligibility",
              type: "card",
              icon: "Heart",
              description: "Spouse eligibility rule reference and criteria",
              action: {
                id: "manage-spouse-eligibility",
                label: "Configure Eligibility",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "spouse-eligibility-form"
                }
              }
            },
            {
              id: "counting-rule",
              label: "Counting Rule",
              type: "card",
              icon: "Hash",
              description: "Headcount vs Covered Lives vs Insured Units",
              action: {
                id: "manage-counting-rule",
                label: "Configure Counting",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "counting-rule-form"
                }
              }
            }
          ]
        }
      }
    },
    // Section C: Bundle Rate Grid
    {
      id: "premium-method-06-table",
      order: 3,
      contentType: "table",
      title: "Bundle Rate Grid",
      headerActions: [
        {
          id: "add-bundle-rate",
          label: "Add Rate Row",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-premium-method-06-form",
            interaction: "sheet"
          }
        },
        {
          id: "bulk-import",
          label: "Bulk Import",
          icon: "Upload",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "modal",
            formId: "bulk-import-bundle-rates-form"
          }
        },
        {
          id: "validate-rate-card",
          label: "Validate",
          icon: "CheckCircle",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "modal",
            confirmationRequired: true,
            confirmationMessage: "This will validate the bundle rate card for gaps and overlaps. Continue?"
          }
        },
        {
          id: "simulate-premium",
          label: "Simulate",
          icon: "Calculator",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "api-call",
            api: {
              endpoint: "/api/policy/premium-method-06/simulate",
              method: "POST"
            },
            successMessage: "Simulation completed successfully!"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/premium-method-06",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "planCode",
              header: "Plan Code",
              accessorKey: "planCode",
              type: "text",
              sortable: true,
              width: "90px"
            },
            {
              id: "productDescription",
              header: "Product Description",
              accessorKey: "productDescription",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "effectiveFrom",
              header: "Effective From",
              accessorKey: "effectiveFrom",
              type: "date",
              sortable: true,
              width: "110px"
            },
            {
              id: "effectiveTo",
              header: "Effective To",
              accessorKey: "effectiveTo",
              type: "date",
              sortable: true,
              width: "110px"
            },
            {
              id: "ageBandFrom",
              header: "Age From",
              accessorKey: "ageBandFrom",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "ageBandTo",
              header: "Age To",
              accessorKey: "ageBandTo",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "sumInsuredFrom",
              header: "SI From",
              accessorKey: "sumInsuredFrom",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "sumInsuredTo",
              header: "SI To",
              accessorKey: "sumInsuredTo",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "employeeOnlyRate",
              header: "Employee Only",
              accessorKey: "employeeOnlyRate",
              type: "text",
              sortable: true,
              width: "110px"
            },
            {
              id: "employeeSpouseRate",
              header: "E + Spouse",
              accessorKey: "employeeSpouseRate",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "employeeChildrenRate",
              header: "E + Children",
              accessorKey: "employeeChildrenRate",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "familyRate",
              header: "Family",
              accessorKey: "familyRate",
              type: "text",
              sortable: true,
              width: "90px"
            },
            {
              id: "borrowerOnlyRate",
              header: "Borrower Only",
              accessorKey: "borrowerOnlyRate",
              type: "text",
              sortable: true,
              width: "110px"
            },
            {
              id: "rowPriority",
              header: "Priority",
              accessorKey: "rowPriority",
              type: "text",
              sortable: true,
              width: "70px"
            },
            {
              id: "rowStatus",
              header: "Status",
              accessorKey: "rowStatus",
              type: "badge",
              sortable: true,
              width: "90px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "retired", label: "Retired", color: "error" }
              ]
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-premium-method-06-form",
                interaction: "sheet"
              }
            },
            {
              id: "retire",
              label: "Retire",
              icon: "Archive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to retire this bundle rate row?"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "bulk-edit",
              label: "Bulk Edit",
              icon: "Pencil",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "sheet",
                formId: "bulk-edit-bundle-rates-form"
              }
            },
            {
              id: "bulk-retire",
              label: "Retire Selected",
              icon: "Archive",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to retire the selected bundle rate rows?"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50, 100]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search by plan, product, age band..."
        }
      }
    },
    // Section D: Explainability / Trace Panel
    {
      id: "premium-method-06-trace",
      order: 4,
      contentType: "actions",
      title: "Bundle Premium Trace / Explainability",
      content: {
        widget: {
          id: "bundle-trace-widget",
          widgetType: "quick-links",
          title: "Premium Calculation Audit Trail",
          layout: "grid",
          links: [
            {
              id: "bundle-selection",
              label: "Selected Bundle",
              type: "card",
              icon: "Package",
              description: "Bundle name and eligibility evidence for selection",
              action: {
                id: "view-bundle-selection",
                label: "View Selection",
                intent: "view"
              }
            },
            {
              id: "matched-row",
              label: "Matched Rate Row",
              type: "card",
              icon: "TableProperties",
              description: "Row ID and dimensions that matched the lookup",
              action: {
                id: "view-matched-row",
                label: "View Match",
                intent: "view"
              }
            },
            {
              id: "bundle-rate-chosen",
              label: "Bundle Rate Applied",
              type: "card",
              icon: "DollarSign",
              description: "The specific bundle rate that was applied",
              action: {
                id: "view-rate-chosen",
                label: "View Rate",
                intent: "view"
              }
            },
            {
              id: "premium-breakdown",
              label: "Premium Breakdown",
              type: "card",
              icon: "Calculator",
              description: "Final premium calculation with all adjustments",
              action: {
                id: "view-breakdown",
                label: "View Breakdown",
                intent: "view"
              }
            }
          ]
        }
      }
    },
    // Section E: Workflow Actions
    {
      id: "premium-method-06-workflow",
      order: 5,
      contentType: "actions",
      title: "Rate Card Workflow",
      content: {
        widget: {
          id: "bundle-workflow-widget",
          widgetType: "quick-links",
          title: "Approval & Governance",
          layout: "inline",
          links: [
            {
              id: "submit-for-approval",
              label: "Submit for Approval",
              type: "link",
              action: {
                id: "submit-approval-action",
                label: "Submit for Approval",
                icon: "Send",
                variant: "default",
                intent: "custom",
                actionProps: {
                  interaction: "modal",
                  confirmationRequired: true,
                  confirmationMessage: "Submit this bundle rate card version for approval?"
                }
              }
            },
            {
              id: "approve-rate-card",
              label: "Approve",
              type: "link",
              action: {
                id: "approve-action",
                label: "Approve",
                icon: "CheckCircle",
                variant: "default",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "approve-bundle-rate-card-form"
                }
              }
            },
            {
              id: "reject-rate-card",
              label: "Reject",
              type: "link",
              action: {
                id: "reject-action",
                label: "Reject",
                icon: "XCircle",
                variant: "destructive",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "reject-bundle-rate-card-form"
                }
              }
            },
            {
              id: "retire-version",
              label: "Retire Version",
              type: "link",
              action: {
                id: "retire-version-action",
                label: "Retire Version",
                icon: "Archive",
                variant: "outline",
                intent: "custom",
                actionProps: {
                  interaction: "modal",
                  formId: "retire-bundle-version-form"
                }
              }
            }
          ]
        }
      }
    }
  ]
};

// ============================================
// Premium Method 07 Tab Config
// ============================================

export const premiumMethod07TabConfig: TabContentConfig = {
  id: "premium-method-07",
  sections: [
    {
      id: "premium-method-07-table",
      order: 1,
      contentType: "table",
      title: "Premium Method 07 - Listing",
      headerActions: [
        {
          id: "add-premium",
          label: "Add Premium",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-premium-method-07-form"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/premium-method-07",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "planNumber",
              header: "Plan Number",
              accessorKey: "planNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "planDescription",
              header: "Plan Description",
              accessorKey: "planDescription",
              type: "text",
              sortable: true
            },
            {
              id: "productCode",
              header: "Product Code",
              accessorKey: "productCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "productDescription",
              header: "Product Description",
              accessorKey: "productDescription",
              type: "text",
              sortable: true
            },
            {
              id: "sumInsured",
              header: "Sum Insured",
              accessorKey: "sumInsured",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "gender",
              header: "Gender",
              accessorKey: "gender",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "fromAge",
              header: "From Age",
              accessorKey: "fromAge",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "toAge",
              header: "To Age",
              accessorKey: "toAge",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "premiumRate",
              header: "Premium Rate",
              accessorKey: "premiumRate",
              type: "text",
              sortable: true,
              width: "120px"
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-premium-method-07-form"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: false,
          searchable: false
        }
      }
    }
  ]
};

// ============================================
// Premium Method 08 Tab Config
// ============================================

export const premiumMethod08TabConfig: TabContentConfig = {
  id: "premium-method-08",
  sections: [
    {
      id: "premium-method-08-table",
      order: 1,
      contentType: "table",
      title: "Premium Method 08 - Listing",
      headerActions: [
        {
          id: "add-premium",
          label: "Add Premium",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-premium-method-08-form"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/premium-method-08",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "planNumber",
              header: "Plan Number",
              accessorKey: "planNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "planDescription",
              header: "Plan Description",
              accessorKey: "planDescription",
              type: "text",
              sortable: true
            },
            {
              id: "productCode",
              header: "Product Code",
              accessorKey: "productCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "productDescription",
              header: "Product Description",
              accessorKey: "productDescription",
              type: "text",
              sortable: true
            },
            {
              id: "sumInsured",
              header: "Sum Insured",
              accessorKey: "sumInsured",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "gender",
              header: "Gender",
              accessorKey: "gender",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "occupationalClass",
              header: "Occupational Class",
              accessorKey: "occupationalClass",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "age",
              header: "Age",
              accessorKey: "age",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "premiumRate",
              header: "Premium Rate",
              accessorKey: "premiumRate",
              type: "text",
              sortable: true,
              width: "120px"
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-premium-method-08-form"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: false,
          searchable: false
        }
      }
    }
  ]
};

// ============================================
// Plans Mock Data
// ============================================

const plansMockData: RowData[] = [
  {
    id: "1",
    planNumber: "P01",
    planDescription: "Senior Management - Level Term",
    startDate: "2025-12-01",
    endDate: "2026-11-30",
    planType: "level-term",
    sumAssuredBasis: "salary-multiple",
    enrollmentType: "auto",
    livesCovered: "member-spouse",
    memberCount: 45,
    totalSumInsured: "₹4.5 Cr",
    completenessScore: "100%",
    status: "active"
  },
  {
    id: "2",
    planNumber: "P02",
    planDescription: "Staff - Level Term",
    startDate: "2025-12-01",
    endDate: "2026-11-30",
    planType: "level-term",
    sumAssuredBasis: "grade-slab",
    enrollmentType: "auto",
    livesCovered: "member",
    memberCount: 850,
    totalSumInsured: "₹6.8 Cr",
    completenessScore: "100%",
    status: "active"
  },
  {
    id: "3",
    planNumber: "P03",
    planDescription: "Borrower Segment A - Reducing Term",
    startDate: "2025-12-01",
    endDate: "2026-11-30",
    planType: "reducing-term",
    sumAssuredBasis: "loan-outstanding",
    enrollmentType: "evidence-based",
    livesCovered: "member",
    memberCount: 280,
    totalSumInsured: "₹1.12 Cr",
    completenessScore: "75%",
    status: "active"
  },
  {
    id: "4",
    planNumber: "P04",
    planDescription: "Workmen - Decreasing Term",
    startDate: "2025-12-01",
    endDate: "",
    planType: "decreasing-term",
    sumAssuredBasis: "flat",
    enrollmentType: "opt-in",
    livesCovered: "member-family",
    memberCount: 75,
    totalSumInsured: "₹0.13 Cr",
    completenessScore: "50%",
    status: "inactive"
  }
];

// ============================================
// Plan Products Mock Data
// ============================================

const planProductsMockData: RowData[] = [
  {
    id: "1",
    productCode: "BAGT",
    productDescription: "Bharti Axa Group Term Insurance - Employer Employee",
    riskStartDate: "2025-12-01",
    riskEndDate: "2026-11-30",
    riderFlag: "base"
  },
  {
    id: "2",
    productCode: "BAAD",
    productDescription: "Bharti AXA Life Group Accidental Death Benefit Rider",
    riskStartDate: "2025-12-01",
    riskEndDate: "2026-11-30",
    riderFlag: "rider"
  },
  {
    id: "3",
    productCode: "BACI",
    productDescription: "Bharti AXA Life Group Critical Illness Rider",
    riskStartDate: "2025-12-01",
    riskEndDate: "2026-11-30",
    riderFlag: "rider"
  }
];

// ============================================
// Subsidiaries Mock Data
// ============================================

const subsidiariesMockData: RowData[] = [
  {
    id: "1",
    subsidiaryCode: "SUB001",
    subsidiaryName: "ABC Technologies Pvt Ltd",
    locationBranch: "Mumbai",
    billingSplitRule: "headcount",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "active"
  },
  {
    id: "2",
    subsidiaryCode: "SUB002",
    subsidiaryName: "XYZ Manufacturing Ltd",
    locationBranch: "Delhi",
    billingSplitRule: "si",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "active"
  },
  {
    id: "3",
    subsidiaryCode: "SUB003",
    subsidiaryName: "PQR Services India",
    locationBranch: "Bangalore",
    billingSplitRule: "premium",
    startDate: "2024-06-01",
    endDate: "2024-12-31",
    status: "terminated"
  }
];

// ============================================
// Headcount Mock Data
// ============================================

// Deterministic mock data for better testing and debugging
const headcountMockData: RowData[] = [
  {
    id: "1",
    headcountNumber: "HC001",
    planNumber: "P01",
    planDescription: "Base Death Benefit",
    productCode: "BAGC",
    productDescription: "Bharti Axa Life Group Credit Protection Pro",
    memberCount: 160,
    totalSumInsured: "₹8,00,00,000"
  },
  {
    id: "2",
    headcountNumber: "HC002",
    planNumber: "P02",
    planDescription: "Base Death Benefit with Critical Illness (10)",
    productCode: "BACI10",
    productDescription: "Bharti Axa Life Group Critical Illness with 10 illness",
    memberCount: 90,
    totalSumInsured: "₹13,50,00,000"
  },
  {
    id: "3",
    headcountNumber: "HC003",
    planNumber: "P03",
    planDescription: "Base Death Benefit with Critical Illness (25)",
    productCode: "BACI25",
    productDescription: "Bharti Axa Life Group Critical Illness with 25 illness",
    memberCount: 50,
    totalSumInsured: "₹12,50,00,000"
  }
];

// ============================================
// Plan/Product Benefits Mock Data
// ============================================

const planProductBenefitsMockData: RowData[] = [
  {
    id: "1",
    benefitCode: "DTH02",
    benefitDescription: "Death Benefit",
    startDate: "2025-12-01",
    endDate: ""
  },
  {
    id: "2",
    benefitCode: "CI001",
    benefitDescription: "Cancer of Specified Severity",
    startDate: "2025-12-01",
    endDate: ""
  },
  {
    id: "3",
    benefitCode: "CI002",
    benefitDescription: "Myocardial Infarction (Heart Attack)",
    startDate: "2025-12-01",
    endDate: ""
  },
  {
    id: "4",
    benefitCode: "CI003",
    benefitDescription: "Stroke Resulting in Permanent Symptoms",
    startDate: "2025-12-01",
    endDate: ""
  },
  {
    id: "5",
    benefitCode: "CI004",
    benefitDescription: "Kidney Failure Requiring Dialysis",
    startDate: "2025-12-01",
    endDate: ""
  },
  {
    id: "6",
    benefitCode: "CI005",
    benefitDescription: "Major Organ / Bone Marrow Transplant",
    startDate: "2025-12-01",
    endDate: ""
  }
];

// ============================================
// Territorial Scope Mock Data
// ============================================

const territorialScopeMockData: RowData[] = [
  {
    id: "1",
    seqno: "0001",
    inclusionExclusion: "inclusion",
    regionCode: "",
    countryCode: "India",
    zone: "",
    continent: ""
  },
  {
    id: "2",
    seqno: "0002",
    inclusionExclusion: "exclusion",
    regionCode: "",
    countryCode: "",
    zone: "",
    continent: "North America"
  },
  {
    id: "3",
    seqno: "0003",
    inclusionExclusion: "inclusion",
    regionCode: "ASEAN",
    countryCode: "",
    zone: "",
    continent: ""
  }
];

// ============================================
// Plan/Product Exclusions Listing Mock Data
// ============================================

const exclusionListingMockData: RowData[] = [
  {
    id: "1",
    seqno: "0001",
    inclusionExclusion: "exclusion",
    diagnosisClass: "Congenital Disorders",
    procedureClass: "",
    drugClass: ""
  },
  {
    id: "2",
    seqno: "0002",
    inclusionExclusion: "exclusion",
    diagnosisClass: "",
    procedureClass: "Cosmetic Surgery",
    drugClass: ""
  },
  {
    id: "3",
    seqno: "0003",
    inclusionExclusion: "exclusion",
    diagnosisClass: "",
    procedureClass: "",
    drugClass: "Experimental Medications"
  }
];

// ============================================
// Benefit Limits Mock Data
// ============================================

const benefitLimitsMockData: RowData[] = [
  {
    id: "1",
    benefitCode: "DTH02",
    benefitDescription: "Death Benefit",
    limitType: "Annual",
    limitAmount: "₹10,00,000",
    frequency: "Per Year"
  },
  {
    id: "2",
    benefitCode: "CI001",
    benefitDescription: "Cancer of Specified Severity",
    limitType: "Lifetime",
    limitAmount: "₹5,00,000",
    frequency: "Once"
  },
  {
    id: "3",
    benefitCode: "CI002",
    benefitDescription: "Myocardial Infarction",
    limitType: "Per Claim",
    limitAmount: "₹3,00,000",
    frequency: "Per Event"
  }
];

// ============================================
// Member Liabilities Mock Data
// ============================================

const memberLiabilitiesMockData: RowData[] = [
  {
    id: "1",
    memberNumber: "M001",
    memberName: "John Smith",
    liabilityType: "Premium Outstanding",
    liabilityAmount: "₹15,000",
    effectiveDate: "2025-12-01",
    status: "active"
  },
  {
    id: "2",
    memberNumber: "M002",
    memberName: "Sarah Johnson",
    liabilityType: "Policy Loan",
    liabilityAmount: "₹50,000",
    effectiveDate: "2025-11-15",
    status: "active"
  },
  {
    id: "3",
    memberNumber: "M003",
    memberName: "Michael Brown",
    liabilityType: "Administrative Fee",
    liabilityAmount: "₹5,000",
    effectiveDate: "2025-10-20",
    status: "pending"
  }
];

// ============================================
// Headcount Tab Config
// ============================================

export const headcountTabConfig: TabContentConfig = {
  id: "headcount",
  sections: [
    {
      id: "headcount-table",
      order: 1,
      contentType: "table",
      title: "Headcount - Listing",
      headerActions: [
        {
          id: "add-headcount",
          label: "Add Headcount",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-headcount-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/headcount",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "headcountNumber",
              header: "Headcount Number",
              accessorKey: "headcountNumber",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "planNumber",
              header: "Plan Number",
              accessorKey: "planNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "planDescription",
              header: "Plan Description",
              accessorKey: "planDescription",
              type: "text",
              sortable: true,
              width: "200px"
            },
            {
              id: "productCode",
              header: "Product Code",
              accessorKey: "productCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "productDescription",
              header: "Product Description",
              accessorKey: "productDescription",
              type: "text",
              sortable: true,
              width: "250px"
            },
            {
              id: "memberCount",
              header: "Member Count",
              accessorKey: "memberCount",
              type: "number",
              sortable: true,
              width: "130px",
              align: "right"
            },
            {
              id: "totalSumInsured",
              header: "Total Sum Insured",
              accessorKey: "totalSumInsured",
              type: "currency",
              sortable: true,
              width: "160px",
              align: "right"
            }
          ],
          rowActions: [
            {
              id: "terminate",
              label: "Terminate",
              icon: "UserX",
              intent: "custom",
              variant: "outline"
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "AlertCircle",
              intent: "custom",
              variant: "outline"
            }
          ],
          bulkActions: [
            {
              id: "terminate",
              label: "Terminate",
              icon: "UserX",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate the selected headcount entries?"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "AlertCircle",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected headcount entries?"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: false
        }
      }
    },
    {
      id: "derived-diagnostics",
      order: 2,
      contentType: "form",
      title: "Derived Diagnostics",
      content: {
        formId: "headcount-diagnostics-form"
      }
    },
    {
      id: "headcount-controls",
      order: 3,
      contentType: "actions",
      title: "Headcount Controls",
      content: {
        widget: {
          widgetType: "quick-links",
          id: "headcount-control-actions",
          layout: "grid",
          links: [
            {
              id: "freeze-snapshot",
              label: "Freeze Headcount Snapshot",
              type: "link",
              icon: "Lock",
              description: "Freeze headcount for pricing version",
              action: {
                id: "freeze-headcount",
                label: "Freeze Snapshot",
                intent: "custom",
                actionProps: {
                  confirmationRequired: true,
                  confirmationMessage: "Are you sure you want to freeze the current headcount snapshot? This will lock the data for pricing calculations."
                }
              }
            },
            {
              id: "recompute-headcount",
              label: "Recompute Headcount",
              type: "link",
              icon: "RefreshCw",
              description: "Recalculate after member upload changes",
              action: {
                id: "recompute",
                label: "Recompute",
                intent: "custom",
                actionProps: {
                  confirmationRequired: true,
                  confirmationMessage: "This will recalculate all headcount data based on the latest member uploads. Continue?"
                }
              }
            }
          ]
        }
      }
    }
  ]
};

// ============================================
// Plan/Product Health Tab Config
// ============================================

export const planProductHealthTabConfig: TabContentConfig = {
  id: "plan-product-health",
  tabs: [
    { id: "plan-product-health-additional-data", label: "Additional Data" },
    { id: "territorial-scope", label: "Territorial Scope" },
    { id: "exclusion-listing", label: "Exclusions" }
  ],
  sections: []
};

// ============================================
// Plan/Product Health Additional Data Sub-Tab Config
// ============================================

export const planProductHealthAdditionalDataTabConfig: TabContentConfig = {
  id: "plan-product-health-additional-data",
  sections: [
    {
      id: "plan-product-health-form",
      order: 1,
      contentType: "form",
      title: "Plan / Product - Additional Data for Health",
      content: {
        formId: "plan-product-health-form"
      }
    }
  ]
};

// ============================================
// Plan/Product Term Life Tab Config
// ============================================

export const planProductTermLifeTabConfig: TabContentConfig = {
  id: "plan-product-term-life",
  sections: [
    {
      id: "plan-product-term-life-form",
      order: 1,
      contentType: "form",
      title: "Plan / Product - Additional Data for Term Life",
      content: {
        formId: "plan-product-term-life-form"
      }
    }
  ]
};

// ============================================
// Plan/Product Credit Life Tab Config
// ============================================

export const planProductCreditLifeTabConfig: TabContentConfig = {
  id: "plan-product-credit-life",
  sections: [
    {
      id: "plan-product-credit-life-form",
      order: 1,
      contentType: "form",
      title: "Plan / Product - Additional Data-1 for Credit Life",
      content: {
        formId: "plan-product-credit-life-form"
      }
    }
  ]
};

// ============================================
// Plan/Product Investment Tab Config
// ============================================

export const planProductInvestmentTabConfig: TabContentConfig = {
  id: "plan-product-investment",
  sections: [
    {
      id: "plan-product-investment-form",
      order: 1,
      contentType: "form",
      title: "Plan / Product - Additional Data for Investment Products",
      content: {
        formId: "plan-product-investment-form"
      }
    }
  ]
};

// ============================================
// Benefit Investment Tab Config
// ============================================

export const benefitInvestmentTabConfig: TabContentConfig = {
  id: "benefit-investment",
  sections: [
    {
      id: "benefit-investment-form",
      order: 1,
      contentType: "form",
      title: "Plan / Product / Benefit Maintenance (Investment Products)",
      content: {
        formId: "benefit-investment-form"
      }
    }
  ]
};

// ============================================
// Territorial Scope Tab Config
// ============================================

export const territorialScopeTabConfig: TabContentConfig = {
  id: "territorial-scope",
  sections: [
    {
      id: "territorial-scope-table",
      order: 1,
      contentType: "table",
      title: "Territorial Scope Listing",
      headerActions: [
        {
          id: "add-territory",
          label: "Add Territory",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-territory-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/territorial-scope",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "seqno",
              header: "Seqno",
              accessorKey: "seqno",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "inclusionExclusion",
              header: "Inclusion / Exclusion",
              accessorKey: "inclusionExclusion",
              type: "badge",
              sortable: true,
              width: "150px",
              valueMapping: [
                { value: "inclusion", label: "Inclusion", color: "success" },
                { value: "exclusion", label: "Exclusion", color: "error" }
              ]
            },
            {
              id: "regionCode",
              header: "Region Code",
              accessorKey: "regionCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "countryCode",
              header: "Country Code",
              accessorKey: "countryCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "zone",
              header: "Zone",
              accessorKey: "zone",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "continent",
              header: "Continent",
              accessorKey: "continent",
              type: "text",
              sortable: true,
              width: "150px"
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-territory-form",
                interaction: "sheet"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search territories..."
        }
      }
    }
  ]
};

// ============================================
// Plan/Product Exclusions Listing Sub-Tab Config
// ============================================

export const exclusionListingTabConfig: TabContentConfig = {
  id: "exclusion-listing",
  sections: [
    {
      id: "exclusions-listing-table",
      order: 1,
      contentType: "table",
      title: "Plan/Product Exclusions Listing",
      headerActions: [
        {
          id: "add-exclusion",
          label: "Add Exclusion",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-plan-product-exclusion-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/plan-product-exclusions",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "seqno",
              header: "Seqno",
              accessorKey: "seqno",
              type: "text",
              sortable: true,
              width: "80px"
            },
            {
              id: "inclusionExclusion",
              header: "Inclusion / Exclusion",
              accessorKey: "inclusionExclusion",
              type: "badge",
              sortable: true,
              width: "150px",
              valueMapping: [
                { value: "inclusion", label: "Inclusion", color: "success" },
                { value: "exclusion", label: "Exclusion", color: "error" }
              ]
            },
            {
              id: "diagnosisClass",
              header: "Diagnosis Class",
              accessorKey: "diagnosisClass",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "procedureClass",
              header: "Procedure Class",
              accessorKey: "procedureClass",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "drugClass",
              header: "Drug Class",
              accessorKey: "drugClass",
              type: "text",
              sortable: true,
              width: "150px"
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-plan-product-exclusion-form",
                interaction: "sheet"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search exclusions..."
        }
      }
    }
  ]
};

// ============================================
// Benefit Limits Sub-Tab Config
// ============================================

export const benefitLimitsTabConfig: TabContentConfig = {
  id: "benefit-limits",
  sections: [
    {
      id: "benefit-limits-table",
      order: 1,
      contentType: "table",
      title: "Benefit Limits Listing",
      headerActions: [
        {
          id: "add-benefit-limit",
          label: "Add Benefit Limit",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-benefit-limit-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/benefit-limits",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "benefitCode",
              header: "Benefit Code",
              accessorKey: "benefitCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "benefitDescription",
              header: "Benefit Description",
              accessorKey: "benefitDescription",
              type: "text",
              sortable: true,
              width: "200px"
            },
            {
              id: "limitType",
              header: "Limit Type",
              accessorKey: "limitType",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "limitAmount",
              header: "Limit Amount",
              accessorKey: "limitAmount",
              type: "currency",
              sortable: true,
              width: "120px",
              align: "right"
            },
            {
              id: "frequency",
              header: "Frequency",
              accessorKey: "frequency",
              type: "text",
              sortable: true,
              width: "100px"
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-benefit-limit-form",
                interaction: "sheet"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search benefit limits..."
        }
      }
    }
  ]
};

// ============================================
// Member Liabilities Sub-Tab Config
// ============================================

export const memberLiabilitiesTabConfig: TabContentConfig = {
  id: "member-liabilities",
  sections: [
    {
      id: "member-liabilities-table",
      order: 1,
      contentType: "table",
      title: "Member Liabilities Listing",
      headerActions: [
        {
          id: "add-member-liability",
          label: "Add Member Liability",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-member-liability-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/member-liabilities",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "memberNumber",
              header: "Member Number",
              accessorKey: "memberNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "memberName",
              header: "Member Name",
              accessorKey: "memberName",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "liabilityType",
              header: "Liability Type",
              accessorKey: "liabilityType",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "liabilityAmount",
              header: "Liability Amount",
              accessorKey: "liabilityAmount",
              type: "currency",
              sortable: true,
              width: "130px",
              align: "right"
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
              id: "status",
              header: "Status",
              accessorKey: "status",
              type: "badge",
              sortable: true,
              width: "100px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "inactive", label: "Inactive", color: "error" },
                { value: "pending", label: "Pending", color: "warning" }
              ]
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-member-liability-form",
                interaction: "sheet"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search member liabilities..."
        }
      }
    }
  ]
};

// ============================================
// Plan/Product Benefits Tab Config
// ============================================

export const planProductBenefitsTabConfig: TabContentConfig = {
  id: "plan-product-benefits",
  sections: [
    {
      id: "plan-product-benefits-table",
      order: 1,
      contentType: "table",
      title: "Plan / Product / Benefit Listing",
      headerActions: [
        {
          id: "add-benefit",
          label: "Add Benefit",
          icon: "Plus",
          variant: "default",
          intent: "create",
          actionProps: {
            formId: "add-benefit-form",
            interaction: "sheet"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/plan-product-benefits",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "benefitCode",
              header: "Benefit Code",
              accessorKey: "benefitCode",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "benefitDescription",
              header: "Benefit Description",
              accessorKey: "benefitDescription",
              type: "text",
              sortable: true,
              width: "300px"
            },
            {
              id: "scope",
              header: "Scope",
              accessorKey: "scope",
              type: "badge",
              sortable: true,
              width: "100px",
              valueMapping: [
                { value: "base", label: "Base", color: "default" },
                { value: "rider", label: "Rider", color: "info" }
              ]
            },
            {
              id: "startDate",
              header: "Start Date",
              accessorKey: "startDate",
              type: "date",
              sortable: true,
              width: "120px"
            },
            {
              id: "endDate",
              header: "End Date",
              accessorKey: "endDate",
              type: "date",
              sortable: true,
              width: "120px"
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              type: "badge",
              sortable: true,
              width: "120px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "terminated", label: "Terminated", color: "error" },
                { value: "lapsed", label: "Lapsed", color: "warning" }
              ]
            }
          ],
          rowActions: [
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-benefit-form",
                interaction: "sheet"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "Clock",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse this benefit?"
              }
            },
            {
              id: "terminate",
              label: "Terminate",
              icon: "XCircle",
              intent: "custom",
              variant: "destructive",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate this benefit?"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive"
            }
          ],
          bulkActions: [
            {
              id: "terminate",
              label: "Terminate",
              icon: "XCircle",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate the selected benefits?"
              }
            },
            {
              id: "lapse",
              label: "Lapse",
              icon: "Clock",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected benefits?"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50]
          },
          selectable: true,
          searchable: true,
          searchPlaceholder: "Search benefits by code or description..."
        }
      }
    },
    {
      id: "benefit-intelligence",
      order: 2,
      contentType: "actions",
      title: "Benefit Intelligence",
      content: {
        widget: {
          id: "benefit-intelligence-widget",
          widgetType: "quick-links",
          title: "Benefit Validation & Compliance",
          layout: "grid",
          links: [
            {
              id: "conflict-detection",
              label: "Conflict Detection",
              type: "card",
              icon: "TriangleAlert",
              description: "No duplicate or contradictory rider definitions detected",
              action: {
                id: "view-conflicts",
                label: "View Conflicts",
                intent: "custom"
              }
            },
            {
              id: "mandatory-benefits-checklist",
              label: "Mandatory Benefits Checklist",
              type: "card",
              icon: "CheckSquare",
              description: "All required base benefits are configured for GTL scheme",
              action: {
                id: "view-checklist",
                label: "View Checklist",
                intent: "custom"
              }
            },
            {
              id: "rider-applicability",
              label: "Rider Applicability by Category",
              type: "card",
              icon: "Users",
              description: "Review rider sets by member category",
              action: {
                id: "view-rider-applicability",
                label: "View Details",
                intent: "custom"
              }
            },
            {
              id: "constraint-validation",
              label: "Constraint Validation",
              type: "card",
              icon: "ShieldCheck",
              description: "All benefit constraints are properly linked and validated",
              action: {
                id: "view-constraints",
                label: "View Constraints",
                intent: "custom"
              }
            }
          ]
        }
      }
    }
  ]
};

// ============================================
// Plan/Product Benefits Health Tab Config
// ============================================

export const planProductBenefitsHealthTabConfig: TabContentConfig = {
  id: "plan-product-benefits-health",
  tabs: [
    { id: "benefit-limits", label: "Benefit Limits" },
    { id: "member-liabilities", label: "Member Liabilities" }
  ],
  sections: []
};

// ============================================
// Members Mock Data
// ============================================

const membersMockData: RowData[] = [
  {
    id: "1",
    effectiveDate: "2025-01-15",
    memberNumber: "MEM-2025-001",
    employeeNumber: "EMP-10045",
    borrowerNumber: "BRW-2025-001",
    loanNumber: "LN-2025-78901",
    memberName: "Rajesh Kumar Sharma",
    planNumber: "P01",
    subsidiaryCode: "SUB-MUM-001",
    startDate: "2025-01-15",
    endDate: "2026-01-14",
    currentCoverageSI: 5000000,
    fclStatus: "within",
    excessSI: 0,
    uwRequired: "not-required",
    uwReasonCode: "",
    evidencePendingCount: 0,
    pricingStatus: "rated",
    matchedRateRowId: "RATE-05-001",
    lastActivity: "2025-01-15",
    slaAge: 0,
    status: "active"
  },
  {
    id: "2",
    effectiveDate: "2025-01-10",
    memberNumber: "MEM-2025-002",
    employeeNumber: "EMP-10046",
    borrowerNumber: "BRW-2025-002",
    loanNumber: "LN-2025-78902",
    memberName: "Priya Venkatesh",
    planNumber: "P02",
    subsidiaryCode: "SUB-BLR-001",
    startDate: "2025-01-10",
    endDate: "2026-01-09",
    currentCoverageSI: 7500000,
    fclStatus: "above",
    excessSI: 2500000,
    uwRequired: "required",
    uwReasonCode: "FCL-EXCEEDED",
    evidencePendingCount: 2,
    pricingStatus: "unrated",
    matchedRateRowId: "",
    lastActivity: "2025-01-12",
    slaAge: 3,
    status: "pending"
  },
  {
    id: "3",
    effectiveDate: "2024-12-01",
    memberNumber: "MEM-2024-089",
    employeeNumber: "EMP-10012",
    borrowerNumber: "",
    loanNumber: "",
    memberName: "Amit Patel",
    planNumber: "P01",
    subsidiaryCode: "SUB-DEL-001",
    startDate: "2024-12-01",
    endDate: "2025-11-30",
    currentCoverageSI: 3000000,
    fclStatus: "within",
    excessSI: 0,
    uwRequired: "cleared",
    uwReasonCode: "AGE-ABOVE-45",
    evidencePendingCount: 0,
    pricingStatus: "rated",
    matchedRateRowId: "RATE-05-015",
    lastActivity: "2025-01-08",
    slaAge: 7,
    status: "active"
  },
  {
    id: "4",
    effectiveDate: "2024-11-15",
    memberNumber: "MEM-2024-075",
    employeeNumber: "EMP-10089",
    borrowerNumber: "BRW-2024-045",
    loanNumber: "LN-2024-56789",
    memberName: "Sunita Reddy",
    planNumber: "P03",
    subsidiaryCode: "SUB-HYD-001",
    startDate: "2024-11-15",
    endDate: "2025-11-14",
    currentCoverageSI: 10000000,
    fclStatus: "above",
    excessSI: 5000000,
    uwRequired: "in-progress",
    uwReasonCode: "HIGH-SI-MEDICAL",
    evidencePendingCount: 3,
    pricingStatus: "override-pending",
    matchedRateRowId: "RATE-05-022",
    lastActivity: "2025-01-14",
    slaAge: 1,
    status: "active"
  },
  {
    id: "5",
    effectiveDate: "2024-06-01",
    memberNumber: "MEM-2024-034",
    employeeNumber: "EMP-10023",
    borrowerNumber: "",
    loanNumber: "",
    memberName: "Mohammed Farooq",
    planNumber: "P01",
    subsidiaryCode: "SUB-CHN-001",
    startDate: "2024-06-01",
    endDate: "2024-12-31",
    currentCoverageSI: 2500000,
    fclStatus: "not-computed",
    excessSI: 0,
    uwRequired: "not-required",
    uwReasonCode: "",
    evidencePendingCount: 0,
    pricingStatus: "rated",
    matchedRateRowId: "RATE-05-008",
    lastActivity: "2024-12-20",
    slaAge: 26,
    status: "terminated"
  },
  {
    id: "6",
    effectiveDate: "2025-01-01",
    memberNumber: "MEM-2025-003",
    employeeNumber: "EMP-10102",
    borrowerNumber: "BRW-2025-003",
    loanNumber: "LN-2025-90123",
    memberName: "Kavitha Nair",
    planNumber: "P02",
    subsidiaryCode: "SUB-MUM-002",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    currentCoverageSI: 4500000,
    fclStatus: "within",
    excessSI: 0,
    uwRequired: "required",
    uwReasonCode: "OCCUPATION-HAZARD",
    evidencePendingCount: 1,
    pricingStatus: "unrated",
    matchedRateRowId: "",
    lastActivity: "2025-01-10",
    slaAge: 5,
    status: "pending"
  }
];

// ============================================
// Members Tab Config
// ============================================

export const membersTabConfig: TabContentConfig = {
  id: "members",
  sections: [
    {
      id: "member-search-form",
      order: 1,
      contentType: "form",
      title: "Search Members",
      content: {
        formId: "member-search-form"
      }
    },
    {
      id: "member-actions",
      order: 2,
      contentType: "actions",
      title: "Single Member Operations",
      content: {
        widget: {
          id: "member-quick-actions",
          widgetType: "quick-links",
          layout: "inline",
          links: [
            {
              id: "cancel-from-inception",
              label: "Cancel from Inception",
              type: "link",
              icon: "XCircle",
              action: {
                id: "cancel-from-inception-action",
                label: "Cancel from Inception",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "cancel-member-form"
                }
              }
            },
            {
              id: "surrender",
              label: "Surrender",
              type: "link",
              icon: "HandCoins",
              action: {
                id: "surrender-action",
                label: "Surrender",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "surrender-member-form"
                }
              }
            },
            {
              id: "pre-existing",
              label: "Pre-existing Conditions",
              type: "link",
              icon: "HeartPulse",
              action: {
                id: "pre-existing-action",
                label: "Pre-existing Conditions",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "pre-existing-conditions-form"
                }
              }
            },
            {
              id: "exclusions",
              label: "Member Exclusions",
              type: "link",
              icon: "ShieldOff",
              action: {
                id: "exclusions-action",
                label: "Member Exclusions",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "member-exclusions-form"
                }
              }
            },
            {
              id: "add-dependent",
              label: "Add Dependent",
              type: "link",
              icon: "UserPlus",
              action: {
                id: "add-dependent-action",
                label: "Add Dependent",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "add-dependent-form"
                }
              }
            },
            {
              id: "investment-strategy",
              label: "Investment Strategy",
              type: "link",
              icon: "TrendingUp",
              action: {
                id: "investment-strategy-action",
                label: "Investment Strategy",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "investment-strategy-form"
                }
              }
            },
            {
              id: "beneficiaries-nominees",
              label: "Beneficiaries / Nominees",
              type: "link",
              icon: "Users",
              action: {
                id: "beneficiaries-nominees-action",
                label: "Beneficiaries / Nominees",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "beneficiaries-nominees-form"
                }
              }
            },
            {
              id: "uw-follow-up",
              label: "UW Follow-up",
              type: "link",
              icon: "MessageSquare",
              action: {
                id: "uw-follow-up-action",
                label: "UW Follow-up",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "uw-follow-up-form"
                }
              }
            },
            {
              id: "uw-questionnaire",
              label: "UW Questionnaire",
              type: "link",
              icon: "ClipboardList",
              action: {
                id: "uw-questionnaire-action",
                label: "UW Questionnaire",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "uw-questionnaire-form"
                }
              }
            },
            {
              id: "medical-tests-results",
              label: "Medical Tests Results",
              type: "link",
              icon: "Stethoscope",
              action: {
                id: "medical-tests-results-action",
                label: "Medical Tests Results",
                intent: "custom",
                actionProps: {
                  interaction: "sheet",
                  formId: "medical-tests-form"
                }
              }
            }
          ]
        }
      }
    },
    {
      id: "members-table",
      order: 3,
      contentType: "table",
      title: "Member Listing",
      headerActions: [
        {
          id: "upload-members",
          label: "Member Upload",
          icon: "Upload",
          variant: "default",
          intent: "custom",
          actionProps: {
            interaction: "sheet",
            formId: "upload-members-form"
          }
        },
        {
          id: "append-batch",
          label: "Append Batch",
          icon: "FilePlus",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "sheet",
            formId: "append-members-batch-form"
          }
        },
        {
          id: "export-roster",
          label: "Export Roster",
          icon: "Download",
          variant: "outline",
          intent: "custom",
          actionProps: {
            interaction: "api-call",
            api: {
              endpoint: "/api/policy/members/export",
              method: "POST"
            },
            responseType: "blob",
            successMessage: "Roster exported successfully!"
          }
        }
      ],
      content: {
        api: {
          endpoint: "/api/policy/members",
          method: "GET"
        },
        config: {
          columns: [
            {
              id: "effectiveDate",
              header: "Effective Date",
              accessorKey: "effectiveDate",
              type: "date",
              sortable: true,
              width: "120px"
            },
            {
              id: "memberNumber",
              header: "Member Number",
              accessorKey: "memberNumber",
              type: "text",
              sortable: true,
              width: "130px"
            },
            {
              id: "employeeNumber",
              header: "Employee No.",
              accessorKey: "employeeNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "borrowerNumber",
              header: "Borrower No.",
              accessorKey: "borrowerNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "loanNumber",
              header: "Loan No.",
              accessorKey: "loanNumber",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "memberName",
              header: "Member Name",
              accessorKey: "memberName",
              type: "text",
              sortable: true,
              width: "150px"
            },
            {
              id: "planNumber",
              header: "Plan No.",
              accessorKey: "planNumber",
              type: "text",
              sortable: true,
              width: "100px"
            },
            {
              id: "subsidiaryCode",
              header: "Subsidiary",
              accessorKey: "subsidiaryCode",
              type: "text",
              sortable: true,
              width: "110px"
            },
            {
              id: "startDate",
              header: "Start Date",
              accessorKey: "startDate",
              type: "date",
              sortable: true,
              width: "110px"
            },
            {
              id: "endDate",
              header: "End Date",
              accessorKey: "endDate",
              type: "date",
              sortable: true,
              width: "110px"
            },
            {
              id: "currentCoverageSI",
              header: "Coverage SI",
              accessorKey: "currentCoverageSI",
              type: "currency",
              sortable: true,
              width: "130px",
              align: "right"
            },
            {
              id: "fclStatus",
              header: "FCL Status",
              accessorKey: "fclStatus",
              type: "badge",
              sortable: true,
              width: "110px",
              valueMapping: [
                { value: "within", label: "Within", color: "success" },
                { value: "above", label: "Above", color: "error" },
                { value: "not-computed", label: "N/A", color: "default" }
              ]
            },
            {
              id: "excessSI",
              header: "Excess SI",
              accessorKey: "excessSI",
              type: "currency",
              sortable: true,
              width: "120px",
              align: "right"
            },
            {
              id: "uwRequired",
              header: "UW Required",
              accessorKey: "uwRequired",
              type: "badge",
              sortable: true,
              width: "120px",
              valueMapping: [
                { value: "not-required", label: "Not Required", color: "default" },
                { value: "required", label: "Required", color: "warning" },
                { value: "in-progress", label: "In Progress", color: "info" },
                { value: "cleared", label: "Cleared", color: "success" }
              ]
            },
            {
              id: "uwReasonCode",
              header: "UW Reason",
              accessorKey: "uwReasonCode",
              type: "text",
              sortable: true,
              width: "120px"
            },
            {
              id: "evidencePendingCount",
              header: "Evidence Pending",
              accessorKey: "evidencePendingCount",
              type: "number",
              sortable: true,
              width: "130px",
              align: "center"
            },
            {
              id: "pricingStatus",
              header: "Pricing Status",
              accessorKey: "pricingStatus",
              type: "badge",
              sortable: true,
              width: "130px",
              valueMapping: [
                { value: "rated", label: "Rated", color: "success" },
                { value: "unrated", label: "Unrated", color: "error" },
                { value: "override-pending", label: "Override Pending", color: "warning" }
              ]
            },
            {
              id: "matchedRateRowId",
              header: "Rate Row",
              accessorKey: "matchedRateRowId",
              type: "link",
              sortable: true,
              width: "100px"
            },
            {
              id: "lastActivity",
              header: "Last Activity",
              accessorKey: "lastActivity",
              type: "date",
              sortable: true,
              width: "120px"
            },
            {
              id: "slaAge",
              header: "SLA Age (Days)",
              accessorKey: "slaAge",
              type: "number",
              sortable: true,
              width: "120px",
              align: "center"
            },
            {
              id: "status",
              header: "Status",
              accessorKey: "status",
              type: "status",
              sortable: true,
              width: "110px",
              valueMapping: [
                { value: "active", label: "Active", color: "success" },
                { value: "terminated", label: "Terminated", color: "error" },
                { value: "lapsed", label: "Lapsed", color: "warning" },
                { value: "pending", label: "Pending", color: "info" }
              ]
            }
          ],
          rowActions: [
            {
              id: "open-member",
              label: "Open Member Master",
              icon: "User",
              intent: "view",
              actionProps: {
                route: "/members/{id}/master"
              }
            },
            {
              id: "view-coverages",
              label: "View Coverages",
              icon: "Shield",
              intent: "view",
              actionProps: {
                route: "/members/{id}/coverages"
              }
            },
            {
              id: "view-decision",
              label: "View Decision",
              icon: "Scale",
              intent: "view",
              actionProps: {
                route: "/members/{id}/decision"
              }
            },
            {
              id: "view-uw",
              label: "View UW",
              icon: "ClipboardCheck",
              intent: "view",
              actionProps: {
                route: "/members/{id}/underwriting"
              }
            },
            {
              id: "view-docs",
              label: "View Documents",
              icon: "FileText",
              intent: "view",
              actionProps: {
                route: "/members/{id}/documents"
              }
            },
            {
              id: "edit",
              label: "Edit",
              icon: "Pencil",
              intent: "edit",
              actionProps: {
                formId: "edit-member-form",
                interaction: "sheet"
              }
            },
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              intent: "delete",
              variant: "destructive",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to delete this member? This action cannot be undone."
              }
            }
          ],
          bulkActions: [
            {
              id: "bulk-terminate",
              label: "Terminate",
              icon: "UserX",
              variant: "destructive",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to terminate the selected members?"
              }
            },
            {
              id: "bulk-lapse",
              label: "Lapse",
              icon: "Clock",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to lapse the selected members?"
              }
            },
            {
              id: "bulk-reinstate",
              label: "Reinstate",
              icon: "UserCheck",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "modal",
                confirmationRequired: true,
                confirmationMessage: "Are you sure you want to reinstate the selected members?"
              }
            },
            {
              id: "bulk-stop-billing",
              label: "Stop Billing",
              icon: "CircleSlash",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "api-call",
                api: {
                  endpoint: "/api/policy/members/bulk/stop-billing",
                  method: "POST"
                },
                successMessage: "Billing stopped for selected members"
              }
            },
            {
              id: "bulk-resume-billing",
              label: "Resume Billing",
              icon: "PlayCircle",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "api-call",
                api: {
                  endpoint: "/api/policy/members/bulk/resume-billing",
                  method: "POST"
                },
                successMessage: "Billing resumed for selected members"
              }
            },
            {
              id: "bulk-transfer-subsidiary",
              label: "Transfer Subsidiary",
              icon: "ArrowRightLeft",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "sheet",
                formId: "transfer-subsidiary-form"
              }
            },
            {
              id: "bulk-assign-plan",
              label: "Assign/Change Plan",
              icon: "GitBranch",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "sheet",
                formId: "assign-plan-form"
              }
            },
            {
              id: "bulk-trigger-rerate",
              label: "Trigger Rerate",
              icon: "RefreshCw",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "api-call",
                api: {
                  endpoint: "/api/policy/members/bulk/rerate",
                  method: "POST"
                },
                successMessage: "Rerate triggered for selected members"
              }
            },
            {
              id: "bulk-trigger-uw",
              label: "Trigger UW Tasks",
              icon: "ClipboardList",
              variant: "outline",
              intent: "custom",
              actionProps: {
                interaction: "sheet",
                formId: "trigger-uw-tasks-form"
              }
            }
          ],
          pagination: {
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50, 100]
          },
          selectable: true,
          searchable: false
        }
      }
    }
  ]
};

// ============================================
// Tab Config Registry
// ============================================

const tabConfigRegistry: Record<string, TabContentConfig> = {
  "common-header": commonHeaderTabConfig,
  "key-data": keyDataTabConfig,
  "policy-configuration": policyConfigurationTabConfig,
  "policy-details": policyDetailsTabConfig,
  "policy-flags-governance": policyFlagsGovernanceTabConfig,
  documents: documentsTabConfig,
  "policy-profile": policyProfileTabConfig,
  "policy-exclusion": policyExclusionTabConfig,
  plans: plansTabConfig,
  subsidiaries: subsidiariesTabConfig,
  "plan-products": planProductsTabConfig,
  "plan-products-listing": planProductsListingTabConfig,
  "component-rules": componentRulesTabConfig,
  "component-templates": componentTemplatesTabConfig,
  "premium-method-05": premiumMethod05TabConfig,
  "premium-method-06": premiumMethod06TabConfig,
  "premium-method-07": premiumMethod07TabConfig,
  "premium-method-08": premiumMethod08TabConfig,
  "plan-product-health": planProductHealthTabConfig,
  "plan-product-health-additional-data": planProductHealthAdditionalDataTabConfig,
  "territorial-scope": territorialScopeTabConfig,
  "exclusion-listing": exclusionListingTabConfig,
  "benefit-limits": benefitLimitsTabConfig,
  "member-liabilities": memberLiabilitiesTabConfig,
  "plan-product-term-life": planProductTermLifeTabConfig,
  "plan-product-credit-life": planProductCreditLifeTabConfig,
  "plan-product-investment": planProductInvestmentTabConfig,
  "plan-product-benefits": planProductBenefitsTabConfig,
  "plan-product-benefits-health": planProductBenefitsHealthTabConfig,
  "benefit-investment": benefitInvestmentTabConfig,
  headcount: headcountTabConfig,
  members: membersTabConfig
};

const tabDataRegistry: Record<string, RowData[]> = {
  documents: documentsMockData,
  "documents-audit-trail": documentsAuditTrailMockData,
  "policy-profile": policyProfileMockData,
  "policy-exclusion": policyExclusionMockData,
  "exclusion-version-history": exclusionVersionHistoryMockData,
  plans: plansMockData,
  "plan-products-listing": planProductsMockData,
  subsidiaries: subsidiariesMockData,
  "premium-method-05": premiumMethod05MockData,
  "premium-method-06": premiumMethod06MockData,
  headcount: headcountMockData,
  "plan-product-benefits": planProductBenefitsMockData,
  "territorial-scope": territorialScopeMockData,
  "exclusion-listing": exclusionListingMockData,
  "benefit-limits": benefitLimitsMockData,
  "member-liabilities": memberLiabilitiesMockData,
  members: membersMockData
};

// ============================================
// Mock API Functions
// ============================================

/**
 * Mock API to fetch tab content config by tab ID
 */
export const getTabConfigMock = (tabId: string): Promise<TabContentConfig | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(tabConfigRegistry[tabId] ?? null);
    }, 200);
  });
};

/**
 * Mock API to fetch tab data by tab ID
 */
export const getTabDataMock = (tabId: string): Promise<RowData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Members data comes from localStorage, fallback to mock data
      if (tabId === "members") {
        const storedMembers = getMembersFromStorage();
        resolve(storedMembers.length > 0 ? storedMembers : membersMockData);
        return;
      }
      resolve(tabDataRegistry[tabId] ?? []);
    }, 200);
  });
};
