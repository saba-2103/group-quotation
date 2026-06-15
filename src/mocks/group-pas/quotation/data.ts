/**
 * Group PAS — Quotation module V2 mock data.
 *
 * Contains:
 *   - 3 mock clients, 2 mock brokers
 *   - PC catalog: 2 base products (GTL, GH) + 3 riders each
 *   - 8-10 mock quotes in varied states, 1-3 versions each
 *   - Round log entries (approved + rejected)
 *   - Member quotes (GCL)
 */

import type {
  ActuaryQueueItem,
  AggregateCensusV2,
  DocumentAttachment,
  MemberQuoteV2,
  PlanDefinition,
  PlanV2,
  ProductCatalogItem,
  Quote,
  QuoteVersion,
  QuoteVersionStatus,
  Round,
  UWQueueItem,
} from '@/types/group-pas/quotation-v2';
import type { Money } from '@/types/group-pas/common';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const inr = (amount: number): Money => ({ amount, currency: 'INR' });

const dt = (date: string, time = '09:00:00') => `${date}T${time}.000Z`;

// ─────────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────────

export interface MockClient {
  id: string;
  client_number: string;
  name: string;
  industry: string;
  headcount_approx: number;
}

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: 'CLI-0001',
    client_number: 'C-2026-0001',
    name: 'ACME Corp',
    industry: 'Manufacturing',
    headcount_approx: 1200,
  },
  {
    id: 'CLI-0002',
    client_number: 'C-2026-0002',
    name: 'Zenith Textiles',
    industry: 'Textiles',
    headcount_approx: 450,
  },
  {
    id: 'CLI-0003',
    client_number: 'C-2026-0003',
    name: 'BrightStar Logistics',
    industry: 'Logistics',
    headcount_approx: 820,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Brokers
// ─────────────────────────────────────────────────────────────────────────────

export interface MockBroker {
  id: string;
  broker_number: string;
  name: string;
}

export const MOCK_BROKERS: MockBroker[] = [
  { id: 'BRK-0001', broker_number: 'B-2026-0001', name: 'Horizon Insurance Brokers' },
  { id: 'BRK-0002', broker_number: 'B-2026-0002', name: 'Meridian Re Advisory' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PC Catalog
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  // ── GTL base ──
  {
    productCode: 'GTL-BASE',
    productName: 'Group Term Life',
    productType: 'BASE',
    schemeTypes: ['GTL'],
    description: 'Core mortality cover for all group members.',
    defaultBenefits: [
      { code: 'DEATH_BENEFIT', name: 'Death Benefit', productType: 'BASE', mandatory: true },
      { code: 'TPD', name: 'Total & Permanent Disability', productType: 'BASE', mandatory: false },
    ],
  },
  // ── GTL riders ──
  {
    productCode: 'GTL-ADB',
    productName: 'Accidental Death Benefit',
    productType: 'RIDER',
    schemeTypes: ['GTL'],
    description: 'Additional benefit on accidental death.',
    defaultBenefits: [
      { code: 'ADB', name: 'Accidental Death Benefit', productType: 'RIDER', mandatory: true },
    ],
  },
  {
    productCode: 'GTL-CI',
    productName: 'Critical Illness Accelerator',
    productType: 'RIDER',
    schemeTypes: ['GTL'],
    description: 'Accelerated payout on critical illness diagnosis.',
    defaultBenefits: [
      { code: 'CI_PAYOUT', name: 'Critical Illness Payout', productType: 'RIDER', mandatory: true },
    ],
  },
  {
    productCode: 'GTL-WOP',
    productName: 'Waiver of Premium',
    productType: 'RIDER',
    schemeTypes: ['GTL'],
    description: 'Premiums waived on total disability.',
    defaultBenefits: [
      { code: 'PREMIUM_WAIVER', name: 'Premium Waiver', productType: 'RIDER', mandatory: true },
    ],
  },
  // ── GH base ──
  {
    productCode: 'GH-BASE',
    productName: 'Group Health',
    productType: 'BASE',
    schemeTypes: ['GH'],
    description: 'Comprehensive group mediclaim cover.',
    defaultBenefits: [
      { code: 'HOSPITALISATION', name: 'Hospitalisation', productType: 'BASE', mandatory: true },
      { code: 'OPD', name: 'OPD', productType: 'BASE', mandatory: false },
    ],
  },
  // ── GH riders ──
  {
    productCode: 'GH-MATERNITY',
    productName: 'Maternity Cover',
    productType: 'RIDER',
    schemeTypes: ['GH'],
    description: 'Normal and C-section delivery expenses.',
    defaultBenefits: [
      { code: 'MATERNITY', name: 'Maternity', productType: 'RIDER', mandatory: true },
    ],
  },
  {
    productCode: 'GH-DENTAL',
    productName: 'Dental & Vision',
    productType: 'RIDER',
    schemeTypes: ['GH'],
    description: 'Dental procedures and vision correction.',
    defaultBenefits: [
      { code: 'DENTAL', name: 'Dental', productType: 'RIDER', mandatory: false },
      { code: 'VISION', name: 'Vision', productType: 'RIDER', mandatory: false },
    ],
  },
  {
    productCode: 'GH-TOPUP',
    productName: 'Super Top-Up',
    productType: 'RIDER',
    schemeTypes: ['GH'],
    description: 'Covers hospitalisation costs above base SI threshold.',
    defaultBenefits: [
      { code: 'SUPER_TOPUP', name: 'Super Top-Up', productType: 'RIDER', mandatory: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable plan fixtures
// ─────────────────────────────────────────────────────────────────────────────

const gtlPlanDefStandard: PlanDefinition = {
  plan_product: [
    {
      productCode: 'GTL-BASE',
      productName: 'Group Term Life',
      productType: 'BASE',
      benefits: [
        { code: 'DEATH_BENEFIT', name: 'Death Benefit', productType: 'BASE', mandatory: true },
        { code: 'TPD', name: 'Total & Permanent Disability', productType: 'BASE', mandatory: false },
      ],
    },
  ],
  si: { basis: 'MULTIPLE_OF_SALARY', multiplier: 24 },
  fcl: { type: 'FIXED', amount: inr(2_000_000) },
  nml: { type: 'PERCENTAGE_OF_FCL', percentage: 150 },
  rate_card: { rateCardId: 'RC-GTL-2026-STD', rateCardName: 'GTL Standard 2026', effectiveFrom: '2026-01-01' },
};

const gtlPlanDefEnhanced: PlanDefinition = {
  plan_product: [
    {
      productCode: 'GTL-BASE',
      productName: 'Group Term Life',
      productType: 'BASE',
      benefits: [
        { code: 'DEATH_BENEFIT', name: 'Death Benefit', productType: 'BASE', mandatory: true },
        { code: 'TPD', name: 'Total & Permanent Disability', productType: 'BASE', mandatory: false },
      ],
    },
    {
      productCode: 'GTL-ADB',
      productName: 'Accidental Death Benefit',
      productType: 'RIDER',
      benefits: [
        { code: 'ADB', name: 'Accidental Death Benefit', productType: 'RIDER', mandatory: true },
      ],
    },
  ],
  si: { basis: 'MULTIPLE_OF_SALARY', multiplier: 36 },
  fcl: { type: 'FIXED', amount: inr(3_500_000) },
  nml: { type: 'PERCENTAGE_OF_FCL', percentage: 150 },
  rate_card: { rateCardId: 'RC-GTL-2026-ENH', rateCardName: 'GTL Enhanced 2026', effectiveFrom: '2026-01-01' },
};

const ghPlanDefBase: PlanDefinition = {
  plan_product: [
    {
      productCode: 'GH-BASE',
      productName: 'Group Health',
      productType: 'BASE',
      benefits: [
        { code: 'HOSPITALISATION', name: 'Hospitalisation', productType: 'BASE', mandatory: true },
        { code: 'OPD', name: 'OPD', productType: 'BASE', mandatory: false },
      ],
    },
  ],
  si: { basis: 'FIXED', fixedAmount: inr(500_000) },
  fcl: { type: 'FIXED', amount: inr(500_000) },
  nml: { type: 'FIXED', amount: inr(750_000) },
  rate_card: { rateCardId: 'RC-GH-2026-BASE', rateCardName: 'GH Base 2026', effectiveFrom: '2026-01-01' },
};

export const PLAN_GTL_STANDARD: PlanV2 = {
  plan_id: 'PLN-GTL-STD',
  plan_number: 'PLAN-001',
  plan_name: 'GTL Standard',
  plan_definition: gtlPlanDefStandard,
};

export const PLAN_GTL_ENHANCED: PlanV2 = {
  plan_id: 'PLN-GTL-ENH',
  plan_number: 'PLAN-002',
  plan_name: 'GTL Enhanced',
  plan_definition: gtlPlanDefEnhanced,
};

export const PLAN_GH_BASE: PlanV2 = {
  plan_id: 'PLN-GH-BASE',
  plan_number: 'PLAN-003',
  plan_name: 'GH Base Cover',
  plan_definition: ghPlanDefBase,
};

// ── GCL plan ──

const gclPlanDefStandard: PlanDefinition = {
  plan_product: [
    {
      productCode: 'GCL-BASE',
      productName: 'Group Credit Life',
      productType: 'BASE',
      benefits: [
        { code: 'LOAN_DEATH_BENEFIT', name: 'Loan Death Benefit', productType: 'BASE', mandatory: true },
        { code: 'LOAN_TPD_BENEFIT', name: 'Total & Permanent Disability', productType: 'BASE', mandatory: false },
      ],
    },
  ],
  si: { basis: 'FIXED', fixedAmount: inr(0) }, // per-member; SA = loan outstanding
  fcl: { type: 'FIXED', amount: inr(10_000_000) }, // scheme-level FCL cap
  nml: { type: 'FIXED', amount: inr(10_000_000) },
  rate_card: { rateCardId: 'RC-GCL-2026-STD', rateCardName: 'GCL Standard 2026', effectiveFrom: '2026-01-01' },
};

export const PLAN_GCL_STANDARD: PlanV2 = {
  plan_id: 'PLN-GCL-STD',
  plan_number: 'PLAN-004',
  plan_name: 'GCL Standard',
  plan_definition: gclPlanDefStandard,
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable census fixtures
// ─────────────────────────────────────────────────────────────────────────────

const census = (headcount: number, planId: string): AggregateCensusV2 => ({
  headcount,
  avgAge: 34,
  avgSumInsured: inr(2_400_000),
  industryHazardBand: 'MEDIUM',
  coverageBasis: 'EMPLOYEE_ONLY',
  planBreakdown: [{ planId, headcount }],
});

const censusSplit = (total: number, planA: string, planB: string): AggregateCensusV2 => ({
  headcount: total,
  avgAge: 36,
  avgSumInsured: inr(2_800_000),
  industryHazardBand: 'MEDIUM',
  coverageBasis: 'EMPLOYEE_SPOUSE',
  planBreakdown: [
    { planId: planA, headcount: Math.round(total * 0.65) },
    { planId: planB, headcount: Math.round(total * 0.35) },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Round log helpers
// ─────────────────────────────────────────────────────────────────────────────

const uwRoundApproved = (roundId: string, assignedAt: string): Round => ({
  roundId,
  roundKind: 'UW',
  roundNumber: 1,
  assignedTo: 'usr-uw-001',
  assignedToName: 'Jordan Lee',
  requestedByName: 'Alex Carter',
  requestComment: 'Please review — a few members are above FCL threshold and require manual sign-off.',
  assignedAt: dt(assignedAt, '10:00:00'),
  completedAt: dt(assignedAt, '15:30:00'),
  outcome: 'APPROVED',
  remarks: 'All members within FCL. Auto-approve criteria met post manual review.',
  parameterOverrides: [],
});

const uwRoundRejected = (roundId: string, assignedAt: string): Round => ({
  roundId,
  roundKind: 'UW',
  roundNumber: 1,
  assignedTo: 'usr-uw-001',
  assignedToName: 'Jordan Lee',
  requestedByName: 'Alex Carter',
  requestComment: 'Logistics workforce — high proportion above NML. Needs manual review before we can proceed to pricing.',
  assignedAt: dt(assignedAt, '11:00:00'),
  completedAt: dt(assignedAt, '16:00:00'),
  outcome: 'REJECTED',
  remarks: 'High hazard industry band. 14% of members above NML without sufficient medical evidence.',
  attached_document_refs: [],

  parameterOverrides: [
    {
      parameterId: 'LOADING_FACTOR',
      parameterName: 'Occupational Loading Factor',
      originalValue: 1.0,
      overrideValue: 1.35,
      constraint: { type: 'RANGE', min: 1.0, max: 2.0 },
      overrideReason: 'High-hazard logistics workforce composition',
      overriddenBy: 'Jordan Lee',
      overriddenAt: dt(assignedAt, '15:00:00'),
    },
  ],
});

const pricingRoundApproved = (roundId: string, assignedAt: string): Round => ({
  roundId,
  roundKind: 'PRICING',
  roundNumber: 1,
  assignedTo: 'usr-act-001',
  assignedToName: 'Sam Patel',
  requestedByName: 'Alex Carter',
  requestComment: 'Group size above 500 — please confirm rate card is within acceptable corridor.',
  assignedAt: dt(assignedAt, '09:30:00'),
  completedAt: dt(assignedAt, '14:00:00'),
  outcome: 'APPROVED',
  remarks: 'Pricing within corridor. Rate maintained at standard table. No rate card overrides required.',
  parameterOverrides: [],
});

// ─────────────────────────────────────────────────────────────────────────────
// Document attachment helper
// ─────────────────────────────────────────────────────────────────────────────

const censusDoc = (id: string, uploadedAt: string): DocumentAttachment => ({
  attachmentId: id,
  documentTypeId: 'DOC-CENSUS',
  documentTypeName: 'Member Census',
  fileName: 'census_2026.xlsx',
  fileUrl: '/mock-files/census_2026.xlsx',
  uploadedBy: 'Alex Carter',
  uploadedAt: dt(uploadedAt),
  sizeBytes: 248_320,
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

// ─────────────────────────────────────────────────────────────────────────────
// Version builders
// ─────────────────────────────────────────────────────────────────────────────

function makeVersion(
  overrides: Partial<QuoteVersion> & Pick<QuoteVersion, 'version_id' | 'version_number' | 'quote_id' | 'status' | 'plans' | 'aggregate_census' | 'created_at'>,
): QuoteVersion {
  return {
    uw_path: 'AUTO',
    pricing_path: 'AUTO',
    round_log: [],
    attached_documents: [],
    last_updated_at: overrides.created_at,
    created_by: 'usr-sales-001',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quotes
// ─────────────────────────────────────────────────────────────────────────────

export const QUOTES_V2: Quote[] = [

  // ── Q001 · ACME Corp · GTL · DRAFT (single version, brand new) ──────────
  {
    id: 'QTE-V2-0001',
    quote_number: 'QN-2026-0001',
    client_id: 'CLI-0001',
    client_number: 'C-2026-0001',
    client_name: 'ACME Corp',
    broker_id: 'BRK-0001',
    broker_name: 'Horizon Insurance Brokers',
    scheme_type: 'GTL',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'SALES_CLICK',
    coverage_basis: 'EMPLOYEE_ONLY',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-07-01',
    intended_expiry_date: '2027-06-30',
    status: 'DRAFT',
    created_at: dt('2026-05-10'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-10'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0001-A',
        version_number: 1,
        quote_id: 'QTE-V2-0001',
        status: 'DRAFT',
        plans: [PLAN_GTL_STANDARD],
        aggregate_census: census(320, 'PLN-GTL-STD'),
        created_at: dt('2026-05-10'),
        attached_documents: [censusDoc('ATT-001', '2026-05-10')],
      }),
    ],
  },

  // ── Q002 · ACME Corp · GTL · ACTIVE — version in REFERRED_MANUAL_UW ────
  {
    id: 'QTE-V2-0002',
    quote_number: 'QN-2026-0002',
    client_id: 'CLI-0001',
    client_number: 'C-2026-0001',
    client_name: 'ACME Corp',
    scheme_type: 'GTL',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'PORTAL_UPLOAD',
    coverage_basis: 'EMPLOYEE_SPOUSE',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-08-01',
    intended_expiry_date: '2027-07-31',
    status: 'ACTIVE',
    created_at: dt('2026-05-12'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-14'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0002-A',
        version_number: 1,
        quote_id: 'QTE-V2-0002',
        status: 'REFERRED_MANUAL_UW',
        uw_path: 'MANUAL',
        pricing_path: 'AUTO',
        plans: [PLAN_GTL_ENHANCED],
        aggregate_census: censusSplit(150, 'PLN-GTL-ENH', 'PLN-GTL-STD'),
        created_at: dt('2026-05-12'),
        last_updated_at: dt('2026-05-14'),
        attached_documents: [censusDoc('ATT-002', '2026-05-12')],
        round_log: [
          {
            roundId: 'RND-001',
            roundKind: 'UW',
            roundNumber: 1,
            assignedTo: 'usr-uw-001',
            assignedToName: 'Jordan Lee',
            requestedByName: 'Alex Carter',
            requestComment: 'Enhanced plan covers 150 members — several above NML, particularly in the engineering division. Please advise on FCL/NML override.',
            assignedAt: dt('2026-05-14', '10:00:00'),
            remarks: undefined,
          },
        ],
      }),
    ],
  },

  // ── Q003 · Zenith Textiles · GTL · ACTIVE — version in REFERRED_MANUAL_PRICING ─
  {
    id: 'QTE-V2-0003',
    quote_number: 'QN-2026-0003',
    client_id: 'CLI-0002',
    client_number: 'C-2026-0002',
    client_name: 'Zenith Textiles',
    broker_id: 'BRK-0002',
    broker_name: 'Meridian Re Advisory',
    scheme_type: 'GTL',
    business_type: 'RENEWAL',
    intake_channel: 'INBOUND_MAILBOX',
    coverage_basis: 'EMPLOYEE_SPOUSE_CHILDREN',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-09-01',
    intended_expiry_date: '2027-08-31',
    status: 'ACTIVE',
    created_at: dt('2026-05-05'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-20'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0003-A',
        version_number: 1,
        quote_id: 'QTE-V2-0003',
        status: 'REFERRED_MANUAL_PRICING',
        uw_path: 'MANUAL',
        pricing_path: 'MANUAL',
        plans: [PLAN_GTL_STANDARD, PLAN_GTL_ENHANCED],
        aggregate_census: censusSplit(450, 'PLN-GTL-STD', 'PLN-GTL-ENH'),
        created_at: dt('2026-05-05'),
        last_updated_at: dt('2026-05-20'),
        attached_documents: [censusDoc('ATT-003', '2026-05-05')],
        round_log: [
          uwRoundApproved('RND-002', '2026-05-15'),
          {
            roundId: 'RND-003',
            roundKind: 'PRICING',
            roundNumber: 1,
            assignedTo: 'usr-act-001',
            assignedToName: 'Sam Patel',
            requestedByName: 'Alex Carter',
            requestComment: 'Renewal case with 450 mixed-plan members. Group size triggers manual pricing corridor check. Please review rate card applicability.',
            assignedAt: dt('2026-05-20', '09:30:00'),
            remarks: undefined,
          },
        ],
      }),
    ],
  },

  // ── Q004 · BrightStar Logistics · GTL · FINALIZED ───────────────────────
  {
    id: 'QTE-V2-0004',
    quote_number: 'QN-2026-0004',
    client_id: 'CLI-0003',
    client_number: 'C-2026-0003',
    client_name: 'BrightStar Logistics',
    scheme_type: 'GTL',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'SALES_CLICK',
    coverage_basis: 'EMPLOYEE_ONLY',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-06-01',
    intended_expiry_date: '2027-05-31',
    status: 'FINALIZED',
    created_at: dt('2026-04-20'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-28'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0004-A',
        version_number: 1,
        quote_id: 'QTE-V2-0004',
        status: 'FINALIZED',
        uw_path: 'AUTO',
        pricing_path: 'AUTO',
        plans: [PLAN_GTL_STANDARD],
        aggregate_census: census(820, 'PLN-GTL-STD'),
        premium: {
          grossPremium: inr(29_520_000),
          netPremium: inr(27_500_000),
          gst: inr(4_950_000),
          totalPremium: inr(32_450_000),
          breakup: [
            { productCode: 'GTL-BASE', productName: 'Group Term Life', premium: inr(27_500_000) },
          ],
        },
        created_at: dt('2026-04-20'),
        last_updated_at: dt('2026-05-28'),
        finalized_at: dt('2026-05-28'),
        submitted_at: dt('2026-05-01'),
        sent_to_client_at: dt('2026-05-10'),
        accepted_at: dt('2026-05-25'),
        attached_documents: [censusDoc('ATT-004', '2026-04-20')],
        round_log: [],
      }),
    ],
  },

  // ── Q005 · Zenith Textiles · GTL · ACTIVE — multi-version (comparison) ──
  {
    id: 'QTE-V2-0005',
    quote_number: 'QN-2026-0005',
    client_id: 'CLI-0002',
    client_number: 'C-2026-0002',
    client_name: 'Zenith Textiles',
    scheme_type: 'GTL',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'SALES_CLICK',
    coverage_basis: 'EMPLOYEE_ONLY',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-10-01',
    intended_expiry_date: '2027-09-30',
    status: 'ACTIVE',
    created_at: dt('2026-05-01'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-22'),
    versions: [
      // V1 — superseded
      makeVersion({
        version_id: 'VER-V2-0005-A',
        version_number: 1,
        quote_id: 'QTE-V2-0005',
        status: 'SUPERSEDED',
        plans: [PLAN_GTL_STANDARD],
        aggregate_census: census(250, 'PLN-GTL-STD'),
        premium: {
          grossPremium: inr(9_000_000),
          netPremium: inr(8_500_000),
          gst: inr(1_530_000),
          totalPremium: inr(10_030_000),
          breakup: [{ productCode: 'GTL-BASE', productName: 'Group Term Life', premium: inr(8_500_000) }],
        },
        created_at: dt('2026-05-01'),
        last_updated_at: dt('2026-05-18'),
        superseded_by_version_id: 'VER-V2-0005-B',
        supersession_cause: 'EXPLICIT_REPLACEMENT',
        attached_documents: [censusDoc('ATT-005a', '2026-05-01')],
        round_log: [uwRoundApproved('RND-004', '2026-05-10')],
      }),
      // V2 — current, RATED with pricing done
      makeVersion({
        version_id: 'VER-V2-0005-B',
        version_number: 2,
        quote_id: 'QTE-V2-0005',
        status: 'RATED',
        uw_path: 'AUTO',
        pricing_path: 'AUTO',
        plans: [PLAN_GTL_STANDARD, PLAN_GTL_ENHANCED],
        aggregate_census: censusSplit(250, 'PLN-GTL-STD', 'PLN-GTL-ENH'),
        premium: {
          grossPremium: inr(10_800_000),
          netPremium: inr(10_200_000),
          gst: inr(1_836_000),
          totalPremium: inr(12_036_000),
          breakup: [
            { productCode: 'GTL-BASE', productName: 'Group Term Life', premium: inr(9_000_000) },
            { productCode: 'GTL-ADB', productName: 'Accidental Death Benefit', premium: inr(1_200_000) },
          ],
        },
        created_at: dt('2026-05-18'),
        last_updated_at: dt('2026-05-22'),
        attached_documents: [censusDoc('ATT-005b', '2026-05-18')],
        round_log: [uwRoundApproved('RND-005', '2026-05-20')],
      }),
    ],
  },

  // ── Q006 · ACME Corp · GH · ACTIVE — SUBMITTED ──────────────────────────
  {
    id: 'QTE-V2-0006',
    quote_number: 'QN-2026-0006',
    client_id: 'CLI-0001',
    client_number: 'C-2026-0001',
    client_name: 'ACME Corp',
    scheme_type: 'GH',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'SALES_CLICK',
    coverage_basis: 'EMPLOYEE_SPOUSE',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-08-01',
    intended_expiry_date: '2027-07-31',
    status: 'ACTIVE',
    created_at: dt('2026-05-15'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-26'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0006-A',
        version_number: 1,
        quote_id: 'QTE-V2-0006',
        status: 'SUBMITTED',
        plans: [PLAN_GH_BASE],
        aggregate_census: census(1200, 'PLN-GH-BASE'),
        premium: {
          grossPremium: inr(18_000_000),
          netPremium: inr(17_000_000),
          gst: inr(3_060_000),
          totalPremium: inr(20_060_000),
          breakup: [{ productCode: 'GH-BASE', productName: 'Group Health', premium: inr(17_000_000) }],
        },
        created_at: dt('2026-05-15'),
        last_updated_at: dt('2026-05-26'),
        submitted_at: dt('2026-05-26'),
        attached_documents: [censusDoc('ATT-006', '2026-05-15')],
        round_log: [],
      }),
    ],
  },

  // ── Q007 · BrightStar Logistics · GTL · ACTIVE — multi-version, V1 UW rejected, V2 in EVALUATED ─
  {
    id: 'QTE-V2-0007',
    quote_number: 'QN-2026-0007',
    client_id: 'CLI-0003',
    client_number: 'C-2026-0003',
    client_name: 'BrightStar Logistics',
    scheme_type: 'GTL',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'PORTAL_UPLOAD',
    coverage_basis: 'EMPLOYEE_SPOUSE_CHILDREN',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-09-01',
    intended_expiry_date: '2027-08-31',
    status: 'ACTIVE',
    created_at: dt('2026-04-28'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-25'),
    versions: [
      // V1 — UW rejected, superseded
      makeVersion({
        version_id: 'VER-V2-0007-A',
        version_number: 1,
        quote_id: 'QTE-V2-0007',
        status: 'SUPERSEDED',
        uw_path: 'MANUAL',
        pricing_path: 'AUTO',
        plans: [PLAN_GTL_ENHANCED],
        aggregate_census: census(820, 'PLN-GTL-ENH'),
        created_at: dt('2026-04-28'),
        last_updated_at: dt('2026-05-15'),
        superseded_by_version_id: 'VER-V2-0007-B',
        supersession_cause: 'EXPLICIT_REPLACEMENT',
        attached_documents: [censusDoc('ATT-007a', '2026-04-28')],
        round_log: [uwRoundRejected('RND-006', '2026-05-10')],
      }),
      // V2 — EVALUATED (UW done, pricing pending)
      makeVersion({
        version_id: 'VER-V2-0007-B',
        version_number: 2,
        quote_id: 'QTE-V2-0007',
        status: 'EVALUATED',
        uw_path: 'MANUAL',
        pricing_path: 'AUTO',
        plans: [PLAN_GTL_STANDARD, PLAN_GTL_ENHANCED],
        aggregate_census: censusSplit(820, 'PLN-GTL-STD', 'PLN-GTL-ENH'),
        created_at: dt('2026-05-15'),
        last_updated_at: dt('2026-05-25'),
        attached_documents: [censusDoc('ATT-007b', '2026-05-15')],
        round_log: [uwRoundApproved('RND-007', '2026-05-22')],
      }),
    ],
  },

  // ── Q008 · Zenith Textiles · GTL · WITHDRAWN ────────────────────────────
  {
    id: 'QTE-V2-0008',
    quote_number: 'QN-2026-0008',
    client_id: 'CLI-0002',
    client_number: 'C-2026-0002',
    client_name: 'Zenith Textiles',
    scheme_type: 'GTL',
    business_type: 'RENEWAL',
    intake_channel: 'OFFLINE_PHYSICAL',
    coverage_basis: 'EMPLOYEE_ONLY',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-06-01',
    intended_expiry_date: '2027-05-31',
    status: 'WITHDRAWN',
    created_at: dt('2026-04-10'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-01'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0008-A',
        version_number: 1,
        quote_id: 'QTE-V2-0008',
        status: 'WITHDRAWN',
        plans: [PLAN_GTL_STANDARD],
        aggregate_census: census(450, 'PLN-GTL-STD'),
        created_at: dt('2026-04-10'),
        last_updated_at: dt('2026-05-01'),
        withdrawn_at: dt('2026-05-01'),
        withdrawn_cause: 'SALES_PULL',
        attached_documents: [censusDoc('ATT-008', '2026-04-10')],
        round_log: [],
      }),
    ],
  },

  // ── Q009 · BrightStar Logistics · GTL · ACTIVE — SENT_TO_CLIENT ─────────
  {
    id: 'QTE-V2-0009',
    quote_number: 'QN-2026-0009',
    client_id: 'CLI-0003',
    client_number: 'C-2026-0003',
    client_name: 'BrightStar Logistics',
    scheme_type: 'GTL',
    business_type: 'RENEWAL',
    intake_channel: 'SALES_CLICK',
    coverage_basis: 'EMPLOYEE_SPOUSE',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-07-01',
    intended_expiry_date: '2027-06-30',
    status: 'ACTIVE',
    created_at: dt('2026-05-08'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-28'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0009-A',
        version_number: 1,
        quote_id: 'QTE-V2-0009',
        status: 'SENT_TO_CLIENT',
        plans: [PLAN_GTL_STANDARD],
        aggregate_census: census(820, 'PLN-GTL-STD'),
        premium: {
          grossPremium: inr(22_140_000),
          netPremium: inr(20_800_000),
          gst: inr(3_744_000),
          totalPremium: inr(24_544_000),
          breakup: [{ productCode: 'GTL-BASE', productName: 'Group Term Life', premium: inr(20_800_000) }],
        },
        created_at: dt('2026-05-08'),
        last_updated_at: dt('2026-05-28'),
        submitted_at: dt('2026-05-20'),
        sent_to_client_at: dt('2026-05-28'),
        attached_documents: [censusDoc('ATT-009', '2026-05-08')],
        round_log: [pricingRoundApproved('RND-008', '2026-05-18')],
      }),
    ],
  },

  // ── Q010 · ACME Corp · GH · ACTIVE — ACCEPTED ───────────────────────────
  {
    id: 'QTE-V2-0010',
    quote_number: 'QN-2026-0010',
    client_id: 'CLI-0001',
    client_number: 'C-2026-0001',
    client_name: 'ACME Corp',
    scheme_type: 'GH',
    business_type: 'RENEWAL',
    intake_channel: 'API',
    coverage_basis: 'EMPLOYEE_SPOUSE_CHILDREN',
    premium_type: 'ANNUAL',
    intended_inception_date: '2026-07-01',
    intended_expiry_date: '2027-06-30',
    status: 'ACTIVE',
    created_at: dt('2026-04-15'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-30'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0010-A',
        version_number: 1,
        quote_id: 'QTE-V2-0010',
        status: 'ACCEPTED',
        plans: [PLAN_GH_BASE],
        aggregate_census: census(1200, 'PLN-GH-BASE'),
        premium: {
          grossPremium: inr(28_800_000),
          netPremium: inr(27_200_000),
          gst: inr(4_896_000),
          totalPremium: inr(32_096_000),
          breakup: [{ productCode: 'GH-BASE', productName: 'Group Health', premium: inr(27_200_000) }],
        },
        created_at: dt('2026-04-15'),
        last_updated_at: dt('2026-05-30'),
        submitted_at: dt('2026-05-01'),
        sent_to_client_at: dt('2026-05-15'),
        accepted_at: dt('2026-05-30'),
        attached_documents: [censusDoc('ATT-010', '2026-04-15')],
        round_log: [],
      }),
    ],
  },

  // ── Q011 · BrightStar Finance Bank · GCL · ACTIVE — ACCEPTED ────────────
  // GCL per-member scheme. No aggregate census / pricing; partner agents
  // create individual MemberQuotes per loan disbursement.
  {
    id: 'QTE-V2-0011',
    quote_number: 'QN-2026-0011',
    client_id: 'CLI-0003',
    client_number: 'C-2026-0003',
    client_name: 'BrightStar Logistics',
    broker_id: 'BRK-0001',
    broker_name: 'Horizon Insurance Brokers',
    scheme_type: 'GCL',
    business_type: 'NEW_BUSINESS',
    intake_channel: 'SALES_CLICK',
    coverage_basis: 'EMPLOYEE_ONLY',
    premium_type: 'SINGLE',
    intended_inception_date: '2026-06-01',
    intended_expiry_date: '2027-05-31',
    status: 'ACTIVE',
    created_at: dt('2026-05-20'),
    created_by: 'Alex Carter',
    last_updated_at: dt('2026-05-28'),
    versions: [
      makeVersion({
        version_id: 'VER-V2-0011-A',
        version_number: 1,
        quote_id: 'QTE-V2-0011',
        status: 'ACCEPTED',
        plans: [PLAN_GCL_STANDARD],
        aggregate_census: { headcount: 0, planBreakdown: [] }, // GCL: no aggregate census
        created_at: dt('2026-05-20'),
        last_updated_at: dt('2026-05-28'),
        accepted_at: dt('2026-05-28'),
        attached_documents: [],
        round_log: [],
      }),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Derived UW queue
// ─────────────────────────────────────────────────────────────────────────────

export const UW_QUEUE_ITEMS: UWQueueItem[] = QUOTES_V2.flatMap((q) =>
  q.versions
    .filter((v) => v.status === 'REFERRED_MANUAL_UW')
    .map((v) => ({
      quote_id: q.id,
      quote_number: q.quote_number,
      version_id: v.version_id,
      version_number: v.version_number,
      client_name: q.client_name,
      scheme_type: q.scheme_type,
      headcount: v.aggregate_census.headcount,
      industry_hazard_band: v.aggregate_census.industryHazardBand,
      referred_at: v.round_log[v.round_log.length - 1]?.assignedAt ?? v.created_at,
      assigned_to: v.round_log[v.round_log.length - 1]?.assignedTo,
      assigned_to_name: v.round_log[v.round_log.length - 1]?.assignedToName,
      round_number: v.round_log.length,
      premium: v.premium?.totalPremium,
    })),
);

// ─────────────────────────────────────────────────────────────────────────────
// Derived Actuary queue
// ─────────────────────────────────────────────────────────────────────────────

export const ACTUARY_QUEUE_ITEMS: ActuaryQueueItem[] = QUOTES_V2.flatMap((q) =>
  q.versions
    .filter((v) => v.status === 'REFERRED_MANUAL_PRICING')
    .map((v) => {
      const pricingRound = v.round_log.find((r) => r.roundKind === 'PRICING');
      const uwRound = v.round_log.find((r) => r.roundKind === 'UW' && r.outcome === 'APPROVED');
      return {
        quote_id: q.id,
        quote_number: q.quote_number,
        version_id: v.version_id,
        version_number: v.version_number,
        client_name: q.client_name,
        scheme_type: q.scheme_type,
        headcount: v.aggregate_census.headcount,
        uw_approved_at: uwRound?.completedAt,
        referred_at: pricingRound?.assignedAt ?? v.created_at,
        assigned_to: pricingRound?.assignedTo,
        assigned_to_name: pricingRound?.assignedToName,
        round_number: v.round_log.filter((r) => r.roundKind === 'PRICING').length,
      };
    }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Member quotes (GCL demo)
// ─────────────────────────────────────────────────────────────────────────────

export const MEMBER_QUOTES_V2: MemberQuoteV2[] = [
  {
    id: 'MQV2-0001',
    quote_id: 'QTE-V2-0011',
    parent_quote_number: 'QN-2026-0011',
    parent_client_name: 'BrightStar Logistics',
    member_name: 'Rohan Mehta',
    member_dob: '1985-03-12',
    member_role_occupation: 'Warehouse Supervisor',
    loan_reference: 'LN-2026-0001',
    loan_amount: inr(2_500_000),
    loan_tenure_months: 60,
    loan_disbursement_date: '2026-05-15',
    sum_assured: inr(2_500_000),
    plan_id: 'PLN-GCL-STD',
    plan_name: 'GCL Standard',
    status: 'SUBMITTED',
    submitted_at: dt('2026-05-18'),
    notes: 'Home loan disbursal. Member confirmed healthy.',
    created_at: dt('2026-05-15'),
    created_by: 'Morgan Kim',
  },
  {
    id: 'MQV2-0002',
    quote_id: 'QTE-V2-0011',
    parent_quote_number: 'QN-2026-0011',
    parent_client_name: 'BrightStar Logistics',
    member_name: 'Priya Iyer',
    member_dob: '1991-07-25',
    member_role_occupation: 'Accounts Executive',
    loan_reference: 'LN-2026-0002',
    loan_amount: inr(1_800_000),
    loan_tenure_months: 48,
    loan_disbursement_date: '2026-05-16',
    sum_assured: inr(1_800_000),
    plan_id: 'PLN-GCL-STD',
    plan_name: 'GCL Standard',
    status: 'SUBMITTED',
    submitted_at: dt('2026-05-19'),
    created_at: dt('2026-05-16'),
    created_by: 'Morgan Kim',
  },
  {
    id: 'MQV2-0003',
    quote_id: 'QTE-V2-0011',
    parent_quote_number: 'QN-2026-0011',
    parent_client_name: 'BrightStar Logistics',
    member_name: 'Arjun Patel',
    member_dob: '1988-11-04',
    member_role_occupation: 'Fleet Manager',
    loan_reference: 'LN-2026-0003',
    loan_amount: inr(3_200_000),
    loan_tenure_months: 84,
    loan_disbursement_date: '2026-05-20',
    sum_assured: inr(3_200_000),
    plan_id: 'PLN-GCL-STD',
    plan_name: 'GCL Standard',
    status: 'DRAFT',
    notes: 'Pending confirmation of disbursement date.',
    created_at: dt('2026-05-20'),
    created_by: 'Morgan Kim',
  },
  {
    id: 'MQV2-0004',
    quote_id: 'QTE-V2-0011',
    parent_quote_number: 'QN-2026-0011',
    parent_client_name: 'BrightStar Logistics',
    member_name: 'Kavita Sharma',
    member_dob: '1979-06-18',
    member_role_occupation: 'Senior Logistics Officer',
    loan_reference: 'LN-2026-0004',
    loan_amount: inr(5_000_000),
    loan_tenure_months: 120,
    loan_disbursement_date: '2026-05-22',
    sum_assured: inr(5_000_000),
    plan_id: 'PLN-GCL-STD',
    plan_name: 'GCL Standard',
    status: 'DRAFT',
    created_at: dt('2026-05-22'),
    created_by: 'Morgan Kim',
  },
];
