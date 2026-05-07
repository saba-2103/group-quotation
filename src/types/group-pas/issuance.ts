// Issuance domain + DTOs.
// Source: docs/spec/issuance/{IssuanceData.data,IssuanceDomain.domain,IssuanceQuery.query}.

import type {
  AggregateCensus,
  ISODate,
  ISODateTime,
  MemberData,
  MemberPremium,
  Plan,
  QuotePremium,
  UwExclusion,
} from './common';

// ── Enums ──

export type ProposalState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'FINALIZED'
  | 'POLICY_CREATED'
  | 'CANCELLED';

export type PolicyMemberState =
  | 'CREATED'
  | 'PRICED'
  | 'MAF_PENDING'
  | 'MAF_CONFIRMED'
  | 'CLASSIFYING'
  | 'APPROVED'
  | 'REPAIR_PENDING'
  | 'REFERRED_TO_UW'
  | 'REJECTED'
  | 'SENT_FOR_ISSUANCE'
  | 'ADDED'
  | 'ARCHIVED';

export type UwLane = 'STP' | 'REPAIR' | 'REVIEW' | 'REJECT';

// Plan-doc alias requested by Task 1.1.
export type ClassificationLane = UwLane;

export type UwDecision = 'APPROVED' | 'REJECTED';

export type CensusSubmissionStatus =
  | 'INITIATED'
  | 'INGESTED'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'FAILED';

export type CensusSubmissionRowStatus = 'INGESTED' | 'REJECTED' | 'ACCEPTED';

// ── Shared value objects ──

export interface ClassificationError {
  field: string;
  code: string;
  message: string;
}

export interface ClassifyMemberResult {
  lane: UwLane;
  errors: ClassificationError[];
}

export interface UwDecisionResult {
  decision: UwDecision;
  exclusions: UwExclusion[];
  notes?: string;
}

export interface MemberRepairCorrections {
  dob?: ISODate;
  salary?: number;
  sumInsured?: number;
  occupation?: string;
  otherCorrectionsJson?: string;
}

export interface ProposalCase {
  proposalId: string;
  quoteId: string;
  clientId: string;
  policyType: string;
}

export interface PolicyMemberCase {
  policyMemberId: string;
  policyId: string;
  memberId: string;
  planNo: string;
}

export interface CensusSubmissionCase {
  submissionId: string;
  policyId: string;
}

export interface CensusSubmissionFileRef {
  fileRef: string;
  sizeBytes: number;
  contentHash: string;
}

export interface CensusRowError {
  field: string;
  code: string;
  message: string;
}

export interface InitiateCensusSubmissionResult {
  submissionId: string;
  uploadUrl: string;
  fileRef: string;
  expiresAt: ISODateTime;
}

// ── Domain entities ──

export interface Proposal {
  id: string;
  quoteId: string;
  clientId: string;
  policyType: string;
  state: ProposalState;
  plans: Plan[];
  memberToPlanMapping: string;
  aggregateCensus: AggregateCensus;
  estimatedPremium: QuotePremium;
  policyId?: string;
  policyNumber?: string;
}

export interface PolicyMember {
  id: string;
  policyId: string;
  memberId: string;
  planNo: string;
  state: PolicyMemberState;
  memberData: MemberData;
  classificationResult?: ClassifyMemberResult;
  uwDecision?: UwDecisionResult;
  repairCorrections?: MemberRepairCorrections;
  premium?: MemberPremium;
  floatDeductionId?: string;
  reclassificationCount: number;
  censusSubmissionId?: string;
  censusRowNumber?: number;
}

export interface CensusSubmission {
  id: string;
  policyId: string;
  file: CensusSubmissionFileRef;
  status: CensusSubmissionStatus;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  createdMemberCount: number;
}

export interface CensusSubmissionRow {
  id: string;
  submissionId: string;
  rowNumber: number;
  status: CensusSubmissionRowStatus;
  ingestionErrors: CensusRowError[];
  policyMemberId?: string;
}

// ── Wire DTOs ──

export interface ProposalDto {
  id: string;
  quoteId: string;
  clientId: string;
  policyType: string;
  state: string;
  plansJson: string;
  memberToPlanMapping: string;
  aggregateCensusJson: string;
  estimatedPremiumJson: string;
  policyId: string;
  policyNumber: string;
}

export interface ProposalSummaryDto {
  id: string;
  quoteId: string;
  clientId: string;
  policyType: string;
  state: string;
  policyId: string;
  policyNumber: string;
}

export interface PolicyMemberDto {
  id: string;
  policyId: string;
  memberId: string;
  planNo: string;
  state: string;
  name: string;
  dob: ISODate;
  gender: string;
  salary: number;
  sumInsured: number;
  annualPremiumAmount: number;
  annualPremiumCurrency: string;
  classificationResultJson: string;
  uwDecisionJson: string;
  floatDeductionId: string;
  reclassificationCount: number;
  archivedReason: string;
  censusSubmissionId: string;
  censusRowNumber: number;
}

export interface PolicyMemberSummaryDto {
  id: string;
  policyId: string;
  memberId: string;
  planNo: string;
  state: string;
  name: string;
  annualPremiumAmount: number;
  annualPremiumCurrency: string;
}

export interface CensusSubmissionDto {
  id: string;
  policyId: string;
  fileRef: string;
  status: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  createdMemberCount: number;
}

export interface CensusSubmissionRowDto {
  id: string;
  submissionId: string;
  rowNumber: number;
  status: string;
  ingestionErrorsJson: string;
  policyMemberId: string;
}
