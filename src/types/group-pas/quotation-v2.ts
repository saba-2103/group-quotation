/**
 * Group PAS — Quotation module V2 type system.
 *
 * Replaces the flat Quote shape from quotation.ts with a versioned model
 * that tracks the full lifecycle: DRAFT → UW referral → pricing → finalization.
 *
 * Import from here directly; the barrel re-exports are at the bottom.
 */

import type { ISODate, ISODateTime, Money, Currency } from './common';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type QuoteStatus = 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'WITHDRAWN' | 'EXPIRED';

export type QuoteVersionStatus =
  | 'DRAFT'
  | 'REFERRED_MANUAL_UW'
  | 'EVALUATED'
  | 'REFERRED_MANUAL_PRICING'
  | 'RATED'
  | 'SUBMITTED'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'FINALIZED'
  | 'SUPERSEDED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type SchemeType = 'GTL' | 'GCL' | 'GH';
export type BusinessType = 'NEW_BUSINESS' | 'RENEWAL' | 'ENDORSEMENT_REQUOTE';
export type UwPath = 'AUTO' | 'MANUAL';
export type PricingPath = 'AUTO' | 'MANUAL';
export type PremiumType = 'ANNUAL' | 'SINGLE';
export type IntakeChannel =
  | 'SALES_CLICK'
  | 'PORTAL_UPLOAD'
  | 'API'
  | 'INBOUND_MAILBOX'
  | 'OFFLINE_PHYSICAL';
export type CoverageBasis =
  | 'EMPLOYEE_ONLY'
  | 'EMPLOYEE_SPOUSE'
  | 'EMPLOYEE_SPOUSE_CHILDREN'
  | 'EMPLOYEE_SPOUSE_CHILDREN_PARENTS'
  | 'OTHER';
export type IndustryHazardBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RoundKind = 'UW' | 'PRICING';
export type RoundOutcome = 'APPROVED' | 'REJECTED';
export type SupersessionCause = 'EXPLICIT_REPLACEMENT' | 'SIBLING_FINALIZED';
export type WithdrawnCause = 'SALES_PULL' | 'QUOTE_WITHDRAWN';
export type ProductType = 'BASE' | 'RIDER';
export type AgeDefinitionRule = 'ALB' | 'ANB' | 'COMPLETED_YEARS';
export type ConfigurableRuleType = 'FIXED' | 'LOOKUP_COLUMN' | 'FORMULA' | 'GRID';
export type ConstraintType = 'RANGE' | 'DIRECTION' | 'LIST' | 'LIST_MULTI' | 'FREE';

// ─────────────────────────────────────────────────────────────────────────────
// Value objects
// ─────────────────────────────────────────────────────────────────────────────

/** A monetary value with currency. Re-exported from common but typed explicitly here. */
export type { Money };

// ── ConfigurableRule ──

export interface FixedRuleSpec {
  type: 'FIXED';
  value: number | string | boolean;
}

export interface LookupColumnRuleSpec {
  type: 'LOOKUP_COLUMN';
  tableId: string;
  columnKey: string;
  lookupKey: string;
}

export interface FormulaRuleSpec {
  type: 'FORMULA';
  expression: string; // e.g. "age * 0.002 * sum_insured"
  variables: string[];
}

export interface GridRuleSpec {
  type: 'GRID';
  tableId: string;
  rowKey: string;
  columnKey: string;
}

export type ConfigurableRuleSpec =
  | FixedRuleSpec
  | LookupColumnRuleSpec
  | FormulaRuleSpec
  | GridRuleSpec;

export interface ConfigurableRule {
  ruleId: string;
  name: string;
  ruleType: ConfigurableRuleType;
  spec: ConfigurableRuleSpec;
  effectiveFrom?: ISODate;
  effectiveTo?: ISODate;
}

// ── ParameterOverride ──

export interface RangeConstraint {
  type: 'RANGE';
  min: number;
  max: number;
}

export interface DirectionConstraint {
  type: 'DIRECTION';
  direction: 'UP_ONLY' | 'DOWN_ONLY';
  baseValue: number;
}

export interface ListConstraint {
  type: 'LIST';
  allowedValues: (string | number)[];
}

export interface ListMultiConstraint {
  type: 'LIST_MULTI';
  allowedValues: (string | number)[];
}

export interface FreeConstraint {
  type: 'FREE';
}

export type ParameterConstraint =
  | RangeConstraint
  | DirectionConstraint
  | ListConstraint
  | ListMultiConstraint
  | FreeConstraint;

