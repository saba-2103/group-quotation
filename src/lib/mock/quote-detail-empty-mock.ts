// Mock data for a freshly created quote — initial state.
// Reflects data already captured during the 4-step RFQ creation wizard:
//   Step 1: Client & Segment (clientName, industry, segment, broker, channel)
//   Step 2: Business Type (businessType, priorPolicy if renewal/takeover)
//   Step 3: Dates & Basis (effectiveDate, policyPeriodEnd, pricingBasis)
//   Step 4: Plan Structure (planStructure, sumAssuredBasis, gradeMapping)
//   Fixed: LoB=GTL, Scheme=EMPLOYER_OBLIGATORY, Cover=LEVEL, Lives=MEMBER_ONLY

import type { QuoteDetailMock } from './quote-detail-mock';

export const mockQuoteEmpty: QuoteDetailMock = {
  rfqId: 'GTL-2025-00198',
  dealName: 'Wipro Technologies GPA',
  stage: 'DATA_PENDING',
  milestones: [
    { label: 'Intake', status: 'in_progress' },
    { label: 'Data Ready', status: 'pending' },
    { label: 'Plans & Pricing', status: 'pending' },
    { label: 'Quote Ready', status: 'pending' },
    { label: 'Finalized', status: 'pending' },
  ],
  dealProfile: {
    policyType: 'Group Term Life',
    inceptionDate: '01 Aug 2025',
    period: '01 Aug 2025 — 31 Jul 2026',
    renewalType: 'New Business',
    broker: 'Marsh India Insurance Brokers',
    brokerContact: '—',
    brokerEmail: '—',
    brokerCode: 'BRK-0472',
    source: 'Broker',
    salesOwner: 'Priya Sharma (L2)',
    currentStage: 'DATA_PENDING',
    versions: '1 (1 draft, 0 frozen)',
    headroom: '—',
    floorRate: '—',
    daysInStage: 0,
  },
  keyData: {
    cin: '—',
    industry: 'Information Technology',
    naics: '—',
    address: '—',
    incorporationYear: 0,
    groupType: 'Employer Obligatory',
    pan: '—',
  },
  mphCategorization: {
    tier: '—',
    segment: 'Large',
    riskCategory: '—',
    mphRating: '—',
    uwTrack: '—',
    accountManager: '—',
  },
  subsidiaries: [],
  census: {
    totalLives: 0,
    grades: [],
    avgAge: 0,
    genderRatio: '—',
    dependants: 0,
    censusVersion: '—',
    uploadedOn: '—',
  },
  claimsFiles: [],
  dispatch: [],
  negotiation: {
    rounds: [],
    floor: '—',
    headroom: '—',
  },
  versions: [
    {
      id: 'v1',
      label: 'V1 — Draft',
      status: 'DRAFT',
      planCount: 0,
      grossPremium: '—',
      createdOn: '16 Jun 2025',
      isActive: true,
      isFrozen: false,
    },
  ],
};
