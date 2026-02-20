import type { AppConfig } from "@shared/types";
import { autoClaimsAppConfig } from "./auto-claims/config";
import { groupInsuranceAppConfig } from "./group-insurance/config";

/**
 * Get app config mock by app ID
 */
export async function getAppConfigMock(appId: string): Promise<AppConfig> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  switch (appId) {
    case "auto-claims":
      return autoClaimsAppConfig;
    case "group-insurance":
      return groupInsuranceAppConfig;
    default:
      throw new Error(`Unknown application: ${appId}`);
  }
}

// Re-export individual app configs for direct access
export { autoClaimsAppConfig } from "./auto-claims/config";
export { groupInsuranceAppConfig } from "./group-insurance/config";