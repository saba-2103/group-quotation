// Direct port of the backend's StubProductCatalogClient
// (group-pas/productCatalog/src/main/java/com/anaira/productcatalog/StubProductCatalogClient.java).
// Source-of-truth for both the mock /api/product-catalog route and any
// FE-side helper that needs to know the canonical catalog shape during
// local development. Backend swap-out is local — Plan / PlanProduct /
// PlanBenefit / PlanExclusion are spec-generated CommonData types so the
// wire contract stays stable when the real Product Configurator ships.

import type {
  AmountFormula,
  Plan,
  PlanBenefit,
  PlanExclusion,
  PlanProduct,
} from '@/types/group-pas/common';

const benefit = (code: string, name: string, mandatory: boolean): PlanBenefit => ({
  code,
  name,
  mandatory,
});

const exclusion = (code: string, name: string): PlanExclusion => ({ code, name });

// ── Core benefits (base + standard riders) ─────────────────────────────

const DEATH = benefit(
  'DEATH',
  'Death Benefit — Sum Insured payable on death from any cause',
  true,
);
const TERMINAL_ILLNESS = benefit(
  'TERMINAL_ILLNESS',
  'Terminal Illness — accelerated payout on terminal diagnosis (life expectancy ≤ 6 months)',
  true,
);
const ACCIDENTAL_DEATH = benefit(
  'ACCIDENTAL_DEATH',
  'Accidental Death — additional Sum Insured on death due to accident within 180 days',
  true,
);
const ACCIDENTAL_TPD = benefit(
  'ACCIDENTAL_TPD',
  'Accidental Total & Permanent Disability — 100% Sum Insured on permanent disability due to accident',
  true,
);
const ACCIDENTAL_PPD = benefit(
  'ACCIDENTAL_PPD',
  'Accidental Partial Disability — % of Sum Insured per IRDAI disability schedule',
  false,
);
const TPD = benefit(
  'TPD',
  'Total & Permanent Disability — Sum Insured on permanent disability due to illness or injury',
  true,
);
const WAIVER_OF_PREMIUM = benefit(
  'WAIVER_OF_PREMIUM',
  'Waiver of Premium — future premiums waived on TPD or qualifying CI',
  true,
);

// ── IRDAI 25 listed critical illnesses (each individually excludable) ──

const CI_25_CONDITIONS: PlanBenefit[] = [
  benefit('CI_CANCER', 'Cancer of specified severity', true),
  benefit('CI_HEART_ATTACK', 'First Heart Attack of specified severity', true),
  benefit('CI_STROKE', 'Stroke resulting in permanent symptoms', true),
  benefit('CI_KIDNEY_FAILURE', 'Kidney Failure requiring regular dialysis', true),
  benefit('CI_MAJOR_ORGAN_TRANSPLANT', 'Major Organ / Bone Marrow Transplant', true),
  benefit('CI_PARALYSIS', 'Permanent Paralysis of Limbs', true),
  benefit('CI_MULTIPLE_SCLEROSIS', 'Multiple Sclerosis with persisting symptoms', true),
  benefit('CI_MOTOR_NEURONE', 'Motor Neurone Disease with permanent symptoms', true),
  benefit('CI_COMA', 'Coma of specified severity', true),
  benefit('CI_CABG', 'Coronary Artery Bypass Graft / Open chest CABG', true),
  benefit('CI_HEART_VALVE_SURGERY', 'Open Heart Replacement or Repair of Heart Valves', true),
  benefit('CI_THIRD_DEGREE_BURNS', 'Third Degree Burns covering ≥ 20% body surface', true),
  benefit('CI_APLASTIC_ANEMIA', 'Aplastic Anaemia with permanent bone-marrow failure', true),
  benefit('CI_END_STAGE_LIVER', 'End-stage Liver Failure', true),
  benefit('CI_END_STAGE_LUNG', 'End-stage Lung Failure', true),
  benefit('CI_LOSS_OF_SPEECH', 'Permanent Loss of Speech', true),
  benefit('CI_LOSS_OF_LIMBS', 'Loss of Limbs (two or more)', true),
  benefit('CI_MAJOR_HEAD_TRAUMA', 'Major Head Trauma with permanent neurological deficit', true),
  benefit(
    'CI_PRIMARY_PULMONARY_HYPERTENSION',
    'Primary (Idiopathic) Pulmonary Hypertension',
    true,
  ),
  benefit('CI_ALZHEIMERS', "Alzheimer's Disease before age 60", true),
  benefit('CI_PARKINSONS', "Parkinson's Disease before age 60", true),
  benefit('CI_AORTA_SURGERY', 'Surgery of Aorta', true),
  benefit('CI_BENIGN_BRAIN_TUMOR', 'Benign Brain Tumour requiring craniotomy', true),
  benefit('CI_BLINDNESS', 'Permanent Loss of Sight in both eyes', true),
  benefit('CI_DEAFNESS', 'Permanent Loss of Hearing in both ears', true),
];

