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
  Deviation,
  DeviationHistoryEntry,
  MphProfile,
  MphAppetite,
} from '@/lib/types';
import {
  DeviationApprovalStage,
  DeviationKind,
  DeviationScope,
} from '@/lib/types';
import { CLAUSE_LIBRARY, FCL_LIMIT_SCHEDULE, PLAN_RATE_CARDS } from '@/lib/constants';
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
  // ── Q13: ALL STATUSES in one quote ───────────────────────────────────────────
  'rfq-q001': {
    rfqId: 'rfq-q001',
    employerName: 'Omni Group of Industries Ltd',
    industry: 'Diversified Conglomerate',
    statusStage: RfqStatus.FINAL,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Marsh India',
    intermediaryCode: 'BRK-113',
    quoteSegment: QuoteSegment.LARGE,
    effectiveDate: '2026-10-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: true, separateBillPerSubsidiary: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 3, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v12-q001',
    mphAppetite: { category: 'Large group', maxDiscountPct: 12, uwAuthorityBand: 'SALES_L3', source: 'engine-server' as const, evaluatedAt: '2026-02-15T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q001',  versionNo: 1,  name: 'Initial Draft',                    note: 'First-cut scope.',                                           status: VersionStatus.DRAFT,             createdAt: '2026-01-10T09:00:00Z' },
      { id: 'v2-q001',  versionNo: 2,  name: 'UW Referral — Conglomerate Risk',  note: 'Multiple hazard classes; referred to senior UW.',            status: VersionStatus.UW_REFERRED,       createdAt: '2026-01-20T10:00:00Z' },
      { id: 'v3-q001',  versionNo: 3,  name: 'UW Evaluation Complete',           note: 'All subsidiary risks cleared.',                              status: VersionStatus.EVALUATED,         createdAt: '2026-02-05T11:00:00Z' },
      { id: 'v4-q001',  versionNo: 4,  name: 'Pricing Request Raised',           note: 'Actuarial job submitted for 1800 lives across 6 entities.',  status: VersionStatus.PRICING_REQUESTED, createdAt: '2026-02-18T14:00:00Z' },
      { id: 'v5-q001',  versionNo: 5,  name: 'Actuarially Rated',                note: 'Technical premium confirmed at blended rate.',                status: VersionStatus.RATED,             createdAt: '2026-03-05T09:00:00Z' },
      { id: 'v6-q001',  versionNo: 6,  name: 'Formal Submission',                note: 'Submitted to Marsh India for group presentation.',           status: VersionStatus.SUBMITTED,         createdAt: '2026-03-15T10:00:00Z' },
      { id: 'v7-q001',  versionNo: 7,  name: 'Sent via Broker Portal',           note: 'Shared via broker portal (SHARED status).',                  status: VersionStatus.SHARED,            createdAt: '2026-03-25T14:00:00Z' },
      { id: 'v8-q001',  versionNo: 8,  name: 'Direct Offer to Board',            note: 'Sent directly to CFO and HR Director.',                      status: VersionStatus.SENT_TO_CLIENT,    createdAt: '2026-04-02T10:00:00Z' },
      { id: 'v9-q001',  versionNo: 9,  name: 'Selected by Client',               note: 'Board approved V9 terms.', status: VersionStatus.SELECTED, validationReceipt: { configHash: 'q13v9hash', productPins: [{ productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-q001v9' }], validatedAt: '2026-04-20T10:00:00Z' }, createdAt: '2026-04-18T11:00:00Z' },
      { id: 'v10-q001', versionNo: 10, name: 'Archived — Exploratory Alt',       note: 'Alternative structure archived; not taken forward.',          status: VersionStatus.ARCHIVED,          createdAt: '2026-04-05T09:00:00Z' },
      { id: 'v11-q001', versionNo: 11, name: 'Withdrawn — Subsidiary Removed',   note: 'One subsidiary opted out; this version withdrawn.',          status: VersionStatus.WITHDRAWN,         createdAt: '2026-04-12T10:00:00Z' },
      { id: 'v12-q001', versionNo: 12, name: 'Active — Final Agreed Terms',      note: 'All entities confirmed. Final rate at 8% net discount.', status: VersionStatus.FROZEN, validationReceipt: { configHash: 'q13v12hash', productPins: [{ productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-q001v12' }], validatedAt: '2026-05-15T09:00:00Z' }, createdAt: '2026-05-12T10:00:00Z' },
    ],
    negotiationLog: [
      { roundNo: 1, party: NegotiationParty.BROKER, kind: NegotiationKind.COUNTER, versionId: 'v7-q001', askDiscountPct: 12, note: 'Group expects volume discount of 12%.', by: 'broker@marsh.in', at: '2026-03-28T10:00:00Z' },
      { roundNo: 2, party: NegotiationParty.INSURER, kind: NegotiationKind.COUNTER, versionId: 'v8-q001', askDiscountPct: 8, note: 'Best offer at 8% given mixed experience data.', by: 'uw@insurer.com', at: '2026-04-10T15:00:00Z' },
      { roundNo: 3, party: NegotiationParty.BROKER, kind: NegotiationKind.ACCEPT, versionId: 'v9-q001', askDiscountPct: 8, note: 'Board accepted 8%.', by: 'broker@marsh.in', at: '2026-04-17T11:00:00Z' },
    ],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v5-q001':  { technicalPremium: 54000000, breakEvenFloor: 47250000, negotiatedPremium: 54000000, modelFactor: 1.0,   feasible: true, finalPremiumInclGst: 63720000, perLifePremium: 35400, lives: 1800, pricedAt: '2026-03-04T08:00:00Z', byPlan: {} },
        'v6-q001':  { technicalPremium: 54000000, breakEvenFloor: 47250000, negotiatedPremium: 51300000, modelFactor: 0.95,  feasible: true, finalPremiumInclGst: 60534000, perLifePremium: 33630, lives: 1800, pricedAt: '2026-03-14T08:00:00Z', byPlan: {} },
        'v7-q001':  { technicalPremium: 54000000, breakEvenFloor: 47250000, negotiatedPremium: 49680000, modelFactor: 0.92,  feasible: true, finalPremiumInclGst: 58622400, perLifePremium: 32568, lives: 1800, pricedAt: '2026-03-24T08:00:00Z', byPlan: {} },
        'v8-q001':  { technicalPremium: 54000000, breakEvenFloor: 47250000, negotiatedPremium: 49680000, modelFactor: 0.92,  feasible: true, finalPremiumInclGst: 58622400, perLifePremium: 32568, lives: 1800, pricedAt: '2026-04-01T08:00:00Z', byPlan: {} },
        'v9-q001':  { technicalPremium: 54000000, breakEvenFloor: 47250000, negotiatedPremium: 49680000, modelFactor: 0.92,  feasible: true, finalPremiumInclGst: 58622400, perLifePremium: 32568, lives: 1800, pricedAt: '2026-04-17T08:00:00Z', byPlan: {} },
        'v12-q001': { technicalPremium: 54000000, breakEvenFloor: 47250000, negotiatedPremium: 49680000, modelFactor: 0.92,  feasible: true, finalPremiumInclGst: 58622400, perLifePremium: 32568, lives: 1800, pricedAt: '2026-05-11T08:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-102', name: 'Arjun Mehta' },
    updatedAt: '2026-05-12T10:00:00Z', createdAt: '2026-01-10T09:00:00Z',
  },
  // ── Q01: Highest version = DRAFT ────────────────────────────────────────────
  'rfq-q002': {
    rfqId: 'rfq-q002',
    employerName: 'Stellar Tech Innovations Pvt Ltd',
    industry: 'Technology / SaaS',
    statusStage: RfqStatus.DATA_PENDING,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Willis Towers Watson India',
    intermediaryCode: 'BRK-101',
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-10-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.SINGLE_PLAN, sumAssuredBasis: SumAssuredBasis.FLAT, gradeMapping: false, pricingBasis: PricingBasis.MANUAL },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v2-q002',
    quoteVersions: [
      { id: 'v1-q002', versionNo: 1, name: 'Initial Census Draft', note: 'Preliminary headcount estimate. Pending full roster.', status: VersionStatus.DRAFT, createdAt: '2026-06-01T09:00:00Z' },
      { id: 'v2-q002', versionNo: 2, name: 'Revised Scope Draft', note: 'Updated member count to 280 after HR confirmation.', status: VersionStatus.DRAFT, createdAt: '2026-06-10T11:00:00Z' },
    ],
    negotiationLog: [], gradeAllocations: {}, actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    salesOwner: { userId: 'usr-101', name: 'Priya Sharma' },
    updatedAt: '2026-06-10T11:00:00Z', createdAt: '2026-06-01T09:00:00Z',
  },

  // ── Q02: Highest version = UW_REFERRED ──────────────────────────────────────
  'rfq-q003': {
    rfqId: 'rfq-q003',
    employerName: 'Greenfield Chemicals Ltd',
    industry: 'Chemicals & Petrochemicals',
    statusStage: RfqStatus.UW_REVIEW,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Marsh India',
    intermediaryCode: 'BRK-102',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-11-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 2, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-q003',
    quoteVersions: [
      { id: 'v1-q003', versionNo: 1, name: 'Draft — Aggregate Only', note: 'No roster; aggregate census used.', status: VersionStatus.DRAFT, createdAt: '2026-05-15T09:00:00Z' },
      { id: 'v2-q003', versionNo: 2, name: 'Revised Draft', note: 'Hazardous roles added; flagged for UW referral.', status: VersionStatus.DRAFT, createdAt: '2026-05-28T10:00:00Z' },
      { id: 'v3-q003', versionNo: 3, name: 'UW Referral — Hazard Review', note: 'Referred to senior UW due to chemical plant hazard class.', status: VersionStatus.UW_REFERRED, createdAt: '2026-06-05T14:00:00Z' },
    ],
    negotiationLog: [], gradeAllocations: {}, actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    salesOwner: { userId: 'usr-102', name: 'Arjun Mehta' },
    updatedAt: '2026-06-05T14:00:00Z', createdAt: '2026-05-15T09:00:00Z',
  },

  // ── Q03: Highest version = EVALUATED ────────────────────────────────────────
  'rfq-q004': {
    rfqId: 'rfq-q004',
    employerName: 'Horizon Education Services',
    industry: 'Education & EdTech',
    statusStage: RfqStatus.UW_REVIEW,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.DIRECT,
    brokerName: undefined,
    intermediaryCode: 'DIR-103',
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-09-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'CHEQUE', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.SINGLE_PLAN, sumAssuredBasis: SumAssuredBasis.FLAT, gradeMapping: false, pricingBasis: PricingBasis.MANUAL },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-q004',
    mphAppetite: { category: 'SME · straight-through', maxDiscountPct: 8, uwAuthorityBand: 'SALES_L1', source: 'engine-server' as const, evaluatedAt: '2026-06-02T11:00:00Z' },
    quoteVersions: [
      { id: 'v1-q004', versionNo: 1, name: 'Initial Proposal', note: 'First-cut based on HR data.', status: VersionStatus.DRAFT, createdAt: '2026-05-20T09:00:00Z' },
      { id: 'v2-q004', versionNo: 2, name: 'UW Referred', note: 'Referred for evaluation — direct business.', status: VersionStatus.UW_REFERRED, createdAt: '2026-05-28T10:00:00Z' },
      { id: 'v3-q004', versionNo: 3, name: 'UW Evaluation Complete', note: 'All UW queries resolved. Ready for pricing.', status: VersionStatus.EVALUATED, createdAt: '2026-06-03T09:00:00Z' },
    ],
    negotiationLog: [], gradeAllocations: {}, actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    salesOwner: { userId: 'usr-103', name: 'Nisha Agarwal' },
    updatedAt: '2026-06-03T09:00:00Z', createdAt: '2026-05-20T09:00:00Z',
  },

  // ── Q04: Highest version = PRICING_REQUESTED ────────────────────────────────
  'rfq-q005': {
    rfqId: 'rfq-q005',
    employerName: 'Pacific Maritime Corp',
    industry: 'Shipping & Ports',
    statusStage: RfqStatus.PRICING,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Aon India',
    intermediaryCode: 'BRK-104',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-12-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 3, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-q005',
    mphAppetite: { category: 'Mid-market', maxDiscountPct: 10, uwAuthorityBand: 'SALES_L2', source: 'engine-server' as const, evaluatedAt: '2026-06-08T10:00:00Z' },
    quoteVersions: [
      { id: 'v1-q005', versionNo: 1, name: 'Draft — Crew Roster', note: 'Marine crew roster submitted.', status: VersionStatus.DRAFT, createdAt: '2026-05-25T09:00:00Z' },
      { id: 'v2-q005', versionNo: 2, name: 'Evaluation Done', note: 'UW evaluation completed; no referral needed.', status: VersionStatus.EVALUATED, createdAt: '2026-06-09T11:00:00Z' },
      { id: 'v3-q005', versionNo: 3, name: 'Pricing Request Raised', note: 'Actuarial pricing job submitted. Awaiting model output.', status: VersionStatus.PRICING_REQUESTED, createdAt: '2026-06-13T14:00:00Z' },
    ],
    negotiationLog: [], gradeAllocations: {}, actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-101', name: 'Priya Sharma' },
    updatedAt: '2026-06-13T14:00:00Z', createdAt: '2026-05-25T09:00:00Z',
  },

  // ── Q05: Highest version = RATED ────────────────────────────────────────────
  'rfq-q006': {
    rfqId: 'rfq-q006',
    employerName: 'Everest Engineering Works',
    industry: 'Engineering & Heavy Machinery',
    statusStage: RfqStatus.PRICING_IN_PROGRESS,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Gallagher India',
    intermediaryCode: 'BRK-105',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-10-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 2, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q006',
    mphAppetite: { category: 'Mid-market', maxDiscountPct: 10, uwAuthorityBand: 'SALES_L2', source: 'engine-server' as const, evaluatedAt: '2026-06-03T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q006', versionNo: 1, name: 'Initial Draft', note: 'Aggregate headcount only.', status: VersionStatus.DRAFT, createdAt: '2026-05-10T09:00:00Z' },
      { id: 'v2-q006', versionNo: 2, name: 'UW Referred — Machinery Risk', note: 'Heavy machinery exposure flagged.', status: VersionStatus.UW_REFERRED, createdAt: '2026-05-20T10:00:00Z' },
      { id: 'v3-q006', versionNo: 3, name: 'Evaluated', note: 'UW queries resolved. Pricing requested.', status: VersionStatus.EVALUATED, createdAt: '2026-06-04T11:00:00Z' },
      { id: 'v4-q006', versionNo: 4, name: 'Actuarially Rated', note: 'Model run complete. Technical rate established.', status: VersionStatus.RATED, createdAt: '2026-06-15T09:00:00Z' },
    ],
    negotiationLog: [],
    gradeAllocations: {
      'v4-q006': {
        STAFF:      'PLN001',
        EXECUTIVE:  'PLN001',
        MGT:        'PLN002',
        DIRECTOR:   'PLN002',
        CONTRACT:   'UNALLOCATED',
      },
    },
    actuaryPricing: {
      byVersion: {
        'v4-q006': { technicalPremium: 9800000, breakEvenFloor: 8600000, negotiatedPremium: 9800000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 11564000, perLifePremium: 23128, lives: 500, pricedAt: '2026-06-14T08:00:00Z', byPlan: { 'PLN001': { planId: 'PLN001', premium: 7350000, lives: 350, effectiveDiscountPct: 0 }, 'PLN002': { planId: 'PLN002', premium: 2450000, lives: 130, effectiveDiscountPct: 0 } } },
      },
    },
    headcountData: {
      totalLives: 500,
      grades: [
        { grade: 'STAFF',     lives: 250, avgSalary:  600000, avgSumAssured:  1800000 },
        { grade: 'EXECUTIVE', lives: 100, avgSalary: 1500000, avgSumAssured:  4500000 },
        { grade: 'MGT',       lives:  80, avgSalary: 2500000, avgSumAssured:  7500000 },
        { grade: 'DIRECTOR',  lives:  50, avgSalary: 4000000, avgSumAssured: 12000000 },
        { grade: 'CONTRACT',  lives:  20, avgSalary:  400000, avgSumAssured:  1200000 },
      ],
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-102', name: 'Arjun Mehta' },
    updatedAt: '2026-06-15T09:00:00Z', createdAt: '2026-05-10T09:00:00Z',
  },

  // ── Q06: Highest version = SUBMITTED ────────────────────────────────────────
  'rfq-q007': {
    rfqId: 'rfq-q007',
    employerName: 'Nexus Retail Chain Pvt Ltd',
    industry: 'Retail & FMCG',
    statusStage: RfqStatus.QUOTE_GENERATED,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Marsh India',
    intermediaryCode: 'BRK-106',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-09-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 3, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-q007',
    mphAppetite: { category: 'Mid-market', maxDiscountPct: 10, uwAuthorityBand: 'SALES_L2', source: 'engine-server' as const, evaluatedAt: '2026-05-25T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q007', versionNo: 1, name: 'Draft Proposal', status: VersionStatus.DRAFT, createdAt: '2026-05-01T09:00:00Z' },
      { id: 'v2-q007', versionNo: 2, name: 'Rated Version', note: 'Technical rate locked at standard discount.', status: VersionStatus.RATED, createdAt: '2026-06-01T10:00:00Z' },
      { id: 'v3-q007', versionNo: 3, name: 'Submitted to Broker', note: 'Formal quote submitted to Marsh India for client presentation.', status: VersionStatus.SUBMITTED, createdAt: '2026-06-10T14:00:00Z' },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v2-q007': { technicalPremium: 15200000, breakEvenFloor: 13300000, negotiatedPremium: 15200000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 17936000, perLifePremium: 29893, lives: 600, pricedAt: '2026-05-31T08:00:00Z', byPlan: {} },
        'v3-q007': { technicalPremium: 15200000, breakEvenFloor: 13300000, negotiatedPremium: 14440000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 17039200, perLifePremium: 28399, lives: 600, pricedAt: '2026-06-09T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-103', name: 'Nisha Agarwal' },
    updatedAt: '2026-06-10T14:00:00Z', createdAt: '2026-05-01T09:00:00Z',
  },

  // ── Q07: Highest version = SHARED (legacy Sent to Client) ───────────────────
  'rfq-q008': {
    rfqId: 'rfq-q008',
    employerName: 'Heritage Hospitality Ltd',
    industry: 'Hospitality & Tourism',
    statusStage: RfqStatus.SHARED,
    businessType: BusinessType.RENEWAL,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Aon India',
    intermediaryCode: 'BRK-107',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-08-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: true, separateBillPerSubsidiary: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 3, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q008',
    mphAppetite: { category: 'Mid-market', maxDiscountPct: 10, uwAuthorityBand: 'SALES_L2', source: 'engine-server' as const, evaluatedAt: '2026-04-20T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q008', versionNo: 1, name: 'Renewal Draft', note: 'Based on last year terms. Superseded.', status: VersionStatus.DRAFT, createdAt: '2026-04-01T09:00:00Z' },
      { id: 'v2-q008', versionNo: 2, name: 'Archived — Incorrect Census', note: 'Wrong headcount used. Replaced.', status: VersionStatus.ARCHIVED, createdAt: '2026-04-10T11:00:00Z' },
      { id: 'v3-q008', versionNo: 3, name: 'Correct Roster Rate', note: 'Actuarially rated on corrected roster.', status: VersionStatus.RATED, createdAt: '2026-04-25T09:00:00Z' },
      { id: 'v4-q008', versionNo: 4, name: 'Sent to Broker', note: 'Quote sent to Aon India via broker portal.', status: VersionStatus.SHARED, createdAt: '2026-05-05T14:00:00Z' },
    ],
    negotiationLog: [
      { roundNo: 1, party: NegotiationParty.BROKER, kind: NegotiationKind.COUNTER, versionId: 'v4-q008', askDiscountPct: 8, note: 'Broker requesting 8% renewal discount.', by: 'broker@aon.in', at: '2026-05-10T10:00:00Z' },
    ],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v3-q008': { technicalPremium: 11500000, breakEvenFloor: 10100000, negotiatedPremium: 11500000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 13570000, perLifePremium: 27140, lives: 500, pricedAt: '2026-04-24T09:00:00Z', byPlan: {} },
        'v4-q008': { technicalPremium: 11500000, breakEvenFloor: 10100000, negotiatedPremium: 10925000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 12891500, perLifePremium: 25783, lives: 500, pricedAt: '2026-05-04T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-104', name: 'Vikram Rao' },
    updatedAt: '2026-05-05T14:00:00Z', createdAt: '2026-04-01T09:00:00Z',
  },

  // ── Q08: Highest version = SENT_TO_CLIENT ───────────────────────────────────
  'rfq-q009': {
    rfqId: 'rfq-q009',
    employerName: 'Quantum Labs India Pvt Ltd',
    industry: 'Biotechnology & Research',
    statusStage: RfqStatus.SHARED,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Gallagher India',
    intermediaryCode: 'BRK-108',
    quoteSegment: QuoteSegment.MID,
    effectiveDate: '2026-11-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 2, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-q009',
    mphAppetite: { category: 'Mid-market', maxDiscountPct: 10, uwAuthorityBand: 'SALES_L2', source: 'engine-server' as const, evaluatedAt: '2026-05-18T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q009', versionNo: 1, name: 'Draft Proposal', status: VersionStatus.DRAFT, createdAt: '2026-05-05T09:00:00Z' },
      { id: 'v2-q009', versionNo: 2, name: 'Submitted to Broker', note: 'Submitted through Gallagher portal.', status: VersionStatus.SUBMITTED, createdAt: '2026-05-22T10:00:00Z' },
      { id: 'v3-q009', versionNo: 3, name: 'Direct Offer to Client', note: 'Client requested a direct quotation alongside broker version.', status: VersionStatus.SENT_TO_CLIENT, createdAt: '2026-06-02T14:00:00Z' },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v2-q009': { technicalPremium: 8400000, breakEvenFloor: 7350000, negotiatedPremium: 8400000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 9912000, perLifePremium: 24780, lives: 400, pricedAt: '2026-05-21T09:00:00Z', byPlan: {} },
        'v3-q009': { technicalPremium: 8400000, breakEvenFloor: 7350000, negotiatedPremium: 7980000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 9416400, perLifePremium: 23541, lives: 400, pricedAt: '2026-06-01T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-101', name: 'Priya Sharma' },
    updatedAt: '2026-06-02T14:00:00Z', createdAt: '2026-05-05T09:00:00Z',
  },

  // ── Q09: Highest version = SELECTED ─────────────────────────────────────────
  'rfq-q010': {
    rfqId: 'rfq-q010',
    employerName: 'Delta Financial Services Ltd',
    industry: 'Banking, Financial Services & Insurance',
    statusStage: RfqStatus.NEGOTIATION,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Aon India',
    intermediaryCode: 'BRK-109',
    quoteSegment: QuoteSegment.LARGE,
    effectiveDate: '2026-08-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: true, separateBillPerSubsidiary: true },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 4, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q010',
    mphAppetite: { category: 'Large group', maxDiscountPct: 12, uwAuthorityBand: 'SALES_L3', source: 'engine-server' as const, evaluatedAt: '2026-04-15T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q010', versionNo: 1, name: 'Draft', status: VersionStatus.DRAFT, createdAt: '2026-04-01T09:00:00Z' },
      { id: 'v2-q010', versionNo: 2, name: 'UW Referred — Large Group', note: 'Lives > 1000, referred for senior UW sign-off.', status: VersionStatus.UW_REFERRED, createdAt: '2026-04-10T09:00:00Z' },
      { id: 'v3-q010', versionNo: 3, name: 'Sent to Client', note: 'Shared with CFO office directly.', status: VersionStatus.SHARED, createdAt: '2026-04-28T14:00:00Z' },
      { id: 'v4-q010', versionNo: 4, name: 'Client Selected', note: 'Client formally accepted V4 terms. Preparing for freeze.', status: VersionStatus.SELECTED, validationReceipt: { configHash: 'q09v4hash', productPins: [{ productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-q010v4' }], validatedAt: '2026-05-20T10:00:00Z' }, createdAt: '2026-05-18T10:00:00Z' },
    ],
    negotiationLog: [
      { roundNo: 1, party: NegotiationParty.BROKER, kind: NegotiationKind.COUNTER, versionId: 'v3-q010', askDiscountPct: 12, note: 'Client expects 12% for large group volume.', by: 'broker@aon.in', at: '2026-05-02T10:00:00Z' },
      { roundNo: 2, party: NegotiationParty.INSURER, kind: NegotiationKind.COUNTER, versionId: 'v4-q010', askDiscountPct: 9, note: 'Best offer at 9% given experience data.', by: 'uw@insurer.com', at: '2026-05-15T15:00:00Z' },
      { roundNo: 3, party: NegotiationParty.BROKER, kind: NegotiationKind.ACCEPT, versionId: 'v4-q010', askDiscountPct: 9, note: 'Client accepts 9%.', by: 'broker@aon.in', at: '2026-05-17T11:00:00Z' },
    ],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v3-q010': { technicalPremium: 32000000, breakEvenFloor: 28000000, negotiatedPremium: 32000000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 37760000, perLifePremium: 37760, lives: 1000, pricedAt: '2026-04-27T08:00:00Z', byPlan: {} },
        'v4-q010': { technicalPremium: 32000000, breakEvenFloor: 28000000, negotiatedPremium: 29120000, modelFactor: 0.91, feasible: true, finalPremiumInclGst: 34361600, perLifePremium: 34362, lives: 1000, pricedAt: '2026-05-14T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-102', name: 'Arjun Mehta' },
    updatedAt: '2026-05-18T10:00:00Z', createdAt: '2026-04-01T09:00:00Z',
  },

  // ── Q10: Highest version = FROZEN (Active) ───────────────────────────────────
  'rfq-q011': {
    rfqId: 'rfq-q011',
    employerName: 'Alpha Power & Energy Ltd',
    industry: 'Energy & Utilities',
    statusStage: RfqStatus.FINAL,
    businessType: BusinessType.RENEWAL,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Willis Towers Watson India',
    intermediaryCode: 'BRK-110',
    quoteSegment: QuoteSegment.LARGE,
    effectiveDate: '2026-07-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: true, separateBillPerSubsidiary: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 3, pricingBasis: PricingBasis.BLEND },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q011',
    mphAppetite: { category: 'Large group', maxDiscountPct: 12, uwAuthorityBand: 'SALES_L3', source: 'engine-server' as const, evaluatedAt: '2026-03-20T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q011', versionNo: 1, name: 'Renewal Draft', status: VersionStatus.DRAFT, createdAt: '2026-03-01T09:00:00Z' },
      { id: 'v2-q011', versionNo: 2, name: 'Submitted Offer', note: 'Renewal terms submitted at flat rate.', status: VersionStatus.SUBMITTED, createdAt: '2026-04-01T10:00:00Z' },
      { id: 'v3-q011', versionNo: 3, name: 'Client-Accepted Terms', note: 'Client accepted with 5% discount.', status: VersionStatus.SELECTED, validationReceipt: { configHash: 'q10v3hash', productPins: [{ productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-q011v3' }], validatedAt: '2026-04-25T10:00:00Z' }, createdAt: '2026-04-22T14:00:00Z' },
      { id: 'v4-q011', versionNo: 4, name: 'Active — Renewal Locked', note: 'All sign-offs received. Ready for policy issuance.', status: VersionStatus.FROZEN, validationReceipt: { configHash: 'q10v4hash', productPins: [{ productCode: 'GTL-BASE', filedVersion: '2.1.0', contentHash: 'hash-q011v4' }], validatedAt: '2026-05-10T09:00:00Z' }, createdAt: '2026-05-08T10:00:00Z' },
    ],
    negotiationLog: [
      { roundNo: 1, party: NegotiationParty.BROKER, kind: NegotiationKind.COUNTER, versionId: 'v2-q011', askDiscountPct: 8, note: 'Requesting 8% renewal discount given 3-year relationship.', by: 'broker@wtw.in', at: '2026-04-05T10:00:00Z' },
      { roundNo: 2, party: NegotiationParty.INSURER, kind: NegotiationKind.COUNTER, versionId: 'v3-q011', askDiscountPct: 5, note: 'Best offer at 5% given claims experience.', by: 'uw@insurer.com', at: '2026-04-20T15:00:00Z' },
      { roundNo: 3, party: NegotiationParty.BROKER, kind: NegotiationKind.ACCEPT, versionId: 'v3-q011', askDiscountPct: 5, note: 'Client accepts 5%.', by: 'broker@wtw.in', at: '2026-04-22T11:00:00Z' },
    ],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v2-q011': { technicalPremium: 28000000, breakEvenFloor: 24500000, negotiatedPremium: 28000000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 33040000, perLifePremium: 33040, lives: 1000, pricedAt: '2026-03-30T08:00:00Z', byPlan: {} },
        'v3-q011': { technicalPremium: 28000000, breakEvenFloor: 24500000, negotiatedPremium: 26600000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 31388000, perLifePremium: 31388, lives: 1000, pricedAt: '2026-04-18T09:00:00Z', byPlan: {} },
        'v4-q011': { technicalPremium: 28000000, breakEvenFloor: 24500000, negotiatedPremium: 26600000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 31388000, perLifePremium: 31388, lives: 1000, pricedAt: '2026-05-07T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-103', name: 'Nisha Agarwal' },
    updatedAt: '2026-05-08T10:00:00Z', createdAt: '2026-03-01T09:00:00Z',
  },

  // ── Q11: Highest version = ARCHIVED ──────────────────────────────────────────
  'rfq-q012': {
    rfqId: 'rfq-q012',
    employerName: 'Omega Textiles Ltd',
    industry: 'Textiles & Apparel',
    statusStage: RfqStatus.REJECTED,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Marsh India',
    intermediaryCode: 'BRK-111',
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-07-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'CHEQUE', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.SINGLE_PLAN, sumAssuredBasis: SumAssuredBasis.FLAT, gradeMapping: false, pricingBasis: PricingBasis.MANUAL },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q012',
    quoteVersions: [
      { id: 'v1-q012', versionNo: 1, name: 'Initial Draft', status: VersionStatus.DRAFT, createdAt: '2026-04-01T09:00:00Z' },
      { id: 'v2-q012', versionNo: 2, name: 'UW Referred', note: 'High claims ratio in previous scheme.', status: VersionStatus.UW_REFERRED, createdAt: '2026-04-12T10:00:00Z' },
      { id: 'v3-q012', versionNo: 3, name: 'Evaluated', note: 'Evaluation complete — marginal risk accepted.', status: VersionStatus.EVALUATED, createdAt: '2026-04-22T14:00:00Z' },
      { id: 'v4-q012', versionNo: 4, name: 'Archived — Business Withdrawn', note: 'Client cancelled the scheme due to internal restructuring.', status: VersionStatus.ARCHIVED, createdAt: '2026-05-10T09:00:00Z' },
    ],
    negotiationLog: [], gradeAllocations: {}, actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    salesOwner: { userId: 'usr-104', name: 'Vikram Rao' },
    updatedAt: '2026-05-10T09:00:00Z', createdAt: '2026-04-01T09:00:00Z',
  },

  // ── Q12: Highest version = WITHDRAWN ─────────────────────────────────────────
  'rfq-q013': {
    rfqId: 'rfq-q013',
    employerName: 'Sigma Trading Corp',
    industry: 'Trading & Distribution',
    statusStage: RfqStatus.REJECTED,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Gallagher India',
    intermediaryCode: 'BRK-112',
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-10-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.SINGLE_PLAN, sumAssuredBasis: SumAssuredBasis.FLAT, gradeMapping: false, pricingBasis: PricingBasis.MANUAL },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q013',
    mphAppetite: { category: 'SME · straight-through', maxDiscountPct: 8, uwAuthorityBand: 'SALES_L1', source: 'engine-server' as const, evaluatedAt: '2026-04-28T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q013', versionNo: 1, name: 'Draft Proposal', status: VersionStatus.DRAFT, createdAt: '2026-04-15T09:00:00Z' },
      { id: 'v2-q013', versionNo: 2, name: 'Rated Version', note: 'Technical premium established.', status: VersionStatus.RATED, createdAt: '2026-05-01T10:00:00Z' },
      { id: 'v3-q013', versionNo: 3, name: 'Submitted to Broker', status: VersionStatus.SUBMITTED, createdAt: '2026-05-10T14:00:00Z' },
      { id: 'v4-q013', versionNo: 4, name: 'Withdrawn — Budget Freeze', note: 'Client withdrew citing Q3 budget freeze. No further action.', status: VersionStatus.WITHDRAWN, createdAt: '2026-05-25T10:00:00Z' },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v2-q013': { technicalPremium: 4200000, breakEvenFloor: 3700000, negotiatedPremium: 4200000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 4956000, perLifePremium: 19824, lives: 250, pricedAt: '2026-04-30T08:00:00Z', byPlan: {} },
        'v3-q013': { technicalPremium: 4200000, breakEvenFloor: 3700000, negotiatedPremium: 4200000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 4956000, perLifePremium: 19824, lives: 250, pricedAt: '2026-04-30T08:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    salesOwner: { userId: 'usr-101', name: 'Priya Sharma' },
    updatedAt: '2026-05-25T10:00:00Z', createdAt: '2026-04-15T09:00:00Z',
  },

  // ── Q14: Highest version = SENT_TO_CLIENT — expiring in 2 days ──────────────
  'rfq-q014': {
    rfqId: 'rfq-q014',
    employerName: 'Pinnacle Logistics India Pvt Ltd',
    industry: 'Logistics & Supply Chain',
    statusStage: RfqStatus.NEGOTIATION,
    businessType: BusinessType.RENEWAL,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GMC,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Marsh India',
    intermediaryCode: 'BRK-117',
    quoteSegment: QuoteSegment.MID_MARKET,
    effectiveDate: '2026-07-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.SINGLE_PLAN, sumAssuredBasis: SumAssuredBasis.FLAT, gradeMapping: false, pricingBasis: PricingBasis.TECHNICAL },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v3-q014',
    mphAppetite: { category: 'Mid-market', maxDiscountPct: 10, uwAuthorityBand: 'SALES_L2', source: 'engine-server' as const, evaluatedAt: '2026-06-01T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q014', versionNo: 1, name: 'Initial Draft', status: VersionStatus.DRAFT, createdAt: '2026-05-20T09:00:00Z' },
      { id: 'v2-q014', versionNo: 2, name: 'Rated & Submitted', note: 'Submitted to broker for review.', status: VersionStatus.SUBMITTED, createdAt: '2026-06-05T10:00:00Z' },
      { id: 'v3-q014', versionNo: 3, name: 'Offer to Client', note: 'Final terms sent directly to client. Offer valid until 25-Jun-2026.', status: VersionStatus.SENT_TO_CLIENT, expiryDate: '2026-06-25', createdAt: '2026-06-10T11:00:00Z' },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v2-q014': { technicalPremium: 6800000, breakEvenFloor: 5950000, negotiatedPremium: 6800000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 8024000, perLifePremium: 20060, lives: 400, pricedAt: '2026-06-04T09:00:00Z', byPlan: {} },
        'v3-q014': { technicalPremium: 6800000, breakEvenFloor: 5950000, negotiatedPremium: 6460000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 7622800, perLifePremium: 19057, lives: 400, pricedAt: '2026-06-09T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-102', name: 'Rahul Mehta' },
    updatedAt: '2026-06-10T11:00:00Z', createdAt: '2026-05-20T09:00:00Z',
  },

  // ── Q15: Highest version = ARCHIVED — offer expired ─────────────────────────
  'rfq-q015': {
    rfqId: 'rfq-q015',
    employerName: 'Meridian Health Services Ltd',
    industry: 'Healthcare & Pharmaceuticals',
    statusStage: RfqStatus.REJECTED,
    businessType: BusinessType.RENEWAL,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GMC,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Willis Towers Watson India',
    intermediaryCode: 'BRK-118',
    quoteSegment: QuoteSegment.LARGE,
    effectiveDate: '2026-07-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.MULTI_PLAN, sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, gradeMapping: true, defaultPlanCount: 3, pricingBasis: PricingBasis.TECHNICAL },
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: 'v4-q015',
    mphAppetite: { category: 'Large Account', maxDiscountPct: 12, uwAuthorityBand: 'UW_L1', source: 'engine-server' as const, evaluatedAt: '2026-05-10T09:00:00Z' },
    quoteVersions: [
      { id: 'v1-q015', versionNo: 1, name: 'Initial Draft', status: VersionStatus.DRAFT, createdAt: '2026-04-20T09:00:00Z' },
      { id: 'v2-q015', versionNo: 2, name: 'Rated & Submitted', note: 'Submitted via Willis portal.', status: VersionStatus.SUBMITTED, createdAt: '2026-05-12T10:00:00Z' },
      { id: 'v3-q015', versionNo: 3, name: 'Offer to Client', note: 'Final offer sent. Valid until 15-Jun-2026.', status: VersionStatus.SENT_TO_CLIENT, expiryDate: '2026-06-15', createdAt: '2026-05-28T11:00:00Z' },
      { id: 'v4-q015', versionNo: 4, name: 'Offer Expired — No Response', note: 'Client did not respond within validity period. Quote archived.', status: VersionStatus.ARCHIVED, createdAt: '2026-06-16T09:00:00Z' },
    ],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: {
      byVersion: {
        'v2-q015': { technicalPremium: 11200000, breakEvenFloor: 9800000, negotiatedPremium: 11200000, modelFactor: 1.0, feasible: true, finalPremiumInclGst: 13216000, perLifePremium: 22027, lives: 600, pricedAt: '2026-05-11T09:00:00Z', byPlan: {} },
        'v3-q015': { technicalPremium: 11200000, breakEvenFloor: 9800000, negotiatedPremium: 10640000, modelFactor: 0.95, feasible: true, finalPremiumInclGst: 12555200, perLifePremium: 20925, lives: 600, pricedAt: '2026-05-27T09:00:00Z', byPlan: {} },
      },
    },
    fclPolicy: { quoteDefault: FclPattern.BY_GRADE, byVersion: {} },
    salesOwner: { userId: 'usr-103', name: 'Anita Desai' },
    updatedAt: '2026-06-16T09:00:00Z', createdAt: '2026-04-20T09:00:00Z',
  },

  // ── Q16: 0 versions — fresh intake ──────────────────────────────────────────
  'rfq-q016': {
    rfqId: 'rfq-q016',
    employerName: 'Greenfield Logistics Pvt Ltd',
    industry: 'Logistics & Supply Chain',
    statusStage: RfqStatus.DATA_PENDING,
    businessType: BusinessType.NEW,
    schemeType: SchemeType.EMPLOYER_OBLIGATORY,
    lob: LobType.GTL,
    participationType: ParticipationType.COMPULSORY,
    schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE,
    intermediaryType: IntermediaryType.BROKER,
    brokerName: 'Gallagher India',
    intermediaryCode: 'BRK-221',
    quoteSegment: QuoteSegment.SME,
    effectiveDate: '2026-09-01',
    policyConfig: { gracePeriodDays: 30, billingFrequency: 'ANNUAL', collectionMethod: 'NEFT', subsidiariesEnabled: false },
    defaultPlanStructure: { planStructure: PlanStructure.SINGLE_PLAN, sumAssuredBasis: SumAssuredBasis.FLAT, gradeMapping: false, pricingBasis: PricingBasis.MANUAL },
    sumAssuredBasis: SumAssuredBasis.FLAT,
    coverPattern: CoverPattern.LEVEL,
    termBasis: TermBasis.POLICY_YEAR,
    livesCovered: LivesCovered.MEMBER_ONLY,
    activeVersionId: '',
    quoteVersions: [],
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
    salesOwner: { userId: 'usr-101', name: 'Priya Sharma' },
    updatedAt: '2026-06-23T10:00:00Z', createdAt: '2026-06-23T10:00:00Z',
  },

};


const plans: Record<string, Plan> = {
  // ── rfq-q002: Stellar Tech — SINGLE_PLAN, DRAFT ───────────────────────────
  'plan-001': {
    planId: 'plan-001',
    rfqId: 'rfq-q002',
    quoteVersionId: 'v1-q002',
    name: 'Grade A — Executive',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.DRAFT,
    completeness: 75,
  },
  'plan-002': {
    planId: 'plan-002',
    rfqId: 'rfq-q002',
    quoteVersionId: 'v1-q002',
    name: 'Grade B — Senior Staff',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.DRAFT,
    completeness: 50,
  },
  'plan-003': {
    planId: 'plan-003',
    rfqId: 'rfq-q002',
    quoteVersionId: 'v1-q002',
    name: 'Grade C — Staff',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.DRAFT,
    completeness: 30,
  },
  // ── rfq-q003: Greenfield Chemicals — MULTI_PLAN, UW_REFERRED ─────────────
  'plan-004': {
    planId: 'plan-004',
    rfqId: 'rfq-q003',
    quoteVersionId: 'v3-q003',
    name: 'Grade A — Management & Technical Officers',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [{ code: 'HAZARD_EXCL', label: 'Chemical Plant Hazard Exclusion', byDesk: 'UW', reason: 'Referred to senior UW for chemical exposure evaluation' }],
    handoffStatus: PlanHandoffStatus.UW_REFERRED,
    completeness: 70,
  },
  'plan-005': {
    planId: 'plan-005',
    rfqId: 'rfq-q003',
    quoteVersionId: 'v3-q003',
    name: 'Grade B — Plant & Field Operators',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [{ code: 'HAZARD_EXCL', label: 'Chemical Plant Hazard Exclusion', byDesk: 'UW', reason: 'High-risk plant floor roles pending UW clearance' }],
    handoffStatus: PlanHandoffStatus.UW_REFERRED,
    completeness: 65,
  },
  // ── rfq-q004: Horizon Education — SINGLE_PLAN, EVALUATED ─────────────────
  'plan-006': {
    planId: 'plan-006',
    rfqId: 'rfq-q004',
    quoteVersionId: 'v3-q004',
    name: 'Grade A — Faculty & Senior Admin',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [{ code: 'PRE_EXIST_12M', label: 'Pre-existing (12 mo)', byDesk: 'UW', reason: 'Standard exclusion' }],
    handoffStatus: PlanHandoffStatus.RETURNED,
    completeness: 90,
  },
  'plan-007': {
    planId: 'plan-007',
    rfqId: 'rfq-q004',
    quoteVersionId: 'v3-q004',
    name: 'Grade B — Teaching & Support Staff',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.RETURNED,
    completeness: 95,
  },
  'plan-008': {
    planId: 'plan-008',
    rfqId: 'rfq-q004',
    quoteVersionId: 'v3-q004',
    name: 'Grade C — Non-Teaching Staff',
    productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE,
    coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    handoffStatus: PlanHandoffStatus.RETURNED,
    completeness: 90,
  },
  // ── rfq-q005: Pacific Maritime — MULTI_PLAN, PRICING_REQUESTED ───────────
  'pq-v1-a': {
    planId: 'pq-v1-a', rfqId: 'rfq-q005', quoteVersionId: 'v1-q005',
    name: 'Grade A — Officers & Masters', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.DRAFT, completeness: 60,
  },
  'pq-v1-b': {
    planId: 'pq-v1-b', rfqId: 'rfq-q005', quoteVersionId: 'v1-q005',
    name: 'Grade B — Ratings & Crew', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.DRAFT, completeness: 55,
  },
  'pq-v1-c': {
    planId: 'pq-v1-c', rfqId: 'rfq-q005', quoteVersionId: 'v1-q005',
    name: 'Grade C — Shore Support Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.DRAFT, completeness: 50,
  },
  'pq-v2-a': {
    planId: 'pq-v2-a', rfqId: 'rfq-q005', quoteVersionId: 'v2-q005',
    name: 'Grade A — Officers & Masters', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.RETURNED, completeness: 100,
  },
  'pq-v2-b': {
    planId: 'pq-v2-b', rfqId: 'rfq-q005', quoteVersionId: 'v2-q005',
    name: 'Grade B — Ratings & Crew', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.RETURNED, completeness: 100,
  },
  'pq-v2-c': {
    planId: 'pq-v2-c', rfqId: 'rfq-q005', quoteVersionId: 'v2-q005',
    name: 'Grade C — Shore Support Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.RETURNED, completeness: 100,
  },
  'pq-v3-a': {
    planId: 'pq-v3-a', rfqId: 'rfq-q005', quoteVersionId: 'v3-q005',
    name: 'Grade A — Officers & Masters', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICING_REQUESTED, completeness: 100,
  },
  'pq-v3-b': {
    planId: 'pq-v3-b', rfqId: 'rfq-q005', quoteVersionId: 'v3-q005',
    name: 'Grade B — Ratings & Crew', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICING_REQUESTED, completeness: 100,
  },
  'pq-v3-c': {
    planId: 'pq-v3-c', rfqId: 'rfq-q005', quoteVersionId: 'v3-q005',
    name: 'Grade C — Shore Support Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICING_REQUESTED, completeness: 100,
  },
  // ── rfq-q001: Omni Group — MULTI_PLAN, FROZEN ────────────────────────────
  'p-q001-a': {
    planId: 'p-q001-a', rfqId: 'rfq-q001', quoteVersionId: 'v12-q001',
    name: 'Grade A — Board, CXO & Directors', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider', 'Terminal Illness Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q001-b': {
    planId: 'p-q001-b', rfqId: 'rfq-q001', quoteVersionId: 'v12-q001',
    name: 'Grade B — Senior Management', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q001-c': {
    planId: 'p-q001-c', rfqId: 'rfq-q001', quoteVersionId: 'v12-q001',
    name: 'Grade C — Professional & Technical Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q006: Everest Engineering — spec demo plans (PLN001 / PLN002) ─────
  'PLN001': {
    planId: 'PLN001', rfqId: 'rfq-q006', quoteVersionId: 'v4-q006',
    planNumber: 'P001', name: 'GTL Staff Plan', productCode: 'GTL-STANDARD',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, salaryMultiple: 3, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [],
    uwMethod: 'STP', fclInherited: true,
    rateCardRef: 'GTL Rate Card v3',
    handoffStatus: PlanHandoffStatus.DRAFT, completeness: 100,
  },
  'PLN002': {
    planId: 'PLN002', rfqId: 'rfq-q006', quoteVersionId: 'v4-q006',
    planNumber: 'P002', name: 'GTL Management Plan', productCode: 'GTL-STANDARD',
    subsidiaryScope: 'SUB-Q006-001',
    sumAssuredBasis: SumAssuredBasis.FLAT, flatSi: 5000000, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [{ code: 'WAR_EXCLUSION', label: 'War Exclusion', byDesk: 'SALES', reason: 'Client requests removal' }],
    uwMethod: 'NSTP', fclInherited: false, fclPatternOverride: FclPattern.BY_GRADE,
    handoffStatus: PlanHandoffStatus.DRAFT, completeness: 57,
  },
  // ── rfq-q006: Everest Engineering — grade-mapped plans ───────────────────
  'p-q006-a': {
    planId: 'p-q006-a', rfqId: 'rfq-q006', quoteVersionId: 'v4-q006',
    name: 'Grade A — Senior Engineers & Plant Managers', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [{ code: 'MACHINERY_EXCL', label: 'Heavy Machinery Hazard', byDesk: 'UW', reason: 'Standard exclusion for plant-floor exposure' }],
    handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q006-b': {
    planId: 'p-q006-b', rfqId: 'rfq-q006', quoteVersionId: 'v4-q006',
    name: 'Grade B — Technicians & Operators', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [{ code: 'MACHINERY_EXCL', label: 'Heavy Machinery Hazard', byDesk: 'UW', reason: 'Standard exclusion for plant-floor exposure' }],
    handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q007: Nexus Retail — MULTI_PLAN, SUBMITTED ───────────────────────
  'p-q007-a': {
    planId: 'p-q007-a', rfqId: 'rfq-q007', quoteVersionId: 'v3-q007',
    name: 'Grade A — Area Managers & Regional Heads', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q007-b': {
    planId: 'p-q007-b', rfqId: 'rfq-q007', quoteVersionId: 'v3-q007',
    name: 'Grade B — Store Managers & Supervisors', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q007-c': {
    planId: 'p-q007-c', rfqId: 'rfq-q007', quoteVersionId: 'v3-q007',
    name: 'Grade C — Sales Associates & Floor Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q008: Heritage Hospitality — MULTI_PLAN, SHARED ──────────────────
  'p-q008-a': {
    planId: 'p-q008-a', rfqId: 'rfq-q008', quoteVersionId: 'v4-q008',
    name: 'Grade A — Hotel Management & Directors', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q008-b': {
    planId: 'p-q008-b', rfqId: 'rfq-q008', quoteVersionId: 'v4-q008',
    name: 'Grade B — Front Office & Senior Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q008-c': {
    planId: 'p-q008-c', rfqId: 'rfq-q008', quoteVersionId: 'v4-q008',
    name: 'Grade C — Housekeeping & F&B Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q009: Quantum Labs — MULTI_PLAN, SENT_TO_CLIENT ──────────────────
  'p-q009-a': {
    planId: 'p-q009-a', rfqId: 'rfq-q009', quoteVersionId: 'v3-q009',
    name: 'Grade A — Principal Scientists & Research Directors', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q009-b': {
    planId: 'p-q009-b', rfqId: 'rfq-q009', quoteVersionId: 'v3-q009',
    name: 'Grade B — Research Associates & Lab Technicians', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q010: Delta Financial — MULTI_PLAN, SELECTED ─────────────────────
  'p-q010-a': {
    planId: 'p-q010-a', rfqId: 'rfq-q010', quoteVersionId: 'v4-q010',
    name: 'Grade A — Managing Directors & Functional Heads', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider', 'Terminal Illness Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q010-b': {
    planId: 'p-q010-b', rfqId: 'rfq-q010', quoteVersionId: 'v4-q010',
    name: 'Grade B — AVPs & Senior Managers', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q010-c': {
    planId: 'p-q010-c', rfqId: 'rfq-q010', quoteVersionId: 'v4-q010',
    name: 'Grade C — Managers & Senior Analysts', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q010-d': {
    planId: 'p-q010-d', rfqId: 'rfq-q010', quoteVersionId: 'v4-q010',
    name: 'Grade D — Officers & Associates', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q011: Alpha Power — MULTI_PLAN, FROZEN ───────────────────────────
  'p-q011-a': {
    planId: 'p-q011-a', rfqId: 'rfq-q011', quoteVersionId: 'v4-q011',
    name: 'Grade A — Senior Engineers & Plant Managers', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider', 'Critical Illness Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q011-b': {
    planId: 'p-q011-b', rfqId: 'rfq-q011', quoteVersionId: 'v4-q011',
    name: 'Grade B — Technical Staff & Supervisors', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q011-c': {
    planId: 'p-q011-c', rfqId: 'rfq-q011', quoteVersionId: 'v4-q011',
    name: 'Grade C — Operations & Field Staff', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q012: Omega Textiles — SINGLE_PLAN, ARCHIVED ─────────────────────
  'p-q012-a': {
    planId: 'p-q012-a', rfqId: 'rfq-q012', quoteVersionId: 'v3-q012',
    name: 'Standard GTL Cover — All Employees', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.FLAT, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit', 'Accidental Death Rider'],
    excludedClauses: [{ code: 'PRE_EXIST_12M', label: 'Pre-existing (12 mo)', byDesk: 'UW', reason: 'Standard exclusion applied' }],
    handoffStatus: PlanHandoffStatus.RETURNED, completeness: 90,
  },
  // ── rfq-q013: Sigma Trading — SINGLE_PLAN, WITHDRAWN ─────────────────────
  'p-q013-a': {
    planId: 'p-q013-a', rfqId: 'rfq-q013', quoteVersionId: 'v3-q013',
    name: 'Standard GTL Cover — All Employees', productCode: 'GTL-BASE',
    sumAssuredBasis: SumAssuredBasis.FLAT, coverPattern: CoverPattern.LEVEL,
    benefits: ['Death Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q014: Pinnacle Logistics — GMC SINGLE_PLAN, SENT_TO_CLIENT ────────
  'p-q014-a': {
    planId: 'p-q014-a', rfqId: 'rfq-q014', quoteVersionId: 'v3-q014',
    name: 'GMC Floater — All Employees (₹3L cover)', productCode: 'GMC-BASE',
    sumAssuredBasis: SumAssuredBasis.FLAT, coverPattern: CoverPattern.LEVEL,
    benefits: ['Hospitalisation', 'Day Care Procedures', 'Pre & Post Hospitalisation'],
    excludedClauses: [{ code: 'COSMETIC_EXCL', label: 'Cosmetic Procedures', byDesk: 'UW', reason: 'Standard exclusion' }],
    handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  // ── rfq-q015: Meridian Health — GMC MULTI_PLAN, ARCHIVED ─────────────────
  'p-q015-a': {
    planId: 'p-q015-a', rfqId: 'rfq-q015', quoteVersionId: 'v3-q015',
    name: 'Grade A — Senior Staff (₹5L Floater)', productCode: 'GMC-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Hospitalisation', 'Day Care Procedures', 'Pre & Post Hospitalisation', 'Maternity Benefit', 'Critical Illness Cover'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q015-b': {
    planId: 'p-q015-b', rfqId: 'rfq-q015', quoteVersionId: 'v3-q015',
    name: 'Grade B — Mid-Level Staff (₹3L Floater)', productCode: 'GMC-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Hospitalisation', 'Day Care Procedures', 'Pre & Post Hospitalisation', 'Maternity Benefit'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
  'p-q015-c': {
    planId: 'p-q015-c', rfqId: 'rfq-q015', quoteVersionId: 'v3-q015',
    name: 'Grade C — General Staff (₹2L Floater)', productCode: 'GMC-BASE',
    sumAssuredBasis: SumAssuredBasis.SALARY_MULTIPLE, coverPattern: CoverPattern.LEVEL,
    benefits: ['Hospitalisation', 'Day Care Procedures', 'Pre & Post Hospitalisation'],
    excludedClauses: [], handoffStatus: PlanHandoffStatus.PRICED, completeness: 100,
  },
};

const documents: Record<string, RfqDocument[]> = {
  'rfq-001': [],
  'rfq-002': [],
  'rfq-005': [],
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

const deviations: Record<string, Deviation[]> = {
  'rfq-001': [],
  'rfq-002': [
    {
      id: 'dev-001',
      rfqId: 'rfq-002',
      planId: 'plan-003',
      scope: DeviationScope.GRADES,
      scopeDetail: 'G3',
      kind: DeviationKind.EXCLUSION,
      itemRef: 'PRE_EXISTING_EXCLUSION',
      itemLabel: 'Pre-existing Conditions',
      baselineValue: '12-month exclusion',
      negotiatedValue: '6-month exclusion',
      reason: 'Client negotiated reduced exclusion period based on prior claims history',
      estimatedPremiumDelta: 60000,
      estimatedLrDelta: 0.02,
      approvalStage: DeviationApprovalStage.PENDING_UW,
      approvalHistory: [
        {
          stage: DeviationApprovalStage.DRAFT,
          by: 'priya.sharma@insurer.com',
          at: '2026-06-09T10:00:00Z',
          note: 'Submitted for UW review',
        },
      ],
      createdBy: 'priya.sharma@insurer.com',
      createdAt: '2026-06-09T10:00:00Z',
      updatedAt: '2026-06-09T10:00:00Z',
    },
  ],
  'rfq-003': [],
  'rfq-004': [
    {
      id: 'dev-002',
      rfqId: 'rfq-004',
      planId: 'plan-006',
      scope: DeviationScope.WHOLE_PLAN,
      kind: DeviationKind.SI_CAP,
      itemLabel: 'Sum Insured Cap Override',
      baselineValue: '₹1,00,00,000',
      negotiatedValue: '₹2,00,00,000',
      reason: 'Senior executive grade requires higher SI cap beyond standard treaty limit',
      estimatedPremiumDelta: 280000,
      estimatedLrDelta: 0.04,
      approvalStage: DeviationApprovalStage.APPROVED,
      approvalHistory: [
        {
          stage: DeviationApprovalStage.DRAFT,
          by: 'karan.malhotra@insurer.com',
          at: '2026-05-20T09:00:00Z',
          note: 'Deviation raised for exec grade SA cap',
        },
        {
          stage: DeviationApprovalStage.PENDING_UW,
          by: 'karan.malhotra@insurer.com',
          at: '2026-05-21T11:00:00Z',
          note: 'Escalated to UW desk',
        },
        {
          stage: DeviationApprovalStage.APPROVED,
          by: 'uw.head@insurer.com',
          at: '2026-05-23T14:00:00Z',
          note: 'Approved with standard reinsurance referral above ₹1.5Cr per life',
        },
      ],
      createdBy: 'karan.malhotra@insurer.com',
      createdAt: '2026-05-20T09:00:00Z',
      updatedAt: '2026-05-23T14:00:00Z',
    },
  ],
};

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
  'rfq-q006': [
    {
      subsidiaryId: 'SUB-Q006-001',
      rfqId: 'rfq-q006',
      code: 'EEWM',
      name: 'EEW Machinery Ltd',
      locationMapping: 'Pune',
      billingSplitRule: 'HEADCOUNT',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
      status: 'ACTIVE',
    },
  ],
  'rfq-005': [
    {
      subsidiaryId: 'sub-001',
      rfqId: 'rfq-005',
      code: 'TCSBPS',
      name: 'TCS BPS Ltd',
      locationMapping: 'Mumbai',
      billingSplitRule: 'HEADCOUNT',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      status: 'ACTIVE',
    },
    {
      subsidiaryId: 'sub-002',
      rfqId: 'rfq-005',
      code: 'TCSFS',
      name: 'TCS Financial Solutions Ltd',
      locationMapping: 'Chennai',
      billingSplitRule: 'HEADCOUNT',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      status: 'ACTIVE',
    },
    {
      subsidiaryId: 'sub-003',
      rfqId: 'rfq-005',
      code: 'DILIGEN',
      name: 'Diligenta Ltd (UK)',
      locationMapping: 'UK',
      billingSplitRule: 'SI',
      startDate: '2023-04-01',
      endDate: '2024-03-31',
      status: 'LAPSED',
    },
  ],
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
  'rfq-005': Array.from({ length: 6 }, (_, i) => ({
    memberNumber: `MBR-005-${String(i + 1).padStart(3, '0')}`,
    rfqId: 'rfq-005',
    name: ['Nisha Agarwal', 'Ravi Shankar', 'Pooja Mehta', 'Sunil Das', 'Kavya Rao', 'Arjun Tiwari'][i],
    dateOfBirth: ['1979-05-14', '1982-09-22', '1987-03-11', '1975-12-30', '1991-06-18', '1985-08-05'][i],
    gender: ['F', 'M', 'F', 'M', 'F', 'M'][i],
    grade: ['G1', 'G1', 'G2', 'G2', 'G3', 'G3'][i],
    salary: [2400000, 2200000, 1200000, 1100000, 750000, 700000][i],
    sumAssured: [7200000, 6600000, 3600000, 3300000, 2250000, 2100000][i],
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
    const patch = (await request.json()) as Partial<RfqBase> & { mphProfile?: MphProfile };
    // If mphProfile is provided, derive and stamp mphAppetite server-side
    if (patch.mphProfile) {
      const p = patch.mphProfile;
      const wc = p.whiteCollarPct ?? 100;
      const lives = p.lives ?? 0;
      const zones = p.zones ?? 1;
      const hc = p.hazardClass ?? 'LOW';
      const hr = p.hazardousRoles ?? false;
      const bt = p.businessType ?? '';
      const reasons: string[] = [];
      if (hc === 'HIGH' || hc === 'SPECIAL') reasons.push('High or special hazard class');
      if (hr) reasons.push('Hazardous roles present');
      if (lives > 500) reasons.push('Lives exceed 500');
      if (zones > 5) reasons.push('More than 5 zones');
      if (bt === 'TAKEOVER') reasons.push('Takeover review required');
      if (wc < 50) reasons.push('Blue-collar majority');
      const band = lives < 100 ? 'SME' : lives <= 500 ? 'MID_CORPORATE' : 'CORPORATE';
      const cat = reasons.length > 0 ? 'Special \u2014 refer' : band === 'SME' ? 'SME \u00b7 straight-through' : band === 'MID_CORPORATE' ? 'Mid-market' : 'Large group';
      const disc = reasons.length > 0 ? 0 : band === 'SME' ? 8 : band === 'MID_CORPORATE' ? 10 : 12;
      let uwBand = 'Underwriting L1';
      if (hc === 'HIGH' || hc === 'SPECIAL') uwBand = 'Underwriting L2 (senior)';
      else if (hr) uwBand = 'Actuary referral';
      else if (reasons.length === 0 && band === 'SME') uwBand = 'Sales (straight-through)';
      patch.mphAppetite = {
        category: cat,
        maxDiscountPct: disc,
        uwAuthorityBand: uwBand,
        preapprovedCardRef: rfqs[rfqId].mphAppetite?.preapprovedCardRef,
        source: 'engine-server',
        evaluatedAt: now(),
      } as MphAppetite;
    }
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

  // GET /api/rfqs/:rfqId/plans  — filtered by ?versionId
  http.get('/api/rfqs/:rfqId/plans', ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const url = new URL(request.url);
    const versionId = url.searchParams.get('versionId');
    const result = plansForRfq(rfqId).filter((p) => !versionId || p.quoteVersionId === versionId);
    return HttpResponse.json(result);
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
    subsidiaries['rfq-005'] = [
      {
        subsidiaryId: 'sub-001',
        rfqId: 'rfq-005',
        code: 'TCSBPS',
        name: 'TCS BPS Ltd',
        locationMapping: 'Mumbai',
        billingSplitRule: 'HEADCOUNT',
        startDate: '2024-04-01',
        endDate: '2025-03-31',
        status: 'ACTIVE',
      },
      {
        subsidiaryId: 'sub-002',
        rfqId: 'rfq-005',
        code: 'TCSFS',
        name: 'TCS Financial Solutions Ltd',
        locationMapping: 'Chennai',
        billingSplitRule: 'HEADCOUNT',
        startDate: '2024-04-01',
        endDate: '2025-03-31',
        status: 'ACTIVE',
      },
      {
        subsidiaryId: 'sub-003',
        rfqId: 'rfq-005',
        code: 'DILIGEN',
        name: 'Diligenta Ltd (UK)',
        locationMapping: 'UK',
        billingSplitRule: 'SI',
        startDate: '2023-04-01',
        endDate: '2024-03-31',
        status: 'LAPSED',
      },
    ];
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
      code: (body.code ?? 'NEW').toUpperCase(),
      name: body.name ?? 'Unnamed',
      locationMapping: body.locationMapping,
      billingSplitRule: body.billingSplitRule ?? 'HEADCOUNT',
      startDate: body.startDate ?? new Date().toISOString().split('T')[0],
      endDate: body.endDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: body.status ?? 'ACTIVE',
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

  // ─── Clause library ────────────────────────────────────────────────────────

  // GET /api/library/clauses?bucket=&riders=
  http.get('/api/library/clauses', ({ request }) => {
    const url = new URL(request.url);
    const bucket = url.searchParams.get('bucket');
    const includeRiders = url.searchParams.get('riders') === 'true';
    let items = CLAUSE_LIBRARY;
    if (bucket) items = items.filter((c) => c.bucket === bucket || (includeRiders && c.isRider));
    return HttpResponse.json(items);
  }),

  // ─── Rate cards ────────────────────────────────────────────────────────────

  // GET /api/rate-cards?productCode=
  http.get('/api/rate-cards', ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('productCode');
    return HttpResponse.json(code ? PLAN_RATE_CARDS.filter((rc) => rc.productCode === code) : PLAN_RATE_CARDS);
  }),

  // ─── FCL schedule ──────────────────────────────────────────────────────────

  // GET /api/fcl-schedule?pattern=
  http.get('/api/fcl-schedule', ({ request }) => {
    const url = new URL(request.url);
    const pattern = url.searchParams.get('pattern') as keyof typeof FCL_LIMIT_SCHEDULE | null;
    if (pattern && FCL_LIMIT_SCHEDULE[pattern]) return HttpResponse.json(FCL_LIMIT_SCHEDULE[pattern]);
    return HttpResponse.json(FCL_LIMIT_SCHEDULE);
  }),

  // ─── Deviations ────────────────────────────────────────────────────────────

  // GET /api/rfqs/:rfqId/deviations
  http.get('/api/rfqs/:rfqId/deviations', ({ params }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(deviations[rfqId] ?? []);
  }),

  // POST /api/rfqs/:rfqId/deviations — create or update by id
  http.post('/api/rfqs/:rfqId/deviations', async ({ params, request }) => {
    const { rfqId } = params as { rfqId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const payload = (await request.json()) as Omit<Deviation, 'createdAt' | 'updatedAt'>;
    const timestamp = now();
    if (!deviations[rfqId]) deviations[rfqId] = [];
    const existing = deviations[rfqId].find((d) => d.id === payload.id);
    if (existing) {
      Object.assign(existing, { ...payload, updatedAt: timestamp });
      return HttpResponse.json(existing);
    }
    const deviation: Deviation = {
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    deviations[rfqId].push(deviation);
    return HttpResponse.json(deviation, { status: 201 });
  }),

  // PUT /api/rfqs/:rfqId/deviations/:deviationId — update approval stage
  http.put('/api/rfqs/:rfqId/deviations/:deviationId', async ({ params, request }) => {
    const { rfqId, deviationId } = params as { rfqId: string; deviationId: string };
    if (!rfqs[rfqId]) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const arr = deviations[rfqId] ?? [];
    const dev = arr.find((d) => d.id === deviationId);
    if (!dev) return HttpResponse.json({ error: 'Deviation not found' }, { status: 404 });
    const { stage, note, by } = (await request.json()) as { stage: DeviationApprovalStage; note: string; by?: string };
    const histEntry: DeviationHistoryEntry = {
      stage,
      by: by ?? 'system',
      at: now(),
      note,
    };
    dev.approvalStage = stage;
    dev.approvalHistory = [...(dev.approvalHistory ?? []), histEntry];
    dev.updatedAt = now();
    return HttpResponse.json(dev);
  }),
];
