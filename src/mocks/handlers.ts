import { http, HttpResponse } from 'msw';
import type {
  RfqBase,
  RfqBundle,
  Plan,
  Document as RfqDocument,
  HandoffTask,
  Subsidiary,
  Member,
  CensusSummary,
  ClaimsExperience,
} from '@/lib/types';
import {
  RfqStatus,
  BusinessType,
  SchemeType,
  LobType,
  ParticipationType,
  SchemeUsage,
  IntermediaryType,
  QuoteSegment,
  SumAssuredBasis,
  CoverPattern,
  TermBasis,
  LivesCovered,
  VersionStatus,
  PlanHandoffStatus,
  NegotiationParty,
  NegotiationKind,
  FclPattern,
  DocumentType,
  DocumentStatus,
  PricingBasis,
  PlanStructure,
  CensusQuality,
  HandoffKind,
  HandoffStatus,
} from '@/lib/types';

// ─── In-memory store ──────────────────────────────────────────────────────────

const rfqs: Record<string, RfqBase> = {
  'rfq-001': {
    rfqId: 'rfq-001',
    employerName: 'Acme Manufacturing Pvt Ltd',
    industry: 'Manufacturing',
    statusStage: RfqStatus.DATA_PENDING,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Marsh India',
    brokerCode: 'BRK-001',
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-07-01',
    policyConfig: {
      gracePeriodDays: 30,
      billingFrequency: 'ANNUAL',
      collectionMethod: 'CHEQUE',
      subsidiariesEnabled: false,
    },
    defaultPlanStructure: {
      planStructure: PlanStructure.SINGLE_PLAN,
      sumAssuredBasis: SumAssuredBasis.FLAT,
      gradeMapping: false,
      pricingBasis: PricingBasis.MANUAL,
    },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v1-001',
    quoteVersions: [
      {
        id: 'v1-001',
        versionNo: 1,
        name: 'Version 1',
        status: VersionStatus.DRAFT,
        createdAt: '2026-06-01T09:00:00Z',
      },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    updatedAt: '2026-06-01T09:00:00Z',
    createdAt: '2026-06-01T09:00:00Z',
  },

  'rfq-002': {
    rfqId: 'rfq-002',
    employerName: 'Bharat Steel Corp',
    industry: 'Steel & Metals',
    statusStage: RfqStatus.NEGOTIATION,
    businessType: BusinessType.RENEWAL,
    schemeType: SchemeType.EMPLOYER_VOLUNTARY,
    lob: LobType.GTL,
    participationType: ParticipationType.VOLUNTARY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Aon India',
    brokerCode: 'BRK-002',
    quoteSegment: QuoteSegment.LARGE,
    effectiveDate: '2026-08-01',
    policyConfig: {
      gracePeriodDays: 30,
      billingFrequency: 'ANNUAL',
      collectionMethod: 'NEFT',
      subsidiariesEnabled: true,
    },
    defaultPlanStructure: {
      planStructure: PlanStructure.MULTI_PLAN,
      sumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
      gradeMapping: true,
      defaultPlanCount: 3,
      pricingBasis: PricingBasis.BLEND,
    },
    priorPolicy: {
      insurer: 'LIC of India',
      masterPolicyNumber: 'GTL/2025/000099',
      premium: 4200000,
      lossRatio: 0.72,
      experienceAvailable: true,
      experienceYears: 3,
    },
    sumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v2-002',
    quoteVersions: [
      {
        id: 'v1-002',
        versionNo: 1,
        name: 'Version 1',
        status: VersionStatus.SELECTED,
        validationReceipt: {
          configHash: 'abc123def456',
          productPins: [
            { productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-gtl-base' },
          ],
          validatedAt: '2026-06-05T10:00:00Z',
        },
        createdAt: '2026-05-15T09:00:00Z',
      },
      {
        id: 'v2-002',
        versionNo: 2,
        name: 'Version 2 – Revised',
        status: VersionStatus.DRAFT,
        createdAt: '2026-06-08T11:00:00Z',
      },
    ],
    negotiationLog: [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'v1-002',
        askDiscountPct: 10,
        note: 'Requesting 10% discount based on prior LR',
        by: 'broker@aonindia.com',
        at: '2026-06-09T10:00:00Z',
      },
      {
        roundNo: 2,
        party: NegotiationParty.INSURER,
        kind: NegotiationKind.COUNTER,
        versionId: 'v1-002',
        askDiscountPct: 8,
        note: 'Max we can offer at current technical rates is 8%',
        by: 'uw@insurer.com',
        at: '2026-06-10T14:00:00Z',
      },
      {
        roundNo: 3,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'v2-002',
        askDiscountPct: 9,
        note: 'Splitting the difference at 9%',
        by: 'broker@aonindia.com',
        at: '2026-06-11T09:30:00Z',
      },
    ],
    gradeAllocations: {
      'v1-002': { G1: 'plan-001', G2: 'plan-002', G3: 'plan-003' },
    },
    actuaryPricing: {
      byVersion: {
        'v1-002': {
          technicalPremium: 4800000,
          breakEvenFloor: 4200000,
          negotiatedPremium: 4416000,
          modelFactor: 1.02,
          feasible: true,
          finalPremiumInclGst: 5210880,
          perLifePremium: 4013.6,
          lives: 1200,
          pricedAt: '2026-06-07T08:00:00Z',
          byPlan: {
            'plan-001': { planId: 'plan-001', premium: 1800000, lives: 450, effectiveDiscountPct: 8 },
            'plan-002': { planId: 'plan-002', premium: 1500000, lives: 400, effectiveDiscountPct: 8 },
            'plan-003': { planId: 'plan-003', premium: 1116000, lives: 350, effectiveDiscountPct: 8 },
          },
        },
      },
    },
    mphAppetite: {
      category: 'LARGE',
      maxDiscountPct: 12,
      uwAuthorityBand: 'SALES_L2',
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    censusSummary: {
      totalLives: 1200,
      quality: { trafficLight: CensusQuality.G },
    },
    salesOwner: { userId: 'usr-101', name: 'Arjun Sharma' },
    updatedAt: '2026-06-11T10:00:00Z',
    createdAt: '2026-05-15T09:00:00Z',
  },

  'rfq-003': {
    rfqId: 'rfq-003',
    employerName: 'Chennai Textiles Ltd',
    industry: 'Textiles',
    statusStage: RfqStatus.ISSUED,
    businessType: BusinessType.TAKEOVER,
    schemeType: SchemeType.AFFINITY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.CORPORATE_AGENT,
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-06-01',
    policyConfig: {
      gracePeriodDays: 15,
      billingFrequency: 'ANNUAL',
      collectionMethod: 'NEFT',
      subsidiariesEnabled: false,
    },
    defaultPlanStructure: {
      planStructure: PlanStructure.MULTI_PLAN,
      sumAssuredBasis: SumAssuredBasis.FLAT,
      gradeMapping: false,
      defaultPlanCount: 2,
      pricingBasis: PricingBasis.EXPERIENCE,
    },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v1-003',
    quoteVersions: [
      {
        id: 'v1-003',
        versionNo: 1,
        name: 'Version 1',
        status: VersionStatus.FROZEN,
        validationReceipt: {
          configHash: 'xyz789uvw012',
          productPins: [
            { productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-gtl-base' },
          ],
          validatedAt: '2026-05-28T10:00:00Z',
        },
        createdAt: '2026-05-20T09:00:00Z',
      },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v1-003': {
          technicalPremium: 900000,
          breakEvenFloor: 780000,
          negotiatedPremium: 855000,
          modelFactor: 1.0,
          feasible: true,
          finalPremiumInclGst: 1008900,
          perLifePremium: 1900,
          lives: 450,
          pricedAt: '2026-05-27T08:00:00Z',
          byPlan: {
            'plan-004': { planId: 'plan-004', premium: 450000, lives: 225, effectiveDiscountPct: 5 },
            'plan-005': { planId: 'plan-005', premium: 405000, lives: 225, effectiveDiscountPct: 5 },
          },
        },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.OVERALL, byVersion: {} },
    masterPolicyNumber: 'GTL/2026/001234',
    issuedAt: '2026-06-01T00:00:00Z',
    salesOwner: { userId: 'usr-102', name: 'Priya Nair' },
    censusSummary: {
      totalLives: 450,
      quality: { trafficLight: CensusQuality.G },
    },
    updatedAt: '2026-06-01T12:00:00Z',
    createdAt: '2026-05-20T09:00:00Z',
  },

  'rfq-004': {
    rfqId: 'rfq-004',
    employerName: 'Indira Pharma Ltd',
    industry: 'Pharmaceuticals',
    statusStage: RfqStatus.UW_REVIEW,
    businessType: BusinessType.RENEWAL,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Willis Towers Watson',
    brokerCode: 'BRK-004',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-09-01',
    policyConfig: {
      gracePeriodDays: 30,
      billingFrequency: 'ANNUAL',
      collectionMethod: 'NEFT',
      subsidiariesEnabled: true,
    },
    defaultPlanStructure: {
      planStructure: PlanStructure.MULTI_PLAN,
      sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
      gradeMapping: true,
      defaultPlanCount: 3,
      pricingBasis: PricingBasis.BLEND,
    },
    priorPolicy: {
      insurer: 'Star Union Dai-ichi',
      masterPolicyNumber: 'GTL/2025/007788',
      premium: 2800000,
      lossRatio: 0.68,
      experienceAvailable: true,
      experienceYears: 2,
    },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-004',
    quoteVersions: [
      {
        id: 'v1-004',
        versionNo: 1,
        name: 'Initial Draft',
        note: 'First pass — aggregate census only, rates TBC.',
        status: VersionStatus.ARCHIVED,
        createdAt: '2026-04-10T09:00:00Z',
      },
      {
        id: 'v2-004',
        versionNo: 2,
        name: 'Revised — Post Census Clean',
        note: 'Census cleaned; lives adjusted from 820 to 790.',
        status: VersionStatus.ARCHIVED,
        createdAt: '2026-05-02T11:00:00Z',
      },
      {
        id: 'v3-004',
        versionNo: 3,
        name: 'Broker Submission',
        note: 'Submitted to WTW for broker review; awaiting client sign-off.',
        status: VersionStatus.SHARED,
        createdAt: '2026-05-20T09:30:00Z',
      },
      {
        id: 'v4-004',
        versionNo: 4,
        name: 'Counter — 8% Discount',
        note: 'Insurer counter at 8%; broker requested 12%.',
        status: VersionStatus.DRAFT,
        createdAt: '2026-06-03T14:00:00Z',
      },
      {
        id: 'v5-004',
        versionNo: 5,
        name: 'UW Referred Version',
        note: 'Escalated to UW desk for large-loss loading decision.',
        status: VersionStatus.DRAFT,
        createdAt: '2026-06-10T10:00:00Z',
      },
    ],
    negotiationLog: [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'v3-004',
        askDiscountPct: 12,
        note: 'Client expects renewal parity with 2025 rates + 12% reduction.',
        by: 'broker@wtw.com',
        at: '2026-05-25T10:00:00Z',
      },
      {
        roundNo: 2,
        party: NegotiationParty.INSURER,
        kind: NegotiationKind.COUNTER,
        versionId: 'v4-004',
        askDiscountPct: 8,
        note: 'Large-loss loading of ₹4.5L clips technical margin. Best offer is 8%.',
        by: 'uw@insurer.com',
        at: '2026-06-04T09:00:00Z',
      },
    ],
    gradeAllocations: {
      'v3-004': { G1: 'plan-006', G2: 'plan-007', G3: 'plan-008' },
      'v4-004': { G1: 'plan-006', G2: 'plan-007', G3: 'plan-008' },
    },
    actuaryPricing: {
      byVersion: {
        'v3-004': {
          technicalPremium: 3100000,
          breakEvenFloor: 2700000,
          negotiatedPremium: 2728000,
          modelFactor: 0.98,
          feasible: true,
          finalPremiumInclGst: 3219040,
          perLifePremium: 4074.7,
          lives: 790,
          pricedAt: '2026-05-19T08:00:00Z',
          byPlan: {
            'plan-006': { planId: 'plan-006', premium: 1200000, lives: 320, effectiveDiscountPct: 8 },
            'plan-007': { planId: 'plan-007', premium: 900000, lives: 270, effectiveDiscountPct: 8 },
            'plan-008': { planId: 'plan-008', premium: 628000, lives: 200, effectiveDiscountPct: 8 },
          },
        },
        'v4-004': {
          technicalPremium: 3100000,
          breakEvenFloor: 2700000,
          negotiatedPremium: 2852000,
          modelFactor: 1.01,
          feasible: true,
          finalPremiumInclGst: 3365360,
          perLifePremium: 4260.0,
          lives: 790,
          pricedAt: '2026-06-03T13:00:00Z',
          byPlan: {
            'plan-006': { planId: 'plan-006', premium: 1260000, lives: 320, effectiveDiscountPct: 6 },
            'plan-007': { planId: 'plan-007', premium: 945000, lives: 270, effectiveDiscountPct: 6 },
            'plan-008': { planId: 'plan-008', premium: 647000, lives: 200, effectiveDiscountPct: 6 },
          },
        },
      },
    },
    mphAppetite: {
      category: 'MID',
      maxDiscountPct: 10,
      uwAuthorityBand: 'SALES_L2',
      preapprovedCardRef: 'CARD-MID-2026-004',
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    censusSummary: {
      totalLives: 790,
      quality: { trafficLight: CensusQuality.A },
    },
    salesOwner: { userId: 'usr-103', name: 'Karan Malhotra' },
    updatedAt: '2026-06-10T10:00:00Z',
    createdAt: '2026-04-10T09:00:00Z',
  },
};

const plans: Record<string, Plan> = {
  'plan-001': {
    planId: 'plan-001',
    rfqId: 'rfq-002',
    quoteVersionId: 'v1-002',
    name: 'Grade A – Executive',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.PRICED,
    completeness: 100,
  },
  'plan-002': {
    planId: 'plan-002',
    rfqId: 'rfq-002',
    quoteVersionId: 'v1-002',
    name: 'Grade B – Manager',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.PRICING_REQUESTED,
    completeness: 60,
  },
  'plan-003': {
    planId: 'plan-003',
    rfqId: 'rfq-002',
    quoteVersionId: 'v1-002',
    name: 'Grade C – Staff',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.UW_REFERRED,
    completeness: 40,
  },
  'plan-004': {
    planId: 'plan-004',
    rfqId: 'rfq-003',
    quoteVersionId: 'v1-003',
    name: 'Plan A',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.PRICED,
    completeness: 100,
  },
  'plan-005': {
    planId: 'plan-005',
    rfqId: 'rfq-003',
    quoteVersionId: 'v1-003',
    name: 'Plan B',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Terminal Illness Rider'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.PRICED,
    completeness: 100,
  },
  'plan-006': {
    planId: 'plan-006',
    rfqId: 'rfq-004',
    quoteVersionId: 'v3-004',
    name: 'Grade A — Senior Staff',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [{ code: 'PRE_EXIST_12M', label: 'Pre-existing (12 mo)', byDesk: 'UW', reason: 'Standard exclusion' }],
    handoffStatus: PlanHandoffStatus.UW_REFERRED,
    completeness: 85,
  },
  'plan-007': {
    planId: 'plan-007',
    rfqId: 'rfq-004',
    quoteVersionId: 'v3-004',
    name: 'Grade B — Mid Level',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.PRICED,
    completeness: 100,
  },
  'plan-008': {
    planId: 'plan-008',
    rfqId: 'rfq-004',
    quoteVersionId: 'v3-004',
    name: 'Grade C — Shop Floor',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.PRICING_REQUESTED,
    completeness: 60,
  },
};

const documents: Record<string, RfqDocument[]> = {
  'rfq-001': [],
  'rfq-002': [],
  'rfq-004': [
    {
      documentId: 'doc-003',
      rfqId: 'rfq-004',
      type: DocumentType.SIGNED_PROPOSAL,
      status: DocumentStatus.DRAFT,
      name: 'Proposal Form — Indira Pharma.pdf',
      uploadedAt: '2026-04-15T11:00:00Z',
      source: 'upload',
    },
  ],
  'rfq-003': [
    {
      documentId: 'doc-001',
      rfqId: 'rfq-003',
      type: DocumentType.SIGNED_PROPOSAL,
      status: DocumentStatus.SIGNED,
      name: 'Signed Proposal Form.pdf',
      uploadedAt: '2026-05-28T10:00:00Z',
      source: 'upload',
    },
    {
      documentId: 'doc-002',
      rfqId: 'rfq-003',
      type: DocumentType.FINAL_PLACEMENT_LETTER,
      status: DocumentStatus.APPROVED,
      name: 'Final Placement Letter.pdf',
      uploadedAt: '2026-06-01T09:00:00Z',
      source: 'generated',
    },
  ],
};

const handoffs: Record<string, HandoffTask> = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function now(): string {
  return new Date().toISOString();
}

function plansForRfq(rfqId: string): Plan[] {
  return Object.values(plans).filter((p) => p.rfqId === rfqId);
}

function docsForRfq(rfqId: string): RfqDocument[] {
  return documents[rfqId] ?? [];
}

const subsidiaries: Record<string, Subsidiary[]> = {
  'rfq-001': [],
  'rfq-002': [],
  'rfq-003': [],
  'rfq-004': [],
};

function subsForRfq(rfqId: string): Subsidiary[] {
  return subsidiaries[rfqId] ?? [];
}

const members: Record<string, Member[]> = {
  'rfq-001': [],
  'rfq-002': Array.from({ length: 5 }, (_, i) => ({
    memberNumber: `MBR-002-${String(i + 1).padStart(3, '0')}`,
    rfqId: 'rfq-002',
    name: ['Arjun Sharma', 'Priya Nair', 'Rahul Mehta', 'Sneha Patel', 'Vikram Reddy'][i],
    dateOfBirth: ['1980-05-12', '1975-08-22', '1990-03-15', '1985-11-30', '1978-07-04'][i],
    gender: ['M', 'F', 'M', 'F', 'M'][i],
    grade: ['G1', 'G1', 'G2', 'G2', 'G3'][i],
    salary: [1800000, 1600000, 900000, 850000, 600000][i],
    sumAssured: [3600000, 3200000, 1800000, 1700000, 1200000][i],
    coverages: [],
  })),
  'rfq-003': Array.from({ length: 3 }, (_, i) => ({
    memberNumber: `MBR-003-${String(i + 1).padStart(3, '0')}`,
    rfqId: 'rfq-003',
    name: ['Ravi Kumar', 'Anjali Singh', 'Deepak Verma'][i],
    dateOfBirth: ['1982-01-15', '1979-06-20', '1988-03-10'][i],
    gender: ['M', 'F', 'M'][i],
    grade: ['G1', 'G1', 'G2'][i],
    salary: [500000, 480000, 350000][i],
    sumAssured: [1000000, 960000, 700000][i],
    coverages: [],
  })),
  'rfq-004': Array.from({ length: 6 }, (_, i) => ({
    memberNumber: `MBR-004-${String(i + 1).padStart(3, '0')}`,
    rfqId: 'rfq-004',
    name: ['Karan Malhotra', 'Divya Rao', 'Suresh Iyer', 'Meena Krishnan', 'Amit Joshi', 'Pooja Desai'][i],
    dateOfBirth: ['1978-03-22', '1983-07-14', '1980-11-05', '1976-09-30', '1985-04-18', '1990-12-01'][i],
    gender: ['M', 'F', 'M', 'F', 'M', 'F'][i],
    grade: ['G1', 'G1', 'G2', 'G2', 'G3', 'G3'][i],
    salary: [2200000, 2000000, 1100000, 1050000, 700000, 650000][i],
    sumAssured: [6600000, 6000000, 3300000, 3150000, 2100000, 1950000][i],
    coverages: [],
  })),
};

function membersForRfq(rfqId: string): Member[] {
  return members[rfqId] ?? [];
}

const claimsExp: Record<string, ClaimsExperience> = {
  'rfq-002': {
    rfqId: 'rfq-002',
    years: [
      { year: 2023, lives: 1100, premium: 4100000, claims: 2952000, lossRatio: 0.72 },
      { year: 2024, lives: 1150, premium: 4200000, claims: 3024000, lossRatio: 0.72 },
      { year: 2025, lives: 1200, premium: 4300000, claims: 3096000, lossRatio: 0.72 },
    ],
    largeLosses: [
      { id: 'll-001', year: 2024, amount: 450000, cause: 'Cardiac', note: 'Single critical illness' },
    ],
  },
  'rfq-004': {
    rfqId: 'rfq-004',
    years: [
      { year: 2024, lives: 820, premium: 2600000, claims: 1768000, lossRatio: 0.68 },
      { year: 2025, lives: 790, premium: 2800000, claims: 1904000, lossRatio: 0.68 },
    ],
    largeLosses: [
      { id: 'll-002', year: 2025, amount: 450000, cause: 'Road accident', note: 'Group 1 employee fatality' },
      { id: 'll-003', year: 2025, amount: 310000, cause: 'Cancer', note: 'Critical illness — G2' },
    ],
  },
};

function buildBundle(rfqId: string): RfqBundle {
  const base = rfqs[rfqId];
  return {
    ...base,
    plans: plansForRfq(rfqId),
    members: membersForRfq(rfqId),
    subsidiaries: subsForRfq(rfqId),
    documents: docsForRfq(rfqId),
    claimsExperience: claimsExp[rfqId],
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // Health
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),

  // GET /api/rfqs
  http.get('/api/rfqs', () => HttpResponse.json(Object.values(rfqs))),

  // POST /api/rfqs
  http.post('/api/rfqs', async ({ request }) => {
    const payload = (await request.json()) as Partial<RfqBase>;
    const rfqId = `rfq-${uid()}`;
    const timestamp = now();
    const newRfq: RfqBase = {
      rfqId,
      employerName: payload.employerName ?? 'New RFQ',
      statusStage: RfqStatus.DATA_PENDING,
      businessType: payload.businessType ?? BusinessType.NEW,
      schemeType: payload.schemeType ?? SchemeType.EMPLOYER_OBLIGATORY,
      lob: LobType.GTL,
      participationType: payload.participationType ?? ParticipationType.COMPULSORY,
      schemeUsage: payload.schemeUsage ?? SchemeUsage.EMPLOYER_EMPLOYEE,
      policyConfig: payload.policyConfig ?? {
        gracePeriodDays: 30,
        billingFrequency: 'ANNUAL',
        collectionMethod: 'NEFT',
        subsidiariesEnabled: false,
      },
      defaultPlanStructure: payload.defaultPlanStructure ?? {
        planStructure: PlanStructure.SINGLE_PLAN,
        sumAssuredBasis: SumAssuredBasis.FLAT,
        gradeMapping: false,
        pricingBasis: PricingBasis.MANUAL,
      },
      sumAssuredBasis: payload.sumAssuredBasis ?? SumAssuredBasis.FLAT,
      coverPattern: payload.coverPattern ?? CoverPattern.LEVEL,
      termBasis: payload.termBasis ?? TermBasis.POLICY_YEAR,
      livesCovered: payload.livesCovered ?? LivesCovered.MEMBER_ONLY,
      activeVersionId: `v1-${rfqId}`,
      quoteVersions: [
        {
          id: `v1-${rfqId}`,
          versionNo: 1,
          name: 'Version 1',
          status: VersionStatus.DRAFT,
          createdAt: timestamp,
        },
      ],
      negotiationLog: [],
      gradeAllocations: {},
      actuaryPricing: { byVersion: {} },
      fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
      ...payload,
    } as RfqBase;
    // Enforce immutable identity fields after spread
    newRfq.rfqId = rfqId;
    newRfq.createdAt = timestamp;
    newRfq.updatedAt = timestamp;
    rfqs[rfqId] = newRfq;
    documents[rfqId] = [];
    return HttpResponse.json({ rfqId }, { status: 201 });
  }),

  // GET /api/rfqs/:rfqId/bundle
  http.get('/api/rfqs/:rfqId/bundle', ({ params }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(buildBundle(rfqId));
  }),

  // PUT /api/rfqs/:rfqId
  http.put('/api/rfqs/:rfqId', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const patch = (await request.json()) as Partial<RfqBase>;
    rfqs[rfqId] = { ...rfqs[rfqId], ...patch, rfqId, updatedAt: now() };
    return HttpResponse.json(rfqs[rfqId]);
  }),

  // DELETE /api/rfqs/:rfqId
  http.delete('/api/rfqs/:rfqId', ({ params }) => {
    const { rfqId } = params as { rfqId: string };
    delete rfqs[rfqId];
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/rfqs/:rfqId/issue
  http.post('/api/rfqs/:rfqId/issue', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const payload = (await request.json()) as { masterPolicyNumber: string; issuedAt: string };
    rfqs[rfqId] = {
      ...rfqs[rfqId],
      statusStage: RfqStatus.ISSUED,
      masterPolicyNumber: payload.masterPolicyNumber,
      issuedAt: payload.issuedAt,
      updatedAt: now(),
    };
    return HttpResponse.json(rfqs[rfqId]);
  }),

  // POST /api/rfqs/:rfqId/advance
  http.post('/api/rfqs/:rfqId/advance', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const { stage } = (await request.json()) as { stage: RfqStatus };
    rfqs[rfqId] = { ...rfqs[rfqId], statusStage: stage, updatedAt: now() };
    return HttpResponse.json(rfqs[rfqId]);
  }),

  // POST /api/rfqs/:rfqId/dispatch
  http.post('/api/rfqs/:rfqId/dispatch', ({ params }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ success: true });
  }),

  // POST /api/rfqs/:rfqId/documents
  http.post('/api/rfqs/:rfqId/documents', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const payload = (await request.json()) as Omit<RfqDocument, 'documentId' | 'rfqId' | 'uploadedAt'>;
    const doc: RfqDocument = {
      ...payload,
      documentId: `doc-${uid()}`,
      rfqId,
      uploadedAt: now(),
    };
    if (!documents[rfqId]) documents[rfqId] = [];
    documents[rfqId].push(doc);
    return HttpResponse.json(doc, { status: 201 });
  }),

  // DELETE /api/rfqs/:rfqId/documents/:documentId
  http.delete('/api/rfqs/:rfqId/documents/:documentId', ({ params }) => {
    const { rfqId, documentId } = params as { rfqId: string; documentId: string };
    if (documents[rfqId]) {
      documents[rfqId] = documents[rfqId].filter((d) => d.documentId !== documentId);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/rfqs/:rfqId/plans
  http.post('/api/rfqs/:rfqId/plans', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const payload = (await request.json()) as Partial<Plan>;
    const planId = `plan-${uid()}`;
    const plan: Plan = {
      planId,
      rfqId,
      quoteVersionId: payload.quoteVersionId ?? rfqs[rfqId].activeVersionId,
      name: payload.name ?? 'New Plan',
      sumAssuredBasis: payload.sumAssuredBasis ?? rfqs[rfqId].sumAssuredBasis,
      coverPattern: payload.coverPattern ?? rfqs[rfqId].coverPattern,
      benefits: payload.benefits ?? [],
      excludedClauses: payload.excludedClauses ?? [],
      handoffStatus: PlanHandoffStatus.DRAFT,
      completeness: 0,
      ...payload,
    } as Plan;
    // Enforce immutable identity fields after spread
    plan.planId = planId;
    plan.rfqId = rfqId;
    plans[planId] = plan;
    return HttpResponse.json(plan, { status: 201 });
  }),

  // PUT /api/rfqs/:rfqId/plans/:planId
  http.put('/api/rfqs/:rfqId/plans/:planId', async ({ params, request }) => {
    const { planId } = params as { rfqId: string; planId: string };
    if (!plans[planId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const patch = (await request.json()) as Partial<Plan>;
    plans[planId] = { ...plans[planId], ...patch, planId };
    return HttpResponse.json(plans[planId]);
  }),

  // DELETE /api/rfqs/:rfqId/plans/:planId
  http.delete('/api/rfqs/:rfqId/plans/:planId', ({ params }) => {
    const { planId } = params as { rfqId: string; planId: string };
    delete plans[planId];
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/handoffs
  http.get('/api/handoffs', () => HttpResponse.json(Object.values(handoffs))),

  // POST /api/handoffs
  http.post('/api/handoffs', async ({ request }) => {
    const task = (await request.json()) as HandoffTask;
    const taskId = task.taskId || `task-${uid()}`;
    handoffs[taskId] = { ...task, taskId };
    return HttpResponse.json(handoffs[taskId], { status: 201 });
  }),

  // DELETE /api/handoffs/:taskId
  http.delete('/api/handoffs/:taskId', ({ params }) => {
    const { taskId } = params as { taskId: string };
    delete handoffs[taskId];
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/rfqs/:rfqId/pricing-macro
  http.post('/api/rfqs/:rfqId/pricing-macro', ({ params }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const csv = `rfqId,version,premium\n${rfqId},v1,0\n`;
    return new HttpResponse(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv' },
    });
  }),

  // POST /api/rfqs/:rfqId/members
  http.post('/api/rfqs/:rfqId/members', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const body = (await request.json()) as Partial<Member>;
    const memberNumber = `MBR-${uid()}`;
    const member: Member = {
      memberNumber,
      rfqId,
      name: body.name ?? 'Unknown',
      dateOfBirth: body.dateOfBirth ?? '',
      gender: body.gender ?? 'M',
      grade: body.grade ?? '',
      salary: body.salary ?? 0,
      sumAssured: body.sumAssured ?? 0,
      coverages: [],
    };
    if (!members[rfqId]) members[rfqId] = [];
    members[rfqId].push(member);
    rfqs[rfqId].updatedAt = now();
    // Update censusSummary lives count
    rfqs[rfqId].censusSummary = {
      ...rfqs[rfqId].censusSummary,
      totalLives: members[rfqId].length,
      quality: rfqs[rfqId].censusSummary?.quality ?? { trafficLight: CensusQuality.A },
    } as CensusSummary;
    return HttpResponse.json(member, { status: 201 });
  }),

  // PUT /api/rfqs/:rfqId/members/:memberNumber
  http.put('/api/rfqs/:rfqId/members/:memberNumber', async ({ params, request }) => {
    const { rfqId, memberNumber } = params as { rfqId: string; memberNumber: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const arr = members[rfqId] ?? [];
    const idx = arr.findIndex((m) => m.memberNumber === memberNumber);
    if (idx === -1) return HttpResponse.json({ error: 'Member not found' }, { status: 404 });
    const patch = (await request.json()) as Partial<Member>;
    arr[idx] = { ...arr[idx], ...patch, memberNumber, rfqId };
    rfqs[rfqId].updatedAt = now();
    return HttpResponse.json(arr[idx]);
  }),

  // PUT /api/rfqs/:rfqId/census-summary  — update quality summary
  http.put('/api/rfqs/:rfqId/census-summary', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const patch = (await request.json()) as Partial<CensusSummary>;
    rfqs[rfqId].censusSummary = { ...rfqs[rfqId].censusSummary, ...patch } as CensusSummary;
    rfqs[rfqId].updatedAt = now();
    return HttpResponse.json(rfqs[rfqId].censusSummary);
  }),

  // PUT /api/rfqs/:rfqId/claims-experience
  http.put('/api/rfqs/:rfqId/claims-experience', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const patch = (await request.json()) as Partial<ClaimsExperience>;
    const existing = claimsExp[rfqId] ?? { rfqId, years: [], largeLosses: [] };
    claimsExp[rfqId] = { ...existing, ...patch, rfqId };
    rfqs[rfqId].updatedAt = now();
    return HttpResponse.json(claimsExp[rfqId]);
  }),

  // POST /api/rfqs/:rfqId/members/bulk  — bulk import
  http.post('/api/rfqs/:rfqId/members/bulk', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const body = (await request.json()) as { members: Partial<Member>[] };
    const imported: Member[] = (body.members ?? []).map((m) => ({
      memberNumber: `MBR-${uid()}`,
      rfqId,
      name: m.name ?? 'Unknown',
      dateOfBirth: m.dateOfBirth ?? '',
      gender: m.gender ?? 'M',
      grade: m.grade ?? '',
      salary: m.salary ?? 0,
      sumAssured: m.sumAssured ?? 0,
      coverages: [],
    }));
    if (!members[rfqId]) members[rfqId] = [];
    members[rfqId].push(...imported);
    rfqs[rfqId].updatedAt = now();
    rfqs[rfqId].censusSummary = {
      totalLives: members[rfqId].length,
      quality: { trafficLight: CensusQuality.A },
    };
    return HttpResponse.json({ imported: imported.length }, { status: 201 });
  }),

  // POST /api/rfqs/_reset  — dev only: wipe in-memory store back to seed data
  http.post('/api/rfqs/_reset', () => {
    // Remove all non-seed keys
    for (const key of Object.keys(rfqs)) {
      if (!['rfq-001', 'rfq-002', 'rfq-003', 'rfq-004'].includes(key)) {
        delete rfqs[key];
      }
    }
    // Reset mutable fields on seed RFQs by re-applying a deep clone
    // (full re-import is not possible in browser, so we serialise/deserialise)
    const seedKeys = ['rfq-001', 'rfq-002', 'rfq-003', 'rfq-004'] as const;
    for (const key of seedKeys) {
      if (rfqs[key]) {
        rfqs[key] = JSON.parse(JSON.stringify(rfqs[key])) as RfqBase;
      }
    }
    // Reset documents to seed state
    for (const key of Object.keys(documents)) {
      if (!['rfq-001', 'rfq-002', 'rfq-003', 'rfq-004'].includes(key)) {
        delete documents[key];
      }
    }
    documents['rfq-001'] = [];
    documents['rfq-002'] = [];
    // Reset plans to seed
    for (const key of Object.keys(plans)) {
      if (!['plan-001', 'plan-002', 'plan-003', 'plan-004', 'plan-005', 'plan-006', 'plan-007', 'plan-008'].includes(key)) {
        delete plans[key];
      }
    }
    // Reset subsidiaries
    for (const key of Object.keys(subsidiaries)) {
      if (!['rfq-001', 'rfq-002', 'rfq-003', 'rfq-004'].includes(key)) {
        delete subsidiaries[key];
      }
    }
    subsidiaries['rfq-001'] = [];
    subsidiaries['rfq-002'] = [];
    subsidiaries['rfq-003'] = [];
    subsidiaries['rfq-004'] = [];
    // Reset members to seed state
    for (const key of Object.keys(members)) {
      if (!['rfq-001', 'rfq-002', 'rfq-003', 'rfq-004'].includes(key)) {
        delete members[key];
      }
    }
    members['rfq-001'] = [];
    members['rfq-003'] = [];
    // rfq-002 keeps its seed members (truncate to original 5)
    members['rfq-002'] = members['rfq-002'].slice(0, 5);
    // rfq-004 keeps its seed members (truncate to original 6)
    members['rfq-004'] = members['rfq-004'].slice(0, 6);
    return HttpResponse.json({ reset: true });
  }),

  // POST /api/rfqs/:rfqId/subsidiaries
  http.post('/api/rfqs/:rfqId/subsidiaries', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const body = (await request.json()) as Partial<Subsidiary>;
    const sub: Subsidiary = {
      subsidiaryId: `sub-${uid()}`,
      rfqId,
      name: body.name ?? 'Unnamed',
      registrationNumber: body.registrationNumber,
      lives: body.lives ?? 0,
    };
    if (!subsidiaries[rfqId]) subsidiaries[rfqId] = [];
    subsidiaries[rfqId].push(sub);
    rfqs[rfqId].updatedAt = now();
    return HttpResponse.json(sub, { status: 201 });
  }),

  // PUT /api/rfqs/:rfqId/subsidiaries/:subsidiaryId
  http.put('/api/rfqs/:rfqId/subsidiaries/:subsidiaryId', async ({ params, request }) => {
    const { rfqId, subsidiaryId } = params as { rfqId: string; subsidiaryId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const arr = subsidiaries[rfqId] ?? [];
    const idx = arr.findIndex((s) => s.subsidiaryId === subsidiaryId);
    if (idx === -1) return HttpResponse.json({ error: 'Subsidiary not found' }, { status: 404 });
    const patch = (await request.json()) as Partial<Subsidiary>;
    arr[idx] = { ...arr[idx], ...patch, subsidiaryId, rfqId };
    rfqs[rfqId].updatedAt = now();
    return HttpResponse.json(arr[idx]);
  }),

  // DELETE /api/rfqs/:rfqId/subsidiaries/:subsidiaryId
  http.delete('/api/rfqs/:rfqId/subsidiaries/:subsidiaryId', ({ params }) => {
    const { rfqId, subsidiaryId } = params as { rfqId: string; subsidiaryId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const arr = subsidiaries[rfqId] ?? [];
    const idx = arr.findIndex((s) => s.subsidiaryId === subsidiaryId);
    if (idx === -1) return HttpResponse.json({ error: 'Subsidiary not found' }, { status: 404 });
    arr.splice(idx, 1);
    rfqs[rfqId].updatedAt = now();
    return new HttpResponse(null, { status: 204 });
  }),
];
