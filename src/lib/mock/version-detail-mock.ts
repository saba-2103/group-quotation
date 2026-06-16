// Mock data for the Version Detail layout exploration page.

export interface VersionDetailMock {
  versionId: string;
  versionNumber: number;
  label: string;
  status: 'PRICED' | 'FROZEN' | 'DRAFT';
  basedOn: string;
  basedOnLabel: string;
  createdAt: string;
  createdBy: { name: string; role: string; level: string };
  rfqId: string;
  dealName: string;
  plans: {
    id: string;
    name: string;
    benefitType: string;
    coverBasis: string;
    sumAssured: string;
    rider?: string;
    applicableGrades: string;
    isComplete: boolean;
    incompleteReason?: string;
  }[];
  gradeAllocations: {
    gradeId: string;
    gradeName: string;
    memberCount: number;
    totalSA: string;
    estimatedPremium: string;
  }[];
  actuaryPricing: {
    receivedAt: string;
    receivedBy: string;
    claimsRate: string;
    mortalityLoading: string;
    expenseLoading: string;
    grossPremium: string;
    reinsurancePremium: string;
    reinsurancePct: string;
    netPremium: string;
    adminFee: string;
    notes: string;
    rateTable: {
      grade: string;
      ratePerThousand: string;
      totalSA: string;
      premium: string;
    }[];
  };
  profitability: {
    combinedRatio: number;
    netMargin: number;
    reinsurancePct: number;
  };
  scenarios: {
    id: string;
    name: string;
    premium: string;
    discountPct: string;
    marginPct: string;
    basis: string;
    isComplete: boolean;
    needsApproval: boolean;
    isAtFloor: boolean;
  }[];
  summaryStats: {
    planCount: number;
    scenarioCount: number;
    grossPremium: string;
    netPremium: string;
  };
}

export const mockVersionDetail: VersionDetailMock = {
  versionId: 'v3',
  versionNumber: 3,
  label: 'Custom Ask',
  status: 'PRICED',
  basedOn: 'v2',
  basedOnLabel: 'V2 — Enhanced',
  createdAt: '14 Feb 2025',
  createdBy: { name: 'Rajan Mehta', role: 'SALES', level: 'L3' },
  rfqId: 'GTL-2024-00142',
  dealName: 'TCS GTL',
  plans: [
    {
      id: 'p1',
      name: 'Death Benefit (Natural)',
      benefitType: 'Death',
      coverBasis: 'Flat',
      sumAssured: '₹20L',
      applicableGrades: 'A, B, C',
      isComplete: true,
    },
    {
      id: 'p2',
      name: 'Death Benefit (Accidental)',
      benefitType: 'Death',
      coverBasis: 'Flat',
      sumAssured: '₹40L',
      rider: 'AD&D',
      applicableGrades: 'A, B, C',
      isComplete: true,
    },
    {
      id: 'p3',
      name: 'Total Permanent Disability',
      benefitType: 'TPD',
      coverBasis: 'Graded',
      sumAssured: 'Up to ₹50L',
      applicableGrades: 'A (₹50L), B (₹25L), C (₹10L)',
      isComplete: true,
    },
    {
      id: 'p4',
      name: 'Critical Illness',
      benefitType: 'CI',
      coverBasis: 'Flat',
      sumAssured: '₹10L',
      applicableGrades: 'A, B, C',
      isComplete: false,
      incompleteReason: 'Grade allocation not set',
    },
  ],
  gradeAllocations: [
    { gradeId: 'ga', gradeName: 'Grade A', memberCount: 2730, totalSA: '₹1,365 Cr', estimatedPremium: '₹1.42 Cr' },
    { gradeId: 'gb', gradeName: 'Grade B', memberCount: 5580, totalSA: '₹1,116 Cr', estimatedPremium: '₹1.16 Cr' },
    { gradeId: 'gc', gradeName: 'Grade C', memberCount: 4090, totalSA: '₹409 Cr', estimatedPremium: '₹0.48 Cr' },
  ],
  actuaryPricing: {
    receivedAt: '18 Feb 2025',
    receivedBy: 'Actuary Team',
    claimsRate: '66.4%',
    mortalityLoading: '1.18×',
    expenseLoading: '12%',
    grossPremium: '₹5.61 Cr',
    reinsurancePremium: '₹1.12 Cr',
    reinsurancePct: '20%',
    netPremium: '₹4.49 Cr',
    adminFee: '₹0.28 Cr',
    notes: 'Projected claims ratio slightly elevated for Grade A owing to age band concentration 50–55. Loading applied at 1.18×. Recommend reviewing SA adequacy for Grade C.',
    rateTable: [
      { grade: 'Grade A', ratePerThousand: '₹1.04', totalSA: '₹1,365 Cr', premium: '₹1.42 Cr' },
      { grade: 'Grade B', ratePerThousand: '₹1.04', totalSA: '₹1,116 Cr', premium: '₹1.16 Cr' },
      { grade: 'Grade C', ratePerThousand: '₹1.17', totalSA: '₹409 Cr', premium: '₹0.48 Cr' },
      { grade: 'Riders', ratePerThousand: '—', totalSA: '—', premium: '₹0.55 Cr' },
    ],
  },
  profitability: {
    combinedRatio: 78.4,
    netMargin: 14.2,
    reinsurancePct: 20.0,
  },
  scenarios: [
    {
      id: 'sc1',
      name: 'Base Case',
      premium: '₹4.82 Cr',
      discountPct: '14.1%',
      marginPct: '14.2%',
      basis: 'Standard loading',
      isComplete: true,
      needsApproval: false,
      isAtFloor: false,
    },
    {
      id: 'sc2',
      name: 'Broker Concession',
      premium: '₹4.70 Cr',
      discountPct: '16.2%',
      marginPct: '11.8%',
      basis: '2% volume discount applied',
      isComplete: true,
      needsApproval: false,
      isAtFloor: false,
    },
    {
      id: 'sc3',
      name: 'Floor Scenario',
      premium: '₹4.67 Cr',
      discountPct: '16.8%',
      marginPct: '11.1%',
      basis: 'At floor — needs approval',
      isComplete: false,
      needsApproval: true,
      isAtFloor: true,
    },
  ],
  summaryStats: {
    planCount: 4,
    scenarioCount: 3,
    grossPremium: '₹5.61 Cr',
    netPremium: '₹4.49 Cr',
  },
};
