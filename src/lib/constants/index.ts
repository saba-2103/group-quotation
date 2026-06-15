// Application-wide constants for the Group PAS – Group Quotation module.

import { MpCategory, SumAssuredBasis, CoverPattern, SchemeUsage, EscalationKind, type PolicyFlag } from '@/lib/types';

// ─── Team members (mock — for assignment dropdowns) ────────────────────────────

export interface TeamMember {
  userId: string;
  name: string;
  role: string;
  salesLevel?: number;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { userId: 'sales-l0', name: 'Casey Sales',   role: 'SALES', salesLevel: 0 },
  { userId: 'sales-l1', name: 'Alex Carter',   role: 'SALES', salesLevel: 1 },
  { userId: 'sales-l2', name: 'Jordan Sales',  role: 'SALES', salesLevel: 2 },
  { userId: 'sales-l3', name: 'Morgan Sales',  role: 'SALES', salesLevel: 3 },
  { userId: 'sales-l4', name: 'Sam Supervisor', role: 'SALES', salesLevel: 4 },
  { userId: 'sales-l5', name: 'Arjun Head',    role: 'SALES', salesLevel: 5 },
];

/** Max discount authority by MPH category (percentage points). */
export const CATEGORY_MAX_DISCOUNT: Record<MpCategory, number> = {
  [MpCategory.SME]: 8,
  [MpCategory.MID]: 10,
  [MpCategory.LARGE]: 12,
  [MpCategory.ULTRA_LARGE]: 15,
};

/** UW authority band derived from MPH category. */
export const CATEGORY_UW_BAND: Record<MpCategory, string> = {
  [MpCategory.SME]: 'SALES_L0',
  [MpCategory.MID]: 'SALES_L1',
  [MpCategory.LARGE]: 'SALES_L2',
  [MpCategory.ULTRA_LARGE]: 'SALES_L3',
};

/** Human-readable labels for MpCategory values. */
export const SEGMENT_LABELS: Record<MpCategory, string> = {
  [MpCategory.SME]: 'SME',
  [MpCategory.MID]: 'Mid Market',
  [MpCategory.LARGE]: 'Large',
  [MpCategory.ULTRA_LARGE]: 'Ultra Large',
};

// ─── Plan templates ────────────────────────────────────────────────────────────

export interface PlanTemplateData {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isCustom: boolean;
  censusAware: boolean;
  defaultProductCode?: string;
  defaultSumAssuredBasis?: SumAssuredBasis;
  defaultCoverPattern?: CoverPattern;
  defaultBenefits: string[];
}

export const PLAN_TEMPLATES: PlanTemplateData[] = [
  {
    id: 'tmpl-standard-gtl',
    name: 'Standard GTL',
    description: 'Group Term Life with flat sum assured for employer-obligatory schemes.',
    tags: ['GTL', 'Employer', 'Standard'],
    censusAware: true,
    isCustom: false,
    defaultProductCode: 'GTL-EMP-001',
    defaultSumAssuredBasis: SumAssuredBasis.FLAT,
    defaultCoverPattern: CoverPattern.LEVEL,
    defaultBenefits: ['Death benefit equal to sum assured'],
  },
  {
    id: 'tmpl-grade-slab-gtl',
    name: 'Grade-slab GTL',
    description: 'Group Term Life with grade-specific sum assured slabs (salary multiples).',
    tags: ['GTL', 'Grade', 'Salary multiple'],
    censusAware: true,
    isCustom: false,
    defaultProductCode: 'GTL-EMP-001',
    defaultSumAssuredBasis: SumAssuredBasis.GRADE_SLAB,
    defaultCoverPattern: CoverPattern.LEVEL,
    defaultBenefits: ['Death benefit based on grade slab table'],
  },
  {
    id: 'tmpl-voluntary-gtl',
    name: 'Employer-Voluntary GTL',
    description: 'Voluntary Group Term Life where employees self-select coverage.',
    tags: ['GTL', 'Voluntary', 'Employee choice'],
    censusAware: false,
    isCustom: false,
    defaultProductCode: 'GTL-VOL-001',
    defaultSumAssuredBasis: SumAssuredBasis.FLAT,
    defaultCoverPattern: CoverPattern.LEVEL,
    defaultBenefits: ['Death benefit equal to chosen sum assured'],
  },
  {
    id: 'tmpl-micro-gtl',
    name: 'Micro GTL',
    description: 'Simplified Group Term Life for micro-enterprises with minimal underwriting.',
    tags: ['GTL', 'Micro', 'SME'],
    censusAware: true,
    isCustom: false,
    defaultProductCode: 'GTL-MCR-001',
    defaultSumAssuredBasis: SumAssuredBasis.FLAT,
    defaultCoverPattern: CoverPattern.LEVEL,
    defaultBenefits: ['Death benefit — flat sum assured'],
  },
];

// ─── Product catalog ───────────────────────────────────────────────────────────

export interface ProductDef {
  id: string;
  name: string;
  uin: string;
  description: string;
  allowedUsages: SchemeUsage[];
}

