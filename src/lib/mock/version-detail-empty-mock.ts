// Mock data for a freshly created version — initial state.
// Inherits creation-time data from the parent RFQ:
//   Plan structure: Single Plan, SA basis: Flat, Pricing basis: Manual
//   These are known at creation but plans have not been configured yet.

import type { VersionDetailMock } from './version-detail-mock';

export const mockVersionEmpty: VersionDetailMock = {
  versionId: 'v1',
  versionNumber: 1,
  label: 'Draft',
  status: 'DRAFT',
  basedOn: '',
  basedOnLabel: 'Initial version',
  createdAt: '16 Jun 2025',
  createdBy: { name: 'Priya Sharma', role: 'SALES', level: 'L2' },
  rfqId: 'GTL-2025-00198',
  dealName: 'Wipro Technologies GPA',
  plans: [],
  gradeAllocations: [],
  actuaryPricing: {
    receivedAt: '—',
    receivedBy: '—',
    claimsRate: '—',
    mortalityLoading: '—',
    expenseLoading: '—',
    grossPremium: '—',
    reinsurancePremium: '—',
    reinsurancePct: '—',
    netPremium: '—',
    adminFee: '—',
    notes: '',
    rateTable: [],
  },
  profitability: {
    combinedRatio: 0,
    netMargin: 0,
    reinsurancePct: 0,
  },
  scenarios: [],
  summaryStats: {
    planCount: 0,
    scenarioCount: 0,
    grossPremium: '—',
    netPremium: '—',
  },
};
