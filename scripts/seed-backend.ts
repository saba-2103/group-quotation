/**
 * Seed the deployed Group PAS backend with demo data.
 *
 * Mirrors the shape of the local mock fixtures (`src/mocks/group-pas/`) so
 * that proxy-mode demos surface a meaningfully populated workspace instead
 * of the 3-client/2-quote skeleton the dev environment ships with.
 *
 * What it produces:
 *   - 6 clients with varied industries (matches mock CLIENTS shape).
 *   - 9 quotes, fully decorated with plans/census/mapping/policy-detail,
 *     all left in DRAFT — see "Backend constraints" below.
 *   - 5 PAM policies created directly via /api/policy-admin/policies
 *     (bypasses the Quote → Proposal → Policy workflow because no real
 *     Quote can advance past DRAFT today). Mix of CREATED / PENDING /
 *     CANCELLED to populate the Policy list across state filters.
 *   - 20 PAM members spread across the policies.
 *
 * Backend constraints (verified live, 2026-05-07):
 *   - Quote.submit requires `Estimated premium must be calculated before
 *     submitting`. Backend's `requestPrice` Kafka emit has no Rule Engine
 *     listener wired and `Quote.updatePremium()` is a domain method with
 *     no REST endpoint exposed — so quotes cannot transition past DRAFT
 *     against the live backend. Same gap surfaced in the UI as a disabled
 *     button + tooltip.
 *   - Float reservation is a stub that always returns RESERVED, so members
 *     come back PENDING with `pendingReason: PENDING_FLOAT_RESERVATION` or
 *     equivalent. Premium fields end up zero for PAM members for the same
 *     reason (no Rule Engine, no manual REST setter).
 *
 * Re-runnability:
 *   The script appends to whatever's already in the dev database. Backend
 *   has no delete-client endpoint surfaced, so reg numbers + proposalIds
 *   are timestamp-suffixed to avoid uniqueness collisions across runs.
 *
 * Usage:
 *   GROUP_PAS_BACKEND_URL=https://group-pas-dev.anairacloud.com \
 *     npx tsx scripts/seed-backend.ts
 *
 *   # Or simply:
 *   npm run seed:backend
 *
 * Logs every request/response under /tmp/keystone-seed/<timestamp>/ so a
 * failed step can be debugged without re-running.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ───────────────────────────── runtime config ─────────────────────────────

const HOST = (process.env.GROUP_PAS_BACKEND_URL ?? 'https://group-pas-dev.anairacloud.com').replace(
  /\/$/,
  '',
);
const RUN_ID = `seed-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const OUT_DIR = process.env.SEED_OUT ?? `/tmp/keystone-seed/${RUN_ID}`;
mkdirSync(OUT_DIR, { recursive: true });

const TS_SUFFIX = Date.now().toString(36).toUpperCase();

interface CallResult<T> {
  ok: boolean;
  status: number;
  body: T | null;
  raw: string;
}

let callIndex = 0;

async function call<T = unknown>(
  label: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<CallResult<T>> {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(`${HOST}${path}`, init);
  const text = await res.text();
  const idx = String(callIndex++).padStart(3, '0');
  writeFileSync(join(OUT_DIR, `${idx}-${label}.json`), text || '<no body>');

  let parsed: T | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = null;
    }
  }
  return { ok: res.ok, status: res.status, body: parsed, raw: text };
}

function fail(label: string, r: CallResult<unknown>): never {
  throw new Error(`${label} → HTTP ${r.status}: ${r.raw}`);
}

// ───────────────────────────── shared shapes ─────────────────────────────

const CENSUS_FILE_FORMAT = {
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

const PLAN_TERM_LIFE = {
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
      benefits: [{ code: 'DEATH_BENEFIT', name: 'Death Benefit', mandatory: true }],
      exclusions: [{ code: 'PRE_EXISTING', name: 'Pre-existing conditions (12 mo)' }],
    },
  ],
};

const PLAN_TERM_LIFE_ENHANCED = {
  ...PLAN_TERM_LIFE,
  planNo: 'PLAN-GTL-002',
  planName: 'GTL Term Life — Enhanced',
  coverAmountFormula: {
    type: 'MULTIPLE_OF_MEMBER_ATTRIBUTE',
    multiplicationFactor: 36,
    memberAttributeName: 'salary',
  },
  freeCoverLimitFormula: { type: 'FIXED', fixedAmount: 3_500_000 },
};

const DMN_MAPPING_SINGLE =
  '{"hits":"FIRST","rules":[{"if":"true","then":"PLAN-GTL-001"}]}';
const DMN_MAPPING_TIERED =
  '{"hits":"FIRST","rules":[{"if":"salary > 1500000","then":"PLAN-GTL-002"},{"if":"true","then":"PLAN-GTL-001"}]}';

// ───────────────────────────── seed inputs ─────────────────────────────

interface ClientSeed {
  alias: string;
  registrationData: Record<string, unknown>;
}

const CLIENT_SEEDS: ClientSeed[] = [
  {
    alias: 'acme',
    registrationData: {
      name: 'Acme Industries Pvt Ltd',
      alternateName: 'Acme',
      businessRegistrationNumber: `ACME-${TS_SUFFIX}`,
      incorporationDate: '2014-04-12',
      gstRegistrationNumber: '29ABCDE1234F1Z5',
      taxReferenceNumber: 'AAACA1234F',
      clientCategory: 'Mid-market',
      industryCategory: 'Manufacturing',
      countryCode: 'IN',
      communicationPreference: 'EMAIL',
      clientUrl: 'https://acme.example',
      contactPersonName: 'Priya Krishnan',
      contactPersonPhone: '+91 98 1234 5678',
      isSubsidiary: false,
      isVip: true,
      isBlacklisted: false,
      effectiveDate: '2024-01-01',
    },
  },
  {
    alias: 'brightline',
    registrationData: {
      name: 'Brightline Technologies Ltd',
      businessRegistrationNumber: `BRIGHT-${TS_SUFFIX}`,
      incorporationDate: '2018-09-22',
      clientCategory: 'Enterprise',
      industryCategory: 'Information Technology',
      countryCode: 'IN',
      communicationPreference: 'PORTAL',
      contactPersonName: 'Sandeep Iyer',
      contactPersonPhone: '+91 99 8765 4321',
      isSubsidiary: false,
      isVip: false,
      isBlacklisted: false,
      effectiveDate: '2024-06-15',
    },
  },
  {
    alias: 'caravel',
    registrationData: {
      name: 'Caravel Logistics Inc',
      alternateName: 'Caravel',
      businessRegistrationNumber: `CARAVEL-${TS_SUFFIX}`,
      incorporationDate: '2010-02-05',
      industryCategory: 'Logistics',
      countryCode: 'IN',
      communicationPreference: 'LETTER',
      isSubsidiary: true,
      isVip: false,
      isBlacklisted: false,
      effectiveDate: '2025-03-10',
    },
  },
  {
    alias: 'deltawave',
    registrationData: {
      name: 'Deltawave Solutions LLP',
      businessRegistrationNumber: `DELTA-${TS_SUFFIX}`,
      industryCategory: 'Consulting',
      countryCode: 'IN',
      communicationPreference: 'EMAIL',
      contactPersonName: 'Riya Bose',
      isSubsidiary: false,
      isVip: false,
      isBlacklisted: false,
      effectiveDate: '2025-11-01',
    },
  },
  {
    alias: 'evergreen',
    registrationData: {
      name: 'Evergreen Foods & Beverages Pvt Ltd',
      alternateName: 'Evergreen F&B',
      businessRegistrationNumber: `EVRGRN-${TS_SUFFIX}`,
      incorporationDate: '2009-11-30',
      clientCategory: 'Mid-market',
      industryCategory: 'Food & Beverages',
      countryCode: 'IN',
      communicationPreference: 'EMAIL',
      contactPersonName: 'Arjun Mehta',
      contactPersonPhone: '+91 98 5555 0101',
      isSubsidiary: false,
      isVip: true,
      isBlacklisted: false,
      effectiveDate: '2023-04-01',
    },
  },
  {
    alias: 'finhealth',
    registrationData: {
      name: 'FinHealth Insurance Co',
      businessRegistrationNumber: `FINHLTH-${TS_SUFFIX}`,
      incorporationDate: '2016-03-21',
      clientCategory: 'Enterprise',
      industryCategory: 'Healthcare',
      countryCode: 'IN',
      communicationPreference: 'EMAIL',
      contactPersonName: 'Nisha Pillai',
      isSubsidiary: false,
      isVip: false,
      isBlacklisted: false,
      effectiveDate: '2024-09-01',
    },
  },
];

interface QuoteSeed {
  alias: string;
  clientAlias: string;
  policyDetail: Record<string, unknown>;
  plans: typeof PLAN_TERM_LIFE[];
  aggregateCensus: { headcount: number; planBreakdown: { planNo: string; headcount: number }[] };
  mapping: string;
}

const QUOTE_SEEDS: QuoteSeed[] = [
  {
    alias: 'q-acme-1',
    clientAlias: 'acme',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-06-01',
      expiryDate: '2027-05-31',
      inceptionDate: '2026-06-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE],
    aggregateCensus: {
      headcount: 120,
      planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 120 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
  {
    alias: 'q-brightline-tier',
    clientAlias: 'brightline',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-07-01',
      expiryDate: '2027-06-30',
      inceptionDate: '2026-07-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE, PLAN_TERM_LIFE_ENHANCED],
    aggregateCensus: {
      headcount: 120,
      planBreakdown: [
        { planNo: 'PLAN-GTL-001', headcount: 90 },
        { planNo: 'PLAN-GTL-002', headcount: 30 },
      ],
    },
    mapping: DMN_MAPPING_TIERED,
  },
  {
    alias: 'q-acme-small',
    clientAlias: 'acme',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-06-15',
      expiryDate: '2027-06-14',
      inceptionDate: '2026-06-15',
      ageDefinitionRule: 'ANB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE],
    aggregateCensus: {
      headcount: 45,
      planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
  {
    alias: 'q-caravel',
    clientAlias: 'caravel',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-08-01',
      expiryDate: '2027-07-31',
      inceptionDate: '2026-08-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE, PLAN_TERM_LIFE_ENHANCED],
    aggregateCensus: {
      headcount: 120,
      planBreakdown: [
        { planNo: 'PLAN-GTL-001', headcount: 90 },
        { planNo: 'PLAN-GTL-002', headcount: 30 },
      ],
    },
    mapping: DMN_MAPPING_TIERED,
  },
  {
    alias: 'q-deltawave',
    clientAlias: 'deltawave',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-06-01',
      expiryDate: '2027-05-31',
      inceptionDate: '2026-06-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE],
    aggregateCensus: {
      headcount: 45,
      planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
  {
    alias: 'q-evergreen',
    clientAlias: 'evergreen',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-05-01',
      expiryDate: '2027-04-30',
      inceptionDate: '2026-05-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE],
    aggregateCensus: {
      headcount: 45,
      planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
  {
    alias: 'q-brightline-enh',
    clientAlias: 'brightline',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-04-01',
      expiryDate: '2027-03-31',
      inceptionDate: '2026-04-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE_ENHANCED],
    aggregateCensus: {
      headcount: 45,
      planBreakdown: [{ planNo: 'PLAN-GTL-002', headcount: 45 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
  {
    alias: 'q-caravel-2',
    clientAlias: 'caravel',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-04-15',
      expiryDate: '2027-04-14',
      inceptionDate: '2026-04-15',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE],
    aggregateCensus: {
      headcount: 45,
      planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
  {
    alias: 'q-finhealth',
    clientAlias: 'finhealth',
    policyDetail: {
      premiumType: 'ANNUAL',
      effectiveDate: '2026-03-01',
      expiryDate: '2027-02-28',
      inceptionDate: '2026-03-01',
      ageDefinitionRule: 'ALB',
      riskTermClassification: 'YEARLY_RENEWABLE',
      lineOfBusiness: 'GROUP',
    },
    plans: [PLAN_TERM_LIFE],
    aggregateCensus: {
      headcount: 45,
      planBreakdown: [{ planNo: 'PLAN-GTL-001', headcount: 45 }],
    },
    mapping: DMN_MAPPING_SINGLE,
  },
];

interface PolicySeed {
  alias: string;
  clientAlias: string;
  activationThreshold: number;
  effectiveDate: string;
  expiryDate: string;
  inceptionDate: string;
  ageDefinitionRule: 'ALB' | 'ANB';
  estimatedPremium: { amount: number; currency: 'INR' };
  cancelAfterCreate?: boolean;
}

const POLICY_SEEDS: PolicySeed[] = [
  // Low threshold so members enrolled below trigger activation flow.
  {
    alias: 'pol-evergreen-active',
    clientAlias: 'evergreen',
    activationThreshold: 1,
    effectiveDate: '2026-05-01',
    expiryDate: '2027-04-30',
    inceptionDate: '2026-05-01',
    ageDefinitionRule: 'ALB',
    estimatedPremium: { amount: 1_620_000, currency: 'INR' },
  },
  // High threshold → stays PENDING with awaiting-min-members reason.
  {
    alias: 'pol-acme-pending',
    clientAlias: 'acme',
    activationThreshold: 30,
    effectiveDate: '2026-06-15',
    expiryDate: '2027-06-14',
    inceptionDate: '2026-06-15',
    ageDefinitionRule: 'ANB',
    estimatedPremium: { amount: 1_620_000, currency: 'INR' },
  },
  // Larger pending policy for the breakdown card to chew on.
  {
    alias: 'pol-caravel-pending',
    clientAlias: 'caravel',
    activationThreshold: 50,
    effectiveDate: '2026-08-01',
    expiryDate: '2027-07-31',
    inceptionDate: '2026-08-01',
    ageDefinitionRule: 'ALB',
    estimatedPremium: { amount: 4_320_000, currency: 'INR' },
  },
  // Initial CREATED state — no members yet.
  {
    alias: 'pol-deltawave-created',
    clientAlias: 'deltawave',
    activationThreshold: 30,
    effectiveDate: '2026-06-01',
    expiryDate: '2027-05-31',
    inceptionDate: '2026-06-01',
    ageDefinitionRule: 'ALB',
    estimatedPremium: { amount: 1_620_000, currency: 'INR' },
  },
  // Cancelled after create so the CANCELLED badge has a row to render.
  {
    alias: 'pol-brightline-cancel',
    clientAlias: 'brightline',
    activationThreshold: 30,
    effectiveDate: '2026-04-01',
    expiryDate: '2027-03-31',
    inceptionDate: '2026-04-01',
    ageDefinitionRule: 'ALB',
    estimatedPremium: { amount: 1_620_000, currency: 'INR' },
    cancelAfterCreate: true,
  },
];

interface MemberSeed {
  policyAlias: string;
  policyMemberId: string; // backend uses this as a request-side correlation id
  name: string;
  dob: string;
  gender: 'M' | 'F';
  salary: number;
  occupation: string;
  sumInsured: number;
  planNo: 'PLAN-GTL-001' | 'PLAN-GTL-002';
  governmentIdType?: string;
  governmentIdNumber?: string;
  mobile?: string;
  email?: string;
}

// Same name pool as src/mocks/group-pas/issuance/policy-members.ts so the demo
// stays familiar between mock and proxy modes. Spread across the 5 policies;
// the active policy gets enough headcount to trip the threshold-1 activation.
const MEMBER_SEEDS: MemberSeed[] = [
  // pol-evergreen-active (threshold 1) — activates on first member.
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-1-${TS_SUFFIX}`, name: 'Aarav Mehta', dob: '1990-03-12', gender: 'M', salary: 1_200_000, occupation: 'Engineer', sumInsured: 28_800_000, planNo: 'PLAN-GTL-001', governmentIdType: 'PAN', governmentIdNumber: 'ABCDE1234A', mobile: '+91 90 1111 0001', email: 'aarav@example.com' },
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-2-${TS_SUFFIX}`, name: 'Diya Iyer', dob: '1988-07-04', gender: 'F', salary: 1_500_000, occupation: 'Product Manager', sumInsured: 36_000_000, planNo: 'PLAN-GTL-001', governmentIdType: 'PAN', governmentIdNumber: 'ABCDE1234B', mobile: '+91 90 1111 0002', email: 'diya@example.com' },
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-3-${TS_SUFFIX}`, name: 'Rohan Kapoor', dob: '1985-01-22', gender: 'M', salary: 2_100_000, occupation: 'Director', sumInsured: 50_400_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-4-${TS_SUFFIX}`, name: 'Saanvi Nair', dob: '1992-11-09', gender: 'F', salary: 980_000, occupation: 'Analyst', sumInsured: 23_520_000, planNo: 'PLAN-GTL-001' },
  // pol-acme-pending — threshold 30, well below.
  { policyAlias: 'pol-acme-pending', policyMemberId: `PM-ACME-1-${TS_SUFFIX}`, name: 'Arjun Patel', dob: '1987-05-18', gender: 'M', salary: 1_750_000, occupation: 'Sales Lead', sumInsured: 42_000_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-acme-pending', policyMemberId: `PM-ACME-2-${TS_SUFFIX}`, name: 'Ishita Rao', dob: '1991-02-25', gender: 'F', salary: 1_320_000, occupation: 'Designer', sumInsured: 31_680_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-acme-pending', policyMemberId: `PM-ACME-3-${TS_SUFFIX}`, name: 'Karan Joshi', dob: '1983-09-30', gender: 'M', salary: 1_100_000, occupation: 'Operations', sumInsured: 26_400_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-acme-pending', policyMemberId: `PM-ACME-4-${TS_SUFFIX}`, name: 'Meera Gupta', dob: '1979-04-15', gender: 'F', salary: 4_800_000, occupation: 'Executive', sumInsured: 115_200_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-acme-pending', policyMemberId: `PM-ACME-5-${TS_SUFFIX}`, name: 'Vikram Shah', dob: '1972-12-01', gender: 'M', salary: 800_000, occupation: 'Consultant', sumInsured: 19_200_000, planNo: 'PLAN-GTL-001' },
  // pol-caravel-pending
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-1-${TS_SUFFIX}`, name: 'Ananya Verma', dob: '1993-08-19', gender: 'F', salary: 1_100_000, occupation: 'Engineer', sumInsured: 26_400_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-2-${TS_SUFFIX}`, name: 'Aditya Bose', dob: '1986-06-07', gender: 'M', salary: 1_600_000, occupation: 'Architect', sumInsured: 38_400_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-3-${TS_SUFFIX}`, name: 'Riya Menon', dob: '1989-10-11', gender: 'F', salary: 950_000, occupation: 'Engineer', sumInsured: 22_800_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-4-${TS_SUFFIX}`, name: 'Neel Sharma', dob: '1984-01-03', gender: 'M', salary: 2_400_000, occupation: 'Director', sumInsured: 57_600_000, planNo: 'PLAN-GTL-002' },
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-5-${TS_SUFFIX}`, name: 'Tara Singh', dob: '1995-04-28', gender: 'F', salary: 880_000, occupation: 'Analyst', sumInsured: 21_120_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-6-${TS_SUFFIX}`, name: 'Yash Iyer', dob: '1992-12-15', gender: 'M', salary: 1_050_000, occupation: 'Engineer', sumInsured: 25_200_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-caravel-pending', policyMemberId: `PM-CRV-7-${TS_SUFFIX}`, name: 'Pooja Desai', dob: '1994-07-22', gender: 'F', salary: 1_240_000, occupation: 'Designer', sumInsured: 29_760_000, planNo: 'PLAN-GTL-001' },
  // pol-deltawave-created (no members initially — keep CREATED)
  // pol-brightline-cancel (cancelled — members would be voided; skip)
  // Couple more in the active policy for member-list richness.
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-5-${TS_SUFFIX}`, name: 'Sanjay Reddy', dob: '1981-11-02', gender: 'M', salary: 3_200_000, occupation: 'Partner', sumInsured: 76_800_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-6-${TS_SUFFIX}`, name: 'Lakshmi Kumar', dob: '1990-09-09', gender: 'F', salary: 1_400_000, occupation: 'Engineering Manager', sumInsured: 33_600_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-7-${TS_SUFFIX}`, name: 'Hrithik Pillai', dob: '1988-02-14', gender: 'M', salary: 1_900_000, occupation: 'Sales Director', sumInsured: 45_600_000, planNo: 'PLAN-GTL-001' },
  { policyAlias: 'pol-evergreen-active', policyMemberId: `PM-EVG-8-${TS_SUFFIX}`, name: 'Aanya Krishnan', dob: '1996-06-25', gender: 'F', salary: 720_000, occupation: 'Junior Engineer', sumInsured: 17_280_000, planNo: 'PLAN-GTL-001' },
];

// ───────────────────────────── execution ─────────────────────────────

interface CreatedClient {
  alias: string;
  clientId: string;
  clientNumber: string;
}
interface CreatedQuote {
  alias: string;
  quoteId: string;
}
interface CreatedPolicy {
  alias: string;
  policyId: string;
  policyNumber: string;
}
interface CreatedMember {
  policyAlias: string;
  memberId: string;
  memberNumber: string;
  name: string;
}

async function seedClients(): Promise<Map<string, CreatedClient>> {
  const out = new Map<string, CreatedClient>();
  for (const seed of CLIENT_SEEDS) {
    const r = await call<{ clientId: string; clientNumber: string }>(
      `client-${seed.alias}`,
      'POST',
      '/api/policy-admin/clients',
      { registrationData: seed.registrationData },
    );
    if (!r.ok || !r.body) fail(`createClient(${seed.alias})`, r);
    out.set(seed.alias, { alias: seed.alias, clientId: r.body.clientId, clientNumber: r.body.clientNumber });
    console.log(`  client[${seed.alias}] → ${r.body.clientNumber} ${r.body.clientId}`);
  }
  return out;
}

async function seedQuotes(clients: Map<string, CreatedClient>): Promise<CreatedQuote[]> {
  const out: CreatedQuote[] = [];
  for (const seed of QUOTE_SEEDS) {
    const client = clients.get(seed.clientAlias);
    if (!client) throw new Error(`unknown clientAlias: ${seed.clientAlias}`);

    // 1. Create the quote shell.
    const created = await call<{ quoteId: string }>(`quote-${seed.alias}-create`, 'POST', '/api/quotation/quotes', {
      clientId: client.clientId,
      policyType: 'GTL',
    });
    if (!created.ok || !created.body) fail(`createQuote(${seed.alias})`, created);
    const quoteId = created.body.quoteId;

    // 2. Policy detail (premium type, dates, age rule).
    const pd = await call(`quote-${seed.alias}-policy-detail`, 'PUT', `/api/quotation/quotes/${quoteId}/policy-detail`, seed.policyDetail);
    if (!pd.ok) fail(`updatePolicyDetail(${seed.alias})`, pd);

    // 3. Census file format MUST come before plans/mapping per backend
    //    invariant ("Census file format must be set before submitting" fires
    //    on plan/mapping mutations too).
    const cff = await call(`quote-${seed.alias}-census-format`, 'PUT', `/api/quotation/quotes/${quoteId}/census-file-format`, CENSUS_FILE_FORMAT);
    if (!cff.ok) fail(`updateCensusFileFormat(${seed.alias})`, cff);

    // 4. Plans — POST to add. PUT updates an existing plan.
    for (const plan of seed.plans) {
      const pr = await call(`quote-${seed.alias}-plan-${plan.planNo}`, 'POST', `/api/quotation/quotes/${quoteId}/plans`, plan);
      if (!pr.ok) fail(`addPlan(${seed.alias},${plan.planNo})`, pr);
    }

    // 5. Aggregate census + member-to-plan mapping.
    const ac = await call(`quote-${seed.alias}-census`, 'PUT', `/api/quotation/quotes/${quoteId}/aggregate-census`, seed.aggregateCensus);
    if (!ac.ok) fail(`updateAggregateCensus(${seed.alias})`, ac);

    const mp = await call(`quote-${seed.alias}-mapping`, 'PUT', `/api/quotation/quotes/${quoteId}/member-to-plan-mapping`, { mapping: seed.mapping });
    if (!mp.ok) fail(`updateMemberToPlanMapping(${seed.alias})`, mp);

    // Submit + downstream transitions intentionally skipped — backend has
    // no Rule Engine listener and no REST endpoint to set Quote.premium,
    // so nothing past DRAFT is reachable today. UI surfaces the gap.

    out.push({ alias: seed.alias, quoteId });
    console.log(`  quote[${seed.alias}] → ${quoteId} (DRAFT, fully decorated)`);
  }
  return out;
}

async function seedPolicies(clients: Map<string, CreatedClient>): Promise<Map<string, CreatedPolicy>> {
  const out = new Map<string, CreatedPolicy>();
  for (const seed of POLICY_SEEDS) {
    const client = clients.get(seed.clientAlias);
    if (!client) throw new Error(`unknown clientAlias: ${seed.clientAlias}`);

    const body = {
      clientId: client.clientId,
      // Synthetic proposalId — we're bypassing the Quote → Proposal flow
      // since no live Quote can be finalized today. Backend stores it
      // verbatim and surfaces it in PolicyDto.
      proposalId: `P-SEED-${seed.alias}-${TS_SUFFIX}`,
      policyType: 'GTL',
      effectiveDate: seed.effectiveDate,
      expiryDate: seed.expiryDate,
      premiumType: 'ANNUAL',
      lineOfBusiness: 'GROUP',
      riskTermClassification: 'YEARLY_RENEWABLE',
      inceptionDate: seed.inceptionDate,
      ageDefinitionRule: seed.ageDefinitionRule,
      activationThreshold: seed.activationThreshold,
      plans: [PLAN_TERM_LIFE],
      estimatedPremium: seed.estimatedPremium,
    };

    const r = await call<{ policyId: string; policyNumber: string }>(`policy-${seed.alias}-create`, 'POST', '/api/policy-admin/policies', body);
    if (!r.ok || !r.body) fail(`createPolicy(${seed.alias})`, r);
    out.set(seed.alias, { alias: seed.alias, policyId: r.body.policyId, policyNumber: r.body.policyNumber });
    console.log(`  policy[${seed.alias}] → ${r.body.policyNumber} ${r.body.policyId}`);

    if (seed.cancelAfterCreate) {
      const cx = await call(`policy-${seed.alias}-cancel`, 'POST', `/api/policy-admin/policies/${r.body.policyId}/cancel`, { reason: 'Seed-time cancel — demo scenario' });
      if (!cx.ok) fail(`cancelPolicy(${seed.alias})`, cx);
      console.log(`  policy[${seed.alias}] → CANCELLED`);
    }
  }
  return out;
}

async function seedMembers(policies: Map<string, CreatedPolicy>): Promise<CreatedMember[]> {
  const out: CreatedMember[] = [];
  for (const seed of MEMBER_SEEDS) {
    const pol = policies.get(seed.policyAlias);
    if (!pol) throw new Error(`unknown policyAlias: ${seed.policyAlias}`);

    const body = {
      policyMemberId: seed.policyMemberId,
      name: seed.name,
      dob: seed.dob,
      gender: seed.gender,
      occupation: seed.occupation,
      mobile: seed.mobile ?? '',
      email: seed.email ?? '',
      governmentIdType: seed.governmentIdType ?? '',
      governmentIdNumber: seed.governmentIdNumber ?? '',
      planNo: seed.planNo,
      sumInsured: seed.sumInsured,
      salary: seed.salary,
      transactionRefs: [],
    };

    const r = await call<{ memberId: string; memberNumber: string }>(
      `member-${seed.policyAlias}-${seed.policyMemberId}`,
      'POST',
      `/api/policy-admin/policies/${pol.policyId}/members`,
      body,
    );
    if (!r.ok || !r.body) fail(`addMember(${seed.policyAlias},${seed.policyMemberId})`, r);
    out.push({ policyAlias: seed.policyAlias, memberId: r.body.memberId, memberNumber: r.body.memberNumber, name: seed.name });
  }
  return out;
}

async function main(): Promise<void> {
  console.log(`Seeding ${HOST}`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log(`Logs:   ${OUT_DIR}`);
  console.log();

  console.log('1/4 Clients');
  const clients = await seedClients();

  console.log('\n2/4 Quotes (all DRAFT — backend has no premium-set REST endpoint)');
  const quotes = await seedQuotes(clients);

  console.log('\n3/4 PAM Policies (direct creation — bypasses Quote/Proposal)');
  const policies = await seedPolicies(clients);

  console.log('\n4/4 PAM Members');
  const members = await seedMembers(policies);

  console.log('\n──────────── Summary ────────────');
  console.log(`Clients : ${clients.size}`);
  console.log(`Quotes  : ${quotes.length} (all DRAFT)`);
  console.log(`Policies: ${policies.size}`);
  console.log(`Members : ${members.length}`);
  console.log();
  console.log('Sample deep-links (proxy mode, replace HOST):');
  const sampleQuote = quotes[0];
  const sampleActivePolicy = policies.get('pol-evergreen-active');
  const samplePendingPolicy = policies.get('pol-acme-pending');
  if (sampleQuote) console.log(`  Quote   : /quotation/${sampleQuote.quoteId}`);
  if (sampleActivePolicy) console.log(`  Policy  : /policy-admin/policies/${sampleActivePolicy.policyId}  (low-threshold, may auto-activate)`);
  if (samplePendingPolicy) console.log(`  Policy  : /policy-admin/policies/${samplePendingPolicy.policyId}  (PENDING with members)`);
  console.log();
  console.log('Done.');
}

main().catch((err) => {
  console.error('\nFAILED:', err instanceof Error ? err.message : err);
  console.error(`Inspect: ${OUT_DIR}`);
  process.exit(1);
});
