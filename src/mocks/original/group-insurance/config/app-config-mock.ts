import type { AppConfig } from "@shared/types";

/**
 * Group PAS app config — new-business revamp.
 *
 * Primary rail: Home | Policy | Policy 2
 * Policy submenu: Dashboard, My Desk, RFQs, Plan Templates, Sales Cockpit
 * Policy 2 submenu: Dashboard, Workbench, RFQ2
 */
export const groupInsuranceAppConfig: AppConfig = {
  title: "Group PAS",
  description: "Group Policy Administration System",
  logo: {
    icon: "Shield",
    size: 32,
  },
  navigation: {
    menuItems: [
      {
        id: "home",
        label: "Home",
        url: "/",
        icon: "House",
      },
      // ── Policy ────────────────────────────────────────────────────────────
      {
        id: "policy",
        label: "Policy",
        url: "/rfqs",
        icon: "FileSearch",
        allowedRoles: ["SALES", "UNDERWRITER", "ACTUARY", "ACTUARIAL", "OPS", "ADMIN"],
        subMenuItems: [
          {
            id: "policy-dashboard",
            label: "Dashboard",
            url: "/dashboard",
            icon: "LayoutDashboard",
            group: "MANAGE",
          },
          {
            id: "my-desk",
            label: "My Desk",
            url: "/my-desk",
            icon: "MonitorCheck",
            group: "MANAGE",
            allowedRoles: ["SALES", "UNDERWRITER", "ACTUARY", "ACTUARIAL", "OPS", "ADMIN"],
          },
          {
            id: "rfqs-list",
            label: "RFQs",
            url: "/rfqs",
            icon: "List",
            group: "MANAGE",
          },
          {
            id: "rfqs-new",
            label: "New RFQ",
            url: "/rfqs/new",
            icon: "Plus",
            group: "MANAGE",
            allowedRoles: ["SALES", "ADMIN"],
          },
          {
            id: "plan-templates",
            label: "Plan Templates",
            url: "/plan-templates",
            icon: "LayoutTemplate",
            group: "CONFIGURE",
            allowedRoles: ["SALES", "UNDERWRITER", "ACTUARY", "ACTUARIAL", "OPS", "ADMIN"],
          },
          {
            id: "sales-cockpit",
            label: "Sales Cockpit",
            url: "/sales-cockpit",
            icon: "Gauge",
            group: "CONFIGURE",
            allowedRoles: ["ADMIN"],
          },
        ],
      },
      // ── Policy 2 (exploration canvas) ─────────────────────────────────────
      {
        id: "policy2",
        label: "Policy 2",
        url: "/rfq2",
        icon: "FlaskConical",
        allowedRoles: ["SALES", "UNDERWRITER", "ACTUARY", "ACTUARIAL", "OPS", "ADMIN"],
        subMenuItems: [
          // ── HOME ──────────────────────────────────────────────────────────
          {
            id: "policy2-dashboard",
            label: "Dashboard",
            url: "/rfq2/dashboard",
            icon: "LayoutDashboard",
            group: "HOME",
          },
          {
            id: "policy2-workbench",
            label: "Workbench",
            url: "/rfq2/workbench",
            icon: "ClipboardList",
            group: "HOME",
          },
          {
            id: "policy2-approvals",
            label: "Approvals",
            url: "/rfq2/approvals",
            icon: "Stamp",
            group: "HOME",
          },
          {
            id: "policy2-referrals",
            label: "Referrals",
            url: "/rfq2/referrals",
            icon: "UserRoundCog",
            group: "HOME",
          },
          // ── POLICY ────────────────────────────────────────────────────────
          {
            id: "policy2-quotes",
            label: "Quotes",
            url: "/rfq2/quotes",
            icon: "FileText",
            group: "POLICY",
            activePrefix: "/rfq2/rfq-",
          },
          {
            id: "policy2-member-quotes",
            label: "Member Quotes",
            url: "/rfq2/member-quotes",
            icon: "FileUser",
            group: "POLICY",
          },
          {
            id: "policy2-issuance",
            label: "Issuance",
            url: "/rfq2/issuance",
            icon: "ShieldCheck",
            group: "POLICY",
          },
          {
            id: "policy2-documents",
            label: "Documents",
            url: "/rfq2/documents",
            icon: "Folder",
            group: "POLICY",
          },
          // ── INSIGHTS ──────────────────────────────────────────────────────
          {
            id: "policy2-analytics",
            label: "Analytics",
            url: "/rfq2/analytics",
            icon: "ChartNoAxesCombined",
            group: "INSIGHTS",
          },
          {
            id: "policy2-reports",
            label: "Reports",
            url: "/rfq2/reports",
            icon: "FileChartColumn",
            group: "INSIGHTS",
          },
          {
            id: "policy2-health",
            label: "Health",
            url: "/rfq2/health",
            icon: "HeartPulse",
            group: "INSIGHTS",
          },
          // ── CONFIGURE ─────────────────────────────────────────────────────
          {
            id: "policy2-clients",
            label: "Clients",
            url: "/rfq2/clients",
            icon: "BookUser",
            group: "CONFIGURE",
          },
          {
            id: "policy2-products",
            label: "Products",
            url: "/rfq2/products",
            icon: "Box",
            group: "CONFIGURE",
          },
          {
            id: "policy2-plan-templates",
            label: "Plan Templates",
            url: "/rfq2/plan-templates",
            icon: "FileBox",
            group: "CONFIGURE",
          },
          // ── EXPLORE ───────────────────────────────────────────────────────
          {
            id: "policy2-explore-quote",
            label: "Quote Detail",
            url: "/rfq2/explore/GTL-2024-00142",
            icon: "Compass",
            group: "EXPLORE",
            badge: "BETA",
          },
          {
            id: "policy2-explore-version",
            label: "Version Detail",
            url: "/rfq2/explore/version-detail",
            icon: "Compass",
            group: "EXPLORE",
            badge: "BETA",
          },
          {
            id: "policy2-explore-quote-empty",
            label: "Quote (Empty)",
            url: "/rfq2/explore/quote-detail-empty",
            icon: "Compass",
            group: "EXPLORE",
            badge: "BETA",
          },
          {
            id: "policy2-explore-version-empty",
            label: "Version (Empty)",
            url: "/rfq2/explore/version-detail-empty",
            icon: "Compass",
            group: "EXPLORE",
            badge: "BETA",
          },
        ],
      },
    ],
  },
};