export const PRODUCT_CATALOG: ProductDef[] = [
  {
    id: 'GTL-EMP-001',
    name: 'Group Term Life — Employer Obligatory',
    uin: 'AAAAGLGP12345V011234',
    description: 'Standard GTL for employer-sponsored group life coverage.',
    allowedUsages: [SchemeUsage.EMPLOYER_EMPLOYEE],
  },
  {
    id: 'GTL-EMP-002',
    name: 'Group Term Life — Enhanced',
    uin: 'AAAAGLGP12345V021234',
    description: 'Enhanced GTL with built-in accidental death benefit.',
    allowedUsages: [SchemeUsage.EMPLOYER_EMPLOYEE],
  },
  {
    id: 'GTL-VOL-001',
    name: 'Group Term Life — Voluntary',
    uin: 'AAAAGLGP12345V031234',
    description: 'Voluntary GTL for employee-chosen coverage amounts.',
    allowedUsages: [SchemeUsage.EMPLOYER_EMPLOYEE, SchemeUsage.NON_EMPLOYER_EMPLOYEE],
  },
  {
    id: 'GTL-AFF-001',
    name: 'Group Term Life — Affinity',
    uin: 'AAAAGLGP12345V041234',
    description: 'GTL for affinity groups and associations.',
    allowedUsages: [SchemeUsage.NON_EMPLOYER_EMPLOYEE],
  },
  {
    id: 'GTL-MCR-001',
    name: 'Group Term Life — Micro',
    uin: 'AAAAGLGP12345V051234',
    description: 'Simplified GTL for micro-enterprises and informal groups.',
    allowedUsages: [SchemeUsage.EMPLOYER_EMPLOYEE, SchemeUsage.NON_EMPLOYER_EMPLOYEE],
  },
  {
    id: 'GTL-CRED-001',
    name: 'Group Credit Life',
    uin: 'AAAAGLGP12345V061234',
    description: 'Credit-linked group term life for loan repayment protection.',
    allowedUsages: [SchemeUsage.NON_EMPLOYER_EMPLOYEE],
  },
];

// ─── Rate cards ────────────────────────────────────────────────────────────────

export interface RateCardDef {
  ref: string;
  name: string;
  insurer: string;
  grossUpFactor: number;
  gstPct: number;
  blendedRatePermille: number;
  effectiveFrom: string;
  effectiveTo: string;
}

export const RATE_CARDS: RateCardDef[] = [
  {
    ref: 'RC-STD-2026',
    name: 'Standard Rate Card 2026',
    insurer: 'Keystone Life',
    grossUpFactor: 1.18,
    gstPct: 18,
    blendedRatePermille: 2.5,
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
  },
  {
    ref: 'RC-EXP-2026',
    name: 'Experience-Rated Card 2026',
    insurer: 'Keystone Life',
    grossUpFactor: 1.18,
    gstPct: 18,
    blendedRatePermille: 2.1,
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
  },
  {
    ref: 'RC-PREF-2026',
    name: 'Preferred Rate Card 2026',
    insurer: 'Keystone Life',
    grossUpFactor: 1.18,
    gstPct: 18,
    blendedRatePermille: 1.8,
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
  },
];

// ─── Riders ────────────────────────────────────────────────────────────────────

export interface RiderDef {
  id: string;
  name: string;
  description: string;
  rateType: 'flat' | 'pct_base';
  defaultRate: number;
}

export const AVAILABLE_RIDERS: RiderDef[] = [
  {
    id: 'ADB',
    name: 'Accidental Death Benefit',
    description: 'Additional sum assured paid on accidental death.',
    rateType: 'flat',
    defaultRate: 0.5,
  },
  {
    id: 'PTD',
    name: 'Permanent Total Disability',
    description: 'Lump sum on total permanent disability diagnosis.',
    rateType: 'pct_base',
    defaultRate: 10,
  },
  {
    id: 'CIW',
    name: 'Critical Illness Waiver',
    description: 'Waiver of premium on critical illness diagnosis.',
    rateType: 'flat',
    defaultRate: 0.3,
  },
  {
    id: 'PREM_WAIVER',
    name: 'Premium Waiver',
    description: 'Future premiums waived on disability or unemployment.',
    rateType: 'pct_base',
    defaultRate: 5,
  },
];

// ─── Policy flags ──────────────────────────────────────────────────────────────

export const POLICY_FLAG_SEEDS: PolicyFlag[] = [
  {
    id: 'excludePreExisting',
    label: 'Exclude pre-existing conditions',
    value: false,
    requiresEscalation: false,
    escalationKind: EscalationKind.POLICY_FLAG,
  },
  {
    id: 'extendedWaitingPeriod',
    label: 'Extended waiting period (90 days)',
    value: false,
    requiresEscalation: false,
    escalationKind: EscalationKind.POLICY_FLAG,
  },
  {
    id: 'reducedSumAssured',
    label: 'Reduced sum assured for senior grades',
    value: false,
    requiresEscalation: true,
    escalationKind: EscalationKind.POLICY_FLAG,
  },
  {
    id: 'specialRiskExclusion',
    label: 'Occupational special-risk exclusion',
    value: false,
    requiresEscalation: true,
    escalationKind: EscalationKind.POLICY_FLAG,
  },
  {
    id: 'pandemicExclusion',
    label: 'Pandemic/epidemic exclusion',
    value: false,
    requiresEscalation: true,
    escalationKind: EscalationKind.POLICY_FLAG,
  },
];


