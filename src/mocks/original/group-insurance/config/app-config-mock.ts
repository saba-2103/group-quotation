import type { AppConfig } from "@shared/types";

/**
 * Mock App Config for Group Insurance Portal.
 *
 * Rail items follow the V1 spec modules from docs/group-pas-v1-plan.md Task 0.2
 * (Quotation, Issuance, Policy Admin) plus Home, plus Accounting (reference module).
 * Submenu items are flat (no `group` set) for now — grouping is deferred until
 * we decide how module-detail tabs should appear in the submenu panel.
 */
export const groupInsuranceAppConfig: AppConfig = {
  title: "Group Insurance Portal",
  description: "Manage your group insurance claims efficiently",
  logo: {
    icon: "Users",
    size: 32
  },
  navigation: {
    menuItems: [
      {
        id: "home",
        label: "Home",
        url: "/",
        icon: "LayoutDashboard"
      },
      {
        id: "quotation",
        label: "Quotation",
        url: "/quotation",
        icon: "FileText",
        subMenuItems: [
          {
            id: "quotation-list",
            label: "Quotations",
            url: "/quotation",
            icon: "FileText"
          },
          {
            id: "member-quotes",
            label: "Member Quotes",
            url: "/quotation/member-quotes",
            icon: "Users"
          }
        ]
      },
      {
        id: "issuance",
        label: "Issuance",
        url: "/issuance/proposals",
        icon: "ShieldCheck",
        subMenuItems: [
          {
            id: "issuance-proposals",
            label: "Proposals",
            url: "/issuance/proposals",
            icon: "ShieldCheck"
          }
        ]
      },
      {
        id: "policy-admin",
        label: "Policy Admin",
        url: "/policy-admin/policies",
        icon: "Building2",
        subMenuItems: [
          {
            id: "policy-admin-clients",
            label: "Clients",
            url: "/policy-admin/clients",
            icon: "Users"
          },
          {
            id: "policy-admin-policies",
            label: "Policies",
            url: "/policy-admin/policies",
            icon: "FileText"
          }
        ]
      },
      {
        id: "accounting",
        label: "Accounting",
        url: "/accounting",
        icon: "Calculator",
        subMenuItems: [
          {
            id: "accounting-list",
            label: "Accounting",
            url: "/accounting",
            icon: "Calculator"
          },
          {
            id: "payout",
            label: "Payout",
            url: "/payout",
            icon: "Banknote"
          }
        ]
      }
    ]
  }
};
