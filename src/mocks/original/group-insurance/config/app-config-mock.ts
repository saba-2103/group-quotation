import { SideBarType, type AppConfig } from "@shared/types";

/**
 * Mock App Config for Group Insurance Portal
 */
export const groupInsuranceAppConfig: AppConfig = {
  title: "Group Insurance Portal",
  description: "Manage your group insurance claims efficiently",
  logo: {
    icon: "Users", // will be replaced with URL-based icon
    size: 32
  },
  navigation: {
    sideBarType: SideBarType.NESTED,
    menuItems: [
      {
        id: "dashboard",
        label: "Dashboard",
        url: "/dashboard",
        icon: "LayoutDashboard"
      },
      {
        id: "workflow",
        label: "Workflow",
        url: "/workflow",
        icon: "GitBranch"
      },
      {
        id: "corporate-clients",
        label: "Corporate Clients",
        url: "/corporate-clients",
        icon: "Building2",
        subMenuItems: [
          {
            id: "corporate-clients-maintenance",
            label: "Corporate Clients Maintenance",
            url: "/corporate-clients-maintenance"
          }
        ]
      },
      {
        id: "personal-clients",
        label: "Personal Clients",
        icon: "User",
        subMenuItems: [
          {
            id: "personal-clients-maintenance",
            label: "Personal Clients Maintenance",
            url: "/personal-clients-maintenance"
          }
        ]
      },
      {
        id: "channel-maintenance",
        label: "Channel Maintenance",
        icon: "Network",
        subMenuItems: [
          {
            id: "channel-management",
            label: "Channel Management",
            url: "/channel-management"
          },
          {
            id: "sub-channel-maintenance",
            label: "Sub-Channel Maintenance",
            url: "/sub-channel-maintenance"
          },
          {
            id: "agency-master-maintenance",
            label: "Agency Master Maintenance",
            url: "/agency-master-maintenance"
          },
          {
            id: "agency-maintenance",
            label: "Agency Maintenance",
            url: "/agency-maintenance"
          },
          {
            id: "hierarchy-maintenance",
            label: "Hierarchy Maintenance",
            url: "/hierarchy-maintenance"
          }
        ]
      },
      {
        id: "system-management",
        label: "System Management",
        icon: "Settings",
        subMenuItems: [
          {
            id: "accounting",
            label: "Accounting",
            url: "/accounting",
            icon: "Calculator"
          },
          {
            id: "client-maintenance",
            label: "Client Maintenance",
            url: "/client-maintenance"
          },
          {
            id: "tenant-maintenance",
            label: "Tenant Maintenance",
            url: "/tenant-maintenance"
          },
          {
            id: "variable-maintenance",
            label: "Variable Maintenance",
            url: "/variable-maintenance"
          },
          {
            id: "datasource-maintenance",
            label: "Datasource Maintenance",
            url: "/datasource-maintenance"
          },
          {
            id: "software-component-maintenance",
            label: "Software Component Maintenance",
            url: "/software-component-maintenance"
          },
          {
            id: "tenant-component-maintenance",
            label: "Tenant Component Maintenance",
            url: "/tenant-component-maintenance"
          },
          {
            id: "menu-maintenance",
            label: "Menu Maintenance",
            url: "/menu-maintenance"
          },
          {
            id: "screen-maintenance",
            label: "Screen Maintenance",
            url: "/screen-maintenance"
          },
          {
            id: "db-table-maintenance",
            label: "DB Table Maintenance",
            url: "/db-table-maintenance"
          },
          {
            id: "error-message-maintenance",
            label: "Error Message Maintenance",
            url: "/error-message-maintenance"
          },
          {
            id: "action-allowed-maintenance",
            label: "Action Allowed Maintenance",
            url: "/action-allowed-maintenance"
          },
          {
            id: "button-allowed-maintenance",
            label: "Button Allowed Maintenance",
            url: "/button-allowed-maintenance"
          },
          {
            id: "next-screen-maintenance",
            label: "Next Screen Maintenance",
            url: "/next-screen-maintenance"
          },
          {
            id: "pop-up-screen-maintenance",
            label: "Pop Up Screen Maintenance",
            url: "/pop-up-screen-maintenance"
          },
          {
            id: "pop-up-message-maintenance",
            label: "Pop Up Message Maintenance",
            url: "/pop-up-message-maintenance"
          },
          {
            id: "business-process-maintenance",
            label: "Business Process Maintenance",
            url: "/business-process-maintenance"
          },
          {
            id: "input-output-permission-maintenance",
            label: "Input Output Permission Maintenance",
            url: "/input-output-permission-maintenance"
          }
        ]
      },
      {
        id: "approval",
        label: "Approval",
        icon: "CheckCircle",
        subMenuItems: [
          {
            id: "approval-flow",
            label: "Approval Flow",
            url: "/approval-flow"
          },
          {
            id: "approval-rules",
            label: "Approval Rules",
            url: "/approval-rules"
          },
          {
            id: "work-with-pending-review-approval",
            label: "Work with pending review & approval",
            url: "/work-with-pending-review-approval"
          },
          {
            id: "enquiry-of-approval-audit-log",
            label: "Enquiry of approval audit log",
            url: "/enquiry-of-approval-audit-log"
          }
        ]
      },
      {
        id: "group-quotation",
        label: "Group Quotation",
        icon: "FileStack",
        subMenuItems: [
          {
            id: "pending-quotations",
            label: "Work with pending quotations",
            url: "/quotations?status=pending"
          },
          {
            id: "accepted-listing",
            label: "Accepted quote listing",
            url: "/quotations?status=accepted"
          },
          {
            id: "no-update-cases",
            label: "Update 'not-taken-up' cases",
            url: "/quotations?status=not-taken-up"
          },
          {
            id: "quotation-listing",
            label: "Quotation listing",
            url: "/quotations"
          }
        ]
      },
      {
        id: "rules-engine",
        label: "Rules Engine",
        url: "/rules-engine",
        icon: "Cog"
      },
      {
        id: "reports",
        label: "Reports",
        url: "/reports",
        icon: "BarChart3"
      }
    ]
  }
};
