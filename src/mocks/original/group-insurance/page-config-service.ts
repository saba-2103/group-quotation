import type { PageConfig } from "@shared/types";
import { groupInsuranceDashboardPageConfig } from "./config";

// ============================================
// Group Insurance Page Config Registry
// ============================================
// Legacy quotation entries (`quotations`, `quotations-detail`,
// `quotations-detail-edit`) were removed in the Phase 0 teardown of the
// legacy module. New Group PAS module pages register here as they ship.

const groupInsurancePageConfigs: Record<string, PageConfig> = {
  dashboard: groupInsuranceDashboardPageConfig,
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
