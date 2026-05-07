// Mock Proposal fixtures spanning Proposal lifecycle states.
// Plans / census / premium are carried verbatim from the parent Quote (W2 step 1).

import type {
  AggregateCensus,
  Plan,
  QuotePremium,
} from '@/types/group-pas/common';
import type {
  Proposal,
  ProposalSummaryDto,
} from '@/types/group-pas/issuance';

const planTermLife: Plan = {
  planNo: 'PLAN-GTL-001',
  planName: 'GTL Term Life — Standard',
  rateCardFile: 'rate-cards/gtl-term-life-2026.csv',
  coverAmountFormula: {
    type: 'MULTIPLE_OF_MEMBER_ATTRIBUTE',
    multiplicationFactor: 24,
    memberAttributeName: 'salary',
  },
  freeCoverLimitFormula: { type: 'FIXED', fixedAmount: 2_000_000 },
  products: [
    {
      productCode: 'TERM-LIFE',
      productName: 'Term Life',
      productType: 'LIFE',
      benefits: [
        { code: 'DEATH_BENEFIT', name: 'Death Benefit', mandatory: true },
      ],
      exclusions: [],
    },
  ],
};

const census45: AggregateCensus = {
  headcount: 45,
  planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
};

const census120: AggregateCensus = {
  headcount: 120,
  planBreakdown: [
    { planNo: 'PLAN-GTL-001', headcount: 90 },
    { planNo: 'PLAN-GTL-002', headcount: 30 },
  ],
};

const premium = (totalInr: number): QuotePremium => ({
  amount: { amount: totalInr, currency: 'INR' },
  breakup: [
    {
      planNo: 'PLAN-GTL-001',
      amount: { amount: totalInr, currency: 'INR' },
    },
  ],
});

const dmnMapping = '{"hits":"FIRST","rules":[{"if":"true","then":"PLAN-GTL-001"}]}';

export const PROPOSALS: Proposal[] = [
  {
    id: 'PRO-2026-0001',
    quoteId: 'QTE-2026-0006',
    clientId: 'CLI-0005',
    policyType: 'GTL',
    state: 'POLICY_CREATED',
    plans: [planTermLife],
    memberToPlanMapping: dmnMapping,
    aggregateCensus: census45,
    estimatedPremium: premium(1_620_000),
    policyId: 'POL-2026-0001',
    policyNumber: 'GTL-POL-2026-0001',
  },
  {
    id: 'PRO-2026-0002',
    quoteId: 'QTE-2026-0005',
    clientId: 'CLI-0004',
    policyType: 'GTL',
    state: 'FINALIZED',
    plans: [planTermLife],
    memberToPlanMapping: dmnMapping,
    aggregateCensus: census45,
    estimatedPremium: premium(1_620_000),
  },
  {
    id: 'PRO-2026-0003',
    quoteId: 'QTE-2026-0003',
    clientId: 'CLI-0001',
    policyType: 'GTL',
    state: 'SUBMITTED',
    plans: [planTermLife],
    memberToPlanMapping: dmnMapping,
    aggregateCensus: census45,
    estimatedPremium: premium(1_620_000),
  },
  {
    id: 'PRO-2026-0004',
    quoteId: 'QTE-2026-0004',
    clientId: 'CLI-0003',
    policyType: 'GTL',
    state: 'DRAFT',
    plans: [planTermLife],
    memberToPlanMapping: dmnMapping,
    aggregateCensus: census120,
    estimatedPremium: premium(4_320_000),
  },
  {
    id: 'PRO-2026-0005',
    quoteId: 'QTE-2026-0007',
    clientId: 'CLI-0002',
    policyType: 'GTL',
    state: 'CANCELLED',
    plans: [planTermLife],
    memberToPlanMapping: dmnMapping,
    aggregateCensus: census45,
    estimatedPremium: premium(1_620_000),
  },
];

export const PROPOSAL_SUMMARIES: ProposalSummaryDto[] = PROPOSALS.map((p) => ({
  id: p.id,
  quoteId: p.quoteId,
  clientId: p.clientId,
  policyType: p.policyType,
  state: p.state,
  policyId: p.policyId ?? '',
  policyNumber: p.policyNumber ?? '',
}));