// ── Standard product-level exclusions (IRDAI Saral wording) ────────────

const EXCL_SUICIDE_12M = exclusion(
  'SUICIDE_12_MONTHS',
  'Suicide within first 12 months of risk commencement / revival',
);
const EXCL_WAR = exclusion(
  'WAR_TERRORISM',
  'Death or disability due to war, invasion, terrorism, or civil commotion',
);
const EXCL_HAZARDOUS = exclusion(
  'HAZARDOUS_PURSUITS',
  'Loss arising from hazardous pursuits (aviation other than fare-paying, motor racing, mountaineering, etc.)',
);
const EXCL_INTOXICATION = exclusion(
  'INTOXICATION',
  'Loss arising from intoxication by alcohol, drugs, or non-prescribed substances',
);
const EXCL_SELF_INFLICTED = exclusion(
  'SELF_INFLICTED',
  'Self-inflicted injury (other than suicide which is governed by the 12-month clause)',
);
const EXCL_PRE_EXISTING_NON_DISCLOSED = exclusion(
  'PRE_EXISTING_NON_DISCLOSED',
  'Pre-existing conditions not disclosed at proposal',
);
const EXCL_CRIMINAL_ACT = exclusion(
  'CRIMINAL_ACT',
  'Death or disability resulting from participation in any criminal or unlawful act',
);
const EXCL_CI_WAITING_PERIOD = exclusion(
  'CI_WAITING_PERIOD',
  'Critical illness diagnosed within 90 days of risk commencement (waiting period)',
);
const EXCL_CI_SURVIVAL = exclusion(
  'CI_SURVIVAL_PERIOD',
  'Critical illness benefit payable only if the insured survives 30 days from date of diagnosis',
);

// ── Product library (1 base + 5 riders) ────────────────────────────────

const GTL_BASE: PlanProduct = {
  productCode: 'GTL-BASE',
  productName: 'Group Term Life — Base',
  productType: 'BASE',
  benefits: [DEATH, TERMINAL_ILLNESS],
  exclusions: [
    EXCL_SUICIDE_12M,
    EXCL_WAR,
    EXCL_HAZARDOUS,
    EXCL_INTOXICATION,
    EXCL_SELF_INFLICTED,
    EXCL_PRE_EXISTING_NON_DISCLOSED,
    EXCL_CRIMINAL_ACT,
  ],
};

const ADB: PlanProduct = {
  productCode: 'ADB',
  productName: 'Accidental Death Benefit Rider',
  productType: 'RIDER',
  benefits: [ACCIDENTAL_DEATH],
  exclusions: [EXCL_INTOXICATION, EXCL_SELF_INFLICTED, EXCL_HAZARDOUS, EXCL_CRIMINAL_ACT],
};

const APD: PlanProduct = {
  productCode: 'APD',
  productName: 'Accidental Permanent Disability Rider',
  productType: 'RIDER',
  benefits: [ACCIDENTAL_TPD, ACCIDENTAL_PPD],
  exclusions: [EXCL_INTOXICATION, EXCL_SELF_INFLICTED, EXCL_HAZARDOUS, EXCL_CRIMINAL_ACT],
};

