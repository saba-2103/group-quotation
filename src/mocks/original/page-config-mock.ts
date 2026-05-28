import type { PageConfig } from "@shared/types";
import { getAutoClaimsPageConfigMock } from "./auto-claims/page-config-service";
import { getGroupInsurancePageConfigMock } from "./group-insurance/page-config-service";

// Re-export auto claims configs
export {
  claimsListPageConfig,
  claimsDetailPageConfig,
  dashboardPageConfig,
} from "./auto-claims/config";

// Re-export app-specific page config services
export { getAutoClaimsPageConfigMock } from "./auto-claims/page-config-service";
export { getGroupInsurancePageConfigMock } from "./group-insurance/page-config-service";

// ============================================
// Unified Page Config Service
// ============================================

export const getPageConfigMock = async (appId: string, pageId: string): Promise<PageConfig> => {
  switch (appId) {
    case "auto-claims":
      return getAutoClaimsPageConfigMock(pageId);
    case "group-insurance":
      return getGroupInsurancePageConfigMock(pageId);
    default:
      throw new Error(`Unknown application: ${appId}`);
  }
};
