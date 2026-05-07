// Mock Quote fixtures spanning every QuoteStatus.
// MockQuote was previously extended with a UI-only `awaitingApproval` field
// for the maker-checker overlay; that fiction is gone (backend has no
// Quote-level approval). The alias stays so the import sites keep working
// if a future mock-only field needs to be added.

import type {
  AggregateCensus,
  AmountFormula,
  Plan,
  QuotePremium,
} from '@/types/group-pas/common';
import type {
  CensusFileFormat,
  Quote,
  QuoteSummaryDto,
} from '@/types/group-pas/quotation';

export type MockQuote = Quote;

const inrFormulaFixed = (amount: number): AmountFormula => ({
  type: 'FIXED',
  fixedAmount: amount,
});

const planTermLife: Plan = {
  planNo: 'PLAN-GTL-001',
  planName: 'GTL Term Life — Standard',
  rateCardFile: 'rate-cards/gtl-term-life-2026.csv',
  coverAmountFormula: {
    type: 'MULTIPLE_OF_MEMBER_ATTRIBUTE',
    multiplicationFactor: 24,
    memberAttributeName: 'salary',
  },
  freeCoverLimitFormula: inrFormulaFixed(2_000_000),
  products: [
    {
      productCode: 'TERM-LIFE',
      productName: 'Term Life',
      productType: 'LIFE',
      benefits: [
        { code: 'DEATH_BENEFIT', name: 'Death Benefit', mandatory: true },
        { code: 'TPD', name: 'Total & Permanent Disability', mandatory: false },
      ],
      exclusions: [
        { code: 'PRE_EXISTING', name: 'Pre-existing conditions (12 mo)' },
      ],
    },
  ],
};

const planTermLifeEnhanced: Plan = {
  ...planTermLife,
  planNo: 'PLAN-GTL-002',
  planName: 'GTL Term Life — Enhanced',
  coverAmountFormula: {
    type: 'MULTIPLE_OF_MEMBER_ATTRIBUTE',
    multiplicationFactor: 36,
    memberAttributeName: 'salary',
  },
  freeCoverLimitFormula: inrFormulaFixed(3_500_000),
};

const census120: AggregateCensus = {
  headcount: 120,
  planBreakdown: [
    { planNo: 'PLAN-GTL-001', headcount: 90 },
    { planNo: 'PLAN-GTL-002', headcount: 30 },
  ],
};

const census45: AggregateCensus = {
  headcount: 45,
  planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
};

const censusFileFormat: CensusFileFormat = {
  fileType: 'XLSX',
  sheetName: 'Members',
  schemaJson: JSON.stringify({
    fields: [
      { name: 'name', type: 'string' },
      { name: 'dob', type: 'date' },
      { name: 'gender', type: 'string' },
      { name: 'salary', type: 'number' },
      { name: 'occupation', type: 'string' },
      { name: 'planNo', type: 'string' },
    ],
  }),
};

const premium = (totalInr: number): QuotePremium => ({
  amount: { amount: totalInr, currency: 'INR' },
  breakup: [
    {
      planNo: 'PLAN-GTL-001',
      amount: { amount: Math.round(totalInr * 0.7), currency: 'INR' },
    },
    {
      planNo: 'PLAN-GTL-002',
      amount: { amount: Math.round(totalInr * 0.3), currency: 'INR' },
    },
  ],
});

