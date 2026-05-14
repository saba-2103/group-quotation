import type { AppConfig } from "@shared/types";

/**
 * Mock App Config for Group Insurance Portal.
 *
 * Rail items follow the V1 spec modules from docs/group-pas-v1-plan.md Task 0.2
 * (Quotation, Issuance, Policy Admin) plus Home, plus Accounting (reference module).
 * Submenu items are flat (no `group` set) for now — grouping is deferred until
 * we decide how module-detail tabs should appear in the submenu panel.
 *
 * `allowedRoles` per item drives the role-aware menu filter wired in
 * `/api/config/app` (PROP-0009). Items without `allowedRoles` are visible to
 * every role. The values are the first cut from the proposal — refinable when
 * the demo script is walked end-to-end.
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
        // allowedRoles omitted → visible to every role
      },
      {
        id: "quotation",
        label: "Quotation",
        url: "/quotation",
        icon: "FileText",
        allowedRoles: ["sales", "partner_agent", "mph"],
        subMenuItems: [
          {
            id: "quotation-list",
            label: "Quotations",
            url: "/quotation",
            icon: "FileText",
            allowedRoles: ["sales", "partner_agent", "mph"]
          },
          {
            id: "member-quotes",
            label: "Member Quotes",
            url: "/quotation/member-quotes",
            icon: "Users",
            allowedRoles: ["sales"]
          }
        ]
      },
      {
        id: "issuance",
        label: "Issuance",
        url: "/issuance/proposals",
        icon: "ShieldCheck",
        allowedRoles: ["sales", "mph", "uw"],
        subMenuItems: [
          {
            id: "issuance-proposals",
            label: "Proposals",
            url: "/issuance/proposals",
            icon: "ShieldCheck",
            allowedRoles: ["sales", "mph", "uw"]
          }
        ]
      },
      {
        id: "policy-admin",
        label: "Policy Admin",
        url: "/policy-admin/policies",
        icon: "Building2",
        allowedRoles: ["sales", "partner_agent", "member", "ops"],
        subMenuItems: [
          {
            id: "policy-admin-clients",
            label: "Clients",
            url: "/policy-admin/clients",
            icon: "Users",
            allowedRoles: ["sales", "partner_agent"]
          },
          {
            id: "policy-admin-policies",
            label: "Policies",
            url: "/policy-admin/policies",
            icon: "FileText",
            allowedRoles: ["sales", "partner_agent", "member", "ops"]
          }
        ]
      },
      {
        id: "accounting",
        label: "Accounting",
        url: "/accounting",
        icon: "Calculator",
        allowedRoles: ["sales"],
        subMenuItems: [
          {
            id: "accounting-list",
            label: "Accounting",
            url: "/accounting",
            icon: "Calculator",
            allowedRoles: ["sales"]
          },
          {
            id: "payout",
            label: "Payout",
            url: "/payout",
            icon: "Banknote",
            allowedRoles: ["sales"]
          }
        ]
      }
    ]
  }
};
