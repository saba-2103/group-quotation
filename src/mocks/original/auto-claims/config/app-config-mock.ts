import { SideBarType, type AppConfig } from "@shared/types";

/**
 * Mock App Config for Auto Claims Portal
 */
export const autoClaimsAppConfig: AppConfig = {
  title: "Auto Claims Portal",
  description: "Manage your auto insurance claims efficiently",
  logo: {
    icon: "Car",
    size: 32
  },
  navigation: {
    sideBarType: SideBarType.DUAL_PANEL,
    menuItems: [
      {
        id: "home",
        label: "Home",
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