export const QUOTES: MockQuote[] = [
  {
    id: 'QTE-2026-0001',
    clientId: 'CLI-0001',
    policyType: 'GTL',
    status: 'DRAFT',
    plans: [planTermLife],
    aggregateCensus: census120,
    censusFileFormat,
    memberToPlanMapping: '',
    premiumType: 'ANNUAL',
    effectiveDate: '2026-06-01',
    expiryDate: '2027-05-31',
    inceptionDate: '2026-06-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0002',
    clientId: 'CLI-0002',
    policyType: 'GTL',
    status: 'DRAFT',
    plans: [planTermLife, planTermLifeEnhanced],
    aggregateCensus: census120,
    censusFileFormat,
    memberToPlanMapping:
      '{"hits":"FIRST","rules":[{"if":"salary > 1500000","then":"PLAN-GTL-002"},{"if":"true","then":"PLAN-GTL-001"}]}',
    premium: premium(4_320_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-07-01',
    expiryDate: '2027-06-30',
    inceptionDate: '2026-07-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0003',
    clientId: 'CLI-0001',
    policyType: 'GTL',
    status: 'SUBMITTED',
    plans: [planTermLife],
    aggregateCensus: census45,
    censusFileFormat,
    memberToPlanMapping:
      '{"hits":"FIRST","rules":[{"if":"true","then":"PLAN-GTL-001"}]}',
    premium: premium(1_620_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-06-15',
    expiryDate: '2027-06-14',
    inceptionDate: '2026-06-15',
    ageDefinitionRule: 'ANB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0004',
    clientId: 'CLI-0003',
    policyType: 'GTL',
    status: 'SENT_TO_CLIENT',
    plans: [planTermLife, planTermLifeEnhanced],
    aggregateCensus: census120,
    censusFileFormat,
    memberToPlanMapping:
      '{"hits":"FIRST","rules":[{"if":"salary > 1500000","then":"PLAN-GTL-002"},{"if":"true","then":"PLAN-GTL-001"}]}',
    premium: premium(4_320_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-08-01',
    expiryDate: '2027-07-31',
    inceptionDate: '2026-08-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0005',
    clientId: 'CLI-0004',
    policyType: 'GTL',
    status: 'ACCEPTED',
    plans: [planTermLife],
    aggregateCensus: census45,
    censusFileFormat,
    memberToPlanMapping:
      '{"hits":"FIRST","rules":[{"if":"true","then":"PLAN-GTL-001"}]}',
    premium: premium(1_620_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-06-01',
    expiryDate: '2027-05-31',
    inceptionDate: '2026-06-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0006',
    clientId: 'CLI-0005',
    policyType: 'GTL',
    status: 'FINALIZED',
    plans: [planTermLife],
    aggregateCensus: census45,
    censusFileFormat,
    memberToPlanMapping:
      '{"hits":"FIRST","rules":[{"if":"true","then":"PLAN-GTL-001"}]}',
    premium: premium(1_620_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-05-01',
    expiryDate: '2027-04-30',
    inceptionDate: '2026-05-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0007',
    clientId: 'CLI-0002',
    policyType: 'GTL',
    status: 'REJECTED',
    plans: [planTermLifeEnhanced],
    aggregateCensus: census45,
    censusFileFormat,
    memberToPlanMapping: '',
    premium: premium(2_400_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    inceptionDate: '2026-04-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0008',
    clientId: 'CLI-0003',
    policyType: 'GTL',
    status: 'WITHDRAWN',
    plans: [planTermLife],
    aggregateCensus: census45,
    censusFileFormat,
    memberToPlanMapping: '',
    premiumType: 'ANNUAL',
    effectiveDate: '2026-04-15',
    expiryDate: '2027-04-14',
    inceptionDate: '2026-04-15',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0009',
    clientId: 'CLI-0004',
    policyType: 'GTL',
    status: 'EXPIRED',
    plans: [planTermLife],
    aggregateCensus: census45,
    censusFileFormat,
    memberToPlanMapping:
      '{"hits":"FIRST","rules":[{"if":"true","then":"PLAN-GTL-001"}]}',
    premium: premium(1_620_000),
    premiumType: 'ANNUAL',
    effectiveDate: '2026-03-01',
    expiryDate: '2027-02-28',
    inceptionDate: '2026-03-01',
    ageDefinitionRule: 'ALB',
    riskTermClassification: 'YEARLY_RENEWABLE',
    lineOfBusiness: 'GROUP',
  },
  {
    id: 'QTE-2026-0010',
    clientId: 'CLI-0005',
    policyType: 'GTL',
    status: 'DRAFT',
    plans: [],
    aggregateCensus: undefined,
    censusFileFormat: undefined,
    memberToPlanMapping: undefined,
    premiumType: undefined,
  },
];

export const QUOTE_SUMMARIES: QuoteSummaryDto[] = QUOTES.map((q) => ({
  id: q.id,
  clientId: q.clientId,
  policyType: q.policyType,
  status: q.status,
  headcount: q.aggregateCensus?.headcount ?? 0,
  premiumAmount: q.premium?.amount ?? { amount: 0, currency: 'INR' },
}));
