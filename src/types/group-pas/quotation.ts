// Quotation domain + DTOs.
// Source: docs/spec/quotation/{QuotationData.data,QuotationDomain.domain,QuotationQuery.query}.

import type {
  AggregateCensus,
  ISODate,
  MemberData,
  Money,
  Plan,
  PremiumBreakupItem,
  QuotePremium,
} from './common';

// ── Enums ──

export type QuoteStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'FINALIZED';

export type MemberQuoteStatus = 'DRAFT' | 'SUBMITTED' | 'FINALIZED';

export type PolicyType = 'GTL' | 'GCL' | 'GH';

export type PremiumType = 'ANNUAL' | 'SINGLE';

export type CensusFileType = 'CSV' | 'XLSX';

export type AgeDefinitionRule = 'ALB' | 'ANB' | 'COMPLETED_YEARS';

export type RiskTermClassification =
  | 'YEARLY_RENEWABLE'
  | 'LONG_TERM'
  | 'SINGLE_PREMIUM'
  | 'LIMITED_PAY'
  | 'MASS_MARKET'
  | 'TAILOR_MADE';

// ── Shared value objects ──

export interface CensusFileFormat {
  fileType: CensusFileType;
  sheetName?: string;
  schemaJson: string;
  dialectJson?: string;
}

export interface MemberQuotePremium {
  amount: Money;
  breakup: PremiumBreakupItem[];
}

export interface QuoteCase {
  quoteId: string;
  clientId: string;
  policyType: string;
}

export interface MemberQuoteCase {
  memberQuoteId: string;
  policyId: string;
}

// ── Domain entities ──
// Use strict enum unions for in-app domain types. Wire-format DTOs below keep
// loose `string` to mirror the DSL — narrow at the API-client mapper boundary.

export interface Quote {
  id: string;
  clientId: string;
  policyType: PolicyType;
  premiumType?: PremiumType;
  effectiveDate?: ISODate;
  expiryDate?: ISODate;
  inceptionDate?: ISODate;
  ageDefinitionRule?: AgeDefinitionRule;
  riskTermClassification?: RiskTermClassification;
  lineOfBusiness?: string;
  status: QuoteStatus;
  plans: Plan[];
  memberToPlanMapping?: string; // DMN decision table as JSON string
  aggregateCensus?: AggregateCensus;
  censusFileFormat?: CensusFileFormat;
  premium?: QuotePremium;
}

export interface MemberQuote {
  id: string;
  policyId: string;
  planNo?: string;
  sumAssured?: Money;
  status: MemberQuoteStatus;
  memberData: MemberData;
  premium?: MemberQuotePremium;
}

// ── Wire DTOs (response shapes) ──

export interface QuoteDto {
  id: string;
  clientId: string;
  policyType: string;
  premiumType: string;
  effectiveDate: ISODate;
  expiryDate: ISODate;
  inceptionDate: ISODate;
  ageDefinitionRule: string;
  riskTermClassification: string;
  lineOfBusiness: string;
  status: string;
  plans: QuotePlanDto[];
  headcount: number;
  estimatedPremium: EstimatedPremiumDto;
  memberToPlanMappingJson: string;
  censusFileFormatJson: string;
}

export interface QuoteSummaryDto {
  id: string;
  clientId: string;
  policyType: string;
  status: string;
  headcount: number;
  premiumAmount: Money;
}

export interface QuotePlanDto {
  id: string;
  planNo: string;
  planName: string;
  productsJson: string;
  rateCardFile: string;
  coverAmountFormulaJson: string;
  freeCoverLimitFormulaJson: string;
}

export interface EstimatedPremiumDto {
  totalAmount: number;
  currency: string;
  byPlanJson: string;
}

export interface MemberQuoteDto {
  id: string;
  policyId: string;
  planNo: string;
  status: string;
  name: string;
  dob: ISODate;
  gender: string;
  salary: number;
  sumAssured: number;
  annualPremiumAmount: number;
  annualPremiumCurrency: string;
  premiumBreakupJson: string;
}
