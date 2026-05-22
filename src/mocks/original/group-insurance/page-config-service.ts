import type { PageConfig } from "@shared/types";
import { groupInsuranceDashboardPageConfig, quotationDetailsPageConfig, quotationDetailsEditPageConfig, quotationsListPageConfig } from "./config";

// ============================================
// Group Insurance Page Config Registry
// ============================================

const groupInsurancePageConfigs: Record<string, PageConfig> = {
  dashboard: groupInsuranceDashboardPageConfig,
  quotations: quotationsListPageConfig,
  "quotations-detail": quotationDetailsPageConfig,
  "quotations-detail-edit": quotationDetailsEditPageConfig,
};

// ============================================
// Group Insurance Page Config Service
// ============================================

export const getGroupInsurancePageConfigMock = async (pageId: string): Promise<PageConfig> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const config = groupInsurancePageConfigs[pageId];

  if (!config) {
    throw new Error(`Page config not found: group-insurance/${pageId}`);
  }

  return config;
};
