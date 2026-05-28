// Shared value objects for the Group PAS modules.
// Source: docs/spec/common/CommonData.data (DSL is canon — see context/CORE_MEMORY.md).

export type Currency = 'INR' | 'USD';

export type ISODate = string; // YYYY-MM-DD (DSL `date`)
export type ISODateTime = string; // ISO-8601 (DSL `datetime`)

export interface Money {
  amount: number;
  currency: Currency;
}

export interface DateRange {
  startDate: ISODate;
  endDate: ISODate;
}

// ── Plan / amount-formula value objects (flow Quote → Proposal → Policy) ──

export type AmountFormulaType =
  | 'MULTIPLE_OF_MEMBER_ATTRIBUTE'
  | 'LOOKUP_ON_MEMBER_ATTRIBUTE'
  | 'FIXED'
  | 'DMN_TABLE';

export interface AmountFormula {
  type: AmountFormulaType;
  multiplicationFactor?: number;
  lookupTableJson?: string;
  memberAttributeName?: string;
  fixedAmount?: number;
  dmnTableFile?: string;
}

export interface PlanBenefit {
  code: string;
  name?: string;
  mandatory: boolean;
}

export interface PlanExclusion {
  code: string;
  name?: string;
}

export interface PlanProduct {
  productCode: string;
  productName?: string;
  productType: string;
  benefits: PlanBenefit[];
  exclusions: PlanExclusion[];
}

export interface Plan {
  planNo: string;
  planName?: string;
  products: PlanProduct[];
  rateCardFile: string;
  coverAmountFormula: AmountFormula;
  freeCoverLimitFormula?: AmountFormula;
}

export interface PlanHeadcount {
  planNo: string;
  headcount: number;
}

export interface AggregateCensus {
  headcount: number;
  planBreakdown: PlanHeadcount[];
}

export interface QuotePlanPremium {
  planNo: string;
  amount: Money;
}

export interface QuotePremium {
  amount: Money;
  breakup: QuotePlanPremium[];
}

export interface PremiumBreakupItem {
  productCode: string;
  benefitCode?: string;
  premium: Money;
}

export interface MemberPremium {
  annualPremium: Money;
  breakup: PremiumBreakupItem[];
}

export interface UwExclusion {
  code: string;
  description: string;
}

// Superset shape covering Quote → Proposal → Policy.
// Quote-stage members may only set lifestyle fields; planNo + sumInsured land
// by the time Proposal/Policy receive the member.
export interface MemberData {
  name: string;
  dob?: ISODate;
  gender?: string;
  salary?: number;
  occupation?: string;
  sumInsured?: number;
  planNo?: string;
}

// ── Shared API DTOs ──

export interface FileUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface FileUploadUrlResponse {
  uploadUrl: string;
  fileId: string;
}

export interface FileDownloadUrlRequest {
  fileId: string;
}

export interface FileDownloadUrlResponse {
  downloadUrl: string;
}

export interface AmountFormulaRequest {
  type: string;
  multiplicationFactor?: number;
  lookupTableJson?: string;
  memberAttributeName?: string;
  fixedAmount?: number;
  dmnTableFile?: string;
}
