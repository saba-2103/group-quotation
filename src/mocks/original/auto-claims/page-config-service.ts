import type { PageConfig } from "@shared/types";
import { claimsListPageConfig, claimsDetailPageConfig, dashboardPageConfig } from "./config";

// ============================================
// Auto Claims Page Config Registry
// ============================================

const autoClaimsPageConfigs: Record<string, PageConfig> = {
  claims: claimsListPageConfig,
  "claims-detail": claimsDetailPageConfig,
  dashboard: dashboardPageConfig,
};

// ============================================
// Auto Claims Page Config Service
// ============================================

export const getAutoClaimsPageConfigMock = async (pageId: string): Promise<PageConfig> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const config = autoClaimsPageConfigs[pageId];

  if (!config) {
    throw new Error(`Page config not found: auto-claims/${pageId}`);
  }

  return config;
};