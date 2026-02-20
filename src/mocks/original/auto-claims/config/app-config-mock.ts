import { SideBarType, type AppConfig } from "@shared/types";

/**
 * Mock App Config for Auto Claims Portal
 */
export const autoClaimsAppConfig: AppConfig = {
  title: "Auto Claims Portal",
  description: "Manage your auto insurance claims efficiently",
  logo: {
    icon: "Car", // will be replaced with URL-based icon
    size: 32
  },
  navigation: {
    sideBarType: SideBarType.UNGROUPED,
    menuItems: [
      {
        id: "dashboard",
        label: "Dashboard",
        url: "/dashboard",
        icon: "LayoutDashboard"
      },
      {
        id: "claims",
        label: "Claims",
        url: "/claims",
        icon: "FileText"
      },
      {
        id: "reports",
        label: "Reports",
        url: "/reports",
        icon: "BarChart3"
      },
      {
        id: "settings",
        label: "Settings",
        url: "/settings",
        icon: "Settings"
      }
    ]
  }
};