export interface ParameterOverride {
  parameterId: string;
  parameterName: string;
  originalValue: number | string | boolean;
  overrideValue: number | string | boolean;
  constraint: ParameterConstraint;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: ISODateTime;
}

// ── Census ──

export interface AggregateCensusV2 {
  headcount: number;
  avgAge?: number;
  avgSumInsured?: Money;
  industryHazardBand?: IndustryHazardBand;
  coverageBasis?: CoverageBasis;
  planBreakdown: Array<{ planId: string; headcount: number }>;
}

// ── Plan ──

export interface PlanBenefitV2 {
  code: string;
  name: string;
  productType: ProductType;
  sumInsured?: Money;
  waitingPeriodDays?: number;
  mandatory: boolean;
}

export interface PlanProductV2 {
  productCode: string;
  productName: string;
  productType: ProductType;
  benefits: PlanBenefitV2[];
}

export interface SumInsuredSpec {
  basis: 'MULTIPLE_OF_SALARY' | 'FIXED' | 'SLAB';
  multiplier?: number;
  fixedAmount?: Money;
  slabs?: Array<{ salaryUpTo: number; sumInsured: Money }>;
}

export interface FreeCoverLimitSpec {
  type: 'FIXED' | 'MULTIPLE_OF_SALARY';
  amount?: Money;
  multiplier?: number;
}

export interface NMLSpec {
  type: 'FIXED' | 'PERCENTAGE_OF_FCL';
  amount?: Money;
  percentage?: number;
}

export interface RateCardSpec {
  rateCardId: string;
  rateCardName: string;
  effectiveFrom: ISODate;
  rateTableUrl?: string;
}

export interface PlanDefinition {
  plan_product: PlanProductV2[];
  si: SumInsuredSpec;
  fcl: FreeCoverLimitSpec;
  nml: NMLSpec;
  rate_card: RateCardSpec;
}

export interface PlanV2 {
  plan_id: string;
  plan_number: string;
  plan_name: string;
  plan_definition: PlanDefinition;
}

// ── Premium ──

export interface PremiumBreakupItemV2 {
  productCode: string;
  productName: string;
  benefitCode?: string;
  premium: Money;
  loadingFactor?: number;
  discountFactor?: number;
}

export interface QuotePremiumV2 {
  grossPremium: Money;
  netPremium: Money;
  gst?: Money;
  totalPremium: Money;
  breakup: PremiumBreakupItemV2[];
}

// ── Round log ──

export interface Round {
  roundId: string;
  roundKind: RoundKind;
  roundNumber: number;
  /** Who was the review assigned to. */
  assignedTo: string;
  assignedToName: string;
  assignedAt: ISODateTime;
  completedAt?: ISODateTime;
  outcome?: RoundOutcome;
  /** Reviewer's response comment. */
  remarks?: string;
  parameterOverrides?: ParameterOverride[];
  /** Sales note / request comment sent when opening the referral. */
  requestComment?: string;
  /** Name of the person who created the referral (usually Sales). */
  requestedByName?: string;
  /** AttachmentIds of documents linked to this round. */
  attached_document_refs?: string[];
}

// ── Document attachment ──

export interface DocumentAttachment {
  attachmentId: string;
  documentTypeId: string;
  documentTypeName: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: ISODateTime;
  sizeBytes?: number;
  mimeType?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core domain entities
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteVersion {
  version_id: string;
  version_number: number;
  version_label?: string;
  quote_id: string;

  // Plans selected for this version
  plans: PlanV2[];

  // Census snapshot at time of rating
  aggregate_census: AggregateCensusV2;

  // DMN decision table JSON string — maps member attributes → plan_id
  member_to_plan_mapping?: string;

  // Premium (populated after RATED/FINALIZED)
  premium?: QuotePremiumV2;

  // Routing paths
  uw_path: UwPath;
  pricing_path: PricingPath;

  // Configurable rule overrides applied to this version
  parameter_overrides?: ParameterOverride[];

  // UW / pricing round history
  round_log: Round[];

  // Documents attached during this version's lifecycle
  attached_documents: DocumentAttachment[];

  // Status
  status: QuoteVersionStatus;

  // Version-level submission fields (set in Submit & Send tab)
  effective_date?: ISODate;
  expiry_date?: ISODate;
  inception_date?: ISODate;
  age_definition_rule?: AgeDefinitionRule;
  risk_term_classification?: string;

  // Supersession / withdrawal metadata
  superseded_by_version_id?: string;
  supersession_cause?: SupersessionCause;
  withdrawn_cause?: WithdrawnCause;

  // Timestamps
  created_at: ISODateTime;
  created_by: string;
  submitted_at?: ISODateTime;
  sent_to_client_at?: ISODateTime;
  accepted_at?: ISODateTime;
  finalized_at?: ISODateTime;
  rejected_at?: ISODateTime;
  withdrawn_at?: ISODateTime;
  expired_at?: ISODateTime;
  last_updated_at: ISODateTime;
}

export interface Quote {
  id: string;
  quote_number: string;

