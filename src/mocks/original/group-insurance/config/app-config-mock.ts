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
        url: "/coming-soon/home",
        icon: "House",
      },
      // ── Spec (former Policy) ──────────────────────────────────────
      {
        id: "policy",
        label: "Spec",
        url: "/rfqs",
        icon: "FileSearch",
        bottomRail: true,
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
          // ── EXPLORE ───────────────────────────────────────────────
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
      // ── Policy ─────────────────────────────────────────────────────
      {
        id: "policy2",
        label: "Policy",
        url: "/rfq2",
        icon: "Shield",
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
            id: "policy2-referrals",
            label: "Dispatch",
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
            id: "policy2-issuance",
            label: "Issuance",
            url: "/rfq2/issuance",
            icon: "ShieldCheck",
            group: "POLICY",
            disabled: true,
          },
          // ── INSIGHTS ──────────────────────────────────────────────────────
          {
            id: "policy2-analytics",
            label: "Analytics",
            url: "/rfq2/analytics",
            icon: "ChartNoAxesCombined",
            group: "INSIGHTS",
            disabled: true,
          },
          {
            id: "policy2-reports",
            label: "Reports",
            url: "/rfq2/reports",
            icon: "FileChartColumn",
            group: "INSIGHTS",
            disabled: true,
          },
          {
            id: "policy2-health",
            label: "Health",
            url: "/rfq2/health",
            icon: "HeartPulse",
            group: "INSIGHTS",
            disabled: true,
          },
          // ── CONFIGURE ─────────────────────────────────────────────────────
          {
            id: "policy2-plan-templates",
            label: "Plan Templates",
            url: "/rfq2/plan-templates",
            icon: "FileBox",
            group: "CONFIGURE",
          },
        ],
      },
      // ── Claims ────────────────────────────────────────────────────────────
      { id: "claims", label: "Claims", url: "/coming-soon/claims", icon: "FileText" },
      // ── Billing ───────────────────────────────────────────────────────────
      { id: "billing", label: "Billing", url: "/coming-soon/billing", icon: "CreditCard" },
      // ── Rule Engine ───────────────────────────────────────────────────────
      { id: "rule-engine", label: "Rule Engine", url: "/coming-soon/rule-engine", icon: "Goal" },
      // ── Products ──────────────────────────────────────────────────────────
      { id: "products", label: "Products", url: "/coming-soon/products", icon: "Package" },
      // ── Party ─────────────────────────────────────────────────────────────
      { id: "party", label: "Party", url: "/coming-soon/party", icon: "Building2" },
    ],
  },
};

