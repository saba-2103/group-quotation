// Mock data for the Quote Detail layout exploration page.

export interface QuoteDetailMock {
  rfqId: string;
  dealName: string;
  stage: string;
  milestones: { label: string; status: 'done' | 'in_progress' | 'pending' }[];
  dealProfile: {
    policyType: string;
    inceptionDate: string;
    period: string;
    renewalType: string;
    broker: string;
    brokerContact: string;
    brokerEmail: string;
    intermediaryCode: string;
    source: string;
    salesOwner: string;
    currentStage: string;
    versions: string;
    headroom: string;
    floorRate: string;
    daysInStage: number;
  };
  keyData: {
    cin: string;
    industry: string;
    naics: string;
    address: string;
    incorporationYear: number;
    groupType: string;
    pan: string;
  };
  mphProfile: {
    industry: string;
    lives: number;
    whiteCollarPct: number;
    blueCollarPct: number;
    zones: number;
    hazardClass: 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
    hazardousRoles: boolean;
    businessType: string;
    segmentBand: 'SME' | 'MID_CORPORATE' | 'CORPORATE';
  };
  mphAppetite: {
    category: string;
    maxDiscountPct: number;
    uwAuthorityBand: string;
    preapprovedCardRef: string;
    source: 'engine-server' | 'local-mirror';
    evaluatedAt: string;
  };
  subsidiaries: { code: string; name: string; status: string }[];
  census: {
    totalLives: number;
    grades: { name: string; count: number; pct: number }[];
    avgAge: number;
    genderRatio: string;
    dependants: number;
    censusVersion: string;
    uploadedOn: string;
  };
  claimsFiles: {
    id: string;
    name: string;
    sizeKb: number;
    uploadedBy: string;
    uploadedOn: string;
    mimeType: string;
  }[];
  dispatch: {
    version: string;
    dispatchedTo: string;
    date: string;
    status: string;
  }[];
  negotiation: {
    rounds: {
      number: number;
      date: string;
      brokerAsk: string;
      ourOffer: string;
      gap: string;
    }[];
    floor: string;
    headroom: string;
  };
  versions: {
    id: string;
    label: string;
    status: string;
    planCount: number;
    grossPremium: string;
    createdOn: string;
    isActive: boolean;
    isFrozen: boolean;
  }[];
}

export const mockQuoteDetail: QuoteDetailMock = {
  rfqId: 'GTL-2024-00142',
  dealName: 'Tata Consultancy Services GTL',
  stage: 'NEGOTIATION',
  milestones: [
    { label: 'Intake', status: 'done' },
    { label: 'Data Ready', status: 'done' },
    { label: 'Plans & Pricing', status: 'done' },
    { label: 'Quote Ready', status: 'done' },
    { label: 'Finalized', status: 'in_progress' },
  ],
  dealProfile: {
    policyType: 'Group Term Life',
    inceptionDate: '01 Apr 2025',
    period: '01 Apr 2025 – 31 Mar 2026',
    renewalType: 'Annual Renewable',
    broker: 'Marsh India Insurance Brokers',
    brokerContact: 'Kavya Nair',
    brokerEmail: 'kavya@marsh.com',
    intermediaryCode: 'BRK-MH-00412',
    source: 'Direct Broker',
    salesOwner: 'Rajan Mehta (L3)',
    currentStage: 'NEGOTIATION',
    versions: '3 (1 active, 2 frozen)',
    headroom: '3.2%',
    floorRate: '₹4.67 Cr',
    daysInStage: 14,
  },
  keyData: {
    cin: 'L22210MH1995PLC084781',
    industry: 'IT Services',
    naics: '5415',
    address: 'Mumbai, Maharashtra',
    incorporationYear: 1995,
    groupType: 'Listed Entity',
    pan: 'AAACN1996G',
  },
  mphProfile: {
    industry: 'IT Services',
    lives: 12400,
    whiteCollarPct: 88,
    blueCollarPct: 12,
    zones: 4,
    hazardClass: 'LOW',
    hazardousRoles: false,
    businessType: 'NEW_BUSINESS',
    segmentBand: 'CORPORATE',
  },
  mphAppetite: {
    category: 'Large group',
    maxDiscountPct: 12,
    uwAuthorityBand: 'Underwriting L1',
    preapprovedCardRef: 'GTL-CARD-2024-LG-001',
    source: 'engine-server',
    evaluatedAt: '2025-01-12T10:34:00Z',
  },
  subsidiaries: [
    { code: 'TCSBPS', name: 'TCS BPS Ltd', status: 'ACTIVE' },
    { code: 'TCSFS', name: 'TCS Financial Solutions Ltd', status: 'ACTIVE' },
    { code: 'DILIGEN', name: 'Diligenta Ltd (UK)', status: 'LAPSED' },
  ],
  census: {
    totalLives: 12400,
    grades: [
      { name: 'Grade A (Sr. Mgmt)', count: 2730, pct: 22 },
      { name: 'Grade B (Mid-Level)', count: 5580, pct: 45 },
      { name: 'Grade C (Staff)', count: 4090, pct: 33 },
    ],
    avgAge: 34.2,
    genderRatio: '68% M / 32% F',
    dependants: 8730,
    censusVersion: 'Census v3',
    uploadedOn: '10 Jan 2025',
  },
  claimsFiles: [
    {
      id: 'cf-1',
      name: 'TCS_Claims_FY22-24.xlsx',
      sizeKb: 2400,
      uploadedBy: 'Rajan Mehta',
      uploadedOn: '05 Jan 2025',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    {
      id: 'cf-2',
      name: 'TCS_Claims_Addendum_FY23.pdf',
      sizeKb: 890,
      uploadedBy: 'Rajan Mehta',
      uploadedOn: '08 Jan 2025',
      mimeType: 'application/pdf',
    },
    {
      id: 'cf-3',
      name: 'Reinsurance_Experience_FY22.xlsx',
      sizeKb: 1100,
      uploadedBy: 'Rajan Mehta',
      uploadedOn: '08 Jan 2025',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  ],
  dispatch: [
    { version: 'V1', dispatchedTo: 'UW Team', date: '14 Jan 2025', status: 'Returned' },
    { version: 'V2', dispatchedTo: 'UW Team', date: '29 Jan 2025', status: 'Returned' },
    { version: 'V3', dispatchedTo: 'Actuary', date: '14 Feb 2025', status: 'Returned' },
  ],
  negotiation: {
    rounds: [
      { number: 1, date: '15 Jan 2025', brokerAsk: '₹4.60 Cr', ourOffer: '₹4.82 Cr', gap: '4.6%' },
      { number: 2, date: '22 Jan 2025', brokerAsk: '₹4.70 Cr', ourOffer: '₹4.75 Cr', gap: '1.0%' },
    ],
    floor: '₹4.67 Cr',
    headroom: '3.2%',
  },
  versions: [
    { id: 'v1', label: 'V1 — Base', status: 'FROZEN', planCount: 3, grossPremium: '₹4.82 Cr', createdOn: '12 Jan 2025', isActive: false, isFrozen: true },
    { id: 'v2', label: 'V2 — Enhanced', status: 'FROZEN', planCount: 3, grossPremium: '₹5.34 Cr', createdOn: '28 Jan 2025', isActive: false, isFrozen: true },
    { id: 'v3', label: 'V3 — Custom Ask', status: 'PRICED', planCount: 4, grossPremium: '₹5.61 Cr', createdOn: '14 Feb 2025', isActive: true, isFrozen: false },
  ],
};