const CI_RIDER: PlanProduct = {
  productCode: 'CI',
  productName: 'Critical Illness Rider (IRDAI 25 listed conditions)',
  productType: 'RIDER',
  benefits: CI_25_CONDITIONS,
  exclusions: [
    EXCL_CI_WAITING_PERIOD,
    EXCL_CI_SURVIVAL,
    EXCL_PRE_EXISTING_NON_DISCLOSED,
    EXCL_INTOXICATION,
  ],
};

const TPD_RIDER: PlanProduct = {
  productCode: 'TPD-RIDER',
  productName: 'Total Permanent Disability Rider',
  productType: 'RIDER',
  benefits: [TPD],
  exclusions: [EXCL_PRE_EXISTING_NON_DISCLOSED, EXCL_INTOXICATION, EXCL_SELF_INFLICTED],
};

const WP_RIDER: PlanProduct = {
  productCode: 'WP',
  productName: 'Waiver of Premium Rider',
  productType: 'RIDER',
  benefits: [WAIVER_OF_PREMIUM],
  exclusions: [EXCL_PRE_EXISTING_NON_DISCLOSED],
};

export const CATALOG_PRODUCTS: PlanProduct[] = [
  GTL_BASE,
  ADB,
  APD,
  CI_RIDER,
  TPD_RIDER,
  WP_RIDER,
];

// ── Helper formula builders ─────────────────────────────────────────────

const salaryMultiple = (factor: number): AmountFormula => ({
  type: 'MULTIPLE_OF_MEMBER_ATTRIBUTE',
  multiplicationFactor: factor,
  memberAttributeName: 'salary',
});

const loanOutstanding = (): AmountFormula => ({
  type: 'MULTIPLE_OF_MEMBER_ATTRIBUTE',
  multiplicationFactor: 1,
  memberAttributeName: 'loanOutstanding',
});

const fixedAmount = (amount: number): AmountFormula => ({
  type: 'FIXED',
  fixedAmount: amount,
});

// ── Sample / template plans (FE start-points; user can edit) ───────────

export const CATALOG_PLANS: Plan[] = [
  {
    planNo: 'GTL-BASIC',
    planName: 'Group Term Life — Basic (HDFC Life Sampoorna style)',
    products: [GTL_BASE],
    coverAmountFormula: salaryMultiple(3),
    freeCoverLimitFormula: fixedAmount(2_500_000),
    rateCardFile: 'rate-cards/gtl-basic-2026.dmn',
  },
  {
    planNo: 'GTL-STANDARD',
    planName: 'Group Term Life — Standard (Bajaj Allianz Plus style)',
    products: [GTL_BASE, ADB],
    coverAmountFormula: salaryMultiple(4),
    freeCoverLimitFormula: fixedAmount(5_000_000),
    rateCardFile: 'rate-cards/gtl-standard-2026.dmn',
  },
  {
    planNo: 'GTL-COMPREHENSIVE',
    planName: 'Group Term Life — Comprehensive (Axis Max Life style)',
    products: [GTL_BASE, ADB, APD, CI_RIDER],
    coverAmountFormula: salaryMultiple(5),
    freeCoverLimitFormula: fixedAmount(10_000_000),
    rateCardFile: 'rate-cards/gtl-comprehensive-2026.dmn',
  },
  {
    planNo: 'GCL-BASIC',
    planName: 'Group Credit Life — Basic (HDFC Life Credit Suraksha style)',
    products: [GTL_BASE],
    coverAmountFormula: loanOutstanding(),
    rateCardFile: 'rate-cards/gcl-basic-2026.dmn',
  },
];

export const CATALOG_BENEFITS: PlanBenefit[] = (() => {
  const seen = new Map<string, PlanBenefit>();
  for (const p of CATALOG_PRODUCTS) {
    for (const b of p.benefits) {
      if (!seen.has(b.code)) seen.set(b.code, b);
    }
  }
  return Array.from(seen.values());
})();
