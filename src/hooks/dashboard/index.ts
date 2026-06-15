// Dashboard data hooks — barrel export.
export { useSalesDashboard } from './useSalesDashboard';
export type { SalesDashboardData, SalesVersionItem, ReferredVersionItem, PipelineSegment } from './useSalesDashboard';

export { useUWDashboard } from './useUWDashboard';
export type { UWDashboardData, UWCaseItem, RIConsultationItem, RecentResolutionItem, UWCasePriority } from './useUWDashboard';

export { useActuaryDashboard } from './useActuaryDashboard';
export type {
  ActuaryDashboardData,
  ActuaryCaseItem,
  ActuaryCasePriority,
  DiscountApprovalItem,
  EscalationMonthPoint,
  ActuaryRecentResolution,
  RIConsultationItem as ActuaryRIConsultationItem,
} from './useActuaryDashboard';

export { useOPSDashboard } from './useOPSDashboard';
export type { OPSDashboardData, OPSProposalItem, OPSPolicyItem } from './useOPSDashboard';

export { usePartnerDashboard } from './usePartnerDashboard';
export type {
  PartnerDashboardData,
  PartnerMemberQuoteItem,
  PartnerSchemeItem,
  PartnerTodayStats,
  PimStatus,
} from './usePartnerDashboard';

export { useBrokerDashboard } from './useBrokerDashboard';
export type { BrokerDashboardData, BrokerQuoteItem, BrokerRenewalItem } from './useBrokerDashboard';

export { useClientDashboard } from './useClientDashboard';
export type { ClientDashboardData, ClientPolicyItem, ClientQuoteItem, ClientRenewalDue, ClientDocument } from './useClientDashboard';

export { useAdminDashboard } from './useAdminDashboard';
export type {
  AdminDashboardData,
  AdminPlatformStats,
  AdminSLABreach,
  AdminTeamMember,
  AdminTeamWorkload,
  AdminFunnelStage,
  AdminFunnelData,
  AdminApprovalType,
  AdminPendingApproval,
  IntegrationStatus,
  AdminIntegration,
  AdminSystemHealth,
} from './useAdminDashboard';