  // Client & broker
  client_id: string;
  client_number: string;
  client_name: string;
  broker_id?: string;
  broker_name?: string;

  // Product classification
  scheme_type: SchemeType;
  business_type: BusinessType;
  intake_channel: IntakeChannel;

  // Intent fields (captured at quote creation)
  coverage_basis: CoverageBasis;
  premium_type: PremiumType;
  intended_inception_date: ISODate;
  intended_expiry_date: ISODate;
  line_of_business?: string;

  // Overall quote status (derived from active version's status)
  status: QuoteStatus;

  // Versions (at least one; versions[0] is latest)
  versions: QuoteVersion[];

  // Optional fields captured at creation (not all quotes will have these)
  currency?: Currency;
  broker_mandate_id?: string;
  industry_hazard_band?: IndustryHazardBand;
  components_requested?: string[];
  estimated_group_size?: number;
  requested_sa_per_member?: Money;

  // Timestamps
  created_at: ISODateTime;
  created_by: string;
  last_updated_at: ISODateTime;
}

// ── MemberQuote (GCL) ──

export type MemberQuoteV2Status = 'DRAFT' | 'SUBMITTED';

export interface MemberQuoteV2 {
  id: string;
  /** Parent GCL quote id. */
  quote_id: string;
  /** Denormalised from parent quote — for display in list without joins. */
  parent_quote_number?: string;
  parent_client_name?: string;

  // Member details
  member_name: string;
  member_dob: ISODate;
  member_role_occupation?: string;

  // Loan details
  loan_reference: string;
  loan_amount: Money;
  loan_tenure_months?: number;
  loan_disbursement_date?: ISODate;

  // Coverage
  plan_id: string;
  /** Denormalised plan name for display. */
  plan_name?: string;
  /**
   * Auto-derived sum assured (loan_amount × coverage factor).
   * Stored at creation time for downstream PIM intake.
   */
  sum_assured?: Money;

  notes?: string;
  status: MemberQuoteV2Status;
  submitted_at?: ISODateTime;
  created_at: ISODateTime;
  created_by: string;
}

// ── PC catalog ──

export interface ProductCatalogItem {
  productCode: string;
  productName: string;
  productType: ProductType;
  schemeTypes: SchemeType[];
  description: string;
  defaultBenefits: PlanBenefitV2[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived / utility types
// ─────────────────────────────────────────────────────────────────────────────

/** The latest (active) version of a quote. */
export type ActiveQuoteVersion = QuoteVersion & { quote: Quote };

/** Summary row shape — used in the Quotes list table. */
export interface QuoteSummary {
  id: string;
  quote_number: string;
  client_name: string;
  scheme_type: SchemeType;
  business_type: BusinessType;
  status: QuoteStatus;
  active_version_status: QuoteVersionStatus;
  version_count: number;
  premium?: Money;
  intended_inception_date: ISODate;
  created_at: ISODateTime;
  last_updated_at: ISODateTime;
  created_by: string;
}

/** UW queue row. */
export interface UWQueueItem {
  quote_id: string;
  quote_number: string;
  version_id: string;
  version_number: number;
  client_name: string;
  scheme_type: SchemeType;
  headcount: number;
  industry_hazard_band?: IndustryHazardBand;
  referred_at: ISODateTime;
  assigned_to?: string;
  assigned_to_name?: string;
  round_number: number;
  premium?: Money;
}

/** Actuary queue row. */
export interface ActuaryQueueItem {
  quote_id: string;
  quote_number: string;
  version_id: string;
  version_number: number;
  client_name: string;
  scheme_type: SchemeType;
  headcount: number;
  uw_approved_at?: ISODateTime;
  referred_at: ISODateTime;
  assigned_to?: string;
  assigned_to_name?: string;
  round_number: number;
}
