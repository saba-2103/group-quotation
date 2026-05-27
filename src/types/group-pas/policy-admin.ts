// Policy Admin (PAM) domain + DTOs.
// Source: docs/spec/policy-admin/{PolicyAdminData.data,PolicyAdminDomain.domain,PolicyAdminQuery.query}.

import type {
  AmountFormula,
  ISODate,
  MemberPremium,
  Money,
  PlanBenefit,
  PlanExclusion,
  UwExclusion,
} from './common';

// ── Enums ──

export type PolicyState = 'CREATED' | 'PENDING' | 'ACTIVE' | 'CANCELLED';

export type PolicyPendingReason = 'AWAITING_MIN_MEMBERS' | 'AWAITING_COMPLIANCE';

// VOID = pre-activation terminal. CANCELLED = post-activation terminal.
export type MemberState = 'PENDING' | 'ACTIVE' | 'VOID' | 'CANCELLED';

export type MemberPendingReason =
  | 'PENDING_FLOAT_RESERVATION'
  | 'PENDING_APPROVAL'
  | 'PENDING_POLICY_ACTIVATION';

export type MemberVoidReason =
  | 'FLOAT_UNAVAILABLE'
  | 'APPROVAL_REJECTED'
  | 'POLICY_CANCELLED'
  | 'WITHDRAWN_BY_PROPOSER';

// MVP single state.
export type ClientState = 'ACTIVE';

export type CommunicationPreference = 'EMAIL' | 'LETTER' | 'PORTAL';

export type FloatReservationStatus = 'RESERVED' | 'INSUFFICIENT';

// ── Plan structure (PAM-side aliases of common shapes) ──

export type PolicyPlanBenefit = PlanBenefit;
export type PolicyPlanExclusion = PlanExclusion;

export interface PolicyPlanProduct {
  productCode: string;
  productName?: string;
  productType: string;
  benefits: PolicyPlanBenefit[];
  exclusions: PolicyPlanExclusion[];
}

export interface PolicyPlanConfig {
  planNo: string;
  planName?: string;
  products: PolicyPlanProduct[];
  rateCardFile: string;
  coverAmountFormula: AmountFormula;
  freeCoverLimitFormula?: AmountFormula;
}

// ── UW + member enrolment shapes ──

export interface MemberUwDecision {
  exclusions: UwExclusion[];
  notes?: string;
}

export interface MemberEnrollmentData {
  policyMemberId: string;
  name: string;
  dob: ISODate;
  gender: string;
  salary: number;
  occupation?: string;
  mobile?: string;
  email?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  sumInsured: number;
  planNo: string;
  premium: MemberPremium;
  uwDecision?: MemberUwDecision;
  transactionRefs: string[];
  additionalAttributesJson?: string;
}

export interface ClientRegistrationData {
  name: string;
  alternateName?: string;
  businessRegistrationNumber: string;
  incorporationDate?: ISODate;
  gstRegistrationNumber?: string;
  taxReferenceNumber?: string;
  clientCategory?: string;
  industryCategory?: string;
  countryCode: string;
  communicationPreference?: CommunicationPreference;
  clientUrl?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  isSubsidiary: boolean;
  isVip: boolean;
  isBlacklisted: boolean;
  effectiveDate: ISODate;
  endDate?: ISODate;
}

export interface FloatReservationResult {
  status: FloatReservationStatus;
  reservationId?: string;
  shortfall?: number;
}

// ── Workflow signal payloads ──

export interface MemberEnrollmentCase {
  memberId: string;
  policyId: string;
  policyMemberId: string;
  planNo: string;
}

export interface PolicyActivationCase {
  policyId: string;
  clientId: string;
  activationThreshold: number;
}

export interface PolicyActivatedSignal {
  policyId: string;
  policyNumber: string;
}

export interface FloatTopUpSignal {
  policyId: string;
  amount: number;
}

export interface MemberApprovalCompletedSignal {
  memberId: string;
  decision: string; // APPROVED | REJECTED | CONDITIONAL
  notes?: string;
}

export interface MemberVoidRequestedSignal {
  memberId: string;
  reason: string;
}

export interface MemberPendingSignal {
  policyId: string;
  memberId: string;
}

export interface PolicyCancelledSignal {
  policyId: string;
  reason?: string;
}

// ── Domain entities ──

