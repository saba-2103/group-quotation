/**
 * Sales Version Workspace — mock data.
 * Showcases ACCEPTED state (the "money action" — Finalise).
 * Switch VW_VERSION.status to explore other states.
 */

export type VWStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'REFERRED_UW'
  | 'REFERRED_PRICING'
  | 'EVALUATED'
  | 'RATED'
  | 'SUBMITTED'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'FINALIZED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'SUPERSEDED';

export interface VWPlan {
  id: string;
  name: string;
  baseProduct: string;
  riderCount: number;
  sumAssuredBasis: string;
  fcl?: string;
  nml?: string;
}

export type UWOutcome = 'AUTO_APPROVED' | 'MANUAL_APPROVED' | 'REFERRED' | 'REJECTED' | 'NOT_EVALUATED';
export type PricingOutcome = 'AUTO_RATED' | 'MANUAL_APPROVED' | 'REFERRED' | 'COUNTER' | 'REJECTED' | 'NOT_EVALUATED';

export interface VWUWStatus {
  outcome: UWOutcome;
  approvedBy?: string;
  approvedAt?: string;
  round: number;
  elapsedDays?: number;
  rejectionReason?: string;
}

export interface VWPricingStatus {
  outcome: PricingOutcome;
  approvedBy?: string;
  approvedAt?: string;
  round: number;
  elapsedDays?: number;
  counterProposedPremium?: number;
  counterDelta?: number;
  counterDeltaPct?: number;
}

export interface VWPremium {
  calculated: boolean;
  amount?: number;
  perLife?: number;
  calculatedDaysAgo?: number;
  isStale?: boolean;
}

export interface VWRoundLogEntry {
  roundNo: number;
  type: 'UW' | 'PRICING';
  status: string;
  by: string;
  at: string;
  note?: string;
}

export interface SalesVersionWorkspace {
  rfqId: string;
  quoteNo: string;
  clientName: string;
  brokerName?: string;
  expiresAt: string;
  versionId: string;
  versionNo: number;
  versionLabel: string;
  status: VWStatus;
  referredAt?: string;
  referredBy?: string;
  sentAt?: string;
  acceptedAt?: string;
  finalizedAt?: string;
  withdrawnAt?: string;
  daysInCurrentState: number;
  uwRounds: number;
  pricingRounds: number;
  plans: VWPlan[];
  uwStatus: VWUWStatus;
  pricingStatus: VWPricingStatus;
  premium: VWPremium;
  // Readiness
  hasCensus: boolean;
  hasFieldsComplete: boolean;
  // Round log
  roundLog: VWRoundLogEntry[];
}

export const VW_DEMO: SalesVersionWorkspace = {
  rfqId: 'rfq-s001',
  quoteNo: 'GTL-2026-00201',
  clientName: 'Tata Motors Ltd',
  brokerName: 'Aon India',
  expiresAt: '2026-07-15T23:59:59Z',
  versionId: 'v3-s001',
  versionNo: 3,
  versionLabel: 'Broker Submission — Final',
  status: 'ACCEPTED',
  acceptedAt: '2026-06-16T10:30:00Z',
  daysInCurrentState: 2,
  uwRounds: 1,
  pricingRounds: 2,
  plans: [
    { id: 'p1', name: 'Gold Plan', baseProduct: 'GTL', riderCount: 2, sumAssuredBasis: '5× Salary', fcl: '₹50L', nml: 'Full' },
    { id: 'p2', name: 'Silver Plan', baseProduct: 'GTL', riderCount: 1, sumAssuredBasis: '3× Salary', fcl: '₹30L', nml: 'Full' },
    { id: 'p3', name: 'Staff Plan', baseProduct: 'GTL', riderCount: 0, sumAssuredBasis: 'Flat ₹5L', fcl: '₹5L', nml: 'Simplified' },
  ],
  uwStatus: {
    outcome: 'AUTO_APPROVED',
    approvedAt: '2026-06-10T09:15:00Z',
    round: 1,
  },
  pricingStatus: {
    outcome: 'MANUAL_APPROVED',
    approvedBy: 'Kavya Iyer (Actuary)',
    approvedAt: '2026-06-10T09:45:00Z',
    round: 2,
  },
  premium: {
    calculated: true,
    amount: 4218000,
    perLife: 1318,
    calculatedDaysAgo: 8,
    isStale: false,
  },
  hasCensus: true,
  hasFieldsComplete: true,
  roundLog: [
    { roundNo: 2, type: 'PRICING', status: 'Approved', by: 'Kavya Iyer', at: '2026-06-10T09:45:00Z', note: 'Approved with Grade C loading factor 1.08' },
    { roundNo: 1, type: 'PRICING', status: 'Counter', by: 'Kavya Iyer', at: '2026-06-07T14:00:00Z', note: 'Proposed counter: loading 1.12 on Grade C' },
    { roundNo: 1, type: 'UW', status: 'Auto-approved', by: 'UW Engine', at: '2026-06-10T09:15:00Z' },
  ],
};

// ── Alternate state snapshots for switching ──────────────────────────────────
export const VW_DEMO_REFERRED_UW: Partial<SalesVersionWorkspace> = {
  status: 'REFERRED_UW',
  referredAt: '2026-06-14T09:00:00Z',
  referredBy: 'Arjun Sharma',
  daysInCurrentState: 4,
  uwStatus: { outcome: 'REFERRED', round: 1, elapsedDays: 4 },
  pricingStatus: { outcome: 'NOT_EVALUATED', round: 0 },
  premium: { calculated: false },
};

export const VW_DEMO_RATED: Partial<SalesVersionWorkspace> = {
  status: 'RATED',
  daysInCurrentState: 1,
  uwStatus: { outcome: 'AUTO_APPROVED', approvedAt: '2026-06-15T09:00:00Z', round: 1 },
  pricingStatus: { outcome: 'AUTO_RATED', approvedAt: '2026-06-17T08:00:00Z', round: 1 },
  premium: { calculated: true, amount: 4218000, perLife: 1318, calculatedDaysAgo: 1 },
};