export interface Client {
  id: string;
  clientNumber: string;
  name: string;
  alternateName?: string;
  businessRegistrationNumber: string;
  incorporationDate?: ISODate;
  gstRegistrationNumber?: string;
  taxReferenceNumber?: string;
  clientCategory?: string;
  industryCategory?: string;
  countryCode: string;
  communicationPreference?: CommunicationPreference;
  clientUrl?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  isSubsidiary: boolean;
  isVip: boolean;
  isBlacklisted: boolean;
  effectiveDate: ISODate;
  endDate?: ISODate;
  state: ClientState;
}

export interface Policy {
  id: string;
  policyNumber: string;
  clientId: string;
  proposalId: string;
  policyType: string;
  effectiveDate?: ISODate;
  expiryDate?: ISODate;
  premiumType?: string;
  lineOfBusiness?: string;
  riskTermClassification?: string;
  inceptionDate?: ISODate;
  ageDefinitionRule?: string;
  activationThreshold: number;
  pendingReason?: PolicyPendingReason;
  state: PolicyState;
  plans: PolicyPlanConfig[];
  estimatedPremium: Money;
}

export interface Member {
  id: string;
  memberNumber: string;
  policyId: string;
  policyMemberId: string;
  planNo: string;
  state: MemberState;
  name: string;
  dob: ISODate;
  gender: string;
  salary: number;
  occupation?: string;
  mobile?: string;
  email?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  sumInsured: number;
  premium: MemberPremium;
  uwDecision?: MemberUwDecision;
  transactionRefs: string[];
  floatReservationId?: string;
  pendingReason?: MemberPendingReason;
  voidReason?: MemberVoidReason;
  cancellationReason?: string;
  additionalAttributesJson?: string;
}

// ── Wire DTOs ──

export interface ClientDto {
  id: string;
  clientNumber: string;
  name: string;
  alternateName: string;
  businessRegistrationNumber: string;
  incorporationDate: ISODate;
  gstRegistrationNumber: string;
  taxReferenceNumber: string;
  clientCategory: string;
  industryCategory: string;
  countryCode: string;
  communicationPreference: string;
  clientUrl: string;
  contactPersonName: string;
  contactPersonPhone: string;
  isSubsidiary: boolean;
  isVip: boolean;
  isBlacklisted: boolean;
  effectiveDate: ISODate;
  endDate: ISODate;
  state: string;
}

export interface ClientSummaryDto {
  id: string;
  clientNumber: string;
  name: string;
  countryCode: string;
  industryCategory: string;
  isVip: boolean;
  state: string;
}

export interface PolicyPlanDto {
  id: string;
  planNo: string;
  planName: string;
  productsJson: string;
  rateCardFile: string;
  coverAmountFormulaJson: string;
  freeCoverLimitFormulaJson: string;
}

export interface PolicyDto {
  id: string;
  policyNumber: string;
  clientId: string;
  proposalId: string;
  policyType: string;
  effectiveDate: ISODate;
  expiryDate: ISODate;
  premiumType: string;
  lineOfBusiness: string;
  riskTermClassification: string;
  inceptionDate: ISODate;
  ageDefinitionRule: string;
  activationThreshold: number;
  pendingReason: string;
  state: string;
  plans: PolicyPlanDto[];
  estimatedPremium: Money;
}

export interface PolicySummaryDto {
  id: string;
  policyNumber: string;
  clientId: string;
  policyType: string;
  state: string;
}

export interface MemberDto {
  id: string;
  memberNumber: string;
  policyId: string;
  policyMemberId: string;
  planNo: string;
  state: string;
  pendingReason: string;
  voidReason: string;
  cancellationReason: string;
  name: string;
  dob: ISODate;
  gender: string;
  salary: number;
  occupation: string;
  mobile: string;
  email: string;
  governmentIdType: string;
  governmentIdNumber: string;
  sumInsured: number;
  premium: MemberPremium;
  uwDecision?: MemberUwDecision;
  transactionRefs: string[];
  floatReservationId?: string;
  additionalAttributesJson?: string;
}

export interface MemberSummaryDto {
  id: string;
  memberNumber: string;
  policyId: string;
  policyMemberId: string;
  planNo: string;
  state: string;
  pendingReason?: string;
  name: string;
  mobile: string;
  sumInsured: number;
  annualPremium: Money;
}
